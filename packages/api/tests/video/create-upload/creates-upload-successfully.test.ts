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
import { mockVideoEnv, resetVideoEnv } from "../../utils/mocks/db";
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

// Mock global fetch for Bunny API
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeAll(async () => {
	({ db, client } = await createTestDb());
	__setTestDb(db);
});

afterAll(async () => {
	__clearTestDb();
	await cleanupTestDb(client);
});

beforeEach(() => {
	mockVideoEnv({
		BUNNY_API_KEY: "test-api-key",
		BUNNY_LIBRARY_ID: "test-library-id",
	});
	mockFetch.mockReset();
});

afterEach(() => {
	resetVideoEnv();
});

it("creates video upload and returns TUS upload credentials", async () => {
	const user = await createTestUser(db, {
		id: "user_test",
		email: "test@example.com",
		name: "Test User",
	});

	const project = await createTestProject(db, user.id, {
		name: "Test Project",
	});

	// Mock: Bunny API returns video GUID
	mockFetch.mockResolvedValueOnce({
		ok: true,
		json: async () => ({ guid: "bunny-video-guid-123" }),
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.video.createUpload({
		projectId: project.id,
		title: "Test Video",
		description: "A test video",
		fileName: "test.mp4",
		fileSize: 1024000,
		mimeType: "video/mp4",
	});

	// Verify video record returned
	expect(result.video.id).toBeDefined();
	expect(result.video.bunnyVideoId).toBe("bunny-video-guid-123");
	expect(result.video.status).toBe("uploading");

	// Verify upload credentials returned
	expect(result.upload.endpoint).toBe("https://video.bunnycdn.com/tusupload");
	expect(result.upload.headers.VideoId).toBe("bunny-video-guid-123");
	expect(result.upload.headers.LibraryId).toBe("test-library-id");
	expect(result.upload.headers.AuthorizationSignature).toBeDefined();
	expect(result.upload.headers.AuthorizationExpire).toBeGreaterThan(
		Date.now() / 1000,
	);

	// Verify Bunny API was called
	expect(mockFetch).toHaveBeenCalledWith(
		"https://video.bunnycdn.com/library/test-library-id/videos",
		expect.objectContaining({
			method: "POST",
			headers: expect.objectContaining({
				AccessKey: "test-api-key",
			}),
		}),
	);
});
