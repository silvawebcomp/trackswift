require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./routes/authRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const port = Number(process.env.PORT || 4173);
const root = path.resolve(__dirname, '..');

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',').map(value => value.trim()) || false }));
app.use(express.json({ limit: '100kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (_req, res) => res.json({ success: true, service: 'trackswift-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/tracking', shipmentRoutes);
app.use('/api/admin', adminRoutes);
app.use(express.static(path.join(root, 'public'), { index: 'index.html', extensions: ['html'] }));
app.use('/api', (_req, res) => res.status(404).json({ success: false, message: 'API route not found.' }));
app.use(errorHandler);

app.listen(port, () => console.log(`TrackSwift running on http://localhost:${port}`));
