'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Calendar, Search, RefreshCw, AlertCircle, TrendingUp, DollarSign, Download, Activity, Printer } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'agendamentos' | 'financeiro' | 'parceiros' | 'procedimentos'>('agendamentos');

  // Filters
  const [dataInicial, setDataInicial] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [dataFinal, setDataFinal] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [status, setStatus] = useState('');
  const [selectedParceiro, setSelectedParceiro] = useState('');
  const [tipoProcedimento, setTipoProcedimento] = useState('');

  // Dropdown options
  const [partners, setPartners] = useState<any[]>([]);

  // Report Data
  const [reportData, setReportData] = useState<any[]>([]);

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
  }, []);

  const generateReport = async () => {
    setLoading(true);
    setErrorMsg('');
    setReportData([]);

    try {
      const token = localStorage.getItem('token');
      const activeUnitId = localStorage.getItem('activeUnitId');
      
      // Build query string
      const params = new URLSearchParams();
      if (dataInicial) params.append('data_inicial', dataInicial);
      if (dataFinal) params.append('data_final', dataFinal);
      if (status) params.append('status', status);
      if (selectedParceiro) params.append('parceiro', selectedParceiro);
      if (tipoProcedimento) params.append('tipo', tipoProcedimento);

      const endpointMap = {
        agendamentos: 'agendamento',
        financeiro: 'financeiro',
        parceiros: 'parceiro',
        procedimentos: 'procedimento'
      };

      const response = await fetch(`http://localhost:3000/api/relatorios/${endpointMap[activeTab]}?${params.toString()}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          ...(activeUnitId ? { 'x-active-unit-id': activeUnitId } : {})
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao gerar relatório.');

      if (Array.isArray(data)) {
        setReportData(data);
      } else {
        setErrorMsg(data.message || 'Nenhum resultado encontrado.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Re-run report on filter changes or tab changes
  useEffect(() => {
    generateReport();
  }, [activeTab]);
  const formatCurrency = (val: number | string) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  // Client-side CSV Exporter
  const exportToCSV = () => {
    if (reportData.length === 0) return;

    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeTab === 'agendamentos') {
      headers = ['ID', 'Código', 'Status', 'Parceiro', 'Valor Parceiro (R$)', 'Valor Representante (R$)', 'Comissão (R$)', 'Total (R$)', 'Data Criação'];
      rows = reportData.map(r => [
        r.id_agendamento, r.codigo, r.status, r.nome_parceiro, r.valor_parceiro, r.valor_representante, r.valor_cf, r.total, new Date(r.data_criacao).toLocaleDateString('pt-BR')
      ]);
    } else if (activeTab === 'financeiro') {
      headers = ['Parceiro', 'Procedimentos Pendentes (R$)', 'Faturados Pendentes (R$)'];
      rows = reportData.map(r => [
        r.nome_parceiro, r.procedimentos_pendentes, r.financeiros_pendentes
      ]);
    } else if (activeTab === 'parceiros') {
      headers = ['Parceiro', 'Agendamentos', 'Procedimentos', 'Vl. Pago Parceiro (R$)', 'Vl. Pendente Parceiro (R$)', 'Vl. Previsto Parceiro (R$)', 'Vl. Total Parceiro (R$)', 'Vl. CF Pago (R$)', 'Vl. CF Pendente (R$)', 'Vl. CF Previsto (R$)', 'Vl. CF Total (R$)', 'Vl. Representante Total (R$)'];
      rows = reportData.map(r => [
        r.nome_parceiro, r.qnt_agendamentos.toString(), r.qnt_procedimentos.toString(), r.valor_parceiro_pago, r.valor_parceiro_pendente, r.valor_parceiro_previsto, r.valor_parceiro_total, r.valor_cf_pago, r.valor_cf_pendente, r.valor_cf_previsto, r.valor_cf_total, r.valor_representante_total
      ]);
    } else if (activeTab === 'procedimentos') {
      headers = ['Procedimento', 'Quantidade', 'Vl. Parceiro Pago (R$)', 'Vl. Parceiro Pendente (R$)', 'Vl. Parceiro Previsto (R$)', 'Vl. Parceiro Total (R$)', 'Vl. CF Pago (R$)', 'Vl. CF Pendente (R$)', 'Vl. CF Previsto (R$)', 'Vl. CF Total (R$)', 'Vl. Representante Total (R$)'];
      rows = reportData.map(r => [
        r.procedimento, r.quantidade.toString(), r.valor_parceiro_pago, r.valor_parceiro_pendente, r.valor_parceiro_previsto, r.valor_parceiro_total, r.valor_cf_pago, r.valor_cf_pendente, r.valor_cf_previsto, r.valor_cf_total, r.valor_representante_total
      ]);
    }

    const csvContent = '\uFEFF' + // UTF-8 BOM
      [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-${activeTab}-${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Summary Metrics calculations
  let totalComissao = 0;
  let totalFaturado = 0;
  let totalParceiro = 0;
  let totalRepresentante = 0;

  if (activeTab === 'agendamentos') {
    reportData.forEach((r) => {
      totalComissao += Number(r.valor_cf || 0);
      totalFaturado += Number(r.total || 0);
      totalParceiro += Number(r.valor_parceiro || 0);
      totalRepresentante += Number(r.valor_representante || 0);
    });
  } else if (activeTab === 'parceiros') {
    reportData.forEach((r) => {
      totalComissao += Number(r.valor_cf_total || 0);
      totalParceiro += Number(r.valor_parceiro_total || 0);
      totalRepresentante += Number(r.valor_representante_total || 0);
      totalFaturado += Number(r.valor_cf_total || 0) + Number(r.valor_parceiro_total || 0) + Number(r.valor_representante_total || 0);
    });
  } else if (activeTab === 'procedimentos') {
    reportData.forEach((r) => {
      totalComissao += Number(r.valor_cf_total || 0);
      totalParceiro += Number(r.valor_parceiro_total || 0);
      totalRepresentante += Number(r.valor_representante_total || 0);
      totalFaturado += Number(r.valor_cf_total || 0) + Number(r.valor_parceiro_total || 0) + Number(r.valor_representante_total || 0);
    });
  }

  return (
    <div className="p-6 lg:p-10 flex flex-col space-y-8 relative print-container">
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide sidebar, headers, filters, buttons, layout wrappers */
          aside, nav, header, button, input, select, .no-print, .filters-container {
            display: none !important;
          }
          
          /* Reset main content sizing, width, alignment to A4 page dimensions */
          body, html, main, .print-container, .flex-1, div, [role="group"] {
            background: transparent !important;
            background-color: white !important;
            color: black !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            box-shadow: none !important;
            display: block !important;
            float: none !important;
            position: static !important;
          }

          /* Force report padding */
          .print-container {
            padding: 15px !important;
          }

          /* Force horizontal layout of summary cards */
          .metrics-grid {
            display: grid !important;
            grid-template-cols: repeat(4, 1fr) !important;
            gap: 12px !important;
            margin-bottom: 24px !important;
            width: 100% !important;
          }

          .metric-card {
            background: #f9fafb !important;
            border: 1px solid #e5e7eb !important;
            padding: 12px !important;
            border-radius: 8px !important;
            color: black !important;
          }

          .metric-card span, .metric-card div {
            color: black !important;
          }

          /* Format printable tables to prevent truncating */
          .table-container {
            border: none !important;
            background: transparent !important;
            overflow: visible !important;
            width: 100% !important;
          }

          table {
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            color: black !important;
            font-size: 11px !important;
            table-layout: auto !important;
          }

          th {
            background-color: #f3f4f6 !important;
            color: #111827 !important;
            border: 1px solid #d1d5db !important;
            padding: 8px 6px !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            text-align: left !important;
          }

          td {
            border: 1px solid #e5e7eb !important;
            color: #374151 !important;
            padding: 6px 6px !important;
            white-space: nowrap !important;
          }

          /* Adjust cells with longer content to wrap if needed */
          td:nth-child(2) {
            white-space: normal !important;
          }

          .status-pill {
            background: transparent !important;
            border: 1px solid #d1d5db !important;
            color: black !important;
            padding: 1px 4px !important;
          }

          tr {
            page-break-inside: avoid !important;
          }
        }
      `}} />

      {/* Hidden print header */}
      <div className="hidden print:block mb-6 border-b border-gray-300 pb-4 text-black">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold">Otium - Relatório Consolidado</h1>
            <p className="text-sm mt-1">
              Período: {dataInicial ? new Date(dataInicial + 'T12:00:00').toLocaleDateString('pt-BR') : 'Início'} a{' '}
              {dataFinal ? new Date(dataFinal + 'T12:00:00').toLocaleDateString('pt-BR') : 'Fim'}
            </p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div>Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</div>
            <div className="font-bold uppercase mt-1">Tipo: {activeTab}</div>
          </div>
        </div>
      </div>

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Relatórios</h1>
          <p className="text-slate-400 text-sm">Gere e exporte relatórios consolidados de faturamento, comissões e performance.</p>
        </div>

        {reportData.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded-xl text-sm border border-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4.5 h-4.5" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={exportToCSV}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm border border-slate-800 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4.5 h-4.5 text-slate-400" />
              <span>Exportar para CSV</span>
            </button>
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-850 gap-2 no-print">
        {[
          { id: 'agendamentos', label: 'Agendamentos' },
          { id: 'financeiro', label: 'Financeiro' },
          { id: 'parceiros', label: 'Parceiros' },
          { id: 'procedimentos', label: 'Procedimentos' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-450 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters Form */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/40 p-5 border border-slate-850 rounded-2xl filters-container no-print">
        <div className="flex flex-col space-y-1.5">
          <label className="text-slate-400 text-xs font-semibold uppercase">Data Inicial</label>
          <input
            type="date"
            value={dataInicial}
            onChange={(e) => setDataInicial(e.target.value)}
            className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm"
          />
        </div>

        <div className="flex flex-col space-y-1.5">
          <label className="text-slate-400 text-xs font-semibold uppercase">Data Final</label>
          <input
            type="date"
            value={dataFinal}
            onChange={(e) => setDataFinal(e.target.value)}
            className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm"
          />
        </div>

        {activeTab !== 'financeiro' && (
          <div className="flex flex-col space-y-1.5">
            <label className="text-slate-400 text-xs font-semibold uppercase">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
            >
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="realizado">Realizado</option>
              <option value="pago">Pago</option>
            </select>
          </div>
        )}

        {activeTab === 'agendamentos' && (
          <div className="flex flex-col space-y-1.5">
            <label className="text-slate-400 text-xs font-semibold uppercase">Parceiro</label>
            <select
              value={selectedParceiro}
              onChange={(e) => setSelectedParceiro(e.target.value)}
              className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
            >
              <option value="">Todos os Parceiros</option>
              {partners.map(p => (
                <option key={p.id_parceiro} value={p.id_parceiro}>{p.nome}</option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'procedimentos' && (
          <div className="flex flex-col space-y-1.5">
            <label className="text-slate-400 text-xs font-semibold uppercase">Tipo</label>
            <select
              value={tipoProcedimento}
              onChange={(e) => setTipoProcedimento(e.target.value)}
              className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
            >
              <option value="">Todos</option>
              <option value="consulta">Consulta</option>
              <option value="exame">Exame</option>
              <option value="procedimento">Procedimento</option>
            </select>
          </div>
        )}

        <div className="flex items-end md:col-span-4 justify-end gap-3 pt-2">
          <button
            onClick={() => {
              setDataInicial('');
              setDataFinal('');
              setStatus('');
              setSelectedParceiro('');
              setTipoProcedimento('');
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-355 font-semibold rounded-xl text-sm transition-all cursor-pointer"
          >
            Limpar Filtros
          </button>
          <button
            onClick={generateReport}
            className="px-5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded-xl text-sm border border-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Search className="w-4.5 h-4.5" />
            Filtrar Relatório
          </button>
        </div>
      </div>

      {/* Report Summary Cards */}
      {activeTab !== 'financeiro' && reportData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 metrics-grid">
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col space-y-2 metric-card">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Faturamento Bruto</span>
            <span className="text-2xl font-bold text-white">{formatCurrency(totalFaturado)}</span>
            <span className="text-xs text-slate-500">Valor total cobrado dos clientes</span>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col space-y-2 metric-card">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Repasse Parceiros</span>
            <span className="text-2xl font-bold text-teal-400">{formatCurrency(totalParceiro)}</span>
            <span className="text-xs text-slate-500">Valor devido às clínicas / médicos</span>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col space-y-2 metric-card">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Repasse Representantes</span>
            <span className="text-2xl font-bold text-rose-400">{formatCurrency(totalRepresentante)}</span>
            <span className="text-xs text-slate-500">Valor devido aos representantes comerciais</span>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col space-y-2 bg-gradient-to-br from-emerald-950/20 to-slate-900 metric-card">
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Lucro Líquido Otium</span>
            <span className="text-2xl font-extrabold text-emerald-400">{formatCurrency(totalComissao)}</span>
            <span className="text-xs text-emerald-500/80">Comissão líquida retida pela rede</span>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="p-16 text-center flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          <span className="text-slate-400 text-sm">Atualizando dados...</span>
        </div>
      ) : errorMsg ? (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : (
        /* Report Tables */
        <div className="border border-slate-850 bg-slate-900/20 rounded-2xl overflow-hidden table-container">
          {activeTab === 'agendamentos' && (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-850 bg-slate-900/40 text-slate-400 font-semibold">
                  <th className="p-4">Código</th>
                  <th className="p-4">Parceiro</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Vl. Parceiro</th>
                  <th className="p-4">Vl. Repres.</th>
                  <th className="p-4">Lucro Rede</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50 text-slate-300">
                {reportData.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-900/40">
                    <td className="p-4 font-semibold text-white">{r.codigo}</td>
                    <td className="p-4">{r.nome_parceiro}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold status-pill ${
                        r.status === 'pago' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-4">{formatCurrency(r.valor_parceiro)}</td>
                    <td className="p-4 text-rose-400 font-medium">{formatCurrency(r.valor_representante)}</td>
                    <td className="p-4 text-emerald-400 font-medium">{formatCurrency(r.valor_cf)}</td>
                    <td className="p-4 font-bold text-white">{formatCurrency(r.total)}</td>
                    <td className="p-4 text-xs">{new Date(r.data_criacao).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'financeiro' && (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-850 bg-slate-900/40 text-slate-400 font-semibold">
                  <th className="p-4">Parceiro</th>
                  <th className="p-4">Procedimentos Pendentes</th>
                  <th className="p-4">Faturados Pendentes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50 text-slate-300">
                {reportData.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-900/40">
                    <td className="p-4 font-semibold text-white">{r.nome_parceiro}</td>
                    <td className="p-4 text-amber-400">{formatCurrency(r.procedimentos_pendentes)}</td>
                    <td className="p-4 text-rose-450">{formatCurrency(r.financeiros_pendentes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'parceiros' && (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-850 bg-slate-900/40 text-slate-400 font-semibold">
                  <th className="p-4">Parceiro</th>
                  <th className="p-4">Agend.</th>
                  <th className="p-4">Proced.</th>
                  <th className="p-4">Vl. Parceiro (Total)</th>
                  <th className="p-4">Faturamento Otium (Total)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50 text-slate-300">
                {reportData.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-900/40">
                    <td className="p-4 font-semibold text-white">{r.nome_parceiro}</td>
                    <td className="p-4">{r.qnt_agendamentos}</td>
                    <td className="p-4">{r.qnt_procedimentos}</td>
                    <td className="p-4 text-teal-400">{formatCurrency(r.valor_parceiro_total)}</td>
                    <td className="p-4 text-emerald-400 font-bold">{formatCurrency(r.valor_cf_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'procedimentos' && (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-850 bg-slate-900/40 text-slate-400 font-semibold">
                  <th className="p-4">Procedimento</th>
                  <th className="p-4">Quantidade</th>
                  <th className="p-4">Repasse Parceiro</th>
                  <th className="p-4">Retenção Otium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50 text-slate-300">
                {reportData.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-900/40">
                    <td className="p-4 font-semibold text-white">{r.procedimento}</td>
                    <td className="p-4 font-medium">{r.quantidade}</td>
                    <td className="p-4 text-teal-400">{formatCurrency(r.valor_parceiro_total)}</td>
                    <td className="p-4 text-emerald-400 font-bold">{formatCurrency(r.valor_cf_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportData.length === 0 && (
            <div className="p-8 text-center text-slate-500">Nenhum dado retornado para este período.</div>
          )}
        </div>
      )}
    </div>
  );
}
