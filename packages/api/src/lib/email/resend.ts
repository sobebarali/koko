import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Resend test email addresses for TDD
 * @see https://resend.com/docs/dashboard/emails/send-test-emails
 *
 * Use labels after `+` to differentiate test scenarios:
 * e.g., `delivered+signup@resend.dev`, `delivered+password-reset@resend.dev`
 */
export const TEST_EMAILS = {
	/** Email successfully delivered */
	DELIVERED: "delivered@resend.dev",
	/** Email bounced (SMTP 550 5.1.1 "Unknown User") */
	BOUNCED: "bounced@resend.dev",
	/** Email marked as spam by recipient */
	COMPLAINED: "complained@resend.dev",
} as const;

/**
 * Creates a labeled test email address for specific test scenarios
 * @example getTestEmail("delivered", "signup") => "delivered+signup@resend.dev"
 */
export function getTestEmail({
	type,
	label,
}: {
	type: keyof typeof TEST_EMAILS;
	label: string;
}): string {
	const base = type.toLowerCase();
	return `${base}+${label}@resend.dev`;
}

export type SendEmailResult = {
	success: boolean;
	data?: { id: string };
	error?: string;
};

export async function sendEmail({
	to,
	subject,
	html,
	from = "onboarding@resend.dev",
}: {
	to: string | string[];
	subject: string;
	html: string;
	from?: string;
}): Promise<SendEmailResult> {
	try {
		const { data, error } = await resend.emails.send({
			from,
			to,
			subject,
			html,
		});

		if (error) {
			return { success: false, error: error.message };
		}

		return { success: true, data: data ?? undefined };
	} catch (err) {
		const message = err instanceof Error ? err.message : "Failed to send email";
		return { success: false, error: message };
	}
}
