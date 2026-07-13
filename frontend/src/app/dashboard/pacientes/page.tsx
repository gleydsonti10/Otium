'use client';

import React, { useEffect, useState } from 'react';
import { Users, Search, Eye, X, AlertCircle, RefreshCw, Calendar, Phone, Mail, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PacientesPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Drawer states
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientDetails, setPatientDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchPatients = async (query = '') => {
    try {
      const token = localStorage.getItem('token');
      const url = query 
        ? `http://localhost:3000/api/clientes?search=${encodeURIComponent(query)}`
        : 'http://localhost:3000/api/clientes';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar pacientes.');
      }

      setPatients(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPatients(searchTerm);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleOpenDetails = async (id: string) => {
    setSelectedPatientId(id);
    setLoadingDetails(true);
    setPatientDetails(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/clientes/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar detalhes.');
      }

      setPatientDetails(data);
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar paciente.');
      setSelectedPatientId(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredPatients = patients;

  return (
    <div className="p-6 lg:p-10 flex flex-col space-y-8 relative">
      <header className="flex flex-col space-y-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Pacientes</h1>
        <p className="text-slate-400 text-sm">
          Gerencie e consulte o cadastro de pacientes da rede **Otium**.
        </p>
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
      {errorMsg ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl flex items-center space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          <span className="mt-4 text-sm">Carregando pacientes...</span>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="py-20 border border-slate-800/50 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-500">
          <Users className="w-12 h-12 text-slate-600 mb-3" />
          <span className="text-sm">Nenhum paciente localizado para a busca atual.</span>
        </div>
      ) : (
        <div className="overflow-x-auto bg-slate-900/40 border border-slate-850 rounded-3xl">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-850 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <th className="p-4 pl-6">Nome</th>
                <th className="p-4">CPF</th>
                <th className="p-4">Telefone</th>
                <th className="p-4">E-mail</th>
                <th className="p-4">Cidade / Estado</th>
                <th className="p-4 pr-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 font-medium text-slate-300">
              {filteredPatients.map((p) => (
                <tr key={p.id_cliente} className="hover:bg-slate-900/30 transition-colors">
                  <td className="p-4 pl-6 text-white font-semibold">{p.nome}</td>
                  <td className="p-4 font-mono text-slate-300">{p.cpf || 'N/A'}</td>
                  <td className="p-4 text-slate-400">{p.telefone || 'N/A'}</td>
                  <td className="p-4 text-slate-400">{p.email || 'N/A'}</td>
                  <td className="p-4 text-slate-400">{p.cidade} - {p.estado}</td>
                  <td className="p-4 pr-6 text-right">
                    <button
                      onClick={() => handleOpenDetails(p.id_cliente)}
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
        {selectedPatientId && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-end">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-xl h-screen bg-slate-900 border-l border-slate-850 p-6 lg:p-8 flex flex-col justify-between overflow-y-auto"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-850 pb-4 mb-6">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Ficha Médica</span>
                    <span className="text-lg font-bold text-white mt-1">Detalhes do Paciente</span>
                  </div>
                  <button
                    onClick={() => setSelectedPatientId(null)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {loadingDetails ? (
                  <div className="py-24 flex flex-col items-center justify-center text-slate-400">
                    <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                    <span className="mt-4 text-sm">Carregando detalhes do paciente...</span>
                  </div>
                ) : patientDetails ? (
                  <div className="space-y-6 text-sm text-slate-300">
                    {/* General Summary Card */}
                    <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-lg font-extrabold">
                        {patientDetails.pf.nome.charAt(0)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-white font-bold truncate text-base">{patientDetails.pf.nome}</span>
                        <span className="text-xs text-slate-500">Status: {patientDetails.status === 1 ? 'ATIVO' : 'INATIVO'}</span>
                      </div>
                    </div>

                    {/* Personal Info */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider text-emerald-400">Dados Pessoais</h4>
                      <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950/60 border border-slate-850/60 rounded-2xl">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Nome Social</span>
                          <span className="text-white font-medium mt-0.5">{patientDetails.pf.nome_social || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">CPF</span>
                          <span className="text-white font-mono mt-0.5">{patientDetails.pf.cpf || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">RG</span>
                          <span className="text-white font-mono mt-0.5">{patientDetails.pf.rg || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Data de Nascimento</span>
                          <span className="text-white font-medium mt-0.5">
                            {patientDetails.pf.data_nascimento ? new Date(patientDetails.pf.data_nascimento).toLocaleDateString('pt-BR') : 'N/A'}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Telefone Principal</span>
                          <span className="text-white font-medium mt-0.5">{patientDetails.pf.telefone || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">E-mail</span>
                          <span className="text-white font-medium mt-0.5 truncate">{patientDetails.pf.email || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Parents & Guardians */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider text-emerald-400">Filiação e Responsável</h4>
                      <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950/60 border border-slate-850/60 rounded-2xl">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Mãe</span>
                          <span className="text-white font-medium mt-0.5">{patientDetails.pf.mae || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Pai</span>
                          <span className="text-white font-medium mt-0.5">{patientDetails.pf.pai || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col col-span-2">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Responsável Legal</span>
                          <span className="text-white font-medium mt-0.5">{patientDetails.pf.responsavel || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Address details */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider text-emerald-400">Endereço</h4>
                      <div className="p-4 bg-slate-950/60 border border-slate-850/60 rounded-2xl flex items-start space-x-3">
                        <MapPin className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                        <div className="flex flex-col">
                          <span className="text-white font-medium">
                            {patientDetails.endereco.logradouro}, {patientDetails.endereco.numero}
                          </span>
                          <span className="text-xs text-slate-400">
                            {patientDetails.endereco.bairro} - {patientDetails.endereco.cidade}/{patientDetails.endereco.estado}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono mt-1">CEP: {patientDetails.endereco.cep}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
