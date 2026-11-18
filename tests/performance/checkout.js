import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = { stages: [{ duration: '15s', target: 5 }, { duration: '30s', target: 10 }, { duration: '15s', target: 0 }], thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<1000'], checks: ['rate>0.99'] } };
const base = __ENV.BASE_URL || 'http://localhost:3000';
export function setup() {
    const r = http.post(`${base}/produtos`, JSON.stringify({ nome: 'Carga sintética k6', preco: 19.9, estoque: 1000000 }), { headers: { 'Content-Type': 'application/json' } });
    if (r.status !== 201) throw new Error('Não foi possível criar produto de carga');
    return { id: r.json('id'), run: Date.now() };
}
export default function (data) {
    const key = `k6-${data.run}-${__VU}-${__ITER}`;
    const headers = { 'Content-Type': 'application/json', 'Idempotency-Key': key };
    const order = http.post(`${base}/pedidos`, JSON.stringify({ itens: [{ produto_id: data.id, quantidade: 1 }] }), { headers });
    check(order, { 'pedido 201': r => r.status === 201 });
    if (order.status === 201) {
        const payment = http.post(`${base}/pagamentos`, JSON.stringify({ pedido_id: order.json('id'), resultado: 'recusado' }), { headers });
        check(payment, { 'pagamento 202': r => r.status === 202 });
    }
    sleep(0.2);
}
