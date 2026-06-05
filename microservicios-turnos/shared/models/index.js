import Admin from './Admin.js';
import BusinessConfig from './BusinessConfig.js';
import Professional from './Professional.js';
import Service from './Service.js';
import ProfessionalService from './ProfessionalService.js';
import Schedule from './Schedule.js';
import ScheduleException from './ScheduleException.js';
import Appointment from './Appointment.js';
import AppointmentReminder from './AppointmentReminder.js';
import ClientContact from './ClientContact.js';
import WhatsappSession from './WhatsappSession.js';
import AnalyticsDaily from './AnalyticsDaily.js';
import Integration from './Integration.js';
import PaymentIntent from './PaymentIntent.js';
import PaymentTransaction from './PaymentTransaction.js';
import ClientRecord from './ClientRecord.js';
import ClientNote from './ClientNote.js';
import ClientAttachment from './ClientAttachment.js';
import ProfessionalCalendarSync from './ProfessionalCalendarSync.js';
import IntakeForm from './IntakeForm.js';
import IntakeField from './IntakeField.js';
import IntakeResponse from './IntakeResponse.js';
import SessionPackage from './SessionPackage.js';
import ClientPackage from './ClientPackage.js';
import WaitlistEntry from './WaitlistEntry.js';
import GroupClass from './GroupClass.js';
import GroupClassEnrollment from './GroupClassEnrollment.js';

let associationsConfigured = false;

