import {
  ProcessoItem,
  FiscalizacaoItem,
  AmostraLaboratorioItem,
  FeiranteItem,
  EscalaItem,
  UserProfile,
  AlvaraSanitarioItem,
  PastaVisaItem,
  CcpuOcorrenciaItem,
} from '../../types';

export type SinncNavId =
  | 'buscar'
  | 'painel'
  | 'tarefas'
  | 'agenda'
  | 'cadastros'
  | 'licenciamento'
  | 'fiscalizacao'
  | 'processos'
  | 'atendimento'
  | 'programas'
  | 'relatorios'
  | 'gestao'
  | 'configuracoes';

export type SinncWorkspaceTabId =
  | 'painel'
  | 'temporada'
  | 'certidoes'
  | 'consulta_alvara'
  | Exclude<SinncNavId, 'painel'>;

export interface SinncTabDef {
  id: SinncWorkspaceTabId;
  label: string;
  pinned?: boolean;
}

export const SINNC_PINNED_TABS: SinncTabDef[] = [
  { id: 'painel', label: 'Início', pinned: true },
  { id: 'temporada', label: 'Temporada e eventos', pinned: true },
  { id: 'certidoes', label: 'Certidões e declarações', pinned: true },
  { id: 'consulta_alvara', label: 'Consulta de alvará', pinned: true },
];

export const SINNC_MODULE_LABELS: Record<SinncWorkspaceTabId, string> = {
  painel: 'Início',
  temporada: 'Temporada e eventos',
  certidoes: 'Certidões e declarações',
  consulta_alvara: 'Consulta de alvará',
  buscar: 'Busca global',
  tarefas: 'Minhas tarefas',
  agenda: 'Agenda e escalas',
  cadastros: 'Cadastros e CNPJs',
  licenciamento: 'Licenciamento sanitário',
  fiscalizacao: 'Fiscalização',
  processos: 'Processos administrativos',
  atendimento: 'Atendimento e ouvidoria',
  programas: 'Programas e monitoramento',
  relatorios: 'Relatórios e exportação',
  gestao: 'Gestão da equipe',
  configuracoes: 'Configurações do portal',
};

export interface SinncPortalDataProps {
  currentUser: UserProfile | null;
  processos: ProcessoItem[];
  fiscalizacoes: FiscalizacaoItem[];
  amostrasLaboratorio: AmostraLaboratorioItem[];
  feiras: FeiranteItem[];
  escala: EscalaItem[];
  users: UserProfile[];
  onSaveProcesso: (item: ProcessoItem) => Promise<void> | void;
  onExitMinimalPortal: () => void;
  onNavigateClassic: (view: string) => void;
}

