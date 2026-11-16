import { supabase, isSupabaseConfigured } from './supabase';
import {
  CcpuEstoqueItem,
  CcpuEstoqueMovimentacao,
  CcpuInsumoId,
  CcpuOcorrenciaItem
} from '../types';

const LS_ITENS_KEY = 'visa_ccpu_estoque_itens';
const LS_MOVS_KEY = 'visa_ccpu_estoque_movimentacoes';

export const DEFAULT_CCPU_ESTOQUE_ITENS: CcpuEstoqueItem[] = [
  {
    id: 'PARAFINADO',
    nome: 'Parafinado',
    categoria: 'ISCA_RATICIDA',
    unidade: 'unidade',
    quantidade_atual: 0,
    estoque_minimo: 50,
    observacoes: 'Bloco parafinado para raticida / áreas úmidas',
    atualizado_em: new Date().toISOString()
  },
  {
    id: 'COLANTE',
    nome: 'Colante',
    categoria: 'ISCA_RATICIDA',
    unidade: 'unidade',
    quantidade_atual: 0,
    estoque_minimo: 30,
    observacoes: 'Placa / armadilha colante',
    atualizado_em: new Date().toISOString()
  },
  {
    id: 'EXTRUSADO',
    nome: 'Extrusado',
    categoria: 'ISCA_RATICIDA',
    unidade: 'unidade',
    quantidade_atual: 0,
    estoque_minimo: 50,
    observacoes: 'Isca extrusada em unidade',
    atualizado_em: new Date().toISOString()
  },
  {
    id: 'ISCA_FRESCA',
    nome: 'Isca Fresca',
    categoria: 'ISCA_RATICIDA',
    unidade: 'unidade',
    quantidade_atual: 0,
    estoque_minimo: 40,
    observacoes: 'Isca fresca / sachê em unidade',
    atualizado_em: new Date().toISOString()
  },
  {
    id: 'GRANULADO',
    nome: 'Granulado',
    categoria: 'INSUMO_QUIMICO',
    unidade: 'unidade',
    quantidade_atual: 0,
    estoque_minimo: 40,
    observacoes: 'Insumo granulado em unidade',
    atualizado_em: new Date().toISOString()
  },
  {
    id: 'GEL',
    nome: 'Gel',
    categoria: 'INSUMO_QUIMICO',
    unidade: 'unidade',
    quantidade_atual: 0,
    estoque_minimo: 20,
    observacoes: 'Aplicador / seringa em gel em unidade',
    atualizado_em: new Date().toISOString()
  },
  {
    id: 'PO',
    nome: 'Pó',
    categoria: 'INSUMO_QUIMICO',
    unidade: 'unidade',
    quantidade_atual: 0,
    estoque_minimo: 20,
    observacoes: 'Insumo em pó seco em unidade',
    atualizado_em: new Date().toISOString()
  },
  {
    id: 'LARVICIDA',
    nome: 'Larvicida',
    categoria: 'LARVICIDA',
    unidade: 'litro',
    quantidade_atual: 0,
    estoque_minimo: 5,
    observacoes: 'Larvicida líquido / biológico em litros',
    atualizado_em: new Date().toISOString()
  }
];

const ITEM_ORDER: Record<CcpuInsumoId, number> = {
  PARAFINADO: 1,
  COLANTE: 2,
  EXTRUSADO: 3,
  ISCA_FRESCA: 4,
  GRANULADO: 5,
  GEL: 6,
  PO: 7,
  LARVICIDA: 8
};

function arredondarSaldo(valor: number, unidade: 'unidade' | 'litro'): number {
  const limpo = Math.max(0, Number(valor) || 0);
  if (unidade === 'unidade') {
    return Math.round(limpo * 100) / 100;
  }
  return Math.round(limpo * 100) / 100;
}

function sortItens(itens: CcpuEstoqueItem[]): CcpuEstoqueItem[] {
  return [...itens].sort((a, b) => (ITEM_ORDER[a.id] ?? 99) - (ITEM_ORDER[b.id] ?? 99));
}

