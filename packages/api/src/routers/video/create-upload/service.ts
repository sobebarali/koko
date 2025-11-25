import { createHash } from "node:crypto";
import { db } from "@koko/db";
import { project, projectMember } from "@koko/db/schema/project";
import { video } from "@koko/db/schema/video";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import type { CreateUploadInput, CreateUploadOutput } from "./type";

export async function createUpload({
	userId,
	projectId,
	title,
	description,
	tags,
	fileName,
	fileSize,
	mimeType,
	logger,
}: {
	userId: string;
	logger: Logger;
} & CreateUploadInput): Promise<CreateUploadOutput> {
	logger.debug(
		{ event: "create_upload_start", userId, projectId, fileName },
		"Creating video upload",
	);

	try {
		// 1. Validate environment variables
		const apiKey = process.env.BUNNY_API_KEY;
		const libraryId = process.env.BUNNY_LIBRARY_ID;
		if (!apiKey || !libraryId) {
			logger.error(
				{ event: "create_upload_config_missing", userId },
				"Bunny Stream API is not configured",
			);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Video storage is not configured.",
			});
		}

		// 2. Verify project exists
		const projects = await db
			.select({ id: project.id, ownerId: project.ownerId })
			.from(project)
			.where(eq(project.id, projectId))
			.limit(1);

		if (projects.length === 0) {
			logger.warn(
				{ event: "create_upload_project_not_found", projectId },
				"Project not found",
			);
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Project not found",
			});
		}

		const projectData = projects[0];
		if (!projectData) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to retrieve project data.",
			});
		}

		// 3. Check project membership
		const isOwner = projectData.ownerId === userId;
		if (!isOwner) {
			const membership = await db
				.select({ id: projectMember.id, canUpload: projectMember.canUpload })
				.from(projectMember)
				.where(
					and(
						eq(projectMember.projectId, projectId),
						eq(projectMember.userId, userId),
					),
				)
				.limit(1);

			if (membership.length === 0) {
				logger.warn(
					{ event: "create_upload_forbidden", projectId, userId },
					"User is not a member of this project",
				);
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You do not have access to this project",
				});
			}

			const memberData = membership[0];
			if (!memberData || !memberData.canUpload) {
				logger.warn(
					{ event: "create_upload_no_permission", projectId, userId },
					"User does not have upload permission",
				);
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You do not have permission to upload videos",
				});
			}
		}

		// 4. Call Bunny.net API to create video
		const bunnyResponse = await fetch(
			`https://video.bunnycdn.com/library/${libraryId}/videos`,
			{
				method: "POST",
				headers: {
					AccessKey: apiKey,
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({ title }),
			},
		);

		if (!bunnyResponse.ok) {
			logger.error(
				{ event: "create_upload_bunny_error", status: bunnyResponse.status },
				"Failed to create video on Bunny.net",
			);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to initialize video upload.",
			});
		}

		const bunnyVideo = (await bunnyResponse.json()) as { guid: string };

		// 5. Generate TUS authentication signature
		const expirationTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours
		const signatureData = `${libraryId}${apiKey}${expirationTime}${bunnyVideo.guid}`;
		const signature = createHash("sha256").update(signatureData).digest("hex");

		// 6. Insert video record in database
		const videoId = crypto.randomUUID();
		const [newVideo] = await db
			.insert(video)
			.values({
				id: videoId,
				projectId,
				uploadedBy: userId,
				bunnyVideoId: bunnyVideo.guid,
				bunnyLibraryId: libraryId,
				title,
				description: description ?? null,
				tags: tags ?? [],
				originalFileName: fileName,
				fileSize,
				mimeType,
				status: "uploading",
			})
			.returning({
				id: video.id,
				bunnyVideoId: video.bunnyVideoId,
				status: video.status,
			});

		if (!newVideo) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to create video record.",
			});
		}

		logger.info(
			{
				event: "create_upload_success",
				videoId,
				bunnyVideoId: bunnyVideo.guid,
			},
			"Video upload initialized successfully",
		);

		// 7. Return upload credentials
		return {
			video: {
				id: newVideo.id,
				bunnyVideoId: newVideo.bunnyVideoId,
				status: newVideo.status as "uploading",
			},
			upload: {
				endpoint: "https://video.bunnycdn.com/tusupload",
				headers: {
					AuthorizationSignature: signature,
					AuthorizationExpire: expirationTime,
					VideoId: bunnyVideo.guid,
					LibraryId: libraryId,
				},
				metadata: {
					filetype: mimeType,
					title,
				},
			},
		};
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "create_upload_error",
				userId,
				projectId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to create video upload",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to create video upload.",
		});
	}
}
