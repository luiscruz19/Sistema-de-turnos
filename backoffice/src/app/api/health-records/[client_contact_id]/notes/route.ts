import { NextRequest, NextResponse } from "next/server";
import { not_auth } from "@/types/connection";
import { serviceRequest } from "@/utils/connection-service";
import { getRequestHeaders } from "@/utils/request-headers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ client_contact_id: string }> }) {
    const { client_contact_id } = await params;
    try {
        const h = getRequestHeaders(request);
        if (!h.token) return NextResponse.json(not_auth, { status: 401 });

        const data = await request.json();
        const response = await serviceRequest({
            method: 'POST',
            path: `/health-records/${client_contact_id}/notes`,
            data,
            token: h.token,
        });
        return NextResponse.json(response, { status: response.status > 0 ? 201 : 400 });
    } catch (error) {
        console.error('health-records notes POST', { error });
        return NextResponse.json({ status: 0, message: 'Error' }, { status: 500 });
    }
}
