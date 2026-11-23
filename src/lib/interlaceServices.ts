import {
  AlvaraSanitarioItem,
  AmostraLaboratorioItem,
  FiscalizacaoItem,
  HabiteSeRegistroItem,
  PasJuridicoItem,
  PastaVisaItem,
  ProcessoItem,
  SolicitacaoLaudoPotabilidadeItem,
  TramitacaoItem,
  UserProfile,
} from '../types';
import {
  cleanDoc,
  formatDoc,
  saveAlvaraUnificado,
  savePastaVisaEnhanced,
} from './pastaVisaService';
import { isColetaRealizada, isLaudoAssinado } from './potabilidadeService';
import { isSupabaseConfigured, supabase } from './supabase';

const HABITE_SE_LOCAL_KEY = 'visa_habite_se_registros';
const PAS_LOCAL_KEY = 'visa_pas_juridico';

function safeRead<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite<T>(key: string, items: T[], eventName: string): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(eventName));
  } catch (err) {
    console.warn(`Erro ao persistir ${key}:`, err);
  }
}

// ========================================================
// 1. HABITE-SE SANITÁRIO (VINCULADO À PASTA VISA)
// ========================================================
export function loadHabiteSeRegistros(): HabiteSeRegistroItem[] {
  return safeRead<HabiteSeRegistroItem>(HABITE_SE_LOCAL_KEY);
}

export async function syncHabiteSeFromSupabase(): Promise<HabiteSeRegistroItem[]> {
  const local = loadHabiteSeRegistros();
  if (!isSupabaseConfigured || !supabase) return local;
  try {
    const { data, error } = await supabase
      .from('habite_se_registros')
      .select('*')
      .order('criado_em', { ascending: false });
    if (error || !Array.isArray(data)) return local;
    const map = new Map<string, HabiteSeRegistroItem>();
    local.forEach((h) => map.set(h.id, h));
    data.forEach((r: any) => map.set(r.id, r as HabiteSeRegistroItem));
    const merged = Array.from(map.values());
    safeWrite(HABITE_SE_LOCAL_KEY, merged, 'visa_habite_se_updated');
    return merged;
  } catch {
    return local;
  }
}

export async function saveHabiteSeRegistro(item: HabiteSeRegistroItem): Promise<HabiteSeRegistroItem[]> {
  const current = loadHabiteSeRegistros();
  const idx = current.findIndex((x) => x.id === item.id || x.numero_protocolo === item.numero_protocolo);
  const next = idx >= 0 ? current.map((x, i) => (i === idx ? item : x)) : [item, ...current];
  safeWrite(HABITE_SE_LOCAL_KEY, next, 'visa_habite_se_updated');

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('habite_se_registros').upsert(item, { onConflict: 'numero_protocolo' });
    } catch {
      // Fallback local já garantido caso SQL ainda não tenha sido rodado
    }
  }
  return next;
}

// ========================================================
// 2. PAS JURÍDICO (VINCULADO À PASTA VISA)
// ========================================================
export function loadPasJuridico(): PasJuridicoItem[] {
  return safeRead<PasJuridicoItem>(PAS_LOCAL_KEY);
}

export async function syncPasFromSupabase(): Promise<PasJuridicoItem[]> {
  const local = loadPasJuridico();
  if (!isSupabaseConfigured || !supabase) return local;
  try {
    const { data, error } = await supabase
      .from('pas_juridico')
      .select('*')
      .order('criado_em', { ascending: false });
    if (error || !Array.isArray(data)) return local;
    const map = new Map<string, PasJuridicoItem>();
    local.forEach((p) => map.set(p.id, p));
    data.forEach((r: any) => map.set(r.id, r as PasJuridicoItem));
    const merged = Array.from(map.values());
    safeWrite(PAS_LOCAL_KEY, merged, 'visa_pas_updated');
    return merged;
  } catch {
    return local;
  }
}

export async function savePasJuridico(item: PasJuridicoItem): Promise<PasJuridicoItem[]> {
  const current = loadPasJuridico();
  const idx = current.findIndex((x) => x.id === item.id || x.numero_pas === item.numero_pas);
  const next = idx >= 0 ? current.map((x, i) => (i === idx ? item : x)) : [item, ...current];
  safeWrite(PAS_LOCAL_KEY, next, 'visa_pas_updated');

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('pas_juridico').upsert(item, { onConflict: 'numero_pas' });
    } catch {
      // Fallback local garantido
    }
  }
  return next;
}

