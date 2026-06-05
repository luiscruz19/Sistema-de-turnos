import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import * as ctrl from '../../controllers/appointment/appointment.js';

const router = Router();

router.get('/', validateToken, ctrl.list);
router.get('/:id', validateToken, ctrl.getById);
router.post('/', validateToken, ctrl.create);
router.put('/:id', validateToken, ctrl.update);
router.delete('/:id', validateToken, ctrl.cancel);
router.patch('/:id/cancel', validateToken, ctrl.cancel);
router.put('/:id/cancel', validateToken, ctrl.cancel);
router.patch('/:id/confirm', validateToken, ctrl.confirm);
router.put('/:id/confirm', validateToken, ctrl.confirm);
router.patch('/:id/complete', validateToken, ctrl.complete);
router.put('/:id/complete', validateToken, ctrl.complete);
router.patch('/:id/no-show', validateToken, ctrl.noShow);
router.put('/:id/no-show', validateToken, ctrl.noShow);

export default router;
