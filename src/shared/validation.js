import { AppError } from './AppError.js';
export function positiveId(value) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) throw new AppError('ID inválido', 400);
    return id;
}
export function objectBody(value, fields) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !fields.includes(key))) throw new AppError('Corpo inválido ou campos desconhecidos', 400);
}
export function pagination(query) {
    const page = query.page === undefined ? 1 : positiveId(query.page);
    const limit = query.limit === undefined ? 20 : positiveId(query.limit);
    if (limit > 100 || !Number.isSafeInteger((page - 1) * limit)) throw new AppError('Paginação inválida', 400);
    return { page, limit, offset: (page - 1) * limit };
}
export function idempotencyKey(value) {
    if (typeof value !== 'string' || !/^[\w-]{8,100}$/.test(value)) throw new AppError('Idempotency-Key deve conter 8 a 100 letras, números, _ ou -', 400);
    return value;
}
