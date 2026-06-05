import { useState, useMemo } from 'preact/hooks';

interface DateSelectorProps {
    advanceDays: number;
    onSelect: (date: string) => void;
}

function pad(n: number) {
    return n.toString().padStart(2, '0');
}

function formatDate(d: Date) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function DateSelector({ advanceDays, onSelect }: DateSelectorProps) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());

    const maxDate = useMemo(() => {
        const d = new Date(today);
        d.setDate(d.getDate() + (advanceDays || 60));
        return d;
    }, [advanceDays]);

    const calendarDays = useMemo(() => {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const startOffset = firstDay.getDay();
        const days: (Date | null)[] = [];

        for (let i = 0; i < startOffset; i++) {
            days.push(null);
        }
        for (let d = 1; d <= lastDay.getDate(); d++) {
            days.push(new Date(currentYear, currentMonth, d));
        }
        return days;
    }, [currentMonth, currentYear]);

    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(y => y - 1);
        } else {
            setCurrentMonth(m => m - 1);
        }
    };

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(y => y + 1);
        } else {
            setCurrentMonth(m => m + 1);
        }
    };

    const canPrev = currentYear > today.getFullYear() || currentMonth > today.getMonth();
    const canNext = new Date(currentYear, currentMonth + 1, 1) <= maxDate;

    return (
        <div class="tw-step">
            <h3 class="tw-step__title">Selecciona una fecha</h3>
            <div class="tw-calendar">
                <div class="tw-calendar__nav">
                    <button
                        class="tw-calendar__nav-btn"
                        onClick={prevMonth}
                        disabled={!canPrev}
                    >
                        &lt;
                    </button>
                    <span class="tw-calendar__month">
                        {MONTH_NAMES[currentMonth]} {currentYear}
                    </span>
                    <button
                        class="tw-calendar__nav-btn"
                        onClick={nextMonth}
                        disabled={!canNext}
                    >
                        &gt;
                    </button>
                </div>
                <div class="tw-calendar__header">
                    {DAY_NAMES.map(d => (
                        <span key={d} class="tw-calendar__day-name">{d}</span>
                    ))}
                </div>
                <div class="tw-calendar__grid">
                    {calendarDays.map((day, idx) => {
                        if (!day) {
                            return <span key={`empty-${idx}`} class="tw-calendar__cell tw-calendar__cell--empty" />;
                        }
                        const isPast = day < today;
                        const isBeyond = day > maxDate;
                        const disabled = isPast || isBeyond;

                        return (
                            <button
                                key={formatDate(day)}
                                class={`tw-calendar__cell ${disabled ? 'tw-calendar__cell--disabled' : ''}`}
                                onClick={() => !disabled && onSelect(formatDate(day))}
                                disabled={disabled}
                            >
                                {day.getDate()}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
