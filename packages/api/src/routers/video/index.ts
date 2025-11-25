import { protectedProcedure, router } from "../../index";
import { createUpload } from "./create-upload/service";
import { createUploadInput } from "./create-upload/validator";
import { deleteVideo } from "./delete/service";
import { deleteInput } from "./delete/validator";
import { getAll } from "./get-all/service";
import { getAllInput } from "./get-all/validator";
import { getById } from "./get-by-id/service";
import { getByIdInput } from "./get-by-id/validator";
import { getPlaybackUrl } from "./get-playback-url/service";
import { getPlaybackUrlInput } from "./get-playback-url/validator";
import { updateMetadata } from "./update-metadata/service";
import { updateMetadataInput } from "./update-metadata/validator";

export const videoRouter = router({
	createUpload: protectedProcedure
		.input(createUploadInput)
		.mutation(async ({ ctx, input }) => {
			return createUpload({
				userId: ctx.session.user.id,
				logger: ctx.logger,
				...input,
			});
		}),

	getById: protectedProcedure
		.input(getByIdInput)
		.query(async ({ ctx, input }) => {
			return getById({
				id: input.id,
				userId: ctx.session.user.id,
				logger: ctx.logger,
			});
		}),

	getAll: protectedProcedure
		.input(getAllInput)
		.query(async ({ ctx, input }) => {
			return getAll({
				userId: ctx.session.user.id,
				logger: ctx.logger,
				...input,
			});
		}),

	updateMetadata: protectedProcedure
		.input(updateMetadataInput)
		.mutation(async ({ ctx, input }) => {
			return updateMetadata({
				userId: ctx.session.user.id,
				logger: ctx.logger,
				...input,
			});
		}),

	delete: protectedProcedure
		.input(deleteInput)
		.mutation(async ({ ctx, input }) => {
			return deleteVideo({
				userId: ctx.session.user.id,
				id: input.id,
				logger: ctx.logger,
			});
		}),

	getPlaybackUrl: protectedProcedure
		.input(getPlaybackUrlInput)
		.query(async ({ ctx, input }) => {
			return getPlaybackUrl({
				userId: ctx.session.user.id,
				id: input.id,
				logger: ctx.logger,
			});
		}),
});
