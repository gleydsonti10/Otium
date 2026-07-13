'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, Search, Filter, AlertCircle, RefreshCw, Plus, X, Trash2, User, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [caixaError, setCaixaError] = useState('');

  // Form states
  const [searchClient, setSearchClient] = useState('');
  const [clientsFound, setClientsFound] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  
  const [representatives, setRepresentatives] = useState<any[]>([]);
  const [selectedRepId, setSelectedRepId] = useState('');
  const [valorRepresentante, setValorRepresentante] = useState('0');

  const [partners, setPartners] = useState<any[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [partnerProcedures, setPartnerProcedures] = useState<any[]>([]);
  
  // Procedure item inputs
  const [selectedProcId, setSelectedProcId] = useState('');
  const [procQty, setProcQty] = useState<number>(1);
  const [procDiscount, setProcDiscount] = useState<number>(0);

  // Added procedures list
  const [addedProcs, setAddedProcs] = useState<any[]>([]);

  // Payment states
  const [pagoEspecie, setPagoEspecie] = useState<string>('0');
  const [pagoCartao, setPagoCartao] = useState<string>('0');
  const [pagoPix, setPagoPix] = useState<string>('0');
  const [adicionalCartao, setAdicionalCartao] = useState<string>('0');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchAgendamentos = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/agendamentos', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar agendamentos.');
      }

      setAgendamentos(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    if (token) {
      fetchAgendamentos();
    }
  }, [token]);

  // Fetch representatives and partners when modal opens
  useEffect(() => {
    if (showCreateModal && token) {
      setCaixaError('');
      
      // Check cash drawer status
      fetch('http://localhost:3000/api/caixa/aberto', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.status !== 'open') {
            setCaixaError('Atenção: Não há nenhum caixa aberto para o seu usuário. Por favor, abra o caixa na tela de Caixa antes de prosseguir.');
          }
        })
        .catch(err => console.error(err));

      // Fetch representatives
      fetch('http://localhost:3000/api/representantes', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setRepresentatives(data);
        })
        .catch(err => console.error(err));

      // Fetch partners
      fetch('http://localhost:3000/api/parceiros', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setPartners(data);
        })
        .catch(err => console.error(err));
    }
  }, [showCreateModal, token]);

  // Fetch procedures for selected partner
  useEffect(() => {
    if (selectedPartnerId && token) {
      fetch(`http://localhost:3000/api/parceiro-procedimentos/${selectedPartnerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setPartnerProcedures(data);
            setSelectedProcId('');
          }
        })
        .catch(err => console.error(err));
    } else {
      setPartnerProcedures([]);
    }
  }, [selectedPartnerId, token]);

  // Dynamic client/patient search debounce
  useEffect(() => {
    if (searchClient.trim().length >= 2 && token) {
      const delayDebounce = setTimeout(() => {
        fetch(`http://localhost:3000/api/clientes?search=${searchClient}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) setClientsFound(data);
          })
          .catch(err => console.error(err));
      }, 300);
      return () => clearTimeout(delayDebounce);
    } else {
      setClientsFound([]);
    }
  }, [searchClient, token]);

  // Computation values
  const totalProcs = addedProcs.reduce((sum, item) => {
    return sum + (Number(item.valor_total) * item.quantidade - item.desconto);
  }, 0);

  const totalToPay = totalProcs + Number(adicionalCartao);
  const totalPaid = Number(pagoEspecie || 0) + Number(pagoCartao || 0) + Number(pagoPix || 0);
  const troco = Math.max(0, totalPaid - totalToPay);

  const handleAddProcedure = () => {
    const proc = partnerProcedures.find(p => p.id_parceiro_procedimento === selectedProcId);
    if (!proc) return;

    if (addedProcs.some(item => item.id_parceiro_procedimento === proc.id_parceiro_procedimento)) {
      alert('Este procedimento já foi adicionado.');
      return;
    }

    setAddedProcs([
      ...addedProcs,
      {
        id_parceiro: proc.id_parceiro,
        id_parceiro_procedimento: proc.id_parceiro_procedimento,
        nome: proc.nome,
        nome_parceiro: partners.find(p => p.id_parceiro === proc.id_parceiro)?.nome || 'Parceiro',
        valor_total: proc.valor_total,
        comissao: proc.comissao,
        quantidade: Number(procQty || 1),
        desconto: Number(procDiscount || 0)
      }
    ]);

    setProcQty(1);
    setProcDiscount(0);
    setSelectedProcId('');
  };

  const handleRemoveProcedure = (index: number) => {
    setAddedProcs(addedProcs.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (caixaError) {
      alert(caixaError);
      return;
    }
    if (!selectedClient) {
      alert('Por favor, selecione um paciente.');
      return;
    }
    if (addedProcs.length === 0) {
      alert('Adicione pelo menos um procedimento ao agendamento.');
      return;
    }

    setSubmitting(true);

    const payload = {
      id_cliente: selectedClient.id_cliente,
      id_representante: selectedRepId || null,
      valor_pago_especie: Number(pagoEspecie || 0),
      valor_pago_cartao: Number(pagoCartao || 0),
      valor_pago_pix: Number(pagoPix || 0),
      valor_adicional_cartao: Number(adicionalCartao || 0),
      valor_representante: selectedRepId ? Number(valorRepresentante || 0) : 0,
      valor_troco: troco,
      procedimentos: addedProcs.map(p => ({
        id_parceiro: p.id_parceiro,
        id_parceiro_procedimento: p.id_parceiro_procedimento,
        quantidade: p.quantidade,
        desconto: p.desconto
      }))
    };

    try {
      const response = await fetch('http://localhost:3000/api/agendamentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cadastrar agendamento.');
      }

      alert('Agendamento cadastrado com sucesso!');
      setShowCreateModal(false);
      
      // Clear forms
      setSelectedClient(null);
      setSearchClient('');
      setAddedProcs([]);
      setPagoEspecie('0');
      setPagoCartao('0');
      setPagoPix('0');
      setAdicionalCartao('0');
      setSelectedRepId('');
      setValorRepresentante('0');
      setSelectedPartnerId('');

      // Reload
      fetchAgendamentos();
    } catch (err: any) {
      alert(err.message || 'Erro ao processar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 flex flex-col space-y-8">
      
      <header className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Olá, {user?.nome_usuario?.split(' ')[0]}!
          </h1>
          <p className="text-slate-400 text-sm">
            Bem-vindo ao novo painel do **Otium**.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-[#00ABE4]/10 hover:bg-[#00ABE4]/20 border border-[#00ABE4]/30 text-[#00ABE4] font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </button>
      </header>

      {/* Prominent CTA Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 rounded-3xl bg-[#00ABE4] text-white flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0 relative overflow-hidden shadow-2xl shadow-[#00ABE4]/20 border border-white/10"
      >
        {/* Abstract background graphics */}
        <div className="absolute -top-1/4 -right-1/4 w-96 h-96 bg-white/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-1/4 -left-1/4 w-96 h-96 bg-[#008CC2]/40 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2 max-w-xl">
          <h2 className="text-2xl font-extrabold tracking-tight">Criar Novo Agendamento</h2>
          <p className="text-white/90 text-sm leading-relaxed">
            Inicie um novo agendamento para um paciente de forma rápida. Selecione a clínica, defina os procedimentos e realize o faturamento em poucos cliques.
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="relative z-10 px-8 py-4.5 bg-white text-[#00ABE4] font-black rounded-2xl text-base transition-all flex items-center justify-center gap-3 cursor-pointer shadow-lg hover:shadow-xl hover:scale-[1.03] active:scale-[0.97]"
        >
          <Plus className="w-6 h-6 stroke-[3.5px]" />
          Começar Agendamento
        </button>
      </motion.div>

      {/* Recent Appointments Section */}
      <section className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white tracking-tight">Agendamentos Recentes</h3>
          <div className="flex space-x-2">
            <button className="p-2 bg-slate-900 border border-slate-850 rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
            <span className="mt-4 text-sm">Carregando agendamentos...</span>
          </div>
        ) : errorMsg ? (
          <div className="p-6 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl flex items-center space-x-3 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : agendamentos.length === 0 ? (
          <div className="py-12 border border-slate-800/50 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-500">
            <Calendar className="w-10 h-10 text-slate-600 mb-3" />
            <span className="text-sm">Nenhum agendamento encontrado no banco de dados.</span>
          </div>
        ) : (
          <div className="overflow-x-auto bg-slate-900/40 border border-slate-850 rounded-3xl">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-850 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="p-4 pl-6">Código</th>
                  <th className="p-4">Paciente</th>
                  <th className="p-4">Parceiro</th>
                  <th className="p-4">Data Criação</th>
                  <th className="p-4">Total</th>
                  <th className="p-4 pr-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-medium text-slate-300">
                {agendamentos.slice(0, 10).map((ag) => (
                  <tr key={ag.id_agendamento} className="hover:bg-slate-900/30 transition-colors">
                    <td className="p-4 pl-6 text-white font-mono">{ag.codigo || ag.id_agendamento}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-white">{ag.cliente.nome}</span>
                        <span className="text-xs text-slate-500">CPF: {ag.cliente.cpf}</span>
                      </div>
                    </td>
                    <td className="p-4">{ag.parceiro.nome}</td>
                    <td className="p-4 text-slate-400">
                      {new Date(ag.data_criacao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4 text-emerald-400">R$ {parseFloat(ag.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="p-4 pr-6 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        ag.status === 'pago' || ag.status === 'realizado'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                          : ag.status === 'pendente'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                      }`}>
                        {ag.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* NEW APPOINTMENT MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-8 max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-850 flex justify-between items-center bg-slate-900/50">
                <div>
                  <h3 className="text-xl font-bold text-white">Novo Agendamento</h3>
                  <p className="text-xs text-slate-400">Preencha os dados e fature o pedido no caixa</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-850 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {caixaError && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="w-5 h-5 text-rose-400" />
                      <span>{caixaError}</span>
                    </div>
                    <Link
                      href="/dashboard/caixa"
                      className="px-3 py-1.5 bg-rose-500 text-white rounded-xl font-semibold text-xs hover:bg-rose-600 transition-all"
                    >
                      Ir para Caixa
                    </Link>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* LEFT COLUMN: Patient & Rep */}
                  <div className="space-y-6">
                    {/* Patient Selection */}
                    <div className="p-5 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-4">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        Paciente / Cliente
                      </label>
                      
                      {!selectedClient ? (
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                          <input
                            type="text"
                            placeholder="Buscar paciente por nome ou CPF..."
                            value={searchClient}
                            onChange={(e) => setSearchClient(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all text-sm"
                          />
                          
                          {clientsFound.length > 0 && (
                            <div className="absolute left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-850">
                              {clientsFound.map((c) => (
                                <button
                                  key={c.id_cliente}
                                  type="button"
                                  onClick={() => {
                                    setSelectedClient(c);
                                    setClientsFound([]);
                                    setSearchClient('');
                                  }}
                                  className="w-full px-4 py-3 text-left hover:bg-slate-850 flex justify-between items-center cursor-pointer transition-colors text-sm"
                                >
                                  <span className="font-semibold text-white">{c.nome}</span>
                                  <span className="text-xs text-slate-500 font-mono">CPF: {c.cpf}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="block font-bold text-white text-sm">{selectedClient.nome}</span>
                            <span className="block text-xs text-slate-400 font-mono mt-0.5">CPF: {selectedClient.cpf}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedClient(null)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Representative selection */}
                    <div className="p-5 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                        Representante (Opcional)
                      </label>
                      <select
                        value={selectedRepId}
                        onChange={(e) => setSelectedRepId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                      >
                        <option value="">Nenhum Representante</option>
                        {representatives.map((r) => (
                          <option key={r.id_representante} value={r.id_representante}>
                            {r.nome}
                          </option>
                        ))}
                      </select>

                      {selectedRepId && (
                        <div className="space-y-1.5 pt-2">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                            Comissão do Representante (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={valorRepresentante}
                            onChange={(e) => setValorRepresentante(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm placeholder-slate-650 font-medium"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Partner/Procedures Builder */}
                  <div className="space-y-6">
                    <div className="p-5 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-4">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                        Adicionar Procedimento
                      </label>

                      {/* Partner selection */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Parceiro / Clínica</span>
                        <select
                          value={selectedPartnerId}
                          onChange={(e) => setSelectedPartnerId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs font-medium"
                        >
                          <option value="">Selecione um Parceiro</option>
                          {partners.map((p) => (
                            <option key={p.id_parceiro} value={p.id_parceiro}>
                              {p.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Procedure selection */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Procedimento</span>
                        <select
                          value={selectedProcId}
                          onChange={(e) => setSelectedProcId(e.target.value)}
                          disabled={!selectedPartnerId}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs font-medium disabled:opacity-50"
                        >
                          <option value="">Selecione o procedimento</option>
                          {partnerProcedures.map((pp) => (
                            <option key={pp.id_parceiro_procedimento} value={pp.id_parceiro_procedimento}>
                              {pp.nome} (R$ {parseFloat(pp.valor_total).toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Qty & Discount */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Qtd.</span>
                          <input
                            type="number"
                            min="1"
                            value={procQty}
                            onChange={(e) => setProcQty(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs font-medium"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Desconto (R$)</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={procDiscount}
                            onChange={(e) => setProcDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs font-medium"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddProcedure}
                        disabled={!selectedProcId}
                        className="w-full py-2 bg-slate-950 hover:bg-slate-850 border border-slate-850 rounded-xl text-white font-semibold text-xs cursor-pointer disabled:opacity-50 transition-colors"
                      >
                        + Adicionar Procedimento
                      </button>
                    </div>
                  </div>
                </div>

                {/* ADDED PROCEDURES TABLE */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Procedimentos Inclusos</h4>
                  {addedProcs.length === 0 ? (
                    <div className="p-8 border border-slate-800 border-dashed rounded-2xl text-center text-slate-500 text-sm">
                      Nenhum procedimento inserido. Adicione no painel ao lado.
                    </div>
                  ) : (
                    <div className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-850 bg-slate-950 text-slate-500 uppercase tracking-wider font-semibold">
                            <th className="p-3">Parceiro</th>
                            <th className="p-3">Procedimento</th>
                            <th className="p-3">Qtd</th>
                            <th className="p-3">Valor Un.</th>
                            <th className="p-3">Desconto</th>
                            <th className="p-3">Subtotal</th>
                            <th className="p-3 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 text-slate-300 font-medium">
                          {addedProcs.map((item, index) => {
                            const subtotal = Number(item.valor_total) * item.quantidade - item.desconto;
                            return (
                              <tr key={index} className="hover:bg-slate-900/50">
                                <td className="p-3">{item.nome_parceiro}</td>
                                <td className="p-3 text-white">{item.nome}</td>
                                <td className="p-3">{item.quantidade}</td>
                                <td className="p-3">R$ {parseFloat(item.valor_total).toFixed(2)}</td>
                                <td className="p-3 text-rose-400">- R$ {item.desconto.toFixed(2)}</td>
                                <td className="p-3 text-emerald-400">R$ {subtotal.toFixed(2)}</td>
                                <td className="p-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveProcedure(index)}
                                    className="p-1 hover:bg-slate-800 rounded text-rose-400 hover:text-rose-300 cursor-pointer transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* BILLING & PAYMENT SUMMARY */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-850">
                  {/* Left Column: Totals Summary */}
                  <div className="p-5 bg-slate-950 border border-slate-850 rounded-2xl space-y-3.5 text-sm text-slate-400">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Resumo Financeiro</span>
                    <div className="flex justify-between">
                      <span>Total Procedimentos:</span>
                      <span className="text-white font-semibold">R$ {totalProcs.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Comissão Repasse (Representante):</span>
                      <span className="text-white font-semibold">R$ {Number(valorRepresentante || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Adicional Cartão:</span>
                      <span className="text-white font-semibold">R$ {parseFloat(adicionalCartao || '0').toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800 pt-2 text-base font-bold text-white">
                      <span>Total Geral a Cobrar:</span>
                      <span className="text-emerald-400 font-extrabold">R$ {totalToPay.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Right Column: Payment Inputs */}
                  <div className="p-5 bg-slate-950 border border-slate-850 rounded-2xl space-y-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" />
                      Faturamento do Agendamento
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Espécie (R$)</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={pagoEspecie}
                          onChange={(e) => setPagoEspecie(e.target.value)}
                          className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">PIX (R$)</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={pagoPix}
                          onChange={(e) => setPagoPix(e.target.value)}
                          className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Cartão (R$)</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={pagoCartao}
                          onChange={(e) => setPagoCartao(e.target.value)}
                          className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Adicional (R$)</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={adicionalCartao}
                          onChange={(e) => setAdicionalCartao(e.target.value)}
                          className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs font-medium"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm pt-2">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-400">Troco Calculado:</span>
                        <span className="text-amber-400 font-bold mt-0.5">R$ {troco.toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">Total Recebido:</span>
                        <span className="text-white font-bold">R$ {totalPaid.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </form>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-850 bg-slate-900/50 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-850 rounded-xl text-slate-400 hover:text-white cursor-pointer hover:bg-slate-850 transition-all text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || addedProcs.length === 0 || !selectedClient || !!caixaError}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white cursor-pointer rounded-xl text-xs font-bold transition-all"
                >
                  {submitting ? 'Salvando...' : 'Confirmar Agendamento'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
