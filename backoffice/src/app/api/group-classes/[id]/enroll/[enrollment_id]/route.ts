import { NextRequest, NextResponse } from "next/server";
import { not_auth } from "@/types/connection";
import { serviceRequest } from "@/utils/connection-service";
import { getRequestHeaders } from "@/utils/request-headers";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; enrollment_id: string }> }
) {
    const { id, enrollment_id } = await params;
    try {
        const h = getRequestHeaders(request);
        if (!h.token) return NextResponse.json(not_auth, { status: 401 });

        const response = await serviceRequest({
            method: 'DELETE',
            path: `/group-classes/${id}/enroll/${enrollment_id}`,
            token: h.token,
        });
        return NextResponse.json(response, { status: response.status > 0 ? 200 : 400 });
    } catch (error) {
        console.error('group-classes enroll DELETE', { error });
        return NextResponse.json({ status: 0, message: 'Error al quitar inscripcion de clase' }, { status: 500 });
    }
}
