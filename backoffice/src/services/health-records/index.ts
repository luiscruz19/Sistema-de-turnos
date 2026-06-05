import config from '@/config/config';
import { connection } from '@/utils/connection';
import { apiHeaders } from '@/utils/api-headers';

const { basePath } = config;

export async function getHealthRecordService({ clientId, token }: { clientId: number; token: string }) {
    const headers = apiHeaders(token);
    return connection({ method: 'GET', url: `${basePath}/api/health-records/${clientId}`, headers });
}

export async function updateHealthRecordService({
    clientId,
    data,
    token,
}: {
    clientId: number;
    data: Record<string, unknown>;
    token: string;
}) {
    const headers = apiHeaders(token);
    return connection({ method: 'PUT', url: `${basePath}/api/health-records/${clientId}`, headers, data });
}

export async function addNoteService({
    clientId,
    content,
    is_private,
    token,
}: {
    clientId: number;
    content: string;
    is_private: boolean;
    token: string;
}) {
    const headers = apiHeaders(token);
    return connection({
        method: 'POST',
        url: `${basePath}/api/health-records/${clientId}/notes`,
        headers,
        data: { content, is_private },
    });
}

export async function deleteNoteService({ noteId, token }: { noteId: number; token: string }) {
    const headers = apiHeaders(token);
    return connection({
        method: 'DELETE',
        url: `${basePath}/api/health-records/notes/${noteId}`,
        headers,
    });
}

export async function addAttachmentService({
    clientId,
    file_url,
    file_name,
    token,
}: {
    clientId: number;
    file_url: string;
    file_name: string;
    token: string;
}) {
    const headers = apiHeaders(token);
    return connection({
        method: 'POST',
        url: `${basePath}/api/health-records/${clientId}/attachments`,
        headers,
        data: { file_url, file_name },
    });
}
