import { SolicitacaoLaudoPotabilidadeItem } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEY = 'visa_solicitacoes_potabilidade';
const EVENT_KEY = 'visa_solicitacoes_potabilidade_updated';

export const SQL_CRIAR_TABELA_SOLICITACOES_POTABILIDADE = `-- Tabela de Solicitações de Laudos de Análise de Potabilidade da Água (VISA BC)
CREATE TABLE IF NOT EXISTS public.solicitacoes_potabilidade (
    id TEXT PRIMARY KEY,
    protocolo_1doc TEXT,
    data_solicitacao DATE,
    cnpj_cpf TEXT NOT NULL,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    categoria_estabelecimento TEXT,
    quantidade_pontos INTEGER DEFAULT 1,
    locais_coleta JSONB,
    outro_local_especificado TEXT,
    declaracao_compromisso BOOLEAN DEFAULT true,
    taxa_ufm_total NUMERIC(10, 2) DEFAULT 0.40,
    status_solicitacao TEXT DEFAULT 'AGUARDANDO PAGAMENTO',
    endereco TEXT,
    bairro TEXT,
    telefone TEXT,
    email TEXT,
    responsavel_contato TEXT,
    dados_complementares JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas de Acesso Seguro (RLS)
ALTER TABLE public.solicitacoes_potabilidade ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Permitir leitura para todos" ON public.solicitacoes_potabilidade FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Permitir inserção e atualização" ON public.solicitacoes_potabilidade FOR ALL USING (true);
`;

const SEED_SOLICITACOES: SolicitacaoLaudoPotabilidadeItem[] = [
  {
    id: 'sol-001',
    protocolo_1doc: '60.455/2026',
    data_solicitacao: '2026-09-20',
    cnpj_cpf: '83.102.894/0001-45',
    razao_social: 'RESTAURANTE E CHURRASCARIA ATLÂNTICO LTDA',
    nome_fantasia: 'CHURRASCARIA ATLÂNTICO',
    categoria_estabelecimento: 'Serviços de Alimentação: restaurantes, lanchonetes, bares, padarias, confeitarias, cantinas, bufês, pastelarias, rotisserias, cozinhas industriais ou institucionais',
    quantidade_pontos: 2,
    locais_coleta: [
      'Torneira na área de manipulação de alimentos',
      'Filtro de água'
    ],
    declaracao_compromisso: true,
    taxa_ufm_total: 0.8,
    status_solicitacao: 'PAGO / AGUARDANDO COLETA',
    endereco: 'Av. Atlântica, 1420',
    bairro: 'Centro',
    telefone: '(47) 3367-2020',
    email: 'contato@churrascariaatlantico.com.br',
    responsavel_contato: 'Marcos Vinícius Silva',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 'sol-002',
    protocolo_1doc: '61.120/2026',
    data_solicitacao: '2026-09-24',
    cnpj_cpf: '04.288.761/0001-90',
    razao_social: 'COLÉGIO E CRECHE PEQUENOS BRILHANTES LTDA',
    nome_fantasia: 'ESCOLA PEQUENOS BRILHANTES',
    categoria_estabelecimento: 'Instituições de ensino: faculdades, escolas e creches',
    quantidade_pontos: 3,
    locais_coleta: [
      'Bebedouro',
      'Torneira na área de copa/bar',
      'Filtro de água'
    ],
    declaracao_compromisso: true,
    taxa_ufm_total: 1.2,
    status_solicitacao: 'AGUARDANDO PAGAMENTO',
    endereco: 'Rua 1500, 450',
    bairro: 'Centro',
    telefone: '(47) 3268-1122',
    email: 'diretoria@pequenosbrilhantes.com.br',
    responsavel_contato: 'Luciana Pereira',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  }
];

function mapRowToSolicitacao(row: any): SolicitacaoLaudoPotabilidadeItem {
  return {
    id: String(row.id),
    protocolo_1doc: row.protocolo_1doc || '',
    data_solicitacao: row.data_solicitacao || '',
    cnpj_cpf: row.cnpj_cpf || '',
    razao_social: row.razao_social || '',
    nome_fantasia: row.nome_fantasia || '',
    categoria_estabelecimento: row.categoria_estabelecimento || '',
    quantidade_pontos: Number(row.quantidade_pontos) || 1,
    locais_coleta: Array.isArray(row.locais_coleta) ? row.locais_coleta : [],
    outro_local_especificado: row.outro_local_especificado || '',
    declaracao_compromisso: row.declaracao_compromisso !== false,
    taxa_ufm_total: Number(row.taxa_ufm_total) || 0.40,
    status_solicitacao: row.status_solicitacao || 'AGUARDANDO PAGAMENTO',
    endereco: row.endereco || '',
    bairro: row.bairro || '',
    telefone: row.telefone || '',
    email: row.email || '',
    responsavel_contato: row.responsavel_contato || '',
    created_at: row.created_at || new Date().toISOString()
  };
}

function mapSolicitacaoToRow(item: SolicitacaoLaudoPotabilidadeItem): any {
  return {
    id: item.id,
    protocolo_1doc: item.protocolo_1doc,
    data_solicitacao: item.data_solicitacao,
    cnpj_cpf: item.cnpj_cpf,
    razao_social: item.razao_social,
    nome_fantasia: item.nome_fantasia || '',
    categoria_estabelecimento: item.categoria_estabelecimento,
    quantidade_pontos: item.quantidade_pontos,
    locais_coleta: item.locais_coleta,
    outro_local_especificado: item.outro_local_especificado || '',
    declaracao_compromisso: item.declaracao_compromisso,
    taxa_ufm_total: item.taxa_ufm_total,
    status_solicitacao: item.status_solicitacao,
    endereco: item.endereco || '',
    bairro: item.bairro || '',
    telefone: item.telefone || '',
    email: item.email || '',
    responsavel_contato: item.responsavel_contato || '',
    updated_at: new Date().toISOString()
  };
}

