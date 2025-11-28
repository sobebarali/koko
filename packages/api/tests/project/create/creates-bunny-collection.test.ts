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
import { createTestUser } from "../../utils/test-fixtures";
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

it("creates a Bunny Collection when project is created", async () => {
	const user = await createTestUser(db, {
		id: "user_collection_test",
		email: "collection@example.com",
		name: "Collection Test User",
	});

	// Mock successful collection creation
	(global.fetch as any).mockResolvedValueOnce({
		ok: true,
		json: async () => ({
			guid: "collection_abc123",
			name: "My Video Project",
		}),
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.project.create({
		name: "My Video Project",
		description: "Project with Bunny Collection",
	});

	// Verify project was created
	expect(result.project.name).toBe("My Video Project");
	expect(result.project.bunnyCollectionId).toBe("collection_abc123");

	// Verify Bunny API was called with correct parameters
	expect(fetch).toHaveBeenCalledWith(
		expect.stringContaining("/collections"),
		expect.objectContaining({
			method: "POST",
			headers: expect.objectContaining({
				AccessKey: expect.any(String),
			}),
			body: JSON.stringify({ name: "My Video Project" }),
		}),
	);
});

it("stores bunnyCollectionId in project record", async () => {
	const user = await createTestUser(db, {
		id: "user_collection_id_test",
		email: "collectionid@example.com",
		name: "Collection ID Test User",
	});

	(global.fetch as any).mockResolvedValueOnce({
		ok: true,
		json: async () => ({
			guid: "collection_xyz789",
			name: "Test Project",
		}),
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.project.create({
		name: "Test Project",
	});

	expect(result.project.bunnyCollectionId).toBe("collection_xyz789");
	expect(result.project.bunnyCollectionId).toBeTruthy();
});

it("aborts project creation if Bunny Collection creation fails", async () => {
	const user = await createTestUser(db, {
		id: "user_abort_test",
		email: "abort@example.com",
		name: "Abort Test User",
	});

	// Mock failed collection creation
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

	await expect(
		caller.project.create({
			name: "Failed Project",
		}),
	).rejects.toThrow();
});

it("handles special characters in project name for collection", async () => {
	const user = await createTestUser(db, {
		id: "user_special_chars",
		email: "special@example.com",
		name: "Special Chars User",
	});

	(global.fetch as any).mockResolvedValueOnce({
		ok: true,
		json: async () => ({
			guid: "collection_special",
			name: "Project with 'quotes' & symbols!",
		}),
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.project.create({
		name: "Project with 'quotes' & symbols!",
	});

	expect(result.project.name).toBe("Project with 'quotes' & symbols!");
	expect(result.project.bunnyCollectionId).toBe("collection_special");
});
