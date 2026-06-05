'use client'
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu, LogOut, Plus, CalendarDays } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
    onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push('/auth/login');
    };

    if (!user) return null;

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => onMenuToggle?.()}
                    className="p-2 rounded-md hover:bg-gray-100 md:hidden"
                    type="button"
                >
                    <Menu className="h-6 w-6 text-gray-600" />
                </button>

                <div className="flex items-center gap-2">
                    <Link href="/dashboard/turnos">
                        <Button size="sm" className="gap-1">
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">Nuevo turno</span>
                        </Button>
                    </Link>
                    <Link href="/dashboard/agenda">
                        <Button size="sm" variant="outline" className="gap-1">
                            <CalendarDays className="h-4 w-4" />
                            <span className="hidden sm:inline">Ver agenda</span>
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 hidden sm:inline">{user.nombre || user.email}</span>
                <Button size="sm" variant="ghost" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                </Button>
            </div>
        </header>
    );
}
