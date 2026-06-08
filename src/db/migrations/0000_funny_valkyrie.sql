CREATE TABLE `assets` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`type` varchar(20) NOT NULL,
	`category_id` int,
	`current_value` double NOT NULL DEFAULT 0,
	`monthly_income` double DEFAULT 0,
	`annual_yield` double DEFAULT 0,
	`income_frequency` varchar(20),
	`income_day` int,
	`is_active` boolean NOT NULL DEFAULT true,
	`note` text,
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` varchar(20) NOT NULL,
	`parent_id` int,
	`created_at` datetime,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `liabilities` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`type` varchar(20) NOT NULL,
	`category_id` int,
	`total_principal` double NOT NULL,
	`remaining_principal` double NOT NULL,
	`annual_rate` double NOT NULL DEFAULT 0,
	`repayment_method` varchar(30) NOT NULL DEFAULT 'equal_installment',
	`monthly_payment` double NOT NULL DEFAULT 0,
	`payment_day` int,
	`start_date` datetime,
	`end_date` datetime,
	`is_active` boolean NOT NULL DEFAULT true,
	`note` text,
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `liabilities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monthly_snapshots` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`month` varchar(7) NOT NULL,
	`total_assets` double NOT NULL DEFAULT 0,
	`total_liabilities` double NOT NULL DEFAULT 0,
	`net_worth` double NOT NULL DEFAULT 0,
	`monthly_cash_flow` double NOT NULL DEFAULT 0,
	`asset_breakdown` text,
	`liability_breakdown` text,
	`created_at` datetime,
	CONSTRAINT `monthly_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reconciliations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`asset_id` int,
	`liability_id` int,
	`expected_balance` double NOT NULL,
	`actual_balance` double NOT NULL,
	`difference` double NOT NULL,
	`reconciliation_date` datetime NOT NULL,
	`transaction_id` int,
	`note` text,
	`created_at` datetime,
	CONSTRAINT `reconciliations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` datetime,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` varchar(30) NOT NULL,
	`category_id` int,
	`asset_id` int,
	`liability_id` int,
	`amount` double NOT NULL,
	`principal_part` double DEFAULT 0,
	`interest_part` double DEFAULT 0,
	`description` varchar(500) NOT NULL,
	`transaction_date` datetime NOT NULL,
	`is_auto_generated` boolean NOT NULL DEFAULT false,
	`reconciliation_id` int,
	`note` text,
	`created_at` datetime,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`password_hash` varchar(255),
	`nickname` varchar(50),
	`wechat_openid` varchar(100),
	`avatar_url` varchar(500),
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_phone_unique` UNIQUE(`phone`),
	CONSTRAINT `users_wechat_openid_unique` UNIQUE(`wechat_openid`)
);
--> statement-breakpoint
ALTER TABLE `assets` ADD CONSTRAINT `assets_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assets` ADD CONSTRAINT `assets_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `liabilities` ADD CONSTRAINT `liabilities_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `liabilities` ADD CONSTRAINT `liabilities_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_snapshots` ADD CONSTRAINT `monthly_snapshots_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reconciliations` ADD CONSTRAINT `reconciliations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reconciliations` ADD CONSTRAINT `reconciliations_asset_id_assets_id_fk` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reconciliations` ADD CONSTRAINT `reconciliations_liability_id_liabilities_id_fk` FOREIGN KEY (`liability_id`) REFERENCES `liabilities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_asset_id_assets_id_fk` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_liability_id_liabilities_id_fk` FOREIGN KEY (`liability_id`) REFERENCES `liabilities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_reconciliation_id_reconciliations_id_fk` FOREIGN KEY (`reconciliation_id`) REFERENCES `reconciliations`(`id`) ON DELETE no action ON UPDATE no action;