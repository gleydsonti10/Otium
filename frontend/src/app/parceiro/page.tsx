'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Activity, 
  LogOut, 
  CheckCircle2, 
  DollarSign, 
  Calendar, 
  RefreshCw, 
  Search, 
  CheckCircle,
  FileCheck,
  User,
  Hash,
  AlertCircle,
  TrendingUp,
  Award
} from 'lucide-react';

interface Client {
  nome: string;
  cpf: string | null;
}

interface Procedimento {
  id_parceiro_procedimento: string;
  nome: string;
  quantidade: number;
  valor_total: number;
  valor_parceiro: number;
  total_parceiro: number;
}

interface Appointment {
  id_agendamento: string;
  codigo: string;
  status: string;
  data_criacao: string;
  total_parceiro: number;
  procedimentos: Procedimento[];
  cliente: Client;
}

export default function ParceiroPortalPage() {
  const router = useRouter();
  
  // Authentication states
  const [user, setUser] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Date Filters
  const [dataInicial, setDataInicial] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [dataFinal, setDataFinal] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Business states
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  
  // BI Charts state
  const [biData, setBiData] = useState<any>({
    kpis: { faturamentoTotal: 0, totalGuias: 0, ticketMedio: 0 },
    revenueTrend: [],
    procedureDistribution: [],
    statusDistribution: []
  });
  const [isLoadingBI, setIsLoadingBI] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  // Form states
  const [codigoGuia, setCodigoGuia] = useState('');
  const [isSubmittingGuia, setIsSubmittingGuia] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch appointments list
  const fetchAppointments = async (tokenStr: string) => {
    setIsLoadingList(true);
    try {
      const params = new URLSearchParams({
        data_inicial: dataInicial,
        data_final: dataFinal
      });
      const response = await fetch(`http://localhost:3000/api/parceiro-portal/agendamentos?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenStr}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error('Erro ao carregar guias:', err);
    } finally {
      setIsLoadingList(false);
    }
  };

  // Fetch BI metrics and chart data
  const fetchBIData = async (tokenStr: string) => {
    setIsLoadingBI(true);
    try {
      const params = new URLSearchParams({
        data_inicial: dataInicial,
        data_final: dataFinal
      });
      const response = await fetch(`http://localhost:3000/api/parceiro-portal/bi?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenStr}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBiData(data);
      }
    } catch (err) {
      console.error('Erro ao carregar BI:', err);
    } finally {
      setIsLoadingBI(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
    } else {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role.level >= 50) {
        router.push('/dashboard');
      } else {
        setUser(parsedUser);
        setIsLoadingAuth(false);
        fetchAppointments(token);
        fetchBIData(token);
      }
    }
  }, [router]);

  // Refetch BI when date filters change
  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (token) {
      fetchBIData(token);
      fetchAppointments(token);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleValidarGuia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoGuia.trim()) return;

    setIsSubmittingGuia(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/parceiro-portal/realizar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ codigo: codigoGuia.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao realizar a guia de atendimento.');
      }

      setSuccessMsg(`Sucesso! A guia #${codigoGuia} foi marcada como realizada.`);
      setCodigoGuia('');
      
      if (token) {
        await fetchAppointments(token);
        await fetchBIData(token);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao processar requisição.');
    } finally {
      setIsSubmittingGuia(false);
    }
  };

  // Formatting helpers
  const formatCPF = (cpf: string | null) => {
    if (!cpf) return '---';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // SVG Area/Line Chart for Daily Revenue
  const renderTrendChart = () => {
    const trend = biData.revenueTrend || [];
    if (trend.length === 0) {
      return (
        <div className="h-[250px] flex items-center justify-center text-slate-500 text-sm">
          Sem dados suficientes no período selecionado.
        </div>
      );
    }

    const width = 600;
    const height = 220;
    const padding = 35;

    const maxVal = Math.max(...trend.map((d: any) => d.valor), 100);
    const minVal = 0;

    const getX = (index: number) => {
      if (trend.length <= 1) return width / 2;
      return padding + (index * (width - 2 * padding)) / (trend.length - 1);
    };

    const getY = (value: number) => {
      return height - padding - ((value - minVal) / (maxVal - minVal)) * (height - 2 * padding);
    };

    const points = trend.map((d: any, i: number) => ({ x: getX(i), y: getY(d.valor) }));
    
    // Construct smooth cubic Bezier path
    let linePath = '';
    if (points.length > 0) {
      linePath = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        const cpX1 = points[i - 1].x + (points[i].x - points[i - 1].x) / 2;
        const cpY1 = points[i - 1].y;
        const cpX2 = points[i - 1].x + (points[i].x - points[i - 1].x) / 2;
        const cpY2 = points[i].y;
        linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i].x} ${points[i].y}`;
      }
    }

    const areaPath = linePath ? `${linePath} L ${getX(trend.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z` : '';

    return (
      <div className="relative w-full h-[250px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible select-none">
          <defs>
            <linearGradient id="partnerAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.5, 1].map((ratio, i) => {
            const y = getY(maxVal * ratio);
            return (
              <g key={i} className="opacity-10">
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#E2E8F0" strokeWidth={1} strokeDasharray="4 4" />
                <text x={padding - 8} y={y + 3} textAnchor="end" className="fill-slate-400 text-[9px] font-bold">
                  {Math.round(maxVal * ratio)}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill="url(#partnerAreaGrad)" />}

          {/* Line stroke */}
          {linePath && <path d={linePath} fill="none" stroke="#10B981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}

          {/* Data points */}
          {points.map((pt: any, idx: number) => {
            const isHovered = hoveredPoint?.index === idx;
            return (
              <g key={idx}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5.5 : 3}
                  className="fill-[#0F172A] stroke-[#10B981] cursor-pointer transition-all"
                  strokeWidth={isHovered ? 3 : 1.5}
                  onMouseEnter={() => setHoveredPoint({ x: pt.x, y: pt.y, index: idx, data: trend[idx] })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                
                {/* Date labels on X-axis */}
                {(idx % Math.ceil(trend.length / 6) === 0 || idx === trend.length - 1) && (
                  <text x={pt.x} y={height - 12} textAnchor="middle" className="fill-slate-500 text-[9px] font-semibold">
                    {trend[idx].dateLabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-20 bg-slate-950 text-white rounded-xl p-2.5 text-xs shadow-xl border border-slate-800 pointer-events-none"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100 - 15}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <p className="font-bold text-slate-400 mb-0.5">{new Date(hoveredPoint.data.rawDate).toLocaleDateString('pt-BR')}</p>
            <p className="font-semibold text-emerald-400">Repasse: {formatCurrency(hoveredPoint.data.valor)}</p>
            <p className="text-slate-350 text-[10px] mt-0.5">Agendamentos: {hoveredPoint.data.volume}</p>
          </div>
        )}
      </div>
    );
  };

  // SVG Donut Chart for Status Distribution
  const renderDonutChart = () => {
    const distribution = biData.statusDistribution || [];
    const activeDist = distribution.filter((item: any) => item.value > 0);
    
    if (activeDist.length === 0) {
      return (
        <div className="h-[180px] flex items-center justify-center text-slate-500 text-sm">
          Nenhum agendamento realizado.
        </div>
      );
    }

    const radius = 50;
    const strokeWidth = 12;
    const circumference = 2 * Math.PI * radius;
    let accumulatedAngle = 0;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90 select-none overflow-visible">
            {activeDist.map((slice: any, i: number) => {
              const dashOffset = circumference - (slice.percentage / 100) * circumference;
              const rotation = (accumulatedAngle / 100) * 360;
              accumulatedAngle += slice.percentage;

              const isHovered = hoveredSlice === slice.name;

              return (
                <circle
                  key={i}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    transformOrigin: '70px 70px',
                    transform: `rotate(${rotation}deg)`,
                  }}
                  onMouseEnter={() => setHoveredSlice(slice.name)}
                  onMouseLeave={() => setHoveredSlice(null)}
                />
              );
            })}
          </svg>
          
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-xl font-black text-white leading-none">
              {biData.kpis.totalGuias}
            </span>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              Guias
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col space-y-2.5 w-full max-w-[140px]">
          {activeDist.map((slice: any, i: number) => {
            const isHovered = hoveredSlice === slice.name;
            return (
              <div
                key={i}
                className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                  isHovered ? 'bg-slate-800/40 border border-slate-700/30' : 'bg-transparent border border-transparent'
                }`}
                onMouseEnter={() => setHoveredSlice(slice.name)}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                  <span className="text-xs font-semibold text-slate-300">{slice.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-white leading-none">{slice.value}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">{slice.percentage.toFixed(0)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
        <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
        <span className="mt-4 text-slate-400 text-sm">Carregando portal do parceiro...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-x-hidden">
      
      {/* Top Navbar */}
      <nav className="w-full bg-slate-900 border-b border-slate-800/80 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center">
            <Activity className="w-4.5 h-4.5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white block">Otium</span>
            <span className="text-xs text-emerald-400 font-medium">Portal do Parceiro</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <span className="text-sm font-semibold text-slate-200 block">{user?.nome_usuario}</span>
            <span className="text-xs text-slate-400 block">{user?.email}</span>
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 border border-slate-700/50 hover:border-red-500/20 transition-all"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>Sair</span>
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        
        {/* Banner de Boas Vindas */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-900 border border-slate-850 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[80px]" />
          
          <div className="space-y-2 z-10 text-center md:text-left">
            <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/30 rounded-full">
              Painel de Performance da Clínica
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Olá, {user?.nome_usuario}
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Valide guias pendentes de pacientes e acompanhe o desempenho financeiro, volume de atendimentos e procedimentos mais solicitados.
            </p>
          </div>
        </div>

        {/* Date Filter Bar */}
        <form onSubmit={handleFilterSubmit} className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl backdrop-blur-sm flex flex-col sm:flex-row sm:items-end justify-start gap-4">
          <div className="flex flex-col space-y-1.5 w-full sm:max-w-xs">
            <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Data Inicial</label>
            <input 
              type="date"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <div className="flex flex-col space-y-1.5 w-full sm:max-w-xs">
            <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Data Final</label>
            <input 
              type="date"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={isLoadingBI}
            className="flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 active:scale-[0.98] w-full sm:w-auto h-[38px] cursor-pointer"
          >
            {isLoadingBI ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Search className="w-4 h-4 stroke-[2.5]" />
                <span>Filtrar Período</span>
              </>
            )}
          </button>
        </form>

        {/* Estatísticas & Formulário de Guia */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Card de Validação de Guia */}
          <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-white">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Validar Guia de Agendamento</h2>
                  <p className="text-xs text-slate-400">Insira o código de agendamento do paciente</p>
                </div>
              </div>

              <form onSubmit={handleValidarGuia} className="space-y-4 mt-6">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                    <Hash className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 000000123"
                    value={codigoGuia}
                    onChange={(e) => setCodigoGuia(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-100 rounded-xl pl-12 pr-4 py-3.5 text-base font-semibold focus:outline-none transition-all placeholder:text-slate-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingGuia || !codigoGuia.trim()}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 px-6 py-4 rounded-xl font-bold tracking-tight shadow-lg shadow-emerald-500/10 transition-all hover:scale-[1.01]"
                >
                  {isSubmittingGuia ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 stroke-[2.5]" />
                      <span>Confirmar e Realizar Atendimento</span>
                    </>
                  )}
                </button>
              </form>

              {/* Feedback messages */}
              <div className="mt-4">
                {successMsg && (
                  <div className="flex items-start space-x-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-medium">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="flex items-start space-x-3 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cards de Métricas */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            {/* Guias Realizadas */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Atendimentos</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-black text-white">{biData.kpis.totalGuias}</span>
                <span className="text-[10px] text-slate-500 block mt-1">Atendidos no período</span>
              </div>
            </div>

            {/* Repasse Líquido */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/5 rounded-full blur-xl" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Total Líquido</span>
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-white">{formatCurrency(biData.kpis.faturamentoTotal)}</span>
                <span className="text-[10px] text-slate-500 block mt-1">Repasses clínicos</span>
              </div>
            </div>

            {/* Ticket Médio */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-xl" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Ticket Médio</span>
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-white">{formatCurrency(biData.kpis.ticketMedio)}</span>
                <span className="text-[10px] text-slate-500 block mt-1">Valor médio por guia</span>
              </div>
            </div>

          </div>
        </div>

        {/* Seção de Gráficos BI */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Gráfico 1: Faturamento Diário (Line Chart) */}
          <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-white">Evolução de Faturamento</h3>
                <p className="text-xs text-slate-400">Histórico diário de repasses da clínica no período</p>
              </div>
            </div>
            {isLoadingBI ? (
              <div className="h-[250px] flex items-center justify-center">
                <RefreshCw className="w-7 h-7 text-slate-650 animate-spin" />
              </div>
            ) : (
              renderTrendChart()
            )}
          </div>

          {/* Gráfico 2: Divisão de Status (Donut Chart) */}
          <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm">
            <div>
              <h3 className="text-base font-bold text-white">Divisão de Status</h3>
              <p className="text-xs text-slate-400">Proporção de guias por status do faturamento</p>
            </div>
            {isLoadingBI ? (
              <div className="h-[180px] flex items-center justify-center">
                <RefreshCw className="w-7 h-7 text-slate-650 animate-spin" />
              </div>
            ) : (
              renderDonutChart()
            )}
          </div>

          {/* Gráfico 3: Procedimentos mais Realizados (Horizontal Bars) */}
          <div className="lg:col-span-12 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center space-x-2.5 mb-6 text-white">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Award className="w-4.5 h-4.5 text-emerald-450" />
              </div>
              <div>
                <h3 className="text-base font-bold">Top 5 Procedimentos mais Realizados</h3>
                <p className="text-xs text-slate-400">Procedimentos de maior demanda executados na clínica</p>
              </div>
            </div>

            {isLoadingBI ? (
              <div className="py-8 flex items-center justify-center">
                <RefreshCw className="w-7 h-7 text-slate-650 animate-spin" />
              </div>
            ) : (biData.procedureDistribution || []).length === 0 ? (
              <p className="py-6 text-center text-slate-500 text-sm">Nenhum procedimento registrado no período.</p>
            ) : (
              <div className="space-y-4">
                {(biData.procedureDistribution || []).map((proc: any, idx: number) => {
                  const maxVal = Math.max(...biData.procedureDistribution.map((p: any) => p.value), 1);
                  const percentage = (proc.value / maxVal) * 100;
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
                        <span className="truncate max-w-[80%]">{proc.name}</span>
                        <span className="text-emerald-400 font-bold">{proc.value} {proc.value === 1 ? 'atendimento' : 'atendimentos'}</span>
                      </div>
                      <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-900">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tabela de Histórico de Atendimentos */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="px-6 py-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/30">
            <div>
              <h2 className="text-lg font-bold text-white">Histórico de Atendimentos</h2>
              <p className="text-xs text-slate-400">Lista de guias validadas e prontas para repasse</p>
            </div>
            <div className="flex items-center space-x-2 text-slate-400 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-xs font-semibold">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>{appointments.length} guias localizadas</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoadingList ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <RefreshCw className="w-8 h-8 text-slate-600 animate-spin" />
                <span className="mt-4 text-sm font-medium">Buscando histórico...</span>
              </div>
            ) : appointments.length === 0 ? (
              <div className="py-24 text-center text-slate-500">
                <AlertCircle className="w-12 h-12 mx-auto text-slate-700 mb-4" />
                <p className="font-semibold text-slate-400">Nenhum atendimento realizado ainda.</p>
                <p className="text-xs text-slate-600 mt-1">Insira uma guia pendente acima para iniciar.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold bg-slate-900/10">
                    <th className="px-6 py-4">Guia</th>
                    <th className="px-6 py-4">Data/Hora</th>
                    <th className="px-6 py-4">Paciente</th>
                    <th className="px-6 py-4">CPF</th>
                    <th className="px-6 py-4">Procedimentos</th>
                    <th className="px-6 py-4 text-right">Repasse Clínico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                  {appointments.map((app, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/20 transition-all">
                      <td className="px-6 py-4 font-mono font-bold text-slate-400 text-xs">
                        #{app.codigo}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {formatDate(app.data_criacao)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <span className="font-semibold text-slate-200">{app.cliente.nome}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-400">
                        {formatCPF(app.cliente.cpf)}
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate">
                        <div className="space-y-0.5">
                          {app.procedimentos.map((proc, pIdx) => (
                            <span key={pIdx} className="block text-xs font-medium bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-750 inline-block mr-1">
                              {proc.nome} (x{proc.quantidade})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-400">
                        {formatCurrency(app.total_parceiro)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
