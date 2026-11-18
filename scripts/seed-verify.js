import dotenv from 'dotenv';
import knex from 'knex';
import { writeFileSync, mkdirSync } from 'node:fs';
import { seed } from '../database/seeds/synthetic.js';
const test = process.argv.includes('--test-db');
const file = test ? '.env.test' : '.env.benchmark';
const loaded = dotenv.config({ path: file, quiet: true });
if (loaded.error) throw new Error(`Configure ${file} antes de executar`);
const parsed = loaded.parsed;
const expected = test ? 'marketplace_test' : 'marketplace_benchmark';
if (parsed.DB_NAME !== expected) throw new Error(`Banco permitido: ${expected}`);
const db = knex({ client: 'mysql2', connection: { host: parsed.DB_HOST, port: Number(parsed.DB_PORT), user: parsed.DB_USER, password: parsed.DB_PASSWORD, database: expected }, pool: { min: 0, max: 5 } });
process.env.SEED_PRODUCTS = process.env.SEED_PRODUCTS || parsed.SEED_PRODUCTS || '1000';
process.env.SEED_ORDERS = process.env.SEED_ORDERS || parsed.SEED_ORDERS || '100000';
process.env.SEED_BATCH_SIZE = process.env.SEED_BATCH_SIZE || parsed.SEED_BATCH_SIZE || '500';
async function snapshot() {
    const result = {};
    for (const table of ['produtos', 'pedidos', 'pedido_itens', 'pagamentos']) {
        result[table] = Number((await db(table).count('* as total').first()).total);
    }
    result.synthetic_orders = Number((await db('pedidos').where('chave', 'like', 'synthetic-v1-order-%').count('* as total').first()).total);
    result.synthetic_products = Number((await db('produtos').where('descricao', 'like', 'synthetic:v1:product:%').count('* as total').first()).total);
    result.synthetic_payments = Number((await db('pagamentos').where('chave', 'like', 'synthetic-v1-payment-%').count('* as total').first()).total);
    result.synthetic_items = Number((await db('pedido_itens as i').join('pedidos as p', 'p.id', 'i.pedido_id').where('p.chave', 'like', 'synthetic-v1-order-%').count('* as total').first()).total);
    result.synthetic_stock = Number((await db('produtos').where('descricao', 'like', 'synthetic:v1:product:%').sum('estoque as total').first()).total);
    return result;
}
try {
    await db.migrate.latest({ directory: './database/migrations' });
    const before = await snapshot();
    const started = performance.now();
    await seed(db);
    const first_ms = performance.now() - started;
    const after = await snapshot();
    const repeated = performance.now();
    await seed(db);
    const repeat_ms = performance.now() - repeated;
    const repeat = await snapshot();
    if (JSON.stringify(after) !== JSON.stringify(repeat)) throw new Error('Falha de idempotência');
    if (after.synthetic_orders < Number(process.env.SEED_ORDERS) || after.synthetic_products < Number(process.env.SEED_PRODUCTS) || after.synthetic_payments !== after.synthetic_orders || after.synthetic_items !== after.synthetic_orders) throw new Error('Contagens inconsistentes');
    const report = { timestamp: new Date().toISOString(), database: expected, batch: Number(process.env.SEED_BATCH_SIZE), before, after, repeat, first_ms, repeat_ms, idempotent: true };
    mkdirSync('docs/evidence', { recursive: true });
    writeFileSync('docs/evidence/seed.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
} finally { await db.destroy(); }

