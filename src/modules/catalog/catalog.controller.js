import { obterProdutoPorId, cadastrarProduto, listarProdutos, atualizarProduto, arquivarProduto } from "./catalog.service.js";

export async function buscarProduto(req , res) {
    const id = Number(req.params.id);
    
    const produto = await obterProdutoPorId(id);

    res.status(200).json(produto);
}

export async function listar(req, res) { res.json(await listarProdutos(req.query)); }
export async function criar(req, res) {
    const id = await cadastrarProduto(req.body);
    res.status(201).location(`/produtos/${id}`).json(await obterProdutoPorId(id));
}
export async function atualizar(req, res) { res.json(await atualizarProduto(Number(req.params.id), req.body)); }
export async function arquivar(req, res) { await arquivarProduto(Number(req.params.id)); res.status(204).end(); }
