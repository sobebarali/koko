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

it("throws FORBIDDEN when user is not the comment author", async () => {
	const author = await createTestUser(db, {
		email: "author@example.com",
	});
	const otherUser = await createTestUser(db, {
		email: "other@example.com",
	});

	const project = await createTestProject(db, { ownerId: author.id });
	const video = await createTestVideo(db, project.id, author.id);

	const testComment = await createTestComment(db, video.id, author.id, {
		text: "Original text",
		timecode: 1000,
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: otherUser.id, email: otherUser.email },
		}),
	});

	await expect(
		caller.comment.update({
			id: testComment.id,
			text: "Updated text",
		}),
	).rejects.toThrow("You can only edit your own comments");
});
