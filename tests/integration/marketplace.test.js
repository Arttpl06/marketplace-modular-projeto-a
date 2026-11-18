import request from 'supertest';
import { randomUUID } from 'node:crypto';
import app from '../../src/app.js';
import db from '../../src/config/database.js';
import { processNextJob } from '../../src/shared/queue.js';
const key = () => randomUUID();
const product = async (estoque = 10) => (await request(app).post('/produtos').send({ nome: `Teste ${key()}`, preco: 12.34, estoque })).body;
const order = (id, quantidade = 1, chave = key()) => request(app).post('/pedidos').set('Idempotency-Key', chave).send({ itens: [{ produto_id: id, quantidade }] });
const payment = (id, resultado = 'aprovado', chave = key()) => request(app).post('/pagamentos').set('Idempotency-Key', chave).send({ pedido_id: id, resultado });
async function drain(paymentId) {
    const job = await db('jobs').where({ pagamento_id: paymentId }).first();
    await processNextJob(undefined, job.id);
}

test('catálogo: cadastro, consulta, paginação, cache, edição e erros', async () => {
    const p = await product();
    expect(p.id).toEqual(expect.any(Number));
    expect((await request(app).get(`/produtos/${p.id}`)).status).toBe(200);
    const url = `/produtos?q=${encodeURIComponent(p.nome)}&limit=1`;
    expect((await request(app).get(url)).body.data).toHaveLength(1);
    expect((await request(app).get(url)).body.data).toHaveLength(1);
    expect((await request(app).patch(`/produtos/${p.id}`).send({ nome: 'Atualizado' })).body.nome).toBe('Atualizado');
    expect((await request(app).get(url)).body.data).toHaveLength(0);
    expect((await request(app).patch('/produtos/999999999').send({ nome: 'Ausente' })).status).toBe(404);
    expect((await request(app).get('/produtos?limit=101')).status).toBe(400);
    expect((await request(app).get('/produtos?q[x]=1')).status).toBe(200);
    expect((await request(app).post('/produtos').send({ nome: 'a', preco: 1.001, estoque: 1 })).status).toBe(400);
    expect((await request(app).patch(`/produtos/${p.id}`).send({ preco: 7.5, estoque: 3 })).status).toBe(200);
    expect((await request(app).patch(`/produtos/${p.id}`).send({})).status).toBe(400);
    expect((await request(app).delete(`/produtos/${p.id}`)).status).toBe(204);
    expect((await request(app).get(`/produtos/${p.id}`)).status).toBe(404);
    expect((await request(app).delete(`/produtos/${p.id}`)).status).toBe(404);
    expect(await db('produtos').where({ id: p.id }).first()).toBeDefined();
    expect((await order(p.id)).status).toBe(404);
});

test('pedido calcula centavos, reserva estoque e repete sem duplicação', async () => {
    const p = await product(); const chave = key();
    const first = await order(p.id, 2, chave);
    expect(first.status).toBe(201); expect(first.body.total_centavos).toBe(2468);
    const replay = await order(p.id, 2, chave);
    expect(replay.status).toBe(200); expect(replay.body.id).toBe(first.body.id);
    expect((await order(p.id, 3, chave)).status).toBe(409);
    expect((await request(app).get(`/produtos/${p.id}`)).body.estoque).toBe(8);
    expect((await request(app).get(`/pedidos/${first.body.id}`)).status).toBe(200);
});

test('concorrência não vende mais que o estoque', async () => {
    const p = await product(1);
    const responses = await Promise.all([order(p.id), order(p.id)]);
    expect(responses.map(r => r.status).sort()).toEqual([201, 409]);
    expect((await request(app).get(`/produtos/${p.id}`)).body.estoque).toBe(0);
});

test('mesma chave concorrente cria um único pedido', async () => {
    const p = await product(1); const chave = key();
    const responses = await Promise.all([order(p.id, 1, chave), order(p.id, 1, chave)]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 201]);
    expect(responses[0].body.id).toBe(responses[1].body.id);
});

