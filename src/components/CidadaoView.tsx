import React, { useState, useEffect, useMemo } from 'react';
import { ProcessoItem, UserProfile, ContabilidadeProfile } from '../types';
import {
  Search,
  ShieldCheck,
  AlertTriangle,
  FileText,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  Phone,
  Mail,
  MapPin,
  Clock,
  Building2,
  Scale,
  QrCode,
  Download,
  Printer,
  UserPlus,
  ArrowRight,
  Info,
  Briefcase,
  Layers,
  FileCheck2,
  Check,
  KeyRound,
  Droplet,
  Droplets,
  ClipboardCheck,
  FlaskConical
} from 'lucide-react';
import { INITIAL_CONTABILIDADES } from '../data/mockData';
import { fetchContabilidadesFromSupabase, isSupabaseConfigured } from '../lib/supabaseService';
import {
  SolicitacaoLaudoPotabilidadeModal,
  FichaSolicitacaoPotabilidadeModal
} from './SolicitacaoLaudoPotabilidadeModule';
import { RelatorioColetaAguaModal } from './RelatorioColetaAguaModal';
import { LaudoOficialAguaModal } from './LaudoOficialAguaModal';
import {
  getSolicitacoesPotabilidade,
  findAmostraByProcesso,
  findAmostraBySolicitacao,
  findAmostrasBySolicitacao,
  isColetaRealizada,
  isLaudoAssinado
} from '../lib/potabilidadeService';
import { SolicitacaoLaudoPotabilidadeItem } from '../types';

interface CidadaoViewProps {
  processos?: ProcessoItem[];
  currentUser?: UserProfile | null;
  onOpenExternal: (url: string) => void;
  onVoltarInicio?: () => void;
  onNavigate?: (view: string) => void;
  onOpenCadastroContribuinte?: () => void;
  onOpenCadastroContabilidade?: () => void;
  onOpenLogin?: (tab?: 'servidor' | 'contabilidade' | 'contribuinte' | 'cidadao', cidadaoMode?: 'login' | 'cadastro') => void;
}

