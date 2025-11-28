import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";

describe("bunny-collection-service.addVideoToCollection", () => {
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

	it("adds video to collection successfully", async () => {
		const { addVideoToCollection } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true }),
		});

		const result = await addVideoToCollection({
			videoId: "video_abc123",
			collectionId: "collection_xyz789",
		});

		expect(result).toBe(true);

		expect(fetch).toHaveBeenCalledWith(
			"https://video.bunnycdn.com/library/test-library-123/videos/video_abc123",
			{
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					AccessKey: "test-api-key",
				},
				body: JSON.stringify({ collectionId: "collection_xyz789" }),
			},
		);
	});

	it("returns false when video not found", async () => {
		const { addVideoToCollection } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockResolvedValueOnce({
			ok: false,
			status: 404,
			statusText: "Not Found",
		});

		const result = await addVideoToCollection({
			videoId: "nonexistent_video",
			collectionId: "collection_123",
		});

		expect(result).toBe(false);
	});

	it("returns false when collection not found", async () => {
		const { addVideoToCollection } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockResolvedValueOnce({
			ok: false,
			status: 400,
			statusText: "Bad Request",
		});

		const result = await addVideoToCollection({
			videoId: "video_123",
			collectionId: "nonexistent_collection",
		});

		expect(result).toBe(false);
	});

	it("returns false when API returns error", async () => {
		const { addVideoToCollection } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockResolvedValueOnce({
			ok: false,
			status: 500,
			statusText: "Internal Server Error",
		});

		const result = await addVideoToCollection({
			videoId: "video_123",
			collectionId: "collection_123",
		});

		expect(result).toBe(false);
	});

	it("returns false when fetch throws network error", async () => {
		const { addVideoToCollection } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockRejectedValueOnce(new Error("Network error"));

		const result = await addVideoToCollection({
			videoId: "video_123",
			collectionId: "collection_123",
		});

		expect(result).toBe(false);
	});

	it("handles moving video from one collection to another", async () => {
		const { addVideoToCollection } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		// Video already in a collection, moving to new one
		(fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true }),
		});

		const result = await addVideoToCollection({
			videoId: "video_123",
			collectionId: "new_collection_456",
		});

		expect(result).toBe(true);
	});
});
