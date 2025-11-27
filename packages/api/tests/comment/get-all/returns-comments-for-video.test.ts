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

it("returns top-level comments for a video ordered by timecode", async () => {
	const user1 = await createTestUser(db, {
		name: "User One",
		email: "user1@example.com",
	});

	const user2 = await createTestUser(db, {
		name: "User Two",
		email: "user2@example.com",
	});

	const project = await createTestProject(db, user1.id);
	const video = await createTestVideo(db, project.id, user1.id);

	await createTestComment(db, video.id, user1.id, {
		text: "First comment",
		timecode: 1000,
	});

	await createTestComment(db, video.id, user2.id, {
		text: "Second comment",
		timecode: 5000,
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user1.id, email: user1.email },
		}),
	});

	const result = await caller.comment.getAll({
		videoId: video.id,
	});

	expect(result.comments).toHaveLength(2);
	expect(result.comments[0]?.timecode).toBe(1000);
	expect(result.comments[0]?.text).toBe("First comment");
	expect(result.comments[1]?.timecode).toBe(5000);
	expect(result.comments[1]?.text).toBe("Second comment");
});
