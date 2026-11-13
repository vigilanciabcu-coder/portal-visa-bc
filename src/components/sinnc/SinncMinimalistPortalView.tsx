import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { ProcessoItem } from '../../types';
import {
  SinncNavId,
  SinncWorkspaceTabId,
  SINNC_PINNED_TABS,
  SINNC_MODULE_LABELS,
  SinncPortalDataProps,
  computeSinncMetrics,
} from './sinncTypes';
import { SinncPainelInicio } from './SinncPainelInicio';
import { SinncModulesViews } from './SinncModulesViews';
import { SinncProcessoDrawer } from './SinncProcessoDrawer';

export const SinncMinimalistPortalView: React.FC<SinncPortalDataProps> = ({
  currentUser,
  processos,
  fiscalizacoes,
  amostrasLaboratorio,
  feiras,
  escala,
  users,
  onSaveProcesso,
  onExitMinimalPortal,
  onNavigateClassic,
}) => {
  const [activeTab, setActiveTab] = useState<SinncWorkspaceTabId>('painel');
  const [openExtraTabs, setOpenExtraTabs] = useState<Exclude<SinncNavId, 'painel'>[]>([]);
  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoItem | null>(null);
  const [compactDensity, setCompactDensity] = useState(false);

  const metrics = useMemo(
    () =>
      computeSinncMetrics(
        currentUser,
        processos,
        fiscalizacoes,
        amostrasLaboratorio,
        feiras,
        escala
      ),
    [currentUser, processos, fiscalizacoes, amostrasLaboratorio, feiras, escala]
  );

  const handleOpenTab = (tabId: SinncWorkspaceTabId) => {
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
    { id: 'cadastros', label: 'Cadastros', icon: <Database className="w-4 h-4 stroke-[1.75]" /> },
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
    { id: 'atendimento', label: 'Atendimento', icon: <Headphones className="w-4 h-4 stroke-[1.75]" /> },
    { id: 'programas', label: 'Programas', icon: <Layers className="w-4 h-4 stroke-[1.75]" /> },
    { id: 'relatorios', label: 'Relatórios', icon: <BarChart3 className="w-4 h-4 stroke-[1.75]" /> },
    { id: 'gestao', label: 'Gestão', icon: <Briefcase className="w-4 h-4 stroke-[1.75]" /> },
    { id: 'configuracoes', label: 'Ajustes', icon: <Settings className="w-4 h-4 stroke-[1.75]" /> },
  ];

  const getTabIcon = (id: SinncWorkspaceTabId) => {
    if (id === 'painel') return <Home className="w-3 h-3 text-slate-500" />;
    if (id === 'temporada') return <Calendar className="w-3 h-3 text-slate-500" />;
    if (id === 'certidoes') return <FileText className="w-3 h-3 text-slate-500" />;
    if (id === 'consulta_alvara') return <Award className="w-3 h-3 text-slate-500" />;
    return null;
  };

  // Mantém o processo selecionado sincronizado se for atualizado
  const syncedSelectedProcesso = useMemo(() => {
    if (!selectedProcesso) return null;
    return processos.find((p) => p.id === selectedProcesso.id) || selectedProcesso;
  }, [selectedProcesso, processos]);

  return (
    <div className="sinnc-portal h-screen h-[100dvh] w-full flex flex-col bg-[#eef1f5] text-slate-800 overflow-hidden select-none sm:select-auto">
      {/* Barra Superior Institucional Minimalista */}
      <header className="h-10 bg-[#3b6d96] text-white px-3.5 flex items-center justify-between gap-4 shrink-0 border-b border-[#315b7e]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-5 h-5 rounded-sm bg-white/15 border border-white/25 flex items-center justify-center">
              <div className="w-2.5 h-2.5 border border-white/90 rounded-[2px]" />
            </div>
            <span className="text-xs font-semibold tracking-wide whitespace-nowrap">SINNC</span>
          </div>
          <span className="h-3.5 w-px bg-white/25 shrink-0" aria-hidden="true" />
          <span className="text-xs font-medium text-white/95 truncate">
            SINNC Saúde – Vigilância Sanitária
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden md:inline-block text-[11px] text-white/90 px-2 py-0.5 rounded bg-white/10 whitespace-nowrap">
            Perfil: {currentUser?.cargo || 'Administrador'}
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
              const isActive = activeTab === item.id;
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
              const isActive = activeTab === tab.id;
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
              const isActive = activeTab === tabId;
              return (
                <div
                  key={tabId}
                  onClick={() => setActiveTab(tabId)}
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
          </div>

          {/* Canvas Principal */}
          <main className="flex-1 overflow-y-auto bg-[#eef1f5] px-4 sm:px-6 py-5">
            <div className="max-w-[1380px] mx-auto">
              {activeTab === 'painel' ? (
                <SinncPainelInicio
                  currentUser={currentUser}
                  metrics={metrics}
                  onOpenTab={handleOpenTab}
                  onSelectProcesso={(proc) => setSelectedProcesso(proc)}
                />
              ) : (
                <SinncModulesViews
                  activeTab={activeTab}
                  currentUser={currentUser}
                  metrics={metrics}
                  processos={processos}
                  fiscalizacoes={fiscalizacoes}
                  amostrasLaboratorio={amostrasLaboratorio}
                  feiras={feiras}
                  escala={escala}
                  users={users}
                  onSelectProcesso={(proc) => setSelectedProcesso(proc)}
                  onNavigateClassic={onNavigateClassic}
                  compactDensity={compactDensity}
                  setCompactDensity={setCompactDensity}
                />
              )}
            </div>
          </main>

          {/* Rodapé Discreto Institucional */}
          <footer className="h-7 bg-[#f8fafc] border-t border-slate-200 px-4 flex items-center justify-between gap-4 text-[10.5px] text-slate-500 shrink-0">
            <span className="truncate">SINNC Saúde · Vigilância Sanitária</span>
            <span className="hidden sm:inline truncate">
              Profissional: {currentUser?.nome_completo || 'Coordenação VISA'}
            </span>
            <span className="truncate">
              Unidade: Divisão de Vigilância Sanitária · Balneário Camboriú
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
      />
    </div>
  );
};
