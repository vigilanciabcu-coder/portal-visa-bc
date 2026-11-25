import {
  AlvaraSanitarioItem,
  FeiranteItem,
  FiscalizacaoItem,
  PastaVisaItem,
  ProcessoItem,
} from '../types';
import { fetchCnpj } from './cnpjService';
import { isSupabaseConfigured, supabase } from './supabase';
import {
  fetchAlvarasFromSupabase,
  fetchPastasVisaFromSupabase,
  saveAlvaraToSupabase,
  saveManyPastasVisaToSupabase,
  savePastaVisaToSupabase,
} from './supabaseService';

export const PASTAS_PRIMARY_KEY = 'pasta_visa_itens';
export const PASTAS_LEGACY_KEY = 'visa_pastas_administrativo';
export const ALVARAS_PRIMARY_KEY = 'visa_alvaras';
export const ALVARAS_LEGACY_KEY = 'visa_alvaras_cadastrados';
export const PASTA_SEQ_LOCAL_KEY = 'visa_pasta_seq_6d_counter';

export function cleanDoc(raw?: string | null): string {
  return String(raw || '').replace(/\D/g, '');
}

export function normalizeFuzzySearch(raw?: string | null): string {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function matchesFuzzySearch(
  queryRaw: string,
  fields: (string | undefined | null)[]
): boolean {
  const qCompact = normalizeFuzzySearch(queryRaw);
  if (!qCompact) return true;
  const normFields = fields.map((f) => normalizeFuzzySearch(f)).filter(Boolean);
  if (normFields.length === 0) return false;
  if (normFields.some((f) => f.includes(qCompact))) return true;
  const tokens = queryRaw
    .trim()
    .split(/\s+/)
    .map((t) => normalizeFuzzySearch(t))
    .filter(Boolean);
  if (tokens.length > 1) {
    return tokens.every((tok) => normFields.some((f) => f.includes(tok)));
  }
  return false;
}

export function isValidDocLength(raw?: string | null): boolean {
  const digits = cleanDoc(raw);
  return digits.length === 11 || digits.length === 14;
}

export function formatDoc(raw?: string | null): string {
  const d = cleanDoc(raw);
  if (d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
  }
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
  }
  return String(raw || '').trim();
}

export function isSixDigitPastaCode(code?: string | null): boolean {
  return /^\d{6}$/.test(String(code || '').trim());
}

export function getDisplayPastaNumero(item?: { numero_pasta?: string; pasta?: string } | null): string {
  if (!item) return '';
  return String(item.numero_pasta || item.pasta || '').trim();
}

function safeParseArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizePastaItem(raw: PastaVisaItem): PastaVisaItem {
  const limpo = cleanDoc(raw.cpf_cnpj_limpo || raw.cnpj_cpf);
  const numero = String(raw.numero_pasta || raw.pasta || '').trim();
  const origem: 'FISICA_EXISTENTE' | 'DIGITAL_6_DIGITOS' =
    raw.origem_numeracao ||
    (isSixDigitPastaCode(numero) ? 'DIGITAL_6_DIGITOS' : 'FISICA_EXISTENTE');

  return {
    ...raw,
    cnpj_cpf: formatDoc(raw.cnpj_cpf || limpo) || raw.cnpj_cpf || '',
    cpf_cnpj_limpo: limpo || undefined,
    pasta: numero,
    numero_pasta: numero,
    pasta_referencia_anterior: raw.pasta_referencia_anterior || (!isSixDigitPastaCode(numero) ? numero : undefined),
    origem_numeracao: origem,
  };
}

/**
 * Unifica as duas chaves legadas de armazenamento local de Pastas VISA
 * (pasta_visa_itens e visa_pastas_administrativo) em uma única fonte consistente.
 */
