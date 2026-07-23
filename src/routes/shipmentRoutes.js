const express = require('express');
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../utils/asyncHandler');
const shipmentService = require('../services/shipmentService');

const router = express.Router();
const trackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});

router.post('/', trackingLimiter, asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    success: true,
    data: { shipment: await shipmentService.findForCustomer(req.body) }
  });
}));

module.exports = router;
