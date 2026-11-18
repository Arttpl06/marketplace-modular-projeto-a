import { createHash } from 'node:crypto';
import * as repository from './orders.repository.js';
import { AppError } from '../../shared/AppError.js';
import { objectBody, positiveId, idempotencyKey } from '../../shared/validation.js';
import { catalogCache } from '../../shared/cache.js';
export const fingerprint = body => createHash('sha256').update(JSON.stringify(body)).digest('hex');
export function normalizeItems(body) {
    objectBody(body, ['itens']);
    if (!Array.isArray(body.itens) || body.itens.length < 1 || body.itens.length > 100) throw new AppError('Informe de 1 a 100 itens', 400);
    const ids = new Set();
    return body.itens.map(item => {
        objectBody(item, ['produto_id', 'quantidade']);
        if (!Number.isSafeInteger(item.produto_id) || item.produto_id <= 0 || !Number.isSafeInteger(item.quantidade) || item.quantidade <= 0 || item.quantidade > 10000 || ids.has(item.produto_id)) throw new AppError('Itens inválidos ou duplicados', 400);
        ids.add(item.produto_id);
        return { produto_id: item.produto_id, quantidade: item.quantidade };
    }).sort((a, b) => a.produto_id - b.produto_id);
}
export async function obterPedido(id) {
    positiveId(id);
    const order = await repository.findById(id);
    if (!order) throw new AppError('Pedido não encontrado', 404);
    return order;
}
export async function criarPedido(body, key) {
    const chave = idempotencyKey(key);
    const items = normalizeItems(body);
    const hash = fingerprint(items);
    const replay = async existing => {
        if (existing.hash !== hash) throw new AppError('Chave já utilizada com outro conteúdo', 409);
        return { pedido: await obterPedido(existing.id), replay: true };
    };
    const existing = await repository.findByKey(chave);
    if (existing) return replay(existing);
    try {
        const id = await repository.transaction(async trx => {
            const lines = [];
            let total = 0;
            // Ordem estável dos locks reduz deadlocks entre carrinhos sobrepostos.
            for (const item of items) {
                const product = await trx('produtos').where({ id: item.produto_id }).forUpdate().first();
                if (!product || !product.ativo) throw new AppError('Produto não encontrado', 404);
                if (product.estoque < item.quantidade) throw new AppError('Estoque insuficiente', 409);
                const price = Math.round(Number(product.preco) * 100);
                total += price * item.quantidade;
                if (!Number.isSafeInteger(total)) throw new AppError('Total excede limite permitido', 400);
                lines.push({ ...item, preco_centavos: price });
                await trx('produtos').where({ id: product.id }).decrement('estoque', item.quantidade);
            }
            return repository.insertOrder(trx, { chave, hash, total_centavos: total }, lines);
        });
        catalogCache.clear();
        return { pedido: await obterPedido(id), replay: false };
    } catch (error) {
        const concurrent = await repository.findByKey(chave);
        if (concurrent) return replay(concurrent);
        throw error;
    }
}
