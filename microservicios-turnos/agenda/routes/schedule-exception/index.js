import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import * as ctrl from '../../controllers/schedule/schedule.js';

const router = Router();

router.get('/', validateToken, ctrl.listExceptions);
router.post('/', validateToken, ctrl.createException);
router.put('/:id', validateToken, ctrl.updateException);
router.delete('/:id', validateToken, ctrl.removeException);

export default router;
