import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import Ajv from 'ajv';
import request from 'supertest';
import app from '../../src/app.js';
const spec = JSON.parse(readFileSync(new URL('../../docs/openapi.json', import.meta.url), 'utf8'));
const ajv = new Ajv({ allErrors: true });
ajv.addSchema({ components: spec.components }, 'api');
function validate(schema, data) {
    // Resolve referências do documento OpenAPI no registro do JSON Schema.
    const resolved = JSON.parse(JSON.stringify(schema).replaceAll('#/components/', 'api#/components/'));
    const valid = ajv.validate(resolved, data);
    expect({ valid, errors: ajv.errors }).toEqual({ valid: true, errors: null });
}
function contract(path, method, result) {
    const response = spec.paths[path][method].responses[result.status];
    expect(response).toBeDefined();
    if (response.content?.['application/json']) {
        expect(result.headers['content-type']).toMatch(/application\/json/);
        validate(response.content['application/json'].schema, result.body);
    }
}
test('todos os schemas publicados compilam', () => {
    for (const schema of Object.values(spec.components.schemas)) {
        const resolved = JSON.parse(JSON.stringify(schema).replaceAll('#/components/', 'api#/components/'));
        expect(ajv.compile(resolved)).toEqual(expect.any(Function));
    }
});
test('contratos reais de catálogo, pedido e pagamento correspondem ao OpenAPI', async () => {
    const input = { nome: 'Contrato', preco: 10.5, estoque: 5, descricao: null };
    validate(spec.components.schemas.ProdutoInput, input);
    const p = await request(app).post('/produtos').send(input); contract('/produtos', 'post', p);
    contract('/produtos', 'get', await request(app).get('/produtos'));
    contract('/produtos/{id}', 'get', await request(app).get(`/produtos/${p.body.id}`));
    contract('/produtos/{id}', 'patch', await request(app).patch(`/produtos/${p.body.id}`).send({ nome: 'Contrato editado' }));
    const orderInput = { itens: [{ produto_id: p.body.id, quantidade: 1 }] };
    validate(spec.components.schemas.PedidoInput, orderInput);
    const orderKey = randomUUID();
    const o = await request(app).post('/pedidos').set('Idempotency-Key', orderKey).send(orderInput);
    contract('/pedidos', 'post', o);
    contract('/pedidos', 'post', await request(app).post('/pedidos').set('Idempotency-Key', orderKey).send(orderInput));
    contract('/pedidos/{id}', 'get', await request(app).get(`/pedidos/${o.body.id}`));
    const paymentInput = { pedido_id: o.body.id, resultado: 'aprovado' };
    validate(spec.components.schemas.PagamentoInput, paymentInput);
    const pay = await request(app).post('/pagamentos').set('Idempotency-Key', randomUUID()).send(paymentInput);
    contract('/pagamentos', 'post', pay);
    contract('/pagamentos/{id}', 'get', await request(app).get(`/pagamentos/${pay.body.id}`));
    contract('/produtos/{id}', 'delete', await request(app).delete(`/produtos/${p.body.id}`));
    contract('/health', 'get', await request(app).get('/health'));
    contract('/ready', 'get', await request(app).get('/ready'));
    contract('/produtos/{id}', 'get', await request(app).get('/produtos/0'));
    contract('/pedidos', 'post', await request(app).post('/pedidos').send({}));
});
