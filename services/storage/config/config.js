import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
    AUTHORIZATION: {
        USER: process.env.AUTH_BASIC_USER,
        PASSWORD: process.env.AUTH_BASIC_PW,
    },
    MINIO: {
        ENDPOINT: process.env.MINIO_ENDPOINT || 'minio',
        PORT: parseInt(process.env.MINIO_ENDPOINT_PORT) || 9000,
        ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
        SECRET_KEY: process.env.MINIO_SECRET_KEY,
        BUCKET: process.env.MINIO_BUCKET_NAME,
        USE_SSL: process.env.MINIO_USE_SSL === 'true',
        PRIVATE_URL: process.env.MINIO_PRIVATE_URL || '',
    },
    APP: {
        PORT: parseInt(process.env.MINIO_APP_PORT) || 80,
        INITIAL_ROUTE: process.env.MINIO_INITIAL_ROUTE || '/storage',
        NODE_ENV: process.env.NODE_ENV || 'development',
    },
    UPLOAD: {
        MAX_SIZE_MB: parseInt(process.env.STORAGE_MAX_SIZE_MB) || 500,
    },
    SECURITY: {
        BLOCKED_MIME_TYPES: (process.env.STORAGE_BLOCKED_MIME_TYPES || '').split(',').filter(Boolean),
        BLOCKED_EXTENSIONS: (process.env.STORAGE_BLOCKED_EXTENSIONS || '.php,.exe,.sh,.bat').split(',').filter(Boolean),
    },
    MICROSERVICES_URL: {
        USUARIOS: process.env.USUARIOS_API_URL || process.env.ADMINISTRADORES_API_URL,
    },
    SECRET_KEY: process.env.SECRET_KEY || 'token',
};

export default CONFIG;
