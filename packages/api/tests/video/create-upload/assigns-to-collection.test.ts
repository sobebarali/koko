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
import { createTestProject, createTestUser } from "../../utils/test-fixtures";
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

it("assigns video to project collection when uploading", async () => {
	const user = await createTestUser(db, {
		id: "user_collection_assign",
		email: "assign@example.com",
		name: "Assign User",
	});

	const testProject = await createTestProject(db, {
		id: "project_with_collection",
		ownerId: user.id,
		name: "Project With Collection",
		bunnyCollectionId: "collection_abc123",
	});

	// Mock Bunny video creation
	(global.fetch as any).mockResolvedValueOnce({
		ok: true,
		json: async () => ({ guid: "bunny_video_xyz" }),
	});

	// Mock collection assignment
	(global.fetch as any).mockResolvedValueOnce({
		ok: true,
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.video.createUpload({
		projectId: testProject.id,
		title: "Test Video",
		fileName: "test.mp4",
		fileSize: 1024000,
		mimeType: "video/mp4",
	});

	expect(result.video.bunnyVideoId).toBe("bunny_video_xyz");

	// Verify video was created
	expect(fetch).toHaveBeenCalledWith(
		`https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/videos`,
		expect.objectContaining({
			method: "POST",
			body: JSON.stringify({ title: "Test Video" }),
		}),
	);

	// Verify video was assigned to collection
	expect(fetch).toHaveBeenCalledWith(
		`https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/videos/bunny_video_xyz`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				AccessKey: process.env.BUNNY_API_KEY,
			},
			body: JSON.stringify({ collectionId: "collection_abc123" }),
		},
	);
});

it("handles projects without collection gracefully", async () => {
	const user = await createTestUser(db, {
		id: "user_no_collection_upload",
		email: "nocollectionupload@example.com",
		name: "No Collection Upload User",
	});

	const testProject = await createTestProject(db, {
		id: "project_no_collection_upload",
		ownerId: user.id,
		name: "Project Without Collection",
		bunnyCollectionId: null,
	});

	// Mock Bunny video creation
	(global.fetch as any).mockResolvedValueOnce({
		ok: true,
		json: async () => ({ guid: "bunny_video_no_collection" }),
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.video.createUpload({
		projectId: testProject.id,
		title: "Video No Collection",
		fileName: "test.mp4",
		fileSize: 1024000,
		mimeType: "video/mp4",
	});

	expect(result.video.bunnyVideoId).toBe("bunny_video_no_collection");

	// Verify only video creation was called, not collection assignment
	expect(fetch).toHaveBeenCalledTimes(1);
	expect(fetch).toHaveBeenCalledWith(
		expect.stringContaining("/videos"),
		expect.objectContaining({ method: "POST" }),
	);
});

it("continues upload if collection assignment fails", async () => {
	const user = await createTestUser(db, {
		id: "user_collection_fail",
		email: "collectionfail@example.com",
		name: "Collection Fail User",
	});

	const testProject = await createTestProject(db, {
		id: "project_collection_fail",
		ownerId: user.id,
		name: "Project Collection Fail",
		bunnyCollectionId: "collection_fail_123",
	});

	// Mock Bunny video creation (succeeds)
	(global.fetch as any).mockResolvedValueOnce({
		ok: true,
		json: async () => ({ guid: "bunny_video_fail" }),
	});

	// Mock collection assignment (fails)
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

	// Should still succeed (graceful degradation)
	const result = await caller.video.createUpload({
		projectId: testProject.id,
		title: "Video Collection Fail",
		fileName: "test.mp4",
		fileSize: 1024000,
		mimeType: "video/mp4",
	});

	expect(result.video.bunnyVideoId).toBe("bunny_video_fail");
	expect(result.video.status).toBe("uploading");
});

it("stores bunnyCollectionId in video record", async () => {
	const user = await createTestUser(db, {
		id: "user_store_collection",
		email: "storecollection@example.com",
		name: "Store Collection User",
	});

	const testProject = await createTestProject(db, {
		id: "project_store_collection",
		ownerId: user.id,
		name: "Store Collection Project",
		bunnyCollectionId: "collection_store_123",
	});

	// Mock Bunny video creation
	(global.fetch as any).mockResolvedValueOnce({
		ok: true,
		json: async () => ({ guid: "bunny_video_store" }),
	});

	// Mock collection assignment
	(global.fetch as any).mockResolvedValueOnce({
		ok: true,
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.video.createUpload({
		projectId: testProject.id,
		title: "Video Store Collection",
		fileName: "test.mp4",
		fileSize: 1024000,
		mimeType: "video/mp4",
	});

	// Verify video was created
	expect(result.video.bunnyVideoId).toBe("bunny_video_store");

	// Fetch the video from database to verify bunnyCollectionId is stored
	const videoInDb = await db.query.video.findFirst({
		where: (video, { eq }) => eq(video.id, result.video.id),
		columns: {
			bunnyCollectionId: true,
		},
	});

	expect(videoInDb?.bunnyCollectionId).toBe("collection_store_123");
});
