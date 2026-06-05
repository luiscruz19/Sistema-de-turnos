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
            path: '/integrations',
            token: h.token,
        });
        return NextResponse.json(response, { status: response.status > 0 ? 200 : 400 });
    } catch (error) {
        console.error('integrations GET', { error });
        return NextResponse.json({ status: 0, message: 'Error al listar integraciones' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const h = getRequestHeaders(request);
        if (!h.token) return NextResponse.json(not_auth, { status: 401 });

        const data = await request.json();
        const response = await serviceRequest({
            method: 'PUT',
            path: '/integrations',
            data,
            token: h.token,
        });
        return NextResponse.json(response, { status: response.status > 0 ? 200 : 400 });
    } catch (error) {
        console.error('integrations PUT', { error });
        return NextResponse.json({ status: 0, message: 'Error al guardar integracion' }, { status: 500 });
    }
}
