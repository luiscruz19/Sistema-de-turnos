import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import * as ctrl from '../../controllers/intake-form/intake-form.js';

const router = Router();

router.get('/', validateToken, ctrl.list);
router.post('/', validateToken, ctrl.create);
router.get('/:id', validateToken, ctrl.getById);
router.put('/:id', validateToken, ctrl.update);
router.delete('/:id', validateToken, ctrl.del);
router.post('/:form_id/responses', validateToken, ctrl.submitResponse);

export default router;
