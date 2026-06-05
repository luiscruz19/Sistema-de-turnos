import { NextRequest, NextResponse } from "next/server";
import { not_auth } from "@/types/connection";
import { serviceRequest } from "@/utils/connection-service";
import { getRequestHeaders } from "@/utils/request-headers";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const h = getRequestHeaders(request);
        if (!h.token) return NextResponse.json(not_auth, { status: 401 });

        const response = await serviceRequest({
            method: 'GET',
            path: `/group-classes/${id}`,
            token: h.token,
        });
        return NextResponse.json(response, { status: response.status > 0 ? 200 : 400 });
    } catch (error) {
        console.error('group-classes GET by id', { error });
        return NextResponse.json({ status: 0, message: 'Error al obtener clase grupal' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const h = getRequestHeaders(request);
        if (!h.token) return NextResponse.json(not_auth, { status: 401 });

        const data = await request.json();
        const response = await serviceRequest({
            method: 'PUT',
            path: `/group-classes/${id}`,
            data,
            token: h.token,
        });
        return NextResponse.json(response, { status: response.status > 0 ? 200 : 400 });
    } catch (error) {
        console.error('group-classes PUT', { error });
        return NextResponse.json({ status: 0, message: 'Error al actualizar clase grupal' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const h = getRequestHeaders(request);
        if (!h.token) return NextResponse.json(not_auth, { status: 401 });

        const response = await serviceRequest({
            method: 'DELETE',
            path: `/group-classes/${id}`,
            token: h.token,
        });
        return NextResponse.json(response, { status: response.status > 0 ? 200 : 400 });
    } catch (error) {
        console.error('group-classes DELETE', { error });
        return NextResponse.json({ status: 0, message: 'Error al eliminar clase grupal' }, { status: 500 });
    }
}
