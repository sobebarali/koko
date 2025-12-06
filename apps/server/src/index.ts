import "dotenv/config";
import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@koko/api/context";
import { getLogger, requestLoggingMiddleware } from "@koko/api/lib/logger";
import { appRouter } from "@koko/api/routers/index";
import {
	handleBunnyWebhook,
	validateBunnyWebhookPayload,
} from "@koko/api/webhooks/bunny";
import { auth } from "@koko/auth";
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// Request logging with traceId (replaces basic logger())
app.use(requestLoggingMiddleware());

app.use(
	"/*",
	cors({
		origin: process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()) || [],
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext: (_opts, context) => {
			// Pass traceId and logger from Hono context
			return createContext({
				context,
				traceId: context.get("traceId"),
				logger: context.get("logger"),
			});
		},
	}),
);

app.get("/", (c) => {
	return c.text("OK");
});

// Bunny Stream webhook endpoint
app.post("/webhooks/bunny", async (c) => {
	const logger = c.get("logger") || getLogger();
	const traceId = c.get("traceId");

	logger.info(
		{ event: "bunny_webhook_request_start", traceId },
		"Bunny webhook request received",
	);

	try {
		const rawBody = await c.req.text();
		logger.debug(
			{ event: "bunny_webhook_raw_body", rawBody, traceId },
			"Raw webhook body",
		);

		let body: unknown;
		try {
			body = JSON.parse(rawBody);
		} catch (parseError) {
			logger.error(
				{
					event: "bunny_webhook_json_parse_error",
					rawBody,
					error: parseError instanceof Error ? parseError.message : parseError,
					traceId,
				},
				"Failed to parse webhook JSON",
			);
			return c.json({ error: "Invalid JSON" }, 400);
		}

		logger.debug(
			{ event: "bunny_webhook_parsed_body", body, traceId },
			"Parsed webhook body",
		);

		if (!validateBunnyWebhookPayload(body)) {
			logger.warn(
				{
					event: "bunny_webhook_invalid_payload",
					body,
					hasVideoLibraryId:
						body && typeof body === "object" && "VideoLibraryId" in body,
					hasVideoGuid: body && typeof body === "object" && "VideoGuid" in body,
					hasStatus: body && typeof body === "object" && "Status" in body,
					traceId,
				},
				"Invalid webhook payload structure",
			);
			return c.json({ error: "Invalid payload" }, 400);
		}

		logger.info(
			{
				event: "bunny_webhook_validated",
				videoGuid: body.VideoGuid,
				status: body.Status,
				libraryId: body.VideoLibraryId,
				traceId,
			},
			"Webhook payload validated successfully",
		);

		const result = await handleBunnyWebhook({ payload: body, logger });

		logger.info(
			{
				event: "bunny_webhook_result",
				success: result.success,
				message: result.message,
				videoGuid: body.VideoGuid,
				traceId,
			},
			"Webhook processing completed",
		);

		if (result.success) {
			return c.json({ message: result.message }, 200);
		}
		return c.json({ error: result.message }, 400);
	} catch (error) {
		logger.error(
			{
				event: "bunny_webhook_error",
				error: error instanceof Error ? error.message : error,
				stack: error instanceof Error ? error.stack : undefined,
				traceId,
			},
			"Webhook processing error",
		);
		return c.json({ error: "Internal server error" }, 500);
	}
});

// Start server for Node.js
import { serve } from "@hono/node-server";

const port = Number(process.env.PORT) || 3000;
const logger = getLogger();
logger.info(
	{ port, event: "server_start" },
	`Server is running on http://localhost:${port}`,
);

serve({
	fetch: app.fetch,
	port,
});

export default app;
