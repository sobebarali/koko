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

it("unresolves a resolved comment successfully", async () => {
	const user = await createTestUser(db, {
		id: "user_test",
		email: "test@example.com",
		name: "Test User",
	});

	const project = await createTestProject(db, {
		ownerId: user.id,
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

	// Create a comment
	const createResult = await caller.comment.create({
		videoId: video.id,
		text: "This is a test comment",
		timecode: 5000,
	});

	// Resolve the comment first
	const resolveResult = await caller.comment.resolve({
		id: createResult.comment.id,
		resolved: true,
	});

	expect(resolveResult.comment.resolved).toBe(true);
	expect(resolveResult.comment.resolvedBy).toBe(user.id);
	expect(resolveResult.comment.resolvedAt).toBeDefined();

	// Now unresolve it
	const unresolveResult = await caller.comment.unresolve({
		id: createResult.comment.id,
	});

	expect(unresolveResult.comment.id).toBe(createResult.comment.id);
	expect(unresolveResult.comment.resolved).toBe(false);
	expect(unresolveResult.comment.resolvedBy).toBeNull();
	expect(unresolveResult.comment.resolvedAt).toBeNull();
});
