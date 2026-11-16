import {
  CcpuInsumoUtilizado,
  CcpuOcorrenciaItem,
  StatusEspecimeCcpu,
  TipoLocalCcpu,
  TipoPragaCcpu
} from '../types';
import { INITIAL_CCPU_OCORRENCIAS } from '../data/ccpuMockData';
import { isSupabaseConfigured, supabase } from './supabase';

const STORAGE_KEY_OCORRENCIAS = 'visa_ccpu_ocorrencias';
const STORAGE_KEY_SYNCED_ONCE = 'visa_ccpu_ocorrencias_synced_once';

function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error.details || error.hint || '').toLowerCase();
  const code = String(error.code || '');
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table')
  );
}

export function formatarResumoInsumos(insumos?: CcpuInsumoUtilizado[]): string {
  if (!insumos || insumos.length === 0) return '';
  return insumos
    .filter((i) => i && Number(i.quantidade) > 0)
    .map((i) => `${i.nome}: ${i.quantidade} ${i.unidade === 'litro' ? 'L' : 'un'}`)
    .join('; ');
}

export function getLocalCcpuOcorrencias(): CcpuOcorrenciaItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_OCORRENCIAS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao restaurar ocorrências CCPU locais:', e);
  }
  return INITIAL_CCPU_OCORRENCIAS;
}

export function saveLocalCcpuOcorrencias(itens: CcpuOcorrenciaItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_OCORRENCIAS, JSON.stringify(itens));
  } catch (e) {
    console.warn('Erro ao salvar ocorrências CCPU localmente:', e);
  }
}

function mapRowToOcorrencia(row: any): CcpuOcorrenciaItem {
  const insumos: CcpuInsumoUtilizado[] = Array.isArray(row.insumos_utilizados)
    ? row.insumos_utilizados
    : [];
  const fatores: string[] = Array.isArray(row.fatores_atrativos)
    ? row.fatores_atrativos
    : [];
  const fotos: string[] = Array.isArray(row.fotos) ? row.fotos : [];

  return {
    id: String(row.id),
    protocolo: String(row.protocolo || ''),
    tipoPraga: (row.tipo_praga || 'ESCORPIAO') as TipoPragaCcpu,
    subtipoEspecie: String(row.subtipo_especie || ''),
    dataHora: String(row.data_hora || ''),
    temperatura: Number(row.temperatura) || 24.0,
    umidadeRelativa:
      row.umidade_relativa !== null && row.umidade_relativa !== undefined
        ? Number(row.umidade_relativa)
        : undefined,
    condicaoClima: String(row.condicao_clima || ''),
    fonteTemperatura: String(row.fonte_temperatura || ''),
    endereco: String(row.endereco || ''),
    numero: row.numero || undefined,
    bairro: String(row.bairro || ''),
    tipoLocal: (row.tipo_local || 'BUEIRO_BOCA_LOBO') as TipoLocalCcpu,
    identificacaoBueiroLocal: String(row.identificacao_bueiro_local || ''),
    lat: Number(row.lat) || -26.9925,
    lng: Number(row.lng) || -48.6353,
    quantidade: Number(row.quantidade) || 0,
    statusEspecime: (row.status_especime || 'VIVO') as StatusEspecimeCcpu,
    metodoColetaAcao: String(row.metodo_coleta_acao || ''),
    condicaoEstrutural: row.condicao_estrutural || undefined,
    insumosUtilizados: insumos.length > 0 ? insumos : undefined,
    fatoresAtrativos: fatores,
    servidorResponsavel: String(row.servidor_responsavel || ''),
    matriculaServidor: row.matricula_servidor || undefined,
    statusOcorrencia: row.status_ocorrencia || 'COLETADO',
    notificacaoEmitida: Boolean(row.notificacao_emitida),
    numeroNotificacao: row.numero_notificacao || undefined,
    observacoes: String(row.observacoes || ''),
    medidasAdotadas: String(row.medidas_adotadas || ''),
    fotos: fotos.length > 0 ? fotos : undefined,
    createdAt: String(row.created_at || new Date().toISOString())
  };
}

