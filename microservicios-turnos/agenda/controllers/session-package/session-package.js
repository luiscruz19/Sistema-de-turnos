import SessionPackage from '../../models/SessionPackage.js';
import ClientPackage from '../../models/ClientPackage.js';
import Service from '../../models/Service.js';
import sequelize from '../../db/sequelize.js';
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
            message: messages.entities.sessionPackage.success.list,
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
            message: messages.entities.sessionPackage.success.created,
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
                message: messages.entities.sessionPackage.errors.notFound
            }));
        }

        return res.status(200).json(successMessage({
            message: messages.entities.sessionPackage.success.fetch,
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
                message: messages.entities.sessionPackage.errors.notFound
            }));
        }

        await sessionPackage.update(req.body);

        return res.status(200).json(successMessage({
            message: messages.entities.sessionPackage.success.updated,
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
                message: messages.entities.sessionPackage.errors.notFound
            }));
        }

        await sessionPackage.destroy();

        return res.status(200).json(successMessage({
            message: messages.entities.sessionPackage.success.deleted
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
            message: messages.entities.sessionPackage.success.clientList,
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

        if (!client_contact_id || !session_package_id) {
            return res.status(400).json(errorMessage({
                message: messages.system.validation.errors.fieldsRequired
            }));
        }

        const sessionPackage = await SessionPackage.findOne({
            where: { id: session_package_id },
        });
        if (!sessionPackage) {
            return res.status(404).json(errorMessage({
                message: messages.entities.sessionPackage.errors.notFound
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
            message: messages.entities.sessionPackage.success.assigned,
            extra: { data: clientPackage }
        }));

    } catch (error) {
        console.error('Error assigning package:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Descontar manualmente una sesión de un paquete del cliente.
 * Valida saldo y vencimiento. Marca como completado al agotarse.
 */
export async function useSession(req, res) {
    try {
        const { client_package_id } = req.params;

        const result = await sequelize.transaction(async (t) => {
            const pkg = await ClientPackage.findByPk(client_package_id, { transaction: t, lock: t.LOCK.UPDATE });
            if (!pkg) {
                return { error: 404, message: messages.entities.sessionPackage.errors.clientPackageNotFound };
            }
            if (pkg.estado === 'vencido') {
                return { error: 409, message: messages.entities.sessionPackage.errors.expired };
            }
            if (pkg.fecha_vencimiento && pkg.fecha_vencimiento < new Date().toISOString().slice(0, 10)) {
                await pkg.update({ estado: 'vencido' }, { transaction: t });
                return { error: 409, message: messages.entities.sessionPackage.errors.expired };
            }
            if (pkg.sesiones_usadas >= pkg.sesiones_total) {
                return { error: 409, message: messages.entities.sessionPackage.errors.noSessionsLeft };
            }

            const usadas = pkg.sesiones_usadas + 1;
            await pkg.update({
                sesiones_usadas: usadas,
                estado: usadas >= pkg.sesiones_total ? 'completado' : 'activo',
            }, { transaction: t });

            return { data: pkg };
        });

        if (result.error) {
            return res.status(result.error).json(errorMessage({ message: result.message }));
        }

        return res.status(200).json(successMessage({
            message: messages.entities.sessionPackage.success.updated,
            extra: { data: result.data }
        }));

    } catch (error) {
        console.error('Error using session:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Restituir manualmente una sesión a un paquete del cliente.
 */
export async function refundSession(req, res) {
    try {
        const { client_package_id } = req.params;

        const result = await sequelize.transaction(async (t) => {
            const pkg = await ClientPackage.findByPk(client_package_id, { transaction: t, lock: t.LOCK.UPDATE });
            if (!pkg) {
                return { error: 404, message: messages.entities.sessionPackage.errors.clientPackageNotFound };
            }
            if (pkg.sesiones_usadas > 0) {
                await pkg.update({
                    sesiones_usadas: pkg.sesiones_usadas - 1,
                    estado: pkg.estado === 'completado' ? 'activo' : pkg.estado,
                }, { transaction: t });
            }
            return { data: pkg };
        });

        if (result.error) {
            return res.status(result.error).json(errorMessage({ message: result.message }));
        }

        return res.status(200).json(successMessage({
            message: messages.entities.sessionPackage.success.updated,
            extra: { data: result.data }
        }));

    } catch (error) {
        console.error('Error refunding session:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}
