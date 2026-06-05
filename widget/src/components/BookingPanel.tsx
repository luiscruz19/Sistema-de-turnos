import type { WidgetConfig, BookingStep, BookingData, AvailabilityResult, TimeSlot } from '../types';
import { ServiceSelector } from './ServiceSelector';
import { ProfessionalSelector } from './ProfessionalSelector';
import { DateSelector } from './DateSelector';
import { TimeSlots } from './TimeSlots';
import { BookingForm } from './BookingForm';
import { Confirmation } from './Confirmation';

interface BookingPanelProps {
    config: WidgetConfig;
    step: BookingStep;
    booking: BookingData;
    availability: AvailabilityResult[];
    confirmationData: any;
    loading: boolean;
    submitting: boolean;
    error: string | null;
    onSelectService: (id: number) => void;
    onSelectProfessional: (id: number | null) => void;
    onSelectDate: (date: string) => void;
    onSelectSlot: (slot: TimeSlot) => void;
    onUpdateForm: (field: keyof BookingData, value: string) => void;
    onSubmit: () => void;
    onBack: () => void;
    onReset: () => void;
    onClose: () => void;
    primaryColor: string;
}

export function BookingPanel({
    config, step, booking, availability, confirmationData,
    loading, submitting, error,
    onSelectService, onSelectProfessional, onSelectDate, onSelectSlot,
    onUpdateForm, onSubmit, onBack, onReset, onClose,
    primaryColor,
}: BookingPanelProps) {
    const showBack = step !== 'service' && step !== 'confirmation';

    return (
        <div class="tw-panel">
            {/* Header */}
            <div class="tw-panel__header" style={{ backgroundColor: primaryColor }}>
                <div class="tw-panel__header-left">
                    {showBack && (
                        <button class="tw-panel__back" onClick={onBack} aria-label="Volver">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                    )}
                    <span class="tw-panel__title">{config.business.name || 'Reservar turno'}</span>
                </div>
                <button class="tw-panel__close" onClick={onClose} aria-label="Cerrar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Content */}
            <div class="tw-panel__content">
                {error && <div class="tw-error">{error}</div>}

                {step === 'service' && (
                    <ServiceSelector
                        services={config.services}
                        onSelect={onSelectService}
                        currency={config.business.currency || '$'}
                    />
                )}

                {step === 'professional' && (
                    <ProfessionalSelector
                        professionals={config.professionals.filter(p =>
                            p.professionalServices.some(ps => ps.service_id === booking.service?.id)
                        )}
                        onSelect={onSelectProfessional}
                    />
                )}

                {step === 'date' && (
                    <DateSelector
                        advanceDays={config.business.booking_advance_days || 60}
                        onSelect={onSelectDate}
                    />
                )}

                {step === 'time' && (
                    <TimeSlots
                        availability={availability}
                        onSelect={onSelectSlot}
                        loading={loading}
                        primaryColor={primaryColor}
                    />
                )}

                {step === 'form' && (
                    <BookingForm
                        booking={booking}
                        onUpdate={onUpdateForm}
                        onSubmit={onSubmit}
                        submitting={submitting}
                        primaryColor={primaryColor}
                    />
                )}

                {step === 'confirmation' && (
                    <Confirmation
                        booking={booking}
                        confirmationData={confirmationData}
                        onReset={onReset}
                        primaryColor={primaryColor}
                    />
                )}
            </div>
        </div>
    );
}
