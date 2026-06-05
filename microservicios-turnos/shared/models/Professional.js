import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const Professional = sequelize.define('professionals', {
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
                msg: 'El nombre del profesional es requerido',
            },
        },
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    specialty: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    avatar_url: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    color: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: '#6366f1',
        comment: 'Color para UI calendar',
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
    tableName: 'professionals',
    timestamps: true,
    indexes: [
        { fields: ['active'] },
    ]
});

export default Professional;
