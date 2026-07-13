'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, Calendar, RefreshCw, AlertCircle, TrendingUp, DollarSign, Award, ArrowUpRight, Activity, Building, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CentralBIPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
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

  // Partners list and Selected Partner for filter
  const [partners, setPartners] = useState<any[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');

  // KPI Metrics
  const [metrics, setMetrics] = useState({
    faturamentoBruto: 0,
    comissaoOtium: 0,
    repasseParceiros: 0,
    repasseRepresentantes: 0,
    ticketMedio: 0,
    volumeAgendamentos: 0,
  });

  // Chart Datasets
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);
  const [topPartners, setTopPartners] = useState<any[]>([]);
  const [topProcedures, setTopProcedures] = useState<any[]>([]);
  
  // Active Interactive Chart Hover Index
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const fetchBIData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (dataInicial) params.append('data_inicial', dataInicial);
      if (dataFinal) params.append('data_final', dataFinal);
      if (selectedPartnerId) params.append('parceiro', selectedPartnerId);

      // 1. Fetch Appointments Report
      const resAgendamento = await fetch(`http://localhost:3000/api/relatorios/agendamento?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataAgendamento = await resAgendamento.json();
      if (!resAgendamento.ok) throw new Error(dataAgendamento.error || 'Erro ao carregar dados de agendamentos.');

      // 2. Fetch Partners Report
      const resParceiro = await fetch(`http://localhost:3000/api/relatorios/parceiro?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataParceiro = await resParceiro.json();
      if (!resParceiro.ok) throw new Error(dataParceiro.error || 'Erro ao carregar dados de parceiros.');

      // 3. Fetch Procedures Report
      const resProcedimento = await fetch(`http://localhost:3000/api/relatorios/procedimento?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataProcedimento = await resProcedimento.json();
      if (!resProcedimento.ok) throw new Error(dataProcedimento.error || 'Erro ao carregar dados de procedimentos.');

      // --- PROCESS KPI METRICS ---
      let bruto = 0;
      let comissao = 0;
      let repasse = 0;
      let representante = 0;
      let statusCounts: { [key: string]: number } = { pago: 0, realizado: 0, pendente: 0 };
      
      // Group revenue by date for the area chart
      const revenueByDate: { [key: string]: { bruto: number; comissao: number; parceiro: number; representante: number } } = {};

      dataAgendamento.forEach((ag: any) => {
        const valBruto = Number(ag.total || 0);
        const valComissao = Number(ag.valor_cf || 0);
        const valRepasse = Number(ag.valor_parceiro || 0);
        const valRepresentante = Number(ag.valor_representante || 0);

        bruto += valBruto;
        comissao += valComissao;
        repasse += valRepasse;
        representante += valRepresentante;

        // Count status
        const st = (ag.status || '').toLowerCase();
        if (st in statusCounts) {
          statusCounts[st]++;
        }

        // Parse date (YYYY-MM-DD)
        const dateKey = new Date(ag.data_criacao).toISOString().split('T')[0];
        if (!revenueByDate[dateKey]) {
          revenueByDate[dateKey] = { bruto: 0, comissao: 0, parceiro: 0, representante: 0 };
        }
        revenueByDate[dateKey].bruto += valBruto;
        revenueByDate[dateKey].comissao += valComissao;
        revenueByDate[dateKey].parceiro += valRepasse;
        revenueByDate[dateKey].representante += valRepresentante;
      });

      const volume = dataAgendamento.length;
      setMetrics({
        faturamentoBruto: bruto,
        comissaoOtium: comissao,
        repasseParceiros: repasse,
        repasseRepresentantes: representante,
        ticketMedio: volume > 0 ? bruto / volume : 0,
        volumeAgendamentos: volume,
      });

      // --- FORMAT REVENUE TREND DATA ---
      const trendList = Object.keys(revenueByDate)
        .map(date => {
          // format YYYY-MM-DD to DD/MM
          const parts = date.split('-');
          return {
            rawDate: date,
            dateLabel: `${parts[2]}/${parts[1]}`,
            bruto: revenueByDate[date].bruto,
            comissao: revenueByDate[date].comissao,
            parceiro: revenueByDate[date].parceiro,
            representante: revenueByDate[date].representante,
          };
        })
        .sort((a, b) => a.rawDate.localeCompare(b.rawDate));
      
      setRevenueTrend(trendList);

      // --- FORMAT STATUS DONUT DATA ---
      const donutList = [
        { name: 'Pago', value: statusCounts.pago, color: '#34D399' },
        { name: 'Realizado', value: statusCounts.realizado, color: '#38BDF8' },
        { name: 'Pendente', value: statusCounts.pendente, color: '#FBBF24' },
      ].filter(item => item.value > 0);

      const totalStatus = donutList.reduce((sum, item) => sum + item.value, 0);
      setStatusDistribution(donutList.map(item => ({
        ...item,
        percentage: totalStatus > 0 ? (item.value / totalStatus) * 100 : 0
      })));

      // --- PROCESS PARTNERS ---
      const partnersList = dataParceiro.slice(0, 5).map((p: any) => ({
        name: p.nome_parceiro,
        revenue: Number(p.valor_parceiro_total || 0) + Number(p.valor_cf_total || 0),
        appointments: p.qnt_agendamentos,
      }));
      setTopPartners(partnersList);

      // --- PROCESS PROCEDURES ---
      const proceduresList = dataProcedimento.slice(0, 5).map((proc: any) => ({
        name: proc.procedimento,
        revenue: Number(proc.valor_cf_total || 0) + Number(proc.valor_parceiro_total || 0),
        qty: proc.quantidade,
      }));
      setTopProcedures(proceduresList);

    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/parceiros', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) setPartners(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPartners();
    fetchBIData();
  }, []);

  useEffect(() => {
    fetchBIData();
  }, [selectedPartnerId]);

  // Compute SVG coordinates for the Area Chart
  const renderAreaChart = () => {
    if (revenueTrend.length === 0) return null;

    const width = 800;
    const height = 280;
    const padding = 45;

    // Find max value for Y-axis scale (across bruto, comissao, parceiro, and representante)
    const maxVal = Math.max(
      ...revenueTrend.map(d => Math.max(d.bruto || 0, d.comissao || 0, d.parceiro || 0, d.representante || 0)),
      100
    );
    const minVal = 0;

    const getX = (index: number) => {
      if (revenueTrend.length <= 1) return width / 2;
      return padding + (index * (width - 2 * padding)) / (revenueTrend.length - 1);
    };

    const getY = (value: number) => {
      return height - padding - ((value - minVal) / (maxVal - minVal)) * (height - 2 * padding);
    };

    // Construct path coordinates
    const pointsBruto = revenueTrend.map((d, i) => ({ x: getX(i), y: getY(d.bruto || 0) }));
    const pointsParceiro = revenueTrend.map((d, i) => ({ x: getX(i), y: getY(d.parceiro || 0) }));
    const pointsComissao = revenueTrend.map((d, i) => ({ x: getX(i), y: getY(d.comissao || 0) }));
    const pointsRepresentante = revenueTrend.map((d, i) => ({ x: getX(i), y: getY(d.representante || 0) }));

    const getBezierPath = (pts: { x: number; y: number }[]) => {
      if (pts.length === 0) return '';
      let path = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const cpX1 = pts[i - 1].x + (pts[i].x - pts[i - 1].x) / 2;
        const cpY1 = pts[i - 1].y;
        const cpX2 = pts[i - 1].x + (pts[i].x - pts[i - 1].x) / 2;
        const cpY2 = pts[i].y;
        path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${pts[i].x} ${pts[i].y}`;
      }
      return path;
    };

    const linePathBruto = getBezierPath(pointsBruto);
    const linePathParceiro = getBezierPath(pointsParceiro);
    const linePathComissao = getBezierPath(pointsComissao);
    const linePathRepresentante = getBezierPath(pointsRepresentante);

    const areaPathBruto = linePathBruto ? `${linePathBruto} L ${getX(revenueTrend.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z` : '';

    return (
      <div className="relative w-full h-[320px]">
        {/* Color Legend inside the chart */}
        <div className="flex gap-4 text-xs font-semibold mb-4 no-print select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#0284C7]" />
            <span className="text-slate-600">Total do Período</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#0D9488]" />
            <span className="text-slate-600">Valor do Parceiro</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#E11D48]" />
            <span className="text-slate-600">Valor do Representante</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#059669]" />
            <span className="text-slate-600">Valor da Otium</span>
          </div>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none overflow-visible">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = getY(maxVal * ratio);
            return (
              <g key={i} className="opacity-10">
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#0F172A" strokeWidth={1} strokeDasharray="4 4" />
                <text x={padding - 10} y={y + 4} textAnchor="end" className="fill-slate-900 font-bold text-[10px]">
                  {Math.round(maxVal * ratio).toLocaleString('pt-BR')}
                </text>
              </g>
            );
          })}

          {/* Fill Area for total */}
          {areaPathBruto && <path d={areaPathBruto} fill="url(#areaGradient)" />}

          {/* 4 Stroke lines */}
          {linePathBruto && (
            <path d={linePathBruto} fill="none" stroke="#0284C7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          )}
          {linePathParceiro && (
            <path d={linePathParceiro} fill="none" stroke="#0D9488" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          )}
          {linePathRepresentante && (
            <path d={linePathRepresentante} fill="none" stroke="#E11D48" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          )}
          {linePathComissao && (
            <path d={linePathComissao} fill="none" stroke="#059669" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Hoverable Data Points (linked to Faturamento Total/Bruto) */}
          {pointsBruto.map((pt, idx) => {
            const isHovered = hoveredPoint?.index === idx;
            return (
              <g key={idx}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5.5 : 3}
                  className="fill-[#FFFFFF] stroke-[#0284C7] transition-all cursor-pointer"
                  strokeWidth={isHovered ? 3.5 : 1.5}
                  onMouseEnter={() => setHoveredPoint({ x: pt.x, y: pt.y, index: idx, data: revenueTrend[idx] })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                
                {/* Date labels on X-axis */}
                {(idx % Math.ceil(revenueTrend.length / 8) === 0 || idx === revenueTrend.length - 1) && (
                  <text
                    x={pt.x}
                    y={height - 15}
                    textAnchor="middle"
                    className="fill-slate-500 font-bold text-[10px]"
                  >
                    {revenueTrend[idx].dateLabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip card */}
        {hoveredPoint && (
          <div
            className="absolute z-20 bg-slate-950 text-white rounded-xl p-3 text-xs shadow-xl border border-slate-800"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100 - 30}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <p className="font-bold text-slate-400 mb-1">{new Date(hoveredPoint.data.rawDate).toLocaleDateString('pt-BR')}</p>
            <p className="font-semibold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0284C7]" />
              Total Período: <strong className="text-white">R$ {hoveredPoint.data.bruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </p>
            <p className="font-semibold text-slate-300 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#0D9488]" />
              Parceiro: <strong className="text-white">R$ {hoveredPoint.data.parceiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </p>
            <p className="font-semibold text-slate-300 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#E11D48]" />
              Representante: <strong className="text-white">R$ {hoveredPoint.data.representante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </p>
            <p className="font-semibold text-slate-300 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#059669]" />
              Otium: <strong className="text-white">R$ {hoveredPoint.data.comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </p>
          </div>
        )}
      </div>
    );
  };

  // Render SVG Donut Chart for Status Distribution
  const renderDonutChart = () => {
    if (statusDistribution.length === 0) return null;

    const radius = 50;
    const strokeWidth = 14;
    const circumference = 2 * Math.PI * radius;
    let accumulatedAngle = 0;

    return (
      <div className="flex flex-col md:flex-row items-center justify-around gap-6">
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90 select-none overflow-visible">
            {statusDistribution.map((slice, i) => {
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
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-300 cursor-pointer"
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
          
          {/* Central Donut Hole metrics */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-[#0F172A] leading-none">
              {metrics.volumeAgendamentos}
            </span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
              Agendamentos
            </span>
          </div>
        </div>

        {/* Legend Panel */}
        <div className="flex flex-col space-y-3.5 w-full max-w-[200px]">
          {statusDistribution.map((slice, i) => {
            const isHovered = hoveredSlice === slice.name;
            return (
              <div
                key={i}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  isHovered ? 'bg-[#F8FAFC] border-slate-200' : 'bg-transparent border-transparent'
                }`}
                onMouseEnter={() => setHoveredSlice(slice.name)}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                <div className="flex items-center space-x-2.5">
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: slice.color }} />
                  <span className="text-sm font-bold text-[#1E293B]">{slice.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-[#0F172A] leading-none">{slice.value}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{slice.percentage.toFixed(1)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-10 flex flex-col space-y-8 relative">
      
      {/* Header and Controls */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-slate-200">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-7 h-7 text-[#00ABE4]" />
            <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">Central BI</h1>
          </div>
          <p className="text-slate-500 text-sm">Painel estratégico de Business Intelligence, análise de receitas e performance de parceiros.</p>
        </div>

        {/* Date Filter Box */}
        <div className="flex flex-wrap items-center gap-3 bg-[#FFFFFF] p-3 border border-[#E2E8F0] rounded-2xl shadow-sm">
          {/* Partner Selector */}
          <div className="flex items-center space-x-2">
            <Building className="w-4 h-4 text-slate-500" />
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:border-[#00ABE4]"
            >
              <option value="">Todos os Parceiros</option>
              {partners.map(p => (
                <option key={p.id_parceiro} value={p.id_parceiro}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div className="w-[1px] h-5 bg-slate-200 mx-1 hidden sm:block" />
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:border-[#00ABE4]"
            />
          </div>
          <span className="text-slate-400 text-xs font-bold">até</span>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:border-[#00ABE4]"
            />
          </div>
          <button
            onClick={fetchBIData}
            className="px-4 py-2 bg-[#00ABE4] hover:bg-[#008CC2] text-[#FFFFFF] font-extrabold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#00ABE4]/15 active:scale-[0.98]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
        </div>
      </header>

      {errorMsg && (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-2xl flex items-center space-x-3 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center text-slate-400">
          <RefreshCw className="w-10 h-10 text-[#00ABE4] animate-spin" />
          <span className="mt-4 text-sm font-semibold text-slate-550">Computando dados analíticos...</span>
        </div>
      ) : (
        <div className="flex flex-col space-y-8">
          
          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
            {[
              {
                label: 'Faturamento Bruto',
                value: metrics.faturamentoBruto,
                icon: DollarSign,
                color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
                format: true
              },
              {
                label: 'Comissão Otium',
                value: metrics.comissaoOtium,
                icon: TrendingUp,
                color: 'text-[#00ABE4] bg-[#00ABE4]/10 border-[#00ABE4]/20',
                format: true
              },
              {
                label: 'Repasse Clínicas',
                value: metrics.repasseParceiros,
                icon: Award,
                color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
                format: true
              },
              {
                label: 'Repasse Representantes',
                value: metrics.repasseRepresentantes,
                icon: CreditCard,
                color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
                format: true
              },
              {
                label: 'Ticket Médio',
                value: metrics.ticketMedio,
                icon: ArrowUpRight,
                color: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
                format: true
              },
              {
                label: 'Volume de Atendimentos',
                value: metrics.volumeAgendamentos,
                icon: Activity,
                color: 'text-slate-600 bg-slate-500/10 border-slate-300',
                format: false
              }
            ].map((card, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={i}
                className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8F0] flex flex-col justify-between shadow-sm relative overflow-hidden group"
              >
                <div className="flex justify-between items-start">
                  <span className="text-[#475569] text-[10px] font-black uppercase tracking-wider">{card.label}</span>
                  <div className={`p-2.5 rounded-xl border ${card.color}`}>
                    <card.icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-xl font-black text-[#0F172A] leading-none">
                    {card.format 
                      ? `R$ ${card.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : card.value.toLocaleString('pt-BR')
                    }
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">Período Selecionado</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Area Chart Card */}
            <div className="lg:col-span-2 bg-[#FFFFFF] p-6 rounded-3xl border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-center mb-6 border-b border-[#F1F5F9] pb-4">
                <div>
                  <h3 className="text-lg font-black text-[#0F172A] tracking-tight">Faturamento ao Longo do Tempo</h3>
                  <p className="text-slate-400 text-xs">Evolução diária da receita bruta arrecadada.</p>
                </div>
              </div>
              {revenueTrend.length > 0 ? (
                renderAreaChart()
              ) : (
                <div className="py-24 text-center text-slate-400 font-semibold text-sm">Sem dados suficientes no período.</div>
              )}
            </div>

            {/* Donut Chart Card */}
            <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-center mb-6 border-b border-[#F1F5F9] pb-4">
                <div>
                  <h3 className="text-lg font-black text-[#0F172A] tracking-tight">Conversão de Status</h3>
                  <p className="text-slate-400 text-xs">Divisão percentual de agendamentos por status.</p>
                </div>
              </div>
              {statusDistribution.length > 0 ? (
                renderDonutChart()
              ) : (
                <div className="py-24 text-center text-slate-400 font-semibold text-sm">Sem dados suficientes no período.</div>
              )}
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Top Partners Bar list */}
            <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#E2E8F0] shadow-sm">
              <h3 className="text-lg font-black text-[#0F172A] tracking-tight mb-2 border-b border-[#F1F5F9] pb-4">Top 5 Parceiros Clínicos</h3>
              <div className="flex flex-col space-y-5 pt-3">
                {topPartners.length > 0 ? (
                  topPartners.map((partner, idx) => {
                    const maxRevenue = Math.max(...topPartners.map(p => p.revenue), 1);
                    const widthPct = (partner.revenue / maxRevenue) * 100;
                    return (
                      <div key={idx} className="flex flex-col space-y-1.5">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-[#1E293B]">{idx + 1}. {partner.name}</span>
                          <span className="font-extrabold text-[#0F172A]">R$ {partner.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-100 h-3.5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${widthPct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="bg-[#38BDF8] h-full rounded-full"
                            />
                          </div>
                          <span className="text-[11px] font-black text-[#0284C7]">{partner.appointments} agendamentos</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-400 text-sm font-semibold">Nenhum parceiro faturou neste período.</div>
                )}
              </div>
            </div>

            {/* Top Procedures Bar list */}
            <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#E2E8F0] shadow-sm">
              <h3 className="text-lg font-black text-[#0F172A] tracking-tight mb-2 border-b border-[#F1F5F9] pb-4">Top 5 Procedimentos mais Realizados</h3>
              <div className="flex flex-col space-y-5 pt-3">
                {topProcedures.length > 0 ? (
                  topProcedures.map((proc, idx) => {
                    const maxQty = Math.max(...topProcedures.map(p => p.qty), 1);
                    const widthPct = (proc.qty / maxQty) * 100;
                    return (
                      <div key={idx} className="flex flex-col space-y-1.5">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-[#1E293B]">{idx + 1}. {proc.name}</span>
                          <span className="font-extrabold text-[#0F172A]">{proc.qty} unidades</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-100 h-3.5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${widthPct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="bg-[#34D399] h-full rounded-full"
                            />
                          </div>
                          <span className="text-[11px] font-black text-[#047857]">R$ {proc.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-400 text-sm font-semibold">Nenhum procedimento registrado no período.</div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