export function safeReadLocalArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseFlexibleDate(value?: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed.slice(0, 10) + 'T12:00:00');
    return isNaN(d.getTime()) ? null : d;
  }

  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const d = new Date(`${brMatch[3]}-${brMatch[2]}-${brMatch[1]}T12:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function diffDaysFromToday(dateStr?: string): number | null {
  const target = parseFlexibleDate(dateStr);
  if (!target) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatShortBrDate(dateStr?: string): string {
  const d = parseFlexibleDate(dateStr);
  if (!d) return dateStr || '—';
  return d.toLocaleDateString('pt-BR');
}

export interface SinncDashboardMetrics {
  minhasTarefas: ProcessoItem[];
  tarefasAtrasadas: number;
  naFilaEquipe: number;
  estabelecimentosAtivos: number;
  interditados: number;
  alvarasVencidos: number;
  alvarasVencendo30d: number;
  licenciamentosAndamento: ProcessoItem[];
  licenciamentosForaPrazo: number;
  inspecoesAgendadas: number;
  inspecoesAtrasadas: number;
  processosPas: ProcessoItem[];
  pasVencidos: number;
  amostrasAguardando: number;
  amostrasInsatisfatorias: number;
  surtosOcorrenciasAberto: number;
  surtosNotificadosTotal: number;
  licencasTempVigentes: number;
  licencasTempAnalise: number;
  aguardandoMinhaResposta: ProcessoItem[];
  exigenciasVencidasSemResposta: ProcessoItem[];
  mensagensPortalSemResposta: number;
  solicitacoesEmAberto: ProcessoItem[];
  exigenciasLista: ProcessoItem[];
  vencidosEVencendoHoje: ProcessoItem[];
  proximos7Dias: ProcessoItem[];
  alvarasLocais: AlvaraSanitarioItem[];
  pastasLocais: PastaVisaItem[];
  ccpuLocais: CcpuOcorrenciaItem[];
}

export function computeSinncMetrics(
  currentUser: UserProfile | null,
  processos: ProcessoItem[],
  fiscalizacoes: FiscalizacaoItem[],
  amostrasLaboratorio: AmostraLaboratorioItem[],
  feiras: FeiranteItem[],
  escala: EscalaItem[]
): SinncDashboardMetrics {
  const alvarasLocais = safeReadLocalArray<AlvaraSanitarioItem>('visa_alvaras');
  const pastasLocais = safeReadLocalArray<PastaVisaItem>('pasta_visa_itens');
  const ccpuLocais = safeReadLocalArray<CcpuOcorrenciaItem>('ccpu_ocorrencias');

  const userFirstName = (currentUser?.nome_completo || '').trim().toLowerCase().split(' ')[0];
  const userFullName = (currentUser?.nome_completo || '').trim().toLowerCase();

  const isAssignedToUser = (p: ProcessoItem) => {
    const resp = (p.fiscal_responsavel || '').toLowerCase();
    if (!resp || !userFirstName) return false;
    return resp.includes(userFullName) || resp.includes(userFirstName);
  };

  const isPendingStatus = (p: ProcessoItem) =>
    p.status !== 'DEFERIDO' && p.status !== 'INDEFERIDO';

  const getDeadlineDiff = (p: ProcessoItem): number | null => {
    const dateCandidate = p.prazo_vistoria || p.venc_1doc || p.agendado_para || p.validade;
    return diffDaysFromToday(dateCandidate);
  };

  const pendingProcesses = processos.filter(isPendingStatus);
  const myPending = pendingProcesses.filter(isAssignedToUser);
  const minhasTarefas = myPending.length > 0 ? myPending : pendingProcesses.slice(0, 10);

  const tarefasAtrasadas = minhasTarefas.filter((p) => {
    const diff = getDeadlineDiff(p);
    return diff !== null && diff < 0;
  }).length;

  const naFilaEquipe = pendingProcesses.length;

  // Estabelecimentos únicos
  const cnpjSet = new Set<string>();
  processos.forEach((p) => {
    const key = (p.cnpj_cpf || p.razao_social || '').trim().toLowerCase();
    if (key) cnpjSet.add(key);
  });
  pastasLocais.forEach((pt) => {
    const key = (pt.cnpj_cpf || pt.razao_social || '').trim().toLowerCase();
    if (key) cnpjSet.add(key);
  });
  alvarasLocais.forEach((a) => {
    const key = (a.cnpj_cpf || a.razao_social || '').trim().toLowerCase();
    if (key) cnpjSet.add(key);
  });

  const interditados = fiscalizacoes.filter((f) => f.status === 'INTERDITADO').length;

  // Alvarás vencidos e vencendo
  const alvarasVencidosList = alvarasLocais.filter((a) => {
    if (a.status === 'VENCIDO') return true;
    const d = diffDaysFromToday(a.validade);
    return d !== null && d < 0;
  });
  const procAlvarasVencidos = processos.filter((p) => {
    const d = diffDaysFromToday(p.venc_licenca || p.validade);
    return d !== null && d < 0 && p.status === 'DEFERIDO';
  });
  const alvarasVencidos = alvarasVencidosList.length + procAlvarasVencidos.length;

  const alvarasVencendo30d =
    alvarasLocais.filter((a) => {
      const d = diffDaysFromToday(a.validade);
      return d !== null && d >= 0 && d <= 30;
    }).length +
    processos.filter((p) => {
      const d = diffDaysFromToday(p.venc_licenca || p.validade);
      return d !== null && d >= 0 && d <= 30;
    }).length;

  const licenciamentosAndamento = processos.filter(
    (p) => p.status === 'EM ANÁLISE' || p.status === 'PENDENTE DOCS' || p.status === 'NOTIFICADO'
  );
  const licenciamentosForaPrazo = licenciamentosAndamento.filter((p) => {
    const d = getDeadlineDiff(p);
    return d !== null && d < 0;
  }).length;

  const vistoriasProc = processos.filter((p) => p.status === 'VISTORIA AGENDADA' || Boolean(p.agendado_para));
  const todayIso = new Date().toISOString().slice(0, 10);
  const escalaAgendada = escala.filter((e) => e.data >= todayIso).length;
  const inspecoesAgendadas = vistoriasProc.length + escalaAgendada;
  const inspecoesAtrasadas = vistoriasProc.filter((p) => {
    const d = diffDaysFromToday(p.agendado_para || p.prazo_vistoria);
    return d !== null && d < 0;
  }).length;

  const processosPas = processos.filter(
    (p) => Boolean(p.pas && p.pas.trim()) || (p.assunto || '').toUpperCase().includes('PAS') || p.status === 'NOTIFICADO'
  );
  const pasVencidos = processosPas.filter((p) => {
    const d = getDeadlineDiff(p);
    return d !== null && d < 0;
  }).length;

  const amostrasAguardando = amostrasLaboratorio.filter(
    (a) =>
      a.status === 'EM ANÁLISE' ||
      a.status === 'AGUARDANDO COLETA' ||
      a.status === 'PAGO / AGUARDANDO COLETA' ||
      a.status === 'COLETA REALIZADA'
  ).length;
  const amostrasInsatisfatorias = amostrasLaboratorio.filter(
    (a) => a.status === 'NÃO CONFORME' || a.status === 'NAO_CONFORME' || a.status === 'INTERDITADO'
  ).length;

  const ccpuAbertos = ccpuLocais.filter((c) => c.statusOcorrencia !== 'CONCLUIDO').length;
  const denunciasAbertas = processos.filter(
    (p) =>
      isPendingStatus(p) &&
      ((p.motivacao || '').toUpperCase().includes('DENÚNCIA') ||
        (p.setor || '').toUpperCase().includes('OUVIDORIA'))
  ).length;
  const surtosOcorrenciasAberto = ccpuAbertos + denunciasAbertas;
  const surtosNotificadosTotal =
    ccpuLocais.filter((c) => c.notificacaoEmitida).length +
    processos.filter((p) => (p.setor || '').toUpperCase().includes('OUVIDORIA')).length;

  const licencasTempVigentes = feiras.filter((f) => f.alvara === 'SIM').length;
  const licencasTempAnalise = feiras.filter((f) => f.alvara === 'EM ANDAMENTO' || f.alvara === 'NÃO').length;

  const aguardandoMinhaResposta = pendingProcesses.filter(
    (p) => p.status === 'EM ANÁLISE' || p.status === 'VISTORIA AGENDADA' || (p.assunto || '').toUpperCase().includes('PARECER')
  );

  const exigenciasLista = processos.filter(
    (p) => p.status === 'PENDENTE DOCS' || p.status === 'NOTIFICADO'
  );

  const exigenciasVencidasSemResposta = exigenciasLista.filter((p) => {
    const d = getDeadlineDiff(p);
    return d !== null && d < 0;
  });

  const solicitacoesEmAberto = pendingProcesses.filter(
    (p) => p.origem_solicitacao === 'PORTAL_MUNICIPE' || (p.assunto || '').toLowerCase().includes('solicita')
  );

  const vencidosEVencendoHoje = pendingProcesses.filter((p) => {
    const d = getDeadlineDiff(p);
    return d !== null && d <= 0;
  });

  const proximos7Dias = pendingProcesses.filter((p) => {
    const d = getDeadlineDiff(p);
    return d !== null && d > 0 && d <= 7;
  });

  return {
    minhasTarefas,
    tarefasAtrasadas,
    naFilaEquipe,
    estabelecimentosAtivos: cnpjSet.size,
    interditados,
    alvarasVencidos,
    alvarasVencendo30d,
    licenciamentosAndamento,
    licenciamentosForaPrazo,
    inspecoesAgendadas,
    inspecoesAtrasadas,
    processosPas,
    pasVencidos,
    amostrasAguardando,
    amostrasInsatisfatorias,
    surtosOcorrenciasAberto,
    surtosNotificadosTotal,
    licencasTempVigentes,
    licencasTempAnalise,
    aguardandoMinhaResposta,
    exigenciasVencidasSemResposta,
    mensagensPortalSemResposta: solicitacoesEmAberto.length,
    solicitacoesEmAberto,
    exigenciasLista,
    vencidosEVencendoHoje,
    proximos7Dias,
    alvarasLocais,
    pastasLocais,
    ccpuLocais,
  };
}
