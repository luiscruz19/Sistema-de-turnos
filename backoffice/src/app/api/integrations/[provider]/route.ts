import { NextRequest, NextResponse } from "next/server";
import { not_auth } from "@/types/connection";
import { serviceRequest } from "@/utils/connection-service";
import { getRequestHeaders } from "@/utils/request-headers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
    const { provider } = await params;
    try {
        const h = getRequestHeaders(request);
        if (!h.token) return NextResponse.json(not_auth, { status: 401 });

        const response = await serviceRequest({
            method: 'GET',
            path: `/integrations/${provider}`,
            token: h.token,
        });
        return NextResponse.json(response, { status: response.status > 0 ? 200 : 400 });
    } catch (error) {
        console.error('integration GET', { error });
        return NextResponse.json({ status: 0, message: 'Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
    const { provider } = await params;
    try {
        const h = getRequestHeaders(request);
        if (!h.token) return NextResponse.json(not_auth, { status: 401 });

        const response = await serviceRequest({
            method: 'DELETE',
            path: `/integrations/${provider}`,
            token: h.token,
        });
        return NextResponse.json(response, { status: response.status > 0 ? 200 : 400 });
    } catch (error) {
        console.error('integration DELETE', { error });
        return NextResponse.json({ status: 0, message: 'Error' }, { status: 500 });
    }
}
