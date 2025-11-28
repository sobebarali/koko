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

it("filters to show only resolved comments", async () => {
	const user = await createTestUser(db, {
		name: "User One",
		email: "user1@example.com",
	});

	const project = await createTestProject(db, { ownerId: user.id });
	const video = await createTestVideo(db, project.id, user.id);

	await createTestComment(db, video.id, user.id, {
		text: "Resolved comment",
		timecode: 1000,
		resolved: true,
	});

	await createTestComment(db, video.id, user.id, {
		text: "Unresolved comment",
		timecode: 2000,
		resolved: false,
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.comment.getAll({
		videoId: video.id,
		resolved: "resolved",
	});

	expect(result.comments).toHaveLength(1);
	expect(result.comments[0]?.resolved).toBe(true);
	expect(result.comments[0]?.text).toBe("Resolved comment");
});
