import { auth } from "@koko/auth";
import { TRPCError } from "@trpc/server";
import type { Logger } from "pino";
import type { VerifyEmailResult } from "./type";

export async function verifyEmail({
	token,
	logger,
}: {
	token: string;
	logger: Logger;
}): Promise<VerifyEmailResult> {
	try {
		const response = await auth.api.verifyEmail({
			query: { token },
		});

		if (!response) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Invalid or expired verification token",
			});
		}

		logger.info({ event: "email_verified" }, "Email verified successfully");

		return {
			success: true,
			message: "Email verified successfully",
		};
	} catch (error) {
		logger.error(
			{ error, event: "email_verification_failed" },
			"Email verification failed",
		);

		if (error instanceof TRPCError) {
			throw error;
		}

		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Invalid or expired verification token",
		});
	}
}
