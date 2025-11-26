import { protectedProcedure, publicProcedure, router } from "../index";
import { authRouter } from "./auth";
import { commentRouter } from "./comment";
import { projectRouter } from "./project";
import { todoRouter } from "./todo";
import { userRouter } from "./user";
import { videoRouter } from "./video";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: "This is private",
			user: ctx.session.user,
		};
	}),
	auth: authRouter,
	comment: commentRouter,
	project: projectRouter,
	todo: todoRouter,
	user: userRouter,
	video: videoRouter,
});
export type AppRouter = typeof appRouter;
