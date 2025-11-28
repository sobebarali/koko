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

it("searches comments by timecode range", async () => {
	const user = await createTestUser(db, {
		id: "user_test",
		email: "test@example.com",
		name: "Test User",
	});

	const project = await createTestProject(db, user.id, {
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

	// Create comments at different timecodes
	await caller.comment.create({
		videoId: video.id,
		text: "Comment at 1000",
		timecode: 1000,
	});

	await caller.comment.create({
		videoId: video.id,
		text: "Comment at 5000",
		timecode: 5000,
	});

	await caller.comment.create({
		videoId: video.id,
		text: "Comment at 10000",
		timecode: 10000,
	});

	// Search for comments between 2000 and 8000
	const result = await caller.comment.search({
		videoId: video.id,
		timecodeRange: { start: 2000, end: 8000 },
	});

	expect(result.comments).toHaveLength(1);
	expect(result.comments[0]?.timecode).toBe(5000);
});