export function getLocalCcpuEstoqueItens(): CcpuEstoqueItem[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LS_ITENS_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Garante que os 8 itens oficiais sempre existam
        const map = new Map<string, CcpuEstoqueItem>();
        DEFAULT_CCPU_ESTOQUE_ITENS.forEach((d) => map.set(d.id, { ...d }));
        parsed.forEach((item: any) => {
          if (item?.id && map.has(item.id)) {
            const base = map.get(item.id)!;
            map.set(item.id, {
              ...base,
              ...item,
              quantidade_atual: Number(item.quantidade_atual) || 0,
              estoque_minimo: Number(item.estoque_minimo) || base.estoque_minimo
            });
          }
        });
        return sortItens(Array.from(map.values()));
      }
    }
  } catch (e) {
    console.warn('Erro ao ler estoque CCPU local:', e);
  }
  return sortItens(DEFAULT_CCPU_ESTOQUE_ITENS.map((d) => ({ ...d })));
}

export function saveLocalCcpuEstoqueItens(itens: CcpuEstoqueItem[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LS_ITENS_KEY, JSON.stringify(sortItens(itens)));
    }
  } catch (e) {
    console.warn('Erro ao salvar estoque CCPU local:', e);
  }
}

export function getLocalCcpuEstoqueMovs(): CcpuEstoqueMovimentacao[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LS_MOVS_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Erro ao ler movimentações CCPU local:', e);
  }
  return [];
}

export function saveLocalCcpuEstoqueMovs(movs: CcpuEstoqueMovimentacao[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LS_MOVS_KEY, JSON.stringify(movs.slice(0, 500)));
    }
  } catch (e) {
    console.warn('Erro ao salvar movimentações CCPU local:', e);
  }
}

export interface FetchCcpuEstoqueResult {
  itens: CcpuEstoqueItem[];
  movimentacoes: CcpuEstoqueMovimentacao[];
  syncedSupabase: boolean;
  missingTables: boolean;
  errorMessage?: string;
}

