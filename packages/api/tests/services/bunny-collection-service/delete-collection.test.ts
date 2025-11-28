import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";

describe("bunny-collection-service.deleteCollection", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env.BUNNY_API_KEY = "test-api-key";
		process.env.BUNNY_LIBRARY_ID = "test-library-123";
		process.env.BUNNY_CDN_HOSTNAME = "test-cdn.b-cdn.net";

		global.fetch = vi.fn();
	});

	afterEach(() => {
		process.env = originalEnv;
		vi.restoreAllMocks();
	});

	it("deletes collection successfully", async () => {
		const { deleteCollection } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true }),
		});

		const result = await deleteCollection({
			collectionId: "collection_abc123",
		});

		expect(result).toBe(true);

		expect(fetch).toHaveBeenCalledWith(
			"https://video.bunnycdn.com/library/test-library-123/collections/collection_abc123",
			{
				method: "DELETE",
				headers: {
					Accept: "application/json",
					AccessKey: "test-api-key",
				},
			},
		);
	});

	it("returns false when collection not found", async () => {
		const { deleteCollection } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockResolvedValueOnce({
			ok: false,
			status: 404,
			statusText: "Not Found",
		});

		const result = await deleteCollection({
			collectionId: "nonexistent_collection",
		});

		expect(result).toBe(false);
	});

	it("returns false when API returns error", async () => {
		const { deleteCollection } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockResolvedValueOnce({
			ok: false,
			status: 500,
			statusText: "Internal Server Error",
		});

		const result = await deleteCollection({ collectionId: "collection_123" });

		expect(result).toBe(false);
	});

	it("returns false when fetch throws network error", async () => {
		const { deleteCollection } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockRejectedValueOnce(new Error("Connection refused"));

		const result = await deleteCollection({ collectionId: "collection_123" });

		expect(result).toBe(false);
	});

	it("handles deletion of collection with videos gracefully", async () => {
		const { deleteCollection } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		// Bunny API should handle cascade deletion of videos in collection
		(fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true }),
		});

		const result = await deleteCollection({
			collectionId: "collection_with_videos",
		});

		expect(result).toBe(true);
	});
});
