import * as repository from './catalog.repository.js';
import { AppError } from '../../shared/AppError.js';
import { objectBody, positiveId, pagination } from '../../shared/validation.js';
import { catalogCache } from '../../shared/cache.js';

export function validarProduto(produto) {
    objectBody(produto, ['nome', 'preco', 'estoque', 'descricao']);
    if(typeof produto.nome !== 'string' || !produto.nome.trim()){
        throw new AppError("Nome inválido", 400);
    }
    if(typeof produto.preco !== 'number' || produto.preco <= 0 || !Number.isFinite(produto.preco)){
        throw new AppError("Preco inválido", 400);
    }
    if(!Number.isInteger(produto.estoque) || produto.estoque < 0){
        throw new AppError("Estoque inválido", 400);
    }

    if (produto.nome.trim().length > 150 || produto.preco > 99999999.99 ||
        Math.abs(produto.preco * 100 - Math.round(produto.preco * 100)) > 0.000001 || produto.estoque > 2147483647 ||
        (produto.descricao !== undefined && produto.descricao !== null && (typeof produto.descricao !== 'string' || produto.descricao.length > 5000))) throw new AppError('Produto fora dos limites permitidos', 400);
    return {
        ...produto,
        nome: produto.nome.trim()
    }

}

export async function cadastrarProduto(produto) {
    const id = await repository.criarProduto(validarProduto(produto));
    catalogCache.clear();
    return id;
}

export async function obterProdutoPorId(id) {
    if(!Number.isSafeInteger(id) || id <= 0){
        throw new AppError("ID inválido", 400);
    };
    const produto = await repository.buscarProdutoPorId(id);

    if(!produto){
        throw new AppError("Produto não encontrado", 404);
    }

    return produto;
}

export async function listarProdutos(query = {}) {
    const { page, limit, offset } = pagination(query);
    if (query.q !== undefined && (typeof query.q !== 'string' || query.q.length > 150)) throw new AppError('Busca inválida', 400);
    const q = query.q?.trim() || '';
    const key = JSON.stringify([page, limit, q]);
    const cached = process.env.CATALOG_CACHE_ENABLED !== 'false' && catalogCache.get(key);
    if (cached) return cached;
    const response = { data: await repository.listProdutos({ limit, offset, q }), page, limit };
    if (process.env.CATALOG_CACHE_ENABLED !== 'false') catalogCache.set(key, response);
    return response;
}
export async function atualizarProduto(id, body) {
    positiveId(id);
    objectBody(body, ['nome', 'descricao', 'preco', 'estoque']);
    if (!Object.keys(body).length) throw new AppError('Produto inválido', 400);
    const current = await obterProdutoPorId(id);
    validarProduto({ nome: current.nome, descricao: current.descricao, preco: Number(current.preco), estoque: current.estoque, ...body });
    const patch = { ...body, ...(body.nome !== undefined ? { nome: body.nome.trim() } : {}) };
    if (!await repository.atualizarProduto(id, patch)) throw new AppError('Produto não encontrado', 404);
    catalogCache.clear();
    return obterProdutoPorId(id);
}

export async function arquivarProduto(id) {
    positiveId(id);
    if (!await repository.atualizarProduto(id, { ativo: false })) throw new AppError('Produto não encontrado', 404);
    catalogCache.clear();
}
