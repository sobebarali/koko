import { protectedProcedure, publicProcedure, router } from "../../index";
import { changePassword } from "./change-password/service";
import { changePasswordInput } from "./change-password/validator";
import { requestPasswordReset } from "./request-password-reset/service";
import { requestPasswordResetInput } from "./request-password-reset/validator";
import { resetPassword } from "./reset-password/service";
import { resetPasswordInput } from "./reset-password/validator";
import { verifyEmail } from "./verify-email/service";
import { verifyEmailInput } from "./verify-email/validator";

export const authRouter = router({
	verifyEmail: publicProcedure
		.input(verifyEmailInput)
		.mutation(async ({ ctx, input }) => {
			return verifyEmail({
				token: input.token,
				logger: ctx.logger,
			});
		}),

	requestPasswordReset: publicProcedure
		.input(requestPasswordResetInput)
		.mutation(async ({ ctx, input }) => {
			return requestPasswordReset({
				email: input.email,
				redirectTo: input.redirectTo,
				logger: ctx.logger,
			});
		}),

	resetPassword: publicProcedure
		.input(resetPasswordInput)
		.mutation(async ({ ctx, input }) => {
			return resetPassword({
				token: input.token,
				newPassword: input.newPassword,
				logger: ctx.logger,
			});
		}),

	changePassword: protectedProcedure
		.input(changePasswordInput)
		.mutation(async ({ ctx, input }) => {
			return changePassword({
				currentPassword: input.currentPassword,
				newPassword: input.newPassword,
				revokeOtherSessions: input.revokeOtherSessions,
				headers: ctx.headers,
				logger: ctx.logger,
			});
		}),
});