function setupAssociations() {
    if (associationsConfigured) {
        return;
    }

    associationsConfigured = true;

    // Professional <-> ProfessionalService <-> Service (many-to-many)
    Professional.hasMany(ProfessionalService, {
        foreignKey: 'professional_id',
        as: 'professionalServices'
    });

    Service.hasMany(ProfessionalService, {
        foreignKey: 'service_id',
        as: 'professionalServices'
    });

    ProfessionalService.belongsTo(Professional, {
        foreignKey: 'professional_id',
        as: 'professional'
    });

    ProfessionalService.belongsTo(Service, {
        foreignKey: 'service_id',
        as: 'service'
    });

    // Professional -> Appointments
    Professional.hasMany(Appointment, {
        foreignKey: 'professional_id',
        as: 'appointments'
    });

    Appointment.belongsTo(Professional, {
        foreignKey: 'professional_id',
        as: 'professional'
    });

    // Service -> Appointments
    Service.hasMany(Appointment, {
        foreignKey: 'service_id',
        as: 'appointments'
    });

    Appointment.belongsTo(Service, {
        foreignKey: 'service_id',
        as: 'service'
    });

    // ClientContact -> Appointments
    ClientContact.hasMany(Appointment, {
        foreignKey: 'client_contact_id',
        as: 'appointments'
    });

    Appointment.belongsTo(ClientContact, {
        foreignKey: 'client_contact_id',
        as: 'clientContact'
    });

    // Appointment -> AppointmentReminders
    Appointment.hasMany(AppointmentReminder, {
        foreignKey: 'appointment_id',
        as: 'reminders'
    });

    AppointmentReminder.belongsTo(Appointment, {
        foreignKey: 'appointment_id',
        as: 'appointment'
    });

    // Professional -> Schedules
    Professional.hasMany(Schedule, {
        foreignKey: 'professional_id',
        as: 'schedules'
    });

    Schedule.belongsTo(Professional, {
        foreignKey: 'professional_id',
        as: 'professional'
    });

    // Professional -> ScheduleExceptions
    Professional.hasMany(ScheduleException, {
        foreignKey: 'professional_id',
        as: 'scheduleExceptions'
    });

    ScheduleException.belongsTo(Professional, {
        foreignKey: 'professional_id',
        as: 'professional'
    });

    // Appointment -> PaymentIntents
    Appointment.hasMany(PaymentIntent, {
        foreignKey: 'appointment_id',
        as: 'paymentIntents',
    });

    PaymentIntent.belongsTo(Appointment, {
        foreignKey: 'appointment_id',
        as: 'appointment',
    });

    PaymentIntent.belongsTo(ClientContact, {
        foreignKey: 'client_contact_id',
        as: 'clientContact',
    });

    // PaymentIntent -> PaymentTransactions
    PaymentIntent.hasMany(PaymentTransaction, {
        foreignKey: 'payment_intent_id',
        as: 'transactions',
    });

    PaymentTransaction.belongsTo(PaymentIntent, {
        foreignKey: 'payment_intent_id',
        as: 'paymentIntent',
    });

    // ClientContact -> ClientRecord (1:1)
    ClientContact.hasOne(ClientRecord, {
        foreignKey: 'client_contact_id',
        as: 'record',
    });

    ClientRecord.belongsTo(ClientContact, {
        foreignKey: 'client_contact_id',
        as: 'clientContact',
    });

    // ClientContact -> ClientNotes (1:N)
    ClientContact.hasMany(ClientNote, {
        foreignKey: 'client_contact_id',
        as: 'clientNotes',
    });

    ClientNote.belongsTo(ClientContact, {
        foreignKey: 'client_contact_id',
        as: 'clientContact',
    });

    ClientNote.belongsTo(Professional, {
        foreignKey: 'professional_id',
        as: 'professional',
    });

    ClientNote.belongsTo(Appointment, {
        foreignKey: 'appointment_id',
        as: 'appointment',
    });

    // ClientContact -> ClientAttachments (1:N)
    ClientContact.hasMany(ClientAttachment, {
        foreignKey: 'client_contact_id',
        as: 'attachments',
    });

    ClientAttachment.belongsTo(ClientContact, {
        foreignKey: 'client_contact_id',
        as: 'clientContact',
    });

    // Professional -> ProfessionalCalendarSync (1:1)
    Professional.hasOne(ProfessionalCalendarSync, {
        foreignKey: 'professional_id',
        as: 'calendarSync',
    });

    ProfessionalCalendarSync.belongsTo(Professional, {
        foreignKey: 'professional_id',
        as: 'professional',
    });

    // Service -> IntakeForms (1:N)
    Service.hasMany(IntakeForm, {
        foreignKey: 'service_id',
        as: 'intakeForms',
    });

    IntakeForm.belongsTo(Service, {
        foreignKey: 'service_id',
        as: 'service',
    });

    // IntakeForm -> IntakeFields (1:N)
    IntakeForm.hasMany(IntakeField, {
        foreignKey: 'intake_form_id',
        as: 'fields',
    });

    IntakeField.belongsTo(IntakeForm, {
        foreignKey: 'intake_form_id',
        as: 'intakeForm',
    });

    // Appointment -> IntakeResponses (1:N)
    Appointment.hasMany(IntakeResponse, {
        foreignKey: 'appointment_id',
        as: 'intakeResponses',
    });

    IntakeResponse.belongsTo(Appointment, {
        foreignKey: 'appointment_id',
        as: 'appointment',
    });

    // IntakeForm -> IntakeResponses (1:N)
    IntakeForm.hasMany(IntakeResponse, {
        foreignKey: 'intake_form_id',
        as: 'responses',
    });

    IntakeResponse.belongsTo(IntakeForm, {
        foreignKey: 'intake_form_id',
        as: 'intakeForm',
    });

    // ClientContact -> IntakeResponses (1:N)
    ClientContact.hasMany(IntakeResponse, {
        foreignKey: 'client_contact_id',
        as: 'intakeResponses',
    });

    IntakeResponse.belongsTo(ClientContact, {
        foreignKey: 'client_contact_id',
        as: 'clientContact',
    });

    // Service -> SessionPackages (1:N)
    Service.hasMany(SessionPackage, {
        foreignKey: 'service_id',
        as: 'sessionPackages',
    });

    SessionPackage.belongsTo(Service, {
        foreignKey: 'service_id',
        as: 'service',
    });

    // ClientContact -> ClientPackages (1:N)
    ClientContact.hasMany(ClientPackage, {
        foreignKey: 'client_contact_id',
        as: 'clientPackages',
    });

    ClientPackage.belongsTo(ClientContact, {
        foreignKey: 'client_contact_id',
        as: 'clientContact',
    });

    // SessionPackage -> ClientPackages (1:N)
    SessionPackage.hasMany(ClientPackage, {
        foreignKey: 'session_package_id',
        as: 'clientPackages',
    });

    ClientPackage.belongsTo(SessionPackage, {
        foreignKey: 'session_package_id',
        as: 'sessionPackage',
    });

    // ClientPackage -> Appointments (turnos descontados del paquete)
    ClientPackage.hasMany(Appointment, {
        foreignKey: 'client_package_id',
        as: 'appointments',
    });

    Appointment.belongsTo(ClientPackage, {
        foreignKey: 'client_package_id',
        as: 'clientPackage',
    });

    // ClientContact -> WaitlistEntries (1:N)
    ClientContact.hasMany(WaitlistEntry, {
        foreignKey: 'client_contact_id',
        as: 'waitlistEntries',
    });

    WaitlistEntry.belongsTo(ClientContact, {
        foreignKey: 'client_contact_id',
        as: 'clientContact',
    });

    // Service -> WaitlistEntries (1:N)
    Service.hasMany(WaitlistEntry, {
        foreignKey: 'service_id',
        as: 'waitlistEntries',
    });

    WaitlistEntry.belongsTo(Service, {
        foreignKey: 'service_id',
        as: 'service',
    });

    // Professional -> WaitlistEntries (1:N)
    Professional.hasMany(WaitlistEntry, {
        foreignKey: 'professional_id',
        as: 'waitlistEntries',
    });

    WaitlistEntry.belongsTo(Professional, {
        foreignKey: 'professional_id',
        as: 'professional',
    });

    // Service -> GroupClasses (1:N)
    Service.hasMany(GroupClass, {
        foreignKey: 'service_id',
        as: 'groupClasses',
    });

    GroupClass.belongsTo(Service, {
        foreignKey: 'service_id',
        as: 'service',
    });

    // Professional -> GroupClasses (1:N)
    Professional.hasMany(GroupClass, {
        foreignKey: 'professional_id',
        as: 'groupClasses',
    });

    GroupClass.belongsTo(Professional, {
        foreignKey: 'professional_id',
        as: 'professional',
    });

    // GroupClass -> GroupClassEnrollments (1:N)
    GroupClass.hasMany(GroupClassEnrollment, {
        foreignKey: 'group_class_id',
        as: 'enrollments',
    });

    GroupClassEnrollment.belongsTo(GroupClass, {
        foreignKey: 'group_class_id',
        as: 'groupClass',
    });

    // ClientContact -> GroupClassEnrollments (1:N)
    ClientContact.hasMany(GroupClassEnrollment, {
        foreignKey: 'client_contact_id',
        as: 'groupClassEnrollments',
    });

    GroupClassEnrollment.belongsTo(ClientContact, {
        foreignKey: 'client_contact_id',
        as: 'clientContact',
    });
}

