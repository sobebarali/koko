import type { Logger } from "../../../lib/logger/types";
import { resolveComment } from "../resolve/service";
import type { UnresolveCommentInput, UnresolveCommentOutput } from "./type";

export async function unresolveComment({
	userId,
	id,
	logger,
}: {
	userId: string;
	logger: Logger;
} & UnresolveCommentInput): Promise<UnresolveCommentOutput> {
	logger.debug(
		{ event: "unresolve_comment_start", userId, commentId: id },
		"Unresolving comment",
	);

	// Delegate to resolveComment with resolved: false
	const result = await resolveComment({
		userId,
		id,
		resolved: false,
		logger,
	});

	logger.info(
		{ event: "unresolve_comment_success", userId, commentId: id },
		"Comment unresolved successfully",
	);

	return result;
}
