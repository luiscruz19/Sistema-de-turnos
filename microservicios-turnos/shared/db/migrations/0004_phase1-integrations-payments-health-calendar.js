/**
 * Fase 1: cobros (MP) + historia clinica + google calendar sync.
 * DB: turnos
 *
 * Compatible con MySQL < 8.0.27 (sin IF NOT EXISTS en ADD COLUMN).
 */

async function addColumnIfMissing(queryInterface, table, column, spec) {
    const desc = await queryInterface.describeTable(table);
    if (!desc[column]) {
        await queryInterface.addColumn(table, column, spec);
    }
}

export async function up(queryInterface, Sequelize) {
    // ── 1. payment_intents ─────────────────────────────────────────────
    await queryInterface.createTable('payment_intents', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        appointment_id: { type: Sequelize.INTEGER, allowNull: true },
        client_contact_id: { type: Sequelize.INTEGER, allowNull: true },
        provider: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'mercadopago' },
        mode: { type: Sequelize.ENUM('live', 'simulated'), allowNull: false, defaultValue: 'live' },
        amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        currency: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'ARS' },
        status: {
            type: Sequelize.ENUM('pending', 'paid', 'expired', 'cancelled', 'refunded'),
            allowNull: false,
            defaultValue: 'pending',
        },
        description: { type: Sequelize.STRING(255), allowNull: true },
        mp_preference_id: { type: Sequelize.STRING(120), allowNull: true },
        mp_init_point: { type: Sequelize.STRING(500), allowNull: true },
        mp_external_reference: { type: Sequelize.STRING(120), allowNull: true },
        expires_at: { type: Sequelize.DATE, allowNull: true },
        paid_at: { type: Sequelize.DATE, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('payment_intents', ['appointment_id']);
    await queryInterface.addIndex('payment_intents', ['status']);
    await queryInterface.addIndex('payment_intents', ['mp_preference_id']);
    await queryInterface.addIndex('payment_intents', ['mp_external_reference']);

    // ── 3. payment_transactions ────────────────────────────────────────
    await queryInterface.createTable('payment_transactions', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        payment_intent_id: { type: Sequelize.INTEGER, allowNull: false },
        provider: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'mercadopago' },
        mp_payment_id: { type: Sequelize.STRING(120), allowNull: true },
        status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'pending' },
        status_detail: { type: Sequelize.STRING(100), allowNull: true },
        amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        raw_payload: { type: Sequelize.JSON, allowNull: true },
        event_type: { type: Sequelize.STRING(50), allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('payment_transactions', ['payment_intent_id']);
    await queryInterface.addIndex('payment_transactions', ['mp_payment_id']);

    // ── 4. client_records ──────────────────────────────────────────────
    await queryInterface.createTable('client_records', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        client_contact_id: { type: Sequelize.INTEGER, allowNull: false },
        summary: { type: Sequelize.TEXT, allowNull: true },
        allergies: { type: Sequelize.TEXT, allowNull: true },
        medications: { type: Sequelize.TEXT, allowNull: true },
        conditions: { type: Sequelize.TEXT, allowNull: true },
        blood_type: { type: Sequelize.STRING(10), allowNull: true },
        emergency_contact: { type: Sequelize.STRING(200), allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('client_records', ['client_contact_id'], { unique: true });

    // ── 5. client_notes ────────────────────────────────────────────────
    await queryInterface.createTable('client_notes', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        client_contact_id: { type: Sequelize.INTEGER, allowNull: false },
        professional_id: { type: Sequelize.INTEGER, allowNull: true },
        appointment_id: { type: Sequelize.INTEGER, allowNull: true },
        author_user_id: { type: Sequelize.INTEGER, allowNull: true },
        content: { type: Sequelize.TEXT, allowNull: false },
        is_private: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('client_notes', ['client_contact_id']);
    await queryInterface.addIndex('client_notes', ['professional_id']);
    await queryInterface.addIndex('client_notes', ['appointment_id']);

    // ── 6. client_attachments ──────────────────────────────────────────
    await queryInterface.createTable('client_attachments', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        client_contact_id: { type: Sequelize.INTEGER, allowNull: false },
        file_url: { type: Sequelize.STRING(500), allowNull: false },
        file_name: { type: Sequelize.STRING(255), allowNull: false },
        mime_type: { type: Sequelize.STRING(120), allowNull: true },
        size_bytes: { type: Sequelize.BIGINT, allowNull: true },
        uploaded_by: { type: Sequelize.INTEGER, allowNull: true },
        description: { type: Sequelize.STRING(500), allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('client_attachments', ['client_contact_id']);

    // ── 7. professional_calendar_sync ──────────────────────────────────
    await queryInterface.createTable('professional_calendar_sync', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        professional_id: { type: Sequelize.INTEGER, allowNull: false },
        provider: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'google_calendar' },
        google_calendar_id: { type: Sequelize.STRING(255), allowNull: true, defaultValue: 'primary' },
        integration_scope: { type: Sequelize.STRING(100), allowNull: true },
        sync_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        last_synced_at: { type: Sequelize.DATE, allowNull: true },
        last_sync_status: { type: Sequelize.STRING(20), allowNull: true },
        last_sync_error: { type: Sequelize.STRING(500), allowNull: true },
        sync_token: { type: Sequelize.STRING(500), allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('professional_calendar_sync', ['professional_id'], { unique: true });

    // ── 8. business_configs: nuevas columnas ───────────────────────────
    await addColumnIfMissing(queryInterface, 'business_configs', 'require_payment', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    });
    await addColumnIfMissing(queryInterface, 'business_configs', 'payment_advance_pct', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
    });
    await addColumnIfMissing(queryInterface, 'business_configs', 'enable_health_records', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    });

    // ── 9. appointments: link a payment_intent actual ──────────────────
    await addColumnIfMissing(queryInterface, 'appointments', 'current_payment_intent_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
    });
    await addColumnIfMissing(queryInterface, 'appointments', 'payment_required', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    });
}

export async function down(queryInterface) {
    // Drop columnas agregadas (best-effort)
    const safeRemove = async (table, col) => {
        try { await queryInterface.removeColumn(table, col); } catch {}
    };
    await safeRemove('appointments', 'payment_required');
    await safeRemove('appointments', 'current_payment_intent_id');
    await safeRemove('business_configs', 'enable_health_records');
    await safeRemove('business_configs', 'payment_advance_pct');
    await safeRemove('business_configs', 'require_payment');

    await queryInterface.dropTable('professional_calendar_sync');
    await queryInterface.dropTable('client_attachments');
    await queryInterface.dropTable('client_notes');
    await queryInterface.dropTable('client_records');
    await queryInterface.dropTable('payment_transactions');
    await queryInterface.dropTable('payment_intents');
}
