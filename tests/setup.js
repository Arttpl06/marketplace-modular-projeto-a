import db from '../src/config/database.js';
afterAll(async () => { await db.destroy(); });
