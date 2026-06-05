import { runReminders } from './reminder-job.js';
import { syncAllCalendars } from '../controllers/google-calendar/google-calendar.js';

const ONE_HOUR_MS = 60 * 60 * 1000;
const GCAL_SYNC_INTERVAL_MS = Number(process.env.TURNOS_GCAL_SYNC_INTERVAL_MS || 10 * 60 * 1000);

/**
 * Inicia los jobs programados del microservicio de agenda.
 */
export function startJobs() {
    console.info('[jobs] Iniciando jobs programados de agenda...');

    // Ejecutar recordatorios cada hora
    setInterval(async () => {
        try {
            console.info('[jobs] Ejecutando reminder-job...');
            await runReminders();
            console.info('[jobs] reminder-job completado.');
        } catch (err) {
            console.error('[jobs] Error en reminder-job:', err.message);
        }
    }, ONE_HOUR_MS);

    // Ejecutar una vez al arrancar (con delay para que la DB este lista)
    setTimeout(async () => {
        try {
            console.info('[jobs] Ejecutando reminder-job inicial...');
            await runReminders();
            console.info('[jobs] reminder-job inicial completado.');
        } catch (err) {
            console.error('[jobs] Error en reminder-job inicial:', err.message);
        }
    }, 30_000);

    // Sync bidireccional de Google Calendar (pull periodico)
    setInterval(async () => {
        try {
            console.info('[jobs] Ejecutando google-calendar-sync...');
            await syncAllCalendars();
        } catch (err) {
            console.error('[jobs] Error en google-calendar-sync:', err.message);
        }
    }, GCAL_SYNC_INTERVAL_MS);
}
