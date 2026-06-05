import type { BookingData } from '../types';

interface ConfirmationProps {
    booking: BookingData;
    confirmationData: any;
    onReset: () => void;
    primaryColor: string;
}

export function Confirmation({ booking, confirmationData, onReset, primaryColor }: ConfirmationProps) {
    const status = confirmationData?.status || 'pending';
    const isConfirmed = status === 'confirmed';

    return (
        <div class="tw-step tw-confirmation">
            <div class="tw-confirmation__icon" style={{ color: primaryColor }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
            </div>

            <h3 class="tw-confirmation__title">
                {isConfirmed ? 'Turno confirmado' : 'Turno registrado'}
            </h3>

            <p class="tw-confirmation__subtitle">
                {isConfirmed
                    ? 'Tu turno ha sido confirmado exitosamente.'
                    : 'Tu turno fue registrado y esta pendiente de confirmacion.'}
            </p>

            <div class="tw-summary">
                <div class="tw-summary__row">
                    <span>Servicio:</span>
                    <strong>{booking.service?.name}</strong>
                </div>
                <div class="tw-summary__row">
                    <span>Fecha:</span>
                    <strong>{booking.date}</strong>
                </div>
                <div class="tw-summary__row">
                    <span>Horario:</span>
                    <strong>{booking.slot?.start} - {booking.slot?.end}</strong>
                </div>
                {booking.professional && (
                    <div class="tw-summary__row">
                        <span>Profesional:</span>
                        <strong>{booking.professional.name}</strong>
                    </div>
                )}
            </div>

            <button
                class="tw-form__submit"
                style={{ backgroundColor: primaryColor }}
                onClick={onReset}
            >
                Reservar otro turno
            </button>
        </div>
    );
}
