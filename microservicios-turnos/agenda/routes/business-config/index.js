import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import * as ctrl from '../../controllers/business-config/business-config.js';

const router = Router();

router.get('/', validateToken, ctrl.get);
router.put('/', validateToken, ctrl.update);

export default router;
