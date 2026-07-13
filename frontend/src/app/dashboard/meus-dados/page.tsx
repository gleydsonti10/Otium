'use client';

import React, { useEffect, useState } from 'react';
import { User, Mail, Phone, Calendar, Clipboard, ShieldCheck, AlertCircle, RefreshCw, Save } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MeusDadosPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [nomeSocial, setNomeSocial] = useState('');
  const [sexo, setSexo] = useState(true); // true = Masculino, false = Feminino
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [telefone2, setTelefone2] = useState('');
  const [pai, setPai] = useState('');
  const [mae, setMae] = useState('');
  const [responsavel, setResponsavel] = useState('');

  useEffect(() => {
    const fetchPerfil = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/meus-dados', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao carregar dados do perfil.');
        }

        setEmail(data.email);
        if (data.pf) {
          setNome(data.pf.nome || '');
          setNomeSocial(data.pf.nome_social || '');
          setSexo(data.pf.sexo);
          setCpf(data.pf.cpf || '');
          setRg(data.pf.rg || '');
          // Format date for input: YYYY-MM-DD
          if (data.pf.data_nascimento) {
            setDataNascimento(data.pf.data_nascimento.split('T')[0]);
          }
          setTelefone(data.pf.telefone || '');
          setTelefone2(data.pf.telefone2 || '');
          setPai(data.pf.pai || '');
          setMae(data.pf.mae || '');
          setResponsavel(data.pf.responsavel || '');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro de conexão com o servidor.');
      } finally {
        setLoading(false);
      }
    };

    fetchPerfil();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const token = localStorage.getItem('token');
      const payload: any = {
        email,
        pf: {
          nome,
          nome_social: nomeSocial,
          sexo,
          cpf,
          rg,
          data_nascimento: dataNascimento,
          telefone,
          telefone2,
          pai,
          mae,
          responsavel
        }
      };

      if (senha) {
        payload.senha = senha;
      }

      const response = await fetch('http://localhost:3000/api/meus-dados', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar alterações.');
      }

      setSuccessMsg('Perfil atualizado com sucesso!');
      setSenha(''); // Clear password field after success
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <span className="mt-4 text-sm">Carregando dados do perfil...</span>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 flex flex-col space-y-8 max-w-4xl">
      <header className="flex flex-col space-y-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Meus Dados</h1>
        <p className="text-slate-400 text-sm">
          Visualize e edite as informações da sua conta e dados pessoais.
        </p>
      </header>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl flex items-center space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-2xl flex items-center space-x-3 text-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Account Data Card */}
        <div className="p-6 bg-slate-900/60 border border-slate-850 rounded-3xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Mail className="w-5 h-5 text-emerald-400" />
            <span>Dados da Conta</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col space-y-1.5">
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">E-mail de Acesso</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:border-emerald-500/80 transition-all text-sm"
              />
            </div>
            
            <div className="flex flex-col space-y-1.5">
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Nova Senha (deixe em branco para manter)</label>
              <input
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:border-emerald-500/80 transition-all text-sm"
              />
            </div>
          </div>
        </div>

        {/* Personal Data Card */}
        <div className="p-6 bg-slate-900/60 border border-slate-850 rounded-3xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <User className="w-5 h-5 text-emerald-400" />
            <span>Dados Pessoais</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Full Name */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Nome Completo</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-emerald-500/80 transition-all text-sm"
              />
            </div>

            {/* Social Name */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Nome Social</label>
              <input
                type="text"
                value={nomeSocial}
                onChange={(e) => setNomeSocial(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-emerald-500/80 transition-all text-sm"
              />
            </div>

            {/* Gender Select */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Gênero</label>
              <select
                value={sexo ? 'true' : 'false'}
                onChange={(e) => setSexo(e.target.value === 'true')}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-emerald-500/80 transition-all text-sm cursor-pointer"
              >
                <option value="true">Masculino</option>
                <option value="false">Feminino</option>
              </select>
            </div>

            {/* Birth Date */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Data de Nascimento</label>
              <input
                type="date"
                required
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-emerald-500/80 transition-all text-sm cursor-pointer"
              />
            </div>

            {/* CPF */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">CPF</label>
              <input
                type="text"
                required
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-emerald-500/80 transition-all text-sm font-mono"
              />
            </div>

            {/* RG */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">RG</label>
              <input
                type="text"
                value={rg}
                onChange={(e) => setRg(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-emerald-500/80 transition-all text-sm font-mono"
              />
            </div>

            {/* Telephone 1 */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Telefone Principal</label>
              <input
                type="tel"
                required
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-emerald-500/80 transition-all text-sm"
              />
            </div>

            {/* Telephone 2 */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Telefone Adicional</label>
              <input
                type="tel"
                value={telefone2}
                onChange={(e) => setTelefone2(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-emerald-500/80 transition-all text-sm"
              />
            </div>

            {/* Mother's name */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Nome da Mãe</label>
              <input
                type="text"
                value={mae}
                onChange={(e) => setMae(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-emerald-500/80 transition-all text-sm"
              />
            </div>

            {/* Father's name */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Nome do Pai</label>
              <input
                type="text"
                value={pai}
                onChange={(e) => setPai(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-emerald-500/80 transition-all text-sm"
              />
            </div>

            {/* Legal guardian */}
            <div className="flex flex-col space-y-1.5 md:col-span-2">
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Responsável Legal</label>
              <input
                type="text"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-emerald-500/80 transition-all text-sm"
              />
            </div>

          </div>
        </div>

        {/* Save button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto relative px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/10 active:scale-[0.98] disabled:opacity-75 disabled:pointer-events-none flex items-center justify-center space-x-2 group text-sm cursor-pointer"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4.5 h-4.5" />
              <span>Salvar Alterações</span>
            </>
          )}
        </button>

      </form>
    </div>
  );
}
