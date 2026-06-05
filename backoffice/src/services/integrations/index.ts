import config from '@/config/config';
import { connection } from '@/utils/connection';
import { apiHeaders } from '@/utils/api-headers';

const { basePath } = config;

export async function listIntegrationsService({ token }: { token: string }) {
    const headers = apiHeaders(token);
    return connection({ method: 'GET', url: `${basePath}/api/integrations`, headers });
}

export async function getIntegrationService({ provider, token }: { provider: string; token: string }) {
    const headers = apiHeaders(token);
    return connection({ method: 'GET', url: `${basePath}/api/integrations/${provider}`, headers });
}

export async function upsertIntegrationService({
    provider,
    credentials,
    config: integrationConfig,
    enabled,
    token,
}: {
    provider: string;
    credentials: Record<string, string>;
    config: Record<string, unknown>;
    enabled: boolean;
    token: string;
}) {
    const headers = apiHeaders(token);
    return connection({
        method: 'PUT',
        url: `${basePath}/api/integrations`,
        headers,
        data: { provider, credentials, config: integrationConfig, enabled },
    });
}

export async function deleteIntegrationService({ provider, token }: { provider: string; token: string }) {
    const headers = apiHeaders(token);
    return connection({ method: 'DELETE', url: `${basePath}/api/integrations/${provider}`, headers });
}

export async function testIntegrationService({ provider, token }: { provider: string; token: string }) {
    const headers = apiHeaders(token);
    return connection({ method: 'POST', url: `${basePath}/api/integrations/${provider}/test`, headers });
}

export async function getGoogleAuthorizeUrlService({ token, professionalId }: { token: string; professionalId?: number }) {
    const headers = apiHeaders(token);
    const params = professionalId ? { professional_id: String(professionalId) } : {};
    return connection({ method: 'GET', url: `${basePath}/api/google/authorize`, headers, params });
}

export async function disconnectGoogleService({ token }: { token: string }) {
    const headers = apiHeaders(token);
    return connection({ method: 'POST', url: `${basePath}/api/google/disconnect`, headers, data: {} });
}

export async function getGoogleSyncStatusService({ token }: { token: string }) {
    const headers = apiHeaders(token);
    return connection({ method: 'GET', url: `${basePath}/api/google/sync-status`, headers });
}