export async function fetchCcpuEstoque(): Promise<FetchCcpuEstoqueResult> {
  const localItens = getLocalCcpuEstoqueItens();
  const localMovs = getLocalCcpuEstoqueMovs();

  if (!isSupabaseConfigured || !supabase) {
    return {
      itens: localItens,
      movimentacoes: localMovs,
      syncedSupabase: false,
      missingTables: false,
      errorMessage: 'Supabase não configurado no ambiente.'
    };
  }

  try {
    const [itensRes, movsRes] = await Promise.all([
      supabase.from('ccpu_estoque_itens').select('*'),
      supabase
        .from('ccpu_estoque_movimentacoes')
        .select('*')
        .order('data_hora', { ascending: false })
        .limit(200)
    ]);

    if (itensRes.error) {
      const msg = itensRes.error.message || '';
      const isMissing =
        msg.includes('does not exist') ||
        msg.includes('Could not find the table') ||
        itensRes.error.code === '42P01' ||
        itensRes.error.code === 'PGRST205';

      return {
        itens: localItens,
        movimentacoes: localMovs,
        syncedSupabase: false,
        missingTables: isMissing,
        errorMessage: msg
      };
    }

    let remoteItens = (itensRes.data || []) as any[];

    // Se a tabela existe mas ainda não recebeu os 8 itens iniciais, semeia automaticamente
    if (remoteItens.length < DEFAULT_CCPU_ESTOQUE_ITENS.length) {
      const existingIds = new Set(remoteItens.map((r) => r.id));
      const missingDefaults = DEFAULT_CCPU_ESTOQUE_ITENS.filter((d) => !existingIds.has(d.id));
      if (missingDefaults.length > 0) {
        const { error: seedErr } = await supabase
          .from('ccpu_estoque_itens')
          .upsert(missingDefaults, { onConflict: 'id' });
        if (!seedErr) {
          const retry = await supabase.from('ccpu_estoque_itens').select('*');
          if (!retry.error && retry.data) {
            remoteItens = retry.data;
          }
        }
      }
    }

    const mappedItens: CcpuEstoqueItem[] = sortItens(
      remoteItens.map((r) => ({
        id: r.id as CcpuInsumoId,
        nome: r.nome,
        categoria: r.categoria || 'ISCA_RATICIDA',
        unidade: r.unidade === 'litro' ? 'litro' : 'unidade',
        quantidade_atual: Number(r.quantidade_atual) || 0,
        estoque_minimo: Number(r.estoque_minimo) || 0,
        lote_atual: r.lote_atual || '',
        validade_lote: r.validade_lote || '',
        observacoes: r.observacoes || '',
        atualizado_em: r.atualizado_em || new Date().toISOString(),
        atualizado_por: r.atualizado_por || ''
      }))
    );

    const mappedMovs: CcpuEstoqueMovimentacao[] = Array.isArray(movsRes.data)
      ? movsRes.data.map((m: any) => ({
          id: m.id,
          item_id: m.item_id as CcpuInsumoId,
          item_nome: m.item_nome,
          tipo: m.tipo,
          quantidade: Number(m.quantidade) || 0,
          saldo_anterior: Number(m.saldo_anterior) || 0,
          saldo_posterior: Number(m.saldo_posterior) || 0,
          unidade: m.unidade === 'litro' ? 'litro' : 'unidade',
          motivo: m.motivo,
          protocolo_ocorrencia: m.protocolo_ocorrencia || undefined,
          ocorrencia_id: m.ocorrencia_id || undefined,
          lote: m.lote || undefined,
          responsavel: m.responsavel || 'Servidor CCPU',
          data_hora: m.data_hora
        }))
      : localMovs;

    if (mappedItens.length > 0) {
      saveLocalCcpuEstoqueItens(mappedItens);
    }
    if (!movsRes.error && Array.isArray(movsRes.data)) {
      saveLocalCcpuEstoqueMovs(mappedMovs);
    }

    return {
      itens: mappedItens.length > 0 ? mappedItens : localItens,
      movimentacoes: mappedMovs,
      syncedSupabase: true,
      missingTables: false
    };
  } catch (err: any) {
    console.warn('Erro ao buscar estoque CCPU no Supabase:', err);
    return {
      itens: localItens,
      movimentacoes: localMovs,
      syncedSupabase: false,
      missingTables: false,
      errorMessage: err?.message || 'Erro de conexão com Supabase'
    };
  }
}

export interface RegistrarMovimentacaoParams {
  itemId: CcpuInsumoId;
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
  quantidade: number; // Na ENTRADA soma; na SAIDA subtrai; no AJUSTE define o novo saldo absoluto
  motivo: string;
  responsavel: string;
  lote?: string;
  validadeLote?: string;
  protocoloOcorrencia?: string;
  ocorrenciaId?: string;
}

