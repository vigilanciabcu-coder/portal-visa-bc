import { supabase } from './supabase';
import { CnaeItem, CnaeGrouped, CnaeOption } from '../types';

// Chave para cache local
const CNAE_STORAGE_KEY = 'visa_cnae_database_cache';

// Base de dados padrão / inicial com exemplos reais da Vigilância Sanitária
export const INITIAL_CNAE_MOCK: CnaeItem[] = [
  // Exemplo trazido pelo usuário (com pergunta e variáveis)
  {
    subclasse: '1043-1/00',
    denominacao: 'O produto final é comestível?',
    risco: 'A Definir',
    observacao_variavel: 'Sim – Alto Risco\nNão – Baixo Risco'
  },
  {
    subclasse: '1043-1/00',
    denominacao: 'Fabricação de margarina e outras gorduras vegetais e de óleos não comestíveis de animais',
    risco: 'Alto Risco',
    observacao_variavel: 'Produto final comestível'
  },
  {
    subclasse: '1043-1/00',
    denominacao: 'Fabricação de margarina e outras gorduras vegetais e de óleos não comestíveis de animais',
    risco: 'Baixo Risco',
    observacao_variavel: 'Produto final não comestível'
  },

  // Alimentação / Restaurantes (Exemplo com variáveis)
  {
    subclasse: '5611-2/01',
    denominacao: 'Qual o porte e tipo de preparação dos alimentos?',
    risco: 'A Definir',
    observacao_variavel: 'Com manipulação de carnes/sushi/perecíveis – Alto Risco\nApenas lanches rápidos/cafeteria – Médio Risco'
  },
  {
    subclasse: '5611-2/01',
    denominacao: 'Restaurantes e similares',
    risco: 'Alto Risco',
    observacao_variavel: 'Com manipulação de carnes cruas, frutos do mar, buffet quente/frio ou preparo complexo'
  },
  {
    subclasse: '5611-2/01',
    denominacao: 'Restaurantes e similares',
    risco: 'Médio Risco',
    observacao_variavel: 'Apenas cafeteria, lanchonete simples sem manipulação de carnes cruas ou preparação prévia'
  },

  // Comércio Varejista de Mercadorias / Minimercados (Exemplo com variáveis)
  {
    subclasse: '4711-3/02',
    denominacao: 'Possui açougue, fiambreria, padaria ou fracionamento de produtos perecíveis no local?',
    risco: 'A Definir',
    observacao_variavel: 'Sim – Alto Risco\nNão – Baixo Risco'
  },
  {
    subclasse: '4711-3/02',
    denominacao: 'Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - minimercados, mercearias e armazéns',
    risco: 'Alto Risco',
    observacao_variavel: 'Com fracionamento, manipulação de frios, açougue ou padaria própria'
  },
  {
    subclasse: '4711-3/02',
    denominacao: 'Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - minimercados, mercearias e armazéns',
    risco: 'Baixo Risco',
    observacao_variavel: 'Apenas comercialização de produtos pré-embalados e industrializados (sem fracionamento)'
  },

  // Farmácias (Exemplo com variáveis)
  {
    subclasse: '4771-7/01',
    denominacao: 'Realiza manipulação magistral de medicamentos e fórmulas?',
    risco: 'A Definir',
    observacao_variavel: 'Sim – Alto Risco\nNão – Médio Risco'
  },
  {
    subclasse: '4771-7/01',
    denominacao: 'Comércio varejista de produtos farmacêuticos, sem manipulação de fórmulas',
    risco: 'Médio Risco',
    observacao_variavel: 'Drogaria tradicional, dispensação de medicamentos industrializados e serviços farmacêuticos básicos'
  },
  {
    subclasse: '4771-7/02',
    denominacao: 'Comércio varejista de produtos farmacêuticos, com manipulação de fórmulas',
    risco: 'Alto Risco',
    observacao_variavel: 'Farmácia de manipulação com laboratório de sólidos, líquidos ou estéreis'
  },

  // Saúde - Consultórios Médicos e Odontológicos
  {
    subclasse: '8630-5/03',
    denominacao: 'Atividade médica ambulatorial restrita a consultas',
    risco: 'Baixo Risco',
    observacao_variavel: 'Apenas consultas clínicas sem procedimentos invasivos, sem sedação e sem exames radiológicos'
  },
  {
    subclasse: '8630-5/04',
    denominacao: 'Atividade odontológica com procedimentos cirúrgicos e raio-x',
    risco: 'Alto Risco',
    observacao_variavel: 'Consultório odontológico com procedimentos cirúrgicos, esterilização de instrumentais e radiologia'
  },

  // Estética e Beleza
  {
    subclasse: '9602-5/01',
    denominacao: 'Cabeleireiros, manicure e pedicure',
    risco: 'Médio Risco',
    observacao_variavel: 'Serviços de embelezamento capilar, unhas e estética facial simples com esterilização de materiais'
  },
  {
    subclasse: '9602-5/02',
    denominacao: 'Atividades de estética e outros serviços de cuidados com a beleza',
    risco: 'Alto Risco',
    observacao_variavel: 'Procedimentos invasivos não cirúrgicos, aplicação de injetáveis, laser, micropigmentação ou tatuagem'
  },

  // Exemplos de Risco Fixo Baixo
  {
    subclasse: '4751-2/01',
    denominacao: 'Comércio varejista especializado de equipamentos e suprimentos de informática',
    risco: 'Baixo Risco',
    observacao_variavel: 'Atividade com dispensa de alvará sanitário prévio (Lei da Liberdade Econômica)'
  },
  {
    subclasse: '6201-5/01',
    denominacao: 'Desenvolvimento de programas de computador sob encomenda',
    risco: 'Baixo Risco',
    observacao_variavel: 'Atividade administrativa / tecnologia sem interesse para a vigilância sanitária'
  }
];

