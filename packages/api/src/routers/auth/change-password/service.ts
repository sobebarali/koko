import { auth } from "@koko/auth";
import { TRPCError } from "@trpc/server";
import type { Logger } from "pino";
import type { ChangePasswordResult } from "./type";

export async function changePassword({
	currentPassword,
	newPassword,
	revokeOtherSessions,
	headers,
	logger,
}: {
	currentPassword: string;
	newPassword: string;
	revokeOtherSessions: boolean;
	headers: Headers;
	logger: Logger;
}): Promise<ChangePasswordResult> {
	try {
		await auth.api.changePassword({
			body: {
				currentPassword,
				newPassword,
				revokeOtherSessions,
			},
			headers,
		});

		logger.info(
			{ event: "password_changed", revokeOtherSessions },
			"Password changed successfully",
		);

		return {
			success: true,
			message: "Password changed successfully",
		};
	} catch (error) {
		logger.error(
			{ error, event: "password_change_failed" },
			"Password change failed",
		);

		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Invalid current password",
		});
	}
}