export const CidadaoView: React.FC<CidadaoViewProps> = ({
  processos = [],
  currentUser = null,
  onOpenExternal,
  onVoltarInicio,
  onNavigate,
  onOpenCadastroContribuinte,
  onOpenCadastroContabilidade,
  onOpenLogin
}) => {
  const [busca, setBusca] = useState('');
  const [resultadoSelecionado, setResultadoSelecionado] = useState<ProcessoItem | null>(null);
  const [modalPotabilidadeOpen, setModalPotabilidadeOpen] = useState(false);
  const [modalFicha1Doc, setModalFicha1Doc] = useState<{ open: boolean; solicitacao: any | null }>({ open: false, solicitacao: null });
  const [modalRelatorioColeta, setModalRelatorioColeta] = useState<{ open: boolean; amostra?: any | null; solicitacao?: any | null }>({ open: false, amostra: null, solicitacao: null });
  const [modalLaudoOficial, setModalLaudoOficial] = useState<{ open: boolean; amostra?: any | null; solicitacao?: any | null }>({ open: false, amostra: null, solicitacao: null });
  const [contabilidades, setContabilidades] = useState<ContabilidadeProfile[]>(() => {
    const saved = localStorage.getItem('visa_contabilidades_lab');
    return saved ? JSON.parse(saved) : INITIAL_CONTABILIDADES;
  });

  // Carrega contabilidades do Supabase se disponíveis
  useEffect(() => {
    async function loadContabs() {
      if (!isSupabaseConfigured) return;
      try {
        const cloudData = await fetchContabilidadesFromSupabase();
        if (cloudData && cloudData.length > 0) {
          setContabilidades(cloudData);
          localStorage.setItem('visa_contabilidades_lab', JSON.stringify(cloudData));
        }
      } catch (err) {
        console.warn('Erro ao carregar contabilidades no CidadaoView:', err);
      }
    }
    loadContabs();
  }, []);

  // Se o usuário for CONTRIBUINTE ou CIDADÃO com CPF/CNPJ, pré-seleciona a busca
  useEffect(() => {
    if (currentUser?.cpf && !busca) {
      setBusca(currentUser.cpf);
    }
  }, [currentUser]);

  // Limpeza de documento para busca
  const cleanDoc = (val?: string) => (val || '').replace(/\D/g, '');

  // Helper para verificar se um CNPJ está aos cuidados de uma contabilidade
  const getContabilidadeVinculada = (cnpjCpf?: string): ContabilidadeProfile | null => {
    if (!cnpjCpf) return null;
    const cleanTarget = cleanDoc(cnpjCpf);
    if (!cleanTarget || cleanTarget.length < 8) return null;

    return contabilidades.find(contab => {
      if (!contab.cnpjs_vinculados || !Array.isArray(contab.cnpjs_vinculados)) return false;
      return contab.cnpjs_vinculados.some(c => cleanDoc(c) === cleanTarget);
    }) || null;
  };

  // Filtragem dos processos disponíveis
  const termo = busca.trim().toLowerCase();
  const termoNumeros = busca.replace(/\D/g, '');

  const resultados = busca.trim().length >= 2
    ? processos.filter((p) => {
        const cnpjNum = (p.cnpj_cpf || '').replace(/\D/g, '');
        const procNum = (p.num_processo || '').toLowerCase();
        const razao = (p.razao_social || '').toLowerCase();
        const fantasia = (p.nome_fantasia || '').toLowerCase();
        const endereco = (p.endereco || '').toLowerCase();
        const bairro = (p.bairro || '').toLowerCase();

        return (
          (termoNumeros.length >= 3 && cnpjNum.includes(termoNumeros)) ||
          procNum.includes(termo) ||
          razao.includes(termo) ||
          fantasia.includes(termo) ||
          endereco.includes(termo) ||
          bairro.includes(termo)
        );
      })
    : [];

  const getStatusBadge = (status: string, validade?: string) => {
    const s = (status || '').toUpperCase();
    const isValido = validade && new Date(validade) >= new Date();

    if (s.includes('DEFERIDO') || s.includes('CONCLU') || s.includes('ATIVO') || s.includes('REGULAR')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          ALVARÁ REGULAR / VIGENTE
        </span>
      );
    }
    if (s.includes('ANALISE') || s.includes('ANÁLISE') || s.includes('ANDAMENTO')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          PROCESSO EM ANÁLISE SANITÁRIA
        </span>
      );
    }
    if (s.includes('NOTIF') || s.includes('EXIG') || s.includes('PEND')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
          COM NOTIFICAÇÃO / PENDÊNCIA
        </span>
      );
    }
    if (s.includes('INDEFERIDO') || s.includes('VENCIDO') || s.includes('INTERDIT')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          ALVARÁ SANITÁRIO VENCIDO / IRREGULAR
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
        {status || 'REGISTRO CADASTRADO'}
      </span>
    );
  };

  const contabilidadeDoSelecionado = resultadoSelecionado 
    ? getContabilidadeVinculada(resultadoSelecionado.cnpj_cpf)
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-left py-2">
      {/* Banner Superior Boas-Vindas */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-blue-800/60">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold uppercase tracking-wider">
              <span>🏛️</span> Balneário Camboriú • Portal da Vigilância Sanitária
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
              {currentUser?.tipo_usuario === 'CONTRIBUINTE' ? 'Acompanhamento do Contribuinte e CNPJ' : 'Consulta Pública e Autoatendimento do Cidadão'}
            </h1>
            <p className="text-sm text-blue-100/90 leading-relaxed">
              Consulte a situação sanitária e regularidade de estabelecimentos, acompanhe seus processos mesmo sob gestão contábil, emita taxas oficiais e solicite alvarás com rapidez e transparência.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenExternal('https://bc.1doc.com.br/b.php?pg=o/login&n=3')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
            >
              <span>📄</span> Abrir Requerimento (1Doc)
            </button>
            <button
              type="button"
              onClick={() => onOpenExternal('https://cidadao.bc.sc.gov.br/cidadao/balneario_camboriu/portal/servicos/debitos?params=NA%3D%3D')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>💳</span> Emitir 2ª Via de Taxas
            </button>
          </div>
        </div>
      </div>

      {/* ⚠️ ALERTA EM TOM CLARO DE AMARELO: MODO CONSULTA PÚBLICA (ANÔNIMO / SEM LOGIN) */}
      {!currentUser ? (
        <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/95 dark:bg-amber-950/25 border border-amber-200/90 dark:border-amber-800/50 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-black shrink-0 border border-amber-200/80 dark:border-amber-700/50">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60 text-[11px] font-bold uppercase tracking-wider">
                <span>⚠️</span> Modo Consulta Pública • Sem Retorno de Solicitações
              </div>
              <h2 className="text-base sm:text-lg font-bold text-amber-950 dark:text-amber-100 tracking-tight">
                Atenção: Você está navegando em Modo Consulta Pública e Autoatendimento
              </h2>
              <p className="text-xs sm:text-sm text-amber-900/90 dark:text-amber-200/80 leading-relaxed font-normal">
                Neste modo anônimo, <strong>você não terá retorno ou acompanhamento das suas solicitações, denúncias e processos sanitários</strong>. Para vincular suas demandas, receber laudos e notificações oficiais por e-mail e acompanhar todas as fases em tempo real, <strong>acesse sua conta ou faça seu cadastro gratuito</strong>.
              </p>
            </div>
          </div>

          {/* Botões de Ação para Login e Cadastro */}
          <div className="pt-3 border-t border-amber-200/70 dark:border-amber-800/40 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800/90 dark:text-amber-300/90">
              <span>Como deseja acessar o portal?</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Botão Fazer Login */}
              {onOpenLogin && (
                <button
                  type="button"
                  onClick={() => onOpenLogin('cidadao', 'login')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-300 dark:text-amber-600" />
                  <span>Já Tenho Conta • Fazer Login</span>
                </button>
              )}

              {/* Botão Cadastro Cidadão */}
              {onOpenLogin && (
                <button
                  type="button"
                  onClick={() => onOpenLogin('cidadao', 'cadastro')}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer border border-amber-500/40"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Cadastrar como Cidadão</span>
                </button>
              )}

              {/* Botão Cadastro Contribuinte / Empresa */}
              {onOpenCadastroContribuinte && (
                <button
                  type="button"
                  onClick={onOpenCadastroContribuinte}
                  className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200/80 dark:bg-amber-900/40 dark:hover:bg-amber-900/70 text-amber-900 dark:text-amber-200 font-semibold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-amber-300/80 dark:border-amber-700/60"
                >
                  <Building2 className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
                  <span>Cadastrar Empresa / CNPJ</span>
                </button>
              )}

              {/* Botão Cadastro Contabilidade */}
              {onOpenCadastroContabilidade && (
                <button
                  type="button"
                  onClick={onOpenCadastroContabilidade}
                  className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200/80 dark:bg-amber-900/40 dark:hover:bg-amber-900/70 text-amber-900 dark:text-amber-200 font-semibold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-amber-300/80 dark:border-amber-700/60"
                >
                  <Briefcase className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
                  <span>Escritório Contábil</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (currentUser.id === 'cidadao-publico' || currentUser.nome_completo?.toLowerCase().includes('consulta pública') || currentUser.cargo?.includes('PÚBLICO')) ? (
        /* Status Bar quando o usuário é Cidadão (Consulta Pública) - Tom Amarelo Claro */
        <div className="p-4 rounded-2xl bg-amber-50/95 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/50 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-fadeIn">
          <div className="flex items-center gap-2.5 text-amber-950 dark:text-amber-200">
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 shrink-0 border border-amber-200/80 dark:border-amber-700/50">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span>
              Você está autenticado como <strong>Cidadão (Consulta Pública)</strong>. Suas solicitações e demandas não poderão ter acompanhamento por você.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenLogin && (
              <button
                type="button"
                onClick={() => onOpenLogin('cidadao', 'cadastro')}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-bold text-[11px] uppercase tracking-wider rounded-lg shadow-sm transition flex items-center justify-center gap-1 cursor-pointer border border-amber-500/40"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Criar Cadastro</span>
              </button>
            )}
            {onOpenLogin && (
              <button
                type="button"
                onClick={() => onOpenLogin('cidadao', 'login')}
                className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline shrink-0"
              >
                Fazer Login / Trocar
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Status Bar quando o usuário é cadastrado/autenticado com acompanhamento ativo */
        <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/40 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-emerald-950 dark:text-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Você está autenticado como <strong>{currentUser.nome_completo}</strong> ({currentUser.tipo_usuario || currentUser.nivel_acesso || 'USUÁRIO'}). Suas solicitações e demandas possuem <strong>acompanhamento ativo</strong>.
            </span>
          </div>
          {onOpenLogin && (
            <button
              type="button"
              onClick={() => onOpenLogin('cidadao', 'login')}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0"
            >
              Trocar de Usuário
            </button>
          )}
        </div>
      )}

      {/* Caixa de Pesquisa Principal de Alvarás */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase flex items-center gap-2.5">
            <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Consulta de Regularidade Sanitária / Alvará
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Digite o <strong>CNPJ</strong>, <strong>Razão Social</strong>, <strong>Nome Fantasia</strong> ou <strong>Número do Processo</strong> para verificar se o local está autorizado pela Vigilância Sanitária:
          </p>
        </div>

        {/* Input de Busca */}
        <div className="relative">
          <input
            type="text"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setResultadoSelecionado(null);
            }}
            placeholder="Ex: 83.102.285/0001-07, Padaria Central, ou 2024/00123"
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white font-bold text-base focus:border-blue-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition placeholder:text-slate-400 placeholder:font-normal shadow-inner"
          />
          <Search className="w-6 h-6 text-blue-600 dark:text-blue-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          {busca && (
            <button
              onClick={() => {
                setBusca('');
                setResultadoSelecionado(null);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Resultados da Busca */}
        {busca.trim().length >= 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
              <span>{resultados.length} estabelecimento(s) encontrado(s)</span>
              <span>Clique no card para ver detalhes e certidão</span>
            </div>

            {resultados.length === 0 ? (
              <div className="p-8 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto text-xl font-black">
                  🔍
                </div>
                <h3 className="text-sm font-black uppercase text-amber-900 dark:text-amber-300">
                  Nenhum registro encontrado para "{busca}"
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-400 max-w-md mx-auto">
                  Verifique a digitação ou consulte na Receita Federal. Caso o estabelecimento necessite de licenciamento, solicite a abertura de protocolo sanitário via 1Doc.
                </p>
                <div className="pt-2 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenExternal('https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/')}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition cursor-pointer"
                  >
                    Consultar CNPJ na Receita
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenExternal('https://bc.1doc.com.br/b.php?pg=o/login&n=3')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition cursor-pointer"
                  >
                    Abrir Chamado Sanitário
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {resultados.map((proc) => {
                  const contabVinculada = getContabilidadeVinculada(proc.cnpj_cpf);
                  const isSelected = resultadoSelecionado?.id === proc.id;

                  return (
                    <div
                      key={proc.id}
                      onClick={() => setResultadoSelecionado(proc)}
                      className={`p-4 rounded-2xl border transition cursor-pointer text-left space-y-2.5 ${
                        isSelected
                          ? 'border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 shadow-md ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-blue-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase leading-snug">
                            {proc.nome_fantasia || proc.razao_social || 'Sem Nome'}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {proc.razao_social}
                          </p>
                        </div>
                        <div className="shrink-0">{getStatusBadge(proc.status, proc.validade)}</div>
                      </div>

                      {/* Tag de Contabilidade Vinculada */}
                      {contabVinculada && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-[11px] text-indigo-800 dark:text-indigo-300 font-bold">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span className="truncate">Gestão Contábil: {contabVinculada.nome_fantasia || contabVinculada.razao_social}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
                        <div>
                          <span className="text-slate-400 font-bold block">CNPJ / CPF:</span>
                          <strong className="font-mono text-slate-800 dark:text-slate-100">{proc.cnpj_cpf || '-'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block">PROCESSO:</span>
                          <strong className="font-mono text-blue-600 dark:text-blue-400">{proc.num_processo || '-'}</strong>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 font-bold block">LOCALIZAÇÃO:</span>
                          <span className="truncate block">{proc.endereco ? `${proc.endereco} - ${proc.bairro || ''}` : (proc.bairro || 'Balneário Camboriú')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Detalhes e Certidão de Regularidade do Estabelecimento Selecionado */}
        {resultadoSelecionado && (
          <div className="p-6 rounded-3xl bg-gradient-to-b from-blue-50/90 to-white dark:from-slate-800/90 dark:to-slate-900 border-2 border-blue-400 dark:border-blue-600 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-200 dark:border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                    Certidão Pública de Consulta Sanitária
                  </span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">
                    {resultadoSelecionado.nome_fantasia || resultadoSelecionado.razao_social}
                  </h3>
                </div>
              </div>
              <div className="shrink-0">{getStatusBadge(resultadoSelecionado.status, resultadoSelecionado.validade)}</div>
            </div>

            {/* Destaque: Contabilidade Vinculada & Transparência do Contribuinte */}
            {contabilidadeDoSelecionado && (
              <div className="p-4 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/40 border-2 border-indigo-300 dark:border-indigo-700 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-black text-xs uppercase">
                    <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Aos Cuidados do Escritório de Contabilidade</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 font-mono text-[10px] font-bold">
                    CRC: {contabilidadeDoSelecionado.crc || 'REGULAR'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block uppercase">Escritório</span>
                    <strong className="text-slate-900 dark:text-white font-bold">{contabilidadeDoSelecionado.nome_fantasia || contabilidadeDoSelecionado.razao_social}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block uppercase">Responsável Técnico</span>
                    <span className="text-slate-800 dark:text-slate-200">{contabilidadeDoSelecionado.responsavel || 'Contador Responsável'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block uppercase">Contato da Contabilidade</span>
                    <span className="text-slate-800 dark:text-slate-200 truncate block">{contabilidadeDoSelecionado.email || contabilidadeDoSelecionado.telefone || 'escritorio@contabil.com.br'}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-2 text-[11px] text-indigo-950 dark:text-indigo-200 leading-snug">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Transparência Garantida ao Contribuinte:</strong> Mesmo que este CNPJ esteja aos cuidados do escritório contábil, o proprietário/contribuinte possui pleno direito de acompanhar a tramitação, validade do alvará, laudos e fiscalizações sanitárias em tempo real.
                  </span>
                </div>
              </div>
            )}

            {/* Ficha Completa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Razão Social</span>
                <strong className="text-slate-800 dark:text-slate-100 text-sm">{resultadoSelecionado.razao_social || '-'}</strong>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">CNPJ / CPF</span>
                <strong className="font-mono text-slate-800 dark:text-slate-100 text-sm">{resultadoSelecionado.cnpj_cpf || '-'}</strong>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Processo Sanitário</span>
                <strong className="font-mono text-blue-600 dark:text-blue-400 text-sm">{resultadoSelecionado.num_processo || '-'}</strong>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Grau de Risco Sanitário</span>
                <span className="font-black text-purple-700 dark:text-purple-400">{resultadoSelecionado.grau_risco || 'NÃO DEFINIDO'}</span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Validade do Alvará</span>
                <strong className="text-slate-800 dark:text-slate-100 font-mono">
                  {resultadoSelecionado.validade || resultadoSelecionado.venc_licenca || 'Em processamento'}
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Endereço do Estabelecimento</span>
                <span className="text-slate-700 dark:text-slate-300 truncate block">
                  {resultadoSelecionado.endereco || '-'} {resultadoSelecionado.bairro ? `(${resultadoSelecionado.bairro})` : ''}
                </span>
              </div>
            </div>

            {/* Seção de Laudo de Potabilidade da Água para o Munícipe */}
            {(() => {
              const potList = getSolicitacoesPotabilidade();
              const cleanC = cleanDoc(resultadoSelecionado.cnpj_cpf);
              const matchingPot = potList.filter(s => cleanDoc(s.cnpj_cpf) === cleanC);
              const matchingAmostra = findAmostraByProcesso(resultadoSelecionado);

              if (matchingPot.length === 0 && !matchingAmostra) {
                return (
                  <div className="p-3.5 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/60 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 text-cyan-900 dark:text-cyan-200">
                      <Droplet className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                      <span>
                        Necessita de <strong>Laudo Oficial de Potabilidade da Água</strong> para seu estabelecimento?
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalPotabilidadeOpen(true)}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg uppercase text-[11px] flex items-center gap-1 cursor-pointer transition shadow-xs shrink-0"
                    >
                      <Droplet className="w-3.5 h-3.5" /> Solicitar Laudo
                    </button>
                  </div>
                );
              }

              return (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-blue-950/80 border border-cyan-500/50 space-y-3 text-white">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-cyan-200 font-bold text-xs">
                      <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="uppercase tracking-wider">
                        Laudos de Análise de Potabilidade da Água • Laboratório VISA BC
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalPotabilidadeOpen(true)}
                      className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg uppercase text-[10px] flex items-center gap-1 cursor-pointer transition"
                    >
                      + Nova Solicitação
                    </button>
                  </div>

                  <div className="space-y-3">
                    {matchingPot.map(sol => {
                      const matchingAmostras = findAmostrasBySolicitacao(sol);
                      const totalPontos = Math.max(Number(sol.quantidade_pontos) || 1, 1);
                      const coletasRealizadasCount = matchingAmostras.filter(a => isColetaRealizada(a, sol)).length;
                      const laudosEmitidosCount = matchingAmostras.filter(a => isLaudoAssinado(a, sol)).length;

                      const isConcluidoGeral = sol.status_solicitacao === 'LAUDO EMITIDO' || (totalPontos > 0 && laudosEmitidosCount >= totalPontos);
                      const isColetadoGeral = sol.status_solicitacao === 'COLETA REALIZADA' || coletasRealizadasCount > 0;

                      return (
                        <div
                          key={sol.id}
                          className="p-3.5 sm:p-4 rounded-xl bg-black/50 border border-cyan-500/40 space-y-3 text-xs shadow-md"
                        >
                          {/* Topo do card: Identificação e Ficha 1Doc */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-cyan-900/50">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-black text-cyan-300 bg-cyan-950 px-2.5 py-0.5 rounded border border-cyan-700">
                                  Prot. 1Doc: {sol.protocolo_1doc || 'S/N'}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded font-black text-[10px] uppercase border ${
                                    isConcluidoGeral
                                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                                      : isColetadoGeral
                                        ? 'bg-blue-950 text-blue-300 border-blue-600'
                                        : 'bg-amber-950 text-amber-300 border-amber-600'
                                  }`}
                                >
                                  {sol.status_solicitacao}
                                </span>
                                <span className="text-slate-300 text-[11px] font-semibold">
                                  {totalPontos} ponto(s) solicitado(s) • Taxa: {sol.taxa_ufm_total.toFixed(2)} UFM
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-300 mt-1">
                                Solicitado em: {new Date(sol.data_solicitacao).toLocaleDateString('pt-BR')} • {sol.locais_coleta.join(' • ')}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setModalFicha1Doc({ open: true, solicitacao: sol })}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-700/50 rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                                title="Visualizar a Ficha Oficial 1Doc da Solicitação de Potabilidade"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Ficha 1Doc</span>
                              </button>
                            </div>
                          </div>

                          {/* Se for pedido de 1 ponto só */}
                          {totalPontos === 1 && (() => {
                            const am = matchingAmostras[0] || matchingAmostra;
                            const pontoColetado = isColetaRealizada(am, sol);
                            const pontoAssinado = isLaudoAssinado(am, sol);

                            return (
                              <div className="flex items-center gap-2 pt-1 flex-wrap">
                                <button
                                  type="button"
                                  disabled={!pontoColetado}
                                  onClick={() => {
                                    if (!pontoColetado) return;
                                    setModalRelatorioColeta({
                                      open: true,
                                      amostra: am,
                                      solicitacao: sol
                                    });
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 transition ${
                                    pontoColetado
                                      ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-xs'
                                      : 'opacity-40 bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed select-none'
                                  }`}
                                  title={
                                    pontoColetado
                                      ? 'Visualizar e imprimir Termo Oficial de Coleta em Campo'
                                      : 'Coleta ainda não realizada pelo fiscal da VISA'
                                  }
                                >
                                  <ClipboardCheck className="w-3.5 h-3.5" />
                                  <span>{pontoColetado ? 'Termo de Coleta' : 'Coleta Pendente'}</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={!pontoAssinado}
                                  onClick={() => {
                                    if (!pontoAssinado) return;
                                    setModalLaudoOficial({
                                      open: true,
                                      amostra: am,
                                      solicitacao: sol
                                    });
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 transition ${
                                    pontoAssinado
                                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs'
                                      : 'opacity-40 bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed select-none'
                                  }`}
                                  title={
                                    pontoAssinado
                                      ? 'Visualizar e imprimir Laudo Oficial de Potabilidade assinado pelo responsável técnico (CRF)'
                                      : 'Laudo aguarda análise microbiológica e assinatura do técnico'
                                  }
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{pontoAssinado ? 'Laudo Oficial' : 'Laudo Pendente (CRF)'}</span>
                                </button>
                              </div>
                            );
                          })()}

                          {/* Se for pedido de MÚLTIPLOS pontos (ex: 8 coletas do Processo 67020/2026) */}
                          {totalPontos > 1 && (
                            <div className="space-y-2.5 pt-1">
                              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                                <span className="font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                                  <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
                                  Coletas & Laudos por Ponto ({laudosEmitidosCount} de {totalPontos} Laudos Emitidos):
                                </span>
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-700/60 px-2 py-0.5 rounded font-mono">
                                  {laudosEmitidosCount >= totalPontos
                                    ? `✓ ${totalPontos} Laudos Emitidos e Disponíveis`
                                    : `${coletasRealizadasCount}/${totalPontos} Coletas • ${laudosEmitidosCount}/${totalPontos} Laudos`}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                                {Array.from({ length: totalPontos }).map((_, pIdx) => {
                                  const pNumero = pIdx + 1;
                                  const localNome = (sol.locais_coleta && sol.locais_coleta[pIdx]) || `Ponto ${pNumero} - Torneira/Bebedouro`;
                                  const am = matchingAmostras.find(
                                    a => a.local_coleta.includes(`Ponto ${pNumero}`) ||
                                         (a.codigo_amostra && a.codigo_amostra.endsWith(`/${pNumero}`))
                                  ) || matchingAmostras[pIdx];

                                  const pontoColetado = isColetaRealizada(am, sol);
                                  const pontoAssinado = isLaudoAssinado(am, sol);

                                  return (
                                    <div
                                      key={pIdx}
                                      className={`p-2.5 rounded-xl border flex flex-col justify-between space-y-2 transition ${
                                        pontoAssinado
                                          ? 'bg-slate-900/90 border-emerald-500/50 text-white'
                                          : pontoColetado
                                            ? 'bg-slate-900/90 border-blue-600/40 text-slate-200'
                                            : 'bg-slate-950/80 border-slate-800 text-slate-400'
                                      }`}
                                    >
                                      <div>
                                        <div className="flex items-center justify-between text-[11px] mb-1">
                                          <span className="font-mono font-bold text-cyan-300">
                                            {am?.codigo_amostra ? `Amostra #${am.codigo_amostra}` : `Ponto ${pNumero}/${totalPontos}`}
                                          </span>
                                          <span
                                            className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase border font-mono ${
                                              pontoAssinado
                                                ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                                                : pontoColetado
                                                  ? 'bg-blue-950 text-blue-300 border-blue-600'
                                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                                            }`}
                                          >
                                            {pontoAssinado ? `Laudo #${am?.laudo_numero || pNumero}` : pontoColetado ? 'Em Análise' : 'Aguardando Coleta'}
                                          </span>
                                        </div>
                                        <p className="text-[11px] font-semibold text-slate-200 line-clamp-2" title={localNome}>
                                          {localNome}
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800">
                                        <button
                                          type="button"
                                          disabled={!pontoColetado || !am}
                                          onClick={() => {
                                            if (!pontoColetado || !am) return;
                                            setModalRelatorioColeta({
                                              open: true,
                                              amostra: am,
                                              solicitacao: sol
                                            });
                                          }}
                                          className={`flex-1 py-1 px-1.5 rounded text-[10px] font-bold uppercase transition flex items-center justify-center gap-1 ${
                                            pontoColetado && am
                                              ? 'bg-blue-950/80 hover:bg-blue-900 border border-blue-700/60 text-blue-200 cursor-pointer'
                                              : 'opacity-40 bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed select-none'
                                          }`}
                                          title={
                                            pontoColetado
                                              ? `Visualizar Termo de Coleta do Ponto ${pNumero}`
                                              : `Coleta do Ponto ${pNumero} ainda não realizada pelo fiscal da VISA`
                                          }
                                        >
                                          <ClipboardCheck className="w-3 h-3" />
                                          <span>{pontoColetado ? 'Termo' : 'Aguardando'}</span>
                                        </button>

                                        <button
                                          type="button"
                                          disabled={!pontoAssinado || !am}
                                          onClick={() => {
                                            if (!pontoAssinado || !am) return;
                                            setModalLaudoOficial({
                                              open: true,
                                              amostra: am,
                                              solicitacao: sol
                                            });
                                          }}
                                          className={`flex-1 py-1 px-1.5 rounded text-[10px] font-black uppercase transition flex items-center justify-center gap-1 ${
                                            pontoAssinado && am
                                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs'
                                              : 'opacity-40 bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed select-none'
                                          }`}
                                          title={
                                            pontoAssinado
                                              ? `Visualizar Laudo Oficial emitido para o Ponto ${pNumero}`
                                              : `Laudo do Ponto ${pNumero} aguarda análise microbiológica e assinatura do CRF`
                                          }
                                        >
                                          <CheckCircle2 className="w-3 h-3" />
                                          <span>{pontoAssinado ? `Laudo ${pNumero}` : `Laudo ${pNumero} (Pendente)`}</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Aviso de Autenticidade */}
            <div className="p-3 bg-blue-100/60 dark:bg-blue-950/50 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-3 text-xs text-blue-900 dark:text-blue-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Informações oficiais emitidas pelo sistema da Divisão de Vigilância Sanitária de Balneário Camboriú (DVIS).
                </span>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold rounded-lg border border-slate-300 dark:border-slate-600 flex items-center gap-1 cursor-pointer transition shrink-0"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grid de Serviços de Utilidade Pública */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => onOpenExternal('https://bc.1doc.com.br/b.php?pg=o/login&n=3')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:shadow-lg transition cursor-pointer group space-y-2 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
            1Doc • Protocolos e Denúncias
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Abra solicitações de alvará, envie defesas e registre denúncias sanitárias diretamente na Prefeitura.
          </p>
        </div>

        <div
          onClick={() => onOpenExternal('https://cidadao.bc.sc.gov.br/cidadao/balneario_camboriu/portal/servicos/debitos?params=NA%3D%3D')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:shadow-lg transition cursor-pointer group space-y-2 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
            Emissão de Taxas e Débitos
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Emita boletos, taxas de fiscalização sanitária e certidões negativas no Portal Tributário do Cidadão.
          </p>
        </div>

        <div
          onClick={() => onOpenExternal('https://leismunicipais.com.br/legislacao-municipal/4511/leis-de-balneario-camboriu')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500 hover:shadow-lg transition cursor-pointer group space-y-2 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Scale className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
            Legislação Sanitária & Posturas
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Consulte as leis municipais, decretos e normas técnicas de vigilância sanitária em vigor.
          </p>
        </div>

        <div
          onClick={() => onOpenExternal('https://www.bc.sc.gov.br/')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:shadow-lg transition cursor-pointer group space-y-2 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">
            Prefeitura Municipal de BC
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Portal oficial da Prefeitura Municipal de Balneário Camboriú, notícias, secretarias e serviços.
          </p>
        </div>

        <div
          onClick={() => setModalPotabilidadeOpen(true)}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 hover:shadow-lg transition cursor-pointer group space-y-2 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Droplet className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
            Laudo de Potabilidade de Água
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Solicite análise bacteriológica e físico-química de poços, reservatórios e rede predial com laudo da VISA.
          </p>
        </div>
      </div>

      {/* 💧 Modal Oficial de Solicitação de Laudo de Potabilidade */}
      <SolicitacaoLaudoPotabilidadeModal
        isOpen={modalPotabilidadeOpen}
        onClose={() => setModalPotabilidadeOpen(false)}
        currentUser={currentUser}
        initialCnpj={resultadoSelecionado?.cnpj_cpf || (currentUser?.cpf || '')}
        initialRazao={resultadoSelecionado?.razao_social || currentUser?.nome_completo || ''}
        initialNomeFantasia={resultadoSelecionado?.nome_fantasia}
        initialEndereco={resultadoSelecionado?.endereco}
        initialBairro={resultadoSelecionado?.bairro}
      />

      {/* 📄 Ficha Oficial de Solicitação 1Doc */}
      <FichaSolicitacaoPotabilidadeModal
        solicitacao={modalFicha1Doc.solicitacao}
        onClose={() => setModalFicha1Doc({ open: false, solicitacao: null })}
      />

      {/* 📋 Termo e Relatório Oficial de Coleta de Campo */}
      <RelatorioColetaAguaModal
        isOpen={modalRelatorioColeta.open}
        onClose={() => setModalRelatorioColeta({ open: false, amostra: null, solicitacao: null })}
        amostra={modalRelatorioColeta.amostra}
        solicitacao={modalRelatorioColeta.solicitacao}
      />

      {/* 🔬 Laudo Oficial de Análise de Potabilidade */}
      <LaudoOficialAguaModal
        isOpen={modalLaudoOficial.open}
        onClose={() => setModalLaudoOficial({ open: false, amostra: null, solicitacao: null })}
        amostra={modalLaudoOficial.amostra}
        solicitacao={modalLaudoOficial.solicitacao}
      />
    </div>
  );
};
