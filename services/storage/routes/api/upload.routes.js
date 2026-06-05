import { Router } from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import minioClient from '../../config/minio.js';
import authorization from '../../middlewares/authorization.js';
import { uploadRateLimit } from '../../middlewares/security.js';
import messages from '../../config/messages.js';
import { successMessage, errorMessage } from '../../utils/messages.js';
import logger from '../../utils/logger.js';
import { CONFIG } from '../../config/config.js';

const execAsync = promisify(exec);
const api = Router();

// ==================== RUNTIME CONFIG (from centralised CONFIG) ====================
const OUTPUT_FORMAT  = CONFIG.UPLOAD.OUTPUT_FORMAT;
const MAX_WIDTH      = CONFIG.UPLOAD.MAX_WIDTH;
const QUALITY        = CONFIG.UPLOAD.QUALITY;
const EFFORT         = 4;
const THUMB_W        = CONFIG.UPLOAD.THUMBNAIL_WIDTH;
const THUMB_H        = CONFIG.UPLOAD.THUMBNAIL_HEIGHT;
const THUMB_QUALITY  = Math.max(40, Math.floor(QUALITY * 0.6));
const BUCKET         = CONFIG.MINIO.BUCKET;

const SIZE_LIMITS = {
    images:    10  * 1024 * 1024,
    documents: 25  * 1024 * 1024,
    videos:    (CONFIG.UPLOAD.MAX_SIZE_MB || 500) * 1024 * 1024,
    audio:     50  * 1024 * 1024,
    archives:  100 * 1024 * 1024,
    generic:   50  * 1024 * 1024,
};

// ==================== BLOCKED TYPES (base + env overrides) ====================
const BASE_BLOCKED_MIME = new Set([
    'text/html', 'application/javascript', 'text/javascript',
    'application/x-javascript', 'application/x-sh', 'application/x-bat',
    'application/x-msdownload', 'application/x-dosexec', 'application/x-httpd-php',
]);
const BASE_BLOCKED_EXT = new Set([
    'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'js', 'mjs', 'cjs',
    'html', 'htm', 'dll', 'msi',
]);

CONFIG.SECURITY.BLOCKED_MIME_TYPES.forEach(m => BASE_BLOCKED_MIME.add(m.trim()));
CONFIG.SECURITY.BLOCKED_EXTENSIONS.forEach(e => {
    const ext = e.trim().replace(/^\./, '');
    if (ext) BASE_BLOCKED_EXT.add(ext);
});

// ==================== ANTIVIRUS ====================
let hasClamScanBinary = null;

function isScannerMissingError(error) {
    return error?.code === 127
        || error?.code === 'ENOENT'
        || String(error?.message || '').toLowerCase().includes('not found')
        || String(error?.stderr || '').toLowerCase().includes('not found');
}

async function runOptionalAntivirusScan(buffer, baseKey) {
    if (!CONFIG.SECURITY.AV_SCAN) return;

    const failClosed = CONFIG.SECURITY.AV_FAIL_CLOSED;
    const tempFile = `/tmp/${baseKey}_scan.bin`;

    try {
        if (hasClamScanBinary === null) {
            try {
                await execAsync('command -v clamscan');
                hasClamScanBinary = true;
            } catch {
                hasClamScanBinary = false;
            }
        }

        if (!hasClamScanBinary) {
            logger.warn('clamscan binary not found — skipping antivirus scan');
            return;
        }

        await fs.writeFile(tempFile, buffer);
        await execAsync(`clamscan --no-summary "${tempFile}"`);
    } catch (error) {
        if (Number(error?.code) === 1) {
            throw new Error('ANTIVIRUS_INFECTED');
        }
        if (isScannerMissingError(error)) {
            hasClamScanBinary = false;
            logger.warn('Antivirus infrastructure error — skipping scan');
            return;
        }
        if (failClosed) throw new Error('ANTIVIRUS_SCAN_FAILED');
    } finally {
        await fs.unlink(tempFile).catch(() => {});
    }
}

// ==================== SECURITY HELPERS ====================
/**
 * Validates an object key before any MinIO operation.
 * Allows alphanumeric, dot, hyphen, underscore and forward slash (for paths).
 * Rejects path-traversal sequences.
 */
