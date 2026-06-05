import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import * as ctrl from '../../controllers/waitlist/waitlist.js';

const router = Router();

router.get('/', validateToken, ctrl.list);
router.post('/', validateToken, ctrl.create);
router.put('/:id', validateToken, ctrl.update);
router.delete('/:id', validateToken, ctrl.del);
router.put('/:id/notify', validateToken, ctrl.notify);

export default router;
