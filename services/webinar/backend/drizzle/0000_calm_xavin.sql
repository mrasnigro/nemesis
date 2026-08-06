CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`action` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`details` text,
	`ip_address` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`webinar_id` integer NOT NULL,
	`participant_id` integer,
	`sender_name` text,
	`sender_email` text,
	`message` text NOT NULL,
	`timestamp_seconds` integer NOT NULL,
	`is_from_replay` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `client_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`plan_id` integer NOT NULL,
	`status` text DEFAULT 'active',
	`started_at` text DEFAULT CURRENT_TIMESTAMP,
	`expires_at` text,
	`payment_status` text DEFAULT 'pending',
	`payment_method` text,
	`last_payment_date` text,
	`auto_renewal` integer DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `lead_chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`webinar_id` integer NOT NULL,
	`access_code_id` text NOT NULL,
	`message` text NOT NULL,
	`timestamp` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`webinar_id` integer,
	`session_id` integer,
	`status` text DEFAULT 'registered',
	`registered_at` text DEFAULT CURRENT_TIMESTAMP,
	`attended_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price` integer NOT NULL,
	`max_duration_minutes` integer,
	`max_participants` integer,
	`replay_storage_days` integer,
	`features` text,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plans_name_unique` ON `plans` (`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'client' NOT NULL,
	`name` text,
	`company_name` text,
	`phone` text,
	`website` text,
	`profile_image_url` text,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `webinar_access_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`webinar_id` integer NOT NULL,
	`code` text NOT NULL,
	`scheduled_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`max_leads` integer,
	`current_leads` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webinar_access_codes_code_unique` ON `webinar_access_codes` (`code`);--> statement-breakpoint
CREATE TABLE `webinars` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`scheduled_date` text NOT NULL,
	`duration_minutes` integer,
	`is_recurring` integer DEFAULT false,
	`recurrence_pattern` text,
	`recurrence_end_date` text,
	`timezone` text DEFAULT 'America/Sao_Paulo',
	`status` text DEFAULT 'draft',
	`presenter_name` text,
	`presenter_bio` text,
	`presenter_image_url` text,
	`registration_page_color` text DEFAULT '#007bff',
	`max_participants` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