export function isSafeObjectKey(value) {
    return typeof value === 'string'
        && value.length > 0
        && value.length <= 200
        && /^[a-zA-Z0-9._\-/]+$/.test(value)
        && !value.includes('..');
}

/**
 * Sanitises a filename for use in Content-Disposition headers.
 */
export function sanitizeDownloadFileName(fileName) {
    const base = String(fileName || '').replace(/[\r\n]/g, '');
    return path.basename(base).replace(/[^a-zA-Z0-9._ -]/g, '_') || 'download';
}

// ==================== MULTER SETUP ====================
// Cheap whitelist BEFORE reading the full buffer (multer fileFilter).
const MULTER_ALLOWED_MIME_PREFIX = [
    'image/', 'video/', 'audio/',
    'application/pdf',
    'application/zip', 'application/x-zip-compressed',
    'application/octet-stream', // HEIC, EMF, WMF often arrive as octet-stream
];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: (CONFIG.UPLOAD.MAX_SIZE_MB || 500) * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const mime = file.mimetype || '';
        const allowed = MULTER_ALLOWED_MIME_PREFIX.some(p => mime.startsWith(p));
        if (!allowed && BASE_BLOCKED_MIME.has(mime)) {
            return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
        }
        cb(null, true);
    },
});

// ==================== FILE-TYPE DETECTION ====================
async function detectFileType(buffer, originalMimetype, originalName) {
    let detected = {
        category: 'generic',
        ext: 'bin',
        mime: 'application/octet-stream',
        kind: 'UNKNOWN',
        isImage: false,
        isVectorImage: false,
    };

    // Layer 1: file-type library (magic bytes)
    try {
        const result = await fileTypeFromBuffer(buffer);
        if (result) {
            const { ext, mime } = result;
            detected.ext  = ext;
            detected.mime  = mime;
            detected.kind  = ext.toUpperCase();
            if (mime.startsWith('image/')) {
                detected.category = 'images';
                detected.isImage  = true;
            } else if (mime.startsWith('video/')) {
                detected.category = 'videos';
            } else if (mime.startsWith('audio/')) {
                detected.category = 'audio';
            } else if (mime === 'application/pdf') {
                detected.category = 'documents';
            } else if (mime.includes('zip') || mime.includes('compressed') || mime.includes('tar')) {
                detected.category = 'archives';
            }
            return detected;
        }
    } catch (e) {
        logger.warn('file-type detection failed', { reason: String(e?.message || e) });
    }

    // Layer 2: manual byte signatures for edge cases
    if (buffer && buffer.length >= 8) {
        const header = buffer.slice(0, 16).toString('hex').toLowerCase();
        if (header.startsWith('01000000')) {
            return { category: 'images', ext: 'emf', mime: 'image/emf', kind: 'EMF', isImage: true, isVectorImage: true };
        }
        if (header.startsWith('d7cdc69a') || header.startsWith('01000900')) {
            return { category: 'images', ext: 'wmf', mime: 'image/wmf', kind: 'WMF', isImage: true, isVectorImage: true };
        }
    }

    // Layer 3: fallback to declared mimetype
    if (originalMimetype) {
        if (originalMimetype.startsWith('image/')) {
            detected.category = 'images';
            detected.isImage  = true;
            detected.mime     = originalMimetype;
            if (originalMimetype === 'image/emf')     { detected.ext = 'emf'; detected.kind = 'EMF'; detected.isVectorImage = true; }
            else if (originalMimetype === 'image/wmf') { detected.ext = 'wmf'; detected.kind = 'WMF'; detected.isVectorImage = true; }
            else if (originalMimetype === 'image/svg+xml') { detected.ext = 'svg'; detected.kind = 'SVG'; detected.isVectorImage = true; }
        } else if (originalMimetype.startsWith('video/')) {
            detected.category = 'videos';
            detected.mime     = originalMimetype;
        } else if (originalMimetype.startsWith('audio/')) {
            detected.category = 'audio';
            detected.mime     = originalMimetype;
        } else if (originalMimetype === 'application/pdf') {
            detected.category = 'documents';
            detected.ext  = 'pdf';
            detected.mime = 'application/pdf';
            detected.kind = 'PDF';
        }
    }

    // Layer 4: last resort — file extension
    if (originalName && detected.ext === 'bin') {
        const ext = String(originalName).split('.').pop()?.toLowerCase();
        if (ext && ext.length <= 5) {
            const extMap = {
                emf: { category: 'images', mime: 'image/emf', kind: 'EMF', isImage: true, isVectorImage: true },
                wmf: { category: 'images', mime: 'image/wmf', kind: 'WMF', isImage: true, isVectorImage: true },
                svg: { category: 'images', mime: 'image/svg+xml', kind: 'SVG', isImage: true, isVectorImage: true },
                pdf: { category: 'documents', mime: 'application/pdf', kind: 'PDF' },
                mp4: { category: 'videos', mime: 'video/mp4', kind: 'MP4' },
                mov: { category: 'videos', mime: 'video/quicktime', kind: 'MOV' },
                mp3: { category: 'audio', mime: 'audio/mpeg', kind: 'MP3' },
            };
            if (extMap[ext]) {
                detected.ext = ext;
                Object.assign(detected, extMap[ext]);
            }
        }
    }

    return detected;
}

