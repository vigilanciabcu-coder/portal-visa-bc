import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserProfile, CnaeItem, CnaeGrouped, CnaeOption } from '../types';
import {
  fetchCnaesFromSupabase,
  groupCnaeRows,
  saveCnaesToCache,
  parseCnaeCsv,
  saveCnaesBatchToSupabase,
  normalizeText,
  formatCnaeCode
} from '../lib/cnaeService';
import {
  Search,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ShieldCheck,
  Building2,
  Plus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  UploadCloud,
  FileText,
  Layers,
  HelpCircle,
  ExternalLink,
  Filter,
  ArrowRight,
  Sparkles,
  Info,
  X
} from 'lucide-react';

interface CnaeViewProps {
  currentUser: UserProfile | null;
  onNavigate: (view: any) => void;
}

interface SelectedEstablishmentCnae {
  subclasse: string;
  denominacao: string;
  respostaSelecionada?: string;
  riscoFinal: string;
  tipo: 'PRINCIPAL' | 'SECUNDÁRIA';
}

export const CnaeView: React.FC<CnaeViewProps> = ({ currentUser, onNavigate }) => {
  // Estado dos Dados
  const [rawCnaes, setRawCnaes] = useState<CnaeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isFromSupabase, setIsFromSupabase] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Estados de Busca e Seleção
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // CNAE Atualmente em Análise no Assistente
  const [activeCnae, setActiveCnae] = useState<CnaeGrouped | null>(null);
  const [selectedOption, setSelectedOption] = useState<CnaeOption | null>(null);

  // Lista Consolidada do Estabelecimento (Simulador Multi-CNAE)
  const [establishmentName, setEstablishmentName] = useState<string>('');
  const [establishmentCnpj, setEstablishmentCnpj] = useState<string>('');
  const [basket, setBasket] = useState<SelectedEstablishmentCnae[]>([]);

  // Filtros da Tabela Geral
  const [filterRisk, setFilterRisk] = useState<'TODOS' | 'ALTO' | 'MEDIO' | 'BAIXO' | 'VARIAVEL'>('TODOS');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [tableViewMode, setTableViewMode] = useState<'agrupado' | 'linhas'>('agrupado');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  // Modal de Importação CSV / Planilha
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [csvInput, setCsvInput] = useState<string>('');
  const [importPreview, setImportPreview] = useState<CnaeItem[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // Carregar dados na inicialização
  useEffect(() => {
    loadData();
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await fetchCnaesFromSupabase();
      setRawCnaes(result.data);
      setIsFromSupabase(result.fromSupabase);
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await fetchCnaesFromSupabase();
      setRawCnaes(result.data);
      setIsFromSupabase(result.fromSupabase);
    } finally {
      setIsSyncing(false);
    }
  };

  // Agrupamento estruturado
  const groupedCnaes = useMemo(() => {
    return groupCnaeRows(rawCnaes);
  }, [rawCnaes]);

  // Estatísticas Rápidas
  const stats = useMemo(() => {
    let alto = 0;
    let medio = 0;
    let baixo = 0;
    let variaveis = 0;

    groupedCnaes.forEach((g) => {
      if (g.temVariavel) {
        variaveis++;
      } else if (g.riscoFixo === 'Alto Risco') {
        alto++;
      } else if (g.riscoFixo === 'Médio Risco') {
        medio++;
      } else {
        baixo++;
      }
    });

    return {
      total: groupedCnaes.length,
      alto,
      medio,
      baixo,
      variaveis
    };
  }, [groupedCnaes]);

  // Sugestões no Autocomplete de Busca
  const searchSuggestions = useMemo(() => {
    const q = normalizeText(searchQuery);
    if (!q) return [];

    const digitsOnly = searchQuery.replace(/[^0-9]/g, '');

    return groupedCnaes
      .filter((g) => {
        const codeDigits = g.subclasse.replace(/[^0-9]/g, '');
        const matchCode = g.subclasse.includes(searchQuery) || (digitsOnly.length > 0 && codeDigits.includes(digitsOnly));
        const matchName = normalizeText(g.denominacaoOficial).includes(q);
        const matchPergunta = g.pergunta ? normalizeText(g.pergunta).includes(q) : false;
        return matchCode || matchName || matchPergunta;
      })
      .slice(0, 15);
  }, [groupedCnaes, searchQuery]);

  // Manipula seleção de CNAE para o Assistente
  const handleSelectCnae = (cnae: CnaeGrouped) => {
    setActiveCnae(cnae);
    setSelectedOption(null);
    setIsDropdownOpen(false);
    setSearchQuery(`${cnae.subclasse} - ${cnae.denominacaoOficial.slice(0, 45)}...`);
  };

  // Enquadramento atual resultante
  const currentEnquadramento = useMemo(() => {
    if (!activeCnae) return null;

    if (!activeCnae.temVariavel) {
      return {
        risco: activeCnae.riscoFixo || 'Baixo Risco',
        resposta: 'Enquadramento Direto (Risco Fixo)',
        condicionante: null
      };
    }

    if (selectedOption) {
      return {
        risco: selectedOption.risco,
        resposta: selectedOption.resposta,
        condicionante: activeCnae.pergunta
      };
    }

    return {
      risco: 'A Definir',
      resposta: 'Aguardando seleção da resposta à condicionante',
      condicionante: activeCnae.pergunta
    };
  }, [activeCnae, selectedOption]);

  // Adiciona ao Simulador Multi-CNAE
  const handleAddToBasket = (tipo: 'PRINCIPAL' | 'SECUNDÁRIA' = 'PRINCIPAL') => {
    if (!activeCnae || !currentEnquadramento || currentEnquadramento.risco === 'A Definir') {
      alert('Por favor, selecione a resposta da condicionante para enquadrar a atividade antes de adicionar.');
      return;
    }

    const newItem: SelectedEstablishmentCnae = {
      subclasse: activeCnae.subclasse,
      denominacao: activeCnae.denominacaoOficial,
      respostaSelecionada: selectedOption?.resposta,
      riscoFinal: currentEnquadramento.risco,
      tipo
    };

    setBasket((prev) => [...prev.filter((it) => it.subclasse !== activeCnae.subclasse), newItem]);
  };

  // Remove da Cesta
  const handleRemoveFromBasket = (subclasse: string) => {
    setBasket((prev) => prev.filter((it) => it.subclasse !== subclasse));
  };

  // Risco Global Consolidado do Estabelecimento
  const basketGlobalRisk = useMemo(() => {
    if (basket.length === 0) return null;

    const hasAlto = basket.some((it) => it.riscoFinal.toLowerCase().includes('alto') || it.riscoFinal.includes('III'));
    if (hasAlto) {
      return {
        nivel: 'Alto Risco (Risco III)',
        cor: 'red',
        descricao: 'Vistoria Prévia Obrigatória',
        orientacao: 'O estabelecimento possui atividade(s) de Alto Risco Sanitário. O alvará só poderá ser concedido após vistoria in loco favorável dos fiscais sanitaristas e cumprimento de todas as exigências técnicas.'
      };
    }

    const hasMedio = basket.some((it) => it.riscoFinal.toLowerCase().includes('médio') || it.riscoFinal.toLowerCase().includes('medio') || it.riscoFinal.includes('II'));
    if (hasMedio) {
      return {
        nivel: 'Médio Risco (Risco II)',
        cor: 'amber',
        descricao: 'Licenciamento Simplificado / Autodeclaração',
        orientacao: 'O estabelecimento possui atividade(s) de Médio Risco Sanitário. Permite licenciamento mediante autodeclaração de cumprimento das normas sanitárias, com fiscalização posterior.'
      };
    }

    return {
      nivel: 'Baixo Risco (Risco I)',
      cor: 'emerald',
      descricao: 'Dispensa de Alvará Prévio',
      orientacao: 'Todas as atividades declaradas são de Baixo Risco Sanitário. Conforme a Lei de Liberdade Econômica, o estabelecimento está dispensado de atos públicos de liberação prévia.'
    };
  }, [basket]);

  // Copiar Parecer Individual
  const handleCopySingleParecer = () => {
    if (!activeCnae || !currentEnquadramento) return;

    const texto = `[PARECER DE ENQUADRAMENTO SANITÁRIO - CNAE]
Vigilância Sanitária de Balneário Camboriú/SC

- Subclasse/CNAE: ${activeCnae.subclasse}
- Atividade: ${activeCnae.denominacaoOficial}
${activeCnae.pergunta ? `- Condicionante/Pergunta: ${activeCnae.pergunta}\n- Resposta Declarada: ${currentEnquadramento.resposta}` : ''}
- Classificação de Risco: ${currentEnquadramento.risco}
- Enquadramento Técnico: ${
      currentEnquadramento.risco.includes('Alto')
        ? 'Risco III (Alto Risco) - Exige vistoria sanitária prévia.'
        : currentEnquadramento.risco.includes('Médio') || currentEnquadramento.risco.includes('Medio')
        ? 'Risco II (Médio Risco) - Licença com autodeclaração e fiscalização posterior.'
        : 'Risco I (Baixo Risco) - Dispensado de alvará prévio conforme legislação.'
    }
Data da Consulta: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`;

    navigator.clipboard.writeText(texto);
    setCopiedText('single');
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Copiar Parecer Consolidado do Estabelecimento
  const handleCopyConsolidatedParecer = () => {
    if (basket.length === 0 || !basketGlobalRisk) return;

    const listaCnaes = basket
      .map(
        (it, idx) =>
          `${idx + 1}. [${it.tipo}] ${it.subclasse} - ${it.denominacao}\n   Risco Individual: ${it.riscoFinal}${
            it.respostaSelecionada ? ` (Condicionante: ${it.respostaSelecionada})` : ''
          }`
      )
      .join('\n\n');

    const texto = `[PARECER SANITÁRIO CONSOLIDADO DO ESTABELECIMENTO]
Vigilância Sanitária Municipal - Balneário Camboriú/SC

EMPRESA / INTERESSADO: ${establishmentName || 'Não Informado'}
CNPJ/CPF: ${establishmentCnpj || 'Não Informado'}
DATA DO ENQUADRAMENTO: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}

ATIVIDADES ECONÔMICAS DECLARADAS:
${listaCnaes}

--------------------------------------------------
RESULTADO DO ENQUADRAMENTO GLOBAL:
GRAU DE RISCO FINAL DO ESTABELECIMENTO: ${basketGlobalRisk.nivel.toUpperCase()}
DIRETRIZ SANITÁRIA: ${basketGlobalRisk.descricao}
ORIENTAÇÃO TÉCNICA: ${basketGlobalRisk.orientacao}
--------------------------------------------------
Responsável pela Consulta: ${currentUser?.nome_completo || 'Fiscal Sanitário'} (${currentUser?.cargo || 'Servidor VISA'})`;

    navigator.clipboard.writeText(texto);
    setCopiedText('consolidated');
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Processar Prévia da Importação CSV/Planilha
  const handlePreviewImport = () => {
    setImportError(null);
    setImportSuccessMsg(null);
    if (!csvInput.trim()) {
      setImportError('Por favor, cole os dados da planilha ou selecione um arquivo.');
      return;
    }

    try {
      const parsed = parseCnaeCsv(csvInput);
      if (parsed.length === 0) {
        setImportError('Não foi possível identificar linhas válidas. Verifique se as colunas estão separadas por tabulação ou vírgula.');
        return;
      }
      setImportPreview(parsed);
    } catch (e: any) {
      setImportError('Erro ao processar dados: ' + e?.message);
    }
  };

  // Confirmar Importação
  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;

    setIsLoading(true);
    try {
      // Salva em cache e tenta Supabase
      await saveCnaesBatchToSupabase(importPreview);
      setRawCnaes(importPreview);
      setImportSuccessMsg(`Sucesso! ${importPreview.length} registros foram importados e sincronizados.`);
      setTimeout(() => {
        setImportModalOpen(false);
        setCsvInput('');
        setImportPreview([]);
        setImportSuccessMsg(null);
      }, 1500);
    } catch (e: any) {
      setImportError('Erro ao salvar: ' + e?.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Upload de arquivo CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setCsvInput(content);
      const parsed = parseCnaeCsv(content);
      setImportPreview(parsed);
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Filtragem da Tabela Geral
  const filteredTableCnaes = useMemo(() => {
    const q = normalizeText(tableSearch);
    const digitsOnly = tableSearch.replace(/[^0-9]/g, '');

    return groupedCnaes.filter((g) => {
      // Filtro de Risco
      if (filterRisk === 'ALTO' && g.riscoFixo !== 'Alto Risco' && !g.opcoes.some((o) => o.risco.includes('Alto'))) {
        return false;
      }
      if (filterRisk === 'MEDIO' && g.riscoFixo !== 'Médio Risco' && !g.opcoes.some((o) => o.risco.includes('Médio') || o.risco.includes('Medio'))) {
        return false;
      }
      if (filterRisk === 'BAIXO' && g.riscoFixo !== 'Baixo Risco' && !g.opcoes.some((o) => o.risco.includes('Baixo'))) {
        return false;
      }
      if (filterRisk === 'VARIAVEL' && !g.temVariavel) {
        return false;
      }

      // Filtro de Texto
      if (!q) return true;
      const codeDigits = g.subclasse.replace(/[^0-9]/g, '');
      const matchCode = g.subclasse.includes(tableSearch) || (digitsOnly.length > 0 && codeDigits.includes(digitsOnly));
      const matchName = normalizeText(g.denominacaoOficial).includes(q);
      const matchPergunta = g.pergunta ? normalizeText(g.pergunta).includes(q) : false;

      return matchCode || matchName || matchPergunta;
    });
  }, [groupedCnaes, filterRisk, tableSearch]);

  // Filtragem de Todas as Linhas do Decreto (1519 linhas)
  const filteredRawLines = useMemo(() => {
    const q = normalizeText(tableSearch);
    const digitsOnly = tableSearch.replace(/[^0-9]/g, '');

    return rawCnaes.filter((row) => {
      const normRisco = normalizeText(row.risco);
      if (filterRisk === 'ALTO' && !normRisco.includes('alto') && !normRisco.includes('iii')) return false;
      if (filterRisk === 'MEDIO' && !normRisco.includes('medio') && !normRisco.includes('ii')) return false;
      if (filterRisk === 'BAIXO' && !normRisco.includes('baixo') && !normRisco.includes('i')) return false;
      if (filterRisk === 'VARIAVEL' && !normRisco.includes('definir') && !normRisco.includes('variavel')) return false;

      if (!q) return true;
      const codeDigits = row.subclasse.replace(/[^0-9]/g, '');
      const matchCode = row.subclasse.includes(tableSearch) || (digitsOnly.length > 0 && codeDigits.includes(digitsOnly));
      const matchName = normalizeText(row.denominacao).includes(q);
      const matchObs = row.observacao_variavel ? normalizeText(row.observacao_variavel).includes(q) : false;

      return matchCode || matchName || matchObs;
    });
  }, [rawCnaes, filterRisk, tableSearch]);

  // Paginação da Tabela Geral
  const activeListLength = tableViewMode === 'agrupado' ? filteredTableCnaes.length : filteredRawLines.length;
  const totalPages = Math.ceil(activeListLength / itemsPerPage) || 1;

  const paginatedCnaes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTableCnaes.slice(start, start + itemsPerPage);
  }, [filteredTableCnaes, currentPage]);

  const paginatedRawLines = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRawLines.slice(start, start + itemsPerPage);
  }, [filteredRawLines, currentPage]);

  const renderBadge = (risco: string) => {
    const norm = normalizeText(risco);
    if (norm.includes('definir') || norm.includes('variavel')) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-amber-300 dark:border-amber-700 shadow-sm">
          <HelpCircle className="w-3 h-3" /> A Definir / Variável
        </span>
      );
    }
    if (norm.includes('alto') || norm.includes('iii') || norm.includes('3')) {
      return (
        <span className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-red-300 dark:border-red-700 shadow-sm">
          <AlertOctagon className="w-3 h-3" /> Alto Risco (III)
        </span>
      );
    }
    if (norm.includes('medio') || norm.includes('ii') || norm.includes('2')) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-amber-300 dark:border-amber-700 shadow-sm">
          <AlertTriangle className="w-3 h-3" /> Médio Risco (II)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-emerald-300 dark:border-emerald-700 shadow-sm">
        <CheckCircle2 className="w-3 h-3" /> Baixo Risco (I)
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-indigo-900/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onNavigate('home')}
                className="text-indigo-300 hover:text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                ← Início
              </button>
              <span className="text-slate-500">•</span>
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-indigo-400/20">
                Módulo Oficial de Fiscalização
              </span>
              <span className="text-slate-500">•</span>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border flex items-center gap-1 ${
                isFromSupabase
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isFromSupabase ? 'bg-emerald-400 animate-pulse' : 'bg-indigo-400'}`}></span>
                {isFromSupabase ? 'Supabase Conectado (Tabela CNAE)' : 'Conectando ao Supabase (Tabela CNAE)'}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-indigo-400" />
              Classificação & Enquadramento de CNAEs
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Consulte atividades econômicas, responda a variáveis sanitárias condicionantes e determine com precisão o Grau de Risco Sanitário (Baixo, Médio ou Alto Risco) para emissão de alvarás e fiscalizações.
            </p>
          </div>

          {/* Ações Rápidas */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="bg-slate-800/80 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-sm"
              title="Sincronizar com tabela CNAE no Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : 'text-slate-300'}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>

            <button
              onClick={() => setImportModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer shadow-lg shadow-indigo-600/20"
              title="Importar dados de planilha Google Sheets ou CSV"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Importar / Planilha</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Atividades</span>
            <span className="text-lg md:text-xl font-black text-white">{stats.total}</span>
          </div>
          <div className="bg-red-950/30 p-3 rounded-2xl border border-red-900/40">
            <span className="text-[10px] uppercase font-bold text-red-400 block">Alto Risco (III)</span>
            <span className="text-lg md:text-xl font-black text-red-400">{stats.alto}</span>
          </div>
          <div className="bg-amber-950/30 p-3 rounded-2xl border border-amber-900/40">
            <span className="text-[10px] uppercase font-bold text-amber-400 block">Médio Risco (II)</span>
            <span className="text-lg md:text-xl font-black text-amber-400">{stats.medio}</span>
          </div>
          <div className="bg-emerald-950/30 p-3 rounded-2xl border border-emerald-900/40">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Baixo Risco (I)</span>
            <span className="text-lg md:text-xl font-black text-emerald-400">{stats.baixo}</span>
          </div>
          <div className="bg-indigo-950/30 p-3 rounded-2xl border border-indigo-900/40 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-indigo-300 block">Com Variáveis</span>
            <span className="text-lg md:text-xl font-black text-indigo-300">{stats.variaveis}</span>
          </div>
        </div>
      </div>

      {/* Aviso Explicativo quando estiver com poucos registros (RLS ou Cache Inicial) */}
      {!isFromSupabase && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-900/60 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0 mt-0.5">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-amber-900 dark:text-amber-200 uppercase tracking-tight">
                Status da Base de Dados CNAE ({rawCnaes.length} itens locais exibidos)
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed max-w-3xl">
                O aplicativo está consultando a tabela <code>CNAE</code> no Supabase, porém a consulta retornou 0 linhas. Isso ocorre porque o <strong>Row Level Security (RLS)</strong> do Supabase está ativado bloqueando a leitura pública da tabela <code>CNAE</code>, ou você pode carregar a base completa de 1400+ CNAEs clicando no botão <strong>Importar / Planilha</strong> acima.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            <button
              onClick={() => setImportModalOpen(true)}
              className="w-full md:w-auto bg-amber-600 hover:bg-amber-500 text-white font-black text-xs px-4 py-2.5 rounded-xl transition cursor-pointer shadow-sm text-center flex items-center justify-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              Carregar Planilha (1400+ CNAEs)
            </button>
          </div>
        </div>
      )}

      {/* ÁREA DE BUSCA & ENQUADRAMENTO NO TOPO */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200 dark:border-slate-800 relative z-20">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-1">
            <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Assistente de Consulta Rápida
            </span>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Digite o Código ou Descrição da CNAE
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              O sistema exibirá as perguntas e variáveis caso o enquadramento dependa do processo produtivo ou operacional.
            </p>
          </div>

          {/* Campo de Busca com Autocomplete */}
          <div className="relative">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-indigo-500 absolute left-4 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Ex: 1043-1/00, margarina, 4711, restaurante, drogaria, clínica..."
                className="w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-slate-800/80 border-2 border-indigo-100 dark:border-indigo-900/50 focus:border-indigo-500 dark:focus:border-indigo-400 rounded-2xl text-sm md:text-base font-bold text-slate-800 dark:text-white outline-none transition shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCnae(null);
                    setSelectedOption(null);
                  }}
                  className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Menu Suspenso de Sugestões */}
            {isDropdownOpen && searchSuggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-850 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-96 overflow-y-auto z-50 divide-y divide-slate-100 dark:divide-slate-800"
              >
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 px-4">
                  {searchSuggestions.length} atividade(s) encontrada(s) no banco de dados:
                </div>
                {searchSuggestions.map((item) => (
                  <button
                    key={item.subclasse}
                    type="button"
                    onClick={() => handleSelectCnae(item)}
                    className="w-full text-left p-3.5 md:p-4 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 transition cursor-pointer flex items-start justify-between gap-3 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                          {item.subclasse}
                        </span>
                        {item.temVariavel && (
                          <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                            ⚠️ Possui Variável / Condicionante
                          </span>
                        )}
                      </div>
                      <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition line-clamp-2">
                        {item.denominacaoOficial}
                      </p>
                      {item.pergunta && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium italic">
                          Pergunta: {item.pergunta}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-2 pt-1">
                      {item.temVariavel ? (
                        renderBadge('A Definir')
                      ) : (
                        renderBadge(item.riscoFixo || 'Baixo Risco')
                      )}
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition transform group-hover:translate-x-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CARD DE ENQUADRAMENTO DA CNAE ATIVA */}
          {activeCnae && (
            <div className="bg-slate-50 dark:bg-slate-850 rounded-2xl p-6 border-2 border-indigo-100 dark:border-indigo-900/60 space-y-6 shadow-md animate-in fade-in-50">
              {/* Cabeçalho da Atividade */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black bg-indigo-600 text-white px-2.5 py-1 rounded-lg">
                      CNAE {activeCnae.subclasse}
                    </span>
                    {activeCnae.temVariavel ? (
                      <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-black px-2.5 py-1 rounded-lg uppercase border border-amber-300 dark:border-amber-800">
                        Enquadramento por Variável
                      </span>
                    ) : (
                      <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-black px-2.5 py-1 rounded-lg uppercase border border-emerald-300 dark:border-emerald-800">
                        Enquadramento Fixo
                      </span>
                    )}
                  </div>
                  <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white leading-snug">
                    {activeCnae.denominacaoOficial}
                  </h3>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={handleCopySingleParecer}
                    className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                    title="Copiar parecer técnico desta atividade"
                  >
                    {copiedText === 'single' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-black">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Parecer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* SE TEM VARIÁVEL: EXIBIR PERGUNTA E OPÇÕES CLICÁVEIS */}
              {activeCnae.temVariavel ? (
                <div className="space-y-4">
                  <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-200 dark:border-amber-800/80">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-black text-xs uppercase tracking-wide mb-1">
                      <HelpCircle className="w-4 h-4 text-amber-600" />
                      Pergunta Sanitária Condicionante:
                    </div>
                    <p className="text-sm md:text-base font-black text-slate-900 dark:text-amber-100">
                      {activeCnae.pergunta || 'Qual das opções abaixo melhor descreve o processo produtivo ou forma de atuação no local?'}
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 block">
                      Selecione a resposta declarada pelo contribuinte/empresa:
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {activeCnae.opcoes.map((opcao, idx) => {
                        const isSelected = selectedOption?.resposta === opcao.resposta;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedOption(opcao)}
                            className={`p-4 rounded-xl text-left border-2 transition cursor-pointer flex items-start justify-between gap-3 ${
                              isSelected
                                ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-600 dark:border-indigo-400 shadow-md ring-2 ring-indigo-500/20'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border ${
                                  isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 dark:border-slate-600'
                                }`}>
                                  {isSelected ? '✓' : String.fromCharCode(65 + idx)}
                                </span>
                                <span className="text-xs font-black text-slate-900 dark:text-white">
                                  {opcao.resposta}
                                </span>
                              </div>
                              {opcao.detalhes && opcao.detalhes !== opcao.resposta && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                                  {opcao.detalhes}
                                </p>
                              )}
                            </div>

                            <div className="shrink-0">
                              {renderBadge(opcao.risco)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* SE NÃO TEM VARIÁVEL: ENQUADRAMENTO DIRETO */
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black text-slate-400 block">Classificação Direta</span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Esta atividade possui enquadramento sanitário padronizado, sem necessidade de respostas condicionantes.
                    </p>
                  </div>
                  <div>
                    {renderBadge(activeCnae.riscoFixo || 'Baixo Risco')}
                  </div>
                </div>
              )}

              {/* RESULTADO FINAL DO ENQUADRAMENTO */}
              {currentEnquadramento && currentEnquadramento.risco !== 'A Definir' && (
                <div className={`p-5 rounded-2xl border-2 space-y-3 ${
                  currentEnquadramento.risco.includes('Alto')
                    ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/60 text-red-950 dark:text-red-100'
                    : currentEnquadramento.risco.includes('Médio') || currentEnquadramento.risco.includes('Medio')
                    ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-100'
                    : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-100'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/10 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-black uppercase tracking-wider">
                        Enquadramento Sanitário Resultante
                      </span>
                    </div>
                    <div>
                      {renderBadge(currentEnquadramento.risco)}
                    </div>
                  </div>

                  <div className="text-xs leading-relaxed font-medium">
                    {currentEnquadramento.risco.includes('Alto') && (
                      <p>
                        🔴 <strong>Risco III (Alto Risco):</strong> Exige <strong>Vistoria Prévia Obrigatória</strong> antes do início das atividades ou concessão do Alvará Sanitário. Obrigatória a apresentação de Projeto Básico de Arquitetura (PBA) e Responsabilidade Técnica conforme normas sanitárias vigentes.
                      </p>
                    )}
                    {(currentEnquadramento.risco.includes('Médio') || currentEnquadramento.risco.includes('Medio')) && (
                      <p>
                        🟡 <strong>Risco II (Médio Risco):</strong> Permite <strong>Licenciamento Sanitário Simplificado</strong> mediante termo de autodeclaração e cumprimento integral das Boas Práticas, com vistoria fiscal realizada a posteriori.
                      </p>
                    )}
                    {currentEnquadramento.risco.includes('Baixo') && (
                      <p>
                        🟢 <strong>Risco I (Baixo Risco):</strong> Atividade <strong>dispensada de alvará sanitário prévio</strong> conforme a Lei da Liberdade Econômica nº 13.874/2019 e Resoluções CGSIM/ANVISA, permanecendo sujeita a fiscalização de rotina e denúncias.
                      </p>
                    )}
                  </div>

                  {/* Ação de Adicionar à Cesta Multi-CNAE */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddToBasket('PRINCIPAL')}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar como CNAE Principal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddToBasket('SECUNDÁRIA')}
                      className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar como CNAE Secundária</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SIMULADOR MULTI-CNAE / CONSOLIDADO DO ESTABELECIMENTO */}
      {basket.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-xl border border-indigo-200 dark:border-indigo-900 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Enquadramento Consolidado da Empresa ({basket.length} atividade{basket.length > 1 ? 's' : ''})
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pela legislação sanitária, o <strong>Risco Global do Estabelecimento</strong> é determinado pela atividade de <strong>maior risco</strong> exercida no local.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyConsolidatedParecer}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer shadow-md shadow-indigo-600/20"
              >
                {copiedText === 'consolidated' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Parecer Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Parecer Completo</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setBasket([])}
                className="p-2.5 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                title="Limpar todas as atividades"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Dados Opcionais da Empresa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-1">
                Razão Social / Nome Fantasia (Opcional):
              </label>
              <input
                type="text"
                value={establishmentName}
                onChange={(e) => setEstablishmentName(e.target.value)}
                placeholder="Ex: Supermercado Litoral Ltda"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-1">
                CNPJ / CPF do Estabelecimento (Opcional):
              </label>
              <input
                type="text"
                value={establishmentCnpj}
                onChange={(e) => setEstablishmentCnpj(e.target.value)}
                placeholder="Ex: 00.000.000/0001-00"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Lista de Atividades Selecionadas */}
          <div className="space-y-2.5">
            {basket.map((item, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                      item.tipo === 'PRINCIPAL' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {item.tipo}
                    </span>
                    <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                      {item.subclasse}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">
                    {item.denominacao}
                  </p>
                  {item.respostaSelecionada && (
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                      ↳ Resposta: {item.respostaSelecionada}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {renderBadge(item.riscoFinal)}
                  <button
                    onClick={() => handleRemoveFromBasket(item.subclasse)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition"
                    title="Remover atividade"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Parecer Global Consolidado */}
          {basketGlobalRisk && (
            <div className={`p-6 rounded-2xl border-2 space-y-2 ${
              basketGlobalRisk.cor === 'red'
                ? 'bg-red-50/80 dark:bg-red-950/40 border-red-300 dark:border-red-900 text-red-950 dark:text-red-100'
                : basketGlobalRisk.cor === 'amber'
                ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900 text-amber-950 dark:text-amber-100'
                : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-900 text-emerald-950 dark:text-emerald-100'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Classificação Final do Estabelecimento:
                </span>
                <span className="text-sm md:text-base font-black uppercase">
                  {basketGlobalRisk.nivel}
                </span>
              </div>
              <p className="text-xs leading-relaxed">
                {basketGlobalRisk.orientacao}
              </p>
            </div>
          )}
        </div>
      )}

      {/* CATÁLOGO E TABELA GERAL DE CNAES */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              Catálogo Geral de CNAEs
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Navegue por todas as atividades cadastradas no banco de dados e filtre por grau de risco sanitário.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Alternador de Modo: Atividades Agrupadas vs Linhas do Decreto */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setTableViewMode('agrupado');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  tableViewMode === 'agrupado'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Atividades ({groupedCnaes.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setTableViewMode('linhas');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  tableViewMode === 'linhas'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Linhas do Decreto ({rawCnaes.length})
              </button>
            </div>

            {/* Filtros de Risco */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
              {(['TODOS', 'ALTO', 'MEDIO', 'BAIXO', 'VARIAVEL'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setFilterRisk(r);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                    filterRisk === r
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {r === 'TODOS'
                    ? 'Todas'
                    : r === 'ALTO'
                    ? 'Alto Risco'
                    : r === 'MEDIO'
                    ? 'Médio Risco'
                    : r === 'BAIXO'
                    ? 'Baixo Risco'
                    : 'Variáveis'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Barra de Filtro Rápido na Tabela */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={tableSearch}
            onChange={(e) => {
              setTableSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={
              tableViewMode === 'agrupado'
                ? "Filtrar por subclasse ou denominação..."
                : "Filtrar por subclasse, pergunta, opção ou observação do decreto..."
            }
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500"
          />
        </div>

        {/* Tabela de Dados */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4">Subclasse</th>
                <th className="py-3 px-4">
                  {tableViewMode === 'agrupado' ? 'Denominação da Atividade' : 'Denominação / Pergunta'}
                </th>
                <th className="py-3 px-4">Grau de Risco</th>
                <th className="py-3 px-4">
                  {tableViewMode === 'agrupado' ? 'Condicionante / Variáveis' : 'Observação / Variável (Texto do Decreto)'}
                </th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {tableViewMode === 'agrupado' ? (
                paginatedCnaes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 font-bold">
                      Nenhuma atividade encontrada para o filtro selecionado.
                    </td>
                  </tr>
                ) : (
                  paginatedCnaes.map((item) => (
                    <tr
                      key={item.subclasse}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer group"
                      onClick={() => handleSelectCnae(item)}
                    >
                      <td className="py-3 px-4 font-mono font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {item.subclasse}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 max-w-md">
                        {item.denominacaoOficial}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.temVariavel ? renderBadge('A Definir') : renderBadge(item.riscoFixo || 'Baixo Risco')}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px] max-w-xs">
                        {item.temVariavel ? (
                          <span className="text-amber-700 dark:text-amber-400 font-medium">
                            {item.pergunta || `${item.opcoes.length} opções de enquadramento`}
                          </span>
                        ) : (
                          <span className="text-slate-400">Risco Padronizado</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCnae(item);
                          }}
                          className="bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-600 dark:hover:text-white font-black text-[10px] px-3 py-1.5 rounded-xl uppercase transition cursor-pointer"
                        >
                          Enquadrar →
                        </button>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                paginatedRawLines.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 font-bold">
                      Nenhuma linha encontrada para o filtro selecionado.
                    </td>
                  </tr>
                ) : (
                  paginatedRawLines.map((row, idx) => {
                    const groupedParent = groupedCnaes.find(
                      (g) => formatCnaeCode(g.subclasse) === formatCnaeCode(row.subclasse)
                    );
                    return (
                      <tr
                        key={row.id || `${row.subclasse}_${idx}`}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer group"
                        onClick={() => {
                          if (groupedParent) {
                            handleSelectCnae(groupedParent);
                          }
                        }}
                      >
                        <td className="py-3 px-4 font-mono font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          {row.subclasse}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 max-w-md">
                          {row.denominacao}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {renderBadge(row.risco)}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-[11px] max-w-md whitespace-pre-line font-mono">
                          {row.observacao_variavel || <span className="text-slate-400 italic">—</span>}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (groupedParent) {
                                handleSelectCnae(groupedParent);
                              }
                            }}
                            className="bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-600 dark:hover:text-white font-black text-[10px] px-3 py-1.5 rounded-xl uppercase transition cursor-pointer"
                          >
                            Enquadrar →
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Página {currentPage} de {totalPages} ({activeListLength} registros exibidos)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE IMPORTAÇÃO CSV / GOOGLE SHEETS */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <UploadCloud className="w-6 h-6 text-indigo-500" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Importar Dados de Planilha (CNAE)
                </h3>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Você pode <strong>copiar as linhas da sua planilha do Google Sheets (Ctrl+C) e colar abaixo</strong>, ou selecionar um arquivo <strong>.CSV</strong> exportado. O sistema reconhece automaticamente as colunas: <em>Subclasse, Denominação, Risco e Observação/Variável</em>.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">
                  Colar Linhas Copiadas da Planilha:
                </label>

                <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                  <span>Ou carregar arquivo .CSV</span>
                  <input
                    type="file"
                    accept=".csv,.txt,.tsv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                placeholder="Exemplo de linhas:&#10;1043-1/00	O produto final é comestível?	A Definir	Sim – Alto Risco&#10;1043-1/00	Fabricação de margarina...	Alto Risco	Produto final comestível&#10;1043-1/00	Fabricação de margarina...	Baixo Risco	Produto final não comestível"
                rows={6}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>

            {importError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400 font-bold">
                {importError}
              </div>
            )}

            {importSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {importSuccessMsg}
              </div>
            )}

            {importPreview.length > 0 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400 block">
                  Prévia: {importPreview.length} linhas identificadas com sucesso!
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Primeira CNAE detectada: <strong className="text-slate-800 dark:text-slate-200">{importPreview[0]?.subclasse}</strong> - {importPreview[0]?.denominacao}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              {importPreview.length === 0 ? (
                <button
                  type="button"
                  onClick={handlePreviewImport}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl transition cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  Processar Linhas
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition cursor-pointer shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar & Sincronizar ({importPreview.length} CNAEs)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
