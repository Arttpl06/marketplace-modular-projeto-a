import request from 'supertest';
import app from '../../src/app.js';
test('traceparent válido propaga trace ID; inválido gera um novo trace', async () => {
    const trace = '1234567890abcdef1234567890abcdef';
    const first = await request(app).get('/ready').set('traceparent', `00-${trace}-1234567890abcdef-01`);
    expect(first.status).toBe(200);
    expect(first.headers.traceparent).toMatch(new RegExp(`^00-${trace}-[a-f0-9]{16}-01$`));
    const second = await request(app).get('/health').set('traceparent', '00-00000000000000000000000000000000-0000000000000000-01');
    expect(second.headers.traceparent).not.toContain('00000000000000000000000000000000');
    const metrics = await request(app).get('/metrics');
    expect(metrics.text).toContain('http_request_duration_seconds_bucket');
    expect(metrics.text).toContain('le="0.5"');
});

