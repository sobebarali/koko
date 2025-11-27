import { afterAll, beforeAll, expect, it, vi } from "vitest";
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

// Store original env values
let originalEnv: Record<string, string | undefined>;

beforeAll(async () => {
	({ db, client } = await createTestDb());
	__setTestDb(db);

	// Store original env values
	originalEnv = {
		BUNNY_STORAGE_ZONE: process.env.BUNNY_STORAGE_ZONE,
		BUNNY_STORAGE_ACCESS_KEY: process.env.BUNNY_STORAGE_ACCESS_KEY,
		BUNNY_STORAGE_ENDPOINT: process.env.BUNNY_STORAGE_ENDPOINT,
		BUNNY_STORAGE_CDN_URL: process.env.BUNNY_STORAGE_CDN_URL,
	};

	// Set test env values
	process.env.BUNNY_STORAGE_ZONE = "koko-media";
	process.env.BUNNY_STORAGE_ACCESS_KEY = "secret";
	process.env.BUNNY_STORAGE_ENDPOINT = "https://sg.storage.bunnycdn.com";
	process.env.BUNNY_STORAGE_CDN_URL = "https://cdn.koko.dev";
});

afterAll(async () => {
	__clearTestDb();
	await cleanupTestDb(client);

	// Restore original env values
	for (const [key, value] of Object.entries(originalEnv)) {
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
});

it("returns Bunny storage upload instructions", async () => {
	const user = await createTestUser(db, {
		id: "user_test",
		email: "test@example.com",
		name: "Test User",
	});

	const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_730_000_000_000);

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.user.uploadAvatar({
		fileName: "My Avatar.JPG",
		fileSize: 1024,
		mimeType: "image/jpeg",
	});

	expect(result).toEqual({
		uploadUrl:
			"https://sg.storage.bunnycdn.com/koko-media/avatars/user_test/1730000000000-my-avatar.jpg",
		uploadHeaders: {
			AccessKey: "secret",
			"Content-Type": "image/jpeg",
		},
		avatarUrl:
			"https://cdn.koko.dev/avatars/user_test/1730000000000-my-avatar.jpg",
	});

	nowSpy.mockRestore();
});
