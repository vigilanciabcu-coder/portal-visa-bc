import React, { useState } from 'react';
import {
  LayoutGrid,
  CheckSquare,
  Building2,
  FileWarning,
  ClipboardList,
  CalendarClock,
  FolderKanban,
  FlaskConical,
  AlertCircle,
  FileBadge,
  BarChart2,
  Bell,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ProcessoItem, UserProfile } from '../../types';
import {
  ExternalUserScope,
  SinncDashboardMetrics,
  SinncWorkspaceTabId,
  diffDaysFromToday,
  formatShortBrDate,
} from './sinncTypes';
import { formatDoc } from '../../lib/pastaVisaService';

interface SinncPainelInicioProps {
  currentUser: UserProfile | null;
  externalScope?: ExternalUserScope;
  metrics: SinncDashboardMetrics;
  onOpenTab: (tab: SinncWorkspaceTabId) => void;
  onSelectProcesso: (proc: ProcessoItem) => void;
  onOpenNovaDemanda?: () => void;
  onOpenDossiePorProcesso?: (proc: ProcessoItem) => void;
}

export const SinncPainelInicio: React.FC<SinncPainelInicioProps> = ({
  currentUser,
  externalScope,
  metrics,
  onOpenTab,
  onSelectProcesso,
  onOpenNovaDemanda,
  onOpenDossiePorProcesso,
}) => {
  const [expandedStrip, setExpandedStrip] = useState<'hoje' | '7dias' | null>(null);

  const todayFormatted = new Date().toLocaleDateString('pt-BR');
  const isExternal = Boolean(externalScope?.isExternal);
  const displayName = currentUser?.nome_completo || 'Mariana Costa Ribeiro';
  const displayRole =
    externalScope?.mode === 'CIDADAO'
      ? 'Munícipe'
      : externalScope?.mode === 'CONTRIBUINTE'
      ? 'Contribuinte / Empresa'
      : externalScope?.mode === 'CONTABILIDADE'
      ? 'Escritório Contábil'
      : currentUser?.cargo || 'Coordenação';

  const isFeirante =
    currentUser?.categoria_contribuinte === 'FEIRANTE' ||
    (currentUser?.cargo || '').toUpperCase().includes('FEIRANTE');

  const allKpiCards: {
    id: string;
    label: string;
    value: number;
    subtext: string;
    icon: React.ReactNode;
    targetTab: SinncWorkspaceTabId;
  }[] = [
    {
      id: 'tarefas',
      label: isExternal ? 'Meus processos pendentes' : 'Minhas tarefas',
      value: metrics.minhasTarefas.length,
      subtext: isExternal
        ? `${metrics.aguardandoMinhaResposta.length} em análise ou vistoria`
        : `${metrics.tarefasAtrasadas} atrasada(s) · ${metrics.naFilaEquipe} na fila da equipe`,
      icon: <CheckSquare className="w-3.5 h-3.5" />,
      targetTab: isExternal ? 'processos' : 'tarefas',
    },
    {
      id: 'empresas',
      label:
        externalScope?.mode === 'CONTABILIDADE'
          ? 'Empresas da carteira'
          : isExternal
          ? 'Minha Pasta VISA'
          : 'Empresas e estabelecimentos ativos',
      value: isExternal ? metrics.pastasLocais.length : metrics.estabelecimentosAtivos,
      subtext: isExternal
        ? metrics.pastasLocais.length === 1
          ? '1 Pasta vinculada ao seu cadastro'
          : `${metrics.pastasLocais.length} Pasta(s) vinculada(s)`
        : `${metrics.interditados} interditado(s)`,
      icon: <Building2 className="w-3.5 h-3.5" />,
      targetTab: 'cadastros',
    },
    {
      id: 'alvaras_vencidos',
      label: isExternal ? 'Alvarás vencidos' : 'Alvarás vencidos',
      value: metrics.alvarasVencidos,
      subtext: `${metrics.alvarasVencendo30d} vencem em até 30 dias`,
      icon: <FileWarning className="w-3.5 h-3.5" />,
      targetTab: isExternal ? 'consulta_alvara' : 'licenciamento',
    },
    {
      id: 'licenciamentos',
      label: isExternal ? 'Meus licenciamentos' : 'Licenciamentos em andamento',
      value: metrics.licenciamentosAndamento.length,
      subtext: `${metrics.licenciamentosForaPrazo} fora do prazo`,
      icon: <ClipboardList className="w-3.5 h-3.5" />,
      targetTab: externalScope?.mode === 'CIDADAO' ? 'processos' : 'licenciamento',
    },
    {
      id: 'inspecoes',
      label: 'Inspeções agendadas',
      value: metrics.inspecoesAgendadas,
      subtext: `${metrics.inspecoesAtrasadas} atrasada(s)`,
      icon: <CalendarClock className="w-3.5 h-3.5" />,
      targetTab: 'agenda',
    },
    {
      id: 'processos_adm',
      label: isExternal ? 'Meus processos' : 'Processos administrativos',
      value: isExternal ? metrics.processosPas.length : metrics.processosPas.length,
      subtext: `${metrics.pasVencidos} com prazo vencido`,
      icon: <FolderKanban className="w-3.5 h-3.5" />,
      targetTab: 'processos',
    },
    {
      id: 'amostras',
      label: isExternal ? 'Potabilidade (Lab)' : 'Amostras aguardando',
      value: metrics.amostrasAguardando,
      subtext: `${metrics.amostrasInsatisfatorias} insatisfatória(s) no total`,
      icon: <FlaskConical className="w-3.5 h-3.5" />,
      targetTab: 'laboratorio',
    },
    {
      id: 'surtos',
      label: 'Ocorrências e notificações',
      value: metrics.surtosOcorrenciasAberto,
      subtext: `${metrics.surtosNotificadosTotal} notificados no total`,
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      targetTab: 'ccpu',
    },
    {
      id: 'temporarias',
      label: 'Licenças temporárias vigentes',
      value: metrics.licencasTempVigentes,
      subtext: `${metrics.licencasTempAnalise} pedido(s) em análise`,
      icon: <FileBadge className="w-3.5 h-3.5" />,
      targetTab: 'temporada',
    },
  ];

  const kpiCards = allKpiCards.filter((c) => {
    if (!isExternal) return true;
    if (c.id === 'surtos' || c.id === 'inspecoes') return false;
    if (externalScope?.mode === 'CIDADAO' && (c.id === 'amostras' || c.id === 'temporarias' || c.id === 'licenciamentos')) return false;
    if (externalScope?.mode === 'CONTRIBUINTE' && c.id === 'temporarias' && !isFeirante) return false;
    return true;
  });

  const getDelayLabel = (proc: ProcessoItem) => {
    const diff = diffDaysFromToday(proc.prazo_vistoria || proc.venc_1doc || proc.agendado_para);
    if (diff === null) return 'Em análise';
    if (diff < 0) return `Vencido há ${Math.abs(diff)}d`;
    if (diff === 0) return 'Vence hoje';
    return `Prazo em ${diff}d`;
  };

  const activeStripItems =
    expandedStrip === 'hoje'
      ? metrics.vencidosEVencendoHoje
      : expandedStrip === '7dias'
      ? metrics.proximos7Dias
      : [];

  return (
    <div className="space-y-6 text-left">
      {/* Cabeçalho da Página */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-md border border-slate-300/80 bg-[#f8fafc] flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
          <LayoutGrid className="w-4 h-4" />
        </div>
        <div className="space-y-0.5 min-w-0 flex-1">
          <h1 className="text-[17px] font-semibold text-slate-800 tracking-tight leading-snug">
            {externalScope?.mode === 'CIDADAO'
              ? 'Meu Painel · Portal do Munícipe'
              : externalScope?.mode === 'CONTRIBUINTE'
              ? 'Área do Contribuinte · Minha Empresa'
              : externalScope?.mode === 'CONTABILIDADE'
              ? 'Portal da Contabilidade · Carteira de Empresas'
              : 'Painel da Vigilância Sanitária'}
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">
                {externalScope?.mode === 'CIDADAO'
                  ? `Acesso exclusivo ao seu CPF (${externalScope.primaryDoc ? formatDoc(externalScope.primaryDoc) : currentUser?.email || 'pessoal'})`
                  : externalScope?.mode === 'CONTRIBUINTE'
                  ? `Dados exclusivos da sua empresa (${externalScope.primaryDoc ? formatDoc(externalScope.primaryDoc) : currentUser?.email || 'CNPJ'})`
                  : externalScope?.mode === 'CONTABILIDADE'
                  ? `Carteira contábil restrita (${externalScope.allowedDocs.length} CNPJ/CPF vinculado(s))`
                  : 'Visão geral das pendências, prazos e indicadores integrados pela Pasta VISA'}
              </p>
              <p className="text-[11.5px] text-slate-500 tabular-nums pt-0.5">
                Hoje: {todayFormatted} · {displayName} ({displayRole}) ·{' '}
                {externalScope?.mode === 'CONTRIBUINTE' || externalScope?.mode === 'CIDADAO'
                  ? metrics.pastasLocais.length === 1
                    ? '1 Pasta vinculada'
                    : `${metrics.pastasLocais.length} Pasta(s) vinculada(s)`
                  : `${metrics.pastasLocais.length} Pasta(s) vinculada(s)`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onOpenNovaDemanda && (
                <button
                  type="button"
                  onClick={onOpenNovaDemanda}
                  className="px-3 py-1.5 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium cursor-pointer whitespace-nowrap"
                >
                  {isExternal ? '+ Nova Solicitação' : '+ Nova Demanda (Auto-Pasta)'}
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenTab('cadastros')}
                className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer whitespace-nowrap"
              >
                {externalScope?.mode === 'CONTABILIDADE' ? 'Pastas da Carteira' : isExternal ? 'Minha Pasta VISA' : 'Abrir Pastas VISA'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Seção 1: Indicadores */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <BarChart2 className="w-3.5 h-3.5 text-slate-500" />
          <h2>Indicadores</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpiCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => onOpenTab(card.targetTab)}
              className="group bg-[#f4f6f9] hover:bg-white border border-slate-200/90 hover:border-slate-300 rounded-lg p-3.5 text-left transition-colors cursor-pointer flex flex-col justify-between min-h-[104px]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11.5px] font-medium text-slate-600 leading-snug line-clamp-2">
                  {card.label}
                </span>
                <span className="w-6 h-6 rounded border border-slate-200 bg-white/80 text-slate-500 group-hover:text-[#3b6d96] flex items-center justify-center shrink-0 transition-colors">
                  {card.icon}
                </span>
              </div>

              <div className="mt-2">
                <div className="text-2xl font-semibold text-slate-800 tabular-nums leading-none">
                  {card.value}
                </div>
                <div className="text-[11px] text-slate-500 mt-1.5 truncate tabular-nums">
                  {card.subtext}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Seção 2: Análises e pareceres / Acompanhamento da conta */}
      <section className="space-y-4">
        <div className="border-t border-slate-200/80 pt-4">
          <h2 className="text-xs font-semibold text-slate-800">
            {isExternal ? (
              <>
                Acompanhamento da conta –{' '}
                <span className="font-normal text-slate-500">
                  seus protocolos, exigências e prazos sanitários
                </span>
              </>
            ) : (
              <>
                Análises e pareceres –{' '}
                <span className="font-normal text-slate-500">
                  o que depende de você e do requerente
                </span>
              </>
            )}
          </h2>
        </div>

        {/* Cards de síntese */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${
            externalScope?.mode === 'CIDADAO' ||
            (externalScope?.mode === 'CONTRIBUINTE' && metrics.pasJuridicoLocais.length === 0)
              ? 'lg:grid-cols-4'
              : 'lg:grid-cols-5'
          } gap-3`}
        >
          <button
            type="button"
            onClick={() => onOpenTab(isExternal ? (externalScope?.mode === 'CONTABILIDADE' ? 'contador' : 'municipe') : 'tarefas')}
            className="bg-[#f4f6f9] hover:bg-white border border-slate-200/90 rounded-lg px-3.5 py-3 text-left transition-colors cursor-pointer"
          >
            <div className="text-lg font-semibold text-slate-800 tabular-nums">
              {metrics.aguardandoMinhaResposta.length}
            </div>
            <div className="text-[11.5px] text-slate-500 mt-0.5 truncate">
              {isExternal ? 'processos em andamento' : 'aguardando minha resposta'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenTab('processos')}
            className={`border rounded-lg px-3.5 py-3 text-left transition-colors cursor-pointer ${
              metrics.exigenciasVencidasSemResposta.length > 0
                ? 'bg-[#f6ecef] hover:bg-[#f9f1f3] border-[#e4cdd2]'
                : 'bg-[#f4f6f9] hover:bg-white border-slate-200/90'
            }`}
          >
            <div
              className={`text-lg font-semibold tabular-nums ${
                metrics.exigenciasVencidasSemResposta.length > 0
                  ? 'text-[#a13c46]'
                  : 'text-slate-800'
              }`}
            >
              {metrics.exigenciasVencidasSemResposta.length}
            </div>
            <div className="text-[11.5px] text-slate-600 mt-0.5 truncate">
              exigências vencidas sem resposta
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenTab(externalScope?.mode === 'CONTABILIDADE' ? 'contador' : 'municipe')}
            className="bg-[#f4f6f9] hover:bg-white border border-slate-200/90 rounded-lg px-3.5 py-3 text-left transition-colors cursor-pointer"
          >
            <div className="text-lg font-semibold text-slate-800 tabular-nums">
              {metrics.cumprimentosParaConferir.length > 0
                ? `${metrics.cumprimentosParaConferir.length}`
                : metrics.mensagensPortalSemResposta}
            </div>
            <div className="text-[11.5px] text-slate-500 mt-0.5 truncate">
              {metrics.cumprimentosParaConferir.length > 0
                ? isExternal ? 'cumprimentos enviados' : 'retornos p/ conferência'
                : isExternal ? 'minhas solicitações abertas' : 'chamados no portal'}
            </div>
          </button>

          {externalScope?.mode !== 'CIDADAO' && (
            <button
              type="button"
              onClick={() => onOpenTab('laboratorio')}
              className="bg-[#f4f6f9] hover:bg-white border border-slate-200/90 rounded-lg px-3.5 py-3 text-left transition-colors cursor-pointer"
            >
              <div className={`text-lg font-semibold tabular-nums ${metrics.amostrasInsatisfatorias > 0 ? 'text-[#a13c46]' : 'text-slate-800'}`}>
                {metrics.amostrasInsatisfatorias}
              </div>
              <div className="text-[11.5px] text-slate-500 mt-0.5 truncate">
                {isExternal ? 'meus laudos não conformes' : 'laudos não conformes (Lab)'}
              </div>
            </button>
          )}

          {(!isExternal || externalScope?.mode === 'CONTABILIDADE' || metrics.pasJuridicoLocais.length > 0) &&
            externalScope?.mode !== 'CIDADAO' && (
            <button
              type="button"
              onClick={() => onOpenTab('processos')}
              className="bg-[#f4f6f9] hover:bg-white border border-slate-200/90 rounded-lg px-3.5 py-3 text-left transition-colors cursor-pointer"
            >
              <div className="text-lg font-semibold text-slate-800 tabular-nums">
                {metrics.pasJuridicoLocais.length}
              </div>
              <div className="text-[11.5px] text-slate-500 mt-0.5 truncate">
                PAS jurídicos vinculados
              </div>
            </button>
          )}
        </div>

        {!isExternal && metrics.cumprimentosParaConferir.length > 0 && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-md px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
            <span>
              <strong>{metrics.cumprimentosParaConferir.length} cumprimento(s)</strong> enviado(s) pelo Portal Cidadão/Contador aguardando conferência do fiscal titular.
            </span>
            <button
              type="button"
              onClick={() => {
                const first = metrics.cumprimentosParaConferir[0];
                if (onOpenDossiePorProcesso) onOpenDossiePorProcesso(first);
                else onSelectProcesso(first);
              }}
              className="font-semibold text-[#285277] hover:underline cursor-pointer whitespace-nowrap"
            >
              Conferir na Pasta
            </button>
          </div>
        )}

        {/* Grade inferior 3 colunas: Aguardando minha resposta | Minhas solicitações | Exigências */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
          {/* Coluna Esquerda: Aguardando minha resposta */}
          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700 tabular-nums">
                {isExternal ? 'Aguardando minha resposta / adequação' : 'Aguardando minha resposta'} ({metrics.aguardandoMinhaResposta.length})
              </h3>
              {metrics.aguardandoMinhaResposta.length > 5 && (
                <button
                  type="button"
                  onClick={() => onOpenTab(isExternal ? 'processos' : 'tarefas')}
                  className="text-[11px] font-medium text-[#3b6d96] hover:underline cursor-pointer"
                >
                  Ver todos
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-200/70">
              {metrics.aguardandoMinhaResposta.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  Nenhuma pendência aguardando sua resposta.
                </p>
              ) : (
                metrics.aguardandoMinhaResposta.slice(0, 5).map((proc) => {
                  const delayText = getDelayLabel(proc);
                  const isOverdue = delayText.startsWith('Vencido');
                  return (
                    <button
                      key={proc.id}
                      type="button"
                      onClick={() => onSelectProcesso(proc)}
                      className="w-full py-2.5 px-2 -mx-2 rounded hover:bg-white/80 transition-colors flex items-start justify-between gap-3 text-left cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800 truncate">
                          {proc.assunto || 'Parecer solicitado'} – Proc. {proc.num_processo || proc.id}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {proc.razao_social || proc.nome_fantasia || 'Parecer solicitado'}
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-medium shrink-0 tabular-nums ${
                          isOverdue ? 'text-[#a13c46]' : 'text-slate-500'
                        }`}
                      >
                        {delayText}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Coluna Central: Minhas solicitações em aberto */}
          <div className="lg:col-span-4 space-y-2 lg:border-l lg:border-slate-200/70 lg:pl-5">
            <h3 className="text-xs font-semibold text-slate-700 tabular-nums">
              Minhas solicitações em aberto ({metrics.solicitacoesEmAberto.length})
            </h3>

            {metrics.solicitacoesEmAberto.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-slate-500">
                  Nenhuma solicitação sua aguardando resposta.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200/70">
                {metrics.solicitacoesEmAberto.slice(0, 5).map((proc) => (
                  <button
                    key={proc.id}
                    type="button"
                    onClick={() => onSelectProcesso(proc)}
                    className="w-full py-2.5 px-2 -mx-2 rounded hover:bg-white/80 transition-colors flex items-start justify-between gap-2 text-left cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate">
                        {proc.razao_social || proc.num_processo}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {proc.assunto || proc.status}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono tabular-nums shrink-0">
                      {formatShortBrDate(proc.data_protocolo)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Coluna Direita: Exigências */}
          <div className="lg:col-span-3 space-y-2 lg:border-l lg:border-slate-200/70 lg:pl-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700">Exigências</h3>
              <button
                type="button"
                onClick={() => onOpenTab('processos')}
                className="text-[11px] font-medium text-[#3b6d96] hover:underline cursor-pointer"
              >
                Abrir lista
              </button>
            </div>

            <div className="divide-y divide-slate-200/70">
              {metrics.exigenciasLista.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">Sem exigências pendentes.</p>
              ) : (
                metrics.exigenciasLista.slice(0, 5).map((proc) => (
                  <button
                    key={proc.id}
                    type="button"
                    onClick={() => onSelectProcesso(proc)}
                    className="w-full py-2 px-1.5 -mx-1.5 rounded hover:bg-white/80 transition-colors text-left cursor-pointer block"
                  >
                    <div className="text-xs font-medium text-slate-800 truncate">
                      {proc.assunto || 'Exigência sanitária'}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {proc.razao_social || proc.num_processo} · {getDelayLabel(proc)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Faixa inferior de prazos imediatos */}
      <section className="border-t border-slate-200/90 pt-3 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setExpandedStrip(expandedStrip === 'hoje' ? null : 'hoje')}
            className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-slate-200 bg-[#f4f6f9] hover:bg-white text-xs font-medium text-slate-700 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 tabular-nums">
              <Bell className="w-3.5 h-3.5 text-slate-500" />
              <span>Vencidos e vencendo hoje ({metrics.vencidosEVencendoHoje.length})</span>
            </span>
            {expandedStrip === 'hoje' ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setExpandedStrip(expandedStrip === '7dias' ? null : '7dias')}
            className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-slate-200 bg-[#f4f6f9] hover:bg-white text-xs font-medium text-slate-700 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 tabular-nums">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Próximos 7 dias ({metrics.proximos7Dias.length})</span>
            </span>
            {expandedStrip === '7dias' ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>

        {expandedStrip && (
          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200/80">
            {activeStripItems.length === 0 ? (
              <p className="text-xs text-slate-500 p-4 text-center">
                Nenhum processo com vencimento neste recorte.
              </p>
            ) : (
              activeStripItems.slice(0, 12).map((proc) => (
                <button
                  key={proc.id}
                  type="button"
                  onClick={() => onSelectProcesso(proc)}
                  className="w-full px-4 py-2.5 hover:bg-[#f8fafc] flex items-center justify-between gap-4 text-left text-xs transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <span className="font-mono text-slate-500 tabular-nums shrink-0">
                      {proc.num_processo || proc.id}
                    </span>
                    <span className="font-medium text-slate-800 truncate">
                      {proc.razao_social || proc.nome_fantasia}
                    </span>
                    <span className="text-slate-400 hidden sm:inline truncate">
                      · {proc.assunto}
                    </span>
                  </div>
                  <span className="text-slate-600 font-mono tabular-nums shrink-0">
                    {formatShortBrDate(proc.prazo_vistoria || proc.venc_1doc || proc.agendado_para)}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
};
