import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// Load environment variables
const envPath = path.resolve(__dirname, "../../apps/server/.env");
const envVars = config({ path: envPath }).parsed || {};

// Set DATABASE_URL immediately in process.env if not already set
// This ensures it's available when modules are imported
if (!process.env.DATABASE_URL) {
	process.env.DATABASE_URL = "file::memory:?cache=shared";
}

export default defineConfig({
	test: {
		environment: "node",
		include: ["tests/**/*.test.ts"],
		setupFiles: ["./tests/setup.ts"],
		env: {
			// Use in-memory SQLite for tests to avoid needing real database connection
			DATABASE_URL: "file::memory:?cache=shared",
			// Include other env vars from .env file
			...envVars,
		},
		// Enable parallel execution with thread pooling
		pool: "threads",
		poolOptions: {
			threads: {
				// Allow multiple threads for parallel execution
				singleThread: false,
				// Each test file runs in isolation
				isolate: true,
			},
		},
		// Increase timeout for DB operations
		testTimeout: 10000,
		// Hook timeout for beforeAll/afterAll with DB setup
		hookTimeout: 15000,
		coverage: {
			reporter: ["text", "html"],
		},
	},
});
