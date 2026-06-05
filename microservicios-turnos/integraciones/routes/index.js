import { Router } from 'express';
import googleRoutes from './google-calendar/index.js';
import whatsappRoutes from './whatsapp-bot/index.js';

const api = Router();

api.use('/google', googleRoutes);
api.use('/webhooks', whatsappRoutes);

export default api;
