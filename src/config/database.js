import './env.js';
import knex from 'knex';

const db = knex({
    client:'mysql2',
    pool: { min: 0, max: 10 },
    acquireConnectionTimeout: 5000,
    connection:{
        host:process.env.DB_HOST,
        port:Number(process.env.DB_PORT),
        user:process.env.DB_USER,
        password:process.env.DB_PASSWORD,
        database:process.env.DB_NAME
    }
});

export default db;