function mapOcorrenciaToRow(o: CcpuOcorrenciaItem) {
  const insumos = (o.insumosUtilizados || []).filter((i) => i && Number(i.quantidade) > 0);
  return {
    id: o.id,
    protocolo: o.protocolo,
    tipo_praga: o.tipoPraga,
    subtipo_especie: o.subtipoEspecie,
    data_hora: o.dataHora,
    temperatura: Number(o.temperatura) || 24.0,
    umidade_relativa: o.umidadeRelativa ?? null,
    condicao_clima: o.condicaoClima || '',
    fonte_temperatura: o.fonteTemperatura || '',
    endereco: o.endereco,
    numero: o.numero || null,
    bairro: o.bairro,
    tipo_local: o.tipoLocal,
    identificacao_bueiro_local: o.identificacaoBueiroLocal,
    lat: Number(o.lat),
    lng: Number(o.lng),
    quantidade: Number(o.quantidade) || 0,
    status_especime: o.statusEspecime || 'VIVO',
    metodo_coleta_acao: o.metodoColetaAcao || '',
    condicao_estrutural: o.condicaoEstrutural || null,
    insumos_utilizados: insumos,
    resumo_insumos_consumidos: formatarResumoInsumos(insumos) || null,
    fatores_atrativos: o.fatoresAtrativos || [],
    servidor_responsavel: o.servidorResponsavel,
    matricula_servidor: o.matriculaServidor || null,
    status_ocorrencia: o.statusOcorrencia || 'COLETADO',
    notificacao_emitida: Boolean(o.notificacaoEmitida),
    numero_notificacao: o.numeroNotificacao || null,
    observacoes: o.observacoes || '',
    medidas_adotadas: o.medidasAdotadas || '',
    fotos: o.fotos || [],
    created_at: o.createdAt || new Date().toISOString()
  };
}

async function syncConsumoDetalhado(ocorrencia: CcpuOcorrenciaItem): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const insumos = (ocorrencia.insumosUtilizados || []).filter((i) => i && Number(i.quantidade) > 0);

  try {
    // Limpa registros anteriores desta ocorrência para manter consistência em edições
    await supabase.from('ccpu_ocorrencias_consumo').delete().eq('ocorrencia_id', ocorrencia.id);

    if (insumos.length === 0) return;

    const rows = insumos.map((item) => ({
      id: `${ocorrencia.id}__${item.id}`,
      ocorrencia_id: ocorrencia.id,
      protocolo: ocorrencia.protocolo,
      insumo_id: item.id,
      insumo_nome: item.nome,
      quantidade_consumida: Number(item.quantidade) || 0,
      unidade: item.unidade,
      tipo_praga: ocorrencia.tipoPraga,
      quantidade_animais: Number(ocorrencia.quantidade) || 0,
      bairro: ocorrencia.bairro,
      servidor_responsavel: ocorrencia.servidorResponsavel,
      data_hora: ocorrencia.dataHora,
      created_at: ocorrencia.createdAt || new Date().toISOString()
    }));

    await supabase.from('ccpu_ocorrencias_consumo').upsert(rows, { onConflict: 'id' });
  } catch {
    // Tabela auxiliar opcional; não bloqueia o salvamento principal
  }
}

export interface FetchOcorrenciasResult {
  ocorrencias: CcpuOcorrenciaItem[];
  syncedSupabase: boolean;
  missingTable: boolean;
  errorMessage?: string;
}

