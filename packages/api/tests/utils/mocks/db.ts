import { db } from "@koko/db";
import { vi } from "vitest";

type MutableDb = {
	select: (...args: unknown[]) => unknown;
	update: (...args: unknown[]) => unknown;
	insert: (...args: unknown[]) => unknown;
	transaction: (...args: unknown[]) => unknown;
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

export function mockSelectSequence(results: unknown[][]): {
	selectMock: ReturnType<typeof vi.fn>;
} {
	let callIndex = 0;
	const createChain = () => {
		const result = results[callIndex] ?? [];
		callIndex++;
		const limitMock = vi.fn().mockResolvedValue(result);
		// orderBy can resolve directly (Promise) or chain to limit
		const orderByMock = vi.fn().mockImplementation(() => {
			const orderByResult = {
				limit: limitMock,
				// biome-ignore lint/suspicious/noThenProperty: Mocking Promise-like behavior for Drizzle queries
				then: (resolve: (value: unknown) => void) => resolve(result),
			};
			return orderByResult;
		});
		// where can resolve directly (Promise) or chain to limit/orderBy
		const whereMock = vi.fn().mockImplementation(() => {
			const whereResult = {
				limit: limitMock,
				orderBy: orderByMock,
				// biome-ignore lint/suspicious/noThenProperty: Mocking Promise-like behavior for Drizzle queries
				then: (resolve: (value: unknown) => void) => resolve(result),
			};
			return whereResult;
		});
		const innerJoinMock = vi.fn().mockReturnValue({
			where: whereMock,
			limit: limitMock,
		});
		return {
			where: whereMock,
			innerJoin: innerJoinMock,
			limit: limitMock,
			orderBy: orderByMock,
		};
	};
	const selectMock = vi.fn().mockImplementation(() => ({
		from: vi.fn().mockImplementation(() => createChain()),
	}));
	mutableDb.select = selectMock;
	return { selectMock };
}

export function mockInsertReturning(result: unknown[]): {
	insertMock: ReturnType<typeof vi.fn>;
} {
	const returningMock = vi.fn().mockResolvedValue(result);
	const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
	const insertMock = vi.fn().mockReturnValue({ values: valuesMock });
	mutableDb.insert = insertMock;
	return { insertMock };
}

export function mockUpdateSimple(): {
	updateMock: ReturnType<typeof vi.fn>;
} {
	const whereMock = vi.fn().mockResolvedValue(undefined);
	const setMock = vi.fn().mockReturnValue({ where: whereMock });
	const updateMock = vi.fn().mockReturnValue({ set: setMock });
	mutableDb.update = updateMock;
	return { updateMock };
}

/**
 * Mock for db.transaction - passes a mock tx object to the callback
 * that has update/insert methods using the currently mocked implementations
 */
export function mockTransaction(): {
	transactionMock: ReturnType<typeof vi.fn>;
} {
	const transactionMock = vi.fn().mockImplementation(async (callback) => {
		// Create a tx object that uses the current mocked db methods
		const tx = {
			update: mutableDb.update,
			insert: mutableDb.insert,
		};
		return callback(tx);
	});
	mutableDb.transaction = transactionMock;
	return { transactionMock };
}

export function resetDbMocks(): void {
	mockSelectOnce([]);
	mockUpdateOnce([]);
	mockInsertReturning([]);
	mockTransaction();
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

// Bunny Stream API environment variables for video upload
const videoEnvKeys = ["BUNNY_API_KEY", "BUNNY_LIBRARY_ID"] as const;

const originalVideoEnv = Object.fromEntries(
	videoEnvKeys.map((key) => [key, process.env[key]]),
) as Record<(typeof videoEnvKeys)[number], string | undefined>;

export function mockVideoEnv(
	values: Partial<Record<(typeof videoEnvKeys)[number], string | undefined>>,
): void {
	for (const key of videoEnvKeys) {
		const value = values[key];
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
}

export function resetVideoEnv(): void {
	for (const key of videoEnvKeys) {
		const originalValue = originalVideoEnv[key];
		if (originalValue === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = originalValue;
		}
	}
}
