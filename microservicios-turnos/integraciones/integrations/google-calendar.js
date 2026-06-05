/**
 * Integracion con Google Calendar API.
 *
 * La app de Google OAuth esta registrada a nivel plataforma (client_id/secret
 * vienen de .env: GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET).
 * El refresh_token (opcionalmente por profesional, via scope) se guarda cifrado
 * con la capa integration-credentials (modelo Integration).
 */

import { getCredentials, saveCredentials } from '../utils/integration-credentials.js';

let googleModule = null;

async function getGoogle() {
    if (!googleModule) {
        try {
            googleModule = await import('googleapis');
        } catch {
            console.warn('[google-calendar] googleapis no esta instalado. pnpm add googleapis');
            return null;
        }
    }
    return googleModule;
}

function getAppOAuthConfig() {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || '';
    if (!clientId || !clientSecret) return null;
    return { clientId, clientSecret, redirectUri };
}

export function scopeForProfessional(professionalId) {
    return professionalId ? `professional:${professionalId}` : null;
}

/**
 * Genera la URL de consent para iniciar OAuth.
 */
export async function buildAuthUrl({ professionalId, redirectUri }) {
    const mod = await getGoogle();
    const app = getAppOAuthConfig();
    if (!mod || !app) return null;

    const { google } = mod;
    const client = new google.auth.OAuth2(app.clientId, app.clientSecret, redirectUri || app.redirectUri);
    const state = Buffer.from(JSON.stringify({ professionalId })).toString('base64url');
    return client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/calendar'],
        state,
    });
}

/**
 * Canjea el `code` del callback por tokens y los persiste con integration-credentials.
 */
export async function handleOAuthCallback({ code, state, redirectUri }) {
    const mod = await getGoogle();
    const app = getAppOAuthConfig();
    if (!mod || !app) return { ok: false, error: 'Google OAuth no configurado en .env' };

    let parsed = {};
    try { parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')); } catch {}
    const { professionalId } = parsed;

    const { google } = mod;
    const client = new google.auth.OAuth2(app.clientId, app.clientSecret, redirectUri || app.redirectUri);
    try {
        const { tokens } = await client.getToken(code);
        const scope = scopeForProfessional(professionalId);
        await saveCredentials('google_calendar', {
            credentials: {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expiry_date: tokens.expiry_date,
            },
            config: { calendar_id: 'primary', professional_id: professionalId || null },
            scope,
            enabled: true,
        });
        return { ok: true, professionalId };
    } catch (err) {
        console.error('[google-calendar] callback error:', err.message);
        return { ok: false, error: err.message };
    }
}

async function getAuthenticatedClient(professionalId = null) {
    const mod = await getGoogle();
    const app = getAppOAuthConfig();
    if (!mod || !app) return null;

    const scope = scopeForProfessional(professionalId);
    let entry = await getCredentials('google_calendar', scope);
    // Fallback al scope global
    if (!entry && scope) entry = await getCredentials('google_calendar', null);
    if (!entry) return null;

    const { google } = mod;
    const oauth2Client = new google.auth.OAuth2(app.clientId, app.clientSecret);
    oauth2Client.setCredentials({
        access_token: entry.credentials.access_token,
        refresh_token: entry.credentials.refresh_token,
        expiry_date: entry.credentials.expiry_date,
    });
    return { calendar: google.calendar({ version: 'v3', auth: oauth2Client }), entry };
}

/**
 * Crea un evento en Google Calendar del profesional/negocio.
 * Si no hay credenciales, retorna null (no hace nada).
 */
export async function createEvent({ professionalId = null, calendarId = 'primary', summary, start, end, description, attendees }) {
    const ctx = await getAuthenticatedClient(professionalId);
    if (!ctx) return null;
    try {
        const event = {
            summary,
            description: description || '',
            start: { dateTime: start },
            end: { dateTime: end },
        };
        if (attendees?.length) event.attendees = attendees;
        const response = await ctx.calendar.events.insert({
            calendarId,
            resource: event,
            sendUpdates: attendees?.length > 0 ? 'all' : 'none',
        });
        return { id: response.data.id, htmlLink: response.data.htmlLink };
    } catch (err) {
        console.error('[google-calendar] createEvent error:', err.message);
        return null;
    }
}

export async function deleteEvent({ professionalId = null, calendarId = 'primary', eventId }) {
    const ctx = await getAuthenticatedClient(professionalId);
    if (!ctx) return false;
    try {
        await ctx.calendar.events.delete({ calendarId, eventId, sendUpdates: 'all' });
        return true;
    } catch (err) {
        console.error('[google-calendar] deleteEvent error:', err.message);
        return false;
    }
}

/**
 * Lista eventos proximos para sync incremental. Usa syncToken si existe.
 */
export async function listEvents({ professionalId = null, calendarId = 'primary', syncToken = null, timeMin = null }) {
    const ctx = await getAuthenticatedClient(professionalId);
    if (!ctx) return null;
    try {
        const params = { calendarId, singleEvents: true };
        if (syncToken) params.syncToken = syncToken;
        else params.timeMin = timeMin || new Date().toISOString();
        const response = await ctx.calendar.events.list(params);
        return {
            items: response.data.items || [],
            nextSyncToken: response.data.nextSyncToken || null,
        };
    } catch (err) {
        console.error('[google-calendar] listEvents error:', err.message);
        return null;
    }
}
