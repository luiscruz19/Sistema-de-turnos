import { Router } from 'express';
import uploadRoutes from './api/upload.routes.js';
import { CONFIG } from '../config/config.js';
import logger from '../utils/logger.js';

const api = Router();

api.use('/', uploadRoutes);

// QR routes are optional — only mount when explicitly enabled via env var.
if (CONFIG.SECURITY.ENABLE_QR) {
    const { default: qrRoutes } = await import('./api/qr.routes.js');
    api.use('/qr', qrRoutes);
    logger.info('QR routes enabled at /qr');
} else {
    logger.info('QR routes disabled (STORAGE_ENABLE_QR != true)');
}

export default api;
