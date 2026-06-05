import Integration from '../models/Integration.js';
import { encryptJSON, decryptJSON } from './crypto.js';

/**
 * Credenciales de integraciones externas (single-tenant).
 *
 * La configuración estática (client_id/secret, API keys) se lee de variables de
 * entorno en cada integración. Acá se persisten los tokens dinámicos obtenidos en
 * runtime (p.ej. el refresh_token de Google Calendar tras el OAuth), indexados por
 * (provider, scope).
 *
 * Cache en memoria con TTL de 60s; invalidable con invalidateCredentials().
 */
const cache = new Map();
const TTL_MS = 60 * 1000;

function cacheKey(provider, scope) {
    return `${provider}|${scope || ''}`;
}

export function invalidateCredentials(provider = null, scope = null) {
    if (!provider) {
        cache.clear();
        return;
    }
    cache.delete(cacheKey(provider, scope));
}

/**
 * Devuelve las credenciales descifradas de una integración.
 * Retorna null si no existe o está deshabilitada.
 */
export async function getCredentials(provider, scope = null) {
    if (!provider) return null;
    const key = cacheKey(provider, scope);
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
        return cached.value;
    }

    const where = { provider, enabled: true };
    if (scope !== null) where.scope = scope;

    const row = await Integration.findOne({ where });
    if (!row) {
        cache.set(key, { value: null, expires: Date.now() + TTL_MS });
        return null;
    }

    const creds = decryptJSON(row.credentials_encrypted) || {};
    const value = {
        id: row.id,
        provider: row.provider,
        scope: row.scope,
        enabled: row.enabled,
        config: row.config || {},
        credentials: creds,
    };
    cache.set(key, { value, expires: Date.now() + TTL_MS });
    return value;
}

/**
 * Upsert de credenciales. `credentials` se cifra antes de guardar.
 */
export async function saveCredentials(provider, { credentials = {}, config = {}, scope = null, enabled = true } = {}) {
    const where = { provider };
    if (scope !== null) where.scope = scope;

    const encrypted = encryptJSON(credentials);
    const existing = await Integration.findOne({ where });
    if (existing) {
        await existing.update({
            credentials_encrypted: encrypted,
            config,
            enabled,
            scope: scope !== null ? scope : existing.scope,
        });
        invalidateCredentials(provider, scope);
        return existing;
    }

    const created = await Integration.create({
        provider,
        scope,
        credentials_encrypted: encrypted,
        config,
        enabled,
    });
    invalidateCredentials(provider, scope);
    return created;
}

/**
 * Elimina (deshabilita) las credenciales de una integración.
 */
export async function deleteCredentials(provider, scope = null) {
    const where = { provider };
    if (scope !== null) where.scope = scope;
    const deleted = await Integration.destroy({ where });
    invalidateCredentials(provider, scope);
    return deleted;
}

export async function markTestResult(provider, { ok, error = null, scope = null } = {}) {
    const where = { provider };
    if (scope !== null) where.scope = scope;
    const row = await Integration.findOne({ where });
    if (!row) return null;
    await row.update({
        last_tested_at: new Date(),
        last_test_status: ok ? 'ok' : 'error',
        last_test_error: ok ? null : (error || '').slice(0, 500),
    });
    invalidateCredentials(provider, scope);
    return row;
}

export default { getCredentials, saveCredentials, deleteCredentials, invalidateCredentials, markTestResult };
