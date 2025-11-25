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
		return getProfile({ userId: ctx.session.user.id });
	}),

	getById: protectedProcedure.input(getByIdInput).query(async ({ input }) => {
		return getById({ id: input.id });
	}),

	updateProfile: protectedProcedure
		.input(updateProfileInput)
		.mutation(async ({ ctx, input }) => {
			return updateProfile({ userId: ctx.session.user.id, ...input });
		}),

	uploadAvatar: protectedProcedure
		.input(avatarUploadInput)
		.mutation(async ({ ctx, input }) => {
			return uploadAvatar({
				userId: ctx.session.user.id,
				fileName: input.fileName,
				mimeType: input.mimeType,
			});
		}),
});
