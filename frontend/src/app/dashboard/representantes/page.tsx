'use client';

import React, { useEffect, useState } from 'react';
import { Search, Eye, X, AlertCircle, RefreshCw, PlusCircle, CreditCard, CheckSquare, Square, DollarSign, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RepresentantesPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [reps, setReps] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Panels
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedRep, setSelectedRep] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form Fields
  const [repId, setRepId] = useState('');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefones, setTelefones] = useState('');
  const [banco, setBanco] = useState('');
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [chavePix, setChavePix] = useState('');

  // Details panel states
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);
  const [unpaidCommissions, setUnpaidCommissions] = useState<any[]>([]);
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchReps = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/representantes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao carregar representantes.');
      setReps(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const initData = async () => {
    setLoading(true);
    await fetchReps();
    setLoading(false);
  };

  useEffect(() => {
    initData();
  }, []);

  const handleOpenDetails = async (rep: any) => {
    setSelectedRep(rep);
    setLoadingDetails(true);
    setPaymentsHistory([]);
    setUnpaidCommissions([]);
    setSelectedAppointments([]);

    try {
      const token = localStorage.getItem('token');
      
      // Fetch payments
      const payResponse = await fetch(`http://localhost:3000/api/representantes/${rep.id_representante}/pagamentos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payData = await payResponse.json();

      // Fetch unpaid commissions
      const commResponse = await fetch(`http://localhost:3000/api/representantes/${rep.id_representante}/comissoes-pendentes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const commData = await commResponse.json();

      setPaymentsHistory(payData);
      setUnpaidCommissions(commData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const toggleSelectAppointment = (id: string) => {
    setSelectedAppointments((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleRegisterPayment = async () => {
    if (selectedAppointments.length === 0) return;
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/representantes/pagar', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          id_representante: selectedRep.id_representante,
          agendamentos: selectedAppointments
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao processar pagamento.');
      
      // Refresh details and rep list
      handleOpenDetails(selectedRep);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setRepId('');
    setNome('');
    setCpf('');
    setTelefones('');
    setBanco('');
    setAgencia('');
    setConta('');
    setChavePix('');
    setShowFormModal(true);
  };

  const openEditModal = (r: any) => {
    setIsEditing(true);
    setRepId(r.id_representante);
    setNome(r.nome);
    setCpf(r.cpf || '');
    setTelefones(r.telefones || '');
    setBanco(r.banco || '');
    setAgencia(r.agencia || '');
    setConta(r.conta || '');
    setChavePix(r.chave_pix || '');
    setShowFormModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const token = localStorage.getItem('token');

    const payload = { nome, cpf, telefones, banco, agencia, conta, chave_pix: chavePix };

    try {
      const url = isEditing
        ? `http://localhost:3000/api/representantes/${repId}`
        : 'http://localhost:3000/api/representantes';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao salvar representante.');

      setShowFormModal(false);
      fetchReps();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const filteredReps = reps.filter((r) =>
    r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.cpf && r.cpf.includes(searchTerm))
  );

  // Sum total selected commission amount
  const totalSelectedCommission = selectedAppointments.reduce((sum, id) => {
    const item = unpaidCommissions.find(a => a.id_agendamento === id);
    return sum + Number(item?.valor_representante || 0);
  }, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
        <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
        <span className="mt-4 text-slate-400 text-sm">Carregando representantes...</span>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 flex flex-col space-y-8 relative">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Representantes</h1>
          <p className="text-slate-400 text-sm">Gerencie o cadastro de representantes comerciais e efetue repasse de comissões.</p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-2.5 bg-gradient-to-tr from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-[0.98] cursor-pointer"
        >
          <PlusCircle className="w-4.5 h-4.5" />
          <span>Novo Representante</span>
        </button>
      </header>

      {/* Filter and search controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/40 p-4 border border-slate-850 rounded-2xl">
        <div className="relative w-full sm:max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
          <input
            type="text"
            placeholder="Pesquisar por nome ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80 transition-all text-sm"
          />
        </div>
      </div>

      {/* Table content */}
      <div className="border border-slate-850 bg-slate-900/20 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-850 bg-slate-900/40 text-slate-400 font-semibold">
              <th className="p-4">Nome</th>
              <th className="p-4">CPF</th>
              <th className="p-4">Telefone</th>
              <th className="p-4">Banco</th>
              <th className="p-4">Agência/Conta</th>
              <th className="p-4">Chave Pix</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850/50">
            {filteredReps.length > 0 ? (
              filteredReps.map((r) => (
                <tr key={r.id_representante} className="hover:bg-slate-900/40 text-slate-300">
                  <td className="p-4 font-semibold text-white">{r.nome}</td>
                  <td className="p-4">{r.cpf || '-'}</td>
                  <td className="p-4">{r.telefones || '-'}</td>
                  <td className="p-4">
                    {r.banco ? (
                      <span className="inline-flex items-center gap-1.5 text-slate-300">
                        <CreditCard className="w-4 h-4 text-slate-500" />
                        {r.banco}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-4">
                    {r.agencia && r.conta ? `${r.agencia} / ${r.conta}` : '-'}
                  </td>
                  <td className="p-4 font-semibold text-emerald-400">{r.chave_pix || '-'}</td>
                  <td className="p-4 flex gap-2">
                    <button
                      onClick={() => handleOpenDetails(r)}
                      title="Repasses e Pagamentos"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all flex items-center gap-1 cursor-pointer text-xs"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Ver Repasses</span>
                    </button>
                    <button
                      onClick={() => openEditModal(r)}
                      title="Editar"
                      className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-550">Nenhum representante encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Form Modal */}
      <AnimatePresence>
        {showFormModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-xl flex flex-col space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">
                  {isEditing ? 'Editar Representante' : 'Novo Representante'}
                </h3>
                <button onClick={() => setShowFormModal(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5 md:col-span-2">
                  <label className="text-slate-300 text-xs font-semibold uppercase">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-300 text-xs font-semibold uppercase">CPF</label>
                  <input
                    type="text"
                    placeholder="Apenas números"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-300 text-xs font-semibold uppercase">Telefones</label>
                  <input
                    type="text"
                    placeholder="(99) 99999-9999"
                    value={telefones}
                    onChange={(e) => setTelefones(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>

                <h4 className="text-sm font-bold text-slate-400 md:col-span-2 border-b border-slate-800 pb-1 mt-2">Dados Bancários</h4>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-300 text-xs font-semibold uppercase">Banco</label>
                  <input
                    type="text"
                    placeholder="Ex: Itaú, Nubank, Bradesco"
                    value={banco}
                    onChange={(e) => setBanco(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-slate-300 text-xs font-semibold uppercase">Agência</label>
                    <input
                      type="text"
                      placeholder="0001"
                      value={agencia}
                      onChange={(e) => setAgencia(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-slate-300 text-xs font-semibold uppercase">Conta</label>
                    <input
                      type="text"
                      placeholder="12345-6"
                      value={conta}
                      onChange={(e) => setConta(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-1.5 md:col-span-2">
                  <label className="text-slate-300 text-xs font-semibold uppercase">Chave Pix</label>
                  <input
                    type="text"
                    placeholder="E-mail, CPF, Telefone ou Chave Aleatória"
                    value={chavePix}
                    onChange={(e) => setChavePix(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 md:col-span-2">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold rounded-xl text-sm transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                  >
                    Salvar Dados
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* View Repasses / Payments Drawer */}
        {selectedRep && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div className="flex flex-col space-y-6">
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
                  <div className="flex flex-col">
                    <h3 className="text-xl font-bold text-white">Gestão de Repasses</h3>
                    <span className="text-xs text-emerald-400 font-bold">{selectedRep.nome}</span>
                    {selectedRep.chave_pix && (
                      <span className="text-[11px] text-slate-400 mt-1">
                        Chave Pix: <strong className="text-slate-200">{selectedRep.chave_pix}</strong>
                      </span>
                    )}
                  </div>
                  <button onClick={() => setSelectedRep(null)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {loadingDetails ? (
                  <div className="p-10 text-center flex flex-col items-center justify-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                    <span className="text-slate-450 text-xs">Buscando lançamentos bancários...</span>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-6">
                    {/* Unpaid Commissions Wizard */}
                    <div className="flex flex-col space-y-3">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Comissões Pendentes (Não Pagas)</h4>
                      <div className="max-h-60 border border-slate-850 bg-slate-950/60 rounded-xl overflow-y-auto text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-850 bg-slate-900/60 text-slate-500 font-semibold sticky top-0">
                              <th className="p-3 w-8"></th>
                              <th className="p-3">Código</th>
                              <th className="p-3">Cliente</th>
                              <th className="p-3">Data</th>
                              <th className="p-3 text-right">Comissão</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850/40 text-slate-300">
                            {unpaidCommissions.length > 0 ? (
                              unpaidCommissions.map((c) => {
                                const isSelected = selectedAppointments.includes(c.id_agendamento);
                                return (
                                  <tr
                                    key={c.id_agendamento}
                                    onClick={() => toggleSelectAppointment(c.id_agendamento)}
                                    className="hover:bg-slate-900/40 cursor-pointer"
                                  >
                                    <td className="p-3">
                                      {isSelected ? (
                                        <CheckSquare className="w-4 h-4 text-emerald-450" />
                                      ) : (
                                        <Square className="w-4 h-4 text-slate-600" />
                                      )}
                                    </td>
                                    <td className="p-3 font-semibold text-white">{c.codigo}</td>
                                    <td className="p-3 truncate max-w-[120px]">{c.nome_cliente}</td>
                                    <td className="p-3 text-slate-500">{new Date(c.data_criacao).toLocaleDateString('pt-BR')}</td>
                                    <td className="p-3 text-right text-emerald-450 font-bold">R$ {Number(c.valor_representante).toFixed(2)}</td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={5} className="p-6 text-center text-slate-550">Nenhuma comissão pendente encontrada.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {selectedAppointments.length > 0 && (
                        <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-500 uppercase font-semibold">Total a Repassar</span>
                            <span className="text-lg font-bold text-emerald-400">R$ {totalSelectedCommission.toFixed(2)}</span>
                          </div>
                          <button
                            onClick={handleRegisterPayment}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                          >
                            Registrar Pagamento
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Paid payments history */}
                    <div className="flex flex-col space-y-3">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Histórico de Pagamentos Realizados</h4>
                      <div className="max-h-60 border border-slate-850 bg-slate-950/60 rounded-xl overflow-y-auto text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-850 bg-slate-900/60 text-slate-500 font-semibold sticky top-0">
                              <th className="p-3">Nº Ref Pagamento</th>
                              <th className="p-3">Data Repasse</th>
                              <th className="p-3">Agendamentos</th>
                              <th className="p-3 text-right">Valor Pago</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850/40 text-slate-300">
                            {paymentsHistory.length > 0 ? (
                              paymentsHistory.map((p) => (
                                <tr key={p.id_representante_pagamento} className="hover:bg-slate-900/20">
                                  <td className="p-3 font-semibold text-white"># {p.id_representante_pagamento}</td>
                                  <td className="p-3 text-slate-500">{new Date(p.data_criacao).toLocaleString('pt-BR')}</td>
                                  <td className="p-3">{p.qnt_agendamentos} guias</td>
                                  <td className="p-3 text-right font-bold text-emerald-400">R$ {Number(p.total_pagamento).toFixed(2)}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={4} className="p-6 text-center text-slate-550">Nenhum pagamento efetuado anteriormente.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-slate-800/80">
                <button
                  onClick={() => setSelectedRep(null)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold rounded-xl text-sm transition-all text-center cursor-pointer"
                >
                  Fechar Painel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
