import ClientRecord from '../../models/ClientRecord.js';
import ClientNote from '../../models/ClientNote.js';
import ClientAttachment from '../../models/ClientAttachment.js';
import ClientContact from '../../models/ClientContact.js';
import Professional from '../../models/Professional.js';
import Appointment from '../../models/Appointment.js';
import BusinessConfig from '../../models/BusinessConfig.js';
import { errorMessage, successMessage } from '../../utils/messages.js';

async function ensureEnabled(res) {
    const config = await BusinessConfig.findOne();
    if (!config?.enable_health_records) {
        res.status(403).json(errorMessage({ message: 'Historia clinica no habilitada' }));
        return false;
    }
    return true;
}

/**
 * Devuelve el record + notas visibles + attachments para un cliente.
 * Un profesional solo ve sus notas privadas, los admins ven todas.
 */
export async function get(req, res) {
    try {
        if (!(await ensureEnabled(res))) return;
        const { client_contact_id } = req.params;

        const client = await ClientContact.findOne({
            where: { id: client_contact_id },
        });
        if (!client) return res.status(404).json(errorMessage({ message: 'Cliente no encontrado' }));

        let record = await ClientRecord.findOne({
            where: { client_contact_id: client.id },
        });
        if (!record) {
            record = await ClientRecord.create({
                client_contact_id: client.id,
            });
        }

        const isAdmin = !!req.admin;
        const professionalUserId = req.user?.id;

        const notesWhere = { client_contact_id: client.id };
        const notes = await ClientNote.findAll({
            where: notesWhere,
            include: [{ model: Professional, as: 'professional', attributes: ['id', 'name'] }],
            order: [['createdAt', 'DESC']],
        });

        // Filtrar privadas si no es admin
        const visibleNotes = notes.filter(n => {
            if (!n.is_private) return true;
            if (isAdmin) return true;
            return n.author_user_id === professionalUserId;
        });

        const attachments = await ClientAttachment.findAll({
            where: { client_contact_id: client.id },
            order: [['createdAt', 'DESC']],
        });

        return res.status(200).json(successMessage({
            message: 'Historia clinica',
            extra: { data: { client, record, notes: visibleNotes, attachments } },
        }));
    } catch (error) {
        console.error('[health-records] get error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener historia clinica' }));
    }
}

export async function updateRecord(req, res) {
    try {
        if (!(await ensureEnabled(res))) return;
        const { client_contact_id } = req.params;
        const { summary, allergies, medications, conditions, blood_type, emergency_contact } = req.body || {};

        let record = await ClientRecord.findOne({
            where: { client_contact_id },
        });
        if (!record) {
            record = await ClientRecord.create({
                client_contact_id: Number(client_contact_id),
                summary, allergies, medications, conditions, blood_type, emergency_contact,
            });
        } else {
            await record.update({ summary, allergies, medications, conditions, blood_type, emergency_contact });
        }

        return res.status(200).json(successMessage({ message: 'Record actualizado', extra: { data: record } }));
    } catch (error) {
        console.error('[health-records] updateRecord error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al actualizar record' }));
    }
}

export async function createNote(req, res) {
    try {
        if (!(await ensureEnabled(res))) return;
        const { client_contact_id } = req.params;
        const { content, is_private = false, appointment_id, professional_id } = req.body || {};
        if (!content) return res.status(400).json(errorMessage({ message: 'content requerido' }));

        const note = await ClientNote.create({
            client_contact_id: Number(client_contact_id),
            professional_id: professional_id || null,
            appointment_id: appointment_id || null,
            author_user_id: req.user?.id || null,
            content,
            is_private: !!is_private,
        });

        return res.status(201).json(successMessage({ message: 'Nota creada', extra: { data: note } }));
    } catch (error) {
        console.error('[health-records] createNote error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al crear nota' }));
    }
}

export async function updateNote(req, res) {
    try {
        if (!(await ensureEnabled(res))) return;
        const { note_id } = req.params;
        const note = await ClientNote.findOne({ where: { id: note_id } });
        if (!note) return res.status(404).json(errorMessage({ message: 'Nota no encontrada' }));

        // Solo autor o admin puede editar
        const isAdmin = !!req.admin;
        if (!isAdmin && note.author_user_id !== req.user?.id) {
            return res.status(403).json(errorMessage({ message: 'Sin permiso para editar esta nota' }));
        }

        const { content, is_private } = req.body || {};
        await note.update({
            content: content ?? note.content,
            is_private: is_private ?? note.is_private,
        });
        return res.status(200).json(successMessage({ message: 'Nota actualizada', extra: { data: note } }));
    } catch (error) {
        console.error('[health-records] updateNote error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al actualizar nota' }));
    }
}

export async function deleteNote(req, res) {
    try {
        if (!(await ensureEnabled(res))) return;
        const { note_id } = req.params;
        const note = await ClientNote.findOne({ where: { id: note_id } });
        if (!note) return res.status(404).json(errorMessage({ message: 'Nota no encontrada' }));
        const isAdmin = !!req.admin;
        if (!isAdmin && note.author_user_id !== req.user?.id) {
            return res.status(403).json(errorMessage({ message: 'Sin permiso' }));
        }
        await note.destroy();
        return res.status(200).json(successMessage({ message: 'Nota eliminada' }));
    } catch (error) {
        console.error('[health-records] deleteNote error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al eliminar nota' }));
    }
}

/**
 * Registra un attachment. El archivo se sube por separado al storage (stub local /uploads por ahora).
 * Espera: { file_url, file_name, mime_type, size_bytes, description }
 */
export async function createAttachment(req, res) {
    try {
        if (!(await ensureEnabled(res))) return;
        const { client_contact_id } = req.params;
        const { file_url, file_name, mime_type, size_bytes, description } = req.body || {};
        if (!file_url || !file_name) {
            return res.status(400).json(errorMessage({ message: 'file_url y file_name requeridos' }));
        }
        const attachment = await ClientAttachment.create({
            client_contact_id: Number(client_contact_id),
            file_url,
            file_name,
            mime_type: mime_type || null,
            size_bytes: size_bytes || null,
            uploaded_by: req.user?.id || null,
            description: description || null,
        });
        return res.status(201).json(successMessage({ message: 'Adjunto creado', extra: { data: attachment } }));
    } catch (error) {
        console.error('[health-records] createAttachment error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al crear adjunto' }));
    }
}

export async function deleteAttachment(req, res) {
    try {
        if (!(await ensureEnabled(res))) return;
        const { attachment_id } = req.params;
        const att = await ClientAttachment.findOne({ where: { id: attachment_id } });
        if (!att) return res.status(404).json(errorMessage({ message: 'Adjunto no encontrado' }));
        await att.destroy();
        return res.status(200).json(successMessage({ message: 'Adjunto eliminado' }));
    } catch (error) {
        console.error('[health-records] deleteAttachment error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al eliminar adjunto' }));
    }
}
