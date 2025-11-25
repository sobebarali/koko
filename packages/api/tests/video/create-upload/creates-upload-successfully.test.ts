import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
	mockInsertReturning,
	mockSelectSequence,
	mockVideoEnv,
	resetDbMocks,
	resetVideoEnv,
} from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

// Mock global fetch for Bunny API
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
	resetDbMocks();
	mockVideoEnv({
		BUNNY_API_KEY: "test-api-key",
		BUNNY_LIBRARY_ID: "test-library-id",
	});
});
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
	resetVideoEnv();
});

it("creates video upload and returns TUS upload credentials", async () => {
	const mockProject = { id: "project_123", ownerId: "user_test" };

	// Mock: project exists and user is owner
	mockSelectSequence([[mockProject]]);

	// Mock: Bunny API returns video GUID
	mockFetch.mockResolvedValueOnce({
		ok: true,
		json: async () => ({ guid: "bunny-video-guid-123" }),
	});

	// Mock: video insert
	const mockVideo = {
		id: "video_123",
		bunnyVideoId: "bunny-video-guid-123",
		status: "uploading",
	};
	mockInsertReturning([mockVideo]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.video.createUpload({
		projectId: "project_123",
		title: "Test Video",
		description: "A test video",
		fileName: "test.mp4",
		fileSize: 1024000,
		mimeType: "video/mp4",
	});

	// Verify video record returned
	expect(result.video.id).toBe("video_123");
	expect(result.video.bunnyVideoId).toBe("bunny-video-guid-123");
	expect(result.video.status).toBe("uploading");

	// Verify upload credentials returned
	expect(result.upload.endpoint).toBe("https://video.bunnycdn.com/tusupload");
	expect(result.upload.headers.VideoId).toBe("bunny-video-guid-123");
	expect(result.upload.headers.LibraryId).toBe("test-library-id");
	expect(result.upload.headers.AuthorizationSignature).toBeDefined();
	expect(result.upload.headers.AuthorizationExpire).toBeGreaterThan(
		Date.now() / 1000,
	);

	// Verify Bunny API was called
	expect(mockFetch).toHaveBeenCalledWith(
		"https://video.bunnycdn.com/library/test-library-id/videos",
		expect.objectContaining({
			method: "POST",
			headers: expect.objectContaining({
				AccessKey: "test-api-key",
			}),
		}),
	);
});

it("allows project member with upload permission to upload", async () => {
	const mockProject = { id: "project_123", ownerId: "other_user" };
	const mockMembership = { id: "member_123", canUpload: true };

	// Mock: project exists, user is not owner, but is member with upload permission
	mockSelectSequence([[mockProject], [mockMembership]]);

	// Mock: Bunny API returns video GUID
	mockFetch.mockResolvedValueOnce({
		ok: true,
		json: async () => ({ guid: "bunny-video-guid-456" }),
	});

	// Mock: video insert
	const mockVideo = {
		id: "video_456",
		bunnyVideoId: "bunny-video-guid-456",
		status: "uploading",
	};
	mockInsertReturning([mockVideo]);

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: "user_test", email: "test@example.com" },
		}),
	});

	const result = await caller.video.createUpload({
		projectId: "project_123",
		title: "Member Upload",
		fileName: "member-video.mp4",
		fileSize: 2048000,
		mimeType: "video/mp4",
	});

	expect(result.video.id).toBe("video_456");
	expect(result.video.bunnyVideoId).toBe("bunny-video-guid-456");
});
