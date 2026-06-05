import config from '@/config/config';
import { connection } from '@/utils/connection';
import { apiHeaders } from '@/utils/api-headers';

const { basePath } = config;

export default async function validateTokenService({ token }: { token: string }) {
    try {
        return await connection({ method: 'POST', url: `${basePath}/api/auth/validate-token`, headers: apiHeaders(token) });
    } catch (error: any) {
        throw new Error(error.toString());
    }
}
