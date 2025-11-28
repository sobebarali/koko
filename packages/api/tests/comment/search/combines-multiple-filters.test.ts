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

it("combines multiple filters with AND logic", async () => {
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

	const project = await createTestProject(db, {
		ownerId: user1.id,
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

	// User1: "React" text
	await caller1.comment.create({
		videoId: video.id,
		text: "React is great",
		timecode: 1000,
	});

	// User2: "React" text (should match)
	await caller2.comment.create({
		videoId: video.id,
		text: "React hooks work well",
		timecode: 2000,
	});

	// User2: "Vue" text (should not match)
	await caller2.comment.create({
		videoId: video.id,
		text: "Vue is also good",
		timecode: 3000,
	});

	// Search for text="React" AND authorId=user2
	const result = await caller1.comment.search({
		videoId: video.id,
		searchText: "React",
		authorId: user2.id,
	});

	expect(result.comments).toHaveLength(1);
	expect(result.comments[0]?.text).toBe("React hooks work well");
	expect(result.comments[0]?.authorId).toBe(user2.id);
});
