import React, { useMemo, useState } from 'react';
import {
  AlvaraSanitarioItem,
  AmostraLaboratorioItem,
  EscalaItem,
  FeiranteItem,
  FiscalizacaoItem,
  HabiteSeRegistroItem,
  PasJuridicoItem,
  PastaVisaItem,
  ProcessoItem,
  SolicitacaoLaudoPotabilidadeItem,
  TramitacaoItem,
  UserProfile,
} from '../../types';
import {
  cleanDoc,
  formatDoc,
  getDisplayPastaNumero,
  savePastaVisaEnhanced,
} from '../../lib/pastaVisaService';
import {
  computePastaSemaforo,
  gerarAlvaraDeProcessoDeferido,
  getLabRecordsForPasta,
  instaurarPasDeHistorico,
} from '../../lib/interlaceServices';
import { fetchCnpj } from '../../lib/cnpjService';
import { isColetaRealizada, isLaudoAssinado } from '../../lib/potabilidadeService';
import { formatShortBrDate } from './sinncTypes';
import {
  ArrowLeft,
  Award,
  Building2,
  CalendarClock,
  CheckCircle2,
  Droplet,
  FileCheck2,
  FileText,
  FolderOpen,
  Gavel,
  Headphones,
  Microscope,
  Plus,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

export type DossieSubTab =
  | 'cadastro'
  | 'processos'
  | 'documentos_laudos'
  | 'notificacoes_agenda'
  | 'alvaras'
  | 'habite_feiras_pas'
  | 'atendimento_portal';

interface SinncPastaDossie360Props {
  pasta: PastaVisaItem;
  currentUser: UserProfile | null;
  processos: ProcessoItem[];
  fiscalizacoes: FiscalizacaoItem[];
  amostrasLaboratorio: AmostraLaboratorioItem[];
  solicitacoesLab: SolicitacaoLaudoPotabilidadeItem[];
  alvaras: AlvaraSanitarioItem[];
  feiras: FeiranteItem[];
  escala: EscalaItem[];
  habiteSeList: HabiteSeRegistroItem[];
  pasList: PasJuridicoItem[];
  onClose: () => void;
  onSelectProcesso: (proc: ProcessoItem) => void;
  onSaveProcesso: (proc: ProcessoItem) => Promise<void> | void;
  onRefreshState: () => void;
  onOpenNovaDemandaPasta: (pasta: PastaVisaItem) => void;
  onOpenNovaVistoriaPasta: (pasta: PastaVisaItem) => void;
  onOpenSolicitarLab: (pasta: PastaVisaItem) => void;
  onOpenTermoColeta: (amostra?: AmostraLaboratorioItem | null, sol?: SolicitacaoLaudoPotabilidadeItem | null) => void;
  onOpenLaudoOficial: (amostra?: AmostraLaboratorioItem | null, sol?: SolicitacaoLaudoPotabilidadeItem | null) => void;
}

export const SinncPastaDossie360: React.FC<SinncPastaDossie360Props> = ({
  pasta,
  currentUser,
  processos,
  fiscalizacoes,
  amostrasLaboratorio,
  solicitacoesLab,
  alvaras,
  feiras,
  escala,
  habiteSeList,
  pasList,
  onClose,
  onSelectProcesso,
  onSaveProcesso,
  onRefreshState,
  onOpenNovaDemandaPasta,
  onOpenNovaVistoriaPasta,
  onOpenSolicitarLab,
  onOpenTermoColeta,
  onOpenLaudoOficial,
}) => {
  const [subTab, setSubTab] = useState<DossieSubTab>('cadastro');
  const [refreshingRf, setRefreshingRf] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [obsInput, setObsInput] = useState(pasta.observacoes || '');
  const [citizenReplyText, setCitizenReplyText] = useState('');
  const [citizenReplyProcId, setCitizenReplyProcId] = useState<string>('');
  const [alvaraValidade, setAlvaraValidade] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });

  const limpo = cleanDoc(pasta.cpf_cnpj_limpo || pasta.cnpj_cpf);
  const numeroPasta = getDisplayPastaNumero(pasta);
  const isFisica = pasta.origem_numeracao === 'FISICA_EXISTENTE';

  const pastaProcessos = useMemo(
    () =>
      processos.filter((p) => {
        const pDoc = cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf);
        const pNum = String(p.numero_pasta || p.pasta || '').trim();
        return (limpo && pDoc === limpo) || (numeroPasta && pNum === numeroPasta);
      }),
    [processos, limpo, numeroPasta]
  );

  const pastaAlvaras = useMemo(
    () =>
      alvaras.filter((a) => {
        const aDoc = cleanDoc(a.cpf_cnpj_limpo || a.cnpj_cpf);
        const aNum = String(a.numero_pasta || a.pasta || '').trim();
        return (limpo && aDoc === limpo) || (numeroPasta && aNum === numeroPasta);
      }),
    [alvaras, limpo, numeroPasta]
  );

  const pastaFisc = useMemo(
    () =>
      fiscalizacoes.filter((f) => {
        const fDoc = cleanDoc(f.cpf_cnpj_limpo || f.estabelecimento?.cnpjCpf);
        const fNum = String(f.numero_pasta || '').trim();
        return (limpo && fDoc === limpo) || (numeroPasta && fNum === numeroPasta);
      }),
    [fiscalizacoes, limpo, numeroPasta]
  );

  const pastaFeiras = useMemo(
    () =>
      feiras.filter((f) => {
        const doc1 = cleanDoc(f.cnpj);
        const doc2 = cleanDoc(f.cpf);
        const fNum = String(f.numero_pasta || f.pasta || '').trim();
        return (limpo && (doc1 === limpo || doc2 === limpo)) || (numeroPasta && fNum === numeroPasta);
      }),
    [feiras, limpo, numeroPasta]
  );

  const pastaHabite = useMemo(
    () =>
      habiteSeList.filter(
        (h) => (limpo && cleanDoc(h.cpf_cnpj_limpo || h.cnpj_cpf) === limpo) || (numeroPasta && h.numero_pasta === numeroPasta)
      ),
    [habiteSeList, limpo, numeroPasta]
  );

  const pastaPas = useMemo(
    () =>
      pasList.filter(
        (p) => (limpo && cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === limpo) || (numeroPasta && p.numero_pasta === numeroPasta)
      ),
    [pasList, limpo, numeroPasta]
  );

  const pastaLab = useMemo(
    () => getLabRecordsForPasta(pasta, amostrasLaboratorio, solicitacoesLab, pastaProcessos),
    [pasta, amostrasLaboratorio, solicitacoesLab, pastaProcessos]
  );

  const pastaAgenda = useMemo(() => {
    const razaoLow = (pasta.razao_social || '').toLowerCase();
    return escala.filter((e) => {
      const desc = `${e.descricao || ''} ${e.servidores || ''}`.toLowerCase();
      return (numeroPasta && desc.includes(numeroPasta.toLowerCase())) || (razaoLow && desc.includes(razaoLow.slice(0, 14)));
    });
  }, [escala, numeroPasta, pasta.razao_social]);

  const semaforo = useMemo(
    () =>
      computePastaSemaforo({
        pasta,
        processos: pastaProcessos,
        alvaras: pastaAlvaras,
        fiscalizacoes: pastaFisc,
        lab: pastaLab,
        pasList: pastaPas,
      }),
    [pasta, pastaProcessos, pastaAlvaras, pastaFisc, pastaLab, pastaPas]
  );

  // Linha do tempo cronológica unificada de Documentos & Laudos
  const documentosCronologicos = useMemo(() => {
    type TimelineDoc = {
      id: string;
      data: string;
      categoria: 'PARECER' | 'TRAMITACAO' | 'VISTORIA' | 'LAB_SOLICITACAO' | 'LAB_COLETA' | 'LAB_LAUDO' | 'ALVARA' | 'PAS';
      titulo: string;
      detalhe: string;
      autor: string;
      onOpen?: () => void;
      badgeStatus?: string;
    };

    const list: TimelineDoc[] = [];

    pastaProcessos.forEach((proc) => {
      (proc.pareceres || []).forEach((par) => {
        list.push({
          id: `par-${par.id}`,
          data: par.data_hora || proc.data_protocolo || '',
          categoria: 'PARECER',
          titulo: `Parecer ${par.tipo_parecer} · Proc. ${proc.num_processo}`,
          detalhe: par.parecer_texto,
          autor: `${par.autor_nome} · ${par.codigo_autenticacao}`,
          onOpen: () => onSelectProcesso(proc),
          badgeStatus: par.novo_status,
        });
      });

      (proc.tramitacoes || []).forEach((tr) => {
        list.push({
          id: `tr-${tr.id}`,
          data: tr.data_hora || '',
          categoria: 'TRAMITACAO',
          titulo: `${tr.titulo} · Proc. ${proc.num_processo}`,
          detalhe: tr.descricao,
          autor: tr.responsavel_nome,
          onOpen: () => onSelectProcesso(proc),
          badgeStatus: tr.status_processo_momento,
        });
      });
    });

    pastaFisc.forEach((f) => {
      list.push({
        id: `fisc-${f.id}`,
        data: f.dataHora || '',
        categoria: 'VISTORIA',
        titulo: `Auto / Termo ${f.protocolo} (${f.medidasAdotadas || f.tipoVistoria})`,
        detalhe: f.observacoesFiscais || 'Inspeção sanitária in loco registrada.',
        autor: f.fiscalNome,
        badgeStatus: f.status,
      });
    });

    pastaLab.solicitacoes.forEach((sol) => {
      list.push({
        id: `sol-lab-${sol.id}`,
        data: sol.data_solicitacao || sol.created_at || '',
        categoria: 'LAB_SOLICITACAO',
        titulo: `Solicitação de Análise de Potabilidade · ${sol.protocolo_1doc || sol.id}`,
        detalhe: `${sol.quantidade_pontos} ponto(s): ${sol.locais_coleta?.join(', ') || 'Água'} · Taxa ${sol.taxa_ufm_total} UFM`,
        autor: sol.responsavel_contato || sol.razao_social,
        badgeStatus: sol.status_solicitacao,
      });
    });

    pastaLab.amostras.forEach((am) => {
      if (isColetaRealizada(am, undefined)) {
        list.push({
          id: `lab-col-${am.id}`,
          data: am.coleta_assinatura_data || am.data_coleta || '',
          categoria: 'LAB_COLETA',
          titulo: `Termo de Coleta em Campo · Amostra ${am.codigo_amostra}`,
          detalhe: `${am.local_coleta} · ${am.bairro}`,
          autor: am.fiscal_coletor || 'Coletor VISA',
          badgeStatus: 'COLETA REALIZADA',
          onOpen: () => onOpenTermoColeta(am, null),
        });
      }
      if (isLaudoAssinado(am, undefined) || am.status === 'NÃO CONFORME' || am.status === 'NAO_CONFORME') {
        list.push({
          id: `lab-lau-${am.id}`,
          data: am.laudo_assinatura_data || am.data_resultado || am.data_coleta || '',
          categoria: 'LAB_LAUDO',
          titulo: `Laudo Laboratorial ${am.laudo_numero || am.codigo_amostra} · ${am.local_coleta}`,
          detalhe: am.conclusao_laudo || `Resultado: ${am.status}`,
          autor: am.laboratorialista || 'Laboratório VISA',
          badgeStatus: am.status,
          onOpen: () => onOpenLaudoOficial(am, null),
        });
      }
    });

    pastaAlvaras.forEach((alv) => {
      list.push({
        id: `alv-${alv.id}`,
        data: alv.data_emissao || alv.criado_em || '',
        categoria: 'ALVARA',
        titulo: `Alvará Sanitário ${alv.numero_alvara} (${alv.tipo_alvara})`,
        detalhe: `Validade até ${formatShortBrDate(alv.validade)} · Cód. ${alv.codigo_autenticacao || '—'}`,
        autor: alv.fiscal_emissor || 'DVIS',
        badgeStatus: alv.status,
      });
    });

    pastaPas.forEach((pas) => {
      list.push({
        id: `pas-${pas.id}`,
        data: pas.data_instauracao || pas.criado_em || '',
        categoria: 'PAS',
        titulo: `Processo Administrativo Sanitário ${pas.numero_pas}`,
        detalhe: `${pas.enquadramento_legal} · Prazo defesa ${formatShortBrDate(pas.prazo_defesa_limite)}`,
        autor: pas.fiscal_autuante,
        badgeStatus: pas.status,
      });
    });

    return list.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  }, [pastaProcessos, pastaFisc, pastaLab, pastaAlvaras, pastaPas, onSelectProcesso, onOpenTermoColeta, onOpenLaudoOficial]);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleRefreshReceita = async () => {
    if (limpo.length !== 14) {
      showToast('Consulta automática à Receita Federal disponível apenas para CNPJ de 14 dígitos.');
      return;
    }
    setRefreshingRf(true);
    try {
      const rf = await fetchCnpj(limpo);
      const updated: PastaVisaItem = {
        ...pasta,
        razao_social: rf.razao || pasta.razao_social,
        status_rf: rf.situacao_cadastral || rf.situacao || pasta.status_rf,
        endereco: `${rf.rua_api || ''} ${rf.num_api ? `, ${rf.num_api}` : ''}`.trim() || pasta.endereco,
        bairro: rf.bairro || pasta.bairro,
        telefone: rf.telefone || pasta.telefone,
        email: rf.email || pasta.email,
        cnae_principal: rf.cnaes?.[0] || rf.cnae || pasta.cnae_principal,
        grau_risco: rf.risco ? `${rf.risco} RISCO` : pasta.grau_risco,
        atualizado_em: new Date().toISOString(),
      };
      await savePastaVisaEnhanced(updated);
      onRefreshState();
      showToast('Dados atualizados com a Receita Federal preservando o número da Pasta.');
    } finally {
      setRefreshingRf(false);
    }
  };

  const handleSalvarObservacoes = async () => {
    const updated: PastaVisaItem = {
      ...pasta,
      observacoes: obsInput,
      atualizado_em: new Date().toISOString(),
    };
    await savePastaVisaEnhanced(updated);
    onRefreshState();
    showToast('Observações da Pasta salvas.');
  };

  const handleEmitirAlvaraDeProcesso = async (proc: ProcessoItem) => {
    const res = await gerarAlvaraDeProcessoDeferido({
      processo: proc,
      pasta,
      validade: alvaraValidade,
      currentUser,
    });
    await onSaveProcesso(res.processoAtualizado);
    onRefreshState();
    showToast(`Alvará ${res.alvara.numero_alvara} emitido e vinculado à Pasta ${numeroPasta}.`);
  };

  const handleInstaurarPas = async (proc: ProcessoItem) => {
    const res = await instaurarPasDeHistorico({
      pasta,
      processoOrigem: proc,
      enquadramentoLegal: 'LC Municipal / Código Sanitário (Art. 158) e Lei Estadual 6.320/83',
      resumoFatos: `Descumprimento ou expiração de prazo no processo ${proc.num_processo} (${proc.assunto}).`,
      currentUser,
    });
    if (res.processoAtualizado) {
      await onSaveProcesso(res.processoAtualizado);
    }
    onRefreshState();
    showToast(`${res.pas.numero_pas} instaurado com prazo de defesa até ${formatShortBrDate(res.pas.prazo_defesa_limite)}.`);
    setSubTab('habite_feiras_pas');
  };

  const handleSimularCumprimentoCidadao = async (e: React.FormEvent) => {
    e.preventDefault();
    const alvo =
      pastaProcessos.find((p) => p.id === citizenReplyProcId) ||
      pastaProcessos.find((p) => p.status === 'NOTIFICADO' || p.status === 'PENDENTE DOCS') ||
      pastaProcessos[0];
    if (!alvo || !citizenReplyText.trim()) return;

    const nowIso = new Date().toISOString();
    const tram: TramitacaoItem = {
      id: `tram-cid-${Date.now()}`,
      data_hora: nowIso,
      tipo: 'CUMPRIMENTO_EXIGENCIA',
      titulo: 'Cumprimento de exigência enviado pelo contribuinte/contador',
      descricao: citizenReplyText.trim(),
      responsavel_nome: pasta.razao_social || 'Contribuinte',
      status_processo_momento: 'EM ANÁLISE',
      anexo_nome: 'comprovante-adequacao-pasta.pdf',
    };

    const updated: ProcessoItem = {
      ...alvo,
      status: 'EM ANÁLISE',
      pasta: numeroPasta,
      numero_pasta: numeroPasta,
      cpf_cnpj_limpo: limpo,
      cumprimento_cidadao: {
        data_envio: nowIso,
        responsavel: pasta.razao_social,
        descricao: citizenReplyText.trim(),
        anexo_nome: 'comprovante-adequacao-pasta.pdf',
        status: 'AGUARDANDO_CONFERENCIA',
      },
      tramitacoes: [tram, ...(alvo.tramitacoes || [])],
    };

    await onSaveProcesso(updated);
    onRefreshState();
    setCitizenReplyText('');
    showToast(`Cumprimento protocolado na Pasta ${numeroPasta} e direcionado ao fiscal ${alvo.fiscal_responsavel}.`);
  };

  const handleConferirCumprimentoFiscal = async (proc: ProcessoItem, aceitar: boolean) => {
    if (!proc.cumprimento_cidadao) return;
    const nowIso = new Date().toISOString();
    const fiscal = currentUser?.nome_completo || proc.fiscal_responsavel || 'Auditor Fiscal';
    const tram: TramitacaoItem = {
      id: `tram-conf-${Date.now()}`,
      data_hora: nowIso,
      tipo: 'DESPACHO_ADMINISTRATIVO',
      titulo: aceitar
        ? 'Cumprimento conferido e aceito pelo fiscal'
        : 'Cumprimento devolvido para complementação documental',
      descricao: aceitar
        ? `Exigência atendida para o processo ${proc.num_processo}.`
        : 'Documentação insuficiente. Mantida notificação para readequação.',
      responsavel_nome: fiscal,
      status_processo_momento: aceitar ? 'EM ANÁLISE' : 'PENDENTE DOCS',
    };

    const updated: ProcessoItem = {
      ...proc,
      status: aceitar ? 'EM ANÁLISE' : 'PENDENTE DOCS',
      cumprimento_cidadao: {
        ...proc.cumprimento_cidadao,
        status: aceitar ? 'ACEITO' : 'DEVOLVIDO',
      },
      tramitacoes: [tram, ...(proc.tramitacoes || [])],
    };

    await onSaveProcesso(updated);
    onRefreshState();
    showToast(aceitar ? 'Cumprimento aceito pelo fiscal.' : 'Devolvido ao contribuinte para complementação.');
  };

  const semaforoBadgeStyle =
    semaforo.nivel === 'VERMELHO'
      ? 'bg-red-50 text-[#DC2626] border-red-200'
      : semaforo.nivel === 'AMARELO'
      ? 'bg-amber-50 text-[#D97706] border-amber-200'
      : 'bg-emerald-50 text-[#16A34A] border-emerald-200';

  const tabs: { id: DossieSubTab; label: string; count?: number }[] = [
    { id: 'cadastro', label: 'Cadastro & RFB' },
    { id: 'processos', label: 'Demandas & Processos', count: pastaProcessos.length },
    { id: 'documentos_laudos', label: 'Documentos & Laudos', count: documentosCronologicos.length },
    { id: 'notificacoes_agenda', label: 'Notificações & Agenda', count: pastaFisc.length + pastaAgenda.length },
    { id: 'alvaras', label: 'Alvarás', count: pastaAlvaras.length },
    { id: 'habite_feiras_pas', label: 'Habite-se, Feiras & PAS', count: pastaHabite.length + pastaFeiras.length + pastaPas.length },
    { id: 'atendimento_portal', label: 'Portal Cidadão / Contador' },
  ];

  return (
    <div className="space-y-4 text-left">
      {/* Cabeçalho Dossiê 360° */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="mt-0.5 p-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 cursor-pointer shrink-0"
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#e6eef6] text-[#285277] font-mono font-semibold tabular-nums border border-[#c7d9ea]">
                  <FolderOpen className="w-3.5 h-3.5" />
                  Pasta {numeroPasta || 'S/N'}
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  {isFisica ? 'Física existente preservada' : 'Sequencial 6 dígitos (Híbrida)'}
                </span>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${semaforoBadgeStyle}`}>
                  Semáforo: {semaforo.label}
                </span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 mt-1.5 truncate">
                {pasta.razao_social || 'Contribuinte sem razão social'}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                <span>Doc: {formatDoc(pasta.cnpj_cpf || limpo) || 'Não informado'}</span>
                <span>·</span>
                <span>RFB: {pasta.status_rf || 'ATIVA'}</span>
                <span>·</span>
                <span>Setor: {pasta.setor || 'VISA'}</span>
                {pasta.pasta_referencia_anterior && pasta.pasta_referencia_anterior !== numeroPasta && (
                  <>
                    <span>·</span>
                    <span>Ref. anterior: {pasta.pasta_referencia_anterior}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenNovaDemandaPasta(pasta)}
              className="px-3 py-1.5 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Demanda</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenNovaVistoriaPasta(pasta)}
              className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Vistoria / Notificar</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenSolicitarLab(pasta)}
              className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Droplet className="w-3.5 h-3.5 text-[#3b6d96]" />
              <span>Solicitar Coleta Lab</span>
            </button>
          </div>
        </div>

        {/* Barra de motivos do Semáforo + Feedback */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-200/80 text-xs">
          <div className="text-slate-600">
            <span className="font-semibold text-slate-700">Situação da Pasta: </span>
            {semaforo.motivos.join(' · ')}
          </div>
          {feedbackMsg && (
            <div className="text-xs font-medium text-emerald-700 flex items-center gap-1.5 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{feedbackMsg}</span>
            </div>
          )}
        </div>

        {/* Alertas de Retorno Automático do Laboratório dentro da Pasta */}
        {(pastaLab.insatisfatoriasCount > 0 || pastaLab.laudosEmitidosCount > 0) && (
          <div
            className={`px-3.5 py-2.5 rounded-md border text-xs flex flex-wrap items-center justify-between gap-2 ${
              pastaLab.insatisfatoriasCount > 0
                ? 'bg-red-50/70 border-red-200 text-[#DC2626]'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              <Microscope className="w-4 h-4 shrink-0" />
              <span>
                {pastaLab.insatisfatoriasCount > 0
                  ? `Alerta Laboratório: ${pastaLab.insatisfatoriasCount} amostra(s) NÃO CONFORME(S) vinculada(s) a esta Pasta — exige ação fiscal ou reinspeção.`
                  : `Laboratório integrado: ${pastaLab.laudosEmitidosCount} laudo(s) oficial(is) disponível(is) na sequência documental desta Pasta.`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSubTab('documentos_laudos')}
              className="text-xs font-semibold underline cursor-pointer whitespace-nowrap"
            >
              Ver laudos e termos
            </button>
          </div>
        )}

        {/* Sub-abas do Dossiê */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 border-t border-slate-100">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                subTab === t.id
                  ? 'bg-[#e6eef6] text-[#285277] font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{t.label}</span>
              {typeof t.count === 'number' && (
                <span className="font-mono text-[11px] tabular-nums text-slate-500">({t.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: CADASTRO & RFB */}
      {subTab === 'cadastro' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#3b6d96]" />
                <span>Identificação Única & Receita Federal</span>
              </h2>
              {limpo.length === 14 && (
                <button
                  type="button"
                  onClick={handleRefreshReceita}
                  disabled={refreshingRf}
                  className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingRf ? 'animate-spin' : ''}`} />
                  <span>{refreshingRf ? 'Consultando...' : 'Atualizar RFB'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Número da Pasta VISA</span>
                <span className="font-mono font-semibold text-slate-900 text-sm tabular-nums">{numeroPasta}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Origem da Numeração (Opção A Híbrida)</span>
                <span className="font-medium text-slate-800">
                  {isFisica ? 'Pasta Física Existente Preservada' : 'Gerada Sequencialmente (6 Dígitos)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">CPF / CNPJ Vinculado</span>
                <span className="font-mono text-slate-800 tabular-nums">{formatDoc(pasta.cnpj_cpf || limpo)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Situação Cadastral RFB</span>
                <span className="font-medium text-slate-800">{pasta.status_rf || 'ATIVA'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">CNAE Principal</span>
                <span className="text-slate-800">{pasta.cnae_principal || pastaProcessos[0]?.cnae || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Grau de Risco Sanitário</span>
                <span className="text-slate-800">{pasta.grau_risco || pastaProcessos[0]?.grau_risco || 'MÉDIO RISCO'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 block">Endereço</span>
                <span className="text-slate-800">
                  {pasta.endereco || pastaProcessos[0]?.endereco || 'Não cadastrado'}{' '}
                  {(pasta.bairro || pastaProcessos[0]?.bairro) ? `· ${pasta.bairro || pastaProcessos[0]?.bairro}` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Telefone / Contato</span>
                <span className="text-slate-800 font-mono tabular-nums">{pasta.telefone || pastaProcessos[0]?.telefone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">E-mail</span>
                <span className="text-slate-800">{pasta.email || pastaProcessos[0]?.email || '—'}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-3">
              Anotações Permanentes da Pasta
            </h2>
            <textarea
              rows={5}
              value={obsInput}
              onChange={(e) => setObsInput(e.target.value)}
              placeholder="Registre observações administrativas permanentes da Pasta física ou digital..."
              className="w-full !text-xs !p-2.5"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSalvarObservacoes}
                className="px-3.5 py-1.5 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium cursor-pointer"
              >
                Salvar anotações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEMANDAS & PROCESSOS */}
      {subTab === 'processos' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-[#f4f6f9] border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700 tabular-nums">
              Processos e protocolos vinculados à Pasta {numeroPasta} ({pastaProcessos.length})
            </span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Validade p/ emissão de alvará:</span>
              <input
                type="date"
                value={alvaraValidade}
                onChange={(e) => setAlvaraValidade(e.target.value)}
                className="!py-1 !px-2 !text-xs font-mono"
              />
            </div>
          </div>
          <div className="divide-y divide-slate-200">
            {pastaProcessos.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs text-slate-500">Nenhuma demanda vinculada a esta Pasta ainda.</p>
                <button
                  type="button"
                  onClick={() => onOpenNovaDemandaPasta(pasta)}
                  className="px-3 py-1.5 rounded-md bg-[#3b6d96] text-white text-xs font-medium cursor-pointer"
                >
                  Abrir primeira demanda na Pasta
                </button>
              </div>
            ) : (
              pastaProcessos.map((proc) => (
                <div key={proc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-[#f8fafc]">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">{proc.num_processo}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-medium text-slate-700">{proc.assunto}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-semibold text-[#285277]">{proc.status}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Fiscal responsável: <span className="font-medium text-slate-700">{proc.fiscal_responsavel || 'Aguardando distribuição'}</span>
                      {' · '}Protocolo: {formatShortBrDate(proc.data_protocolo)}
                      {(proc.prazo_vistoria || proc.venc_1doc) && ` · Prazo: ${formatShortBrDate(proc.prazo_vistoria || proc.venc_1doc)}`}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectProcesso(proc)}
                      className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                    >
                      Parecer / Trâmite
                    </button>
                    {proc.status === 'DEFERIDO' && (
                      <button
                        type="button"
                        onClick={() => handleEmitirAlvaraDeProcesso(proc)}
                        className="px-2.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-medium cursor-pointer flex items-center gap-1"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Emitir Alvará</span>
                      </button>
                    )}
                    {(proc.status === 'NOTIFICADO' || proc.status === 'PENDENTE DOCS') && !proc.pas && (
                      <button
                        type="button"
                        onClick={() => handleInstaurarPas(proc)}
                        className="px-2.5 py-1.5 rounded border border-red-300 bg-red-50 hover:bg-red-100 text-[#DC2626] font-medium cursor-pointer flex items-center gap-1"
                      >
                        <Gavel className="w-3.5 h-3.5" />
                        <span>Instaurar PAS</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DOCUMENTOS & LAUDOS EM SEQUÊNCIA CRONOLÓGICA (INCLUINDO RETORNO DO LABORATÓRIO) */}
      {subTab === 'documentos_laudos' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Sequência Documental & Retorno Automático do Laboratório
              </h2>
              <p className="text-xs text-slate-500">
                As telas do Laboratório permanecem intactas; termos de coleta e laudos assinados retornam automaticamente aqui na Pasta {numeroPasta}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenSolicitarLab(pasta)}
              className="px-3 py-1.5 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Droplet className="w-3.5 h-3.5" />
              <span>Solicitar Laudo de Água</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
            {documentosCronologicos.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-500">
                Nenhum documento, parecer ou laudo laboratorial registrado nesta Pasta ainda.
              </p>
            ) : (
              documentosCronologicos.map((doc) => (
                <div key={doc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-[#f8fafc]">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                        {formatShortBrDate(doc.data)}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="font-semibold text-slate-800">{doc.titulo}</span>
                      {doc.badgeStatus && (
                        <span
                          className={`font-mono text-[10.5px] font-semibold ${
                            doc.badgeStatus === 'NÃO CONFORME' || doc.badgeStatus === 'NAO_CONFORME'
                              ? 'text-[#DC2626]'
                              : doc.badgeStatus === 'LAUDO EMITIDO' || doc.badgeStatus === 'CONFORME' || doc.badgeStatus === 'ATIVO'
                              ? 'text-[#16A34A]'
                              : 'text-slate-600'
                          }`}
                        >
                          [{doc.badgeStatus}]
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 leading-relaxed">{doc.detalhe}</p>
                    <p className="text-[11px] text-slate-400">Responsável: {doc.autor}</p>
                  </div>
                  {doc.onOpen && (
                    <button
                      type="button"
                      onClick={doc.onOpen}
                      className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      Visualizar documento
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: NOTIFICAÇÕES, PRAZOS & AGENDA */}
      {subTab === 'notificacoes_agenda' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                Vistorias e Notificações ({pastaFisc.length})
              </span>
              <button
                type="button"
                onClick={() => onOpenNovaVistoriaPasta(pasta)}
                className="text-xs font-medium text-[#3b6d96] hover:underline cursor-pointer"
              >
                + Nova Vistoria / Prazo
              </button>
            </div>
            <div className="divide-y divide-slate-200">
              {pastaFisc.length === 0 ? (
                <p className="p-6 text-center text-xs text-slate-500">Nenhuma vistoria vinculada a esta Pasta.</p>
              ) : (
                pastaFisc.map((f) => (
                  <div key={f.id} className="p-3.5 text-xs space-y-1">
                    <div className="flex items-center justify-between font-medium">
                      <span className="font-mono text-slate-800">{f.protocolo} · {f.medidasAdotadas || f.tipoVistoria}</span>
                      <span className={f.status === 'INTERDITADO' ? 'text-[#DC2626] font-semibold' : 'text-slate-600'}>
                        {f.status}
                      </span>
                    </div>
                    <p className="text-slate-600">{f.observacoesFiscais || 'Sem observações adicionais.'}</p>
                    <p className="text-[11px] text-slate-400">
                      Fiscal: {f.fiscalNome} · Data: {formatShortBrDate(f.dataHora)}
                      {f.prazoAdequacaoDias ? ` · Prazo concedido: ${f.prazoAdequacaoDias} dia(s)` : ''}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-[#3b6d96]" />
                <span>Lembretes Automáticos na Agenda ({pastaAgenda.length})</span>
              </span>
            </div>
            <div className="divide-y divide-slate-200">
              {pastaAgenda.length === 0 ? (
                <p className="p-6 text-center text-xs text-slate-500">
                  Ao registrar uma notificação com prazo de adequação, o lembrete de retorno é criado automaticamente aqui e na Agenda.
                </p>
              ) : (
                pastaAgenda.map((ag) => (
                  <div key={ag.id} className="p-3.5 text-xs flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 truncate">{ag.descricao || ag.tipo}</div>
                      <div className="text-[11px] text-slate-500 truncate">Fiscal: {ag.servidores}</div>
                    </div>
                    <span className="font-mono text-slate-700 tabular-nums shrink-0">{formatShortBrDate(ag.data)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ALVARÁS & RENOVAÇÃO */}
      {subTab === 'alvaras' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-[#f4f6f9] border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Alvarás Sanitários da Pasta {numeroPasta} ({pastaAlvaras.length})
            </span>
          </div>
          <div className="divide-y divide-slate-200">
            {pastaAlvaras.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">
                Nenhum alvará emitido nesta Pasta ainda. Ao deferir um processo, clique em &quot;Emitir Alvará&quot;.
              </p>
            ) : (
              pastaAlvaras.map((alv) => (
                <div key={alv.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-800 font-mono">
                      Alvará {alv.numero_alvara} · {alv.tipo_alvara}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Emissão: {formatShortBrDate(alv.data_emissao)} · Fiscal: {alv.fiscal_emissor || '—'} · Cód: {alv.codigo_autenticacao || '—'}
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className={alv.status === 'VENCIDO' ? 'text-[#DC2626] font-semibold' : 'text-[#16A34A] font-semibold'}>
                      {alv.status}
                    </div>
                    <div className="text-[11px] text-slate-500">Validade: {formatShortBrDate(alv.validade)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: HABITE-SE, FEIRAS & PAS JURÍDICO */}
      {subTab === 'habite_feiras_pas' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 text-xs font-semibold text-slate-700">
              Habite-se Sanitário ({pastaHabite.length})
            </div>
            <div className="divide-y divide-slate-200">
              {pastaHabite.length === 0 ? (
                <p className="p-5 text-xs text-slate-500 text-center">Sem registros de Habite-se nesta Pasta.</p>
              ) : (
                pastaHabite.map((h) => (
                  <div key={h.id} className="p-3.5 text-xs space-y-1">
                    <div className="font-mono font-semibold text-slate-800">{h.numero_protocolo} · {h.tipo_peticao}</div>
                    <div className="text-slate-700">{h.nome_edificacao}</div>
                    <div className="text-[11px] text-slate-500">Status: {h.status} · {h.bairro}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 text-xs font-semibold text-slate-700">
              Feiras & Ambulantes ({pastaFeiras.length})
            </div>
            <div className="divide-y divide-slate-200">
              {pastaFeiras.length === 0 ? (
                <p className="p-5 text-xs text-slate-500 text-center">Sem vínculo de feira/ambulante nesta Pasta.</p>
              ) : (
                pastaFeiras.map((f) => (
                  <div key={f.id} className="p-3.5 text-xs space-y-1">
                    <div className="font-semibold text-slate-800">{f.feira} · Box/Prot: {f.num_prot}</div>
                    <div className="text-slate-600">{f.produtos}</div>
                    <div className="text-[11px] text-slate-500">Alvará: {f.alvara || 'EM ANDAMENTO'}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-[#DC2626]" />
              <span>PAS Jurídico ({pastaPas.length})</span>
            </div>
            <div className="divide-y divide-slate-200">
              {pastaPas.length === 0 ? (
                <p className="p-5 text-xs text-slate-500 text-center">Nenhum PAS instaurado para esta Pasta.</p>
              ) : (
                pastaPas.map((p) => (
                  <div key={p.id} className="p-3.5 text-xs space-y-1">
                    <div className="font-mono font-semibold text-[#DC2626]">{p.numero_pas} · {p.status}</div>
                    <div className="text-slate-700">{p.enquadramento_legal}</div>
                    <div className="text-[11px] text-slate-500">
                      Defesa até: {formatShortBrDate(p.prazo_defesa_limite)} · Fiscal: {p.fiscal_autuante}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: ATENDIMENTO CIDADÃO / CONTADOR & CONFERÊNCIA DO FISCAL */}
      {subTab === 'atendimento_portal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <form onSubmit={handleSimularCumprimentoCidadao} className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
              <Headphones className="w-4 h-4 text-[#3b6d96]" />
              <span>Portal Cidadão / Contador — Enviar Cumprimento para a Pasta</span>
            </h2>
            <p className="text-xs text-slate-500">
              Simula o envio de adequação ou documento pelo contribuinte/contabilidade diretamente para o fiscal titular do processo.
            </p>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Processo vinculado na Pasta</label>
              <select
                value={citizenReplyProcId || pastaProcessos[0]?.id || ''}
                onChange={(e) => setCitizenReplyProcId(e.target.value)}
                className="w-full !text-xs !py-2 !px-2.5"
              >
                {pastaProcessos.length === 0 ? (
                  <option value="">Nenhum processo na Pasta (abra uma demanda primeiro)</option>
                ) : (
                  pastaProcessos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.num_processo} — {p.assunto} ({p.status})
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Descrição do cumprimento / comprovante anexado</label>
              <textarea
                rows={3}
                value={citizenReplyText}
                onChange={(e) => setCitizenReplyText(e.target.value)}
                placeholder="Ex: Adequações sanitárias executadas conforme termo de intimação; PGRSS e certificado de dedetização anexados..."
                className="w-full !text-xs !p-2.5"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={pastaProcessos.length === 0 || !citizenReplyText.trim()}
                className="px-4 py-2 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] disabled:opacity-50 text-white text-xs font-medium cursor-pointer"
              >
                Protocolar Cumprimento na Pasta
              </button>
            </div>
          </form>

          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
              <FileCheck2 className="w-4 h-4 text-[#3b6d96]" />
              <span>Conferência pelo Fiscal Responsável</span>
            </h2>
            {pastaProcessos.filter((p) => Boolean(p.cumprimento_cidadao)).length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                Nenhum cumprimento enviado pelo contribuinte/contador aguardando conferência nesta Pasta.
              </p>
            ) : (
              <div className="divide-y divide-slate-200">
                {pastaProcessos
                  .filter((p) => Boolean(p.cumprimento_cidadao))
                  .map((p) => (
                    <div key={p.id} className="py-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-slate-800">{p.num_processo}</span>
                        <span className="font-semibold text-[#285277]">{p.cumprimento_cidadao?.status}</span>
                      </div>
                      <p className="text-slate-600">{p.cumprimento_cidadao?.descricao}</p>
                      {p.cumprimento_cidadao?.status === 'AGUARDANDO_CONFERENCIA' && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleConferirCumprimentoFiscal(p, true)}
                            className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-medium cursor-pointer"
                          >
                            Aceitar cumprimento
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConferirCumprimentoFiscal(p, false)}
                            className="px-2.5 py-1 rounded border border-red-300 text-[#DC2626] hover:bg-red-50 font-medium cursor-pointer"
                          >
                            Devolver para ajuste
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
