export interface BusinessConfig {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
    timezone: string;
    currency: string;
    booking_advance_days: number;
    cancellation_policy_hours: number;
    slot_duration_default: number;
    auto_confirm: boolean;
    deposit_required: boolean;
    deposit_percentage: number;
    api_key: string;
}

export interface Professional {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    specialty: string | null;
    avatar_url: string | null;
    color: string;
    active: boolean;
    sort_order: number;
    professionalServices?: ProfessionalService[];
}

export interface Service {
    id: number;
    name: string;
    description: string | null;
    duration_minutes: number;
    price: number;
    deposit_amount: number;
    category: string | null;
    requires_professional: boolean;
    max_concurrent: number;
    active: boolean;
    sort_order: number;
}

export interface ProfessionalService {
    id: number;
    professional_id: number;
    service_id: number;
    professional?: Professional;
    service?: Service;
}

export interface Schedule {
    id: number;
    professional_id: number | null;
    day_of_week: number;
    start_time: string;
    end_time: string;
    active: boolean;
    professional?: Professional;
}

export interface ScheduleException {
    id: number;
    professional_id: number | null;
    date: string;
    start_time: string | null;
    end_time: string | null;
    is_blocked: boolean;
    reason: string | null;
    professional?: Professional;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type AppointmentSource = 'web' | 'whatsapp' | 'manual';
export type DepositStatus = 'none' | 'pending' | 'paid';

export interface Appointment {
    id: number;
    professional_id: number | null;
    service_id: number;
    client_contact_id: number | null;
    client_name: string;
    client_email: string | null;
    client_phone: string | null;
    date: string;
    start_time: string;
    end_time: string;
    status: AppointmentStatus;
    source: AppointmentSource;
    deposit_status: DepositStatus;
    deposit_amount: number;
    notes: string | null;
    reminder_sent: boolean;
    reminder_24h_sent: boolean;
    cancelled_at: string | null;
    cancel_reason: string | null;
    external_calendar_id: string | null;
    professional?: Professional;
    service?: Service;
    clientContact?: ClientContact;
    createdAt: string;
    updatedAt: string;
}

export interface ClientContact {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
    last_appointment_at: string | null;
    appointment_count: number;
    no_show_count: number;
    appointments?: Appointment[];
}

export interface AvailabilitySlot {
    start: string;
    end: string;
}

export interface ProfessionalAvailability {
    professional_id: number | null;
    professional_name: string | null;
    professional_color?: string | null;
    slots: AvailabilitySlot[];
}

export interface AnalyticsData {
    appointments: {
        total: number;
        confirmed: number;
        cancelled: number;
        completed: number;
        no_shows: number;
        by_status: Array<{ status: string; count: number }>;
        by_source: Array<{ source: string; count: number }>;
    };
    rates: {
        no_show_rate: number;
        cancellation_rate: number;
    };
    revenue: number;
    clients: {
        total: number;
        with_no_shows: number;
    };
    top_services: Array<{ service_id: number; name: string; count: number }>;
    top_professionals: Array<{ professional_id: number; name: string; count: number }>;
}

export interface Pagination {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    perPage: number;
}

export interface ApiResponse<T = unknown> {
    status: 0 | 1;
    message?: string;
    data?: T;
    pagination?: Pagination;
}
