import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import * as ctrl from '../../controllers/group-class/group-class.js';

const router = Router();

router.get('/', validateToken, ctrl.list);
router.post('/', validateToken, ctrl.create);
router.get('/:id', validateToken, ctrl.getById);
router.put('/:id', validateToken, ctrl.update);
router.delete('/:id', validateToken, ctrl.del);
router.post('/:id/enroll', validateToken, ctrl.enroll);
router.delete('/:id/enroll/:enrollment_id', validateToken, ctrl.cancelEnrollment);
router.patch('/:id/enroll/:enrollment_id/attendance', validateToken, ctrl.markAttendance);
router.put('/:id/enroll/:enrollment_id/attendance', validateToken, ctrl.markAttendance);

export default router;
