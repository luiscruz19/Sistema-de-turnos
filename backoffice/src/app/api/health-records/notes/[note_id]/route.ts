import { NextRequest, NextResponse } from "next/server";
import { not_auth } from "@/types/connection";
import { serviceRequest } from "@/utils/connection-service";
import { getRequestHeaders } from "@/utils/request-headers";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ note_id: string }> }) {
    const { note_id } = await params;
    try {
        const h = getRequestHeaders(request);
        if (!h.token) return NextResponse.json(not_auth, { status: 401 });

        const data = await request.json();
        const response = await serviceRequest({
            method: 'PUT',
            path: `/health-records/notes/${note_id}`,
            data,
            token: h.token,
        });
        return NextResponse.json(response, { status: response.status > 0 ? 200 : 400 });
    } catch (error) {
        console.error('note PUT', { error });
        return NextResponse.json({ status: 0, message: 'Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ note_id: string }> }) {
    const { note_id } = await params;
    try {
        const h = getRequestHeaders(request);
        if (!h.token) return NextResponse.json(not_auth, { status: 401 });

        const response = await serviceRequest({
            method: 'DELETE',
            path: `/health-records/notes/${note_id}`,
            token: h.token,
        });
        return NextResponse.json(response, { status: response.status > 0 ? 200 : 400 });
    } catch (error) {
        console.error('note DELETE', { error });
        return NextResponse.json({ status: 0, message: 'Error' }, { status: 500 });
    }
}