test('rollback restaura itens anteriores quando outro produto falta', async () => {
    const p = await product();
    const result = await request(app).post('/pedidos').set('Idempotency-Key', key()).send({ itens: [{ produto_id: p.id, quantidade: 2 }, { produto_id: 999999999, quantidade: 1 }] });
    expect(result.status).toBe(404);
    expect((await request(app).get(`/produtos/${p.id}`)).body.estoque).toBe(10);
});

test.each(['aprovado', 'recusado'])('pagamento %s é processado exatamente uma vez', async resultado => {
    const p = await product(); const o = (await order(p.id, 2)).body; const chave = key();
    const first = await payment(o.id, resultado, chave);
    expect(first.status).toBe(202);
    expect((await payment(o.id, resultado, chave)).status).toBe(200);
    expect((await payment(o.id, resultado === 'aprovado' ? 'recusado' : 'aprovado', chave)).status).toBe(409);
    expect((await payment(o.id)).status).toBe(409);
    await drain(first.body.id); await drain(first.body.id);
    expect((await request(app).get(`/pagamentos/${first.body.id}`)).body.status).toBe(resultado);
    expect((await request(app).get(`/pedidos/${o.id}`)).body.status).toBe(resultado === 'aprovado' ? 'pago' : 'cancelado');
    expect((await request(app).get(`/produtos/${p.id}`)).body.estoque).toBe(resultado === 'aprovado' ? 8 : 10);
});

test('pagamentos concorrentes com mesma chave compartilham resultado', async () => {
    const p = await product(); const o = (await order(p.id)).body; const chave = key();
    const responses = await Promise.all([payment(o.id, 'aprovado', chave), payment(o.id, 'aprovado', chave)]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 202]);
    expect(responses[0].body.id).toBe(responses[1].body.id); await drain(responses[0].body.id);
});

test('fila aplica backoff e encerra após cinco falhas sem efeitos parciais', async () => {
    const p = await product(); const o = (await order(p.id)).body; const pay = (await payment(o.id)).body;
    const job = await db('jobs').where({ pagamento_id: pay.id }).first();
    for (let i = 0; i < 5; i++) {
        await db('jobs').where({ id: job.id }).update({ disponivel_em: new Date('2000-01-01T00:00:00Z') });
        const result = await processNextJob(async trx => {
            await trx('pedidos').where({ id: o.id }).update({ status: 'pago' });
            throw new Error('Falha sintética');
        }, job.id);
        expect(result.status).toBe(i === 4 ? 'falhou' : 'pendente');
    }
    expect((await db('jobs').where({ id: job.id }).first()).tentativas).toBe(5);
    expect((await request(app).get(`/pedidos/${o.id}`)).body.status).toBe('pendente');
});

test('feature flag bloqueia novos pagamentos', async () => {
    process.env.PAYMENTS_ENABLED = 'false';
    try { expect((await payment(1)).status).toBe(503); }
    finally { delete process.env.PAYMENTS_ENABLED; }
});

test('erros de entrada, inexistência, JSON e observabilidade', async () => {
    expect((await request(app).post('/pedidos').send({ itens: [] })).status).toBe(400);
    expect((await request(app).post('/pagamentos').send({})).status).toBe(400);
    expect((await payment(999999999)).status).toBe(404);
    for (const path of ['/pedidos/0', '/pagamentos/0']) expect((await request(app).get(path)).status).toBe(400);
    for (const path of ['/pedidos/999999999', '/pagamentos/999999999', '/ausente']) expect((await request(app).get(path)).status).toBe(404);
    expect((await request(app).post('/produtos').set('Content-Type', 'application/json').send('{')).status).toBe(400);
    expect((await request(app).post('/produtos').send({ nome: 'a'.repeat(70000) })).status).toBe(413);
    expect((await request(app).get('/ready')).status).toBe(200);
    const health = await request(app).get('/health');
    expect(health.headers['x-request-id']).toMatch(/^[\da-f-]{36}$/);
    const metrics = await request(app).get('/metrics');
    expect(metrics.text).toContain('http_requests_total');
    expect(metrics.text).not.toContain('Idempotency-Key');
});
