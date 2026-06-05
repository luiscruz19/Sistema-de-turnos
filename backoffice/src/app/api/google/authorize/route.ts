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
        for (const [k, v] of searchParams.entries()) params[k] = v;

        const response = await serviceRequest({
            method: 'GET',
            path: '/google/authorize',
            params,
            token: h.token,
        });
        return NextResponse.json(response, { status: response.status > 0 ? 200 : 400 });
    } catch (error) {
        console.error('google authorize', { error });
        return NextResponse.json({ status: 0, message: 'Error' }, { status: 500 });
    }
}
