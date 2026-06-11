'use client'
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/command/kbd';
import { useCommandUI } from '@/components/command/shortcuts-provider';
import { Menu, LogOut, Plus, CalendarDays, Search, Moon, Sun, Keyboard } from 'lucide-react';
import Link from 'next/link';

const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘' : 'Ctrl';

interface HeaderProps {
    onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
    const { user, logout } = useAuth();
    const { openPalette, openHelp, toggleTheme, dark } = useCommandUI();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push('/auth/login');
    };

    if (!user) return null;

    return (
        <header className="flex h-[58px] items-center justify-between border-b border-border bg-card px-4 md:px-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => onMenuToggle?.()}
                    className="p-2 rounded-lg text-muted-foreground hover:bg-muted md:hidden"
                    type="button"
                >
                    <Menu className="h-5 w-5" />
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

            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={openPalette} title="Buscar comandos">
                    <Search className="h-[15px] w-[15px]" />
                    <span className="hidden text-muted-foreground md:inline">Buscar</span>
                    <span className="hidden gap-1 md:inline-flex"><Kbd>{MOD}</Kbd><Kbd>K</Kbd></span>
                </Button>
                <Button size="icon" variant="ghost" title="Atajos de teclado (?)" onClick={openHelp}>
                    <Keyboard className="h-[17px] w-[17px]" />
                </Button>
                <Button size="icon" variant="ghost" title="Cambiar tema (T)" onClick={toggleTheme}>
                    {dark ? <Sun className="h-[17px] w-[17px]" /> : <Moon className="h-[17px] w-[17px]" />}
                </Button>
                <span className="hidden text-sm text-muted-foreground md:inline">{user.nombre || user.email}</span>
                <Button size="sm" variant="ghost" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                </Button>
            </div>
        </header>
    );
}
