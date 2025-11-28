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

it("supports cursor-based pagination", async () => {
	const user = await createTestUser(db, {
		id: "user_test",
		email: "test@example.com",
		name: "Test User",
	});

	const project = await createTestProject(db, {
		ownerId: user.id,
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

	// Create 5 comments
	for (let i = 1; i <= 5; i++) {
		await caller.comment.create({
			videoId: video.id,
			text: `Comment ${i}`,
			timecode: i * 1000,
		});
	}

	// First page with limit 2
	const page1 = await caller.comment.search({
		videoId: video.id,
		limit: 2,
	});

	expect(page1.comments).toHaveLength(2);
	expect(page1.nextCursor).toBeDefined();
	expect(page1.nextCursor).not.toBeNull();

	// Second page using cursor
	if (!page1.nextCursor) {
		throw new Error("Expected nextCursor to be defined");
	}
	const page2 = await caller.comment.search({
		videoId: video.id,
		limit: 2,
		cursor: page1.nextCursor,
	});

	expect(page2.comments).toHaveLength(2);
	expect(page2.nextCursor).toBeDefined();

	// Verify no overlap
	const page1Ids = page1.comments.map((c) => c.id);
	const page2Ids = page2.comments.map((c) => c.id);
	expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false);
});
