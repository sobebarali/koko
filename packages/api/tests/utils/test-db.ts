import * as schema from "@koko/db/schema/index";
import { type Client, createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

export type TestDb = LibSQLDatabase<typeof schema>;
export type TestClient = Client;

/**
 * Creates an isolated in-memory SQLite database for testing.
 * Each call creates a new database instance for test isolation.
 *
 * @returns Object containing the drizzle database instance and raw client
 */
export async function createTestDb(): Promise<{
	db: TestDb;
	client: TestClient;
}> {
	// Create a unique file-based database in temp directory
	// This avoids issues with in-memory database transactions creating new connections
	const uniqueDbName = `koko_test_${Date.now()}_${Math.random().toString(36).substring(7)}.db`;
	const dbPath = `/tmp/${uniqueDbName}`;
	const client = createClient({ url: `file:${dbPath}` });
	const db = drizzle(client, { schema });

	// Create all tables using raw SQL (more reliable than migrations for in-memory DBs)
	await createTables(client);

	return { db, client };
}

/**
 * Cleans up the test database connection.
 * Should be called in afterAll() hook.
 */
export async function cleanupTestDb(client: TestClient): Promise<void> {
	client.close();
}

/**
 * Creates all required tables in the database.
 * Uses raw SQL for direct table creation.
 */
async function createTables(client: TestClient): Promise<void> {
	// Create tables in dependency order (referenced tables first)
	const statements = [
		// User table (referenced by many others)
		`CREATE TABLE IF NOT EXISTS "user" (
			"id" text PRIMARY KEY NOT NULL,
			"name" text NOT NULL,
			"email" text NOT NULL UNIQUE,
			"email_verified" integer DEFAULT 0 NOT NULL,
			"image" text,
			"bio" text,
			"title" text,
			"company" text,
			"location" text,
			"website" text,
			"created_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
			"updated_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
		)`,

		// Session table
		`CREATE TABLE IF NOT EXISTS "session" (
			"id" text PRIMARY KEY NOT NULL,
			"expires_at" integer NOT NULL,
			"token" text NOT NULL UNIQUE,
			"created_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
			"updated_at" integer NOT NULL,
			"ip_address" text,
			"user_agent" text,
			"user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
		)`,

		// Account table
		`CREATE TABLE IF NOT EXISTS "account" (
			"id" text PRIMARY KEY NOT NULL,
			"account_id" text NOT NULL,
			"provider_id" text NOT NULL,
			"user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"access_token" text,
			"refresh_token" text,
			"id_token" text,
			"access_token_expires_at" integer,
			"refresh_token_expires_at" integer,
			"scope" text,
			"password" text,
			"created_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
			"updated_at" integer NOT NULL
		)`,

		// Verification table
		`CREATE TABLE IF NOT EXISTS "verification" (
			"id" text PRIMARY KEY NOT NULL,
			"identifier" text NOT NULL,
			"value" text NOT NULL,
			"expires_at" integer NOT NULL,
			"created_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
			"updated_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
		)`,

		// Team table
		`CREATE TABLE IF NOT EXISTS "team" (
			"id" text PRIMARY KEY NOT NULL,
			"name" text NOT NULL,
			"slug" text NOT NULL UNIQUE,
			"description" text,
			"logo" text,
			"owner_id" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
			"default_project_role" text DEFAULT 'viewer' NOT NULL,
			"allow_member_invites" integer DEFAULT 0 NOT NULL,
			"member_count" integer DEFAULT 1 NOT NULL,
			"project_count" integer DEFAULT 0 NOT NULL,
			"created_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
			"updated_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
			"deleted_at" integer
		)`,

		// Project table
		`CREATE TABLE IF NOT EXISTS "project" (
			"id" text PRIMARY KEY NOT NULL,
			"name" text NOT NULL,
			"description" text,
			"owner_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"status" text DEFAULT 'active' NOT NULL,
			"color" text,
			"thumbnail" text,
			"video_count" integer DEFAULT 0 NOT NULL,
			"member_count" integer DEFAULT 1 NOT NULL,
			"comment_count" integer DEFAULT 0 NOT NULL,
			"created_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
			"updated_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
			"archived_at" integer,
			"deleted_at" integer
		)`,

		// Project member table
		`CREATE TABLE IF NOT EXISTS "project_member" (
			"id" text PRIMARY KEY NOT NULL,
			"project_id" text NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
			"user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"role" text DEFAULT 'viewer' NOT NULL,
			"can_upload" integer DEFAULT 0 NOT NULL,
			"can_comment" integer DEFAULT 1 NOT NULL,
			"can_invite" integer DEFAULT 0 NOT NULL,
			"can_delete" integer DEFAULT 0 NOT NULL,
			"invited_by" text REFERENCES "user"("id") ON DELETE SET NULL,
			"joined_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
		)`,

		// Video table
		`CREATE TABLE IF NOT EXISTS "video" (
			"id" text PRIMARY KEY NOT NULL,
			"project_id" text NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
			"uploaded_by" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
			"bunny_video_id" text NOT NULL,
			"bunny_library_id" text NOT NULL,
			"bunny_collection_id" text,
			"title" text NOT NULL,
			"description" text,
			"tags" text DEFAULT '[]',
			"original_file_name" text NOT NULL,
			"file_size" integer NOT NULL,
			"mime_type" text NOT NULL,
			"duration" integer DEFAULT 0 NOT NULL,
			"width" integer DEFAULT 0 NOT NULL,
			"height" integer DEFAULT 0 NOT NULL,
			"fps" integer DEFAULT 0 NOT NULL,
			"status" text DEFAULT 'uploading' NOT NULL,
			"processing_progress" integer,
			"error_message" text,
			"streaming_url" text,
			"thumbnail_url" text,
			"view_count" integer DEFAULT 0 NOT NULL,
			"comment_count" integer DEFAULT 0 NOT NULL,
			"version_number" integer DEFAULT 1 NOT NULL,
			"parent_video_id" text,
			"is_current_version" integer DEFAULT 1 NOT NULL,
			"created_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
			"updated_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
			"deleted_at" integer
		)`,

		// Transcription table
		`CREATE TABLE IF NOT EXISTS "transcription" (
			"id" text PRIMARY KEY NOT NULL,
			"video_id" text NOT NULL UNIQUE REFERENCES "video"("id") ON DELETE CASCADE,
			"status" text DEFAULT 'pending' NOT NULL,
			"language" text DEFAULT 'en' NOT NULL,
			"content" text,
			"full_text" text,
			"provider" text,
			"provider_id" text,
			"error_message" text,
			"created_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
			"completed_at" integer
		)`,

		// Scene detection table
		`CREATE TABLE IF NOT EXISTS "scene_detection" (
			"id" text PRIMARY KEY NOT NULL,
			"video_id" text NOT NULL UNIQUE REFERENCES "video"("id") ON DELETE CASCADE,
			"status" text DEFAULT 'pending' NOT NULL,
			"scenes" text,
			"created_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
			"completed_at" integer
		)`,

		// Comment table
		`CREATE TABLE IF NOT EXISTS "comment" (
			"id" text PRIMARY KEY NOT NULL,
			"video_id" text NOT NULL REFERENCES "video"("id") ON DELETE CASCADE,
			"author_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"text" text NOT NULL,
			"timecode" integer NOT NULL,
			"parent_id" text,
			"reply_count" integer DEFAULT 0 NOT NULL,
			"resolved" integer DEFAULT 0 NOT NULL,
			"resolved_at" integer,
			"resolved_by" text REFERENCES "user"("id") ON DELETE SET NULL,
			"edited" integer DEFAULT 0 NOT NULL,
			"edited_at" integer,
			"mentions" text DEFAULT '[]',
			"created_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
			"updated_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
			"deleted_at" integer
		)`,

		// Annotation table
		`CREATE TABLE IF NOT EXISTS "annotation" (
			"id" text PRIMARY KEY NOT NULL,
			"video_id" text NOT NULL REFERENCES "video"("id") ON DELETE CASCADE,
			"comment_id" text REFERENCES "comment"("id") ON DELETE CASCADE,
			"author_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"timecode" integer NOT NULL,
			"frame_number" integer,
			"type" text NOT NULL,
			"data" text NOT NULL,
			"created_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
			"updated_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
			"deleted_at" integer
		)`,

		// Team member table
		`CREATE TABLE IF NOT EXISTS "team_member" (
			"id" text PRIMARY KEY NOT NULL,
			"team_id" text NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
			"user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"role" text DEFAULT 'member' NOT NULL,
			"invited_by" text REFERENCES "user"("id") ON DELETE SET NULL,
			"joined_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
		)`,

		// Plan table (for billing)
		`CREATE TABLE IF NOT EXISTS "plan" (
			"id" text PRIMARY KEY NOT NULL,
			"name" text NOT NULL UNIQUE,
			"display_name" text NOT NULL,
			"description" text,
			"price_monthly" integer DEFAULT 0 NOT NULL,
			"price_annual" integer DEFAULT 0 NOT NULL,
			"currency" text DEFAULT 'USD' NOT NULL,
			"limits" text NOT NULL,
			"features" text NOT NULL,
			"popular" integer DEFAULT 0 NOT NULL,
			"sort_order" integer DEFAULT 0 NOT NULL,
			"created_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
			"updated_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
		)`,

		// Subscription table
		`CREATE TABLE IF NOT EXISTS "subscription" (
			"id" text PRIMARY KEY NOT NULL,
			"user_id" text NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
			"plan_id" text NOT NULL REFERENCES "plan"("id") ON DELETE RESTRICT,
			"billing_cycle" text DEFAULT 'monthly' NOT NULL,
			"status" text DEFAULT 'active' NOT NULL,
			"current_period_start" integer NOT NULL,
			"current_period_end" integer NOT NULL,
			"trial_end" integer,
			"cancel_at" integer,
			"canceled_at" integer,
			"amount" integer NOT NULL,
			"currency" text DEFAULT 'USD' NOT NULL,
			"polar_subscription_id" text UNIQUE,
			"polar_customer_id" text,
			"created_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
			"updated_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
		)`,

		// Share link table
		`CREATE TABLE IF NOT EXISTS "share_link" (
			"id" text PRIMARY KEY NOT NULL,
			"resource_type" text NOT NULL,
			"resource_id" text NOT NULL,
			"created_by" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"token" text NOT NULL UNIQUE,
			"permission" text DEFAULT 'view' NOT NULL,
			"password" text,
			"expires_at" integer,
			"max_views" integer,
			"view_count" integer DEFAULT 0 NOT NULL,
			"watermark_enabled" integer DEFAULT 0 NOT NULL,
			"watermark_text" text,
			"allowed_emails" text,
			"allowed_domains" text,
			"is_active" integer DEFAULT 1 NOT NULL,
			"created_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
			"updated_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
		)`,

		// Tag table
		`CREATE TABLE IF NOT EXISTS "tag" (
			"id" text PRIMARY KEY NOT NULL,
			"name" text NOT NULL,
			"slug" text NOT NULL,
			"color" text,
			"user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"team_id" text REFERENCES "team"("id") ON DELETE CASCADE,
			"usage_count" integer DEFAULT 0 NOT NULL,
			"created_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
			"updated_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
		)`,

		// Notification table
		`CREATE TABLE IF NOT EXISTS "notification" (
			"id" text PRIMARY KEY NOT NULL,
			"user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"type" text NOT NULL,
			"title" text NOT NULL,
			"message" text NOT NULL,
			"resource_type" text,
			"resource_id" text,
			"actor_id" text REFERENCES "user"("id") ON DELETE SET NULL,
			"read" integer DEFAULT 0 NOT NULL,
			"read_at" integer,
			"email_sent" integer DEFAULT 0 NOT NULL,
			"email_sent_at" integer,
			"created_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
		)`,

		// Invitation table
		`CREATE TABLE IF NOT EXISTS "invitation" (
			"id" text PRIMARY KEY NOT NULL,
			"type" text NOT NULL,
			"team_id" text REFERENCES "team"("id") ON DELETE CASCADE,
			"project_id" text REFERENCES "project"("id") ON DELETE CASCADE,
			"email" text NOT NULL,
			"user_id" text REFERENCES "user"("id") ON DELETE CASCADE,
			"invited_by" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"role" text NOT NULL,
			"token" text NOT NULL UNIQUE,
			"status" text DEFAULT 'pending' NOT NULL,
			"expires_at" integer NOT NULL,
			"responded_at" integer,
			"message" text,
			"created_at" integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
		)`,

		// Create indexes for common queries
		`CREATE INDEX IF NOT EXISTS "project_owner_idx" ON "project" ("owner_id")`,
		`CREATE INDEX IF NOT EXISTS "project_status_idx" ON "project" ("status")`,
		`CREATE INDEX IF NOT EXISTS "project_member_project_idx" ON "project_member" ("project_id")`,
		`CREATE INDEX IF NOT EXISTS "project_member_user_idx" ON "project_member" ("user_id")`,
		`CREATE INDEX IF NOT EXISTS "video_project_idx" ON "video" ("project_id")`,
		`CREATE INDEX IF NOT EXISTS "video_uploaded_by_idx" ON "video" ("uploaded_by")`,
		`CREATE INDEX IF NOT EXISTS "comment_video_idx" ON "comment" ("video_id")`,
		`CREATE INDEX IF NOT EXISTS "comment_author_idx" ON "comment" ("author_id")`,
	];

	for (const statement of statements) {
		await client.execute(statement);
	}
}
