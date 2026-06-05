import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const WhatsappSession = sequelize.define('whatsapp_sessions', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    phone_number: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    conversation_state: {
        type: DataTypes.ENUM('idle', 'booking', 'confirming', 'cancelling'),
        allowNull: false,
        defaultValue: 'idle',
    },
    current_data: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Datos parciales de la reserva en curso',
    },
    last_message_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'whatsapp_sessions',
    timestamps: true,
    indexes: [
        { fields: ['phone_number'], unique: true },
    ]
});

export default WhatsappSession;
