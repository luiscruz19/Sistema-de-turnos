import BusinessConfig from '../../models/BusinessConfig.js';
import crypto from 'node:crypto';
import { errorMessage, successMessage } from '../../utils/messages.js';
import messages from '../../config/messages.js';

/**
 * Obtener configuración del negocio
 */
export async function get(req, res) {
    try {
        let config = await BusinessConfig.findOne();

        // Si no existe, crear con defaults
        if (!config) {
            config = await BusinessConfig.create({
                name: 'Mi Negocio',
                api_key: crypto.randomBytes(32).toString('hex'),
            });
        }

        return res.status(200).json(successMessage({
            message: messages.entities.businessConfig.success.fetch,
            extra: { data: config }
        }));

    } catch (error) {
        console.error('Error getting business config:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Actualizar configuración del negocio
 */
export async function update(req, res) {
    try {
        const updateData = req.body;

        let config = await BusinessConfig.findOne();

        if (!config) {
            // Crear si no existe
            config = await BusinessConfig.create({
                api_key: crypto.randomBytes(32).toString('hex'),
                ...updateData,
            });
        } else {
            await config.update(updateData);
        }

        return res.status(200).json(successMessage({
            message: messages.entities.businessConfig.success.updated,
            extra: { data: config }
        }));

    } catch (error) {
        console.error('Error updating business config:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}
