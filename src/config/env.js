import dotenv from 'dotenv';
dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env', quiet: true });
if (process.env.NODE_ENV === 'test' && process.env.DB_NAME !== 'marketplace_test') {
    throw new Error('Testes exigem DB_NAME=marketplace_test; banco de desenvolvimento protegido');
}
