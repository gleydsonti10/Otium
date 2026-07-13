'use client';

import React, { useEffect, useState } from 'react';
import { Building, Search, Eye, X, AlertCircle, RefreshCw, CreditCard, Clock, Phone, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ParceirosPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [partners, setPartners] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Drawer states
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [partnerDetails, setPartnerDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Partner Procedures states
  const [partnerProcedures, setPartnerProcedures] = useState<any[]>([]);
  const [globalProcedures, setGlobalProcedures] = useState<any[]>([]);
  
  // Add Procedure Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedGlobalProcId, setSelectedGlobalProcId] = useState('');
  const [valorParceiro, setValorParceiro] = useState('');
  const [valorComissao, setValorComissao] = useState('');
  const [observacao, setObservacao] = useState('');
  const [horarioAtendimento, setHorarioAtendimento] = useState('');

  // Edit Partner Procedure states
  const [editingPpId, setEditingPpId] = useState<string | null>(null);
  const [editValorParceiro, setEditValorParceiro] = useState('');
  const [editValorComissao, setEditValorComissao] = useState('');
  const [editObservacao, setEditObservacao] = useState('');
  const [editHorarioAtendimento, setEditHorarioAtendimento] = useState('');

  // Edit Partner Details states
  const [isEditingPartnerDetails, setIsEditingPartnerDetails] = useState(false);
  const [editPartNome, setEditPartNome] = useState('');
  const [editPartHorario, setEditPartHorario] = useState('');
  const [editPartCiclo, setEditPartCiclo] = useState(30);
  const [editPartTelefone, setEditPartTelefone] = useState('');
  const [editPartBanco, setEditPartBanco] = useState('');
  const [editPartAgencia, setEditPartAgencia] = useState('');
  const [editPartConta, setEditPartConta] = useState('');
  const [editPartChavePix, setEditPartChavePix] = useState('');
  const [editPartRazaoSocial, setEditPartRazaoSocial] = useState('');
  const [editPartNomeFantasia, setEditPartNomeFantasia] = useState('');
  const [editPartPfNome, setEditPartPfNome] = useState('');
  const [editPartEmail, setEditPartEmail] = useState('');
  const [editPartCep, setEditPartCep] = useState('');
  const [editPartLogradouro, setEditPartLogradouro] = useState('');
  const [editPartNumero, setEditPartNumero] = useState('');
  const [editPartComplemento, setEditPartComplemento] = useState('');
  const [editPartBairro, setEditPartBairro] = useState('');

  const fetchPartners = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/parceiros', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar parceiros.');
      }

      setPartners(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleOpenDetails = async (id: string) => {
    setSelectedPartnerId(id);
    setLoadingDetails(true);
    setPartnerDetails(null);
    setPartnerProcedures([]);
    setShowAddForm(false);
    setSelectedGlobalProcId('');
    setValorParceiro('');
    setValorComissao('');
    setObservacao('');
    setHorarioAtendimento('');

    try {
      const token = localStorage.getItem('token');
      
       // 1. Fetch partner details
      const response = await fetch(`http://localhost:3000/api/parceiros/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao carregar detalhes.');
      setPartnerDetails(data);
      setIsEditingPartnerDetails(false);

      // Populate edit details states
      setEditPartNome(data.nome || '');
      setEditPartHorario(data.horario_funcionamento || '');
      setEditPartCiclo(data.ciclo_pagamento || 30);
      setEditPartTelefone(data.telefone || '');
      setEditPartBanco(data.banco || '');
      setEditPartAgencia(data.agencia || '');
      setEditPartConta(data.conta || '');
      setEditPartChavePix(data.chave_pix || '');
      
      if (data.tipo === 'PJ' && data.pj) {
        setEditPartRazaoSocial(data.pj.razao_social || '');
        setEditPartNomeFantasia(data.pj.nome_fantasia || '');
        setEditPartEmail(data.pj.email || '');
        setEditPartPfNome('');
      } else if (data.tipo === 'PF' && data.pf) {
        setEditPartPfNome(data.pf.nome || '');
        setEditPartEmail(data.pf.email || '');
        setEditPartRazaoSocial('');
        setEditPartNomeFantasia('');
      }

      if (data.endereco) {
        setEditPartCep(data.endereco.cep || '');
        setEditPartLogradouro(data.endereco.logradouro || '');
        setEditPartNumero(data.endereco.numero || '');
        setEditPartComplemento(data.endereco.complemento || '');
        setEditPartBairro(data.endereco.bairro || '');
      }

      // 2. Fetch partner procedures
      const procResponse = await fetch(`http://localhost:3000/api/parceiro-procedimentos/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const procData = await procResponse.json();
      if (procResponse.ok) {
        setPartnerProcedures(procData);
      }

      // 3. Fetch global procedures if not loaded
      if (globalProcedures.length === 0) {
        const globResponse = await fetch('http://localhost:3000/api/procedimentos', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const globData = await globResponse.json();
        if (globResponse.ok) {
          setGlobalProcedures(globData);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar parceiro.');
      setSelectedPartnerId(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAddPartnerProcedure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGlobalProcId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/parceiro-procedimentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_parceiro: selectedPartnerId,
          id_procedimento: selectedGlobalProcId,
          valor_parceiro: Number(valorParceiro || 0),
          comissao: Number(valorComissao || 0),
          observacao: observacao || null,
          horario_atendimento: horarioAtendimento || null
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao associar procedimento.');

      // Refresh partner procedures
      const procResponse = await fetch(`http://localhost:3000/api/parceiro-procedimentos/${selectedPartnerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const procData = await procResponse.json();
      if (procResponse.ok) {
        setPartnerProcedures(procData);
      }

      // Reset form fields
      setShowAddForm(false);
      setSelectedGlobalProcId('');
      setValorParceiro('');
      setValorComissao('');
      setObservacao('');
      setHorarioAtendimento('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeletePartnerProcedure = async (id_pp: string) => {
    if (!window.confirm('Tem certeza de que deseja remover este procedimento do parceiro?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/parceiro-procedimentos/${id_pp}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao remover procedimento.');

      // Refresh partner procedures
      const procResponse = await fetch(`http://localhost:3000/api/parceiro-procedimentos/${selectedPartnerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const procData = await procResponse.json();
      if (procResponse.ok) {
        setPartnerProcedures(procData);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStartEdit = (pp: any) => {
    setEditingPpId(pp.id_parceiro_procedimento);
    setEditValorParceiro(Number(pp.valor_parceiro).toString());
    setEditValorComissao(Number(pp.comissao).toString());
    setEditObservacao(pp.observacao || '');
    setEditHorarioAtendimento(pp.horario_atendimento || '');
  };

  const handleCancelEdit = () => {
    setEditingPpId(null);
  };

  const handleSaveEditPartnerProcedure = async (e: React.FormEvent, id_pp: string) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/parceiro-procedimentos/${id_pp}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          valor_parceiro: Number(editValorParceiro || 0),
          comissao: Number(editValorComissao || 0),
          observacao: editObservacao || null,
          horario_atendimento: editHorarioAtendimento || null
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao atualizar procedimento.');

      // Refresh partner procedures list
      const procResponse = await fetch(`http://localhost:3000/api/parceiro-procedimentos/${selectedPartnerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const procData = await procResponse.json();
      if (procResponse.ok) {
        setPartnerProcedures(procData);
      }

      setEditingPpId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSavePartnerDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/parceiros/${selectedPartnerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nome: editPartNome,
          horario_funcionamento: editPartHorario,
          ciclo_pagamento: Number(editPartCiclo),
          telefone: editPartTelefone,
          banco: editPartBanco,
          agencia: editPartAgencia,
          conta: editPartConta,
          chave_pix: editPartChavePix,
          endereco: {
            cep: editPartCep,
            logradouro: editPartLogradouro,
            numero: editPartNumero,
            complemento: editPartComplemento,
            bairro: editPartBairro
          },
          pj: partnerDetails?.tipo === 'PJ' ? {
            razao_social: editPartRazaoSocial,
            nome_fantasia: editPartNomeFantasia,
            email: editPartEmail
          } : null,
          pf: partnerDetails?.tipo === 'PF' ? {
            nome: editPartPfNome,
            email: editPartEmail
          } : null
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao salvar dados do parceiro.');

      // Refresh partner details
      const detailResponse = await fetch(`http://localhost:3000/api/parceiros/${selectedPartnerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const detailData = await detailResponse.json();
      if (detailResponse.ok) {
        setPartnerDetails(detailData);
      }

      // Refresh partners list
      fetchPartners();

      setIsEditingPartnerDetails(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredPartners = partners.filter((p) =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.cnpj_cpf && p.cnpj_cpf.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 lg:p-10 flex flex-col space-y-8 relative">
      <header className="flex flex-col space-y-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Parceiros</h1>
        <p className="text-slate-400 text-sm">
          Gerencie e consulte o cadastro de clínicas, laboratórios e médicos conveniados.
        </p>
      </header>

      {/* Filter and search controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/40 p-4 border border-slate-850 rounded-2xl">
        <div className="relative w-full sm:max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
          <input
            type="text"
            placeholder="Pesquisar por nome ou CNPJ/CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80 transition-all text-sm"
          />
        </div>
      </div>

      {/* Table content */}
      {errorMsg ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl flex items-center space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          <span className="mt-4 text-sm">Carregando parceiros...</span>
        </div>
      ) : filteredPartners.length === 0 ? (
        <div className="py-20 border border-slate-800/50 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-500">
          <Building className="w-12 h-12 text-slate-600 mb-3" />
          <span className="text-sm">Nenhum parceiro localizado para a busca atual.</span>
        </div>
      ) : (
        <div className="overflow-x-auto bg-slate-900/40 border border-slate-850 rounded-3xl">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-850 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <th className="p-4 pl-6">Nome</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">CNPJ/CPF</th>
                <th className="p-4">Telefone</th>
                <th className="p-4">Cidade / Estado</th>
                <th className="p-4 pr-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 font-medium text-slate-300">
              {filteredPartners.map((p) => (
                <tr key={p.id_parceiro} className="hover:bg-slate-900/30 transition-colors">
                  <td className="p-4 pl-6 text-white font-semibold">{p.nome}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-md bg-slate-850 border border-slate-700 text-xs uppercase font-bold">
                      {p.tipo}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-slate-300">{p.cnpj_cpf || 'N/A'}</td>
                  <td className="p-4 text-slate-400">{p.telefone || 'N/A'}</td>
                  <td className="p-4 text-slate-400">{p.cidade} - {p.estado}</td>
                  <td className="p-4 pr-6 text-right">
                    <button
                      onClick={() => handleOpenDetails(p.id_parceiro)}
                      className="p-2 bg-slate-800 hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-400 border border-slate-800/80 hover:border-emerald-500/10 rounded-xl transition-all cursor-pointer inline-flex items-center space-x-1"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="text-xs hidden sm:inline">Visualizar</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Side Drawer */}
      <AnimatePresence>
        {selectedPartnerId && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-end">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-3xl h-screen bg-slate-900 border-l border-slate-850 p-6 lg:p-8 flex flex-col justify-between overflow-y-auto"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-850 pb-4 mb-6">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Dados do Estabelecimento</span>
                    <span className="text-lg font-bold text-white mt-1">
                      {isEditingPartnerDetails ? 'Editar Parceiro' : 'Detalhes do Parceiro'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {partnerDetails && (
                      <button
                        onClick={() => setIsEditingPartnerDetails(!isEditingPartnerDetails)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-400 transition-all cursor-pointer"
                      >
                        {isEditingPartnerDetails ? 'Voltar' : 'Editar Dados'}
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedPartnerId(null)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {loadingDetails ? (
                  <div className="py-24 flex flex-col items-center justify-center text-slate-400">
                    <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                    <span className="mt-4 text-sm">Carregando detalhes do parceiro...</span>
                  </div>
                ) : partnerDetails ? (
                  isEditingPartnerDetails ? (
                    <form onSubmit={handleSavePartnerDetails} className="space-y-6 text-sm text-slate-300">
                      {/* Identificação Geral */}
                      <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex flex-col space-y-4">
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider text-emerald-400">Identificação Geral</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col space-y-1">
                            <label className="text-[10px] text-slate-500 uppercase font-semibold">Nome do Parceiro</label>
                            <input
                              type="text"
                              required
                              value={editPartNome}
                              onChange={(e) => setEditPartNome(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="flex flex-col space-y-1">
                            <label className="text-[10px] text-slate-500 uppercase font-semibold">Telefone</label>
                            <input
                              type="text"
                              value={editPartTelefone}
                              onChange={(e) => setEditPartTelefone(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col space-y-1">
                            <label className="text-[10px] text-slate-500 uppercase font-semibold">Horário de Funcionamento</label>
                            <input
                              type="text"
                              value={editPartHorario}
                              onChange={(e) => setEditPartHorario(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="flex flex-col space-y-1">
                            <label className="text-[10px] text-slate-500 uppercase font-semibold">Ciclo de Pagamento (dias)</label>
                            <input
                              type="number"
                              required
                              value={editPartCiclo}
                              onChange={(e) => setEditPartCiclo(Number(e.target.value))}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        {partnerDetails.tipo === 'PJ' ? (
                          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-900">
                            <div className="flex flex-col space-y-1">
                              <label className="text-[10px] text-slate-500 uppercase font-semibold">Razão Social</label>
                              <input
                                type="text"
                                value={editPartRazaoSocial}
                                onChange={(e) => setEditPartRazaoSocial(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div className="flex flex-col space-y-1">
                              <label className="text-[10px] text-slate-500 uppercase font-semibold">Nome Fantasia</label>
                              <input
                                type="text"
                                value={editPartNomeFantasia}
                                onChange={(e) => setEditPartNomeFantasia(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col space-y-1 pt-2 border-t border-slate-900">
                            <label className="text-[10px] text-slate-500 uppercase font-semibold">Nome Completo</label>
                            <input
                              type="text"
                              value={editPartPfNome}
                              onChange={(e) => setEditPartPfNome(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        )}

                        <div className="flex flex-col space-y-1">
                          <label className="text-[10px] text-slate-500 uppercase font-semibold">Email do Parceiro</label>
                          <input
                            type="email"
                            value={editPartEmail}
                            onChange={(e) => setEditPartEmail(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Repasse bancário */}
                      <div className="p-4 bg-slate-950/60 border border-slate-850/60 rounded-2xl flex flex-col space-y-4">
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider text-emerald-400">Dados de Repasse Bancário</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="flex flex-col space-y-1">
                            <label className="text-[10px] text-slate-500 uppercase font-semibold">Banco</label>
                            <input
                              type="text"
                              value={editPartBanco}
                              onChange={(e) => setEditPartBanco(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="flex flex-col space-y-1">
                            <label className="text-[10px] text-slate-500 uppercase font-semibold">Agência</label>
                            <input
                              type="text"
                              value={editPartAgencia}
                              onChange={(e) => setEditPartAgencia(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="flex flex-col space-y-1">
                            <label className="text-[10px] text-slate-500 uppercase font-semibold">Conta Corrente</label>
                            <input
                              type="text"
                              value={editPartConta}
                              onChange={(e) => setEditPartConta(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <label className="text-[10px] text-slate-500 uppercase font-semibold">Chave Pix</label>
                          <input
                            type="text"
                            placeholder="CPF, CNPJ, Email, Telefone ou Chave Aleatória"
                            value={editPartChavePix}
                            onChange={(e) => setEditPartChavePix(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Endereço */}
                      <div className="p-4 bg-slate-950/60 border border-slate-850/60 rounded-2xl flex flex-col space-y-4">
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider text-emerald-400">Endereço</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="flex flex-col space-y-1 col-span-1">
                            <label className="text-[10px] text-slate-500 uppercase font-semibold">CEP</label>
                            <input
                              type="text"
                              value={editPartCep}
                              onChange={(e) => setEditPartCep(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="flex flex-col space-y-1 col-span-2">
                            <label className="text-[10px] text-slate-500 uppercase font-semibold">Logradouro / Rua</label>
                            <input
                              type="text"
                              value={editPartLogradouro}
                              onChange={(e) => setEditPartLogradouro(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="flex flex-col space-y-1">
                            <label className="text-[10px] text-slate-500 uppercase font-semibold">Número</label>
                            <input
                              type="text"
                              value={editPartNumero}
                              onChange={(e) => setEditPartNumero(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="flex flex-col space-y-1">
                            <label className="text-[10px] text-slate-500 uppercase font-semibold">Bairro</label>
                            <input
                              type="text"
                              value={editPartBairro}
                              onChange={(e) => setEditPartBairro(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="flex flex-col space-y-1">
                            <label className="text-[10px] text-slate-500 uppercase font-semibold">Complemento</label>
                            <input
                              type="text"
                              value={editPartComplemento}
                              onChange={(e) => setEditPartComplemento(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-500/10 cursor-pointer text-center hover:opacity-90 font-bold"
                      >
                        Salvar Alterações do Parceiro
                      </button>
                    </form>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start text-sm text-slate-300">
                      {/* Left Column: Dados do Parceiro (col-span-2) */}
                      <div className="md:col-span-2 space-y-4">
                        {/* General Summary Card */}
                        <div className="p-3 bg-slate-950 border border-slate-850 rounded-2xl flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
                            <Building className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-white font-bold truncate text-sm">{partnerDetails.nome}</span>
                            <span className="text-[11px] text-slate-500">Tipo: {partnerDetails.tipo} - Status: Ativo</span>
                          </div>
                        </div>

                        {/* Operational Details */}
                        <div className="p-3.5 bg-slate-950/60 border border-slate-850/60 rounded-2xl space-y-3">
                          <h4 className="font-bold text-white text-[11px] uppercase tracking-wider text-emerald-400">Operação e Horários</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center space-x-1">
                                <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span>Horário de Funcionamento</span>
                              </span>
                              <span className="text-white font-medium mt-0.5">{partnerDetails.horario_funcionamento || 'N/A'}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-500 uppercase font-semibold">Ciclo de Pagamento</span>
                              <span className="text-white font-medium mt-0.5">{partnerDetails.ciclo_pagamento} dias</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-500 uppercase font-semibold">Razão Social / Nome de Registro</span>
                              <span className="text-white font-medium mt-0.5 truncate">
                                {partnerDetails.pj?.razao_social || partnerDetails.pf?.nome || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Financial details */}
                        <div className="p-3.5 bg-slate-950/60 border border-slate-850/60 rounded-2xl space-y-3">
                          <h4 className="font-bold text-white text-[11px] uppercase tracking-wider text-emerald-400">Repasse Bancário</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between border-b border-slate-900/60 pb-1">
                              <span className="text-slate-500">Banco</span>
                              <span className="text-white font-semibold">{partnerDetails.banco}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-900/60 pb-1">
                              <span className="text-slate-500">Agência</span>
                              <span className="text-white font-mono">{partnerDetails.agencia}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-900/60 pb-1">
                              <span className="text-slate-500">Conta Corrente</span>
                              <span className="text-white font-mono">{partnerDetails.conta}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Chave Pix</span>
                              <span className="text-white font-mono truncate max-w-[150px]" title={partnerDetails.chave_pix || ''}>
                                {partnerDetails.chave_pix || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Address details */}
                        <div className="p-3.5 bg-slate-950/60 border border-slate-850/60 rounded-2xl space-y-2">
                          <h4 className="font-bold text-white text-[11px] uppercase tracking-wider text-emerald-400">Endereço</h4>
                          <div className="text-xs space-y-1">
                            <div className="text-white font-medium">
                              {partnerDetails.endereco.logradouro}, {partnerDetails.endereco.numero}
                            </div>
                            <div className="text-slate-400">
                              {partnerDetails.endereco.bairro}
                            </div>
                            <div className="text-slate-400">
                              {partnerDetails.endereco.cidade} - {partnerDetails.endereco.estado}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              CEP: {partnerDetails.endereco.cep}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Procedimentos Credenciados (col-span-3) */}
                      <div className="md:col-span-3 space-y-4 border-l border-slate-850/50 pl-0 md:pl-6 flex flex-col h-full">
                        <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                          <h4 className="font-bold text-white text-xs uppercase tracking-wider text-emerald-455">Procedimentos Credenciados</h4>
                          {!showAddForm && (
                            <button
                              onClick={() => setShowAddForm(true)}
                              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            >
                              + Associar Procedimento
                            </button>
                          )}
                        </div>

                        {showAddForm ? (
                          <form onSubmit={handleAddPartnerProcedure} className="p-4 bg-slate-950/80 border border-slate-850 rounded-2xl flex flex-col space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                              <span className="text-xs font-bold text-white">Associar Novo Procedimento</span>
                              <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="text-slate-400 hover:text-white text-xs underline cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>

                            <div className="flex flex-col space-y-1">
                              <label className="text-[10px] text-slate-500 uppercase font-semibold">Procedimento Base</label>
                              <select
                                required
                                value={selectedGlobalProcId}
                                onChange={(e) => setSelectedGlobalProcId(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                              >
                                <option value="">Selecione um procedimento...</option>
                                {globalProcedures.map((gp) => (
                                  <option key={gp.id_procedimento} value={gp.id_procedimento}>
                                    {gp.nome} ({gp.especialidade || 'Geral'})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex flex-col space-y-1">
                                <label className="text-[10px] text-slate-500 uppercase font-semibold">Valor do Parceiro (R$)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  required
                                  placeholder="0.00"
                                  value={valorParceiro}
                                  onChange={(e) => setValorParceiro(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                              <div className="flex flex-col space-y-1">
                                <label className="text-[10px] text-slate-500 uppercase font-semibold">Valor Otium / Comissão (R$)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  required
                                  placeholder="0.00"
                                  value={valorComissao}
                                  onChange={(e) => setValorComissao(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>

                            {/* Calculated Total Readonly field */}
                            <div className="flex justify-between items-center px-3 py-2 bg-slate-900/60 rounded-xl text-xs">
                              <span className="text-slate-400 font-semibold">Valor Cobrado Total:</span>
                              <span className="text-white font-black text-sm">
                                R$ {(Number(valorParceiro || 0) + Number(valorComissao || 0)).toFixed(2)}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex flex-col space-y-1">
                                <label className="text-[10px] text-slate-500 uppercase font-semibold">Horário / Turno (opcional)</label>
                                <input
                                  type="text"
                                  placeholder="Ex: Seg a Sex das 8h às 12h"
                                  value={horarioAtendimento}
                                  onChange={(e) => setHorarioAtendimento(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                              <div className="flex flex-col space-y-1">
                                <label className="text-[10px] text-slate-500 uppercase font-semibold">Observações (opcional)</label>
                                <input
                                  type="text"
                                  placeholder="Notas ou observações específicas"
                                  value={observacao}
                                  onChange={(e) => setObservacao(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>

                            <button
                              type="submit"
                              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-500/10 cursor-pointer text-center"
                            >
                              Salvar Associação
                            </button>
                          </form>
                        ) : (
                          <div className="flex flex-col space-y-3 max-h-[75vh] overflow-y-auto pr-1">
                            {partnerProcedures.length > 0 ? (
                              partnerProcedures.map((pp) => {
                                const isEditingThis = editingPpId === pp.id_parceiro_procedimento;
                                if (isEditingThis) {
                                  return (
                                    <form
                                      key={pp.id_parceiro_procedimento}
                                      onSubmit={(e) => handleSaveEditPartnerProcedure(e, pp.id_parceiro_procedimento)}
                                      className="p-4 bg-slate-950 border border-emerald-500/30 rounded-2xl flex flex-col space-y-3"
                                    >
                                      <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                                        <span className="text-xs font-bold text-white">Editar: {pp.nome}</span>
                                        <button
                                          type="button"
                                          onClick={handleCancelEdit}
                                          className="text-slate-400 hover:text-white text-xs underline cursor-pointer"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col space-y-1">
                                          <label className="text-[10px] text-slate-500 uppercase font-semibold">Valor do Parceiro (R$)</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={editValorParceiro}
                                            onChange={(e) => setEditValorParceiro(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                                          />
                                        </div>
                                        <div className="flex flex-col space-y-1">
                                          <label className="text-[10px] text-slate-500 uppercase font-semibold">Valor Otium / Comissão (R$)</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={editValorComissao}
                                            onChange={(e) => setEditValorComissao(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                                          />
                                        </div>
                                      </div>

                                      {/* Total */}
                                      <div className="flex justify-between items-center px-3 py-2 bg-slate-900/60 rounded-xl text-xs">
                                        <span className="text-slate-400 font-semibold">Novo Valor Cobrado Total:</span>
                                        <span className="text-white font-black text-sm">
                                          R$ {(Number(editValorParceiro || 0) + Number(editValorComissao || 0)).toFixed(2)}
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col space-y-1">
                                          <label className="text-[10px] text-slate-500 uppercase font-semibold">Horário / Turno</label>
                                          <input
                                            type="text"
                                            value={editHorarioAtendimento}
                                            onChange={(e) => setEditHorarioAtendimento(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                                          />
                                        </div>
                                        <div className="flex flex-col space-y-1">
                                          <label className="text-[10px] text-slate-500 uppercase font-semibold">Observações</label>
                                          <input
                                            type="text"
                                            value={editObservacao}
                                            onChange={(e) => setEditObservacao(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                                          />
                                        </div>
                                      </div>

                                      <button
                                        type="submit"
                                        className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-500/10 cursor-pointer text-center"
                                      >
                                        Salvar Alterações
                                      </button>
                                    </form>
                                  );
                                }

                                return (
                                  <div key={pp.id_parceiro_procedimento} className="p-4 bg-slate-950/60 border border-slate-850/80 rounded-2xl flex flex-col space-y-3">
                                    <div className="flex justify-between items-start">
                                      <div className="flex flex-col">
                                        <span className="text-white font-bold text-sm">{pp.nome}</span>
                                        {pp.horario_atendimento && (
                                          <span className="text-xs text-slate-500 mt-0.5">{pp.horario_atendimento}</span>
                                        )}
                                        {pp.observacao && (
                                          <span className="text-[11px] text-slate-400 mt-1 italic">Obs: {pp.observacao}</span>
                                        )}
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleStartEdit(pp)}
                                          className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer text-xs"
                                        >
                                          Editar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeletePartnerProcedure(pp.id_parceiro_procedimento)}
                                          className="px-2.5 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 transition-all cursor-pointer text-xs"
                                        >
                                          Remover
                                        </button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-900 text-center">
                                      <div className="flex flex-col bg-slate-900/30 p-2 rounded-xl">
                                        <span className="text-[9px] text-slate-500 uppercase font-semibold">Parceiro</span>
                                        <span className="text-xs text-slate-300 font-bold mt-0.5">R$ {Number(pp.valor_parceiro).toFixed(2)}</span>
                                      </div>
                                      <div className="flex flex-col bg-slate-900/30 p-2 rounded-xl">
                                        <span className="text-[9px] text-slate-500 uppercase font-semibold">Otium</span>
                                        <span className="text-xs text-[#00ABE4] font-bold mt-0.5">R$ {Number(pp.comissao).toFixed(2)}</span>
                                      </div>
                                      <div className="flex flex-col bg-slate-900/30 p-2 rounded-xl">
                                        <span className="text-[9px] text-slate-500 uppercase font-semibold">Total Cobrado</span>
                                        <span className="text-xs text-emerald-450 font-bold mt-0.5">R$ {Number(pp.valor_total).toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="py-8 text-center text-slate-550 border border-slate-850 border-dashed rounded-2xl">
                                Nenhum procedimento credenciado.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                ) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
