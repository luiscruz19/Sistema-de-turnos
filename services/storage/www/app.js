import express from 'express';

import { CONFIG } from '../config/config.js';
import routes from '../routes/index.js';
import Debug from '../middlewares/debug.js';
import { applySecurity } from '../middlewares/security.js';
import requestId from '../middlewares/request-id.js';
import requestLogger from '../middlewares/request-logger.js';
import logger from '../utils/logger.js';

const { INITIAL_ROUTE, NODE_ENV } = CONFIG.APP;
const isProduction = NODE_ENV === 'production';

const app = express();

// Attach a unique request ID to every incoming request.
app.use(requestId);
app.use(requestLogger);

// Trust first proxy — required for correct req.ip behind Docker/nginx/load-balancers
// and for express-rate-limit to work with X-Forwarded-For.
app.set('trust proxy', 1);

// Parse JSON bodies (capped at 1 MB — file uploads use multipart, not JSON).
app.use(express.json({ limit: '1mb' }));

// Security headers + CORS (helmet@8 + cors).
applySecurity(app);

// URL-encoded form bodies.
app.use(express.urlencoded({ extended: true, limit: '1mb', parameterLimit: 50_000 }));

// Verbose request/response logging in non-production environments.
if (!isProduction) app.use(Debug);

// Health endpoint — BEFORE Authorization so monitoring probes work without credentials.
app.get('/health', async (_req, res) => {
    try {
        const minioClient = (await import('../config/minio.js')).default;
        const { CONFIG } = await import('../config/config.js');
        await minioClient.bucketExists(CONFIG.MINIO.BUCKET);
        res.json({ status: 'ok', service: 'storage', uptime: process.uptime() });
    } catch {
        res.status(503).json({ status: 'degraded', service: 'storage', message: 'MinIO not reachable' });
    }
});

// Routes — POST /upload and DELETE /:fileName apply Authorization individually.
// GET /:fileName is intentionally public (file serving requires no credentials).
app.use(INITIAL_ROUTE, routes);

// Global error handler — catches any error passed via next(err).
app.use((err, req, res, _next) => {
    logger.error('unhandled_error', { requestId: req.id, path: req.path, message: err.message });
    res.status(err.status || 500).json({ status: 0, message: 'Error interno del servidor', requestId: req.id });
});

export default app;
