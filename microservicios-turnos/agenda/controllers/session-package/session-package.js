import SessionPackage from '../../models/SessionPackage.js';
import ClientPackage from '../../models/ClientPackage.js';
import Service from '../../models/Service.js';
import { errorMessage, successMessage } from '../../utils/messages.js';
import messages from '../../config/messages.js';

/**
 * Listar paquetes de sesiones
 */
export async function list(req, res) {
    try {
        const packages = await SessionPackage.findAll({
            include: [{ model: Service, as: 'service', attributes: ['id', 'name'] }],
            order: [['createdAt', 'DESC']],
        });

        return res.status(200).json(successMessage({
            message: 'Paquetes obtenidos correctamente.',
            extra: { data: packages }
        }));

    } catch (error) {
        console.error('Error listing session packages:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Crear paquete de sesiones
 */
export async function create(req, res) {
    try {
        const { nombre, descripcion, service_id, sesiones_total, precio, validez_dias, activo = true } = req.body;

        const sessionPackage = await SessionPackage.create({
            nombre,
            descripcion: descripcion || null,
            service_id,
            sesiones_total,
            precio,
            validez_dias: validez_dias || null,
            activo,
        });

        return res.status(201).json(successMessage({
            message: 'Paquete creado correctamente.',
            extra: { data: sessionPackage }
        }));

    } catch (error) {
        console.error('Error creating session package:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Obtener paquete por ID
 */
export async function getById(req, res) {
    try {
        const { id } = req.params;

        const sessionPackage = await SessionPackage.findOne({
            where: { id },
            include: [{ model: Service, as: 'service', attributes: ['id', 'name'] }],
        });

        if (!sessionPackage) {
            return res.status(404).json(errorMessage({
                message: 'Paquete no encontrado.'
            }));
        }

        return res.status(200).json(successMessage({
            message: 'Paquete obtenido correctamente.',
            extra: { data: sessionPackage }
        }));

    } catch (error) {
        console.error('Error getting session package:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Actualizar paquete
 */
export async function update(req, res) {
    try {
        const { id } = req.params;

        const sessionPackage = await SessionPackage.findOne({ where: { id } });
        if (!sessionPackage) {
            return res.status(404).json(errorMessage({
                message: 'Paquete no encontrado.'
            }));
        }

        await sessionPackage.update(req.body);

        return res.status(200).json(successMessage({
            message: 'Paquete actualizado correctamente.',
            extra: { data: sessionPackage }
        }));

    } catch (error) {
        console.error('Error updating session package:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Eliminar paquete (paranoid delete)
 */
export async function del(req, res) {
    try {
        const { id } = req.params;

        const sessionPackage = await SessionPackage.findOne({ where: { id } });
        if (!sessionPackage) {
            return res.status(404).json(errorMessage({
                message: 'Paquete no encontrado.'
            }));
        }

        await sessionPackage.destroy();

        return res.status(200).json(successMessage({
            message: 'Paquete eliminado correctamente.'
        }));

    } catch (error) {
        console.error('Error deleting session package:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Listar paquetes asignados a un cliente
 */
export async function listClientPackages(req, res) {
    try {
        const { client_id } = req.params;

        const clientPackages = await ClientPackage.findAll({
            where: { client_contact_id: client_id },
            include: [{
                model: SessionPackage,
                as: 'sessionPackage',
                attributes: ['id', 'nombre', 'sesiones_total', 'precio', 'validez_dias'],
            }],
            order: [['createdAt', 'DESC']],
        });

        return res.status(200).json(successMessage({
            message: 'Paquetes del cliente obtenidos correctamente.',
            extra: { data: clientPackages }
        }));

    } catch (error) {
        console.error('Error listing client packages:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Asignar paquete a un cliente
 * Body: { client_contact_id, session_package_id }
 */
export async function assignPackage(req, res) {
    try {
        const { client_contact_id, session_package_id } = req.body;

        const sessionPackage = await SessionPackage.findOne({
            where: { id: session_package_id },
        });
        if (!sessionPackage) {
            return res.status(404).json(errorMessage({
                message: 'Paquete no encontrado.'
            }));
        }

        const today = new Date();
        const fechaCompra = today.toISOString().slice(0, 10);

        let fechaVencimiento = null;
        if (sessionPackage.validez_dias) {
            const expDate = new Date(today);
            expDate.setDate(expDate.getDate() + sessionPackage.validez_dias);
            fechaVencimiento = expDate.toISOString().slice(0, 10);
        }

        const clientPackage = await ClientPackage.create({
            client_contact_id,
            session_package_id: sessionPackage.id,
            sesiones_usadas: 0,
            sesiones_total: sessionPackage.sesiones_total,
            precio_pagado: sessionPackage.precio,
            fecha_compra: fechaCompra,
            fecha_vencimiento: fechaVencimiento,
            estado: 'activo',
        });

        return res.status(201).json(successMessage({
            message: 'Paquete asignado correctamente.',
            extra: { data: clientPackage }
        }));

    } catch (error) {
        console.error('Error assigning package:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}
