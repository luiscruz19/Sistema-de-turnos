import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';
import CONFIG from '../config/config.js';
import { parseBasicCredentials, safeEquals } from './authorization.js';

const { USER: BASIC_USER, PASSWORD: BASIC_PASSWORD } = CONFIG.AUTHORIZATION;

/**
 * Requests autenticadas con la credencial Basic interna (servicio-a-servicio,
 * p. ej. el backoffice subiendo slides de un PPTX) no deben verse limitadas
 * por el rate limit, porque las primeras 50-120 pasarían y el resto se cortarían.
 * Sólo se saltea si las credenciales son válidas; un anónimo o un atacante
 * con credenciales falsas sigue limitado.
 */
const hasValidBasicAuth = (req) => {
    const credentials = parseBasicCredentials(req.get('authorization'));
    if (!credentials) return false;
    return (
        safeEquals(credentials.user, BASIC_USER) &&
        safeEquals(credentials.password, BASIC_PASSWORD)
    );
};

/**
 * Builds the CORS allowed origins list.
 * Lenient in development: if WEB_URL / CORS_ALLOWED_ORIGINS are missing,
 * all origins are accepted (no crash). In production, a missing config
 * logs a warning but does NOT throw.
 */
const buildAllowedOrigins = () => {
    const raw = process.env.CORS_ALLOWED_ORIGINS || '';
    const configured = raw.split(',').map(o => o.trim()).filter(Boolean);
    if (configured.length) return configured;

    const webUrl = process.env.WEB_URL;
    if (!webUrl) {
        if (CONFIG.APP.NODE_ENV === 'production') {
            logger.warn('security: WEB_URL and CORS_ALLOWED_ORIGINS are not set — all origins will be allowed in production!');
        }
        return [];
    }

    try {
        const parsed = new URL(webUrl);
        const host = parsed.host;
        return [`https://${host}`, `http://${host}`];
    } catch {
        return [webUrl];
    }
};

const allowedOrigins = buildAllowedOrigins();

const corsOptions = {
    origin(origin, callback) {
        // Server-to-server requests inside Docker have no Origin header.
        if (!origin) return callback(null, true);
        // If no origins are configured, allow everything (open mode for dev/internal).
        if (!allowedOrigins.length) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'token',
        'x-requested-with',
        'x-idempotency-key',
    ],
    credentials: true,
};

export const uploadRateLimit = rateLimit({
    windowMs: Number(process.env.STORAGE_RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.STORAGE_RATE_LIMIT_MAX || 50),
    standardHeaders: true,
    legacyHeaders: false,
    skip: hasValidBasicAuth,
    message: { status: 0, message: 'Too many upload requests. Please try again later.' },
});

/**
 * Applies Helmet (helmet@8) + CORS to the Express app.
 * helmet@8 ships separate default configs — we customise the relevant ones.
 */
export const applySecurity = (app) => {
    app.use(
        helmet({
            // Disable browser-side CSP — this is a pure API/file server.
            contentSecurityPolicy: false,
            // Allow cross-origin embedding of files (images, PDFs, etc.)
            crossOriginResourcePolicy: { policy: 'cross-origin' },
            referrerPolicy: { policy: 'no-referrer' },
            // HSTS only in production.
            hsts:
                CONFIG.APP.NODE_ENV === 'production'
                    ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
                    : false,
        })
    );
    app.use(cors(corsOptions));
};