export function loadAllPastasUnificadas(): PastaVisaItem[] {
  const a = safeParseArray<PastaVisaItem>(PASTAS_PRIMARY_KEY);
  const b = safeParseArray<PastaVisaItem>(PASTAS_LEGACY_KEY);

  const byDoc = new Map<string, PastaVisaItem>();
  const withoutDoc: PastaVisaItem[] = [];

  const mergeIn = (item: PastaVisaItem) => {
    const norm = normalizePastaItem(item);
    const limpo = norm.cpf_cnpj_limpo || '';
    if (!limpo) {
      if (!withoutDoc.some((x) => x.id === norm.id)) {
        withoutDoc.push(norm);
      }
      return;
    }
    const existing = byDoc.get(limpo);
    if (!existing) {
      byDoc.set(limpo, norm);
    } else {
      // Preserva código físico existente se um dos registros possuir pasta física
      const preferExistingNum =
        existing.origem_numeracao === 'FISICA_EXISTENTE' && existing.numero_pasta
          ? existing.numero_pasta
          : norm.origem_numeracao === 'FISICA_EXISTENTE' && norm.numero_pasta
          ? norm.numero_pasta
          : existing.numero_pasta || norm.numero_pasta;

      const mergedOrigem: 'FISICA_EXISTENTE' | 'DIGITAL_6_DIGITOS' =
        preferExistingNum && !isSixDigitPastaCode(preferExistingNum)
          ? 'FISICA_EXISTENTE'
          : existing.origem_numeracao || norm.origem_numeracao || 'DIGITAL_6_DIGITOS';

      byDoc.set(limpo, {
        ...existing,
        ...norm,
        id: existing.id || norm.id,
        pasta: preferExistingNum || existing.pasta || norm.pasta,
        numero_pasta: preferExistingNum || existing.numero_pasta || norm.numero_pasta,
        pasta_referencia_anterior:
          existing.pasta_referencia_anterior || norm.pasta_referencia_anterior,
        origem_numeracao: mergedOrigem,
        razao_social: norm.razao_social || existing.razao_social,
        observacoes: norm.observacoes || existing.observacoes,
      });
    }
  };

  b.forEach(mergeIn);
  a.forEach(mergeIn);

  return [...Array.from(byDoc.values()), ...withoutDoc];
}

export function savePastasUnificadas(list: PastaVisaItem[]): PastaVisaItem[] {
  const normalized = list.map(normalizePastaItem);
  try {
    const json = JSON.stringify(normalized);
    localStorage.setItem(PASTAS_PRIMARY_KEY, json);
    localStorage.setItem(PASTAS_LEGACY_KEY, json);
    window.dispatchEvent(new CustomEvent('visa_pasta_updated'));
  } catch (err) {
    console.warn('Falha ao gravar cache unificado de Pastas VISA:', err);
  }
  return normalized;
}

export async function syncPastasFromSupabaseUnificadas(): Promise<PastaVisaItem[]> {
  const local = loadAllPastasUnificadas();
  const remote = await fetchPastasVisaFromSupabase();
  if (!remote || remote.length === 0) {
    return local;
  }

  const byDoc = new Map<string, PastaVisaItem>();
  const extra: PastaVisaItem[] = [];

  const put = (raw: PastaVisaItem) => {
    const item = normalizePastaItem(raw);
    const limpo = item.cpf_cnpj_limpo || '';
    if (!limpo) {
      if (!extra.some((e) => e.id === item.id)) extra.push(item);
      return;
    }
    const prev = byDoc.get(limpo);
    if (!prev) {
      byDoc.set(limpo, item);
    } else {
      const num =
        prev.origem_numeracao === 'FISICA_EXISTENTE' && prev.numero_pasta
          ? prev.numero_pasta
          : item.numero_pasta || prev.numero_pasta;
      byDoc.set(limpo, {
        ...prev,
        ...item,
        pasta: num,
        numero_pasta: num,
        origem_numeracao:
          num && !isSixDigitPastaCode(num) ? 'FISICA_EXISTENTE' : item.origem_numeracao || prev.origem_numeracao,
      });
    }
  };

  local.forEach(put);
  remote.forEach(put);

  return savePastasUnificadas([...Array.from(byDoc.values()), ...extra]);
}

