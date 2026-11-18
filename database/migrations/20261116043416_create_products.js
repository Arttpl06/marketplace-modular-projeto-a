export async function up(knex) {
   await knex.schema.createTable("produtos" , (table) => {
        table.increments("id").primary()
        table.string("nome" , 150).notNullable();
        table.decimal("preco",10,2).notNullable();
        table.integer("estoque").notNullable().defaultTo(0);
        table.text("descricao").nullable()
    });
}

export async function down(knex) {
    await knex.schema.dropTable("produtos")
}