export {
    setupAssociations,
    Admin,
    BusinessConfig,
    Professional,
    Service,
    ProfessionalService,
    Schedule,
    ScheduleException,
    Appointment,
    AppointmentReminder,
    ClientContact,
    WhatsappSession,
    AnalyticsDaily,
    Integration,
    PaymentIntent,
    PaymentTransaction,
    ClientRecord,
    ClientNote,
    ClientAttachment,
    ProfessionalCalendarSync,
    IntakeForm,
    IntakeField,
    IntakeResponse,
    SessionPackage,
    ClientPackage,
    WaitlistEntry,
    GroupClass,
    GroupClassEnrollment,
};

export default {
    Admin,
    BusinessConfig,
    Professional,
    Service,
    ProfessionalService,
    Schedule,
    ScheduleException,
    Appointment,
    AppointmentReminder,
    ClientContact,
    WhatsappSession,
    AnalyticsDaily,
    Integration,
    PaymentIntent,
    PaymentTransaction,
    ClientRecord,
    ClientNote,
    ClientAttachment,
    ProfessionalCalendarSync,
    IntakeForm,
    IntakeField,
    IntakeResponse,
    SessionPackage,
    ClientPackage,
    WaitlistEntry,
    GroupClass,
    GroupClassEnrollment,
};
