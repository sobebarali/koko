import { protectedProcedure, router } from "../../index";
import { getById } from "./get-by-id/service";
import { getByIdInput } from "./get-by-id/validator";
import { getProfile } from "./get-profile/service";
import { updateProfile } from "./update-profile/service";
import { updateProfileInput } from "./update-profile/validator";
import { uploadAvatar } from "./upload-avatar/service";
import { avatarUploadInput } from "./upload-avatar/validator";

export const userRouter = router({
	getProfile: protectedProcedure.query(async ({ ctx }) => {
		return getProfile({ userId: ctx.session.user.id, logger: ctx.logger });
	}),

	getById: protectedProcedure
		.input(getByIdInput)
		.query(async ({ ctx, input }) => {
			return getById({ id: input.id, logger: ctx.logger });
		}),

	updateProfile: protectedProcedure
		.input(updateProfileInput)
		.mutation(async ({ ctx, input }) => {
			return updateProfile({
				userId: ctx.session.user.id,
				logger: ctx.logger,
				...input,
			});
		}),

	uploadAvatar: protectedProcedure
		.input(avatarUploadInput)
		.mutation(async ({ ctx, input }) => {
			return uploadAvatar({
				userId: ctx.session.user.id,
				fileName: input.fileName,
				mimeType: input.mimeType,
				logger: ctx.logger,
			});
		}),
});
