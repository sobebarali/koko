import { z } from "zod";

export const resetPasswordInput = z.object({
	token: z.string().min(1, "Token is required"),
	newPassword: z
		.string()
		.min(8, "Password must be at least 8 characters")
		.max(72, "Password must be at most 72 characters"),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordInput>;
