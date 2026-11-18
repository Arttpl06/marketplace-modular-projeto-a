import dotenv from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
const result = dotenv.config({ path: '.env.test', quiet: true });
if (result.error || result.parsed.DB_NAME !== 'marketplace_test') throw new Error('Configure .env.test com marketplace_test');
Object.assign(process.env, result.parsed, { NODE_ENV: 'development', DB_NAME: 'marketplace_test' });
const { default: app } = await import('../src/app.js');
const { default: db } = await import('../src/config/database.js');
const spans = [];
const output = console.log;
console.log = value => {
    try { const event = JSON.parse(value); if (event.event === 'trace_span') spans.push(event); } catch { /* Ignore non-JSON messages. */ }
};
const server = app.listen(0, '127.0.0.1');
try {
    await new Promise(resolve => server.once('listening', resolve));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/ready`);
    await response.text();
    if (response.status !== 200) throw new Error('Readiness falhou');
    const parent = spans.find(s => s.kind === 'SERVER');
    const child = spans.find(s => s.name === 'mysql.readiness');
    if (!parent || !child || child.parent_span_id !== parent.span_id || child.trace_id !== parent.trace_id) throw new Error('Trace incompleto');
    mkdirSync('docs/evidence', { recursive: true });
    writeFileSync('docs/evidence/trace.json', JSON.stringify({ captured_at: new Date().toISOString(), database: 'marketplace_test', exporter: 'local JSON spans', spans }, null, 2));
} finally {
    console.log = output;
    await new Promise(resolve => server.close(resolve));
    await db.destroy();
}
console.log('Trace HTTP → MySQL verificado e salvo em docs/evidence/trace.json');

