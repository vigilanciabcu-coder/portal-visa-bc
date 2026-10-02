import { ProcessoItem, TramitacaoItem, TipoTramitacao, UserProfile, ProcessoStatus } from '../types';

export interface EtapaPipeline {
  id: number;
  nome: string;
  subtitulo: string;
  status: 'CONCLUIDA' | 'EM_ANDAMENTO' | 'PENDENTE';
}

/**
 * Retorna as etapas canônicas do processo com seus respectivos status
 */
export function getEtapasPipelineProcesso(processo: ProcessoItem): EtapaPipeline[] {
  const sit = (processo.status || '').toUpperCase();
  const isDeferido = sit.includes('DEFERIDO') || sit.includes('CONCLU') || sit.includes('LICENCIADO');
  const isIndeferido = sit.includes('INDEFERIDO') || sit.includes('ARQUIV');
  const isNotificado = sit.includes('NOTIFICADO') || sit.includes('PEND') || sit.includes('EXIG');
  const isVistoriado = sit.includes('VISTORIA') || (processo.pareceres && processo.pareceres.length > 0);
  const isDistribuido = !!processo.fiscal_responsavel && !processo.fiscal_responsavel.toUpperCase().includes('NÃO ATRIBU');

  return [
    {
      id: 1,
      nome: 'Autuação & Protocolo',
      subtitulo: processo.data_protocolo ? `Em ${processo.data_protocolo}` : '1Doc / Protocolo Web',
      status: 'CONCLUIDA'
    },
    {
      id: 2,
      nome: 'Triagem & Distribuição',
      subtitulo: isDistribuido ? (processo.fiscal_responsavel.split(' ')[0] || 'Atribuído') : 'Aguardando Diretor',
      status: isDistribuido ? 'CONCLUIDA' : 'EM_ANDAMENTO'
    },
    {
      id: 3,
      nome: 'Vistoria In Loco',
      subtitulo: processo.agendado_para ? `Agendada p/ ${processo.agendado_para}` : isVistoriado ? 'Vistoriado' : 'Aguardando Visita',
      status: isVistoriado ? 'CONCLUIDA' : isDistribuido ? 'EM_ANDAMENTO' : 'PENDENTE'
    },
    {
      id: 4,
      nome: 'Análise & Exigências',
      subtitulo: isNotificado ? 'Notificado c/ Prazo' : (processo.pareceres && processo.pareceres.length > 0) ? 'Parecer Concluído' : 'Em Análise',
      status: (isDeferido || isIndeferido) ? 'CONCLUIDA' : (isNotificado || isVistoriado) ? 'EM_ANDAMENTO' : 'PENDENTE'
    },
    {
      id: 5,
      nome: 'Decisão & Concessão',
      subtitulo: isDeferido ? 'Alvará Concedido' : isIndeferido ? 'Indeferido / Encerrado' : 'Aguardando Despacho',
      status: (isDeferido || isIndeferido) ? 'CONCLUIDA' : 'PENDENTE'
    }
  ];
}

/**
 * Constrói a linha do tempo completa, cronológica e enriquecida de um processo
 */
