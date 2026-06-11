/**
 * Migración: soft-delete para clientes (client_contacts).
 * DB: turnos
 *
 * Agrega la columna `active` a client_contacts para poder dar de baja un
 * cliente sin borrarlo físicamente (preservando su historial de turnos,
 * paquetes e inscripciones). Coincide con el patrón ya usado en
 * services/professionals.
 *
 * Idempotente: la columna/índice se agregan solo si no existen.
 */

async function columnExists(queryInterface, table, column) {
    const desc = await queryInterface.describeTable(table);
    return Object.prototype.hasOwnProperty.call(desc, column);
}

export async function up(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, 'client_contacts', 'active'))) {
        await queryInterface.addColumn('client_contacts', 'active', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Soft-delete: false = cliente dado de baja (oculto en listados)',
        });
        await queryInterface.addIndex('client_contacts', ['active'], {
            name: 'idx_client_contacts_active',
        });
        console.info('    ~ Campo active agregado a client_contacts');
    }
}

export async function down(queryInterface) {
    const desc = await queryInterface.describeTable('client_contacts');
    if (Object.prototype.hasOwnProperty.call(desc, 'active')) {
        await queryInterface.removeIndex('client_contacts', 'idx_client_contacts_active');
        await queryInterface.removeColumn('client_contacts', 'active');
    }
}
