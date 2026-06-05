import { useState, useCallback, useEffect } from 'preact/hooks';
import type { WidgetConfig, BookingData, BookingStep, AvailabilityResult, TimeSlot } from '../types';

interface UseBookingOptions {
    apiKey: string;
    apiBaseUrl: string;
}

const emptyBooking: BookingData = {
    service: null,
    professional: null,
    date: '',
    slot: null,
    client_name: '',
    client_email: '',
    client_phone: '',
    notes: '',
};

export function useBooking({ apiKey, apiBaseUrl }: UseBookingOptions) {
    const [config, setConfig] = useState<WidgetConfig | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [step, setStep] = useState<BookingStep>('service');
    const [booking, setBooking] = useState<BookingData>({ ...emptyBooking });
    const [availability, setAvailability] = useState<AvailabilityResult[]>([]);
    const [confirmationData, setConfirmationData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const headers = {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
    };

    // Load business config, services, professionals
    const getConfig = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${apiBaseUrl}/widget/config?api_key=${encodeURIComponent(apiKey)}`);
            const json = await res.json();
            if (json.status === 1 && json.data) {
                setConfig(json.data as WidgetConfig);
            } else {
                setError(json.message || 'Error al cargar la configuracion');
            }
        } catch {
            setError('No se pudo conectar con el servicio');
        } finally {
            setLoading(false);
        }
    }, [apiKey, apiBaseUrl]);

    useEffect(() => { getConfig(); }, [getConfig]);

    // Fetch availability for a given date
    const getAvailability = useCallback(async (date: string) => {
        if (!booking.service) return;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                api_key: apiKey,
                service_id: String(booking.service.id),
                date,
            });
            if (booking.professional) {
                params.set('professional_id', String(booking.professional.id));
            }
            const res = await fetch(`${apiBaseUrl}/widget/availability?${params}`);
            const json = await res.json();
            if (json.status === 1 && json.data) {
                setAvailability(json.data.availability || []);
            } else {
                setAvailability([]);
            }
        } catch {
            setError('Error al obtener disponibilidad');
            setAvailability([]);
        } finally {
            setLoading(false);
        }
    }, [apiKey, apiBaseUrl, booking.service, booking.professional]);

    // Create booking
    const createBooking = useCallback(async () => {
        if (!booking.service || !booking.date || !booking.slot || !booking.client_name) return;
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch(`${apiBaseUrl}/widget/book`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    service_id: booking.service.id,
                    professional_id: booking.professional?.id || null,
                    date: booking.date,
                    start_time: booking.slot.start,
                    client_name: booking.client_name,
                    client_email: booking.client_email || undefined,
                    client_phone: booking.client_phone || undefined,
                    notes: booking.notes || undefined,
                }),
            });
            const json = await res.json();
            if (json.status === 1 && json.data) {
                setConfirmationData(json.data);
                setStep('confirmation');
            } else {
                setError(json.message || 'Error al crear el turno');
            }
        } catch {
            setError('No se pudo crear el turno');
        } finally {
            setSubmitting(false);
        }
    }, [apiBaseUrl, headers, booking]);

    const selectService = useCallback((serviceId: number) => {
        const service = config?.services.find(s => s.id === serviceId) || null;
        setBooking(prev => ({ ...prev, service, professional: null, date: '', slot: null }));

        // Check if the service requires professional selection
        if (service?.requires_professional) {
            const pros = config?.professionals.filter(p =>
                p.professionalServices.some(ps => ps.service_id === serviceId)
            ) || [];
            if (pros.length > 0) {
                setStep('professional');
                return;
            }
        }
        setStep('date');
    }, [config]);

    const selectProfessional = useCallback((professionalId: number | null) => {
        const professional = professionalId
            ? config?.professionals.find(p => p.id === professionalId) || null
            : null;
        setBooking(prev => ({ ...prev, professional, date: '', slot: null }));
        setStep('date');
    }, [config]);

    const selectDate = useCallback((date: string) => {
        setBooking(prev => ({ ...prev, date, slot: null }));
        getAvailability(date);
        setStep('time');
    }, [getAvailability]);

    const selectSlot = useCallback((slot: TimeSlot) => {
        setBooking(prev => ({ ...prev, slot }));
        setStep('form');
    }, []);

    const updateForm = useCallback((field: keyof BookingData, value: string) => {
        setBooking(prev => ({ ...prev, [field]: value }));
    }, []);

    const goBack = useCallback(() => {
        const stepOrder: BookingStep[] = ['service', 'professional', 'date', 'time', 'form'];
        const currentIdx = stepOrder.indexOf(step);
        if (currentIdx > 0) {
            let prevStep = stepOrder[currentIdx - 1];
            // Skip professional step if not required
            if (prevStep === 'professional' && !booking.service?.requires_professional) {
                prevStep = 'service';
            }
            setStep(prevStep);
        }
    }, [step, booking.service]);

    const reset = useCallback(() => {
        setBooking({ ...emptyBooking });
        setStep('service');
        setConfirmationData(null);
        setAvailability([]);
        setError(null);
    }, []);

    return {
        config,
        loading,
        submitting,
        step,
        booking,
        availability,
        confirmationData,
        error,
        selectService,
        selectProfessional,
        selectDate,
        selectSlot,
        updateForm,
        createBooking,
        goBack,
        reset,
    };
}
