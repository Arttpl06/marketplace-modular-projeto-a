export default async function setup() {
    if (process.env.NODE_ENV !== 'test') throw new Error('Jest exige NODE_ENV=test; execução recusada para proteger dados');
    if (process.env.UNIT_ONLY === 'true') return;
    const { default: db } = await import('../src/config/database.js');
    try { await db.migrate.latest({ directory: './database/migrations' }); }
    finally { await db.destroy(); }
}
