import { extendTailwindMerge } from 'tailwind-merge';

const customColorValues = [
    'primary', 'secondary', 'destructive', 'error', 'success', 'warning', 'info',
    'muted', 'accent', 'popover', 'card', 'background', 'foreground',
    'border', 'input', 'ring',
    'text-primary', 'text-secondary',
];

const twMerge = extendTailwindMerge({
    extend: {
        classGroups: {
            'bg-color': [{ bg: customColorValues }],
            'text-color': [{ text: customColorValues }],
            'border-color': [{ border: customColorValues }],
        },
    },
});

export function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(inputs.filter(Boolean).join(' '));
}
