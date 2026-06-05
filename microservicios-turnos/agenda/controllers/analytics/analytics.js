import Appointment from '../../models/Appointment.js';
import ClientContact from '../../models/ClientContact.js';
import Service from '../../models/Service.js';
import Professional from '../../models/Professional.js';
import { Op, fn, col } from 'sequelize';
import { errorMessage, successMessage } from '../../utils/messages.js';
import messages from '../../config/messages.js';

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Obtener estadísticas de turnos
 */
export async function getStats(req, res) {
    try {
        const { date_from, date_to } = req.query;

        const where = {};

        if (date_from && date_to) {
            where.date = { [Op.between]: [date_from, date_to] };
        } else if (date_from) {
            where.date = { [Op.gte]: date_from };
        } else if (date_to) {
            where.date = { [Op.lte]: date_to };
        }

        const [
            totalAppointments,
            byStatus,
            bySource,
            topServices,
            topProfessionals,
            totalClients,
            noShowClients,
        ] = await Promise.all([
            // Total turnos
            Appointment.count({ where }),

            // Turnos por status
            Appointment.findAll({
                where,
                attributes: [
                    'status',
                    [fn('COUNT', col('id')), 'count'],
                ],
                group: ['status'],
                raw: true,
            }),

            // Turnos por source
            Appointment.findAll({
                where,
                attributes: [
                    'source',
                    [fn('COUNT', col('id')), 'count'],
                ],
                group: ['source'],
                raw: true,
            }),

            // Top servicios
            Appointment.findAll({
                where: { ...where, status: { [Op.notIn]: ['cancelled'] } },
                attributes: [
                    'service_id',
                    [fn('COUNT', col('appointments.id')), 'count'],
                ],
                include: [{
                    model: Service,
                    as: 'service',
                    attributes: ['name'],
                }],
                group: ['service_id', 'service.id', 'service.name'],
                order: [[fn('COUNT', col('appointments.id')), 'DESC']],
                limit: 5,
                raw: true,
                nest: true,
            }),

            // Top profesionales
            Appointment.findAll({
                where: {
                    ...where,
                    status: { [Op.notIn]: ['cancelled'] },
                    professional_id: { [Op.ne]: null },
                },
                attributes: [
                    'professional_id',
                    [fn('COUNT', col('appointments.id')), 'count'],
                ],
                include: [{
                    model: Professional,
                    as: 'professional',
                    attributes: ['name'],
                }],
                group: ['professional_id', 'professional.id', 'professional.name'],
                order: [[fn('COUNT', col('appointments.id')), 'DESC']],
                limit: 5,
                raw: true,
                nest: true,
            }),

            // Total contactos únicos
            ClientContact.count(),

            // Contactos con no_shows
            ClientContact.count({
                where: { no_show_count: { [Op.gt]: 0 } }
            }),
        ]);

        // Calcular métricas derivadas
        const statusMap = {};
        byStatus.forEach(s => { statusMap[s.status] = Number(s.count); });

        const confirmed = statusMap.confirmed || 0;
        const cancelled = statusMap.cancelled || 0;
        const noShows = statusMap.no_show || 0;
        const completed = statusMap.completed || 0;

        const noShowRate = totalAppointments > 0
            ? Number(((noShows / totalAppointments) * 100).toFixed(1))
            : 0;

        const cancellationRate = totalAppointments > 0
            ? Number(((cancelled / totalAppointments) * 100).toFixed(1))
            : 0;

        // Revenue estimado (sum de precio del servicio de appointments completados)
        let revenue = 0;
        try {
            const [result] = await Appointment.sequelize.query(`
                SELECT COALESCE(SUM(s.price), 0) as total_revenue
                FROM appointments a
                INNER JOIN services s ON s.id = a.service_id
                WHERE a.status IN ('completed', 'confirmed')
                ${date_from ? 'AND a.date >= :dateFrom' : ''}
                ${date_to ? 'AND a.date <= :dateTo' : ''}
            `, {
                replacements: {
                    ...(date_from && { dateFrom: date_from }),
                    ...(date_to && { dateTo: date_to }),
                },
                type: 'SELECT',
            });
            revenue = result?.total_revenue ? Number(result.total_revenue) : 0;
        } catch (err) {
            console.error('Error calculating revenue:', err.message);
        }

        return res.status(200).json(successMessage({
            message: messages.entities.analytics.success.fetch,
            extra: {
                data: {
                    appointments: {
                        total: totalAppointments,
                        confirmed,
                        cancelled,
                        completed,
                        no_shows: noShows,
                        by_status: byStatus,
                        by_source: bySource,
                    },
                    rates: {
                        no_show_rate: noShowRate,
                        cancellation_rate: cancellationRate,
                    },
                    revenue,
                    clients: {
                        total: totalClients,
                        with_no_shows: noShowClients,
                    },
                    top_services: topServices.map(s => ({
                        service_id: s.service_id,
                        name: s.service?.name || null,
                        count: Number(s.count),
                    })),
                    top_professionals: topProfessionals.map(p => ({
                        professional_id: p.professional_id,
                        name: p.professional?.name || null,
                        count: Number(p.count),
                    })),
                }
            }
        }));

    } catch (error) {
        console.error('Error getting analytics:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Dashboard operativo: foto del día y próximos turnos.
 * - Turnos de hoy por estado y total.
 * - Ocupación de hoy (turnos activos vs. capacidad estimada).
 * - Ingresos confirmados/completados de hoy.
 * - Tasa de no-show histórica.
 * - Lista de próximos turnos (hoy en adelante).
 */
export async function getDashboard(req, res) {
    try {
        const today = todayStr();
        const { upcoming_limit = 10 } = req.query;

        const [
            todayByStatus,
            todayRevenueRow,
            globalTotals,
            upcoming,
        ] = await Promise.all([
            Appointment.findAll({
                where: { date: today },
                attributes: ['status', [fn('COUNT', col('id')), 'count']],
                group: ['status'],
                raw: true,
            }),

            Appointment.sequelize.query(`
                SELECT COALESCE(SUM(s.price), 0) AS revenue
                FROM appointments a
                INNER JOIN services s ON s.id = a.service_id
                WHERE a.date = :today AND a.status IN ('completed', 'confirmed')
            `, { replacements: { today }, type: 'SELECT' }),

            Appointment.findAll({
                attributes: ['status', [fn('COUNT', col('id')), 'count']],
                group: ['status'],
                raw: true,
            }),

            Appointment.findAll({
                where: {
                    date: { [Op.gte]: today },
                    status: { [Op.in]: ['pending', 'confirmed'] },
                },
                include: [
                    { model: Service, as: 'service', attributes: ['id', 'name'] },
                    { model: Professional, as: 'professional', attributes: ['id', 'name', 'color'] },
                ],
                order: [['date', 'ASC'], ['start_time', 'ASC']],
                limit: Number(upcoming_limit),
            }),
        ]);

        const todayMap = {};
        todayByStatus.forEach(s => { todayMap[s.status] = Number(s.count); });
        const todayActive = (todayMap.pending || 0) + (todayMap.confirmed || 0) + (todayMap.completed || 0);
        const todayTotal = Object.values(todayMap).reduce((a, b) => a + b, 0);

        const globalMap = {};
        globalTotals.forEach(s => { globalMap[s.status] = Number(s.count); });
        const globalTotal = Object.values(globalMap).reduce((a, b) => a + b, 0);
        const noShowRate = globalTotal > 0
            ? Number((((globalMap.no_show || 0) / globalTotal) * 100).toFixed(1))
            : 0;

        const todayRevenue = todayRevenueRow?.[0]?.revenue ? Number(todayRevenueRow[0].revenue) : 0;

        return res.status(200).json(successMessage({
            message: messages.entities.analytics.success.dashboard,
            extra: {
                data: {
                    date: today,
                    today: {
                        total: todayTotal,
                        active: todayActive,
                        pending: todayMap.pending || 0,
                        confirmed: todayMap.confirmed || 0,
                        completed: todayMap.completed || 0,
                        cancelled: todayMap.cancelled || 0,
                        no_show: todayMap.no_show || 0,
                        revenue: todayRevenue,
                    },
                    no_show_rate: noShowRate,
                    upcoming,
                }
            }
        }));

    } catch (error) {
        console.error('Error getting dashboard:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}