/**
 * Unifica armazenamento local de Alvarás Sanitários entre as chaves legadas.
 */
export function loadAllAlvarasUnificados(): AlvaraSanitarioItem[] {
  const a = safeParseArray<AlvaraSanitarioItem>(ALVARAS_PRIMARY_KEY);
  const b = safeParseArray<AlvaraSanitarioItem>(ALVARAS_LEGACY_KEY);
  const map = new Map<string, AlvaraSanitarioItem>();
  [...b, ...a].forEach((alv) => {
    if (!alv || !alv.id) return;
    const limpo = cleanDoc(alv.cpf_cnpj_limpo || alv.cnpj_cpf);
    map.set(alv.id, {
      ...alv,
      cpf_cnpj_limpo: limpo || undefined,
      numero_pasta: alv.numero_pasta || alv.pasta || undefined,
    });
  });
  return Array.from(map.values());
}

export function saveAlvarasUnificados(list: AlvaraSanitarioItem[]): AlvaraSanitarioItem[] {
  try {
    const json = JSON.stringify(list);
    localStorage.setItem(ALVARAS_PRIMARY_KEY, json);
    localStorage.setItem(ALVARAS_LEGACY_KEY, json);
    window.dispatchEvent(new CustomEvent('visa_alvara_updated'));
  } catch (err) {
    console.warn('Falha ao gravar cache unificado de Alvarás:', err);
  }
  return list;
}

export async function syncAlvarasFromSupabaseUnificados(): Promise<AlvaraSanitarioItem[]> {
  const local = loadAllAlvarasUnificados();
  const remote = await fetchAlvarasFromSupabase();
  if (!remote || remote.length === 0) return local;

  const map = new Map<string, AlvaraSanitarioItem>();
  local.forEach((a) => map.set(a.id, a));
  remote.forEach((r) =>
    map.set(r.id, {
      ...r,
      cpf_cnpj_limpo: cleanDoc(r.cnpj_cpf) || undefined,
      numero_pasta: r.pasta || undefined,
    })
  );
  return saveAlvarasUnificados(Array.from(map.values()));
}

export async function saveAlvaraUnificado(alvara: AlvaraSanitarioItem): Promise<AlvaraSanitarioItem[]> {
  const limpo = cleanDoc(alvara.cpf_cnpj_limpo || alvara.cnpj_cpf);
  const enriched: AlvaraSanitarioItem = {
    ...alvara,
    cpf_cnpj_limpo: limpo || undefined,
    numero_pasta: alvara.numero_pasta || alvara.pasta || '',
    pasta: alvara.pasta || alvara.numero_pasta || '',
  };
  const current = loadAllAlvarasUnificados();
  const idx = current.findIndex((x) => x.id === enriched.id);
  const updated = idx >= 0
    ? current.map((x, i) => (i === idx ? enriched : x))
    : [enriched, ...current];
  saveAlvarasUnificados(updated);
  await saveAlvaraToSupabase(enriched);
  return updated;
}

/**
 * Gera o próximo código sequencial de 6 dígitos (000001, 000002, ...)
 * evitando colisão com qualquer pasta já cadastrada (física ou digital).
 */
