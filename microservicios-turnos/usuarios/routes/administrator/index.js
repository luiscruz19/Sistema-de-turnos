import { Router } from 'express';
import validateToken from '../../middlewares/validate-token.js';
import { searchByUserId } from '../../controllers/administrator/administrator.js';

const router = Router();

// GET /administrators/get-by-user-id/:user_id
router.get('/get-by-user-id/:user_id', validateToken, searchByUserId);

export default router;
