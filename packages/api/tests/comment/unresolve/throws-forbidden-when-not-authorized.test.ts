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

it("throws FORBIDDEN when user is not author or project owner", async () => {
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

	// User1 creates and resolves a comment
	const createResult = await caller1.comment.create({
		videoId: video.id,
		text: "This is a test comment",
		timecode: 5000,
	});

	await caller1.comment.resolve({
		id: createResult.comment.id,
		resolved: true,
	});

	// User2 tries to unresolve it (should fail)
	await expect(
		caller2.comment.unresolve({
			id: createResult.comment.id,
		}),
	).rejects.toThrow(
		"Only the comment author or project owner can resolve comments",
	);
});
