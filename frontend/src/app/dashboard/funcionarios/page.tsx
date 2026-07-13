'use client';

import React, { useEffect, useState } from 'react';
import { Users, Search, Eye, X, AlertCircle, RefreshCw, PlusCircle, Building, Trash2, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FuncionariosPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Panels
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form fields
  const [empId, setEmpId] = useState('');
  const [nome, setNome] = useState('');
  const [nomeSocial, setNomeSocial] = useState('');
  const [sexo, setSexo] = useState(true); // true = M, false = F or other mapping (boolean in DB)
  const [dataNascimento, setDataNascimento] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [telefone, setTelefone] = useState('');
  const [telefone2, setTelefone2] = useState('');
  const [email, setEmail] = useState('');
  const [pai, setPai] = useState('');
  const [mae, setMae] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [idUnidade, setIdUnidade] = useState('');

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/funcionarios', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao carregar funcionários.');
      setEmployees(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const fetchUnits = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/unidades', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao carregar unidades.');
      setUnits(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const initData = async () => {
    setLoading(true);
    await Promise.all([fetchEmployees(), fetchUnits()]);
    setLoading(false);
  };

  useEffect(() => {
    initData();
  }, []);

  const openCreateModal = () => {
    setIsEditing(false);
    setEmpId('');
    setNome('');
    setNomeSocial('');
    setSexo(true);
    setDataNascimento('');
    setCpf('');
    setRg('');
    setTelefone('');
    setTelefone2('');
    setEmail('');
    setPai('');
    setMae('');
    setResponsavel('');
    setIdUnidade(units[0]?.id_unidade || '');
    setShowFormModal(true);
  };

  const openEditModal = (e: any) => {
    setIsEditing(true);
    setEmpId(e.id_funcionario);
    setNome(e.nome);
    setNomeSocial(e.nome_social || '');
    setSexo(e.sexo);
    // Format date YYYY-MM-DD
    setDataNascimento(e.data_nascimento ? e.data_nascimento.substring(0, 10) : '');
    setCpf(e.cpf);
    setRg(e.rg || '');
    setTelefone(e.telefone);
    setTelefone2(e.telefone2 || '');
    setEmail(e.email || '');
    setPai(e.pai || '');
    setMae(e.mae || '');
    setResponsavel(e.responsavel || '');
    setIdUnidade(e.id_unidade);
    setShowFormModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const token = localStorage.getItem('token');

    const payload = {
      nome,
      nome_social: nomeSocial,
      sexo,
      data_nascimento: dataNascimento,
      cpf,
      rg,
      telefone,
      telefone2,
      email,
      pai,
      mae,
      responsavel,
      id_unidade: idUnidade
    };

    try {
      const url = isEditing
        ? `http://localhost:3000/api/funcionarios/${empId}`
        : 'http://localhost:3000/api/funcionarios';
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
      if (!response.ok) throw new Error(data.error || 'Erro ao salvar funcionário.');

      setShowFormModal(false);
      fetchEmployees();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este funcionário?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/funcionarios/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao excluir funcionário.');
      fetchEmployees();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredEmployees = employees.filter((e) =>
    e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.cpf.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
        <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
        <span className="mt-4 text-slate-400 text-sm">Carregando portal de funcionários...</span>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 flex flex-col space-y-8 relative">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Funcionários</h1>
          <p className="text-slate-400 text-sm">Gerencie o cadastro de colaboradores e a lotação de unidades.</p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-2.5 bg-gradient-to-tr from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-[0.98] cursor-pointer"
        >
          <PlusCircle className="w-4.5 h-4.5" />
          <span>Novo Funcionário</span>
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
              <th className="p-4">Unidade</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850/50">
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((e) => (
                <tr key={e.id_funcionario} className="hover:bg-slate-900/40 text-slate-300">
                  <td className="p-4 font-semibold text-white">{e.nome}</td>
                  <td className="p-4">{e.cpf}</td>
                  <td className="p-4">{e.telefone}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 text-emerald-400">
                      <Building className="w-4 h-4 text-emerald-500" />
                      {e.unidade_label}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    <button
                      onClick={() => setSelectedEmp(e)}
                      title="Visualizar detalhes"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(e)}
                      title="Editar"
                      className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(e.id_funcionario)}
                      title="Excluir"
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">Nenhum funcionário encontrado.</td>
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
              className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-2xl flex flex-col space-y-6 my-8"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">
                  {isEditing ? 'Editar Funcionário' : 'Novo Funcionário'}
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
                <div className="flex flex-col space-y-1.5">
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
                  <label className="text-slate-300 text-xs font-semibold uppercase">Nome Social</label>
                  <input
                    type="text"
                    value={nomeSocial}
                    onChange={(e) => setNomeSocial(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-300 text-xs font-semibold uppercase">CPF (Apenas números)</label>
                  <input
                    type="text"
                    required
                    disabled={isEditing}
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium disabled:opacity-50"
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-300 text-xs font-semibold uppercase">RG</label>
                  <input
                    type="text"
                    value={rg}
                    onChange={(e) => setRg(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-300 text-xs font-semibold uppercase">Data de Nascimento</label>
                  <input
                    type="date"
                    required
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-300 text-xs font-semibold uppercase">Sexo / Gênero</label>
                  <select
                    value={sexo ? 'true' : 'false'}
                    onChange={(e) => setSexo(e.target.value === 'true')}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  >
                    <option value="true">Masculino</option>
                    <option value="false">Feminino</option>
                  </select>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-300 text-xs font-semibold uppercase">Telefone Principal</label>
                  <input
                    type="text"
                    required
                    placeholder="(99) 99999-9999"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-300 text-xs font-semibold uppercase">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-300 text-xs font-semibold uppercase">Lotação (Unidade)</label>
                  <select
                    value={idUnidade}
                    onChange={(e) => setIdUnidade(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  >
                    {units.map((u) => (
                      <option key={u.id_unidade} value={u.id_unidade}>
                        {u.label}
                      </option>
                    ))}
                  </select>
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

        {/* View Details Drawer */}
        {selectedEmp && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div className="flex flex-col space-y-6">
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
                  <h3 className="text-xl font-bold text-white">Detalhes do Funcionário</h3>
                  <button onClick={() => setSelectedEmp(null)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col space-y-4 text-sm">
                  <div>
                    <span className="text-slate-500 block text-xs font-semibold uppercase">Nome</span>
                    <span className="text-white font-medium text-base">{selectedEmp.nome}</span>
                  </div>

                  {selectedEmp.nome_social && (
                    <div>
                      <span className="text-slate-500 block text-xs font-semibold uppercase">Nome Social</span>
                      <span className="text-white font-medium">{selectedEmp.nome_social}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-500 block text-xs font-semibold uppercase">CPF</span>
                      <span className="text-white font-medium">{selectedEmp.cpf}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs font-semibold uppercase">RG</span>
                      <span className="text-white font-medium">{selectedEmp.rg || '-'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-500 block text-xs font-semibold uppercase">Nascimento</span>
                      <span className="text-white font-medium">
                        {new Date(selectedEmp.data_nascimento).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs font-semibold uppercase">Gênero</span>
                      <span className="text-white font-medium">{selectedEmp.sexo ? 'Masculino' : 'Feminino'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-xs font-semibold uppercase">Telefone</span>
                    <span className="text-white font-medium">{selectedEmp.telefone}</span>
                  </div>

                  {selectedEmp.email && (
                    <div>
                      <span className="text-slate-500 block text-xs font-semibold uppercase">E-mail</span>
                      <span className="text-white font-medium">{selectedEmp.email}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-500 block text-xs font-semibold uppercase">Unidade de Lotação</span>
                    <span className="text-emerald-400 font-bold block mt-1">{selectedEmp.unidade_label}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800/80">
                <button
                  onClick={() => setSelectedEmp(null)}
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
