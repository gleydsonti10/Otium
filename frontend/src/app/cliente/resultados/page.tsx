'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Stethoscope, User, Calendar, FileText,
  Printer, X, Download, ShieldCheck, Activity, Loader2
} from 'lucide-react';

const API = 'http://localhost:3000';

// ─── PDF Generator (pure function, loads jsPDF dynamically) ───────────────

async function generateLaudoPDF(ag: any, laudo: any, nomeUsuario: string) {
  // Dynamic import to avoid SSR issues with jsPDF
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 20;

  const margin = 18;
  const contentW = W - margin * 2;

  // ── Helpers ──────────────────────────────────────────────────
  const addLine = (dy = 6) => { y += dy; };

  const drawRect = (x: number, ry: number, w: number, h: number, r = 2, fillColor = [248, 250, 252] as [number, number, number]) => {
    doc.setFillColor(...fillColor);
    doc.roundedRect(x, ry, w, h, r, r, 'F');
  };

  const text = (
    str: string, x: number, ty: number,
    { size = 10, bold = false, color = [30, 41, 59] as [number, number, number], align = 'left' as 'left' | 'center' | 'right' } = {}
  ) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    doc.text(str, x, ty, { align });
  };

  // ── Header / Marca ──────────────────────────────────────────
  // Green accent top bar
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, W, 8, 'F');

  // Logo box
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, 14, 36, 12, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('OTIUM', margin + 4.5, 22);

  // Title right side
  text('LAUDO CLÍNICO', W - margin, 18, { size: 14, bold: true, align: 'right', color: [15, 23, 42] });
  text('Sistema de Laudos Otium Saúde', W - margin, 24, { size: 8, align: 'right', color: [100, 116, 139] });

  y = 34;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, y, W - margin, y);
  addLine(6);

  // ── Patient Meta Block ───────────────────────────────────────
  drawRect(margin, y, contentW, 26, 3, [241, 245, 249]);

  const colW = contentW / 3;
  const metaY = y + 7;

  // Col 1 – patient name
  text('PACIENTE', margin + 4, metaY, { size: 7, bold: true, color: [100, 116, 139] });
  text(nomeUsuario, margin + 4, metaY + 6, { size: 10, bold: true, color: [15, 23, 42] });

  // Col 2 – booking code
  text('CÓD. AGENDAMENTO', margin + colW + 4, metaY, { size: 7, bold: true, color: [100, 116, 139] });
  text(`#${ag.codigo}`, margin + colW + 4, metaY + 6, { size: 10, bold: true, color: [15, 23, 42] });

  // Col 3 – date
  text('DATA DE EMISSÃO', margin + colW * 2 + 4, metaY, { size: 7, bold: true, color: [100, 116, 139] });
  text(
    new Date(laudo.data_laudo).toLocaleDateString('pt-BR'),
    margin + colW * 2 + 4, metaY + 6,
    { size: 10, bold: true, color: [15, 23, 42] }
  );

  y += 32;

  // ── Clinic info line ─────────────────────────────────────────
  text(`Clínica / Laboratório: ${ag.parceiro.nome}   ·   Tel: ${ag.parceiro.telefone || 'N/A'}`, margin, y, { size: 8, color: [100, 116, 139] });
  addLine(8);

  // ── Exam Title ───────────────────────────────────────────────
  doc.setFillColor(16, 185, 129);
  doc.rect(margin, y, 3.5, 16, 'F');

  text(ag.procedimentos[0]?.nome?.toUpperCase() || 'LAUDO CLÍNICO', margin + 7, y + 6, { size: 13, bold: true, color: [15, 23, 42] });
  text(ag.procedimentos[0]?.tipo || 'Exame Clínico', margin + 7, y + 13, { size: 8, color: [100, 116, 139] });
  y += 22;

  // ── Procedures table ─────────────────────────────────────────
  if (ag.procedimentos.length > 0) {
    drawRect(margin, y, contentW, 10 + ag.procedimentos.length * 8, 2, [248, 250, 252]);

    text('PROCEDIMENTOS REALIZADOS', margin + 4, y + 7, { size: 7, bold: true, color: [100, 116, 139] });
    let procY = y + 13;

    ag.procedimentos.forEach((p: any) => {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(margin + 4, procY - 2, W - margin - 4, procY - 2);
      text(`• ${p.nome}`, margin + 4, procY + 2, { size: 9, color: [30, 41, 59] });
      text(`Qtd: ${p.quantidade}`, W - margin - 20, procY + 2, { size: 9, color: [100, 116, 139] });
      procY += 8;
    });

    y += 10 + ag.procedimentos.length * 8 + 8;
  }

  // ── Diagnosis Section ─────────────────────────────────────────
  text('DESCRIÇÃO DOS RESULTADOS', margin, y, { size: 8, bold: true, color: [100, 116, 139] });
  addLine(6);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, W - margin, y);
  addLine(6);

  // Wrap long text
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  const conclusaoLines = doc.splitTextToSize(laudo.conclusao, contentW);
  doc.text(conclusaoLines, margin, y);
  y += conclusaoLines.length * 5.5 + 6;

  if (laudo.observacoes) {
    text('OBSERVAÇÕES', margin, y, { size: 8, bold: true, color: [100, 116, 139] });
    addLine(6);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, W - margin, y);
    addLine(6);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    const obsLines = doc.splitTextToSize(laudo.observacoes, contentW);
    doc.text(obsLines, margin, y);
    y += obsLines.length * 5.5 + 8;
  }

  // ── Reference Table ───────────────────────────────────────────
  drawRect(margin, y, contentW, 24, 2, [240, 253, 244]);
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.6);
  doc.rect(margin, y, contentW, 24, 'S');

  text('VALORES DE REFERÊNCIA — ANÁLISE CLÍNICA GERAL', margin + 4, y + 7, { size: 7, bold: true, color: [5, 150, 105] });
  text('Parâmetro: Estabilidade Metabólica', margin + 4, y + 14, { size: 9, color: [30, 41, 59] });
  text('Medido: Normal ✓', margin + 70, y + 14, { size: 9, color: [16, 185, 129] });
  text('Referência: Fisiologia Padrão', margin + 120, y + 14, { size: 9, color: [30, 41, 59] });

  y += 30;

  // ── Signature Block ───────────────────────────────────────────
  // Check if we need a new page
  if (y + 55 > pageH - 20) {
    doc.addPage();
    y = 20;
  }

  // Stamp box
  drawRect(margin, y, contentW, 38, 3, [240, 253, 250]);
  doc.setDrawColor(20, 184, 166);
  doc.setLineWidth(0.5);
  doc.setLineDashPattern([2, 2], 0);
  doc.rect(margin, y, contentW, 38, 'S');
  doc.setLineDashPattern([], 0);

  text('✓  ASSINATURA DIGITALIZADA CONCLUÍDA', margin + 6, y + 10, { size: 9, bold: true, color: [5, 150, 105] });
  text('CRM / Registro Médico Válido — Otium Saúde Digital', margin + 6, y + 18, { size: 8, color: [100, 116, 139] });

  // Signature line
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  doc.line(margin + 6, y + 30, margin + 100, y + 30);
  text(laudo.medico_responsavel, margin + 6, y + 35, { size: 9, bold: true, color: [15, 23, 42] });
  text('Diretor Clínico', margin + 6, y + 40, { size: 7, color: [100, 116, 139] });

  // QR Code placeholder (right side)
  drawRect(W - margin - 32, y + 6, 28, 28, 2, [241, 245, 249]);
  text('[ QR ]', W - margin - 18, y + 22, { size: 7, color: [148, 163, 184], align: 'center' });
  text('Autenticidade', W - margin - 18, y + 28, { size: 6, color: [148, 163, 184], align: 'center' });

  y += 44;

  // ── Footer ────────────────────────────────────────────────────
  const footerY = pageH - 12;
  doc.setFillColor(15, 23, 42);
  doc.rect(0, footerY - 4, W, 16, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Otium Saúde — Documento gerado digitalmente. Válido sem assinatura física.', margin, footerY + 3);
  doc.text(
    `Emitido em ${new Date().toLocaleString('pt-BR')}`,
    W - margin, footerY + 3,
    { align: 'right' }
  );

  // ── Save ─────────────────────────────────────────────────────
  const fileName = `Laudo_Otium_${ag.codigo}_${ag.procedimentos[0]?.nome?.replace(/\s+/g, '_') || 'Exame'}.pdf`;
  doc.save(fileName);
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ResultadosPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nomeUsuario, setNomeUsuario] = useState('Associado Otium');

  // Modal state
  const [selectedLaudo, setSelectedLaudo] = useState<any>(null);
  const [activeAppointment, setActiveAppointment] = useState<any>(null);

  // PDF download loading state (per appointment)
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    const userData = localStorage.getItem('user');
    if (userData) {
      try { setNomeUsuario(JSON.parse(userData).nome_usuario || 'Associado Otium'); } catch { /* noop */ }
    }

    fetch(`${API}/api/cliente/agendamentos`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAppointments(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar laudos:', err);
        setIsLoading(false);
      });
  }, [router]);

  const handleOpenLaudo = (ag: any) => {
    setActiveAppointment(ag);
    setSelectedLaudo(ag.laudo);
  };

  const handleDownloadPDF = useCallback(async (ag: any) => {
    setDownloadingId(ag.id_agendamento);
    try {
      await generateLaudoPDF(ag, ag.laudo, nomeUsuario);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar o PDF. Tente novamente.');
    } finally {
      setDownloadingId(null);
    }
  }, [nomeUsuario]);

  const handlePrint = () => window.print();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span>Carregando seus resultados...</span>
      </div>
    );
  }

  const completedBookings = appointments.filter(a => a.status === 'realizado' && a.laudo);

  return (
    <div className="space-y-8">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/50 border border-emerald-800/30 rounded-full">
          Resultados Digitais
        </span>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Meus Resultados & Laudos</h1>
        <p className="text-slate-400 text-sm max-w-xl">
          Consulte laudos médicos de consultas e resultados detalhados de exames clínicos realizados em nossa rede. Faça o download em PDF com um clique.
        </p>
      </motion.div>

      {completedBookings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {completedBookings.map((ag, i) => (
            <motion.div
              key={ag.id_agendamento}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 flex flex-col justify-between group hover:border-slate-700/60 transition-all"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] uppercase font-bold text-teal-400 bg-teal-950/40 border border-teal-800/30 px-2 py-0.5 rounded-md tracking-wider">
                    Resultado Pronto
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Exame / Procedimento</span>
                  <h3 className="font-bold text-white text-lg group-hover:text-emerald-400 transition-colors">
                    {ag.procedimentos[0]?.nome || 'Laudo Clínico'}
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">Realizado em: {ag.parceiro.nome}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/40 border border-slate-800/40 rounded-xl text-[11px] text-slate-400">
                  <div>
                    <span className="text-slate-500 block text-[9px]">DATA EXAME</span>
                    <span className="text-slate-200 font-semibold block mt-0.5">
                      {new Date(ag.data_realizacao || ag.data_criacao).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">LIBERADO EM</span>
                    <span className="text-slate-200 font-semibold block mt-0.5">
                      {new Date(ag.laudo.data_laudo).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-800 flex gap-2">
                <button
                  onClick={() => handleOpenLaudo(ag)}
                  className="flex-1 py-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-teal-400 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  Visualizar
                </button>
                <button
                  onClick={() => handleDownloadPDF(ag)}
                  disabled={downloadingId === ag.id_agendamento}
                  className="flex-1 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {downloadingId === ag.id_agendamento
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                    : <><Download className="w-4 h-4" /> Baixar PDF</>
                  }
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-12 bg-slate-900/30 border border-slate-800/60 border-dashed rounded-3xl text-center space-y-3 max-w-lg mx-auto"
        >
          <ClipboardList className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-white font-bold text-base">Nenhum resultado liberado</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Seus laudos e relatórios de exames aparecerão aqui automaticamente assim que os profissionais de saúde concluírem as análises.
          </p>
        </motion.div>
      )}

      {/* ── Laudo Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedLaudo && (
          <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-slate-900 border border-slate-800/80 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[88vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-400" />
                  Visualização de Laudo Clínico
                </h3>
                <div className="flex items-center gap-2">
                  {/* Download PDF */}
                  <button
                    onClick={() => handleDownloadPDF(activeAppointment)}
                    disabled={downloadingId === activeAppointment?.id_agendamento}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
                  >
                    {downloadingId === activeAppointment?.id_agendamento
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Download className="w-3.5 h-3.5" />
                    }
                    PDF
                  </button>
                  {/* Print */}
                  <button
                    onClick={handlePrint}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
                    title="Imprimir Laudo"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  {/* Close */}
                  <button
                    onClick={() => { setSelectedLaudo(null); setActiveAppointment(null); }}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Printable Laudo Body */}
              <div className="p-6 md:p-10 overflow-y-auto flex-1 bg-white text-slate-900 font-sans" id="printable-laudo">
                <style>{`
                  @media print {
                    body * { visibility: hidden; }
                    #printable-laudo, #printable-laudo * { visibility: visible; }
                    #printable-laudo {
                      position: absolute; left: 0; top: 0;
                      width: 100%; padding: 24px;
                    }
                  }
                `}</style>

                {/* Top accent bar (print view) */}
                <div className="h-2 -mx-10 -mt-10 mb-8 bg-gradient-to-r from-emerald-500 to-teal-500 print:block hidden" />

                {/* Letterhead */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-slate-800 pb-5 gap-4">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-xl font-black tracking-tight text-slate-950 block">OTIUM SAÚDE</span>
                      <span className="text-[10px] text-slate-500">Sistema de Laudos Digitais</span>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-500 space-y-0.5">
                    <div><strong>Clínica/Lab:</strong> {activeAppointment?.parceiro.nome}</div>
                    <div><strong>Tel:</strong> {activeAppointment?.parceiro.telefone || 'N/A'}</div>
                    <div><strong>Emissão:</strong> {new Date(selectedLaudo.data_laudo).toLocaleDateString('pt-BR')}</div>
                  </div>
                </div>

                {/* Patient info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-200 py-5 text-xs text-slate-700">
                  <div className="space-y-1">
                    <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Paciente</span>
                    <strong className="text-slate-950 text-sm block">{nomeUsuario}</strong>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Código Agendamento</span>
                    <span className="text-slate-950 font-mono font-semibold block"># {activeAppointment?.codigo}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Data de Emissão</span>
                    <span className="text-slate-950 block">
                      {new Date(selectedLaudo.data_laudo).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(selectedLaudo.data_laudo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Exam Title */}
                <div className="py-6 flex items-center gap-3">
                  <div className="w-1 h-10 bg-emerald-500 rounded-full" />
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-wide">
                      {activeAppointment?.procedimentos[0]?.nome}
                    </h2>
                    <span className="text-xs text-slate-500">{activeAppointment?.procedimentos[0]?.tipo || 'Exame Clínico'}</span>
                  </div>
                </div>

                {/* Procedures performed */}
                {activeAppointment?.procedimentos?.length > 0 && (
                  <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Procedimentos Realizados</span>
                    <div className="space-y-1.5">
                      {activeAppointment.procedimentos.map((p: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-xs text-slate-700">
                          <span>• {p.nome}</span>
                          <span className="text-slate-400">Qtd: {p.quantidade}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Results */}
                <div className="space-y-6 text-slate-800 text-sm leading-relaxed">
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-950 text-xs uppercase tracking-wider border-b border-slate-200 pb-2">
                      Descrição dos Resultados:
                    </h4>
                    <p className="indent-5">{selectedLaudo.conclusao}</p>
                    {selectedLaudo.observacoes && (
                      <p className="indent-5 text-slate-600">{selectedLaudo.observacoes}</p>
                    )}
                  </div>

                  {/* Reference ranges */}
                  <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50 space-y-2">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                      Valores de Referência — Análise Clínica Geral
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
                      <div><strong>Parâmetro:</strong> Estabilidade Metabólica</div>
                      <div className="text-emerald-700 font-semibold"><strong>Medido:</strong> Normal ✓</div>
                      <div><strong>Referência:</strong> Fisiologia Padrão</div>
                    </div>
                  </div>
                </div>

                {/* Signature */}
                <div className="mt-12 pt-6 border-t-2 border-slate-200 flex flex-col items-center text-center space-y-3">
                  <div className="border border-dashed border-teal-500/60 bg-teal-50 px-5 py-3 rounded-xl text-teal-700 text-xs flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-teal-600 flex-shrink-0" />
                    <div className="text-left space-y-0.5">
                      <div className="font-bold">Assinatura Digitalizada Concluída</div>
                      <div className="text-teal-600">CRM / Registro Médico Válido — Otium Saúde</div>
                    </div>
                  </div>
                  <div className="space-y-1 mt-3">
                    <div className="w-40 h-px bg-slate-400 mx-auto mb-2" />
                    <strong className="text-slate-950 text-sm block">{selectedLaudo.medico_responsavel}</strong>
                    <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">Diretor Clínico — CRM-PI</span>
                  </div>
                </div>

                {/* Footer note */}
                <div className="mt-8 pt-3 border-t border-slate-100 text-center text-[9px] text-slate-400">
                  Documento gerado digitalmente pelo Sistema Otium Saúde. Válido sem assinatura física. Emitido em {new Date().toLocaleString('pt-BR')}.
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center gap-3">
                <span className="text-xs text-slate-500">
                  Laudo gerado em {new Date(selectedLaudo.data_laudo).toLocaleDateString('pt-BR')}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadPDF(activeAppointment)}
                    disabled={downloadingId === activeAppointment?.id_agendamento}
                    className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-emerald-500/10"
                  >
                    {downloadingId === activeAppointment?.id_agendamento
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando PDF...</>
                      : <><Download className="w-4 h-4" /> Baixar PDF</>
                    }
                  </button>
                  <button
                    onClick={() => { setSelectedLaudo(null); setActiveAppointment(null); }}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs border border-slate-700 transition-all cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
