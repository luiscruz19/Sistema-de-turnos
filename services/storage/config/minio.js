import * as Minio from 'minio';
import { CONFIG } from './config.js';
import logger from '../utils/logger.js';

const { ENDPOINT, PORT, ACCESS_KEY, SECRET_KEY, BUCKET, USE_SSL } = CONFIG.MINIO;

// Log only safe fields — never log credentials.
logger.info('Initialising MinIO client', { endpoint: ENDPOINT, port: PORT, bucket: BUCKET, useSSL: USE_SSL });

const minioClient = new Minio.Client({
    endPoint:  ENDPOINT,
    port:      PORT,
    useSSL:    USE_SSL,
    accessKey: ACCESS_KEY,
    secretKey: SECRET_KEY,
});

// Ensure the configured bucket exists — create it if not.
minioClient.bucketExists(BUCKET, (err, exists) => {
    if (err) {
        logger.error('MinIO bucketExists check failed', { bucket: BUCKET, code: err?.code });
        return;
    }
    if (!exists) {
        minioClient.makeBucket(BUCKET, '', (mkErr) => {
            if (mkErr) {
                logger.error('MinIO makeBucket failed', { bucket: BUCKET, code: mkErr?.code });
                return;
            }
            logger.info('MinIO bucket created', { bucket: BUCKET });
        });
    } else {
        logger.info('MinIO bucket ready', { bucket: BUCKET });
    }
});

export default minioClient;
