'use client'
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';
import loginService from '@/services/auth/login';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login, is_auth } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (is_auth) router.push('/dashboard');
    }, [is_auth, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const response = await loginService({ email, password });
            if (response.status > 0) {
                const { token } = response.user;
                login({ token });
                router.push('/dashboard');
            } else {
                setError(response.message);
            }
        } catch {
            setError('Ocurrió un error inesperado');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (is_auth) return null;

    return (
        <div className="min-h-screen flex">
            {/* Panel izquierdo oscuro (desktop) */}
            <div className="hidden lg:flex lg:w-5/12 xl:w-2/5 bg-slate-900 flex-col items-center justify-center p-12">
                <img
                    src="/images/logo-light-removebg-preview.png"
                    alt="SDA.dev"
                    className="h-14 mb-10 object-contain"
                />
                <div className="text-center">
                    <h1 className="mb-3 text-2xl font-semibold tracking-tight text-white">Gestión de Turnos</h1>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Agendás, recordatorios y pagos<br />con inteligencia artificial integrada.
                    </p>
                </div>
                <div className="mt-auto pt-16 text-center">
                    <p className="text-xs text-slate-500">© SDA.dev · Todos los derechos reservados</p>
                </div>
            </div>

            {/* Panel derecho (formulario) */}
            <div className="flex-1 flex flex-col bg-background">
                <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
                    {/* Logo mobile */}
                    <div className="lg:hidden mb-8 text-center">
                        <img
                            src="/images/logo.png"
                            alt="SDA.dev"
                            className="h-10 mx-auto object-contain mb-3"
                        />
                        <p className="text-sm font-medium text-muted-foreground">Gestión de Turnos</p>
                    </div>

                    <div className="w-full max-w-sm">
                        <div className="mb-8">
                            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Iniciar sesión</h2>
                            <p className="mt-1 text-sm text-muted-foreground">Accedé a tu panel de gestión</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-input rounded-lg focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 text-sm bg-background transition-all"
                                        placeholder="tu@email.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-foreground">Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-12 py-2.5 border border-input rounded-lg focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 text-sm bg-background transition-all"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg shadow-sm hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        Iniciando sesión...
                                    </span>
                                ) : 'Iniciar sesión'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="px-8 pb-6 text-center lg:hidden">
                    <p className="text-xs text-muted-foreground">
                        Desarrollado por <span className="font-medium text-foreground">SDA.dev</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