export async function gerarProximoNumeroPasta6Digitos(pastasExistentes?: PastaVisaItem[]): Promise<string> {
  const list = pastasExistentes || loadAllPastasUnificadas();
  const used = new Set<string>();
  let maxNumeric = 0;

  list.forEach((p) => {
    const n1 = String(p.numero_pasta || '').trim();
    const n2 = String(p.pasta || '').trim();
    if (n1) used.add(n1);
    if (n2) used.add(n2);
    [n1, n2].forEach((val) => {
      if (/^\d{6}$/.test(val)) {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed > maxNumeric) maxNumeric = parsed;
      }
    });
  });

  // 1. Tenta função atômica no Supabase se configurada
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc('gerar_proximo_numero_pasta_6d');
      if (!error && typeof data === 'string' && /^\d{6}$/.test(data) && !used.has(data)) {
        const numVal = parseInt(data, 10);
        try {
          localStorage.setItem(PASTA_SEQ_LOCAL_KEY, String(numVal));
        } catch {}
        return data;
      }
    } catch {
      // Fallback local caso o SQL ainda não tenha sido executado no Supabase
    }
  }

  // 2. Fallback local seguro e sem colisões
  let localCounter = 0;
  try {
    localCounter = parseInt(localStorage.getItem(PASTA_SEQ_LOCAL_KEY) || '0', 10) || 0;
  } catch {
    localCounter = 0;
  }

  let next = Math.max(maxNumeric, localCounter) + 1;
  let candidate = String(next).padStart(6, '0');
  while (used.has(candidate)) {
    next += 1;
    candidate = String(next).padStart(6, '0');
  }
  try {
    localStorage.setItem(PASTA_SEQ_LOCAL_KEY, String(next));
  } catch {}
  return candidate;
}

export interface DadosCriacaoPasta {
  razao_social?: string;
  setor?: string;
  status_rf?: string;
  alvara_atualizado?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  bairro?: string;
  cnae_principal?: string;
  grau_risco?: string;
  observacoes?: string;
  criado_por?: string;
  /** Se informado explicitamente ao importar arquivo físico legado, preserva o código físico */
  pasta_fisica_informada?: string;
  /** Se true (padrão), consulta CNPJ na Receita Federal quando for CNPJ novo sem razão social */
  buscarReceita?: boolean;
}

/**
 * OPÇÃO A (HÍBRIDA — RECOMENDADA):
 * - 1 CPF ou CNPJ = 1 Pasta VISA única.
 * - Se já existe pasta física para aquele CPF/CNPJ (ex.: 1042/2024), retorna e preserva o número físico!
 * - Se for CPF/CNPJ novo sem pasta física, gera automaticamente o próximo código sequencial de 6 dígitos (000001...).
 */