export async function registrarMovimentacaoEstoque(
  params: RegistrarMovimentacaoParams
): Promise<{
  ok: boolean;
  syncedSupabase: boolean;
  itens: CcpuEstoqueItem[];
  movimentacoes: CcpuEstoqueMovimentacao[];
  erro?: string;
}> {
  const itensAtuais = getLocalCcpuEstoqueItens();
  const movsAtuais = getLocalCcpuEstoqueMovs();

  const itemIndex = itensAtuais.findIndex((i) => i.id === params.itemId);
  if (itemIndex === -1) {
    return {
      ok: false,
      syncedSupabase: false,
      itens: itensAtuais,
      movimentacoes: movsAtuais,
      erro: 'Item de estoque não encontrado.'
    };
  }

  // Se Supabase estiver disponível, tenta buscar saldo mais recente desse item para evitar divergência entre dispositivos
  let itemAlvo = { ...itensAtuais[itemIndex] };
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: remoteRow, error: remoteErr } = await supabase
        .from('ccpu_estoque_itens')
        .select('*')
        .eq('id', params.itemId)
        .maybeSingle();

      if (!remoteErr && remoteRow) {
        itemAlvo = {
          ...itemAlvo,
          quantidade_atual: Number(remoteRow.quantidade_atual) || 0,
          estoque_minimo: Number(remoteRow.estoque_minimo) || itemAlvo.estoque_minimo,
          lote_atual: remoteRow.lote_atual || itemAlvo.lote_atual,
          validade_lote: remoteRow.validade_lote || itemAlvo.validade_lote
        };
      }
    } catch {
      // usa saldo local
    }
  }

  const saldoAnterior = Number(itemAlvo.quantidade_atual) || 0;
  const qtdInformada = Math.max(0, Number(params.quantidade) || 0);
  let saldoPosterior = saldoAnterior;
  let qtdMovimentada = qtdInformada;

  if (params.tipo === 'ENTRADA') {
    saldoPosterior = arredondarSaldo(saldoAnterior + qtdInformada, itemAlvo.unidade);
  } else if (params.tipo === 'SAIDA') {
    saldoPosterior = arredondarSaldo(Math.max(0, saldoAnterior - qtdInformada), itemAlvo.unidade);
  } else {
    // AJUSTE: quantidade representa o novo saldo físico conferido
    saldoPosterior = arredondarSaldo(qtdInformada, itemAlvo.unidade);
    qtdMovimentada = arredondarSaldo(Math.abs(saldoPosterior - saldoAnterior), itemAlvo.unidade);
  }

  const agoraIso = new Date().toISOString();
  const itemAtualizado: CcpuEstoqueItem = {
    ...itemAlvo,
    quantidade_atual: saldoPosterior,
    lote_atual: params.lote !== undefined && params.lote.trim() ? params.lote.trim() : itemAlvo.lote_atual,
    validade_lote:
      params.validadeLote !== undefined && params.validadeLote.trim()
        ? params.validadeLote.trim()
        : itemAlvo.validade_lote,
    atualizado_em: agoraIso,
    atualizado_por: params.responsavel
  };

  const novaMov: CcpuEstoqueMovimentacao = {
    id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    item_id: itemAlvo.id,
    item_nome: itemAlvo.nome,
    tipo: params.tipo,
    quantidade: qtdMovimentada,
    saldo_anterior: saldoAnterior,
    saldo_posterior: saldoPosterior,
    unidade: itemAlvo.unidade,
    motivo: params.motivo.trim() || (params.tipo === 'ENTRADA' ? 'Reposição de estoque' : 'Baixa de estoque'),
    protocolo_ocorrencia: params.protocoloOcorrencia,
    ocorrencia_id: params.ocorrenciaId,
    lote: params.lote?.trim() || itemAtualizado.lote_atual || undefined,
    responsavel: params.responsavel || 'Servidor CCPU',
    data_hora: agoraIso
  };

  const novosItens = itensAtuais.map((it, idx) => (idx === itemIndex ? itemAtualizado : it));
  const novasMovs = [novaMov, ...movsAtuais];

  saveLocalCcpuEstoqueItens(novosItens);
  saveLocalCcpuEstoqueMovs(novasMovs);

  let syncedSupabase = false;
  if (isSupabaseConfigured && supabase) {
    try {
      const { error: upsertErr } = await supabase
        .from('ccpu_estoque_itens')
        .upsert(
          {
            id: itemAtualizado.id,
            nome: itemAtualizado.nome,
            categoria: itemAtualizado.categoria,
            unidade: itemAtualizado.unidade,
            quantidade_atual: itemAtualizado.quantidade_atual,
            estoque_minimo: itemAtualizado.estoque_minimo,
            lote_atual: itemAtualizado.lote_atual || null,
            validade_lote: itemAtualizado.validade_lote || null,
            observacoes: itemAtualizado.observacoes || null,
            atualizado_em: itemAtualizado.atualizado_em,
            atualizado_por: itemAtualizado.atualizado_por || null
          },
          { onConflict: 'id' }
        );

      if (!upsertErr) {
        const { error: movErr } = await supabase
          .from('ccpu_estoque_movimentacoes')
          .insert({
            id: novaMov.id,
            item_id: novaMov.item_id,
            item_nome: novaMov.item_nome,
            tipo: novaMov.tipo,
            quantidade: novaMov.quantidade,
            saldo_anterior: novaMov.saldo_anterior,
            saldo_posterior: novaMov.saldo_posterior,
            unidade: novaMov.unidade,
            motivo: novaMov.motivo,
            protocolo_ocorrencia: novaMov.protocolo_ocorrencia || null,
            ocorrencia_id: novaMov.ocorrencia_id || null,
            lote: novaMov.lote || null,
            responsavel: novaMov.responsavel,
            data_hora: novaMov.data_hora
          });

        if (!movErr) {
          syncedSupabase = true;
        }
      }
    } catch (e) {
      console.warn('Falha ao persistir movimentação CCPU no Supabase:', e);
    }
  }

  return {
    ok: true,
    syncedSupabase,
    itens: novosItens,
    movimentacoes: novasMovs
  };
}

