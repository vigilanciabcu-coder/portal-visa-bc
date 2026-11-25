import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  Bug,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Droplet,
  FileCheck2,
  FlaskConical,
  FolderOpen,
  MapPin,
  Package,
  Printer,
  Search,
  ShieldCheck,
  Thermometer,
  X,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import QRCode from 'qrcode';
import {
  AmostraLaboratorioItem,
  CcpuEstoqueItem,
  CcpuOcorrenciaItem,
  FiscalizacaoItem,
  PontoColetaLaboratorio,
  ProcessoItem,
  SolicitacaoLaudoPotabilidadeItem,
  UserProfile,
} from '../../types';
import {
  ExternalUserScope,
  SinncDashboardMetrics,
  diffDaysFromToday,
} from './sinncTypes';
import {
  cleanDoc,
  getDisplayPastaNumero,
  matchesFuzzySearch,
} from '../../lib/pastaVisaService';
import {
  fetchCcpuOcorrencias,
  formatarResumoInsumos,
  getLocalCcpuOcorrencias,
} from '../../lib/ccpuOcorrenciasService';
import {
  fetchCcpuEstoque,
  getLocalCcpuEstoqueItens,
} from '../../lib/ccpuEstoqueService';

interface SinncRelatoriosBiViewProps {
  currentUser: UserProfile | null;
  externalScope?: ExternalUserScope;
  metrics: SinncDashboardMetrics;
  processos: ProcessoItem[];
  fiscalizacoes: FiscalizacaoItem[];
  amostrasLaboratorio: AmostraLaboratorioItem[];
  pontosColeta?: PontoColetaLaboratorio[];
  users: UserProfile[];
  onSelectProcesso: (proc: ProcessoItem) => void;
  onOpenDossiePorProcesso: (proc: ProcessoItem) => void;
  onOpenLaudoOficial?: (
    amostra?: AmostraLaboratorioItem | null,
    solicitacao?: SolicitacaoLaudoPotabilidadeItem | null
  ) => void;
  compactDensity: boolean;
}

type ReportDomain = 'VISA' | 'LABORATORIO' | 'CCPU';
type PeriodoBi = 'ANO_ATUAL' | 'ULTIMOS_90' | 'MES_ATUAL' | 'TODOS';

const SECTOR_BAR_COLORS = [
  'bg-[#3b6d96]',
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-amber-500',
  'bg-sky-600',
  'bg-teal-600',
  'bg-slate-500',
];

const PRAGA_LABELS: Record<string, string> = {
  ESCORPIAO: 'Escorpião',
  ROEDOR: 'Roedor',
  RATO: 'Roedor',
  MOSQUITO: 'Mosquito / Vetor',
  ARANHA: 'Aranha',
  CARAMUJO_AFRICANO: 'Caramujo Africano',
  CARRAPATO: 'Carrapato',
  FORMIGA: 'Formiga',
  LAGARTA: 'Lagarta',
  MORCEGO: 'Morcego',
  POMBO: 'Pombo',
  AVE: 'Ave',
  CAO: 'Cão',
  FELINO: 'Felino',
  EQUINO: 'Equino',
  BOVINO: 'Bovino',
  SUINO: 'Suíno',
  BARATA: 'Barata',
  ESPOROTRICOSE: 'Esporotricose',
  OUTROS: 'Outros',
  OUTRO: 'Outros',
};

function getPragaLabel(tipo?: string): string {
  const key = String(tipo || 'OUTROS').toUpperCase();
  return PRAGA_LABELS[key] || key.replace(/_/g, ' ');
}

