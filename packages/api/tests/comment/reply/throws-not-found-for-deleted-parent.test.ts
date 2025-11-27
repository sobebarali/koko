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

it("throws NOT_FOUND when parent comment is deleted", async () => {
	const user = await createTestUser(db);
	const project = await createTestProject(db, user.id);
	const video = await createTestVideo(db, project.id, user.id);

	const parentComment = await createTestComment(db, video.id, user.id, {
		text: "Parent comment",
		timecode: 5000,
	});

	// Soft delete the parent comment
	await db
		.update(comment)
		.set({ deletedAt: new Date() })
		.where(eq(comment.id, parentComment.id));

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	await expect(
		caller.comment.reply({
			parentId: parentComment.id,
			text: "Reply text",
		}),
	).rejects.toThrow("Parent comment not found");
});
