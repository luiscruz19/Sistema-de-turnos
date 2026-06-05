import axios, { AxiosRequestConfig } from 'axios';
import { requestConnection, responseConnection } from '@/types/connection';
import config from '@/config/config';

const { AUTHORIZATION: { PASSWORD, USER } } = config;

const MESSAGE_ERROR = {
    status: 0,
    message: 'No se pudo realizar la peticion'
};

export const connection = async ({ method = 'POST', url = '', headers = {}, params = {}, data = {} }: requestConnection): Promise<responseConnection> => {
    const headersDefault: Record<string, string> = {
        'Authorization': 'Basic ' + Buffer.from(USER + ":" + PASSWORD).toString('base64'),
        'Content-Type': 'application/json',
        ...headers
    };

    const axiosConfig: AxiosRequestConfig = {
        method,
        headers: headersDefault,
        url,
        params,
        data,
    };

    try {
        const response = await axios(axiosConfig);
        return response.data;
    } catch (error: any) {
        if (error.response?.data) {
            return error.response.data;
        }
        const message = error.response?.data?.message ?? error.message ?? 'Error desconocido';
        return { ...MESSAGE_ERROR, message };
    }
};
