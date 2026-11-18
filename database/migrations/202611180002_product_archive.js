export async function up(knex) {
    await knex.schema.alterTable('produtos', t => {
        t.boolean('ativo').notNullable().defaultTo(true);
        t.index(['ativo', 'id']);
    });
}
export async function down(knex) {
    await knex.schema.alterTable('produtos', t => { t.dropIndex(['ativo', 'id']); t.dropColumn('ativo'); });
}
