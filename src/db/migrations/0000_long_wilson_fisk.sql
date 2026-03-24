CREATE TABLE `assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`category_id` integer,
	`current_value` real DEFAULT 0 NOT NULL,
	`monthly_income` real DEFAULT 0,
	`annual_yield` real DEFAULT 0,
	`income_frequency` text,
	`income_day` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`note` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`parent_id` integer,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `liabilities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`category_id` integer,
	`total_principal` real NOT NULL,
	`remaining_principal` real NOT NULL,
	`annual_rate` real DEFAULT 0 NOT NULL,
	`monthly_payment` real DEFAULT 0 NOT NULL,
	`payment_day` integer,
	`start_date` integer,
	`end_date` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`note` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `monthly_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`month` text NOT NULL,
	`total_assets` real DEFAULT 0 NOT NULL,
	`total_liabilities` real DEFAULT 0 NOT NULL,
	`net_worth` real DEFAULT 0 NOT NULL,
	`monthly_cash_flow` real DEFAULT 0 NOT NULL,
	`asset_breakdown` text,
	`liability_breakdown` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `reconciliations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer,
	`liability_id` integer,
	`expected_balance` real NOT NULL,
	`actual_balance` real NOT NULL,
	`difference` real NOT NULL,
	`reconciliation_date` integer NOT NULL,
	`transaction_id` integer,
	`note` text,
	`created_at` integer,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`liability_id`) REFERENCES `liabilities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`category_id` integer,
	`asset_id` integer,
	`liability_id` integer,
	`amount` real NOT NULL,
	`principal_part` real DEFAULT 0,
	`interest_part` real DEFAULT 0,
	`description` text NOT NULL,
	`transaction_date` integer NOT NULL,
	`is_auto_generated` integer DEFAULT false NOT NULL,
	`reconciliation_id` integer,
	`note` text,
	`created_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`liability_id`) REFERENCES `liabilities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reconciliation_id`) REFERENCES `reconciliations`(`id`) ON UPDATE no action ON DELETE no action
);
