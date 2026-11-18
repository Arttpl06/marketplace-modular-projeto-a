import { criarPedido, obterPedido } from './orders.service.js';
export async function criar(req, res) {
    const result = await criarPedido(req.body, req.get('Idempotency-Key'));
    res.status(result.replay ? 200 : 201).location(`/pedidos/${result.pedido.id}`).json(result.pedido);
}
export async function buscar(req, res) { res.json(await obterPedido(Number(req.params.id))); }
