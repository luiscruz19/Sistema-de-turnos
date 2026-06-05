import PaymentIntent from '../../models/PaymentIntent.js';
import PaymentTransaction from '../../models/PaymentTransaction.js';
import Appointment from '../../models/Appointment.js';
import Service from '../../models/Service.js';
import BusinessConfig from '../../models/BusinessConfig.js';
import ClientContact from '../../models/ClientContact.js';
import { errorMessage, successMessage } from '../../utils/messages.js';
import {
    createPreference,
    getPaymentById,
    refundPayment,
    verifyWebhookSignature,
} from '../../integrations/mercadopago.js';

const PAYMENT_EXPIRY_HOURS = 24;

function computeAmount(service, businessConfig) {
    const base = Number(service?.price || 0);
    if (base <= 0) return 0;
    const pct = Number(businessConfig?.payment_advance_pct || 0);
    if (pct > 0 && pct < 100) return Number((base * (pct / 100)).toFixed(2));
    return base;
}

/**
 * Crea un PaymentIntent para un turno. Se llama al confirmar el turno
 * cuando BusinessConfig.require_payment = true, o manualmente desde el backoffice.
 */
export async function createForAppointment(req, res) {
    try {
        const { appointment_id } = req.body;

        const appointment = await Appointment.findOne({
            where: { id: appointment_id },
            include: [{ model: Service, as: 'service' }],
        });
        if (!appointment) {
            return res.status(404).json(errorMessage({ message: 'Turno no encontrado' }));
        }

        const businessConfig = await BusinessConfig.findOne();
        const amount = computeAmount(appointment.service, businessConfig);
        if (amount <= 0) {
            return res.status(400).json(errorMessage({ message: 'El turno no tiene monto a cobrar' }));
        }

        const externalReference = `turno_${appointment.id}_${Date.now()}`;
        const backUrl = req.body.back_url || `${req.protocol}://${req.get('host')}/widget/payment-return`;
        const notificationUrl = req.body.notification_url
            || `${process.env.TURNOS_PUBLIC_URL || ''}/system/webhook/mercadopago`;

        const mpResult = await createPreference({
            amount,
            description: `${appointment.service?.name || 'Turno'} - ${appointment.client_name}`,
            externalReference,
            notificationUrl,
            backUrl,
        });

        if (!mpResult) {
            return res.status(502).json(errorMessage({ message: 'Error al crear preference en MP' }));
        }

        const intent = await PaymentIntent.create({
            appointment_id: appointment.id,
            client_contact_id: appointment.client_contact_id,
            provider: 'mercadopago',
            mode: mpResult.mode,
            amount,
            currency: businessConfig?.currency || 'ARS',
            status: 'pending',
            description: `${appointment.service?.name || 'Turno'} - ${appointment.date}`,
            mp_preference_id: mpResult.preferenceId,
            mp_init_point: mpResult.initPoint,
            mp_external_reference: externalReference,
            expires_at: new Date(Date.now() + PAYMENT_EXPIRY_HOURS * 3600 * 1000),
        });

        await appointment.update({
            payment_required: true,
            current_payment_intent_id: intent.id,
            deposit_status: 'pending',
            deposit_amount: amount,
        });

        // Modo simulado: auto-confirma a los 5s
        if (mpResult.mode === 'simulated') {
            setTimeout(async () => {
                try {
                    const fresh = await PaymentIntent.findByPk(intent.id);
                    if (fresh && fresh.status === 'pending') {
                        await fresh.update({ status: 'paid', paid_at: new Date() });
                        await PaymentTransaction.create({
                            payment_intent_id: fresh.id,
                            provider: 'mercadopago',
                            status: 'approved',
                            status_detail: 'simulated_auto_approve',
                            amount: fresh.amount,
                            event_type: 'payment',
                            raw_payload: { simulated: true },
                        });
                        await Appointment.update(
                            { status: 'confirmed', deposit_status: 'paid' },
                            { where: { id: appointment.id } },
                        );
                    }
                } catch (err) {
                    console.error('[turnos-payments] simulated auto-approve error:', err.message);
                }
            }, 5000);
        }

        return res.status(201).json(successMessage({
            message: 'PaymentIntent creado',
            extra: { data: intent },
        }));
    } catch (error) {
        console.error('[turnos-payments] createForAppointment error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al crear cobro' }));
    }
}

export async function list(req, res) {
    try {
        const { status, limit = 50, offset = 0 } = req.query;
        const where = {};
        if (status) where.status = status;

        const { count, rows } = await PaymentIntent.findAndCountAll({
            where,
            include: [
                { model: Appointment, as: 'appointment', attributes: ['id', 'date', 'start_time', 'client_name', 'status'] },
                { model: ClientContact, as: 'clientContact', attributes: ['id', 'name', 'email', 'phone'] },
            ],
            order: [['createdAt', 'DESC']],
            limit: Number(limit),
            offset: Number(offset),
        });

        return res.status(200).json(successMessage({
            message: 'Payment intents',
            extra: { data: rows, pagination: { total: count } },
        }));
    } catch (error) {
        console.error('[turnos-payments] list error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al listar cobros' }));
    }
}

