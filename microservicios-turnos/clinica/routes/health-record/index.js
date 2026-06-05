import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import * as ctrl from '../../controllers/health-record/health-record.js';

const router = Router();

router.get('/:client_contact_id', validateToken, ctrl.get);
router.put('/:client_contact_id', validateToken, ctrl.updateRecord);
router.post('/:client_contact_id/notes', validateToken, ctrl.createNote);
router.put('/notes/:note_id', validateToken, ctrl.updateNote);
router.delete('/notes/:note_id', validateToken, ctrl.deleteNote);
router.post('/:client_contact_id/attachments', validateToken, ctrl.createAttachment);
router.delete('/attachments/:attachment_id', validateToken, ctrl.deleteAttachment);

export default router;
