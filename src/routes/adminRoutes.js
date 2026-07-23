const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAdmin, requireAuth } = require('../middleware/auth');
const shipmentService = require('../services/shipmentService');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/shipments', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { shipments: await shipmentService.listForAdmin() } });
}));

router.post('/shipments', asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: { shipment: await shipmentService.createShipment(req.admin, req.body) } });
}));

router.patch('/shipments/:trackingId/progress', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { shipment: await shipmentService.updateProgress(req.admin, req.params.trackingId, req.body) } });
}));

module.exports = router;
