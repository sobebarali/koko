import { afterAll, beforeAll, expect, it } from "vitest";
import { __clearTestDb, __setTestDb } from "../../setup";
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

it("searches comments by mentioned user", async () => {
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

	// Add user2 as project member so mentions are valid
	await addProjectMember(db, project.id, user2.id);

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user1.id, email: user1.email },
		}),
	});

	// Create comment with user2 mentioned
	await caller.comment.create({
		videoId: video.id,
		text: "Hey @user2 check this",
		timecode: 1000,
		mentions: [user2.id],
	});

	// Create comment without mentions
	await caller.comment.create({
		videoId: video.id,
		text: "No mentions here",
		timecode: 2000,
	});

	// Create comment with user2 mentioned again
	await caller.comment.create({
		videoId: video.id,
		text: "Another mention of @user2",
		timecode: 3000,
		mentions: [user2.id],
	});

	// Search for comments mentioning user2
	const result = await caller.comment.search({
		videoId: video.id,
		mentionedUserId: user2.id,
	});

	expect(result.comments).toHaveLength(2);
	expect(result.comments.every((c) => c.mentions.includes(user2.id))).toBe(
		true,
	);
});
