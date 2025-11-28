CREATE TABLE `activity_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`resource_type` text,
	`resource_id` text,
	`metadata` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `activity_user_idx` ON `activity_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `activity_action_idx` ON `activity_log` (`action`);--> statement-breakpoint
CREATE INDEX `activity_resource_idx` ON `activity_log` (`resource_type`,`resource_id`);--> statement-breakpoint
CREATE INDEX `activity_created_idx` ON `activity_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `data_deletion_request` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`confirmed_at` integer,
	`scheduled_for` integer,
	`processed_at` integer,
	`deleted_data` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `data_deletion_user_idx` ON `data_deletion_request` (`user_id`);--> statement-breakpoint
CREATE INDEX `data_deletion_status_idx` ON `data_deletion_request` (`status`);--> statement-breakpoint
CREATE INDEX `data_deletion_scheduled_idx` ON `data_deletion_request` (`scheduled_for`);--> statement-breakpoint
CREATE TABLE `data_export_request` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`format` text DEFAULT 'json' NOT NULL,
	`download_url` text,
	`download_expires_at` integer,
	`started_at` integer,
	`completed_at` integer,
	`error_message` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `data_export_user_idx` ON `data_export_request` (`user_id`);--> statement-breakpoint
CREATE INDEX `data_export_status_idx` ON `data_export_request` (`status`);--> statement-breakpoint
CREATE TABLE `video_view` (
	`id` text PRIMARY KEY NOT NULL,
	`video_id` text NOT NULL,
	`user_id` text,
	`session_id` text,
	`watch_duration` integer DEFAULT 0 NOT NULL,
	`completion_percentage` integer DEFAULT 0 NOT NULL,
	`source` text,
	`share_link_id` text,
	`ip_address` text,
	`user_agent` text,
	`country` text,
	`viewed_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`share_link_id`) REFERENCES `share_link`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `video_view_video_idx` ON `video_view` (`video_id`);--> statement-breakpoint
CREATE INDEX `video_view_user_idx` ON `video_view` (`user_id`);--> statement-breakpoint
CREATE INDEX `video_view_date_idx` ON `video_view` (`viewed_at`);--> statement-breakpoint
CREATE TABLE `asset` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`uploaded_by` text NOT NULL,
	`name` text NOT NULL,
	`original_file_name` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`storage_key` text NOT NULL,
	`storage_url` text NOT NULL,
	`folder_id` text,
	`description` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`folder_id`) REFERENCES `asset_folder`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `asset_project_idx` ON `asset` (`project_id`);--> statement-breakpoint
CREATE INDEX `asset_uploaded_by_idx` ON `asset` (`uploaded_by`);--> statement-breakpoint
CREATE INDEX `asset_folder_idx` ON `asset` (`folder_id`);--> statement-breakpoint
CREATE TABLE `asset_folder` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `asset_folder_project_idx` ON `asset_folder` (`project_id`);--> statement-breakpoint
CREATE INDEX `asset_folder_parent_idx` ON `asset_folder` (`parent_id`);--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`bio` text,
	`title` text,
	`company` text,
	`location` text,
	`website` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `invoice` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`user_id` text NOT NULL,
	`number` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`due_date` integer NOT NULL,
	`paid_at` integer,
	`polar_invoice_id` text,
	`download_url` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscription`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoice_number_unique` ON `invoice` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoice_polar_invoice_id_unique` ON `invoice` (`polar_invoice_id`);--> statement-breakpoint
CREATE INDEX `invoice_subscription_idx` ON `invoice` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `invoice_user_idx` ON `invoice` (`user_id`);--> statement-breakpoint
CREATE INDEX `invoice_status_idx` ON `invoice` (`status`);--> statement-breakpoint
CREATE TABLE `plan` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`price_monthly` integer DEFAULT 0 NOT NULL,
	`price_annual` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`limits` text NOT NULL,
	`features` text NOT NULL,
	`popular` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plan_name_unique` ON `plan` (`name`);--> statement-breakpoint
CREATE TABLE `subscription` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`billing_cycle` text DEFAULT 'monthly' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`current_period_start` integer NOT NULL,
	`current_period_end` integer NOT NULL,
	`trial_end` integer,
	`cancel_at` integer,
	`canceled_at` integer,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`polar_subscription_id` text,
	`polar_customer_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plan_id`) REFERENCES `plan`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_user_id_unique` ON `subscription` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_polar_subscription_id_unique` ON `subscription` (`polar_subscription_id`);--> statement-breakpoint
