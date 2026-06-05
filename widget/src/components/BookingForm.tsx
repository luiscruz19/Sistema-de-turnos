import { useState } from 'preact/hooks';
import type { BookingData } from '../types';

interface BookingFormProps {
    booking: BookingData;
    onUpdate: (field: keyof BookingData, value: string) => void;
    onSubmit: () => void;
    submitting: boolean;
    primaryColor: string;
}

export function BookingForm({ booking, onUpdate, onSubmit, submitting, primaryColor }: BookingFormProps) {
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const handleSubmit = (e: Event) => {
        e.preventDefault();
        if (!booking.client_name.trim()) {
            setTouched(prev => ({ ...prev, client_name: true }));
            return;
        }
        onSubmit();
    };

    return (
        <div class="tw-step">
            <h3 class="tw-step__title">Tus datos</h3>
            <form class="tw-form" onSubmit={handleSubmit}>
                <div class="tw-form__field">
                    <label class="tw-form__label">Nombre *</label>
                    <input
                        class={`tw-form__input ${touched.client_name && !booking.client_name.trim() ? 'tw-form__input--error' : ''}`}
                        type="text"
                        value={booking.client_name}
                        onInput={(e) => onUpdate('client_name', (e.target as HTMLInputElement).value)}
                        onBlur={() => setTouched(prev => ({ ...prev, client_name: true }))}
                        placeholder="Tu nombre completo"
                        required
                    />
                </div>
                <div class="tw-form__field">
                    <label class="tw-form__label">Email</label>
                    <input
                        class="tw-form__input"
                        type="email"
                        value={booking.client_email}
                        onInput={(e) => onUpdate('client_email', (e.target as HTMLInputElement).value)}
                        placeholder="tu@email.com"
                    />
                </div>
                <div class="tw-form__field">
                    <label class="tw-form__label">Telefono</label>
                    <input
                        class="tw-form__input"
                        type="tel"
                        value={booking.client_phone}
                        onInput={(e) => onUpdate('client_phone', (e.target as HTMLInputElement).value)}
                        placeholder="+54 11 1234-5678"
                    />
                </div>
                <div class="tw-form__field">
                    <label class="tw-form__label">Notas</label>
                    <textarea
                        class="tw-form__input tw-form__textarea"
                        value={booking.notes}
                        onInput={(e) => onUpdate('notes', (e.target as HTMLTextAreaElement).value)}
                        placeholder="Alguna aclaracion..."
                        rows={2}
                    />
                </div>

                {/* Summary */}
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
                        <strong>{booking.slot?.start}</strong>
                    </div>
                    {booking.professional && (
                        <div class="tw-summary__row">
                            <span>Profesional:</span>
                            <strong>{booking.professional.name}</strong>
                        </div>
                    )}
                    {booking.service && booking.service.price > 0 && (
                        <div class="tw-summary__row">
                            <span>Precio:</span>
                            <strong>${booking.service.price.toLocaleString()}</strong>
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    class="tw-form__submit"
                    style={{ backgroundColor: primaryColor }}
                    disabled={submitting}
                >
                    {submitting ? 'Reservando...' : 'Confirmar turno'}
                </button>
            </form>
        </div>
    );
}
