import config from '@/config/config';
import { connection } from '@/utils/connection';
import { apiHeaders } from '@/utils/api-headers';

const { basePath } = config;

export async function listPaymentsService({ token, params }: { token: string; params?: Record<string, string> }) {
    const headers = apiHeaders(token);
    return connection({ method: 'GET', url: `${basePath}/api/payments`, headers, params });
}

export async function getPaymentService({ id, token }: { id: number; token: string }) {
    const headers = apiHeaders(token);
    return connection({ method: 'GET', url: `${basePath}/api/payments/${id}`, headers });
}

export async function refundPaymentService({ id, token }: { id: number; token: string }) {
    const headers = apiHeaders(token);
    return connection({ method: 'POST', url: `${basePath}/api/payments/${id}/refund`, headers, data: {} });
}

export async function createPaymentForAppointmentService({
    appointment_id,
    token,
}: {
    appointment_id: number;
    token: string;
}) {
    const headers = apiHeaders(token);
    return connection({ method: 'POST', url: `${basePath}/api/payments`, headers, data: { appointment_id } });
}
