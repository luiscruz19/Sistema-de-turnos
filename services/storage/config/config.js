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
        OUTPUT_FORMAT: process.env.STORAGE_OUTPUT_FORMAT || 'webp',
        MAX_WIDTH: parseInt(process.env.STORAGE_MAX_WIDTH) || 1920,
        QUALITY: parseInt(process.env.STORAGE_QUALITY) || 85,
        THUMBNAIL_WIDTH: parseInt(process.env.STORAGE_THUMBNAIL_WIDTH) || 300,
        THUMBNAIL_HEIGHT: parseInt(process.env.STORAGE_THUMBNAIL_HEIGHT) || 300,
    },
    SECURITY: {
        AV_SCAN: process.env.STORAGE_ENABLE_AV_SCAN === 'true',
        AV_FAIL_CLOSED: process.env.STORAGE_AV_FAIL_CLOSED !== 'false',
        ENABLE_QR: process.env.STORAGE_ENABLE_QR === 'true',
        BLOCKED_MIME_TYPES: (process.env.STORAGE_BLOCKED_MIME_TYPES || '').split(',').filter(Boolean),
        BLOCKED_EXTENSIONS: (process.env.STORAGE_BLOCKED_EXTENSIONS || '.php,.exe,.sh,.bat').split(',').filter(Boolean),
    },
    MICROSERVICES_URL: {
        USUARIOS: process.env.USUARIOS_API_URL || process.env.ADMINISTRADORES_API_URL,
    },
    SECRET_KEY: process.env.SECRET_KEY || 'token',
};

export default CONFIG;
