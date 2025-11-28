import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";

describe("bunny-collection-service.createCollection", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		// Reset modules to pick up new env vars

		// Setup environment variables
		process.env.BUNNY_API_KEY = "test-api-key";
		process.env.BUNNY_LIBRARY_ID = "test-library-123";
		process.env.BUNNY_CDN_HOSTNAME = "test-cdn.b-cdn.net";

		// Mock fetch
		global.fetch = vi.fn();
	});

	afterEach(() => {
		process.env = originalEnv;
		vi.restoreAllMocks();
	});

	it("creates collection successfully with valid name", async () => {
		const { createCollection } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		const mockResponse = {
			guid: "collection_abc123",
			name: "My Test Project",
			videoCount: 0,
			totalSize: 0,
		};

		(fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const result = await createCollection({ name: "My Test Project" });

		expect(result).toEqual({
			guid: "collection_abc123",
			name: "My Test Project",
		});

		expect(fetch).toHaveBeenCalledWith(
			"https://video.bunnycdn.com/library/test-library-123/collections",
			{
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					AccessKey: "test-api-key",
				},
				body: JSON.stringify({ name: "My Test Project" }),
			},
		);
	});

	it("returns null when Bunny API returns error", async () => {
		const { createCollection } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockResolvedValueOnce({
			ok: false,
			status: 500,
			statusText: "Internal Server Error",
		});

		const result = await createCollection({ name: "Test Project" });

		expect(result).toBeNull();
	});

	it("returns null when fetch throws network error", async () => {
		const { createCollection } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockRejectedValueOnce(new Error("Network error"));

		const result = await createCollection({ name: "Test Project" });

		expect(result).toBeNull();
	});

	it("returns null when response JSON is invalid", async () => {
		const { createCollection } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => {
				throw new Error("Invalid JSON");
			},
		});

		const result = await createCollection({ name: "Test Project" });

		expect(result).toBeNull();
	});

	it("returns null when response missing guid", async () => {
		const { createCollection } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ name: "Test Project" }), // Missing guid
		});

		const result = await createCollection({ name: "Test Project" });

		expect(result).toBeNull();
	});

	it("handles special characters in collection name", async () => {
		const { createCollection } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		const mockResponse = {
			guid: "collection_xyz",
			name: "Project with 'quotes' & symbols!",
		};

		(fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const result = await createCollection({
			name: "Project with 'quotes' & symbols!",
		});

		expect(result).toEqual({
			guid: "collection_xyz",
			name: "Project with 'quotes' & symbols!",
		});
	});
});
