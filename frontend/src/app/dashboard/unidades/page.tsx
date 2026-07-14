'use client';

import React, { useEffect, useState } from 'react';
import { Building, Plus, Edit, Trash2, MapPin, RefreshCw, AlertCircle, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UnidadesPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [unidades, setUnidades] = useState<any[]>([]);
  const [cidades, setCidades] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  // Form State
  const [label, setLabel] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cep, setCep] = useState('');
  const [idCidade, setIdCidade] = useState('');
  const [formError, setFormError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Delete Confirm State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUnidades = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/unidades', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar unidades.');
      }

      setUnidades(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCidades = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/cidades', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (response.ok && Array.isArray(data)) {
        setCidades(data);
        if (data.length > 0) {
          setIdCidade(data[0].id_cidade);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar cidades:', err);
    }
  };

  useEffect(() => {
    fetchUnidades();
    fetchCidades();
  }, []);

  const openAddModal = () => {
    setEditingUnitId(null);
    setLabel('');
    setLogradouro('');
    setNumero('');
    setBairro('');
    setCep('');
    if (cidades.length > 0) {
      setIdCidade(cidades[0].id_cidade);
    } else {
      setIdCidade('');
    }
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (unit: any) => {
    setEditingUnitId(unit.id_unidade);
    setLabel(unit.label);
    setLogradouro(unit.endereco?.logradouro || '');
    setNumero(unit.endereco?.numero || '');
    setBairro(unit.endereco?.bairro || '');
    setCep(unit.endereco?.cep || '');
    setIdCidade(unit.endereco?.id_cidade || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setFormError('O nome da unidade é obrigatório.');
      return;
    }

    setSaveLoading(true);
    setFormError('');

    try {
      const token = localStorage.getItem('token');
      const payload = {
        label,
        logradouro,
        numero,
        bairro,
        cep,
        id_cidade: idCidade ? Number(idCidade) : undefined
      };

      const url = editingUnitId
        ? `http://localhost:3000/api/unidades/${editingUnitId}`
        : 'http://localhost:3000/api/unidades';

      const method = editingUnitId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar unidade.');
      }

      setIsModalOpen(false);
      fetchUnidades();
    } catch (err: any) {
      setFormError(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/unidades/${deleteConfirmId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao excluir unidade.');
      }

      setDeleteConfirmId(null);
      fetchUnidades();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir unidade.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Building className="w-7 h-7 text-emerald-400" />
            Unidades Operacionais
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Cadastre, edite e gerencie as unidades e filiais da rede Otium.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          Nova Unidade
        </button>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800/80">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
          <span>Carregando unidades...</span>
        </div>
      ) : errorMsg ? (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : unidades.length === 0 ? (
        <div className="text-center py-16 text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800/80">
          <Building className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p>Nenhuma unidade cadastrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {unidades.map((unit) => (
            <motion.div
              key={unit.id_unidade}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/10">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base tracking-tight">{unit.label}</h3>
                      <span className="text-xs text-slate-500">ID: {unit.id_unidade}</span>
                    </div>
                  </div>
                </div>

                <div className="text-slate-400 text-sm space-y-2.5 pt-2 border-t border-slate-800/80">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400/80 mt-0.5 flex-shrink-0" />
                    <span className="leading-snug">
                      {unit.endereco?.logradouro}, {unit.endereco?.numero}<br />
                      {unit.endereco?.bairro} - CEP {unit.endereco?.cep}<br />
                      {unit.endereco?.cidade} - {unit.endereco?.uf}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-5 pt-4 border-t border-slate-800/80">
                <button
                  onClick={() => openEditModal(unit)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/50 px-3 py-2 rounded-lg transition-all cursor-pointer font-medium"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button
                  onClick={() => setDeleteConfirmId(unit.id_unidade)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-rose-500/10 border border-slate-700/50 hover:border-rose-500/10 px-3 py-2 rounded-lg transition-all cursor-pointer font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between">
                <h3 className="font-bold text-white text-lg">
                  {editingUnitId ? 'Editar Unidade' : 'Cadastrar Nova Unidade'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Nome da Unidade / Filial *
                  </label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    required
                    placeholder="Ex: Filial Parnaíba"
                    className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Logradouro (Rua/Avenida)
                    </label>
                    <input
                      type="text"
                      value={logradouro}
                      onChange={(e) => setLogradouro(e.target.value)}
                      placeholder="Ex: Av. Presidente Vargas"
                      className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Número
                    </label>
                    <input
                      type="text"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      placeholder="Ex: 123"
                      className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      placeholder="Ex: Centro"
                      className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      CEP
                    </label>
                    <input
                      type="text"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      placeholder="Ex: 64200-000"
                      className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Cidade / UF
                  </label>
                  <select
                    value={idCidade}
                    onChange={(e) => setIdCidade(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
                  >
                    {cidades.map((c) => (
                      <option key={c.id_cidade} value={c.id_cidade}>
                        {c.nome} - {c.uf}
                      </option>
                    ))}
                  </select>
                </div>

                {formError && (
                  <p className="text-xs text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {formError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {saveLoading ? 'Salvando...' : 'Confirmar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800/80 rounded-2xl w-full max-w-md p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-2">Excluir Unidade</h3>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Tem certeza que deseja excluir esta unidade operacional? Esta ação não poderá ser desfeita.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {deleteLoading ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
