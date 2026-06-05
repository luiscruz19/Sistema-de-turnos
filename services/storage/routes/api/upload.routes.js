import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import minioClient from '../../config/minio.js';
import authorization from '../../middlewares/authorization.js';
import { uploadRateLimit } from '../../middlewares/security.js';
import messages from '../../config/messages.js';
import { successMessage, errorMessage } from '../../utils/messages.js';
import logger from '../../utils/logger.js';
import { CONFIG } from '../../config/config.js';

const api = Router();
const BUCKET = CONFIG.MINIO.BUCKET;
const MAX_SIZE = (CONFIG.UPLOAD.MAX_SIZE_MB || 500) * 1024 * 1024;

// ==================== TIPOS BLOQUEADOS (base + overrides por env) ====================
const BLOCKED_MIME = new Set([
    'text/html', 'application/javascript', 'text/javascript',
    'application/x-javascript', 'application/x-sh', 'application/x-bat',
    'application/x-msdownload', 'application/x-dosexec', 'application/x-httpd-php',
]);
const BLOCKED_EXT = new Set([
    'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'js', 'mjs', 'cjs',
    'html', 'htm', 'dll', 'msi',
]);

CONFIG.SECURITY.BLOCKED_MIME_TYPES.forEach(m => BLOCKED_MIME.add(m.trim()));
CONFIG.SECURITY.BLOCKED_EXTENSIONS.forEach(e => {
    const ext = e.trim().replace(/^\./, '');
    if (ext) BLOCKED_EXT.add(ext);
});

// ==================== HELPERS DE SEGURIDAD ====================
/**
 * Valida la clave del objeto antes de cualquier operación en MinIO.
 * Permite alfanuméricos, punto, guion, guion bajo y barra (para rutas).
 * Rechaza secuencias de path-traversal.
 */
export function isSafeObjectKey(value) {
    return typeof value === 'string'
        && value.length > 0
        && value.length <= 200
        && /^[a-zA-Z0-9._\-/]+$/.test(value)
        && !value.includes('..');
}

/**
 * Sanitiza un nombre de archivo para la cabecera Content-Disposition.
 */
export function sanitizeDownloadFileName(fileName) {
    const base = String(fileName || '').replace(/[\r\n]/g, '');
    return path.basename(base).replace(/[^a-zA-Z0-9._ -]/g, '_') || 'download';
}

// ==================== MULTER ====================
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_SIZE },
});

// ==================== DETECCIÓN DE TIPO ====================
/**
 * Detecta extensión y MIME a partir de los magic bytes (file-type).
 * Si no se reconoce, cae al MIME declarado o a octet-stream.
 */
async function detectFileType(buffer, originalMimetype, originalName) {
    try {
        const result = await fileTypeFromBuffer(buffer);
        if (result) {
            return { ext: result.ext, mime: result.mime };
        }
    } catch (e) {
        logger.warn('file-type detection failed', { reason: String(e?.message || e) });
    }

    const ext = String(originalName || '').split('.').pop()?.toLowerCase();
    return {
        ext: ext && ext.length <= 5 ? ext : 'bin',
        mime: originalMimetype || 'application/octet-stream',
    };
}

