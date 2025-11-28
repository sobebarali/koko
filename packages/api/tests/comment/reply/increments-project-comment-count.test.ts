import { project } from "@koko/db/schema/index";
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

it("increments project.commentCount when creating a reply", async () => {
	const user = await createTestUser(db);
	const testProject = await createTestProject(db, { ownerId: user.id });
	const video = await createTestVideo(db, testProject.id, user.id);

	const parentComment = await createTestComment(db, video.id, user.id, {
		text: "Parent comment",
		timecode: 5000,
	});

	const projectBefore = await db.query.project.findFirst({
		where: eq(project.id, testProject.id),
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	await caller.comment.reply({
		parentId: parentComment.id,
		text: "Reply text",
	});

	const projectAfter = await db.query.project.findFirst({
		where: eq(project.id, testProject.id),
	});

	expect(projectAfter?.commentCount).toBe(
		(projectBefore?.commentCount ?? 0) + 1,
	);
});
