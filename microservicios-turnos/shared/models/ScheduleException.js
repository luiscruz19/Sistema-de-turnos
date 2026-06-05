import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const ScheduleException = sequelize.define('schedule_exceptions', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    professional_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    start_time: {
        type: DataTypes.TIME,
        allowNull: true,
        comment: 'null cuando is_blocked=true (todo el día bloqueado)',
    },
    end_time: {
        type: DataTypes.TIME,
        allowNull: true,
    },
    is_blocked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'true = no disponible, false = horario especial',
    },
    reason: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    tableName: 'schedule_exceptions',
    timestamps: true,
    indexes: [
        { fields: ['professional_id', 'date'] },
        { fields: ['date'] },
    ]
});

export default ScheduleException;