export async function getById(req, res) {
    try {
        const { id } = req.params;
        const intent = await PaymentIntent.findOne({
            where: { id },
            include: [
                { model: Appointment, as: 'appointment' },
                { model: ClientContact, as: 'clientContact' },
                { model: PaymentTransaction, as: 'transactions', order: [['createdAt', 'DESC']] },
            ],
        });
        if (!intent) return res.status(404).json(errorMessage({ message: 'No encontrado' }));
        return res.status(200).json(successMessage({ message: 'OK', extra: { data: intent } }));
    } catch (error) {
        console.error('[turnos-payments] getById error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener cobro' }));
    }
}

export async function refund(req, res) {
    try {
        const { id } = req.params;
        const { amount } = req.body;

        const intent = await PaymentIntent.findOne({
            where: { id },
            include: [{ model: PaymentTransaction, as: 'transactions' }],
        });
        if (!intent) return res.status(404).json(errorMessage({ message: 'No encontrado' }));
        if (intent.status !== 'paid') {
            return res.status(400).json(errorMessage({ message: 'Solo se pueden reembolsar pagos aprobados' }));
        }

        const lastTx = (intent.transactions || []).find(t => t.status === 'approved' && t.mp_payment_id);

        if (intent.mode === 'simulated' || !lastTx) {
            await intent.update({ status: 'refunded' });
            return res.status(200).json(successMessage({
                message: 'Reembolso simulado',
                extra: { data: intent },
            }));
        }

        const result = await refundPayment(lastTx.mp_payment_id, amount);
        if (!result.ok) {
            return res.status(502).json(errorMessage({ message: result.error || 'Error en refund' }));
        }
        await intent.update({ status: 'refunded' });
        await PaymentTransaction.create({
            payment_intent_id: intent.id,
            provider: 'mercadopago',
            status: 'refunded',
            amount: amount || intent.amount,
            event_type: 'refund',
            raw_payload: result.data,
        });

        return res.status(200).json(successMessage({ message: 'Reembolsado', extra: { data: intent } }));
    } catch (error) {
        console.error('[turnos-payments] refund error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al reembolsar' }));
    }
}

/**
 * Webhook publico de MercadoPago. Registrado en /system/webhook/mercadopago.
 * El intent se resuelve a partir del external_reference del pago
 * (`turno_<appointmentId>_<ts>`) o por una transaction previa con el mismo mp_payment_id.
 */
export async function webhook(req, res) {
    try {
        const body = req.body || {};
        const query = req.query || {};
        const type = query.type || body.type || body.action;
        const dataId = body.data?.id || query['data.id'] || query.id;

        if (!dataId) {
            return res.status(200).json({ ok: true, skipped: 'no dataId' });
        }

        let intent = null;

        // Plan A: buscar una transaction existente con este mp_payment_id
        const existingTx = await PaymentTransaction.findOne({ where: { mp_payment_id: String(dataId) } });
        if (existingTx) {
            intent = await PaymentIntent.findByPk(existingTx.payment_intent_id);
        }

        // Plan B: buscar pending intents y tratar de matchear via API
        if (!intent) {
            const pending = await PaymentIntent.findAll({
                where: { status: 'pending' },
                order: [['createdAt', 'DESC']],
                limit: 50,
            });
            for (const candidate of pending) {
                const payment = await getPaymentById(dataId);
                if (payment && payment.external_reference === candidate.mp_external_reference) {
                    intent = candidate;
                    break;
                }
            }
        }

        if (!intent) {
            return res.status(200).json({ ok: true, skipped: 'no match' });
        }

        // Verificar firma
        const signatureHeader = req.headers['x-signature'] || req.headers['X-Signature'];
        const requestId = req.headers['x-request-id'] || req.headers['X-Request-Id'];
        const valid = await verifyWebhookSignature({
            signatureHeader,
            requestId,
            dataId,
        });
        if (!valid) {
            console.warn('[turnos-mp-webhook] firma invalida');
            return res.status(401).json({ ok: false, error: 'invalid signature' });
        }

        const payment = await getPaymentById(dataId);
        if (!payment) return res.status(200).json({ ok: true, skipped: 'no payment data' });

        await PaymentTransaction.create({
            payment_intent_id: intent.id,
            provider: 'mercadopago',
            mp_payment_id: String(payment.id),
            status: payment.status,
            status_detail: payment.status_detail || null,
            amount: payment.transaction_amount || intent.amount,
            event_type: type || 'payment',
            raw_payload: payment,
        });

        if (payment.status === 'approved') {
            await intent.update({ status: 'paid', paid_at: new Date() });
            await Appointment.update(
                { status: 'confirmed', deposit_status: 'paid' },
                { where: { id: intent.appointment_id } },
            );
        } else if (payment.status === 'refunded') {
            await intent.update({ status: 'refunded' });
        } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
            await intent.update({ status: 'cancelled' });
        }

        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error('[turnos-mp-webhook] error:', error);
        return res.status(200).json({ ok: false, error: error.message });
    }
}
