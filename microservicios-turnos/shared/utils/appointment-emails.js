import { sendMail, emailLayout, formatDateEs } from './notifications.js';

/**
 * Plantillas de email transaccionales para turnos.
 *
 * Todas delegan en sendMail (core /send-email). Si no hay email del cliente
 * o el envío falla, devuelven { status: 0 } sin lanzar — el llamador decide.
 */

function timeShort(t) {
    return t ? String(t).slice(0, 5) : '';
}

function buildContext({ appointment, businessName, serviceName }) {
    return {
        clientName: appointment.client_name || 'Hola',
        serviceName: serviceName || appointment.service?.name || 'tu turno',
        date: formatDateEs(appointment.date),
        time: timeShort(appointment.start_time),
        business: businessName || 'el negocio',
    };
}

export async function sendConfirmationEmail({ appointment, businessName, serviceName }) {
    if (!appointment.client_email) return { status: 0, message: 'sin email' };
    const c = buildContext({ appointment, businessName, serviceName });
    const bodyHtml = `
        <p>Hola ${c.clientName},</p>
        <p>Tu turno fue registrado correctamente:</p>
        <p><strong>${c.serviceName}</strong><br>
        Fecha: ${c.date}<br>
        Hora: ${c.time}</p>
        <p>Te esperamos.</p>`;
    return sendMail({
        to: appointment.client_email,
        subject: `Turno confirmado - ${c.business}`,
        content: emailLayout({ title: 'Turno confirmado', bodyHtml, footer: c.business }),
    });
}

export async function sendCancellationEmail({ appointment, businessName, serviceName, reason }) {
    if (!appointment.client_email) return { status: 0, message: 'sin email' };
    const c = buildContext({ appointment, businessName, serviceName });
    const bodyHtml = `
        <p>Hola ${c.clientName},</p>
        <p>Tu turno fue cancelado:</p>
        <p><strong>${c.serviceName}</strong><br>
        Fecha: ${c.date}<br>
        Hora: ${c.time}</p>
        ${reason ? `<p>Motivo: ${reason}</p>` : ''}
        <p>Si querés reprogramar, contactanos.</p>`;
    return sendMail({
        to: appointment.client_email,
        subject: `Turno cancelado - ${c.business}`,
        content: emailLayout({ title: 'Turno cancelado', bodyHtml, footer: c.business }),
    });
}

export async function sendRescheduleEmail({ appointment, businessName, serviceName, previous }) {
    if (!appointment.client_email) return { status: 0, message: 'sin email' };
    const c = buildContext({ appointment, businessName, serviceName });
    const prevTxt = previous
        ? `<p>Anterior: ${formatDateEs(previous.date)} ${timeShort(previous.start_time)}</p>`
        : '';
    const bodyHtml = `
        <p>Hola ${c.clientName},</p>
        <p>Tu turno fue reprogramado:</p>
        ${prevTxt}
        <p><strong>${c.serviceName}</strong><br>
        Nueva fecha: ${c.date}<br>
        Nueva hora: ${c.time}</p>`;
    return sendMail({
        to: appointment.client_email,
        subject: `Turno reprogramado - ${c.business}`,
        content: emailLayout({ title: 'Turno reprogramado', bodyHtml, footer: c.business }),
    });
}

export async function sendReminderEmail({ appointment, businessName, serviceName, type }) {
    if (!appointment.client_email) return { status: 0, message: 'sin email' };
    const c = buildContext({ appointment, businessName, serviceName });
    const when = type === '24h' ? 'mañana' : 'en unas horas';
    const bodyHtml = `
        <p>Hola ${c.clientName},</p>
        <p>Te recordamos que ${when} tenés turno:</p>
        <p><strong>${c.serviceName}</strong><br>
        Fecha: ${c.date}<br>
        Hora: ${c.time}</p>
        <p>Te esperamos.</p>`;
    return sendMail({
        to: appointment.client_email,
        subject: `Recordatorio de turno - ${c.business}`,
        content: emailLayout({ title: 'Recordatorio de turno', bodyHtml, footer: c.business }),
    });
}

/**
 * Email para avisar a un cliente de la lista de espera que se liberó un cupo.
 */
export async function sendWaitlistOpeningEmail({ to, clientName, serviceName, businessName, date }) {
    if (!to) return { status: 0, message: 'sin email' };
    const bodyHtml = `
        <p>Hola ${clientName || ''},</p>
        <p>Se liberó un cupo para <strong>${serviceName || 'el servicio'}</strong>${date ? ` el ${formatDateEs(date)}` : ''}.</p>
        <p>Estabas en lista de espera. Respondé o contactanos para reservarlo antes de que se ocupe.</p>`;
    return sendMail({
        to,
        subject: `Se liberó un cupo - ${businessName || ''}`.trim(),
        content: emailLayout({ title: 'Se liberó un cupo', bodyHtml, footer: businessName || '' }),
    });
}
