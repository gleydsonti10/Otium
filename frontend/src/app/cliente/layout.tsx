'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Activity, LogOut, Calendar, CreditCard, ClipboardList, RefreshCw, User, UserCog, Menu, X } from 'lucide-react';
import Link from 'next/link';

export default function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isPublicRoute = pathname === '/cliente/cadastro';

  useEffect(() => {
    if (isPublicRoute) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
    } else {
      const parsed = JSON.parse(userData);
      // Ensure they have level 1 (Cliente)
      if (parsed.role.level !== 1) {
        router.push('/login');
      } else {
        setUser(parsed);
        setLoading(false);
      }
    }
  }, [router, pathname, isPublicRoute]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeUnitId');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
        <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
        <span className="mt-4 text-slate-400 text-sm">Carregando portal do cliente...</span>
      </div>
    );
  }

  if (isPublicRoute) {
    return <>{children}</>;
  }

  const navItems = [
    { href: '/cliente', label: 'Painel Geral', icon: Activity },
    { href: '/cliente/carteirinha', label: 'Minha Carteirinha', icon: CreditCard },
    { href: '/cliente/agendar', label: 'Agendar Consulta/Exame', icon: Calendar },
    { href: '/cliente/resultados', label: 'Meus Resultados', icon: ClipboardList },
    { href: '/cliente/perfil', label: 'Meu Perfil', icon: UserCog }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row antialiased">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 flex-col bg-slate-900 border-r border-slate-800/80 z-20 flex-shrink-0">
        <div className="p-6 border-b border-slate-800/50 flex items-center space-x-3 bg-slate-950/20">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Activity className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Otium</span>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-slate-800/50">
          <div className="flex items-center space-x-3 p-2 bg-slate-950/40 rounded-xl border border-slate-800/40">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/10">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-white truncate">{user.nome_usuario}</span>
              <span className="block text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Paciente</span>
            </div>
          </div>
        </div>

        {/* Nav list */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/5 border-l-4 border-emerald-400 text-emerald-400 font-bold'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-800/50 bg-slate-950/20">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/5 transition-all cursor-pointer"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Sair do Portal</span>
          </button>
        </div>
      </aside>

      {/* Header - Mobile */}
      <header className="flex md:hidden items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800/80 z-20">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center">
            <Activity className="w-4.5 h-4.5 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">Otium</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
        >
          {isMobileMenuOpen ? <X className="w-5.5 h-5.5" /> : <Menu className="w-5.5 h-5.5" />}
        </button>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[69px] bg-slate-950/95 z-30 flex flex-col justify-between border-t border-slate-900">
          <div className="p-6 space-y-4">
            <div className="flex items-center space-x-3 p-3.5 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-white">{user.nome_usuario}</span>
                <span className="block text-[10px] text-slate-500 font-semibold uppercase mt-0.5">Paciente</span>
              </div>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-500/10 border-l-4 border-emerald-400 text-emerald-400'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="p-6 border-t border-slate-900/50 bg-slate-900/20">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2.5 py-3 rounded-xl text-sm font-semibold text-rose-400 bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 transition-all cursor-pointer"
            >
              <LogOut className="w-4.5 h-4.5" />
              <span>Sair do Portal</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-6 md:p-10 max-w-7xl w-full mx-auto space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}
