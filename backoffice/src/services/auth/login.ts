import config from '@/config/config';
import { connection } from '@/utils/connection';

const { basePath } = config;

export default async function loginService({ email, password }: { email: string; password: string }) {
    try {
        return await connection({ method: 'POST', url: `${basePath}/api/auth/login`, data: { email, password } });
    } catch (error: any) {
        throw new Error(error.toString());
    }
}
