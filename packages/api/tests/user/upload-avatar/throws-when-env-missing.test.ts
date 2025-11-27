import { TRPCError } from "@trpc/server";
import { afterAll, beforeAll, expect, it } from "vitest";
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

	// Clear env values to test missing env scenario
	delete process.env.BUNNY_STORAGE_ZONE;
	delete process.env.BUNNY_STORAGE_ACCESS_KEY;
	delete process.env.BUNNY_STORAGE_ENDPOINT;
	delete process.env.BUNNY_STORAGE_CDN_URL;
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

it("throws when Bunny storage environment variables are missing", async () => {
	const user = await createTestUser(db);

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	await expect(
		caller.user.uploadAvatar({
			fileName: "avatar.png",
			fileSize: 512,
			mimeType: "image/png",
		}),
	).rejects.toBeInstanceOf(TRPCError);
});
