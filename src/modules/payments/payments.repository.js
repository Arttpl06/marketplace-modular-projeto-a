import db from '../../config/database.js';
export const transaction = callback => db.transaction(callback);
export const findByKey = chave => db('pagamentos').where({ chave }).first();
export const findById = id => db('pagamentos').where({ id }).first();
export function publicPayment(row) {
    return { id: row.id, pedido_id: row.pedido_id, status: row.status, resultado: row.resultado, criado_em: row.criado_em };
}
