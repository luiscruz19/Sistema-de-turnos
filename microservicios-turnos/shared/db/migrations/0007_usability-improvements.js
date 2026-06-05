/**
 * Migración: mejoras de usabilidad real.
 * DB: turnos
 *
 * - appointments: recordatorios por email (24h/2h), vínculo a paquete usado,
 *   y referencia al turno original cuando se reprograma.
 * - group_class_enrollments: estado "lista_espera" para cupos llenos.
 *
 * Idempotente: cada columna/índice se agrega solo si no existe.
 */

async function columnExists(queryInterface, table, column) {
    const desc = await queryInterface.describeTable(table);
    return Object.prototype.hasOwnProperty.call(desc, column);
}

export async function up(queryInterface, Sequelize) {
    // --- appointments: recordatorios por email ---
    if (!(await columnExists(queryInterface, 'appointments', 'reminder_email_24h_sent'))) {
        await queryInterface.addColumn('appointments', 'reminder_email_24h_sent', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            after: 'reminder_24h_sent',
        });
        console.info('    ~ Campo reminder_email_24h_sent agregado a appointments');
    }

    if (!(await columnExists(queryInterface, 'appointments', 'reminder_email_2h_sent'))) {
        await queryInterface.addColumn('appointments', 'reminder_email_2h_sent', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            after: 'reminder_email_24h_sent',
        });
        console.info('    ~ Campo reminder_email_2h_sent agregado a appointments');
    }

    // --- appointments: vínculo al paquete de sesiones usado ---
    if (!(await columnExists(queryInterface, 'appointments', 'client_package_id'))) {
        await queryInterface.addColumn('appointments', 'client_package_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            comment: 'Paquete de sesiones del que se descontó este turno',
            after: 'current_payment_intent_id',
        });
        await queryInterface.addIndex('appointments', ['client_package_id'], {
            name: 'idx_appointments_client_package_id',
        });
        console.info('    ~ Campo client_package_id agregado a appointments');
    }

    // --- appointments: referencia al turno original al reprogramar ---
    if (!(await columnExists(queryInterface, 'appointments', 'rescheduled_from_id'))) {
        await queryInterface.addColumn('appointments', 'rescheduled_from_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            comment: 'Si el turno surgió de reprogramar otro, id del original',
            after: 'client_package_id',
        });
        console.info('    ~ Campo rescheduled_from_id agregado a appointments');
    }

    // --- group_class_enrollments: estado lista_espera + posición ---
    // Ampliar el ENUM de estado para incluir 'lista_espera'.
    await queryInterface.changeColumn('group_class_enrollments', 'estado', {
        type: Sequelize.ENUM('inscripto', 'lista_espera', 'cancelado', 'asistio', 'no_asistio'),
        allowNull: false,
        defaultValue: 'inscripto',
    });
    console.info('    ~ ENUM estado ampliado en group_class_enrollments (lista_espera)');

    if (!(await columnExists(queryInterface, 'group_class_enrollments', 'waitlist_position'))) {
        await queryInterface.addColumn('group_class_enrollments', 'waitlist_position', {
            type: Sequelize.INTEGER,
            allowNull: true,
            comment: 'Orden en la lista de espera de la clase',
            after: 'estado',
        });
        console.info('    ~ Campo waitlist_position agregado a group_class_enrollments');
    }
}

export async function down(queryInterface, Sequelize) {
    const safeRemove = async (table, column) => {
        const desc = await queryInterface.describeTable(table);
        if (Object.prototype.hasOwnProperty.call(desc, column)) {
            await queryInterface.removeColumn(table, column);
        }
    };

    await safeRemove('group_class_enrollments', 'waitlist_position');
    await queryInterface.changeColumn('group_class_enrollments', 'estado', {
        type: Sequelize.ENUM('inscripto', 'cancelado', 'asistio', 'no_asistio'),
        allowNull: false,
        defaultValue: 'inscripto',
    });

    await safeRemove('appointments', 'rescheduled_from_id');
    await safeRemove('appointments', 'client_package_id');
    await safeRemove('appointments', 'reminder_email_2h_sent');
    await safeRemove('appointments', 'reminder_email_24h_sent');
}