// ==================== SVG SANITISATION ====================
function sanitizeSvg(svgBuffer) {
    const svgString = svgBuffer.toString('utf8');
    const window = new JSDOM('').window;
    const purify = DOMPurify(window);
    const clean = purify.sanitize(svgString, {
        USE_PROFILES: { svg: true, svgFilters: true },
        FORBID_TAGS: ['script', 'use', 'foreignObject'],
        FORBID_ATTR: ['onload', 'onclick', 'onerror', 'onmouseover', 'href', 'xlink:href'],
    });
    return Buffer.from(clean, 'utf8');
}

// ==================== VECTOR / SPECIAL FORMAT CONVERSION ====================
async function convertVectorToRaster(buffer, kind, baseKey) {
    const tempInput  = `/tmp/${baseKey}_input.${kind.toLowerCase()}`;
    const tempOutput = `/tmp/${baseKey}_converted.png`;

    try {
        await fs.writeFile(tempInput, buffer);

        if (kind === 'HEIC' || kind === 'HEIF') {
            await execAsync(`heif-convert "${tempInput}" "${tempOutput}"`, { timeout: 30_000 });
        } else if (kind === 'EMF' || kind === 'WMF') {
            try {
                await execAsync(`unoconv -f png -o "${tempOutput}" "${tempInput}"`, { timeout: 30_000 });
            } catch (e) {
                if (e?.killed || e?.signal === 'SIGTERM') throw new Error('Conversion timeout after 30s');
                throw e;
            }
        } else if (kind === 'SVG') {
            const converted = await sharp(buffer).png().toBuffer();
            await fs.writeFile(tempOutput, converted);
        }

        const result = await fs.readFile(tempOutput);
        return result;
    } finally {
        await fs.unlink(tempInput).catch(() => {});
        await fs.unlink(tempOutput).catch(() => {});
    }
}

// ==================== IMAGE PROCESSING ====================
async function processImage(buffer, kind, baseKey) {
    let inputBuffer = buffer;

    if (['HEIC', 'HEIF', 'EMF', 'WMF'].includes(kind)) {
        logger.info(`Converting ${kind} to PNG`, { baseKey });
        try {
            inputBuffer = await convertVectorToRaster(buffer, kind, baseKey);
        } catch (e) {
            logger.warn(`Could not convert ${kind}`, { baseKey });
            throw new Error(`CONVERSION_FAILED:${kind}`);
        }
    }

    const sharpImg  = sharp(inputBuffer);
    const meta      = await sharpImg.metadata();

    const optimized = await sharpImg
        .resize(MAX_WIDTH, null, { withoutEnlargement: true, fit: 'inside' })
        .toFormat(OUTPUT_FORMAT, { quality: QUALITY, effort: EFFORT })
        .toBuffer();

    const thumbnail = await sharp(inputBuffer)
        .resize(THUMB_W, THUMB_H, { withoutEnlargement: true, fit: 'cover' })
        .toFormat(OUTPUT_FORMAT, { quality: THUMB_QUALITY, effort: EFFORT })
        .toBuffer();

    return {
        optimizedBuffer: optimized,
        thumbnailBuffer: thumbnail,
        metadata: { width: meta.width, height: meta.height, format: meta.format },
    };
}

