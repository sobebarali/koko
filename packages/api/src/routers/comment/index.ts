import { protectedProcedure, router } from "../../index";
import { createComment } from "./create/service";
import { createCommentInput } from "./create/validator";
import { deleteComment } from "./delete/service";
import { deleteCommentInput } from "./delete/validator";
import { getAllComments } from "./get-all/service";
import { getAllCommentsInput } from "./get-all/validator";
import { getCommentById } from "./get-by-id/service";
import { getCommentByIdInput } from "./get-by-id/validator";
import { replyToComment } from "./reply/service";
import { replyToCommentInput } from "./reply/validator";
import { resolveComment } from "./resolve/service";
import { resolveCommentInput } from "./resolve/validator";
import { searchComments } from "./search/service";
import { searchCommentsInput } from "./search/validator";
import { unresolveComment } from "./unresolve/service";
import { unresolveCommentInput } from "./unresolve/validator";
import { updateComment } from "./update/service";
import { updateCommentInput } from "./update/validator";

export const commentRouter = router({
	create: protectedProcedure
		.input(createCommentInput)
		.mutation(async ({ ctx, input }) => {
			return createComment({
				userId: ctx.session.user.id,
				logger: ctx.logger,
				...input,
			});
		}),

	getAll: protectedProcedure
		.input(getAllCommentsInput)
		.query(async ({ ctx, input }) => {
			return getAllComments({
				userId: ctx.session.user.id,
				logger: ctx.logger,
				...input,
			});
		}),

	getById: protectedProcedure
		.input(getCommentByIdInput)
		.query(async ({ ctx, input }) => {
			return getCommentById({
				userId: ctx.session.user.id,
				logger: ctx.logger,
				...input,
			});
		}),

	reply: protectedProcedure
		.input(replyToCommentInput)
		.mutation(async ({ ctx, input }) => {
			return replyToComment({
				userId: ctx.session.user.id,
				logger: ctx.logger,
				...input,
			});
		}),

	update: protectedProcedure
		.input(updateCommentInput)
		.mutation(async ({ ctx, input }) => {
			return updateComment({
				userId: ctx.session.user.id,
				logger: ctx.logger,
				...input,
			});
		}),

	delete: protectedProcedure
		.input(deleteCommentInput)
		.mutation(async ({ ctx, input }) => {
			return deleteComment({
				userId: ctx.session.user.id,
				logger: ctx.logger,
				...input,
			});
		}),

	resolve: protectedProcedure
		.input(resolveCommentInput)
		.mutation(async ({ ctx, input }) => {
			return resolveComment({
				userId: ctx.session.user.id,
				logger: ctx.logger,
				...input,
			});
		}),

	unresolve: protectedProcedure
		.input(unresolveCommentInput)
		.mutation(async ({ ctx, input }) => {
			return unresolveComment({
				userId: ctx.session.user.id,
				logger: ctx.logger,
				...input,
			});
		}),

	search: protectedProcedure
		.input(searchCommentsInput)
		.query(async ({ ctx, input }) => {
			return searchComments({
				userId: ctx.session.user.id,
				logger: ctx.logger,
				...input,
			});
		}),
});
