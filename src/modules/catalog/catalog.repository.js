import db from '../../config/database.js'

export async function listProdutos({ limit = 20, offset = 0, q = '' } = {}) {
    try{
        const resultado = await db('produtos').where({ ativo: true }).select('*').modify(builder => {
            if (q) builder.where('nome', 'like', `%${q}%`);
        }).orderBy('id').limit(limit).offset(offset)
        return resultado;
    }
    catch(e){
        throw e;
    }
};

export async function atualizarProduto(id, patch) {
    return db('produtos').where({ id, ativo: true }).update(patch);
}

export async function criarProduto(produto) {
    try{
        const [id] = await db('produtos').insert(produto);
        return id;
    }
    catch(e){
        throw e;
    }
};


export async function  buscarProdutoPorId(id){
    try {
        const resultado = await db('produtos').where({id:id, ativo: true}).first();
        return resultado
    } catch (e) {
        throw e;
    }
};
