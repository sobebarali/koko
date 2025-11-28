import { project } from "@koko/db/schema/project";
import { video } from "@koko/db/schema/video";
import { eq } from "drizzle-orm";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	expect,
	it,
	vi,
} from "vitest";
import { __clearTestDb, __setTestDb } from "../../setup";
import {
	cleanupTestDb,
	createTestDb,
	type TestClient,
	type TestDb,
} from "../../utils/test-db";
import {
	createTestProject,
	createTestUser,
	createTestVideo,
} from "../../utils/test-fixtures";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

let db: TestDb;
let client: TestClient;

beforeAll(async () => {
	({ db, client } = await createTestDb());
	__setTestDb(db);
});

afterAll(async () => {
	__clearTestDb();
	await cleanupTestDb(client);
});

beforeEach(() => {
	// Setup environment variables for Bunny service
	process.env.BUNNY_API_KEY = "test-api-key";
	process.env.BUNNY_LIBRARY_ID = "test-library-123";
	process.env.BUNNY_CDN_HOSTNAME = "test-cdn.b-cdn.net";

	// Mock fetch
	global.fetch = vi.fn();
});

afterEach(() => {
	vi.restoreAllMocks();
});

it("hard deletes video from database", async () => {
	const user = await createTestUser(db, {
		id: "user_video_hard_delete",
		email: "videoharddelete@example.com",
		name: "Video Hard Delete User",
	});

	const testProject = await createTestProject(db, {
		id: "project_video_delete",
		ownerId: user.id,
		name: "Project for Video Delete",
	});

	const testVideo = await createTestVideo(db, testProject.id, user.id, {
		id: "video_hard_delete",
		bunnyVideoId: "bunny_video_delete",
	});

	// Mock successful Bunny video deletion
	(global.fetch as any).mockResolvedValueOnce({
		ok: true,
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.video.delete({ id: testVideo.id });

	expect(result.success).toBe(true);

	// Verify video is completely removed from database
	const videoInDb = await db.query.video.findFirst({
		where: eq(video.id, testVideo.id),
	});
	expect(videoInDb).toBeUndefined();
});

it("deletes video from Bunny before database deletion", async () => {
	const user = await createTestUser(db, {
		id: "user_bunny_video_delete",
		email: "bunnyvideodelete@example.com",
		name: "Bunny Video Delete User",
	});

	const testProject = await createTestProject(db, {
		id: "project_bunny_video_delete",
		ownerId: user.id,
		name: "Project Bunny Video Delete",
	});

	const testVideo = await createTestVideo(db, testProject.id, user.id, {
		id: "video_bunny_delete",
		bunnyVideoId: "bunny_video_xyz",
	});

	// Mock successful Bunny video deletion
	(global.fetch as any).mockResolvedValueOnce({
		ok: true,
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	await caller.video.delete({ id: testVideo.id });

	// Verify Bunny API was called to delete video
	expect(fetch).toHaveBeenCalledWith(
		`https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/videos/bunny_video_xyz`,
		{
			method: "DELETE",
			headers: {
				Accept: "application/json",
				AccessKey: process.env.BUNNY_API_KEY,
			},
		},
	);
});

it("aborts deletion if Bunny video delete fails", async () => {
	const user = await createTestUser(db, {
		id: "user_bunny_fail_video",
		email: "bunnyfailvideo@example.com",
		name: "Bunny Fail Video User",
	});

	const testProject = await createTestProject(db, {
		id: "project_bunny_fail_video",
		ownerId: user.id,
		name: "Project Bunny Fail Video",
	});

	const testVideo = await createTestVideo(db, testProject.id, user.id, {
		id: "video_bunny_fail",
		bunnyVideoId: "bunny_video_fail",
	});

	// Mock failed Bunny video deletion
	(global.fetch as any).mockResolvedValueOnce({
		ok: false,
		status: 500,
		statusText: "Internal Server Error",
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	// Should throw error
	await expect(caller.video.delete({ id: testVideo.id })).rejects.toThrow();

	// Verify video is NOT deleted from database
	const videoInDb = await db.query.video.findFirst({
		where: eq(video.id, testVideo.id),
	});
	expect(videoInDb).toBeDefined();
	expect(videoInDb?.id).toBe(testVideo.id);
});

it("decrements project video count", async () => {
	const user = await createTestUser(db, {
		id: "user_video_count",
		email: "videocount@example.com",
		name: "Video Count User",
	});

	const testProject = await createTestProject(db, {
		id: "project_video_count",
		ownerId: user.id,
		name: "Project Video Count",
	});

	const testVideo = await createTestVideo(db, testProject.id, user.id, {
		id: "video_count_delete",
		bunnyVideoId: "bunny_video_count",
	});

	// Manually set videoCount to 5 to test decrement logic
	await db
		.update(project)
		.set({ videoCount: 5 })
		.where(eq(project.id, testProject.id));

	// Mock successful Bunny video deletion
	(global.fetch as any).mockResolvedValueOnce({
		ok: true,
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	await caller.video.delete({ id: testVideo.id });

	// Verify project video count was decremented
	const projectInDb = await db.query.project.findFirst({
		where: (project, { eq }) => eq(project.id, testProject.id),
		columns: {
			videoCount: true,
		},
	});

	expect(projectInDb?.videoCount).toBe(4);
});

it("allows uploader to delete their video", async () => {
	const uploader = await createTestUser(db, {
		id: "uploader_user",
		email: "uploader@example.com",
		name: "Uploader User",
	});

	const owner = await createTestUser(db, {
		id: "owner_user",
		email: "owner@example.com",
		name: "Owner User",
	});

	const testProject = await createTestProject(db, {
		id: "project_uploader_delete",
		ownerId: owner.id,
		name: "Project Uploader Delete",
	});

	const testVideo = await createTestVideo(db, testProject.id, uploader.id, {
		id: "video_uploader_delete",
		bunnyVideoId: "bunny_uploader_delete",
	});

	// Mock successful Bunny video deletion
	(global.fetch as any).mockResolvedValueOnce({
		ok: true,
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: uploader.id, email: uploader.email },
		}),
	});

	const result = await caller.video.delete({ id: testVideo.id });

	expect(result.success).toBe(true);

	// Verify video is deleted
	const videoInDb = await db.query.video.findFirst({
		where: eq(video.id, testVideo.id),
	});
	expect(videoInDb).toBeUndefined();
});

it("allows project owner to delete any video", async () => {
	const uploader = await createTestUser(db, {
		id: "uploader_user2",
		email: "uploader2@example.com",
		name: "Uploader User 2",
	});

	const owner = await createTestUser(db, {
		id: "owner_user2",
		email: "owner2@example.com",
		name: "Owner User 2",
	});

	const testProject = await createTestProject(db, {
		id: "project_owner_delete",
		ownerId: owner.id,
		name: "Project Owner Delete",
	});

	const testVideo = await createTestVideo(db, testProject.id, uploader.id, {
		id: "video_owner_delete",
		bunnyVideoId: "bunny_owner_delete",
	});

	// Mock successful Bunny video deletion
	(global.fetch as any).mockResolvedValueOnce({
		ok: true,
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: owner.id, email: owner.email },
		}),
	});

	const result = await caller.video.delete({ id: testVideo.id });

	expect(result.success).toBe(true);

	// Verify video is deleted
	const videoInDb = await db.query.video.findFirst({
		where: eq(video.id, testVideo.id),
	});
	expect(videoInDb).toBeUndefined();
});

it("throws FORBIDDEN for non-member trying to delete", async () => {
	const uploader = await createTestUser(db, {
		id: "uploader_user3",
		email: "uploader3@example.com",
		name: "Uploader User 3",
	});

	const owner = await createTestUser(db, {
		id: "owner_user3",
		email: "owner3@example.com",
		name: "Owner User 3",
	});

	const otherUser = await createTestUser(db, {
		id: "other_user",
		email: "other@example.com",
		name: "Other User",
	});

	const testProject = await createTestProject(db, {
		id: "project_forbidden_delete",
		ownerId: owner.id,
		name: "Project Forbidden Delete",
	});

	const testVideo = await createTestVideo(db, testProject.id, uploader.id, {
		id: "video_forbidden_delete",
		bunnyVideoId: "bunny_forbidden_delete",
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: otherUser.id, email: otherUser.email },
		}),
	});

	await expect(caller.video.delete({ id: testVideo.id })).rejects.toThrow(
		"You do not have permission to delete this video",
	);

	// Verify video is NOT deleted
	const videoInDb = await db.query.video.findFirst({
		where: eq(video.id, testVideo.id),
	});
	expect(videoInDb).toBeDefined();
});
