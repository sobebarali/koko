import { db } from "@koko/db";
import { vi } from "vitest";

type MutableDb = {
	select: (...args: unknown[]) => unknown;
	update: (...args: unknown[]) => unknown;
};

const mutableDb = db as unknown as MutableDb;

export function mockSelectOnce(result: unknown[]): {
	selectMock: ReturnType<typeof vi.fn>;
	fromMock: ReturnType<typeof vi.fn>;
	whereMock: ReturnType<typeof vi.fn>;
	limitMock: ReturnType<typeof vi.fn>;
} {
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

export function mockUpdateOnce(result: unknown[]): {
	updateMock: ReturnType<typeof vi.fn>;
	setMock: ReturnType<typeof vi.fn>;
	whereMock: ReturnType<typeof vi.fn>;
	returningMock: ReturnType<typeof vi.fn>;
} {
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

export function resetDbMocks(): void {
	mockSelectOnce([]);
	mockUpdateOnce([]);
}

const envKeys = [
	"BUNNY_STORAGE_ZONE",
	"BUNNY_STORAGE_ACCESS_KEY",
	"BUNNY_STORAGE_ENDPOINT",
	"BUNNY_STORAGE_CDN_URL",
] as const;

const originalEnv = Object.fromEntries(
	envKeys.map((key) => [key, process.env[key]]),
) as Record<(typeof envKeys)[number], string | undefined>;

export function mockUploadEnv(
	values: Partial<Record<(typeof envKeys)[number], string | undefined>>,
): void {
	for (const key of envKeys) {
		const value = values[key];
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
}

export function resetEnv(): void {
	for (const key of envKeys) {
		const originalValue = originalEnv[key];
		if (originalValue === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = originalValue;
		}
	}
}
