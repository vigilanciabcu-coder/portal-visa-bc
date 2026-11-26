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
  HabiteSeRegistroItem,
  PasJuridicoItem,
  SolicitacaoLaudoPotabilidadeItem,
  PontoColetaLaboratorio,
  ContabilidadeProfile,
  ContribuinteProfile,
  CidadaoProfile,
  resolveEffectiveTipoUsuario,
} from '../../types';
import { loadAllAlvarasUnificados, loadAllPastasUnificadas } from '../../lib/pastaVisaService';
import { loadHabiteSeRegistros, loadPasJuridico } from '../../lib/interlaceServices';
import { getSolicitacoesPotabilidade } from '../../lib/potabilidadeService';
import { getLocalCcpuOcorrencias } from '../../lib/ccpuOcorrenciasService';
import { INITIAL_CIDADAOS, INITIAL_CONTABILIDADES, INITIAL_CONTRIBUINTES } from '../../data/mockData';

export type ExternalScopeMode = 'INTERNO' | 'CIDADAO' | 'CONTRIBUINTE' | 'CONTABILIDADE';

export interface ExternalPrefillProfile {
  doc: string;
  razaoSocial: string;
  telefone: string;
  email: string;
  endereco: string;
  bairro: string;
  cnae?: string;
}

export interface ContabilidadeClienteOption {
  docLimpo: string;
  docFormatado: string;
  razaoSocial: string;
  endereco?: string;
  bairro?: string;
  telefone?: string;
  email?: string;
  cnae?: string;
}

export interface ExternalUserScope {
  mode: ExternalScopeMode;
  isExternal: boolean;
  allowedDocs: string[];
  primaryDoc: string;
  contabilidade: ContabilidadeProfile | null;
  label: string;
  prefillProfile?: ExternalPrefillProfile | null;
  contabilidadeClientes?: ContabilidadeClienteOption[];
}

export function cleanScopeDoc(doc?: string): string {
  return String(doc || '').replace(/\D/g, '');
}

