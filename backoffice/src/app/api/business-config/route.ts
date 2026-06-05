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
            path: '/business-config/admins',
            token: h.token,
        });
        return NextResponse.json(response, { status: response.status > 0 ? 200 : 400 });
    } catch (error) {
        console.error('business-config GET', { error });
        return NextResponse.json({ status: 0, message: 'Error al obtener configuracion' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const h = getRequestHeaders(request);
        if (!h.token) return NextResponse.json(not_auth, { status: 401 });

        const data = await request.json();
        const response = await serviceRequest({
            method: 'PUT',
            path: '/business-config/admins',
            data,
            token: h.token,
        });
        return NextResponse.json(response, { status: response.status > 0 ? 200 : 400 });
    } catch (error) {
        console.error('business-config PUT', { error });
        return NextResponse.json({ status: 0, message: 'Error al actualizar configuracion' }, { status: 500 });
    }
}
