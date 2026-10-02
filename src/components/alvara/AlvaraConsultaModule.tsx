import React, { useState } from 'react';
import {
  Search,
  Plus,
  FileText,
  Printer,
  Copy,
  Edit3,
  Trash2,
  CheckCircle,
  Folder,
  Zap,
  Download,
  Loader2,
  Sparkles
} from 'lucide-react';
import { AlvaraSanitarioItem } from '../../types';
import { ModeloAlvaraDef, MODELOS_DISPONIVEIS } from './alvaraUtils';

interface AlvaraConsultaModuleProps {
  alvaras: AlvaraSanitarioItem[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  modeloFilter: string;
  setModeloFilter: (filter: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  selectedPastaFilter: string | null;
  setSelectedPastaFilter: (pasta: string | null) => void;
  onOpenViewer: (alvara: AlvaraSanitarioItem, mode?: 'pdf_oficial' | 'docs_embed' | 'timbrado') => void;
  onCopyDataForDocs: (alvara: AlvaraSanitarioItem) => void;
  onEditAlvara: (alvara: AlvaraSanitarioItem) => void;
  onDeleteAlvara: (id: string, numero: string) => void;
  onSelectModeloParaCadastro: (modelo: ModeloAlvaraDef) => void;
  onQuickSearchAndGeneratePdf: (query: string) => Promise<void>;
}

export function AlvaraConsultaModule({
  alvaras,
  searchTerm,
  setSearchTerm,
  modeloFilter,
  setModeloFilter,
  statusFilter,
  setStatusFilter,
  selectedPastaFilter,
  setSelectedPastaFilter,
  onOpenViewer,
  onCopyDataForDocs,
  onEditAlvara,
  onDeleteAlvara,
  onSelectModeloParaCadastro,
  onQuickSearchAndGeneratePdf,
}: AlvaraConsultaModuleProps) {
  const [quickQuery, setQuickQuery] = useState('');
  const [isSearchingQuick, setIsSearchingQuick] = useState(false);

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuery.trim()) return;
    setIsSearchingQuick(true);
    try {
      await onQuickSearchAndGeneratePdf(quickQuery.trim());
    } finally {
      setIsSearchingQuick(false);
    }
  };

