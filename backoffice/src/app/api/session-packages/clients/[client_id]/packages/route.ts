import { NextRequest, NextResponse } from "next/server";
import { not_auth } from "@/types/connection";
import { serviceRequest } from "@/utils/connection-service";
import { getRequestHeaders } from "@/utils/request-headers";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ client_id: string }> }
) {
    const { client_id } = await params;
    try {
        const h = getRequestHeaders(request);
        if (!h.token) return NextResponse.json(not_auth, { status: 401 });

        const { searchParams } = new URL(request.url);
        const queryParams: Record<string, string> = {};
        for (const [key, value] of searchParams.entries()) { queryParams[key] = value; }

        const response = await serviceRequest({
            method: 'GET',
            path: `/session-packages/clients/${client_id}/packages`,
            params: queryParams,
            token: h.token,
        });
        return NextResponse.json(response, { status: response.status > 0 ? 200 : 400 });
    } catch (error) {
        console.error('session-packages clients GET', { error });
        return NextResponse.json({ status: 0, message: 'Error al obtener paquetes del cliente' }, { status: 500 });
    }
}
