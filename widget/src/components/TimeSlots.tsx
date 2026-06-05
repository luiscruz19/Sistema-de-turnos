import type { AvailabilityResult, TimeSlot } from '../types';

interface TimeSlotsProps {
    availability: AvailabilityResult[];
    onSelect: (slot: TimeSlot) => void;
    loading: boolean;
    primaryColor: string;
}

export function TimeSlots({ availability, onSelect, loading, primaryColor }: TimeSlotsProps) {
    if (loading) {
        return (
            <div class="tw-step">
                <h3 class="tw-step__title">Cargando horarios...</h3>
                <div class="tw-loading-bar" />
            </div>
        );
    }

    const allSlots = availability.flatMap(a => a.slots);

    if (allSlots.length === 0) {
        return (
            <div class="tw-step">
                <h3 class="tw-step__title">Selecciona un horario</h3>
                <p class="tw-no-data">No hay horarios disponibles para esta fecha. Proba con otra fecha.</p>
            </div>
        );
    }

    // If there are multiple professionals, group by professional
    const hasProfessionals = availability.some(a => a.professional_id !== null);

    return (
        <div class="tw-step">
            <h3 class="tw-step__title">Selecciona un horario</h3>
            {hasProfessionals ? (
                <div class="tw-time-groups">
                    {availability.filter(a => a.slots.length > 0).map(group => (
                        <div key={group.professional_id} class="tw-time-group">
                            <span class="tw-time-group__name" style={{ color: group.professional_color || primaryColor }}>
                                {group.professional_name || 'Profesional'}
                            </span>
                            <div class="tw-time-grid">
                                {group.slots.map(slot => (
                                    <button
                                        key={`${group.professional_id}-${slot.start}`}
                                        class="tw-time-slot"
                                        style={{ borderColor: primaryColor }}
                                        onClick={() => onSelect(slot)}
                                    >
                                        {slot.start}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div class="tw-time-grid">
                    {allSlots.map(slot => (
                        <button
                            key={slot.start}
                            class="tw-time-slot"
                            style={{ borderColor: primaryColor }}
                            onClick={() => onSelect(slot)}
                        >
                            {slot.start}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
