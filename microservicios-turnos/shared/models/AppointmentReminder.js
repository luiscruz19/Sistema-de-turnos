import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const AppointmentReminder = sequelize.define('appointment_reminders', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    appointment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('24h', '2h', 'custom'),
        allowNull: false,
    },
    channel: {
        type: DataTypes.ENUM('whatsapp', 'email', 'sms'),
        allowNull: false,
    },
    sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('sent', 'failed'),
        allowNull: false,
        defaultValue: 'sent',
    },
}, {
    tableName: 'appointment_reminders',
    timestamps: true,
    updatedAt: false,
    indexes: [
        { fields: ['appointment_id'] },
    ]
});

export default AppointmentReminder;
