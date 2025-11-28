import { afterAll, beforeAll, expect, it } from "vitest";
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

it("returns empty results when no matches found", async () => {
	const user = await createTestUser(db, {
		id: "user_test",
		email: "test@example.com",
		name: "Test User",
	});

	const project = await createTestProject(db, user.id, {
		name: "Test Project",
	});

	const video = await createTestVideo(db, project.id, user.id, {
		title: "Test Video",
		status: "ready",
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	// Create a comment
	await caller.comment.create({
		videoId: video.id,
		text: "This is about React",
		timecode: 1000,
	});

	// Search for text that doesn't exist
	const result = await caller.comment.search({
		videoId: video.id,
		searchText: "Angular",
	});

	expect(result.comments).toHaveLength(0);
	expect(result.nextCursor).toBeNull();
});