export function getLinhaDoTempoProcesso(processo: ProcessoItem): TramitacaoItem[] {
  const eventos: TramitacaoItem[] = [];

  // 1. EVENTO INICIAL: Autuação / Protocolo
  const dataProto = processo.data_protocolo || processo.data_entrada || processo.data_1doc || '2026-01-05';
  eventos.push({
    id: `proto_${processo.id}`,
    data_hora: dataProto.includes(':') ? dataProto : `${dataProto} 08:30`,
    tipo: 'PROTOCOLO_CRIADO',
    titulo: 'Processo Autuado no Sistema Sanitário',
    descricao: `Entrada formal de requerimento de Licenciamento Sanitário. Protocolo 1Doc: ${processo.prot_1doc || 'S/N'}. Pasta VISA: ${processo.pasta || 'Arquivo Geral'}.`,
    responsavel_nome: 'Atendimento DVIS / 1Doc Protocolo',
    responsavel_cargo: 'PROTOCOLO CENTRAL',
    setor_origem: 'Cidadão / Contabilidade',
    setor_destino: 'DVIS - Balneário Camboriú',
    status_processo_momento: 'NOVO PROTOCOLO'
  });

  // 2. EVENTO DE DISTRIBUIÇÃO AO FISCAL
  if (processo.fiscal_responsavel && !processo.fiscal_responsavel.toUpperCase().includes('NÃO ATRIBU')) {
    const dataDist = processo.data_distribuicao || processo.data_entregue_fiscal || processo.data_protocolo || '2026-01-06';
    eventos.push({
      id: `dist_${processo.id}`,
      data_hora: dataDist.includes(':') ? dataDist : `${dataDist} 10:15`,
      tipo: 'DISTRIBUICAO_FISCAL',
      titulo: `Processo Distribuído ao Auditor Fiscal`,
      descricao: `Demanda direcionada ao auditor fiscal ${processo.fiscal_responsavel} para realização de análise documental e vistoria sanitária no setor ${processo.setor || 'Geral'}.`,
      responsavel_nome: 'Diretoria de Vigilância Sanitária',
      responsavel_cargo: 'DIRETORIA DVIS',
      setor_origem: 'Gabinete da Diretoria',
      setor_destino: processo.setor || 'Fiscalização',
      status_processo_momento: 'DISTRIBUÍDO'
    });
  }

  // 3. SE HOUVE TROCA DE FISCAL
  if (processo.trocado_em && processo.trocado_por_diretor) {
    eventos.push({
      id: `troca_${processo.id}`,
      data_hora: processo.trocado_em,
      tipo: 'TROCA_FISCAL',
      titulo: 'Reatribuição de Fiscal pela Diretoria',
      descricao: `O processo foi transferido para ${processo.fiscal_responsavel}. Justificativa da Diretoria: ${processo.motivo_troca_fiscal || 'Redistribuição de carga de trabalho'}.`,
      responsavel_nome: processo.trocado_por_diretor,
      responsavel_cargo: 'DIRETOR DE VIGILÂNCIA SANITÁRIA',
      setor_origem: 'Diretoria',
      setor_destino: 'Fiscalização',
      status_processo_momento: 'EM ANÁLISE'
    });
  }

  // 4. SE HOUVE AGENDAMENTO DE VISTORIA
  if (processo.agendado_para) {
    eventos.push({
      id: `agend_${processo.id}`,
      data_hora: `${processo.agendado_para} 09:00`,
      tipo: 'VISTORIA_AGENDADA',
      titulo: 'Vistoria Sanitária In Loco Agendada',
      descricao: `Vistoria física agendada no estabelecimento localizado em ${processo.endereco}, bairro ${processo.bairro || 'Centro'}.`,
      responsavel_nome: processo.fiscal_responsavel || 'Auditor Fiscal',
      responsavel_cargo: 'FISCAL SANITÁRIO',
      setor_origem: 'Fiscalização',
      status_processo_momento: 'VISTORIA AGENDADA'
    });
  }

  // 5. PARECERES TÉCNICOS & DESPACHOS SANITÁRIOS
  if (processo.pareceres && processo.pareceres.length > 0) {
    processo.pareceres.forEach((p, idx) => {
      const isNotif = p.tipo_parecer.toUpperCase().includes('NOTIF') || p.novo_status === 'NOTIFICADO';
      const isFavoravel = p.tipo_parecer.toUpperCase().includes('FAVORÁVEL') || p.novo_status === 'DEFERIDO';
      const isDesfavoravel = p.tipo_parecer.toUpperCase().includes('DESFAVORÁVEL') || p.novo_status === 'INDEFERIDO';

      let tipo: TipoTramitacao = 'PARECER_EMITIDO';
      let tit = `Parecer Técnico: ${p.tipo_parecer}`;

      if (isNotif) {
        tipo = 'NOTIFICACAO_LAVRADA';
        tit = 'Auto de Notificação e Intimação Sanitária Lavrado';
      } else if (isFavoravel) {
        tipo = 'DEFERIMENTO_ALVARA';
        tit = 'Parecer Técnico Favorável Emitido';
      } else if (isDesfavoravel) {
        tipo = 'AUTO_INFRACAO';
        tit = 'Parecer Desfavorável / Auto de Infração';
      }

      eventos.push({
        id: `parecer_${p.id || idx}`,
        data_hora: p.data_hora,
        tipo,
        titulo: tit,
        descricao: `${p.parecer_texto}${p.condicionantes ? `\n\nCondicionantes/Exigências: ${p.condicionantes}` : ''}`,
        responsavel_nome: p.autor_nome,
        responsavel_cargo: p.autor_cargo || 'AUDITOR FISCAL SANITÁRIO',
        responsavel_matricula: p.autor_matricula,
        status_processo_momento: p.novo_status || processo.status,
        prazo_dias: isNotif ? 30 : undefined,
        documento_relacionado: {
          tipo: isNotif ? 'AUTO_NOTIFICACAO' : isFavoravel ? 'PARECER_TECNICO' : 'AUTO_INFRACAO',
          auth_code: p.codigo_autenticacao
        }
      });
    });
  }

  // 6. CONCLUSÃO / EMISSÃO DE ALVARÁ
  if (processo.status === 'DEFERIDO' && processo.validade) {
    eventos.push({
      id: `alvara_${processo.id}`,
      data_hora: `${processo.validade.split('-')[0]}-02-15 14:00`,
      tipo: 'DEFERIMENTO_ALVARA',
      titulo: 'Licença Sanitária / Alvará Concedido',
      descricao: `Alvará Sanitário formalmente concedido com validade regular até ${processo.validade}. Estabelecimento regular perante a Lei Complementar nº 40/2019.`,
      responsavel_nome: processo.fiscal_responsavel || 'Equipe DVIS',
      responsavel_cargo: 'VIGILÂNCIA SANITÁRIA',
      status_processo_momento: 'DEFERIDO'
    });
  }

  // 7. DESPACHOS E TRAMITAÇÕES MANUAIS ADICIONADAS
  if (processo.tramitacoes && Array.isArray(processo.tramitacoes)) {
    processo.tramitacoes.forEach((t) => {
      // Evita duplicatas se já adicionado por ID
      if (!eventos.some((e) => e.id === t.id)) {
        eventos.push(t);
      }
    });
  }

  // Também recupera tramitações salvas localmente
  try {
    const rawLocal = localStorage.getItem(`visa_processo_tramitacoes_${processo.id}`);
    if (rawLocal) {
      const localTramits: TramitacaoItem[] = JSON.parse(rawLocal);
      if (Array.isArray(localTramits)) {
        localTramits.forEach((t) => {
          if (!eventos.some((e) => e.id === t.id)) {
            eventos.push(t);
          }
        });
      }
    }
  } catch {}

  // Ordena cronologicamente (do mais antigo para o mais recente)
  return eventos.sort((a, b) => {
    const timeA = new Date(a.data_hora.replace(' ', 'T')).getTime() || 0;
    const timeB = new Date(b.data_hora.replace(' ', 'T')).getTime() || 0;
    return timeA - timeB;
  });
}

