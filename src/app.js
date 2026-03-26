const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const errorHandler = require('./core/middleware/error.middleware');

require('./core/config/db'); // initialise DB connection on startup

const env = require('./core/config/env');

const app = express();

// ── Global Middleware ────────────────────────
app.use(cors({
  origin: env.frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Health Check ─────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Varuna Ops API', timestamp: new Date() });
});

// ── Domain Routes ─────────────────────────── /api/v1/
app.use('/api/v1/auth',          require('./domains/user/auth.routes'));
app.use('/api/v1/users',         require('./domains/user/user.routes'));
app.use('/api/v1/projects',      require('./domains/project/project.routes'));
app.use('/api/v1/pipeline',      require('./domains/pipeline/pipeline.routes'));
app.use('/api/v1/resources',     require('./domains/resource/resource.routes'));
app.use('/api/v1/calendar',      require('./domains/scheduling/calendar.routes'));
app.use('/api/v1/estimations',   require('./domains/estimation/estimation.routes'));
app.use('/api/v1/library',       require('./domains/library/library.routes'));
app.use('/api/v1/notifications', require('./domains/notification/notification.routes'));
app.use('/api/v1/dashboard',     require('./domains/dashboard/dashboard.routes'));
app.use('/api/v1/audit',         require('./domains/audit/audit.routes'));

// ── Static File Serving ───────────────────────
app.use('/uploads', require('express').static(require('path').join(__dirname, '../uploads')));



// ── 404 Handler ───────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global Error Handler ──────────────────────
app.use(errorHandler);

module.exports = app;
