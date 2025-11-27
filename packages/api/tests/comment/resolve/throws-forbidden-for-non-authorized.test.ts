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

it("throws FORBIDDEN when user is neither author nor project owner", async () => {
	const projectOwner = await createTestUser(db, {
		email: "owner@example.com",
	});
	const commentAuthor = await createTestUser(db, {
		email: "author@example.com",
	});
	const otherUser = await createTestUser(db, {
		email: "other@example.com",
	});

	const project = await createTestProject(db, projectOwner.id);
	const video = await createTestVideo(db, project.id, projectOwner.id);

	const testComment = await createTestComment(db, video.id, commentAuthor.id, {
		text: "Test comment",
		timecode: 1000,
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: otherUser.id, email: otherUser.email },
		}),
	});

	await expect(
		caller.comment.resolve({
			id: testComment.id,
			resolved: true,
		}),
	).rejects.toThrow(
		"Only the comment author or project owner can resolve comments",
	);
});
