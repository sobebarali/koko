import {
	account,
	comment,
	project,
	projectMember,
	sceneDetection,
	transcription,
	user,
	verification,
	video,
} from "@koko/db/schema/index";
import { eq } from "drizzle-orm";
import type { TestDb } from "./test-db";

/**
 * Generates a unique ID for test entities
 */
export function generateId(): string {
	return crypto.randomUUID();
}

/**
 * Creates a test user in the database
 */
export async function createTestUser(
	db: TestDb,
	overrides?: Partial<{
		id: string;
		name: string;
		email: string;
		emailVerified: boolean;
		image: string | null;
		bio: string | null;
		title: string | null;
		company: string | null;
		location: string | null;
		website: string | null;
	}>,
): Promise<{
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	image: string | null;
	bio: string | null;
	title: string | null;
	company: string | null;
	location: string | null;
	website: string | null;
	createdAt: Date;
	updatedAt: Date;
}> {
	const id = overrides?.id ?? generateId();
	const now = new Date();

	const [createdUser] = await db
		.insert(user)
		.values({
			id,
			name: overrides?.name ?? "Test User",
			email: overrides?.email ?? `test-${id}@example.com`,
			emailVerified: overrides?.emailVerified ?? false,
			image: overrides?.image ?? null,
			bio: overrides?.bio ?? null,
			title: overrides?.title ?? null,
			company: overrides?.company ?? null,
			location: overrides?.location ?? null,
			website: overrides?.website ?? null,
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	if (!createdUser) {
		throw new Error("Failed to create test user");
	}

	return createdUser;
}

/**
 * Creates a test project with the owner as a member
 */
export async function createTestProject(
	db: TestDb,
	overrides: Partial<{
		id: string;
		name: string;
		description: string | null;
		ownerId: string;
		status: "active" | "archived";
		color: string | null;
		bunnyCollectionId: string | null;
		videoCount: number;
		memberCount: number;
		commentCount: number;
	}>,
): Promise<{
	id: string;
	name: string;
	description: string | null;
	ownerId: string;
	status: "active" | "archived";
	color: string | null;
	thumbnail: string | null;
	bunnyCollectionId: string | null;
	videoCount: number;
	memberCount: number;
	commentCount: number;
	createdAt: Date;
	updatedAt: Date;
}> {
	const projectId = overrides?.id ?? generateId();
	const now = new Date();
	const ownerId = overrides.ownerId;

	if (!ownerId) {
		throw new Error("ownerId is required for createTestProject");
	}

	const [createdProject] = await db
		.insert(project)
		.values({
			id: projectId,
			name: overrides?.name ?? "Test Project",
			description: overrides?.description ?? null,
			ownerId,
			status: overrides?.status ?? "active",
			color: overrides?.color ?? null,
			thumbnail: null,
			bunnyCollectionId: overrides?.bunnyCollectionId ?? null,
			videoCount: overrides?.videoCount ?? 0,
			memberCount: overrides?.memberCount ?? 1,
			commentCount: overrides?.commentCount ?? 0,
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	if (!createdProject) {
		throw new Error("Failed to create test project");
	}

	// Create owner as project member
	await db.insert(projectMember).values({
		id: generateId(),
		projectId,
		userId: ownerId,
		role: "owner",
		canUpload: true,
		canComment: true,
		canInvite: true,
		canDelete: true,
		joinedAt: now,
	});

	return createdProject;
}

/**
 * Adds a member to a project
 */
export async function addProjectMember(
	db: TestDb,
	projectId: string,
	userId: string,
	overrides?: Partial<{
		id: string;
		role: "owner" | "editor" | "reviewer" | "viewer";
		canUpload: boolean;
		canComment: boolean;
		canInvite: boolean;
		canDelete: boolean;
		invitedBy: string | null;
	}>,
): Promise<{
	id: string;
	projectId: string;
	userId: string;
	role: "owner" | "editor" | "reviewer" | "viewer";
	canUpload: boolean;
	canComment: boolean;
	canInvite: boolean;
	canDelete: boolean;
	invitedBy: string | null;
	joinedAt: Date;
}> {
	const [member] = await db
		.insert(projectMember)
		.values({
			id: overrides?.id ?? generateId(),
			projectId,
			userId,
			role: overrides?.role ?? "viewer",
			canUpload: overrides?.canUpload ?? false,
			canComment: overrides?.canComment ?? true,
			canInvite: overrides?.canInvite ?? false,
			canDelete: overrides?.canDelete ?? false,
			invitedBy: overrides?.invitedBy ?? null,
			joinedAt: new Date(),
		})
		.returning();

	if (!member) {
		throw new Error("Failed to add project member");
	}

	// Update project member count
	await db
		.update(project)
		.set({
			memberCount: (
				await db
					.select()
					.from(projectMember)
					.where(eq(projectMember.projectId, projectId))
			).length,
		})
		.where(eq(project.id, projectId));

	return member;
}

/**
 * Creates a test video in a project
 */
export async function createTestVideo(
	db: TestDb,
	projectId: string,
	uploadedBy: string,
	overrides?: Partial<{
		id: string;
		title: string;
		description: string | null;
		bunnyVideoId: string;
		bunnyLibraryId: string;
		originalFileName: string;
		fileSize: number;
		mimeType: string;
		duration: number;
		status: "uploading" | "processing" | "ready" | "failed";
	}>,
): Promise<{
	id: string;
	projectId: string;
	uploadedBy: string;
	bunnyVideoId: string;
	bunnyLibraryId: string;
	title: string;
	description: string | null;
	originalFileName: string;
	fileSize: number;
	mimeType: string;
	duration: number;
	status: "uploading" | "processing" | "ready" | "failed";
	createdAt: Date;
	updatedAt: Date;
}> {
	const videoId = overrides?.id ?? generateId();
	const now = new Date();

	const [createdVideo] = await db
		.insert(video)
		.values({
			id: videoId,
			projectId,
			uploadedBy,
			bunnyVideoId: overrides?.bunnyVideoId ?? `bunny-${videoId}`,
			bunnyLibraryId: overrides?.bunnyLibraryId ?? "test-library",
			title: overrides?.title ?? "Test Video",
			description: overrides?.description ?? null,
			originalFileName: overrides?.originalFileName ?? "test-video.mp4",
			fileSize: overrides?.fileSize ?? 1024000,
			mimeType: overrides?.mimeType ?? "video/mp4",
			duration: overrides?.duration ?? 60,
			width: 1920,
			height: 1080,
			fps: 30,
			status: overrides?.status ?? "ready",
			viewCount: 0,
			commentCount: 0,
			versionNumber: 1,
			isCurrentVersion: true,
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	if (!createdVideo) {
		throw new Error("Failed to create test video");
	}

	// Update project video count
	await db
		.update(project)
		.set({
			videoCount: (
				await db.select().from(video).where(eq(video.projectId, projectId))
			).length,
		})
		.where(eq(project.id, projectId));

	return createdVideo;
}

/**
 * Creates a test comment on a video
 */
export async function createTestComment(
	db: TestDb,
	videoId: string,
	authorId: string,
	overrides?: Partial<{
		id: string;
		text: string;
		timecode: number;
		parentId: string | null;
		resolved: boolean;
	}>,
): Promise<{
	id: string;
	videoId: string;
	authorId: string;
	text: string;
	timecode: number;
	parentId: string | null;
	replyCount: number;
	resolved: boolean;
	createdAt: Date;
	updatedAt: Date;
}> {
	const commentId = overrides?.id ?? generateId();
	const now = new Date();

	const [createdComment] = await db
		.insert(comment)
		.values({
			id: commentId,
			videoId,
			authorId,
			text: overrides?.text ?? "Test comment",
			timecode: overrides?.timecode ?? 0,
			parentId: overrides?.parentId ?? null,
			replyCount: 0,
			resolved: overrides?.resolved ?? false,
			edited: false,
			mentions: [],
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	if (!createdComment) {
		throw new Error("Failed to create test comment");
	}

	// If this is a reply, increment parent reply count
	if (overrides?.parentId) {
		const parent = await db.query.comment.findFirst({
			where: eq(comment.id, overrides.parentId),
		});
		if (parent) {
			await db
				.update(comment)
				.set({ replyCount: parent.replyCount + 1 })
				.where(eq(comment.id, overrides.parentId));
		}
	}

	// Update video and project comment counts
	const videoRecord = await db.query.video.findFirst({
		where: eq(video.id, videoId),
	});
	if (videoRecord) {
		await db
			.update(video)
			.set({
				commentCount: (
					await db.select().from(comment).where(eq(comment.videoId, videoId))
				).length,
			})
			.where(eq(video.id, videoId));

		await db
			.update(project)
			.set({
				commentCount: (
					await db
						.select()
						.from(comment)
						.innerJoin(video, eq(comment.videoId, video.id))
						.where(eq(video.projectId, videoRecord.projectId))
				).length,
			})
			.where(eq(project.id, videoRecord.projectId));
	}

	return createdComment;
}

/**
 * Creates a transcription for a video
 */
export async function createTestTranscription(
	db: TestDb,
	videoId: string,
	overrides?: Partial<{
		id: string;
		status: "pending" | "processing" | "completed" | "failed";
		language: string;
		fullText: string | null;
	}>,
): Promise<{
	id: string;
	videoId: string;
	status: "pending" | "processing" | "completed" | "failed";
	language: string;
	fullText: string | null;
	createdAt: Date;
}> {
	const [created] = await db
		.insert(transcription)
		.values({
			id: overrides?.id ?? generateId(),
			videoId,
			status: overrides?.status ?? "completed",
			language: overrides?.language ?? "en",
			fullText: overrides?.fullText ?? "Test transcription text",
			createdAt: new Date(),
		})
		.returning();

	if (!created) {
		throw new Error("Failed to create test transcription");
	}

	return created;
}

/**
 * Creates scene detection for a video
 */
export async function createTestSceneDetection(
	db: TestDb,
	videoId: string,
	overrides?: Partial<{
		id: string;
		status: "pending" | "processing" | "completed" | "failed";
		scenes: { start: number; end: number }[];
	}>,
): Promise<{
	id: string;
	videoId: string;
	status: "pending" | "processing" | "completed" | "failed";
	scenes: { start: number; end: number }[] | null;
	createdAt: Date;
}> {
	const [created] = await db
		.insert(sceneDetection)
		.values({
			id: overrides?.id ?? generateId(),
			videoId,
			status: overrides?.status ?? "completed",
			scenes: overrides?.scenes ?? [
				{ start: 0, end: 10 },
				{ start: 10, end: 20 },
			],
			createdAt: new Date(),
		})
		.returning();

	if (!created) {
		throw new Error("Failed to create test scene detection");
	}

	return created;
}

/**
 * Creates a user account (for password-based auth)
 */
export async function createTestAccount(
	db: TestDb,
	userId: string,
	overrides?: Partial<{
		id: string;
		password: string;
		providerId: string;
	}>,
): Promise<{
	id: string;
	userId: string;
	providerId: string;
	accountId: string;
}> {
	const [created] = await db
		.insert(account)
		.values({
			id: overrides?.id ?? generateId(),
			userId,
			providerId: overrides?.providerId ?? "credential",
			accountId: userId,
			password: overrides?.password ?? null,
			createdAt: new Date(),
			updatedAt: new Date(),
		})
		.returning();

	if (!created) {
		throw new Error("Failed to create test account");
	}

	return created;
}

/**
 * Creates a verification token
 */
export async function createTestVerification(
	db: TestDb,
	overrides?: Partial<{
		id: string;
		identifier: string;
		value: string;
		expiresAt: Date;
	}>,
): Promise<{
	id: string;
	identifier: string;
	value: string;
	expiresAt: Date;
}> {
	const [created] = await db
		.insert(verification)
		.values({
			id: overrides?.id ?? generateId(),
			identifier: overrides?.identifier ?? "test@example.com",
			value: overrides?.value ?? "test-token",
			expiresAt: overrides?.expiresAt ?? new Date(Date.now() + 3600000), // 1 hour from now
			createdAt: new Date(),
			updatedAt: new Date(),
		})
		.returning();

	if (!created) {
		throw new Error("Failed to create test verification");
	}

	return created;
}

/**
 * Gets project with owner details (mimics the actual query pattern)
 */
export async function getProjectWithOwner(
	db: TestDb,
	projectId: string,
): Promise<{
	id: string;
	name: string;
	description: string | null;
	ownerId: string;
	status: "active" | "archived";
	color: string | null;
	thumbnail: string | null;
	bunnyCollectionId: string | null;
	videoCount: number;
	memberCount: number;
	commentCount: number;
	createdAt: Date;
	updatedAt: Date;
	owner: {
		id: string;
		name: string;
		image: string | null;
	};
} | null> {
	const result = await db.query.project.findFirst({
		where: eq(project.id, projectId),
		with: {
			owner: {
				columns: {
					id: true,
					name: true,
					image: true,
				},
			},
		},
	});

	return result ?? null;
}
