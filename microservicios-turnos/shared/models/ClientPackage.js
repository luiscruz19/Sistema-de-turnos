import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const ClientPackage = sequelize.define('client_packages', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    client_contact_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    session_package_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    sesiones_usadas: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    sesiones_total: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    precio_pagado: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    fecha_compra: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    fecha_vencimiento: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    estado: {
        type: DataTypes.ENUM('activo', 'completado', 'vencido', 'cancelado'),
        allowNull: false,
        defaultValue: 'activo',
    },
}, {
    tableName: 'client_packages',
    timestamps: true,
    paranoid: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['client_contact_id'] },
        { fields: ['session_package_id'] },
    ],
});

export default ClientPackage;
