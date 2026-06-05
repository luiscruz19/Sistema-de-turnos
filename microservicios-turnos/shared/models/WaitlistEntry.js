import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const WaitlistEntry = sequelize.define('waitlist_entries', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    client_contact_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    service_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    professional_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Preferencia de profesional. null = cualquiera',
    },
    fecha_preferida: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    notificado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    notificado_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    estado: {
        type: DataTypes.ENUM('esperando', 'notificado', 'reservado', 'cancelado'),
        allowNull: false,
        defaultValue: 'esperando',
    },
}, {
    tableName: 'waitlist_entries',
    timestamps: true,
    paranoid: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['client_contact_id'] },
        { fields: ['service_id'] },
        { fields: ['estado'] },
    ],
});

export default WaitlistEntry;
