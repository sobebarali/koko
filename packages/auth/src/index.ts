import { db } from "@koko/db";
import * as schema from "@koko/db/schema/auth";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sendPasswordResetEmail, sendVerificationEmail } from "./lib/email";

export const auth = betterAuth<BetterAuthOptions>({
	database: drizzleAdapter(db, {
		provider: "sqlite",

		schema: schema,
	}),
	trustedOrigins:
		process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()) || [],
	emailAndPassword: {
		enabled: true,
		sendResetPassword: async ({ user, url }) => {
			await sendPasswordResetEmail({ user, url });
		},
		resetPasswordTokenExpiresIn: 3600, // 1 hour
	},
	emailVerification: {
		sendVerificationEmail: async ({ user, url }) => {
			await sendVerificationEmail({ user, url });
		},
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		expiresIn: 3600, // 1 hour
	},
	advanced: {
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
			httpOnly: true,
		},
	},
});
