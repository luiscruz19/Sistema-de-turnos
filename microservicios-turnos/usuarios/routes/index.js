import { Router } from 'express';
import administrators from './administrator/index.js';

const api = Router();

api.use('/administrators', [], administrators);

export default api;
