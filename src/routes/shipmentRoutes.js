const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const shipmentService = require('../services/shipmentService');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { shipments: await shipmentService.listForUser(req.user) } });
}));

router.get('/:trackingId', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { shipment: await shipmentService.findAccessible(req.params.trackingId, req.user) } });
}));

module.exports = router;
