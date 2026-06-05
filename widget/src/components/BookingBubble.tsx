interface BookingBubbleProps {
    onClick: () => void;
    primaryColor: string;
}

export function BookingBubble({ onClick, primaryColor }: BookingBubbleProps) {
    return (
        <button
            class="tw-bubble"
            onClick={onClick}
            style={{ backgroundColor: primaryColor }}
            aria-label="Reservar turno"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
        </button>
    );
}
