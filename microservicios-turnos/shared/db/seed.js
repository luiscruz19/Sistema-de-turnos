import crypto from 'node:crypto';
import sequelize from './sequelize.js';
import {
    setupAssociations,
    BusinessConfig,
    Professional,
    Service,
    ProfessionalService,
    Schedule,
    ClientContact,
    Appointment,
} from '../models/index.js';

/**
 * Seed de datos demo para el sistema de turnos (single-tenant).
 *
 * Idempotente: usa findOrCreate / chequeos de existencia, por lo que
 * puede ejecutarse varias veces sin duplicar registros.
 *
 * Crea: 1 BusinessConfig, 3 profesionales, 4 servicios, sus relaciones,
 * horarios Lun-Vie, 3 clientes y 3 turnos confirmados a futuro.
 */

// Devuelve una fecha (YYYY-MM-DD) sumando dias a hoy.
function dateInDays(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

// Suma minutos a un horario HH:MM y devuelve HH:MM:SS.
function addMinutes(time, minutes) {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + minutes;
    const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    return `${hh}:${mm}:00`;
}

async function seed() {
    setupAssociations();
    await sequelize.authenticate();

    // 1. Configuracion del negocio.
    const [business] = await BusinessConfig.findOrCreate({
        where: { name: 'Consultorio Demo' },
        defaults: {
            name: 'Consultorio Demo',
            address: 'Av. Belgrano 1234, Salta',
            phone: '+54 387 400 0000',
            timezone: 'America/Argentina/Buenos_Aires',
            currency: 'ARS',
            booking_advance_days: 30,
            cancellation_policy_hours: 24,
            slot_duration_default: 30,
            auto_confirm: true,
            deposit_required: false,
            api_key: crypto.randomBytes(24).toString('hex'),
        },
    });

    // 2. Profesionales.
    const professionalsData = [
        { name: 'Dra. Maria Gonzalez', email: 'maria.gonzalez@consultoriodemo.com', phone: '+54 387 401 1111', specialty: 'Clinica medica', color: '#2563eb', sort_order: 1 },
        { name: 'Lic. Juan Perez', email: 'juan.perez@consultoriodemo.com', phone: '+54 387 402 2222', specialty: 'Kinesiologia', color: '#16a34a', sort_order: 2 },
        { name: 'Dra. Laura Fernandez', email: 'laura.fernandez@consultoriodemo.com', phone: '+54 387 403 3333', specialty: 'Nutricion', color: '#db2777', sort_order: 3 },
    ];
    const professionals = [];
    for (const data of professionalsData) {
        const [professional] = await Professional.findOrCreate({
            where: { email: data.email },
            defaults: data,
        });
        professionals.push(professional);
    }

    // 3. Servicios.
    const servicesData = [
        { name: 'Consulta inicial', description: 'Primera consulta de evaluacion', duration_minutes: 45, price: 15000, category: 'Consultas', sort_order: 1 },
        { name: 'Control', description: 'Consulta de seguimiento', duration_minutes: 30, price: 9000, category: 'Consultas', sort_order: 2 },
        { name: 'Sesion de kinesiologia', description: 'Sesion de rehabilitacion', duration_minutes: 60, price: 12000, category: 'Tratamientos', sort_order: 3 },
        { name: 'Plan nutricional', description: 'Armado de plan alimentario', duration_minutes: 45, price: 13000, category: 'Tratamientos', sort_order: 4 },
    ];
    const services = [];
    for (const data of servicesData) {
        const [service] = await Service.findOrCreate({
            where: { name: data.name },
            defaults: data,
        });
        services.push(service);
    }

    // 4. Asociacion profesional <-> servicio.
    //    Maria: Consulta inicial + Control. Juan: Sesion de kinesiologia.
    //    Laura: Plan nutricional + Control.
    const links = [
        [professionals[0].id, services[0].id],
        [professionals[0].id, services[1].id],
        [professionals[1].id, services[2].id],
        [professionals[2].id, services[3].id],
        [professionals[2].id, services[1].id],
    ];
    for (const [professional_id, service_id] of links) {
        await ProfessionalService.findOrCreate({
            where: { professional_id, service_id },
            defaults: { professional_id, service_id },
        });
    }

    // 5. Horarios de atencion: Lunes a Viernes 9:00 a 17:00 por profesional.
    for (const professional of professionals) {
        for (let day = 1; day <= 5; day++) {
            await Schedule.findOrCreate({
                where: { professional_id: professional.id, day_of_week: day },
                defaults: {
                    professional_id: professional.id,
                    day_of_week: day,
                    start_time: '09:00:00',
                    end_time: '17:00:00',
                    active: true,
                },
            });
        }
    }

    // 6. Clientes demo.
    const clientsData = [
        { name: 'Carlos Ramirez', email: 'carlos.ramirez@example.com', phone: '+54 387 500 1010' },
        { name: 'Ana Martinez', email: 'ana.martinez@example.com', phone: '+54 387 500 2020' },
        { name: 'Sofia Lopez', email: 'sofia.lopez@example.com', phone: '+54 387 500 3030' },
    ];
    const clients = [];
    for (const data of clientsData) {
        const [client] = await ClientContact.findOrCreate({
            where: { email: data.email },
            defaults: data,
        });
        clients.push(client);
    }

    // 7. Turnos a futuro, confirmados.
    const appointmentsData = [
        { professional: professionals[0], service: services[0], client: clients[0], date: dateInDays(2), start_time: '09:00:00' },
        { professional: professionals[1], service: services[2], client: clients[1], date: dateInDays(3), start_time: '10:30:00' },
        { professional: professionals[2], service: services[3], client: clients[2], date: dateInDays(5), start_time: '14:00:00' },
    ];
    for (const data of appointmentsData) {
        await Appointment.findOrCreate({
            where: {
                professional_id: data.professional.id,
                date: data.date,
                start_time: data.start_time,
            },
            defaults: {
                professional_id: data.professional.id,
                service_id: data.service.id,
                client_contact_id: data.client.id,
                client_name: data.client.name,
                client_email: data.client.email,
                client_phone: data.client.phone,
                date: data.date,
                start_time: data.start_time,
                end_time: addMinutes(data.start_time, data.service.duration_minutes),
                status: 'confirmed',
                source: 'manual',
            },
        });
    }

    console.log('Seed completado.');
    console.log(`  Negocio: ${business.name} (api_key: ${business.api_key})`);
    console.log(`  Profesionales: ${professionals.length}`);
    console.log(`  Servicios: ${services.length}`);
    console.log(`  Clientes: ${clients.length}`);
    console.log(`  Turnos: ${appointmentsData.length}`);
}

seed()
    .then(async () => {
        await sequelize.close();
        process.exit(0);
    })
    .catch(async (error) => {
        console.error('Error en el seed:', error.message);
        try {
            await sequelize.close();
        } catch (_) {
            // ignorar errores al cerrar la conexion
        }
        process.exit(1);
    });
