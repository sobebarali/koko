import { db } from "@koko/db";
import { user } from "@koko/db/schema/auth";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../index";

const privateProfileSelect = {
	id: user.id,
	email: user.email,
	name: user.name,
	emailVerified: user.emailVerified,
	image: user.image,
	bio: user.bio,
	title: user.title,
	company: user.company,
	location: user.location,
	website: user.website,
	createdAt: user.createdAt,
	updatedAt: user.updatedAt,
};

const publicProfileSelect = {
	id: user.id,
	name: user.name,
	image: user.image,
	bio: user.bio,
	title: user.title,
	company: user.company,
	location: user.location,
	website: user.website,
};

const AVATAR_MAX_FILE_SIZE = 5 * 1024 * 1024;
const AVATAR_MIME_MAP = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"image/gif": "gif",
} as const;

const avatarUploadInput = z.object({
	fileName: z.string().min(1).max(255),
	fileSize: z.number().int().positive().max(AVATAR_MAX_FILE_SIZE),
	mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
});

const updateProfileInput = z
	.object({
		name: z.string().min(1).max(100).trim().optional(),
		bio: z.string().max(500).optional(),
		title: z.string().max(100).optional(),
		company: z.string().max(100).optional(),
		location: z.string().max(100).optional(),
		website: z.string().url().optional(),
	})
	.refine(
		(input) => Object.values(input).some((value) => value !== undefined),
		{
			message: "At least one field must be provided.",
			path: [],
		},
	);

export const userRouter = router({
	getProfile: protectedProcedure.query(async ({ ctx }) => {
		const [profile] = await db
			.select(privateProfileSelect)
			.from(user)
			.where(eq(user.id, ctx.session.user.id))
			.limit(1);

		if (!profile) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "User not found",
			});
		}

		return { user: profile };
	}),
	getById: protectedProcedure
		.input(
			z.object({
				id: z.string().min(1),
			}),
		)
		.query(async ({ input }) => {
			const [profile] = await db
				.select(publicProfileSelect)
				.from(user)
				.where(eq(user.id, input.id))
				.limit(1);

			if (!profile) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User not found",
				});
			}

			return { user: profile };
		}),
	updateProfile: protectedProcedure
		.input(updateProfileInput)
		.mutation(async ({ ctx, input }) => {
			const updateData: Record<string, string | undefined> = {};

			if (input.name !== undefined) {
				updateData.name = input.name;
			}
			if (input.bio !== undefined) {
				updateData.bio = input.bio;
			}
			if (input.title !== undefined) {
				updateData.title = input.title;
			}
			if (input.company !== undefined) {
				updateData.company = input.company;
			}
			if (input.location !== undefined) {
				updateData.location = input.location;
			}
			if (input.website !== undefined) {
				updateData.website = input.website;
			}

			const [updated] = await db
				.update(user)
				.set(updateData)
				.where(eq(user.id, ctx.session.user.id))
				.returning(privateProfileSelect);

			if (!updated) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User not found",
				});
			}

			return { user: updated };
		}),
	uploadAvatar: protectedProcedure
		.input(avatarUploadInput)
		.mutation(async ({ ctx, input }) => {
			const storageZone = process.env.BUNNY_STORAGE_ZONE;
			const storageAccessKey = process.env.BUNNY_STORAGE_ACCESS_KEY;
			const storageEndpoint =
				process.env.BUNNY_STORAGE_ENDPOINT ?? "https://storage.bunnycdn.com";
			const cdnBaseUrl = process.env.BUNNY_STORAGE_CDN_URL;

			if (!storageZone || !storageAccessKey || !cdnBaseUrl) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Avatar storage is not configured.",
				});
			}

			const extension = AVATAR_MIME_MAP[input.mimeType];
			if (!extension) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Unsupported file type.",
				});
			}

			const normalizedEndpoint = storageEndpoint.replace(/\/+$/, "");
			const normalizedCdnBase = cdnBaseUrl.replace(/\/+$/, "");
			const sanitizedName = sanitizeFileName(input.fileName);
			const objectKey = `avatars/${ctx.session.user.id}/${Date.now()}-${sanitizedName}.${extension}`;

			const uploadUrl = `${normalizedEndpoint}/${storageZone}/${objectKey}`;
			const avatarUrl = `${normalizedCdnBase}/${objectKey}`;

			return {
				uploadUrl,
				uploadHeaders: {
					AccessKey: storageAccessKey,
					"Content-Type": input.mimeType,
				},
				avatarUrl,
			};
		}),
});

function sanitizeFileName(fileName: string) {
	return (
		fileName
			.replace(/\.[^/.]+$/, "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "avatar"
	);
}
