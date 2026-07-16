'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CreditCard, Activity, ShieldCheck, Heart, User, Sparkles, RefreshCw } from 'lucide-react';

export default function CarteirinhaPage() {
  const router = useRouter();
  const [cardData, setCardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeTheme, setActiveTheme] = useState<'emerald' | 'dark' | 'gold'>('emerald');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch('http://localhost:3000/api/cliente/carteirinha', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setCardData(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar dados da carteirinha:', err);
        setIsLoading(false);
      });
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
        <span>Carregando sua credencial...</span>
      </div>
    );
  }

  const getThemeClass = () => {
    switch (activeTheme) {
      case 'dark':
        return 'from-slate-900 via-slate-950 to-slate-900 border-slate-700/60 shadow-slate-950/40 text-slate-100';
      case 'gold':
        return 'from-amber-950/70 via-slate-900 to-amber-950/60 border-amber-500/20 shadow-amber-500/5 text-amber-100';
      default: // emerald
        return 'from-emerald-950/60 via-slate-900 to-teal-950/50 border-emerald-500/20 shadow-emerald-500/5 text-slate-100';
    }
  };

  const getOverlayGlow = () => {
    switch (activeTheme) {
      case 'dark': return 'bg-slate-500/5';
      case 'gold': return 'bg-amber-400/10';
      default: return 'bg-emerald-400/10';
    }
  };

  const formatCPF = (c: string) => {
    if (!c) return '';
    const clean = c.replace(/\D/g, '');
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  return (
    <div className="space-y-10">
      
      {/* Header */}
      <div className="space-y-2">
        <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/50 border border-emerald-800/30 rounded-full">
          Credencial Digital
        </span>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Minha Carteirinha</h1>
        <p className="text-slate-400 text-sm max-w-xl">
          Sua credencial de associado digital. Apresente em clínicas ou parceiros credenciados juntamente com um documento oficial com foto.
        </p>
      </div>

      {/* Theme Selectors */}
      <div className="flex items-center space-x-3 bg-slate-900 p-2 border border-slate-800 rounded-2xl w-fit">
        <span className="text-xs text-slate-450 px-3 font-semibold uppercase tracking-wider">Estilo:</span>
        {[
          { key: 'emerald', label: 'Esmeralda', dot: 'bg-emerald-500' },
          { key: 'dark', label: 'Midnight', dot: 'bg-slate-400' },
          { key: 'gold', label: 'Golden Gold', dot: 'bg-amber-500' }
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTheme(t.key as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 border transition-all cursor-pointer ${
              activeTheme === t.key
                ? 'bg-slate-950 border-slate-700/60 text-white shadow-md shadow-slate-950/20'
                : 'bg-transparent border-transparent text-slate-450 hover:text-slate-200'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${t.dot}`} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Interactive Card Canvas */}
      <div className="flex flex-col items-center justify-center py-6">
        
        {/* Card Flip Container */}
        <div 
          onClick={() => setIsFlipped(!isFlipped)}
          className="relative w-full max-w-[420px] h-[250px] cursor-pointer group perspective-1000 select-none"
        >
          {/* Card Body */}
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className={`relative w-full h-full rounded-3xl border bg-gradient-to-br ${getThemeClass()} shadow-2xl backdrop-blur-md transform-style-3d p-6 flex flex-col justify-between overflow-hidden`}
          >
            
            {/* Front View */}
            <div className="absolute inset-0 p-6 flex flex-col justify-between backface-hidden">
              
              {/* Overlay glow */}
              <div className={`absolute top-0 right-0 w-[200px] h-[200px] ${getOverlayGlow()} rounded-full blur-[60px] pointer-events-none`} />

              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <Activity className="w-4.5 h-4.5 text-slate-950 stroke-[2.5]" />
                  </div>
                  <span className="text-lg font-bold tracking-tight text-white">Otium</span>
                </div>
                <span className="text-[10px] font-bold tracking-wider uppercase opacity-80 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Beneficiário
                </span>
              </div>

              {/* Card Name / Credentials */}
              <div className="space-y-1">
                <span className="block text-[10px] uppercase font-bold tracking-wider opacity-60">Nome do Associado</span>
                <span className="block text-xl font-bold tracking-tight text-white truncate">{cardData?.nome}</span>
              </div>

              {/* Card Bottom Grid */}
              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <div>
                  <span className="block text-[8px] uppercase font-bold tracking-wider opacity-50">Matrícula</span>
                  <span className="block text-sm font-bold text-white tracking-wide">{cardData?.matricula}</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase font-bold tracking-wider opacity-50">Plano / Validade</span>
                  <span className="block text-xs font-bold text-white truncate">
                    {cardData?.convenio} - {cardData?.plano}
                  </span>
                  <span className="block text-[9px] font-bold text-emerald-400 mt-0.5">
                    Val: {new Date(cardData?.validade).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>

            {/* Back View */}
            <div className="absolute inset-0 p-6 flex flex-col justify-between backface-hidden rotate-y-180">
              
              {/* Back Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Uso Exclusivo do Beneficiário</span>
                <span className="text-[10px] font-bold text-emerald-400">Atendimento 24h</span>
              </div>

              {/* Simulated Barcode / QR Code representation */}
              <div className="flex flex-col items-center justify-center space-y-2 py-2">
                <div className="bg-white p-2 rounded-lg w-fit shadow-md">
                  {/* Visual mockup of barcode */}
                  <div className="flex gap-0.5 items-end justify-center w-[160px] h-[35px] bg-white">
                    {[1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 4, 1, 2, 3, 1, 2, 4, 1, 2, 1].map((bar, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950 rounded-sm"
                        style={{
                          width: `${bar}px`,
                          height: idx % 3 === 0 ? '100%' : '88%'
                        }}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 tracking-widest">{cardData?.matricula}</span>
              </div>

              {/* Card Footer Rules */}
              <div className="text-[8px] text-slate-500 leading-tight space-y-1">
                <p>1. Apresentação obrigatória de documento de identidade oficial com foto.</p>
                <p>2. Esta credencial digital é pessoal e intransferível.</p>
                <p>3. Central de Relacionamento Otium: 0800 591 2045</p>
              </div>

            </div>

          </motion.div>
        </div>

        {/* Tip text */}
        <span className="text-slate-500 text-xs mt-6 block text-center font-semibold">
          💡 Clique na carteirinha para girar e ver o código de barras
        </span>
      </div>

      {/* Benefits Summary Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
          <span className="w-1.5 h-6 bg-emerald-500 rounded-full" />
          Serviços Vinculados ao seu Plano
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: ShieldCheck, title: "Ampla Cobertura", desc: "Consultas, exames de laboratório, ultrassonografia, cardiologia e mais." },
            { icon: Heart, title: "Desconto em Medicamentos", desc: "Apresente sua matrícula em redes parceiras para descontos especiais." },
            { icon: CreditCard, title: "Checkout Online", desc: "Pague consultas pré-reservadas de forma simples por PIX ou Cartão." }
          ].map((item, idx) => (
            <div key={idx} className="flex gap-4 items-start p-4 bg-slate-950/40 rounded-2xl border border-slate-800/60">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex flex-shrink-0 items-center justify-center">
                <item.icon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm">{item.title}</h4>
                <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
