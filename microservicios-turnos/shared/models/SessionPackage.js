import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const SessionPackage = sequelize.define('session_packages', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nombre: {
        type: DataTypes.STRING(300),
        allowNull: false,
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    service_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    sesiones_total: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    precio: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    validez_dias: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Días de validez desde la compra. null = sin vencimiento',
    },
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'session_packages',
    timestamps: true,
    paranoid: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['service_id'] },
    ],
});

export default SessionPackage;
