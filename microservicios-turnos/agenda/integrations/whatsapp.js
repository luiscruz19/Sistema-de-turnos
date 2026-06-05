const GRAPH_API_VERSION = 'v18.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Envia un mensaje de texto via WhatsApp Cloud API.
 *
 * @param {string} phoneNumberId - ID del numero de telefono de WhatsApp Business
 * @param {string} accessToken - Token de acceso de la API de WhatsApp
 * @param {string} to - Numero de telefono destino (formato internacional, sin +)
 * @param {string} text - Contenido del mensaje
 * @returns {Promise<Object>} Respuesta de la API
 */
export async function sendTextMessage(phoneNumberId, accessToken, to, text) {
    const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'text',
            text: { body: text },
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`WhatsApp API error ${response.status}: ${errorBody}`);
    }

    return response.json();
}

/**
 * Envia un mensaje de template via WhatsApp Cloud API.
 *
 * @param {string} phoneNumberId - ID del numero de telefono de WhatsApp Business
 * @param {string} accessToken - Token de acceso
 * @param {string} to - Numero destino
 * @param {string} templateName - Nombre del template aprobado en Meta
 * @param {Array<{ type: string, parameters: Array }>} [components=[]] - Componentes con parametros del template
 * @param {string} [languageCode='es_AR'] - Codigo de idioma del template
 * @returns {Promise<Object>}
 */
export async function sendTemplateMessage(phoneNumberId, accessToken, to, templateName, components = [], languageCode = 'es_AR') {
    const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;

    const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
            name: templateName,
            language: { code: languageCode },
        },
    };

    if (components.length > 0) {
        body.template.components = components;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`WhatsApp API error ${response.status}: ${errorBody}`);
    }

    return response.json();
}

/**
 * Verifica un webhook de Meta (WhatsApp / Messenger / Instagram).
 * Se usa para el GET de verificacion que Meta envia al configurar el webhook.
 *
 * @param {string} hubVerifyToken - Token enviado por Meta en hub.verify_token
 * @param {string} expectedToken - Token configurado en el canal
 * @returns {boolean} true si los tokens coinciden
 */
export function verifyWebhook(hubVerifyToken, expectedToken) {
    return hubVerifyToken === expectedToken;
}

/**
 * Parsea un mensaje entrante del webhook de WhatsApp Cloud API.
 *
 * @param {Object} body - Body del webhook POST
 * @returns {{ from: string, text: string, messageId: string, timestamp: string, phoneNumberId: string, contactName: string | null } | null}
 */
export function parseIncomingMessage(body) {
    if (!body?.object || body.object !== 'whatsapp_business_account') {
        return null;
    }

    const entries = body.entry || [];

    for (const entry of entries) {
        const changes = entry.changes || [];

        for (const change of changes) {
            if (change.field !== 'messages') continue;

            const value = change.value || {};
            const messageList = value.messages || [];
            const contacts = value.contacts || [];
            const metadata = value.metadata || {};

            for (const msg of messageList) {
                if (msg.type !== 'text') continue;

                const from = msg.from;
                const contactName = contacts.find(c => c.wa_id === from)?.profile?.name || null;

                return {
                    from,
                    text: msg.text?.body || '',
                    messageId: msg.id,
                    timestamp: msg.timestamp,
                    phoneNumberId: metadata.phone_number_id,
                    contactName,
                };
            }
        }
    }

    return null;
}