export async function instaurarPasDeHistorico(params: {
  pasta: PastaVisaItem;
  processoOrigem?: ProcessoItem | null;
  fiscalizacaoOrigem?: FiscalizacaoItem | null;
  enquadramentoLegal: string;
  resumoFatos: string;
  valorMultaUfm?: string;
  currentUser: UserProfile | null;
}): Promise<{ pas: PasJuridicoItem; processoAtualizado?: ProcessoItem }> {
  const now = new Date();
  const limite = new Date(now);
  limite.setDate(limite.getDate() + 15);
  const year = now.getFullYear();
  const numeroPas = `PAS-${year}/${String(Math.floor(100 + Math.random() * 899))}`;
  const numeroPasta = params.pasta.numero_pasta || params.pasta.pasta;
  const limpo = cleanDoc(params.pasta.cpf_cnpj_limpo || params.pasta.cnpj_cpf);
  const fiscalNome =
    params.currentUser?.nome_completo ||
    params.processoOrigem?.fiscal_responsavel ||
    params.fiscalizacaoOrigem?.fiscalNome ||
    'Coordenação VISA';

  const pas: PasJuridicoItem = {
    id: `pas-${Date.now()}`,
    numero_pas: numeroPas,
    numero_pasta: numeroPasta,
    cpf_cnpj_limpo: limpo,
    cnpj_cpf: formatDoc(params.pasta.cnpj_cpf || limpo),
    razao_social: params.pasta.razao_social,
    processo_origem_id: params.processoOrigem?.id,
    processo_origem_protocolo: params.processoOrigem?.num_processo || params.fiscalizacaoOrigem?.protocolo,
    auto_infracao_origem: params.fiscalizacaoOrigem?.protocolo || params.processoOrigem?.num_processo,
    enquadramento_legal: params.enquadramentoLegal,
    resumo_fatos: params.resumoFatos,
    fiscal_autuante: fiscalNome,
    data_instauracao: now.toISOString().slice(0, 10),
    prazo_defesa_limite: limite.toISOString().slice(0, 10),
    status: 'AGUARDANDO DEFESA',
    valor_multa_ufm: params.valorMultaUfm || '',
    criado_em: now.toISOString(),
    atualizado_em: now.toISOString(),
  };

  await savePasJuridico(pas);

  let processoAtualizado: ProcessoItem | undefined;
  if (params.processoOrigem) {
    const tram: TramitacaoItem = {
      id: `tram-pas-${Date.now()}`,
      data_hora: now.toISOString(),
      tipo: 'AUTO_INFRACAO',
      titulo: `Instaurado ${numeroPas} (Prazo de defesa: 15 dias)`,
      descricao: `${params.enquadramentoLegal} · ${params.resumoFatos}`,
      responsavel_nome: fiscalNome,
      responsavel_cargo: params.currentUser?.cargo || 'Auditor Fiscal',
      prazo_dias: 15,
      prazo_data_limite: pas.prazo_defesa_limite,
      status_processo_momento: 'NOTIFICADO',
    };
    processoAtualizado = {
      ...params.processoOrigem,
      pas: numeroPas,
      status: 'NOTIFICADO',
      tramitacoes: [tram, ...(params.processoOrigem.tramitacoes || [])],
    };
  }

  return { pas, processoAtualizado };
}

