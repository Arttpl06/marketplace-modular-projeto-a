import request from 'supertest';
import app from '../../src/app.js';

test('deve retornar 400 para ID inválido', async () => {

    const resposta = await request(app).get('/produtos/0');

    expect(resposta.status).toBe(400);

    expect(resposta.body).toEqual({"erro": "ID inválido"})
});

test('deve retornar 404 quando o produto não existir', async () => {

    const resposta = await request(app).get('/produtos/999999');

    expect(resposta.status).toBe(404);

    expect(resposta.body).toEqual({"erro":"Produto não encontrado"})
});