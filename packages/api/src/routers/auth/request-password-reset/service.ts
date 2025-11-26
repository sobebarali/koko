import { auth } from "@koko/auth";
import type { Logger } from "pino";
import type { RequestPasswordResetResult } from "./type";

export async function requestPasswordReset({
	email,
	redirectTo,
	logger,
}: {
	email: string;
	redirectTo?: string;
	logger: Logger;
}): Promise<RequestPasswordResetResult> {
	try {
		await auth.api.requestPasswordReset({
			body: {
				email,
				redirectTo,
			},
		});

		logger.info(
			{ email, event: "password_reset_requested" },
			"Password reset email sent",
		);
	} catch (error) {
		// Log error but don't expose whether user exists
		logger.warn(
			{ email, error, event: "password_reset_request_failed" },
			"Password reset request failed (user may not exist)",
		);
	}

	// Always return success to prevent user enumeration
	return {
		success: true,
		message:
			"If an account exists with this email, a password reset link has been sent",
	};
}
