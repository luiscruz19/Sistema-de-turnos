'use client'

import { useState } from 'react';
import ProtectedRoute from '@/components/protected';
import Sidebar from '@/components/sidebar';
import Header from '@/components/Header';
import { ShortcutsProvider } from '@/components/command/shortcuts-provider';
import { Toaster } from '@/components/ui/toaster';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <ProtectedRoute>
            <ShortcutsProvider>
                <div className="flex h-screen bg-background">
                    <div className="hidden md:block">
                        <Sidebar />
                    </div>

                    <div className="md:hidden">
                        <Sidebar
                            isOpen={sidebarOpen}
                            onClose={() => setSidebarOpen(false)}
                        />
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden">
                        <Header onMenuToggle={() => setSidebarOpen(true)} />
                        <main className="flex-1 overflow-y-auto">
                            {children}
                        </main>
                        <Toaster />
                    </div>
                </div>
            </ShortcutsProvider>
        </ProtectedRoute>
    );
}
