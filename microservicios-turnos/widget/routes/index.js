import { Router } from 'express';
import widgetRoutes from './widget-public/index.js';

const api = Router();

api.use('/widget', widgetRoutes);

export default api;
