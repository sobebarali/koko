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

it("searches comments by text", async () => {
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

	// Create several comments
	await caller.comment.create({
		videoId: video.id,
		text: "This is about React",
		timecode: 1000,
	});

	await caller.comment.create({
		videoId: video.id,
		text: "This is about Vue",
		timecode: 2000,
	});

	await caller.comment.create({
		videoId: video.id,
		text: "React hooks are great",
		timecode: 3000,
	});

	// Search for "React"
	const result = await caller.comment.search({
		videoId: video.id,
		searchText: "React",
	});

	expect(result.comments).toHaveLength(2);
	expect(result.comments.every((c) => c.text.includes("React"))).toBe(true);
});
