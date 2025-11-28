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

it("searches comments by author", async () => {
	const user1 = await createTestUser(db, {
		id: "user_1",
		email: "user1@example.com",
		name: "User One",
	});

	const user2 = await createTestUser(db, {
		id: "user_2",
		email: "user2@example.com",
		name: "User Two",
	});

	const project = await createTestProject(db, user1.id, {
		name: "Test Project",
	});

	const video = await createTestVideo(db, project.id, user1.id, {
		title: "Test Video",
		status: "ready",
	});

	const caller1 = createTestCaller({
		session: createTestSession({
			user: { id: user1.id, email: user1.email },
		}),
	});

	const caller2 = createTestCaller({
		session: createTestSession({
			user: { id: user2.id, email: user2.email },
		}),
	});

	// User1 creates 2 comments
	await caller1.comment.create({
		videoId: video.id,
		text: "Comment from user 1",
		timecode: 1000,
	});

	await caller1.comment.create({
		videoId: video.id,
		text: "Another from user 1",
		timecode: 2000,
	});

	// User2 creates 1 comment
	await caller2.comment.create({
		videoId: video.id,
		text: "Comment from user 2",
		timecode: 3000,
	});

	// Search for user1's comments
	const result = await caller1.comment.search({
		videoId: video.id,
		authorId: user1.id,
	});

	expect(result.comments).toHaveLength(2);
	expect(result.comments.every((c) => c.authorId === user1.id)).toBe(true);
});
