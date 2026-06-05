import crypto from 'node:crypto';

/**
 * Cifrado simétrico AES-256-GCM para credenciales sensibles guardadas en DB.
 * La clave viene del .env (TURNOS_ENCRYPTION_KEY, 64 hex chars = 32 bytes).
 *
 * Formato de salida: "v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */

const ALGO = 'aes-256-gcm';
const VERSION = 'v1';

function getKey() {
    const raw = process.env.TURNOS_ENCRYPTION_KEY || '';
    if (!raw) {
        // Fallback dev: deriva del SECRET_KEY si no esta seteada
        const fallback = process.env.SECRET_KEY || 'turnos-dev-key-change-me';
        return crypto.createHash('sha256').update(fallback).digest();
    }
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
        return Buffer.from(raw, 'hex');
    }
    // Si no es hex, la derivamos con sha256 para tener 32 bytes
    return crypto.createHash('sha256').update(raw).digest();
}

export function encryptJSON(obj) {
    if (obj === null || obj === undefined) return null;
    const key = getKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const plaintext = Buffer.from(JSON.stringify(obj), 'utf8');
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${VERSION}:${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

export function decryptJSON(payload) {
    if (!payload) return null;
    try {
        const parts = String(payload).split(':');
        if (parts.length !== 4 || parts[0] !== VERSION) {
            // Compatibilidad: puede ser JSON en claro de la fase previa
            try { return JSON.parse(payload); } catch { return null; }
        }
        const [, ivHex, tagHex, ctHex] = parts;
        const key = getKey();
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(tagHex, 'hex');
        const ciphertext = Buffer.from(ctHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGO, key, iv);
        decipher.setAuthTag(authTag);
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return JSON.parse(plaintext.toString('utf8'));
    } catch (err) {
        console.error('[turnos-crypto] decrypt error:', err.message);
        return null;
    }
}

export default { encryptJSON, decryptJSON };
