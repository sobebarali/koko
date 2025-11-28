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
import {
	addProjectMember,
	createTestProject,
	createTestUser,
} from "../../utils/test-fixtures";
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

it("allows project member with upload permission to upload", async () => {
	const owner = await createTestUser(db, {
		id: "owner_user",
		email: "owner@example.com",
		name: "Owner User",
	});

	const member = await createTestUser(db, {
		id: "member_user",
		email: "member@example.com",
		name: "Member User",
	});

	const project = await createTestProject(db, {
		ownerId: owner.id,
		name: "Test Project",
	});

	// Add member with upload permission
	await addProjectMember(db, project.id, member.id, {
		role: "editor",
		canUpload: true,
	});

	// Mock: Bunny API returns video GUID
	mockFetch.mockResolvedValueOnce({
		ok: true,
		json: async () => ({ guid: "bunny-video-guid-456" }),
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: member.id, email: member.email },
		}),
	});

	const result = await caller.video.createUpload({
		projectId: project.id,
		title: "Member Upload",
		fileName: "member-video.mp4",
		fileSize: 2048000,
		mimeType: "video/mp4",
	});

	expect(result.video.id).toBeDefined();
	expect(result.video.bunnyVideoId).toBe("bunny-video-guid-456");
});
