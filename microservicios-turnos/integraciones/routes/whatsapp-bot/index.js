import { Router } from 'express';
import * as ctrl from '../../controllers/whatsapp-bot/whatsapp-bot.js';

const router = Router();

// Sin auth: verificacion por webhook
router.post('/whatsapp', ctrl.handleIncoming);

export default router;
