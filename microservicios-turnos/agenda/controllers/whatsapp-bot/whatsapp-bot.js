import WhatsappSession from '../../models/WhatsappSession.js';
import Service from '../../models/Service.js';
import Professional from '../../models/Professional.js';
import Appointment from '../../models/Appointment.js';
import ClientContact from '../../models/ClientContact.js';
import BusinessConfig from '../../models/BusinessConfig.js';
import Schedule from '../../models/Schedule.js';
import ScheduleException from '../../models/ScheduleException.js';
import { Op } from 'sequelize';
import { errorMessage, successMessage } from '../../utils/messages.js';
import messages from '../../config/messages.js';
import CONFIG from '../../config/config.js';
import connection from '../../utils/connection.js';
import { parseIntent, generateConversationalResponse } from '../../integrations/openai.js';

/**
 * Convierte "HH:MM:SS" a minutos desde medianoche
 */
function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
}

/**
 * Obtener o crear sesión de WhatsApp
 */
async function getOrCreateSession(phoneNumber) {
    let session = await WhatsappSession.findOne({
        where: { phone_number: phoneNumber }
    });

    if (!session) {
        session = await WhatsappSession.create({
            phone_number: phoneNumber,
            conversation_state: 'idle',
            current_data: {},
        });
    }

    return session;
}

/**
 * Obtener slots disponibles rápido (versión simplificada para bot)
 */
async function getQuickAvailability(serviceId, professionalId, date) {
    const service = await Service.findByPk(serviceId);
    if (!service) return [];

    const config = await BusinessConfig.findOne();
    const slotDuration = config?.slot_duration_default || 30;
    const duration = service.duration_minutes;

    const dateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();

    // Obtener horarios
    let schedules = await Schedule.findAll({
        where: {
            professional_id: professionalId || null,
            day_of_week: dayOfWeek,
            active: true,
        }
    });

    if (schedules.length === 0 && professionalId) {
        schedules = await Schedule.findAll({
            where: { professional_id: null, day_of_week: dayOfWeek, active: true }
        });
    }

    if (schedules.length === 0) return [];

    // Excepciones bloqueantes
    const blockedAll = await ScheduleException.findOne({
        where: { date, is_blocked: true, start_time: null, professional_id: professionalId || null }
    });
    if (blockedAll) return [];

    // Generar slots
    const possibleSlots = [];
    for (const sch of schedules) {
        const startMin = timeToMinutes(sch.start_time);
        const endMin = timeToMinutes(sch.end_time);
        for (let slot = startMin; slot + duration <= endMin; slot += slotDuration) {
            possibleSlots.push({ start: minutesToTime(slot), end: minutesToTime(slot + duration), startMin: slot, endMin: slot + duration });
        }
    }

    // Quitar ocupados
    const existing = await Appointment.findAll({
        where: {
            date,
            status: { [Op.notIn]: ['cancelled'] },
            ...(professionalId ? { professional_id: professionalId } : {}),
        },
        attributes: ['start_time', 'end_time'],
    });

    const busy = existing.map(a => ({ start: timeToMinutes(a.start_time), end: timeToMinutes(a.end_time) }));

    return possibleSlots.filter(slot => !busy.some(b => slot.startMin < b.end && slot.endMin > b.start))
        .map(s => ({ start: s.start, end: s.end }));
}

/**
 * Handle incoming WhatsApp webhook message
 * Maneja flujo conversacional: idle -> booking -> confirming -> (crea turno)
 *                              idle -> cancelling -> (cancela turno)
 */