/**
 * Adiciona um novo despacho/tramitação oficial ao processo e persiste
 */
export function adicionarTramitacaoAoProcesso(
  processo: ProcessoItem,
  novaTramitacao: {
    tipo: TipoTramitacao;
    titulo: string;
    descricao: string;
    prazo_dias?: number;
    setor_origem?: string;
    setor_destino?: string;
  },
  currentUser: UserProfile | null
): { processoAtualizado: ProcessoItem; novaTramitacaoCompleta: TramitacaoItem } {
  const agora = new Date();
  const dataHoraFormatada = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')} ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

  const tramitacaoCompleta: TramitacaoItem = {
    id: `tramit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    data_hora: dataHoraFormatada,
    tipo: novaTramitacao.tipo,
    titulo: novaTramitacao.titulo,
    descricao: novaTramitacao.descricao,
    responsavel_nome: currentUser?.nome_completo || 'Servidor Sanitário',
    responsavel_cargo: currentUser?.cargo || 'SERVIDOR PÚBLICO',
    responsavel_matricula: currentUser?.matricula || 'DVIS-BC',
    setor_origem: novaTramitacao.setor_origem || currentUser?.setor || 'DVIS',
    setor_destino: novaTramitacao.setor_destino,
    status_processo_momento: processo.status,
    prazo_dias: novaTramitacao.prazo_dias
  };

  const tramitacoesExistentes = processo.tramitacoes ? [...processo.tramitacoes] : [];
  const atualizadas = [...tramitacoesExistentes, tramitacaoCompleta];

  const processoAtualizado: ProcessoItem = {
    ...processo,
    tramitacoes: atualizadas
  };

  // Salva no localStorage para persistência imediata
  try {
    localStorage.setItem(`visa_processo_tramitacoes_${processo.id}`, JSON.stringify(atualizadas));
  } catch (err) {
    console.warn('Erro ao salvar tramitação localmente:', err);
  }

  return {
    processoAtualizado,
    novaTramitacaoCompleta: tramitacaoCompleta
  };
}

/**
 * Calcula dias úteis e tempo corrido entre duas datas
 */
export function calcularDiasDecorridos(dataInicio: string, dataFim?: string): number {
  try {
    const d1 = new Date(dataInicio.replace(' ', 'T')).getTime();
    const d2 = dataFim ? new Date(dataFim.replace(' ', 'T')).getTime() : Date.now();
    const diffMs = Math.abs(d2 - d1);
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}
