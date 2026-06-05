import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import * as ctrl from '../../controllers/availability/availability.js';

const router = Router();

router.get('/', validateToken, ctrl.getAvailable);

export default router;
