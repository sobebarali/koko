import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock Resend - must be hoisted before imports
const mockSend = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
	Resend: class MockResend {
		emails = {
			send: mockSend,
		};
	},
}));

import {
	getTestEmail,
	sendEmail,
	TEST_EMAILS,
} from "../../src/lib/email/resend";

describe("Email utilities", () => {
	describe("TEST_EMAILS", () => {
		test("has correct test email addresses", () => {
			expect(TEST_EMAILS.DELIVERED).toBe("delivered@resend.dev");
			expect(TEST_EMAILS.BOUNCED).toBe("bounced@resend.dev");
			expect(TEST_EMAILS.COMPLAINED).toBe("complained@resend.dev");
		});
	});

	describe("getTestEmail", () => {
		test("creates labeled delivered email", () => {
			const result = getTestEmail({ type: "DELIVERED", label: "signup" });
			expect(result).toBe("delivered+signup@resend.dev");
		});

		test("creates labeled bounced email", () => {
			const result = getTestEmail({ type: "BOUNCED", label: "test-user" });
			expect(result).toBe("bounced+test-user@resend.dev");
		});

		test("creates labeled complained email", () => {
			const result = getTestEmail({ type: "COMPLAINED", label: "newsletter" });
			expect(result).toBe("complained+newsletter@resend.dev");
		});
	});

	describe("sendEmail", () => {
		beforeEach(() => {
			vi.clearAllMocks();
			mockSend.mockResolvedValue({
				data: { id: "test-email-id" },
				error: null,
			});
		});

		test("sends email successfully", async () => {
			const result = await sendEmail({
				to: TEST_EMAILS.DELIVERED,
				subject: "Test Subject",
				html: "<p>Test content</p>",
			});

			expect(result.success).toBe(true);
			expect(result.data?.id).toBe("test-email-id");
			expect(result.error).toBeUndefined();
		});

		test("sends email to labeled test address", async () => {
			const testEmail = getTestEmail({ type: "DELIVERED", label: "welcome" });

			const result = await sendEmail({
				to: testEmail,
				subject: "Welcome!",
				html: "<p>Welcome to Koko!</p>",
			});

			expect(result.success).toBe(true);
		});

		test("sends email with custom from address", async () => {
			const result = await sendEmail({
				to: TEST_EMAILS.DELIVERED,
				subject: "Test",
				html: "<p>Test</p>",
				from: "custom@example.com",
			});

			expect(result.success).toBe(true);
			expect(mockSend).toHaveBeenCalledWith({
				from: "custom@example.com",
				to: TEST_EMAILS.DELIVERED,
				subject: "Test",
				html: "<p>Test</p>",
			});
		});

		test("sends email to multiple recipients", async () => {
			const result = await sendEmail({
				to: [
					TEST_EMAILS.DELIVERED,
					getTestEmail({ type: "DELIVERED", label: "user2" }),
				],
				subject: "Batch Test",
				html: "<p>Batch email</p>",
			});

			expect(result.success).toBe(true);
		});

		test("handles Resend API error", async () => {
			mockSend.mockResolvedValue({
				data: null,
				error: { message: "Invalid API key" },
			});

			const result = await sendEmail({
				to: TEST_EMAILS.DELIVERED,
				subject: "Test",
				html: "<p>Test</p>",
			});

			expect(result.success).toBe(false);
			expect(result.error).toBe("Invalid API key");
		});

		test("handles unexpected exception", async () => {
			mockSend.mockRejectedValue(new Error("Network error"));

			const result = await sendEmail({
				to: TEST_EMAILS.DELIVERED,
				subject: "Test",
				html: "<p>Test</p>",
			});

			expect(result.success).toBe(false);
			expect(result.error).toBe("Network error");
		});
	});
});