// ========================================================
// 3. PASSO 6 — EMISSÃO DE ALVARÁ A PARTIR DE PARECER DEFERIDO
// ========================================================
export async function gerarAlvaraDeProcessoDeferido(params: {
  processo: ProcessoItem;
  pasta: PastaVisaItem;
  validade: string;
  condicionantes?: string;
  currentUser: UserProfile | null;
}): Promise<{ alvara: AlvaraSanitarioItem; pastaAtualizada: PastaVisaItem; processoAtualizado: ProcessoItem }> {
  const now = new Date();
  const year = String(now.getFullYear());
  const numeroPasta = params.pasta.numero_pasta || params.pasta.pasta;
  const limpo = cleanDoc(params.pasta.cpf_cnpj_limpo || params.pasta.cnpj_cpf || params.processo.cnpj_cpf);
  const seqNum = `ALV-${year}/${String(Math.floor(1000 + Math.random() * 8999))}`;
  const authCode = `DVIS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const emissor = params.currentUser?.nome_completo || params.processo.fiscal_responsavel || 'Coordenação VISA';

  const alvara: AlvaraSanitarioItem = {
    id: `alv-${Date.now()}`,
    numero_alvara: seqNum,
    ano_exercicio: year,
    tipo_alvara: (params.processo.assunto || '').toUpperCase().includes('RENOV') ? 'RENOVAÇÃO' : 'INICIAL',
    pasta: numeroPasta,
    numero_pasta: numeroPasta,
    cpf_cnpj_limpo: limpo,
    cnpj_cpf: formatDoc(params.pasta.cnpj_cpf || params.processo.cnpj_cpf),
    razao_social: params.pasta.razao_social || params.processo.razao_social,
    nome_fantasia: params.processo.nome_fantasia || params.pasta.razao_social,
    endereco: params.processo.endereco || params.pasta.endereco || 'Balneário Camboriú',
    numero: 'S/N',
    bairro: params.processo.bairro || params.pasta.bairro || 'Centro',
    municipio: 'Balneário Camboriú',
    cnae_principal: params.processo.cnae || params.processo.cnaes?.[0] || params.pasta.cnae_principal || 'Atividade Regulada',
    cnaes_secundarios: params.processo.cnaes || [],
    validade: params.validade,
    data_emissao: now.toISOString().slice(0, 10),
    status: 'ATIVO',
    setor: params.processo.setor || params.pasta.setor || 'VIGILÂNCIA SANITÁRIA',
    condicionantes: params.condicionantes || '',
    fiscal_emissor: emissor,
    matricula_fiscal: params.currentUser?.matricula || '',
    codigo_autenticacao: authCode,
    assinatura_digital: `Emitido e validado administrativamente por ${emissor} em ${now.toLocaleString('pt-BR')}`,
    assinado_por: emissor,
    assinado_em: now.toISOString(),
    grau_risco: params.processo.grau_risco || params.pasta.grau_risco || 'MÉDIO RISCO',
    criado_em: now.toISOString(),
    atualizado_em: now.toISOString(),
  };

  await saveAlvaraUnificado(alvara);

  const pastaAtualizada: PastaVisaItem = {
    ...params.pasta,
    alvara_atualizado: 'SIM',
    atualizado_em: now.toISOString(),
  };
  await savePastaVisaEnhanced(pastaAtualizada);

  const tram: TramitacaoItem = {
    id: `tram-alv-${Date.now()}`,
    data_hora: now.toISOString(),
    tipo: 'DEFERIMENTO_ALVARA',
    titulo: `Alvará Sanitário ${seqNum} emitido na Pasta ${numeroPasta}`,
    descricao: `Validade até ${params.validade.split('-').reverse().join('/')}. Autenticidade: ${authCode}.`,
    responsavel_nome: emissor,
    responsavel_cargo: params.currentUser?.cargo || 'Auditor Fiscal',
    status_processo_momento: 'DEFERIDO',
    documento_relacionado: { tipo: 'ALVARÁ SANITÁRIO', auth_code: authCode },
  };

  const processoAtualizado: ProcessoItem = {
    ...params.processo,
    status: 'DEFERIDO',
    pasta: numeroPasta,
    numero_pasta: numeroPasta,
    cpf_cnpj_limpo: limpo,
    validade: params.validade,
    venc_licenca: params.validade,
    tramitacoes: [tram, ...(params.processo.tramitacoes || [])],
  };

  return { alvara, pastaAtualizada, processoAtualizado };
}

// ========================================================
// 4. PASSO 5 — ESPELHAMENTO AUTOMÁTICO DE DADOS DO LABORATÓRIO NA PASTA
//    (Sem alterar nenhuma tela/janela do Laboratório)
// ========================================================
export interface LabPastaLinkedRecords {
  solicitacoes: SolicitacaoLaudoPotabilidadeItem[];
  amostras: AmostraLaboratorioItem[];
  insatisfatoriasCount: number;
  laudosEmitidosCount: number;
  aguardandoCount: number;
}

export function getLabRecordsForPasta(
  pasta: PastaVisaItem,
  amostras: AmostraLaboratorioItem[],
  solicitacoes: SolicitacaoLaudoPotabilidadeItem[],
  processosDaPasta: ProcessoItem[]
): LabPastaLinkedRecords {
  const limpo = cleanDoc(pasta.cpf_cnpj_limpo || pasta.cnpj_cpf);
  const razaoNorm = (pasta.razao_social || '').trim().toLowerCase();
  const protocolos = new Set(
    processosDaPasta.map((p) => (p.num_processo || '').trim().toLowerCase()).filter(Boolean)
  );

  const matchedSols = solicitacoes.filter((s) => {
    const sDoc = cleanDoc(s.cnpj_cpf);
    const sProt = (s.protocolo_1doc || '').trim().toLowerCase();
    const sRazao = (s.razao_social || '').trim().toLowerCase();
    return (
      (limpo && sDoc === limpo) ||
      (sProt && protocolos.has(sProt)) ||
      (razaoNorm && sRazao && sRazao === razaoNorm)
    );
  });

  const matchedAmostras = amostras.filter((a) => {
    const aDoc = cleanDoc(a.cnpj_cpf);
    const aProt = (a.protocolo || '').trim().toLowerCase();
    const aInt = (a.interessado || a.estabelecimento || '').trim().toLowerCase();
    return (
      (limpo && aDoc === limpo) ||
      (aProt && protocolos.has(aProt)) ||
      (razaoNorm && aInt && (aInt.includes(razaoNorm) || razaoNorm.includes(aInt)))
    );
  });

  const insatisfatoriasCount = matchedAmostras.filter(
    (a) => a.status === 'NÃO CONFORME' || a.status === 'NAO_CONFORME' || a.status === 'INTERDITADO'
  ).length;

  const laudosEmitidosCount =
    matchedAmostras.filter((a) => isLaudoAssinado(a, undefined)).length +
    matchedSols.filter((s) => isLaudoAssinado(undefined, s) && !matchedAmostras.some((a) => a.protocolo === s.protocolo_1doc)).length;

  const aguardandoCount =
    matchedAmostras.filter((a) => !isLaudoAssinado(a, undefined) && (isColetaRealizada(a, undefined) || a.status.includes('AGUARDANDO') || a.status === 'EM ANÁLISE')).length +
    matchedSols.filter((s) => s.status_solicitacao !== 'LAUDO EMITIDO' && s.status_solicitacao !== 'CANCELADO' && s.status_solicitacao !== 'INDEFERIDO').length;

  return {
    solicitacoes: matchedSols,
    amostras: matchedAmostras,
    insatisfatoriasCount,
    laudosEmitidosCount,
    aguardandoCount,
  };
}

// ========================================================
// 5. PASSO 8 — SEMÁFORO DA PASTA VISA (VERDE / AMARELO / VERMELHO)
// ========================================================
export interface PastaSemaforoResult {
  nivel: 'VERDE' | 'AMARELO' | 'VERMELHO';
  label: string;
  motivos: string[];
}

export function computePastaSemaforo(params: {
  pasta: PastaVisaItem;
  processos: ProcessoItem[];
  alvaras: AlvaraSanitarioItem[];
  fiscalizacoes: FiscalizacaoItem[];
  lab: LabPastaLinkedRecords;
  pasList: PasJuridicoItem[];
}): PastaSemaforoResult {
  const motivos: string[] = [];
  let red = false;
  let yellow = false;

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const interditada = params.fiscalizacoes.some((f) => f.status === 'INTERDITADO');
  if (interditada) {
    red = true;
    motivos.push('Interdição ativa registrada');
  }

  if (params.lab.insatisfatoriasCount > 0) {
    red = true;
    motivos.push(`${params.lab.insatisfatoriasCount} amostra(s) laboratorial(is) não conforme(s)`);
  }

  const pasAtivos = params.pasList.filter((p) => p.status !== 'ARQUIVADO');
  if (pasAtivos.length > 0) {
    red = true;
    motivos.push(`${pasAtivos.length} PAS em andamento`);
  }

  const notificacoes = params.processos.filter((p) => p.status === 'NOTIFICADO' || p.status === 'PENDENTE DOCS');
  const vencidos = params.processos.filter((p) => {
    if (p.status === 'DEFERIDO' || p.status === 'INDEFERIDO') return false;
    const raw = p.prazo_vistoria || p.venc_1doc || p.agendado_para;
    if (!raw) return false;
    const d = new Date(raw.slice(0, 10) + 'T12:00:00');
    return !isNaN(d.getTime()) && d < today;
  });

  if (vencidos.length > 0) {
    red = true;
    motivos.push(`${vencidos.length} prazo(s) processual(is) vencido(s)`);
  } else if (notificacoes.length > 0) {
    yellow = true;
    motivos.push(`${notificacoes.length} exigência/notificação pendente`);
  }

  const alvarasVencidos = params.alvaras.filter((a) => {
    if (a.status === 'VENCIDO') return true;
    if (!a.validade) return false;
    const d = new Date(a.validade.slice(0, 10) + 'T12:00:00');
    return !isNaN(d.getTime()) && d < today;
  });
  const alvaras30d = params.alvaras.filter((a) => {
    if (!a.validade || a.status === 'VENCIDO') return false;
    const d = new Date(a.validade.slice(0, 10) + 'T12:00:00');
    if (isNaN(d.getTime())) return false;
    const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 30;
  });

  if (alvarasVencidos.length > 0) {
    red = true;
    motivos.push('Alvará sanitário vencido');
  } else if (alvaras30d.length > 0) {
    yellow = true;
    motivos.push('Alvará vencendo em até 30 dias');
  } else if (params.alvaras.length === 0 && params.pasta.alvara_atualizado !== 'SIM') {
    yellow = true;
    motivos.push('Sem alvará vigente vinculado');
  }

  if (params.lab.aguardandoCount > 0) {
    yellow = true;
    motivos.push(`${params.lab.aguardandoCount} análise(s) em andamento no Laboratório`);
  }

  if (red) {
    return { nivel: 'VERMELHO', label: 'Crítico', motivos };
  }
  if (yellow) {
    return { nivel: 'AMARELO', label: 'Atenção', motivos };
  }
  return {
    nivel: 'VERDE',
    label: 'Regular',
    motivos: ['Documentação e situação sanitária regulares'],
  };
}
