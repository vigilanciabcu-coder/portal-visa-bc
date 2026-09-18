import { supabase, isSupabaseConfigured } from './supabase';
import { UserProfile, EscalaItem, FeiranteItem, RecadoMural, FiscalizacaoItem, ChatMessage, ContabilidadeProfile, DocumentoContabilidade, PastaVisaItem, AlvaraSanitarioItem, ModeloAlvaraDocsItem } from '../types';

export { isSupabaseConfigured };

// Status helper
export function checkSupabaseStatus() {
  return {
    configured: isSupabaseConfigured,
    url: import.meta.env.VITE_SUPABASE_URL || 'Não configurado'
  };
}

// ==========================================
// 1. OPERADORES / PERMISSÕES (CADASTRO E EDIÇÃO)
// ==========================================

export async function fetchOperadoresFromSupabase(): Promise<UserProfile[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('operadores')
      .select('*')
      .order('nome_completo', { ascending: true });

    if (error) {
      console.warn('Supabase [operadores] retorno:', error.message);
      return null;
    }
    if (data && data.length > 0) {
      return data.map((item) => ({
        id: item.id,
        email: item.email || '',
        nome_completo: item.nome_completo || '',
        data_nascimento: item.data_nascimento || '',
        cargo: item.cargo || 'FISCAL DE VIGILÂNCIA SANITÁRIA',
        setor: item.setor || 'VIGILÂNCIA SANITÁRIA',
        conselho_regional: item.conselho_regional || '',
        nivel_acesso: item.nivel_acesso || (item.cargo === 'MASTER' || item.cargo === 'MASTER ADM' ? 'MASTER (TUDO)' : 'VISA (FISCAL)'),
        matricula: item.matricula || '',
        telefone: item.telefone || '',
        senha: item.senha || '123456',
        paginas_permitidas: Array.isArray(item.paginas_permitidas) ? item.paginas_permitidas : undefined
      }));
    }
  } catch (err) {
    console.warn('Erro ao conectar ao Supabase:', err);
  }
  return null;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function normalizeCargoForSupabaseEnum(cargo: string): string {
  const c = (cargo || '').trim().toUpperCase();
  if (c === 'MASTER' || c === 'MASTER ADM' || c.includes('ADMIN')) return 'MASTER';
  if (c === 'DIRETOR' || c.includes('DIRETOR')) return 'DIRETOR';
  if (c === 'AGENTE' || c.includes('ADMINISTRATIVO') || c.includes('SUPERVISOR')) return 'AGENTE';
  return 'FISCAL';
}

export async function saveOperadorToSupabase(user: UserProfile): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cleanEmail = (user.email || '').trim().toLowerCase();

    // 1. Procurar operador existente por ID (se for UUID) ou por e-mail no banco
    let existingRecord: any = null;

    if (user.id && uuidRegex.test(user.id)) {
      const { data: byId } = await supabase
        .from('operadores')
        .select('id, email, cargo')
        .eq('id', user.id)
        .maybeSingle();
      if (byId) existingRecord = byId;
    }

    if (!existingRecord && cleanEmail) {
      const { data: byEmail } = await supabase
        .from('operadores')
        .select('id, email, cargo')
        .ilike('email', cleanEmail)
        .maybeSingle();
      if (byEmail) existingRecord = byEmail;
    }

    const normCargo = normalizeCargoForSupabaseEnum(user.cargo);

    if (existingRecord) {
      const targetId = existingRecord.id;

      // 1ª Tentativa: Update completo com cargo original
      const payload1: any = {
        email: cleanEmail,
        nome_completo: (user.nome_completo || '').trim().toUpperCase(),
        data_nascimento: user.data_nascimento || '1990-01-01',
        cargo: user.cargo,
        setor: user.setor || 'VIGILÂNCIA SANITÁRIA',
        conselho_regional: (user.conselho_regional || '').trim().toUpperCase(),
        nivel_acesso: user.nivel_acesso || (user.cargo === 'MASTER' || user.cargo === 'MASTER ADM' ? 'MASTER (TUDO)' : 'VISA (FISCAL)'),
        matricula: (user.matricula || '').trim(),
        telefone: (user.telefone || '').trim(),
        senha: (user.senha || '123456').trim(),
        paginas_permitidas: user.paginas_permitidas || []
      };

      let { error: err1 } = await supabase
        .from('operadores')
        .update(payload1)
        .eq('id', targetId);

      if (!err1) return true;

      // 2ª Tentativa: Se der erro (ex: enum de cargo ou novas colunas), tenta com cargo normalizado para o enum
      console.warn('Update completo inicial falhou no Supabase, tentando com cargo normalizado:', err1.message);
      const payload2: any = {
        ...payload1,
        cargo: normCargo
      };

      let { error: err2 } = await supabase
        .from('operadores')
        .update(payload2)
        .eq('id', targetId);

      if (!err2) return true;

      // 3ª Tentativa: Se falhar por colunas setor/nivel_acesso não existirem, payload base com cargo normalizado
      console.warn('Update com cargo normalizado falhou, tentando payload base:', err2.message);
      const payload3: any = {
        email: cleanEmail,
        nome_completo: (user.nome_completo || '').trim().toUpperCase(),
        data_nascimento: user.data_nascimento || '1990-01-01',
        cargo: normCargo,
        matricula: (user.matricula || '').trim(),
        senha: (user.senha || '123456').trim()
      };

      let { error: err3 } = await supabase
        .from('operadores')
        .update(payload3)
        .eq('id', targetId);

      if (!err3) return true;

      // 4ª Tentativa: Update por email
      let { error: err4 } = await supabase
        .from('operadores')
        .update(payload3)
        .ilike('email', cleanEmail);

      if (err4) {
        console.error('Erro definitivo ao atualizar operador no Supabase:', err4.message);
        return false;
      }
      return true;
    } else {
      // Novo cadastro
      const newId = user.id && uuidRegex.test(user.id) ? user.id : generateUUID();

      // 1ª Tentativa: Insert completo com cargo original
      const insertPayload1: any = {
        id: newId,
        email: cleanEmail,
        nome_completo: (user.nome_completo || '').trim().toUpperCase(),
        data_nascimento: user.data_nascimento || '1990-01-01',
        cargo: user.cargo,
        setor: user.setor || 'VIGILÂNCIA SANITÁRIA',
        conselho_regional: (user.conselho_regional || '').trim().toUpperCase(),
        nivel_acesso: user.nivel_acesso || (user.cargo === 'MASTER' || user.cargo === 'MASTER ADM' ? 'MASTER (TUDO)' : 'VISA (FISCAL)'),
        matricula: (user.matricula || '').trim(),
        telefone: (user.telefone || '').trim(),
        senha: (user.senha || '123456').trim(),
        paginas_permitidas: user.paginas_permitidas || []
      };

      const { error: insErr1 } = await supabase
        .from('operadores')
        .insert(insertPayload1);

      if (!insErr1) return true;

      // 2ª Tentativa: Insert com cargo normalizado
      console.warn('Insert completo falhou, tentando com cargo normalizado:', insErr1.message);
      const insertPayload2: any = {
        ...insertPayload1,
        cargo: normCargo
      };

      const { error: insErr2 } = await supabase
        .from('operadores')
        .insert(insertPayload2);

      if (!insErr2) return true;

      // 3ª Tentativa: Insert base sem setor/nivel_acesso
      console.warn('Insert com cargo normalizado falhou, tentando insert base:', insErr2.message);
      const insertPayload3: any = {
        id: newId,
        email: cleanEmail,
        nome_completo: (user.nome_completo || '').trim().toUpperCase(),
        data_nascimento: user.data_nascimento || '1990-01-01',
        cargo: normCargo,
        matricula: (user.matricula || '').trim(),
        senha: (user.senha || '123456').trim()
      };

      const { error: insErr3 } = await supabase
        .from('operadores')
        .insert(insertPayload3);

      if (!insErr3) return true;

      // 4ª Tentativa: Upsert base
      const { error: upsertErr } = await supabase
        .from('operadores')
        .upsert(insertPayload3);

      if (upsertErr) {
        console.error('Erro ao inserir novo operador no Supabase:', upsertErr.message);
        return false;
      }
      return true;
    }
  } catch (err) {
    console.error('Exceção ao salvar operador no Supabase:', err);
    return false;
  }
}

export async function deleteOperadorFromSupabase(userId: string, userEmail?: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (userId && uuidRegex.test(userId)) {
      const { error } = await supabase.from('operadores').delete().eq('id', userId);
      if (!error) return true;
    }

    if (userEmail) {
      const { error } = await supabase.from('operadores').delete().eq('email', userEmail);
      if (!error) return true;
    }

    return false;
  } catch (err) {
    console.error('Exceção ao deletar operador no Supabase:', err);
    return false;
  }
}

// Inicializar banco com lista padrão se estiver vazio
export async function seedInitialOperadoresIfEmpty(initialUsers: UserProfile[]) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { data } = await supabase.from('operadores').select('id').limit(1);
    if (!data || data.length === 0) {
      console.log('Populando tabela operadores no Supabase...');
      for (const u of initialUsers) {
        await saveOperadorToSupabase(u);
      }
    }
  } catch (e) {
    console.warn('Semeação de operadores ignorada:', e);
  }
}

// ==========================================
// 2. FISCALIZAÇÕES (REGISTRO E TEMPO REAL)
// ==========================================