/**
 * Normaliza textos para busca e comparação
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Normaliza código de CNAE removendo pontuações
 */
export function normalizeCnaeCode(cnae: string | null | undefined): string {
  if (!cnae) return '';
  return cnae.replace(/[^0-9]/g, '').trim();
}

/**
 * Formata código de CNAE (ex: "1043100" -> "1043-1/00")
 */
export function formatCnaeCode(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 7) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 5)}/${digits.slice(5, 7)}`;
  }
  return raw.trim();
}

/**
 * Normaliza o valor da coluna Risco
 */
export function normalizeRiskLevel(riskRaw: string | null | undefined): 'Alto Risco' | 'Médio Risco' | 'Baixo Risco' | 'A Definir' | 'Dispensado' | string {
  if (!riskRaw) return 'Baixo Risco';
  const norm = normalizeText(riskRaw);

  if (norm.includes('definir') || norm.includes('variavel') || norm.includes('condicion') || norm.includes('depende')) {
    return 'A Definir';
  }
  if (norm.includes('alto') || norm.includes('iii') || norm.includes('3')) {
    return 'Alto Risco';
  }
  if (norm.includes('medio') || norm.includes('ii') || norm.includes('2')) {
    return 'Médio Risco';
  }
  if (norm.includes('baixo') || norm.includes(' i') || norm === 'i' || norm.includes('1') || norm.includes('dispensad')) {
    return 'Baixo Risco';
  }
  return riskRaw.trim();
}

/**
 * Agrupa as linhas cruas da tabela CNAE em estruturas com perguntas e opções fiéis ao Decreto
 */
export function groupCnaeRows(rawItems: CnaeItem[]): CnaeGrouped[] {
  const groupsMap = new Map<string, CnaeItem[]>();

  rawItems.forEach((item) => {
    const code = formatCnaeCode(item.subclasse) || item.subclasse.trim();
    if (!code) return;
    if (!groupsMap.has(code)) {
      groupsMap.set(code, []);
    }
    groupsMap.get(code)!.push(item);
  });

  const result: CnaeGrouped[] = [];

  groupsMap.forEach((items, code) => {
    // Procura por linha que define pergunta / "A Definir"
    const linhaPergunta = items.find((it) => {
      const r = normalizeText(it.risco);
      return r.includes('definir') || r.includes('variavel') || it.denominacao?.includes('?');
    });

    const temVariavel = Boolean(linhaPergunta) || items.length > 1;

    let pergunta: string | undefined = undefined;
    let denominacaoOficial = '';

    // Acha a denominação oficial (que não seja a pergunta do decreto)
    const linhaComNome = items.find((it) => {
      const isPergunta = it.denominacao && (it.denominacao.includes('?') || normalizeText(it.risco).includes('definir'));
      return it.denominacao && !isPergunta;
    });

    if (linhaComNome) {
      denominacaoOficial = linhaComNome.denominacao;
    } else if (items[0]) {
      denominacaoOficial = items[0].denominacao;
    }

    if (linhaPergunta) {
      pergunta = linhaPergunta.denominacao;
    }

    const opcoes: CnaeOption[] = [];

    // Linhas que representam opções com risco definido (filhas da pergunta no decreto)
    const linhasOpcoes = items.filter((it) => {
      const r = normalizeText(it.risco);
      return !r.includes('definir');
    });

    // Linhas da coluna 'Observação / Variável' da linha de pergunta (ex: "Sim – Alto Risco\nNão – Baixo Risco")
    const questionObsLines = (linhaPergunta?.observacao_variavel || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (linhasOpcoes.length > 0) {
      linhasOpcoes.forEach((op, idx) => {
        // Texto oficial exato do decreto: o que consta na coluna 'Observação / Variável'
        const textoDecreto = op.observacao_variavel || op.denominacao;
        
        // Se houver indicação de Sim/Não no cabeçalho da pergunta para esta opção:
        let prefixoSimNao = '';
        if (questionObsLines[idx]) {
          const matchSimNao = questionObsLines[idx].match(/^(Sim|Não|Nao)\b/i);
          if (matchSimNao) {
            prefixoSimNao = `${matchSimNao[1]} — `;
          }
        }

        opcoes.push({
          resposta: textoDecreto,
          risco: normalizeRiskLevel(op.risco),
          detalhes: prefixoSimNao ? `${prefixoSimNao}${textoDecreto}` : undefined
        });
      });
    } else if (linhaPergunta && questionObsLines.length > 0) {
      // Caso haja apenas a linha "A Definir" com as opções no texto da Observação / Variável
      questionObsLines.forEach((l) => {
        const parts = l.split(/–|-|:/);
        if (parts.length >= 2) {
          const resp = parts[0].trim();
          const rText = parts.slice(1).join('-').trim();
          opcoes.push({
            resposta: l.trim(),
            risco: normalizeRiskLevel(rText),
            detalhes: resp
          });
        } else {
          opcoes.push({
            resposta: l.trim(),
            risco: normalizeRiskLevel(linhaPergunta.risco),
            detalhes: l.trim()
          });
        }
      });
    }

    // Se não tem variável, o risco é fixo
    let riscoFixo: string | undefined = undefined;
    if (!temVariavel && items[0]) {
      riscoFixo = normalizeRiskLevel(items[0].risco);
    }

    result.push({
      subclasse: code,
      denominacaoOficial: denominacaoOficial || code,
      temVariavel,
      pergunta,
      riscoFixo,
      opcoes,
      linhasOriginais: items
    });
  });

  return result.sort((a, b) => a.subclasse.localeCompare(b.subclasse));
}

/**
 * Busca todos os registros diretamente da tabela CNAE no Supabase
 * Utiliza paginação em lotes de 1000 para carregar a base completa (sem limite de 1000)
 */
export async function fetchCnaesFromSupabase(): Promise<{ data: CnaeItem[]; fromSupabase: boolean; error?: string }> {
  if (!supabase) {
    return { data: getCachedCnaes(), fromSupabase: false };
  }

  try {
    let allRows: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    // Busca todos os registros em lotes (sem limite de 1000 do PostgREST)
    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      // Consulta tabela CNAE (ou cnae)
      let res = await supabase.from('CNAE').select('*').range(from, to);
      if (res.error || !res.data) {
        res = await supabase.from('cnae').select('*').range(from, to);
      }

      if (res.error) {
        console.warn('Erro ao consultar CNAE no Supabase:', res.error.message);
        break;
      }

      if (res.data && res.data.length > 0) {
        allRows = allRows.concat(res.data);
        if (res.data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    if (allRows.length > 0) {
      // Mapeia todas as colunas dinamicamente (suportando variações de maiúsculas/acentos)
      const mapped: CnaeItem[] = allRows
        .map((row: any, idx: number) => {
          const subclasse =
            row.subclasse ||
            row.Subclasse ||
            row.CNAE ||
            row.cnae ||
            row.codigo ||
            row.Codigo ||
            row['cnae_fiscal'] ||
            '';

          const denominacao =
            row.denominação ||
            row.Denominação ||
            row.denominacao ||
            row.Denominacao ||
            row.descricao ||
            row.Descricao ||
            row.atividade ||
            row.nome ||
            '';

          const risco =
            row.Risco ||
            row.risco ||
            row.grau_risco ||
            row.Grau_Risco ||
            row.nivel_risco ||
            'Baixo Risco';

          const observacao_variavel =
            row['observacao/variavel'] ||
            row['Observacao/Variavel'] ||
            row['Observação/Variável'] ||
            row.observacao ||
            row.Observacao ||
            row.Observação ||
            row.variavel ||
            row.Variavel ||
            row.Variável ||
            row.observacao_variavel ||
            row.condicionante ||
            '';

          return {
            id: row.id ? String(row.id) : `cnae_${idx}`,
            subclasse: String(subclasse).trim(),
            denominacao: String(denominacao).trim(),
            risco: String(risco).trim(),
            observacao_variavel: observacao_variavel ? String(observacao_variavel).trim() : '',
            created_at: row.created_at
          };
        })
        .filter((item) => Boolean(item.subclasse || item.denominacao));

      if (mapped.length > 0) {
        saveCnaesToCache(mapped);
        return { data: mapped, fromSupabase: true };
      }
    }
  } catch (err: any) {
    console.warn('Erro ao consultar Supabase para CNAE:', err);
    return { data: getCachedCnaes(), fromSupabase: false, error: err?.message };
  }

  // Se a tabela retornou 0 registros (ex: RLS ativo no Supabase), usa o cache ou mock
  const cached = getCachedCnaes();
  return { data: cached, fromSupabase: false };
}

/**
 * Salva e recupera do Cache Local (LocalStorage)
 */
export function getCachedCnaes(): CnaeItem[] {
  try {
    const saved = localStorage.getItem(CNAE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao ler cache de CNAE:', e);
  }
  return INITIAL_CNAE_MOCK;
}

export function saveCnaesToCache(items: CnaeItem[]): void {
  try {
    localStorage.setItem(CNAE_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Erro ao salvar cache de CNAE:', e);
  }
}

/**
 * Parser inteligente de CSV/TSV ou texto copiado da planilha
 */
export function parseCnaeCsv(text: string): CnaeItem[] {
  if (!text || !text.trim()) return [];

  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  const results: CnaeItem[] = [];

  // Detecta delimitador: Tabulação (\t), Ponto e vírgula (;), ou Vírgula (,)
  const firstLine = lines[0];
  let delimiter = '\t';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(';')) delimiter = ';';
  else if (firstLine.includes(',')) delimiter = ',';

  // Verifica se a primeira linha é cabeçalho
  let startIndex = 0;
  const lowerHeader = firstLine.toLowerCase();
  if (lowerHeader.includes('cnae') || lowerHeader.includes('subclasse') || lowerHeader.includes('denomina') || lowerHeader.includes('risco')) {
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parser simples respeitando aspas se houver
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        tokens.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    tokens.push(current.trim().replace(/^"|"$/g, ''));

    if (tokens.length >= 2) {
      const subclasse = formatCnaeCode(tokens[0]) || tokens[0];
      const denominacao = tokens[1] || '';
      const risco = tokens[2] || 'A Definir';
      const observacao_variavel = tokens[3] || '';

      if (subclasse || denominacao) {
        results.push({
          id: `cnae_import_${Date.now()}_${i}`,
          subclasse,
          denominacao,
          risco,
          observacao_variavel
        });
      }
    }
  }

  return results;
}

/**
 * Tenta salvar novo lote de CNAEs no Supabase (se permitido por RLS)
 */
export async function saveCnaesBatchToSupabase(items: CnaeItem[]): Promise<{ success: boolean; error?: string }> {
  // Sempre atualiza o cache local
  saveCnaesToCache(items);

  if (!supabase) {
    return { success: true };
  }

  try {
    const payload = items.map((it) => ({
      Subclasse: it.subclasse,
      Denominação: it.denominacao,
      Risco: it.risco,
      'Observação/Variável': it.observacao_variavel || ''
    }));

    // Tenta inserção
    const res = await supabase.from('CNAE').insert(payload);
    if (res.error) {
      console.warn('Aviso do Supabase ao salvar CNAE:', res.error.message);
      return {
        success: false,
        error: res.error.message
      };
    }
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao conectar ao Supabase'
    };
  }
}
