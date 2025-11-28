import { db } from "@koko/db";
import { project, projectMember } from "@koko/db/schema/project";
import { sceneDetection, transcription, video } from "@koko/db/schema/video";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import { projectListSelect } from "../constants";
import type { DuplicateProjectOutput } from "./type";

export async function duplicateProject({
	userId,
	id,
	name,
	logger,
}: {
	userId: string;
	id: string;
	name?: string;
	logger: Logger;
}): Promise<DuplicateProjectOutput> {
	logger.debug(
		{ event: "duplicate_project_start", projectId: id, userId },
		"Duplicating project",
	);

	try {
		// Fetch source project
		const sourceProject = await db
			.select()
			.from(project)
			.where(and(eq(project.id, id)))
			.limit(1);

		if (sourceProject.length === 0) {
			logger.warn(
				{ event: "duplicate_project_not_found", projectId: id },
				"Project not found",
			);
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Project not found",
			});
		}

		const source = sourceProject[0];
		if (!source) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Project not found",
			});
		}

		// Check user is owner or member
		const membership = await db
			.select({ role: projectMember.role })
			.from(projectMember)
			.where(
				and(eq(projectMember.projectId, id), eq(projectMember.userId, userId)),
			)
			.limit(1);

		const isOwner = source.ownerId === userId;
		const isMember = membership.length > 0;

		if (!isOwner && !isMember) {
			logger.warn(
				{ event: "duplicate_project_forbidden", projectId: id, userId },
				"User is not the owner or member of this project",
			);
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only project owner or members can duplicate this project",
			});
		}

		// Fetch source members
		const sourceMembers = await db
			.select()
			.from(projectMember)
			.where(eq(projectMember.projectId, id));

		// Fetch source videos
		const sourceVideos = await db
			.select()
			.from(video)
			.where(eq(video.projectId, id));

		// Fetch transcriptions for source videos
		const sourceVideoIds = sourceVideos.map((v) => v.id);
		const sourceTranscriptions =
			sourceVideoIds.length > 0
				? await db
						.select()
						.from(transcription)
						.where(
							sourceVideoIds.length === 1
								? eq(transcription.videoId, sourceVideoIds[0] as string)
								: undefined,
						)
						.then((results) =>
							results.filter((t) => sourceVideoIds.includes(t.videoId)),
						)
				: [];

		// Fetch scene detections for source videos
		const sourceSceneDetections =
			sourceVideoIds.length > 0
				? await db
						.select()
						.from(sceneDetection)
						.where(
							sourceVideoIds.length === 1
								? eq(sceneDetection.videoId, sourceVideoIds[0] as string)
								: undefined,
						)
						.then((results) =>
							results.filter((s) => sourceVideoIds.includes(s.videoId)),
						)
				: [];

		// Create new project
		const newProjectId = crypto.randomUUID();
		const newProjectName = name ?? `Copy of ${source.name}`;

		const [newProject] = await db
			.insert(project)
			.values({
				id: newProjectId,
				name: newProjectName,
				description: source.description,
				color: source.color,
				ownerId: userId,
				status: "active",
				videoCount: sourceVideos.length,
				memberCount: sourceMembers.length,
				commentCount: 0,
			})
			.returning(projectListSelect);

		if (!newProject) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to create duplicate project.",
			});
		}

		// Copy members
		const memberInserts = sourceMembers.map((member) => ({
			id: crypto.randomUUID(),
			projectId: newProjectId,
			userId: member.userId,
			role: member.userId === userId ? ("owner" as const) : member.role,
			canUpload: member.userId === userId ? true : member.canUpload,
			canComment: member.canComment,
			canInvite: member.userId === userId ? true : member.canInvite,
			canDelete: member.userId === userId ? true : member.canDelete,
			invitedBy: null,
		}));

		// Ensure current user is a member with owner role
		const userInMembers = memberInserts.some((m) => m.userId === userId);
		if (!userInMembers) {
			memberInserts.push({
				id: crypto.randomUUID(),
				projectId: newProjectId,
				userId,
				role: "owner",
				canUpload: true,
				canComment: true,
				canInvite: true,
				canDelete: true,
				invitedBy: null,
			});
		}

		if (memberInserts.length > 0) {
			await db.insert(projectMember).values(memberInserts);
		}

		// Copy videos and build old->new video ID mapping
		const videoIdMap = new Map<string, string>();

		if (sourceVideos.length > 0) {
			const videoInserts = sourceVideos.map((v) => {
				const newVideoId = crypto.randomUUID();
				videoIdMap.set(v.id, newVideoId);
				return {
					id: newVideoId,
					projectId: newProjectId,
					uploadedBy: userId,
					bunnyVideoId: v.bunnyVideoId,
					bunnyLibraryId: v.bunnyLibraryId,
					bunnyCollectionId: v.bunnyCollectionId,
					title: v.title,
					description: v.description,
					tags: v.tags,
					originalFileName: v.originalFileName,
					fileSize: v.fileSize,
					mimeType: v.mimeType,
					duration: v.duration,
					width: v.width,
					height: v.height,
					fps: v.fps,
					status: v.status,
					processingProgress: v.processingProgress,
					streamingUrl: v.streamingUrl,
					thumbnailUrl: v.thumbnailUrl,
					viewCount: 0,
					commentCount: 0,
					versionNumber: 1,
					parentVideoId: null,
					isCurrentVersion: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				};
			});

			await db.insert(video).values(videoInserts);
		}

		// Copy transcriptions
		if (sourceTranscriptions.length > 0) {
			const transcriptionInserts = sourceTranscriptions
				.filter((t) => videoIdMap.has(t.videoId))
				.map((t) => ({
					id: crypto.randomUUID(),
					videoId: videoIdMap.get(t.videoId) as string,
					status: t.status,
					language: t.language,
					content: t.content,
					fullText: t.fullText,
					provider: t.provider,
					providerId: null,
					errorMessage: null,
					createdAt: new Date(),
					completedAt: t.completedAt,
				}));

			if (transcriptionInserts.length > 0) {
				await db.insert(transcription).values(transcriptionInserts);
			}
		}

		// Copy scene detections
		if (sourceSceneDetections.length > 0) {
			const sceneInserts = sourceSceneDetections
				.filter((s) => videoIdMap.has(s.videoId))
				.map((s) => ({
					id: crypto.randomUUID(),
					videoId: videoIdMap.get(s.videoId) as string,
					status: s.status,
					scenes: s.scenes,
					createdAt: new Date(),
					completedAt: s.completedAt,
				}));

			if (sceneInserts.length > 0) {
				await db.insert(sceneDetection).values(sceneInserts);
			}
		}

		// Update member count to include current user if they weren't in original
		const finalMemberCount = memberInserts.length;
		if (finalMemberCount !== sourceMembers.length) {
			await db
				.update(project)
				.set({ memberCount: finalMemberCount })
				.where(eq(project.id, newProjectId));
		}

		logger.info(
			{
				event: "duplicate_project_success",
				sourceProjectId: id,
				newProjectId,
				userId,
				copiedVideos: sourceVideos.length,
				copiedMembers: memberInserts.length,
			},
			"Project duplicated successfully",
		);

		return {
			project: {
				...newProject,
				memberCount: finalMemberCount,
			},
			copiedVideos: sourceVideos.length,
			copiedMembers: memberInserts.length,
		};
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "duplicate_project_error",
				projectId: id,
				userId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to duplicate project",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to duplicate project.",
		});
	}
}
