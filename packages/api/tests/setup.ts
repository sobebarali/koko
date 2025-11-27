import { vi } from "vitest";

// Set environment variables before any modules are imported
vi.hoisted(() => {
	// Set a valid test database URL (not actually used - we use in-memory per test)
	process.env.DATABASE_URL =
		process.env.DATABASE_URL || "file::memory:?cache=shared";
	process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || "re_test_api_key";
});

// Use globalThis to store the database reference across all module boundaries
// This ensures the same reference is used regardless of how modules are loaded
const globalKey = "__koko_test_db__";

// Create the proxy using vi.hoisted so it's available to vi.mock
const dbProxy = vi.hoisted(() => {
	// Create a proxy that delegates all operations to the current test's database
	const proxy = new Proxy(
		{},
		{
			get(_target, prop) {
				// biome-ignore lint/suspicious/noExplicitAny: globalThis is untyped
				const currentDb = (globalThis as any)[globalKey];
				if (!currentDb) {
					throw new Error(
						"Test database not initialized. Call __setTestDb(db) in beforeAll() after creating the test database.",
					);
				}
				const value = Reflect.get(currentDb, prop);
				// Bind methods to the actual db instance
				if (typeof value === "function") {
					return value.bind(currentDb);
				}
				return value;
			},
			has(_target, prop) {
				// biome-ignore lint/suspicious/noExplicitAny: globalThis is untyped
				const currentDb = (globalThis as any)[globalKey];
				if (!currentDb) return false;
				return Reflect.has(currentDb, prop);
			},
		},
	);

	return proxy;
});

// Mock @koko/db to use our test database proxy
vi.mock("@koko/db", () => ({
	db: dbProxy,
}));

/**
 * Sets the database instance for the current test.
 * Call this in beforeAll() of each test file after creating the test db.
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for dynamic db type
export function __setTestDb(db: any): void {
	// biome-ignore lint/suspicious/noExplicitAny: globalThis is untyped
	(globalThis as any)[globalKey] = db;
}

/**
 * Clears the database instance.
 * Call this in afterAll() of each test file.
 */
export function __clearTestDb(): void {
	// biome-ignore lint/suspicious/noExplicitAny: globalThis is untyped
	(globalThis as any)[globalKey] = null;
}
