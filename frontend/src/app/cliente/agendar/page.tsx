'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Stethoscope, Clock, ShieldCheck, MapPin, ArrowRight, ArrowLeft, Search, CheckCircle2, ChevronRight } from 'lucide-react';

export default function AgendarPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Data states
  const [procedures, setProcedures] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection states
  const [selectedProc, setSelectedProc] = useState<any>(null);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  
  // States
  const [isLoading, setIsLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch procedures on load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch('http://localhost:3000/api/cliente/procedimentos', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProcedures(data);
        }
      })
      .catch(err => console.error('Erro ao buscar procedimentos:', err));
  }, [router]);

  // Fetch partners when a procedure is selected
  useEffect(() => {
    if (!selectedProc) return;

    const token = localStorage.getItem('token');
    setIsLoading(true);

    fetch(`http://localhost:3000/api/cliente/parceiros-por-procedimento/${selectedProc.id_procedimento}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPartners(data);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar parceiros:', err);
        setIsLoading(false);
      });
  }, [selectedProc]);

  const filteredProcs = procedures.filter(p =>
    p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.especialidade.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectProc = (proc: any) => {
    setSelectedProc(proc);
    setSelectedPartner(null);
    setSelectedDate('');
    setSelectedTime('');
    setStep(2);
  };

  const handleSelectPartner = (partner: any) => {
    setSelectedPartner(partner);
    setSelectedDate('');
    setSelectedTime('');
    setStep(3);
  };

  const handleConfirmDateTime = () => {
    setErrorMsg('');
    if (!selectedDate || !selectedTime) {
      setErrorMsg('Por favor, escolha uma data e horário válidos.');
      return;
    }
    setStep(4);
  };

  const handleBook = async () => {
    const token = localStorage.getItem('token');
    setBookingLoading(true);
    setErrorMsg('');

    try {
      const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}:00`);

      const res = await fetch('http://localhost:3000/api/cliente/agendamentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_parceiro: selectedPartner.id_parceiro,
          id_parceiro_procedimento: selectedPartner.id_parceiro_procedimento,
          data_agendamento: scheduledDateTime.toISOString()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao realizar pré-agendamento.');
      }

      // Successful pre-booking: redirect to checkout page
      router.push(`/cliente/pagamento/${data.id_agendamento}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de rede ao salvar agendamento.');
      setBookingLoading(false);
    }
  };

  // Mock hour slots
  const timeSlots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];

  return (
    <div className="space-y-8">
      
      {/* Header with Step Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-450">Agendamento de Consultas</span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Marcar Consulta/Exame</h1>
        </div>

        {/* Horizontal steps flow */}
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
          {[
            { nr: 1, label: "Procedimento" },
            { nr: 2, label: "Profissional" },
            { nr: 3, label: "Horário" },
            { nr: 4, label: "Resumo" }
          ].map((s) => (
            <React.Fragment key={s.nr}>
              {s.nr > 1 && <ChevronRight className="w-3.5 h-3.5" />}
              <span className={step === s.nr ? "text-emerald-400 font-bold" : step > s.nr ? "text-slate-350" : ""}>
                {s.label}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Select Procedure */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar consulta, exame ou especialidade médica..."
              className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProcs.map((p) => (
              <div
                key={p.id_procedimento}
                onClick={() => handleSelectProc(p)}
                className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700/60 hover:bg-slate-850 rounded-2xl transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block font-bold text-white text-base">{p.nome}</span>
                    <span className="block text-xs text-slate-400 mt-0.5">{p.especialidade} • {p.tipo === 'exame' ? 'Exame' : 'Consulta'}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-650 group-hover:translate-x-1 group-hover:text-emerald-400 transition-all" />
              </div>
            ))}

            {filteredProcs.length === 0 && (
              <p className="text-slate-500 text-sm py-10 md:col-span-2 text-center">Nenhum procedimento encontrado.</p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Select Partner */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-all font-semibold"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar aos procedimentos
            </button>
            <span className="text-xs text-slate-400">
              Procedimento: <strong className="text-white">{selectedProc?.nome}</strong>
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-550">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
              <span>Buscando parceiros e locais disponíveis...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {partners.map((partner) => (
                <div
                  key={partner.id_parceiro_procedimento}
                  onClick={() => handleSelectPartner(partner)}
                  className="p-6 bg-slate-900 border border-slate-800 hover:border-slate-700/60 rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-6 group"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-white text-lg group-hover:text-emerald-400 transition-colors">
                        {partner.nome_parceiro}
                      </h3>
                      <span className="text-emerald-400 font-extrabold text-base">
                        R$ {Number(partner.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-slate-400 text-xs">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-slate-550" />
                        <span>
                          {partner.endereco.logradouro}, {partner.endereco.numero} - {partner.endereco.bairro}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="opacity-0 w-4 block" />
                        <span>{partner.endereco.cidade} ({partner.endereco.uf})</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-800/60 text-xs">
                    <span className="text-slate-500 font-semibold">🕒 {partner.horario_atendimento || 'Horários sob consulta'}</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      Escolher Local <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}

              {partners.length === 0 && (
                <p className="text-slate-550 text-sm py-10 md:col-span-2 text-center">Nenhum profissional disponível para este procedimento no momento.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Date & Time Picker */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-all font-semibold"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar para locais
            </button>
            <div className="text-xs text-slate-400 space-y-0.5 text-right">
              <div>Procedimento: <strong className="text-white">{selectedProc?.nome}</strong></div>
              <div>Profissional/Clínica: <strong className="text-white">{selectedPartner?.nome_parceiro}</strong></div>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Date Pick */}
            <div className="space-y-2">
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">1. Escolha a Data da Consulta</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-emerald-500 text-sm font-semibold"
              />
            </div>

            {/* Time Pick */}
            <div className="space-y-2">
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">2. Escolha o Horário</label>
              {selectedDate ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {timeSlots.map((time) => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700/60'
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 bg-slate-900/30 border border-slate-800/40 border-dashed rounded-2xl text-center text-slate-500 text-xs">
                  Selecione uma data à esquerda para liberar os horários de consulta.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800/60">
            <button
              onClick={handleConfirmDateTime}
              disabled={!selectedDate || !selectedTime}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-2xl text-sm transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer disabled:opacity-55 disabled:pointer-events-none"
            >
              <span>Continuar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Summary & Confirm */}
      {step === 4 && (
        <div className="space-y-6 max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
          <h2 className="text-xl font-bold text-white tracking-tight border-b border-slate-850 pb-4">
            Resumo do Agendamento
          </h2>

          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs">
              {errorMsg}
            </div>
          )}

          <div className="space-y-5 py-2">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Procedimento</span>
              <span className="block text-white text-base font-bold mt-0.5">{selectedProc?.nome}</span>
              <span className="block text-slate-450 text-xs mt-0.5">{selectedProc?.especialidade}</span>
            </div>

            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Profissional / Clínica</span>
              <span className="block text-white text-base font-bold mt-0.5">{selectedPartner?.nome_parceiro}</span>
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {selectedPartner?.endereco.logradouro}, {selectedPartner?.endereco.numero} - {selectedPartner?.endereco.bairro},{' '}
                  {selectedPartner?.endereco.cidade} ({selectedPartner?.endereco.uf})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl">
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-500">Data e Horário</span>
                <span className="block text-sm font-bold text-white mt-1">
                  {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR')} às {selectedTime}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-500">Valor Total</span>
                <span className="block text-sm font-extrabold text-emerald-450 mt-1">
                  R$ {Number(selectedPartner?.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-6 border-t border-slate-800/60">
            <button
              onClick={() => setStep(3)}
              className="px-5 py-3 bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold rounded-2xl text-sm transition-all flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            <button
              onClick={handleBook}
              disabled={bookingLoading}
              className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-center font-extrabold rounded-2xl text-sm transition-all shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:pointer-events-none"
            >
              {bookingLoading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Confirmar & Ir para Pagamento</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
