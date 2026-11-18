import { Router } from "express";
import catalogRouter from '../modules/catalog/catalog.routes.js';
import ordersRouter from '../modules/orders/orders.routes.js';
import paymentsRouter from '../modules/payments/payments.routes.js';
import db from '../config/database.js';
import { metrics, withSpan } from '../shared/observability.js';

const router = Router();

router.get('/health' , (req,res)=>{
    res.status(200).json({"status":"OK"});
});

router.use('/produtos' , catalogRouter)
router.use('/pedidos', ordersRouter);
router.use('/pagamentos', paymentsRouter);
router.get('/ready', async (req, res) => {
    try { await withSpan('mysql.readiness', () => db.raw('SELECT 1')); res.json({ status: 'OK' }); }
    catch { res.status(503).json({ status: 'unavailable' }); }
});
router.get('/metrics', (req, res) => res.type('text/plain; version=0.0.4').send(metrics()));


export default router;