function normalizeScopeName(name?: string): string {
  return String(name || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function resolveUserExternalScope(
  currentUser: UserProfile | null | undefined,
  contabilidadesOverride?: ContabilidadeProfile[],
  contribuintesOverride?: ContribuinteProfile[],
  cidadaosOverride?: CidadaoProfile[]
): ExternalUserScope {
  if (!currentUser) {
    return {
      mode: 'INTERNO',
      isExternal: false,
      allowedDocs: [],
      primaryDoc: '',
      contabilidade: null,
      label: 'Coordenação VISA',
    };
  }

  const tipo = resolveEffectiveTipoUsuario(currentUser);
  if (tipo === 'SERVIDOR') {
    return {
      mode: 'INTERNO',
      isExternal: false,
      allowedDocs: [],
      primaryDoc: '',
      contabilidade: null,
      label: currentUser.cargo || 'Coordenação VISA',
    };
  }

  const userNameNorm = normalizeScopeName(currentUser.nome_completo);
  const userDocDigits = cleanScopeDoc(currentUser.cnpj || currentUser.cpf);

  const allPastas = loadAllPastasUnificadas();

  if (tipo === 'CIDADAO') {
    const localCid = safeReadLocalArray<CidadaoProfile>('visa_cidadaos');
    const cidList = cidadaosOverride && cidadaosOverride.length > 0
      ? cidadaosOverride
      : (localCid.length > 0 ? localCid : INITIAL_CIDADAOS);
    const matchedCid = cidList.find(
      (c) =>
        (currentUser.id && c.id === currentUser.id) ||
        (currentUser.email && c.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
        (userDocDigits.length === 11 && cleanScopeDoc(c.cpf) === userDocDigits) ||
        (userNameNorm && normalizeScopeName(c.nome_completo) === userNameNorm)
    );
    const docs = Array.from(
      new Set(
        [currentUser.cpf, currentUser.cnpj, matchedCid?.cpf]
          .map((d) => cleanScopeDoc(d))
          .filter((d) => d.length >= 11)
      )
    );
    const primaryDoc = docs[0] || '';
    const pastaMatch = primaryDoc
      ? allPastas.find((p) => cleanScopeDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === primaryDoc)
      : undefined;
    return {
      mode: 'CIDADAO',
      isExternal: true,
      allowedDocs: docs,
      primaryDoc,
      contabilidade: null,
      label: `Munícipe · ${currentUser.nome_completo}`,
      prefillProfile: {
        doc: matchedCid?.cpf || currentUser.cpf || pastaMatch?.cnpj_cpf || primaryDoc,
        razaoSocial: matchedCid?.nome_completo || currentUser.nome_completo || pastaMatch?.razao_social || '',
        telefone: matchedCid?.telefone || currentUser.telefone || pastaMatch?.telefone || '',
        email: matchedCid?.email || currentUser.email || pastaMatch?.email || '',
        endereco: matchedCid?.endereco || currentUser.endereco || pastaMatch?.endereco || '',
        bairro: matchedCid?.bairro || currentUser.bairro || pastaMatch?.bairro || 'Centro',
        cnae: pastaMatch?.cnae_principal || '',
      },
    };
  }

  if (tipo === 'CONTRIBUINTE') {
    const localContrib = safeReadLocalArray<ContribuinteProfile>('visa_contribuintes');
    const contribList = contribuintesOverride && contribuintesOverride.length > 0
      ? contribuintesOverride
      : (localContrib.length > 0 ? localContrib : INITIAL_CONTRIBUINTES);
    const matchedContrib = contribList.find(
      (c) =>
        (currentUser.id && c.id === currentUser.id) ||
        (currentUser.contribuinte_id && c.id === currentUser.contribuinte_id) ||
        (currentUser.email && c.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
        (userDocDigits.length >= 11 && cleanScopeDoc(c.cnpj_cpf) === userDocDigits) ||
        (userNameNorm &&
          (normalizeScopeName(c.razao_social) === userNameNorm ||
            normalizeScopeName(c.nome_fantasia) === userNameNorm))
    );
    const docs = Array.from(
      new Set(
        [currentUser.cnpj, currentUser.cpf, matchedContrib?.cnpj_cpf]
          .map((d) => cleanScopeDoc(d))
          .filter((d) => d.length >= 11)
      )
    );
    const primaryDoc = docs[0] || '';
    const pastaMatch = primaryDoc
      ? allPastas.find((p) => cleanScopeDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === primaryDoc)
      : undefined;
    return {
      mode: 'CONTRIBUINTE',
      isExternal: true,
      allowedDocs: docs,
      primaryDoc,
      contabilidade: null,
      label: `Contribuinte · ${currentUser.nome_completo}`,
      prefillProfile: {
        doc: matchedContrib?.cnpj_cpf || currentUser.cnpj || currentUser.cpf || pastaMatch?.cnpj_cpf || primaryDoc,
        razaoSocial:
          matchedContrib?.razao_social ||
          pastaMatch?.razao_social ||
          currentUser.nome_completo ||
          '',
        telefone: matchedContrib?.telefone || pastaMatch?.telefone || currentUser.telefone || '',
        email: matchedContrib?.email || pastaMatch?.email || currentUser.email || '',
        endereco: matchedContrib?.endereco || pastaMatch?.endereco || currentUser.endereco || '',
        bairro: matchedContrib?.bairro || pastaMatch?.bairro || currentUser.bairro || 'Centro',
        cnae: matchedContrib?.cnae_principal || pastaMatch?.cnae_principal || '',
      },
    };
  }

  // CONTABILIDADE
  const localContab = safeReadLocalArray<ContabilidadeProfile>('visa_contabilidades_lab');
  const contabList = contabilidadesOverride && contabilidadesOverride.length > 0
    ? contabilidadesOverride
    : (localContab.length > 0 ? localContab : INITIAL_CONTABILIDADES);

  const matchedContab =
    contabList.find(
      (c) =>
        (currentUser.contabilidade_id && c.id === currentUser.contabilidade_id) ||
        (currentUser.id && c.id === currentUser.id) ||
        (currentUser.email && c.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser.matricula &&
          (c.crc?.toLowerCase() === currentUser.matricula.toLowerCase() ||
            (cleanScopeDoc(c.cnpj) && cleanScopeDoc(c.cnpj) === cleanScopeDoc(currentUser.matricula)))) ||
        (userNameNorm &&
          (normalizeScopeName(c.razao_social) === userNameNorm ||
            normalizeScopeName(c.nome_fantasia) === userNameNorm))
    ) || null;

  const docs = Array.from(
    new Set(
      (matchedContab?.cnpjs_vinculados || [])
        .map((d) => cleanScopeDoc(d))
        .filter((d) => d.length >= 11)
    )
  );

  const localContrib = safeReadLocalArray<ContribuinteProfile>('visa_contribuintes');
  const contribList = contribuintesOverride && contribuintesOverride.length > 0
    ? contribuintesOverride
    : (localContrib.length > 0 ? localContrib : INITIAL_CONTRIBUINTES);

  const contabilidadeClientes: ContabilidadeClienteOption[] = docs.map((docLimpo) => {
    const rawLinked = (matchedContab?.cnpjs_vinculados || []).find((d) => cleanScopeDoc(d) === docLimpo) || docLimpo;
    const pastaMatch = allPastas.find((p) => cleanScopeDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === docLimpo);
    const contribMatch = contribList.find((c) => cleanScopeDoc(c.cnpj_cpf) === docLimpo);
    return {
      docLimpo,
      docFormatado: pastaMatch?.cnpj_cpf || contribMatch?.cnpj_cpf || rawLinked,
      razaoSocial: pastaMatch?.razao_social || contribMatch?.razao_social || 'Empresa da Carteira',
      endereco: pastaMatch?.endereco || contribMatch?.endereco || '',
      bairro: pastaMatch?.bairro || contribMatch?.bairro || 'Centro',
      telefone: pastaMatch?.telefone || contribMatch?.telefone || '',
      email: pastaMatch?.email || contribMatch?.email || '',
      cnae: pastaMatch?.cnae_principal || contribMatch?.cnae_principal || '',
    };
  });

  return {
    mode: 'CONTABILIDADE',
    isExternal: true,
    allowedDocs: docs,
    primaryDoc: docs[0] || '',
    contabilidade: matchedContab,
    label: `Contabilidade · ${matchedContab?.nome_fantasia || matchedContab?.razao_social || currentUser.nome_completo}`,
    contabilidadeClientes,
  };
}

export function docMatchesExternalScope(doc: string | undefined, scope: ExternalUserScope): boolean {
  if (!scope.isExternal) return true;
  const clean = cleanScopeDoc(doc);
  if (!clean) return false;
  return scope.allowedDocs.includes(clean);
}

export type SinncNavId =
  | 'buscar'
  | 'painel'
  | 'tarefas'
  | 'agenda'
  | 'cadastros'
  | 'licenciamento'
  | 'fiscalizacao'
  | 'processos'
  | 'municipe'
  | 'contador'
  | 'laboratorio'
  | 'ccpu'
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
  cadastros: 'Pastas VISA & CNPJs',
  licenciamento: 'Licenciamento & Habite-se',
  fiscalizacao: 'Fiscalização',
  processos: 'Processos & PAS',
  municipe: 'Portal do Munícipe',
  contador: 'Portal do Contador',
  laboratorio: 'Laboratório & Potabilidade',
  ccpu: 'CCPU · Controle de Pragas',
  atendimento: 'Portal Cidadão / Contador',
  programas: 'Laboratório & Programas',
  relatorios: 'Relatórios e BI',
  gestao: 'Triagem Diretoria & Consolidação',
  configuracoes: 'Configurações & Usuários',
};

export interface SinncPortalDataProps {
  currentUser: UserProfile | null;
  processos: ProcessoItem[];
  fiscalizacoes: FiscalizacaoItem[];
  amostrasLaboratorio: AmostraLaboratorioItem[];
  pontosColeta?: PontoColetaLaboratorio[];
  feiras: FeiranteItem[];
  escala: EscalaItem[];
  users: UserProfile[];
  onSaveProcesso: (item: ProcessoItem) => Promise<void> | void;
  onSaveFiscalizacao?: (item: FiscalizacaoItem) => Promise<void> | void;
  onSaveEscalaItem?: (item: EscalaItem) => Promise<void> | void;
  onSaveFeirante?: (item: FeiranteItem) => Promise<void> | void;
  onSaveUser?: (user: UserProfile) => Promise<boolean> | void;
  onDeleteUser?: (userId: string) => void;
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
  cumprimentosParaConferir: ProcessoItem[];
  alvarasLocais: AlvaraSanitarioItem[];
  pastasLocais: PastaVisaItem[];
  ccpuLocais: CcpuOcorrenciaItem[];
  habiteSeLocais: HabiteSeRegistroItem[];
  pasJuridicoLocais: PasJuridicoItem[];
  solicitacoesLabLocais: SolicitacaoLaudoPotabilidadeItem[];
}

export function computeSinncMetrics(
  currentUser: UserProfile | null,
  processos: ProcessoItem[],
  fiscalizacoes: FiscalizacaoItem[],
  amostrasLaboratorio: AmostraLaboratorioItem[],
  feiras: FeiranteItem[],
  escala: EscalaItem[],
  pastasOverride?: PastaVisaItem[],
  alvarasOverride?: AlvaraSanitarioItem[],
  habiteSeOverride?: HabiteSeRegistroItem[],
  pasOverride?: PasJuridicoItem[],
  solicitacoesLabOverride?: SolicitacaoLaudoPotabilidadeItem[],
  isExternal?: boolean
): SinncDashboardMetrics {
  const alvarasLocais = alvarasOverride ?? (isExternal ? [] : loadAllAlvarasUnificados());
  const pastasLocais = pastasOverride ?? (isExternal ? [] : loadAllPastasUnificadas());
  const ccpuLocais = isExternal ? [] : getLocalCcpuOcorrencias();
  const habiteSeLocais = habiteSeOverride ?? (isExternal ? [] : loadHabiteSeRegistros());
  const pasJuridicoLocais = pasOverride ?? (isExternal ? [] : loadPasJuridico());
  const solicitacoesLabLocais = solicitacoesLabOverride ?? (isExternal ? [] : getSolicitacoesPotabilidade());

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

  const cumprimentosParaConferir = processos.filter(
    (p) => p.cumprimento_cidadao?.status === 'AGUARDANDO_CONFERENCIA'
  );

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
    cumprimentosParaConferir,
    alvarasLocais,
    pastasLocais,
    ccpuLocais,
    habiteSeLocais,
    pasJuridicoLocais,
    solicitacoesLabLocais,
  };
}
