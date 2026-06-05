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
                        ? `fixed left-0 top-0 z-[9999] flex h-full w-64 transform flex-col border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out ${
                              isOpen ? "translate-x-0" : "-translate-x-full"
                          }`
                        : "flex h-screen w-64 flex-col border-r border-gray-200 bg-white"
                }`}
            >
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                            <CalendarCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">Turnos IA</h1>
                            <p className="text-xs text-gray-500">Panel de administracion</p>
                        </div>
                    </div>
                    {isMobile && (
                        <button onClick={onClose} className="rounded-md p-2 hover:bg-gray-100">
                            <X className="h-6 w-6 text-gray-600" />
                        </button>
                    )}
                </div>

                <nav className="flex-1 overflow-y-auto px-4 py-6">
                    <ul className="space-y-1">
                        {navItems.map((item) => {
                            const active = isActive(item.href);
                            const Icon = item.icon;

                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={`flex items-center gap-3 rounded-lg px-4 py-3 text-base transition-colors ${
                                            active
                                                ? "bg-primary font-medium text-white"
                                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                        }`}
                                    >
                                        <Icon
                                            className={`h-5 w-5 shrink-0 ${active ? "text-white" : "text-gray-500"}`}
                                        />
                                        <span>{item.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="border-t border-gray-200 p-4">
                    <div className="text-center text-xs text-gray-500">Turnos IA v1.0.0</div>
                </div>
            </aside>
        </>
    );
}