export async function fetchFiscalizacoesFromSupabase(): Promise<FiscalizacaoItem[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('fiscalizacoes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase [fiscalizacoes] retorno:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id || generateUUID(),
        protocolo: item.protocolo || '',
        dataHora: item.data_hora || item.dataHora || new Date().toISOString(),
        fiscalId: item.fiscal_id || item.fiscalId || '',
        fiscalNome: item.fiscal_nome || item.fiscalNome || 'Fiscal Sanitário',
        estabelecimento: typeof item.estabelecimento === 'string' ? JSON.parse(item.estabelecimento) : (item.estabelecimento || {
          nomeFantasia: '',
          razaoSocial: '',
          cnpjCpf: '',
          tipo: 'Outro',
          bairro: 'Centro',
          endereco: '',
          numero: '',
          responsavel: '',
          telefone: ''
        }),
        tipoVistoria: item.tipo_vistoria || item.tipoVistoria || 'ROTINA',
        risco: item.risco || 'MÉDIO',
        status: item.status || 'CONCLUIDA',
        checklists: typeof item.checklists === 'string' ? JSON.parse(item.checklists) : (item.checklists || []),
        irregularidadesEncontradas: typeof item.irregularidades === 'string' ? JSON.parse(item.irregularidades) : (item.irregularidades || item.irregularidadesEncontradas || []),
        medidasAdotadas: item.medidas_adotadas || item.medidasAdotadas || '',
        prazoAdequacaoDias: item.prazo_adequacao_dias || item.prazoAdequacaoDias || 0,
        observacoesFiscais: item.observacoes_fiscais || item.observacoesFiscais || '',
        fotosUrl: typeof item.fotos_url === 'string' ? JSON.parse(item.fotos_url) : (item.fotos_url || item.fotosUrl || []),
        assinaturaInspector: item.assinatura_inspector || item.assinaturaInspector || '',
        assinaturaResponsavel: item.assinatura_responsavel || item.assinaturaResponsavel || '',
        coordenadas: typeof item.coordenadas === 'string' ? JSON.parse(item.coordenadas) : item.coordenadas,
        parecerIA: item.parecer_ia || item.parecerIA || ''
      }));
    }
  } catch (err) {
    console.warn('Erro ao carregar fiscalizações do Supabase:', err);
  }
  return null;
}

export async function saveFiscalizacaoToSupabase(item: FiscalizacaoItem): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    let validId = item.id;
    if (!validId || validId.length < 30 || validId.startsWith('fisc-')) {
      validId = generateUUID();
    }

    const payload = {
      id: validId,
      protocolo: item.protocolo,
      data_hora: item.dataHora,
      fiscal_id: item.fiscalId,
      fiscal_nome: item.fiscalNome,
      estabelecimento: item.estabelecimento,
      tipo_vistoria: item.tipoVistoria,
      risco: item.risco,
      status: item.status,
      checklists: item.checklists,
      irregularidades: item.irregularidadesEncontradas,
      medidas_adotadas: item.medidasAdotadas,
      prazo_adequacao_dias: item.prazoAdequacaoDias || 0,
      observacoes_fiscais: item.observacoesFiscais,
      fotos_url: item.fotosUrl,
      assinatura_inspector: item.assinaturaInspector || '',
      assinatura_responsavel: item.assinaturaResponsavel || '',
      coordenadas: item.coordenadas || null,
      parecer_ia: item.parecerIA || ''
    };

    const { error } = await supabase.from('fiscalizacoes').upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Upsert de fiscalização falhou com esquema detalhado:', error.message, 'Tentando modelo simplificado JSON...');
      // Tentativa de fallback simplificada caso a tabela tenha colunas genéricas
      const fallbackPayload = {
        id: validId,
        protocolo: item.protocolo,
        fiscal_nome: item.fiscalNome,
        status: item.status,
        dados_json: JSON.stringify(item)
      };
      const { error: fallbackErr } = await supabase.from('fiscalizacoes').upsert(fallbackPayload, { onConflict: 'id' });
      if (fallbackErr) {
        console.error('Erro ao salvar fiscalização no Supabase:', fallbackErr.message);
        return false;
      }
    }
    console.log('Fiscalização salva com sucesso no Supabase!');
    return true;
  } catch (err) {
    console.error('Exceção ao salvar fiscalização no Supabase:', err);
    return false;
  }
}

// ==========================================
// 3. ESCALAS / PLANTÕES (REGISTRO E INTEGRAÇÃO)
// ==========================================

export async function fetchEscalasFromSupabase(): Promise<EscalaItem[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('escala')
      .select('*')
      .order('data', { ascending: true });

    if (error) {
      console.warn('Supabase [escala] retorno:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      return data.map((item: any) => ({
        id: String(item.id),
        data: item.data || '',
        tipo: (item.tipo || 'PLANTAO') as any,
        servidores: item.servidores || item.texto_escala || '',
        descricao: item.descricao || item.texto_escala || ''
      }));
    }
  } catch (err) {
    console.warn('Erro ao carregar escalas do Supabase:', err);
  }
  return null;
}

export async function saveEscalaToSupabase(item: EscalaItem): Promise<EscalaItem | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const numericId = Number(item.id);
    const isNum = !isNaN(numericId) && numericId > 0;

    const payload: any = {
      data: item.data,
      tipo: item.tipo,
      servidores: item.servidores,
      texto_escala: item.descricao || ''
    };

    if (isNum) {
      payload.id = numericId;
      const { data, error } = await supabase.from('escala').upsert(payload, { onConflict: 'id' }).select();
      if (error) {
        console.warn('Upsert de escala com ID falhou no Supabase:', error.message);
        delete payload.id;
        const { data: insData, error: insErr } = await supabase.from('escala').insert(payload).select();
        if (insErr) {
          console.error('Erro ao salvar escala no Supabase:', insErr.message);
          return null;
        }
        if (insData && insData[0]) {
          return {
            id: String(insData[0].id),
            data: insData[0].data || item.data,
            tipo: insData[0].tipo || item.tipo,
            servidores: insData[0].servidores || item.servidores,
            descricao: insData[0].texto_escala || item.descricao || ''
          };
        }
      } else if (data && data[0]) {
        return {
          id: String(data[0].id),
          data: data[0].data || item.data,
          tipo: data[0].tipo || item.tipo,
          servidores: data[0].servidores || item.servidores,
          descricao: data[0].texto_escala || item.descricao || ''
        };
      }
    } else {
      const { data, error } = await supabase.from('escala').insert(payload).select();
      if (error) {
        console.error('Erro ao inserir escala no Supabase:', error.message);
        return null;
      }
      if (data && data[0]) {
        return {
          id: String(data[0].id),
          data: data[0].data || item.data,
          tipo: data[0].tipo || item.tipo,
          servidores: data[0].servidores || item.servidores,
          descricao: data[0].texto_escala || item.descricao || ''
        };
      }
    }
    return item;
  } catch (err) {
    console.error('Exceção ao salvar escala no Supabase:', err);
    return null;
  }
}

export async function deleteEscalaFromSupabase(itemId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const numId = Number(itemId);
    if (!isNaN(numId)) {
      const { error } = await supabase.from('escala').delete().eq('id', numId);
      if (error) {
        console.error('Erro ao deletar escala no Supabase por id numérico:', error.message);
        return false;
      }
      return true;
    } else {
      const { error } = await supabase.from('escala').delete().eq('id', itemId);
      if (error) {
        console.error('Erro ao deletar escala no Supabase:', error.message);
        return false;
      }
      return true;
    }
  } catch (err) {
    console.error('Exceção ao deletar escala no Supabase:', err);
    return false;
  }
}

// ==========================================
// 4. COMUNICAÇÃO INTERNA / CHAT (PORTAL_CHAT)
// ==========================================

export async function fetchChatFromSupabase(): Promise<ChatMessage[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('portal_chat')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.warn('Supabase [portal_chat] retorno:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      return data.map((item: any) => {
        let timeStr = '';
        if (item.created_at) {
          try {
            const d = new Date(item.created_at);
            timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          } catch {
            timeStr = '';
          }
        }
        return {
          id: String(item.id),
          sender: item.nome_usuario || 'Operador',
          role: item.perfil_id?.includes('DIR') ? 'DIRETOR' : item.perfil_id?.includes('MST') ? 'MASTER' : 'OPERADOR',
          time: timeStr,
          text: item.mensagem || '',
          perfil_id: item.perfil_id || '',
          created_at: item.created_at
        };
      });
    }
  } catch (err) {
    console.warn('Erro ao carregar chat do Supabase:', err);
  }
  return null;
}

export async function sendChatMessageToSupabase(
  nome_usuario: string,
  mensagem: string,
  perfil_id?: string
): Promise<ChatMessage | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const payload = {
      nome_usuario,
      mensagem,
      perfil_id: perfil_id || ''
    };

    const { data, error } = await supabase
      .from('portal_chat')
      .insert(payload)
      .select();

    if (error) {
      console.error('Erro ao enviar mensagem no portal_chat:', error.message);
      return null;
    }

    if (data && data[0]) {
      const item = data[0];
      const d = item.created_at ? new Date(item.created_at) : new Date();
      return {
        id: String(item.id),
        sender: item.nome_usuario,
        role: item.perfil_id?.includes('DIR') ? 'DIRETOR' : item.perfil_id?.includes('MST') ? 'MASTER' : 'OPERADOR',
        time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        text: item.mensagem,
        perfil_id: item.perfil_id,
        created_at: item.created_at
      };
    }
    return null;
  } catch (err) {
    console.error('Exceção ao enviar mensagem no Supabase:', err);
    return null;
  }
}

export async function deleteChatMessageFromSupabase(messageId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from('portal_chat').delete().eq('id', messageId);
    if (error) {
      console.error('Erro ao excluir mensagem no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exceção ao excluir mensagem do chat no Supabase:', err);
    return false;
  }
}

