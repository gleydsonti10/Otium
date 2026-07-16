'use client';

import React, { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, QrCode, ClipboardCheck, CheckCircle2, ArrowLeft, ShieldCheck, Landmark, DollarSign, Calendar, Activity } from 'lucide-react';

interface PagamentoPageProps {
  params: Promise<{ id: string }>;
}

export default function PagamentoPage({ params }: PagamentoPageProps) {
  const router = useRouter();
  const { id: idAgendamento } = use(params);

  // States
  const [appointment, setAppointment] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'pix' | 'cartao'>('pix');
  const [copiedPix, setCopiedPix] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Credit Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardFocused, setCardFocused] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Fetch this specific appointment
    fetch('http://localhost:3000/api/cliente/agendamentos', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then((data: any[]) => {
        const found = data.find(a => a.id_agendamento === idAgendamento);
        if (found) {
          setAppointment(found);
        } else {
          setErrorMsg('Agendamento não encontrado.');
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar agendamento:', err);
        setIsLoading(false);
      });
  }, [idAgendamento, router]);

  const handleCopyPix = () => {
    const pixKey = "00020126580014br.gov.bcb.pix0136otium-pay-pix-key-random-hash5204000053039865405150.005802BR5910OtiumSaude6009Teresina62070503***6304D1B2";
    navigator.clipboard.writeText(pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsPaying(true);

    const token = localStorage.getItem('token');
    const valorTotal = appointment?.procedimentos[0]?.valor_total || 0;

    try {
      const response = await fetch(`http://localhost:3000/api/cliente/agendamentos/${idAgendamento}/pagar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          metodo_pagamento: activeTab === 'pix' ? 'PIX' : 'CARTAO',
          valor: Number(valorTotal)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar pagamento.');
      }

      setShowSuccess(true);
      setTimeout(() => {
        router.push('/cliente');
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de conexão ao processar pagamento.');
    } finally {
      setIsPaying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span>Carregando dados de pagamento...</span>
      </div>
    );
  }

  if (errorMsg && !appointment) {
    return (
      <div className="text-center py-10 space-y-4">
        <p className="text-rose-400 font-semibold">{errorMsg}</p>
        <button
          onClick={() => router.push('/cliente')}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-sm"
        >
          Voltar ao Painel
        </button>
      </div>
    );
  }

  const procedure = appointment?.procedimentos[0];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Back button */}
      <button
        onClick={() => router.push('/cliente')}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-all font-semibold"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
      </button>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Payment Form Column */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Method tabs */}
          <div className="bg-slate-900 p-1.5 border border-slate-800 rounded-2xl flex">
            <button
              onClick={() => setActiveTab('pix')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'pix'
                  ? 'bg-slate-950 text-emerald-400 border border-slate-800/80 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <QrCode className="w-4.5 h-4.5" />
              <span>Pagar com PIX</span>
            </button>
            <button
              onClick={() => setActiveTab('cartao')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'cartao'
                  ? 'bg-slate-950 text-emerald-400 border border-slate-800/80 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-4.5 h-4.5" />
              <span>Cartão de Crédito</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 relative overflow-hidden">
            
            {/* PIX tab content */}
            {activeTab === 'pix' && (
              <div className="space-y-6 flex flex-col items-center">
                <div className="space-y-1 text-center">
                  <h3 className="font-bold text-white text-lg">Pagamento via PIX instantâneo</h3>
                  <p className="text-slate-400 text-xs max-w-sm">Escaneie o QR Code ou copie o código Pix copia e cola abaixo para confirmar seu agendamento na hora.</p>
                </div>

                {/* QR Code Container */}
                <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-250 w-fit">
                  {/* Visual simulated QR Code */}
                  <div className="w-[180px] h-[180px] bg-slate-100 flex items-center justify-center border border-dashed border-slate-350 rounded-xl relative">
                    <QrCode className="w-28 h-28 text-slate-850" />
                    <div className="absolute w-10 h-10 bg-slate-950 rounded-lg flex items-center justify-center shadow-md">
                      <Activity className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>
                </div>

                {/* Copy paste input */}
                <div className="w-full space-y-2">
                  <label className="text-slate-450 text-[10px] font-bold uppercase tracking-wider block">Código Pix Copia e Cola</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value="00020126580014br.gov.bcb.pix0136otium-pay-pix-key-random-hash52040000530398654..."
                      className="flex-1 px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-400 text-xs font-mono select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="px-4 py-3 bg-slate-850 hover:bg-slate-800 text-emerald-400 font-bold rounded-xl text-xs border border-slate-750 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedPix ? <CheckCircle2 className="w-4 h-4" /> : <ClipboardCheck className="w-4 h-4" />}
                      <span>{copiedPix ? "Copiado!" : "Copiar"}</span>
                    </button>
                  </div>
                </div>

                <div className="w-full pt-4 border-t border-slate-800/60">
                  <button
                    onClick={handlePay}
                    disabled={isPaying}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold rounded-2xl text-sm transition-all shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-75"
                  >
                    {isPaying ? (
                      <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Simular Confirmação do Pix</span>
                        <CheckCircle2 className="w-4.5 h-4.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Credit Card Tab */}
            {activeTab === 'cartao' && (
              <form onSubmit={handlePay} className="space-y-6">
                
                {/* Visual Card Preview */}
                <div className="flex justify-center mb-4">
                  <div className="w-full max-w-[340px] h-[190px] rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border border-slate-700/50 p-5 flex flex-col justify-between shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-emerald-500/5 rounded-full blur-[40px]" />
                    
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-7 bg-amber-500/30 rounded-md border border-amber-500/10 flex items-center justify-center" />
                      <span className="text-xs font-bold text-slate-400 italic">OtiumPay</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-white text-base tracking-widest font-mono block">
                        {cardNumber || '•••• •••• •••• ••••'}
                      </span>
                    </div>

                    <div className="flex justify-between items-end text-[10px]">
                      <div>
                        <span className="text-slate-500 block">Titular</span>
                        <span className="text-white font-bold tracking-wide uppercase truncate block max-w-[160px]">
                          {cardName || 'NOME DO TITULAR'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Validade</span>
                        <span className="text-white font-bold block">{cardExpiry || 'MM/AA'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-slate-400 text-xs font-medium">Nome do Titular *</label>
                    <input
                      type="text"
                      required
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Como escrito no cartão"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500 text-sm font-medium"
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-slate-400 text-xs font-medium">Número do Cartão *</label>
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                      maxLength={19}
                      placeholder="0000 0000 0000 0000"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500 text-sm font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-slate-400 text-xs font-medium">Validade (MM/AA) *</label>
                      <input
                        type="text"
                        required
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/AA"
                        maxLength={5}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500 text-sm font-medium"
                      />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-slate-400 text-xs font-medium">Código CVV *</label>
                      <input
                        type="text"
                        required
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        maxLength={4}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500 text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/60">
                  <button
                    type="submit"
                    disabled={isPaying}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold rounded-2xl text-sm transition-all shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-75"
                  >
                    {isPaying ? (
                      <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Confirmar Pagamento Simulado</span>
                        <CheckCircle2 className="w-4.5 h-4.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Simulated Payment Success Modal Layer */}
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-15"
                >
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 100 }}
                    className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4"
                  >
                    <CheckCircle2 className="w-10 h-10" />
                  </motion.div>
                  <h3 className="font-extrabold text-white text-xl">Pagamento Confirmado!</h3>
                  <p className="text-slate-400 text-xs mt-2 max-w-xs">Seu agendamento foi ativado com sucesso. Redirecionando para a tela principal...</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Booking Summary Column */}
        <div className="lg:col-span-5 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-1 h-5 bg-emerald-500 rounded-full" />
            Detalhes da Pré-Reserva
          </h2>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Código</span>
              <span className="block text-slate-300 font-mono text-sm font-semibold mt-0.5">
                # {appointment?.codigo}
              </span>
            </div>

            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Procedimento</span>
              <span className="block text-white text-base font-bold mt-0.5">
                {procedure?.nome}
              </span>
              <span className="block text-slate-450 text-xs mt-0.5 capitalize">{procedure?.tipo}</span>
            </div>

            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Profissional / Clínica</span>
              <span className="block text-white text-base font-bold mt-0.5">
                {appointment?.parceiro.nome}
              </span>
            </div>

            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Data do Atendimento</span>
              <span className="block text-slate-200 text-sm font-semibold mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-450" />
                {new Date(appointment?.data_realizacao).toLocaleDateString('pt-BR')} às{' '}
                {new Date(appointment?.data_realizacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="border-t border-slate-800/80 pt-4 flex justify-between items-center text-sm">
              <span className="text-slate-500 font-semibold">Total a Pagar</span>
              <span className="text-emerald-450 font-extrabold text-lg">
                R$ {Number(procedure?.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
