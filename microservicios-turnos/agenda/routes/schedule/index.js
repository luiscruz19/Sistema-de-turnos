import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import * as ctrl from '../../controllers/schedule/schedule.js';

const router = Router();

router.get('/', validateToken, ctrl.list);
router.post('/', validateToken, ctrl.create);
router.put('/:id', validateToken, ctrl.update);
router.delete('/:id', validateToken, ctrl.remove);

export default router;
