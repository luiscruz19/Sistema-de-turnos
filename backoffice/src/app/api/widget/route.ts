/**
 * BFF público para el widget de reservas.
 * No requiere token de usuario, solo api_key.
 * Proxy hacia /widget/* del microservicio de turnos.
 */
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const TURNOS_API_URL = process.env.TURNOS_MS_WIDGET_URL || 'http://turnos_ms_widget';
const AUTH_BASIC_USER = process.env.AUTH_BASIC_USER || '';
const AUTH_BASIC_PW = process.env.AUTH_BASIC_PW || '';
const basicAuth = Buffer.from(`${AUTH_BASIC_USER}:${AUTH_BASIC_PW}`).toString('base64');

async function proxyRequest(path: string, method: string, apiKey: string, body?: unknown, params?: Record<string, string>) {
    try {
        const response = await axios({
            method,
            url: `${TURNOS_API_URL}${path}`,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${basicAuth}`,
                'x-api-key': apiKey,
            },
            data: body,
            params,
        });
        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            return error.response?.data ?? { status: 0, message: 'Error en el servicio de turnos' };
        }
        return { status: 0, message: 'Error desconocido' };
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('api_key') || request.headers.get('x-api-key') || '';
    const endpoint = searchParams.get('endpoint') || 'config';
    const params: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
        if (key !== 'api_key' && key !== 'endpoint') params[key] = value;
    }

    if (!apiKey) return NextResponse.json({ status: 0, message: 'api_key requerida' }, { status: 400 });

    const data = await proxyRequest(`/widget/${endpoint}`, 'GET', apiKey, undefined, params);
    return NextResponse.json(data, { status: data.status > 0 ? 200 : 400 });
}

export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('api_key') || request.headers.get('x-api-key') || '';
    const endpoint = searchParams.get('endpoint') || 'book';

    if (!apiKey) return NextResponse.json({ status: 0, message: 'api_key requerida' }, { status: 400 });

    const body = await request.json();
    const data = await proxyRequest(`/widget/${endpoint}`, 'POST', apiKey, body);
    return NextResponse.json(data, { status: data.status > 0 ? 200 : 400 });
}
