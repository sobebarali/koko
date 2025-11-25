import { protectedProcedure, router } from "../../index";
import { createProject } from "./create/service";
import { createProjectInput } from "./create/validator";
import { deleteProject } from "./delete/service";
import { deleteProjectInput } from "./delete/validator";
import { getAll } from "./get-all/service";
import { getAllInput } from "./get-all/validator";
import { getById } from "./get-by-id/service";
import { getByIdInput } from "./get-by-id/validator";
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
});
