import { connection } from "@/utils/connection";
import { NextResponse } from "next/server";
import config from '@/config/config';

const { AUTH_API_URL } = config;

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        // Validar credenciales en auth
        const authRes = await connection({ method: 'POST', url: `${AUTH_API_URL}/auth/login`, data: { email, password } });
        if (authRes.status <= 0) {
            return NextResponse.json(authRes, { status: authRes.internal_code ?? 401 });
        }

        return NextResponse.json(authRes);

    } catch (error) {
        console.error('login', { error });
        return NextResponse.json({ status: 0, message: 'Error al intentar iniciar sesión' }, { status: 502 });
    }
}
