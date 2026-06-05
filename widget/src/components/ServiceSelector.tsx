import type { ServiceItem } from '../types';

interface ServiceSelectorProps {
    services: ServiceItem[];
    onSelect: (serviceId: number) => void;
    currency: string;
}

export function ServiceSelector({ services, onSelect, currency }: ServiceSelectorProps) {
    return (
        <div class="tw-step">
            <h3 class="tw-step__title">Selecciona un servicio</h3>
            <div class="tw-services">
                {services.map(service => (
                    <button
                        key={service.id}
                        class="tw-service-card"
                        onClick={() => onSelect(service.id)}
                    >
                        <div class="tw-service-card__info">
                            <span class="tw-service-card__name">{service.name}</span>
                            {service.description && (
                                <span class="tw-service-card__desc">{service.description}</span>
                            )}
                        </div>
                        <div class="tw-service-card__meta">
                            <span class="tw-service-card__duration">{service.duration_minutes} min</span>
                            {service.price > 0 && (
                                <span class="tw-service-card__price">{currency} {service.price.toLocaleString()}</span>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
