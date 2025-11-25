import { protectedProcedure, router } from "../../index";
import { getById } from "./services/get-by-id";
import { getProfile } from "./services/get-profile";
import { updateProfile } from "./services/update-profile";
import { uploadAvatar } from "./services/upload-avatar";
import { getByIdInput } from "./validators/get-by-id";
import { updateProfileInput } from "./validators/update-profile";
import { avatarUploadInput } from "./validators/upload-avatar";

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
