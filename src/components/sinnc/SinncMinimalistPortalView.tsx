import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  LayoutGrid,
  CheckSquare,
  Calendar,
  Database,
  FileCheck2,
  ShieldCheck,
  FolderKanban,
  Headphones,
  Layers,
  BarChart3,
  Briefcase,
  Settings,
  ArrowLeft,
  Home,
  FileText,
  Award,
  X,
  FolderOpen,
  User,
  Calculator,
  FlaskConical,
  Bug,
} from 'lucide-react';
import {
  AlvaraSanitarioItem,
  AmostraLaboratorioItem,
  HabiteSeRegistroItem,
  PasJuridicoItem,
  PastaVisaItem,
  ProcessoItem,
  SolicitacaoLaudoPotabilidadeItem,
} from '../../types';
import {
  SinncNavId,
  SinncWorkspaceTabId,
  SINNC_PINNED_TABS,
  SINNC_MODULE_LABELS,
  SinncPortalDataProps,
  computeSinncMetrics,
} from './sinncTypes';
import {
  cleanDoc,
  getDisplayPastaNumero,
  loadAllAlvarasUnificados,
  loadAllPastasUnificadas,
  obterOuCriarPastaPorCpfCnpj,
  syncAlvarasFromSupabaseUnificados,
  syncPastasFromSupabaseUnificadas,
} from '../../lib/pastaVisaService';
import {
  gerarAlvaraDeProcessoDeferido,
  instaurarPasDeHistorico,
  loadHabiteSeRegistros,
  loadPasJuridico,
  syncHabiteSeFromSupabase,
  syncPasFromSupabase,
} from '../../lib/interlaceServices';
import {
  fetchSolicitacoesPotabilidadeFromSupabase,
  getSolicitacoesPotabilidade,
  subscribeSolicitacoesPotabilidade,
} from '../../lib/potabilidadeService';
import { SinncPainelInicio } from './SinncPainelInicio';
import { SinncModulesViews } from './SinncModulesViews';
import { SinncProcessoDrawer } from './SinncProcessoDrawer';
import { SinncPastaDossie360 } from './SinncPastaDossie360';
import { SinncDemoWorkflowModals, SinncWorkflowModalKind } from './SinncDemoWorkflowModals';
import { SolicitacaoLaudoPotabilidadeModule } from '../SolicitacaoLaudoPotabilidadeModule';
import { RelatorioColetaAguaModal } from '../RelatorioColetaAguaModal';
import { LaudoOficialAguaModal } from '../LaudoOficialAguaModal';

