// Transactions are bounded and restartable; the lock serializes concurrent seed batches.
export async function seed(knex) {
    if (!['marketplace_test', 'marketplace_benchmark'].includes(knex.client.config.connection.database)) {
        throw new Error('Seed permitido somente em marketplace_test ou marketplace_benchmark');
    }
    const count = Number(process.env.SEED_PRODUCTS || 1000);
    const orders = Number(process.env.SEED_ORDERS || 100000);
    const size = Number(process.env.SEED_BATCH_SIZE || 500);
    if (![count, orders].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 1000000)) throw new Error('Volumes de seed devem estar entre 0 e 1000000');
    if (!Number.isSafeInteger(size) || size < 1 || size > 1000) throw new Error('Lote deve estar entre 1 e 1000');
    if (orders && !count) throw new Error('Pedidos sintéticos exigem produtos');
    const products = [];
    for (let start = 1; start <= count; start += size) {
        const rows = Array.from({ length: Math.min(size, count - start + 1) }, (_, offset) => {
            const i = start + offset;
            return { nome: `Produto sintético ${String(i).padStart(7, '0')}`, descricao: `synthetic:v1:product:${i}`, preco: ((i * 7919 % 100000) + 100) / 100, estoque: 10000 };
        });
        await knex.transaction(async trx => {
            await trx('app_locks').where({ name: 'synthetic_seed' }).forUpdate().first();
            const existing = await trx('produtos').whereIn('descricao', rows.map(r => r.descricao));
            const found = new Set(existing.map(r => r.descricao));
            const missing = rows.filter(r => !found.has(r.descricao));
            if (missing.length) await trx('produtos').insert(missing);
            const all = await trx('produtos').whereIn('descricao', rows.map(r => r.descricao));
            const byDescription = new Map(all.map(r => [r.descricao, r.id]));
            products.push(...rows.map(r => byDescription.get(r.descricao)));
        });
    }
    for (let start = 1; start <= orders; start += size) {
        const batch = Array.from({ length: Math.min(size, orders - start + 1) }, (_, offset) => {
            const i = start + offset;
            return { i, chave: `synthetic-v1-order-${i}`, produto_id: products[(i - 1) % products.length] };
        });
        await knex.transaction(async trx => {
            await trx('app_locks').where({ name: 'synthetic_seed' }).forUpdate().first();
            const existing = new Set((await trx('pedidos').whereIn('chave', batch.map(r => r.chave)).select('chave')).map(r => r.chave));
            const missing = batch.filter(r => !existing.has(r.chave));
            if (!missing.length) return;
            const quantities = new Map();
            for (const row of missing) quantities.set(row.produto_id, (quantities.get(row.produto_id) || 0) + 1);
            const locked = await trx('produtos').whereIn('id', [...quantities.keys()]).orderBy('id').forUpdate();
            const prices = new Map(locked.map(p => [p.id, Math.round(Number(p.preco) * 100)]));
            if (locked.some(p => p.estoque < quantities.get(p.id))) throw new Error('Estoque sintético insuficiente; lote revertido');
            await trx('pedidos').insert(missing.map(r => ({ chave: r.chave, hash: 'synthetic-v1', status: 'pago', total_centavos: prices.get(r.produto_id) })));
            const saved = new Map((await trx('pedidos').whereIn('chave', missing.map(r => r.chave)).select('id', 'chave')).map(r => [r.chave, r.id]));
            await trx('pedido_itens').insert(missing.map(r => ({ pedido_id: saved.get(r.chave), produto_id: r.produto_id, quantidade: 1, preco_centavos: prices.get(r.produto_id) })));
            await trx('pagamentos').insert(missing.map(r => ({ pedido_id: saved.get(r.chave), chave: `synthetic-v1-payment-${r.i}`, hash: 'synthetic-v1', resultado: 'aprovado', status: 'aprovado' })));
            const bindings = [...quantities].flatMap(([id, quantity]) => [id, quantity]);
            await trx('produtos').whereIn('id', [...quantities.keys()]).update({ estoque: trx.raw(`estoque - CASE id ${[...quantities].map(() => 'WHEN ? THEN ?').join(' ')} ELSE 0 END`, bindings) });
        });
    }
}

