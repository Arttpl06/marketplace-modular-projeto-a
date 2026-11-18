import { beforeEach, expect, jest, test } from '@jest/globals';


const criarProdutoMock = jest.fn();
const buscarProdutoPorIdMock = jest.fn()


jest.unstable_mockModule(
    '../../src/modules/catalog/catalog.repository.js',
    () => ({
        criarProduto: criarProdutoMock,
        buscarProdutoPorId: buscarProdutoPorIdMock
    })
);

const { cadastrarProduto } = await import(
    '../../src/modules/catalog/catalog.service.js'
);

beforeEach(() =>{
    jest.clearAllMocks();
})


test('deve normalizar o nome antes de cadastrar', async () => {

    const produto = {
        nome: ' Notebook    ',
        preco: 3500,
        estoque: 10,
        descricao: 'Notebook para estudos'
    };
    

    criarProdutoMock.mockResolvedValue(7);

    const id = await cadastrarProduto(produto);

    expect(criarProdutoMock).toHaveBeenCalledWith({
    nome: 'Notebook',
    preco: 3500,
    estoque: 10,
    descricao: 'Notebook para estudos'
});

    expect(id).toBe(7);

    expect(criarProdutoMock).toHaveBeenCalledTimes(1);
});

test('não deve chamar o Repository quando o preço for inválido', async () => {

    const produto = {
        nome: 'Notebook',
        preco: -500,
        estoque: 10,
        descricao: 'Notebook para estudos'
    };

    await expect(cadastrarProduto(produto)).rejects.toThrow("Preco inválido");

    expect(criarProdutoMock).toHaveBeenCalledTimes(0);
});