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

it("returns a comment with its replies", async () => {
	const user1 = await createTestUser(db, {
		name: "User One",
		email: "user1@example.com",
	});

	const user2 = await createTestUser(db, {
		name: "User Two",
		email: "user2@example.com",
	});

	const project = await createTestProject(db, { ownerId: user1.id });
	const video = await createTestVideo(db, project.id, user1.id);

	const parentComment = await createTestComment(db, video.id, user1.id, {
		text: "Parent comment",
		timecode: 1000,
	});

	await createTestComment(db, video.id, user2.id, {
		text: "A reply",
		timecode: 1000,
		parentId: parentComment.id,
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user1.id, email: user1.email },
		}),
	});

	const result = await caller.comment.getById({
		id: parentComment.id,
	});

	expect(result.comment.id).toBe(parentComment.id);
	expect(result.comment.text).toBe("Parent comment");
	expect(result.comment.replies).toHaveLength(1);
	expect(result.comment.replies[0]?.text).toBe("A reply");
});
