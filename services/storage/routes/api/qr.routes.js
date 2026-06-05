/**
 * QR Code generation endpoint.
 * Only mounted when CONFIG.SECURITY.ENABLE_QR === true.
 *
 * POST /qr/generate
 * Body: { text, errorCorrectionLevel?, size?, margin? }
 * Generates a QR PNG buffer, uploads it to MinIO under qr/<filename>,
 * and returns the object key + size.
 */
import { Router } from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import minioClient from '../../config/minio.js';
import authorization from '../../middlewares/authorization.js';
import messages from '../../config/messages.js';
import { successMessage, errorMessage } from '../../utils/messages.js';
import logger from '../../utils/logger.js';
import { CONFIG } from '../../config/config.js';
import { isSafeObjectKey } from './upload.routes.js';

const api = Router();
const BUCKET = CONFIG.MINIO.BUCKET;

// QR default params (overridable per-request with sane bounds)
const DEFAULT_ERROR_CORRECTION = 'H';
const DEFAULT_SIZE              = 512;
const DEFAULT_MARGIN            = 4;
const MIN_SIZE                  = 64;
const MAX_SIZE                  = 2048;

/**
 * Clamps a numeric value between min and max.
 */
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

api.post('/generate', [authorization], async (req, res) => {
    try {
        const {
            text,
            errorCorrectionLevel = DEFAULT_ERROR_CORRECTION,
            size                 = DEFAULT_SIZE,
            margin               = DEFAULT_MARGIN,
        } = req.body || {};

        if (!text || typeof text !== 'string' || !text.trim()) {
            return res.status(400).json(errorMessage({
                message: messages.error.qr.text_required,
            }));
        }

        const safeECL    = ['L', 'M', 'Q', 'H'].includes(String(errorCorrectionLevel).toUpperCase())
            ? String(errorCorrectionLevel).toUpperCase()
            : DEFAULT_ERROR_CORRECTION;
        const safeSize   = clamp(parseInt(size)   || DEFAULT_SIZE,   MIN_SIZE, MAX_SIZE);
        const safeMargin = clamp(parseInt(margin)  || DEFAULT_MARGIN, 0, 20);

        logger.info('Generating QR', { textLength: text.length, ecl: safeECL, size: safeSize });

        const qrBuffer = await QRCode.toBuffer(text.trim(), {
            errorCorrectionLevel: safeECL,
            type:    'png',
            width:   safeSize,
            margin:  safeMargin,
            color: {
                dark:  '#000000',
                light: '#FFFFFF',
            },
        });

        const timestamp    = Date.now();
        const randomSuffix = crypto.randomBytes(3).toString('hex');
        const fileName     = `qr/${timestamp}_${randomSuffix}.png`;

        if (!isSafeObjectKey(fileName)) {
            logger.error('Generated QR key is unsafe', { fileName });
            return res.status(500).json(errorMessage({ message: messages.error.qr.error }));
        }

        const metaObj = {
            'Content-Type':    'image/png',
            'X-Upload-Date':   new Date().toISOString(),
            'X-QR-Text':       Buffer.from(text.trim(), 'utf8').toString('base64'),
            'X-File-Category': 'qr-codes',
            'X-File-Type':     'QR',
            'X-File-Size':     qrBuffer.length.toString(),
            'X-Upload-IP':     req.ip || 'unknown',
        };

        await new Promise((resolve, reject) => {
            minioClient.putObject(BUCKET, fileName, qrBuffer, metaObj, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        logger.info('QR uploaded to MinIO', { fileName });

        return res.status(200).json(successMessage({
            message: messages.success.qr,
            extra: {
                data: {
                    fileName,
                    size: qrBuffer.length,
                },
            },
        }));

    } catch (error) {
        logger.error('QR generation failed', { code: error?.code, name: error?.name });
        return res.status(500).json(errorMessage({ message: messages.error.qr.error }));
    }
});

export default api;
