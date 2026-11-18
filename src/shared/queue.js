import db from '../config/database.js';
import { catalogCache } from './cache.js';
import { log } from './observability.js';

export async function settlePayment(trx, job) {
    const payment = await trx('pagamentos').where({ id: job.pagamento_id }).forUpdate().first();
    if (!payment) throw new Error('Pagamento da fila ausente');
    if (payment.status !== 'pendente') return;
    const order = await trx('pedidos').where({ id: payment.pedido_id }).forUpdate().first();
    if (order.status !== 'pendente') throw new Error('Estado de pedido incompatível');
    if (payment.resultado === 'recusado') {
        const items = await trx('pedido_itens').where({ pedido_id: order.id }).orderBy('produto_id');
        for (const item of items) await trx('produtos').where({ id: item.produto_id }).increment('estoque', item.quantidade);
    }
    await trx('pedidos').where({ id: order.id }).update({ status: payment.resultado === 'aprovado' ? 'pago' : 'cancelado' });
    await trx('pagamentos').where({ id: payment.id }).update({ status: payment.resultado });
}

export async function processNextJob(handler = settlePayment, jobId) {
    const result = await db.transaction(async trx => {
        const job = await trx('jobs').where({ status: 'pendente' }).modify(query => {
            if (jobId !== undefined) query.where({ id: jobId });
        }).where('disponivel_em', '<=', trx.fn.now()).orderBy('id').forUpdate().skipLocked().first();
        if (!job) return false;
        try {
            // Savepoint: falha desfaz efeitos de negócio, preservando o lock do job.
            await trx.transaction(inner => handler(inner, job));
            await trx('jobs').where({ id: job.id }).update({ status: 'concluido', tentativas: job.tentativas + 1 });
            return { id: job.id, status: 'concluido' };
        } catch {
            const attempts = job.tentativas + 1;
            const status = attempts >= 5 ? 'falhou' : 'pendente';
            await trx('jobs').where({ id: job.id }).update({ status, tentativas: attempts, disponivel_em: new Date(Date.now() + 1000 * 2 ** attempts) });
            return { id: job.id, status };
        }
    });
    if (result) { catalogCache.clear(); log('queue_job', result); }
    return result;
}
