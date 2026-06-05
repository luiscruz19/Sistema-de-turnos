import { connection } from "@/utils/connection";
import { NextResponse } from "next/server";
import config from '@/config/config';

const { AUTH_API_URL } = config;
const TURNOS_MS_USUARIOS_URL = process.env.TURNOS_MS_USUARIOS_URL || 'http://turnos_ms_usuarios';

export async function POST(request: Request) {
    try {
        const token = request.headers.get('token');
        if (!token) {
            return NextResponse.json({ status: 0, message: 'No se encontró el token' }, { status: 401 });
        }

        // 1. Validar token en auth
        const response = await connection({ method: 'GET', url: `${AUTH_API_URL}/auth/validate-token`, headers: { token } });
        if (response.status <= 0) {
            return NextResponse.json(response, { status: response.internal_code ?? 401 });
        }

        const { id: userId, email } = response.user;

        // 2. Fetch admin record para incluir type/name en el payload
        let adminData: Record<string, unknown> = {};
        try {
            const adminRes = await connection({
                method: 'GET',
                url: `${TURNOS_MS_USUARIOS_URL}/system/administrators/get-by-user-id/${userId}`,
                headers: { token },
            });
            if (adminRes.status === 1 && adminRes.data) {
                adminData = adminRes.data;
            }
        } catch {
            // Non-critical: continue without admin data
        }

        return NextResponse.json({
            status: 1,
            message: 'Tu sesión es válida y está activa.',
            internal_code: 200,
            data: { id: userId, email, type: adminData.type || 'internal', ...adminData },
        });

    } catch (error) {
        console.error('validate-token', { error });
        return NextResponse.json({ status: 0, message: 'Error al intentar validar el token' }, { status: 502 });
    }
}
