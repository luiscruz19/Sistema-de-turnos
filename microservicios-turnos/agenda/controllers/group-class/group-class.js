import GroupClass from '../../models/GroupClass.js';
import GroupClassEnrollment from '../../models/GroupClassEnrollment.js';
import ClientContact from '../../models/ClientContact.js';
import Professional from '../../models/Professional.js';
import Service from '../../models/Service.js';
import BusinessConfig from '../../models/BusinessConfig.js';
import { Op } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import { errorMessage, successMessage } from '../../utils/messages.js';
import messages from '../../config/messages.js';
import { sendWaitlistOpeningEmail } from '../../utils/appointment-emails.js';

/**
 * Listar clases grupales con filtros opcionales y conteo de inscriptos
 */
export async function list(req, res) {
    try {
        const { fecha, professional_id } = req.query;

        const where = {};

        if (fecha) {
            // Filtrar por fecha (inicio del día al fin del día)
            const dayStart = `${fecha} 00:00:00`;
            const dayEnd = `${fecha} 23:59:59`;
            where.fecha_hora = { [Op.between]: [dayStart, dayEnd] };
        }

        if (professional_id) where.professional_id = Number(professional_id);

        const classes = await GroupClass.findAll({
            where,
            include: [
                {
                    model: GroupClassEnrollment,
                    as: 'enrollments',
                    attributes: ['id', 'estado'],
                },
                { model: Service, as: 'service', attributes: ['id', 'name'] },
                { model: Professional, as: 'professional', attributes: ['id', 'name'] },
            ],
            order: [['fecha_hora', 'ASC']],
        });

        return res.status(200).json(successMessage({
            message: messages.entities.groupClass.success.list,
            extra: { data: classes }
        }));

    } catch (error) {
        console.error('Error listing group classes:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Crear clase grupal
 */
export async function create(req, res) {
    try {
        const {
            titulo, descripcion, professional_id, service_id,
            fecha_hora, duracion_minutos, cupo_maximo, precio = 0, estado = 'publicada',
        } = req.body;

        const groupClass = await GroupClass.create({
            titulo,
            descripcion: descripcion || null,
            professional_id: professional_id || null,
            service_id,
            fecha_hora,
            duracion_minutos,
            cupo_maximo,
            precio,
            estado,
        });

        return res.status(201).json(successMessage({
            message: messages.entities.groupClass.success.created,
            extra: { data: groupClass }
        }));

    } catch (error) {
        console.error('Error creating group class:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Obtener clase grupal por ID con inscriptos
 */
export async function getById(req, res) {
    try {
        const { id } = req.params;

        const groupClass = await GroupClass.findOne({
            where: { id },
            include: [
                {
                    model: GroupClassEnrollment,
                    as: 'enrollments',
                    include: [{
                        model: ClientContact,
                        as: 'clientContact',
                        attributes: ['id', 'name', 'email', 'phone'],
                    }],
                },
                { model: Service, as: 'service', attributes: ['id', 'name'] },
                { model: Professional, as: 'professional', attributes: ['id', 'name'] },
            ],
        });

        if (!groupClass) {
            return res.status(404).json(errorMessage({
                message: messages.entities.groupClass.errors.notFound
            }));
        }

        return res.status(200).json(successMessage({
            message: messages.entities.groupClass.success.fetch,
            extra: { data: groupClass }
        }));

    } catch (error) {
        console.error('Error getting group class:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Actualizar clase grupal
 */
export async function update(req, res) {
    try {
        const { id } = req.params;

        const groupClass = await GroupClass.findOne({ where: { id } });
        if (!groupClass) {
            return res.status(404).json(errorMessage({
                message: messages.entities.groupClass.errors.notFound
            }));
        }

        await groupClass.update(req.body);

        return res.status(200).json(successMessage({
            message: messages.entities.groupClass.success.updated,
            extra: { data: groupClass }
        }));

    } catch (error) {
        console.error('Error updating group class:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Eliminar clase grupal (paranoid delete)
 */
export async function del(req, res) {
    try {
        const { id } = req.params;

        const groupClass = await GroupClass.findOne({ where: { id } });
        if (!groupClass) {
            return res.status(404).json(errorMessage({
                message: messages.entities.groupClass.errors.notFound
            }));
        }

        await groupClass.destroy();

        return res.status(200).json(successMessage({
            message: messages.entities.groupClass.success.deleted
        }));

    } catch (error) {
        console.error('Error deleting group class:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Inscribir cliente en la clase. Si no hay cupo, lo deja en lista de espera
 * de la clase (estado lista_espera con su posición).
 * Body: { client_contact_id }
 */
export async function enroll(req, res) {
    try {
        const { id } = req.params;
        const { client_contact_id } = req.body;

        if (!client_contact_id) {
            return res.status(400).json(errorMessage({
                message: messages.system.validation.errors.fieldsRequired
            }));
        }

        const groupClass = await GroupClass.findOne({
            where: { id },
            include: [{ model: GroupClassEnrollment, as: 'enrollments', attributes: ['id', 'estado'] }],
        });

        if (!groupClass) {
            return res.status(404).json(errorMessage({
                message: messages.entities.groupClass.errors.notFound
            }));
        }

        // No se admite inscripción a clases canceladas, completadas o ya iniciadas.
        if (groupClass.estado !== 'publicada' || new Date(groupClass.fecha_hora).getTime() <= Date.now()) {
            return res.status(409).json(errorMessage({
                message: messages.entities.groupClass.errors.notBookable
            }));
        }

        const enrolledCount = groupClass.enrollments.filter(e => e.estado === 'inscripto').length;
        const hasSpot = enrolledCount < groupClass.cupo_maximo;

        let enrollment;
        let waitlisted = false;

        if (hasSpot) {
            enrollment = await GroupClassEnrollment.create({
                group_class_id: groupClass.id,
                client_contact_id,
                estado: 'inscripto',
            });
        } else {
            // Calcular siguiente posición de lista de espera.
            const waitCount = await GroupClassEnrollment.count({
                where: { group_class_id: groupClass.id, estado: 'lista_espera' },
            });
            enrollment = await GroupClassEnrollment.create({
                group_class_id: groupClass.id,
                client_contact_id,
                estado: 'lista_espera',
                waitlist_position: waitCount + 1,
            });
            waitlisted = true;
        }

        return res.status(201).json(successMessage({
            message: waitlisted
                ? messages.entities.groupClass.success.waitlisted
                : messages.entities.groupClass.success.enrolled,
            extra: { data: enrollment, waitlisted }
        }));

    } catch (error) {
        // Unique constraint: ya estaba inscripto
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json(errorMessage({
                message: messages.entities.groupClass.errors.alreadyEnrolled
            }));
        }
        console.error('Error enrolling in group class:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Promueve al primero de la lista de espera de una clase a inscripto y lo notifica.
 */
async function promoteClassWaitlist(groupClassId, transaction) {
    const next = await GroupClassEnrollment.findOne({
        where: { group_class_id: groupClassId, estado: 'lista_espera' },
        order: [['waitlist_position', 'ASC'], ['createdAt', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
    });

    if (!next) return null;

    await next.update({ estado: 'inscripto', waitlist_position: null }, { transaction });
    return next;
}

/**
 * Cancelar inscripción. Si quien sale estaba inscripto (no en espera), promueve
 * al primero de la lista de espera de la clase y lo notifica por email.
 */
export async function cancelEnrollment(req, res) {
    try {
        const { id, enrollment_id } = req.params;

        const enrollment = await GroupClassEnrollment.findOne({
            where: { id: enrollment_id, group_class_id: id },
        });

        if (!enrollment) {
            return res.status(404).json(errorMessage({
                message: messages.entities.groupClass.errors.enrollmentNotFound
            }));
        }

        const wasEnrolled = enrollment.estado === 'inscripto';

        let promoted = null;
        await sequelize.transaction(async (t) => {
            await enrollment.update({ estado: 'cancelado', waitlist_position: null }, { transaction: t });
            if (wasEnrolled) {
                promoted = await promoteClassWaitlist(id, t);
            }
        });

        // Notificar al promovido (best-effort).
        if (promoted) {
            try {
                const [groupClass, config, contact] = await Promise.all([
                    GroupClass.findByPk(id, { include: [{ model: Service, as: 'service', attributes: ['name'] }] }),
                    BusinessConfig.findOne(),
                    ClientContact.findByPk(promoted.client_contact_id, { attributes: ['name', 'email'] }),
                ]);
                if (contact?.email) {
                    await sendWaitlistOpeningEmail({
                        to: contact.email,
                        clientName: contact.name,
                        serviceName: groupClass?.titulo || groupClass?.service?.name,
                        businessName: config?.name,
                    });
                }
            } catch (err) {
                console.error('[group-class] Error notificando promoción:', err.message);
            }
        }

        return res.status(200).json(successMessage({
            message: promoted
                ? messages.entities.groupClass.success.promoted
                : messages.entities.groupClass.success.enrollmentCancelled,
            extra: { promoted: promoted ? { enrollment_id: promoted.id, client_contact_id: promoted.client_contact_id } : null }
        }));

    } catch (error) {
        console.error('Error cancelling enrollment:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Marcar asistencia de una inscripción: asistio / no_asistio.
 * Body: { estado }
 */
export async function markAttendance(req, res) {
    try {
        const { id, enrollment_id } = req.params;
        const { estado } = req.body || {};

        if (!['asistio', 'no_asistio'].includes(estado)) {
            return res.status(400).json(errorMessage({
                message: messages.system.validation.errors.invalidEnumValue
            }));
        }

        const enrollment = await GroupClassEnrollment.findOne({
            where: { id: enrollment_id, group_class_id: id },
        });

        if (!enrollment) {
            return res.status(404).json(errorMessage({
                message: messages.entities.groupClass.errors.enrollmentNotFound
            }));
        }

        await enrollment.update({ estado });

        return res.status(200).json(successMessage({
            message: messages.entities.groupClass.success.updated,
            extra: { data: enrollment }
        }));

    } catch (error) {
        console.error('Error marking attendance:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}
