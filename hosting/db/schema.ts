import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const shipments = sqliteTable(
  "shipments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    trackingId: text("tracking_id").notNull().unique(),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    description: text("description").notNull(),
    originCity: text("origin_city").notNull(),
    originCountry: text("origin_country").notNull().default("Italy"),
    destinationCity: text("destination_city").notNull(),
    destinationCountry: text("destination_country")
      .notNull()
      .default("United States"),
    weightKg: real("weight_kg"),
    dimensions: text("dimensions"),
    currentStage: text("current_stage").notNull().default("SHIPMENT_CREATED"),
    currentLocation: text("current_location"),
    estimatedDelivery: text("estimated_delivery"),
    carrierNotes: text("carrier_notes"),
    deliveredAt: text("delivered_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("shipments_customer_email_updated_idx").on(
      table.customerEmail,
      table.updatedAt,
    ),
    index("shipments_stage_updated_idx").on(
      table.currentStage,
      table.updatedAt,
    ),
  ],
);

export const progressEvents = sqliteTable(
  "progress_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    shipmentId: integer("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(),
    location: text("location"),
    notes: text("notes"),
    eventTime: text("event_time").notNull().default(sql`CURRENT_TIMESTAMP`),
    customerVisible: integer("customer_visible", { mode: "boolean" })
      .notNull()
      .default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("progress_events_shipment_time_idx").on(
      table.shipmentId,
      table.eventTime,
    ),
  ],
);
