export async function up(knex) {
    await knex.schema.createTable('app_locks', t => { t.string('name', 100).primary(); });
    await knex('app_locks').insert({ name: 'synthetic_seed' });
}
export async function down(knex) { await knex.schema.dropTable('app_locks'); }
