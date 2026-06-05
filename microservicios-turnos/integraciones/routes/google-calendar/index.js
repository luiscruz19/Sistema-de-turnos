import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import * as ctrl from '../../controllers/google-calendar/google-calendar.js';

const router = Router();

router.get('/authorize', validateToken, ctrl.authorize);
router.post('/disconnect', validateToken, ctrl.disconnect);
router.get('/sync-status', validateToken, ctrl.getSyncStatus);
router.post('/pull', validateToken, ctrl.runPull);

export default router;
