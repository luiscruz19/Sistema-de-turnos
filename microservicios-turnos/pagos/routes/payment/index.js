import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import * as ctrl from '../../controllers/payment/payment.js';

const router = Router();

router.get('/', validateToken, ctrl.list);
router.get('/:id', validateToken, ctrl.getById);
router.post('/', validateToken, ctrl.createForAppointment);
router.post('/:id/refund', validateToken, ctrl.refund);

export default router;