export async function handleIncoming(req, res) {
    try {
        const { phone_number, message_text, sender_name } = req.body;

        if (!phone_number || !message_text) {
            return res.sendStatus(400);
        }

        const session = await getOrCreateSession(phone_number);
        const text = message_text.trim().toLowerCase();

        let reply = '';

        // Usar IA para detectar intent si OpenAI esta configurado
        const intentResult = await parseIntent(message_text);
        const detectedIntent = intentResult.intent;

        switch (session.conversation_state) {
            case 'idle': {
                if (detectedIntent === 'book') {
                    // Mostrar servicios disponibles
                    const services = await Service.findAll({
                        where: { active: true },
                        order: [['sort_order', 'ASC']],
                    });

                    if (services.length === 0) {
                        reply = 'Lo siento, no hay servicios disponibles en este momento.';
                    } else {
                        const serviceList = services.map((s, i) => `${i + 1}. ${s.name} (${s.duration_minutes} min${s.price > 0 ? ` - $${s.price}` : ''})`).join('\n');
                        reply = `Estos son nuestros servicios:\n\n${serviceList}\n\nResponde con el número del servicio que quieras reservar.`;

                        await session.update({
                            conversation_state: 'booking',
                            current_data: { step: 'select_service', services: services.map(s => ({ id: s.id, name: s.name })) },
                            last_message_at: new Date(),
                        });
                    }
                } else if (detectedIntent === 'cancel') {
                    // Buscar turnos pendientes del contacto
                    const upcoming = await Appointment.findAll({
                        where: {
                            client_phone: phone_number,
                            status: { [Op.in]: ['pending', 'confirmed'] },
                            date: { [Op.gte]: new Date().toISOString().split('T')[0] },
                        },
                        include: [{ model: Service, as: 'service', attributes: ['name'] }],
                        order: [['date', 'ASC'], ['start_time', 'ASC']],
                    });

                    if (upcoming.length === 0) {
                        reply = 'No encontré turnos pendientes para tu número. Si necesitás ayuda, escribí "turno" para reservar uno nuevo.';
                    } else {
                        const list = upcoming.map((a, i) => `${i + 1}. ${a.service?.name || 'Servicio'} - ${a.date} a las ${a.start_time.slice(0, 5)}`).join('\n');
                        reply = `Estos son tus turnos próximos:\n\n${list}\n\nResponde con el número del turno que querés cancelar.`;

                        await session.update({
                            conversation_state: 'cancelling',
                            current_data: { appointments: upcoming.map(a => ({ id: a.id, desc: `${a.date} ${a.start_time.slice(0, 5)}` })) },
                            last_message_at: new Date(),
                        });
                    }
                } else {
                    // Intentar respuesta conversacional con IA
                    const config = await BusinessConfig.findOne();
                    const aiReply = await generateConversationalResponse({
                        context: 'El usuario esta en el menu principal. Puede reservar o cancelar turnos.',
                        userMessage: message_text,
                        businessName: config?.name || '',
                    });
                    reply = aiReply || 'Hola! Puedo ayudarte a:\n\n- Reservar un turno (escribi "turno")\n- Cancelar un turno (escribi "cancelar")\n\nQue necesitas?';
                }
                break;
            }

            case 'booking': {
                const data = session.current_data || {};

                if (data.step === 'select_service') {
                    const num = parseInt(text);
                    if (!num || num < 1 || num > (data.services?.length || 0)) {
                        reply = 'Por favor, respondé con el número del servicio. Ejemplo: 1';
                        break;
                    }

                    const selected = data.services[num - 1];

                    // Preguntar por fecha
                    reply = `Elegiste: ${selected.name}\n\n¿Para qué fecha querés el turno? (formato: DD/MM o "mañana" o "pasado mañana")`;

                    await session.update({
                        current_data: { ...data, step: 'select_date', service_id: selected.id, service_name: selected.name },
                        last_message_at: new Date(),
                    });

                } else if (data.step === 'select_date') {
                    let targetDate = null;

                    if (text === 'mañana' || text === 'manana') {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        targetDate = d.toISOString().split('T')[0];
                    } else if (text.includes('pasado')) {
                        const d = new Date();
                        d.setDate(d.getDate() + 2);
                        targetDate = d.toISOString().split('T')[0];
                    } else {
                        // Intentar parsear DD/MM
                        const match = text.match(/(\d{1,2})[\/\-](\d{1,2})/);
                        if (match) {
                            const day = match[1].padStart(2, '0');
                            const month = match[2].padStart(2, '0');
                            const year = new Date().getFullYear();
                            targetDate = `${year}-${month}-${day}`;
                        }
                    }

                    if (!targetDate) {
                        reply = 'No entendí la fecha. Podés escribir "mañana", "pasado mañana" o una fecha como 15/04.';
                        break;
                    }

                    // Obtener disponibilidad
                    const slots = await getQuickAvailability(data.service_id, null, targetDate);

                    if (slots.length === 0) {
                        reply = `No hay disponibilidad para el ${targetDate}. Probá con otra fecha.`;
                        break;
                    }

                    const slotList = slots.slice(0, 10).map((s, i) => `${i + 1}. ${s.start}`).join('\n');
                    reply = `Horarios disponibles para el ${targetDate}:\n\n${slotList}\n\nResponde con el número del horario.`;

                    await session.update({
                        current_data: { ...data, step: 'select_time', date: targetDate, slots: slots.slice(0, 10) },
                        last_message_at: new Date(),
                    });

                } else if (data.step === 'select_time') {
                    const num = parseInt(text);
                    if (!num || num < 1 || num > (data.slots?.length || 0)) {
                        reply = 'Por favor, respondé con el número del horario. Ejemplo: 1';
                        break;
                    }

                    const slot = data.slots[num - 1];

                    reply = `Resumen de tu turno:\n\n ${data.service_name}\n ${data.date}\n ${slot.start}\n\n¿Confirmás? (respondé "sí" o "no")`;

                    await session.update({
                        conversation_state: 'confirming',
                        current_data: { ...data, step: 'confirm', start_time: slot.start, end_time: slot.end },
                        last_message_at: new Date(),
                    });
                }
                break;
            }

            case 'confirming': {
                const data = session.current_data || {};

                if (text === 'si' || text === 'sí' || text === 'confirmo' || text === 'dale') {
                    // Crear el turno
                    try {
                        // Buscar o crear contacto
                        let contact = await ClientContact.findOne({
                            where: { phone: phone_number }
                        });
                        if (!contact) {
                            contact = await ClientContact.create({
                                name: sender_name || phone_number,
                                phone: phone_number,
                            });
                        }

                        const config = await BusinessConfig.findOne();

                        const appointment = await Appointment.create({
                            service_id: data.service_id,
                            client_contact_id: contact.id,
                            client_name: contact.name,
                            client_phone: phone_number,
                            date: data.date,
                            start_time: data.start_time,
                            end_time: data.end_time,
                            status: config?.auto_confirm ? 'confirmed' : 'pending',
                            source: 'whatsapp',
                        });

                        await contact.update({
                            appointment_count: contact.appointment_count + 1,
                            last_appointment_at: new Date(),
                        });

                        const statusText = appointment.status === 'confirmed' ? 'confirmado' : 'pendiente de confirmación';
                        reply = `Tu turno fue creado (${statusText}):\n\n ${data.service_name}\n ${data.date}\n ${data.start_time}\n\nPara cancelar, escribí "cancelar".`;
                    } catch (err) {
                        console.error('Error creating appointment from WhatsApp:', err);
                        reply = 'Hubo un error al crear tu turno. Por favor, intentá de nuevo.';
                    }

                    await session.update({
                        conversation_state: 'idle',
                        current_data: {},
                        last_message_at: new Date(),
                    });

                } else if (text === 'no' || text === 'cancelar') {
                    reply = 'Turno cancelado. Si necesitás algo, escribí "turno" para empezar de nuevo.';
                    await session.update({
                        conversation_state: 'idle',
                        current_data: {},
                        last_message_at: new Date(),
                    });
                } else {
                    reply = 'Respondé "sí" para confirmar o "no" para cancelar.';
                }
                break;
            }

            case 'cancelling': {
                const data = session.current_data || {};
                const num = parseInt(text);

                if (!num || num < 1 || num > (data.appointments?.length || 0)) {
                    reply = 'Por favor, respondé con el número del turno que querés cancelar.';
                    break;
                }

                const selected = data.appointments[num - 1];

                try {
                    await Appointment.update(
                        { status: 'cancelled', cancelled_at: new Date(), cancel_reason: 'Cancelado por WhatsApp' },
                        { where: { id: selected.id } }
                    );
                    reply = `Turno del ${selected.desc} cancelado correctamente.`;
                } catch (err) {
                    console.error('Error cancelling appointment from WhatsApp:', err);
                    reply = 'Hubo un error al cancelar el turno. Intentá de nuevo.';
                }

                await session.update({
                    conversation_state: 'idle',
                    current_data: {},
                    last_message_at: new Date(),
                });
                break;
            }

            default: {
                reply = 'Hola! Escribí "turno" para reservar o "cancelar" para cancelar un turno.';
                await session.update({ conversation_state: 'idle', current_data: {} });
            }
        }

        return res.status(200).json(successMessage({
            message: messages.entities.whatsapp.success.processed,
            extra: { data: { reply } }
        }));

    } catch (error) {
        console.error('Error handling WhatsApp incoming:', error);
        return res.sendStatus(500);
    }
}
