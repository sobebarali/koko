/**
 * Bunny.net Collections Service
 *
 * Centralized service for managing Bunny.net Collections and video operations.
 * All functions use graceful error handling - returning null/false instead of throwing.
 */

const BASE_URL = "https://video.bunnycdn.com";

/**
 * Gets Bunny API credentials from environment variables
 * @returns API key and library ID, or null if not configured
 */
function getBunnyConfig(): { apiKey: string; libraryId: string } | null {
	const apiKey = process.env.BUNNY_API_KEY;
	const libraryId = process.env.BUNNY_LIBRARY_ID;

	if (!apiKey || !libraryId) {
		console.warn(
			"[bunny-collection-service] BUNNY_API_KEY or BUNNY_LIBRARY_ID not configured",
		);
		return null;
	}

	return { apiKey, libraryId };
}

/**
 * Creates a new collection in Bunny.net
 *
 * @param name - The name of the collection
 * @returns Collection data (guid and name) on success, null on failure
 */
export async function createCollection({
	name,
}: {
	name: string;
}): Promise<{ guid: string; name: string } | null> {
	const config = getBunnyConfig();
	if (!config) {
		console.error(
			"[bunny-collection-service] createCollection failed: environment variables not configured",
		);
		return null;
	}

	try {
		const response = await fetch(
			`${BASE_URL}/library/${config.libraryId}/collections`,
			{
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					AccessKey: config.apiKey,
				},
				body: JSON.stringify({ name }),
			},
		);

		if (!response.ok) {
			console.error("[bunny-collection-service] createCollection failed", {
				status: response.status,
				statusText: response.statusText,
				name,
			});
			return null;
		}

		const data = (await response.json()) as { guid?: string; name?: string };

		// Validate response has required fields
		if (!data.guid) {
			console.error(
				"[bunny-collection-service] createCollection response missing guid",
				{
					data,
				},
			);
			return null;
		}

		return {
			guid: data.guid,
			name: data.name ?? name,
		};
	} catch (error) {
		console.error("[bunny-collection-service] createCollection error", {
			error: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
			name,
		});
		return null;
	}
}

/**
 * Updates the name of an existing collection
 *
 * @param collectionId - The GUID of the collection to update
 * @param name - The new name for the collection
 * @returns true on success, false on failure
 */
export async function updateCollectionName({
	collectionId,
	name,
}: {
	collectionId: string;
	name: string;
}): Promise<boolean> {
	const config = getBunnyConfig();
	if (!config) {
		console.error(
			"[bunny-collection-service] updateCollectionName failed: environment variables not configured",
		);
		return false;
	}

	try {
		const response = await fetch(
			`${BASE_URL}/library/${config.libraryId}/collections/${collectionId}`,
			{
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					AccessKey: config.apiKey,
				},
				body: JSON.stringify({ name }),
			},
		);

		if (!response.ok) {
			console.error("[bunny-collection-service] updateCollectionName failed", {
				status: response.status,
				statusText: response.statusText,
				collectionId,
				name,
			});
			return false;
		}

		return true;
	} catch (error) {
		console.error("[bunny-collection-service] updateCollectionName error", {
			error: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
			collectionId,
			name,
		});
		return false;
	}
}

/**
 * Deletes a collection from Bunny.net
 *
 * @param collectionId - The GUID of the collection to delete
 * @returns true on success, false on failure
 */
export async function deleteCollection({
	collectionId,
}: {
	collectionId: string;
}): Promise<boolean> {
	const config = getBunnyConfig();
	if (!config) {
		console.error(
			"[bunny-collection-service] deleteCollection failed: environment variables not configured",
		);
		return false;
	}

	try {
		const response = await fetch(
			`${BASE_URL}/library/${config.libraryId}/collections/${collectionId}`,
			{
				method: "DELETE",
				headers: {
					Accept: "application/json",
					AccessKey: config.apiKey,
				},
			},
		);

		if (!response.ok) {
			console.error("[bunny-collection-service] deleteCollection failed", {
				status: response.status,
				statusText: response.statusText,
				collectionId,
			});
			return false;
		}

		return true;
	} catch (error) {
		console.error("[bunny-collection-service] deleteCollection error", {
			error: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
			collectionId,
		});
		return false;
	}
}

/**
 * Adds a video to a collection (or moves it to a new collection)
 *
 * @param videoId - The GUID of the video
 * @param collectionId - The GUID of the collection
 * @returns true on success, false on failure
 */
export async function addVideoToCollection({
	videoId,
	collectionId,
}: {
	videoId: string;
	collectionId: string;
}): Promise<boolean> {
	const config = getBunnyConfig();
	if (!config) {
		console.error(
			"[bunny-collection-service] addVideoToCollection failed: environment variables not configured",
		);
		return false;
	}

	try {
		const response = await fetch(
			`${BASE_URL}/library/${config.libraryId}/videos/${videoId}`,
			{
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					AccessKey: config.apiKey,
				},
				body: JSON.stringify({ collectionId }),
			},
		);

		if (!response.ok) {
			console.error("[bunny-collection-service] addVideoToCollection failed", {
				status: response.status,
				statusText: response.statusText,
				videoId,
				collectionId,
			});
			return false;
		}

		return true;
	} catch (error) {
		console.error("[bunny-collection-service] addVideoToCollection error", {
			error: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
			videoId,
			collectionId,
		});
		return false;
	}
}

/**
 * Deletes a video from Bunny.net
 *
 * @param videoId - The GUID of the video to delete
 * @returns true on success, false on failure
 */
export async function deleteVideo({
	videoId,
}: {
	videoId: string;
}): Promise<boolean> {
	const config = getBunnyConfig();
	if (!config) {
		console.error(
			"[bunny-collection-service] deleteVideo failed: environment variables not configured",
		);
		return false;
	}

	try {
		const response = await fetch(
			`${BASE_URL}/library/${config.libraryId}/videos/${videoId}`,
			{
				method: "DELETE",
				headers: {
					Accept: "application/json",
					AccessKey: config.apiKey,
				},
			},
		);

		if (!response.ok) {
			console.error("[bunny-collection-service] deleteVideo failed", {
				status: response.status,
				statusText: response.statusText,
				videoId,
			});
			return false;
		}

		return true;
	} catch (error) {
		console.error("[bunny-collection-service] deleteVideo error", {
			error: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
			videoId,
		});
		return false;
	}
}
