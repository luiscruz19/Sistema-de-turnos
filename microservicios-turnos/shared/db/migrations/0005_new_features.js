/**
 * Migración: Nuevas features del producto Asistente de Turnos IA.
 * DB: turnos — intake forms, paquetes de sesiones, lista de espera, clases grupales.
 */

export async function up(queryInterface, Sequelize) {

    // intake_forms: formularios de intake pre-turno
    await queryInterface.createTable('intake_forms', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        service_id: { type: Sequelize.INTEGER, allowNull: true, comment: 'null = aplica a todos los servicios' },
        nombre: { type: Sequelize.STRING(300), allowNull: false },
        descripcion: { type: Sequelize.TEXT, allowNull: true },
        activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('intake_forms', ['service_id']);
    console.info('    ~ Tabla intake_forms creada');

    // intake_fields: campos del formulario de intake
    await queryInterface.createTable('intake_fields', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        intake_form_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'intake_forms', key: 'id' }, onDelete: 'CASCADE' },
        label: { type: Sequelize.STRING(300), allowNull: false },
        tipo: { type: Sequelize.ENUM('text', 'textarea', 'select', 'radio', 'checkbox', 'date'), allowNull: false, defaultValue: 'text' },
        opciones: { type: Sequelize.JSON, allowNull: true, comment: 'Opciones para tipos select/radio/checkbox' },
        requerido: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('intake_fields', ['intake_form_id']);
    console.info('    ~ Tabla intake_fields creada');

    // intake_responses: respuestas del cliente a un intake
    await queryInterface.createTable('intake_responses', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        appointment_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'appointments', key: 'id' }, onDelete: 'CASCADE' },
        intake_form_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'intake_forms', key: 'id' }, onDelete: 'RESTRICT' },
        client_contact_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'client_contacts', key: 'id' }, onDelete: 'SET NULL' },
        respuestas: { type: Sequelize.JSON, allowNull: false, comment: 'Objeto key:value con field_id como clave' },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('intake_responses', ['appointment_id']);
    await queryInterface.addIndex('intake_responses', ['intake_form_id']);
    console.info('    ~ Tabla intake_responses creada');

    // session_packages: paquetes de sesiones disponibles
    await queryInterface.createTable('session_packages', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        nombre: { type: Sequelize.STRING(300), allowNull: false },
        descripcion: { type: Sequelize.TEXT, allowNull: true },
        service_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'services', key: 'id' }, onDelete: 'RESTRICT' },
        sesiones_total: { type: Sequelize.INTEGER, allowNull: false },
        precio: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        validez_dias: { type: Sequelize.INTEGER, allowNull: true, comment: 'Días de validez desde la compra. null = sin vencimiento' },
        activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('session_packages', ['service_id']);
    console.info('    ~ Tabla session_packages creada');

    // client_packages: paquetes comprados por clientes
    await queryInterface.createTable('client_packages', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        client_contact_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'client_contacts', key: 'id' }, onDelete: 'RESTRICT' },
        session_package_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'session_packages', key: 'id' }, onDelete: 'RESTRICT' },
        sesiones_usadas: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        sesiones_total: { type: Sequelize.INTEGER, allowNull: false },
        precio_pagado: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        fecha_compra: { type: Sequelize.DATEONLY, allowNull: false },
        fecha_vencimiento: { type: Sequelize.DATEONLY, allowNull: true },
        estado: { type: Sequelize.ENUM('activo', 'completado', 'vencido', 'cancelado'), allowNull: false, defaultValue: 'activo' },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('client_packages', ['client_contact_id']);
    await queryInterface.addIndex('client_packages', ['session_package_id']);
    console.info('    ~ Tabla client_packages creada');

    // waitlist_entries: lista de espera para turnos
    await queryInterface.createTable('waitlist_entries', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        client_contact_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'client_contacts', key: 'id' }, onDelete: 'CASCADE' },
        service_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'services', key: 'id' }, onDelete: 'CASCADE' },
        professional_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'professionals', key: 'id' }, onDelete: 'SET NULL', comment: 'Preferencia de profesional. null = cualquiera' },
        fecha_preferida: { type: Sequelize.DATEONLY, allowNull: true },
        notificado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        notificado_at: { type: Sequelize.DATE, allowNull: true },
        estado: { type: Sequelize.ENUM('esperando', 'notificado', 'reservado', 'cancelado'), allowNull: false, defaultValue: 'esperando' },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('waitlist_entries', ['client_contact_id']);
    await queryInterface.addIndex('waitlist_entries', ['service_id']);
    await queryInterface.addIndex('waitlist_entries', ['estado']);
    console.info('    ~ Tabla waitlist_entries creada');

    // group_classes: clases grupales
    await queryInterface.createTable('group_classes', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        service_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'services', key: 'id' }, onDelete: 'RESTRICT' },
        professional_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'professionals', key: 'id' }, onDelete: 'SET NULL' },
        titulo: { type: Sequelize.STRING(300), allowNull: false },
        descripcion: { type: Sequelize.TEXT, allowNull: true },
        fecha_hora: { type: Sequelize.DATE, allowNull: false },
        duracion_minutos: { type: Sequelize.INTEGER, allowNull: false },
        cupo_maximo: { type: Sequelize.INTEGER, allowNull: false },
        precio: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        estado: { type: Sequelize.ENUM('publicada', 'cancelada', 'completada'), allowNull: false, defaultValue: 'publicada' },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('group_classes', ['service_id']);
    await queryInterface.addIndex('group_classes', ['professional_id']);
    await queryInterface.addIndex('group_classes', ['fecha_hora']);
    console.info('    ~ Tabla group_classes creada');

    // group_class_enrollments: inscripciones a clases grupales
    await queryInterface.createTable('group_class_enrollments', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        group_class_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'group_classes', key: 'id' }, onDelete: 'CASCADE' },
        client_contact_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'client_contacts', key: 'id' }, onDelete: 'CASCADE' },
        estado: { type: Sequelize.ENUM('inscripto', 'cancelado', 'asistio', 'no_asistio'), allowNull: false, defaultValue: 'inscripto' },
        payment_intent_id: { type: Sequelize.INTEGER, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('group_class_enrollments', ['group_class_id']);
    await queryInterface.addIndex('group_class_enrollments', ['client_contact_id']);
    await queryInterface.addIndex('group_class_enrollments', ['group_class_id', 'client_contact_id'], { unique: true, name: 'uq_class_enrollment' });
    console.info('    ~ Tabla group_class_enrollments creada');
}

export async function down(queryInterface) {
    const tables = [
        'group_class_enrollments',
        'group_classes',
        'waitlist_entries',
        'client_packages',
        'session_packages',
        'intake_responses',
        'intake_fields',
        'intake_forms',
    ];
    for (const table of tables) {
        await queryInterface.dropTable(table);
    }
}
