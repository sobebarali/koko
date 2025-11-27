import { afterAll, beforeAll, expect, it } from "vitest";
import { __clearTestDb, __setTestDb } from "../../setup";
import {
	cleanupTestDb,
	createTestDb,
	type TestClient,
	type TestDb,
} from "../../utils/test-db";
import { createTestUser } from "../../utils/test-fixtures";
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

it("requires at least one profile field", async () => {
	const user = await createTestUser(db);

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	await expect(
		// @ts-expect-error - testing runtime validation
		caller.user.updateProfile({}),
	).rejects.toThrow("At least one field must be provided.");
});
