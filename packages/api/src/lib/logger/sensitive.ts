// Fields to automatically redact from logs
export const SENSITIVE_FIELDS = [
	"password",
	"passwordHash",
	"token",
	"accessToken",
	"refreshToken",
	"sessionToken",
	"apiKey",
	"secret",
	"authorization",
	"cookie",
	"creditCard",
	"ssn",
] as const;

// Paths for Pino redaction (supports nested paths)
export const REDACT_PATHS = [
	"password",
	"*.password",
	"input.password",
	"token",
	"*.token",
	"accessToken",
	"refreshToken",
	"authorization",
	"headers.authorization",
	"headers.cookie",
	"*.apiKey",
	"*.secret",
	"*.accessKey",
	"*.AccessKey",
	"uploadHeaders.AccessKey",
];

// Manual sanitization for complex objects
export function sanitizeInput(input: unknown): unknown {
	if (input === null || input === undefined) {
		return input;
	}

	if (typeof input !== "object") {
		return input;
	}

	if (Array.isArray(input)) {
		return input.map(sanitizeInput);
	}

	const sanitized: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
		const lowerKey = key.toLowerCase();
		const isSensitive = SENSITIVE_FIELDS.some((field) =>
			lowerKey.includes(field.toLowerCase()),
		);

		if (isSensitive) {
			sanitized[key] = "[REDACTED]";
		} else if (typeof value === "object" && value !== null) {
			sanitized[key] = sanitizeInput(value);
		} else {
			sanitized[key] = value;
		}
	}

	return sanitized;
}
