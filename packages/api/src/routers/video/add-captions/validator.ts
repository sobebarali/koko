import { z } from "zod";

/**
 * Add captions input validation schema - manual upload only
 *
 * For AI transcription, use video.transcribe (future implementation)
 */
export const addCaptionsInput = z.object({
	/** Video ID to add captions to */
	id: z.string().min(1, "Video ID is required"),

	/**
	 * Language code for caption file (ISO 639-1 two-letter code)
	 * @example "en", "es", "fr"
	 */
	srclang: z
		.string()
		.length(2, "Language code must be 2 characters (ISO 639-1)"),

	/**
	 * Human-readable label for the caption track
	 * @example "English", "Spanish"
	 */
	label: z.string().max(100).optional(),

	/**
	 * Base64-encoded caption file content (VTT or SRT format)
	 */
	captionFile: z.string().min(1, "Caption file is required"),
});
