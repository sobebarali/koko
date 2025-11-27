import { protectedProcedure, router } from "../../index";
import { archiveProject } from "./archive/service";
import { archiveProjectInput } from "./archive/validator";
import { createProject } from "./create/service";
import { createProjectInput } from "./create/validator";
import { deleteProject } from "./delete/service";
import { deleteProjectInput } from "./delete/validator";
import { duplicateProject } from "./duplicate/service";
import { duplicateProjectInput } from "./duplicate/validator";
import { getAll } from "./get-all/service";
import { getAllInput } from "./get-all/validator";
import { getById } from "./get-by-id/service";
import { getByIdInput } from "./get-by-id/validator";
import { restoreProject } from "./restore/service";
import { restoreProjectInput } from "./restore/validator";
import { updateProject } from "./update/service";
import { updateProjectInput } from "./update/validator";

export const projectRouter = router({
	create: protectedProcedure
		.input(createProjectInput)
		.mutation(async ({ ctx, input }) => {
			return createProject({
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
				status: input.status,
				limit: input.limit,
				cursor: input.cursor,
				logger: ctx.logger,
			});
		}),

	update: protectedProcedure
		.input(updateProjectInput)
		.mutation(async ({ ctx, input }) => {
			return updateProject({
				userId: ctx.session.user.id,
				logger: ctx.logger,
				...input,
			});
		}),

	delete: protectedProcedure
		.input(deleteProjectInput)
		.mutation(async ({ ctx, input }) => {
			return deleteProject({
				userId: ctx.session.user.id,
				id: input.id,
				logger: ctx.logger,
			});
		}),

	archive: protectedProcedure
		.input(archiveProjectInput)
		.mutation(async ({ ctx, input }) => {
			return archiveProject({
				userId: ctx.session.user.id,
				id: input.id,
				logger: ctx.logger,
			});
		}),

	restore: protectedProcedure
		.input(restoreProjectInput)
		.mutation(async ({ ctx, input }) => {
			return restoreProject({
				userId: ctx.session.user.id,
				id: input.id,
				logger: ctx.logger,
			});
		}),

	duplicate: protectedProcedure
		.input(duplicateProjectInput)
		.mutation(async ({ ctx, input }) => {
			return duplicateProject({
				userId: ctx.session.user.id,
				id: input.id,
				name: input.name,
				logger: ctx.logger,
			});
		}),
});
