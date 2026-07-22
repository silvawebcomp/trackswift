const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { requireAdmin, requireAuth } = require('../middleware/auth');
const shipmentService = require('../services/shipmentService');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/customers', asyncHandler(async (_req, res) => {
  const customers = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    select: { id: true, name: true, email: true, createdAt: true, _count: { select: { shipments: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: { customers } });
}));

router.get('/shipments', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { shipments: await shipmentService.listForUser(req.user) } });
}));

router.post('/shipments', asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: { shipment: await shipmentService.createShipment(req.user, req.body) } });
}));

router.patch('/shipments/:trackingId/progress', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { shipment: await shipmentService.updateProgress(req.user, req.params.trackingId, req.body) } });
}));

module.exports = router;