// ==========================================
// OPERAÇÕES NO SUPABASE (NUVEM)
// ==========================================

export async function fetchSolicitacoesPotabilidadeFromSupabase(): Promise<SolicitacaoLaudoPotabilidadeItem[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('solicitacoes_potabilidade')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // Se a tabela não existir, avisa no console sem travar
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Tabela solicitacoes_potabilidade ainda não criada no Supabase.');
      } else {
        console.warn('Erro ao consultar solicitacoes_potabilidade no Supabase:', error.message);
      }
      return null;
    }

    if (data && data.length > 0) {
      const items = data.map(mapRowToSolicitacao);
      // Mescla com os itens locais para não perder nada
      const local = getSolicitacoesPotabilidade();
      const map = new Map<string, SolicitacaoLaudoPotabilidadeItem>();
      items.forEach(it => map.set(it.id, it));
      local.forEach(it => {
        if (!map.has(it.id)) map.set(it.id, it);
      });
      const merged = Array.from(map.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: merged }));
      return merged;
    }
  } catch (err) {
    console.warn('Exceção ao buscar solicitacoes_potabilidade do Supabase:', err);
  }
  return null;
}

export async function saveSolicitacaoPotabilidadeToSupabase(item: SolicitacaoLaudoPotabilidadeItem): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const payload = mapSolicitacaoToRow(item);
    const { error } = await supabase
      .from('solicitacoes_potabilidade')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase: Erro ao salvar solicitacoes_potabilidade:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase: Exceção ao gravar solicitacao_potabilidade:', err);
    return false;
  }
}

export async function updateSolicitacaoPotabilidadeStatusInSupabase(id: string, newStatus: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase
      .from('solicitacoes_potabilidade')
      .update({ status_solicitacao: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.warn('Supabase: Erro ao atualizar status:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase: Exceção ao atualizar status:', err);
    return false;
  }
}

export async function deleteSolicitacaoPotabilidadeFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase
      .from('solicitacoes_potabilidade')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Supabase: Erro ao excluir solicitação:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase: Exceção ao excluir solicitação:', err);
    return false;
  }
}

export async function syncAllPotabilidadeToSupabase(): Promise<{ success: number; total: number; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: 0, total: 0, error: 'Supabase não configurado' };
  }
  const items = getSolicitacoesPotabilidade();
  let successCount = 0;
  let lastError = '';
  for (const item of items) {
    const ok = await saveSolicitacaoPotabilidadeToSupabase(item);
    if (ok) successCount++;
    else lastError = 'Falha ao gravar item no Supabase';
  }
  return { success: successCount, total: items.length, error: lastError || undefined };
}

// ==========================================
// OPERAÇÕES LOCAIS E REATIVAS (COM SYNC EM NUVEM)
// ==========================================

export function getSolicitacoesPotabilidade(): SolicitacaoLaudoPotabilidadeItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Erro ao ler solicitações de potabilidade:', err);
  }
  // Se não existir, inicializa com seed
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_SOLICITACOES));
  } catch (e) {
    console.warn(e);
  }
  return SEED_SOLICITACOES;
}

export function saveSolicitacaoPotabilidade(item: SolicitacaoLaudoPotabilidadeItem): SolicitacaoLaudoPotabilidadeItem {
  const current = getSolicitacoesPotabilidade();
  const existsIndex = current.findIndex(s => s.id === item.id);
  let updated: SolicitacaoLaudoPotabilidadeItem[];
  if (existsIndex >= 0) {
    updated = [...current];
    updated[existsIndex] = item;
  } else {
    updated = [item, ...current];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: updated }));

  // Dispara sincronização em nuvem com o Supabase sem bloquear a UI
  saveSolicitacaoPotabilidadeToSupabase(item).catch(err => {
    console.warn('Tentativa de sincronização em segundo plano no Supabase:', err);
  });

  return item;
}

export function updateSolicitacaoPotabilidadeStatus(id: string, newStatus: any): void {
  const current = getSolicitacoesPotabilidade();
  const updated = current.map(s => s.id === id ? { ...s, status_solicitacao: newStatus } : s);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: updated }));

  // Atualiza no Supabase
  updateSolicitacaoPotabilidadeStatusInSupabase(id, String(newStatus)).catch(err => {
    console.warn('Tentativa de atualizar status no Supabase:', err);
  });
}

export function deleteSolicitacaoPotabilidade(id: string): void {
  const current = getSolicitacoesPotabilidade();
  const updated = current.filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: updated }));

  // Exclui no Supabase
  deleteSolicitacaoPotabilidadeFromSupabase(id).catch(err => {
    console.warn('Tentativa de exclusão no Supabase:', err);
  });
}

export function subscribeSolicitacoesPotabilidade(callback: (items: SolicitacaoLaudoPotabilidadeItem[]) => void): () => void {
  // Dispara busca inicial na nuvem
  fetchSolicitacoesPotabilidadeFromSupabase().catch(() => {});

  const handler = () => {
    callback(getSolicitacoesPotabilidade());
  };
  window.addEventListener(EVENT_KEY, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT_KEY, handler);
    window.removeEventListener('storage', handler);
  };
}
