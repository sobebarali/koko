import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";

describe("bunny-collection-service.deleteVideo", () => {
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

	it("deletes video successfully", async () => {
		const { deleteVideo } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true }),
		});

		const result = await deleteVideo({ videoId: "video_abc123" });

		expect(result).toBe(true);

		expect(fetch).toHaveBeenCalledWith(
			"https://video.bunnycdn.com/library/test-library-123/videos/video_abc123",
			{
				method: "DELETE",
				headers: {
					Accept: "application/json",
					AccessKey: "test-api-key",
				},
			},
		);
	});

	it("returns false when video not found", async () => {
		const { deleteVideo } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockResolvedValueOnce({
			ok: false,
			status: 404,
			statusText: "Not Found",
		});

		const result = await deleteVideo({ videoId: "nonexistent_video" });

		expect(result).toBe(false);
	});

	it("returns false when API returns error", async () => {
		const { deleteVideo } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockResolvedValueOnce({
			ok: false,
			status: 500,
			statusText: "Internal Server Error",
		});

		const result = await deleteVideo({ videoId: "video_123" });

		expect(result).toBe(false);
	});

	it("returns false when fetch throws network error", async () => {
		const { deleteVideo } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockRejectedValueOnce(new Error("Timeout"));

		const result = await deleteVideo({ videoId: "video_123" });

		expect(result).toBe(false);
	});

	it("handles deletion of video with captions and metadata", async () => {
		const { deleteVideo } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		// Bunny API should handle cascade deletion of associated resources
		(fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true }),
		});

		const result = await deleteVideo({ videoId: "video_with_captions" });

		expect(result).toBe(true);
	});

	it("returns false for already deleted video", async () => {
		const { deleteVideo } = await import(
			"../../../src/lib/services/bunny-collection-service"
		);

		(fetch as Mock).mockResolvedValueOnce({
			ok: false,
			status: 404,
			statusText: "Not Found",
		});

		const result = await deleteVideo({ videoId: "already_deleted_video" });

		expect(result).toBe(false);
	});
});
