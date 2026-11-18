import './src/config/env.js';
const config = {
    client: 'mysql2',
    connection: {
        host:process.env.DB_HOST,
        port:Number(process.env.DB_PORT),
        user:process.env.DB_USER,
        password:process.env.DB_PASSWORD,
        database:process.env.DB_NAME
    },
    pool: { min: 0, max: 10 },
    acquireConnectionTimeout: 5000,
    seeds: { directory: './database/seeds' },
    migrations: {
        directory: './database/migrations'
    }
};

export default config;
