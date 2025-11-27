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

it("creates a new comment and returns it", async () => {
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

	const result = await caller.comment.create({
		videoId: video.id,
		text: "This is a test comment",
		timecode: 5000,
	});

	expect(result.comment.id).toBeDefined();
	expect(result.comment.videoId).toBe(video.id);
	expect(result.comment.authorId).toBe(user.id);
	expect(result.comment.text).toBe("This is a test comment");
	expect(result.comment.timecode).toBe(5000);
	expect(result.comment.parentId).toBeNull();
	expect(result.comment.resolved).toBe(false);
});
