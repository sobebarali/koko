import type { TestDb } from "./test-db";

/**
 * Global test database provider.
 * Each test file should set this in beforeAll() to their isolated db instance.
 * This allows the @koko/db mock to delegate to the correct test database.
 *
 * Thread-safe for parallel execution: each Vitest worker has its own module state.
 */

let currentTestDb: TestDb | null = null;

/**
 * Sets the current test database instance.
 * Call this in beforeAll() of each test file.
 */
export function setTestDb(db: TestDb): void {
	currentTestDb = db;
}

/**
 * Gets the current test database instance.
 * Used by the @koko/db mock to delegate operations.
 */
export function getTestDb(): TestDb {
	if (!currentTestDb) {
		throw new Error(
			"Test database not initialized. Call setTestDb() in beforeAll().",
		);
	}
	return currentTestDb;
}

/**
 * Clears the current test database reference.
 * Call this in afterAll() of each test file.
 */
export function clearTestDb(): void {
	currentTestDb = null;
}
