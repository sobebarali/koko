import { db } from "@koko/db";
import { TRPCError } from "@trpc/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestCaller } from "./utils/testCaller";
import { createTestSession } from "./utils/testSession";

type MutableDb = {
	select: (...args: any[]) => any;
	update: (...args: any[]) => any;
};

const mutableDb = db as unknown as MutableDb;
const envKeys = [
	"BUNNY_STORAGE_ZONE",
	"BUNNY_STORAGE_ACCESS_KEY",
	"BUNNY_STORAGE_ENDPOINT",
	"BUNNY_STORAGE_CDN_URL",
] as const;
const originalEnv = Object.fromEntries(
	envKeys.map((key) => [key, process.env[key]]),
) as Record<(typeof envKeys)[number], string | undefined>;

describe("user router", () => {
	beforeEach(() => {
		resetDbMocks();
		resetEnv();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		resetDbMocks();
		resetEnv();
	});

	it("returns the current user's profile", async () => {
		const profile = {
			id: "user_test",
			email: "user@example.com",
			name: "Test User",
			emailVerified: true,
			image: "https://cdn.example.com/avatar.png",
			bio: "Maker",
			title: "Director",
			company: "Koko",
			location: "NYC",
			website: "https://koko.com",
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};
		mockSelectOnce([profile]);

		const caller = createTestCaller({
			session: createTestSession(),
		});

		const result = await caller.user.getProfile();

		expect(result).toEqual({ user: profile });
	});

	it("throws when current user profile is missing", async () => {
		mockSelectOnce([]);

		const caller = createTestCaller({
			session: createTestSession(),
		});

		await expect(caller.user.getProfile()).rejects.toThrow("User not found");
	});

	it("returns a public profile for getById", async () => {
		const publicProfile = {
			id: "other_user",
			name: "Other User",
			image: "https://cdn.example.com/other.png",
			bio: "Producer",
			title: "Lead",
			company: "Studio",
			location: "SF",
			website: "https://other.example.com",
		};
		mockSelectOnce([publicProfile]);

		const caller = createTestCaller({
			session: createTestSession(),
		});

		const result = await caller.user.getById({ id: "other_user" });

		expect(result).toEqual({ user: publicProfile });
	});

	it("throws when public profile target is missing", async () => {
		mockSelectOnce([]);

		const caller = createTestCaller({
			session: createTestSession(),
		});

		await expect(caller.user.getById({ id: "missing_user" })).rejects.toThrow(
			"User not found",
		);
	});

	it("updates provided profile fields", async () => {
		const updatedProfile = {
			id: "user_test",
			email: "user@example.com",
			name: "Jane Doe",
			emailVerified: true,
			image: "avatar.png",
			bio: "Updated bio",
			title: "Editor",
			company: "Studio",
			location: "Remote",
			website: "https://example.com",
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};
		const { setMock } = mockUpdateOnce([updatedProfile]);

		const caller = createTestCaller({
			session: createTestSession(),
		});

		const result = await caller.user.updateProfile({
			name: "  Jane Doe ",
			bio: "Updated bio",
		});

		expect(result).toEqual({ user: updatedProfile });
		expect(setMock).toHaveBeenCalledWith({
			name: "Jane Doe",
			bio: "Updated bio",
		});
	});

	it("requires at least one profile field", async () => {
		const updateMock = vi.fn();
		(mutableDb.update as unknown) = updateMock;

		const caller = createTestCaller({
			session: createTestSession(),
		});

		await expect(
			// @ts-expect-error - testing runtime validation
			caller.user.updateProfile({}),
		).rejects.toThrow("At least one field must be provided.");
		expect(updateMock).not.toHaveBeenCalled();
	});

	it("returns Bunny storage upload instructions", async () => {
		mockUploadEnv({
			BUNNY_STORAGE_ZONE: "koko-media",
			BUNNY_STORAGE_ACCESS_KEY: "secret",
			BUNNY_STORAGE_ENDPOINT: "https://sg.storage.bunnycdn.com",
			BUNNY_STORAGE_CDN_URL: "https://cdn.koko.dev",
		});
		const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_730_000_000_000);

		const caller = createTestCaller({
			session: createTestSession(),
		});

		const result = await caller.user.uploadAvatar({
			fileName: "My Avatar.JPG",
			fileSize: 1024,
			mimeType: "image/jpeg",
		});

		expect(result).toEqual({
			uploadUrl:
				"https://sg.storage.bunnycdn.com/koko-media/avatars/user_test/1730000000000-my-avatar.jpg",
			uploadHeaders: {
				AccessKey: "secret",
				"Content-Type": "image/jpeg",
			},
			avatarUrl:
				"https://cdn.koko.dev/avatars/user_test/1730000000000-my-avatar.jpg",
		});

		nowSpy.mockRestore();
	});

	it("throws when Bunny storage environment variables are missing", async () => {
		mockUploadEnv({
			BUNNY_STORAGE_ZONE: undefined,
			BUNNY_STORAGE_ACCESS_KEY: undefined,
			BUNNY_STORAGE_ENDPOINT: undefined,
			BUNNY_STORAGE_CDN_URL: undefined,
		});

		const caller = createTestCaller({
			session: createTestSession(),
		});

		await expect(
			caller.user.uploadAvatar({
				fileName: "avatar.png",
				fileSize: 512,
				mimeType: "image/png",
			}),
		).rejects.toBeInstanceOf(TRPCError);
	});
});

function mockSelectOnce(result: unknown[]) {
	const limitMock = vi.fn().mockResolvedValue(result);
	const whereMock = vi.fn().mockReturnValue({
		limit: limitMock,
	});
	const fromMock = vi.fn().mockReturnValue({
		where: whereMock,
	});
	const selectMock = vi.fn().mockReturnValue({
		from: fromMock,
	});
	mutableDb.select = selectMock;
	return { selectMock, fromMock, whereMock, limitMock };
}

function mockUpdateOnce(result: unknown[]) {
	const returningMock = vi.fn().mockResolvedValue(result);
	const whereMock = vi.fn().mockReturnValue({
		returning: returningMock,
	});
	const setMock = vi.fn().mockReturnValue({
		where: whereMock,
	});
	const updateMock = vi.fn().mockReturnValue({
		set: setMock,
	});
	mutableDb.update = updateMock;
	return { updateMock, setMock, whereMock, returningMock };
}

function resetDbMocks() {
	mockSelectOnce([]);
	mockUpdateOnce([]);
}

function resetEnv() {
	for (const key of envKeys) {
		const originalValue = originalEnv[key];
		if (originalValue === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = originalValue;
		}
	}
}

function mockUploadEnv(
	values: Partial<Record<(typeof envKeys)[number], string | undefined>>,
) {
	for (const key of envKeys) {
		const value = values[key];
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
}
