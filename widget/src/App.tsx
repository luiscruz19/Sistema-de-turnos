import { useState } from 'preact/hooks';
import { useBooking } from './hooks/useBooking';
import { BookingBubble } from './components/BookingBubble';
import { BookingPanel } from './components/BookingPanel';

interface AppProps {
    apiKey: string;
    apiBaseUrl: string;
}

const DEFAULT_COLOR = '#6366f1';

export function App({ apiKey, apiBaseUrl }: AppProps) {
    const [isOpen, setIsOpen] = useState(false);
    const hook = useBooking({ apiKey, apiBaseUrl });

    if (hook.loading && !hook.config) return null;
    if (!hook.config) return null;

    // The widget does not auto-open -- user clicks the bubble
    const primaryColor = DEFAULT_COLOR;

    return (
        <div class="tw-root">
            {isOpen ? (
                <BookingPanel
                    config={hook.config}
                    step={hook.step}
                    booking={hook.booking}
                    availability={hook.availability}
                    confirmationData={hook.confirmationData}
                    loading={hook.loading}
                    submitting={hook.submitting}
                    error={hook.error}
                    onSelectService={hook.selectService}
                    onSelectProfessional={hook.selectProfessional}
                    onSelectDate={hook.selectDate}
                    onSelectSlot={hook.selectSlot}
                    onUpdateForm={hook.updateForm}
                    onSubmit={hook.createBooking}
                    onBack={hook.goBack}
                    onReset={hook.reset}
                    onClose={() => setIsOpen(false)}
                    primaryColor={primaryColor}
                />
            ) : (
                <BookingBubble
                    onClick={() => setIsOpen(true)}
                    primaryColor={primaryColor}
                />
            )}
        </div>
    );
}