function parseDateSafe(raw?: string): Date | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/');
    const parsed = new Date(`${y}-${m}-${d}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function matchesPeriodoDate(dateRaw: string | undefined, periodo: PeriodoBi): boolean {
  if (periodo === 'TODOS') return true;
  const dt = parseDateSafe(dateRaw);
  if (!dt) return periodo === 'ANO_ATUAL';
  const hoje = new Date();
  const anoCorrente = hoje.getFullYear();

  if (periodo === 'MES_ATUAL') {
    return dt.getMonth() === hoje.getMonth() && dt.getFullYear() === anoCorrente;
  }
  if (periodo === 'ULTIMOS_90') {
    const limite = new Date();
    limite.setDate(hoje.getDate() - 90);
    return dt >= limite;
  }
  return dt.getFullYear() === 2026 || dt.getFullYear() === anoCorrente;
}

function parsePtNumber(val?: string): number | null {
  if (!val) return null;
  const cleaned = String(val).replace(',', '.').replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export const SinncRelatoriosBiView: React.FC<SinncRelatoriosBiViewProps> = ({
  currentUser,
  externalScope,
  metrics,
  processos,
  fiscalizacoes,
  amostrasLaboratorio,
  pontosColeta = [],
  users,
  onSelectProcesso,
  onOpenDossiePorProcesso,
  onOpenLaudoOficial,
  compactDensity,
}) => {
  const [reportDomain, setReportDomain] = useState<ReportDomain>('VISA');
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoBi>('ANO_ATUAL');

  // Filtros interativos VISA
  const [setorFiltro, setSetorFiltro] = useState<string | null>(null);
  const [riscoFiltro, setRiscoFiltro] = useState<'ALTO' | 'MEDIO' | 'BAIXO' | null>(null);
  const [bairroFiltro, setBairroFiltro] = useState<string | null>(null);
  const [fiscalFiltro, setFiscalFiltro] = useState<string | null>(null);
  const [drillQuery, setDrillQuery] = useState('');

  // Filtros interativos Laboratório
  const [labStatusFiltro, setLabStatusFiltro] = useState<'CONFORME' | 'NAO_CONFORME' | 'ANDAMENTO' | null>(null);
  const [labBairroFiltro, setLabBairroFiltro] = useState<string | null>(null);
  const [labColetorFiltro, setLabColetorFiltro] = useState<string | null>(null);
  const [labQuery, setLabQuery] = useState('');

  // Dados & filtros interativos CCPU
  const [ccpuOcorrencias, setCcpuOcorrencias] = useState<CcpuOcorrenciaItem[]>(() =>
    getLocalCcpuOcorrencias()
  );
  const [ccpuEstoque, setCcpuEstoque] = useState<CcpuEstoqueItem[]>(() =>
    getLocalCcpuEstoqueItens()
  );
  const [ccpuPragaFiltro, setCcpuPragaFiltro] = useState<string | null>(null);
  const [ccpuStatusFiltro, setCcpuStatusFiltro] = useState<'CONCLUIDO' | 'MONITORAMENTO' | 'ABERTO' | null>(null);
  const [ccpuBairroFiltro, setCcpuBairroFiltro] = useState<string | null>(null);
  const [ccpuQuery, setCcpuQuery] = useState('');

  useEffect(() => {
    if (externalScope?.isExternal) return;
    void fetchCcpuOcorrencias().then((res) => setCcpuOcorrencias(res.ocorrencias));
    void fetchCcpuEstoque().then((res) => setCcpuEstoque(res.itens));
  }, [externalScope?.isExternal]);

  // Modal PDF
  const [modalRelatorioPdfOpen, setModalRelatorioPdfOpen] = useState(false);
  const [gerandoRelatorioPdf, setGerandoRelatorioPdf] = useState(false);
  const [qrCodeRelatorioUrl, setQrCodeRelatorioUrl] = useState('');
  const relatorioPrintRef = useRef<HTMLDivElement>(null);

  const pastaByDocMap = useMemo(() => {
    const map = new Map<string, string>();
    metrics.pastasLocais.forEach((pt) => {
      const limpo = cleanDoc(pt.cpf_cnpj_limpo || pt.cnpj_cpf);
      const num = getDisplayPastaNumero(pt);
      if (limpo && num) map.set(limpo, num);
    });
    return map;
  }, [metrics.pastasLocais]);

  const getPastaLabel = (p: ProcessoItem): string => {
    const limpo = cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf);
    if (limpo && pastaByDocMap.has(limpo)) {
      return pastaByDocMap.get(limpo) || '';
    }
    return String(p.numero_pasta || p.pasta || '').trim();
  };

  const fiscaisAtivos = useMemo(() => {
    return users.filter((u) => {
      const cargo = (u.cargo || '').toUpperCase();
      const nivel = (u.nivel_acesso || '').toUpperCase();
      return (
        cargo.includes('FISCAL') ||
        cargo.includes('AUDITOR') ||
        nivel.includes('FISCAL')
      );
    });
  }, [users]);

  // =========================================================================
  // 1. BI VISA (PROCESSOS & SLAs)
  // =========================================================================
  const processosNoPeriodo = useMemo(() => {
    return processos.filter((p) =>
      matchesPeriodoDate(p.data_protocolo || p.data_entrada || p.data_1doc, periodoFiltro)
    );
  }, [processos, periodoFiltro]);

  const kpis = useMemo(() => {
    const total = processosNoPeriodo.length;
    let deferidos = 0;
    let notificados = 0;
    let indeferidos = 0;
    let emAnalise = 0;
    let atrasados = 0;

    let altoRisco = 0;
    let medioRisco = 0;
    let baixoRisco = 0;

    let somaDiasSla = 0;
    let qtdComSlaReal = 0;

    const setorContagem: Record<string, number> = {};
    const bairroContagem: Record<string, number> = {};
    const fiscalContagem: Record<
      string,
      {
        nome: string;
        matricula: string;
        total: number;
        deferidos: number;
        notificados: number;
        pendentes: number;
      }
    > = {};

    if (!externalScope?.isExternal) {
      fiscaisAtivos.forEach((f) => {
        fiscalContagem[f.nome_completo] = {
          nome: f.nome_completo,
          matricula: f.matricula || 'DVIS',
          total: 0,
          deferidos: 0,
          notificados: 0,
          pendentes: 0,
        };
      });
    }

    processosNoPeriodo.forEach((p) => {
      const status = (p.status || '').toUpperCase();
      if (status.includes('DEFERIDO') || status.includes('CONCLU')) {
        deferidos++;
      } else if (status.includes('NOTIFICADO')) {
        notificados++;
      } else if (status.includes('INDEFERIDO')) {
        indeferidos++;
      } else {
        emAnalise++;
      }

      const diffPrazo = diffDaysFromToday(
        p.prazo_vistoria || p.venc_1doc || p.agendado_para
      );
      if (
        diffPrazo !== null &&
        diffPrazo < 0 &&
        !status.includes('DEFERIDO') &&
        !status.includes('INDEFERIDO') &&
        !status.includes('CONCLU')
      ) {
        atrasados++;
      }

      const dInicio =
        parseDateSafe(p.data_protocolo) ||
        parseDateSafe(p.data_entrada) ||
        parseDateSafe(p.data_1doc);
      const dFim = parseDateSafe(p.conclusao);
      if (dInicio && dFim && dFim >= dInicio) {
        const dias = Math.max(
          1,
          Math.round((dFim.getTime() - dInicio.getTime()) / (1000 * 60 * 60 * 24))
        );
        if (dias <= 120) {
          somaDiasSla += dias;
          qtdComSlaReal++;
        }
      }

      const risco = (p.grau_risco || '').toUpperCase();
      if (risco.includes('ALTO')) altoRisco++;
      else if (risco.includes('BAIXO')) baixoRisco++;
      else medioRisco++;

      const setor = (p.setor || 'Geral / Outros').trim();
      setorContagem[setor] = (setorContagem[setor] || 0) + 1;

      const bairro = (p.bairro || 'Centro').trim();
      bairroContagem[bairro] = (bairroContagem[bairro] || 0) + 1;

      const nomeFiscal = (p.fiscal_responsavel || 'Não Atribuído').trim();
      if (!fiscalContagem[nomeFiscal]) {
        const userMatch = users.find(
          (u) => u.nome_completo?.toUpperCase() === nomeFiscal.toUpperCase()
        );
        fiscalContagem[nomeFiscal] = {
          nome: nomeFiscal,
          matricula: userMatch?.matricula || 'DVIS',
          total: 0,
          deferidos: 0,
          notificados: 0,
          pendentes: 0,
        };
      }
      fiscalContagem[nomeFiscal].total++;
      if (status.includes('DEFERIDO') || status.includes('CONCLU')) {
        fiscalContagem[nomeFiscal].deferidos++;
      } else if (status.includes('NOTIFICADO')) {
        fiscalContagem[nomeFiscal].notificados++;
      } else {
        fiscalContagem[nomeFiscal].pendentes++;
      }
    });

    const ativos = Math.max(0, total - deferidos - indeferidos);
    const taxaResolucao = total > 0 ? Math.round((deferidos / total) * 100) : 0;
    const taxaNotificacao = total > 0 ? Math.round((notificados / total) * 100) : 0;
    const tempoMedioRespostaDias =
      total === 0
        ? 0
        : qtdComSlaReal > 0
        ? Number((somaDiasSla / qtdComSlaReal).toFixed(1))
        : 8.4;

    const setoresOrdenados = Object.entries(setorContagem)
      .map(([nome, qtd]) => ({
        nome,
        qtd,
        percentual: total > 0 ? Math.round((qtd / total) * 100) : 0,
      }))
      .sort((a, b) => b.qtd - a.qtd);

    const bairrosOrdenados = Object.entries(bairroContagem)
      .map(([nome, qtd]) => ({
        nome,
        qtd,
        percentual: total > 0 ? Math.round((qtd / total) * 100) : 0,
      }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5);

    const rankingFiscais = Object.values(fiscalContagem)
      .filter((f) => f.total > 0)
      .sort((a, b) => b.total - a.total);

    return {
      total,
      ativos,
      deferidos,
      notificados,
      indeferidos,
      emAnalise,
      atrasados,
      taxaResolucao,
      taxaNotificacao,
      tempoMedioRespostaDias,
      altoRisco,
      medioRisco,
      baixoRisco,
      setoresOrdenados,
      bairrosOrdenados,
      rankingFiscais,
    };
  }, [processosNoPeriodo, fiscaisAtivos, users, externalScope?.isExternal]);

  const processosDetalhados = useMemo(() => {
    return processosNoPeriodo.filter((p) => {
      if (setorFiltro && (p.setor || 'Geral / Outros').trim() !== setorFiltro) return false;
      if (riscoFiltro) {
        const r = (p.grau_risco || '').toUpperCase();
        if (riscoFiltro === 'ALTO' && !r.includes('ALTO')) return false;
        if (riscoFiltro === 'BAIXO' && !r.includes('BAIXO')) return false;
        if (riscoFiltro === 'MEDIO' && (r.includes('ALTO') || r.includes('BAIXO')))
          return false;
      }
      if (bairroFiltro && (p.bairro || 'Centro').trim() !== bairroFiltro) return false;
      if (
        fiscalFiltro &&
        (p.fiscal_responsavel || 'Não Atribuído').trim() !== fiscalFiltro
      )
        return false;
      if (drillQuery.trim()) {
        return matchesFuzzySearch(drillQuery, [
          getPastaLabel(p),
          p.num_processo,
          p.prot_1doc,
          p.razao_social,
          p.nome_fantasia,
          p.cnpj_cpf,
          p.setor,
          p.bairro,
          p.fiscal_responsavel,
          p.status,
          p.assunto,
        ]);
      }
      return true;
    });
  }, [
    processosNoPeriodo,
    setorFiltro,
    riscoFiltro,
    bairroFiltro,
    fiscalFiltro,
    drillQuery,
  ]);

  // =========================================================================
  // 2. BI LABORATÓRIO (ÁGUA & POTABILIDADE)
  // =========================================================================
  const amostrasNoPeriodo = useMemo(() => {
    return amostrasLaboratorio.filter((a) =>
      matchesPeriodoDate(a.data_coleta || a.created_at, periodoFiltro)
    );
  }, [amostrasLaboratorio, periodoFiltro]);

  const labKpis = useMemo(() => {
    const total = amostrasNoPeriodo.length;
    let conformes = 0;
    let naoConformes = 0;
    let emAndamento = 0;
    let coliformesPositivos = 0;
    let ecoliPositivos = 0;

    let phSum = 0;
    let phCount = 0;
    let cloroSum = 0;
    let cloroCount = 0;
    let fluorSum = 0;
    let fluorCount = 0;
    let turbidezSum = 0;
    let turbidezCount = 0;

    const bairroMap: Record<string, { total: number; naoConformes: number }> = {};
    const coletorMap: Record<
      string,
      { nome: string; total: number; conformes: number; naoConformes: number; pendentes: number }
    > = {};
    const matrizMap: Record<string, number> = {};

    amostrasNoPeriodo.forEach((a) => {
      const st = String(a.status || '').toUpperCase();
      const isNaoConforme =
        st.includes('NÃO CONFORME') ||
        st.includes('NAO CONFORME') ||
        st.includes('NAO_CONFORME') ||
        st.includes('INSATISFAT') ||
        st.includes('INTERDIT');
      const isConforme =
        !isNaoConforme && (st.includes('CONFORME') || st.includes('LAUDO EMITIDO'));

      if (isNaoConforme) naoConformes++;
      else if (isConforme) conformes++;
      else emAndamento++;

      const col = String(
        a.coliformes_totais || a.parametros?.coliformes_totais || ''
      ).toUpperCase();
      const ec = String(
        a.escherichia_coli || a.parametros?.escherichia_coli || ''
      ).toUpperCase();
      if (col.includes('PRESEN')) coliformesPositivos++;
      if (ec.includes('PRESEN')) ecoliPositivos++;

      const ph = parsePtNumber(a.ph || a.parametros?.ph);
      if (ph !== null && ph > 0 && ph <= 14) {
        phSum += ph;
        phCount++;
      }
      const cl = parsePtNumber(a.cloro || a.parametros?.cloro_residual);
      if (cl !== null && cl >= 0) {
        cloroSum += cl;
        cloroCount++;
      }
      const fl = parsePtNumber(a.fluoreto || a.parametros?.fluoreto);
      if (fl !== null && fl >= 0) {
        fluorSum += fl;
        fluorCount++;
      }
      const tb = parsePtNumber(a.turbidez || a.parametros?.turbidez);
      if (tb !== null && tb >= 0) {
        turbidezSum += tb;
        turbidezCount++;
      }

      const bairro = (a.bairro || 'CENTRO').trim().toUpperCase();
      if (!bairroMap[bairro]) bairroMap[bairro] = { total: 0, naoConformes: 0 };
      bairroMap[bairro].total++;
      if (isNaoConforme) bairroMap[bairro].naoConformes++;

      const coletor = (a.fiscal_coletor || 'Não informado').trim();
      if (!coletorMap[coletor]) {
        coletorMap[coletor] = {
          nome: coletor,
          total: 0,
          conformes: 0,
          naoConformes: 0,
          pendentes: 0,
        };
      }
      coletorMap[coletor].total++;
      if (isNaoConforme) coletorMap[coletor].naoConformes++;
      else if (isConforme) coletorMap[coletor].conformes++;
      else coletorMap[coletor].pendentes++;

      const matriz = String(a.tipo_matriz || 'ÁGUA TRATADA / REDE').replace(/_/g, ' ');
      matrizMap[matriz] = (matrizMap[matriz] || 0) + 1;
    });

    const analisadas = conformes + naoConformes;
    const taxaConformidade =
      analisadas > 0 ? Math.round((conformes / analisadas) * 100) : 0;

    const bairrosOrdenados = Object.entries(bairroMap)
      .map(([nome, v]) => ({
        nome,
        qtd: v.total,
        naoConformes: v.naoConformes,
        percentual: total > 0 ? Math.round((v.total / total) * 100) : 0,
      }))
      .sort((a, b) => b.qtd - a.qtd);

    const rankingColetores = Object.values(coletorMap).sort((a, b) => b.total - a.total);
    const matrizesOrdenadas = Object.entries(matrizMap)
      .map(([nome, qtd]) => ({
        nome,
        qtd,
        percentual: total > 0 ? Math.round((qtd / total) * 100) : 0,
      }))
      .sort((a, b) => b.qtd - a.qtd);

    return {
      total,
      conformes,
      naoConformes,
      emAndamento,
      analisadas,
      taxaConformidade,
      coliformesPositivos,
      ecoliPositivos,
      mediaPh: phCount > 0 ? (phSum / phCount).toFixed(2) : '—',
      mediaCloro: cloroCount > 0 ? (cloroSum / cloroCount).toFixed(2) : '—',
      mediaFluor: fluorCount > 0 ? (fluorSum / fluorCount).toFixed(2) : '—',
      mediaTurbidez: turbidezCount > 0 ? (turbidezSum / turbidezCount).toFixed(2) : '—',
      bairrosOrdenados,
      rankingColetores,
      matrizesOrdenadas,
    };
  }, [amostrasNoPeriodo]);

  const amostrasDetalhadas = useMemo(() => {
    return amostrasNoPeriodo.filter((a) => {
      const st = String(a.status || '').toUpperCase();
      const isNaoConforme =
        st.includes('NÃO CONFORME') ||
        st.includes('NAO CONFORME') ||
        st.includes('NAO_CONFORME') ||
        st.includes('INSATISFAT') ||
        st.includes('INTERDIT');
      const isConforme =
        !isNaoConforme && (st.includes('CONFORME') || st.includes('LAUDO EMITIDO'));

      if (labStatusFiltro === 'NAO_CONFORME' && !isNaoConforme) return false;
      if (labStatusFiltro === 'CONFORME' && !isConforme) return false;
      if (labStatusFiltro === 'ANDAMENTO' && (isConforme || isNaoConforme)) return false;

      if (labBairroFiltro && (a.bairro || 'CENTRO').trim().toUpperCase() !== labBairroFiltro)
        return false;
      if (
        labColetorFiltro &&
        (a.fiscal_coletor || 'Não informado').trim() !== labColetorFiltro
      )
        return false;

      if (labQuery.trim()) {
        return matchesFuzzySearch(labQuery, [
          a.codigo_amostra,
          a.protocolo,
          a.interessado,
          a.estabelecimento,
          a.cnpj_cpf,
          a.local_coleta,
          a.bairro,
          a.fiscal_coletor,
          a.status,
          a.laudo_numero,
          a.responsavel_distribuicao,
        ]);
      }
      return true;
    });
  }, [amostrasNoPeriodo, labStatusFiltro, labBairroFiltro, labColetorFiltro, labQuery]);

  // =========================================================================
  // 3. BI CCPU (PRAGAS URBANAS, CLIMA & ESTOQUE DE INSUMOS)
  // =========================================================================
  const ocorrenciasNoPeriodo = useMemo(() => {
    return ccpuOcorrencias.filter((o) =>
      matchesPeriodoDate(o.dataHora || o.createdAt, periodoFiltro)
    );
  }, [ccpuOcorrencias, periodoFiltro]);

  const ccpuKpis = useMemo(() => {
    const total = ocorrenciasNoPeriodo.length;
    let concluidas = 0;
    let emMonitoramento = 0;
    let abertas = 0;
    let notificadas = 0;
    let totalEspecimes = 0;
    let vivos = 0;
    let somaTemp = 0;

    const pragaMap: Record<string, { tipo: string; nome: string; qtd: number; especimes: number }> =
      {};
    const bairroMap: Record<
      string,
      { nome: string; qtd: number; tempSoma: number; especimes: number }
    > = {};
    const servidorMap: Record<
      string,
      {
        nome: string;
        matricula: string;
        total: number;
        concluidas: number;
        notificadas: number;
        especimes: number;
      }
    > = {};

    ocorrenciasNoPeriodo.forEach((o) => {
      const st = String(o.statusOcorrencia || '').toUpperCase();
      if (st === 'CONCLUIDO' || st === 'BLOQUEIO_REALIZADO') concluidas++;
      else if (st === 'EM_MONITORAMENTO' || st === 'AGUARDANDO_OBRAS') emMonitoramento++;
      else abertas++;

      if (o.notificacaoEmitida) notificadas++;
      const qtdSpec = Number(o.quantidade) || 0;
      totalEspecimes += qtdSpec;
      if (o.statusEspecime === 'VIVO' || o.statusEspecime === 'AMBOS') {
        vivos += qtdSpec;
      }
      somaTemp += Number(o.temperatura) || 24;

      const tipo = String(o.tipoPraga || 'OUTROS').toUpperCase();
      if (!pragaMap[tipo]) {
        pragaMap[tipo] = {
          tipo,
          nome: getPragaLabel(tipo),
          qtd: 0,
          especimes: 0,
        };
      }
      pragaMap[tipo].qtd++;
      pragaMap[tipo].especimes += qtdSpec;

      const bairro = (o.bairro || 'Centro').trim();
      if (!bairroMap[bairro]) {
        bairroMap[bairro] = { nome: bairro, qtd: 0, tempSoma: 0, especimes: 0 };
      }
      bairroMap[bairro].qtd++;
      bairroMap[bairro].tempSoma += Number(o.temperatura) || 24;
      bairroMap[bairro].especimes += qtdSpec;

      const srv = (o.servidorResponsavel || 'Equipe CCPU').trim();
      if (!servidorMap[srv]) {
        servidorMap[srv] = {
          nome: srv,
          matricula: o.matriculaServidor || 'CCPU',
          total: 0,
          concluidas: 0,
          notificadas: 0,
          especimes: 0,
        };
      }
      servidorMap[srv].total++;
      if (st === 'CONCLUIDO' || st === 'BLOQUEIO_REALIZADO') servidorMap[srv].concluidas++;
      if (o.notificacaoEmitida) servidorMap[srv].notificadas++;
      servidorMap[srv].especimes += qtdSpec;
    });

    const taxaResolucao = total > 0 ? Math.round((concluidas / total) * 100) : 0;
    const tempMedia = total > 0 ? (somaTemp / total).toFixed(1) : '24.0';
    const estoqueCritico = ccpuEstoque.filter(
      (i) => i.quantidade_atual <= i.estoque_minimo
    ).length;

    const pragasOrdenadas = Object.values(pragaMap)
      .map((p) => ({
        ...p,
        percentual: total > 0 ? Math.round((p.qtd / total) * 100) : 0,
      }))
      .sort((a, b) => b.qtd - a.qtd);

    const bairrosOrdenados = Object.values(bairroMap)
      .map((b) => ({
        nome: b.nome,
        qtd: b.qtd,
        especimes: b.especimes,
        tempMedia: b.qtd > 0 ? (b.tempSoma / b.qtd).toFixed(1) : '24.0',
        percentual: total > 0 ? Math.round((b.qtd / total) * 100) : 0,
      }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 6);

    const rankingServidores = Object.values(servidorMap).sort((a, b) => b.total - a.total);

    return {
      total,
      concluidas,
      emMonitoramento,
      abertas,
      notificadas,
      totalEspecimes,
      vivos,
      taxaResolucao,
      tempMedia,
      estoqueCritico,
      pragasOrdenadas,
      bairrosOrdenados,
      rankingServidores,
    };
  }, [ocorrenciasNoPeriodo, ccpuEstoque]);

  const ccpuDetalhadas = useMemo(() => {
    return ocorrenciasNoPeriodo.filter((o) => {
      if (ccpuPragaFiltro && String(o.tipoPraga || 'OUTROS').toUpperCase() !== ccpuPragaFiltro)
        return false;

      if (ccpuStatusFiltro) {
        const st = String(o.statusOcorrencia || '').toUpperCase();
        const isConc = st === 'CONCLUIDO' || st === 'BLOQUEIO_REALIZADO';
        const isMon = st === 'EM_MONITORAMENTO' || st === 'AGUARDANDO_OBRAS';
        if (ccpuStatusFiltro === 'CONCLUIDO' && !isConc) return false;
        if (ccpuStatusFiltro === 'MONITORAMENTO' && !isMon) return false;
        if (ccpuStatusFiltro === 'ABERTO' && (isConc || isMon)) return false;
      }

      if (ccpuBairroFiltro && (o.bairro || 'Centro').trim() !== ccpuBairroFiltro)
        return false;

      if (ccpuQuery.trim()) {
        return matchesFuzzySearch(ccpuQuery, [
          o.protocolo,
          getPragaLabel(o.tipoPraga),
          o.subtipoEspecie,
          o.bairro,
          o.endereco,
          o.identificacaoBueiroLocal,
          o.servidorResponsavel,
          o.statusOcorrencia,
          o.numeroNotificacao,
        ]);
      }
      return true;
    });
  }, [
    ocorrenciasNoPeriodo,
    ccpuPragaFiltro,
    ccpuStatusFiltro,
    ccpuBairroFiltro,
    ccpuQuery,
  ]);

  // =========================================================================
  // CONTROLES COMUNS DE FILTRO, CSV E PDF
  // =========================================================================
  const hasActiveSliceFilter =
    reportDomain === 'VISA'
      ? Boolean(setorFiltro || riscoFiltro || bairroFiltro || fiscalFiltro || drillQuery.trim())
      : reportDomain === 'LABORATORIO'
      ? Boolean(labStatusFiltro || labBairroFiltro || labColetorFiltro || labQuery.trim())
      : Boolean(ccpuPragaFiltro || ccpuStatusFiltro || ccpuBairroFiltro || ccpuQuery.trim());

  const clearSliceFilters = () => {
    setSetorFiltro(null);
    setRiscoFiltro(null);
    setBairroFiltro(null);
    setFiscalFiltro(null);
    setDrillQuery('');
    setLabStatusFiltro(null);
    setLabBairroFiltro(null);
    setLabColetorFiltro(null);
    setLabQuery('');
    setCcpuPragaFiltro(null);
    setCcpuStatusFiltro(null);
    setCcpuBairroFiltro(null);
    setCcpuQuery('');
  };

  const handleExportCsv = () => {
    const today = new Date().toISOString().split('T')[0];

    if (reportDomain === 'LABORATORIO') {
      const base = hasActiveSliceFilter ? amostrasDetalhadas : amostrasNoPeriodo;
      const headers = [
        'CODIGO_AMOSTRA',
        'PROTOCOLO',
        'DATA_COLETA',
        'INTERESSADO_ESTABELECIMENTO',
        'CNPJ_CPF',
        'LOCAL_COLETA',
        'BAIRRO',
        'MATRIZ',
        'COLETOR',
        'PH',
        'CLORO_MG_L',
        'FLUORETO_MG_L',
        'TURBIDEZ_UT',
        'COLIFORMES_TOTAIS',
        'E_COLI',
        'STATUS',
        'LAUDO_NUMERO',
      ];
      const rows = base.map((a) => [
        `"${a.codigo_amostra || ''}"`,
        `"${a.protocolo || ''}"`,
        `"${a.data_coleta || ''}"`,
        `"${(a.interessado || a.estabelecimento || '').replace(/"/g, '""')}"`,
        `"${a.cnpj_cpf || ''}"`,
        `"${(a.local_coleta || '').replace(/"/g, '""')}"`,
        `"${a.bairro || ''}"`,
        `"${a.tipo_matriz || ''}"`,
        `"${a.fiscal_coletor || ''}"`,
        `"${a.ph || a.parametros?.ph || ''}"`,
        `"${a.cloro || a.parametros?.cloro_residual || ''}"`,
        `"${a.fluoreto || a.parametros?.fluoreto || ''}"`,
        `"${a.turbidez || a.parametros?.turbidez || ''}"`,
        `"${a.coliformes_totais || a.parametros?.coliformes_totais || ''}"`,
        `"${a.escherichia_coli || a.parametros?.escherichia_coli || ''}"`,
        `"${a.status || ''}"`,
        `"${a.laudo_numero || ''}"`,
      ]);
      const csv = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DVIS_Relatorio_Laboratorio_Agua_${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    if (reportDomain === 'CCPU') {
      const base = hasActiveSliceFilter ? ccpuDetalhadas : ocorrenciasNoPeriodo;
      const headers = [
        'PROTOCOLO_CCPU',
        'DATA_HORA',
        'PRAGA_VETOR',
        'ESPECIE',
        'BAIRRO',
        'ENDERECO',
        'LOCAL_PONTO',
        'LATITUDE',
        'LONGITUDE',
        'TEMPERATURA_C',
        'UMIDADE_%',
        'QTD_ESPECIMES',
        'STATUS_ESPECIME',
        'STATUS_OCORRENCIA',
        'NOTIFICACAO',
        'INSUMOS_UTILIZADOS',
        'SERVIDOR_RESPONSAVEL',
      ];
      const rows = base.map((o) => [
        `"${o.protocolo || ''}"`,
        `"${o.dataHora || ''}"`,
        `"${getPragaLabel(o.tipoPraga)}"`,
        `"${(o.subtipoEspecie || '').replace(/"/g, '""')}"`,
        `"${o.bairro || ''}"`,
        `"${(o.endereco || '').replace(/"/g, '""')}"`,
        `"${(o.identificacaoBueiroLocal || o.tipoLocal || '').replace(/"/g, '""')}"`,
        `"${o.lat ?? ''}"`,
        `"${o.lng ?? ''}"`,
        `"${o.temperatura ?? ''}"`,
        `"${o.umidadeRelativa ?? ''}"`,
        `"${o.quantidade ?? 0}"`,
        `"${o.statusEspecime || ''}"`,
        `"${o.statusOcorrencia || ''}"`,
        `"${o.notificacaoEmitida ? o.numeroNotificacao || 'SIM' : 'NÃO'}"`,
        `"${formatarResumoInsumos(o.insumosUtilizados).replace(/"/g, '""')}"`,
        `"${o.servidorResponsavel || ''}"`,
      ]);
      const csv = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DVIS_Relatorio_Epidemiologico_CCPU_${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    const base = hasActiveSliceFilter ? processosDetalhados : processosNoPeriodo;
    const headers = [
      'PASTA_VISA',
      'NUMERO_PROCESSO',
      'PROTOCOLO_1DOC',
      'DATA_PROTOCOLO',
      'CNPJ_CPF',
      'RAZAO_SOCIAL',
      'NOME_FANTASIA',
      'SETOR',
      'BAIRRO',
      'GRAU_RISCO',
      'FISCAL_RESPONSAVEL',
      'STATUS',
      'PRAZO_VALIDADE',
    ];
    const rows = base.map((p) => [
      `"${getPastaLabel(p) || 'SEM_PASTA'}"`,
      `"${p.num_processo || p.id}"`,
      `"${p.prot_1doc || ''}"`,
      `"${p.data_protocolo || p.data_entrada || ''}"`,
      `"${p.cnpj_cpf || ''}"`,
      `"${(p.razao_social || '').replace(/"/g, '""')}"`,
      `"${(p.nome_fantasia || '').replace(/"/g, '""')}"`,
      `"${p.setor || ''}"`,
      `"${p.bairro || 'Centro'}"`,
      `"${p.grau_risco || 'MÉDIO RISCO'}"`,
      `"${p.fiscal_responsavel || ''}"`,
      `"${p.status || ''}"`,
      `"${p.prazo_vistoria || p.validade || ''}"`,
    ]);
    const csvContent =
      '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DVIS_Relatorio_BI_VISA_BC_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAbrirRelatorioPdf = () => {
    const anoAtual = new Date().getFullYear();
    const prefix =
      reportDomain === 'LABORATORIO'
        ? 'LAB-AGUA'
        : reportDomain === 'CCPU'
        ? 'CCPU-EPI'
        : 'VISA-BI';
    const token = `BC-${prefix}-${anoAtual}-${Math.floor(1000 + Math.random() * 9000)}`;
    const urlVerif = `${window.location.origin}/?validar_token=${token}&doc=PRESTACAO_CONTAS&modulo=${reportDomain}`;

    QRCode.toDataURL(urlVerif, { width: 256, margin: 1 })
      .then((qr) => setQrCodeRelatorioUrl(qr))
      .catch(() => setQrCodeRelatorioUrl(''));

    setModalRelatorioPdfOpen(true);
  };

  const handleDownloadRelatorioPdf = async () => {
    if (!relatorioPrintRef.current) return;
    try {
      setGerandoRelatorioPdf(true);
      const canvas = await html2canvas(relatorioPrintRef.current, {
        scale: 2.2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = 210;
      const pdfHeight = 297;
      const ratio = canvas.width / canvas.height;
      let renderHeight = pdfWidth / ratio;
      if (renderHeight > pdfHeight) renderHeight = pdfHeight;

      const filePrefix =
        reportDomain === 'LABORATORIO'
          ? 'Relatorio_Oficial_Laboratorio_Agua_DVIS_BC'
          : reportDomain === 'CCPU'
          ? 'Relatorio_Epidemiologico_CCPU_DVIS_BC'
          : 'Relatorio_Executivo_Prestacao_Contas_DVIS_BC';

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, renderHeight);
      pdf.save(`${filePrefix}_${new Date().getFullYear()}.pdf`);
    } catch {
      window.print();
    } finally {
      setGerandoRelatorioPdf(false);
    }
  };

  const dataExtenso = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const periodoLabelMap: Record<PeriodoBi, string> = {
    ANO_ATUAL: 'Exercício 2026',
    ULTIMOS_90: 'Últimos 90 Dias',
    MES_ATUAL: 'Mês Atual',
    TODOS: 'Histórico Completo',
  };

  const cellPad = compactDensity ? 'py-2 px-3' : 'py-2.5 px-4';

  const domainMeta =
    reportDomain === 'LABORATORIO'
      ? {
          kicker: 'Laboratório Municipal de Água & Potabilidade · Portaria GM/MS 888/2021',
          title: 'Relatório Analítico de Qualidade da Água & Laudos',
          desc: 'Consolidação de amostras coletadas, índices de potabilidade (pH, cloro residual, flúor, turbidez), detecção microbiológica e solicitações por bairro.',
          baseLabel: `${labKpis.total} amostras · ${pontosColeta.length} pontos monitorados`,
        }
      : reportDomain === 'CCPU'
      ? {
          kicker: 'CCPU · Centro de Controle de Pragas Urbanas & Epidemiologia',
          title: 'Relatório Epidemiológico de Zoonoses, Clima & Insumos',
          desc: 'Monitoramento de ocorrências por vetor, correlação térmica, bueiros críticos, geolocalização e saldo operacional de raticidas e larvicidas.',
          baseLabel: `${ccpuKpis.total} ocorrências · ${ccpuKpis.totalEspecimes} espécimes`,
        }
      : {
          kicker: 'Painel Executivo de Business Intelligence & Prestação de Contas · VISA Balneário Camboriú',
          title: 'Gestão de Produtividade, SLAs & Desempenho Sanitário',
          desc: 'Consolidação analítica de processos, cumprimento de prazos, emissão de alvarás, pastas VISA e produtividade da equipe fiscal para a Diretoria Geral, Secretaria Municipal de Saúde e Prefeitura.',
          baseLabel: `${kpis.total} processos · ${metrics.pastasLocais.length} pastas VISA`,
        };

  return (
    <div className="space-y-5 text-left pb-6">
      {/* 1. CABEÇALHO EXECUTIVO + SELETOR DE MÓDULO (VISA | LABORATÓRIO | CCPU) */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-1 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#285277]">
              <span>{domainMeta.kicker}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">
              {domainMeta.title}
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">{domainMeta.desc}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-md border border-slate-200 bg-[#f4f6f9] hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Exportar base filtrada do relatório ativo em CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#3b6d96]" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={handleAbrirRelatorioPdf}
              className="px-4 py-2 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Gerar relatório timbrado oficial em PDF com QR Code de autenticidade"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Gerar Relatório Oficial (PDF)</span>
            </button>
          </div>
        </div>

        {/* Barra dupla: Seletor de Relatório + Filtros de Período */}
        <div className="pt-3 border-t border-slate-200/80 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Abas de Domínio */}
            <div className="inline-flex items-center gap-1 p-1 bg-[#f4f6f9] border border-slate-200/90 rounded-md flex-wrap">
              <button
                type="button"
                onClick={() => setReportDomain('VISA')}
                className={`px-3 py-1.5 rounded text-xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  reportDomain === 'VISA'
                    ? 'bg-white text-[#285277] font-semibold border border-slate-200/90'
                    : 'text-slate-600 hover:text-slate-900 font-medium border border-transparent'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Processos &amp; SLAs (VISA)</span>
              </button>

              <button
                type="button"
                onClick={() => setReportDomain('LABORATORIO')}
                className={`px-3 py-1.5 rounded text-xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  reportDomain === 'LABORATORIO'
                    ? 'bg-white text-[#285277] font-semibold border border-slate-200/90'
                    : 'text-slate-600 hover:text-slate-900 font-medium border border-transparent'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Laboratório ({amostrasNoPeriodo.length})</span>
              </button>

              {!externalScope?.isExternal && (
                <button
                  type="button"
                  onClick={() => setReportDomain('CCPU')}
                  className={`px-3 py-1.5 rounded text-xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    reportDomain === 'CCPU'
                      ? 'bg-white text-[#285277] font-semibold border border-slate-200/90'
                      : 'text-slate-600 hover:text-slate-900 font-medium border border-transparent'
                  }`}
                >
                  <Bug className="w-3.5 h-3.5" />
                  <span>CCPU ({ocorrenciasNoPeriodo.length})</span>
                </button>
              )}
            </div>

            {/* Período */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Período:</span>
              </span>
              <div className="inline-flex items-center gap-1 p-1 bg-[#f4f6f9] border border-slate-200/90 rounded-md flex-wrap">
                {(
                  [
                    { id: 'ANO_ATUAL', label: 'Exercício 2026' },
                    { id: 'ULTIMOS_90', label: 'Últimos 90 Dias' },
                    { id: 'MES_ATUAL', label: 'Mês Atual' },
                    { id: 'TODOS', label: 'Histórico Completo' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPeriodoFiltro(p.id)}
                    className={`px-2.5 py-1 rounded text-[11.5px] transition-colors cursor-pointer whitespace-nowrap ${
                      periodoFiltro === p.id
                        ? 'bg-white text-[#285277] font-semibold border border-slate-200/90'
                        : 'text-slate-600 hover:text-slate-900 font-medium border border-transparent'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {hasActiveSliceFilter && (
              <button
                type="button"
                onClick={clearSliceFilters}
                className="px-2.5 py-1 rounded-md bg-[#e6eef6] hover:bg-[#d8e5f2] text-[#285277] text-[11px] font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <X className="w-3 h-3" />
                <span>Limpar filtros</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums shrink-0">
            <span>Base filtrada:</span>
            <strong className="font-semibold text-slate-800 font-mono">
              {domainMeta.baseLabel}
            </strong>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* MÓDULO 1: PROCESSOS & SLAs (VISA)                                   */}
      {/* =================================================================== */}
      {reportDomain === 'VISA' && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-medium text-slate-500">
                  Total de demandas / processos
                </span>
                <span className="w-7 h-7 rounded-md bg-[#e6eef6] text-[#285277] flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-slate-900 font-mono tabular-nums">
                  {kpis.total}
                </span>
                <span className="text-[11px] font-medium text-emerald-700 tabular-nums">
                  {kpis.ativos} ativo(s)
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                <span>Deferidos / Alvarás</span>
                <strong className="font-semibold text-emerald-700 font-mono">
                  {kpis.deferidos}
                </strong>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-medium text-slate-500">
                  Taxa de resolução &amp; conclusão
                </span>
                <span className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-emerald-700 font-mono tabular-nums">
                  {kpis.taxaResolucao}%
                </span>
                <span className="text-[11px] text-slate-500">do total de processos</span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, kpis.taxaResolucao)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                  <span>Concluídos no período</span>
                  <span className="font-mono text-slate-700 font-medium">
                    {kpis.deferidos} / {kpis.total}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-medium text-slate-500">
                  Tempo médio de resposta (SLA)
                </span>
                <span className="w-7 h-7 rounded-md bg-[#e6eef6] text-[#285277] flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold text-[#285277] font-mono tabular-nums">
                  {kpis.tempoMedioRespostaDias}
                </span>
                <span className="text-xs text-slate-500 font-medium">dias úteis</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                <span>Meta da Prefeitura</span>
                <strong className="font-semibold text-[#285277]">Até 15 dias</strong>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-medium text-slate-500">
                  Notificações de adequação
                </span>
                <span className="w-7 h-7 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-amber-700 font-mono tabular-nums">
                  {kpis.notificados}
                </span>
                <span className="text-[11px] font-medium text-amber-700 tabular-nums">
                  ({kpis.taxaNotificacao}% c/ exigências)
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                <span>Prazos vencidos em aberto</span>
                <strong
                  className={`font-semibold font-mono ${
                    kpis.atrasados > 0 ? 'text-[#a13c46]' : 'text-emerald-700'
                  }`}
                >
                  {kpis.atrasados > 0 ? `${kpis.atrasados} vencido(s)` : 'Em dia'}
                </strong>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#3b6d96]" />
                  <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                    Volume de Processos por Setor Sanitário
                  </h2>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-slate-500">
                  Total: {kpis.total}
                </span>
              </div>

              {kpis.setoresOrdenados.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Nenhum processo encontrado para o período selecionado.
                </div>
              ) : (
                <div className="space-y-3">
                  {kpis.setoresOrdenados.map((s, idx) => {
                    const isSelected = setorFiltro === s.nome;
                    const barColor = SECTOR_BAR_COLORS[idx % SECTOR_BAR_COLORS.length];

                    return (
                      <button
                        key={s.nome}
                        type="button"
                        onClick={() =>
                          setSetorFiltro((prev) => (prev === s.nome ? null : s.nome))
                        }
                        className={`w-full text-left rounded-md p-2 -mx-2 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#e6eef6]/80 ring-1 ring-[#3b6d96]/40'
                            : 'hover:bg-[#f4f6f9]'
                        }`}
                        title="Clique para filtrar os processos deste setor"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                          <span className="font-semibold text-slate-800 uppercase truncate">
                            {s.nome}
                          </span>
                          <span className="font-mono tabular-nums text-[11px] text-slate-600 shrink-0">
                            <strong className="text-slate-900">{s.qtd}</strong> processos ({s.percentual}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                            style={{ width: `${Math.max(s.percentual, s.qtd > 0 ? 2 : 0)}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-[#f4f6f9] border border-slate-200/80 rounded-md px-3 py-2">
                  <div className="text-[11px] text-slate-500">Pastas VISA ativas</div>
                  <div className="text-sm font-semibold text-slate-800 font-mono tabular-nums mt-0.5">
                    {metrics.pastasLocais.length}
                  </div>
                </div>
                <div className="bg-[#f4f6f9] border border-slate-200/80 rounded-md px-3 py-2">
                  <div className="text-[11px] text-slate-500">Alvarás cadastrados</div>
                  <div className="text-sm font-semibold text-slate-800 font-mono tabular-nums mt-0.5">
                    {metrics.alvarasLocais.length}
                  </div>
                </div>
                <div className="bg-[#f4f6f9] border border-slate-200/80 rounded-md px-3 py-2">
                  <div className="text-[11px] text-slate-500">Vistorias registradas</div>
                  <div className="text-sm font-semibold text-slate-800 font-mono tabular-nums mt-0.5">
                    {fiscalizacoes.length}
                  </div>
                </div>
                <div className="bg-[#f4f6f9] border border-slate-200/80 rounded-md px-3 py-2">
                  <div className="text-[11px] text-slate-500">Amostras Laboratório</div>
                  <div className="text-sm font-semibold text-slate-800 font-mono tabular-nums mt-0.5">
                    {amostrasLaboratorio.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/80">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                    Enquadramento por Grau de Risco
                  </h2>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      setRiscoFiltro((prev) => (prev === 'ALTO' ? null : 'ALTO'))
                    }
                    className={`rounded-md p-2.5 border transition-colors cursor-pointer ${
                      riscoFiltro === 'ALTO'
                        ? 'bg-[#f2dfe3] border-[#a13c46] ring-1 ring-[#a13c46]/30'
                        : 'bg-[#f6ecef] border-[#e4cdd2] hover:border-[#cfa8b1]'
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase text-[#a13c46] block">
                      Alto Risco
                    </span>
                    <span className="text-lg font-semibold text-[#8c2d37] font-mono tabular-nums mt-0.5 block">
                      {kpis.altoRisco}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setRiscoFiltro((prev) => (prev === 'MEDIO' ? null : 'MEDIO'))
                    }
                    className={`rounded-md p-2.5 border transition-colors cursor-pointer ${
                      riscoFiltro === 'MEDIO'
                        ? 'bg-amber-100 border-amber-500 ring-1 ring-amber-500/30'
                        : 'bg-amber-50/90 border-amber-200 hover:border-amber-300'
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase text-amber-800 block">
                      Médio Risco
                    </span>
                    <span className="text-lg font-semibold text-amber-900 font-mono tabular-nums mt-0.5 block">
                      {kpis.medioRisco}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setRiscoFiltro((prev) => (prev === 'BAIXO' ? null : 'BAIXO'))
                    }
                    className={`rounded-md p-2.5 border transition-colors cursor-pointer ${
                      riscoFiltro === 'BAIXO'
                        ? 'bg-emerald-100 border-emerald-600 ring-1 ring-emerald-600/30'
                        : 'bg-emerald-50/90 border-emerald-200 hover:border-emerald-300'
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase text-emerald-800 block">
                      Baixo Risco
                    </span>
                    <span className="text-lg font-semibold text-emerald-900 font-mono tabular-nums mt-0.5 block">
                      {kpis.baixoRisco}
                    </span>
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/80">
                  <Building2 className="w-4 h-4 text-[#3b6d96]" />
                  <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                    Concentração Territorial (Top 5 Bairros)
                  </h2>
                </div>

                {kpis.bairrosOrdenados.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">Sem bairros registrados no período.</p>
                ) : (
                  <div className="space-y-2">
                    {kpis.bairrosOrdenados.map((b, idx) => {
                      const isSelected = bairroFiltro === b.nome;
                      return (
                        <button
                          key={b.nome}
                          type="button"
                          onClick={() =>
                            setBairroFiltro((prev) => (prev === b.nome ? null : b.nome))
                          }
                          className={`w-full text-left rounded-md px-2 py-1.5 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#e6eef6] text-[#285277]'
                              : 'hover:bg-[#f4f6f9] text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-medium truncate">
                              {idx + 1}. {b.nome}
                            </span>
                            <span className="font-mono tabular-nums text-[11px] font-semibold text-[#285277] shrink-0">
                              {b.qtd} proc. ({b.percentual}%)
                            </span>
                          </div>
                          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-[#3b6d96] rounded-full"
                              style={{ width: `${Math.max(b.percentual, 4)}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 bg-[#f4f6f9] border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                  Produtividade &amp; Eficiência Individual da Equipe Fiscal
                </h2>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-slate-500">
                {kpis.rankingFiscais.length} auditor(es) com ordens ativas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                    <th className={cellPad}>Auditor Fiscal / Unidade</th>
                    <th className={`${cellPad} text-center`}>Matrícula</th>
                    <th className={`${cellPad} text-right`}>Total Demandas</th>
                    <th className={`${cellPad} text-right`}>Concluídas</th>
                    <th className={`${cellPad} text-right`}>Em Notificação</th>
                    <th className={`${cellPad} text-right`}>Pendentes</th>
                    <th className={`${cellPad} text-right`}>Taxa Conclusão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {kpis.rankingFiscais.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Nenhuma demanda atribuída no período selecionado.
                      </td>
                    </tr>
                  ) : (
                    kpis.rankingFiscais.map((f, idx) => {
                      const taxa = f.total > 0 ? Math.round((f.deferidos / f.total) * 100) : 0;
                      const isSelected = fiscalFiltro === f.nome;

                      return (
                        <tr
                          key={f.nome}
                          onClick={() =>
                            setFiscalFiltro((prev) => (prev === f.nome ? null : f.nome))
                          }
                          className={`transition-colors cursor-pointer ${
                            isSelected ? 'bg-[#e6eef6]/70' : 'hover:bg-[#f8fafc]'
                          }`}
                          title="Clique para filtrar os processos deste auditor na listagem abaixo"
                        >
                          <td className={`${cellPad} font-medium text-slate-800`}>
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 h-5 rounded bg-[#f4f6f9] border border-slate-200 flex items-center justify-center text-[10px] font-mono font-semibold text-slate-600 shrink-0 tabular-nums">
                                {idx + 1}
                              </span>
                              <span className="uppercase">{f.nome}</span>
                            </div>
                          </td>
                          <td className={`${cellPad} text-center font-mono text-slate-500`}>
                            {f.matricula}
                          </td>
                          <td
                            className={`${cellPad} text-right font-mono font-semibold text-slate-900 tabular-nums`}
                          >
                            {f.total}
                          </td>
                          <td
                            className={`${cellPad} text-right font-mono font-semibold text-emerald-700 tabular-nums`}
                          >
                            {f.deferidos}
                          </td>
                          <td
                            className={`${cellPad} text-right font-mono font-semibold text-amber-700 tabular-nums`}
                          >
                            {f.notificados}
                          </td>
                          <td className={`${cellPad} text-right font-mono text-slate-600 tabular-nums`}>
                            {f.pendentes}
                          </td>
                          <td className={`${cellPad} text-right`}>
                            <div className="inline-flex items-center gap-2 justify-end">
                              <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className={`h-full rounded-full ${
                                    taxa >= 70
                                      ? 'bg-emerald-600'
                                      : taxa >= 40
                                      ? 'bg-[#3b6d96]'
                                      : 'bg-slate-400'
                                  }`}
                                  style={{ width: `${taxa}%` }}
                                />
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded font-mono font-semibold text-[11px] tabular-nums border ${
                                  taxa >= 70
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : taxa >= 40
                                    ? 'bg-[#e6eef6] text-[#285277] border-[#c4d7ea]'
                                    : 'bg-[#f4f6f9] text-slate-700 border-slate-200'
                                }`}
                              >
                                {taxa}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 bg-[#f4f6f9] border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                  Detalhamento Analítico de Processos ({processosDetalhados.length})
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {hasActiveSliceFilter
                    ? [
                        setorFiltro && `Setor: ${setorFiltro}`,
                        riscoFiltro && `Risco: ${riscoFiltro}`,
                        bairroFiltro && `Bairro: ${bairroFiltro}`,
                        fiscalFiltro && `Auditor: ${fiscalFiltro}`,
                        drillQuery.trim() && `Busca: "${drillQuery.trim()}"`,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : 'Clique em qualquer setor, grau de risco, bairro ou auditor acima para detalhar'}
                </p>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={drillQuery}
                  onChange={(e) => setDrillQuery(e.target.value)}
                  placeholder="Buscar pasta, CNPJ, razão, fiscal..."
                  className="w-full h-8 pl-8 pr-3 rounded-md border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#3b6d96]"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#f8fafc] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                    <th className={cellPad}>Pasta VISA</th>
                    <th className={cellPad}>Protocolo</th>
                    <th className={cellPad}>Requerente / Razão Social</th>
                    <th className={cellPad}>Setor · Bairro</th>
                    <th className={cellPad}>Fiscal</th>
                    <th className={cellPad}>Status</th>
                    <th className={`${cellPad} text-right`}>Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {processosDetalhados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Nenhum processo corresponde aos filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    processosDetalhados.slice(0, 60).map((proc) => {
                      const pastaLabel = getPastaLabel(proc);
                      const st = (proc.status || '').toUpperCase();
                      const statusTone =
                        st.includes('DEFERIDO') || st.includes('CONCLU')
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : st.includes('NOTIFICADO') || st.includes('INDEFERIDO')
                          ? 'bg-[#f6ecef] text-[#a13c46] border-[#e4cdd2]'
                          : 'bg-[#f4f6f9] text-slate-700 border-slate-200';

                      return (
                        <tr key={proc.id} className="hover:bg-[#f8fafc]">
                          <td className={`${cellPad} font-mono font-semibold text-[#285277] whitespace-nowrap`}>
                            {pastaLabel ? (
                              <button
                                type="button"
                                onClick={() => onOpenDossiePorProcesso(proc)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#e6eef6] hover:bg-[#d8e5f2] text-[#285277] cursor-pointer"
                              >
                                <FolderOpen className="w-3 h-3" />
                                <span>{pastaLabel}</span>
                              </button>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className={`${cellPad} font-mono text-slate-700 whitespace-nowrap`}>
                            {proc.num_processo}
                          </td>
                          <td className={`${cellPad} max-w-[260px]`}>
                            <div className="font-medium text-slate-800 truncate">
                              {proc.razao_social}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {proc.cnpj_cpf}
                            </div>
                          </td>
                          <td className={`${cellPad} text-slate-600`}>
                            <div className="truncate max-w-[180px]">{proc.setor || 'Geral'}</div>
                            <div className="text-[11px] text-slate-400">{proc.bairro || 'Centro'}</div>
                          </td>
                          <td className={`${cellPad} text-slate-700`}>
                            {proc.fiscal_responsavel || 'Não atribuído'}
                          </td>
                          <td className={cellPad}>
                            <span
                              className={`inline-block px-2 py-0.5 rounded border text-[11px] font-medium whitespace-nowrap ${statusTone}`}
                            >
                              {proc.status}
                            </span>
                          </td>
                          <td className={`${cellPad} text-right whitespace-nowrap`}>
                            <button
                              type="button"
                              onClick={() => onSelectProcesso(proc)}
                              className="text-[#285277] hover:underline font-medium cursor-pointer"
                            >
                              Abrir
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* =================================================================== */}
      {/* MÓDULO 2: LABORATÓRIO MUNICIPAL DE ÁGUA & POTABILIDADE              */}
      {/* =================================================================== */}
      {reportDomain === 'LABORATORIO' && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-medium text-slate-500">
                  Total de amostras coletadas
                </span>
                <span className="w-7 h-7 rounded-md bg-[#e6eef6] text-[#285277] flex items-center justify-center shrink-0">
                  <FlaskConical className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-slate-900 font-mono tabular-nums">
                  {labKpis.total}
                </span>
                <span className="text-[11px] font-medium text-[#285277] tabular-nums">
                  {labKpis.emAndamento} em análise
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                <span>Laudos / Concluídas</span>
                <strong className="font-semibold text-emerald-700 font-mono">
                  {labKpis.analisadas}
                </strong>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-medium text-slate-500">
                  Índice de potabilidade (Conforme)
                </span>
                <span className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-emerald-700 font-mono tabular-nums">
                  {labKpis.taxaConformidade}%
                </span>
                <span className="text-[11px] text-slate-500">das amostras analisadas</span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, labKpis.taxaConformidade)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                  <span>Em acordo c/ Port. 888</span>
                  <span className="font-mono text-slate-700 font-medium">
                    {labKpis.conformes} / {labKpis.analisadas}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-medium text-slate-500">
                  Amostras não conformes
                </span>
                <span className="w-7 h-7 rounded-md bg-[#f6ecef] text-[#a13c46] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-2xl font-semibold font-mono tabular-nums ${
                    labKpis.naoConformes > 0 ? 'text-[#a13c46]' : 'text-slate-900'
                  }`}
                >
                  {labKpis.naoConformes}
                </span>
                <span className="text-[11px] text-slate-500">fora do padrão</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                <span>Coliformes / E. coli (+)</span>
                <strong
                  className={`font-semibold font-mono ${
                    labKpis.coliformesPositivos + labKpis.ecoliPositivos > 0
                      ? 'text-[#a13c46]'
                      : 'text-emerald-700'
                  }`}
                >
                  {labKpis.coliformesPositivos} col. · {labKpis.ecoliPositivos} E. coli
                </strong>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-medium text-slate-500">
                  Solicitações &amp; pontos de rede
                </span>
                <span className="w-7 h-7 rounded-md bg-[#e6eef6] text-[#285277] flex items-center justify-center shrink-0">
                  <Droplet className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-[#285277] font-mono tabular-nums">
                  {metrics.solicitacoesLabLocais.length}
                </span>
                <span className="text-[11px] text-slate-500">solicitações</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                <span>Pontos fixos monitorados</span>
                <strong className="font-semibold text-[#285277] font-mono">
                  {pontosColeta.length}
                </strong>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {/* Bairros & Médias Físico-Químicas */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#3b6d96]" />
                  <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                    Distribuição de Amostras por Bairro
                  </h2>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-slate-500">
                  Total: {labKpis.total}
                </span>
              </div>

              {labKpis.bairrosOrdenados.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Nenhuma amostra registrada para o período selecionado.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {labKpis.bairrosOrdenados.slice(0, 7).map((b, idx) => {
                    const isSelected = labBairroFiltro === b.nome;
                    const barColor = SECTOR_BAR_COLORS[idx % SECTOR_BAR_COLORS.length];
                    return (
                      <button
                        key={b.nome}
                        type="button"
                        onClick={() =>
                          setLabBairroFiltro((prev) => (prev === b.nome ? null : b.nome))
                        }
                        className={`w-full text-left rounded-md p-2 -mx-2 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#e6eef6]/80 ring-1 ring-[#3b6d96]/40'
                            : 'hover:bg-[#f4f6f9]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs mb-1">
                          <span className="font-semibold text-slate-800 uppercase truncate">
                            {b.nome}
                          </span>
                          <span className="font-mono tabular-nums text-[11px] text-slate-600 shrink-0">
                            <strong className="text-slate-900">{b.qtd}</strong> amostra(s) ({b.percentual}%)
                            {b.naoConformes > 0 && (
                              <span className="text-[#a13c46] font-semibold">
                                {' '}· {b.naoConformes} NC
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${Math.max(b.percentual, b.qtd > 0 ? 3 : 0)}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Médias Físico-Químicas Observadas */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-[#f4f6f9] border border-slate-200/80 rounded-md px-3 py-2">
                  <div className="text-[11px] text-slate-500">pH médio (6,0–9,5)</div>
                  <div className="text-sm font-semibold text-slate-800 font-mono tabular-nums mt-0.5">
                    {labKpis.mediaPh}
                  </div>
                </div>
                <div className="bg-[#f4f6f9] border border-slate-200/80 rounded-md px-3 py-2">
                  <div className="text-[11px] text-slate-500">Cloro residual (mg/L)</div>
                  <div className="text-sm font-semibold text-slate-800 font-mono tabular-nums mt-0.5">
                    {labKpis.mediaCloro}
                  </div>
                </div>
                <div className="bg-[#f4f6f9] border border-slate-200/80 rounded-md px-3 py-2">
                  <div className="text-[11px] text-slate-500">Fluoreto médio (mg/L)</div>
                  <div className="text-sm font-semibold text-slate-800 font-mono tabular-nums mt-0.5">
                    {labKpis.mediaFluor}
                  </div>
                </div>
                <div className="bg-[#f4f6f9] border border-slate-200/80 rounded-md px-3 py-2">
                  <div className="text-[11px] text-slate-500">Turbidez média (uT)</div>
                  <div className="text-sm font-semibold text-slate-800 font-mono tabular-nums mt-0.5">
                    {labKpis.mediaTurbidez}
                  </div>
                </div>
              </div>
            </div>

            {/* Direita: Status Laboratorial & Ranking de Coletores */}
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/80">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                    Enquadramento dos Laudos
                  </h2>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      setLabStatusFiltro((prev) => (prev === 'CONFORME' ? null : 'CONFORME'))
                    }
                    className={`rounded-md p-2.5 border transition-colors cursor-pointer ${
                      labStatusFiltro === 'CONFORME'
                        ? 'bg-emerald-100 border-emerald-600 ring-1 ring-emerald-600/30'
                        : 'bg-emerald-50/90 border-emerald-200 hover:border-emerald-300'
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase text-emerald-800 block">
                      Conforme
                    </span>
                    <span className="text-lg font-semibold text-emerald-900 font-mono tabular-nums mt-0.5 block">
                      {labKpis.conformes}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setLabStatusFiltro((prev) =>
                        prev === 'NAO_CONFORME' ? null : 'NAO_CONFORME'
                      )
                    }
                    className={`rounded-md p-2.5 border transition-colors cursor-pointer ${
                      labStatusFiltro === 'NAO_CONFORME'
                        ? 'bg-[#f2dfe3] border-[#a13c46] ring-1 ring-[#a13c46]/30'
                        : 'bg-[#f6ecef] border-[#e4cdd2] hover:border-[#cfa8b1]'
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase text-[#a13c46] block">
                      Não Conf.
                    </span>
                    <span className="text-lg font-semibold text-[#8c2d37] font-mono tabular-nums mt-0.5 block">
                      {labKpis.naoConformes}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setLabStatusFiltro((prev) => (prev === 'ANDAMENTO' ? null : 'ANDAMENTO'))
                    }
                    className={`rounded-md p-2.5 border transition-colors cursor-pointer ${
                      labStatusFiltro === 'ANDAMENTO'
                        ? 'bg-[#d8e5f2] border-[#3b6d96] ring-1 ring-[#3b6d96]/30'
                        : 'bg-[#f4f6f9] border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase text-slate-600 block">
                      Em Análise
                    </span>
                    <span className="text-lg font-semibold text-slate-900 font-mono tabular-nums mt-0.5 block">
                      {labKpis.emAndamento}
                    </span>
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/80">
                  <Award className="w-4 h-4 text-amber-600" />
                  <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                    Coletas por Fiscal / Responsável
                  </h2>
                </div>

                {labKpis.rankingColetores.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">Sem registros no período.</p>
                ) : (
                  <div className="space-y-2">
                    {labKpis.rankingColetores.slice(0, 6).map((c, idx) => {
                      const isSelected = labColetorFiltro === c.nome;
                      return (
                        <button
                          key={c.nome}
                          type="button"
                          onClick={() =>
                            setLabColetorFiltro((prev) => (prev === c.nome ? null : c.nome))
                          }
                          className={`w-full text-left rounded-md px-2 py-1.5 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#e6eef6] text-[#285277]'
                              : 'hover:bg-[#f4f6f9] text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-medium truncate">
                              {idx + 1}. {c.nome}
                            </span>
                            <span className="font-mono tabular-nums text-[11px] font-semibold text-[#285277] shrink-0">
                              {c.total} ({c.conformes} ok
                              {c.naoConformes > 0 ? ` · ${c.naoConformes} NC` : ''})
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Listagem Auditável de Amostras do Laboratório */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 bg-[#f4f6f9] border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                  Detalhamento Analítico das Amostras de Água ({amostrasDetalhadas.length})
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {hasActiveSliceFilter
                    ? [
                        labStatusFiltro && `Status: ${labStatusFiltro}`,
                        labBairroFiltro && `Bairro: ${labBairroFiltro}`,
                        labColetorFiltro && `Coletor: ${labColetorFiltro}`,
                        labQuery.trim() && `Busca: "${labQuery.trim()}"`,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : 'Clique em qualquer bairro, status ou coletor acima para detalhar'}
                </p>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={labQuery}
                  onChange={(e) => setLabQuery(e.target.value)}
                  placeholder="Buscar amostra, protocolo, local, bairro..."
                  className="w-full h-8 pl-8 pr-3 rounded-md border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#3b6d96]"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#f8fafc] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                    <th className={cellPad}>Amostra · Data</th>
                    <th className={cellPad}>Interessado / Local</th>
                    <th className={cellPad}>Bairro</th>
                    <th className={`${cellPad} text-center`}>pH / Cloro / Flúor</th>
                    <th className={`${cellPad} text-center`}>Coliformes / E. coli</th>
                    <th className={cellPad}>Coletor</th>
                    <th className={cellPad}>Status</th>
                    {onOpenLaudoOficial && <th className={`${cellPad} text-right`}>Laudo</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {amostrasDetalhadas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={onOpenLaudoOficial ? 8 : 7}
                        className="py-8 text-center text-slate-500"
                      >
                        Nenhuma amostra encontrada para os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    amostrasDetalhadas.slice(0, 60).map((a) => {
                      const st = String(a.status || '').toUpperCase();
                      const isNc =
                        st.includes('NÃO CONFORME') ||
                        st.includes('NAO CONFORME') ||
                        st.includes('INSATISFAT') ||
                        st.includes('INTERDIT');
                      const isOk = !isNc && (st.includes('CONFORME') || st.includes('LAUDO'));
                      const tone = isNc
                        ? 'bg-[#f6ecef] text-[#a13c46] border-[#e4cdd2]'
                        : isOk
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-[#f4f6f9] text-slate-700 border-slate-200';

                      return (
                        <tr key={a.id} className="hover:bg-[#f8fafc]">
                          <td className={`${cellPad} whitespace-nowrap`}>
                            <div className="font-mono font-semibold text-[#285277]">
                              #{a.codigo_amostra}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {a.data_coleta}
                            </div>
                          </td>
                          <td className={`${cellPad} max-w-[230px]`}>
                            <div className="font-medium text-slate-800 truncate">
                              {a.interessado || a.estabelecimento || a.local_coleta}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {a.local_coleta}
                            </div>
                          </td>
                          <td className={`${cellPad} text-slate-700`}>{a.bairro}</td>
                          <td
                            className={`${cellPad} text-center font-mono tabular-nums text-slate-700 whitespace-nowrap`}
                          >
                            {a.ph || a.parametros?.ph || '—'} ·{' '}
                            {a.cloro || a.parametros?.cloro_residual || '—'} ·{' '}
                            {a.fluoreto || a.parametros?.fluoreto || '—'}
                          </td>
                          <td
                            className={`${cellPad} text-center font-mono text-[11px] whitespace-nowrap`}
                          >
                            <span
                              className={
                                String(a.coliformes_totais || '').toUpperCase().includes('PRESEN')
                                  ? 'text-[#a13c46] font-semibold'
                                  : 'text-slate-700'
                              }
                            >
                              {a.coliformes_totais || a.parametros?.coliformes_totais || '—'}
                            </span>
                            {' / '}
                            <span
                              className={
                                String(a.escherichia_coli || '').toUpperCase().includes('PRESEN')
                                  ? 'text-[#a13c46] font-semibold'
                                  : 'text-slate-700'
                              }
                            >
                              {a.escherichia_coli || a.parametros?.escherichia_coli || '—'}
                            </span>
                          </td>
                          <td className={`${cellPad} text-slate-700`}>{a.fiscal_coletor}</td>
                          <td className={cellPad}>
                            <span
                              className={`inline-block px-2 py-0.5 rounded border text-[11px] font-medium whitespace-nowrap ${tone}`}
                            >
                              {a.status}
                            </span>
                          </td>
                          {onOpenLaudoOficial && (
                            <td className={`${cellPad} text-right whitespace-nowrap`}>
                              <button
                                type="button"
                                onClick={() => onOpenLaudoOficial(a, null)}
                                className="text-[#285277] hover:underline font-medium cursor-pointer"
                              >
                                Laudo
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* =================================================================== */}
      {/* MÓDULO 3: CCPU (PRAGAS URBANAS, CLIMA & ESTOQUE DE INSUMOS)         */}
      {/* =================================================================== */}
      {reportDomain === 'CCPU' && !externalScope?.isExternal && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-medium text-slate-500">
                  Ocorrências CCPU registradas
                </span>
                <span className="w-7 h-7 rounded-md bg-[#e6eef6] text-[#285277] flex items-center justify-center shrink-0">
                  <Bug className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-slate-900 font-mono tabular-nums">
                  {ccpuKpis.total}
                </span>
                <span className="text-[11px] font-medium text-emerald-700 tabular-nums">
                  {ccpuKpis.taxaResolucao}% resolvidas
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                <span>Bloqueios / Concluídas</span>
                <strong className="font-semibold text-emerald-700 font-mono">
                  {ccpuKpis.concluidas}
                </strong>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-medium text-slate-500">
                  Espécimes capturados / contados
                </span>
                <span className="w-7 h-7 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-amber-700 font-mono tabular-nums">
                  {ccpuKpis.totalEspecimes}
                </span>
                <span className="text-[11px] text-slate-500">espécimes</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                <span>Capturados vivos</span>
                <strong className="font-semibold text-amber-700 font-mono">
                  {ccpuKpis.vivos}
                </strong>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-medium text-slate-500">
                  Temperatura média nas coletas
                </span>
                <span className="w-7 h-7 rounded-md bg-[#e6eef6] text-[#285277] flex items-center justify-center shrink-0">
                  <Thermometer className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold text-[#285277] font-mono tabular-nums">
                  {ccpuKpis.tempMedia}°C
                </span>
                <span className="text-[11px] text-slate-500">microclima</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                <span>Notificações emitidas</span>
                <strong className="font-semibold text-[#285277] font-mono">
                  {ccpuKpis.notificadas}
                </strong>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-medium text-slate-500">
                  Estoque de insumos CCPU
                </span>
                <span
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    ccpuKpis.estoqueCritico > 0
                      ? 'bg-[#f6ecef] text-[#a13c46]'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-2xl font-semibold font-mono tabular-nums ${
                    ccpuKpis.estoqueCritico > 0 ? 'text-[#a13c46]' : 'text-emerald-700'
                  }`}
                >
                  {ccpuKpis.estoqueCritico}
                </span>
                <span className="text-[11px] text-slate-500">abaixo do mínimo</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                <span>Itens monitorados</span>
                <strong className="font-semibold text-slate-800 font-mono">
                  {ccpuEstoque.length}
                </strong>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {/* Incidência por Espécie + Estoque Atual */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#3b6d96]" />
                  <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                    Incidência de Ocorrências por Espécie / Vetor
                  </h2>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-slate-500">
                  Total: {ccpuKpis.total}
                </span>
              </div>

              {ccpuKpis.pragasOrdenadas.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Nenhuma ocorrência CCPU registrada no período.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {ccpuKpis.pragasOrdenadas.map((pr, idx) => {
                    const isSelected = ccpuPragaFiltro === pr.tipo;
                    const barColor = SECTOR_BAR_COLORS[idx % SECTOR_BAR_COLORS.length];
                    return (
                      <button
                        key={pr.tipo}
                        type="button"
                        onClick={() =>
                          setCcpuPragaFiltro((prev) => (prev === pr.tipo ? null : pr.tipo))
                        }
                        className={`w-full text-left rounded-md p-2 -mx-2 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#e6eef6]/80 ring-1 ring-[#3b6d96]/40'
                            : 'hover:bg-[#f4f6f9]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs mb-1">
                          <span className="font-semibold text-slate-800 uppercase truncate">
                            {pr.nome}
                          </span>
                          <span className="font-mono tabular-nums text-[11px] text-slate-600 shrink-0">
                            <strong className="text-slate-900">{pr.qtd}</strong> ocorr. ({pr.percentual}%) ·{' '}
                            {pr.especimes} espéc.
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${Math.max(pr.percentual, pr.qtd > 0 ? 3 : 0)}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Posição Atual de Estoque */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="text-[11px] font-semibold text-slate-600 uppercase">
                  Posição Atual do Estoque de Insumos CCPU
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  {ccpuEstoque.map((item) => {
                    const critico = item.quantidade_atual <= item.estoque_minimo;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-md px-3 py-2 border ${
                          critico
                            ? 'bg-[#f6ecef] border-[#e4cdd2]'
                            : 'bg-[#f4f6f9] border-slate-200/80'
                        }`}
                      >
                        <div className="text-[11px] font-medium text-slate-700 truncate">
                          {item.nome}
                        </div>
                        <div
                          className={`text-sm font-semibold font-mono tabular-nums mt-0.5 ${
                            critico ? 'text-[#a13c46]' : 'text-slate-900'
                          }`}
                        >
                          {item.quantidade_atual}{' '}
                          <span className="text-[10px] font-normal">
                            {item.unidade === 'litro' ? 'L' : 'un'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Mín: {item.estoque_minimo}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Direita: Status Operacional & Bairros + Temperatura */}
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/80">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                    Situação das Ocorrências
                  </h2>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      setCcpuStatusFiltro((prev) =>
                        prev === 'CONCLUIDO' ? null : 'CONCLUIDO'
                      )
                    }
                    className={`rounded-md p-2.5 border transition-colors cursor-pointer ${
                      ccpuStatusFiltro === 'CONCLUIDO'
                        ? 'bg-emerald-100 border-emerald-600 ring-1 ring-emerald-600/30'
                        : 'bg-emerald-50/90 border-emerald-200 hover:border-emerald-300'
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase text-emerald-800 block">
                      Bloq./Conc.
                    </span>
                    <span className="text-lg font-semibold text-emerald-900 font-mono tabular-nums mt-0.5 block">
                      {ccpuKpis.concluidas}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCcpuStatusFiltro((prev) =>
                        prev === 'MONITORAMENTO' ? null : 'MONITORAMENTO'
                      )
                    }
                    className={`rounded-md p-2.5 border transition-colors cursor-pointer ${
                      ccpuStatusFiltro === 'MONITORAMENTO'
                        ? 'bg-amber-100 border-amber-500 ring-1 ring-amber-500/30'
                        : 'bg-amber-50/90 border-amber-200 hover:border-amber-300'
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase text-amber-800 block">
                      Monitoram.
                    </span>
                    <span className="text-lg font-semibold text-amber-900 font-mono tabular-nums mt-0.5 block">
                      {ccpuKpis.emMonitoramento}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCcpuStatusFiltro((prev) => (prev === 'ABERTO' ? null : 'ABERTO'))
                    }
                    className={`rounded-md p-2.5 border transition-colors cursor-pointer ${
                      ccpuStatusFiltro === 'ABERTO'
                        ? 'bg-[#d8e5f2] border-[#3b6d96] ring-1 ring-[#3b6d96]/30'
                        : 'bg-[#f4f6f9] border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase text-slate-600 block">
                      Coletado
                    </span>
                    <span className="text-lg font-semibold text-slate-900 font-mono tabular-nums mt-0.5 block">
                      {ccpuKpis.abertas}
                    </span>
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/80">
                  <MapPin className="w-4 h-4 text-[#3b6d96]" />
                  <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                    Incidência &amp; Clima por Bairro
                  </h2>
                </div>

                {ccpuKpis.bairrosOrdenados.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">Sem bairros no período.</p>
                ) : (
                  <div className="space-y-2">
                    {ccpuKpis.bairrosOrdenados.map((b, idx) => {
                      const isSelected = ccpuBairroFiltro === b.nome;
                      return (
                        <button
                          key={b.nome}
                          type="button"
                          onClick={() =>
                            setCcpuBairroFiltro((prev) => (prev === b.nome ? null : b.nome))
                          }
                          className={`w-full text-left rounded-md px-2 py-1.5 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#e6eef6] text-[#285277]'
                              : 'hover:bg-[#f4f6f9] text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-medium truncate">
                              {idx + 1}. {b.nome}
                            </span>
                            <span className="font-mono tabular-nums text-[11px] font-semibold text-[#285277] shrink-0">
                              {b.qtd} ocorr. · {b.tempMedia}°C
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Listagem Auditável de Ocorrências CCPU */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 bg-[#f4f6f9] border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                  Detalhamento Geoespacial &amp; Operacional CCPU ({ccpuDetalhadas.length})
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {hasActiveSliceFilter
                    ? [
                        ccpuPragaFiltro && `Vetor: ${getPragaLabel(ccpuPragaFiltro)}`,
                        ccpuStatusFiltro && `Situação: ${ccpuStatusFiltro}`,
                        ccpuBairroFiltro && `Bairro: ${ccpuBairroFiltro}`,
                        ccpuQuery.trim() && `Busca: "${ccpuQuery.trim()}"`,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : 'Clique em qualquer espécie, situação ou bairro acima para detalhar'}
                </p>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={ccpuQuery}
                  onChange={(e) => setCcpuQuery(e.target.value)}
                  placeholder="Buscar protocolo CCPU, espécie, bueiro, bairro..."
                  className="w-full h-8 pl-8 pr-3 rounded-md border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#3b6d96]"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#f8fafc] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                    <th className={cellPad}>Protocolo · Data</th>
                    <th className={cellPad}>Espécie / Vetor</th>
                    <th className={cellPad}>Local / Bairro</th>
                    <th className={`${cellPad} text-center`}>Clima</th>
                    <th className={`${cellPad} text-right`}>Espéc.</th>
                    <th className={cellPad}>Insumos / Agente</th>
                    <th className={cellPad}>Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {ccpuDetalhadas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Nenhuma ocorrência CCPU corresponde aos filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    ccpuDetalhadas.slice(0, 60).map((o) => {
                      const st = String(o.statusOcorrencia || '').toUpperCase();
                      const tone =
                        st === 'CONCLUIDO' || st === 'BLOQUEIO_REALIZADO'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : st === 'AGUARDANDO_OBRAS' || st === 'EM_MONITORAMENTO'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-[#f4f6f9] text-slate-700 border-slate-200';

                      return (
                        <tr key={o.id} className="hover:bg-[#f8fafc]">
                          <td className={`${cellPad} whitespace-nowrap`}>
                            <div className="font-mono font-semibold text-[#285277]">
                              {o.protocolo}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {(o.dataHora || '').slice(0, 16).replace('T', ' ')}
                            </div>
                          </td>
                          <td className={`${cellPad} max-w-[190px]`}>
                            <div className="font-medium text-slate-800">
                              {getPragaLabel(o.tipoPraga)}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {o.subtipoEspecie}
                            </div>
                          </td>
                          <td className={`${cellPad} max-w-[220px]`}>
                            <div className="font-medium text-slate-700 truncate">
                              {o.bairro} · {o.endereco}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono truncate">
                              {o.lat?.toFixed(4)}, {o.lng?.toFixed(4)}
                            </div>
                          </td>
                          <td
                            className={`${cellPad} text-center font-mono tabular-nums text-slate-700 whitespace-nowrap`}
                          >
                            {o.temperatura}°C
                            {o.umidadeRelativa ? ` · ${o.umidadeRelativa}%` : ''}
                          </td>
                          <td
                            className={`${cellPad} text-right font-mono font-semibold text-slate-900 tabular-nums`}
                          >
                            {o.quantidade}
                          </td>
                          <td className={`${cellPad} max-w-[200px]`}>
                            <div className="text-slate-700 truncate">
                              {o.servidorResponsavel}
                            </div>
                            {o.insumosUtilizados && o.insumosUtilizados.length > 0 && (
                              <div className="text-[11px] text-slate-500 truncate">
                                {formatarResumoInsumos(o.insumosUtilizados)}
                              </div>
                            )}
                          </td>
                          <td className={cellPad}>
                            <span
                              className={`inline-block px-2 py-0.5 rounded border text-[11px] font-medium whitespace-nowrap ${tone}`}
                            >
                              {o.statusOcorrencia.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* ======================================================== */}
      {/* MODAL DO RELATÓRIO OFICIAL DE PRESTAÇÃO DE CONTAS (PDF)   */}
      {/* ======================================================== */}
      {modalRelatorioPdfOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/65 backdrop-blur-[2px] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-lg max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[95vh] my-auto">
            <div className="px-4 py-3 bg-[#285277] text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-white" />
                <h3 className="text-xs sm:text-sm font-semibold">
                  {reportDomain === 'LABORATORIO'
                    ? `Relatório Oficial de Potabilidade — Laboratório (${periodoLabelMap[periodoFiltro]})`
                    : reportDomain === 'CCPU'
                    ? `Relatório Epidemiológico & Operacional — CCPU (${periodoLabelMap[periodoFiltro]})`
                    : `Relatório Oficial de Prestação de Contas Sanitária — DVIS (${periodoLabelMap[periodoFiltro]})`}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadRelatorioPdf}
                  disabled={gerandoRelatorioPdf}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{gerandoRelatorioPdf ? 'Gerando...' : 'Baixar PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalRelatorioPdfOpen(false)}
                  className="p-1.5 rounded bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#eef1f5] flex justify-center">
              <div
                ref={relatorioPrintRef}
                className="bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] p-6 sm:p-10 shadow-lg rounded-sm font-sans flex flex-col justify-between border border-slate-200 select-text"
              >
                <div className="space-y-4">
                  {/* Cabeçalho Institucional */}
                  <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src="/brasao_bc.png"
                        alt="Brasão Balneário Camboriú"
                        className="h-16 w-auto object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          Estado de Santa Catarina
                        </h4>
                        <h3 className="text-sm font-black uppercase text-slate-900">
                          Município de Balneário Camboriú
                        </h3>
                        <p className="text-[10px] font-semibold uppercase text-slate-600">
                          Secretaria Municipal de Saúde · Divisão de Vigilância Sanitária e Ambiental
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xs font-bold bg-slate-100 border border-slate-300 px-2.5 py-1 rounded text-slate-900 block">
                        {reportDomain === 'LABORATORIO'
                          ? 'DVIS · LAB ÁGUA'
                          : reportDomain === 'CCPU'
                          ? 'DVIS · CCPU'
                          : 'DVIS · BI EXEC'}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono mt-1 block">
                        {dataExtenso}
                      </span>
                    </div>
                  </div>

                  {/* CONTEÚDO A4 ESPECÍFICO POR MÓDULO */}
                  {reportDomain === 'LABORATORIO' ? (
                    <>
                      <div className="text-center py-2.5 bg-slate-50 rounded border border-slate-300">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#285277] block">
                          Laboratório Municipal de Água · Portaria GM/MS Nº 888/2021
                        </span>
                        <h1 className="text-base font-black uppercase text-slate-900 mt-1">
                          Relatório Oficial de Controle de Potabilidade da Água
                        </h1>
                        <p className="text-[10px] font-semibold text-slate-600">
                          {periodoLabelMap[periodoFiltro]} · {labKpis.total} amostras · {pontosColeta.length} pontos monitorados
                        </p>
                      </div>

                      <div className="border border-slate-300 rounded p-3 space-y-2">
                        <span className="text-[10px] font-bold uppercase text-slate-800 border-b border-slate-200 pb-1 block">
                          1. Indicadores Analíticos e Físico-Químicos Médios
                        </span>
                        <div className="grid grid-cols-4 gap-2 text-center text-xs">
                          <div className="bg-slate-50 p-2 rounded border border-slate-200">
                            <span className="text-[9px] font-bold uppercase text-slate-500 block">
                              Total Amostras
                            </span>
                            <strong className="text-base font-bold text-slate-900 font-mono tabular-nums">
                              {labKpis.total}
                            </strong>
                          </div>
                          <div className="bg-emerald-50 p-2 rounded border border-emerald-200 text-emerald-900">
                            <span className="text-[9px] font-bold uppercase block">
                              Conformes
                            </span>
                            <strong className="text-base font-bold font-mono tabular-nums">
                              {labKpis.conformes} ({labKpis.taxaConformidade}%)
                            </strong>
                          </div>
                          <div className="bg-rose-50 p-2 rounded border border-rose-200 text-rose-900">
                            <span className="text-[9px] font-bold uppercase block">
                              Não Conformes
                            </span>
                            <strong className="text-base font-bold font-mono tabular-nums">
                              {labKpis.naoConformes}
                            </strong>
                          </div>
                          <div className="bg-[#e6eef6] p-2 rounded border border-[#c4d7ea] text-[#285277]">
                            <span className="text-[9px] font-bold uppercase block">
                              pH / Cloro Médio
                            </span>
                            <strong className="text-sm font-bold font-mono tabular-nums">
                              {labKpis.mediaPh} / {labKpis.mediaCloro}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="border border-slate-300 rounded p-3 space-y-2">
                        <span className="text-[10px] font-bold uppercase text-slate-800 border-b border-slate-200 pb-1 block">
                          2. Amostras Registradas no Período
                        </span>
                        <table className="w-full text-left text-[9.5px]">
                          <thead>
                            <tr className="border-b border-slate-300 font-bold uppercase text-slate-600">
                              <th className="py-1">Amostra</th>
                              <th className="py-1">Data</th>
                              <th className="py-1">Local / Bairro</th>
                              <th className="py-1 text-center">pH / Cloro</th>
                              <th className="py-1 text-center">Colif. / E. coli</th>
                              <th className="py-1">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {amostrasDetalhadas.slice(0, 14).map((a) => (
                              <tr key={a.id}>
                                <td className="py-1 font-mono font-bold">#{a.codigo_amostra}</td>
                                <td className="py-1 font-mono">{a.data_coleta}</td>
                                <td className="py-1 truncate max-w-[160px]">
                                  {a.local_coleta} ({a.bairro})
                                </td>
                                <td className="py-1 text-center font-mono">
                                  {a.ph || '—'} / {a.cloro || '—'}
                                </td>
                                <td className="py-1 text-center font-mono">
                                  {a.coliformes_totais || '—'} / {a.escherichia_coli || '—'}
                                </td>
                                <td className="py-1 font-bold">{a.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : reportDomain === 'CCPU' ? (
                    <>
                      <div className="text-center py-2.5 bg-slate-50 rounded border border-slate-300">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#285277] block">
                          Centro de Controle de Pragas Urbanas · Vigilância Ambiental
                        </span>
                        <h1 className="text-base font-black uppercase text-slate-900 mt-1">
                          Relatório Epidemiológico de Zoonoses, Clima &amp; Insumos
                        </h1>
                        <p className="text-[10px] font-semibold text-slate-600">
                          {periodoLabelMap[periodoFiltro]} · {ccpuKpis.total} ocorrências · {ccpuKpis.totalEspecimes} espécimes
                        </p>
                      </div>

                      <div className="border border-slate-300 rounded p-3 space-y-2">
                        <span className="text-[10px] font-bold uppercase text-slate-800 border-b border-slate-200 pb-1 block">
                          1. Síntese Epidemiológica e Microclimática
                        </span>
                        <div className="grid grid-cols-4 gap-2 text-center text-xs">
                          <div className="bg-slate-50 p-2 rounded border border-slate-200">
                            <span className="text-[9px] font-bold uppercase text-slate-500 block">
                              Ocorrências
                            </span>
                            <strong className="text-base font-bold text-slate-900 font-mono tabular-nums">
                              {ccpuKpis.total}
                            </strong>
                          </div>
                          <div className="bg-amber-50 p-2 rounded border border-amber-200 text-amber-900">
                            <span className="text-[9px] font-bold uppercase block">
                              Espécimes
                            </span>
                            <strong className="text-base font-bold font-mono tabular-nums">
                              {ccpuKpis.totalEspecimes} ({ccpuKpis.vivos} vivos)
                            </strong>
                          </div>
                          <div className="bg-emerald-50 p-2 rounded border border-emerald-200 text-emerald-900">
                            <span className="text-[9px] font-bold uppercase block">
                              Bloqueios / Conc.
                            </span>
                            <strong className="text-base font-bold font-mono tabular-nums">
                              {ccpuKpis.concluidas} ({ccpuKpis.taxaResolucao}%)
                            </strong>
                          </div>
                          <div className="bg-[#e6eef6] p-2 rounded border border-[#c4d7ea] text-[#285277]">
                            <span className="text-[9px] font-bold uppercase block">
                              Temp. Média
                            </span>
                            <strong className="text-base font-bold font-mono tabular-nums">
                              {ccpuKpis.tempMedia}°C
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="border border-slate-300 rounded p-3 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase text-slate-800 border-b border-slate-200 pb-1 block">
                            2. Incidência por Vetor / Espécie
                          </span>
                          <div className="space-y-1 text-[10px]">
                            {ccpuKpis.pragasOrdenadas.slice(0, 6).map((p) => (
                              <div key={p.tipo} className="flex justify-between">
                                <span className="font-semibold text-slate-700 uppercase">
                                  {p.nome}
                                </span>
                                <span className="font-mono font-bold text-slate-900">
                                  {p.qtd} ocorr. · {p.especimes} espéc.
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="border border-slate-300 rounded p-3 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase text-slate-800 border-b border-slate-200 pb-1 block">
                            3. Estoque Atual de Insumos CCPU
                          </span>
                          <div className="space-y-1 text-[10px]">
                            {ccpuEstoque.map((item) => (
                              <div key={item.id} className="flex justify-between">
                                <span className="text-slate-700">{item.nome}</span>
                                <span className="font-mono font-bold text-slate-900">
                                  {item.quantidade_atual} {item.unidade === 'litro' ? 'L' : 'un'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="border border-slate-300 rounded p-3 space-y-2">
                        <span className="text-[10px] font-bold uppercase text-slate-800 border-b border-slate-200 pb-1 block">
                          4. Registro Geoespacial de Ocorrências
                        </span>
                        <table className="w-full text-left text-[9.5px]">
                          <thead>
                            <tr className="border-b border-slate-300 font-bold uppercase text-slate-600">
                              <th className="py-1">Protocolo</th>
                              <th className="py-1">Espécie</th>
                              <th className="py-1">Bairro / Local</th>
                              <th className="py-1 text-center">Temp.</th>
                              <th className="py-1 text-center">Qtd</th>
                              <th className="py-1">Situação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {ccpuDetalhadas.slice(0, 10).map((o) => (
                              <tr key={o.id}>
                                <td className="py-1 font-mono font-bold">{o.protocolo}</td>
                                <td className="py-1 font-semibold">{getPragaLabel(o.tipoPraga)}</td>
                                <td className="py-1 truncate max-w-[170px]">
                                  {o.bairro} — {o.endereco}
                                </td>
                                <td className="py-1 text-center font-mono">{o.temperatura}°C</td>
                                <td className="py-1 text-center font-mono font-bold">{o.quantidade}</td>
                                <td className="py-1">{o.statusOcorrencia.replace(/_/g, ' ')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-center py-2.5 bg-slate-50 rounded border border-slate-300">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#285277] block">
                          Prestação de Contas Oficial &amp; Gestão Sanitária
                        </span>
                        <h1 className="text-base font-black uppercase text-slate-900 mt-1">
                          Relatório Executivo de Produtividade &amp; Desempenho Sanitário
                        </h1>
                        <p className="text-[10px] font-semibold text-slate-600">
                          {periodoLabelMap[periodoFiltro]} · Apuração de SLAs, Regularidade Fiscal e Pastas VISA ({metrics.pastasLocais.length} registradas)
                        </p>
                      </div>

                      <div className="border border-slate-300 rounded p-3 space-y-2">
                        <span className="text-[10px] font-bold uppercase text-slate-800 border-b border-slate-200 pb-1 block">
                          1. Indicadores Globais de Produtividade (SLA &amp; Resolutividade)
                        </span>
                        <div className="grid grid-cols-4 gap-2 text-center text-xs">
                          <div className="bg-slate-50 p-2 rounded border border-slate-200">
                            <span className="text-[9px] font-bold uppercase text-slate-500 block">
                              Total Demandas
                            </span>
                            <strong className="text-base font-bold text-slate-900 font-mono tabular-nums">
                              {kpis.total}
                            </strong>
                          </div>
                          <div className="bg-emerald-50 p-2 rounded border border-emerald-200 text-emerald-900">
                            <span className="text-[9px] font-bold uppercase block">
                              Alvarás Deferidos
                            </span>
                            <strong className="text-base font-bold font-mono tabular-nums">
                              {kpis.deferidos} ({kpis.taxaResolucao}%)
                            </strong>
                          </div>
                          <div className="bg-amber-50 p-2 rounded border border-amber-200 text-amber-900">
                            <span className="text-[9px] font-bold uppercase block">
                              Notificações
                            </span>
                            <strong className="text-base font-bold font-mono tabular-nums">
                              {kpis.notificados}
                            </strong>
                          </div>
                          <div className="bg-[#e6eef6] p-2 rounded border border-[#c4d7ea] text-[#285277]">
                            <span className="text-[9px] font-bold uppercase block">
                              SLA Médio
                            </span>
                            <strong className="text-base font-bold font-mono tabular-nums">
                              {kpis.tempoMedioRespostaDias} dias
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="border border-slate-300 rounded p-3 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase text-slate-800 border-b border-slate-200 pb-1 block">
                            2. Distribuição por Setor Sanitário
                          </span>
                          <div className="space-y-1 text-[10px]">
                            {kpis.setoresOrdenados.slice(0, 6).map((s) => (
                              <div key={s.nome} className="flex items-center justify-between">
                                <span className="font-semibold text-slate-700 uppercase truncate max-w-[180px]">
                                  {s.nome}
                                </span>
                                <span className="font-mono tabular-nums text-slate-900 font-bold">
                                  {s.qtd} ({s.percentual}%)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="border border-slate-300 rounded p-3 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase text-slate-800 border-b border-slate-200 pb-1 block">
                            3. Risco Sanitário &amp; Principais Bairros
                          </span>
                          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] pb-1.5 border-b border-slate-200">
                            <div className="bg-rose-50 border border-rose-200 rounded py-1">
                              <span className="block text-[8px] font-bold uppercase text-rose-700">
                                Alto
                              </span>
                              <strong className="font-mono text-rose-900">{kpis.altoRisco}</strong>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded py-1">
                              <span className="block text-[8px] font-bold uppercase text-amber-700">
                                Médio
                              </span>
                              <strong className="font-mono text-amber-900">{kpis.medioRisco}</strong>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-200 rounded py-1">
                              <span className="block text-[8px] font-bold uppercase text-emerald-700">
                                Baixo
                              </span>
                              <strong className="font-mono text-emerald-900">{kpis.baixoRisco}</strong>
                            </div>
                          </div>
                          <div className="space-y-0.5 text-[10px]">
                            {kpis.bairrosOrdenados.slice(0, 4).map((b, i) => (
                              <div key={b.nome} className="flex justify-between">
                                <span className="text-slate-700">
                                  {i + 1}. {b.nome}
                                </span>
                                <span className="font-mono font-bold text-slate-900">
                                  {b.qtd} proc.
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="border border-slate-300 rounded p-3 space-y-2">
                        <span className="text-[10px] font-bold uppercase text-slate-800 border-b border-slate-200 pb-1 block">
                          4. Desempenho e Produtividade da Equipe de Auditores Fiscais
                        </span>
                        <table className="w-full text-left text-[10px]">
                          <thead>
                            <tr className="border-b border-slate-300 font-bold uppercase text-slate-600">
                              <th className="py-1">Auditor</th>
                              <th className="py-1 text-center">Matrícula</th>
                              <th className="py-1 text-center">Total</th>
                              <th className="py-1 text-center">Concluídas</th>
                              <th className="py-1 text-center">Notificadas</th>
                              <th className="py-1 text-center">Taxa Conclusão</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {kpis.rankingFiscais.slice(0, 10).map((f, i) => (
                              <tr key={i}>
                                <td className="py-1 font-bold text-slate-900 uppercase">
                                  {f.nome}
                                </td>
                                <td className="py-1 text-center font-mono text-slate-600">
                                  {f.matricula}
                                </td>
                                <td className="py-1 text-center font-bold text-slate-900 tabular-nums">
                                  {f.total}
                                </td>
                                <td className="py-1 text-center font-bold text-emerald-800 tabular-nums">
                                  {f.deferidos}
                                </td>
                                <td className="py-1 text-center font-bold text-amber-800 tabular-nums">
                                  {f.notificados}
                                </td>
                                <td className="py-1 text-center font-mono font-bold text-slate-800 tabular-nums">
                                  {f.total > 0 ? Math.round((f.deferidos / f.total) * 100) : 0}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* Quadro Final: Autenticação & Assinatura */}
                  <div className="border border-slate-300 rounded p-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {qrCodeRelatorioUrl && (
                        <img
                          src={qrCodeRelatorioUrl}
                          alt="QR Code de Autenticidade"
                          className="w-14 h-14 border border-slate-300 rounded bg-white p-0.5"
                        />
                      )}
                      <div className="space-y-0.5 text-[9px] text-slate-600">
                        <strong className="text-slate-900 block uppercase">
                          Autenticidade &amp; Transparência Pública
                        </strong>
                        <p>
                          Documento gerado eletronicamente para fins de prestação de contas
                          governamental.
                        </p>
                        <span className="font-mono text-[#285277] font-bold">
                          Chave: BC-VISA-{reportDomain}-{new Date().getFullYear()}-OFICIAL
                        </span>
                      </div>
                    </div>

                    <div className="text-center border-t border-slate-400 pt-1 min-w-[200px]">
                      <span className="text-[10px] font-bold uppercase text-slate-900 block">
                        {currentUser?.nome_completo || 'Diretor Geral da VISA'}
                      </span>
                      <span className="text-[8px] uppercase text-slate-600 block">
                        Diretoria de Vigilância Sanitária e Ambiental · DVIS
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-300 text-[8px] text-slate-500 font-mono text-center">
                  Prefeitura Municipal de Balneário Camboriú · Secretaria de Saúde · Lei Complementar
                  nº 40/2019
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
