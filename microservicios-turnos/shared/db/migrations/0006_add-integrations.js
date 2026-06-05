/**
 * Migración: tabla integrations (store single-tenant de credenciales de
 * integraciones externas).
 * DB: turnos
 */

export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable('integrations', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        provider: { type: Sequelize.STRING(50), allowNull: false },
        scope: { type: Sequelize.STRING(100), allowNull: true },
        credentials_encrypted: { type: Sequelize.TEXT('long'), allowNull: true },
        config: { type: Sequelize.JSON, allowNull: true },
        enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        last_tested_at: { type: Sequelize.DATE, allowNull: true },
        last_test_status: { type: Sequelize.STRING(20), allowNull: true },
        last_test_error: { type: Sequelize.STRING(500), allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('integrations', ['provider', 'scope'], {
        unique: true,
        name: 'uq_integration_provider_scope',
    });
}

export async function down(queryInterface) {
    await queryInterface.dropTable('integrations');
}
