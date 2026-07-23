import { ApiError } from "./http";

export const STAGES = [
  "SHIPMENT_CREATED",
  "PROCESSING_IN_ITALY",
  "PACKAGE_PICKED_UP",
  "DEPARTED_ORIGIN_FACILITY",
  "INTERNATIONAL_TRANSIT",
  "CUSTOMS_CLEARANCE",
  "ARRIVED_IN_UNITED_STATES",
  "LOCAL_DISTRIBUTION_FACILITY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

export type ShipmentStage = (typeof STAGES)[number];

interface ShipmentRow {
  id: number;
  tracking_id: string;
  customer_name: string;
  customer_email: string;
  description: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  weight_kg: number | null;
  dimensions: string | null;
  current_stage: ShipmentStage;
  current_location: string | null;
  estimated_delivery: string | null;
  carrier_notes: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ProgressRow {
  id: number;
  shipment_id: number;
  stage: ShipmentStage;
  location: string | null;
  notes: string | null;
  event_time: string;
  customer_visible: number;
  created_at: string;
}

function isoDate(value: string | null) {
  if (!value) return null;
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function shipment(row: ShipmentRow) {
  return {
    id: String(row.id),
    trackingId: row.tracking_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    description: row.description,
    originCity: row.origin_city,
    originCountry: row.origin_country,
    destinationCity: row.destination_city,
    destinationCountry: row.destination_country,
    weightKg: row.weight_kg,
    dimensions: row.dimensions,
    currentStage: row.current_stage,
    currentLocation: row.current_location,
    estimatedDelivery: isoDate(row.estimated_delivery),
    carrierNotes: row.carrier_notes,
    deliveredAt: isoDate(row.delivered_at),
    createdAt: isoDate(row.created_at),
    updatedAt: isoDate(row.updated_at),
  };
}

function progressEvent(row: ProgressRow) {
  return {
    id: String(row.id),
    stage: row.stage,
    location: row.location,
    notes: row.notes,
    eventTime: isoDate(row.event_time),
    customerVisible: Boolean(row.customer_visible),
    createdAt: isoDate(row.created_at),
  };
}

export function normalizedTrackingId(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

export function normalizedEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function optionalText(value: unknown) {
  const text = String(value || "").trim();
  return text || null;
}

export function optionalDate(value: unknown) {
  if (value == null || value === "") return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "Estimated delivery must be a valid date.");
  }
  return date.toISOString();
}

export function generateTrackingId() {
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `TSW-${date}-${random}`;
}

export async function findShipment(
  database: D1Database,
  trackingId: string,
  customerEmail?: string,
) {
  const query = customerEmail
    ? database
        .prepare(
          "SELECT * FROM shipments WHERE tracking_id = ? AND customer_email = ? LIMIT 1",
        )
        .bind(trackingId, customerEmail)
    : database
        .prepare("SELECT * FROM shipments WHERE tracking_id = ? LIMIT 1")
        .bind(trackingId);
  return query.first<ShipmentRow>();
}

export async function shipmentWithEvents(
  database: D1Database,
  row: ShipmentRow,
  customerOnly = false,
) {
  const query = customerOnly
    ? database
        .prepare(
          "SELECT * FROM progress_events WHERE shipment_id = ? AND customer_visible = 1 ORDER BY event_time ASC, id ASC",
        )
        .bind(row.id)
    : database
        .prepare(
          "SELECT * FROM progress_events WHERE shipment_id = ? ORDER BY event_time ASC, id ASC",
        )
        .bind(row.id);
  const events = await query.all<ProgressRow>();
  return {
    ...shipment(row),
    progressEvents: events.results.map(progressEvent),
  };
}

export async function listShipments(database: D1Database) {
  const rows = await database
    .prepare("SELECT * FROM shipments ORDER BY updated_at DESC, id DESC LIMIT 500")
    .all<ShipmentRow>();
  return rows.results.map(shipment);
}

export async function createShipment(
  database: D1Database,
  input: Record<string, unknown>,
) {
  const trackingId =
    normalizedTrackingId(input.trackingId) || generateTrackingId();
  const customerName = optionalText(input.customerName);
  const customerEmail = normalizedEmail(input.customerEmail);
  const description = optionalText(input.description);
  const originCity = optionalText(input.originCity);
  const originCountry = optionalText(input.originCountry) || "Italy";
  const destinationCity = optionalText(input.destinationCity);
  const destinationCountry =
    optionalText(input.destinationCountry) || "United States";

  if (
    !customerName ||
    !customerEmail ||
    !customerEmail.includes("@") ||
    !description ||
    !originCity ||
    !destinationCity
  ) {
    throw new ApiError(
      400,
      "Customer, email, package, origin, and destination details are required.",
    );
  }

  const weightValue =
    input.weightKg == null || input.weightKg === ""
      ? null
      : Number(input.weightKg);
  if (weightValue != null && (!Number.isFinite(weightValue) || weightValue < 0)) {
    throw new ApiError(400, "Weight must be a valid positive number.");
  }

  const now = new Date().toISOString();
  const estimatedDelivery = optionalDate(input.estimatedDelivery);
  const carrierNotes = optionalText(input.carrierNotes);

  if (await findShipment(database, trackingId)) {
    throw new ApiError(409, "That tracking number is already registered.");
  }

  try {
    await database.batch([
      database
        .prepare(
          `INSERT INTO shipments (
            tracking_id, customer_name, customer_email, description,
            origin_city, origin_country, destination_city, destination_country,
            weight_kg, dimensions, current_stage, current_location,
            estimated_delivery, carrier_notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SHIPMENT_CREATED', ?, ?, ?, ?, ?)`,
        )
        .bind(
          trackingId,
          customerName,
          customerEmail,
          description,
          originCity,
          originCountry,
          destinationCity,
          destinationCountry,
          weightValue,
          optionalText(input.dimensions),
          `${originCity}, ${originCountry}`,
          estimatedDelivery,
          carrierNotes,
          now,
          now,
        ),
      database
        .prepare(
          `INSERT INTO progress_events (
            shipment_id, stage, location, notes, event_time, customer_visible, created_at
          ) SELECT id, 'SHIPMENT_CREATED', ?, ?, ?, 1, ?
            FROM shipments WHERE tracking_id = ?`,
        )
        .bind(
          `${originCity}, ${originCountry}`,
          carrierNotes || "Shipment registered with TrackSwift.",
          now,
          now,
          trackingId,
        ),
    ]);
  } catch (error) {
    if (String(error).includes("UNIQUE")) {
      throw new ApiError(409, "That tracking number is already registered.");
    }
    throw error;
  }

  const row = await findShipment(database, trackingId);
  if (!row) throw new Error("New shipment could not be read.");
  return shipmentWithEvents(database, row);
}

export async function updateShipmentProgress(
  database: D1Database,
  trackingId: string,
  input: Record<string, unknown>,
) {
  const stage = normalizedTrackingId(input.stage) as ShipmentStage;
  if (!STAGES.includes(stage)) {
    throw new ApiError(400, "Choose a valid shipment progress stage.");
  }

  const current = await findShipment(database, trackingId);
  if (!current) throw new ApiError(404, "Shipment not found.");

  const location = optionalText(input.location);
  const notes = optionalText(input.notes);
  const estimatedDelivery = optionalDate(input.estimatedDelivery);
  const now = new Date().toISOString();
  const deliveredAt =
    stage === "DELIVERED" ? current.delivered_at || now : null;

  await database.batch([
    database
      .prepare(
        `UPDATE shipments
         SET current_stage = ?, current_location = ?, carrier_notes = ?,
             estimated_delivery = ?, delivered_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        stage,
        location,
        notes,
        estimatedDelivery,
        deliveredAt,
        now,
        current.id,
      ),
    database
      .prepare(
        `INSERT INTO progress_events (
          shipment_id, stage, location, notes, event_time, customer_visible, created_at
        ) VALUES (?, ?, ?, ?, ?, 1, ?)`,
      )
      .bind(current.id, stage, location, notes, now, now),
  ]);

  const row = await findShipment(database, trackingId);
  if (!row) throw new Error("Updated shipment could not be read.");
  return shipmentWithEvents(database, row);
}
