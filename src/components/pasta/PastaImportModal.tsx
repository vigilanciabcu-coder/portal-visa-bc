import React, { useState, useMemo } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Download,
  Layers,
  ArrowRight,
  Database,
  RefreshCw,
  FolderArchive,
  Check,
  Search,
  FileText,
  Building2,
  Plus,
  Loader2,
  MapPin,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { PastaVisaItem, AlvaraSanitarioItem, ProcessoItem } from '../../types';
import { downloadCsvFile } from '../../lib/csvExportService';
import { saveManyPastasVisaToSupabase, savePastaVisaToSupabase } from '../../lib/supabaseService';
import { fetchCnpj } from '../../lib/cnpjService';

interface PastaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pastasExistentes: PastaVisaItem[];
  alvaras: AlvaraSanitarioItem[];
  processos: ProcessoItem[];
  onImportarPastas: (novasPastas: PastaVisaItem[]) => void;
  onSelectPasta?: (pasta: PastaVisaItem) => void;
}

export function PastaImportModal({
  isOpen,
  onClose,
  pastasExistentes,
  alvaras,
  processos,
  onImportarPastas,
  onSelectPasta
}: PastaImportModalProps) {
  // Controle de Abas das 3 Opções
  const [activeTab, setActiveTab] = useState<'csv' | 'auto_detect' | 'manual_express'>('csv');

  // Limpeza de documento
  const cleanDoc = (doc?: string) => (doc || '').replace(/\D/g, '');

  // =========================================================================
  // OPÇÃO 1: ESTADOS E FUNÇÕES DE IMPORTAÇÃO DE PLANILHA CSV
  // =========================================================================
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [linhasParseadas, setLinhasParseadas] = useState<PastaVisaItem[]>([]);
  const [erroCsv, setErroCsv] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  const handleBaixarModeloExemplo = () => {
    const cabecalho = 'CNPJ_CPF;NUMERO_PASTA;RAZAO_SOCIAL;SETOR;LOCALIZACAO_ARQUIVO;STATUS_RF;ALVARA_ATUALIZADO';
    const linhasExemplo = [
      '04.892.110/0001-22;PASTA 204/MILHO;JOÃO BATISTA DA SILVA ME;ALIMENTOS;Arquivo Central - Estante B, Prateleira 3;ATIVA;SIM',
      '83.102.285/0001-07;PASTA 1042/2024;MERCADO CENTRAL E DISTRIBUIDORA LTDA;ALIMENTOS;Armário A - Gaveta 2;ATIVA;SIM',
      '04.223.119/0001-55;PASTA 890/2023;FARMÁCIA E DROGARIA ATLÂNTICA ME;MEDICAMENTOS;Armário Medicamentos - Pasta Suspensa 14;ATIVA;EM RENOVAÇÃO',
      '12.345.678/0001-90;PASTA 312;CLÍNICA MÉDICA SÃO BENTO;SAÚDE;Armário Saúde - Caixa 05;ATIVA;SIM',
      '98.765.432/0001-10;PASTA 518/2025;PADARIA E CONFEITARIA CENTRAL;ALIMENTOS;Arquivo Central - Prateleira 1;ATIVA;SIM'
    ];
    const csvCompleto = [cabecalho, ...linhasExemplo].join('\r\n');
    downloadCsvFile('modelo_importacao_pastas_visa_bc.csv', csvCompleto);
  };

  const handleCarregarArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setErroCsv(null);
    setImportSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processarTextoCsv(text);
    };
    reader.onerror = () => {
      setErroCsv('Falha ao ler o arquivo selecionado.');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const processarTextoCsv = (text: string) => {
    try {
      const lines = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length < 2) {
        setErroCsv('O arquivo está vazio ou contém apenas o cabeçalho.');
        setLinhasParseadas([]);
        return;
      }

      const firstLine = lines[0];
      const sep = ((firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length) ? ';' : ',';

      const headers = firstLine
        .split(sep)
        .map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

      const idxDoc = headers.findIndex((h) => h.includes('cnpj') || h.includes('cpf') || h.includes('doc'));
      const idxPasta = headers.findIndex((h) => h.includes('pasta') || h.includes('arquivo') || h.includes('numero'));
      const idxRazao = headers.findIndex((h) => h.includes('razao') || h.includes('nome') || h.includes('empresa'));
      const idxSetor = headers.findIndex((h) => h.includes('setor') || h.includes('ramo') || h.includes('categoria'));
      const idxLoc = headers.findIndex((h) => h.includes('local') || h.includes('obs') || h.includes('armario') || h.includes('prateleira'));
      const idxStatus = headers.findIndex((h) => h.includes('status') || h.includes('situacao'));
      const idxAlvara = headers.findIndex((h) => h.includes('alvara'));

      if (idxDoc === -1 && idxPasta === -1 && idxRazao === -1) {
        setErroCsv('Não foi possível identificar colunas mínimas (CNPJ/CPF, PASTA ou RAZÃO SOCIAL). Baixe o modelo pronto.');
        setLinhasParseadas([]);
        return;
      }

      const parsed: PastaVisaItem[] = [];

      for (let i = 1; i < lines.length; i++) {
        const rawCols = lines[i].split(sep).map((c) => c.replace(/^["']|["']$/g, '').trim());
        if (rawCols.length === 0 || rawCols.every((c) => !c)) continue;

        const doc = idxDoc !== -1 ? rawCols[idxDoc] : '';
        const numPasta = idxPasta !== -1 ? rawCols[idxPasta] : '';
        const razao = idxRazao !== -1 ? rawCols[idxRazao] : '';
        const setor = idxSetor !== -1 ? rawCols[idxSetor] : 'VIGILÂNCIA SANITÁRIA';
        const loc = idxLoc !== -1 ? rawCols[idxLoc] : '';
        const statusRf = idxStatus !== -1 ? rawCols[idxStatus] : 'ATIVA';
        const alvaraAt = idxAlvara !== -1 ? rawCols[idxAlvara] : 'SIM';

        if (!doc && !numPasta && !razao) continue;

        parsed.push({
          id: 'pasta-csv-' + Date.now() + '-' + i,
          cnpj_cpf: doc || '00.000.000/0000-00',
          pasta: numPasta || `PASTA S/N-${i}`,
          razao_social: razao || 'ESTABELECIMENTO CADASTRADO',
          status_rf: statusRf || 'ATIVA',
          alvara_atualizado: alvaraAt || 'SIM',
          setor: setor || 'VIGILÂNCIA SANITÁRIA',
          observacoes: loc || 'Importado via Planilha CSV',
          criado_por: 'IMPORTAÇÃO PLANILHA',
          criado_em: new Date().toISOString()
        });
      }

      if (parsed.length === 0) {
        setErroCsv('Nenhuma linha válida pôde ser extraída do arquivo.');
      } else {
        setLinhasParseadas(parsed);
        setErroCsv(null);
      }
    } catch (err: any) {
      setErroCsv(`Erro ao processar arquivo: ${err?.message || 'Formato inválido'}`);
      setLinhasParseadas([]);
    }
  };

  const handleConfirmarImportacaoCsv = async () => {
    if (linhasParseadas.length === 0) return;

    setIsImporting(true);
    try {
      await saveManyPastasVisaToSupabase(linhasParseadas);
      onImportarPastas(linhasParseadas);
      setImportSuccessMsg(`✓ Sucesso! ${linhasParseadas.length} pastas foram importadas para o arquivo municipal.`);
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (e: any) {
      setErroCsv(`Falha ao salvar: ${e?.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // =========================================================================
  // OPÇÃO 2: AUTO-DETECÇÃO DE PASTAS EM ALVARÁS E PROCESSOS
  // =========================================================================
  interface SugestaoAutoDetectada {
    cnpj_cpf: string;
    pasta: string;
    razao_social: string;
    origem: string;
    setor: string;
    selecionado: boolean;
  }

  const pastasDetectadas = useMemo(() => {
    const mapa = new Map<string, SugestaoAutoDetectada>();
    const docExistentes = new Set(pastasExistentes.map((p) => cleanDoc(p.cnpj_cpf)));

    // Varre Alvarás
    alvaras.forEach((alv) => {
      const docClean = cleanDoc(alv.cnpj_cpf);
      if (docClean && alv.pasta && !docExistentes.has(docClean)) {
        if (!mapa.has(docClean)) {
          mapa.set(docClean, {
            cnpj_cpf: alv.cnpj_cpf,
            pasta: alv.pasta,
            razao_social: alv.razao_social || alv.nome_fantasia || 'Empresa com Alvará',
            origem: `Alvará ${alv.numero_alvara || alv.ano_exercicio}`,
            setor: alv.setor || 'ALIMENTOS',
            selecionado: true
          });
        }
      }
    });

    // Varre Processos
    processos.forEach((proc) => {
      const docClean = cleanDoc(proc.cnpj_cpf);
      if (docClean && proc.pasta && !docExistentes.has(docClean)) {
        if (!mapa.has(docClean)) {
          mapa.set(docClean, {
            cnpj_cpf: proc.cnpj_cpf,
            pasta: proc.pasta,
            razao_social: proc.razao_social || proc.nome_fantasia || 'Empresa com Processo',
            origem: `Processo ${proc.num_processo || proc.prot_1doc || '1Doc'}`,
            setor: proc.setor || 'GERAL',
            selecionado: true
          });
        }
      }
    });

    return Array.from(mapa.values());
  }, [alvaras, processos, pastasExistentes]);

  const [selecaoAuto, setSelecaoAuto] = useState<Record<string, boolean>>({});

  const isSelectedAuto = (doc: string) => {
    return selecaoAuto[doc] !== undefined ? selecaoAuto[doc] : true;
  };

  const toggleSelecaoAuto = (doc: string) => {
    setSelecaoAuto((prev) => ({
      ...prev,
      [doc]: !isSelectedAuto(doc)
    }));
  };

  const handleSelecionarTodasAuto = () => {
    const novo: Record<string, boolean> = {};
    pastasDetectadas.forEach((p) => {
      novo[cleanDoc(p.cnpj_cpf)] = true;
    });
    setSelecaoAuto(novo);
  };

  const handleConfirmarAutoDetectadas = async () => {
    const selecionadas = pastasDetectadas.filter((p) => isSelectedAuto(cleanDoc(p.cnpj_cpf)));
    if (selecionadas.length === 0) {
      alert('Nenhuma pasta selecionada para cadastrar.');
      return;
    }

    setIsImporting(true);
    try {
      const novas: PastaVisaItem[] = selecionadas.map((s, idx) => ({
        id: 'pasta-auto-' + Date.now() + '-' + idx,
        cnpj_cpf: s.cnpj_cpf,
        pasta: s.pasta,
        razao_social: s.razao_social,
        status_rf: 'ATIVA',
        alvara_atualizado: 'SIM',
        setor: s.setor || 'VIGILÂNCIA SANITÁRIA',
        observacoes: `Capturado automaticamente a partir de ${s.origem}`,
        criado_por: 'AUTO-CAPTURA ALVARÁ/PROCESSO',
        criado_em: new Date().toISOString()
      }));

      await saveManyPastasVisaToSupabase(novas);
      onImportarPastas(novas);
      setImportSuccessMsg(`✓ Sucesso! ${novas.length} novas pastas foram criadas a partir dos Alvarás e Processos.`);
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (e: any) {
      alert('Erro ao salvar pastas detectadas.');
    } finally {
      setIsImporting(false);
    }
  };

  // =========================================================================
  // OPÇÃO 3: CADASTRO EXPRESSO INDIVIDUAL COM RECEITA FEDERAL & SEQUENCIAL
  // =========================================================================
  const [expressCnpj, setExpressCnpj] = useState('');
  const [expressNumeroPasta, setExpressNumeroPasta] = useState('');
  const [expressRazao, setExpressRazao] = useState('');
  const [expressFantasia, setExpressFantasia] = useState('');
  const [expressSetor, setExpressSetor] = useState('ALIMENTOS');
  const [expressLocalizacao, setExpressLocalizacao] = useState('Arquivo Central - Prateleira Geral');
  const [expressObservacoes, setExpressObservacoes] = useState('');
  const [buscandoReceita, setBuscandoReceita] = useState(false);
  const [receitaFeedback, setReceitaFeedback] = useState<string | null>(null);

  // Gerador de Próximo Número Sequencial
  const gerarProximaPastaSequencial = () => {
    const anoAtual = new Date().getFullYear();
    let maiorNumero = 0;

    pastasExistentes.forEach((p) => {
      const match = p.pasta.match(/\d+/g);
      if (match) {
        const num = parseInt(match[0], 10);
        if (!isNaN(num) && num > maiorNumero) {
          maiorNumero = num;
        }
      }
    });

    const proximo = maiorNumero > 0 ? maiorNumero + 1 : 1001;
    setExpressNumeroPasta(`PASTA ${proximo}/${anoAtual}`);
  };

  const handleConsultarReceita = async () => {
    const docLimpo = cleanDoc(expressCnpj);
    if (docLimpo.length !== 14) {
      setReceitaFeedback('Informe um CNPJ válido com 14 dígitos para consultar a Receita.');
      return;
    }

    setBuscandoReceita(true);
    setReceitaFeedback(null);
    try {
      const dados = await fetchCnpj(docLimpo);
      if (dados && dados.razao) {
        setExpressRazao(dados.razao);
        setExpressFantasia(dados.nome_fantasia || '');
        if (dados.tipo_atividade) {
          const ativ = dados.tipo_atividade.toUpperCase();
          if (ativ.includes('ALIMEN') || ativ.includes('REST') || ativ.includes('PAD')) {
            setExpressSetor('ALIMENTOS');
          } else if (ativ.includes('FARM') || ativ.includes('MEDIC') || ativ.includes('DROG')) {
            setExpressSetor('MEDICAMENTOS');
          } else if (ativ.includes('SAUD') || ativ.includes('CLIN') || ativ.includes('HOSP') || ativ.includes('ODONT')) {
            setExpressSetor('SAÚDE');
          }
        }
        if (!expressNumeroPasta) {
          gerarProximaPastaSequencial();
        }
        setReceitaFeedback(`✓ Dados carregados: ${dados.razao} (${dados.situacao_cadastral || 'ATIVA'})`);
      } else {
        setReceitaFeedback('CNPJ não retornou dados da API pública.');
      }
    } catch {
      setReceitaFeedback('Erro ao consultar Receita Federal. Você pode preencher manualmente.');
    } finally {
      setBuscandoReceita(false);
    }
  };

  const handleSalvarExpress = async () => {
    if (!expressCnpj.trim() || !expressNumeroPasta.trim() || !expressRazao.trim()) {
      alert('Preencha ao menos CNPJ/CPF, Número da Pasta e Razão Social.');
      return;
    }

    setIsImporting(true);
    try {
      const nova: PastaVisaItem = {
        id: 'pasta-' + Date.now(),
        cnpj_cpf: expressCnpj.trim(),
        pasta: expressNumeroPasta.trim().toUpperCase(),
        razao_social: expressRazao.trim().toUpperCase(),
        status_rf: 'ATIVA',
        alvara_atualizado: 'SIM',
        setor: expressSetor,
        observacoes: `${expressLocalizacao ? `Local: ${expressLocalizacao}. ` : ''}${expressObservacoes}`.trim(),
        criado_por: 'CADASTRO EXPRESSO',
        criado_em: new Date().toISOString()
      };

      await savePastaVisaToSupabase(nova);
      onImportarPastas([nova]);
      if (onSelectPasta) onSelectPasta(nova);

      setImportSuccessMsg(`✓ Sucesso! ${nova.pasta} cadastrada com êxito.`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      alert('Erro ao cadastrar pasta expressa.');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in text-left">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* CABEÇALHO */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 text-white shrink-0">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/30 px-2 py-0.5 rounded-full">
                  3 Opções de Cadastro de Pastas
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Arquivo Municipal VISA BC
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mt-0.5">
                Cadastrar Pastas Existentes no Sistema
              </h2>
              <p className="text-xs text-slate-300">
                Escolha o melhor método para integrar o acervo de pastas físicas ao Dossiê Eletrônico
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVEGAÇÃO DE ABAS (AS 3 SUGESTÕES) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-2.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 shrink-0 text-xs font-black uppercase">
          
          <button
            onClick={() => setActiveTab('csv')}
            className={`p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 text-center ${
              activeTab === 'csv'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>1. Planilha CSV / Excel</span>
          </button>

          <button
            onClick={() => setActiveTab('auto_detect')}
            className={`p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 text-center ${
              activeTab === 'auto_detect'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>2. Alvarás e Processos ({pastasDetectadas.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('manual_express')}
            className={`p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 text-center ${
              activeTab === 'manual_express'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>3. Cadastro Expresso (CNPJ RFB)</span>
          </button>
        </div>

        {/* CORPO DO MODAL COM SCROLL */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* MENSAGEM DE SUCESSO */}
          {importSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="font-black text-sm">{importSuccessMsg}</p>
                <p className="text-[11px] opacity-80">As pastas já estão vinculadas ao acervo físico e prontas no Dossiê 360°.</p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 1: IMPORTAÇÃO VIA PLANILHA CSV / EXCEL               */}
          {/* ========================================================= */}
          {activeTab === 'csv' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 p-4 rounded-2xl border border-purple-200 dark:border-purple-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-black uppercase text-purple-900 dark:text-purple-200 text-xs flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                    Como preparar e importar sua planilha de pastas legadas
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] max-w-xl">
                    Se você já tem uma planilha no Excel, salve-a como <strong>.CSV</strong>. O leitor aceita colunas como <strong>CNPJ_CPF</strong>, <strong>NUMERO_PASTA</strong>, <strong>RAZAO_SOCIAL</strong>, <strong>SETOR</strong> e <strong>LOCALIZACAO_ARQUIVO</strong>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleBaixarModeloExemplo}
                  className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700 px-4 py-2.5 rounded-xl font-black uppercase text-[11px] shadow-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Baixar Modelo .CSV Pronto
                </button>
              </div>

              {/* Área de Seleção de Arquivo */}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-500 rounded-3xl p-6 text-center space-y-3 bg-slate-50 dark:bg-slate-800/40 transition">
                <input
                  type="file"
                  id="input-arquivo-pastas-csv"
                  accept=".csv,.txt"
                  onChange={handleCarregarArquivo}
                  className="hidden"
                />
                <label
                  htmlFor="input-arquivo-pastas-csv"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="font-black text-sm text-purple-600 dark:text-purple-400 uppercase">
                    {csvFile ? csvFile.name : 'Clique para selecionar seu arquivo .CSV de Pastas'}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Delimitado por ponto e vírgula (;) ou vírgula (,) • Codificação UTF-8
                  </span>
                </label>
              </div>

              {erroCsv && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-200 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{erroCsv}</span>
                </div>
              )}

              {/* Pré-visualização da Planilha Parseada */}
              {linhasParseadas.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      {linhasParseadas.length} pastas localizadas no arquivo (Pré-visualização)
                    </h4>
                    <span className="text-slate-400 text-[11px]">
                      Mostrando os primeiros registros
                    </span>
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black uppercase">
                        <tr>
                          <th className="p-2.5">Nº Pasta</th>
                          <th className="p-2.5">CNPJ / CPF</th>
                          <th className="p-2.5">Razão Social</th>
                          <th className="p-2.5">Setor</th>
                          <th className="p-2.5">Localização / Arquivo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {linhasParseadas.slice(0, 10).map((linha, idx) => (
                          <tr key={idx} className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20">
                            <td className="p-2.5 font-bold font-mono text-purple-600 dark:text-purple-400">{linha.pasta}</td>
                            <td className="p-2.5 font-mono">{linha.cnpj_cpf}</td>
                            <td className="p-2.5 font-bold truncate max-w-[200px]">{linha.razao_social}</td>
                            <td className="p-2.5 uppercase">{linha.setor}</td>
                            <td className="p-2.5 text-slate-500 truncate max-w-[150px]">{linha.observacoes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmarImportacaoCsv}
                      disabled={isImporting}
                      className="bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-black uppercase text-xs px-6 py-3 rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-2 transition cursor-pointer"
                    >
                      {isImporting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Importando Pastas para o Arquivo...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Confirmar e Gravar {linhasParseadas.length} Pastas no Sistema
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 2: AUTO-DETECÇÃO DE PASTAS EM ALVARÁS E PROCESSOS     */}
          {/* ========================================================= */}
          {activeTab === 'auto_detect' && (
            <div className="space-y-4">
              <div className="bg-indigo-50/80 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-black uppercase text-indigo-900 dark:text-indigo-200 text-xs">
                      Sincronização com Alvarás e Processos Emitidos
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                      O sistema identificou automaticamente estabelecimentos com alvarás e processos no sistema que possuem número de pasta física registrada, mas ainda não estão na listagem mestre de Pastas VISA.
                    </p>
                  </div>
                </div>

                {pastasDetectadas.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelecionarTodasAuto}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                  >
                    Marcar Todas
                  </button>
                )}
              </div>

              {pastasDetectadas.length === 0 ? (
                <div className="p-10 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
                  <p className="font-bold text-sm uppercase text-slate-700 dark:text-slate-300">
                    Tudo Sincronizado!
                  </p>
                  <p className="text-xs text-slate-500">
                    Todas as pastas citadas em alvarás e processos já estão devidamente cadastradas no acervo do sistema.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-800 dark:text-white uppercase">
                      {pastasDetectadas.length} pastas encontradas prontas para importar:
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 bg-slate-50 dark:bg-slate-900">
                    {pastasDetectadas.map((item) => {
                      const sel = isSelectedAuto(cleanDoc(item.cnpj_cpf));
                      return (
                        <div
                          key={item.cnpj_cpf}
                          onClick={() => toggleSelecaoAuto(cleanDoc(item.cnpj_cpf))}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                            sel
                              ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={sel}
                              onChange={() => toggleSelecaoAuto(cleanDoc(item.cnpj_cpf))}
                              className="w-4 h-4 rounded text-purple-600"
                            />
                            <div>
                              <p className="font-black text-purple-700 dark:text-purple-300 uppercase">
                                {item.pasta} • <span className="text-slate-900 dark:text-white">{item.razao_social}</span>
                              </p>
                              <p className="text-[10px] font-mono text-slate-500">
                                CNPJ: {item.cnpj_cpf} • Origem: <strong>{item.origem}</strong> • Setor: {item.setor}
                              </p>
                            </div>
                          </div>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 shrink-0">
                            Detectada
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmarAutoDetectadas}
                      disabled={isImporting}
                      className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black uppercase text-xs px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition cursor-pointer"
                    >
                      {isImporting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Gravando Pastas Detectadas...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Cadastrar {pastasDetectadas.filter((p) => isSelectedAuto(cleanDoc(p.cnpj_cpf))).length} Pastas no Arquivo
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 3: CADASTRO EXPRESSO INDIVIDUAL (RECEITA FEDERAL & SEQ) */}
          {/* ========================================================= */}
          {activeTab === 'manual_express' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/80 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
                <Building2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-black uppercase text-emerald-900 dark:text-emerald-200 text-xs">
                    Cadastro Ágil com Consulta na Receita Federal
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Cadastre uma pasta física existente ou nova informando apenas o CNPJ. O sistema preenche a Razão Social, CNAE e situação cadastral automaticamente e sugere a numeração sequencial.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* CNPJ + Busca Receita */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                    CNPJ ou CPF do Estabelecimento:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={expressCnpj}
                      onChange={(e) => setExpressCnpj(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleConsultarReceita}
                      disabled={buscandoReceita}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      {buscandoReceita ? (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      ) : (
                        <Search className="w-4 h-4 text-emerald-400" />
                      )}
                      ReceitaWS
                    </button>
                  </div>
                  {receitaFeedback && (
                    <p className={`text-[11px] font-bold ${receitaFeedback.startsWith('✓') ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {receitaFeedback}
                    </p>
                  )}
                </div>

                {/* Número da Pasta Física + Gerador */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Número da Pasta Física:</span>
                    <button
                      type="button"
                      onClick={gerarProximaPastaSequencial}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline normal-case text-[10px] font-bold"
                    >
                      Sugerir Próxima Sequencial
                    </button>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: PASTA 1043/2026 ou PASTA 204"
                    value={expressNumeroPasta}
                    onChange={(e) => setExpressNumeroPasta(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-xs uppercase outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Razão Social */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                    Razão Social / Nome Empresarial:
                  </label>
                  <input
                    type="text"
                    placeholder="Nome Oficial da Empresa"
                    value={expressRazao}
                    onChange={(e) => setExpressRazao(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Setor Sanitário */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                    Setor Sanitário Responsável:
                  </label>
                  <select
                    value={expressSetor}
                    onChange={(e) => setExpressSetor(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ALIMENTOS">ALIMENTOS</option>
                    <option value="MEDICAMENTOS">MEDICAMENTOS E DROGARIAS</option>
                    <option value="SAÚDE">ESTABELECIMENTOS DE SAÚDE</option>
                    <option value="HABITE-SE">HABITE-SE E ENGENHARIA</option>
                    <option value="GERAL">GERAL / ADMINISTRATIVO</option>
                  </select>
                </div>

                {/* Localização Física do Arquivo */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                    Localização no Arquivo Municipal:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Arquivo Central - Armário 04, Gaveta 2"
                    value={expressLocalizacao}
                    onChange={(e) => setExpressLocalizacao(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Observações / Histórico Inicial */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                    Observações e Histórico Arquivístico:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Informações adicionais sobre pastas suspensas, alvarás antigos, etc."
                    value={expressObservacoes}
                    onChange={(e) => setExpressObservacoes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSalvarExpress}
                  disabled={isImporting}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black uppercase text-xs px-6 py-3 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition cursor-pointer"
                >
                  {isImporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Gravando Pasta...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Gravar Pasta no Arquivo Municipal
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>

        {/* RODAPÉ */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Sincronização com Supabase e Dossiê Sanitário ativa</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
