import db from '../../config/database.js';
export const transaction = callback => db.transaction(callback);
export const findByKey = (chave, trx = db) => trx('pedidos').where({ chave }).first();
export async function findById(id, trx = db) {
    const pedido = await trx('pedidos').where({ id }).first();
    if (!pedido) return undefined;
    const itens = await trx('pedido_itens').where({ pedido_id: id }).select('produto_id', 'quantidade', 'preco_centavos');
    return { id: pedido.id, status: pedido.status, total_centavos: Number(pedido.total_centavos), criado_em: pedido.criado_em,
        itens: itens.map(item => ({ ...item, preco_centavos: Number(item.preco_centavos) })) };
}
export async function insertOrder(trx, record, itens) {
    const [id] = await trx('pedidos').insert(record);
    await trx('pedido_itens').insert(itens.map(item => ({ ...item, pedido_id: id })));
    return id;
}
