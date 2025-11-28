import { comment } from "@koko/db/schema/index";
import { eq } from "drizzle-orm";
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

it("decrements parent.replyCount when deleting a reply", async () => {
	const user = await createTestUser(db);
	const project = await createTestProject(db, { ownerId: user.id });
	const video = await createTestVideo(db, project.id, user.id);

	const parentComment = await createTestComment(db, video.id, user.id, {
		text: "Parent comment",
		timecode: 1000,
	});

	const replyComment = await createTestComment(db, video.id, user.id, {
		text: "Reply comment",
		timecode: 1000,
		parentId: parentComment.id,
	});

	const parentBefore = await db.query.comment.findFirst({
		where: eq(comment.id, parentComment.id),
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	await caller.comment.delete({
		id: replyComment.id,
	});

	const parentAfter = await db.query.comment.findFirst({
		where: eq(comment.id, parentComment.id),
	});

	expect(parentAfter?.replyCount).toBe((parentBefore?.replyCount ?? 0) - 1);
});
