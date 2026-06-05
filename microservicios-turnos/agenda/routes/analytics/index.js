import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import * as ctrl from '../../controllers/analytics/analytics.js';

const router = Router();

router.get('/', validateToken, ctrl.getStats);
router.get('/dashboard', validateToken, ctrl.getDashboard);

export default router;
