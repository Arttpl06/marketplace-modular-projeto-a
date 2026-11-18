import app from "./app.js";
import db from './config/database.js';
import { log } from './shared/observability.js';

const PORTA = Number(process.env.PORT || 3000);

const server = app.listen(PORTA , () =>{
    log('server_started', { port: PORTA });
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
    server.close(async () => { await db.destroy(); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
});
