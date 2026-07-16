'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, CreditCard, ClipboardList, ShieldCheck, ArrowRight, Clock, MapPin, User, FileText, Trash2, UserCog } from 'lucide-react';
import Link from 'next/link';

export default function ClienteDashboard() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Fetch dashboard statistics, profile, and recent bookings
    const fetchDashboardData = async () => {
      try {
        const [profileRes, appointmentsRes] = await Promise.all([
          fetch('http://localhost:3000/api/cliente/perfil', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:3000/api/cliente/agendamentos', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (profileRes.ok && appointmentsRes.ok) {
          const profileData = await profileRes.json();
          const appointmentsData = await appointmentsRes.json();
          setProfile(profileData);
          setAppointments(appointmentsData);
        }
      } catch (err) {
        console.error('Erro ao buscar dados do painel do cliente:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  const handleCancelAppointment = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3000/api/cliente/agendamentos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAppointments(prev => prev.map(a => a.id_agendamento === id ? { ...a, status: 'cancelado' } : a));
      } else {
        alert(data.error || 'Erro ao cancelar agendamento.');
      }
    } catch {
      alert('Erro de conexão.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span>Carregando resumo da conta...</span>
      </div>
    );
  }

  // Calculate indicator counts
  const totalAgendamentos = appointments.length;
  const pendentesPagamento = appointments.filter(a => a.status === 'aguardando_pagamento').length;
  const resultadosDisponiveis = appointments.filter(a => a.status === 'realizado' && a.laudo).length;

  // Next booking (soonest scheduled booking that is paid/pending)
  const nextAppointment = appointments
    .filter(a => a.status === 'pago' || a.status === 'pendente')
    .sort((a, b) => new Date(a.data_realizacao).getTime() - new Date(b.data_realizacao).getTime())[0];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pago':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'realizado':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'cancelado':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'aguardando_pagamento':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pago': return 'Confirmado / Pago';
      case 'realizado': return 'Realizado';
      case 'cancelado': return 'Cancelado';
      case 'aguardando_pagamento': return 'Aguardando Pagamento';
      case 'pendente': return 'Aguardando Confirmação';
      default: return status;
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative p-6 md:p-8 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg shadow-slate-950/20">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[80px]" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Olá, <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">{profile?.pf.nome}</span>!
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-xl">
              Bem-vindo ao seu portal de saúde Otium. Veja seus agendamentos, consulte laudos e acesse sua carteirinha com facilidade.
            </p>
          </div>

          {/* Member Card Box */}
          <Link
            href="/cliente/carteirinha"
            className="flex items-center space-x-4 p-4 bg-slate-950/60 border border-slate-800 hover:border-slate-700/60 hover:bg-slate-950/80 rounded-2xl transition-all group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-400/10 to-teal-500/10 flex items-center justify-center border border-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
              <CreditCard className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="block text-xs text-slate-500 font-semibold uppercase tracking-wider">Carteirinha Digital</span>
              <span className="block text-white text-sm font-bold mt-0.5">{profile?.matricula || '-'}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform ml-2" />
          </Link>
        </div>
      </div>

      {/* Stats Indicators Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          {
            title: "Total de Agendamentos",
            value: totalAgendamentos,
            desc: "Consultas e exames solicitados",
            color: "from-blue-500/10 to-cyan-500/5",
            textColor: "text-blue-400",
            icon: Calendar
          },
          {
            title: "Aguardando Pagamento",
            value: pendentesPagamento,
            desc: "Agendamentos pendentes de checkout",
            color: "from-amber-500/10 to-orange-500/5",
            textColor: "text-amber-400",
            icon: Clock
          },
          {
            title: "Resultados Disponíveis",
            value: resultadosDisponiveis,
            desc: "Laudos clínicos e exames prontos",
            color: "from-teal-500/10 to-emerald-500/5",
            textColor: "text-teal-400",
            icon: ClipboardList
          }
        ].map((stat, i) => (
          <div
            key={i}
            className={`p-6 bg-gradient-to-br ${stat.color} bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center justify-between shadow-sm`}
          >
            <div className="space-y-1">
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block">{stat.title}</span>
              <span className="text-3xl font-extrabold text-white block">{stat.value}</span>
              <span className="text-slate-400 text-xs block">{stat.desc}</span>
            </div>
            <div className={`p-3 rounded-xl bg-slate-950/60 border border-slate-800 ${stat.textColor}`}>
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Grid: Next Booking vs Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Next Appointment Card */}
        <div className="lg:col-span-8 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <span className="w-1.5 h-6 bg-emerald-500 rounded-full" />
            Próximo Agendamento
          </h2>

          {nextAppointment ? (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Procedimento</span>
                  <h3 className="text-xl font-bold text-white">
                    {nextAppointment.procedimentos[0]?.nome || 'Procedimento Médico'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-slate-400 text-sm mt-1.5">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>{nextAppointment.parceiro.nome}</span>
                  </div>
                </div>

                <span className={`px-3 py-1 text-xs font-bold rounded-lg border uppercase ${getStatusStyle(nextAppointment.status)}`}>
                  {getStatusLabel(nextAppointment.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950/50 rounded-xl border border-slate-800/40 text-sm">
                <div>
                  <span className="text-slate-500 block text-xs">Data e Horário</span>
                  <span className="text-white font-semibold mt-1 block">
                    {new Date(nextAppointment.data_realizacao).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(nextAppointment.data_realizacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Valor do Procedimento</span>
                  <span className="text-emerald-400 font-bold mt-1 block">
                    R$ {Number(nextAppointment.procedimentos[0]?.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {nextAppointment.status === 'aguardando_pagamento' && (
                <Link
                  href={`/cliente/pagamento/${nextAppointment.id_agendamento}`}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-center font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/10"
                >
                  <CreditCard className="w-4.5 h-4.5" />
                  <span>Realizar Pagamento do Agendamento</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="p-8 bg-slate-900/30 border border-slate-800/50 border-dashed rounded-2xl text-center space-y-4">
              <p className="text-slate-500 text-sm">Você não possui nenhuma consulta ou exame agendado no momento.</p>
              <Link
                href="/cliente/agendar"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-emerald-400 font-semibold rounded-xl text-xs transition-all border border-slate-700/50 cursor-pointer"
              >
                <span>Agendar Agora</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Recent Appointments List */}
          <div className="space-y-4 pt-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-1.5 h-6 bg-slate-700 rounded-full" />
              Histórico de Agendamentos Recentes
            </h2>

            {appointments.length > 0 ? (
              <div className="space-y-3.5">
                {appointments.slice(0, 3).map((ag) => (
                  <div
                    key={ag.id_agendamento}
                    className="p-4 bg-slate-900 border border-slate-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-base">
                        {ag.procedimentos[0]?.nome || 'Procedimento'}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 text-xs">
                        <span>🏬 {ag.parceiro.nome}</span>
                        <span>
                          📅 {new Date(ag.data_realizacao).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(ag.data_realizacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg border uppercase tracking-wider ${getStatusStyle(ag.status)}`}>
                        {getStatusLabel(ag.status)}
                      </span>

                      {ag.status === 'aguardando_pagamento' && (
                        <>
                          <Link
                            href={`/cliente/pagamento/${ag.id_agendamento}`}
                            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-all cursor-pointer"
                          >
                            Pagar
                          </Link>
                          <button
                            onClick={() => handleCancelAppointment(ag.id_agendamento)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                            title="Cancelar agendamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {ag.status === 'realizado' && ag.laudo && (
                        <Link
                          href="/cliente/resultados"
                          className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-teal-400 text-xs font-bold rounded-lg border border-slate-750 transition-all cursor-pointer"
                        >
                          Ver Laudo
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-600 text-xs">Nenhum agendamento recente registrado.</p>
            )}
          </div>
        </div>

        {/* Quick Actions & Info Panel */}
        <div className="lg:col-span-4 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <span className="w-1.5 h-6 bg-emerald-500 rounded-full" />
            Ações Rápidas
          </h2>

          <div className="grid grid-cols-1 gap-4">
            <Link
              href="/cliente/agendar"
              className="p-5 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-900 border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl transition-all group flex flex-col space-y-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Calendar className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-1.5">
                  Marcar Consulta
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-slate-400 text-xs mt-1">Selecione exames ou consultas clínicas com médicos credenciados.</p>
              </div>
            </Link>

            <Link
              href="/cliente/carteirinha"
              className="p-5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl transition-all group flex flex-col space-y-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
                <CreditCard className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-1.5">
                  Ver Carteirinha
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-slate-400 text-xs mt-1">Acesse sua credencial digital do plano Otium para atendimento rápido.</p>
              </div>
            </Link>

            <Link
              href="/cliente/resultados"
              className="p-5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl transition-all group flex flex-col space-y-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <ClipboardList className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-1.5">
                  Resultados e Laudos
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-slate-400 text-xs mt-1">Consulte diagnósticos e laudos de exames realizados.</p>
              </div>
            </Link>

            <Link
              href="/cliente/perfil"
              className="p-5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl transition-all group flex flex-col space-y-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                <UserCog className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-1.5">
                  Meu Perfil
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-slate-400 text-xs mt-1">Edite seus dados, endereço e altere sua senha.</p>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
