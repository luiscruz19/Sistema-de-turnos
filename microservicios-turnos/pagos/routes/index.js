import { Router } from 'express';
import paymentRoutes from './payment/index.js';

const api = Router();

api.use('/payments', paymentRoutes);

export default api;
