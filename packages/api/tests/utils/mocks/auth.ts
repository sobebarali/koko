import { auth } from "@koko/auth";
import { vi } from "vitest";

type MockedAuth = {
	api: {
		verifyEmail: ReturnType<typeof vi.fn>;
		requestPasswordReset: ReturnType<typeof vi.fn>;
		resetPassword: ReturnType<typeof vi.fn>;
		changePassword: ReturnType<typeof vi.fn>;
	};
};

const mockedAuth = auth as unknown as MockedAuth;

export function mockVerifyEmail(success: boolean): void {
	if (success) {
		mockedAuth.api.verifyEmail = vi.fn().mockResolvedValue({ status: true });
	} else {
		mockedAuth.api.verifyEmail = vi
			.fn()
			.mockRejectedValue(new Error("Invalid token"));
	}
}

export function mockRequestPasswordReset(success: boolean): void {
	if (success) {
		mockedAuth.api.requestPasswordReset = vi
			.fn()
			.mockResolvedValue({ status: true });
	} else {
		mockedAuth.api.requestPasswordReset = vi
			.fn()
			.mockRejectedValue(new Error("User not found"));
	}
}

export function mockResetPassword(success: boolean): void {
	if (success) {
		mockedAuth.api.resetPassword = vi.fn().mockResolvedValue({ status: true });
	} else {
		mockedAuth.api.resetPassword = vi
			.fn()
			.mockRejectedValue(new Error("Invalid token"));
	}
}

export function mockChangePassword(success: boolean): void {
	if (success) {
		mockedAuth.api.changePassword = vi.fn().mockResolvedValue({ status: true });
	} else {
		mockedAuth.api.changePassword = vi
			.fn()
			.mockRejectedValue(new Error("Invalid password"));
	}
}

export function resetAuthMocks(): void {
	mockVerifyEmail(true);
	mockRequestPasswordReset(true);
	mockResetPassword(true);
	mockChangePassword(true);
}
