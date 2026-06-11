import type { LucideIcon } from 'lucide-react'
import { navItems } from '@/const/menu'

export interface NavItem {
    href: string
    label: string
    icon: LucideIcon
}

// Los 8 principales (calca la guía de pantallas); definen los atajos 1–8.
const PRIMARY_HREFS = [
    '/dashboard',
    '/dashboard/agenda',
    '/dashboard/turnos',
    '/dashboard/profesionales',
    '/dashboard/servicios',
    '/dashboard/clientes',
    '/dashboard/cobros',
    '/dashboard/reportes',
]

export const primaryNav: NavItem[] = PRIMARY_HREFS
    .map(h => navItems.find(i => i.href === h))
    .filter(Boolean) as NavItem[]

export const secondaryNav: NavItem[] = navItems.filter(i => !PRIMARY_HREFS.includes(i.href))
