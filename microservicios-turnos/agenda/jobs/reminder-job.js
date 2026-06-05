import Appointment from '../models/Appointment.js';
import AppointmentReminder from '../models/AppointmentReminder.js';
import BusinessConfig from '../models/BusinessConfig.js';
import ClientContact from '../models/ClientContact.js';
import Service from '../models/Service.js';
import { Op } from 'sequelize';
import { sendTextMessage } from '../integrations/whatsapp.js';
import { sendReminderEmail } from '../utils/appointment-emails.js';

/**
 * Formatea fecha YYYY-MM-DD a DD/MM/YYYY
 */
function formatDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

/**
 * Busca y envia recordatorios de turnos.
 *
 * - Recordatorio de 24h antes: busca turnos de manana que no tengan reminder_24h_sent = true
 * - Recordatorio de 2h antes: busca turnos de hoy cuya hora es en ~2h y no tengan reminder_2h_sent = true
 */
export async function runReminders() {
    const now = new Date();

    try {
        await sendReminders24h(now);
    } catch (err) {
        console.error('[reminder-job] Error en recordatorios 24h:', err.message);
    }

    try {
        await sendReminders2h(now);
    } catch (err) {
        console.error('[reminder-job] Error en recordatorios 2h:', err.message);
    }
}

/**
 * Recordatorios 24h antes
 */
async function sendReminders24h(now) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const appointments = await Appointment.findAll({
        where: {
            date: tomorrowStr,
            status: { [Op.in]: ['pending', 'confirmed'] },
            reminder_24h_sent: { [Op.or]: [false, null] },
        },
        include: [
            { model: Service, as: 'service', attributes: ['name'] },
        ],
    });

    if (appointments.length === 0) return;

    console.info(`[reminder-job] Enviando ${appointments.length} recordatorios de 24h para ${tomorrowStr}`);

    const config = await BusinessConfig.findOne();

    for (const appt of appointments) {
        try {
            const message = buildReminderMessage(appt, '24h');

            if (appt.client_phone) {
                await sendWhatsAppReminder(appt.client_phone, message);
                await logReminder(appt.id, '24h', 'whatsapp');
            }

            if (appt.client_email && !appt.reminder_email_24h_sent) {
                const result = await sendReminderEmail({
                    appointment: appt,
                    businessName: config?.name,
                    serviceName: appt.service?.name,
                    type: '24h',
                });
                await logReminder(appt.id, '24h', 'email', result?.status === 1 ? 'sent' : 'failed');
                await appt.update({ reminder_email_24h_sent: true });
            }

            // Marcar como enviado independientemente de si tiene phone o no
            await appt.update({ reminder_24h_sent: true });
        } catch (err) {
            console.error(`[reminder-job] Error enviando 24h reminder para appointment ${appt.id}:`, err.message);
        }
    }
}

/**
 * Recordatorios 2h antes
 */
async function sendReminders2h(now) {
    const todayStr = now.toISOString().split('T')[0];

    // Calcular ventana de 2h: turnos que empiezan entre 1h45min y 2h15min desde ahora
    const twoHoursFromNow = new Date(now);
    twoHoursFromNow.setHours(twoHoursFromNow.getHours() + 2);

    const windowStart = new Date(twoHoursFromNow);
    windowStart.setMinutes(windowStart.getMinutes() - 15);

    const windowEnd = new Date(twoHoursFromNow);
    windowEnd.setMinutes(windowEnd.getMinutes() + 15);

    const startTimeMin = `${windowStart.getHours().toString().padStart(2, '0')}:${windowStart.getMinutes().toString().padStart(2, '0')}:00`;
    const startTimeMax = `${windowEnd.getHours().toString().padStart(2, '0')}:${windowEnd.getMinutes().toString().padStart(2, '0')}:00`;

    const appointments = await Appointment.findAll({
        where: {
            date: todayStr,
            status: { [Op.in]: ['pending', 'confirmed'] },
            start_time: { [Op.between]: [startTimeMin, startTimeMax] },
            reminder_sent: { [Op.or]: [false, null] },
        },
        include: [
            { model: Service, as: 'service', attributes: ['name'] },
        ],
    });

    if (appointments.length === 0) return;

    console.info(`[reminder-job] Enviando ${appointments.length} recordatorios de 2h para hoy`);

    const config = await BusinessConfig.findOne();

    for (const appt of appointments) {
        try {
            const message = buildReminderMessage(appt, '2h');

            if (appt.client_phone) {
                await sendWhatsAppReminder(appt.client_phone, message);
                await logReminder(appt.id, '2h', 'whatsapp');
            }

            if (appt.client_email && !appt.reminder_email_2h_sent) {
                const result = await sendReminderEmail({
                    appointment: appt,
                    businessName: config?.name,
                    serviceName: appt.service?.name,
                    type: '2h',
                });
                await logReminder(appt.id, '2h', 'email', result?.status === 1 ? 'sent' : 'failed');
                await appt.update({ reminder_email_2h_sent: true });
            }

            await appt.update({ reminder_sent: true });
        } catch (err) {
            console.error(`[reminder-job] Error enviando 2h reminder para appointment ${appt.id}:`, err.message);
        }
    }
}

/**
 * Registra un recordatorio en appointment_reminders (best-effort).
 */
async function logReminder(appointmentId, type, channel, status = 'sent') {
    try {
        await AppointmentReminder.create({
            appointment_id: appointmentId,
            type,
            channel,
            sent_at: new Date(),
            status,
        });
    } catch (err) {
        console.error(`[reminder-job] Error registrando reminder ${type}/${channel} appt ${appointmentId}:`, err.message);
    }
}

/**
 * Construye el mensaje de recordatorio
 */
function buildReminderMessage(appointment, type) {
    const serviceName = appointment.service?.name || 'tu turno';
    const date = formatDate(appointment.date);
    const time = appointment.start_time?.slice(0, 5);

    if (type === '24h') {
        return `Hola ${appointment.client_name || ''}! Te recordamos que manana tenes turno:\n\n` +
            `${serviceName}\n` +
            `Fecha: ${date}\n` +
            `Hora: ${time}\n\n` +
            `Si necesitas cancelar, escribi "cancelar".`;
    }

    return `Hola ${appointment.client_name || ''}! En 2 horas tenes turno:\n\n` +
        `${serviceName} a las ${time}\n\n` +
        `Te esperamos!`;
}

/**
 * Envia un recordatorio por WhatsApp
 */
async function sendWhatsAppReminder(phone, message) {
    try {
        // Obtener config del negocio para credenciales de WhatsApp
        const config = await BusinessConfig.findOne();

        if (!config?.whatsapp_phone_number_id || !config?.whatsapp_access_token) {
            // Sin WhatsApp configurado, solo loguear
            console.info(`[reminder-job] WhatsApp no configurado. Mensaje: ${message.slice(0, 60)}...`);
            return;
        }

        await sendTextMessage(
            config.whatsapp_phone_number_id,
            config.whatsapp_access_token,
            phone,
            message
        );
    } catch (err) {
        console.error(`[reminder-job] Error WhatsApp para ${phone}:`, err.message);
    }
}
