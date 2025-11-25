import { afterEach, vi } from "vitest";

// Set environment variables before any modules are imported
vi.hoisted(() => {
	// Set a valid test database URL to prevent initialization errors
	process.env.DATABASE_URL =
		process.env.DATABASE_URL || "file::memory:?cache=shared";
});

const mockDb = vi.hoisted(() => {
	const resolved = Promise.resolve([]);

	return {
		db: {
			select: () => ({
				from: async () => resolved,
			}),
			insert: () => ({
				values: async () => resolved,
			}),
			update: () => ({
				set: () => ({
					where: async () => resolved,
				}),
			}),
			delete: () => ({
				where: async () => resolved,
			}),
		},
	};
});

vi.mock("@koko/db", () => mockDb);

afterEach(() => {
	vi.clearAllMocks();
});
