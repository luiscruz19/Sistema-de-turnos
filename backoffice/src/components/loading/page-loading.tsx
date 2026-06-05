export function FullScreenLoader() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Turnos IA</h2>
                <p className="text-slate-600">Cargando...</p>
            </div>
        </div>
    );
}

export function PageLoader() {
    return (
        <div className="flex items-center justify-center p-12">
            <div className="text-center">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm text-gray-500">Cargando...</p>
            </div>
        </div>
    );
}
