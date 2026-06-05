import Professional from '../../models/Professional.js';
import ProfessionalCalendarSync from '../../models/ProfessionalCalendarSync.js';
import Appointment from '../../models/Appointment.js';
import { errorMessage, successMessage } from '../../utils/messages.js';
import { deleteCredentials } from '../../utils/integration-credentials.js';
import { buildAuthUrl, handleOAuthCallback, listEvents, scopeForProfessional } from '../../integrations/google-calendar.js';

/**
 * Inicia el OAuth: devuelve la URL a la que debe redirigir el browser.
 * Query: ?professional_id=X
 */
export async function authorize(req, res) {
    try {
        const professionalId = req.query.professional_id ? Number(req.query.professional_id) : null;
        const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI
            || `${req.protocol}://${req.get('host')}/oauth/google/callback`;

        const url = await buildAuthUrl({
            professionalId,
            redirectUri,
        });
        if (!url) {
            return res.status(400).json(errorMessage({
                message: 'Google OAuth no esta configurado en el servidor. Setear GOOGLE_OAUTH_CLIENT_ID/SECRET en .env.',
            }));
        }
        return res.status(200).json(successMessage({ message: 'OK', extra: { data: { url } } }));
    } catch (error) {
        console.error('[google-oauth] authorize error:', error);
        return res.status(500).json(errorMessage({ message: 'Error iniciando OAuth' }));
    }
}

/**
 * Callback publico: recibe code + state.
 * Registrado en /system/oauth/google/callback.
 */
export async function callback(req, res) {
    try {
        const { code, state } = req.query;
        if (!code || !state) return res.status(400).send('Missing code/state');

        const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI
            || `${req.protocol}://${req.get('host')}/system/oauth/google/callback`;

        const result = await handleOAuthCallback({ code, state, redirectUri });
        if (!result.ok) return res.status(400).send(`Error: ${result.error}`);

        // Crear/actualizar el registro de sync del profesional si aplica
        if (result.professionalId) {
            const existing = await ProfessionalCalendarSync.findOne({
                where: { professional_id: result.professionalId },
            });
            const scope = scopeForProfessional(result.professionalId);
            if (existing) {
                await existing.update({
                    sync_enabled: true,
                    integration_scope: scope,
                    google_calendar_id: 'primary',
                });
            } else {
                await ProfessionalCalendarSync.create({
                    professional_id: result.professionalId,
                    integration_scope: scope,
                    sync_enabled: true,
                    google_calendar_id: 'primary',
                });
            }
        }

        // Respuesta simple: pagina que se cierra sola
        return res.status(200).send(`
            <html><body>
                <h2>Google Calendar conectado</h2>
                <p>Ya podes cerrar esta ventana.</p>
                <script>setTimeout(()=>window.close(), 1500);</script>
            </body></html>
        `);
    } catch (error) {
        console.error('[google-oauth] callback error:', error);
        return res.status(500).send('Error interno');
    }
}

/**
 * Desconecta el Google Calendar de un profesional (o el global si no se pasa professional_id).
 */
export async function disconnect(req, res) {
    try {
        const professionalId = req.body.professional_id ? Number(req.body.professional_id) : null;
        const scope = scopeForProfessional(professionalId);

        await deleteCredentials('google_calendar', scope);

        if (professionalId) {
            await ProfessionalCalendarSync.update(
                { sync_enabled: false },
                { where: { professional_id: professionalId } },
            );
        }
        return res.status(200).json(successMessage({ message: 'Desconectado' }));
    } catch (error) {
        console.error('[google-oauth] disconnect error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al desconectar' }));
    }
}

export async function getSyncStatus(req, res) {
    try {
        const rows = await ProfessionalCalendarSync.findAll({
            include: [{ model: Professional, as: 'professional', attributes: ['id', 'name'] }],
        });
        return res.status(200).json(successMessage({ message: 'OK', extra: { data: rows } }));
    } catch (error) {
        console.error('[google-oauth] getSyncStatus error:', error);
        return res.status(500).json(errorMessage({ message: 'Error' }));
    }
}

/**
 * Pull de eventos desde Google para detectar bloqueos externos.
 * Por ahora solo registra los ultimos eventos y actualiza last_synced_at.
 * (El push de appointments->Google ya se hace en appointments.controller.js)
 */
export async function runPull(req, res) {
    try {
        const { professional_id } = req.body || {};
        if (!professional_id) {
            return res.status(400).json(errorMessage({ message: 'professional_id requerido' }));
        }

        const sync = await ProfessionalCalendarSync.findOne({
            where: { professional_id },
        });
        if (!sync || !sync.sync_enabled) {
            return res.status(400).json(errorMessage({ message: 'Sync no habilitado' }));
        }

        const result = await listEvents({
            professionalId: professional_id,
            calendarId: sync.google_calendar_id || 'primary',
            syncToken: sync.sync_token,
        });

        if (!result) {
            await sync.update({ last_sync_status: 'error', last_sync_error: 'No credentials', last_synced_at: new Date() });
            return res.status(502).json(errorMessage({ message: 'Error al sincronizar' }));
        }

        await sync.update({
            last_synced_at: new Date(),
            last_sync_status: 'ok',
            last_sync_error: null,
            sync_token: result.nextSyncToken || sync.sync_token,
        });

        return res.status(200).json(successMessage({
            message: 'Sync ejecutado',
            extra: { data: { items_count: result.items.length } },
        }));
    } catch (error) {
        console.error('[google-oauth] runPull error:', error);
        return res.status(500).json(errorMessage({ message: 'Error' }));
    }
}

/**
 * Job helper reusable. Corre pull para todos los profesionales con sync_enabled.
 * Llamado desde jobs/index.js en un intervalo.
 */
export async function syncAll() {
    try {
        const rows = await ProfessionalCalendarSync.findAll({ where: { sync_enabled: true } });
        for (const sync of rows) {
            try {
                const result = await listEvents({
                    professionalId: sync.professional_id,
                    calendarId: sync.google_calendar_id || 'primary',
                    syncToken: sync.sync_token,
                });
                if (!result) {
                    await sync.update({ last_sync_status: 'error', last_sync_error: 'No credentials', last_synced_at: new Date() });
                    continue;
                }
                await sync.update({
                    last_synced_at: new Date(),
                    last_sync_status: 'ok',
                    last_sync_error: null,
                    sync_token: result.nextSyncToken || sync.sync_token,
                });
            } catch (err) {
                console.error(`[google-sync-job] prof=${sync.professional_id} error:`, err.message);
            }
        }
    } catch (err) {
        console.error('[google-sync-job] global error:', err.message);
    }
}
