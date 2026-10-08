import { SolicitacaoLaudoPotabilidadeItem, AmostraLaboratorioItem } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { saveProcessoToSupabase } from './supabaseService';
import { INITIAL_LABORATORIO } from '../data/mockData';

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
DROP POLICY IF EXISTS "Permitir leitura para todos" ON public.solicitacoes_potabilidade;
CREATE POLICY "Permitir leitura para todos" ON public.solicitacoes_potabilidade FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir inserção e atualização" ON public.solicitacoes_potabilidade;
CREATE POLICY "Permitir inserção e atualização" ON public.solicitacoes_potabilidade FOR ALL USING (true);
`;

const SEED_SOLICITACOES: SolicitacaoLaudoPotabilidadeItem[] = [
  {
    id: 'sol-67020',
    protocolo_1doc: '67020/2026',
    data_solicitacao: '2026-10-08',
    cnpj_cpf: '14.238.910/0001-55',
    razao_social: 'RESTAURANTE MAR AZUL GOURMET LTDA',
    nome_fantasia: 'RESTAURANTE MAR AZUL',
    categoria_estabelecimento: 'Serviços de Alimentação: restaurantes, lanchonetes, bares, padarias, confeitarias, cantinas, bufês, pastelarias, rotisserias, cozinhas industriais ou institucionais',
    quantidade_pontos: 8,
    locais_coleta: [
      'Ponto 1 - Torneira na área de manipulação de alimentos (Cozinha)',
      'Ponto 2 - Bebedouro do salão principal',
      'Ponto 3 - Filtro de água da copa / bar',
      'Ponto 4 - Torneira de higienização de vegetais',
      'Ponto 5 - Torneira da área de confeitaria e sobremesas',
      'Ponto 6 - Máquina de gelo industrial',
      'Ponto 7 - Torneira do buffet de atendimento',
      'Ponto 8 - Ponto de entrada da rede pública (Cavalete)'
    ],
    declaracao_compromisso: true,
    taxa_ufm_total: 3.2,
    status_solicitacao: 'LAUDO EMITIDO',
    endereco: 'Av. Atlântica, 2500',
    bairro: 'Centro',
    telefone: '(47) 3367-8899',
    email: 'contato@restaurantemarazul.com.br',
    responsavel_contato: 'Juliana Fernandes de Souza',
    created_at: new Date().toISOString()
  },
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

export function mapSolicitacaoToProcesso(sol: SolicitacaoLaudoPotabilidadeItem): any {
  const taxa = typeof sol.taxa_ufm_total === 'number' ? sol.taxa_ufm_total.toFixed(2) : '0.40';
  const locaisStr = Array.isArray(sol.locais_coleta) ? sol.locais_coleta.join(', ') : 'Pontos de água potável';
  return {
    id: sol.id.startsWith('pot-') ? sol.id : `pot-${sol.id}`,
    num_processo: sol.protocolo_1doc || `1DOC-POT-${Date.now().toString().slice(-6)}`,
    prot_1doc: sol.protocolo_1doc || '',
    data_protocolo: sol.data_solicitacao ? String(sol.data_solicitacao).split('T')[0] : new Date().toISOString().split('T')[0],
    cnpj_cpf: sol.cnpj_cpf,
    razao_social: sol.razao_social,
    nome_fantasia: sol.nome_fantasia || sol.razao_social,
    assunto: `SOLICITAÇÃO DE PARECER TÉCNICO - LAUDO DE POTABILIDADE DA ÁGUA (${sol.quantidade_pontos || 1} PONTOS)`,
    bairro: sol.bairro || 'Centro',
    endereco: sol.endereco || '',
    numero_complemento: sol.numero_complemento || '',
    cep: sol.cep || '88330-000',
    fiscal_responsavel: 'Laboratório VISA',
    status: sol.status_solicitacao === 'LAUDO EMITIDO' ? 'DEFERIDO' : 'EM ANÁLISE',
    situacao_cadastral: `AGUARDANDO COLETA (${sol.status_solicitacao || 'AGUARDANDO PAGAMENTO'})`,
    setor: 'LABORATÓRIO',
    grau_risco: 'BAIXO RISCO',
    observacoes: `[LAUDO_POTABILIDADE_VINCULO] Taxa: ${taxa} UFM | Locais: ${locaisStr} | Contato: ${sol.responsavel_contato || ''} Tel: ${sol.telefone || ''} Email: ${sol.email || ''}. ${sol.observacoes || ''}`,
    tramitacoes: [
      {
        id: `tram-${Date.now()}`,
        dataHora: new Date().toISOString(),
        de: 'CONTRIBUINTE / PROTOCOLO',
        para: 'LABORATÓRIO DE ÁGUA',
        despacho: `Solicitação oficial de laudo de potabilidade protocolada. Aguardando pagamento e coleta de ${sol.quantidade_pontos || 1} ponto(s).`,
        servidorNome: sol.razao_social
      }
    ]
  };
}

export function mapProcessoToSolicitacao(proc: any): SolicitacaoLaudoPotabilidadeItem {
  let quantidade_pontos = 1;
  const matchPontos = proc.assunto?.match(/(\d+)\s*PONTO/i) || proc.observacoes?.match(/Pontos?:\s*(\d+)/i);
  if (matchPontos) {
    quantidade_pontos = parseInt(matchPontos[1], 10);
  }

  let taxa_ufm = quantidade_pontos * 0.40;
  const matchTaxa = proc.observacoes?.match(/Taxa:\s*([\d\.]+)/i);
  if (matchTaxa) {
    taxa_ufm = parseFloat(matchTaxa[1]);
  }

  let locais: string[] = [];
  const matchLocais = proc.observacoes?.match(/Locais:\s*([^|\.]+)/i);
  if (matchLocais) {
    locais = matchLocais[1].split(',').map((s: string) => s.trim()).filter(Boolean);
  }

  let status: any = 'AGUARDANDO PAGAMENTO';
  if (proc.status === 'DEFERIDO') {
    status = 'LAUDO EMITIDO';
  } else if (proc.situacao_cadastral?.includes('PAGO')) {
    status = 'PAGO / AGUARDANDO COLETA';
  } else if (proc.situacao_cadastral?.includes('COLETA REALIZADA')) {
    status = 'COLETA REALIZADA';
  } else if (proc.situacao_cadastral?.includes('EM ANÁLISE') || proc.status === 'EM ANÁLISE') {
    status = 'PAGO / AGUARDANDO COLETA';
  }

  const cleanId = String(proc.id).startsWith('pot-') ? String(proc.id).replace('pot-', '') : String(proc.id);

  return {
    id: cleanId,
    protocolo_1doc: proc.prot_1doc || proc.num_processo || '',
    data_solicitacao: proc.data_protocolo || new Date().toISOString().split('T')[0],
    cnpj_cpf: proc.cnpj_cpf || '',
    razao_social: proc.razao_social || '',
    nome_fantasia: proc.nome_fantasia || proc.razao_social || '',
    categoria_estabelecimento: 'Geral / Estabelecimento Cadastrado',
    quantidade_pontos,
    locais_coleta: locais.length > 0 ? locais : ['Torneira principal / Rede predial'],
    outro_local_especificado: '',
    declaracao_compromisso: true,
    taxa_ufm_total: taxa_ufm,
    status_solicitacao: status,
    endereco: proc.endereco || '',
    numero_complemento: proc.numero_complemento || '',
    bairro: proc.bairro || 'Centro',
    cep: proc.cep || '88330-000',
    telefone: proc.telefone || '',
    email: proc.email || '',
    responsavel_contato: proc.fiscal_responsavel || '',
    observacoes: proc.observacoes || '',
    created_at: proc.created_at || new Date().toISOString()
  };
}

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
    numero_complemento: row.numero_complemento || '',
    bairro: row.bairro || '',
    cep: row.cep || '',
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
    numero_complemento: item.numero_complemento || '',
    bairro: item.bairro || '',
    cep: item.cep || '',
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
    const fetchedItems: SolicitacaoLaudoPotabilidadeItem[] = [];

    // 1. Tenta buscar da tabela dedicada 'solicitacoes_potabilidade'
    try {
      const { data, error } = await supabase
        .from('solicitacoes_potabilidade')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        data.forEach(r => fetchedItems.push(mapRowToSolicitacao(r)));
      }
    } catch (e) {
      console.warn('Busca em solicitacoes_potabilidade falhou, tentando processos:', e);
    }

    // 2. Busca também na tabela 'processos' (que sempre existe no Supabase)
    try {
      const { data: procData, error: procErr } = await supabase
        .from('processos')
        .select('*')
        .or('setor.eq.LABORATÓRIO,assunto.ilike.%POTABILIDADE%,observacoes.ilike.%LAUDO_POTABILIDADE%,id.ilike.pot-%');

      if (!procErr && procData && procData.length > 0) {
        procData.forEach(p => {
          const item = mapProcessoToSolicitacao(p);
          const already = fetchedItems.some(
            f => f.id === item.id || (f.protocolo_1doc && f.protocolo_1doc === item.protocolo_1doc)
          );
          if (!already) {
            fetchedItems.push(item);
          }
        });
      }
    } catch (e) {
      console.warn('Busca de processos de potabilidade falhou:', e);
    }

    // 3. Mescla com os itens locais para não perder solicitações criadas offline
    const local = getSolicitacoesPotabilidade();
    const map = new Map<string, SolicitacaoLaudoPotabilidadeItem>();
    fetchedItems.forEach(it => map.set(it.id, it));

    const pendingLocalUpload: SolicitacaoLaudoPotabilidadeItem[] = [];
    local.forEach(it => {
      if (!map.has(it.id)) {
        map.set(it.id, it);
        pendingLocalUpload.push(it);
      }
    });

    const merged = Array.from(map.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: merged }));

    // Se havia itens no navegador que não estavam no Supabase, envia agora em segundo plano!
    if (pendingLocalUpload.length > 0) {
      setTimeout(() => {
        pendingLocalUpload.forEach(it => {
          saveSolicitacaoPotabilidadeToSupabase(it).catch(e => console.warn('Erro ao subir item pendente:', e));
        });
      }, 500);
    }

    return merged;
  } catch (err) {
    console.warn('Exceção ao buscar solicitacoes_potabilidade do Supabase:', err);
  }
  return null;
}

export async function saveSolicitacaoPotabilidadeToSupabase(item: SolicitacaoLaudoPotabilidadeItem): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  let okProcesso = false;
  let okTabela = false;

  // 1. Sempre salva na tabela 'processos' do Supabase (que comprovadamente existe)
  try {
    const procPayload = mapSolicitacaoToProcesso(item);
    okProcesso = await saveProcessoToSupabase(procPayload);
  } catch (err) {
    console.warn('Supabase: Erro ao salvar processo de potabilidade:', err);
  }

  // 2. Tenta também salvar na tabela dedicada 'solicitacoes_potabilidade' (se criada)
  try {
    const payload = mapSolicitacaoToRow(item);
    const { error } = await supabase
      .from('solicitacoes_potabilidade')
      .upsert(payload, { onConflict: 'id' });

    if (!error) {
      okTabela = true;
    }
  } catch (err) {
    // Silencia se tabela ainda não existir no Supabase
  }

  return okProcesso || okTabela;
}

export async function updateSolicitacaoPotabilidadeStatusInSupabase(id: string, newStatus: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    // 1. Atualiza na tabela solicitacoes_potabilidade
    try {
      await supabase
        .from('solicitacoes_potabilidade')
        .update({ status_solicitacao: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (e) {}

    // 2. Atualiza na tabela processos
    const procStatus = newStatus === 'LAUDO EMITIDO' ? 'DEFERIDO' : 'EM ANÁLISE';
    const cleanId = id.startsWith('pot-') ? id : `pot-${id}`;
    await supabase
      .from('processos')
      .update({
        status: procStatus,
        situacao_cadastral: `AGUARDANDO COLETA (${newStatus})`,
        updated_at: new Date().toISOString()
      })
      .or(`id.eq.${cleanId},id.eq.${id}`);

    return true;
  } catch (err) {
    console.warn('Supabase: Exceção ao atualizar status:', err);
    return false;
  }
}

export async function deleteSolicitacaoPotabilidadeFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    try {
      await supabase
        .from('solicitacoes_potabilidade')
        .delete()
        .eq('id', id);
    } catch (e) {}

    const cleanId = id.startsWith('pot-') ? id : `pot-${id}`;
    await supabase
      .from('processos')
      .delete()
      .or(`id.eq.${cleanId},id.eq.${id}`);

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

export function getAmostrasLaboratorio(): AmostraLaboratorioItem[] {
  try {
    const raw = localStorage.getItem('visa_laboratorio');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const map = new Map<string, AmostraLaboratorioItem>();
        INITIAL_LABORATORIO.forEach((a) => map.set(a.id, a));
        parsed.forEach((a: AmostraLaboratorioItem) => map.set(a.id, a));
        return Array.from(map.values());
      }
    }
  } catch (err) {
    console.error('Erro ao ler amostras de laboratório:', err);
  }
  return INITIAL_LABORATORIO;
}

export function findAmostraBySolicitacao(
  solicitacao: SolicitacaoLaudoPotabilidadeItem,
  amostrasList?: AmostraLaboratorioItem[]
): AmostraLaboratorioItem | null {
  const all = findAmostrasBySolicitacao(solicitacao, amostrasList);
  return all[0] || null;
}

export function findAmostrasBySolicitacao(
  solicitacao: SolicitacaoLaudoPotabilidadeItem,
  amostrasList?: AmostraLaboratorioItem[]
): AmostraLaboratorioItem[] {
  const list = amostrasList && amostrasList.length > 0 ? amostrasList : getAmostrasLaboratorio();
  if (!list || list.length === 0) return [];

  const solProt = (solicitacao.protocolo_1doc || '').trim();
  const solDoc = (solicitacao.cnpj_cpf || '').replace(/\D/g, '');
  const solRazao = (solicitacao.razao_social || '').trim().toLowerCase();

  return list.filter((a) => {
    const aProt = (a.protocolo || '').trim();
    const aDoc = (a.cnpj_cpf || '').replace(/\D/g, '');
    const aInter = (a.interessado || a.estabelecimento || '').trim().toLowerCase();

    if (solProt && aProt && (solProt === aProt || aProt.includes(solProt) || solProt.includes(aProt))) return true;
    if (solDoc && aDoc && solDoc === aDoc) return true;
    if (solRazao && aInter && (solRazao.includes(aInter) || aInter.includes(solRazao))) return true;
    return false;
  });
}

export function findAmostraByProcesso(
  processo: any,
  amostrasList?: AmostraLaboratorioItem[]
): AmostraLaboratorioItem | null {
  const all = findAmostrasByProcesso(processo, amostrasList);
  return all[0] || null;
}

export function findAmostrasByProcesso(
  processo: any,
  amostrasList?: AmostraLaboratorioItem[]
): AmostraLaboratorioItem[] {
  const list = amostrasList && amostrasList.length > 0 ? amostrasList : getAmostrasLaboratorio();
  if (!list || list.length === 0 || !processo) return [];

  const procNum = (processo.num_processo || processo.prot_1doc || '').trim();
  const procDoc = (processo.cnpj_cpf || '').replace(/\D/g, '');
  const procRazao = (processo.razao_social || '').trim().toLowerCase();

  return list.filter((a) => {
    const aProt = (a.protocolo || '').trim();
    const aDoc = (a.cnpj_cpf || '').replace(/\D/g, '');
    const aInter = (a.interessado || a.estabelecimento || '').trim().toLowerCase();

    if (procNum && aProt && (procNum === aProt || aProt.includes(procNum) || procNum.includes(aProt))) return true;
    if (procDoc && aDoc && procDoc === aDoc) return true;
    if (procRazao && aInter && (procRazao.includes(aInter) || aInter.includes(procRazao))) return true;
    return false;
  });
}

/**
 * Gera as N coletas/amostras para a solicitação (ex: 8 coletas solicitadas),
 * garantindo que cada ponto tenha sua amostra individual na fila do laboratório.
 */
export function gerarAmostrasParaSolicitacao(
  solicitacao: SolicitacaoLaudoPotabilidadeItem,
  existingAmostras?: AmostraLaboratorioItem[],
  options?: {
    fiscalColetor?: string;
    statusInicial?: 'EM ANÁLISE' | 'COLETA REALIZADA' | 'CONFORME' | 'AGUARDANDO COLETA';
    gerarLaudosConcluidos?: boolean;
  }
): AmostraLaboratorioItem[] {
  const currentList = existingAmostras && existingAmostras.length > 0 ? existingAmostras : getAmostrasLaboratorio();
  const jaCriadas = findAmostrasBySolicitacao(solicitacao, currentList);
  const totalDesejado = Math.max(Number(solicitacao.quantidade_pontos) || 1, 1);

  if (jaCriadas.length >= totalDesejado) {
    return jaCriadas;
  }

  const baseCodigo = solicitacao.protocolo_1doc
    ? solicitacao.protocolo_1doc.replace(/\D/g, '').slice(-3) || '172'
    : '172';

  const locais = Array.isArray(solicitacao.locais_coleta) && solicitacao.locais_coleta.length > 0
    ? solicitacao.locais_coleta
    : ['Ponto de Água Potável / Manipulação'];

  const novasAmostras: AmostraLaboratorioItem[] = [...jaCriadas];
  const listToSave = [...currentList];

  for (let i = jaCriadas.length; i < totalDesejado; i++) {
    const pontoIndex = i + 1;
    const localDesc = locais[i] || `Ponto ${pontoIndex} - ${locais[0] || 'Torneira da Manipulação'}`;
    const codigoAmostra = totalDesejado > 1 ? `${baseCodigo}/${pontoIndex}` : `${baseCodigo}`;
    const isConcluido = options?.gerarLaudosConcluidos || solicitacao.status_solicitacao === 'LAUDO EMITIDO';

    const nova: AmostraLaboratorioItem = {
      id: `amostra-${solicitacao.id || 'sol'}-p${pontoIndex}-${Date.now() + i}`,
      codigo_amostra: codigoAmostra,
      protocolo: solicitacao.protocolo_1doc || '60.455/2026',
      mes_ano_referencia: 'OUTUBRO / 2026',
      responsavel_distribuicao: 'EMASA',
      interessado: solicitacao.razao_social,
      estabelecimento: solicitacao.nome_fantasia || solicitacao.razao_social,
      cnpj_cpf: solicitacao.cnpj_cpf,
      numero_alvara: 'Solicitado',
      endereco: solicitacao.endereco || 'Balneário Camboriú/SC',
      bairro: solicitacao.bairro || 'Centro',
      local_coleta: localDesc,
      ponto_coleta_nome: localDesc,
      data_coleta: solicitacao.data_solicitacao || new Date().toISOString().split('T')[0],
      hora_coleta: `08:${String(15 + (i * 10) % 45).padStart(2, '0')}`,
      fiscal_coletor: options?.fiscalColetor || 'Rita Sahd',
      tipo_matriz: 'ÁGUA POTÁVEL',
      observacoes: `Coleta referente à Solicitação 1Doc: ${solicitacao.protocolo_1doc} (Ponto ${pontoIndex} de ${totalDesejado}).`,
      aspecto: 'Límpido',
      odor: 'Inobjetável',
      cor: 'Incolor',
      ph: '7,0',
      equipamento_ph: 'pH indicator strips MQuant 0 – 14 Marca MERCK',
      cloro: (1.45 + (i * 0.03)).toFixed(2),
      equipamento_cloro: 'Chlorine Reagente for 10ml Sample(DLA-CL)',
      fluoreto: (0.70 + (i * 0.01)).toFixed(2),
      equipamento_fluor: 'Colorímetro Digital para Flúor (Modelo DLA-FL)',
      turbidez: (0.48 + (i * 0.02)).toFixed(2),
      equipamento_turbidez: 'Turbidímetro Digital modelo DLT-WV',
      coliformes_totais: 'AUSENTE',
      escherichia_coli: 'AUSENTE',
      status: isConcluido ? 'CONFORME' : (options?.statusInicial || 'EM ANÁLISE'),
      laudo_numero: isConcluido ? `${codigoAmostra}/2026` : undefined,
      data_resultado: isConcluido ? new Date().toLocaleDateString('pt-BR') : undefined,
      conclusao_laudo: 'Para os parâmetros analisados, com base na Portaria GM/MS Nº 888, de 4 maio de 2021. RESULTADO GERAL: Em acordo.',
      laboratorialista: 'ADRIANO GUARDINI',
      cargo_laboratorialista: 'FARMACÊUTICO E BIOQUÍMICO',
      registro_conselho: 'CRF/SC- 3321',
      responsavel_analise: 'Laboratório Central Municipal VISA',
      assinatura_digital_validada: isConcluido,
      assinatura_digital_data: isConcluido ? new Date().toISOString() : undefined,
      assinatura_digital_hash: isConcluido ? `VISA-LAUDO-${codigoAmostra}-SC` : undefined,
      laudo_assinatura_validada: isConcluido,
      laudo_assinatura_data: isConcluido ? new Date().toISOString() : undefined,
      laudo_assinatura_hash: isConcluido ? `VISA-LAUDO-${codigoAmostra}-SC` : undefined,
      created_at: new Date().toISOString()
    };

    novasAmostras.push(nova);
    listToSave.push(nova);
  }

  // Persiste na base local
  try {
    localStorage.setItem('visa_laboratorio', JSON.stringify(listToSave));
    window.dispatchEvent(new CustomEvent('visa_laboratorio_updated', { detail: listToSave }));
  } catch (err) {
    console.warn('Erro ao salvar amostras geradas no localStorage:', err);
  }

  return novasAmostras;
}

