'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, Search, PlusCircle, Power, RefreshCw, AlertCircle, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CaixaPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [caixaStatus, setCaixaStatus] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  // Modals
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Forms
  const [valorAbertura, setValorAbertura] = useState('');
  const [transTipo, setTransTipo] = useState<'entrada' | 'saida'>('entrada');
  const [transDesc, setTransDesc] = useState('');
  const [transEspecie, setTransEspecie] = useState('');
  const [transCartao, setTransCartao] = useState('');
  const [transPix, setTransPix] = useState('');

  const fetchCaixaStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/caixa/aberto', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao carregar caixa.');
      setCaixaStatus(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/caixa', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao carregar histórico.');
      setHistory(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const initData = async () => {
    setLoading(true);
    await Promise.all([fetchCaixaStatus(), fetchHistory()]);
    setLoading(false);
  };

  useEffect(() => {
    initData();
  }, []);

  const handleOpenCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/caixa/abrir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ valor_abertura: Number(valorAbertura) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao abrir caixa.');
      setSuccessMsg('Caixa aberto com sucesso!');
      setValorAbertura('');
      setShowOpenModal(false);
      initData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/caixa/transacao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tipo: transTipo,
          descricao: transDesc,
          valor_pago_especie: Number(transEspecie || 0),
          valor_pago_cartao: Number(transCartao || 0),
          valor_pago_pix: Number(transPix || 0),
          valor_troco: 0,
          valor_adicional_cartao: 0
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao adicionar transação.');
      setTransDesc('');
      setTransEspecie('');
      setTransCartao('');
      setTransPix('');
      setShowTransactionModal(false);
      initData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCloseCaixa = async () => {
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/caixa/${caixaStatus.caixa.id_caixa}/fechar`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao fechar caixa.');
      setSuccessMsg('Caixa fechado com sucesso!');
      setShowCloseModal(false);
      initData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
        <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
        <span className="mt-4 text-slate-400 text-sm">Carregando dados do caixa...</span>
      </div>
    );
  }

  const isOpen = caixaStatus?.status === 'open';
  const openCaixa = caixaStatus?.caixa;

  // Compute live aggregates of open register
  let sumCash = 0;
  let sumCard = 0;
  let sumPix = 0;
  if (isOpen && openCaixa.pagamentos) {
    openCaixa.pagamentos.forEach((p: any) => {
      sumCash += Number(p.valor_pago_especie) - Number(p.valor_troco);
      sumCard += Number(p.valor_pago_cartao) + Number(p.valor_adicional_cartao);
      sumPix += Number(p.valor_pago_pix || 0);
    });
  }

  return (
    <div className="p-6 lg:p-10 flex flex-col space-y-8 relative">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Caixa</h1>
          <p className="text-slate-400 text-sm">Controle de abertura, fechamento e lançamentos do fluxo de caixa diário.</p>
        </div>

        {isOpen ? (
          <div className="flex gap-3">
            <button
              onClick={() => setShowTransactionModal(true)}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm border border-slate-800 transition-all flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4.5 h-4.5 text-emerald-400" />
              <span>Nova Transação</span>
            </button>
            <button
              onClick={() => setShowCloseModal(true)}
              className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold rounded-xl text-sm border border-rose-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Power className="w-4.5 h-4.5 text-rose-400" />
              <span>Fechar Caixa</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowOpenModal(true)}
            className="px-5 py-2.5 bg-gradient-to-tr from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-[0.98] cursor-pointer"
          >
            <Power className="w-4.5 h-4.5" />
            <span>Abrir Caixa</span>
          </button>
        )}
      </header>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Caixa Status Dashboard */}
      {isOpen ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col space-y-2">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Abertura</span>
            <span className="text-lg font-bold text-white">
              {new Date(openCaixa.data_abertura).toLocaleDateString('pt-BR')} {new Date(openCaixa.data_abertura).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-xs text-slate-500">Horário local</span>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col space-y-2">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Valor Abertura</span>
            <span className="text-2xl font-bold text-white">R$ {Number(openCaixa.valor_abertura).toFixed(2)}</span>
            <span className="text-xs text-slate-500">Saldo inicial em espécie</span>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col space-y-2">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Lançamentos (Dinheiro)</span>
            <span className={`text-2xl font-bold ${sumCash >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {sumCash >= 0 ? '+' : ''} R$ {sumCash.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500">Total transações em dinheiro</span>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col space-y-2">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Lançamentos (Cartão)</span>
            <span className="text-2xl font-bold text-teal-400">R$ {sumCard.toFixed(2)}</span>
            <span className="text-xs text-slate-500">Total transações em cartão</span>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col space-y-2">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Lançamentos (PIX)</span>
            <span className="text-2xl font-bold text-sky-400">R$ {sumPix.toFixed(2)}</span>
            <span className="text-xs text-slate-500">Total transações em PIX</span>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-slate-900/30 border border-slate-850 rounded-2xl text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
            <DollarSign className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">O caixa está fechado</h2>
          <p className="text-slate-400 text-sm max-w-md">Abra o caixa informando o saldo inicial em espécie para começar a registrar transações e agendamentos.</p>
        </div>
      )}

      {/* Open Caixa Transactions list */}
      {isOpen && (
        <section className="flex flex-col space-y-4">
          <h2 className="text-xl font-bold text-white">Transações do Caixa Atual</h2>
          <div className="border border-slate-850 bg-slate-900/20 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-850 bg-slate-900/40 text-slate-400 font-semibold">
                  <th className="p-4">Hora</th>
                  <th className="p-4">Descrição</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Dinheiro</th>
                  <th className="p-4">Cartão</th>
                  <th className="p-4">PIX</th>
                  <th className="p-4">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50">
                {openCaixa.pagamentos && openCaixa.pagamentos.length > 0 ? (
                  openCaixa.pagamentos.map((p: any) => {
                    const total = Number(p.valor_pago_especie) - Number(p.valor_troco) + Number(p.valor_pago_cartao) + Number(p.valor_adicional_cartao) + Number(p.valor_pago_pix || 0);
                    const isOutflow = p.tipo === 'saida';
                    return (
                      <tr key={p.id_agendamento_pagamento} className="hover:bg-slate-900/40 text-slate-300">
                        <td className="p-4 text-xs text-slate-500">
                          {new Date(p.data_criacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="p-4 font-medium text-white">{p.descricao}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${isOutflow ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {isOutflow ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                            {isOutflow ? 'Saída' : 'Entrada'}
                          </span>
                        </td>
                        <td className="p-4">R$ {Math.abs(Number(p.valor_pago_especie) - Number(p.valor_troco)).toFixed(2)}</td>
                        <td className="p-4">R$ {Math.abs(Number(p.valor_pago_cartao) + Number(p.valor_adicional_cartao)).toFixed(2)}</td>
                        <td className="p-4">R$ {Math.abs(Number(p.valor_pago_pix || 0)).toFixed(2)}</td>
                        <td className={`p-4 font-bold ${isOutflow ? 'text-rose-400' : 'text-emerald-400'}`}>
                          R$ {total.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">Nenhuma transação registrada neste caixa.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Caixa History */}
      <section className="flex flex-col space-y-4">
        <h2 className="text-xl font-bold text-white">Histórico de Caixas</h2>
        <div className="border border-slate-850 bg-slate-900/20 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-850 bg-slate-900/40 text-slate-400 font-semibold">
                <th className="p-4">Operador</th>
                <th className="p-4">Abertura</th>
                <th className="p-4">Fechamento</th>
                <th className="p-4">Vl. Abertura</th>
                <th className="p-4">Vl. Fechamento</th>
                <th className="p-4">Total Cartão</th>
                <th className="p-4">Total PIX</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/50">
              {history && history.length > 0 ? (
                history.map((c: any) => (
                  <tr key={c.id_caixa} className="hover:bg-slate-900/40 text-slate-300">
                    <td className="p-4 font-medium text-white">{c.usuario_nome}</td>
                    <td className="p-4 text-xs">
                      {new Date(c.data_abertura).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-4 text-xs">
                      {c.data_fechamento ? new Date(c.data_fechamento).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="p-4">R$ {Number(c.valor_abertura).toFixed(2)}</td>
                    <td className="p-4">{c.valor_fechamento ? `R$ ${Number(c.valor_fechamento).toFixed(2)}` : '-'}</td>
                    <td className="p-4">{c.total_cartao ? `R$ ${Number(c.total_cartao).toFixed(2)}` : '-'}</td>
                    <td className="p-4">{c.total_pix ? `R$ ${Number(c.total_pix).toFixed(2)}` : '-'}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${c.data_fechamento ? 'bg-slate-800 text-slate-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {c.data_fechamento ? 'Fechado' : 'Aberto'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">Nenhum caixa encontrado no histórico.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modals */}
      <AnimatePresence>
        {/* Open Modal */}
        {showOpenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md flex flex-col space-y-6"
            >
              <h3 className="text-xl font-bold text-white">Abrir Caixa</h3>
              <form onSubmit={handleOpenCaixa} className="flex flex-col space-y-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-300 text-xs font-semibold tracking-wide uppercase">Saldo Inicial em Espécie</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={valorAbertura}
                    onChange={(e) => setValorAbertura(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all font-medium text-sm"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowOpenModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold rounded-xl text-sm transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                  >
                    Confirmar Abertura
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Transaction Modal */}
        {showTransactionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md flex flex-col space-y-6"
            >
              <h3 className="text-xl font-bold text-white">Nova Transação Manual</h3>
              <form onSubmit={handleAddTransaction} className="flex flex-col space-y-4">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setTransTipo('entrada')}
                    className={`flex-1 py-2 text-center rounded-xl text-sm font-semibold border transition-all cursor-pointer ${transTipo === 'entrada' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-950 border-slate-850 text-slate-500'}`}
                  >
                    Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransTipo('saida')}
                    className={`flex-1 py-2 text-center rounded-xl text-sm font-semibold border transition-all cursor-pointer ${transTipo === 'saida' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-slate-950 border-slate-850 text-slate-500'}`}
                  >
                    Saída
                  </button>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-300 text-xs font-semibold tracking-wide uppercase">Descrição</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Pagamento de material, Sangria, Suprimento"
                    value={transDesc}
                    onChange={(e) => setTransDesc(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all font-medium text-sm"
                  />
                </div>

                 <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-slate-350 text-[10px] font-bold uppercase tracking-wider">Espécie (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={transEspecie}
                      onChange={(e) => setTransEspecie(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-slate-355 text-[10px] font-bold uppercase tracking-wider">PIX (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={transPix}
                      onChange={(e) => setTransPix(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-slate-350 text-[10px] font-bold uppercase tracking-wider">Cartão (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={transCartao}
                      onChange={(e) => setTransCartao(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowTransactionModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold rounded-xl text-sm transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                  >
                    Lançar Transação
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Close Modal */}
        {showCloseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md flex flex-col space-y-5"
            >
              <h3 className="text-xl font-bold text-white">Fechar Caixa</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tem certeza de que deseja fechar este caixa? Abaixo está o resumo consolidado das operações:
              </p>
              
              <div className="bg-slate-950/60 p-4 border border-slate-850 rounded-xl flex flex-col space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-550">Saldo Inicial:</span>
                  <span className="text-white font-medium">R$ {Number(openCaixa.valor_abertura).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-550">Inflows/Outflows (Dinheiro):</span>
                  <span className={`font-medium ${sumCash >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    R$ {sumCash.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-550">Total em PIX:</span>
                  <span className="text-sky-400 font-medium">R$ {sumPix.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-550">Total em Cartão:</span>
                  <span className="text-teal-400 font-medium">R$ {sumCard.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-850 pt-2 flex justify-between font-bold text-lg">
                  <span className="text-white">Saldo Final Caixa:</span>
                  <span className="text-emerald-400">R$ {(Number(openCaixa.valor_abertura) + sumCash).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold rounded-xl text-sm transition-all cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  onClick={handleCloseCaixa}
                  className="px-5 py-2 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-md shadow-rose-500/10 cursor-pointer"
                >
                  Confirmar Fechamento
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
