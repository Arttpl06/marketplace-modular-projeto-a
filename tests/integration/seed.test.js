import db from '../../src/config/database.js';
import { seed } from '../../database/seeds/synthetic.js';
test('dados sintéticos repetíveis preservam registros preexistentes', async () => {
    process.env.SEED_PRODUCTS = '3'; process.env.SEED_ORDERS = '3';
    try {
        const [existing] = await db('produtos').insert({ nome: 'Preservar seed', preco: 1, estoque: 1 });
        await seed(db);
        const first = await db('pedidos').where('chave', 'like', 'synthetic-v1-order-%').count('* as total').first();
        await seed(db);
        expect(await db('pedidos').where('chave', 'like', 'synthetic-v1-order-%').count('* as total').first()).toEqual(first);
        expect((await db('produtos').where({ id: existing }).first()).estoque).toBe(1);
    } finally { delete process.env.SEED_PRODUCTS; delete process.env.SEED_ORDERS; }
});
