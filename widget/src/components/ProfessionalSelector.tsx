import type { ProfessionalItem } from '../types';

interface ProfessionalSelectorProps {
    professionals: ProfessionalItem[];
    onSelect: (professionalId: number | null) => void;
}

export function ProfessionalSelector({ professionals, onSelect }: ProfessionalSelectorProps) {
    return (
        <div class="tw-step">
            <h3 class="tw-step__title">Selecciona un profesional</h3>
            <div class="tw-professionals">
                <button class="tw-prof-card" onClick={() => onSelect(null)}>
                    <div class="tw-prof-card__avatar tw-prof-card__avatar--any">?</div>
                    <span class="tw-prof-card__name">Sin preferencia</span>
                </button>
                {professionals.map(pro => (
                    <button key={pro.id} class="tw-prof-card" onClick={() => onSelect(pro.id)}>
                        {pro.avatar_url ? (
                            <img class="tw-prof-card__avatar" src={pro.avatar_url} alt={pro.name} />
                        ) : (
                            <div
                                class="tw-prof-card__avatar tw-prof-card__avatar--initials"
                                style={{ backgroundColor: pro.color || '#6366f1' }}
                            >
                                {pro.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span class="tw-prof-card__name">{pro.name}</span>
                        {pro.specialty && <span class="tw-prof-card__spec">{pro.specialty}</span>}
                    </button>
                ))}
            </div>
        </div>
    );
}
