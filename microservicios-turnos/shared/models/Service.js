import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const Service = sequelize.define('services', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: {
                msg: 'El nombre del servicio es requerido',
            },
        },
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    duration_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30,
    },
    buffer_time_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Tiempo de preparación entre turnos (en minutos)',
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
    },
    deposit_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    requires_professional: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    max_concurrent: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Para canchas/salas: cuántos turnos simultáneos',
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'services',
    timestamps: true,
    indexes: [
        { fields: ['active'] },
        { fields: ['category'] },
    ]
});

export default Service;
