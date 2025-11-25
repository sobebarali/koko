import "dotenv/config";
import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@koko/api/context";
import { getLogger, requestLoggingMiddleware } from "@koko/api/lib/logger";
import { appRouter } from "@koko/api/routers/index";
import { auth } from "@koko/auth";
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// Request logging with traceId (replaces basic logger())
app.use(requestLoggingMiddleware());

app.use(
	"/*",
	cors({
		origin: process.env.CORS_ORIGIN || "",
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
