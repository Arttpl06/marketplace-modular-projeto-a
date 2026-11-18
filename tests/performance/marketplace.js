import http from 'k6/http';
import { check, sleep } from 'k6';
// Três estágios; objetivos locais documentados em docs/observabilidade.md.
export const options = {
    stages: [{ duration: '15s', target: 10 }, { duration: '30s', target: 30 }, { duration: '15s', target: 0 }],
    thresholds: { http_req_duration: ['p(95)<500'], http_req_failed: ['rate<0.01'], checks: ['rate>0.99'] }
};
const base = __ENV.BASE_URL || 'http://localhost:3000';
export default function () {
    const list = http.get(`${base}/produtos?page=${(__VU % 10) + 1}&limit=20`);
    check(list, { 'catálogo 200': r => r.status === 200 });
    if (__ENV.PRODUCT_ID) {
        const result = http.get(`${base}/produtos/${__ENV.PRODUCT_ID}`);
        check(result, { 'produto 200': r => r.status === 200 });
    }
    sleep(0.2);
}
