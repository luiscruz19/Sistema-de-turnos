import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const GroupClass = sequelize.define('group_classes', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    service_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    professional_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    titulo: {
        type: DataTypes.STRING(300),
        allowNull: false,
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    fecha_hora: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    duracion_minutos: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    cupo_maximo: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    precio: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
    },
    estado: {
        type: DataTypes.ENUM('publicada', 'cancelada', 'completada'),
        allowNull: false,
        defaultValue: 'publicada',
    },
}, {
    tableName: 'group_classes',
    timestamps: true,
    paranoid: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['service_id'] },
        { fields: ['professional_id'] },
        { fields: ['fecha_hora'] },
    ],
});

export default GroupClass;
