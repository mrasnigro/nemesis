CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`action` varchar(255) NOT NULL,
	`entity_type` varchar(100),
	`entity_id` varchar(36),
	`details` text,
	`ip_address` varchar(45),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`webinar_id` int NOT NULL,
	`participant_id` int,
	`sender_name` varchar(255),
	`sender_email` varchar(255),
	`message` text NOT NULL,
	`timestamp_seconds` int NOT NULL,
	`is_from_replay` tinyint DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`plan_id` int NOT NULL,
	`status` varchar(20) DEFAULT 'active',
	`started_at` timestamp DEFAULT (now()),
	`expires_at` datetime,
	`payment_status` varchar(20) DEFAULT 'pending',
	`payment_method` varchar(100),
	`last_payment_date` datetime,
	`auto_renewal` tinyint DEFAULT 1,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lead_chat_messages` (
	`id` varchar(36) NOT NULL,
	`lead_id` varchar(36) NOT NULL,
	`webinar_id` int NOT NULL,
	`access_code_id` varchar(36) NOT NULL,
	`message` text NOT NULL,
	`timestamp` datetime NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `lead_chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(20),
	`webinar_id` int,
	`session_id` int,
	`status` varchar(20) DEFAULT 'registered',
	`registered_at` timestamp DEFAULT (now()),
	`attended_at` datetime,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`max_duration_minutes` int,
	`max_participants` int,
	`replay_storage_days` int,
	`features` text,
	`is_active` tinyint DEFAULT 1,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `plans_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` enum('admin','client') NOT NULL DEFAULT 'client',
	`name` varchar(255),
	`company_name` varchar(255),
	`phone` varchar(20),
	`website` varchar(255),
	`profile_image_url` varchar(500),
	`is_active` tinyint DEFAULT 1,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `webinar_access_codes` (
	`id` varchar(36) NOT NULL,
	`webinar_id` int NOT NULL,
	`code` varchar(50) NOT NULL,
	`scheduled_at` datetime NOT NULL,
	`expires_at` datetime NOT NULL,
	`max_leads` int,
	`current_leads` int NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webinar_access_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `webinar_access_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `webinars` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`scheduled_date` datetime NOT NULL,
	`duration_minutes` int,
	`is_recurring` tinyint DEFAULT 0,
	`recurrence_pattern` varchar(100),
	`recurrence_end_date` datetime,
	`timezone` varchar(100) DEFAULT 'America/Sao_Paulo',
	`status` varchar(20) DEFAULT 'draft',
	`presenter_name` varchar(255),
	`presenter_bio` text,
	`presenter_image_url` varchar(500),
	`registration_page_color` varchar(7) DEFAULT '#007bff',
	`max_participants` int,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webinars_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_chat_messages_webinar` ON `chat_messages` (`webinar_id`);--> statement-breakpoint
CREATE INDEX `idx_client_subscriptions_client` ON `client_subscriptions` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_lead_chat_lead` ON `lead_chat_messages` (`lead_id`);--> statement-breakpoint
CREATE INDEX `idx_leads_client` ON `leads` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_leads_webinar` ON `leads` (`webinar_id`);--> statement-breakpoint
CREATE INDEX `idx_access_codes_webinar` ON `webinar_access_codes` (`webinar_id`);--> statement-breakpoint
CREATE INDEX `idx_webinars_client` ON `webinars` (`client_id`);