import { criarPagamento, obterPagamento } from './payments.service.js';
export async function criar(req, res) {
    const result = await criarPagamento(req.body, req.get('Idempotency-Key'));
    res.status(result.replay ? 200 : 202).location(`/pagamentos/${result.pagamento.id}`).json(result.pagamento);
}
export async function buscar(req, res) { res.json(await obterPagamento(Number(req.params.id))); }
