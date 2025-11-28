import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";

describe("bunny-collection-service.updateCollectionName", () => {
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

	it("updates collection name successfully", async () => {
		const { updateCollectionName } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true }),
		});

		const result = await updateCollectionName({
			collectionId: "collection_abc123",
			name: "Updated Project Name",
		});

		expect(result).toBe(true);

		expect(fetch).toHaveBeenCalledWith(
			"https://video.bunnycdn.com/library/test-library-123/collections/collection_abc123",
			{
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					AccessKey: "test-api-key",
				},
				body: JSON.stringify({ name: "Updated Project Name" }),
			},
		);
	});

	it("returns false when collection not found", async () => {
		const { updateCollectionName } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockResolvedValueOnce({
			ok: false,
			status: 404,
			statusText: "Not Found",
		});

		const result = await updateCollectionName({
			collectionId: "nonexistent_collection",
			name: "New Name",
		});

		expect(result).toBe(false);
	});

	it("returns false when API returns error", async () => {
		const { updateCollectionName } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockResolvedValueOnce({
			ok: false,
			status: 500,
			statusText: "Internal Server Error",
		});

		const result = await updateCollectionName({
			collectionId: "collection_123",
			name: "New Name",
		});

		expect(result).toBe(false);
	});

	it("returns false when fetch throws network error", async () => {
		const { updateCollectionName } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockRejectedValueOnce(new Error("Network timeout"));

		const result = await updateCollectionName({
			collectionId: "collection_123",
			name: "New Name",
		});

		expect(result).toBe(false);
	});

	it("handles special characters in updated name", async () => {
		const { updateCollectionName } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true }),
		});

		const result = await updateCollectionName({
			collectionId: "collection_123",
			name: "Name with émojis 🎬 & symbols!",
		});

		expect(result).toBe(true);
	});
});
