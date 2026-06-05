import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const AnalyticsDaily = sequelize.define('analytics_daily', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    total_appointments: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    confirmed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    cancelled: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    no_shows: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    revenue: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
    },
    new_clients: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'analytics_daily',
    timestamps: true,
    indexes: [
        { fields: ['date'], unique: true },
    ]
});

export default AnalyticsDaily;
