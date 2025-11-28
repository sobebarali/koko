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

it("returns videos for project when user is owner", async () => {
	const user = await createTestUser(db, {
		id: "user_test",
		email: "test@example.com",
		name: "Test User",
	});

	const project = await createTestProject(db, {
		ownerId: user.id,
		name: "Test Project",
	});

	await createTestVideo(db, project.id, user.id, {
		title: "Video 1",
		status: "ready",
	});

	await createTestVideo(db, project.id, user.id, {
		title: "Video 2",
		status: "ready",
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.video.getAll({ projectId: project.id });

	expect(result.videos).toHaveLength(2);
	const titles = result.videos.map((v) => v.title);
	expect(titles).toContain("Video 1");
	expect(titles).toContain("Video 2");
});
