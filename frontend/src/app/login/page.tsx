'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Activity, ShieldCheck, Heart, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'E-mail ou senha inválidos.');
      }

      setSuccessMsg('Login realizado com sucesso! Redirecionando...');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setTimeout(() => {
        if (data.user.role.level >= 50) {
          router.push('/dashboard');
        } else {
          router.push('/parceiro');
        }
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro de rede. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-950 font-sans text-slate-100 antialiased overflow-hidden">
      
      {/* Brand Side (Visible on Large Screens) */}
      <div className="hidden lg:flex lg:col-span-7 relative flex-col justify-between p-12 bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-900 border-r border-slate-800/50 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px]" />

        {/* Brand Header */}
        <div className="flex items-center space-x-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Activity className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">Otium</span>
        </div>

        {/* Hero Section */}
        <div className="my-auto z-10 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/50 border border-emerald-800/30 rounded-full">
              Nova Era de Saúde Digital
            </span>
            <h1 className="text-5xl font-extrabold tracking-tight text-white mt-6 leading-tight">
              A saúde que <br />
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                você merece.
              </span>
            </h1>
            <p className="text-slate-400 text-lg mt-4 leading-relaxed">
              Agendamentos rápidos, consultas simplificadas e uma experiência personalizada para o seu bem-estar completo.
            </p>
          </motion.div>

          {/* Core Features list */}
          <div className="grid grid-cols-2 gap-6 mt-12">
            {[
              { icon: ShieldCheck, title: "Segurança Total", desc: "Seus dados de saúde protegidos." },
              { icon: Heart, title: "Foco no Bem-Estar", desc: "Médicos qualificados ao seu dispor." }
            ].map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
                className="flex flex-col space-y-2 p-4 bg-slate-900/50 border border-slate-800/30 rounded-2xl backdrop-blur-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <feat.icon className="w-4.5 h-4.5" />
                </div>
                <span className="font-semibold text-white text-sm">{feat.title}</span>
                <span className="text-slate-500 text-xs">{feat.desc}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-500 z-10">
          &copy; {new Date().getFullYear()} Otium. Todos os direitos reservados.
        </div>
      </div>

      {/* Form Side */}
      <div className="lg:col-span-5 flex flex-col justify-center px-6 sm:px-12 md:px-20 lg:px-16 xl:px-24 py-12 relative">
        {/* Mobile top logo */}
        <div className="flex items-center space-x-2 lg:hidden absolute top-8 left-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center">
            <Activity className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Otium</span>
        </div>

        <div className="w-full max-w-md mx-auto">
          {/* Form Header */}
          <div className="flex flex-col space-y-2 mb-10">
            <h2 className="text-3xl font-bold text-white tracking-tight">Acesse o portal</h2>
            <p className="text-slate-400 text-sm">Insira seus dados para entrar na sua conta.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Notifications panel */}
            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-start space-x-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-2xl text-sm"
                >
                  <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}

              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-start space-x-3 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 rounded-2xl text-sm"
                >
                  <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Input */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-slate-300 text-xs font-semibold tracking-wide uppercase">Endereço de e-mail</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                <input
                  type="email"
                  required
                  placeholder="exemplo@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium text-sm"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 text-xs font-semibold tracking-wide uppercase">Sua senha</label>
                <a href="#/esqueci-minha-senha" className="text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-colors hover:underline">
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium text-sm"
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/10 active:scale-[0.98] disabled:opacity-75 disabled:pointer-events-none flex items-center justify-center space-x-2 group text-sm cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar na conta</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Create account section */}
          <div className="mt-8 text-center text-sm text-slate-500">
            Ainda não tem cadastro?{' '}
            <a href="#/cadastro" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
              Criar uma conta
            </a>
          </div>
        </div>

        {/* Mobile Bottom Copy */}
        <div className="lg:hidden text-center text-xs text-slate-600 absolute bottom-6 left-0 right-0">
          &copy; {new Date().getFullYear()} Otium. Todos os direitos reservados.
        </div>
      </div>

    </div>
  );
}
