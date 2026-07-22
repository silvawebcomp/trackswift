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
  customer: { select: { id: true, name: true, email: true } },
  progressEvents: {
    where: { customerVisible: true },
    orderBy: [{ eventTime: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, stage: true, location: true, notes: true, eventTime: true }
  }
};

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

async function listForUser(user) {
  return prisma.shipment.findMany({
    where: user.role === 'ADMIN' ? {} : { customerId: user.id },
    include: shipmentInclude,
    orderBy: { updatedAt: 'desc' }
  });
}

async function findAccessible(trackingId, user) {
  const shipment = await prisma.shipment.findUnique({ where: { trackingId }, include: shipmentInclude });
  if (!shipment || (user.role !== 'ADMIN' && shipment.customerId !== user.id)) {
    throw new HttpError(404, 'Shipment not found.');
  }
  return shipment;
}

async function createShipment(admin, data) {
  const customerEmail = String(data.customerEmail || '').trim().toLowerCase();
  const customer = await prisma.user.findUnique({ where: { email: customerEmail } });
  if (!customer || customer.role !== 'CUSTOMER') throw new HttpError(404, 'Customer account not found.');
  for (const field of ['description', 'originCity', 'destinationCity']) {
    if (!String(data[field] || '').trim()) throw new HttpError(400, `${field} is required.`);
  }
  const estimatedDelivery = parseOptionalDate(data.estimatedDelivery, 'estimated delivery date');

  const trackingId = makeTrackingId();
  return prisma.$transaction(async transaction => {
    const shipment = await transaction.shipment.create({
      data: {
        trackingId,
        customerId: customer.id,
        createdById: admin.id,
        description: data.description.trim(),
        originCity: data.originCity.trim(),
        originCountry: String(data.originCountry || 'Italy').trim(),
        destinationCity: data.destinationCity.trim(),
        destinationCountry: String(data.destinationCountry || 'United States').trim(),
        weightKg: data.weightKg == null ? null : data.weightKg,
        dimensions: data.dimensions?.trim() || null,
        currentLocation: data.originCity.trim(),
        estimatedDelivery,
        carrierNotes: data.carrierNotes?.trim() || 'Shipment created.'
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
    return transaction.shipment.findUnique({ where: { id: shipment.id }, include: shipmentInclude });
  });
}

async function updateProgress(admin, trackingId, data) {
  if (!VALID_STAGES.has(data.stage)) throw new HttpError(400, 'Invalid shipment stage.');
  const existing = await prisma.shipment.findUnique({ where: { trackingId }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'Shipment not found.');
  const eventTime = data.eventTime ? new Date(data.eventTime) : new Date();
  if (Number.isNaN(eventTime.getTime())) throw new HttpError(400, 'Invalid event time.');
  const estimatedDelivery = parseOptionalDate(data.estimatedDelivery, 'estimated delivery date');

  return prisma.$transaction(async transaction => {
    const shipment = await transaction.shipment.update({
      where: { trackingId },
      data: {
        currentStage: data.stage,
        currentLocation: data.location?.trim() || undefined,
        carrierNotes: data.notes?.trim() || undefined,
        estimatedDelivery: estimatedDelivery || undefined,
        deliveredAt: data.stage === 'DELIVERED' ? eventTime : undefined
      }
    });
    await transaction.progressEvent.create({
      data: {
        shipmentId: shipment.id,
        stage: data.stage,
        location: data.location?.trim() || shipment.currentLocation,
        notes: data.notes?.trim() || null,
        eventTime,
        customerVisible: data.customerVisible !== false,
        createdById: admin.id
      }
    });
    return transaction.shipment.findUnique({ where: { id: shipment.id }, include: shipmentInclude });
  });
}

module.exports = { createShipment, findAccessible, listForUser, updateProgress, VALID_STAGES };
