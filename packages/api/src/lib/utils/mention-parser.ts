/**
 * Extract @username mentions from text
 * Pattern: /@(\w+)/g - matches @followed by alphanumeric characters and underscores
 * Returns unique, lowercased usernames
 */
export function extractMentions({ text }: { text: string }): string[] {
	const mentionPattern = /@(\w+)/g;
	const matches = Array.from(text.matchAll(mentionPattern));
	const usernames = matches
		.map((match) => match[1])
		.filter((username): username is string => username !== undefined)
		.map((username) => username.toLowerCase());

	// Return unique usernames
	return Array.from(new Set(usernames));
}
