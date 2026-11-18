import { jest } from '@jest/globals';
import { normalizeItems, fingerprint } from '../../src/modules/orders/orders.service.js';
import { TTLCache } from '../../src/shared/cache.js';
import { positiveId, pagination, objectBody, idempotencyKey } from '../../src/shared/validation.js';
import { errorHandler } from '../../src/shared/erroHandler.js';
import { AppError } from '../../src/shared/AppError.js';
test.each([undefined, null, {}, { itens: [] }, { itens: [null] }, { itens: [{ produto_id: 1, quantidade: 0 }] }, { itens: [{ produto_id: 1, quantidade: 1 }, { produto_id: 1, quantidade: 2 }] }, { itens: [{ produto_id: '1', quantidade: 1 }] }])('rejeita carrinho inválido %j', body => {
    expect(() => normalizeItems(body)).toThrow(AppError);
});
test('normaliza carrinho para hash independente da ordem', () => {
    const itens = [{ produto_id: 2, quantidade: 1 }, { produto_id: 1, quantidade: 2 }];
    expect(fingerprint(normalizeItems({ itens }))).toBe(fingerprint(normalizeItems({ itens: [...itens].reverse() })));
});
test.each([0, -1, 1.2, 'abc', Infinity, Number.MAX_SAFE_INTEGER + 1])('rejeita ID %s', id => expect(() => positiveId(id)).toThrow());
test('validação de objeto, chave e paginação', () => {
    expect(pagination({})).toEqual({ page: 1, limit: 20, offset: 0 });
    expect(() => pagination({ limit: 101 })).toThrow();
    expect(() => objectBody([], [])).toThrow(); expect(() => objectBody({ a: 1 }, [])).toThrow();
    expect(() => idempotencyKey('a')).toThrow(); expect(idempotencyKey('12345678')).toBe('12345678');
});
test('cache expira, limita memória, isola objetos e invalida', () => {
    jest.useFakeTimers();
    try {
        const cache = new TTLCache(100, 1); const value = { a: 1 };
        cache.set('a', value); value.a = 2; expect(cache.get('a')).toEqual({ a: 1 });
        cache.set('b', 2); expect(cache.get('a')).toBeUndefined();
        jest.advanceTimersByTime(101); expect(cache.get('b')).toBeUndefined();
        cache.set('c', 3); cache.clear(); expect(cache.get('c')).toBeUndefined();
    } finally { jest.useRealTimers(); }
});
test('erro interno não expõe detalhes e respeita headers enviados', () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), headersSent: false };
    const next = jest.fn(); const error = new Error('segredo');
    errorHandler(error, {}, res, next);
    expect(res.status).toHaveBeenCalledWith(500); expect(res.json).toHaveBeenCalledWith({ erro: 'Erro interno do servidor' });
    res.headersSent = true; errorHandler(error, {}, res, next); expect(next).toHaveBeenCalledWith(error);
});
