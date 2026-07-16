'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, User, Phone, MapPin, Mail, Lock, ShieldCheck, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function ClienteCadastro() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [cidades, setCidades] = useState<any[]>([]);

  // Form Fields
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [sexo, setSexo] = useState('M'); // 'M' or 'F'
  const [dataNascimento, setDataNascimento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [telefone2, setTelefone2] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  
  // Address
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [idCidade, setIdCidade] = useState('');

  // Covenant
  const [convenio, setConvenio] = useState('Particular');
  const [plano, setPlano] = useState('Básico');

  // Status/Messages
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    // Fetch public cities for the selector
    fetch('http://localhost:3000/api/public/cidades')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCidades(data);
          if (data.length > 0) {
            setIdCidade(data[0].id_cidade.toString());
          }
        }
      })
      .catch(err => console.error('Erro ao buscar cidades públicas:', err));
  }, []);

  const handleNextStep = () => {
    setErrorMsg('');
    if (step === 1) {
      if (!nome || !cpf || !dataNascimento || !sexo) {
        setErrorMsg('Por favor, preencha os dados pessoais obrigatórios.');
        return;
      }
    } else if (step === 2) {
      if (!telefone || !email || !senha) {
        setErrorMsg('Por favor, preencha o telefone, e-mail e senha.');
        return;
      }
      if (senha.length < 4) {
        setErrorMsg('A senha deve conter no mínimo 4 caracteres.');
        return;
      }
    }
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!logradouro || !bairro || !cep || !idCidade) {
      setErrorMsg('Por favor, preencha as informações de endereço.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/register-cliente', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome,
          cpf,
          rg,
          sexo: sexo === 'M',
          data_nascimento: dataNascimento,
          telefone,
          telefone2,
          email,
          senha,
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          id_cidade: Number(idCidade),
          convenio,
          plano
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao realizar o cadastro.');
      }

      setSuccessMsg('Cadastro realizado com sucesso! Redirecionando para o login...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro ao enviar os dados. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased flex flex-col justify-center items-center py-12 px-4 relative">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[120px]" />

      {/* Brand Top Logo */}
      <Link href="/login" className="flex items-center space-x-2.5 mb-8 z-10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Activity className="w-5 h-5 text-slate-950 stroke-[2.5]" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">Otium</span>
      </Link>

      <div className="w-full max-w-xl bg-slate-900 border border-slate-800/80 rounded-3xl p-6 md:p-10 shadow-2xl relative z-10">
        
        {/* Step Indicator Headers */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-800/60 pb-6">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Cadastro de Cliente</h2>
            <p className="text-slate-400 text-xs mt-1">Crie sua carteirinha digital e faça agendamentos rápidos.</p>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-3 py-1 rounded-full uppercase tracking-wider">
            Etapa {step} de 3
          </span>
        </div>

        {/* Notifications panel */}
        <AnimatePresence mode="wait">
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-start space-x-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-2xl text-sm mb-6"
            >
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start space-x-3 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 rounded-2xl text-sm mb-6"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Step 1: Personal Information */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center space-x-2 text-slate-300 font-semibold text-sm uppercase tracking-wider mb-2">
                <User className="w-4 h-4 text-emerald-400" />
                <span>Dados Pessoais</span>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-slate-400 text-xs font-medium">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-400 text-xs font-medium">CPF *</label>
                  <input
                    type="text"
                    required
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-400 text-xs font-medium">RG (Identidade)</label>
                  <input
                    type="text"
                    value={rg}
                    onChange={(e) => setRg(e.target.value)}
                    placeholder="Número do RG"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-400 text-xs font-medium">Data de Nascimento *</label>
                  <input
                    type="date"
                    required
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-400 text-xs font-medium">Gênero *</label>
                  <select
                    value={sexo}
                    onChange={(e) => setSexo(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Contact & Credentials */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center space-x-2 text-slate-300 font-semibold text-sm uppercase tracking-wider mb-2">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Contato & Acesso</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-400 text-xs font-medium">Telefone Principal *</label>
                  <input
                    type="text"
                    required
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-400 text-xs font-medium">Telefone Secundário</label>
                  <input
                    type="text"
                    value={telefone2}
                    onChange={(e) => setTelefone2(e.target.value)}
                    placeholder="Outro telefone"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-slate-400 text-xs font-medium">Endereço de E-mail *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500 text-sm font-medium"
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-slate-400 text-xs font-medium">Senha de Acesso *</label>
                <input
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500 text-sm font-medium"
                />
              </div>
            </motion.div>
          )}

          {/* Step 3: Address & Convenio */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center space-x-2 text-slate-300 font-semibold text-sm uppercase tracking-wider mb-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Endereço & Convênio</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col space-y-1.5 md:col-span-1">
                  <label className="text-slate-400 text-xs font-medium">CEP *</label>
                  <input
                    type="text"
                    required
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="00000-000"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>
                <div className="flex flex-col space-y-1.5 md:col-span-2">
                  <label className="text-slate-400 text-xs font-medium">Logradouro *</label>
                  <input
                    type="text"
                    required
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    placeholder="Rua, Avenida, etc."
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col space-y-1.5 md:col-span-1">
                  <label className="text-slate-400 text-xs font-medium">Número *</label>
                  <input
                    type="text"
                    required
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="Nº"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>
                <div className="flex flex-col space-y-1.5 md:col-span-2">
                  <label className="text-slate-400 text-xs font-medium">Complemento</label>
                  <input
                    type="text"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    placeholder="Apto, Bloco, etc. (Opcional)"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-400 text-xs font-medium">Bairro *</label>
                  <input
                    type="text"
                    required
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    placeholder="Nome do Bairro"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-400 text-xs font-medium">Cidade *</label>
                  <select
                    value={idCidade}
                    onChange={(e) => setIdCidade(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  >
                    {cidades.map((c) => (
                      <option key={c.id_cidade} value={c.id_cidade.toString()}>
                        {c.nome} ({c.uf})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/60 pt-4 mt-2">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-400 text-xs font-medium">Convênio</label>
                  <input
                    type="text"
                    value={convenio}
                    onChange={(e) => setConvenio(e.target.value)}
                    placeholder="Otium / Particular / Outro"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-slate-400 text-xs font-medium">Plano</label>
                  <input
                    type="text"
                    value={plano}
                    onChange={(e) => setPlano(e.target.value)}
                    placeholder="Básico / Gold / Premium"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-650 focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Action buttons */}
          <div className="flex justify-between gap-3 pt-6 border-t border-slate-800/60">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-5 py-3 bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold rounded-2xl text-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="px-5 py-3 bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold rounded-2xl text-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Cancelar</span>
              </Link>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-2xl text-sm transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer"
              >
                <span>Avançar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-2xl text-sm transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer disabled:opacity-70 disabled:pointer-events-none"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Concluir Cadastro</span>
                    <ShieldCheck className="w-4.5 h-4.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="mt-8 text-center text-sm text-slate-500">
        Já possui cadastro?{' '}
        <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
          Fazer Login
        </Link>
      </div>
    </div>
  );
}
