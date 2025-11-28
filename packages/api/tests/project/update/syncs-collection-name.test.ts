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

it("updates collection name when project name changes", async () => {
	const user = await createTestUser(db, {
		id: "user_name_sync",
		email: "namesync@example.com",
		name: "Name Sync User",
	});

	const testProject = await createTestProject(db, {
		id: "project_name_sync",
		ownerId: user.id,
		name: "Original Name",
		bunnyCollectionId: "collection_123",
	});

	// Mock successful collection name update
	(global.fetch as any).mockResolvedValueOnce({
		ok: true,
		json: async () => ({ success: true }),
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.project.update({
		id: testProject.id,
		name: "Updated Name",
	});

	expect(result.project.name).toBe("Updated Name");

	// Verify Bunny API was called to update collection name
	expect(fetch).toHaveBeenCalledWith(
		`https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/collections/collection_123`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				AccessKey: process.env.BUNNY_API_KEY,
			},
			body: JSON.stringify({ name: "Updated Name" }),
		},
	);
});

it("does not call Bunny API when name is unchanged", async () => {
	const user = await createTestUser(db, {
		id: "user_no_name_change",
		email: "nonamechange@example.com",
		name: "No Name Change User",
	});

	const testProject = await createTestProject(db, {
		id: "project_no_name_change",
		ownerId: user.id,
		name: "Same Name",
		bunnyCollectionId: "collection_456",
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	// Update only color, not name
	await caller.project.update({
		id: testProject.id,
		color: "#FF0000",
	});

	// Verify Bunny API was NOT called
	expect(fetch).not.toHaveBeenCalled();
});

it("handles projects without collections gracefully", async () => {
	const user = await createTestUser(db, {
		id: "user_no_collection",
		email: "nocollection@example.com",
		name: "No Collection User",
	});

	const testProject = await createTestProject(db, {
		id: "project_no_collection",
		ownerId: user.id,
		name: "Project Without Collection",
		bunnyCollectionId: null,
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	// Should succeed without calling Bunny API
	const result = await caller.project.update({
		id: testProject.id,
		name: "New Name",
	});

	expect(result.project.name).toBe("New Name");
	expect(fetch).not.toHaveBeenCalled();
});

it("logs error but allows update if collection name sync fails", async () => {
	const user = await createTestUser(db, {
		id: "user_sync_fail",
		email: "syncfail@example.com",
		name: "Sync Fail User",
	});

	const testProject = await createTestProject(db, {
		id: "project_sync_fail",
		ownerId: user.id,
		name: "Original",
		bunnyCollectionId: "collection_789",
	});

	// Mock failed collection update
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

	// Update should still succeed
	const result = await caller.project.update({
		id: testProject.id,
		name: "Updated Despite Failure",
	});

	expect(result.project.name).toBe("Updated Despite Failure");
});

it("handles special characters in updated name", async () => {
	const user = await createTestUser(db, {
		id: "user_special",
		email: "special@example.com",
		name: "Special User",
	});

	const testProject = await createTestProject(db, {
		id: "project_special",
		ownerId: user.id,
		name: "Simple Name",
		bunnyCollectionId: "collection_special",
	});

	(global.fetch as any).mockResolvedValueOnce({
		ok: true,
		json: async () => ({ success: true }),
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.project.update({
		id: testProject.id,
		name: "Name with émojis 🎬 & symbols!",
	});

	expect(result.project.name).toBe("Name with émojis 🎬 & symbols!");

	expect(fetch).toHaveBeenCalledWith(
		`https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/collections/collection_special`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				AccessKey: process.env.BUNNY_API_KEY,
			},
			body: JSON.stringify({ name: "Name with émojis 🎬 & symbols!" }),
		},
	);
});
