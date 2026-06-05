import { Router } from 'express';
import appointmentRoutes from './appointment/index.js';
import availabilityRoutes from './availability/index.js';
import professionalRoutes from './professional/index.js';
import serviceRoutes from './service/index.js';
import scheduleRoutes from './schedule/index.js';
import scheduleExceptionRoutes from './schedule-exception/index.js';
import clientContactRoutes from './client-contact/index.js';
import analyticsRoutes from './analytics/index.js';
import businessConfigRoutes from './business-config/index.js';
import googleRoutes from './google-calendar/index.js';
import whatsappRoutes from './whatsapp-bot/index.js';
import intakeFormRoutes from './intake-form/index.js';
import sessionPackageRoutes from './session-package/index.js';
import waitlistRoutes from './waitlist/index.js';
import groupClassRoutes from './group-class/index.js';

const api = Router();

api.use('/appointments', appointmentRoutes);
api.use('/availability', availabilityRoutes);
api.use('/professionals', professionalRoutes);
api.use('/services', serviceRoutes);
api.use('/schedules', scheduleRoutes);
api.use('/schedule-exceptions', scheduleExceptionRoutes);
api.use('/clients', clientContactRoutes);
api.use('/analytics', analyticsRoutes);
api.use('/business-config', businessConfigRoutes);
api.use('/google', googleRoutes);
api.use('/webhooks', whatsappRoutes);
api.use('/intake-forms', intakeFormRoutes);
api.use('/session-packages', sessionPackageRoutes);
api.use('/waitlist', waitlistRoutes);
api.use('/group-classes', groupClassRoutes);

export default api;
