import { protectedProcedure, publicProcedure, router } from "../index";
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
	project: projectRouter,
	todo: todoRouter,
	user: userRouter,
	video: videoRouter,
});
export type AppRouter = typeof appRouter;