CREATE INDEX `subscription_user_idx` ON `subscription` (`user_id`);--> statement-breakpoint
CREATE INDEX `subscription_plan_idx` ON `subscription` (`plan_id`);--> statement-breakpoint
CREATE INDEX `subscription_status_idx` ON `subscription` (`status`);--> statement-breakpoint
CREATE INDEX `subscription_polar_idx` ON `subscription` (`polar_subscription_id`);--> statement-breakpoint
CREATE TABLE `annotation` (
	`id` text PRIMARY KEY NOT NULL,
	`video_id` text NOT NULL,
	`comment_id` text,
	`author_id` text NOT NULL,
	`timecode` integer NOT NULL,
	`frame_number` integer,
	`type` text NOT NULL,
	`data` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `comment`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `annotation_video_idx` ON `annotation` (`video_id`);--> statement-breakpoint
CREATE INDEX `annotation_comment_idx` ON `annotation` (`comment_id`);--> statement-breakpoint
CREATE INDEX `annotation_author_idx` ON `annotation` (`author_id`);--> statement-breakpoint
CREATE INDEX `annotation_timecode_idx` ON `annotation` (`timecode`);--> statement-breakpoint
CREATE TABLE `comment` (
	`id` text PRIMARY KEY NOT NULL,
	`video_id` text NOT NULL,
	`author_id` text NOT NULL,
	`text` text NOT NULL,
	`timecode` integer NOT NULL,
	`parent_id` text,
	`reply_count` integer DEFAULT 0 NOT NULL,
	`resolved` integer DEFAULT false NOT NULL,
	`resolved_at` integer,
	`resolved_by` text,
	`edited` integer DEFAULT false NOT NULL,
	`edited_at` integer,
	`mentions` text DEFAULT '[]',
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resolved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `comment_video_idx` ON `comment` (`video_id`);--> statement-breakpoint
CREATE INDEX `comment_author_idx` ON `comment` (`author_id`);--> statement-breakpoint
CREATE INDEX `comment_parent_idx` ON `comment` (`parent_id`);--> statement-breakpoint
CREATE INDEX `comment_timecode_idx` ON `comment` (`timecode`);--> statement-breakpoint
CREATE INDEX `comment_resolved_idx` ON `comment` (`resolved`);--> statement-breakpoint
CREATE INDEX `comment_video_timecode_idx` ON `comment` (`video_id`,`timecode`);--> statement-breakpoint
CREATE INDEX `comment_video_resolved_idx` ON `comment` (`video_id`,`resolved`);--> statement-breakpoint
CREATE TABLE `notification` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`resource_type` text,
	`resource_id` text,
	`actor_id` text,
	`read` integer DEFAULT false NOT NULL,
	`read_at` integer,
	`email_sent` integer DEFAULT false NOT NULL,
	`email_sent_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `notification_user_idx` ON `notification` (`user_id`);--> statement-breakpoint
CREATE INDEX `notification_type_idx` ON `notification` (`type`);--> statement-breakpoint
CREATE INDEX `notification_user_read_idx` ON `notification` (`user_id`,`read`);--> statement-breakpoint
CREATE INDEX `notification_created_idx` ON `notification` (`created_at`);--> statement-breakpoint
CREATE TABLE `notification_preference` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email_comments` integer DEFAULT true NOT NULL,
	`email_mentions` integer DEFAULT true NOT NULL,
	`email_video_ready` integer DEFAULT true NOT NULL,
	`email_project_invites` integer DEFAULT true NOT NULL,
	`email_digest` text DEFAULT 'daily' NOT NULL,
	`in_app_comments` integer DEFAULT true NOT NULL,
	`in_app_mentions` integer DEFAULT true NOT NULL,
	`in_app_video_ready` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_preference_user_id_unique` ON `notification_preference` (`user_id`);--> statement-breakpoint
CREATE INDEX `notification_pref_user_idx` ON `notification_preference` (`user_id`);--> statement-breakpoint
CREATE TABLE `project` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`owner_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`color` text,
	`thumbnail` text,
	`bunny_collection_id` text,
	`video_count` integer DEFAULT 0 NOT NULL,
	`member_count` integer DEFAULT 1 NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_owner_idx` ON `project` (`owner_id`);--> statement-breakpoint
CREATE INDEX `project_status_idx` ON `project` (`status`);--> statement-breakpoint
CREATE INDEX `project_created_idx` ON `project` (`created_at`);--> statement-breakpoint
CREATE INDEX `project_owner_status_idx` ON `project` (`owner_id`,`status`);--> statement-breakpoint
CREATE TABLE `project_member` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`can_upload` integer DEFAULT false NOT NULL,
	`can_comment` integer DEFAULT true NOT NULL,
	`can_invite` integer DEFAULT false NOT NULL,
	`can_delete` integer DEFAULT false NOT NULL,
	`invited_by` text,
	`joined_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `project_member_project_idx` ON `project_member` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_member_user_idx` ON `project_member` (`user_id`);--> statement-breakpoint
CREATE INDEX `project_member_unique_idx` ON `project_member` (`project_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `api_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`usage_type` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`window_start` integer NOT NULL,
	`window_end` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `api_usage_user_idx` ON `api_usage` (`user_id`);--> statement-breakpoint
CREATE INDEX `api_usage_user_type_window_idx` ON `api_usage` (`user_id`,`usage_type`,`window_start`);--> statement-breakpoint
CREATE TABLE `usage_snapshot` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_count` integer NOT NULL,
	`video_count` integer NOT NULL,
	`storage_used` integer NOT NULL,
	`team_member_count` integer NOT NULL,
	`bandwidth_used` integer DEFAULT 0 NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`snapshot_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `usage_snapshot_user_idx` ON `usage_snapshot` (`user_id`);--> statement-breakpoint
CREATE INDEX `usage_snapshot_date_idx` ON `usage_snapshot` (`snapshot_at`);--> statement-breakpoint
CREATE INDEX `usage_snapshot_user_period_idx` ON `usage_snapshot` (`user_id`,`period_start`);--> statement-breakpoint
CREATE TABLE `share_link` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`created_by` text NOT NULL,
	`token` text NOT NULL,
	`permission` text DEFAULT 'view' NOT NULL,
	`password` text,
	`expires_at` integer,
	`max_views` integer,
	`view_count` integer DEFAULT 0 NOT NULL,
	`watermark_enabled` integer DEFAULT false NOT NULL,
	`watermark_text` text,
	`allowed_emails` text,
	`allowed_domains` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `share_link_token_unique` ON `share_link` (`token`);--> statement-breakpoint
CREATE INDEX `share_link_token_idx` ON `share_link` (`token`);--> statement-breakpoint
CREATE INDEX `share_link_resource_idx` ON `share_link` (`resource_type`,`resource_id`);--> statement-breakpoint
CREATE INDEX `share_link_created_by_idx` ON `share_link` (`created_by`);--> statement-breakpoint
CREATE TABLE `share_link_access` (
	`id` text PRIMARY KEY NOT NULL,
	`share_link_id` text NOT NULL,
	`user_id` text,
	`email` text,
	`ip_address` text,
	`user_agent` text,
	`accessed_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`share_link_id`) REFERENCES `share_link`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `share_access_link_idx` ON `share_link_access` (`share_link_id`);--> statement-breakpoint
CREATE INDEX `share_access_user_idx` ON `share_link_access` (`user_id`);--> statement-breakpoint
CREATE INDEX `share_access_date_idx` ON `share_link_access` (`accessed_at`);--> statement-breakpoint
CREATE TABLE `project_tag` (
	`project_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_tag_project_idx` ON `project_tag` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_tag_tag_idx` ON `project_tag` (`tag_id`);--> statement-breakpoint
CREATE INDEX `project_tag_unique_idx` ON `project_tag` (`project_id`,`tag_id`);--> statement-breakpoint
CREATE TABLE `tag` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`color` text,
	`user_id` text NOT NULL,
	`team_id` text,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tag_user_idx` ON `tag` (`user_id`);--> statement-breakpoint
CREATE INDEX `tag_team_idx` ON `tag` (`team_id`);--> statement-breakpoint
CREATE INDEX `tag_user_slug_idx` ON `tag` (`user_id`,`slug`);--> statement-breakpoint
CREATE TABLE `video_tag` (
	`video_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `video_tag_video_idx` ON `video_tag` (`video_id`);--> statement-breakpoint
CREATE INDEX `video_tag_tag_idx` ON `video_tag` (`tag_id`);--> statement-breakpoint
CREATE INDEX `video_tag_unique_idx` ON `video_tag` (`video_id`,`tag_id`);--> statement-breakpoint
CREATE TABLE `invitation` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`team_id` text,
	`project_id` text,
	`email` text NOT NULL,
	`user_id` text,
	`invited_by` text NOT NULL,
	`role` text NOT NULL,
	`token` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`responded_at` integer,
	`message` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitation_token_unique` ON `invitation` (`token`);--> statement-breakpoint
CREATE INDEX `invitation_email_idx` ON `invitation` (`email`);--> statement-breakpoint
CREATE INDEX `invitation_token_idx` ON `invitation` (`token`);--> statement-breakpoint
CREATE INDEX `invitation_team_idx` ON `invitation` (`team_id`);--> statement-breakpoint
CREATE INDEX `invitation_project_idx` ON `invitation` (`project_id`);--> statement-breakpoint
CREATE INDEX `invitation_status_idx` ON `invitation` (`status`);--> statement-breakpoint
CREATE TABLE `team` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`logo` text,
	`owner_id` text NOT NULL,
	`default_project_role` text DEFAULT 'viewer' NOT NULL,
	`allow_member_invites` integer DEFAULT false NOT NULL,
	`member_count` integer DEFAULT 1 NOT NULL,
	`project_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_slug_unique` ON `team` (`slug`);--> statement-breakpoint
CREATE INDEX `team_owner_idx` ON `team` (`owner_id`);--> statement-breakpoint
CREATE INDEX `team_slug_idx` ON `team` (`slug`);--> statement-breakpoint
CREATE TABLE `team_member` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`invited_by` text,
	`joined_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `team_member_team_idx` ON `team_member` (`team_id`);--> statement-breakpoint
CREATE INDEX `team_member_user_idx` ON `team_member` (`user_id`);--> statement-breakpoint
CREATE INDEX `team_member_unique_idx` ON `team_member` (`team_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `todo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scene_detection` (
	`id` text PRIMARY KEY NOT NULL,
	`video_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`scenes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scene_detection_video_id_unique` ON `scene_detection` (`video_id`);--> statement-breakpoint
CREATE INDEX `scene_detection_video_idx` ON `scene_detection` (`video_id`);--> statement-breakpoint
CREATE TABLE `transcription` (
	`id` text PRIMARY KEY NOT NULL,
	`video_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`content` text,
	`full_text` text,
	`provider` text,
	`provider_id` text,
	`error_message` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transcription_video_id_unique` ON `transcription` (`video_id`);--> statement-breakpoint
CREATE INDEX `transcription_video_idx` ON `transcription` (`video_id`);--> statement-breakpoint
CREATE INDEX `transcription_status_idx` ON `transcription` (`status`);--> statement-breakpoint
CREATE TABLE `video` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`uploaded_by` text NOT NULL,
	`bunny_video_id` text NOT NULL,
	`bunny_library_id` text NOT NULL,
	`bunny_collection_id` text,
	`title` text NOT NULL,
	`description` text,
	`tags` text DEFAULT '[]',
	`original_file_name` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`duration` integer DEFAULT 0 NOT NULL,
	`width` integer DEFAULT 0 NOT NULL,
	`height` integer DEFAULT 0 NOT NULL,
	`fps` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'uploading' NOT NULL,
	`processing_progress` integer,
	`error_message` text,
	`streaming_url` text,
	`thumbnail_url` text,
	`view_count` integer DEFAULT 0 NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL,
	`version_number` integer DEFAULT 1 NOT NULL,
	`parent_video_id` text,
	`is_current_version` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `video_project_idx` ON `video` (`project_id`);--> statement-breakpoint
CREATE INDEX `video_uploaded_by_idx` ON `video` (`uploaded_by`);--> statement-breakpoint
CREATE INDEX `video_status_idx` ON `video` (`status`);--> statement-breakpoint
CREATE INDEX `video_bunny_idx` ON `video` (`bunny_video_id`);--> statement-breakpoint
CREATE INDEX `video_created_idx` ON `video` (`created_at`);--> statement-breakpoint
CREATE INDEX `video_project_status_idx` ON `video` (`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `video_parent_idx` ON `video` (`parent_video_id`);--> statement-breakpoint
CREATE TABLE `webhook` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`team_id` text,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`secret` text NOT NULL,
	`events` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`last_triggered_at` integer,
	`success_count` integer DEFAULT 0 NOT NULL,
	`failure_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `webhook_user_idx` ON `webhook` (`user_id`);--> statement-breakpoint
CREATE INDEX `webhook_team_idx` ON `webhook` (`team_id`);--> statement-breakpoint
CREATE TABLE `webhook_delivery` (
	`id` text PRIMARY KEY NOT NULL,
	`webhook_id` text NOT NULL,
	`event` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`status_code` integer,
	`response_body` text,
	`error_message` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_retry_at` integer,
	`delivered_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`webhook_id`) REFERENCES `webhook`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `webhook_delivery_webhook_idx` ON `webhook_delivery` (`webhook_id`);--> statement-breakpoint
CREATE INDEX `webhook_delivery_status_idx` ON `webhook_delivery` (`status`);--> statement-breakpoint
CREATE INDEX `webhook_delivery_retry_idx` ON `webhook_delivery` (`next_retry_at`);