// ==================== MINIO HELPERS ====================
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
        // --- Detection ---
        const detected = await detectFileType(file.buffer, file.mimetype, file.originalname);
        const origExt  = String(file.originalname || '').split('.').pop()?.toLowerCase() || '';

        if (
            BASE_BLOCKED_MIME.has(detected.mime) ||
            BASE_BLOCKED_EXT.has(detected.ext)   ||
            BASE_BLOCKED_EXT.has(origExt)
        ) {
            return res.status(400).json(errorMessage({
                message: messages.error.upload.invalid_format.replace('{formats}', 'tipo de archivo no permitido por seguridad'),
            }));
        }

        // --- Antivirus (optional) ---
        await runOptionalAntivirusScan(file.buffer, baseKey);

        logger.info('File received', {
            originalname: file.originalname,
            size: file.size,
            kind: detected.kind,
            category: detected.category,
        });

        // --- Size limit ---
        const sizeLimit = SIZE_LIMITS[detected.category] || SIZE_LIMITS.generic;
        if (file.size > sizeLimit) {
            const limitMB = Math.round(sizeLimit / (1024 * 1024));
            return res.status(413).json(errorMessage({
                message: messages.error.upload.file_too_large.replace('{limit}', `${limitMB}MB`),
            }));
        }

        // --- Suspicious-content guard for text/script types ---
        if (detected.mime.includes('text') || detected.mime.includes('script')) {
            const patterns = [/<script/i, /javascript:/i, /<?php/i, /eval\(/i];
            const sample   = file.buffer.toString('utf8', 0, Math.min(file.buffer.length, 2048));
            if (patterns.some(p => p.test(sample))) {
                return res.status(400).json(errorMessage({
                    message: messages.error.upload.invalid_format.replace('{formats}', 'archivos seguros'),
                }));
            }
        }

        // --- Prepare output ---
        let finalKey, finalBuffer, thumbnailKey, thumbnailBuffer;
        let finalMime = detected.mime;

        const metaObj = {
            'Content-Type':       detected.mime,
            'X-Upload-Date':      new Date().toISOString(),
            'X-Original-Name':    Buffer.from(file.originalname || 'unknown').toString('base64'),
            'X-Original-Mime':    file.mimetype,
            'X-Detected-Mime':    detected.mime,
            'X-Category':         detected.category,
            'X-Kind':             detected.kind,
            'X-Original-Size':    file.size.toString(),
            'X-Upload-IP':        req.ip || 'unknown',
        };

        if (detected.isImage) {
            // Sanitise SVG before passing to sharp
            if (detected.kind === 'SVG') {
                file.buffer = sanitizeSvg(file.buffer);
            }

            try {
                const processed = await processImage(file.buffer, detected.kind, baseKey);

                finalKey    = `${baseKey}.${OUTPUT_FORMAT}`;
                finalBuffer = processed.optimizedBuffer;
                finalMime   = `image/${OUTPUT_FORMAT}`;

                thumbnailKey    = `${baseKey}_thumb.${OUTPUT_FORMAT}`;
                thumbnailBuffer = processed.thumbnailBuffer;

                metaObj['Content-Type']    = finalMime;
                metaObj['X-Image-Width']   = processed.metadata.width?.toString()  || 'unknown';
                metaObj['X-Image-Height']  = processed.metadata.height?.toString() || 'unknown';
                metaObj['X-Image-Format']  = processed.metadata.format             || 'unknown';

                logger.info('Image optimized', { finalKey });
            } catch (e) {
                if (String(e.message).startsWith('CONVERSION_FAILED')) {
                    logger.warn(`Saving original ${detected.kind} without optimisation`);
                    finalKey    = `${baseKey}.${detected.ext}`;
                    finalBuffer = file.buffer;
                    finalMime   = detected.mime;
                } else {
                    throw e;
                }
            }
        } else {
            finalKey    = `${baseKey}.${detected.ext}`;
            finalBuffer = file.buffer;
            const hash  = crypto.createHash('sha256').update(finalBuffer).digest('hex');
            metaObj['X-Hash-SHA256'] = hash;
            logger.info('Non-image file stored', { finalKey });
        }

        metaObj['X-Final-Size'] = finalBuffer.length.toString();

        // --- Upload main file ---
        const uploadResult = await putObject(BUCKET, finalKey, finalBuffer, metaObj);

        // --- Upload thumbnail (fire-and-forget with internal logging only) ---
        if (thumbnailBuffer) {
            putObject(BUCKET, thumbnailKey, thumbnailBuffer, {
                ...metaObj,
                'X-Thumbnail-Of': finalKey,
                'X-Final-Size':   thumbnailBuffer.length.toString(),
            }).then(() => {
                logger.info('Thumbnail uploaded', { thumbnailKey });
            }).catch(e => {
                logger.warn('Thumbnail upload failed', { thumbnailKey, code: e?.code });
            });
        }

        // --- Response ---
        return res.status(200).json(successMessage({
            message: messages.success.upload,
            extra: {
                fileName:           finalKey,
                baseFileName:       baseKey,
                fileSize:           finalBuffer.length,
                originalSize:       file.size,
                compressionRatio:   file.size > 0
                    ? ((finalBuffer.length / file.size) * 100).toFixed(1) + '%'
                    : '100%',
                category:           detected.category,
                type:               detected.kind,
                etag: {
                    etag:      uploadResult?.etag      || uploadResult,
                    versionId: uploadResult?.versionId || null,
                },
                uploadDate:         new Date().toISOString(),
                thumbnailAvailable: detected.isImage,
            },
        }));

    } catch (error) {
        logger.error('Upload failed', { code: error?.code, name: error?.name });

        if (error.message === 'ANTIVIRUS_INFECTED') {
            return res.status(400).json(errorMessage({ message: messages.error.upload.blocked }));
        }
        if (error.message === 'ANTIVIRUS_SCAN_FAILED') {
            return res.status(503).json(errorMessage({ message: messages.error.upload.av_error }));
        }
        return res.status(500).json(errorMessage({ message: messages.error.upload.processing_error }));
    }
});

