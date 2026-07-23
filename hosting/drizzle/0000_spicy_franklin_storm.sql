CREATE TABLE `progress_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shipment_id` integer NOT NULL,
	`stage` text NOT NULL,
	`location` text,
	`notes` text,
	`event_time` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`customer_visible` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `progress_events_shipment_time_idx` ON `progress_events` (`shipment_id`,`event_time`);--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tracking_id` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_email` text NOT NULL,
	`description` text NOT NULL,
	`origin_city` text NOT NULL,
	`origin_country` text DEFAULT 'Italy' NOT NULL,
	`destination_city` text NOT NULL,
	`destination_country` text DEFAULT 'United States' NOT NULL,
	`weight_kg` real,
	`dimensions` text,
	`current_stage` text DEFAULT 'SHIPMENT_CREATED' NOT NULL,
	`current_location` text,
	`estimated_delivery` text,
	`carrier_notes` text,
	`delivered_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shipments_tracking_id_unique` ON `shipments` (`tracking_id`);--> statement-breakpoint
CREATE INDEX `shipments_customer_email_updated_idx` ON `shipments` (`customer_email`,`updated_at`);--> statement-breakpoint
CREATE INDEX `shipments_stage_updated_idx` ON `shipments` (`current_stage`,`updated_at`);