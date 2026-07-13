'use client';

import React, { useEffect, useState } from 'react';
import { Search, X, AlertCircle, RefreshCw, PlusCircle, Shield, Key, Eye, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UsuariosPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals & Panel
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userId, setUserId] = useState('');

  // Form Fields
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [idRole, setIdRole] = useState('');
  const [status, setStatus] = useState(1); // 1 = Ativo, 0 = Inativo
  
  // Associated physical person details (needed for user creation)
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/usuarios', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao carregar usuários.');
      setUsersList(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/roles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setRoles(data);
        if (data.length > 0 && !idRole) {
          setIdRole(data[0].id_role);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const initData = async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchRoles()]);
    setLoading(false);
  };

  useEffect(() => {
    initData();
  }, []);

  const openCreateModal = () => {
    setIsEditing(false);
    setUserId('');
    setEmail('');
    setSenha('');
    setIdRole(roles[0]?.id_role || '');
    setStatus(1);
    setNome('');
    setCpf('');
    setTelefone('');
    setErrorMsg('');
    setShowFormModal(true);
  };

  const openEditModal = (u: any) => {
    setIsEditing(true);
    setUserId(u.id_usuario);
    setEmail(u.email);
    setSenha(''); // Clear password, only update if filled
    setIdRole(u.role.id_role);
    setStatus(u.status);
    setNome(u.nome_usuario);
    setCpf(u.cpf_cnpj || '');
    setTelefone('');
    setErrorMsg('');
    setShowFormModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const token = localStorage.getItem('token');

    const payload: any = {
      email,
      id_role: idRole,
      status,
      nome,
      cpf
    };

    if (senha) payload.senha = senha;
    if (telefone) payload.telefone = telefone;

    try {
      const url = isEditing
        ? `http://localhost:3000/api/usuarios/${userId}`
        : 'http://localhost:3000/api/usuarios';
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
      if (!response.ok) throw new Error(data.error || 'Erro ao salvar usuário.');

      setShowFormModal(false);
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.nome_usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.cpf_cnpj && u.cpf_cnpj.includes(searchTerm));
    
    const matchesStatus =
      statusFilter === '' ||
      u.status.toString() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
        <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
        <span className="mt-4 text-slate-400 text-sm">Carregando usuários do sistema...</span>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 flex flex-col space-y-8 relative">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Usuários</h1>
          <p className="text-slate-400 text-sm">Administre os usuários credenciados no portal e gerencie níveis de acesso.</p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-2.5 bg-gradient-to-tr from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-[0.98] cursor-pointer"
        >
          <PlusCircle className="w-4.5 h-4.5" />
          <span>Novo Usuário</span>
        </button>
      </header>

      {/* Filter and search controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 justify-between items-center bg-slate-900/40 p-4 border border-slate-850 rounded-2xl">
        <div className="relative w-full sm:col-span-2 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
          <input
            type="text"
            placeholder="Pesquisar por e-mail, nome ou documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80 transition-all text-sm"
          />
        </div>

        <div className="flex flex-col space-y-1.5 w-full">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
          >
            <option value="">Todos os Status</option>
            <option value="1">Ativo</option>
            <option value="0">Inativo</option>
          </select>
        </div>
      </div>

      {/* Table content */}
      <div className="border border-slate-850 bg-slate-900/20 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-850 bg-slate-900/40 text-slate-400 font-semibold">
              <th className="p-4">Nome / Email</th>
              <th className="p-4">CPF</th>
              <th className="p-4">Perfil</th>
              <th className="p-4">Último Acesso</th>
              <th className="p-4">Status</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850/50">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => (
                <tr key={u.id_usuario} className="hover:bg-slate-900/40 text-slate-300">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-white">{u.nome_usuario}</span>
                      <span className="text-xs text-slate-500">{u.email}</span>
                    </div>
                  </td>
                  <td className="p-4">{u.cpf_cnpj || '-'}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 text-slate-300">
                      <Shield className="w-4 h-4 text-emerald-450" />
                      {u.role.nome} (Lvl {u.role.level})
                    </span>
                  </td>
                  <td className="p-4 text-xs text-slate-500">
                    {u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleString('pt-BR') : 'Nunca'}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                      u.status === 1 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-450'
                    }`}>
                      {u.status === 1 ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    <button
                      onClick={() => openEditModal(u)}
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
                <td colSpan={6} className="p-8 text-center text-slate-500">Nenhum usuário encontrado.</td>
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
                  {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
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
                  <label className="text-slate-300 text-xs font-semibold uppercase">Email (Credencial)</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-300 text-xs font-semibold uppercase">Senha</label>
                  <input
                    type="password"
                    required={!isEditing}
                    placeholder={isEditing ? 'Preencha apenas para alterar' : '••••••••'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-300 text-xs font-semibold uppercase">Perfil / Nível Acesso</label>
                  <select
                    value={idRole}
                    onChange={(e) => setIdRole(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  >
                    {roles.map((r) => (
                      <option key={r.id_role} value={r.id_role}>
                        {r.nome} (Nível {r.level})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-300 text-xs font-semibold uppercase">Status</label>
                  <select
                    value={status.toString()}
                    onChange={(e) => setStatus(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  >
                    <option value="1">Ativo</option>
                    <option value="0">Inativo</option>
                  </select>
                </div>

                <h4 className="text-sm font-bold text-slate-400 md:col-span-2 border-b border-slate-850 pb-1 mt-2">Dados Pessoais (Para Novo Cadastro)</h4>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-300 text-xs font-semibold uppercase">Nome Completo</label>
                  <input
                    type="text"
                    required
                    disabled={isEditing}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium disabled:opacity-50"
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-300 text-xs font-semibold uppercase">CPF (Apenas números)</label>
                  <input
                    type="text"
                    required
                    disabled={isEditing}
                    placeholder="12345678900"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium disabled:opacity-50"
                  />
                </div>

                {!isEditing && (
                  <div className="flex flex-col space-y-1.5 md:col-span-2">
                    <label className="text-slate-300 text-xs font-semibold uppercase">Telefone</label>
                    <input
                      type="text"
                      placeholder="(99) 99999-9999"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                    />
                  </div>
                )}

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
      </AnimatePresence>
    </div>
  );
}
