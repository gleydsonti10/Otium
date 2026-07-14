'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, Eye, X, AlertCircle, RefreshCw, Layers, Calendar, User, Check, Play, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FinanceiroPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [cycles, setCycles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'lotes' | 'gerar'>('lotes');

  // Preview cycle states
  const [previews, setPreviews] = useState<any[]>([]);
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  const [generatingBatch, setGeneratingBatch] = useState<string | null>(null);

  // Admin verification state
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Modal states for detailed cycle view
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [cycleDetails, setCycleDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Custom Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const fetchCycles = async () => {
    try {
      const token = localStorage.getItem('token');
      const activeUnitId = localStorage.getItem('activeUnitId');
      const response = await fetch('http://localhost:3000/api/financeiro', {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(activeUnitId ? { 'x-active-unit-id': activeUnitId } : {})
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar ciclos financeiros.');
      }

      setCycles(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviews = async () => {
    setLoadingPreviews(true);
    try {
      const token = localStorage.getItem('token');
      const activeUnitId = localStorage.getItem('activeUnitId');
      const response = await fetch('http://localhost:3000/api/financeiro/previa-ciclos', {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(activeUnitId ? { 'x-active-unit-id': activeUnitId } : {})
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar prévias dos ciclos.');
      }

      setPreviews(data);
    } catch (err: any) {
      alert(err.message || 'Erro ao buscar prévias.');
    } finally {
      setLoadingPreviews(false);
    }
  };

  useEffect(() => {
    // Determine admin level
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    setIsAdmin(user?.role?.level >= 50);

    fetchCycles();
  }, []);

  useEffect(() => {
    if (activeTab === 'gerar' && isAdmin) {
      fetchPreviews();
    }
  }, [activeTab, isAdmin]);

  const handleOpenDetails = async (id: string) => {
    setSelectedCycleId(id);
    setLoadingDetails(true);
    setCycleDetails(null);

    try {
      const token = localStorage.getItem('token');
      const activeUnitId = localStorage.getItem('activeUnitId');
      const response = await fetch(`http://localhost:3000/api/financeiro/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(activeUnitId ? { 'x-active-unit-id': activeUnitId } : {})
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar detalhes.');
      }

      setCycleDetails(data);
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar ciclo financeiro.');
      setSelectedCycleId(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleGenerateBatch = (idParceiro?: string) => {
    const isBulk = !idParceiro;
    const title = isBulk ? 'Confirmar Fechamento em Massa' : 'Confirmar Fechamento Individual';
    const message = isBulk
      ? 'Deseja realmente gerar os lotes em massa para todos os parceiros com o ciclo de faturamento vencido?'
      : 'Deseja gerar o lote de pagamento para este parceiro com os agendamentos realizados no período?';

    triggerConfirm(title, message, async () => {
      setGeneratingBatch(idParceiro || 'mass');
      try {
        const token = localStorage.getItem('token');
        const activeUnitId = localStorage.getItem('activeUnitId');
        const response = await fetch('http://localhost:3000/api/financeiro/gerar-lote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(activeUnitId ? { 'x-active-unit-id': activeUnitId } : {})
          },
          body: JSON.stringify({ id_parceiro: idParceiro })
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao gerar lote financeiro.');
        }

        alert(data.message || 'Lote(s) gerado(s) com sucesso!');
        await fetchCycles();
        if (activeTab === 'gerar') {
          await fetchPreviews();
        }
      } catch (err: any) {
        alert(err.message || 'Erro ao gerar lote.');
      } finally {
        setGeneratingBatch(null);
      }
    });
  };

  const handlePayBatch = (id: string) => {
    triggerConfirm(
      'Confirmar Pagamento',
      'Deseja realmente liquidar e marcar este lote como PAGO?',
      async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch('http://localhost:3000/api/financeiro/pagar', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id_financeiro: id })
          });
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Erro ao pagar lote.');
          }

          alert('Lote pago com sucesso!');
          setSelectedCycleId(null);
          await fetchCycles();
        } catch (err: any) {
          alert(err.message || 'Erro ao pagar lote.');
        }
      }
    );
  };

  const handleCancelBatch = (id: string) => {
    triggerConfirm(
      'Confirmar Cancelamento',
      'Deseja realmente CANCELAR este lote financeiro? Todos os agendamentos vinculados serão liberados para faturamento novamente.',
      async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch('http://localhost:3000/api/financeiro/cancelar', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id_financeiro: id })
          });
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Erro ao cancelar lote.');
          }

          alert('Lote cancelado com sucesso!');
          setSelectedCycleId(null);
          await fetchCycles();
        } catch (err: any) {
          alert(err.message || 'Erro ao cancelar lote.');
        }
      }
    );
  };

  return (
    <div className="p-6 lg:p-10 flex flex-col space-y-8 relative">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Financeiro</h1>
          <p className="text-slate-400 text-sm">
            Acompanhe os ciclos de faturamento e repasses financeiros para clínicas e parceiros.
          </p>
        </div>
      </header>

      {/* Admin Tabs */}
      {isAdmin && (
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('lotes')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'lotes'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Lotes Gerados
          </button>
          <button
            onClick={() => setActiveTab('gerar')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'gerar'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Gerar Lotes
          </button>
        </div>
      )}

      {/* TAB 1: LOTES GERADOS */}
      {activeTab === 'lotes' && (
        <>
          {errorMsg ? (
            <div className="p-6 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl flex items-center space-x-3 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <span className="mt-4 text-sm">Carregando ciclos financeiros...</span>
            </div>
          ) : cycles.length === 0 ? (
            <div className="py-20 border border-slate-800/50 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-500">
              <DollarSign className="w-12 h-12 text-slate-600 mb-3" />
              <span className="text-sm">Nenhum ciclo financeiro localizado.</span>
            </div>
          ) : (
            <div className="overflow-x-auto bg-slate-900/40 border border-slate-850 rounded-3xl">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="p-4 pl-6">Código</th>
                    <th className="p-4">Parceiro</th>
                    <th className="p-4">Criado por</th>
                    <th className="p-4">Data Criação</th>
                    <th className="p-4">Total Repasse</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 pr-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 font-medium text-slate-300">
                  {cycles.map((c) => (
                    <tr key={c.id_financeiro} className="hover:bg-slate-900/30 transition-colors">
                      <td className="p-4 pl-6 text-white font-mono">{c.codigo || c.id_financeiro}</td>
                      <td className="p-4 text-white">{c.nome_parceiro}</td>
                      <td className="p-4 text-slate-400">{c.email_usuario || 'Sistema'}</td>
                      <td className="p-4 text-slate-400">
                        {new Date(c.data_criacao).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4 text-emerald-400">R$ {parseFloat(c.total_parceiro).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          c.status === 'pago'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                            : c.status === 'pendente'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                        }`}>
                          {c.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => handleOpenDetails(c.id_financeiro)}
                          className="p-2 bg-slate-800 hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-400 border border-slate-800/80 hover:border-emerald-500/10 rounded-xl transition-all cursor-pointer inline-flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-xs hidden sm:inline">Detalhes</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* TAB 2: GERAR LOTES */}
      {activeTab === 'gerar' && isAdmin && (
        <>
          {/* Top Panel Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-slate-900/40 border border-slate-850 rounded-3xl space-y-4 sm:space-y-0">
            <div className="flex flex-col space-y-1">
              <span className="text-white font-bold text-base">Fechamento Automático em Massa</span>
              <span className="text-slate-400 text-xs">Varre todos os parceiros com ciclos vencidos para gerar os lotes correspondentes.</span>
            </div>
            <button
              onClick={() => handleGenerateBatch()}
              disabled={generatingBatch !== null || loadingPreviews}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-bold rounded-2xl transition-all cursor-pointer inline-flex items-center space-x-2 text-sm shadow-lg shadow-emerald-500/10 disabled:shadow-none"
            >
              {generatingBatch === 'mass' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>Gerar Lotes (Ciclos Vencidos)</span>
            </button>
          </div>

          {loadingPreviews ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <span className="mt-4 text-sm">Carregando previsões de faturamento...</span>
            </div>
          ) : previews.length === 0 ? (
            <div className="py-20 border border-slate-800/50 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-500">
              <Layers className="w-12 h-12 text-slate-600 mb-3" />
              <span className="text-sm">Nenhum parceiro pendente localizado.</span>
            </div>
          ) : (
            <div className="overflow-x-auto bg-slate-900/40 border border-slate-850 rounded-3xl">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="p-4 pl-6">Parceiro</th>
                    <th className="p-4">Ciclo</th>
                    <th className="p-4">Próximo Vencimento</th>
                    <th className="p-4">Status Ciclo</th>
                    <th className="p-4">Qtd Pendentes</th>
                    <th className="p-4">Valor Acumulado</th>
                    <th className="p-4 pr-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 font-medium text-slate-300">
                  {previews.map((p) => (
                    <tr key={p.id_parceiro} className="hover:bg-slate-900/30 transition-colors">
                      <td className="p-4 pl-6 text-white font-bold">{p.nome}</td>
                      <td className="p-4 text-slate-400">{p.ciclo_pagamento} dias</td>
                      <td className="p-4 text-slate-400">
                        {p.data_fechamento_ciclo
                          ? new Date(p.data_fechamento_ciclo).toLocaleDateString('pt-BR')
                          : 'Não definido'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center space-x-1 ${
                          p.is_due
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {p.is_due ? 'VENCIDO' : 'NO PRAZO'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300">{p.qtd_pendente}</td>
                      <td className="p-4 text-emerald-400">R$ {parseFloat(p.total_pendente).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => handleGenerateBatch(p.id_parceiro)}
                          disabled={p.qtd_pendente === 0 || generatingBatch !== null}
                          className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 disabled:bg-slate-800/50 disabled:text-slate-600 border border-emerald-500/20 hover:border-emerald-500 disabled:border-transparent rounded-xl transition-all cursor-pointer inline-flex items-center space-x-1 text-xs font-bold"
                        >
                          {generatingBatch === p.id_parceiro ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                          <span>Gerar Lote</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Details Side Drawer / Modal */}
      <AnimatePresence>
        {selectedCycleId && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-end">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-2xl h-screen bg-slate-900 border-l border-slate-850 p-6 lg:p-8 flex flex-col justify-between overflow-y-auto"
            >
              <div className="flex flex-col h-full justify-between">
                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-850 pb-4 mb-6">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Ciclo de Faturamento</span>
                      <span className="text-lg font-bold text-white mt-1">Detalhes do Ciclo</span>
                    </div>
                    <button
                      onClick={() => setSelectedCycleId(null)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {loadingDetails ? (
                    <div className="py-24 flex flex-col items-center justify-center text-slate-400">
                      <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                      <span className="mt-4 text-sm">Carregando detalhes do faturamento...</span>
                    </div>
                  ) : cycleDetails ? (
                    <div className="space-y-8">
                      {/* General Summary Card */}
                      <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950 border border-slate-850 rounded-2xl">
                        <div className="flex flex-col">
                          <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Clínica / Parceiro</span>
                          <span className="text-white font-bold text-sm mt-1">{cycleDetails.nome_parceiro}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Total Repasse</span>
                          <span className="text-emerald-400 font-extrabold text-sm mt-1">R$ {parseFloat(cycleDetails.total_parceiro).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      {/* Appointments Table inside Modal */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-white text-sm">Agendamentos Vinculados</h4>
                        <div className="overflow-x-auto border border-slate-850 rounded-2xl bg-slate-950">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-850 text-slate-500 uppercase tracking-widest font-semibold">
                                <th className="p-3 pl-4">Código</th>
                                <th className="p-3">Paciente</th>
                                <th className="p-3">Qtd</th>
                                <th className="p-3">Valor</th>
                                <th className="p-3 pr-4 text-right">Comissão</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850 font-medium text-slate-300">
                              {cycleDetails.agendamentos.map((ag: any) => (
                                <tr key={ag.id_agendamento}>
                                  <td className="p-3 pl-4 font-mono text-white">{ag.codigo}</td>
                                  <td className="p-3">
                                    <div className="flex flex-col">
                                      <span className="text-white">{ag.nome_cliente}</span>
                                      <span className="text-[10px] text-slate-500">CPF: {ag.cpf}</span>
                                    </div>
                                  </td>
                                  <td className="p-3 text-slate-400">{ag.quantidade}</td>
                                  <td className="p-3 text-emerald-400">R$ {parseFloat(ag.valor_parceiro).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                  <td className="p-3 pr-4 text-right text-slate-400">R$ {parseFloat(ag.comissao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Footer Administration Actions */}
                {cycleDetails && cycleDetails.status === 'pendente' && isAdmin && (
                  <div className="mt-8 pt-6 border-t border-slate-850 flex items-center justify-end space-x-4">
                    <button
                      onClick={() => handleCancelBatch(cycleDetails.id_financeiro)}
                      className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 hover:border-rose-500 font-bold rounded-2xl transition-all cursor-pointer flex items-center space-x-2 text-sm"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancelar Lote</span>
                    </button>
                    <button
                      onClick={() => handlePayBatch(cycleDetails.id_financeiro)}
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 hover:text-slate-950 font-bold rounded-2xl transition-all cursor-pointer flex items-center space-x-2 text-sm shadow-lg shadow-emerald-500/10"
                    >
                      <Check className="w-4 h-4" />
                      <span>Marcar como Pago</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-850 p-6 rounded-3xl w-full max-w-md shadow-2xl relative"
            >
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-lg font-bold text-white">{confirmDialog.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{confirmDialog.message}</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  id="confirm-dialog-button"
                  className="px-4 py-2 text-sm font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all cursor-pointer font-bold shadow-lg shadow-emerald-500/10"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
