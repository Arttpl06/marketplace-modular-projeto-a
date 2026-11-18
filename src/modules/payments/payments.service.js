import * as repository from './payments.repository.js';
import { fingerprint } from '../orders/orders.service.js';
import { AppError } from '../../shared/AppError.js';
import { objectBody, positiveId, idempotencyKey } from '../../shared/validation.js';
export async function obterPagamento(id) {
    positiveId(id);
    const row = await repository.findById(id);
    if (!row) throw new AppError('Pagamento não encontrado', 404);
    return repository.publicPayment(row);
}
export async function criarPagamento(body, key) {
    objectBody(body, ['pedido_id', 'resultado']);
    if (!Number.isSafeInteger(body.pedido_id) || body.pedido_id <= 0 || !['aprovado', 'recusado'].includes(body.resultado)) throw new AppError('Pagamento inválido', 400);
    const chave = idempotencyKey(key);
    const hash = fingerprint({ pedido_id: body.pedido_id, resultado: body.resultado });
    const replay = row => {
        if (row.hash !== hash) throw new AppError('Chave já utilizada com outro conteúdo', 409);
        return { pagamento: repository.publicPayment(row), replay: true };
    };
    const existing = await repository.findByKey(chave);
    if (existing) return replay(existing);
    if (process.env.PAYMENTS_ENABLED === 'false') throw new AppError('Pagamentos temporariamente desativados', 503);
    try {
        const id = await repository.transaction(async trx => {
            const order = await trx('pedidos').where({ id: body.pedido_id }).forUpdate().first();
            if (!order) throw new AppError('Pedido não encontrado', 404);
            if (order.status !== 'pendente' || await trx('pagamentos').where({ pedido_id: order.id }).first()) throw new AppError('Pedido já possui pagamento ou está encerrado', 409);
            const [paymentId] = await trx('pagamentos').insert({ ...body, chave, hash });
            await trx('jobs').insert({ pagamento_id: paymentId });
            return paymentId;
        });
        return { pagamento: await obterPagamento(id), replay: false };
    } catch (error) {
        const concurrent = await repository.findByKey(chave);
        if (concurrent) return replay(concurrent);
        throw error;
    }
}
