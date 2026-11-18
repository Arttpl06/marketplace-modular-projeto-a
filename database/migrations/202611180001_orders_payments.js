export async function up(knex) {
    await knex.schema.createTable('pedidos', t => {
        t.increments('id').primary();
        t.string('chave', 100).notNullable().unique();
        t.string('hash', 64).notNullable();
        t.string('status', 30).notNullable().defaultTo('pendente');
        t.bigInteger('total_centavos').unsigned().notNullable();
        t.timestamp('criado_em').notNullable().defaultTo(knex.fn.now());
    });
    await knex.schema.createTable('pedido_itens', t => {
        t.increments('id').primary();
        t.integer('pedido_id').unsigned().notNullable().references('id').inTable('pedidos');
        t.integer('produto_id').unsigned().notNullable().references('id').inTable('produtos');
        t.integer('quantidade').unsigned().notNullable();
        t.bigInteger('preco_centavos').unsigned().notNullable();
        t.unique(['pedido_id', 'produto_id']);
    });
    await knex.schema.createTable('pagamentos', t => {
        t.increments('id').primary();
        t.integer('pedido_id').unsigned().notNullable().unique().references('id').inTable('pedidos');
        t.string('chave', 100).notNullable().unique();
        t.string('hash', 64).notNullable();
        t.string('resultado', 20).notNullable();
        t.string('status', 20).notNullable().defaultTo('pendente');
        t.timestamp('criado_em').notNullable().defaultTo(knex.fn.now());
    });
    await knex.schema.createTable('jobs', t => {
        t.increments('id').primary();
        t.integer('pagamento_id').unsigned().notNullable().unique().references('id').inTable('pagamentos');
        t.string('status', 20).notNullable().defaultTo('pendente');
        t.integer('tentativas').notNullable().defaultTo(0);
        t.timestamp('disponivel_em').notNullable().defaultTo(knex.fn.now());
        t.index(['status', 'disponivel_em']);
    });
}
export async function down(knex) {
    for (const table of ['jobs', 'pagamentos', 'pedido_itens', 'pedidos']) await knex.schema.dropTable(table);
}
