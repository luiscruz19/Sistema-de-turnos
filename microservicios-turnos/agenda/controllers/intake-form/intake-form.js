import IntakeForm from '../../models/IntakeForm.js';
import IntakeField from '../../models/IntakeField.js';
import IntakeResponse from '../../models/IntakeResponse.js';
import { errorMessage, successMessage } from '../../utils/messages.js';
import messages from '../../config/messages.js';

/**
 * Listar formularios de anamnesis con sus campos
 */
export async function list(req, res) {
    try {
        const forms = await IntakeForm.findAll({
            include: [{ model: IntakeField, as: 'fields', order: [['orden', 'ASC']] }],
            order: [['createdAt', 'DESC']],
        });

        return res.status(200).json(successMessage({
            message: 'Formularios obtenidos correctamente.',
            extra: { data: forms }
        }));

    } catch (error) {
        console.error('Error listing intake forms:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Crear formulario con campos en bulk
 */
export async function create(req, res) {
    try {
        const { nombre, descripcion, service_id, activo = true, fields = [] } = req.body;

        const form = await IntakeForm.create({
            nombre,
            descripcion: descripcion || null,
            service_id: service_id || null,
            activo,
        });

        if (fields.length > 0) {
            const fieldsData = fields.map((f, index) => ({
                intake_form_id: form.id,
                label: f.label,
                tipo: f.tipo || 'text',
                opciones: f.opciones || null,
                requerido: f.requerido || false,
                orden: f.orden ?? index,
            }));
            await IntakeField.bulkCreate(fieldsData);
        }

        const formWithFields = await IntakeForm.findOne({
            where: { id: form.id },
            include: [{ model: IntakeField, as: 'fields', order: [['orden', 'ASC']] }],
        });

        return res.status(201).json(successMessage({
            message: 'Formulario creado correctamente.',
            extra: { data: formWithFields }
        }));

    } catch (error) {
        console.error('Error creating intake form:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Obtener formulario por ID con sus campos
 */
export async function getById(req, res) {
    try {
        const { id } = req.params;

        const form = await IntakeForm.findOne({
            where: { id },
            include: [{ model: IntakeField, as: 'fields', order: [['orden', 'ASC']] }],
        });

        if (!form) {
            return res.status(404).json(errorMessage({
                message: 'Formulario no encontrado.'
            }));
        }

        return res.status(200).json(successMessage({
            message: 'Formulario obtenido correctamente.',
            extra: { data: form }
        }));

    } catch (error) {
        console.error('Error getting intake form:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Actualizar formulario. Si viene fields, sincroniza destruyendo los existentes y creando los nuevos
 */
export async function update(req, res) {
    try {
        const { id } = req.params;
        const { fields, ...formData } = req.body;

        const form = await IntakeForm.findOne({ where: { id } });
        if (!form) {
            return res.status(404).json(errorMessage({
                message: 'Formulario no encontrado.'
            }));
        }

        await form.update(formData);

        if (Array.isArray(fields)) {
            await IntakeField.destroy({ where: { intake_form_id: form.id } });

            if (fields.length > 0) {
                const fieldsData = fields.map((f, index) => ({
                    intake_form_id: form.id,
                    label: f.label,
                    tipo: f.tipo || 'text',
                    opciones: f.opciones || null,
                    requerido: f.requerido || false,
                    orden: f.orden ?? index,
                }));
                await IntakeField.bulkCreate(fieldsData);
            }
        }

        const updatedForm = await IntakeForm.findOne({
            where: { id: form.id },
            include: [{ model: IntakeField, as: 'fields', order: [['orden', 'ASC']] }],
        });

        return res.status(200).json(successMessage({
            message: 'Formulario actualizado correctamente.',
            extra: { data: updatedForm }
        }));

    } catch (error) {
        console.error('Error updating intake form:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Eliminar formulario (paranoid delete)
 */
export async function del(req, res) {
    try {
        const { id } = req.params;

        const form = await IntakeForm.findOne({ where: { id } });
        if (!form) {
            return res.status(404).json(errorMessage({
                message: 'Formulario no encontrado.'
            }));
        }

        await form.destroy();

        return res.status(200).json(successMessage({
            message: 'Formulario eliminado correctamente.'
        }));

    } catch (error) {
        console.error('Error deleting intake form:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Guardar respuestas de un formulario para un cliente/turno
 * Body: { appointment_id, client_contact_id, responses: [{field_id, value}] }
 */
export async function submitResponse(req, res) {
    try {
        const { form_id } = req.params;
        const { appointment_id, client_contact_id, responses = [] } = req.body;

        const form = await IntakeForm.findOne({ where: { id: form_id } });
        if (!form) {
            return res.status(404).json(errorMessage({
                message: 'Formulario no encontrado.'
            }));
        }

        // Armar objeto respuestas: { field_id: value }
        const respuestasObj = {};
        for (const r of responses) {
            respuestasObj[r.field_id] = r.value;
        }

        const response = await IntakeResponse.create({
            appointment_id,
            intake_form_id: Number(form_id),
            client_contact_id: client_contact_id || null,
            respuestas: respuestasObj,
        });

        return res.status(201).json(successMessage({
            message: 'Respuestas guardadas correctamente.',
            extra: { data: response }
        }));

    } catch (error) {
        console.error('Error submitting intake response:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}
