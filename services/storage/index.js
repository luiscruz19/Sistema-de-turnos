import app from './www/app.js';
import { CONFIG } from './config/config.js';
import logger from './utils/logger.js';

const PORT = CONFIG.APP.PORT;

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason: String(reason) });
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { name: err?.name, message: err?.message });
    process.exit(1);
});

const server = app.listen(PORT, () => {
    logger.info('');
    logger.info('-'.repeat(80));
    logger.info(`Storage service running on port ${PORT}`);
    logger.info(`Route prefix: ${CONFIG.APP.INITIAL_ROUTE}`);
    logger.info(`Environment: ${CONFIG.APP.NODE_ENV}`);
    logger.info('-'.repeat(80));
});

const shutdown = () => {
    logger.info('Shutting down gracefully...');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