export async function obterOuCriarPastaPorCpfCnpj(
  cpfCnpjRaw: string,
  dadosBase: DadosCriacaoPasta = {}
): Promise<{ pasta: PastaVisaItem; criadaAgora: boolean }> {
  const limpo = cleanDoc(cpfCnpjRaw);
  const currentList = loadAllPastasUnificadas();

  // Busca por CPF/CNPJ limpo exato
  if (limpo) {
    const existing = currentList.find((p) => cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === limpo);
    if (existing) {
      // Atualiza dados complementares se estiverem vazios, sem jamais alterar o número preservado!
      let changed = false;
      const merged: PastaVisaItem = { ...existing };
      if (!merged.razao_social && dadosBase.razao_social) {
        merged.razao_social = dadosBase.razao_social;
        changed = true;
      }
      if (!merged.endereco && dadosBase.endereco) {
        merged.endereco = dadosBase.endereco;
        changed = true;
      }
      if (!merged.bairro && dadosBase.bairro) {
        merged.bairro = dadosBase.bairro;
        changed = true;
      }
      if (!merged.cnae_principal && dadosBase.cnae_principal) {
        merged.cnae_principal = dadosBase.cnae_principal;
        changed = true;
      }
      if (changed) {
        merged.atualizado_em = new Date().toISOString();
        const nextList = currentList.map((x) => (x.id === merged.id ? merged : x));
        savePastasUnificadas(nextList);
        void savePastaVisaEnhanced(merged);
      }
      return { pasta: merged, criadaAgora: false };
    }
  }

  // Novo contribuinte: opcionalmente enriquece via Receita Federal se CNPJ 14 dígitos
  let razao = (dadosBase.razao_social || '').trim();
  let statusRf = dadosBase.status_rf || 'ATIVA';
  let endereco = dadosBase.endereco || '';
  let bairro = dadosBase.bairro || '';
  let telefone = dadosBase.telefone || '';
  let email = dadosBase.email || '';
  let cnae = dadosBase.cnae_principal || '';
  let grauRisco = dadosBase.grau_risco || '';

  if (limpo.length === 14 && (!razao || dadosBase.buscarReceita !== false)) {
    try {
      const rf = await fetchCnpj(limpo);
      if (rf && rf.razao) {
        if (!razao) razao = rf.razao;
        statusRf = rf.situacao_cadastral || rf.situacao || statusRf;
        if (!endereco) endereco = `${rf.rua_api || ''} ${rf.num_api ? `, ${rf.num_api}` : ''}`.trim();
        if (!bairro) bairro = rf.bairro || '';
        if (!telefone) telefone = rf.telefone || '';
        if (!email) email = rf.email || '';
        if (!cnae) cnae = rf.cnaes?.[0] || rf.cnae || '';
        if (!grauRisco) grauRisco = rf.risco ? `${rf.risco} RISCO` : '';
      }
    } catch {
      // Segue normalmente com os dados preenchidos
    }
  }

  const fisicaInformada = (dadosBase.pasta_fisica_informada || '').trim();
  const numeroPasta = fisicaInformada || (await gerarProximoNumeroPasta6Digitos(currentList));
  const origem: 'FISICA_EXISTENTE' | 'DIGITAL_6_DIGITOS' =
    fisicaInformada && !isSixDigitPastaCode(fisicaInformada)
      ? 'FISICA_EXISTENTE'
      : 'DIGITAL_6_DIGITOS';

  const nowIso = new Date().toISOString();
  const novaPasta: PastaVisaItem = {
    id: `pasta-${limpo || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    cnpj_cpf: formatDoc(limpo || cpfCnpjRaw),
    cpf_cnpj_limpo: limpo || undefined,
    pasta: numeroPasta,
    numero_pasta: numeroPasta,
    pasta_referencia_anterior: origem === 'FISICA_EXISTENTE' ? numeroPasta : undefined,
    origem_numeracao: origem,
    razao_social: razao || (limpo.length === 11 ? `CONTRIBUINTE CPF ${formatDoc(limpo)}` : `EMPRESA ${formatDoc(limpo)}`),
    status_rf: statusRf,
    alvara_atualizado: dadosBase.alvara_atualizado || 'NÃO',
    setor: dadosBase.setor || 'VIGILÂNCIA SANITÁRIA',
    telefone,
    email,
    endereco,
    bairro,
    cnae_principal: cnae,
    grau_risco: grauRisco,
    observacoes: dadosBase.observacoes || '',
    criado_por: dadosBase.criado_por || 'Sistema VISA-BC',
    criado_em: nowIso,
    atualizado_em: nowIso,
  };

  savePastasUnificadas([novaPasta, ...currentList]);
  await savePastaVisaEnhanced(novaPasta);

  return { pasta: novaPasta, criadaAgora: true };
}

export async function savePastaVisaEnhanced(pasta: PastaVisaItem): Promise<boolean> {
  const norm = normalizePastaItem(pasta);
  // Atualiza cache local primeiro
  const list = loadAllPastasUnificadas();
  const idx = list.findIndex(
    (x) =>
      x.id === norm.id ||
      (norm.cpf_cnpj_limpo && cleanDoc(x.cpf_cnpj_limpo || x.cnpj_cpf) === norm.cpf_cnpj_limpo)
  );
  const next = idx >= 0 ? list.map((x, i) => (i === idx ? norm : x)) : [norm, ...list];
  savePastasUnificadas(next);

  // Tenta salvar no Supabase com colunas estendidas; faz fallback automático para schema legado
  if (isSupabaseConfigured && supabase) {
    try {
      const extendedPayload = {
        id: norm.id,
        cnpj_cpf: norm.cnpj_cpf,
        cpf_cnpj_limpo: norm.cpf_cnpj_limpo || null,
        pasta: norm.pasta,
        numero_pasta: norm.numero_pasta || norm.pasta,
        pasta_referencia_anterior: norm.pasta_referencia_anterior || null,
        origem_numeracao: norm.origem_numeracao || 'DIGITAL_6_DIGITOS',
        razao_social: norm.razao_social,
        status_rf: norm.status_rf,
        alvara_atualizado: norm.alvara_atualizado,
        setor: norm.setor,
        telefone: norm.telefone || null,
        email: norm.email || null,
        endereco: norm.endereco || null,
        bairro: norm.bairro || null,
        cnae_principal: norm.cnae_principal || null,
        grau_risco: norm.grau_risco || null,
        observacoes: norm.observacoes || '',
        criado_por: norm.criado_por || '',
        atualizado_em: new Date().toISOString(),
      };
      const { error } = await supabase.from('pastas_visa').upsert(extendedPayload, { onConflict: 'id' });
      if (!error) return true;
    } catch {}
  }

  const res = await savePastaVisaToSupabase(norm);
  return res.success;
}

/**
 * PASSO 3 — Verifica antes da distribuição pela Diretoria se a Pasta já possui
 * demanda ou notificação em aberto com algum fiscal específico.
 */
export interface PendenciaPastaTriage {
  possuiPendencia: boolean;
  fiscalSugerido?: string;
  motivo: string;
  processosAbertos: ProcessoItem[];
  notificacoesAbertas: FiscalizacaoItem[];
}

export function verificarPendenciasAbertasNaPasta(
  processoAlvo: ProcessoItem,
  todosProcessos: ProcessoItem[],
  fiscalizacoes: FiscalizacaoItem[]
): PendenciaPastaTriage {
  const limpo = cleanDoc(processoAlvo.cpf_cnpj_limpo || processoAlvo.cnpj_cpf);
  const pastaNum = String(processoAlvo.numero_pasta || processoAlvo.pasta || '').trim();

  const processosAbertos = todosProcessos.filter((p) => {
    if (p.id === processoAlvo.id) return false;
    if (p.status === 'DEFERIDO' || p.status === 'INDEFERIDO') return false;
    const pLimpo = cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf);
    const pPasta = String(p.numero_pasta || p.pasta || '').trim();
    return (limpo && pLimpo === limpo) || (pastaNum && pPasta === pastaNum);
  });

  const notificacoesAbertas = fiscalizacoes.filter((f) => {
    if (f.status !== 'NOTIFICADO' && f.status !== 'INTERDITADO' && f.status !== 'EM_ANDAMENTO') return false;
    const fLimpo = cleanDoc(f.cpf_cnpj_limpo || f.estabelecimento?.cnpjCpf);
    const fPasta = String(f.numero_pasta || '').trim();
    return (limpo && fLimpo === limpo) || (pastaNum && fPasta === pastaNum);
  });

  const fiscalCandidato =
    processosAbertos.find((p) => p.fiscal_responsavel && !p.fiscal_responsavel.toLowerCase().includes('aguardando'))?.fiscal_responsavel ||
    notificacoesAbertas.find((f) => f.fiscalNome)?.fiscalNome;

  if (processosAbertos.length > 0 || notificacoesAbertas.length > 0) {
    const parts: string[] = [];
    if (processosAbertos.length > 0) parts.push(`${processosAbertos.length} processo(s) ativo(s)`);
    if (notificacoesAbertas.length > 0) parts.push(`${notificacoesAbertas.length} notificação/vistoria aberta(s)`);
    return {
      possuiPendencia: true,
      fiscalSugerido: fiscalCandidato,
      motivo: parts.join(' e '),
      processosAbertos,
      notificacoesAbertas,
    };
  }

  return {
    possuiPendencia: false,
    motivo: '',
    processosAbertos: [],
    notificacoesAbertas: [],
  };
}

/**
 * PASSO 9 — Consolidação de Base Legada (Opção A Híbrida):
 * Agrupa processos, alvarás, fiscalizações e feiras pelo CPF/CNPJ limpo.
 * - Preserva 100% os números de pastas físicas já existentes.
 * - Cria pasta digital de 6 dígitos apenas para CPFs/CNPJs sem pasta física prévia.
 * - Retorna relatório detalhado com registros vinculados e itens sem documento para saneamento.
 */
export interface ConsolidacaoRelatorio {
  executadoEm: string;
  totalPastasFinais: number;
  preservadasFisicas: number;
  geradas6Digitos: number;
  processosVinculados: number;
  alvarasVinculados: number;
  feirantesVinculados: number;
  registrosSemDocumento: { tipo: string; identificador: string; nome: string }[];
  processosAtualizados: ProcessoItem[];
  alvarasAtualizados: AlvaraSanitarioItem[];
  pastasAtualizadas: PastaVisaItem[];
}

export async function executarConsolidacaoLegadoHibrida(
  processos: ProcessoItem[],
  fiscalizacoes: FiscalizacaoItem[],
  feiras: FeiranteItem[]
): Promise<ConsolidacaoRelatorio> {
  const pastas = loadAllPastasUnificadas();
  const alvaras = loadAllAlvarasUnificados();

  const pastasMap = new Map<string, PastaVisaItem>();
  pastas.forEach((p) => {
    const limpo = cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf);
    if (limpo) pastasMap.set(limpo, normalizePastaItem(p));
  });

  // Se existir processo/alvará/feira com pasta física informada e CPF/CNPJ sem pasta ainda, preserva o código físico!
  const semDocumento: { tipo: string; identificador: string; nome: string }[] = [];
  let preservadasFisicas = 0;
  let geradas6Digitos = 0;

  const ensureFolderForRecord = async (
    docRaw: string | undefined,
    pastaExistenteNoReg: string | undefined,
    meta: { razao?: string; setor?: string; bairro?: string; endereco?: string }
  ): Promise<string | null> => {
    const limpo = cleanDoc(docRaw);
    if (!isValidDocLength(limpo)) {
      return null;
    }

    const existing = pastasMap.get(limpo);
    if (existing) {
      return existing.numero_pasta || existing.pasta;
    }

    const codigoFisico = (pastaExistenteNoReg || '').trim();
    const usarFisica = Boolean(codigoFisico) && !isSixDigitPastaCode(codigoFisico);
    const allCurrent = Array.from(pastasMap.values());
    const numero = usarFisica ? codigoFisico : await gerarProximoNumeroPasta6Digitos(allCurrent);

    if (usarFisica) {
      preservadasFisicas += 1;
    } else {
      geradas6Digitos += 1;
    }

    const nova: PastaVisaItem = {
      id: `pasta-${limpo}`,
      cnpj_cpf: formatDoc(limpo),
      cpf_cnpj_limpo: limpo,
      pasta: numero,
      numero_pasta: numero,
      pasta_referencia_anterior: usarFisica ? codigoFisico : undefined,
      origem_numeracao: usarFisica ? 'FISICA_EXISTENTE' : 'DIGITAL_6_DIGITOS',
      razao_social: meta.razao || `CONTRIBUINTE ${formatDoc(limpo)}`,
      status_rf: 'ATIVA',
      alvara_atualizado: 'EM ANÁLISE',
      setor: meta.setor || 'VIGILÂNCIA SANITÁRIA',
      bairro: meta.bairro || '',
      endereco: meta.endereco || '',
      criado_por: 'Consolidação Híbrida (Opção A)',
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    };
    pastasMap.set(limpo, nova);
    return numero;
  };

  // Conta físicas já existentes inicialmente
  pastasMap.forEach((p) => {
    if (p.origem_numeracao === 'FISICA_EXISTENTE') preservadasFisicas += 1;
  });

  // 1. Alvarás
  const alvarasAtualizados: AlvaraSanitarioItem[] = [];
  let alvarasVinculados = 0;
  for (const alv of alvaras) {
    const num = await ensureFolderForRecord(alv.cnpj_cpf, alv.pasta, {
      razao: alv.razao_social,
      setor: alv.setor,
      bairro: alv.bairro,
      endereco: alv.endereco,
    });
    if (num) {
      alvarasVinculados += 1;
      alvarasAtualizados.push({
        ...alv,
        pasta: num,
        numero_pasta: num,
        cpf_cnpj_limpo: cleanDoc(alv.cnpj_cpf),
      });
    } else {
      semDocumento.push({
        tipo: 'Alvará',
        identificador: alv.numero_alvara || alv.id,
        nome: alv.razao_social || 'Sem razão social',
      });
      alvarasAtualizados.push(alv);
    }
  }

  // 2. Processos
  const processosAtualizados: ProcessoItem[] = [];
  let processosVinculados = 0;
  for (const proc of processos) {
    const num = await ensureFolderForRecord(proc.cnpj_cpf, proc.pasta, {
      razao: proc.razao_social || proc.nome_fantasia,
      setor: proc.setor,
      bairro: proc.bairro,
      endereco: proc.endereco,
    });
    if (num) {
      processosVinculados += 1;
      processosAtualizados.push({
        ...proc,
        pasta: num,
        numero_pasta: num,
        cpf_cnpj_limpo: cleanDoc(proc.cnpj_cpf),
      });
    } else {
      semDocumento.push({
        tipo: 'Processo',
        identificador: proc.num_processo || proc.id,
        nome: proc.razao_social || proc.assunto || 'Sem identificação',
      });
      processosAtualizados.push(proc);
    }
  }

  // 3. Feirantes
  let feirantesVinculados = 0;
  for (const feira of feiras) {
    const doc = feira.cnpj || feira.cpf;
    const num = await ensureFolderForRecord(doc, feira.pasta, {
      razao: feira.razao || feira.nome_pf,
      setor: 'EVENTOS & FEIRAS',
      bairro: feira.bairro,
      endereco: feira.rua,
    });
    if (num) {
      feirantesVinculados += 1;
    } else {
      semDocumento.push({
        tipo: 'Feirante',
        identificador: feira.num_prot || feira.id,
        nome: feira.nome_pf || feira.razao || 'Feirante sem CPF/CNPJ',
      });
    }
  }

  // 4. Fiscalizações sem CPF/CNPJ registradas no saneamento
  for (const fisc of fiscalizacoes) {
    const doc = fisc.estabelecimento?.cnpjCpf;
    if (!isValidDocLength(doc)) {
      semDocumento.push({
        tipo: 'Fiscalização',
        identificador: fisc.protocolo || fisc.id,
        nome: fisc.estabelecimento?.razaoSocial || fisc.estabelecimento?.nomeFantasia || 'Sem documento',
      });
    } else {
      await ensureFolderForRecord(doc, fisc.numero_pasta, {
        razao: fisc.estabelecimento?.razaoSocial,
        bairro: fisc.estabelecimento?.bairro,
        endereco: fisc.estabelecimento?.endereco,
      });
    }
  }

  const pastasAtualizadas = savePastasUnificadas(Array.from(pastasMap.values()));
  saveAlvarasUnificados(alvarasAtualizados);

  // Sincroniza em lote no Supabase sem bloquear retorno
  void saveManyPastasVisaToSupabase(pastasAtualizadas);

  return {
    executadoEm: new Date().toISOString(),
    totalPastasFinais: pastasAtualizadas.length,
    preservadasFisicas,
    geradas6Digitos,
    processosVinculados,
    alvarasVinculados,
    feirantesVinculados,
    registrosSemDocumento: semDocumento,
    processosAtualizados,
    alvarasAtualizados,
    pastasAtualizadas,
  };
}
