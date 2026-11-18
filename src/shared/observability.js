import { randomUUID, randomBytes } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
const context = new AsyncLocalStorage();
const id = bytes => randomBytes(bytes).toString('hex');
export async function withSpan(name, operation) {
    const parent = context.getStore();
    if (!parent) return operation();
    const span = { trace_id: parent.trace_id, span_id: id(8), parent_span_id: parent.span_id };
    const started = performance.now();
    let status = 'OK';
    try { return await context.run(span, operation); }
    catch (error) { status = 'ERROR'; throw error; }
    finally { log('trace_span', { ...span, name, kind: 'CLIENT', status, duration_ms: performance.now() - started }); }
}
const observations = new Map();
export function log(event, fields = {}) {
    if (process.env.NODE_ENV !== 'test') console.log(JSON.stringify({ timestamp: new Date().toISOString(), event, ...fields }));
}
export function observe(req, res, next) {
    req.requestId = randomUUID();
    const remote = /^00-([a-f0-9]{32})-([a-f0-9]{16})-0[01]$/.exec(req.headers.traceparent || '');
    const valid = remote && !/^0+$/.test(remote[1]) && !/^0+$/.test(remote[2]);
    const span = { trace_id: valid ? remote[1] : id(16), span_id: id(8), parent_span_id: valid ? remote[2] : null };
    res.setHeader('X-Request-Id', req.requestId);
    res.setHeader('traceparent', `00-${span.trace_id}-${span.span_id}-01`);
    const start = performance.now();
    res.on('finish', () => {
        const pathname = req.originalUrl.split('?')[0];
        const prefix = ['/produtos', '/pedidos', '/pagamentos'].find(p => pathname === p || pathname.startsWith(`${p}/`)) || '';
        const route = req.route ? `${prefix}${req.route.path}` : 'unmatched';
        const method = ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS', 'HEAD'].includes(req.method) ? req.method : 'OTHER';
        const key = JSON.stringify({ method, route, status: res.statusCode });
        const metric = observations.get(key) || { count: 0, seconds: 0, buckets: [0, 0, 0] };
        const seconds = (performance.now() - start) / 1000;
        metric.count++; metric.seconds += seconds; observations.set(key, metric);
        [0.1, 0.5, 1].forEach((bound, index) => { if (seconds <= bound) metric.buckets[index]++; });
        log('http_request', { request_id: req.requestId, trace_id: span.trace_id, method, route, status: res.statusCode, duration_ms: Math.round(seconds * 1000) });
        log('trace_span', { ...span, name: `${method} ${route}`, kind: 'SERVER', status: res.statusCode >= 500 ? 'ERROR' : 'OK', http_status: res.statusCode, duration_ms: seconds * 1000 });
    });
    context.run(span, next);
}
export function metrics() {
    const lines = ['# TYPE http_requests_total counter', '# TYPE http_request_duration_seconds histogram'];
    for (const [key, metric] of observations) {
        const tags = Object.entries(JSON.parse(key)).map(([k, v]) => `${k}=${JSON.stringify(String(v))}`).join(',');
        lines.push(`http_requests_total{${tags}} ${metric.count}`, `http_request_duration_seconds_sum{${tags}} ${metric.seconds}`, `http_request_duration_seconds_count{${tags}} ${metric.count}`);
        [0.1, 0.5, 1].forEach((bound, index) => lines.push(`http_request_duration_seconds_bucket{${tags},le="${bound}"} ${metric.buckets[index]}`));
        lines.push(`http_request_duration_seconds_bucket{${tags},le="+Inf"} ${metric.count}`);
    }
    return `${lines.join('\n')}\n`;
}
