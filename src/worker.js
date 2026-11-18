import { processNextJob } from './shared/queue.js';
import db from './config/database.js';
import { log } from './shared/observability.js';
let stopping = false;
process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });
while (!stopping) {
    try {
        if (!await processNextJob()) await new Promise(resolve => setTimeout(resolve, 500));
    } catch {
        log('worker_database_unavailable');
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}
await db.destroy();
