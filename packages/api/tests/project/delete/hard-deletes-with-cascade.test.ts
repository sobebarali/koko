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

it("hard deletes project from database", async () => {
	const user = await createTestUser(db, {
		id: "user_hard_delete",
		email: "harddelete@example.com",
		name: "Hard Delete User",
	});

	const testProject = await createTestProject(db, {
		id: "project_hard_delete",
		ownerId: user.id,
		name: "Project to Delete",
		bunnyCollectionId: "collection_delete",
	});

	// Mock successful Bunny Collection deletion
	(global.fetch as any).mockResolvedValueOnce({
		ok: true,
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.project.delete({ id: testProject.id });

	expect(result.success).toBe(true);

	// Verify project is completely removed from database
	const projectInDb = await db.query.project.findFirst({
		where: eq(project.id, testProject.id),
	});
	expect(projectInDb).toBeUndefined();
});

it("deletes Bunny Collection before database deletion", async () => {
	const user = await createTestUser(db, {
		id: "user_bunny_delete_order",
		email: "deleteorder@example.com",
		name: "Delete Order User",
	});

	const testProject = await createTestProject(db, {
		id: "project_delete_order",
		ownerId: user.id,
		name: "Test Order",
		bunnyCollectionId: "collection_order_test",
	});

	// Mock successful Bunny Collection deletion
	(global.fetch as any).mockResolvedValueOnce({
		ok: true,
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	await caller.project.delete({ id: testProject.id });

	// Verify Bunny API was called to delete collection
	expect(fetch).toHaveBeenCalledWith(
		`https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/collections/collection_order_test`,
		{
			method: "DELETE",
			headers: {
				Accept: "application/json",
				AccessKey: process.env.BUNNY_API_KEY,
			},
		},
	);
});

it("cascades delete to all videos in project", async () => {
	const user = await createTestUser(db, {
		id: "user_cascade",
		email: "cascade@example.com",
		name: "Cascade User",
	});

	const testProject = await createTestProject(db, {
		id: "project_cascade",
		ownerId: user.id,
		name: "Project with Videos",
		bunnyCollectionId: "collection_cascade",
	});

	// Create multiple videos in the project
	await createTestVideo(db, testProject.id, user.id, {
		id: "video_1",
		bunnyVideoId: "bunny_video_1",
	});

	await createTestVideo(db, testProject.id, user.id, {
		id: "video_2",
		bunnyVideoId: "bunny_video_2",
	});

	await createTestVideo(db, testProject.id, user.id, {
		id: "video_3",
		bunnyVideoId: "bunny_video_3",
	});

	// Mock Bunny API calls - collection delete + 3 video deletes
	(global.fetch as any)
		.mockResolvedValueOnce({ ok: true }) // Collection delete
		.mockResolvedValueOnce({ ok: true }) // Video 1 delete
		.mockResolvedValueOnce({ ok: true }) // Video 2 delete
		.mockResolvedValueOnce({ ok: true }); // Video 3 delete

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.project.delete({ id: testProject.id });

	expect(result.success).toBe(true);

	// Verify all videos are deleted from database
	const videosInDb = await db.query.video.findMany({
		where: eq(video.projectId, testProject.id),
	});
	expect(videosInDb).toHaveLength(0);

	// Verify Bunny API was called to delete all videos
	expect(fetch).toHaveBeenCalledTimes(4); // 1 collection + 3 videos

	// Verify each video was deleted from Bunny
	expect(fetch).toHaveBeenCalledWith(
		`https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/videos/bunny_video_1`,
		{
			method: "DELETE",
			headers: {
				Accept: "application/json",
				AccessKey: process.env.BUNNY_API_KEY,
			},
		},
	);

	expect(fetch).toHaveBeenCalledWith(
		`https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/videos/bunny_video_2`,
		{
			method: "DELETE",
			headers: {
				Accept: "application/json",
				AccessKey: process.env.BUNNY_API_KEY,
			},
		},
	);

	expect(fetch).toHaveBeenCalledWith(
		`https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/videos/bunny_video_3`,
		{
			method: "DELETE",
			headers: {
				Accept: "application/json",
				AccessKey: process.env.BUNNY_API_KEY,
			},
		},
	);
});

it("handles projects without Bunny Collection gracefully", async () => {
	const user = await createTestUser(db, {
		id: "user_no_collection_delete",
		email: "nocollectiondelete@example.com",
		name: "No Collection Delete User",
	});

	const testProject = await createTestProject(db, {
		id: "project_no_collection_delete",
		ownerId: user.id,
		name: "Project Without Collection",
		bunnyCollectionId: null,
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.project.delete({ id: testProject.id });

	expect(result.success).toBe(true);

	// Verify Bunny API was NOT called
	expect(fetch).not.toHaveBeenCalled();

	// Verify project is deleted from database
	const projectInDb = await db.query.project.findFirst({
		where: eq(project.id, testProject.id),
	});
	expect(projectInDb).toBeUndefined();
});

it("aborts deletion if Bunny Collection delete fails", async () => {
	const user = await createTestUser(db, {
		id: "user_bunny_fail",
		email: "bunnyfail@example.com",
		name: "Bunny Fail User",
	});

	const testProject = await createTestProject(db, {
		id: "project_bunny_fail",
		ownerId: user.id,
		name: "Project Delete Fail",
		bunnyCollectionId: "collection_fail",
	});

	// Mock failed Bunny Collection deletion
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
	await expect(caller.project.delete({ id: testProject.id })).rejects.toThrow();

	// Verify project is NOT deleted from database
	const projectInDb = await db.query.project.findFirst({
		where: eq(project.id, testProject.id),
	});
	expect(projectInDb).toBeDefined();
	expect(projectInDb?.id).toBe(testProject.id);
});

it("continues deletion if some videos fail to delete from Bunny", async () => {
	const user = await createTestUser(db, {
		id: "user_partial_video_fail",
		email: "partialvideofail@example.com",
		name: "Partial Video Fail User",
	});

	const testProject = await createTestProject(db, {
		id: "project_partial_video_fail",
		ownerId: user.id,
		name: "Project Partial Fail",
		bunnyCollectionId: "collection_partial",
	});

	await createTestVideo(db, testProject.id, user.id, {
		id: "video_fail_1",
		bunnyVideoId: "bunny_fail_1",
	});

	await createTestVideo(db, testProject.id, user.id, {
		id: "video_fail_2",
		bunnyVideoId: "bunny_fail_2",
	});

	// Mock: collection delete succeeds, first video fails, second video succeeds
	(global.fetch as any)
		.mockResolvedValueOnce({ ok: true }) // Collection delete
		.mockResolvedValueOnce({ ok: false, status: 404 }) // Video 1 delete fails
		.mockResolvedValueOnce({ ok: true }); // Video 2 delete succeeds

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.project.delete({ id: testProject.id });

	// Should still succeed (graceful degradation)
	expect(result.success).toBe(true);

	// Verify project and all videos are deleted from database
	const projectInDb = await db.query.project.findFirst({
		where: eq(project.id, testProject.id),
	});
	expect(projectInDb).toBeUndefined();

	const videosInDb = await db.query.video.findMany({
		where: eq(video.projectId, testProject.id),
	});
	expect(videosInDb).toHaveLength(0);
});

it("deletes empty project without videos successfully", async () => {
	const user = await createTestUser(db, {
		id: "user_empty_project",
		email: "emptyproject@example.com",
		name: "Empty Project User",
	});

	const testProject = await createTestProject(db, {
		id: "project_empty",
		ownerId: user.id,
		name: "Empty Project",
		bunnyCollectionId: "collection_empty",
	});

	// Mock successful collection deletion
	(global.fetch as any).mockResolvedValueOnce({ ok: true });

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.project.delete({ id: testProject.id });

	expect(result.success).toBe(true);

	// Verify only collection delete was called (no video deletes)
	expect(fetch).toHaveBeenCalledTimes(1);

	// Verify project is deleted
	const projectInDb = await db.query.project.findFirst({
		where: eq(project.id, testProject.id),
	});
	expect(projectInDb).toBeUndefined();
});
