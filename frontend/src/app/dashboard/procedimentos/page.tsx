'use client';

import React, { useEffect, useState } from 'react';
import { ClipboardList, Search, Filter, AlertCircle, RefreshCw, Layers } from 'lucide-react';

export default function ProcedimentosPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [procedures, setProcedures] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchProcedimentos = async () => {
      try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        
        // Construct endpoint. If admin, we can fetch all procedures. If partner, we fetch their own partner-procedures.
        const endpoint = user?.role?.level >= 50
          ? 'http://localhost:3000/api/procedimentos'
          : 'http://localhost:3000/api/parceiro-procedimentos';

        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao carregar procedimentos.');
        }

        setProcedures(data);
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro de conexão com o servidor.');
      } finally {
        setLoading(false);
      }
    };

    fetchProcedimentos();
  }, []);

  const filteredProcedures = procedures.filter((p) =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.codigo_tuss && p.codigo_tuss.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 lg:p-10 flex flex-col space-y-8">
      <header className="flex flex-col space-y-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Procedimentos</h1>
        <p className="text-slate-400 text-sm">
          Visualize a listagem de exames, consultas e procedimentos cadastrados com seus respectivos valores.
        </p>
      </header>

      {/* Filter and search controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/40 p-4 border border-slate-850 rounded-2xl">
        <div className="relative w-full sm:max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
          <input
            type="text"
            placeholder="Pesquisar por nome ou código TUSS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80 transition-all text-sm"
          />
        </div>
      </div>

      {/* Main content grid */}
      {errorMsg ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl flex items-center space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          <span className="mt-4 text-sm">Carregando procedimentos...</span>
        </div>
      ) : filteredProcedures.length === 0 ? (
        <div className="py-20 border border-slate-800/50 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-500">
          <ClipboardList className="w-12 h-12 text-slate-600 mb-3" />
          <span className="text-sm">Nenhum procedimento localizado para a busca atual.</span>
        </div>
      ) : (
        <div className="overflow-x-auto bg-slate-900/40 border border-slate-850 rounded-3xl">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-850 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <th className="p-4 pl-6">Código TUSS</th>
                <th className="p-4">Procedimento / Exame</th>
                <th className="p-4">Tipo</th>
                {/* Specific columns for partners if present */}
                {filteredProcedures[0]?.valor_total !== undefined && (
                  <>
                    <th className="p-4">Valor Total</th>
                    <th className="p-4">Valor Repasse</th>
                    <th className="p-4 pr-6 text-right">Comissão</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 font-medium text-slate-300">
              {filteredProcedures.map((p, idx) => (
                <tr key={p.id_procedimento_parceiro || p.id_procedimento || idx} className="hover:bg-slate-900/30 transition-colors">
                  <td className="p-4 pl-6 text-white font-mono">{p.codigo_tuss || 'N/A'}</td>
                  <td className="p-4 text-white font-semibold">{p.nome}</td>
                  <td className="p-4 text-slate-400">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-xs uppercase">
                      {p.tipo || 'EXAME'}
                    </span>
                  </td>
                  {p.valor_total !== undefined && (
                    <>
                      <td className="p-4 text-emerald-400">R$ {parseFloat(p.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="p-4 text-teal-400">R$ {parseFloat(p.valor_parceiro).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="p-4 pr-6 text-right text-slate-400">R$ {parseFloat(p.comissao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
