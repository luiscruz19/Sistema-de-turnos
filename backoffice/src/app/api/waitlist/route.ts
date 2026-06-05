import { NextRequest, NextResponse } from "next/server";
import { not_auth } from "@/types/connection";
import { serviceRequest } from "@/utils/connection-service";
import { getRequestHeaders } from "@/utils/request-headers";

export async function GET(request: NextRequest) {
    try {
        const h = getRequestHeaders(request);
        if (!h.token) return NextResponse.json(not_auth, { status: 401 });

        const { searchParams } = new URL(request.url);
        const params: Record<string, string> = {};
        for (const [key, value] of searchParams.entries()) { params[key] = value; }

        const response = await serviceRequest({
            method: 'GET',
            path: '/waitlist',
            params,
            token: h.token,
        });
        return NextResponse.json(response, { status: response.status > 0 ? 200 : 400 });
    } catch (error) {
        console.error('waitlist GET', { error });
        return NextResponse.json({ status: 0, message: 'Error al obtener lista de espera' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const h = getRequestHeaders(request);
        if (!h.token) return NextResponse.json(not_auth, { status: 401 });

        const data = await request.json();
        const response = await serviceRequest({
            method: 'POST',
            path: '/waitlist',
            data,
            token: h.token,
        });
        return NextResponse.json(response, { status: response.status > 0 ? 201 : 400 });
    } catch (error) {
        console.error('waitlist POST', { error });
        return NextResponse.json({ status: 0, message: 'Error al agregar a lista de espera' }, { status: 500 });
    }
}