export function subscribeToChatRealtime(onNewMessage: (msg: ChatMessage) => void) {
  if (!isSupabaseConfigured || !supabase) return () => {};

  try {
    const channel = supabase
      .channel('public:portal_chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'portal_chat' },
        (payload) => {
          const item = payload.new;
          if (item) {
            const d = item.created_at ? new Date(item.created_at) : new Date();
            onNewMessage({
              id: String(item.id),
              sender: item.nome_usuario || 'Operador',
              role: item.perfil_id?.includes('DIR') ? 'DIRETOR' : item.perfil_id?.includes('MST') ? 'MASTER' : 'OPERADOR',
              time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              text: item.mensagem || '',
              perfil_id: item.perfil_id,
              created_at: item.created_at
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Erro ao assinar canal de tempo real do chat:', err);
    return () => {};
  }
}

// ==========================================
// 5. PROCESSOS SANITÁRIOS NO SUPABASE
// ==========================================
export async function fetchProcessosFromSupabase(): Promise<any[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('processos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase [processos] retorno:', error.message);
      return null;
    }
    return data || [];
  } catch (err) {
    console.warn('Erro ao buscar processos do Supabase:', err);
    return null;
  }
}

function safeDateForPg(d?: string | null): string | null {
  if (!d || typeof d !== 'string' || !d.trim()) return null;
  const s = d.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const parts = s.split('/');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return null;
}

export async function saveProcessoToSupabase(proc: any): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const payload: any = {
      num_processo: proc.num_processo || proc.numProcesso || `1DOC-${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
      data_protocolo: safeDateForPg(proc.data_protocolo || proc.dataProtocolo) || new Date().toISOString().split('T')[0],
      cnpj_cpf: proc.cnpj_cpf || proc.cnpjCpf || '',
      razao_social: proc.razao_social || proc.razaoSocial || '',
      nome_fantasia: proc.nome_fantasia || proc.nomeFantasia || '',
      assunto: proc.assunto || 'ALVARÁ SANITÁRIO',
      bairro: proc.bairro || 'Centro',
      endereco: proc.endereco || '',
      numero_complemento: proc.numero_complemento || proc.numeroComplemento || '',
      cep: proc.cep || '',
      fiscal_responsavel: proc.fiscal_responsavel || proc.fiscalResponsavel || 'Carlos Eduardo Silva',
      status: proc.status || 'EM ANÁLISE',
      validade: safeDateForPg(proc.validade),
      observacoes: proc.observacoes || '',
      cnaes: proc.cnaes || [],
      setor: proc.setor || '',
      motivacao: proc.motivacao || '',
      data_entrada: safeDateForPg(proc.data_entrada || proc.dataEntrada),
      data_1doc: safeDateForPg(proc.data_1doc || proc.data1Doc),
      venc_1doc: safeDateForPg(proc.venc_1doc || proc.venc1Doc),
      prot_1doc: proc.prot_1doc || proc.prot1Doc || '',
      pasta: proc.pasta || '',
      situacao_cadastral: proc.situacao_cadastral || proc.situacaoCadastral || 'ATIVA',
      motivo_situacao: proc.motivo_situacao || '',
      data_situacao: safeDateForPg(proc.data_situacao),
      venc_licenca: safeDateForPg(proc.venc_licenca || proc.vencLicenca),
      grau_risco: proc.grau_risco || proc.grauRisco || 'MÉDIO RISCO',
      data_entregue_fiscal: safeDateForPg(proc.data_entregue_fiscal || proc.dataEntregueFiscal),
      agendado_para: safeDateForPg(proc.agendado_para || proc.agendadoPara),
      conclusao: proc.conclusao || '',
      pas: proc.pas || '',
      updated_at: new Date().toISOString()
    };

    const isUUID = proc.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(proc.id);
    let res;
    if (isUUID) {
      res = await supabase.from('processos').update(payload).eq('id', proc.id);
    } else {
      res = await supabase.from('processos').upsert(payload, { onConflict: 'num_processo' });
    }

    if (res.error) {
      console.warn('Erro ao salvar processo no Supabase:', res.error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exceção ao salvar processo no Supabase:', err);
    return false;
  }
}

export async function deleteProcessoFromSupabase(procId: string, numProcesso?: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const isUUID = procId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(procId);
    if (isUUID) {
      const { error } = await supabase.from('processos').delete().eq('id', procId);
      if (!error) return true;
    }
    if (numProcesso) {
      const { error } = await supabase.from('processos').delete().eq('num_processo', numProcesso);
      if (!error) return true;
    }
    return true;
  } catch (err) {
    console.error('Exceção ao deletar processo do Supabase:', err);
    return false;
  }
}

// ==========================================
// 6. MURAL DE AVISOS / RECADO MURAL
// ==========================================

function formatToISODate(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  // Se já for YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // Se for DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('/');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return new Date().toISOString().split('T')[0];
}

function formatFromISOToBR(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString('pt-BR');
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const onlyDate = dateStr.split('T')[0];
    const parts = onlyDate.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export async function fetchMuralFromSupabase(): Promise<RecadoMural[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    // Tenta primeiro em recados_mural (tabela existente no Supabase), com fallback para mural
    let { data, error } = await supabase
      .from('recados_mural')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      const fallback = await supabase
        .from('mural')
        .select('*')
        .order('created_at', { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.warn('Supabase [mural] retorno:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      return data.map((item: any) => ({
        id: String(item.id),
        autor: item.autor || 'Coordenação',
        cargo: item.cargo || 'MASTER',
        data: item.data ? formatFromISOToBR(item.data) : (item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : 'Hoje'),
        titulo: item.titulo || '',
        conteudo: item.conteudo || item.texto || item.mensagem || '',
        prioridade: (item.prioridade || 'NORMAL') as any
      }));
    }
    return [];
  } catch (err) {
    console.warn('Erro ao buscar mural do Supabase:', err);
  }
  return null;
}

export async function saveRecadoToSupabase(recado: RecadoMural): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const payload: any = {
      autor: recado.autor,
      cargo: recado.cargo,
      data: formatToISODate(recado.data),
      titulo: recado.titulo,
      conteudo: recado.conteudo,
      prioridade: recado.prioridade
    };

    const isUUID = recado.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recado.id);
    const numericId = Number(recado.id);
    const isNum = !isNaN(numericId) && numericId > 0;

    // Tenta primeiro em recados_mural, depois em mural
    const tablesToTry = ['recados_mural', 'mural'];

    for (const tbl of tablesToTry) {
      try {
        if (isUUID || isNum) {
          payload.id = isUUID ? recado.id : numericId;
          const { error } = await supabase.from(tbl).upsert(payload, { onConflict: 'id' });
          if (!error) return true;
        }
        
        // Se id for string local temporária (como 'rec-1234' ou 'bday-1234')
        const insertPayload = { ...payload };
        delete insertPayload.id;
        const { error: insErr } = await supabase.from(tbl).insert(insertPayload);
        if (!insErr) return true;
      } catch (tableErr) {
        console.warn(`Tentativa na tabela ${tbl} falhou:`, tableErr);
      }
    }
    return false;
  } catch (err) {
    console.warn('Exceção ao salvar recado no Supabase:', err);
    return false;
  }
}

export async function deleteRecadoFromSupabase(recadoId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const isUUID = recadoId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recadoId);
    const numId = Number(recadoId);
    const isNum = !isNaN(numId) && numId > 0;

    const tablesToTry = ['recados_mural', 'mural'];

    for (const tbl of tablesToTry) {
      if (isUUID) {
        const { error } = await supabase.from(tbl).delete().eq('id', recadoId);
        if (!error) return true;
      } else if (isNum) {
        const { error } = await supabase.from(tbl).delete().eq('id', numId);
        if (!error) return true;
      }
    }
    return true;
  } catch (err) {
    console.warn('Exceção ao deletar recado do Supabase:', err);
    return false;
  }
}

// ==========================================
// 7. LABORATÓRIO / AMOSTRAS E LAUDOS NO SUPABASE
// ==========================================

export async function fetchLaboratorioFromSupabase(): Promise<any[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const tablesToTry = ['laboratorio', 'laudos_laboratorio', 'amostras_laboratorio'];
    for (const tbl of tablesToTry) {
      const { data, error } = await supabase
        .from(tbl)
        .select('*')
        .order('data_coleta', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((item: any) => {
          const p = item.parametros || {};
          return {
            id: String(item.id || `lab-${item.codigo_amostra || Math.random()}`),
            codigo_amostra: String(item.codigo_amostra || item.codigo || `LAB-${item.id}`),
            protocolo: p.protocolo || item.protocolo || '',
            mes_ano_referencia: p.mes_ano_referencia || item.mes_ano_referencia || '',
            responsavel_distribuicao: p.responsavel_distribuicao || item.responsavel_distribuicao || 'EMASA',
            interessado: p.interessado || item.interessado || item.estabelecimento || 'MERCADO BAGÉ LTDA',
            cnpj_cpf: item.cnpj_cpf || p.cnpj_cpf || '',
            numero_alvara: p.numero_alvara || item.numero_alvara || 'Solicitado',
            data_coleta: item.data_coleta || new Date().toISOString().split('T')[0],
            hora_coleta: item.hora_coleta || '08:20',
            ponto_coleta_id: p.ponto_coleta_id || item.ponto_coleta_id || '',
            ponto_coleta_nome: p.ponto_coleta_nome || item.ponto_coleta_nome || '',
            local_coleta: item.local_coleta || p.local_coleta || '',
            endereco: p.endereco || item.endereco || '',
            bairro: item.bairro || 'Centro',
            estabelecimento: item.estabelecimento || p.interessado || 'REDE PÚBLICA',
            fiscal_coletor: item.fiscal_coletor || 'Rita Sahd',
            tipo_matriz: item.tipo_matriz || 'ÁGUA POTÁVEL',
            temperatura_coleta: item.temperatura_coleta || '',
            
            // Organolépticas
            aspecto: p.aspecto || item.aspecto || 'Límpido',
            odor: p.odor || item.odor || 'Inobjetável',
            cor: p.cor || item.cor || 'Incolor',

            // Físico-Química
            ph: p.ph || item.ph || '7,0',
            equipamento_ph: p.equipamento_ph || item.equipamento_ph || 'pH indicator strips MQuant 0 – 14 Marca MERCK',
            cloro: p.cloro || item.cloro || '1,59',
            equipamento_cloro: p.equipamento_cloro || item.equipamento_cloro || 'Chlorine Reagente for 10ml Sample(DLA-CL)',
            fluoreto: p.fluoreto || item.fluoreto || '0,72',
            equipamento_fluor: p.equipamento_fluor || item.equipamento_fluor || 'Colorímetro Digital para Flúor (Modelo DLA-FL)',
            turbidez: p.turbidez || item.turbidez || '0,52',
            equipamento_turbidez: p.equipamento_turbidez || item.equipamento_turbidez || 'Turbidímetro Digital modelo DLT-WV',
            fluoretacao: p.fluoretacao || item.fluoretacao || 'CONFORME',

            // Microbiológicas
            coliformes_totais: p.coliformes_totais || item.coliformes_totais || 'AUSENTE',
            metodologia_coliformes_totais: p.metodologia_coliformes_totais || item.metodologia_coliformes_totais || 'Kit Analisis Colilert –DST-P/A em cartela QUANTY-TRAY/2000-MARCA IDEXX+QUANTY TRAY SEALER – Model 2 X +estufa FABBE PRIMAR 36ºC100 ml por 24 horas',
            escherichia_coli: p.escherichia_coli || item.escherichia_coli || 'AUSENTE',
            metodologia_escherichia_coli: p.metodologia_escherichia_coli || item.metodologia_escherichia_coli || 'KIT ANALISES COLILERT-DST-P/A em cartela QUANTY-TRAY/2000-marca IDEXX+QUANTY TRAY SEALER – Model 2 X + estufa FABBE PRIMAR 36ºC100ml por 24 horas + LONG WAVE Ultravioleta 365 NM – marca CE.',

            // Responsável Técnico e Conclusão
            status: item.status || 'CONFORME',
            laudo_numero: item.laudo_numero || '',
            data_resultado: item.data_resultado || null,
            conclusao_laudo: item.conclusao_laudo || 'Para os parâmetros analisados, a amostra está em ACORDO com a Portaria GM/MS Nº 888, de 4 maio de 2021. Água PRÓPRIA para o consumo humano, considerando os parâmetros descritos.',
            laboratorialista: p.laboratorialista || item.laboratorialista || 'ADRIANO GUARDINI',
            cargo_laboratorialista: p.cargo_laboratorialista || item.cargo_laboratorialista || 'FARMACÊUTICO E BIOQUIMICO',
            registro_conselho: p.registro_conselho || item.registro_conselho || 'CRF/SC- 3321',
            responsavel_analise: item.responsavel_analise || 'Laboratório Central Municipal VISA',
            assinatura_digital_validada: p.assinatura_digital_validada === true || !!p.assinatura_digital_hash || item.assinatura_digital_validada === true,
            assinatura_digital_data: p.assinatura_digital_data || item.assinatura_digital_data || undefined,
            assinatura_digital_hash: p.assinatura_digital_hash || item.assinatura_digital_hash || undefined,
            observacoes: item.observacoes || 'ANÁLISE SOLICITADA PARA VERIFICAR QUALIDADE DA ÁGUA PARA CONSUMO HUMANO',
            parametros: item.parametros || {},
            created_at: item.created_at
          };
        });
      }
    }
    return null;
  } catch (err) {
    console.warn('Erro ao carregar amostras de laboratório do Supabase:', err);
    return null;
  }
}

function isValidDateString(val: any): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed || trimmed === '') return false;
  // Regex for YYYY-MM-DD
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
}

export async function saveLaboratorioToSupabaseWithDetail(amostra: any): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Supabase não está configurado nas variáveis de ambiente (.env).' };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const hasValidUUID = amostra.id && uuidRegex.test(String(amostra.id));
  const validUUID = hasValidUUID ? String(amostra.id) : generateUUID();

  const cleanDataColeta = isValidDateString(amostra.data_coleta)
    ? amostra.data_coleta
    : new Date().toISOString().split('T')[0];

  const cleanDataResultado = isValidDateString(amostra.data_resultado)
    ? amostra.data_resultado
    : null;

  // JSON completo com todos os parâmetros físico-químicos, microbiológicos, organolépticos e metadados
  const parametrosPayload = {
    ...(amostra.parametros || {}),
    protocolo: amostra.protocolo || '',
    mes_ano_referencia: amostra.mes_ano_referencia || '',
    responsavel_distribuicao: amostra.responsavel_distribuicao || 'EMASA',
    interessado: amostra.interessado || amostra.estabelecimento || '',
    numero_alvara: amostra.numero_alvara || 'Solicitado',
    ponto_coleta_id: amostra.ponto_coleta_id || '',
    ponto_coleta_nome: amostra.ponto_coleta_nome || '',
    endereco: amostra.endereco || '',
    
    // Organolépticas
    aspecto: amostra.aspecto || 'Límpido',
    odor: amostra.odor || 'Inobjetável',
    cor: amostra.cor || 'Incolor',

    // Físico-Química
    ph: amostra.ph || '7,0',
    equipamento_ph: amostra.equipamento_ph || 'pH indicator strips MQuant 0 – 14 Marca MERCK',
    cloro: amostra.cloro || '1,59',
    equipamento_cloro: amostra.equipamento_cloro || 'Chlorine Reagente for 10ml Sample(DLA-CL)',
    fluoreto: amostra.fluoreto || '0,72',
    equipamento_fluor: amostra.equipamento_fluor || 'Colorímetro Digital para Flúor (Modelo DLA-FL)',
    turbidez: amostra.turbidez || '0,52',
    equipamento_turbidez: amostra.equipamento_turbidez || 'Turbidímetro Digital modelo DLT-WV',
    fluoretacao: amostra.fluoretacao || 'CONFORME',

    // Microbiológicas
    coliformes_totais: amostra.coliformes_totais || 'AUSENTE',
    metodologia_coliformes_totais: amostra.metodologia_coliformes_totais || '',
    escherichia_coli: amostra.escherichia_coli || 'AUSENTE',
    metodologia_escherichia_coli: amostra.metodologia_escherichia_coli || '',

    // Responsável Técnico e Assinatura
    laboratorialista: amostra.laboratorialista || 'ADRIANO GUARDINI',
    cargo_laboratorialista: amostra.cargo_laboratorialista || 'FARMACÊUTICO E BIOQUIMICO',
    registro_conselho: amostra.registro_conselho || 'CRF/SC- 3321',
    assinatura_digital_validada: amostra.assinatura_digital_validada || false,
    assinatura_digital_data: amostra.assinatura_digital_data || null,
    assinatura_digital_hash: amostra.assinatura_digital_hash || null,
  };

  // Payload que espelha exatamente as colunas nativas da tabela laboratorio
  const dbPayload: any = {
    id: validUUID,
    codigo_amostra: String(amostra.codigo_amostra || `LAB-${Date.now()}`),
    cnpj_cpf: amostra.cnpj_cpf || '',
    local_coleta: amostra.local_coleta || '',
    bairro: amostra.bairro || 'Centro',
    estabelecimento: amostra.estabelecimento || amostra.interessado || 'REDE MUNICIPAL',
    data_coleta: cleanDataColeta,
    hora_coleta: amostra.hora_coleta || '08:20',
    fiscal_coletor: amostra.fiscal_coletor || 'Rita Sahd',
    tipo_matriz: amostra.tipo_matriz || 'ÁGUA POTÁVEL',
    temperatura_coleta: amostra.temperatura_coleta || '',
    observacoes: amostra.observacoes || '',
    status: amostra.status || 'CONFORME',
    laudo_numero: amostra.laudo_numero || '',
    conclusao_laudo: amostra.conclusao_laudo || '',
    data_resultado: cleanDataResultado,
    responsavel_analise: amostra.responsavel_analise || 'Laboratório Central Municipal VISA',
    parametros: parametrosPayload,
    updated_at: new Date().toISOString()
  };

  const tablesToTry = ['laboratorio', 'laudos_laboratorio', 'amostras_laboratorio'];
  let lastErrorMessage = '';

  for (const tbl of tablesToTry) {
    try {
      // 1ª Tentativa: Upsert por codigo_amostra
      const { error: err1 } = await supabase.from(tbl).upsert(dbPayload, { onConflict: 'codigo_amostra' });
      if (!err1) return { ok: true };

      // 2ª Tentativa: Upsert por id
      const { error: err2 } = await supabase.from(tbl).upsert(dbPayload, { onConflict: 'id' });
      if (!err2) return { ok: true };

      // 3ª Tentativa: Insert comum
      const { error: err3 } = await supabase.from(tbl).insert(dbPayload);
      if (!err3) return { ok: true };

      // 4ª Tentativa: Update por codigo_amostra
      const { error: err4 } = await supabase.from(tbl).update(dbPayload).eq('codigo_amostra', dbPayload.codigo_amostra);
      if (!err4) return { ok: true };

      lastErrorMessage = err1?.message || err2?.message || err3?.message || err4?.message || 'Erro desconhecido';
      console.warn(`Tentativa de salvar na tabela ${tbl} falhou:`, lastErrorMessage);
    } catch (e: any) {
      lastErrorMessage = e?.message || String(e);
      console.warn(`Exceção ao salvar na tabela ${tbl}:`, e);
    }
  }

  return { ok: false, error: lastErrorMessage };
}

export async function saveLaboratorioToSupabase(amostra: any): Promise<boolean> {
  const result = await saveLaboratorioToSupabaseWithDetail(amostra);
  return result.ok;
}

export async function seedInitialLaboratorioIfEmpty(initialItems: any[]): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !initialItems || initialItems.length === 0) return false;
  try {
    const { count, error } = await supabase
      .from('laboratorio')
      .select('*', { count: 'exact', head: true });

    if (!error && (count === 0 || count === null)) {
      console.log('Tabela laboratorio vazia no Supabase. Sincronizando dados iniciais...');
      for (const item of initialItems) {
        await saveLaboratorioToSupabase(item);
      }
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Erro ao verificar/semear amostras iniciais de laboratório no Supabase:', e);
    return false;
  }
}

export async function syncAllLaboratorioToSupabase(items: any[]): Promise<{ success: number; total: number; error?: string }> {
  if (!isSupabaseConfigured || !supabase || !items) return { success: 0, total: 0, error: 'Supabase não está configurado.' };
  let successCount = 0;
  let lastError = '';
  for (const item of items) {
    const res = await saveLaboratorioToSupabaseWithDetail(item);
    if (res.ok) {
      successCount++;
    } else if (res.error) {
      lastError = res.error;
    }
  }
  return { success: successCount, total: items.length, error: lastError };
}

export async function deleteLaboratorioFromSupabase(amostraId: string, codigoAmostra?: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const tablesToTry = ['laboratorio', 'laudos_laboratorio', 'amostras_laboratorio'];

    for (const tbl of tablesToTry) {
      if (amostraId) {
        const { error } = await supabase.from(tbl).delete().eq('id', amostraId);
        if (!error) return true;
      }
      if (codigoAmostra) {
        const { error } = await supabase.from(tbl).delete().eq('codigo_amostra', codigoAmostra);
        if (!error) return true;
      }
    }
    return true;
  } catch (err) {
    console.error('Exceção ao deletar amostra de laboratório do Supabase:', err);
    return false;
  }
}

// Pontos de Coleta
export async function fetchPontosColetaFromSupabase(): Promise<any[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const tablesToTry = ['pontos_coleta', 'laboratorio_pontos', 'pontos_laboratorio'];
    for (const tbl of tablesToTry) {
      const { data, error } = await supabase
        .from(tbl)
        .select('*');

      if (!error && data && data.length > 0) {
        return data.map((item: any) => ({
          id: String(item.id),
          ponto: item.ponto || item.nome_identificacao || item.nome || `Ponto ${item.id}`,
          local: item.local || item.local_especifico || '',
          endereco: item.endereco || item.logradouro || '',
          bairro: item.bairro || 'Centro',
          tipo_matriz_padrao: item.tipo_matriz_padrao || item.tipo_matriz || 'ÁGUA POTÁVEL',
          observacao: item.observacao || item.observacoes || '',
          ativo: item.ativo !== false
        }));
      }
    }
    return null;
  } catch (err) {
    console.warn('Erro ao carregar pontos de coleta do Supabase:', err);
    return null;
  }
}

export async function savePontoColetaToSupabase(ponto: any): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const hasValidUUID = ponto.id && uuidRegex.test(String(ponto.id));
    const validUUID = hasValidUUID ? String(ponto.id) : generateUUID();

    const dbPayload: any = {
      id: validUUID,
      nome_identificacao: ponto.ponto || ponto.nome_identificacao || 'Ponto de Coleta',
      bairro: ponto.bairro || 'Centro',
      endereco: ponto.endereco || '',
      local_especifico: ponto.local || ponto.local_especifico || '',
      tipo_estabelecimento: ponto.tipo_estabelecimento || 'Ponto Fixo',
      estabelecimento: ponto.estabelecimento || ponto.ponto || '',
      responsavel_contato: ponto.responsavel_contato || '',
      telefone: ponto.telefone || '',
      ativo: ponto.ativo !== false,
      frequencia_meses: ponto.frequencia_meses || 1,
      observacoes: ponto.observacao || ponto.observacoes || ''
    };

    const tablesToTry = ['pontos_coleta', 'laboratorio_pontos', 'pontos_laboratorio'];

    for (const tbl of tablesToTry) {
      try {
        // 1ª Tentativa: Upsert com UUID
        const { error: upsertErr1 } = await supabase.from(tbl).upsert(dbPayload, { onConflict: 'id' });
        if (!upsertErr1) return true;

        // 2ª Tentativa: Insert sem ID
        const { id, ...withoutId } = dbPayload;
        const { error: insErr } = await supabase.from(tbl).insert(withoutId);
        if (!insErr) return true;

        console.warn(`Tentativa em ${tbl} falhou:`, upsertErr1?.message || insErr?.message);
      } catch (e) {
        console.warn(`Tentativa em ${tbl} falhou:`, e);
      }
    }
    return false;
  } catch (err) {
    console.error('Exceção ao salvar ponto de coleta no Supabase:', err);
    return false;
  }
}

export async function seedInitialPontosColetaIfEmpty(initialPontos: any[]): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !initialPontos || initialPontos.length === 0) return false;
  try {
    const { count, error } = await supabase
      .from('pontos_coleta')
      .select('*', { count: 'exact', head: true });

    if (!error && (count === 0 || count === null)) {
      console.log('Tabela pontos_coleta vazia no Supabase. Sincronizando pontos...');
      for (const p of initialPontos) {
        await savePontoColetaToSupabase(p);
      }
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Erro ao semear pontos de coleta no Supabase:', e);
    return false;
  }
}

export async function deletePontoColetaFromSupabase(pontoId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const isUUID = pontoId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pontoId);
    const tablesToTry = ['pontos_coleta', 'laboratorio_pontos', 'pontos_laboratorio'];

    for (const tbl of tablesToTry) {
      if (isUUID) {
        const { error } = await supabase.from(tbl).delete().eq('id', pontoId);
        if (!error) return true;
      }
    }
    return true;
  } catch (err) {
    console.error('Exceção ao deletar ponto do Supabase:', err);
    return false;
  }
}

// ==========================================
// 12. ESCRITÓRIOS DE CONTABILIDADE E CARTEIRA
// ==========================================

export async function fetchContabilidadesFromSupabase(): Promise<ContabilidadeProfile[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('contabilidades')
      .select('*')
      .order('razao_social', { ascending: true });

    if (error) {
      console.warn('Supabase [contabilidades] retorno:', error.message);
      return null;
    }
    if (data && data.length > 0) {
      return data.map((item) => {
        let cnpjs: string[] = [];
        if (Array.isArray(item.cnpjs_vinculados)) {
          cnpjs = item.cnpjs_vinculados;
        } else if (typeof item.cnpjs_vinculados === 'string') {
          try {
            const parsed = JSON.parse(item.cnpjs_vinculados);
            if (Array.isArray(parsed)) cnpjs = parsed;
          } catch {
            cnpjs = item.cnpjs_vinculados.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }
        return {
          id: String(item.id),
          razao_social: item.razao_social || '',
          nome_fantasia: item.nome_fantasia || item.razao_social || '',
          cnpj: item.cnpj || '',
          crc: item.crc || '',
          responsavel: item.responsavel || '',
          email: item.email || '',
          telefone: item.telefone || '',
          senha: item.senha || '123456',
          cnpjs_vinculados: cnpjs,
          data_cadastro: item.data_cadastro ? String(item.data_cadastro).split('T')[0] : new Date().toISOString().split('T')[0],
          cnae_principal: item.cnae_principal || undefined,
          cnae_principal_codigo: item.cnae_principal_codigo || undefined,
          cnae_principal_descricao: item.cnae_principal_descricao || undefined,
          cnaes: Array.isArray(item.cnaes) ? item.cnaes : (item.cnae_principal ? [item.cnae_principal] : []),
          cnaes_secundarios: Array.isArray(item.cnaes_secundarios) ? item.cnaes_secundarios : []
        };
      });
    }
    return [];
  } catch (err) {
    console.warn('Erro ao buscar contabilidades do Supabase:', err);
    return null;
  }
}

export async function saveContabilidadeToSupabase(item: ContabilidadeProfile): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cleanCnpj = (item.cnpj || '').trim();

    // Verifica se já existe pelo CNPJ
    let existingId: string | null = null;
    if (cleanCnpj) {
      const { data: byCnpj } = await supabase
        .from('contabilidades')
        .select('id')
        .eq('cnpj', cleanCnpj)
        .maybeSingle();
      if (byCnpj && byCnpj.id) {
        existingId = String(byCnpj.id);
      }
    }

    const recordId = existingId || (item.id && uuidRegex.test(item.id) ? item.id : generateUUID());

    const payload: any = {
      id: recordId,
      razao_social: item.razao_social || 'Contabilidade',
      nome_fantasia: item.nome_fantasia || item.razao_social || 'Contabilidade',
      cnpj: cleanCnpj,
      crc: item.crc || '',
      responsavel: item.responsavel || 'Responsável Técnico',
      email: (item.email || '').trim().toLowerCase(),
      telefone: item.telefone || '',
      senha: item.senha || '123456',
      cnpjs_vinculados: item.cnpjs_vinculados || [],
      data_cadastro: item.data_cadastro || new Date().toISOString(),
      cnae_principal: item.cnae_principal || null,
      cnae_principal_codigo: item.cnae_principal_codigo || null,
      cnae_principal_descricao: item.cnae_principal_descricao || null,
      cnaes: item.cnaes || [],
      cnaes_secundarios: item.cnaes_secundarios || []
    };

    // 1ª Tentativa: Upsert por CNPJ ou ID com payload completo
    const { error: upsertErr } = await supabase
      .from('contabilidades')
      .upsert(payload, { onConflict: 'cnpj' });

    if (!upsertErr) return true;

    // 2ª Tentativa: Upsert por ID
    const { error: upsertErrId } = await supabase
      .from('contabilidades')
      .upsert(payload, { onConflict: 'id' });

    if (!upsertErrId) return true;

    // 3ª Tentativa: Update direto se existir
    if (cleanCnpj) {
      const { error: updErr } = await supabase
        .from('contabilidades')
        .update(payload)
        .eq('cnpj', cleanCnpj);
      if (!updErr) return true;
    }

    // 4ª Tentativa: Insert sem ID explícito
    const { id, ...withoutId } = payload;
    const { error: insErr } = await supabase.from('contabilidades').insert(withoutId);
    if (!insErr) return true;

    // Se houve erro de coluna inexistente (ex: tabela no Supabase do usuário ainda não rodou a migration de cnaes)
    if (upsertErr?.message?.includes('column') || insErr?.message?.includes('column')) {
      const legacyPayload: any = {
        id: recordId,
        razao_social: item.razao_social || 'Contabilidade',
        nome_fantasia: item.nome_fantasia || item.razao_social || 'Contabilidade',
        cnpj: cleanCnpj,
        crc: item.crc || '',
        responsavel: item.responsavel || 'Responsável Técnico',
        email: (item.email || '').trim().toLowerCase(),
        telefone: item.telefone || '',
        senha: item.senha || '123456',
        cnpjs_vinculados: item.cnpjs_vinculados || [],
        data_cadastro: item.data_cadastro || new Date().toISOString()
      };
      const { error: legErr } = await supabase.from('contabilidades').upsert(legacyPayload, { onConflict: 'cnpj' });
      if (!legErr) return true;
    }

    console.warn('Falha em todas as tentativas de salvar contabilidade:', insErr.message);
    return false;
  } catch (err) {
    console.error('Exceção ao salvar contabilidade no Supabase:', err);
    return false;
  }
}

export async function saveDocumentoContabilidadeToSupabase(doc: DocumentoContabilidade & { contabilidade_id?: string }): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const payload = {
      id: doc.id || generateUUID(),
      contabilidade_id: doc.contabilidade_id || null,
      cnpj_empresa: doc.cnpj_empresa,
      tipo_documento: doc.tipo_documento,
      nome_arquivo: doc.nome_arquivo || null,
      observacao: doc.observacao || null,
      status: doc.status || 'ANALISE',
      data_envio: doc.data_envio || new Date().toISOString()
    };

    const { error } = await supabase
      .from('documentos_contabilidade')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Erro ao salvar documento da contabilidade no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exceção ao salvar documento da contabilidade no Supabase:', err);
    return false;
  }
}

export async function fetchDocumentosContabilidadeFromSupabase(cnpj?: string): Promise<DocumentoContabilidade[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    let query = supabase.from('documentos_contabilidade').select('*').order('data_envio', { ascending: false });
    if (cnpj) {
      query = query.eq('cnpj_empresa', cnpj);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('Supabase [documentos_contabilidade] retorno:', error.message);
      return null;
    }
    if (data) {
      return data.map(d => ({
        id: d.id,
        cnpj_empresa: d.cnpj_empresa,
        tipo_documento: d.tipo_documento,
        nome_arquivo: d.nome_arquivo || '',
        data_envio: d.data_envio ? String(d.data_envio).split('T')[0] : '',
        status: d.status || 'ANALISE',
        observacao: d.observacao || ''
      }));
    }
    return [];
  } catch (err) {
    console.warn('Erro ao buscar documentos contábeis do Supabase:', err);
    return null;
  }
}

export async function updateContabilidadeSenhaSupabase(cnpjOrEmail: string, novaSenha: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const clean = cnpjOrEmail.trim();
    const cleanLower = clean.toLowerCase();
    
    // Tenta por CNPJ
    let { error } = await supabase
      .from('contabilidades')
      .update({ senha: novaSenha })
      .eq('cnpj', clean);

    if (!error) return true;

    // Tenta por Email
    const { error: errEmail } = await supabase
      .from('contabilidades')
      .update({ senha: novaSenha })
      .ilike('email', cleanLower);

    if (!errEmail) return true;

    return false;
  } catch (err) {
    console.error('Exceção ao atualizar senha da contabilidade no Supabase:', err);
    return false;
  }
}

// ==========================================
// 13. CONTRIBUINTES (EMPRESÁRIOS / FEIRANTES / AUTÔNOMOS)
// ==========================================

export async function fetchContribuintesFromSupabase(): Promise<any[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('contribuintes')
      .select('*')
      .order('razao_social', { ascending: true });

    if (error) {
      console.warn('Supabase [contribuintes] retorno:', error.message);
      return null;
    }
    if (data && data.length > 0) {
      return data.map((item) => ({
        id: String(item.id),
        tipo_pessoa: item.tipo_pessoa || 'PJ',
        categoria: item.categoria || 'EMPRESARIO',
        cnpj_cpf: item.cnpj_cpf || '',
        razao_social: item.razao_social || '',
        nome_fantasia: item.nome_fantasia || item.razao_social || '',
        responsavel: item.responsavel || '',
        nome_proprietario: item.nome_proprietario || item.responsavel || '',
        email_proprietario: item.email_proprietario || '',
        telefone_proprietario: item.telefone_proprietario || '',
        email: item.email || '',
        telefone: item.telefone || '',
        ramo_atividade: item.ramo_atividade || '',
        bairro: item.bairro || '',
        endereco: item.endereco || '',
        senha: item.senha || '123456',
        data_abertura: item.data_abertura || '',
        situacao_cadastral: item.situacao_cadastral || '',
        data_situacao_cadastral: item.data_situacao_cadastral || '',
        cnae_principal: item.cnae_principal || '',
        cnae_principal_codigo: item.cnae_principal_codigo || '',
        cnae_principal_descricao: item.cnae_principal_descricao || '',
        cnaes: Array.isArray(item.cnaes) ? item.cnaes : (item.cnae_principal ? [item.cnae_principal] : []),
        cnaes_secundarios: Array.isArray(item.cnaes_secundarios) ? item.cnaes_secundarios : [],
        data_cadastro: item.data_cadastro ? String(item.data_cadastro).split('T')[0] : new Date().toISOString().split('T')[0],
        horario_funcionamento: item.horario_funcionamento || '',
        endereco_correspondencia: item.endereco_correspondencia ?? false,
        is_coworking: item.is_coworking ?? false,
        nome_coworking: item.nome_coworking || '',
        responsaveis_tecnicos: Array.isArray(item.responsaveis_tecnicos) ? item.responsaveis_tecnicos : []
      }));
    }
    return [];
  } catch (err) {
    console.warn('Erro ao buscar contribuintes do Supabase:', err);
    return null;
  }
}

// Interface de Retorno da Consulta na Tabela Oficial de CNAEs
export interface CnaeRtInfo {
  cnae: string;
  codigo: string;
  descricao: string;
  exige_rt: boolean;
  setor?: string;
  ufm?: number;
  observacao?: string;
  rt_saude?: string;
  outro_documento?: string;
  grau_risco?: string;
}

// Fallback normativo de CNAEs que exigem Responsável Técnico (RT/Saúde)
const CNAES_EXIGEM_RT_PADRAO: Record<string, { descricao: string; setor: string }> = {
  '4771-7/01': { descricao: 'Comércio varejista de produtos farmacêuticos, sem manipulação de fórmulas (Drogarias)', setor: 'FARMÁCIA' },
  '4771-7/02': { descricao: 'Comércio varejista de produtos farmacêuticos, com manipulação de fórmulas (Farmácia de Manipulação)', setor: 'FARMÁCIA' },
  '4771-7/03': { descricao: 'Comércio varejista de produtos farmacêuticos homeopáticos', setor: 'FARMÁCIA' },
  '4644-3/01': { descricao: 'Comércio atacadista de medicamentos e drogas de uso humano', setor: 'DISTRIBUIDORA' },
  '2121-1/01': { descricao: 'Fabricação de medicamentos alopáticos para uso humano', setor: 'INDÚSTRIA' },
  '8610-1/01': { descricao: 'Atividades de atendimento hospitalar, exceto pronto-socorro e UTI', setor: 'ESTABELECIMENTO DE SAÚDE' },
  '8610-1/02': { descricao: 'Atividades de atendimento em pronto-socorro e UTI', setor: 'ESTABELECIMENTO DE SAÚDE' },
  '8621-6/00': { descricao: 'UTI móvel e ambulâncias', setor: 'ESTABELECIMENTO DE SAÚDE' },
  '8630-5/01': { descricao: 'Atividade médica ambulatorial com recursos para realização de procedimentos cirúrgicos', setor: 'ESTABELECIMENTO DE SAÚDE' },
  '8630-5/02': { descricao: 'Atividade médica ambulatorial com recursos para realização de exames complementares', setor: 'ESTABELECIMENTO DE SAÚDE' },
  '8630-5/03': { descricao: 'Atividade médica ambulatorial restrita a consultas', setor: 'ESTABELECIMENTO DE SAÚDE' },
  '8630-5/04': { descricao: 'Atividade odontológica com recursos para realização de procedimentos cirúrgicos', setor: 'ODONTOLOGIA' },
  '8630-5/06': { descricao: 'Serviços de vacinação e imunização humana', setor: 'ESTABELECIMENTO DE SAÚDE' },
  '8640-2/01': { descricao: 'Laboratórios de anatomia patológica e citológica', setor: 'LABORATÓRIO' },
  '8640-2/02': { descricao: 'Laboratórios clínicos e análises clínicas', setor: 'LABORATÓRIO' },
  '8640-2/05': { descricao: 'Serviços de diagnóstico por imagem com radiação ionizante (Radiologia/Tomografia)', setor: 'DIAGNÓSTICO POR IMAGEM' },
  '8640-2/08': { descricao: 'Serviços de diálise e hemodiálise', setor: 'ESTABELECIMENTO DE SAÚDE' },
  '8640-2/12': { descricao: 'Serviços de hemoterapia e banco de sangue', setor: 'ESTABELECIMENTO DE SAÚDE' },
  '8690-9/01': { descricao: 'Atividades de práticas integrativas e complementares em saúde humana', setor: 'SAÚDE' },
  '8690-9/04': { descricao: 'Atividades de podologia', setor: 'ESTÉTICA/SAÚDE' },
  '4774-1/00': { descricao: 'Comércio varejista de artigos de óptica', setor: 'ÓPTICA' },
  '3250-7/03': { descricao: 'Fabricação de artigos ópticos (Laboratório óptico)', setor: 'ÓPTICA' },
  '7500-1/00': { descricao: 'Atividades veterinárias, clínicas e hospitais veterinários', setor: 'VETERINÁRIA' },
  '8122-2/00': { descricao: 'Imunização e controle de pragas urbanas (Dedetização)', setor: 'SANEANTES' },
  '2062-2/00': { descricao: 'Fabricação de produtos de limpeza e polimento', setor: 'SANEANTES' },
  '2063-1/00': { descricao: 'Fabricação de cosméticos, produtos de perfumaria e de higiene pessoal', setor: 'COSMÉTICOS' },
};

/**
 * Consulta a tabela oficial de CNAEs no Supabase (tabela_cnaes)
 * e verifica se a coluna RT/Saúde (rt_saude) contém 'SIM' para exigir Responsável Técnico.
 */
export async function fetchCnaesInfoFromSupabase(cnaesList: string[]): Promise<CnaeRtInfo[]> {
  const result: CnaeRtInfo[] = [];
  if (!cnaesList || cnaesList.length === 0) return result;

  // Normaliza a lista de códigos pesquisados
  const normalizedInputs = cnaesList.map((raw) => {
    const clean = (raw || '').trim();
    const digits = clean.replace(/\D/g, '');
    const match = clean.match(/^(\d{4}-?\d\/?\d{2})/);
    const code = match ? match[1] : (digits.length >= 7 ? `${digits.slice(0, 4)}-${digits.slice(4, 5)}/${digits.slice(5, 7)}` : clean);
    const desc = clean.includes('-') && clean.split('-').length > 1
      ? clean.substring(clean.indexOf('-') + 1).replace(/^[\s\d/]+-?\s*/, '').trim()
      : clean;
    return { raw: clean, digits, code, desc };
  });

  // 1. Busca tabela_cnaes diretamente no Supabase
  let dbRows: any[] = [];
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('tabela_cnaes')
        .select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        dbRows = data;
      }
    } catch (e) {
      console.warn('Consulta à tabela_cnaes do Supabase não completada:', e);
    }
  }

  // 2. Cruza cada CNAE pesquisado com o retorno do Supabase ou com o catálogo oficial
  for (const input of normalizedInputs) {
    let matchedRow = dbRows.find((r) => {
      const rCnae = String(r.cnae || r.codigo || '').trim();
      const rDigits = rCnae.replace(/\D/g, '');
      return (
        (rDigits && input.digits && (rDigits === input.digits || rDigits.startsWith(input.digits) || input.digits.startsWith(rDigits))) ||
        (rCnae && input.code && rCnae.includes(input.code))
      );
    });

    if (matchedRow) {
      // Lê coluna rt_saude (com suporte aos nomes possíveis de colunas importadas da planilha)
      const rtValue = String(
        matchedRow.rt_saude ??
        matchedRow['RT/Saúde'] ??
        matchedRow['RT/Saude'] ??
        matchedRow['rt_saude'] ??
        matchedRow.futuro ??
        ''
      ).trim().toUpperCase();

      const exigeRt = rtValue.includes('SIM') || rtValue === 'S' || rtValue === 'TRUE' || rtValue === '1';

      result.push({
        cnae: input.raw,
        codigo: matchedRow.cnae || input.code,
        descricao: matchedRow.descricao || input.desc,
        exige_rt: exigeRt,
        setor: matchedRow.setor || '',
        ufm: matchedRow.ufm ? Number(matchedRow.ufm) : undefined,
        observacao: matchedRow.observacao || '',
        rt_saude: rtValue,
        outro_documento: matchedRow.outro_documento || matchedRow.futuro1 || '',
        grau_risco: matchedRow.grau_risco || (exigeRt ? 'ALTO' : 'BAIXO')
      });
    } else {
      // Fallback regulatório com base nas normas da ANVISA / Vigilância Sanitária
      let exigeRt = false;
      let setorFallback = '';
      let descFallback = input.desc;

      for (const [padraoCode, padraoInfo] of Object.entries(CNAES_EXIGEM_RT_PADRAO)) {
        const padraoDigits = padraoCode.replace(/\D/g, '');
        if (
          (input.digits && padraoDigits && (input.digits.startsWith(padraoDigits) || padraoDigits.startsWith(input.digits))) ||
          input.raw.includes(padraoCode)
        ) {
          exigeRt = true;
          setorFallback = padraoInfo.setor;
          if (!descFallback || descFallback === input.raw) {
            descFallback = padraoInfo.descricao;
          }
          break;
        }
      }

      result.push({
        cnae: input.raw,
        codigo: input.code,
        descricao: descFallback || input.raw,
        exige_rt: exigeRt,
        setor: setorFallback,
        grau_risco: exigeRt ? 'ALTO' : 'BAIXO'
      });
    }
  }

  return result;
}

export async function saveContribuinteToSupabase(item: any): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cleanDoc = (item.cnpj_cpf || '').trim();

    // Verifica se já existe pelo CNPJ/CPF
    let existingId: string | null = null;
    if (cleanDoc) {
      const { data: byDoc } = await supabase
        .from('contribuintes')
        .select('id')
        .eq('cnpj_cpf', cleanDoc)
        .maybeSingle();
      if (byDoc && byDoc.id) {
        existingId = String(byDoc.id);
      }
    }

    const recordId = existingId || (item.id && uuidRegex.test(item.id) ? item.id : generateUUID());

    const payload: any = {
      id: recordId,
      tipo_pessoa: item.tipo_pessoa || 'PJ',
      categoria: item.categoria || 'EMPRESARIO',
      cnpj_cpf: cleanDoc,
      razao_social: item.razao_social || 'Contribuinte',
      nome_fantasia: item.nome_fantasia || item.razao_social || 'Contribuinte',
      responsavel: item.responsavel || item.nome_proprietario || item.razao_social || 'Responsável',
      nome_proprietario: item.nome_proprietario || item.responsavel || null,
      email_proprietario: item.email_proprietario ? (item.email_proprietario || '').trim().toLowerCase() : null,
      telefone_proprietario: item.telefone_proprietario || null,
      email: (item.email || '').trim().toLowerCase(),
      telefone: item.telefone || '',
      ramo_atividade: item.ramo_atividade || '',
      bairro: item.bairro || 'Centro',
      endereco: item.endereco || '',
      senha: item.senha || '123456',
      data_abertura: item.data_abertura || null,
      situacao_cadastral: item.situacao_cadastral || null,
      data_situacao_cadastral: item.data_situacao_cadastral || null,
      cnae_principal: item.cnae_principal || null,
      cnae_principal_codigo: item.cnae_principal_codigo || null,
      cnae_principal_descricao: item.cnae_principal_descricao || null,
      cnaes: item.cnaes || [],
      cnaes_secundarios: item.cnaes_secundarios || [],
      // Perguntas Operacionais e RT
      horario_funcionamento: item.horario_funcionamento || null,
      endereco_correspondencia: item.endereco_correspondencia ?? false,
      is_coworking: item.is_coworking ?? false,
      nome_coworking: item.nome_coworking || null,
      responsaveis_tecnicos: item.responsaveis_tecnicos || [],
      data_cadastro: item.data_cadastro || new Date().toISOString()
    };

    // 1ª Tentativa: Upsert por CNPJ/CPF
    const { error: upsertErr } = await supabase
      .from('contribuintes')
      .upsert(payload, { onConflict: 'cnpj_cpf' });

    if (!upsertErr) return true;

    // 2ª Tentativa: Upsert por ID
    const { error: upsertErrId } = await supabase
      .from('contribuintes')
      .upsert(payload, { onConflict: 'id' });

    if (!upsertErrId) return true;

    // 3ª Tentativa: Update direto se existir
    if (cleanDoc) {
      const { error: updErr } = await supabase
        .from('contribuintes')
        .update(payload)
        .eq('cnpj_cpf', cleanDoc);
      if (!updErr) return true;
    }

    // 4ª Tentativa: Insert sem ID explícito
    const { id, ...withoutId } = payload;
    const { error: insErr } = await supabase.from('contribuintes').insert(withoutId);
    if (!insErr) return true;

    // Se houve erro de coluna inexistente em banco antigo, tenta com payload básico de compatibilidade
    if (upsertErr?.message?.includes('column') || insErr?.message?.includes('column')) {
      const legacyPayload: any = {
        id: recordId,
        tipo_pessoa: item.tipo_pessoa || 'PJ',
        categoria: item.categoria || 'EMPRESARIO',
        cnpj_cpf: cleanDoc,
        razao_social: item.razao_social || 'Contribuinte',
        nome_fantasia: item.nome_fantasia || item.razao_social || 'Contribuinte',
        responsavel: item.responsavel || item.razao_social || 'Responsável',
        email: (item.email || '').trim().toLowerCase(),
        telefone: item.telefone || '',
        ramo_atividade: item.ramo_atividade || '',
        bairro: item.bairro || 'Centro',
        endereco: item.endereco || '',
        senha: item.senha || '123456',
        data_cadastro: item.data_cadastro || new Date().toISOString()
      };
      const { error: legacyErr } = await supabase.from('contribuintes').upsert(legacyPayload, { onConflict: 'cnpj_cpf' });
      if (!legacyErr) return true;
    }

    console.warn('Falha em todas as tentativas de salvar contribuinte no Supabase:', insErr?.message || upsertErr?.message);
    return false;
  } catch (err) {
    console.error('Exceção ao salvar contribuinte no Supabase:', err);
    return false;
  }
}

export async function updateContribuinteSenhaSupabase(docOrEmail: string, novaSenha: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const clean = docOrEmail.trim();
    const cleanLower = clean.toLowerCase();

    // Tenta por CNPJ/CPF
    let { error } = await supabase
      .from('contribuintes')
      .update({ senha: novaSenha })
      .eq('cnpj_cpf', clean);

    if (!error) return true;

    // Tenta por E-mail
    const { error: errEmail } = await supabase
      .from('contribuintes')
      .update({ senha: novaSenha })
      .ilike('email', cleanLower);

    if (!errEmail) return true;

    return false;
  } catch (err) {
    console.error('Exceção ao atualizar senha do contribuinte no Supabase:', err);
    return false;
  }
}

// ==========================================
// 14. CIDADÃOS / MUNÍCIPES
// ==========================================

export async function fetchCidadaosFromSupabase(): Promise<any[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('cidadaos')
      .select('*')
      .order('nome_completo', { ascending: true });

    if (error) {
      console.warn('Supabase [cidadaos] retorno:', error.message);
      return null;
    }
    if (data && data.length > 0) {
      return data.map((item) => ({
        id: String(item.id),
        nome_completo: item.nome_completo || '',
        cpf: item.cpf || '',
        email: item.email || '',
        telefone: item.telefone || '',
        bairro: item.bairro || '',
        endereco: item.endereco || '',
        senha: item.senha || '123456',
        data_cadastro: item.data_cadastro ? String(item.data_cadastro).split('T')[0] : new Date().toISOString().split('T')[0]
      }));
    }
    return [];
  } catch (err) {
    console.warn('Erro ao buscar cidadãos do Supabase:', err);
    return null;
  }
}

export async function saveCidadaoToSupabase(item: any): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cleanCpf = (item.cpf || '').trim();

    // Verifica se já existe pelo CPF
    let existingId: string | null = null;
    if (cleanCpf) {
      const { data: byCpf } = await supabase
        .from('cidadaos')
        .select('id')
        .eq('cpf', cleanCpf)
        .maybeSingle();
      if (byCpf && byCpf.id) {
        existingId = String(byCpf.id);
      }
    }

    const recordId = existingId || (item.id && uuidRegex.test(item.id) ? item.id : generateUUID());

    const payload: any = {
      id: recordId,
      nome_completo: item.nome_completo || 'Cidadão',
      cpf: cleanCpf,
      email: (item.email || '').trim().toLowerCase(),
      telefone: item.telefone || '',
      bairro: item.bairro || 'Centro',
      endereco: item.endereco || '',
      senha: item.senha || '123456',
      data_cadastro: item.data_cadastro || new Date().toISOString()
    };

    // 1ª Tentativa: Upsert por CPF
    const { error: upsertErr } = await supabase
      .from('cidadaos')
      .upsert(payload, { onConflict: 'cpf' });

    if (!upsertErr) return true;

    // 2ª Tentativa: Upsert por ID
    const { error: upsertErrId } = await supabase
      .from('cidadaos')
      .upsert(payload, { onConflict: 'id' });

    if (!upsertErrId) return true;

    // 3ª Tentativa: Update direto se existir
    if (cleanCpf) {
      const { error: updErr } = await supabase
        .from('cidadaos')
        .update(payload)
        .eq('cpf', cleanCpf);
      if (!updErr) return true;
    }

    // 4ª Tentativa: Insert sem ID explícito
    const { id, ...withoutId } = payload;
    const { error: insErr } = await supabase.from('cidadaos').insert(withoutId);
    if (!insErr) return true;

    console.warn('Falha em todas as tentativas de salvar cidadão no Supabase:', insErr.message);
    return false;
  } catch (err) {
    console.error('Exceção ao salvar cidadão no Supabase:', err);
    return false;
  }
}

export async function updateCidadaoSenhaSupabase(cpfOrEmail: string, novaSenha: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const clean = cpfOrEmail.trim();
    const cleanLower = clean.toLowerCase();

    // Tenta por CPF
    let { error } = await supabase
      .from('cidadaos')
      .update({ senha: novaSenha })
      .eq('cpf', clean);

    if (!error) return true;

    // Tenta por E-mail
    const { error: errEmail } = await supabase
      .from('cidadaos')
      .update({ senha: novaSenha })
      .ilike('email', cleanLower);

    if (!errEmail) return true;

    return false;
  } catch (err) {
    console.error('Exceção ao atualizar senha do cidadão no Supabase:', err);
    return false;
  }
}

export async function updateOperadorSenhaSupabase(email: string, novaSenha: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const { error } = await supabase
      .from('operadores')
      .update({ senha: novaSenha, updated_at: new Date().toISOString() })
      .eq('email', cleanEmail);

    if (error) {
      console.warn('Erro ao atualizar senha do operador no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exceção ao atualizar senha do operador no Supabase:', err);
    return false;
  }
}

// ==========================================
// 12. PASTAS VISA (ARQUIVO ADMINISTRATIVO)
// ==========================================

export async function fetchPastasVisaFromSupabase(): Promise<PastaVisaItem[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('pastas_visa')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) {
      console.warn('Supabase [pastas_visa] retorno:', error.message);
      return null;
    }
    if (data && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id,
        cnpj_cpf: item.cnpj_cpf || '',
        pasta: item.pasta || '',
        razao_social: item.razao_social || '',
        status_rf: item.status_rf || 'ATIVA',
        alvara_atualizado: item.alvara_atualizado || 'SIM',
        setor: item.setor || 'VIGILÂNCIA SANITÁRIA',
        observacoes: item.observacoes || '',
        criado_por: item.criado_por || '',
        criado_em: item.criado_em || '',
        atualizado_em: item.atualizado_em || ''
      }));
    }
    return [];
  } catch (err) {
    console.warn('Erro ao buscar pastas_visa no Supabase:', err);
    return null;
  }
}

export async function savePastaVisaToSupabase(pasta: PastaVisaItem): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase não configurado' };
  }
  try {
    const payload = {
      id: pasta.id,
      cnpj_cpf: pasta.cnpj_cpf,
      pasta: pasta.pasta,
      razao_social: pasta.razao_social,
      status_rf: pasta.status_rf,
      alvara_atualizado: pasta.alvara_atualizado,
      setor: pasta.setor,
      observacoes: pasta.observacoes || '',
      criado_por: pasta.criado_por || '',
      atualizado_em: new Date().toISOString()
    };

    const { error } = await supabase
      .from('pastas_visa')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Erro ao salvar pasta_visa no Supabase:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Exceção ao salvar pasta_visa no Supabase:', err);
    return { success: false, error: err?.message || 'Erro inesperado' };
  }
}

export async function deletePastaVisaFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase
      .from('pastas_visa')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Erro ao excluir pasta_visa no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exceção ao excluir pasta_visa no Supabase:', err);
    return false;
  }
}

// ==========================================
// 15. ALVARÁS SANITÁRIOS (EMISSÃO & MODELO DOCS)
// ==========================================

export async function fetchAlvarasFromSupabase(): Promise<AlvaraSanitarioItem[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('alvaras_sanitarios')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) {
      console.warn('Supabase [alvaras_sanitarios] retorno:', error.message);
      return null;
    }
    if (data && data.length > 0) {
      return data.map((item) => ({
        id: item.id,
        numero_alvara: item.numero_alvara || '',
        ano_exercicio: item.ano_exercicio || String(new Date().getFullYear()),
        tipo_alvara: item.tipo_alvara || 'INICIAL',
        modelo_tipo: item.modelo_tipo || 'PONTO_MILHO_CHURROS',
        pasta: item.pasta || '',
        cnpj_cpf: item.cnpj_cpf || '',
        razao_social: item.razao_social || '',
        nome_fantasia: item.nome_fantasia || '',
        endereco: item.endereco || '',
        numero: item.numero || '',
        complemento: item.complemento || '',
        bairro: item.bairro || '',
        municipio: item.municipio || 'Balneário Camboriú',
        cep: item.cep || '',
        cnae_principal: item.cnae_principal || '',
        cnaes_secundarios: Array.isArray(item.cnaes_secundarios) ? item.cnaes_secundarios : [],
        responsavel_tecnico: item.responsavel_tecnico || '',
        conselho_rt: item.conselho_rt || '',
        validade: item.validade || '',
        data_emissao: item.data_emissao || new Date().toISOString().split('T')[0],
        status: item.status || 'ATIVO',
        setor: item.setor || 'ALIMENTOS',
        condicionantes: item.condicionantes || '',
        fiscal_emissor: item.fiscal_emissor || '',
        matricula_fiscal: item.matricula_fiscal || '',
        codigo_autenticacao: item.codigo_autenticacao || '',
        modelo_doc_url: item.modelo_doc_url || '',
        criado_em: item.criado_em || '',
        atualizado_em: item.atualizado_em || ''
      }));
    }
    return [];
  } catch (err) {
    console.warn('Erro ao buscar alvaras_sanitarios no Supabase:', err);
    return null;
  }
}

export async function saveAlvaraToSupabase(alvara: AlvaraSanitarioItem): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase não configurado' };
  }
  try {
    const payload = {
      id: alvara.id,
      numero_alvara: alvara.numero_alvara,
      ano_exercicio: alvara.ano_exercicio,
      tipo_alvara: alvara.tipo_alvara,
      modelo_tipo: alvara.modelo_tipo || 'PONTO_MILHO_CHURROS',
      pasta: alvara.pasta || '',
      cnpj_cpf: alvara.cnpj_cpf,
      razao_social: alvara.razao_social,
      nome_fantasia: alvara.nome_fantasia || '',
      endereco: alvara.endereco,
      numero: alvara.numero,
      complemento: alvara.complemento || '',
      bairro: alvara.bairro,
      municipio: alvara.municipio || 'Balneário Camboriú',
      cep: alvara.cep || '',
      cnae_principal: alvara.cnae_principal,
      cnaes_secundarios: alvara.cnaes_secundarios || [],
      responsavel_tecnico: alvara.responsavel_tecnico || '',
      conselho_rt: alvara.conselho_rt || '',
      validade: alvara.validade,
      data_emissao: alvara.data_emissao,
      status: alvara.status,
      setor: alvara.setor,
      condicionantes: alvara.condicionantes || '',
      fiscal_emissor: alvara.fiscal_emissor || '',
      matricula_fiscal: alvara.matricula_fiscal || '',
      codigo_autenticacao: alvara.codigo_autenticacao || '',
      modelo_doc_url: alvara.modelo_doc_url || '',
      atualizado_em: new Date().toISOString()
    };

    const { error } = await supabase
      .from('alvaras_sanitarios')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Erro ao salvar alvara_sanitario no Supabase:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Exceção ao salvar alvara_sanitario no Supabase:', err);
    return { success: false, error: err?.message || 'Erro inesperado' };
  }
}

export async function deleteAlvaraFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase
      .from('alvaras_sanitarios')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Erro ao excluir alvara_sanitario no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exceção ao excluir alvara_sanitario no Supabase:', err);
    return false;
  }
}

// ==========================================
// 17. MODELOS GOOGLE DOCS DO ALVARÁ SANITÁRIO
// ==========================================

export async function fetchModelosAlvaraFromSupabase(): Promise<ModeloAlvaraDocsItem[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('modelos_alvara_docs')
      .select('*')
      .order('criado_em', { ascending: true });

    if (error) {
      console.warn('Supabase [modelos_alvara_docs] retorno:', error.message);
      return null;
    }
    if (data && data.length > 0) {
      return data.map((item) => ({
        id: item.id,
        nome: item.nome || '',
        autor: item.autor || '',
        descricao: item.descricao || '',
        docs_url: item.docs_url || '',
        template_texto: item.template_texto || '',
        is_ativo: !!item.is_ativo,
        legislacao_base: item.legislacao_base || '',
        criado_em: item.criado_em,
        atualizado_em: item.atualizado_em
      }));
    }
  } catch (err) {
    console.warn('Erro ao buscar modelos_alvara_docs no Supabase:', err);
  }
  return null;
}

export async function saveModeloAlvaraToSupabase(modelo: ModeloAlvaraDocsItem): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const payload = {
      id: modelo.id,
      nome: modelo.nome,
      autor: modelo.autor,
      descricao: modelo.descricao,
      docs_url: modelo.docs_url,
      template_texto: modelo.template_texto || '',
      is_ativo: modelo.is_ativo,
      legislacao_base: modelo.legislacao_base || '',
      atualizado_em: new Date().toISOString()
    };

    const { error } = await supabase
      .from('modelos_alvara_docs')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Erro ao salvar modelo_alvara_docs no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exceção ao salvar modelo_alvara_docs no Supabase:', err);
    return false;
  }
}


