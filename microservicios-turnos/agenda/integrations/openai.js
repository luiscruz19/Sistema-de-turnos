const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * Resuelve la API key de OpenAI desde el entorno (OPENAI_API_KEY).
 * Retorna null si no esta configurado.
 */
async function resolveOpenAICredentials() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
    return { apiKey, model };
}

/**
 * Parsea el intent de un mensaje de WhatsApp para el bot de turnos.
 * Las credenciales se leen del entorno (OPENAI_API_KEY).
 *
 * @param {string} messageText
 * @returns {Promise<{ intent: 'book' | 'cancel' | 'query' | 'other', confidence: number, extracted: Object }>}
 */
export async function parseIntent(messageText) {
    const creds = await resolveOpenAICredentials();
    if (!creds) {
        return parseIntentFallback(messageText);
    }

    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${creds.apiKey}`,
            },
            body: JSON.stringify({
                model: creds.model,
                messages: [
                    {
                        role: 'system',
                        content: `Sos un parser de intenciones para un bot de turnos por WhatsApp.
Dado un mensaje del usuario, respondes SOLO con un JSON valido (sin markdown) con:
- "intent": "book" | "cancel" | "query" | "other"
- "confidence": numero entre 0 y 1
- "extracted": objeto con datos extraidos del mensaje, como { "date": "...", "service": "...", "name": "..." }

Ejemplos:
- "quiero reservar un turno para manana" -> { "intent": "book", "confidence": 0.95, "extracted": { "date": "manana" } }
- "cancelar mi turno del viernes" -> { "intent": "cancel", "confidence": 0.9, "extracted": { "date": "viernes" } }
- "que turnos tengo?" -> { "intent": "query", "confidence": 0.85, "extracted": {} }
- "hola" -> { "intent": "other", "confidence": 0.8, "extracted": {} }`,
                    },
                    { role: 'user', content: messageText },
                ],
                max_tokens: 150,
                temperature: 0.1,
            }),
        });

        if (!response.ok) {
            console.error('[turnos-openai] API error:', response.status);
            return parseIntentFallback(messageText);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        try {
            return JSON.parse(content.trim());
        } catch {
            console.error('[turnos-openai] Failed to parse JSON:', content);
            return parseIntentFallback(messageText);
        }
    } catch (err) {
        console.error('[turnos-openai] Fetch error:', err.message);
        return parseIntentFallback(messageText);
    }
}

/**
 * Genera una respuesta conversacional para el bot de turnos.
 *
 * @param {Object} options
 * @param {string} options.context
 * @param {string} options.userMessage
 * @param {string} [options.businessName='']
 * @returns {Promise<string|null>}
 */
export async function generateConversationalResponse({ context, userMessage, businessName = '' } = {}) {
    const creds = await resolveOpenAICredentials();
    if (!creds) {
        return null; // El controller usara la logica por defecto
    }

    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${creds.apiKey}`,
            },
            body: JSON.stringify({
                model: creds.model,
                messages: [
                    {
                        role: 'system',
                        content: `Sos un asistente de turnos${businessName ? ` de ${businessName}` : ''} por WhatsApp.
Tu rol es ayudar al usuario a reservar, cancelar o consultar turnos de forma conversacional.
Sé breve, amigable y usa español argentino.
Contexto actual: ${context}`,
                    },
                    { role: 'user', content: userMessage },
                ],
                max_tokens: 200,
                temperature: 0.7,
            }),
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.choices?.[0]?.message?.content || null;
    } catch (err) {
        console.error('[turnos-openai] Conversational error:', err.message);
        return null;
    }
}

/**
 * Ping minimo para probar si la API key configurada es valida.
 */
export async function testOpenAICredentials() {
    const creds = await resolveOpenAICredentials();
    if (!creds) {
        return { ok: false, error: 'OpenAI no esta configurado' };
    }
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${creds.apiKey}` },
        });
        if (!response.ok) {
            return { ok: false, error: `OpenAI respondio ${response.status}` };
        }
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

/**
 * Fallback para detectar intent sin IA
 */
function parseIntentFallback(text) {
    const lower = text.toLowerCase();

    if (lower.includes('turno') || lower.includes('reservar') || lower.includes('cita') || lower.includes('agendar')) {
        return { intent: 'book', confidence: 0.7, extracted: {} };
    }
    if (lower.includes('cancelar')) {
        return { intent: 'cancel', confidence: 0.7, extracted: {} };
    }
    if (lower.includes('mis turnos') || lower.includes('tengo turno') || lower.includes('consultar')) {
        return { intent: 'query', confidence: 0.6, extracted: {} };
    }

    return { intent: 'other', confidence: 0.5, extracted: {} };
}
