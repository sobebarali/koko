import { db } from "@koko/db";
import { project, projectMember } from "@koko/db/schema/project";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import { projectListSelect } from "../constants";
import type { GetAllOutput, ProjectListItem } from "./type";

export async function getAll({
	userId,
	status,
	limit,
	cursor,
	logger,
}: {
	userId: string;
	status: "active" | "archived";
	limit: number;
	cursor?: string;
	logger: Logger;
}): Promise<GetAllOutput> {
	logger.debug(
		{ event: "get_all_projects_start", userId, status, limit, cursor },
		"Fetching user projects",
	);

	try {
		const memberships = await db
			.select({
				projectId: projectMember.projectId,
				role: projectMember.role,
			})
			.from(projectMember)
			.where(eq(projectMember.userId, userId));

		const memberProjectIds = memberships.map((m) => m.projectId);
		const roleMap = new Map(memberships.map((m) => [m.projectId, m.role]));

		const ownedProjects = await db
			.select(projectListSelect)
			.from(project)
			.where(
				and(
					eq(project.status, status),
					eq(project.ownerId, userId),
					isNull(project.deletedAt),
				),
			)
			.orderBy(desc(project.createdAt));

		const memberProjects =
			memberProjectIds.length > 0
				? await db
						.select(projectListSelect)
						.from(project)
						.where(
							and(
								eq(project.status, status),
								inArray(project.id, memberProjectIds),
								isNull(project.deletedAt),
							),
						)
						.orderBy(desc(project.createdAt))
				: [];

		const allProjects = new Map<string, ProjectListItem>();

		for (const p of ownedProjects) {
			allProjects.set(p.id, { ...p, role: "owner" as const });
		}

		for (const p of memberProjects) {
			if (!allProjects.has(p.id)) {
				const role = roleMap.get(p.id) ?? "viewer";
				allProjects.set(p.id, { ...p, role });
			}
		}

		let projectList = Array.from(allProjects.values()).sort(
			(a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
		);

		if (cursor) {
			const cursorDate = new Date(cursor);
			projectList = projectList.filter(
				(p) => p.createdAt.getTime() < cursorDate.getTime(),
			);
		}

		const hasMore = projectList.length > limit;
		const items = projectList.slice(0, limit);
		const nextCursor = hasMore
			? items[items.length - 1]?.createdAt.toISOString()
			: undefined;

		logger.debug(
			{
				event: "get_all_projects_success",
				userId,
				count: items.length,
				hasMore,
			},
			"Projects fetched successfully",
		);

		return { projects: items, nextCursor };
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "get_all_projects_error",
				userId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to fetch projects",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to fetch projects.",
		});
	}
}