  // Filtragem dos alvarás
  const filteredAlvaras = alvaras.filter((alv) => {
    if (selectedPastaFilter && alv.pasta !== selectedPastaFilter) return false;
    if (modeloFilter !== 'TODOS' && alv.modelo_tipo !== modeloFilter) return false;
    if (statusFilter !== 'TODOS' && alv.status !== statusFilter) return false;
    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();
    return (
      (alv.numero_alvara || '').toLowerCase().includes(term) ||
      (alv.razao_social || '').toLowerCase().includes(term) ||
      (alv.cnpj_cpf || '').toLowerCase().includes(term) ||
      (alv.nome_fantasia || '').toLowerCase().includes(term) ||
      (alv.endereco || '').toLowerCase().includes(term) ||
      (alv.bairro || '').toLowerCase().includes(term) ||
      (alv.pasta || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      {/* CARD DESTAQUE: BUSCAR DADOS & GERAR ALVARÁ EM PDF (GOOGLE DOCS) PARA SERVIDOR E MUNÍCIPE */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-5 sm:p-6 rounded-3xl shadow-lg border border-blue-600 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 text-yellow-300 shadow-inner">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-sm">
                <Sparkles className="w-3 h-3" />
                Servidor & Munícipe
              </div>
              <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-white mt-1">
                Buscar Dados & Gerar Alvará em PDF
              </h3>
              <p className="text-xs text-blue-100">
                O servidor ou munícipe digita o CPF, CNPJ, Razão Social ou Processo e o sistema busca os dados e gera o Alvará em PDF baseado no modelo do Google Docs.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleQuickSubmit} className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Digite o CPF, CNPJ, Razão Social ou Nº de Processo..."
              className="w-full pl-10 pr-4 py-3 bg-white text-slate-900 placeholder-slate-400 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={isSearchingQuick || !quickQuery.trim()}
            className="w-full sm:w-auto px-5 py-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-black text-xs uppercase rounded-2xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer whitespace-nowrap"
          >
            {isSearchingQuick ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Buscando & Gerando PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-slate-950" />
                <span>Buscar Dados & Gerar PDF</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Barra de Ações Rápidas em Botões: Modelos e Filtros */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
        {/* Linha 1: Botões de emissão rápida por categoria */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase text-slate-500 mr-1">
              Cadastrar por Categoria:
            </span>
            {MODELOS_DISPONIVEIS.map((mod) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => onSelectModeloParaCadastro(mod)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-500 hover:text-slate-950 hover:border-amber-500 text-slate-700 dark:text-slate-200 text-xs font-black uppercase transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>{mod.icone}</span>
                <span>{mod.titulo}</span>
                <Plus className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          {selectedPastaFilter && (
            <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/40 px-3 py-1 rounded-xl border border-purple-200 dark:border-purple-900 text-xs">
              <Folder className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-purple-900 dark:text-purple-300 font-bold">
                Pasta filtrada: <strong>{selectedPastaFilter}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedPastaFilter(null)}
                className="text-purple-600 hover:text-purple-800 font-black cursor-pointer ml-1"
                title="Limpar filtro de pasta"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Linha 2: Barra de Filtros */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar tabela por Nome, CPF/CNPJ, Denominação Fantasia, Pasta ou Bairro..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={modeloFilter}
              onChange={(e) => setModeloFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="TODOS">Todos os Modelos</option>
              <option value="PONTO_MILHO_CHURROS">Ponto Milho e Churro</option>
              <option value="FEIRANTE">Alvará Feirante</option>
              <option value="GERAL">Alvará Geral</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="ATIVO">Ativos</option>
              <option value="EM RENOVAÇÃO">Em Renovação</option>
              <option value="VENCIDO">Vencidos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela dos Alvarás Cadastrados com os 9 Campos */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                <th className="p-3.5">Modelo / Registro</th>
                <th className="p-3.5">Nome Pessoa Física / Jurídica</th>
                <th className="p-3.5">CPF / CNPJ</th>
                <th className="p-3.5">Nome Fantasia</th>
                <th className="p-3.5">Endereço & Nº/Compl.</th>
                <th className="p-3.5">Bairro / CEP</th>
                <th className="p-3.5">Emissão</th>
                <th className="p-3.5">Pasta</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAlvaras.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Nenhum alvará cadastrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredAlvaras.map((alv) => (
                  <tr key={alv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    {/* Modelo / Registro */}
                    <td className="p-3.5">
                      <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{alv.numero_alvara}</span>
                      </div>
                      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 mt-0.5">
                        {alv.modelo_tipo === 'PONTO_MILHO_CHURROS'
                          ? '🌽 MILHO/CHURRO'
                          : alv.modelo_tipo === 'FEIRANTE'
                          ? '🎪 FEIRANTE'
                          : '🏢 GERAL'}
                      </div>
                    </td>

                    {/* Nome da Pessoa Física e/ou Jurídica */}
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white uppercase max-w-[200px] truncate" title={alv.razao_social}>
                      {alv.razao_social}
                    </td>

                    {/* CPF / CNPJ */}
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {alv.cnpj_cpf}
                    </td>

                    {/* Denominação Comercial / Nome Fantasia */}
                    <td className="p-3.5 text-slate-600 dark:text-slate-300 uppercase max-w-[160px] truncate" title={alv.nome_fantasia || '-'}>
                      {alv.nome_fantasia || '-'}
                    </td>

                    {/* Endereço + Nº / Compl */}
                    <td className="p-3.5 text-slate-700 dark:text-slate-200 uppercase">
                      <div className="line-clamp-1">{alv.endereco}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">
                        Nº {alv.numero} {alv.complemento ? `• ${alv.complemento}` : ''}
                      </div>
                    </td>

                    {/* Bairro / CEP */}
                    <td className="p-3.5 text-slate-600 dark:text-slate-300 uppercase whitespace-nowrap">
                      <div>{alv.bairro}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{alv.cep || '-'}</div>
                    </td>

                    {/* Emissão */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {alv.data_emissao.split('-').reverse().join('/')}
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        Até: {alv.validade.split('-').reverse().join('/')}
                      </div>
                      {alv.assinatura_digital && (
                        <div className="inline-flex items-center gap-1 text-[9px] text-emerald-700 dark:text-emerald-400 font-bold mt-0.5" title={alv.assinatura_digital}>
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>Assinado</span>
                        </div>
                      )}
                    </td>

                    {/* Pasta */}
                    <td className="p-3.5 whitespace-nowrap">
                      {alv.pasta ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
                          📁 {alv.pasta}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Sem pasta</span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Botão Unificado: Emitir / Visualizar Alvará em PDF */}
                        <button
                          type="button"
                          onClick={() => onOpenViewer(alv, 'pdf_oficial')}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                          title="Emitir, Visualizar e Imprimir Alvará Oficial em PDF"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Emitir Alvará</span>
                        </button>

                        {/* Copiar 9 Campos Formatados */}
                        <button
                          type="button"
                          onClick={() => onCopyDataForDocs(alv)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                          title="Copiar os 9 campos formatados para colar no Google Docs"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {/* Editar */}
                        <button
                          type="button"
                          onClick={() => onEditAlvara(alv)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                          title="Editar Alvará"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Excluir */}
                        <button
                          type="button"
                          onClick={() => onDeleteAlvara(alv.id, alv.numero_alvara)}
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                          title="Excluir Alvará"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

