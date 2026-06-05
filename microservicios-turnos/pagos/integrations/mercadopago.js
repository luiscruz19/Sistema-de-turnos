const MP_API_BASE = 'https://api.mercadopago.com';

function resolveMPCredentials() {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) return null;
    return {
        accessToken,
        publicKey: process.env.MP_PUBLIC_KEY || null,
        webhookSecret: process.env.MP_WEBHOOK_SECRET || null,
    };
}

/**
 * Crea una preference de Mercado Pago para un turno.
 * Si no hay credenciales, entra en modo "simulated" y devuelve un init_point falso.
 *
 * @param {Object} opts
 * @param {number} opts.amount
 * @param {string} opts.description
 * @param {string} opts.externalReference
 * @param {string} [opts.notificationUrl] - URL del webhook publico
 * @param {string} [opts.backUrl]
 */
export async function createPreference({
    amount,
    description,
    externalReference,
    notificationUrl,
    backUrl,
}) {
    const creds = resolveMPCredentials();

    if (!creds) {
        // Modo simulado: devolvemos una preference fake. El controller marca el intent como 'simulated'.
        const fakeId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        return {
            mode: 'simulated',
            preferenceId: fakeId,
            initPoint: `${backUrl || 'https://turnos.sda.ovh'}?sim=${fakeId}`,
        };
    }

    const body = {
        items: [
            {
                title: description || 'Turno',
                quantity: 1,
                unit_price: Number(amount) || 0,
                currency_id: 'ARS',
            },
        ],
        external_reference: externalReference,
    };
    if (notificationUrl) body.notification_url = notificationUrl;
    if (backUrl) {
        body.back_urls = { success: backUrl, failure: backUrl, pending: backUrl };
        body.auto_return = 'approved';
    }

    try {
        const response = await fetch(`${MP_API_BASE}/checkout/preferences`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${creds.accessToken}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('[turnos-mp] createPreference error:', response.status, errText);
            return null;
        }

        const data = await response.json();
        return {
            mode: 'live',
            preferenceId: data.id,
            initPoint: data.init_point || data.sandbox_init_point,
            raw: data,
        };
    } catch (err) {
        console.error('[turnos-mp] createPreference fetch error:', err.message);
        return null;
    }
}

/**
 * Obtiene el detalle de un pago en MP por id. Retorna null si no hay credenciales o falla.
 */
export async function getPaymentById(paymentId) {
    const creds = resolveMPCredentials();
    if (!creds) return null;
    try {
        const response = await fetch(`${MP_API_BASE}/v1/payments/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${creds.accessToken}` },
        });
        if (!response.ok) {
            console.error('[turnos-mp] getPaymentById error:', response.status);
            return null;
        }
        return await response.json();
    } catch (err) {
        console.error('[turnos-mp] getPaymentById fetch error:', err.message);
        return null;
    }
}

/**
 * Refund total o parcial de un pago MP.
 */
export async function refundPayment(paymentId, amount = null) {
    const creds = resolveMPCredentials();
    if (!creds) {
        return { ok: false, error: 'MP no configurado', mode: 'simulated' };
    }
    try {
        const body = amount ? { amount: Number(amount) } : {};
        const response = await fetch(`${MP_API_BASE}/v1/payments/${paymentId}/refunds`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${creds.accessToken}`,
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const text = await response.text();
            return { ok: false, error: `MP ${response.status}: ${text}` };
        }
        const data = await response.json();
        return { ok: true, data };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

/**
 * Verifica la firma del webhook de MP. MP manda `x-signature` y `x-request-id`.
 * Formato: "ts=<timestamp>,v1=<hmac>". Se firma "id:<dataId>;request-id:<reqId>;ts:<ts>;".
 * Si no hay webhook_secret configurado, retorna true (permisivo en dev).
 */
export async function verifyWebhookSignature({ signatureHeader, requestId, dataId }) {
    const creds = resolveMPCredentials();
    if (!creds || !creds.webhookSecret) return true;
    if (!signatureHeader) return false;

    try {
        const parts = signatureHeader.split(',').reduce((acc, p) => {
            const [k, v] = p.split('=');
            if (k && v) acc[k.trim()] = v.trim();
            return acc;
        }, {});
        const ts = parts.ts;
        const v1 = parts.v1;
        if (!ts || !v1) return false;

        const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
        const crypto = await import('node:crypto');
        const hmac = crypto.createHmac('sha256', creds.webhookSecret).update(manifest).digest('hex');
        return hmac === v1;
    } catch (err) {
        console.error('[turnos-mp] verifyWebhookSignature error:', err.message);
        return false;
    }
}

/**
 * Prueba las credenciales MP haciendo un GET /users/me.
 */
export async function testMercadoPagoCredentials() {
    const creds = resolveMPCredentials();
    if (!creds) return { ok: false, error: 'MP no esta configurado' };
    try {
        const response = await fetch(`${MP_API_BASE}/users/me`, {
            headers: { 'Authorization': `Bearer ${creds.accessToken}` },
        });
        if (!response.ok) {
            return { ok: false, error: `MP respondio ${response.status}` };
        }
        const data = await response.json();
        return { ok: true, data: { id: data.id, email: data.email, nickname: data.nickname } };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

export default {
    createPreference,
    getPaymentById,
    refundPayment,
    verifyWebhookSignature,
    testMercadoPagoCredentials,
};
