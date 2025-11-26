import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Extracts the token from a Better-Auth URL and constructs a frontend URL
 */
function buildFrontendUrl({
	betterAuthUrl,
	frontendPath,
}: {
	betterAuthUrl: string;
	frontendPath: string;
}): string {
	const url = new URL(betterAuthUrl);
	const token = url.searchParams.get("token");

	if (!token) {
		console.error("[Email] No token found in Better-Auth URL:", betterAuthUrl);
		return betterAuthUrl; // Fallback to original URL
	}

	const frontendBaseUrl = process.env.CORS_ORIGIN || "http://localhost:5173";
	return `${frontendBaseUrl}${frontendPath}?token=${token}`;
}

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  line-height: 1.6;
  color: #333;
`;

const buttonStyles = `
  display: inline-block;
  padding: 12px 24px;
  background-color: #0070f3;
  color: #ffffff;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 500;
  margin: 24px 0;
`;

const containerStyles = `
  max-width: 560px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const footerStyles = `
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #eaeaea;
  font-size: 12px;
  color: #666;
`;

function getVerificationEmailHtml({
	url,
	userName,
}: {
	url: string;
	userName?: string;
}): string {
	const greeting = userName ? `Hi ${userName},` : "Hi,";

	return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="${baseStyles} background-color: #f9fafb; margin: 0; padding: 20px;">
  <div style="${containerStyles} background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #111;">
      Verify your email address
    </h1>

    <p style="margin: 0 0 16px;">
      ${greeting}
    </p>

    <p style="margin: 0 0 16px;">
      Thank you for signing up! Please verify your email address by clicking the button below.
    </p>

    <a href="${url}" style="${buttonStyles}">
      Verify Email
    </a>

    <p style="margin: 0 0 16px; font-size: 14px; color: #666;">
      If you didn't create an account, you can safely ignore this email.
    </p>

    <p style="margin: 0 0 16px; font-size: 14px; color: #666;">
      This link will expire in 1 hour.
    </p>

    <div style="${footerStyles}">
      <p style="margin: 0;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="margin: 8px 0 0; word-break: break-all; color: #0070f3;">
        ${url}
      </p>
    </div>
  </div>
</body>
</html>
`.trim();
}

function getPasswordResetEmailHtml({
	url,
	userName,
}: {
	url: string;
	userName?: string;
}): string {
	const greeting = userName ? `Hi ${userName},` : "Hi,";

	return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="${baseStyles} background-color: #f9fafb; margin: 0; padding: 20px;">
  <div style="${containerStyles} background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #111;">
      Reset your password
    </h1>

    <p style="margin: 0 0 16px;">
      ${greeting}
    </p>

    <p style="margin: 0 0 16px;">
      We received a request to reset your password. Click the button below to choose a new password.
    </p>

    <a href="${url}" style="${buttonStyles}">
      Reset Password
    </a>

    <p style="margin: 0 0 16px; font-size: 14px; color: #666;">
      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>

    <p style="margin: 0 0 16px; font-size: 14px; color: #666;">
      This link will expire in 1 hour.
    </p>

    <div style="${footerStyles}">
      <p style="margin: 0;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="margin: 8px 0 0; word-break: break-all; color: #0070f3;">
        ${url}
      </p>
    </div>
  </div>
</body>
</html>
`.trim();
}

export async function sendVerificationEmail({
	user,
	url,
}: {
	user: { email: string; name?: string | null };
	url: string;
}): Promise<void> {
	// Transform Better-Auth API URL to frontend URL
	const frontendUrl = buildFrontendUrl({
		betterAuthUrl: url,
		frontendPath: "/auth/verify-email",
	});

	try {
		const { error } = await resend.emails.send({
			from: process.env.EMAIL_FROM || "noreply@example.com",
			to: user.email,
			subject: "Verify your email address",
			html: getVerificationEmailHtml({
				url: frontendUrl,
				userName: user.name ?? undefined,
			}),
		});

		if (error) {
			console.error("[Email] Failed to send verification email:", {
				email: user.email,
				error: error.message,
			});
			throw new Error(`Failed to send verification email: ${error.message}`);
		}

		console.info("[Email] Verification email sent successfully:", {
			email: user.email,
		});
	} catch (err) {
		console.error("[Email] Error sending verification email:", {
			email: user.email,
			error: err instanceof Error ? err.message : "Unknown error",
		});
		throw err;
	}
}

export async function sendPasswordResetEmail({
	user,
	url,
}: {
	user: { email: string; name?: string | null };
	url: string;
}): Promise<void> {
	// Transform Better-Auth API URL to frontend URL
	const frontendUrl = buildFrontendUrl({
		betterAuthUrl: url,
		frontendPath: "/auth/reset-password",
	});

	try {
		const { error } = await resend.emails.send({
			from: process.env.EMAIL_FROM || "noreply@example.com",
			to: user.email,
			subject: "Reset your password",
			html: getPasswordResetEmailHtml({
				url: frontendUrl,
				userName: user.name ?? undefined,
			}),
		});

		if (error) {
			console.error("[Email] Failed to send password reset email:", {
				email: user.email,
				error: error.message,
			});
			throw new Error(`Failed to send password reset email: ${error.message}`);
		}

		console.info("[Email] Password reset email sent successfully:", {
			email: user.email,
		});
	} catch (err) {
		console.error("[Email] Error sending password reset email:", {
			email: user.email,
			error: err instanceof Error ? err.message : "Unknown error",
		});
		throw err;
	}
}
