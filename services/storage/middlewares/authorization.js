import crypto from 'node:crypto';
import CONFIG from '../config/config.js';
import { errorMessage } from '../utils/messages.js';
import messages from '../config/messages.js';

const { AUTHORIZATION } = CONFIG;
const { PASSWORD, USER } = AUTHORIZATION;

/**
 * Timing-safe string comparison using crypto.timingSafeEqual.
 * Both operands are padded to the same length to avoid early-exit leaks.
 */
export const safeEquals = (left = '', right = '') => {
    const leftBuf = Buffer.from(String(left));
    const rightBuf = Buffer.from(String(right));
    if (leftBuf.length !== rightBuf.length) {
        // Still run a dummy comparison to prevent timing attacks.
        crypto.timingSafeEqual(leftBuf, leftBuf);
        return false;
    }
    return crypto.timingSafeEqual(leftBuf, rightBuf);
};

/**
 * Parses the Authorization: Basic <base64> header.
 * Uses indexOf(':') instead of split(':') so passwords with ':' work correctly.
 */
export const parseBasicCredentials = (authHeader) => {
    if (!authHeader || typeof authHeader !== 'string') return null;
    const spaceIdx = authHeader.indexOf(' ');
    if (spaceIdx === -1) return null;
    const scheme = authHeader.slice(0, spaceIdx);
    const encoded = authHeader.slice(spaceIdx + 1);
    if (scheme.toLowerCase() !== 'basic' || !encoded) return null;
    try {
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        const colonIdx = decoded.indexOf(':');
        if (colonIdx <= 0) return null;
        return {
            user: decoded.slice(0, colonIdx),
            password: decoded.slice(colonIdx + 1),
        };
    } catch {
        return null;
    }
};

export default (req, res, next) => {
    // Preflight passes through without auth.
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    const credentials = parseBasicCredentials(req.get('authorization'));
    if (!credentials) {
        return res.status(401).json(errorMessage({ message: messages.generic.autorization_required }));
    }

    if (safeEquals(credentials.user, USER) && safeEquals(credentials.password, PASSWORD)) {
        return next();
    }

    return res.status(401).json(errorMessage({ message: messages.generic.credential_invalid }));
};
