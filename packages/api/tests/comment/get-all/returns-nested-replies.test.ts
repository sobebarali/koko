import { afterAll, beforeAll, expect, it } from "vitest";
import { __clearTestDb, __setTestDb } from "../../setup";
import {
	cleanupTestDb,
	createTestDb,
	type TestClient,
	type TestDb,
} from "../../utils/test-db";
import {
	createTestComment,
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

it("returns comments with nested replies", async () => {
	const user1 = await createTestUser(db, {
		name: "User One",
		email: "user1@example.com",
	});

	const user2 = await createTestUser(db, {
		name: "User Two",
		email: "user2@example.com",
	});

	const user3 = await createTestUser(db, {
		name: "User Three",
		email: "user3@example.com",
	});

	const project = await createTestProject(db, { ownerId: user1.id });
	const video = await createTestVideo(db, project.id, user1.id);

	const parentComment = await createTestComment(db, video.id, user1.id, {
		text: "Parent comment",
		timecode: 1000,
	});

	await createTestComment(db, video.id, user2.id, {
		text: "First reply",
		timecode: 1000,
		parentId: parentComment.id,
	});

	await createTestComment(db, video.id, user3.id, {
		text: "Second reply",
		timecode: 1000,
		parentId: parentComment.id,
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user1.id, email: user1.email },
		}),
	});

	const result = await caller.comment.getAll({
		videoId: video.id,
	});

	expect(result.comments).toHaveLength(1);
	expect(result.comments[0]?.replies).toHaveLength(2);
	expect(result.comments[0]?.replies[0]?.text).toBe("First reply");
	expect(result.comments[0]?.replies[1]?.text).toBe("Second reply");
});
