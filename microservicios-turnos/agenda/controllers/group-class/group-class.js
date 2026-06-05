import GroupClass from '../../models/GroupClass.js';
import GroupClassEnrollment from '../../models/GroupClassEnrollment.js';
import ClientContact from '../../models/ClientContact.js';
import Professional from '../../models/Professional.js';
import Service from '../../models/Service.js';
import { Op, fn, col, literal } from 'sequelize';
import { errorMessage, successMessage } from '../../utils/messages.js';
import messages from '../../config/messages.js';

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
            message: 'Clases grupales obtenidas correctamente.',
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
            message: 'Clase grupal creada correctamente.',
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
                message: 'Clase grupal no encontrada.'
            }));
        }

        return res.status(200).json(successMessage({
            message: 'Clase grupal obtenida correctamente.',
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
                message: 'Clase grupal no encontrada.'
            }));
        }

        await groupClass.update(req.body);

        return res.status(200).json(successMessage({
            message: 'Clase grupal actualizada correctamente.',
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
                message: 'Clase grupal no encontrada.'
            }));
        }

        await groupClass.destroy();

        return res.status(200).json(successMessage({
            message: 'Clase grupal eliminada correctamente.'
        }));

    } catch (error) {
        console.error('Error deleting group class:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Inscribir cliente en la clase, verificando que haya cupo disponible
 * Body: { client_contact_id }
 */
export async function enroll(req, res) {
    try {
        const { id } = req.params;
        const { client_contact_id } = req.body;

        const groupClass = await GroupClass.findOne({
            where: { id },
            include: [{ model: GroupClassEnrollment, as: 'enrollments', attributes: ['id', 'estado'] }],
        });

        if (!groupClass) {
            return res.status(404).json(errorMessage({
                message: 'Clase grupal no encontrada.'
            }));
        }

        const enrolledCount = groupClass.enrollments.filter(e => e.estado === 'inscripto').length;
        if (enrolledCount >= groupClass.cupo_maximo) {
            return res.status(409).json(errorMessage({
                message: 'No hay cupo disponible en esta clase.'
            }));
        }

        const enrollment = await GroupClassEnrollment.create({
            group_class_id: groupClass.id,
            client_contact_id,
            estado: 'inscripto',
        });

        return res.status(201).json(successMessage({
            message: 'Inscripción realizada correctamente.',
            extra: { data: enrollment }
        }));

    } catch (error) {
        // Unique constraint: ya estaba inscripto
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json(errorMessage({
                message: 'El cliente ya está inscripto en esta clase.'
            }));
        }
        console.error('Error enrolling in group class:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Cancelar inscripción (hard delete, el modelo no usa paranoid)
 */
export async function cancelEnrollment(req, res) {
    try {
        const { id, enrollment_id } = req.params;

        const enrollment = await GroupClassEnrollment.findOne({
            where: { id: enrollment_id, group_class_id: id },
        });

        if (!enrollment) {
            return res.status(404).json(errorMessage({
                message: 'Inscripción no encontrada.'
            }));
        }

        await enrollment.destroy();

        return res.status(200).json(successMessage({
            message: 'Inscripción cancelada correctamente.'
        }));

    } catch (error) {
        console.error('Error cancelling enrollment:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}
