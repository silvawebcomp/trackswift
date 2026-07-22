const express = require('express');
const rateLimit = require('express-rate-limit');
const authService = require('../services/authService');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });

router.post('/register', authLimiter, asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await authService.register(req.body) });
}));

router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  res.json({ success: true, data: await authService.login(req.body) });
}));

router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

module.exports = router;
