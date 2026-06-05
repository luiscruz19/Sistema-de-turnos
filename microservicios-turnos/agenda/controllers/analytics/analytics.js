import Appointment from '../../models/Appointment.js';
import ClientContact from '../../models/ClientContact.js';
import Service from '../../models/Service.js';
import Professional from '../../models/Professional.js';
import { Op, fn, col } from 'sequelize';
import { errorMessage, successMessage } from '../../utils/messages.js';
import messages from '../../config/messages.js';

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
