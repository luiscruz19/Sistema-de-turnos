export interface BusinessConfig {
    name: string;
    address: string;
    phone: string;
    timezone: string;
    currency: string;
    booking_advance_days: number;
    deposit_required: boolean;
}

export interface ServiceItem {
    id: number;
    name: string;
    description: string | null;
    duration_minutes: number;
    price: number;
    deposit_amount: number;
    category: string | null;
    requires_professional: boolean;
}

export interface ProfessionalItem {
    id: number;
    name: string;
    specialty: string | null;
    avatar_url: string | null;
    color: string | null;
    professionalServices: { service_id: number }[];
}

export interface WidgetConfig {
    business: BusinessConfig;
    services: ServiceItem[];
    professionals: ProfessionalItem[];
}

export interface TimeSlot {
    start: string;
    end: string;
}

export interface AvailabilityResult {
    professional_id: number | null;
    professional_name?: string;
    professional_color?: string;
    slots: TimeSlot[];
}

export interface BookingData {
    service: ServiceItem | null;
    professional: ProfessionalItem | null;
    date: string;
    slot: TimeSlot | null;
    client_name: string;
    client_email: string;
    client_phone: string;
    notes: string;
}

export type BookingStep = 'service' | 'professional' | 'date' | 'time' | 'form' | 'confirmation';
