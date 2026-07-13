'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Activity, LogOut, Calendar, Users, ClipboardList, Shield, RefreshCw, Building, DollarSign, FileText, UserCheck, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Client-side authentication check
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
    } else {
      setUser(JSON.parse(userData));
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
        <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
        <span className="mt-4 text-slate-400 text-sm">Carregando portal...</span>
      </div>
    );
  }

  const navItems = [
    { icon: Calendar, label: 'Agendamentos', href: '/dashboard' },
  ];

  if (user?.role?.level >= 5) {
    navItems.push({ icon: DollarSign, label: 'Caixa', href: '/dashboard/caixa' });
  }

  if (user?.role?.level >= 50) {
    navItems.push(
      { icon: BarChart3, label: 'Central BI', href: '/dashboard/central-bi' },
      { icon: Users, label: 'Pacientes', href: '/dashboard/pacientes' },
      { icon: Building, label: 'Parceiros', href: '/dashboard/parceiros' },
      { icon: Users, label: 'Financeiro', href: '/dashboard/financeiro' },
      { icon: Users, label: 'Funcionários', href: '/dashboard/funcionarios' },
      { icon: FileText, label: 'Relatórios', href: '/dashboard/relatorios' },
      { icon: UserCheck, label: 'Representantes', href: '/dashboard/representantes' },
      { icon: Users, label: 'Usuários', href: '/dashboard/usuarios' }
    );
  }

  navItems.push(
    { icon: ClipboardList, label: 'Procedimentos', href: '/dashboard/procedimentos' },
    { icon: Shield, label: 'Meus Dados', href: '/dashboard/meus-dados' }
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col lg:flex-row antialiased">
      
      {/* Sidebar navigation */}
      <aside className="w-full lg:w-64 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col justify-between p-6 flex-shrink-0">
        <div className="flex flex-col space-y-8">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center">
              <Activity className="w-4.5 h-4.5 text-slate-950 stroke-[2.5]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Otium</span>
          </div>

          {/* Nav Items */}
          <nav className="flex flex-col space-y-1">
            {navItems.map((item, idx) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={idx}
                  href={item.href}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <item.icon className="w-4.5 h-4.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="mt-8 lg:mt-0 flex items-center justify-between border-t border-slate-800/80 pt-6">
          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-sm font-bold text-white truncate">
              {user?.nome_usuario || 'Usuário'}
            </span>
            <span className="text-xs text-slate-500 truncate">
              {user?.role?.nome || 'Perfil'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            title="Sair do sistema"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-all border border-slate-800/50 hover:border-rose-500/10 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main dashboard content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

    </div>
  );
}
