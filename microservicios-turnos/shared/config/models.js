// Modelos compartidos por todos los MS del producto (sincronizados por todos).
export const sharedModels = [];

// Cada MS es dueño de sus modelos (sync); el resto solo los lee cuando hace include.
export const modelOwnership = {
    usuarios: ['Admin'],
    agenda: ['Appointment', 'AppointmentReminder', 'Professional', 'ProfessionalService', 'ProfessionalCalendarSync', 'Service', 'Schedule', 'ScheduleException', 'ClientContact', 'BusinessConfig', 'AnalyticsDaily', 'WhatsappSession'],
    pagos: ['PaymentIntent', 'PaymentTransaction'],
    integraciones: ['Integration'],
    clinica: ['ClientRecord', 'ClientNote', 'ClientAttachment'],
    widget: [], // BusinessConfig es propiedad de 'agenda'; widget solo lo lee
};
