/**
 * Migración: Agrega buffer_time_minutes a services.
 * Tiempo de preparación/limpieza entre turnos, configurable por servicio.
 */

export async function up(queryInterface, Sequelize) {
    await queryInterface.addColumn('services', 'buffer_time_minutes', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Tiempo de preparación entre turnos (en minutos)',
        after: 'duration_minutes',
    });
    console.info('    ~ Campo buffer_time_minutes agregado a services');
}

export async function down(queryInterface) {
    await queryInterface.removeColumn('services', 'buffer_time_minutes');
}
