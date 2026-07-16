'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, MapPin, Lock, Eye, EyeOff,
  Save, CheckCircle2, AlertCircle, Camera, RefreshCw,
  Shield, ChevronDown, Edit3, KeyRound
} from 'lucide-react';

const API = 'http://localhost:3000';

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatCpf(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatPhone(v: string) {
  const d = v.replace(/\D/g, '');
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

function formatCep(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{5})(\d{0,3})/, '$1-$2');
}

// ─── Sub-components ────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-slate-800/60 flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </motion.div>
  );
}

function Field({
  label, value, onChange, type = 'text', placeholder = '', required = false, readOnly = false, mask
}: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; readOnly?: boolean;
  mask?: (v: string) => string;
}) {
  return (
    <div className="flex flex-col space-y-1.5">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {label} {required && <span className="text-emerald-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={e => {
          if (!onChange) return;
          const val = mask ? mask(e.target.value) : e.target.value;
          onChange(val);
        }}
        className={`w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 border transition-all outline-none
          ${readOnly
            ? 'bg-slate-950/60 border-slate-800/40 text-slate-500 cursor-not-allowed'
            : 'bg-slate-950/60 border-slate-700/60 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10'
          }`}
      />
    </div>
  );
}

function Alert({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium border ${
            type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const router = useRouter();

  // Profile state
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cidades, setCidades] = useState<any[]>([]);

  // Edit form state
  const [nome, setNome] = useState('');
  const [nomeSocial, setNomeSocial] = useState('');
  const [sexo, setSexo] = useState('M');
  const [dataNasc, setDataNasc] = useState('');
  const [telefone, setTelefone] = useState('');
  const [telefone2, setTelefone2] = useState('');

  // Address
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [idCidade, setIdCidade] = useState('');

  // Password
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmaSenha, setShowConfirmaSenha] = useState(false);

  // Feedback
  const [profileMsg, setProfileMsg] = useState({ type: '' as 'success' | 'error', text: '' });
  const [senhaMsg, setSenhaMsg] = useState({ type: '' as 'success' | 'error', text: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingsenha, setSavingPassword] = useState(false);

  // Photo upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    Promise.all([
      fetch(`${API}/api/cliente/perfil`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/api/public/cidades`).then(r => r.json())
    ]).then(([profileData, cidadesData]) => {
      setProfile(profileData);
      setCidades(Array.isArray(cidadesData) ? cidadesData : []);

      // Populate form
      const pf = profileData.pf || {};
      const end = profileData.endereco || {};
      setNome(pf.nome || '');
      setNomeSocial(pf.nome_social || '');
      setSexo(pf.sexo === false ? 'F' : 'M');
      setDataNasc(pf.data_nascimento ? pf.data_nascimento.slice(0, 10) : '');
      setTelefone(pf.telefone || '');
      setTelefone2(pf.telefone2 || '');
      setCep(end.cep || '');
      setLogradouro(end.logradouro || '');
      setNumero(end.numero || '');
      setComplemento(end.complemento || '');
      setBairro(end.bairro || '');
      setIdCidade(end.id_cidade ? String(end.id_cidade) : '');
      if (profileData.foto) setPhotoPreview(profileData.foto);
    }).catch(console.error).finally(() => setIsLoading(false));
  }, [router]);

  const handleViaCep = async () => {
    const raw = cep.replace(/\D/g, '');
    if (raw.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setLogradouro(d.logradouro || '');
        setBairro(d.bairro || '');
        const found = cidades.find(c => c.nome.toLowerCase().includes((d.localidade || '').toLowerCase()));
        if (found) setIdCidade(String(found.id_cidade));
      }
    } catch { /* silent */ }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSavingProfile(true);
    setProfileMsg({ type: 'success', text: '' });
    try {
      const body = {
        nome, nome_social: nomeSocial || null, sexo,
        data_nascimento: dataNasc,
        telefone, telefone2: telefone2 || null,
        cep: cep.replace(/\D/g, ''), logradouro, numero,
        complemento: complemento || null, bairro,
        id_cidade: Number(idCidade),
        foto: photoPreview || null
      };
      const res = await fetch(`${API}/api/cliente/perfil`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMsg({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      } else {
        setProfileMsg({ type: 'error', text: data.error || 'Erro ao atualizar perfil.' });
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Erro de conexão com o servidor.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!senhaAtual || !novaSenha || !confirmaSenha) {
      setSenhaMsg({ type: 'error', text: 'Preencha todos os campos de senha.' });
      return;
    }
    if (novaSenha.length < 6) {
      setSenhaMsg({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }
    if (novaSenha !== confirmaSenha) {
      setSenhaMsg({ type: 'error', text: 'A confirmação não confere com a nova senha.' });
      return;
    }

    setSavingPassword(true);
    setSenhaMsg({ type: 'success', text: '' });
    try {
      const res = await fetch(`${API}/api/cliente/trocar-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ senha_atual: senhaAtual, nova_senha: novaSenha })
      });
      const data = await res.json();
      if (res.ok) {
        setSenhaMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
        setSenhaAtual(''); setNovaSenha(''); setConfirmaSenha('');
      } else {
        setSenhaMsg({ type: 'error', text: data.error || 'Erro ao alterar senha.' });
      }
    } catch {
      setSenhaMsg({ type: 'error', text: 'Erro de conexão com o servidor.' });
    } finally {
      setSavingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span>Carregando perfil...</span>
      </div>
    );
  }

  const pf = profile?.pf || {};

  return (
    <div className="space-y-8 pb-12">

      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <User className="w-5 h-5 text-slate-950" />
            </div>
            Meu Perfil
          </h1>
          <p className="text-sm text-slate-500 mt-1 ml-12">Gerencie suas informações pessoais e segurança</p>
        </div>
      </motion.div>

      {/* Avatar + Read-only info */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-800/70 rounded-2xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6"
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-24 h-24 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center overflow-hidden">
            {photoPreview
              ? <img src={photoPreview} alt="Foto de perfil" className="w-full h-full object-cover" />
              : <User className="w-12 h-12 text-emerald-400/60" />
            }
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
            title="Alterar foto"
          >
            <Camera className="w-4 h-4 text-white" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>

        {/* Basic info */}
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl font-bold text-white">{pf.nome || '—'}</h2>
          {pf.nome_social && <p className="text-sm text-emerald-400 font-medium mt-0.5">Nome social: {pf.nome_social}</p>}
          <p className="text-sm text-slate-400 mt-1 flex items-center justify-center sm:justify-start gap-1.5">
            <Mail className="w-3.5 h-3.5" /> {pf.email}
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700/50">
              <Shield className="w-3 h-3 text-emerald-400" /> CPF: {formatCpf(pf.cpf || '')}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
              Matrícula: {profile?.matricula}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${
              profile?.convenio === 'Particular'
                ? 'bg-slate-800 text-slate-400 border-slate-700/50'
                : 'bg-blue-500/10 text-blue-400 border-blue-500/15'
            }`}>
              {profile?.convenio} — {profile?.plano}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Personal Data */}
      <SectionCard title="Dados Pessoais" icon={Edit3}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Nome completo" value={nome} onChange={setNome} required placeholder="Seu nome completo" />
          <Field label="Nome social" value={nomeSocial} onChange={setNomeSocial} placeholder="Opcional" />
          <Field label="CPF" value={formatCpf(pf.cpf || '')} readOnly />
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sexo <span className="text-emerald-400">*</span></label>
            <select
              value={sexo}
              onChange={e => setSexo(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white bg-slate-950/60 border border-slate-700/60 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </div>
          <Field label="Data de nascimento" value={dataNasc} onChange={setDataNasc} type="date" required />
          <Field label="E-mail" value={pf.email || ''} readOnly />
          <Field label="Telefone principal" value={telefone} onChange={v => setTelefone(formatPhone(v))} placeholder="(00) 00000-0000" required mask={formatPhone} />
          <Field label="Telefone secundário" value={telefone2} onChange={v => setTelefone2(formatPhone(v))} placeholder="Opcional" mask={formatPhone} />
        </div>

        <div className="mt-5 space-y-2">
          <Alert type={profileMsg.type} message={profileMsg.text} />
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              {savingProfile
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Salvando...</>
                : <><Save className="w-4 h-4" /> Salvar Dados Pessoais</>
              }
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Address */}
      <SectionCard title="Endereço" icon={MapPin}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* CEP with auto-fill */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CEP</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={cep}
                onChange={e => setCep(formatCep(e.target.value))}
                onBlur={handleViaCep}
                maxLength={9}
                placeholder="00000-000"
                className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white bg-slate-950/60 border border-slate-700/60 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all"
              />
            </div>
            <p className="text-[10px] text-slate-600">Sai do campo para buscar automaticamente</p>
          </div>

          <div className="md:col-span-2">
            <Field label="Logradouro" value={logradouro} onChange={setLogradouro} placeholder="Rua, Av., etc." />
          </div>

          <Field label="Número" value={numero} onChange={setNumero} placeholder="123" />
          <Field label="Complemento" value={complemento} onChange={setComplemento} placeholder="Apto, Bloco, etc." />
          <Field label="Bairro" value={bairro} onChange={setBairro} placeholder="Seu bairro" />

          <div className="md:col-span-3 flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cidade <span className="text-emerald-400">*</span></label>
            <select
              value={idCidade}
              onChange={e => setIdCidade(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white bg-slate-950/60 border border-slate-700/60 focus:border-emerald-500/60 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="">Selecione a cidade</option>
              {cidades.map(c => (
                <option key={c.id_cidade} value={c.id_cidade}>{c.nome} — {c.uf}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-5">
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            {savingProfile
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Salvando...</>
              : <><Save className="w-4 h-4" /> Salvar Endereço</>
            }
          </button>
        </div>
      </SectionCard>

      {/* Password */}
      <SectionCard title="Alterar Senha" icon={KeyRound}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Current password */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Senha atual <span className="text-emerald-400">*</span></label>
            <div className="relative">
              <input
                type={showSenhaAtual ? 'text' : 'password'}
                value={senhaAtual}
                onChange={e => setSenhaAtual(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm text-white bg-slate-950/60 border border-slate-700/60 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all"
              />
              <button type="button" onClick={() => setShowSenhaAtual(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors">
                {showSenhaAtual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nova senha <span className="text-emerald-400">*</span></label>
            <div className="relative">
              <input
                type={showNovaSenha ? 'text' : 'password'}
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
                placeholder="Mín. 6 caracteres"
                className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm text-white bg-slate-950/60 border border-slate-700/60 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all"
              />
              <button type="button" onClick={() => setShowNovaSenha(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors">
                {showNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Strength bar */}
            {novaSenha && (
              <div className="flex gap-1 mt-1">
                {[1,2,3,4].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                    novaSenha.length >= i * 3
                      ? novaSenha.length >= 12 ? 'bg-emerald-400' : novaSenha.length >= 8 ? 'bg-yellow-400' : 'bg-rose-400'
                      : 'bg-slate-700'
                  }`} />
                ))}
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confirmar nova senha <span className="text-emerald-400">*</span></label>
            <div className="relative">
              <input
                type={showConfirmaSenha ? 'text' : 'password'}
                value={confirmaSenha}
                onChange={e => setConfirmaSenha(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm text-white bg-slate-950/60 border border-slate-700/60 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all"
              />
              <button type="button" onClick={() => setShowConfirmaSenha(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors">
                {showConfirmaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmaSenha && novaSenha && (
              <p className={`text-[11px] font-medium mt-1 ${confirmaSenha === novaSenha ? 'text-emerald-400' : 'text-rose-400'}`}>
                {confirmaSenha === novaSenha ? '✓ Senhas conferem' : '✗ Senhas não conferem'}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <Alert type={senhaMsg.type} message={senhaMsg.text} />
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-slate-600 flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> A senha deve ter no mínimo 6 caracteres
            </p>
            <button
              onClick={handleChangePassword}
              disabled={savingsenha}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-all cursor-pointer"
            >
              {savingsenha
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Salvando...</>
                : <><Lock className="w-4 h-4" /> Alterar Senha</>
              }
            </button>
          </div>
        </div>
      </SectionCard>

    </div>
  );
}
