import { Router } from 'express';
import { criar, buscar } from './payments.controller.js';
const router = Router();
router.post('/', criar);
router.get('/:id', buscar);
export default router;
