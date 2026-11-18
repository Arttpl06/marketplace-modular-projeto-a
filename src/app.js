import express from 'express';
import router from './routes/index.js';
import { errorHandler } from './shared/erroHandler.js';
import { observe } from './shared/observability.js';

class App {
    constructor() {
        this.app = express();
        this.middlewares();
        this.routes();
        this.errorMiddlewares();
    }
    middlewares() {
        this.app.disable('x-powered-by');
        this.app.use(observe);
        this.app.use(express.json({ limit: '64kb' }));
    }

    routes() {
        this.app.use(router);
    }

    errorMiddlewares() {
        this.app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));
        this.app.use(errorHandler);
    }
}

export default new App().app;
