/**
 * Add captions input - manual caption file upload only
 *
 * For AI transcription, use video.transcribe (future implementation)
 */
export interface AddCaptionsInput {
	/** Video ID */
	id: string;

	/**
	 * Language code for the caption file (ISO 639-1 two-letter code)
	 * @example "en" for English
	 */
	srclang: string;

	/**
	 * Human-readable label for the caption track
	 * @example "English", "English (CC)"
	 */
	label?: string;

	/**
	 * Base64-encoded caption file content (VTT or SRT format)
	 */
	captionFile: string;
}

export interface AddCaptionsOutput {
	success: boolean;
	message: string;
}
