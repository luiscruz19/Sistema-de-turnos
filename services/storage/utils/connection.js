import axios from 'axios';
import CONFIG from '../config/config.js';
import { errorMessage } from './messages.js';

const { AUTHORIZATION: { PASSWORD, USER }, MICROSERVICES_URL } = CONFIG;

/**
 * Internal HTTP client for inter-service calls.
 * Uses Basic Auth with this service's own credentials.
 * Resolves USUARIOS_API_URL with fallback to ADMINISTRADORES_API_URL.
 */
const connection = async ({ method, url, headers = {}, data = {}, params = {} }) => {
    try {
        const defaultHeaders = {
            'Accept-Charset': 'utf-8',
            'Authorization': 'Basic ' + Buffer.from(`${USER}:${PASSWORD}`).toString('base64'),
            'Content-Type': 'application/json',
            ...headers,
        };

        const response = await axios({ method, url, headers: defaultHeaders, data, params });

        if (response.data) {
            return response.data;
        }
        return errorMessage({ message: 'Ocurrió un error con los datos que estás enviando' });
    } catch (error) {
        return error?.response?.data ?? errorMessage({ message: 'Ocurrió un error con los datos que estás enviando' });
    }
};

/**
 * Resolved base URL for the users/admins microservice.
 * Supports both USUARIOS_API_URL and ADMINISTRADORES_API_URL env vars.
 */
export const USUARIOS_BASE_URL = MICROSERVICES_URL.USUARIOS;

export default connection;
