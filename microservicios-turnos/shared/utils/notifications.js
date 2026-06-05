import CONFIG from '../config/config.js';
import connection from './connection.js';

/**
 * Envío de emails a través del servicio core de autenticación.
 *
 * El core expone POST {AUTH_API_URL}/send-email con body { to, subject, content }.
 * El SMTP real se configura por .env en ese servicio (MAILER_*); aquí solo
 * delegamos. Si AUTH_API_URL no está configurada, se loguea y se devuelve
 * { status: 0 } sin romper el flujo del que llama.
 *
 * @param {Object} params
 * @param {string} params.to - Email destino
 * @param {string} params.subject - Asunto
 * @param {string} params.content - Cuerpo HTML
 * @returns {Promise<{status: number, message?: string}>}
 */
export async function sendMail({ to, subject, content }) {
    if (!to || !subject || !content) {
        return { status: 0, message: 'Faltan campos: to, subject, content' };
    }

    if (!CONFIG.AUTH_API_URL) {
        console.info(`[notifications] AUTH_API_URL no configurada. Email a ${to} no enviado.`);
        return { status: 0, message: 'AUTH_API_URL no configurada' };
    }

    try {
        const result = await connection({
            method: 'POST',
            url: `${CONFIG.AUTH_API_URL}/send-email`,
            data: { to, subject, content },
        });
        return result?.status === 1
            ? { status: 1, message: result.message }
            : { status: 0, message: result?.message || 'Error al enviar el email' };
    } catch (error) {
        console.error('[notifications] Error enviando email:', error?.message);
        return { status: 0, message: 'Error al enviar el email' };
    }
}

/**
 * Envuelve contenido en un layout HTML simple y sobrio.
 */
export function emailLayout({ title, bodyHtml, footer }) {
    return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#ffffff;border-radius:8px;padding:28px;border:1px solid #e4e4e7;">
      ${title ? `<h1 style="font-size:18px;margin:0 0 16px;color:#18181b;">${title}</h1>` : ''}
      <div style="font-size:14px;line-height:1.6;color:#3f3f46;">${bodyHtml}</div>
    </div>
    ${footer ? `<p style="font-size:12px;color:#a1a1aa;text-align:center;margin-top:16px;">${footer}</p>` : ''}
  </div>
</body>
</html>`;
}

/**
 * Formatea una fecha YYYY-MM-DD a DD/MM/YYYY.
 */
export function formatDateEs(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = String(dateStr).split('-');
    return `${d}/${m}/${y}`;
}