export const SinncMinimalistPortalView: React.FC<SinncPortalDataProps> = ({
  currentUser,
  processos,
  fiscalizacoes,
  amostrasLaboratorio,
  pontosColeta = [],
  feiras,
  escala,
  users,
  onSaveProcesso,
  onSaveFiscalizacao,
  onSaveEscalaItem,
  onSaveFeirante,
  onSaveUser,
  onDeleteUser,
  onExitMinimalPortal,
  onNavigateClassic,
}) => {
  const [activeTab, setActiveTab] = useState<SinncWorkspaceTabId>('painel');
  const [openExtraTabs, setOpenExtraTabs] = useState<Exclude<SinncNavId, 'painel'>[]>([]);
  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoItem | null>(null);
  const [selectedPasta, setSelectedPasta] = useState<PastaVisaItem | null>(null);
  const [compactDensity, setCompactDensity] = useState(false);

  // Busca global rápida na barra superior
  const [topSearchQuery, setTopSearchQuery] = useState('');
  const [topSearchOpen, setTopSearchOpen] = useState(false);

  // Modais do fluxo Capa Teste Full
  const [workflowModal, setWorkflowModal] = useState<SinncWorkflowModalKind>(null);
  const [workflowInitialPasta, setWorkflowInitialPasta] = useState<PastaVisaItem | null>(null);

  // Modais originais do Laboratório (sem alterar telas do Lab)
  const [labSolicitarPasta, setLabSolicitarPasta] = useState<PastaVisaItem | null>(null);
  const [labSolicitarOpen, setLabSolicitarOpen] = useState(false);
  const [termoColetaModal, setTermoColetaModal] = useState<{
    amostra?: AmostraLaboratorioItem | null;
    solicitacao?: SolicitacaoLaudoPotabilidadeItem | null;
  } | null>(null);
  const [laudoOficialModal, setLaudoOficialModal] = useState<{
    amostra?: AmostraLaboratorioItem | null;
    solicitacao?: SolicitacaoLaudoPotabilidadeItem | null;
  } | null>(null);

  // Estados unificados sincronizados
  const [pastas, setPastas] = useState<PastaVisaItem[]>(() => loadAllPastasUnificadas());
  const [alvaras, setAlvaras] = useState<AlvaraSanitarioItem[]>(() => loadAllAlvarasUnificados());
  const [habiteSeList, setHabiteSeList] = useState<HabiteSeRegistroItem[]>(() => loadHabiteSeRegistros());
  const [pasList, setPasList] = useState<PasJuridicoItem[]>(() => loadPasJuridico());
  const [solicitacoesLab, setSolicitacoesLab] = useState<SolicitacaoLaudoPotabilidadeItem[]>(() =>
    getSolicitacoesPotabilidade()
  );

  const refreshUnifiedState = () => {
    setPastas(loadAllPastasUnificadas());
    setAlvaras(loadAllAlvarasUnificados());
    setHabiteSeList(loadHabiteSeRegistros());
    setPasList(loadPasJuridico());
    setSolicitacoesLab(getSolicitacoesPotabilidade());
  };

  useEffect(() => {
    void syncPastasFromSupabaseUnificadas().then(setPastas);
    void syncAlvarasFromSupabaseUnificados().then(setAlvaras);
    void syncHabiteSeFromSupabase().then(setHabiteSeList);
    void syncPasFromSupabase().then(setPasList);
    void fetchSolicitacoesPotabilidadeFromSupabase().then((res) => {
      if (res) setSolicitacoesLab(res);
    });

    const unsubLab = subscribeSolicitacoesPotabilidade(() => {
      setSolicitacoesLab(getSolicitacoesPotabilidade());
    });
    const onCustomSync = () => refreshUnifiedState();
    window.addEventListener('visa_pasta_updated', onCustomSync);
    window.addEventListener('visa_alvara_updated', onCustomSync);
    window.addEventListener('visa_habite_se_updated', onCustomSync);
    window.addEventListener('visa_pas_updated', onCustomSync);
    return () => {
      unsubLab();
      window.removeEventListener('visa_pasta_updated', onCustomSync);
      window.removeEventListener('visa_alvara_updated', onCustomSync);
      window.removeEventListener('visa_habite_se_updated', onCustomSync);
      window.removeEventListener('visa_pas_updated', onCustomSync);
    };
  }, []);

  const metrics = useMemo(
    () =>
      computeSinncMetrics(
        currentUser,
        processos,
        fiscalizacoes,
        amostrasLaboratorio,
        feiras,
        escala,
        pastas,
        alvaras,
        habiteSeList,
        pasList,
        solicitacoesLab
      ),
    [
      currentUser,
      processos,
      fiscalizacoes,
      amostrasLaboratorio,
      feiras,
      escala,
      pastas,
      alvaras,
      habiteSeList,
      pasList,
      solicitacoesLab,
    ]
  );

  const handleOpenTab = (tabId: SinncWorkspaceTabId) => {
    setSelectedPasta(null);
    const isPinned = SINNC_PINNED_TABS.some((t) => t.id === tabId);
    if (!isPinned && tabId !== 'painel') {
      const moduleId = tabId as Exclude<SinncNavId, 'painel'>;
      setOpenExtraTabs((prev) => (prev.includes(moduleId) ? prev : [...prev, moduleId]));
    }
    setActiveTab(tabId);
  };

  const handleCloseExtraTab = (e: React.MouseEvent, tabId: Exclude<SinncNavId, 'painel'>) => {
    e.stopPropagation();
    setOpenExtraTabs((prev) => prev.filter((t) => t !== tabId));
    if (activeTab === tabId) {
      setActiveTab('painel');
    }
  };

  // Abre (ou cria) o Dossiê 360° da Pasta a partir de um Processo ou CPF/CNPJ
  const handleOpenDossiePorDoc = async (doc: string, razaoFallback?: string) => {
    const limpo = cleanDoc(doc);
    const existing = pastas.find((p) => cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === limpo);
    if (existing) {
      setSelectedProcesso(null);
      setSelectedPasta(existing);
      return;
    }
    if (limpo.length === 11 || limpo.length === 14) {
      const { pasta } = await obterOuCriarPastaPorCpfCnpj(limpo, {
        razao_social: razaoFallback,
        criado_por: currentUser?.nome_completo || 'Portal VISA',
      });
      refreshUnifiedState();
      setSelectedProcesso(null);
      setSelectedPasta(pasta);
    }
  };

  const handleOpenDossiePorProcesso = async (proc: ProcessoItem) => {
    const pastaNum = String(proc.numero_pasta || proc.pasta || '').trim();
    const limpo = cleanDoc(proc.cpf_cnpj_limpo || proc.cnpj_cpf);
    const existing = pastas.find(
      (p) =>
        (limpo && cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === limpo) ||
        (pastaNum && getDisplayPastaNumero(p) === pastaNum)
    );
    if (existing) {
      setSelectedProcesso(null);
      setSelectedPasta(existing);
      return;
    }
    if (limpo.length === 11 || limpo.length === 14) {
      const { pasta } = await obterOuCriarPastaPorCpfCnpj(limpo, {
        razao_social: proc.razao_social || proc.nome_fantasia,
        setor: proc.setor,
        bairro: proc.bairro,
        endereco: proc.endereco,
        pasta_fisica_informada: pastaNum || undefined,
        criado_por: currentUser?.nome_completo || 'Portal VISA',
      });
      refreshUnifiedState();
      setSelectedProcesso(null);
      setSelectedPasta(pasta);
    }
  };

  const handleSolicitarLab = (pasta?: PastaVisaItem | null) => {
    setLabSolicitarPasta(pasta || null);
    setLabSolicitarOpen(true);
  };

  const handleSolicitarLabDeProcesso = async (proc: ProcessoItem) => {
    const limpo = cleanDoc(proc.cpf_cnpj_limpo || proc.cnpj_cpf);
    const existing = pastas.find((p) => cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === limpo);
    if (existing) {
      handleSolicitarLab(existing);
    } else {
      setLabSolicitarPasta({
        id: 'temp',
        cnpj_cpf: proc.cnpj_cpf,
        pasta: proc.numero_pasta || proc.pasta || '',
        razao_social: proc.razao_social,
        status_rf: 'ATIVA',
        alvara_atualizado: 'EM RENOVAÇÃO',
        setor: proc.setor || 'VIGILÂNCIA SANITÁRIA',
        endereco: proc.endereco,
        bairro: proc.bairro,
        telefone: proc.telefone,
        email: proc.email,
      });
      setLabSolicitarOpen(true);
    }
  };

  const handleEmitirAlvaraDeProcesso = async (proc: ProcessoItem) => {
    const limpo = cleanDoc(proc.cpf_cnpj_limpo || proc.cnpj_cpf);
    let pastaAlvo = pastas.find((p) => cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === limpo);
    if (!pastaAlvo && (limpo.length === 11 || limpo.length === 14)) {
      const res = await obterOuCriarPastaPorCpfCnpj(limpo, {
        razao_social: proc.razao_social,
        setor: proc.setor,
        pasta_fisica_informada: proc.pasta,
      });
      pastaAlvo = res.pasta;
    }
    if (!pastaAlvo) return;
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    const res = await gerarAlvaraDeProcessoDeferido({
      processo: proc,
      pasta: pastaAlvo,
      validade: d.toISOString().slice(0, 10),
      currentUser,
    });
    await onSaveProcesso(res.processoAtualizado);
    refreshUnifiedState();
  };

  const handleInstaurarPasDeProcesso = async (proc: ProcessoItem) => {
    const limpo = cleanDoc(proc.cpf_cnpj_limpo || proc.cnpj_cpf);
    let pastaAlvo = pastas.find((p) => cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === limpo);
    if (!pastaAlvo && (limpo.length === 11 || limpo.length === 14)) {
      const res = await obterOuCriarPastaPorCpfCnpj(limpo, {
        razao_social: proc.razao_social,
        setor: proc.setor,
        pasta_fisica_informada: proc.pasta,
      });
      pastaAlvo = res.pasta;
    }
    if (!pastaAlvo) return;
    const res = await instaurarPasDeHistorico({
      pasta: pastaAlvo,
      processoOrigem: proc,
      enquadramentoLegal: 'LC Municipal / Código Sanitário (Art. 158) e Lei Estadual 6.320/83',
      resumoFatos: `Instaurado a partir do processo ${proc.num_processo} (${proc.assunto}).`,
      currentUser,
    });
    if (res.processoAtualizado) {
      await onSaveProcesso(res.processoAtualizado);
    }
    refreshUnifiedState();
  };

  // Resultados instantâneos da busca global superior
  const topSearchHits = useMemo(() => {
    const tq = topSearchQuery.trim().toLowerCase();
    if (!tq) return { pastas: [] as PastaVisaItem[], processos: [] as ProcessoItem[] };
    const tqDigits = tq.replace(/\D/g, '');
    return {
      pastas: pastas
        .filter(
          (pt) =>
            getDisplayPastaNumero(pt).toLowerCase().includes(tq) ||
            (pt.razao_social || '').toLowerCase().includes(tq) ||
            (pt.cnpj_cpf || '').toLowerCase().includes(tq) ||
            (tqDigits && (pt.cpf_cnpj_limpo || '').includes(tqDigits))
        )
        .slice(0, 5),
      processos: processos
        .filter(
          (p) =>
            (p.num_processo || '').toLowerCase().includes(tq) ||
            (p.razao_social || '').toLowerCase().includes(tq) ||
            (p.numero_pasta || p.pasta || '').toLowerCase().includes(tq)
        )
        .slice(0, 5),
    };
  }, [topSearchQuery, pastas, processos]);

  const navItems: {
    id: SinncNavId;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }[] = [
    { id: 'buscar', label: 'Buscar', icon: <Search className="w-4 h-4 stroke-[1.75]" /> },
    { id: 'painel', label: 'Painel', icon: <LayoutGrid className="w-4 h-4 stroke-[1.75]" /> },
    {
      id: 'tarefas',
      label: 'Tarefas',
      icon: <CheckSquare className="w-4 h-4 stroke-[1.75]" />,
      count: metrics.minhasTarefas.length,
    },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: <Calendar className="w-4 h-4 stroke-[1.75]" />,
      count: metrics.inspecoesAgendadas,
    },
    {
      id: 'cadastros',
      label: 'Pastas',
      icon: <Database className="w-4 h-4 stroke-[1.75]" />,
      count: pastas.length,
    },
    {
      id: 'licenciamento',
      label: 'Licenças',
      icon: <FileCheck2 className="w-4 h-4 stroke-[1.75]" />,
      count: metrics.licenciamentosAndamento.length,
    },
    {
      id: 'fiscalizacao',
      label: 'Fiscalização',
      icon: <ShieldCheck className="w-4 h-4 stroke-[1.75]" />,
      count: fiscalizacoes.length,
    },
    {
      id: 'processos',
      label: 'Processos',
      icon: <FolderKanban className="w-4 h-4 stroke-[1.75]" />,
      count: processos.length,
    },
    { id: 'municipe', label: 'Munícipe', icon: <User className="w-4 h-4 stroke-[1.75]" /> },
    { id: 'contador', label: 'Contador', icon: <Calculator className="w-4 h-4 stroke-[1.75]" /> },
    {
      id: 'laboratorio',
      label: 'Laboratório',
      icon: <FlaskConical className="w-4 h-4 stroke-[1.75]" />,
      count: metrics.amostrasAguardando,
    },
    {
      id: 'ccpu',
      label: 'CCPU',
      icon: <Bug className="w-4 h-4 stroke-[1.75]" />,
      count: metrics.ccpuLocais.length,
    },
    { id: 'relatorios', label: 'Relatórios', icon: <BarChart3 className="w-4 h-4 stroke-[1.75]" /> },
    { id: 'gestao', label: 'Diretoria', icon: <Briefcase className="w-4 h-4 stroke-[1.75]" /> },
    { id: 'configuracoes', label: 'Config', icon: <Settings className="w-4 h-4 stroke-[1.75]" /> },
  ];

  const getTabIcon = (id: SinncWorkspaceTabId) => {
    if (id === 'painel') return <Home className="w-3 h-3 text-slate-500" />;
    if (id === 'temporada') return <Calendar className="w-3 h-3 text-slate-500" />;
    if (id === 'certidoes') return <FileText className="w-3 h-3 text-slate-500" />;
    if (id === 'consulta_alvara') return <Award className="w-3 h-3 text-slate-500" />;
    return null;
  };

  const syncedSelectedProcesso = useMemo(() => {
    if (!selectedProcesso) return null;
    return processos.find((p) => p.id === selectedProcesso.id) || selectedProcesso;
  }, [selectedProcesso, processos]);

  const syncedSelectedPasta = useMemo(() => {
    if (!selectedPasta) return null;
    return pastas.find((p) => p.id === selectedPasta.id) || selectedPasta;
  }, [selectedPasta, pastas]);

  return (
    <div className="sinnc-portal h-screen h-[100dvh] w-full flex flex-col bg-[#eef1f5] text-slate-800 overflow-hidden select-none sm:select-auto">
      {/* Barra Superior Institucional Minimalista + Busca Global por Pasta/CPF/CNPJ */}
      <header className="h-11 bg-[#3b6d96] text-white px-3.5 flex items-center justify-between gap-4 shrink-0 border-b border-[#315b7e] relative z-30">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-5 h-5 rounded-sm bg-white/15 border border-white/25 flex items-center justify-center">
              <div className="w-2.5 h-2.5 border border-white/90 rounded-[2px]" />
            </div>
            <span className="text-xs font-semibold tracking-wide whitespace-nowrap">VISA</span>
          </div>
          <span className="h-3.5 w-px bg-white/25 shrink-0 hidden sm:inline-block" aria-hidden="true" />
          <span className="text-xs font-medium text-white/95 truncate hidden md:inline">
            Vigilância Sanitária · Modelo Full
          </span>
        </div>

        {/* Busca Global na Barra Superior */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={topSearchQuery}
            onFocus={() => setTopSearchOpen(true)}
            onBlur={() => setTimeout(() => setTopSearchOpen(false), 180)}
            onChange={(e) => {
              setTopSearchQuery(e.target.value);
              setTopSearchOpen(true);
            }}
            placeholder="Busca rápida: Pasta (000001 / física), CPF/CNPJ ou protocolo..."
            className="w-full !pl-8 !pr-3 !py-1 !text-xs !rounded !border-0 !bg-white !text-slate-900 placeholder:text-slate-400"
          />
          {topSearchOpen && topSearchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg text-left text-slate-800 max-h-80 overflow-y-auto z-50 divide-y divide-slate-100">
              {topSearchHits.pastas.length === 0 && topSearchHits.processos.length === 0 ? (
                <div className="p-3 text-xs text-slate-500">Nenhum resultado para &quot;{topSearchQuery}&quot;.</div>
              ) : (
                <>
                  {topSearchHits.pastas.map((pt) => (
                    <button
                      key={pt.id}
                      type="button"
                      onMouseDown={() => {
                        setSelectedPasta(pt);
                        setTopSearchQuery('');
                        setTopSearchOpen(false);
                      }}
                      className="w-full px-3 py-2 hover:bg-[#f4f6f9] flex items-center justify-between gap-2 text-xs cursor-pointer text-left"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate flex items-center gap-1.5">
                          <FolderOpen className="w-3.5 h-3.5 text-[#3b6d96] shrink-0" />
                          <span>{pt.razao_social}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 truncate">
                          Pasta {getDisplayPastaNumero(pt)} · {pt.cnpj_cpf}
                        </div>
                      </div>
                      <span className="text-[10.5px] font-medium text-[#3b6d96] shrink-0">Dossiê 360°</span>
                    </button>
                  ))}
                  {topSearchHits.processos.map((pr) => (
                    <button
                      key={pr.id}
                      type="button"
                      onMouseDown={() => {
                        setSelectedProcesso(pr);
                        setTopSearchQuery('');
                        setTopSearchOpen(false);
                      }}
                      className="w-full px-3 py-2 hover:bg-[#f4f6f9] flex items-center justify-between gap-2 text-xs cursor-pointer text-left"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">{pr.razao_social}</div>
                        <div className="text-[11px] font-mono text-slate-500 truncate">
                          Proc. {pr.num_processo} · {pr.status}
                        </div>
                      </div>
                      <span className="text-[10.5px] font-medium text-slate-500 shrink-0">Processo</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="hidden lg:inline-block text-[11px] text-white/90 px-2 py-0.5 rounded bg-white/10 whitespace-nowrap">
            {currentUser?.cargo || 'Coordenação'}
          </span>
          <button
            type="button"
            onClick={onExitMinimalPortal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 text-white text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Retornar à capa do Portal VISA-BC"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Voltar à capa</span>
          </button>
        </div>
      </header>

      {/* Corpo Principal */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Rail Lateral Minimalista */}
        <aside className="w-[74px] bg-[#f8fafc] border-r border-slate-200 flex flex-col py-1.5 overflow-y-auto no-scrollbar shrink-0">
          <nav className="flex flex-col gap-0.5 px-1">
            {navItems.map((item) => {
              const isActive = !syncedSelectedPasta && activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleOpenTab(item.id)}
                  className={`relative w-full py-2 px-1 rounded-md flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#e6eef6] text-[#285277] font-semibold'
                      : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 font-medium'
                  }`}
                  title={item.label}
                >
                  <div className="relative">
                    {item.icon}
                    {typeof item.count === 'number' && item.count > 0 && (
                      <span className="absolute -top-1.5 -right-3 px-1 min-w-[16px] h-[14px] rounded bg-slate-200/90 text-slate-700 text-[9px] font-semibold tabular-nums flex items-center justify-center leading-none">
                        {item.count}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] leading-tight truncate max-w-full">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Área Direita: Abas + Canvas + Rodapé */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Barra de Abas Horizontais do Workspace */}
          <div className="h-9 bg-[#f4f6f9] border-b border-slate-200 flex items-end px-3 gap-1 overflow-x-auto no-scrollbar shrink-0">
            {SINNC_PINNED_TABS.map((tab) => {
              const isActive = !syncedSelectedPasta && activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleOpenTab(tab.id)}
                  className={`h-[30px] px-3 rounded-t-md text-[11.5px] flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-x border-t ${
                    isActive
                      ? 'bg-[#eef1f5] border-slate-300/90 text-slate-900 font-medium relative -mb-px pb-px'
                      : 'bg-transparent border-transparent text-slate-500 hover:text-slate-800 hover:bg-white/50'
                  }`}
                >
                  {getTabIcon(tab.id)}
                  <span>{tab.label}</span>
                </button>
              );
            })}

            {openExtraTabs.map((tabId) => {
              const isActive = !syncedSelectedPasta && activeTab === tabId;
              return (
                <div
                  key={tabId}
                  onClick={() => {
                    setSelectedPasta(null);
                    setActiveTab(tabId);
                  }}
                  className={`h-[30px] px-2.5 rounded-t-md text-[11.5px] flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-x border-t ${
                    isActive
                      ? 'bg-[#eef1f5] border-slate-300/90 text-slate-900 font-medium relative -mb-px pb-px'
                      : 'bg-transparent border-transparent text-slate-500 hover:text-slate-800 hover:bg-white/50'
                  }`}
                >
                  <span>{SINNC_MODULE_LABELS[tabId]}</span>
                  <button
                    type="button"
                    onClick={(e) => handleCloseExtraTab(e, tabId)}
                    className="p-0.5 rounded hover:bg-slate-300/60 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Fechar aba"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {syncedSelectedPasta && (
              <div className="h-[30px] px-3 rounded-t-md text-[11.5px] flex items-center gap-1.5 whitespace-nowrap shrink-0 border-x border-t bg-[#eef1f5] border-slate-300/90 text-[#285277] font-semibold relative -mb-px pb-px">
                <FolderOpen className="w-3 h-3" />
                <span>Dossiê Pasta {getDisplayPastaNumero(syncedSelectedPasta)}</span>
                <button
                  type="button"
                  onClick={() => setSelectedPasta(null)}
                  className="p-0.5 rounded hover:bg-slate-300/60 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Fechar dossiê"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Canvas Principal */}
          <main className="flex-1 overflow-y-auto bg-[#eef1f5] px-4 sm:px-6 py-5">
            <div className="max-w-[1380px] mx-auto">
              {syncedSelectedPasta ? (
                <SinncPastaDossie360
                  pasta={syncedSelectedPasta}
                  currentUser={currentUser}
                  processos={processos}
                  fiscalizacoes={fiscalizacoes}
                  amostrasLaboratorio={amostrasLaboratorio}
                  solicitacoesLab={solicitacoesLab}
                  alvaras={alvaras}
                  feiras={feiras}
                  escala={escala}
                  habiteSeList={habiteSeList}
                  pasList={pasList}
                  onClose={() => setSelectedPasta(null)}
                  onSelectProcesso={(proc) => setSelectedProcesso(proc)}
                  onSaveProcesso={onSaveProcesso}
                  onRefreshState={refreshUnifiedState}
                  onOpenNovaDemandaPasta={(pt) => {
                    setWorkflowInitialPasta(pt);
                    setWorkflowModal('nova_demanda');
                  }}
                  onOpenNovaVistoriaPasta={(pt) => {
                    setWorkflowInitialPasta(pt);
                    setWorkflowModal('nova_vistoria');
                  }}
                  onOpenSolicitarLab={(pt) => handleSolicitarLab(pt)}
                  onOpenTermoColeta={(am, sol) => setTermoColetaModal({ amostra: am, solicitacao: sol })}
                  onOpenLaudoOficial={(am, sol) => setLaudoOficialModal({ amostra: am, solicitacao: sol })}
                />
              ) : activeTab === 'painel' ? (
                <SinncPainelInicio
                  currentUser={currentUser}
                  metrics={metrics}
                  onOpenTab={handleOpenTab}
                  onSelectProcesso={(proc) => setSelectedProcesso(proc)}
                  onOpenNovaDemanda={() => {
                    setWorkflowInitialPasta(null);
                    setWorkflowModal('nova_demanda');
                  }}
                  onOpenDossiePorProcesso={handleOpenDossiePorProcesso}
                />
              ) : (
                <SinncModulesViews
                  activeTab={activeTab}
                  currentUser={currentUser}
                  metrics={metrics}
                  processos={processos}
                  fiscalizacoes={fiscalizacoes}
                  amostrasLaboratorio={amostrasLaboratorio}
                  pontosColeta={pontosColeta}
                  feiras={feiras}
                  escala={escala}
                  users={users}
                  onSelectProcesso={(proc) => setSelectedProcesso(proc)}
                  onSaveProcesso={onSaveProcesso}
                  onOpenDossiePasta={(pt) => setSelectedPasta(pt)}
                  onOpenDossiePorProcesso={handleOpenDossiePorProcesso}
                  onOpenDossiePorDoc={handleOpenDossiePorDoc}
                  onOpenWorkflowModal={(kind, pt) => {
                    setWorkflowInitialPasta(pt || null);
                    setWorkflowModal(kind);
                  }}
                  onOpenSolicitarLab={handleSolicitarLab}
                  onOpenTermoColeta={(am, sol) => setTermoColetaModal({ amostra: am, solicitacao: sol })}
                  onOpenLaudoOficial={(am, sol) => setLaudoOficialModal({ amostra: am, solicitacao: sol })}
                  onSaveUser={onSaveUser}
                  onDeleteUser={onDeleteUser}
                  onRefreshState={refreshUnifiedState}
                  onNavigateClassic={onNavigateClassic}
                  compactDensity={compactDensity}
                  setCompactDensity={setCompactDensity}
                />
              )}
            </div>
          </main>

          {/* Rodapé Discreto Institucional */}
          <footer className="h-7 bg-[#f8fafc] border-t border-slate-200 px-4 flex items-center justify-between gap-4 text-[10.5px] text-slate-500 shrink-0">
            <span className="truncate">VISA-BC · Entrelaçamento Pasta VISA (Opção A Híbrida)</span>
            <span className="hidden sm:inline truncate">
              Profissional: {currentUser?.nome_completo || 'Coordenação VISA'}
            </span>
            <span className="truncate">
              Divisão de Vigilância Sanitária · Balneário Camboriú
            </span>
          </footer>
        </div>
      </div>

      {/* Drawer Lateral de Detalhe e Parecer */}
      <SinncProcessoDrawer
        processo={syncedSelectedProcesso}
        currentUser={currentUser}
        onClose={() => setSelectedProcesso(null)}
        onSaveProcesso={onSaveProcesso}
        onOpenDossiePorProcesso={handleOpenDossiePorProcesso}
        onEmitirAlvaraDeProcesso={handleEmitirAlvaraDeProcesso}
        onInstaurarPasDeProcesso={handleInstaurarPasDeProcesso}
        onSolicitarLabDeProcesso={handleSolicitarLabDeProcesso}
      />

      {/* Modais de Fluxo Completo Capa Teste */}
      <SinncDemoWorkflowModals
        modalKind={workflowModal}
        initialPasta={workflowInitialPasta}
        currentUser={currentUser}
        users={users}
        onClose={() => {
          setWorkflowModal(null);
          setWorkflowInitialPasta(null);
          refreshUnifiedState();
        }}
        onSaveProcesso={onSaveProcesso}
        onSaveFiscalizacao={onSaveFiscalizacao}
        onSaveEscalaItem={onSaveEscalaItem}
        onSaveFeirante={onSaveFeirante}
        onCreatedPasta={() => refreshUnifiedState()}
      />

      {/* Modal Original do Laboratório (Sem Alterar Nenhuma Tela do Laboratório) */}
      {labSolicitarOpen && (
        <SolicitacaoLaudoPotabilidadeModule
          isModal
          currentUser={currentUser}
          initialCnpj={labSolicitarPasta?.cnpj_cpf}
          initialRazao={labSolicitarPasta?.razao_social}
          initialEndereco={labSolicitarPasta?.endereco}
          initialBairro={labSolicitarPasta?.bairro}
          initialTelefone={labSolicitarPasta?.telefone}
          initialEmail={labSolicitarPasta?.email}
          onSaveProcesso={onSaveProcesso}
          onClose={() => {
            setLabSolicitarOpen(false);
            setLabSolicitarPasta(null);
            refreshUnifiedState();
          }}
        />
      )}

      {termoColetaModal && (
        <RelatorioColetaAguaModal
          isOpen
          onClose={() => setTermoColetaModal(null)}
          amostra={termoColetaModal.amostra}
          solicitacao={termoColetaModal.solicitacao}
        />
      )}

      {laudoOficialModal && (
        <LaudoOficialAguaModal
          isOpen
          onClose={() => setLaudoOficialModal(null)}
          amostra={laudoOficialModal.amostra}
          solicitacao={laudoOficialModal.solicitacao}
        />
      )}
    </div>
  );
};
