import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import dotenv from 'dotenv';
import knex from 'knex';
import { clearTimeout } from 'node:timers';
const k6 = process.env.K6_BIN || 'k6';
const version = spawnSync(k6, ['version'], { encoding: 'utf8' });
if (version.error || version.status !== 0) throw new Error('k6 indisponível; nenhuma medição foi produzida');
const loaded = dotenv.config({ path: '.env.benchmark', quiet: true });
if (loaded.error || loaded.parsed.DB_NAME !== 'marketplace_benchmark') throw new Error('Configure .env.benchmark com marketplace_benchmark');
const env = { ...process.env, ...loaded.parsed, NODE_ENV: 'development', PORT: '3001' };
const db = knex({ client: 'mysql2', connection: { host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME } });
try {
    const count = await db('pedidos').where('chave', 'like', 'synthetic-v1-order-%').count('* as total').first();
    if (Number(count.total) < 100000) throw new Error('Execute seed:verify com pelo menos 100 mil pedidos');
} finally { await db.destroy(); }
const directory = `performance-results/${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(directory, { recursive: true });
const measurements = [];
for (let round = 1; round <= 3; round++) {
    // Alternate order to reduce ordering bias.
    for (const cache of round % 2 ? [false, true] : [true, false]) {
        const server = spawn(process.execPath, ['src/server.js'], { env: { ...env, CATALOG_CACHE_ENABLED: String(cache) }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
        try {
            await new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('API não iniciou em 15s')), 15000);
                server.on('error', error => { clearTimeout(timer); reject(error); });
                server.once('exit', () => { clearTimeout(timer); reject(new Error('API encerrou antes de iniciar; confira a porta 3001')); });
                server.stdout.on('data', data => { if (data.toString().includes('"event":"server_started"')) { clearTimeout(timer); resolve(); } });
            });
            if (!(await fetch('http://127.0.0.1:3001/ready')).ok) throw new Error('API não está pronta');
            for (let page = 1; page <= 10; page++) await (await fetch(`http://127.0.0.1:3001/produtos?page=${page}&limit=20`)).text();
            const file = `${directory}/${cache ? 'after' : 'before'}-${round}.json`;
            const exitCode = await new Promise((resolve, reject) => {
                const run = spawn(k6, ['run', '--summary-export', file, '-e', 'BASE_URL=http://127.0.0.1:3001', 'tests/performance/marketplace.js'], { stdio: 'inherit', windowsHide: true });
                run.once('error', reject);
                run.once('exit', code => resolve(code ?? 1));
            });
            const summary = JSON.parse(readFileSync(file, 'utf8'));
            const duration = summary.metrics.http_req_duration;
            measurements.push({ round, cache, exit_code: exitCode, p50_ms: duration.med, p95_ms: duration['p(95)'], requests_per_second: summary.metrics.http_reqs.rate, error_rate: summary.metrics.http_req_failed.value });
        } finally {
            if (server.exitCode === null) {
                const exited = new Promise(resolve => server.once('exit', resolve));
                server.kill();
                await exited;
            }
        }
    }
}
writeFileSync(`${directory}/comparison.json`, JSON.stringify({ timestamp: new Date().toISOString(), k6: version.stdout.trim(), node: process.version, platform: process.platform, scenario: 'catalog, 15s/30s/15s, 10/30/0 VUs; before=cache off, after=cache on', measurements }, null, 2));
console.log(`Medições reais salvas em ${directory}; compare as medianas das três rodadas e os exit codes.`);
if (measurements.some(row => row.exit_code !== 0)) process.exitCode = 1;