// ==================== HELPERS MINIO ====================
function putObject(bucket, key, buffer, metaObj) {
    return new Promise((resolve, reject) => {
        minioClient.putObject(bucket, key, buffer, metaObj, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

function statObject(bucket, key) {
    return new Promise((resolve, reject) => {
        minioClient.statObject(bucket, key, (err, stat) => {
            if (err) reject(err);
            else resolve(stat);
        });
    });
}

// ==================== POST /upload ====================
api.post('/upload', [uploadRateLimit, authorization], upload.single('file'), async (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).json(errorMessage({ message: messages.error.upload.fields_empty.file }));
    }

    const timestamp    = Date.now();
    const randomSuffix = crypto.randomBytes(3).toString('hex');
    const baseKey      = `${timestamp}_${randomSuffix}`;

    try {
        const detected = await detectFileType(file.buffer, file.mimetype, file.originalname);
        const origExt  = String(file.originalname || '').split('.').pop()?.toLowerCase() || '';

        // --- Validación de tipo de archivo ---
        if (
            BLOCKED_MIME.has(detected.mime) ||
            BLOCKED_EXT.has(detected.ext)   ||
            BLOCKED_EXT.has(origExt)
        ) {
            return res.status(400).json(errorMessage({
                message: messages.error.upload.invalid_format.replace('{formats}', 'tipo de archivo no permitido por seguridad'),
            }));
        }

        logger.info('File received', {
            originalname: file.originalname,
            size: file.size,
            mime: detected.mime,
        });

        const finalKey = `${baseKey}.${detected.ext}`;
        const metaObj = {
            'Content-Type':    detected.mime,
            'X-Upload-Date':   new Date().toISOString(),
            'X-Original-Name': Buffer.from(file.originalname || 'unknown').toString('base64'),
            'X-Original-Mime': file.mimetype,
            'X-Detected-Mime': detected.mime,
            'X-Original-Size': file.size.toString(),
            'X-Upload-IP':     req.ip || 'unknown',
        };

        const uploadResult = await putObject(BUCKET, finalKey, file.buffer, metaObj);

        logger.info('File stored', { finalKey });

        return res.status(200).json(successMessage({
            message: messages.success.upload,
            extra: {
                fileName:     finalKey,
                baseFileName: baseKey,
                fileSize:     file.size,
                mimeType:     detected.mime,
                etag: {
                    etag:      uploadResult?.etag      || uploadResult,
                    versionId: uploadResult?.versionId || null,
                },
                uploadDate:   new Date().toISOString(),
            },
        }));

    } catch (error) {
        logger.error('Upload failed', { code: error?.code, name: error?.name });
        return res.status(500).json(errorMessage({ message: messages.error.upload.processing_error }));
    }
});

// ==================== GET /:fileName ====================
api.get('/:fileName', async (req, res) => {
    const { fileName } = req.params;
    const { download } = req.query;

    if (!isSafeObjectKey(fileName)) {
        return res.status(400).json(errorMessage({ message: messages.error.get.invalid_key }));
    }

    try {
        const stat = await statObject(BUCKET, fileName);

        const contentType   = stat.metaData?.['content-type'] || 'application/octet-stream';
        const isPublicImage = contentType.startsWith('image/');

        res.set({
            'Cache-Control':  isPublicImage ? 'public, max-age=31536000, immutable' : 'private, no-store',
            'ETag':           stat.etag,
            'Last-Modified':  stat.lastModified,
            'Content-Length': stat.size,
            'Content-Type':   contentType,
        });

        if (download === 'true') {
            const rawName = stat.metaData?.['x-original-name']
                ? Buffer.from(stat.metaData['x-original-name'], 'base64').toString('utf8')
                : fileName;
            const safeName = sanitizeDownloadFileName(rawName);
            res.set('Content-Disposition', `attachment; filename="${safeName}"`);
        }

        // Soporte de GET condicional.
        if (req.headers['if-none-match'] === stat.etag) {
            return res.status(304).end();
        }

        minioClient.getObject(BUCKET, fileName, (err, dataStream) => {
            if (err) {
                logger.error('MinIO getObject failed', { key: fileName, code: err?.code });
                return res.status(404).json(errorMessage({ message: messages.error.get.not_found }));
            }
            dataStream.on('error', (streamErr) => {
                logger.error('Stream error', { key: fileName, code: streamErr?.code });
                if (!res.headersSent) {
                    res.status(500).json(errorMessage({ message: messages.error.get.error }));
                }
            });
            dataStream.pipe(res);
        });

    } catch (error) {
        logger.error('StatObject failed', { key: fileName, code: error?.code });
        return res.status(404).json(errorMessage({ message: messages.error.get.not_found }));
    }
});

// ==================== DELETE /:fileName ====================
api.delete('/:fileName', [authorization], async (req, res) => {
    const { fileName } = req.params;

    if (!isSafeObjectKey(fileName)) {
        return res.status(400).json(errorMessage({ message: messages.error.delete.invalid_key }));
    }

    try {
        await new Promise((resolve, reject) => {
            minioClient.removeObject(BUCKET, fileName, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        logger.info('File deleted', { fileName });

        return res.status(200).json(successMessage({ message: messages.success.delete }));

    } catch (error) {
        logger.error('Delete failed', { fileName, code: error?.code });
        return res.status(500).json(errorMessage({ message: messages.error.delete.error }));
    }
});

export default api;
