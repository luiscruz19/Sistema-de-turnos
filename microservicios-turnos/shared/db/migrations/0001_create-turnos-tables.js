/**
 * Migración: Crear todas las tablas del producto Asistente de Turnos IA.
 * DB: turnos.
 */

export async function up(queryInterface, Sequelize) {

    // ── business_configs: configuración del negocio ──
    await queryInterface.createTable('business_configs', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING, allowNull: false },
        address: { type: Sequelize.STRING, allowNull: true },
        phone: { type: Sequelize.STRING, allowNull: true },
        timezone: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'America/Argentina/Buenos_Aires' },
        currency: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'ARS' },
        booking_advance_days: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30, comment: 'Cuántos días adelante se puede reservar' },
        cancellation_policy_hours: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 24, comment: 'Horas mínimas antes para cancelar' },
        slot_duration_default: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30, comment: 'Duración por defecto del slot en minutos' },
        auto_confirm: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        deposit_required: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        deposit_percentage: { type: Sequelize.DECIMAL(5, 2), allowNull: true, defaultValue: 0, comment: 'Porcentaje de seña requerido' },
        api_key: { type: Sequelize.STRING(64), allowNull: false, unique: true, comment: 'API key para autenticar el widget' },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('business_configs', ['api_key'], { unique: true });

    // ── professionals: profesionales que atienden ──
    await queryInterface.createTable('professionals', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING, allowNull: false },
        email: { type: Sequelize.STRING, allowNull: true },
        phone: { type: Sequelize.STRING, allowNull: true },
        specialty: { type: Sequelize.STRING, allowNull: true },
        avatar_url: { type: Sequelize.STRING, allowNull: true },
        color: { type: Sequelize.STRING(20), allowNull: true, defaultValue: '#6366f1', comment: 'Color para UI calendar' },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('professionals', ['active']);

    // ── services: servicios ofrecidos ──
    await queryInterface.createTable('services', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING, allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        duration_minutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30 },
        price: { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
        deposit_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
        category: { type: Sequelize.STRING, allowNull: true },
        requires_professional: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        max_concurrent: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1, comment: 'Para canchas/salas: cuántos turnos simultáneos' },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('services', ['active']);
    await queryInterface.addIndex('services', ['category']);

    // ── professional_services: pivot profesional-servicio ──
    await queryInterface.createTable('professional_services', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        professional_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'professionals', key: 'id' }, onDelete: 'CASCADE' },
        service_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'services', key: 'id' }, onDelete: 'CASCADE' },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('professional_services', ['professional_id', 'service_id'], { unique: true });

    // ── schedules: horarios de atención ──
    await queryInterface.createTable('schedules', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        professional_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'professionals', key: 'id' }, onDelete: 'CASCADE', comment: 'null = horario del negocio' },
        day_of_week: { type: Sequelize.INTEGER, allowNull: false, comment: '0=Domingo, 1=Lunes, ..., 6=Sábado' },
        start_time: { type: Sequelize.TIME, allowNull: false },
        end_time: { type: Sequelize.TIME, allowNull: false },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('schedules', ['professional_id']);
    await queryInterface.addIndex('schedules', ['day_of_week']);

    // ── schedule_exceptions: excepciones de horario ──
    await queryInterface.createTable('schedule_exceptions', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        professional_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'professionals', key: 'id' }, onDelete: 'CASCADE' },
        date: { type: Sequelize.DATEONLY, allowNull: false },
        start_time: { type: Sequelize.TIME, allowNull: true, comment: 'null cuando is_blocked=true (todo el día bloqueado)' },
        end_time: { type: Sequelize.TIME, allowNull: true },
        is_blocked: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true, comment: 'true = no disponible, false = horario especial' },
        reason: { type: Sequelize.STRING, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('schedule_exceptions', ['professional_id', 'date']);
    await queryInterface.addIndex('schedule_exceptions', ['date']);

    // ── client_contacts: contactos/pacientes del negocio ──
    await queryInterface.createTable('client_contacts', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING, allowNull: false },
        email: { type: Sequelize.STRING, allowNull: true },
        phone: { type: Sequelize.STRING, allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        last_appointment_at: { type: Sequelize.DATE, allowNull: true },
        appointment_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        no_show_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('client_contacts', ['email']);
    await queryInterface.addIndex('client_contacts', ['phone']);

    // ── appointments: turnos ──
    await queryInterface.createTable('appointments', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        professional_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'professionals', key: 'id' }, onDelete: 'SET NULL' },
        service_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'services', key: 'id' }, onDelete: 'RESTRICT' },
        client_contact_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'client_contacts', key: 'id' }, onDelete: 'SET NULL' },
        client_name: { type: Sequelize.STRING, allowNull: false },
        client_email: { type: Sequelize.STRING, allowNull: true },
        client_phone: { type: Sequelize.STRING, allowNull: true },
        date: { type: Sequelize.DATEONLY, allowNull: false },
        start_time: { type: Sequelize.TIME, allowNull: false },
        end_time: { type: Sequelize.TIME, allowNull: false },
        status: { type: Sequelize.ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show'), allowNull: false, defaultValue: 'pending' },
        source: { type: Sequelize.ENUM('web', 'whatsapp', 'manual'), allowNull: false, defaultValue: 'manual' },
        deposit_status: { type: Sequelize.ENUM('none', 'pending', 'paid'), allowNull: false, defaultValue: 'none' },
        deposit_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
        notes: { type: Sequelize.TEXT, allowNull: true },
        reminder_sent: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        reminder_24h_sent: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        cancelled_at: { type: Sequelize.DATE, allowNull: true },
        cancel_reason: { type: Sequelize.STRING, allowNull: true },
        external_calendar_id: { type: Sequelize.STRING, allowNull: true, comment: 'ID de evento en Google Calendar' },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('appointments', ['date']);
    await queryInterface.addIndex('appointments', ['status']);
    await queryInterface.addIndex('appointments', ['professional_id', 'date']);
    await queryInterface.addIndex('appointments', ['service_id']);
    await queryInterface.addIndex('appointments', ['client_contact_id']);
    await queryInterface.addIndex('appointments', ['date', 'start_time']);

    // ── appointment_reminders: recordatorios enviados ──
    await queryInterface.createTable('appointment_reminders', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        appointment_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'appointments', key: 'id' }, onDelete: 'CASCADE' },
        type: { type: Sequelize.ENUM('24h', '2h', 'custom'), allowNull: false },
        channel: { type: Sequelize.ENUM('whatsapp', 'email', 'sms'), allowNull: false },
        sent_at: { type: Sequelize.DATE, allowNull: true },
        status: { type: Sequelize.ENUM('sent', 'failed'), allowNull: false, defaultValue: 'sent' },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('appointment_reminders', ['appointment_id']);

    // ── whatsapp_sessions: sesiones de WhatsApp para el asistente IA ──
    await queryInterface.createTable('whatsapp_sessions', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        phone_number: { type: Sequelize.STRING, allowNull: false },
        conversation_state: { type: Sequelize.ENUM('idle', 'booking', 'confirming', 'cancelling'), allowNull: false, defaultValue: 'idle' },
        current_data: { type: Sequelize.JSON, allowNull: true, comment: 'Datos parciales de la reserva en curso' },
        last_message_at: { type: Sequelize.DATE, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('whatsapp_sessions', ['phone_number'], { unique: true });

    // ── analytics_daily: métricas diarias precalculadas ──
    await queryInterface.createTable('analytics_daily', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        date: { type: Sequelize.DATEONLY, allowNull: false },
        total_appointments: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        confirmed: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        cancelled: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        no_shows: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        revenue: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        new_clients: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('analytics_daily', ['date'], { unique: true });
}

export async function down(queryInterface) {
    const tables = [
        'analytics_daily', 'whatsapp_sessions', 'appointment_reminders',
        'appointments', 'client_contacts', 'schedule_exceptions', 'schedules',
        'professional_services', 'services', 'professionals', 'business_configs',
    ];
    for (const table of tables) {
        await queryInterface.dropTable(table);
    }
}
