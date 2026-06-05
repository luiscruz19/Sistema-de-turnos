import { Router } from 'express';
import uploadRoutes from './api/upload.routes.js';

const api = Router();

api.use('/', uploadRoutes);

export default api;
