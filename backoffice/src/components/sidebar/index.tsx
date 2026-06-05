'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { X, CalendarCheck } from "lucide-react";
import { navItems } from "@/const/menu";

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
        if (isMobile && isOpen && onClose) {
            onClose();
        }
    }, [pathname, isMobile, isOpen, onClose]);

    const isActive = (href: string) => {
        if (href === "/dashboard") return pathname === "/dashboard";
        return pathname === href || pathname.startsWith(`${href}/`);
    };

    return (
        <>
            {isMobile && isOpen && (
                <div
                    className="fixed inset-0 z-[9998] bg-black bg-opacity-50 md:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={`${
                    isMobile
                        ? `fixed left-0 top-0 z-[9999] flex h-full w-64 transform flex-col border-r border-border bg-card transition-transform duration-300 ease-in-out ${
                              isOpen ? "translate-x-0" : "-translate-x-full"
                          }`
                        : "flex h-screen w-64 flex-col border-r border-border bg-card"
                }`}
            >
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <CalendarCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold tracking-tight text-foreground">Turnos IA</h1>
                            <p className="text-xs text-muted-foreground">Panel de administracion</p>
                        </div>
                    </div>
                    {isMobile && (
                        <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4">
                    <ul className="space-y-0.5">
                        {navItems.map((item) => {
                            const active = isActive(item.href);
                            const Icon = item.icon;

                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                                            active
                                                ? "bg-primary/10 font-medium text-primary"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                    >
                                        <Icon
                                            className={`h-[18px] w-[18px] shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`}
                                        />
                                        <span>{item.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="border-t border-border p-4">
                    <div className="text-center text-xs text-muted-foreground">Turnos IA v1.0.0</div>
                </div>
            </aside>
        </>
    );
}
