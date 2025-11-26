import { z } from "zod";

export const requestPasswordResetInput = z.object({
	email: z.string().email("Invalid email address"),
	redirectTo: z.string().url().optional(),
});

export type RequestPasswordResetInput = z.infer<
	typeof requestPasswordResetInput
>;
