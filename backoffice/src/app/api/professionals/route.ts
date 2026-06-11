import { NextRequest, NextResponse } from "next/server";
import { not_auth } from "@/types/connection";
import { serviceRequest } from "@/utils/connection-service";
import { getRequestHeaders } from "@/utils/request-headers";

export async function GET(request: NextRequest) {
    try {
        const h = getRequestHeaders(request);
        if (!h.token) return NextResponse.json(not_auth, { status: 401 });

        const response = await serviceRequest({
            method: 'GET',
            path: '/professionals/admins',
            // Reenviar filtros/búsqueda/paginación al microservicio (server-side).
            params: Object.fromEntries(request.nextUrl.searchParams),
            token: h.token,
        });
        return NextResponse.json(response, { status: response.status > 0 ? 200 : 400 });
    } catch (error) {
        console.error('professionals GET', { error });
        return NextResponse.json({ status: 0, message: 'Error al obtener profesionales' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const h = getRequestHeaders(request);
        if (!h.token) return NextResponse.json(not_auth, { status: 401 });

        const data = await request.json();
        const response = await serviceRequest({
            method: 'POST',
            path: '/professionals/admins',
            data,
            token: h.token,
        });
        return NextResponse.json(response, { status: response.status > 0 ? 201 : 400 });
    } catch (error) {
        console.error('professionals POST', { error });
        return NextResponse.json({ status: 0, message: 'Error al crear profesional' }, { status: 500 });
    }
}
