import { seed } from '../../database/seeds/synthetic.js';
const fake = database => ({ client: { config: { connection: { database } } } });
test('seed recusa desenvolvimento antes de executar consultas', async () => {
    await expect(seed(fake('marketplace_db'))).rejects.toThrow('Seed permitido somente');
});
test('seed recusa lote ilimitado e pedidos sem produtos antes de executar consultas', async () => {
    const old = { ...process.env };
    try {
        process.env.SEED_BATCH_SIZE = '1001';
        await expect(seed(fake('marketplace_test'))).rejects.toThrow('Lote');
        process.env.SEED_BATCH_SIZE = '2';
        process.env.SEED_PRODUCTS = '0';
        process.env.SEED_ORDERS = '1';
        await expect(seed(fake('marketplace_test'))).rejects.toThrow('exigem produtos');
    } finally {
        for (const key of ['SEED_BATCH_SIZE', 'SEED_PRODUCTS', 'SEED_ORDERS']) {
            if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key];
        }
    }
});

