import { z } from "zod";

export const verifyEmailInput = z.object({
	token: z.string().min(1, "Token is required"),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailInput>;
