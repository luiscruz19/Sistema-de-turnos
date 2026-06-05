import { Router } from 'express';
import healthRecordRoutes from './health-record/index.js';

const api = Router();

api.use('/health-records', healthRecordRoutes);

export default api;
