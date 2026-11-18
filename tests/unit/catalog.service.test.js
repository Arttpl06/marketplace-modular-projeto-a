import { cadastrarProduto } from "../../src/modules/catalog/catalog.service.js";

test('não deve cadastrar produto com estoque decimal', async () => {

    const produto = {
        nome: 'Notebook',
        preco: 3500,
        estoque: 2.5,
        descricao: 'Notebook para estudos'
    };

    await expect(cadastrarProduto(produto)).rejects.toThrow("Estoque inválido");
});


test('não deve cadastrar produto com preço negativo', async () => {
    const produto = {
        nome: 'TV',
        preco: -1000,
        estoque: 3,
        descricao: 'TV HD'
    };

    await expect(cadastrarProduto(produto)).rejects.toThrow("Preco inválido");
});

test('não deve cadastrar produto com nome vazio ou apenas espaços', async () => {
    const produto = {
        nome: ' ',
        preco: 1000,
        estoque: 33,
        descricao: 'Iphone'
    };

    await expect(cadastrarProduto(produto)).rejects.toThrow("Nome inválido");
});