export async function atualizarParametrosItemEstoque(params: {
  itemId: CcpuInsumoId;
  estoque_minimo: number;
  lote_atual?: string;
  validade_lote?: string;
  observacoes?: string;
  responsavel: string;
}): Promise<{ ok: boolean; syncedSupabase: boolean; itens: CcpuEstoqueItem[] }> {
  const itensAtuais = getLocalCcpuEstoqueItens();
  const idx = itensAtuais.findIndex((i) => i.id === params.itemId);
  if (idx === -1) {
    return { ok: false, syncedSupabase: false, itens: itensAtuais };
  }

  const agoraIso = new Date().toISOString();
  const atualizado: CcpuEstoqueItem = {
    ...itensAtuais[idx],
    estoque_minimo: Math.max(0, Number(params.estoque_minimo) || 0),
    lote_atual: params.lote_atual?.trim() || '',
    validade_lote: params.validade_lote?.trim() || '',
    observacoes: params.observacoes?.trim() || '',
    atualizado_em: agoraIso,
    atualizado_por: params.responsavel
  };

  const novosItens = itensAtuais.map((it, i) => (i === idx ? atualizado : it));
  saveLocalCcpuEstoqueItens(novosItens);

  let syncedSupabase = false;
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('ccpu_estoque_itens')
        .upsert(
          {
            id: atualizado.id,
            nome: atualizado.nome,
            categoria: atualizado.categoria,
            unidade: atualizado.unidade,
            quantidade_atual: atualizado.quantidade_atual,
            estoque_minimo: atualizado.estoque_minimo,
            lote_atual: atualizado.lote_atual || null,
            validade_lote: atualizado.validade_lote || null,
            observacoes: atualizado.observacoes || null,
            atualizado_em: atualizado.atualizado_em,
            atualizado_por: atualizado.atualizado_por || null
          },
          { onConflict: 'id' }
        );
      if (!error) syncedSupabase = true;
    } catch (e) {
      console.warn('Erro ao atualizar parâmetros no Supabase:', e);
    }
  }

  return { ok: true, syncedSupabase, itens: novosItens };
}

export async function baixarEstoquePorOcorrencia(
  ocorrencia: CcpuOcorrenciaItem,
  responsavel?: string
): Promise<{ totalBaixados: number; syncedSupabase: boolean }> {
  const insumos = ocorrencia.insumosUtilizados || [];
  if (insumos.length === 0) {
    return { totalBaixados: 0, syncedSupabase: true };
  }

  let allSynced = true;
  let count = 0;

  for (const insumo of insumos) {
    if (!insumo || insumo.quantidade <= 0) continue;
    const res = await registrarMovimentacaoEstoque({
      itemId: insumo.id,
      tipo: 'SAIDA',
      quantidade: insumo.quantidade,
      motivo: `Uso em campo (${ocorrencia.bairro} · ${ocorrencia.endereco})`,
      protocoloOcorrencia: ocorrencia.protocolo,
      ocorrenciaId: ocorrencia.id,
      responsavel: responsavel || ocorrencia.servidorResponsavel || 'Agente CCPU'
    });
    if (res.ok) count++;
    if (!res.syncedSupabase) allSynced = false;
  }

  return { totalBaixados: count, syncedSupabase: allSynced };
}