// ==================== GET /:fileName ====================
api.get('/:fileName', async (req, res) => {
    const { fileName } = req.params;
    const { download, thumbnail } = req.query;

    if (!isSafeObjectKey(fileName)) {
        return res.status(400).json(errorMessage({ message: messages.error.get.invalid_key }));
    }

    try {
        const stat = await statObject(BUCKET, fileName);

        const contentType = stat.metaData?.['content-type'] || 'application/octet-stream';
        const isPublicImage = contentType.startsWith('image/');

        res.set({
            'Cache-Control': isPublicImage ? 'public, max-age=31536000, immutable' : 'private, no-store',
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

        // Conditional GET support
        if (req.headers['if-none-match'] === stat.etag) {
            return res.status(304).end();
        }

        let finalFileName = fileName;
        if (thumbnail === 'true') {
            const baseName    = fileName.replace(/\.[^/.]+$/, '');
            const thumbName   = `${baseName}_thumb.${OUTPUT_FORMAT}`;
            try {
                await statObject(BUCKET, thumbName);
                finalFileName = thumbName;
            } catch {
                logger.warn('Thumbnail not found, serving original', { fileName });
            }
        }

        minioClient.getObject(BUCKET, finalFileName, (err, dataStream) => {
            if (err) {
                logger.error('MinIO getObject failed', { key: finalFileName, code: err?.code });
                return res.status(404).json(errorMessage({ message: messages.error.get.not_found }));
            }
            dataStream.on('error', (streamErr) => {
                logger.error('Stream error', { key: finalFileName, code: streamErr?.code });
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

        // Attempt to delete associated thumbnail (fire-and-forget)
        const baseName  = fileName.replace(/\.[^/.]+$/, '');
        const thumbName = `${baseName}_thumb.${OUTPUT_FORMAT}`;

        new Promise((resolve, reject) => {
            minioClient.removeObject(BUCKET, thumbName, (err) => {
                if (err) reject(err);
                else resolve();
            });
        }).then(() => {
            logger.info('Thumbnail deleted', { thumbName });
        }).catch(() => {
            // Thumbnail may simply not exist — not an error.
        });

        return res.status(200).json(successMessage({ message: messages.success.delete }));

    } catch (error) {
        logger.error('Delete failed', { fileName, code: error?.code });
        return res.status(500).json(errorMessage({ message: messages.error.delete.error }));
    }
});

export default api;
