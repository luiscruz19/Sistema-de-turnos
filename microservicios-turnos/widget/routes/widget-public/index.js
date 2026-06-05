import { Router } from 'express';
import * as ctrl from '../../controllers/widget-public/widget-public.js';

const router = Router();

// Auth por api_key (header x-api-key o query param api_key), sin JWT
router.get('/config', ctrl.getConfig);
router.get('/availability', ctrl.getAvailability);
router.post('/book', ctrl.createBooking);

export default router;
