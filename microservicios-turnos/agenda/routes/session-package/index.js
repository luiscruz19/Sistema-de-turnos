import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import * as ctrl from '../../controllers/session-package/session-package.js';

const router = Router();

router.get('/', validateToken, ctrl.list);
router.post('/', validateToken, ctrl.create);
// Ruta de clientes debe ir antes de /:id para no ser capturada por el param
router.get('/clients/:client_id/packages', validateToken, ctrl.listClientPackages);
router.post('/assign', validateToken, ctrl.assignPackage);
router.get('/:id', validateToken, ctrl.getById);
router.put('/:id', validateToken, ctrl.update);
router.delete('/:id', validateToken, ctrl.del);

export default router;
