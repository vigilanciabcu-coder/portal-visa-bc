import { supabase, isSupabaseConfigured } from './supabase';
import { UserProfile, EscalaItem, FeiranteItem, RecadoMural, FiscalizacaoItem, ChatMessage } from '../types';

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
        nivel_acesso: item.nivel_acesso || (item.cargo === 'MASTER' || item.cargo === 'MASTER ADM' ? 'MASTER (TUDO)' : 'VISA (FISCAL)'),
        matricula: item.matricula || '',
        senha: item.senha || '123456'
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
        nivel_acesso: user.nivel_acesso || (user.cargo === 'MASTER' || user.cargo === 'MASTER ADM' ? 'MASTER (TUDO)' : 'VISA (FISCAL)'),
        matricula: (user.matricula || '').trim(),
        senha: (user.senha || '123456').trim()
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
        nivel_acesso: user.nivel_acesso || (user.cargo === 'MASTER' || user.cargo === 'MASTER ADM' ? 'MASTER (TUDO)' : 'VISA (FISCAL)'),
        matricula: (user.matricula || '').trim(),
        senha: (user.senha || '123456').trim()
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

export async function saveProcessoToSupabase(proc: any): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const payload: any = {
      num_processo: proc.num_processo || proc.numProcesso || `1DOC-${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
      data_protocolo: proc.data_protocolo || proc.dataProtocolo || new Date().toISOString().split('T')[0],
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
      validade: proc.validade || null,
      observacoes: proc.observacoes || '',
      cnaes: proc.cnaes || [],
      setor: proc.setor || '',
      motivacao: proc.motivacao || '',
      data_entrada: proc.data_entrada || proc.dataEntrada || null,
      data_1doc: proc.data_1doc || proc.data1Doc || null,
      venc_1doc: proc.venc_1doc || proc.venc1Doc || null,
      prot_1doc: proc.prot_1doc || proc.prot1Doc || '',
      pasta: proc.pasta || '',
      situacao_cadastral: proc.situacao_cadastral || proc.situacaoCadastral || 'ATIVA',
      motivo_situacao: proc.motivo_situacao || '',
      data_situacao: proc.data_situacao || null,
      venc_licenca: proc.venc_licenca || proc.vencLicenca || null,
      grau_risco: proc.grau_risco || proc.grauRisco || 'MÉDIO RISCO',
      data_entregue_fiscal: proc.data_entregue_fiscal || proc.dataEntregueFiscal || null,
      agendado_para: proc.agendado_para || proc.agendadoPara || null,
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
        return data.map((item: any) => ({
          id: String(item.id),
          codigo_amostra: item.codigo_amostra || item.codigo || `LAB-${item.id}`,
          protocolo: item.protocolo || item.numero_protocolo || '',
          mes_ano_referencia: item.mes_ano_referencia || '',
          responsavel_distribuicao: item.responsavel_distribuicao || 'EMASA',
          interessado: item.interessado || item.estabelecimento || item.razao_social || 'MERCADO BAGÉ LTDA',
          cnpj_cpf: item.cnpj_cpf || '',
          numero_alvara: item.numero_alvara || 'Solicitado',
          data_coleta: item.data_coleta || new Date().toISOString().split('T')[0],
          hora_coleta: item.hora_coleta || '08:20',
          ponto_coleta_id: item.ponto_coleta_id || item.ponto_id || '',
          ponto_coleta_nome: item.ponto_coleta_nome || item.ponto || '',
          local_coleta: item.local_coleta || item.local || '',
          endereco: item.endereco || item.logradouro || '',
          bairro: item.bairro || 'Centro',
          estabelecimento: item.estabelecimento || item.interessado || item.razao_social || 'REDE PÚBLICA',
          fiscal_coletor: item.fiscal_coletor || item.coletor || 'Rita Sahd',
          tipo_matriz: item.tipo_matriz || 'ÁGUA POTÁVEL',
          temperatura_coleta: item.temperatura_coleta || item.temp || '',
          
          // Organolépticas
          aspecto: item.aspecto || 'Límpido',
          odor: item.odor || 'Inobjetável',
          cor: item.cor || 'Incolor',

          // Físico-Química
          ph: item.ph || item.parametros?.ph || '7,0',
          equipamento_ph: item.equipamento_ph || 'pH indicator strips MQuant 0 – 14 Marca MERCK',
          cloro: item.cloro || item.cloro_residual || item.parametros?.cloro_residual || '1,59',
          equipamento_cloro: item.equipamento_cloro || 'Chlorine Reagente for 10ml Sample(DLA-CL)',
          fluoreto: item.fluoreto || item.parametros?.fluoreto || '0,72',
          equipamento_fluor: item.equipamento_fluor || 'Colorímetro Digital para Flúor (Modelo DLA-FL)',
          turbidez: item.turbidez || item.parametros?.turbidez || '0,52',
          equipamento_turbidez: item.equipamento_turbidez || 'Turbidímetro Digital modelo DLT-WV',
          fluoretacao: item.fluoretacao || item.parametros?.fluoretacao || 'CONFORME',

          // Microbiológicas
          coliformes_totais: item.coliformes_totais || item.parametros?.coliformes_totais || 'AUSENTE',
          metodologia_coliformes_totais: item.metodologia_coliformes_totais || 'Kit Analisis Colilert –DST-P/A em cartela QUANTY-TRAY/2000-MARCA IDEXX+QUANTY TRAY SEALER – Model 2 X +estufa FABBE PRIMAR 36ºC100 ml por 24 horas',
          escherichia_coli: item.escherichia_coli || item.parametros?.escherichia_coli || 'AUSENTE',
          metodologia_escherichia_coli: item.metodologia_escherichia_coli || 'KIT ANALISES COLILERT-DST-P/A em cartela QUANTY-TRAY/2000-marca IDEXX+QUANTY TRAY SEALER – Model 2 X + estufa FABBE PRIMAR 36ºC100ml por 24 horas + LONG WAVE Ultravioleta 365 NM – marca CE.',

          // Responsável Técnico e Conclusão
          status: item.status || 'CONFORME',
          laudo_numero: item.laudo_numero || '',
          data_resultado: item.data_resultado || null,
          conclusao_laudo: item.conclusao_laudo || 'Para os parâmetros analisados, a amostra está em ACORDO com a Portaria GM/MS Nº 888, de 4 maio de 2021. Água PRÓPRIA para o consumo humano, considerando os parâmetros descritos.',
          laboratorialista: item.laboratorialista || item.analista || 'ADRIANO GUARDINI',
          cargo_laboratorialista: item.cargo_laboratorialista || 'FARMACÊUTICO E BIOQUIMICO',
          registro_conselho: item.registro_conselho || 'CRF/SC- 3321',
          responsavel_analise: item.responsavel_analise || 'Laboratório Central Municipal VISA',
          observacoes: item.observacoes || 'ANÁLISE SOLICITADA PARA VERIFICAR QUALIDADE DA ÁGUA PARA CONSUMO HUMANO',
          parametros: item.parametros || {},
          created_at: item.created_at
        }));
      }
    }
    return null;
  } catch (err) {
    console.warn('Erro ao carregar amostras de laboratório do Supabase:', err);
    return null;
  }
}

export async function saveLaboratorioToSupabase(amostra: any): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const payload: any = {
      codigo_amostra: amostra.codigo_amostra || `LAB-${Date.now()}`,
      protocolo: amostra.protocolo || null,
      mes_ano_referencia: amostra.mes_ano_referencia || null,
      responsavel_distribuicao: amostra.responsavel_distribuicao || 'EMASA',
      interessado: amostra.interessado || amostra.estabelecimento || 'MERCADO BAGÉ LTDA',
      cnpj_cpf: amostra.cnpj_cpf || '',
      numero_alvara: amostra.numero_alvara || 'Solicitado',
      data_coleta: amostra.data_coleta || new Date().toISOString().split('T')[0],
      hora_coleta: amostra.hora_coleta || '08:20',
      ponto_coleta_id: amostra.ponto_coleta_id || null,
      ponto_coleta_nome: amostra.ponto_coleta_nome || '',
      local_coleta: amostra.local_coleta || '',
      endereco: amostra.endereco || '',
      bairro: amostra.bairro || 'Centro',
      estabelecimento: amostra.estabelecimento || amostra.interessado || 'REDE MUNICIPAL',
      tipo_matriz: amostra.tipo_matriz || 'ÁGUA POTÁVEL',
      fiscal_coletor: amostra.fiscal_coletor || 'Rita Sahd',
      temperatura_coleta: amostra.temperatura_coleta || '',
      
      // Organolépticas
      aspecto: amostra.aspecto || 'Límpido',
      odor: amostra.odor || 'Inobjetável',
      cor: amostra.cor || 'Incolor',

      // Físico-Química
      ph: amostra.ph || '',
      equipamento_ph: amostra.equipamento_ph || null,
      cloro: amostra.cloro || '',
      equipamento_cloro: amostra.equipamento_cloro || null,
      fluoreto: amostra.fluoreto || '',
      equipamento_fluor: amostra.equipamento_fluor || null,
      turbidez: amostra.turbidez || '',
      equipamento_turbidez: amostra.equipamento_turbidez || null,
      fluoretacao: amostra.fluoretacao || 'CONFORME',

      // Microbiológicas
      coliformes_totais: amostra.coliformes_totais || 'AUSENTE',
      metodologia_coliformes_totais: amostra.metodologia_coliformes_totais || null,
      escherichia_coli: amostra.escherichia_coli || 'AUSENTE',
      metodologia_escherichia_coli: amostra.metodologia_escherichia_coli || null,

      // Responsável Técnico e Conclusão
      status: amostra.status || 'CONFORME',
      laudo_numero: amostra.laudo_numero || '',
      data_resultado: amostra.data_resultado || null,
      conclusao_laudo: amostra.conclusao_laudo || '',
      laboratorialista: amostra.laboratorialista || 'ADRIANO GUARDINI',
      cargo_laboratorialista: amostra.cargo_laboratorialista || 'FARMACÊUTICO E BIOQUIMICO',
      registro_conselho: amostra.registro_conselho || 'CRF/SC- 3321',
      responsavel_analise: amostra.responsavel_analise || 'Laboratório Central Municipal VISA',
      observacoes: amostra.observacoes || '',
      parametros: amostra.parametros || {},
      updated_at: new Date().toISOString()
    };

    const isUUID = amostra.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(amostra.id);
    const tablesToTry = ['laboratorio', 'laudos_laboratorio', 'amostras_laboratorio'];

    for (const tbl of tablesToTry) {
      try {
        if (isUUID) {
          const { error } = await supabase.from(tbl).update(payload).eq('id', amostra.id);
          if (!error) return true;
        } else {
          const { error } = await supabase.from(tbl).upsert(payload, { onConflict: 'codigo_amostra' });
          if (!error) return true;
        }
      } catch (e) {
        console.warn(`Tentativa de salvar na tabela ${tbl} falhou:`, e);
      }
    }
    return false;
  } catch (err) {
    console.error('Exceção ao salvar amostra de laboratório no Supabase:', err);
    return false;
  }
}

export async function deleteLaboratorioFromSupabase(amostraId: string, codigoAmostra?: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const isUUID = amostraId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(amostraId);
    const tablesToTry = ['laboratorio', 'laudos_laboratorio', 'amostras_laboratorio'];

    for (const tbl of tablesToTry) {
      if (isUUID) {
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
        .select('*')
        .order('ponto', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((item: any) => ({
          id: String(item.id),
          ponto: item.ponto || item.nome || `Ponto ${item.id}`,
          local: item.local || '',
          endereco: item.endereco || item.logradouro || '',
          bairro: item.bairro || 'Centro',
          tipo_matriz_padrao: item.tipo_matriz_padrao || 'ÁGUA POTÁVEL',
          observacao: item.observacao || item.obs || '',
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
    const payload: any = {
      ponto: ponto.ponto,
      local: ponto.local || '',
      endereco: ponto.endereco || '',
      bairro: ponto.bairro || 'Centro',
      tipo_matriz_padrao: ponto.tipo_matriz_padrao || 'ÁGUA POTÁVEL',
      observacao: ponto.observacao || '',
      ativo: ponto.ativo !== false,
      updated_at: new Date().toISOString()
    };

    const isUUID = ponto.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ponto.id);
    const tablesToTry = ['pontos_coleta', 'laboratorio_pontos', 'pontos_laboratorio'];

    for (const tbl of tablesToTry) {
      try {
        if (isUUID) {
          const { error } = await supabase.from(tbl).update(payload).eq('id', ponto.id);
          if (!error) return true;
        } else {
          const { error } = await supabase.from(tbl).insert(payload);
          if (!error) return true;
        }
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



