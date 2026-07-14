'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Activity, LogOut, Calendar, Users, ClipboardList, Shield, RefreshCw, Building, DollarSign, FileText, UserCheck, BarChart3, Plus, MapPin } from 'lucide-react';
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

  // System Units state
  const [unidades, setUnidades] = useState<any[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUnitLabel, setNewUnitLabel] = useState('');
  const [newUnitError, setNewUnitError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    // Client-side authentication check
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
    } else {
      setUser(JSON.parse(userData));
      setLoading(false);

      // Fetch units once authenticated
      fetch('http://localhost:3000/api/unidades', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUnidades(data);
          
          // Load active unit from localStorage
          const stored = localStorage.getItem('activeUnitId');
          if (stored && data.some(u => u.id_unidade === stored)) {
            setSelectedUnitId(stored);
          } else if (data.length > 0) {
            const defaultId = data[0].id_unidade;
            setSelectedUnitId(defaultId);
            localStorage.setItem('activeUnitId', defaultId);
          }
        }
      })
      .catch(err => console.error('Erro ao buscar unidades:', err));
    }
  }, [router]);

  const handleUnitChange = (id: string) => {
    setSelectedUnitId(id);
    localStorage.setItem('activeUnitId', id);
    window.location.reload();
  };

  const handleCreateUnit = async () => {
    if (!newUnitLabel.trim()) {
      setNewUnitError('O nome da unidade é obrigatório.');
      return;
    }

    setCreateLoading(true);
    setNewUnitError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/unidades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ label: newUnitLabel })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar unidade');
      }

      // Store new unit as active and reload
      localStorage.setItem('activeUnitId', data.id_unidade);
      window.location.reload();
    } catch (err: any) {
      setNewUnitError(err.message || 'Ocorreu um erro ao criar unidade.');
    } finally {
      setCreateLoading(false);
    }
  };

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
      { icon: Building, label: 'Unidades', href: '/dashboard/unidades' },
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
      <main className="flex-1 overflow-y-auto flex flex-col min-h-screen">
        {/* Top Header Bar with Unit Selector */}
        <header className="bg-slate-900 border-b border-slate-800/80 px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Unidade:</span>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <select
                  value={selectedUnitId}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className="bg-slate-800 text-slate-100 border border-slate-700/80 rounded-xl px-4 py-2 pr-8 text-sm font-semibold focus:outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                >
                  {unidades.map((u) => (
                    <option key={u.id_unidade} value={u.id_unidade}>
                      🏬 {u.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>

              {/* Admin only: Add Unit Button */}
              {user?.role?.level >= 50 && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  title="Cadastrar Nova Filial"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 transition-all border border-slate-700/80 hover:border-emerald-500/10 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400 font-semibold bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800/80">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {unidades.find(u => u.id_unidade === selectedUnitId)?.endereco?.cidade || 'Piauí'} - {unidades.find(u => u.id_unidade === selectedUnitId)?.endereco?.uf || 'BR'}
            </span>
          </div>
        </header>

        <div className="flex-1 p-6">
          {children}
        </div>

        {/* Create Branch Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-bold text-white mb-2">Cadastrar Nova Filial</h3>
              <p className="text-sm text-slate-400 mb-4">Insira o nome da nova unidade operacional para a rede Otium.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nome da Unidade / Filial</label>
                  <input
                    type="text"
                    value={newUnitLabel}
                    onChange={(e) => setNewUnitLabel(e.target.value)}
                    placeholder="Ex: Filial Parnaíba"
                    className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                {newUnitError && <p className="text-xs text-rose-400 font-medium">{newUnitError}</p>}
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewUnitLabel('');
                    setNewUnitError('');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateUnit}
                  disabled={createLoading}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {createLoading ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

    </div>
  );
}
