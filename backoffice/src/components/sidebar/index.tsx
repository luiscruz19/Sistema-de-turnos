'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { X, CalendarCheck } from "lucide-react";
import { primaryNav, secondaryNav, type NavItem } from "@/lib/nav";

type SidebarProps = {
    isOpen?: boolean;
    onClose?: () => void;
};

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
    const pathname = usePathname();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
        checkIsMobile();
        window.addEventListener("resize", checkIsMobile);
        return () => window.removeEventListener("resize", checkIsMobile);
    }, []);

    useEffect(() => {
        if (isMobile && isOpen && onClose) onClose();
    }, [pathname, isMobile, isOpen, onClose]);

    // Activo = el ítem con match más específico (gana el href más largo).
    const activeHref = useMemo(() => {
        const matches = [...primaryNav, ...secondaryNav]
            .map((i) => i.href)
            .filter((h) => pathname === h || pathname.startsWith(`${h}/`));
        return matches.sort((a, b) => b.length - a.length)[0] ?? null;
    }, [pathname]);

    const renderItem = (item: NavItem, shortcut?: number) => {
        const active = item.href === activeHref;
        const Icon = item.icon;
        return (
            <li key={item.href}>
                <Link
                    href={item.href}
                    className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors ${
                        active
                            ? "bg-accent font-medium text-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                >
                    {active && (
                        <span className="absolute -left-2.5 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-sm bg-primary" />
                    )}
                    <Icon className={`h-[17px] w-[17px] shrink-0 ${active ? "opacity-100" : "opacity-85"}`} />
                    <span className="flex-1">{item.label}</span>
                    {shortcut && (
                        <kbd className={`rounded border border-border bg-muted px-1.5 py-px font-mono text-[10.5px] font-medium text-muted-foreground transition-opacity ${active ? "opacity-100" : "opacity-0 group-hover/sb:opacity-100"}`}>{shortcut}</kbd>
                    )}
                </Link>
            </li>
        );
    };

    return (
        <>
            {isMobile && isOpen && (
                <div className="fixed inset-0 z-[9998] bg-foreground/30 md:hidden" onClick={onClose} />
            )}

            <aside
                className={`${
                    isMobile
                        ? `fixed left-0 top-0 z-[9999] flex h-full w-[248px] transform flex-col bg-card transition-transform duration-300 ease-in-out ${
                              isOpen ? "translate-x-0" : "-translate-x-full"
                          }`
                        : "flex h-screen w-[248px] flex-col bg-card"
                } group/sb border-r border-border`}
            >
                {/* Marca */}
                <div className="flex items-center justify-between border-b border-border px-[18px] py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-md bg-foreground text-background">
                            <CalendarCheck className="h-[17px] w-[17px]" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold leading-tight tracking-[-0.01em] text-foreground">Turnos IA</p>
                            <p className="text-[11px] leading-snug text-muted-foreground">Panel de administración</p>
                        </div>
                    </div>
                    {isMobile && (
                        <button onClick={onClose} className="rounded-md p-1 hover:bg-muted" aria-label="Cerrar menú">
                            <X className="h-5 w-5 text-muted-foreground" />
                        </button>
                    )}
                </div>

                {/* Navegación */}
                <nav className="flex-1 overflow-y-auto px-2.5 py-3">
                    <ul className="flex flex-col gap-px">{primaryNav.map((item, i) => renderItem(item, i + 1))}</ul>
                    {secondaryNav.length > 0 && (
                        <>
                            <p className="px-2.5 pb-1.5 pt-5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                                Operaciones
                            </p>
                            <ul className="flex flex-col gap-px">{secondaryNav.map((item) => renderItem(item))}</ul>
                        </>
                    )}
                </nav>

                {/* Pie */}
                <div className="border-t border-border px-3.5 py-3 text-[11px] text-muted-foreground">Turnos IA · v1.0.0</div>
            </aside>
        </>
    );
}
