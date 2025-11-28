import { db } from "@koko/db";
import { project, projectMember } from "@koko/db/schema/project";
import { TRPCError } from "@trpc/server";
import type { Logger } from "../../../lib/logger/types";
import { createCollection } from "../../../lib/services/bunny-collection-service";
import { projectListSelect } from "../constants";
import type { CreateProjectInput, CreateProjectOutput } from "./type";

export async function createProject({
	userId,
	name,
	description,
	color,
	logger,
}: {
	userId: string;
	logger: Logger;
} & CreateProjectInput): Promise<CreateProjectOutput> {
	logger.debug(
		{ event: "create_project_start", userId, name },
		"Creating new project",
	);

	try {
		// 1. Create Bunny Collection first (fail fast if this fails)
		const collection = await createCollection({ name });

		if (!collection) {
			logger.error(
				{ event: "create_project_collection_failed", userId, name },
				"Failed to create Bunny Collection",
			);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to create video collection. Please try again.",
			});
		}

		logger.debug(
			{
				event: "create_project_collection_success",
				collectionId: collection.guid,
			},
			"Bunny Collection created",
		);

		// 2. Create project with collection ID
		const projectId = crypto.randomUUID();
		const memberId = crypto.randomUUID();

		const [newProject] = await db
			.insert(project)
			.values({
				id: projectId,
				name,
				description: description ?? null,
				color: color ?? null,
				ownerId: userId,
				bunnyCollectionId: collection.guid,
			})
			.returning(projectListSelect);

		if (!newProject) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to create project.",
			});
		}

		await db.insert(projectMember).values({
			id: memberId,
			projectId,
			userId,
			role: "owner",
			canUpload: true,
			canComment: true,
			canInvite: true,
			canDelete: true,
		});

		logger.info(
			{ event: "create_project_success", userId, projectId },
			"Project created successfully",
		);

		return { project: newProject };
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "create_project_error",
				userId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to create project",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to create project.",
		});
	}
}
