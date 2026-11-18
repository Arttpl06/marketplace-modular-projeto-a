import {AppError} from './AppError.js'
import { log } from './observability.js';

export function errorHandler(err , req , res , next){
    if (res.headersSent) {
    return next(err);
    }
    if(err instanceof AppError){
        return res.status(err.statusCode).json({erro: err.message});
    }

    if (err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido' });
    if (err.type === 'entity.too.large') return res.status(413).json({ erro: 'Corpo excede limite' });
    log('request_error', { request_id: req.requestId, type: err.name });
    return res.status(500).json({erro:"Erro interno do servidor"});
}
