const crypto = require('crypto');
const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');

const VALID_STAGES = new Set([
  'SHIPMENT_CREATED', 'PROCESSING_IN_ITALY', 'PACKAGE_PICKED_UP',
  'DEPARTED_ORIGIN_FACILITY', 'INTERNATIONAL_TRANSIT', 'CUSTOMS_CLEARANCE',
  'ARRIVED_IN_UNITED_STATES', 'LOCAL_DISTRIBUTION_FACILITY',
  'OUT_FOR_DELIVERY', 'DELIVERED'
]);

const shipmentInclude = {
  progressEvents: {
    where: { customerVisible: true },
    orderBy: [{ eventTime: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      stage: true,
      location: true,
      notes: true,
      eventTime: true
    }
  }
};

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeTrackingId(value) {
  return String(value || '').trim().toUpperCase();
}

function validateEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'Enter a valid email address.');
  }
}

function makeTrackingId() {
  const day = new Date().toISOString().slice(2, 10).replaceAll('-', '');
  return `TS-${day}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function parseOptionalDate(value, label) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, `Invalid ${label}.`);
  return date;
}

function parseOptionalWeight(value) {
  if (value === '' || value == null) return null;
  const weight = Number(value);
  if (!Number.isFinite(weight) || weight <= 0 || weight > 100000) {
    throw new HttpError(400, 'Weight must be a positive number.');
  }
  return weight;
}

function customerShipment(shipment) {
  return {
    trackingId: shipment.trackingId,
    customerName: shipment.customerName,
    description: shipment.description,
    originCity: shipment.originCity,
    originCountry: shipment.originCountry,
    destinationCity: shipment.destinationCity,
    destinationCountry: shipment.destinationCountry,
    weightKg: shipment.weightKg,
    dimensions: shipment.dimensions,
    currentStage: shipment.currentStage,
    currentLocation: shipment.currentLocation,
    estimatedDelivery: shipment.estimatedDelivery,
    carrierNotes: shipment.carrierNotes,
    deliveredAt: shipment.deliveredAt,
    createdAt: shipment.createdAt,
    updatedAt: shipment.updatedAt,
    progressEvents: shipment.progressEvents
  };
}

async function findForCustomer(data = {}) {
  const trackingId = normalizeTrackingId(data.trackingId);
  const email = normalizeEmail(data.email);
  if (!trackingId || !email) {
    throw new HttpError(400, 'Enter your tracking number and email address.');
  }
  validateEmail(email);

  const shipment = await prisma.shipment.findUnique({
    where: { trackingId },
    include: shipmentInclude
  });

  if (!shipment || normalizeEmail(shipment.customerEmail) !== email) {
    throw new HttpError(
      404,
      'We could not match that tracking number and email. Check both entries and try again.'
    );
  }

  return customerShipment(shipment);
}

async function listForAdmin() {
  return prisma.shipment.findMany({
    include: shipmentInclude,
    orderBy: { updatedAt: 'desc' }
  });
}

async function createShipment(admin, data = {}) {
  const customerName = String(data.customerName || '').trim();
  const customerEmail = normalizeEmail(data.customerEmail);
  const description = String(data.description || '').trim();
  const originCity = String(data.originCity || '').trim();
  const destinationCity = String(data.destinationCity || '').trim();

  if (customerName.length < 2) throw new HttpError(400, 'Customer name is required.');
  validateEmail(customerEmail);
  for (const [label, value] of [
    ['Description', description],
    ['Origin city', originCity],
    ['Destination city', destinationCity]
  ]) {
    if (!value) throw new HttpError(400, `${label} is required.`);
  }

  const requestedTrackingId = normalizeTrackingId(data.trackingId);
  if (requestedTrackingId && !/^[A-Z0-9-]{6,40}$/.test(requestedTrackingId)) {
    throw new HttpError(400, 'Tracking number must contain 6–40 letters, numbers, or hyphens.');
  }
  const trackingId = requestedTrackingId || makeTrackingId();
  const existing = await prisma.shipment.findUnique({
    where: { trackingId },
    select: { id: true }
  });
  if (existing) throw new HttpError(409, 'That tracking number is already in use.');

  const estimatedDelivery = parseOptionalDate(
    data.estimatedDelivery,
    'estimated delivery date'
  );
  const weightKg = parseOptionalWeight(data.weightKg);
  const carrierNotes = String(data.carrierNotes || '').trim() || 'Shipment registered.';

  return prisma.$transaction(async transaction => {
    const shipment = await transaction.shipment.create({
      data: {
        trackingId,
        customerName,
        customerEmail,
        createdById: admin.id,
        description,
        originCity,
        originCountry: String(data.originCountry || 'Italy').trim(),
        destinationCity,
        destinationCountry: String(data.destinationCountry || 'United States').trim(),
        weightKg,
        dimensions: String(data.dimensions || '').trim() || null,
        currentLocation: originCity,
        estimatedDelivery,
        carrierNotes
      }
    });

    await transaction.progressEvent.create({
      data: {
        shipmentId: shipment.id,
        stage: 'SHIPMENT_CREATED',
        location: shipment.originCity,
        notes: shipment.carrierNotes,
        createdById: admin.id
      }
    });

    return transaction.shipment.findUnique({
      where: { id: shipment.id },
      include: shipmentInclude
    });
  });
}

async function updateProgress(admin, trackingIdValue, data = {}) {
  const trackingId = normalizeTrackingId(trackingIdValue);
  if (!VALID_STAGES.has(data.stage)) throw new HttpError(400, 'Invalid shipment stage.');

  const existing = await prisma.shipment.findUnique({
    where: { trackingId },
    select: { id: true }
  });
  if (!existing) throw new HttpError(404, 'Shipment not found.');

  const eventTime = data.eventTime ? new Date(data.eventTime) : new Date();
  if (Number.isNaN(eventTime.getTime())) throw new HttpError(400, 'Invalid event time.');
  const estimatedDelivery = parseOptionalDate(
    data.estimatedDelivery,
    'estimated delivery date'
  );
  const location = String(data.location || '').trim();
  const notes = String(data.notes || '').trim();

  return prisma.$transaction(async transaction => {
    const shipment = await transaction.shipment.update({
      where: { trackingId },
      data: {
        currentStage: data.stage,
        currentLocation: location || undefined,
        carrierNotes: notes || undefined,
        estimatedDelivery: estimatedDelivery || undefined,
        deliveredAt: data.stage === 'DELIVERED' ? eventTime : null
      }
    });

    await transaction.progressEvent.create({
      data: {
        shipmentId: shipment.id,
        stage: data.stage,
        location: location || shipment.currentLocation,
        notes: notes || null,
        eventTime,
        customerVisible: data.customerVisible !== false,
        createdById: admin.id
      }
    });

    return transaction.shipment.findUnique({
      where: { id: shipment.id },
      include: shipmentInclude
    });
  });
}

module.exports = {
  VALID_STAGES,
  createShipment,
  findForCustomer,
  listForAdmin,
  updateProgress
};