export async function fetchCcpuOcorrencias(): Promise<FetchOcorrenciasResult> {
  const localItens = getLocalCcpuOcorrencias();

  if (!isSupabaseConfigured || !supabase) {
    return {
      ocorrencias: localItens,
      syncedSupabase: false,
      missingTable: false,
      errorMessage: 'Supabase não configurado no ambiente.'
    };
  }

  try {
    const { data, error } = await supabase
      .from('ccpu_ocorrencias')
      .select('*')
      .order('data_hora', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return {
        ocorrencias: localItens,
        syncedSupabase: false,
        missingTable: isMissingTableError(error),
        errorMessage: error.message
      };
    }

    const remoteRows = Array.isArray(data) ? data : [];

    // Primeira conexão com tabela vazia: migra ocorrências já registradas localmente para não perder dados anteriores
    if (remoteRows.length === 0) {
      const alreadySyncedOnce = localStorage.getItem(STORAGE_KEY_SYNCED_ONCE) === '1';
      if (!alreadySyncedOnce && localItens.length > 0) {
        const customLocals = localItens.filter((o) => !/^ccpu-00\d$/.test(o.id));
        const toMigrate = customLocals.length > 0 ? customLocals : localItens;
        const rowsToInsert = toMigrate.map(mapOcorrenciaToRow);

        const { error: migrateErr } = await supabase
          .from('ccpu_ocorrencias')
          .upsert(rowsToInsert, { onConflict: 'id' });

        if (!migrateErr) {
          for (const item of toMigrate) {
            await syncConsumoDetalhado(item);
          }
          localStorage.setItem(STORAGE_KEY_SYNCED_ONCE, '1');
          saveLocalCcpuOcorrencias(toMigrate);
          return {
            ocorrencias: toMigrate,
            syncedSupabase: true,
            missingTable: false
          };
        }
      }
      localStorage.setItem(STORAGE_KEY_SYNCED_ONCE, '1');
      saveLocalCcpuOcorrencias([]);
      return {
        ocorrencias: [],
        syncedSupabase: true,
        missingTable: false
      };
    }

    const mapped = remoteRows.map(mapRowToOcorrencia);
    localStorage.setItem(STORAGE_KEY_SYNCED_ONCE, '1');
    saveLocalCcpuOcorrencias(mapped);

    return {
      ocorrencias: mapped,
      syncedSupabase: true,
      missingTable: false
    };
  } catch (err: any) {
    console.warn('Erro ao buscar ocorrências CCPU no Supabase:', err);
    return {
      ocorrencias: localItens,
      syncedSupabase: false,
      missingTable: false,
      errorMessage: err?.message || 'Erro de conexão com Supabase'
    };
  }
}

export async function saveCcpuOcorrencia(
  ocorrencia: CcpuOcorrenciaItem
): Promise<{ ok: boolean; syncedSupabase: boolean; missingTable: boolean; errorMessage?: string }> {
  const atuais = getLocalCcpuOcorrencias();
  const semDuplicata = atuais.filter((o) => o.id !== ocorrencia.id);
  saveLocalCcpuOcorrencias([ocorrencia, ...semDuplicata]);

  if (!isSupabaseConfigured || !supabase) {
    return { ok: true, syncedSupabase: false, missingTable: false };
  }

  try {
    const row = mapOcorrenciaToRow(ocorrencia);
    const { error } = await supabase.from('ccpu_ocorrencias').upsert(row, { onConflict: 'id' });

    if (error) {
      return {
        ok: true,
        syncedSupabase: false,
        missingTable: isMissingTableError(error),
        errorMessage: error.message
      };
    }

    await syncConsumoDetalhado(ocorrencia);
    localStorage.setItem(STORAGE_KEY_SYNCED_ONCE, '1');

    return { ok: true, syncedSupabase: true, missingTable: false };
  } catch (err: any) {
    console.warn('Falha ao salvar ocorrência CCPU no Supabase:', err);
    return {
      ok: true,
      syncedSupabase: false,
      missingTable: false,
      errorMessage: err?.message
    };
  }
}

export async function deleteCcpuOcorrencia(
  id: string
): Promise<{ ok: boolean; syncedSupabase: boolean; errorMessage?: string }> {
  const atuais = getLocalCcpuOcorrencias();
  saveLocalCcpuOcorrencias(atuais.filter((o) => o.id !== id));

  if (!isSupabaseConfigured || !supabase) {
    return { ok: true, syncedSupabase: false };
  }

  try {
    const { error } = await supabase.from('ccpu_ocorrencias').delete().eq('id', id);
    if (error) {
      return { ok: true, syncedSupabase: false, errorMessage: error.message };
    }
    return { ok: true, syncedSupabase: true };
  } catch (err: any) {
    return { ok: true, syncedSupabase: false, errorMessage: err?.message };
  }
}
