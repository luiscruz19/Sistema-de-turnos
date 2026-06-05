import axios from 'axios';

const AUTH_BASIC_USER = process.env.AUTH_BASIC_USER || '';
const AUTH_BASIC_PW = process.env.AUTH_BASIC_PW || '';

const basicAuth = Buffer.from(`${AUTH_BASIC_USER}:${AUTH_BASIC_PW}`).toString('base64');

const normalizePath = (path: string) => {
    // Compatibilidad retro: los API routes del backoffice usan sufijo /admins.
    let normalizedPath = path.replace(/\/admins(?=\/|$)/, '');

    // Compatibilidad de naming legado en clientes.
    normalizedPath = normalizedPath.replace('/client-contacts', '/clients');

    return normalizedPath;
};

/**
 * Resuelve qué URL de microservicio usar según el path del request.
 * Cada dominio funcional tiene su propio contenedor.
 */
function resolveMsUrl(path: string): string {
    const normalizedPath = normalizePath(path);

    if (normalizedPath.startsWith('/payments')) {
        return process.env.TURNOS_MS_PAGOS_URL || 'http://turnos_ms_pagos';
    }
    if (normalizedPath.startsWith('/health-records')) {
        return process.env.TURNOS_MS_CLINICA_URL || 'http://turnos_ms_clinica';
    }
    if (
        normalizedPath.startsWith('/integrations') ||
        normalizedPath.startsWith('/google') ||
        normalizedPath.startsWith('/webhooks/whatsapp')
    ) {
        return process.env.TURNOS_MS_INTEGRACIONES_URL || 'http://turnos_ms_integraciones';
    }
    if (normalizedPath.startsWith('/widget')) {
        return process.env.TURNOS_MS_WIDGET_URL || 'http://turnos_ms_widget';
    }
    // appointments, availability, professionals, services, schedules,
    // schedule-exceptions, clients, analytics, business-config, google
    return process.env.TURNOS_MS_AGENDA_URL || 'http://turnos_ms_agenda';
}

/**
 * Conexion autenticada hacia el microservicio de turnos correspondiente (server-side).
 * Usa Basic Auth + el token del usuario.
 * Resuelve automáticamente la URL del MS a partir del path del request.
 */
export async function serviceRequest({
    method = 'GET',
    path,
    data,
    params,
    token,
    msUrl,
}: {
    method?: string;
    path: string;
    data?: Record<string, unknown>;
    params?: Record<string, string>;
    token?: string;
    /** URL base del MS. Si se omite, se resuelve automáticamente desde el path. */
    msUrl?: string;
}) {
    const baseUrl = msUrl || resolveMsUrl(path);

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Basic ${basicAuth}`,
    };

    if (token) {
        headers.token = token;
    }

    try {
        const response = await axios({
            method,
            url: `${baseUrl}${normalizePath(path)}`,
            headers,
            data,
            params,
        });
        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            return error.response?.data ?? { status: 0, message: 'Error en la conexion con el microservicio de turnos' };
        }
        return { status: 0, message: 'Error desconocido' };
    }
}
