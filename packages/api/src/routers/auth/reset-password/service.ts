import { auth } from "@koko/auth";
import { TRPCError } from "@trpc/server";
import type { Logger } from "pino";
import type { ResetPasswordResult } from "./type";

export async function resetPassword({
	token,
	newPassword,
	logger,
}: {
	token: string;
	newPassword: string;
	logger: Logger;
}): Promise<ResetPasswordResult> {
	try {
		await auth.api.resetPassword({
			body: {
				token,
				newPassword,
			},
		});

		logger.info(
			{ event: "password_reset_success" },
			"Password reset successfully",
		);

		return {
			success: true,
			message: "Password reset successfully",
		};
	} catch (error) {
		logger.error(
			{ error, event: "password_reset_failed" },
			"Password reset failed",
		);

		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Invalid or expired reset token",
		});
	}
}
