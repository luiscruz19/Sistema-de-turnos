import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const Appointment = sequelize.define('appointments', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    professional_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    service_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    client_contact_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    client_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: {
                msg: 'El nombre del cliente es requerido',
            },
        },
    },
    client_email: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    client_phone: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    start_time: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    end_time: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show'),
        allowNull: false,
        defaultValue: 'pending',
    },
    source: {
        type: DataTypes.ENUM('web', 'whatsapp', 'manual'),
        allowNull: false,
        defaultValue: 'manual',
    },
    deposit_status: {
        type: DataTypes.ENUM('none', 'pending', 'paid'),
        allowNull: false,
        defaultValue: 'none',
    },
    deposit_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    reminder_sent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    reminder_24h_sent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    reminder_email_24h_sent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    reminder_email_2h_sent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    cancel_reason: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    external_calendar_id: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'ID de evento en Google Calendar',
    },
    current_payment_intent_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Ultimo PaymentIntent asociado al turno',
    },
    client_package_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Paquete de sesiones del que se descontó este turno',
    },
    rescheduled_from_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Si el turno surgió de reprogramar otro, id del original',
    },
    payment_required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
}, {
    tableName: 'appointments',
    timestamps: true,
    indexes: [
        { fields: ['date'] },
        { fields: ['status'] },
        { fields: ['professional_id', 'date'] },
        { fields: ['service_id'] },
        { fields: ['client_contact_id'] },
        { fields: ['date', 'start_time'] },
        { fields: ['client_package_id'] },
    ]
});

export default Appointment;
