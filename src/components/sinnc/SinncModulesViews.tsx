import React, { useMemo, useState } from 'react';
import {
  FeiranteItem,
  FiscalizacaoItem,
  PastaVisaItem,
  ProcessoItem,
  TramitacaoItem,
  UserProfile,
  EscalaItem,
  AmostraLaboratorioItem,
} from '../../types';
import {
  SinncDashboardMetrics,
  SinncWorkspaceTabId,
  SINNC_MODULE_LABELS,
  diffDaysFromToday,
  formatShortBrDate,
} from './sinncTypes';
import {
  ConsolidacaoRelatorio,
  cleanDoc,
  executarConsolidacaoLegadoHibrida,
  formatDoc,
  getDisplayPastaNumero,
  isValidDocLength,
  obterOuCriarPastaPorCpfCnpj,
  verificarPendenciasAbertasNaPasta,
} from '../../lib/pastaVisaService';
import { computePastaSemaforo, getLabRecordsForPasta } from '../../lib/interlaceServices';
import { SinncWorkflowModalKind } from './SinncDemoWorkflowModals';
import {
  ArrowUpRight,
  Award,
  CheckCircle2,
  Copy,
  Database,
  Droplet,
  FileText,
  FolderOpen,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Shuffle,
  UserCheck,
  Download,
} from 'lucide-react';

interface SinncModulesViewsProps {
  activeTab: Exclude<SinncWorkspaceTabId, 'painel'>;
  currentUser: UserProfile | null;
  metrics: SinncDashboardMetrics;
  processos: ProcessoItem[];
  fiscalizacoes: FiscalizacaoItem[];
  amostrasLaboratorio: AmostraLaboratorioItem[];
  feiras: FeiranteItem[];
  escala: EscalaItem[];
  users: UserProfile[];
  onSelectProcesso: (proc: ProcessoItem) => void;
  onSaveProcesso: (proc: ProcessoItem) => Promise<void> | void;
  onOpenDossiePasta: (pasta: PastaVisaItem) => void;
  onOpenDossiePorProcesso: (proc: ProcessoItem) => void;
  onOpenDossiePorDoc: (doc: string, razaoFallback?: string) => void;
  onOpenWorkflowModal: (kind: SinncWorkflowModalKind, initialPasta?: PastaVisaItem | null) => void;
  onOpenSolicitarLab: (pasta?: PastaVisaItem | null) => void;
  onRefreshState: () => void;
  onNavigateClassic: (view: string) => void;
  compactDensity: boolean;
  setCompactDensity: (v: boolean) => void;
}

const SQL_MIGRATION_SNIPPET = `-- Cole no Supabase SQL Editor (+ New Query) e clique em RUN:
CREATE TABLE IF NOT EXISTS public.pastas_visa (
    id TEXT PRIMARY KEY,
    cnpj_cpf TEXT NOT NULL,
    cpf_cnpj_limpo TEXT,
    pasta TEXT,
    numero_pasta TEXT,
    pasta_referencia_anterior TEXT,
    origem_numeracao TEXT DEFAULT 'DIGITAL_6_DIGITOS',
    razao_social TEXT,
    status_rf TEXT DEFAULT 'ATIVA',
    alvara_atualizado TEXT DEFAULT 'SIM',
    setor TEXT DEFAULT 'VIGILÂNCIA SANITÁRIA',
    telefone TEXT,
    email TEXT,
    endereco TEXT,
    bairro TEXT,
    cnae_principal TEXT,
    grau_risco TEXT,
    observacoes TEXT,
    criado_por TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.pastas_visa ADD COLUMN IF NOT EXISTS cpf_cnpj_limpo TEXT;
ALTER TABLE public.pastas_visa ADD COLUMN IF NOT EXISTS numero_pasta TEXT;
ALTER TABLE public.pastas_visa ADD COLUMN IF NOT EXISTS pasta_referencia_anterior TEXT;
ALTER TABLE public.pastas_visa ADD COLUMN IF NOT EXISTS origem_numeracao TEXT DEFAULT 'DIGITAL_6_DIGITOS';
ALTER TABLE public.pastas_visa ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE public.pastas_visa ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.pastas_visa ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE public.pastas_visa ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE public.pastas_visa ADD COLUMN IF NOT EXISTS cnae_principal TEXT;
ALTER TABLE public.pastas_visa ADD COLUMN IF NOT EXISTS grau_risco TEXT;

UPDATE public.pastas_visa
SET
  cpf_cnpj_limpo = COALESCE(NULLIF(cpf_cnpj_limpo, ''), regexp_replace(COALESCE(cnpj_cpf, ''), '\\D', '', 'g')),
  numero_pasta   = COALESCE(NULLIF(numero_pasta, ''), NULLIF(pasta, '')),
  pasta_referencia_anterior = COALESCE(pasta_referencia_anterior, pasta),
  origem_numeracao = CASE
    WHEN COALESCE(origem_numeracao, '') <> '' THEN origem_numeracao
    WHEN COALESCE(pasta, '') ~ '^\\d{6}$' THEN 'DIGITAL_6_DIGITOS'
    ELSE 'FISICA_EXISTENTE'
  END
WHERE cpf_cnpj_limpo IS NULL OR numero_pasta IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pastas_visa_cpf_cnpj_limpo
  ON public.pastas_visa (cpf_cnpj_limpo)
  WHERE cpf_cnpj_limpo IS NOT NULL AND length(cpf_cnpj_limpo) IN (11, 14);
CREATE INDEX IF NOT EXISTS idx_pastas_visa_numero_pasta ON public.pastas_visa(numero_pasta);

ALTER TABLE public.pastas_visa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir Acesso Anonimo Pastas Visa" ON public.pastas_visa;
CREATE POLICY "Permitir Acesso Anonimo Pastas Visa"
  ON public.pastas_visa FOR ALL USING (true) WITH CHECK (true);

CREATE SEQUENCE IF NOT EXISTS public.seq_pasta_visa_6d START 1 INCREMENT 1;

CREATE OR REPLACE FUNCTION public.gerar_proximo_numero_pasta_6d()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_num BIGINT; v_codigo TEXT;
BEGIN
  LOOP
    v_num := nextval('public.seq_pasta_visa_6d');
    v_codigo := lpad(v_num::TEXT, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.pastas_visa p
      WHERE p.numero_pasta = v_codigo OR p.pasta = v_codigo
    );
  END LOOP;
  RETURN v_codigo;
END;
$$;

GRANT EXECUTE ON FUNCTION public.gerar_proximo_numero_pasta_6d() TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.alvaras_sanitarios (
    id TEXT PRIMARY KEY,
    numero_alvara TEXT NOT NULL,
    ano_exercicio TEXT NOT NULL,
    tipo_alvara TEXT NOT NULL DEFAULT 'INICIAL',
    modelo_tipo TEXT DEFAULT 'PONTO_MILHO_CHURROS',
    pasta TEXT,
    numero_pasta TEXT,
    cpf_cnpj_limpo TEXT,
    cnpj_cpf TEXT NOT NULL,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    endereco TEXT NOT NULL,
    numero TEXT NOT NULL,
    complemento TEXT,
    bairro TEXT NOT NULL,
    municipio TEXT NOT NULL DEFAULT 'Balneário Camboriú',
    cep TEXT,
    cnae_principal TEXT NOT NULL,
    cnaes_secundarios JSONB DEFAULT '[]'::jsonb,
    responsavel_tecnico TEXT,
    conselho_rt TEXT,
    validade TEXT NOT NULL,
    data_emissao TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ATIVO',
    setor TEXT NOT NULL DEFAULT 'ALIMENTOS',
    condicionantes TEXT,
    fiscal_emissor TEXT,
    matricula_fiscal TEXT,
    codigo_autenticacao TEXT,
    assinatura_digital TEXT,
    assinado_por TEXT,
    assinado_em TEXT,
    modelo_doc_url TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.alvaras_sanitarios ADD COLUMN IF NOT EXISTS numero_pasta TEXT;
ALTER TABLE public.alvaras_sanitarios ADD COLUMN IF NOT EXISTS cpf_cnpj_limpo TEXT;
ALTER TABLE public.alvaras_sanitarios ADD COLUMN IF NOT EXISTS assinatura_digital TEXT;
ALTER TABLE public.alvaras_sanitarios ADD COLUMN IF NOT EXISTS assinado_por TEXT;
ALTER TABLE public.alvaras_sanitarios ADD COLUMN IF NOT EXISTS assinado_em TEXT;
CREATE INDEX IF NOT EXISTS idx_alvaras_cnpj ON public.alvaras_sanitarios (cnpj_cpf);
CREATE INDEX IF NOT EXISTS idx_alvaras_numero ON public.alvaras_sanitarios (numero_alvara);
CREATE INDEX IF NOT EXISTS idx_alvaras_status ON public.alvaras_sanitarios (status);
CREATE INDEX IF NOT EXISTS idx_alvaras_numero_pasta ON public.alvaras_sanitarios(numero_pasta);
CREATE INDEX IF NOT EXISTS idx_alvaras_cpf_cnpj_limpo ON public.alvaras_sanitarios(cpf_cnpj_limpo);
ALTER TABLE public.alvaras_sanitarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso completo aos alvarás sanitários" ON public.alvaras_sanitarios;
CREATE POLICY "Acesso completo aos alvarás sanitários"
  ON public.alvaras_sanitarios FOR ALL USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF to_regclass('public.processos') IS NOT NULL THEN
    ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS numero_pasta TEXT;
    ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS cpf_cnpj_limpo TEXT;
    CREATE INDEX IF NOT EXISTS idx_processos_numero_pasta ON public.processos(numero_pasta);
    CREATE INDEX IF NOT EXISTS idx_processos_cpf_cnpj_limpo ON public.processos(cpf_cnpj_limpo);
  END IF;

  IF to_regclass('public.fiscalizacoes') IS NOT NULL THEN
    ALTER TABLE public.fiscalizacoes ADD COLUMN IF NOT EXISTS numero_pasta TEXT;
    ALTER TABLE public.fiscalizacoes ADD COLUMN IF NOT EXISTS cpf_cnpj_limpo TEXT;
    CREATE INDEX IF NOT EXISTS idx_fiscalizacoes_numero_pasta ON public.fiscalizacoes(numero_pasta);
  END IF;

  IF to_regclass('public.solicitacoes_potabilidade') IS NOT NULL THEN
    ALTER TABLE public.solicitacoes_potabilidade ADD COLUMN IF NOT EXISTS numero_pasta TEXT;
    ALTER TABLE public.solicitacoes_potabilidade ADD COLUMN IF NOT EXISTS cpf_cnpj_limpo TEXT;
    CREATE INDEX IF NOT EXISTS idx_solicitacoes_potab_pasta ON public.solicitacoes_potabilidade(numero_pasta);
  END IF;

  IF to_regclass('public.laboratorio') IS NOT NULL THEN
    ALTER TABLE public.laboratorio ADD COLUMN IF NOT EXISTS numero_pasta TEXT;
    ALTER TABLE public.laboratorio ADD COLUMN IF NOT EXISTS cpf_cnpj_limpo TEXT;
  END IF;

  IF to_regclass('public.feiras') IS NOT NULL THEN
    ALTER TABLE public.feiras ADD COLUMN IF NOT EXISTS numero_pasta TEXT;
    ALTER TABLE public.feiras ADD COLUMN IF NOT EXISTS cpf_cnpj_limpo TEXT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.habite_se_registros (
    id TEXT PRIMARY KEY,
    numero_protocolo TEXT NOT NULL UNIQUE,
    numero_pasta TEXT NOT NULL,
    cpf_cnpj_limpo TEXT NOT NULL,
    cnpj_cpf TEXT NOT NULL,
    titular_nome TEXT NOT NULL,
    nome_edificacao TEXT,
    tipo_peticao TEXT DEFAULT 'TOTAL',
    endereco TEXT,
    bairro TEXT,
    numero_dic TEXT,
    rt_nome TEXT,
    rt_registro TEXT,
    area_total_m2 TEXT,
    fiscal_responsavel TEXT,
    status TEXT DEFAULT 'EM ANÁLISE',
    processo_id TEXT,
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_habite_se_pasta ON public.habite_se_registros(numero_pasta);
CREATE INDEX IF NOT EXISTS idx_habite_se_doc ON public.habite_se_registros(cpf_cnpj_limpo);
ALTER TABLE public.habite_se_registros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir Acesso Completo HabiteSe Registros" ON public.habite_se_registros;
CREATE POLICY "Permitir Acesso Completo HabiteSe Registros"
  ON public.habite_se_registros FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.pas_juridico (
    id TEXT PRIMARY KEY,
    numero_pas TEXT NOT NULL UNIQUE,
    numero_pasta TEXT NOT NULL,
    cpf_cnpj_limpo TEXT NOT NULL,
    cnpj_cpf TEXT NOT NULL,
    razao_social TEXT NOT NULL,
    processo_origem_id TEXT,
    processo_origem_protocolo TEXT,
    auto_infracao_origem TEXT,
    enquadramento_legal TEXT,
    resumo_fatos TEXT,
    fiscal_autuante TEXT,
    data_instauracao TEXT,
    prazo_defesa_limite TEXT,
    status TEXT DEFAULT 'INSTAURADO',
    valor_multa_ufm TEXT,
    defesa_texto TEXT,
    decisao_final TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pas_juridico_pasta ON public.pas_juridico(numero_pasta);
CREATE INDEX IF NOT EXISTS idx_pas_juridico_doc ON public.pas_juridico(cpf_cnpj_limpo);
ALTER TABLE public.pas_juridico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir Acesso Completo PAS Juridico" ON public.pas_juridico;
CREATE POLICY "Permitir Acesso Completo PAS Juridico"
  ON public.pas_juridico FOR ALL USING (true) WITH CHECK (true);`;

export const SinncModulesViews: React.FC<SinncModulesViewsProps> = ({
  activeTab,
  currentUser,
  metrics,
  processos,
  fiscalizacoes,
  amostrasLaboratorio,
  feiras,
  escala,
  users,
  onSelectProcesso,
  onSaveProcesso,
  onOpenDossiePasta,
  onOpenDossiePorProcesso,
  onOpenDossiePorDoc,
  onOpenWorkflowModal,
  onOpenSolicitarLab,
  onRefreshState,
  onNavigateClassic,
  compactDensity,
  setCompactDensity,
}) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [certidaoQuery, setCertidaoQuery] = useState('');
  const [selectedFisc, setSelectedFisc] = useState<FiscalizacaoItem | null>(null);

  // Resolver rápido de Pasta em Cadastros
  const [quickDoc, setQuickDoc] = useState('');
  const [quickFisica, setQuickFisica] = useState('');
  const [resolvingPasta, setResolvingPasta] = useState(false);
  const [quickFeedback, setQuickFeedback] = useState<string | null>(null);

  // Consolidação Passo 9 & SQL
  const [consolidacaoRes, setConsolidacaoRes] = useState<ConsolidacaoRelatorio | null>(null);
  const [consolidating, setConsolidating] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [triageFeedback, setTriageFeedback] = useState<string | null>(null);

  const rowPad = compactDensity ? 'py-2 px-3' : 'py-2.5 px-3.5';
  const q = query.trim().toLowerCase();

  const fiscaisAtivos = useMemo(
    () => users.filter((u) => !u.tipo_usuario || u.tipo_usuario === 'SERVIDOR'),
    [users]
  );

  // Mapa rápido CPF/CNPJ limpo -> PastaVisaItem
  const pastaByDocMap = useMemo(() => {
    const m = new Map<string, PastaVisaItem>();
    metrics.pastasLocais.forEach((pt) => {
      const limpo = cleanDoc(pt.cpf_cnpj_limpo || pt.cnpj_cpf);
      if (limpo) m.set(limpo, pt);
    });
    return m;
  }, [metrics.pastasLocais]);

  const getPastaLabelForDoc = (doc?: string, pastaField?: string): string => {
    const limpo = cleanDoc(doc);
    if (limpo && pastaByDocMap.has(limpo)) {
      return getDisplayPastaNumero(pastaByDocMap.get(limpo));
    }
    return String(pastaField || '').trim();
  };

  // Exportação CSV real para Relatórios
  const handleExportCsv = () => {
    const header = ['Pasta_VISA', 'Protocolo', 'Razao_Social', 'CNPJ_CPF', 'Bairro', 'Setor', 'Status', 'Fiscal', 'Prazo'];
    const rows = processos.map((p) => [
      getPastaLabelForDoc(p.cnpj_cpf, p.numero_pasta || p.pasta) || 'SEM_PASTA',
      p.num_processo || p.id,
      (p.razao_social || '').replace(/;/g, ','),
      p.cnpj_cpf || '',
      p.bairro || '',
      p.setor || '',
      p.status || '',
      p.fiscal_responsavel || '',
      p.prazo_vistoria || p.validade || '',
    ]);
    const csv = [header.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-visa-pastas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResolverOuCriarPasta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidDocLength(quickDoc)) {
      setQuickFeedback('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.');
      return;
    }
    setResolvingPasta(true);
    setQuickFeedback(null);
    try {
      const res = await obterOuCriarPastaPorCpfCnpj(quickDoc, {
        pasta_fisica_informada: quickFisica || undefined,
        criado_por: currentUser?.nome_completo || 'Cadastro VISA',
      });
      onRefreshState();
      setQuickDoc('');
      setQuickFisica('');
      setQuickFeedback(
        res.criadaAgora
          ? `Pasta ${getDisplayPastaNumero(res.pasta)} criada (${res.pasta.origem_numeracao === 'FISICA_EXISTENTE' ? 'Física preservada' : '6 dígitos automática'}).`
          : `Pasta existente localizada: ${getDisplayPastaNumero(res.pasta)}.`
      );
      onOpenDossiePasta(res.pasta);
    } finally {
      setResolvingPasta(false);
    }
  };

  const handleDistribuirDiretoria = async (proc: ProcessoItem, fiscalNome: string, modo: 'MANTER_PASTA' | 'SORTEIO') => {
    const nowIso = new Date().toISOString();
    const tram: TramitacaoItem = {
      id: `tram-dir-${Date.now()}`,
      data_hora: nowIso,
      tipo: 'DISTRIBUICAO_FISCAL',
      titulo: modo === 'MANTER_PASTA' ? `Mantido com fiscal da Pasta: ${fiscalNome}` : `Distribuído por sorteio para ${fiscalNome}`,
      descricao: `Triagem realizada pela Diretoria mantendo vínculo com a Pasta ${getPastaLabelForDoc(proc.cnpj_cpf, proc.numero_pasta || proc.pasta) || 'S/N'}.`,
      responsavel_nome: currentUser?.nome_completo || 'Diretoria VISA',
      status_processo_momento: 'EM ANÁLISE',
    };
    const updated: ProcessoItem = {
      ...proc,
      fiscal_responsavel: fiscalNome,
      data_distribuicao: nowIso.slice(0, 10),
      tramitacoes: [tram, ...(proc.tramitacoes || [])],
    };
    await onSaveProcesso(updated);
    onRefreshState();
    setTriageFeedback(`Protocolo ${proc.num_processo} atribuído a ${fiscalNome}.`);
    setTimeout(() => setTriageFeedback(null), 3500);
  };

  const handleExecutarConsolidacao = async () => {
    setConsolidating(true);
    try {
      const rel = await executarConsolidacaoLegadoHibrida(processos, fiscalizacoes, feiras);
      // Atualiza processos vinculados em memória/Supabase
      for (const p of rel.processosAtualizados) {
        const orig = processos.find((x) => x.id === p.id);
        if (orig && (orig.numero_pasta !== p.numero_pasta || orig.pasta !== p.pasta)) {
          await onSaveProcesso(p);
        }
      }
      setConsolidacaoRes(rel);
      onRefreshState();
    } finally {
      setConsolidating(false);
    }
  };

  const renderSectionHeader = (subtitle: string, rightAction?: React.ReactNode) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
      <div>
        <h1 className="text-[17px] font-semibold text-slate-800 tracking-tight">
          {SINNC_MODULE_LABELS[activeTab]}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      {rightAction && <div className="flex flex-wrap items-center gap-2 shrink-0">{rightAction}</div>}
    </div>
  );

  const renderSearchBar = (placeholder: string, filters?: { id: string; label: string }[]) => (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div className="relative flex-1 max-w-md">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="!pl-8 !py-1.5 !px-3 !text-xs !font-normal !rounded-md !border-slate-300 !bg-white"
        />
      </div>

      {filters && filters.length > 0 && (
        <div className="flex items-center gap-1 p-1 bg-[#f4f6f9] border border-slate-200 rounded-md overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-white text-slate-900 border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // 1. TAREFAS / PROCESSOS / LICENCIAMENTO / ATENDIMENTO
  if (
    activeTab === 'tarefas' ||
    activeTab === 'processos' ||
    activeTab === 'licenciamento' ||
    activeTab === 'atendimento'
  ) {
    const baseList =
      activeTab === 'tarefas'
        ? metrics.minhasTarefas
        : activeTab === 'licenciamento'
        ? metrics.licenciamentosAndamento
        : activeTab === 'atendimento'
        ? processos.filter(
            (p) =>
              p.origem_solicitacao === 'PORTAL_MUNICIPE' ||
              p.origem_solicitacao === 'PORTAL_CONTADOR' ||
              p.origem_solicitacao === 'DENUNCIA_ANONIMA' ||
              Boolean(p.cumprimento_cidadao) ||
              (p.motivacao || '').toUpperCase().includes('DENÚNCIA') ||
              (p.setor || '').toUpperCase().includes('OUVIDORIA')
          )
        : processos;

    const filtered = baseList.filter((p) => {
      if (statusFilter === 'ATRASADOS') {
        const diff = diffDaysFromToday(p.prazo_vistoria || p.venc_1doc || p.agendado_para);
        if (diff === null || diff >= 0) return false;
      } else if (statusFilter !== 'TODOS' && p.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const pastaCode = getPastaLabelForDoc(p.cnpj_cpf, p.numero_pasta || p.pasta);
      return (
        (p.num_processo || '').toLowerCase().includes(q) ||
        (p.razao_social || '').toLowerCase().includes(q) ||
        (p.cnpj_cpf || '').toLowerCase().includes(q) ||
        pastaCode.toLowerCase().includes(q) ||
        (p.assunto || '').toLowerCase().includes(q) ||
        (p.fiscal_responsavel || '').toLowerCase().includes(q)
      );
    });

    const subtitleMap: Record<string, string> = {
      tarefas: 'Pendências sob responsabilidade técnica vinculadas à Pasta VISA',
      processos: 'Processos sanitários, pareceres e PAS jurídicos entrelaçados pela Pasta',
      licenciamento: 'Pedidos de alvará inicial, renovação e Habite-se sanitário (LC 40/2019)',
      atendimento: 'Entradas do Portal do Cidadão, Portal do Contador, Denúncias e Cumprimentos',
    };

    return (
      <div className="space-y-4 text-left">
        {renderSectionHeader(
          subtitleMap[activeTab],
          <>
            <button
              type="button"
              onClick={() => onOpenWorkflowModal('nova_demanda')}
              className="px-3 py-1.5 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Demanda / Portal</span>
            </button>
            {activeTab === 'licenciamento' && (
              <button
                type="button"
                onClick={() => onOpenWorkflowModal('novo_habite_se')}
                className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Habite-se</span>
              </button>
            )}
          </>
        )}

        {renderSearchBar('Filtrar por Pasta VISA, protocolo, razão social, CNPJ ou fiscal...', [
          { id: 'TODOS', label: 'Todos' },
          { id: 'ATRASADOS', label: 'Prazo vencido' },
          { id: 'EM ANÁLISE', label: 'Em análise' },
          { id: 'NOTIFICADO', label: 'Notificados' },
          { id: 'PENDENTE DOCS', label: 'Exigências' },
          { id: 'DEFERIDO', label: 'Deferidos' },
        ])}

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f4f6f9] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-3.5">Pasta VISA</th>
                  <th className="py-2.5 px-3.5">Protocolo</th>
                  <th className="py-2.5 px-3.5">Estabelecimento / Requerente</th>
                  <th className="py-2.5 px-3.5">Assunto</th>
                  <th className="py-2.5 px-3.5">Responsável</th>
                  <th className="py-2.5 px-3.5">Situação</th>
                  <th className="py-2.5 px-3.5 text-right">Prazo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-xs">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Nenhum registro encontrado para os critérios selecionados.
                    </td>
                  </tr>
                ) : (
                  filtered.slice(0, 80).map((proc) => {
                    const prazoStr = proc.prazo_vistoria || proc.venc_1doc || proc.agendado_para;
                    const diff = diffDaysFromToday(prazoStr);
                    const isOverdue = diff !== null && diff < 0 && proc.status !== 'DEFERIDO';
                    const pastaLabel = getPastaLabelForDoc(proc.cnpj_cpf, proc.numero_pasta || proc.pasta);
                    return (
                      <tr
                        key={proc.id}
                        onClick={() => onSelectProcesso(proc)}
                        className="hover:bg-[#f8fafc] transition-colors cursor-pointer"
                      >
                        <td className={`${rowPad} whitespace-nowrap`}>
                          {pastaLabel ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenDossiePorProcesso(proc);
                              }}
                              className="px-2 py-0.5 rounded bg-[#e6eef6] hover:bg-[#d8e5f2] text-[#285277] font-mono text-[11px] font-semibold tabular-nums cursor-pointer"
                              title="Abrir Dossiê 360° da Pasta"
                            >
                              {pastaLabel}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-mono">Triagem</span>
                          )}
                        </td>
                        <td className={`${rowPad} font-mono text-slate-700 tabular-nums whitespace-nowrap`}>
                          {proc.num_processo || proc.id}
                        </td>
                        <td className={`${rowPad} text-slate-800 font-medium max-w-[230px] truncate`}>
                          {proc.razao_social || proc.nome_fantasia || 'Não informado'}
                        </td>
                        <td className={`${rowPad} text-slate-600 max-w-[220px] truncate`}>
                          {proc.assunto || 'Análise sanitária'}
                        </td>
                        <td className={`${rowPad} text-slate-600 whitespace-nowrap`}>
                          {proc.fiscal_responsavel || 'Não distribuído'}
                        </td>
                        <td className={`${rowPad} whitespace-nowrap`}>
                          <span className="text-slate-700 font-medium">{proc.status}</span>
                          {proc.cumprimento_cidadao?.status === 'AGUARDANDO_CONFERENCIA' && (
                            <span className="ml-1.5 text-[10.5px] font-semibold text-[#D97706]">· Retorno</span>
                          )}
                        </td>
                        <td
                          className={`${rowPad} text-right font-mono tabular-nums whitespace-nowrap ${
                            isOverdue ? 'text-[#a13c46] font-medium' : 'text-slate-500'
                          }`}
                        >
                          {formatShortBrDate(prazoStr)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Seção complementar: Habite-se ou PAS Jurídicos vinculados */}
        {activeTab === 'licenciamento' && metrics.habiteSeLocais.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 text-xs font-semibold text-slate-700">
              Habite-se Sanitário vinculados às Pastas ({metrics.habiteSeLocais.length})
            </div>
            <div className="divide-y divide-slate-200">
              {metrics.habiteSeLocais.slice(0, 15).map((h) => (
                <div
                  key={h.id}
                  onClick={() => onOpenDossiePorDoc(h.cnpj_cpf, h.titular_nome)}
                  className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-[#f8fafc] cursor-pointer"
                >
                  <div className="min-w-0">
                    <span className="font-mono font-semibold text-[#285277] mr-2">Pasta {h.numero_pasta}</span>
                    <span className="font-mono text-slate-700 mr-2">{h.numero_protocolo}</span>
                    <span className="font-medium text-slate-800">{h.nome_edificacao}</span>
                  </div>
                  <span className="text-slate-600 font-medium shrink-0">{h.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'processos' && metrics.pasJuridicoLocais.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 text-xs font-semibold text-slate-700">
              PAS Jurídicos Instaurados ({metrics.pasJuridicoLocais.length})
            </div>
            <div className="divide-y divide-slate-200">
              {metrics.pasJuridicoLocais.slice(0, 15).map((pas) => (
                <div
                  key={pas.id}
                  onClick={() => onOpenDossiePorDoc(pas.cnpj_cpf, pas.razao_social)}
                  className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-[#f8fafc] cursor-pointer"
                >
                  <div className="min-w-0">
                    <span className="font-mono font-semibold text-[#DC2626] mr-2">{pas.numero_pas}</span>
                    <span className="font-mono text-[#285277] mr-2">Pasta {pas.numero_pasta}</span>
                    <span className="font-medium text-slate-800">{pas.razao_social}</span>
                  </div>
                  <span className="font-mono text-slate-500 shrink-0 tabular-nums">
                    Defesa: {formatShortBrDate(pas.prazo_defesa_limite)} · {pas.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. BUSCAR (Busca Global Unificada por Pasta, CPF/CNPJ, Protocolo ou Razão)
  if (activeTab === 'buscar') {
    const pastaHits = metrics.pastasLocais.filter((pt) => {
      if (!q) return true;
      return (
        getDisplayPastaNumero(pt).toLowerCase().includes(q) ||
        (pt.cnpj_cpf || '').toLowerCase().includes(q) ||
        (pt.cpf_cnpj_limpo || '').includes(q.replace(/\D/g, '')) ||
        (pt.razao_social || '').toLowerCase().includes(q)
      );
    });

    const procHits = q
      ? processos.filter(
          (p) =>
            (p.num_processo || '').toLowerCase().includes(q) ||
            (p.razao_social || '').toLowerCase().includes(q) ||
            (p.cnpj_cpf || '').toLowerCase().includes(q) ||
            (p.numero_pasta || p.pasta || '').toLowerCase().includes(q) ||
            (p.assunto || '').toLowerCase().includes(q)
        )
      : processos.slice(0, 8);

    return (
      <div className="space-y-5 text-left">
        {renderSectionHeader('Busca global unificada por Pasta VISA, CPF/CNPJ, protocolo ou razão social')}
        {renderSearchBar('Digite Pasta (000001 ou 1042/2024), CPF/CNPJ, razão social ou protocolo...')}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5">
            <h2 className="text-xs font-semibold text-slate-700 tabular-nums">
              Pastas VISA encontradas ({pastaHits.length})
            </h2>
            <div className="divide-y divide-slate-200/70">
              {pastaHits.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">Nenhuma Pasta localizada para o filtro.</p>
              ) : (
                pastaHits.slice(0, 12).map((pt) => (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => onOpenDossiePasta(pt)}
                    className="w-full py-2 text-left hover:bg-[#f8fafc] px-1.5 -mx-1.5 rounded transition-colors flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate">{pt.razao_social}</div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums truncate">
                        Pasta {getDisplayPastaNumero(pt)} · {pt.cnpj_cpf} · {pt.setor}
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-[#3b6d96] shrink-0">Abrir Dossiê</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5">
            <h2 className="text-xs font-semibold text-slate-700 tabular-nums">
              Processos encontrados ({procHits.length})
            </h2>
            <div className="divide-y divide-slate-200/70">
              {procHits.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">Nenhum processo correspondente.</p>
              ) : (
                procHits.slice(0, 12).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectProcesso(p)}
                    className="w-full py-2 text-left hover:bg-[#f8fafc] px-1.5 -mx-1.5 rounded transition-colors flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate">
                        {p.razao_social || p.nome_fantasia}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums truncate">
                        {p.num_processo} · {p.cnpj_cpf || 'S/ CNPJ'} · {p.status}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. AGENDA
  if (activeTab === 'agenda') {
    const vistoriasAgendadas = processos.filter(
      (p) => p.status === 'VISTORIA AGENDADA' || Boolean(p.agendado_para)
    );
    return (
      <div className="space-y-4 text-left">
        {renderSectionHeader('Agenda de inspeções programadas e retornos automáticos de notificação')}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 text-xs font-semibold text-slate-700 tabular-nums">
              Inspeções agendadas ({vistoriasAgendadas.length})
            </div>
            <div className="divide-y divide-slate-200/70">
              {vistoriasAgendadas.length === 0 ? (
                <p className="text-xs text-slate-400 p-6 text-center">Nenhuma vistoria agendada.</p>
              ) : (
                vistoriasAgendadas.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectProcesso(p)}
                    className="w-full px-4 py-2.5 hover:bg-[#f8fafc] flex items-center justify-between gap-3 text-left text-xs cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 truncate">{p.razao_social}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {p.endereco} {p.bairro ? `· ${p.bairro}` : ''} · {p.fiscal_responsavel || 'Equipe'}
                      </div>
                    </div>
                    <span className="font-mono text-slate-700 tabular-nums shrink-0">
                      {formatShortBrDate(p.agendado_para || p.prazo_vistoria)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 text-xs font-semibold text-slate-700 tabular-nums">
              Escalas e retornos de notificação ({escala.length})
            </div>
            <div className="divide-y divide-slate-200/70">
              {escala.slice(0, 20).map((item) => (
                <div key={item.id} className="px-4 py-2.5 flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 truncate">{item.descricao || item.tipo}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {item.tipo} · {item.servidores}
                    </div>
                  </div>
                  <span className="font-mono text-slate-600 tabular-nums shrink-0">
                    {formatShortBrDate(item.data)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. CADASTROS (PASTAS VISA & IDENTIDADE ÚNICA OPÇÃO A HÍBRIDA)
  if (activeTab === 'cadastros') {
    const filtradas = metrics.pastasLocais.filter((pt) => {
      if (!q) return true;
      return (
        getDisplayPastaNumero(pt).toLowerCase().includes(q) ||
        (pt.razao_social || '').toLowerCase().includes(q) ||
        (pt.cnpj_cpf || '').toLowerCase().includes(q) ||
        (pt.setor || '').toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-4 text-left">
        {renderSectionHeader(
          `Pastas VISA cadastradas (${metrics.pastasLocais.length}) — 1 CPF/CNPJ = 1 Pasta (Opção A Híbrida)`
        )}

        {/* Resolvedor instantâneo Opção A Híbrida */}
        <form onSubmit={handleResolverOuCriarPasta} className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Localizar ou Gerar Pasta VISA por CPF ou CNPJ
              </label>
              <input
                type="text"
                value={quickDoc}
                onChange={(e) => setQuickDoc(e.target.value)}
                placeholder="Digite CPF (11 dígitos) ou CNPJ (14 dígitos)"
                className="w-full !text-xs !py-2 !px-3 font-mono"
              />
            </div>
            <div className="lg:w-64">
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Nº Pasta Física Existente (se houver)
              </label>
              <input
                type="text"
                value={quickFisica}
                onChange={(e) => setQuickFisica(e.target.value)}
                placeholder="Ex: 1042/2024 (vazio = 6 dígitos)"
                className="w-full !text-xs !py-2 !px-3 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={resolvingPasta}
              className="px-4 py-2 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium cursor-pointer whitespace-nowrap shrink-0"
            >
              {resolvingPasta ? 'Consultando RFB...' : 'Abrir / Criar Pasta VISA'}
            </button>
          </div>
          {quickFeedback && (
            <p className="text-xs font-medium text-[#285277]">{quickFeedback}</p>
          )}
        </form>

        {renderSearchBar('Buscar por número da Pasta, razão social, CPF/CNPJ ou setor...')}

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f4f6f9] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-3.5">Pasta VISA</th>
                  <th className="py-2.5 px-3.5">Origem</th>
                  <th className="py-2.5 px-3.5">CNPJ / CPF</th>
                  <th className="py-2.5 px-3.5">Razão Social</th>
                  <th className="py-2.5 px-3.5">Semáforo</th>
                  <th className="py-2.5 px-3.5">Alvará / RFB</th>
                  <th className="py-2.5 px-3.5 text-right">Dossiê</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-xs">
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Nenhuma Pasta encontrada. Digite um CPF/CNPJ acima ou execute a Consolidação em Gestão.
                    </td>
                  </tr>
                ) : (
                  filtradas.slice(0, 80).map((pt) => {
                    const limpo = cleanDoc(pt.cpf_cnpj_limpo || pt.cnpj_cpf);
                    const pNum = getDisplayPastaNumero(pt);
                    const pProcs = processos.filter(
                      (p) => (limpo && cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === limpo) || (pNum && (p.numero_pasta || p.pasta) === pNum)
                    );
                    const pAlvs = metrics.alvarasLocais.filter(
                      (a) => (limpo && cleanDoc(a.cpf_cnpj_limpo || a.cnpj_cpf) === limpo) || (pNum && (a.numero_pasta || a.pasta) === pNum)
                    );
                    const pFisc = fiscalizacoes.filter(
                      (f) => (limpo && cleanDoc(f.cpf_cnpj_limpo || f.estabelecimento?.cnpjCpf) === limpo) || (pNum && f.numero_pasta === pNum)
                    );
                    const pPas = metrics.pasJuridicoLocais.filter(
                      (p) => (limpo && cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === limpo) || (pNum && p.numero_pasta === pNum)
                    );
                    const pLab = getLabRecordsForPasta(pt, amostrasLaboratorio, metrics.solicitacoesLabLocais, pProcs);
                    const sem = computePastaSemaforo({
                      pasta: pt,
                      processos: pProcs,
                      alvaras: pAlvs,
                      fiscalizacoes: pFisc,
                      lab: pLab,
                      pasList: pPas,
                    });

                    return (
                      <tr
                        key={pt.id}
                        onClick={() => onOpenDossiePasta(pt)}
                        className="hover:bg-[#f8fafc] transition-colors cursor-pointer"
                      >
                        <td className={`${rowPad} font-mono font-semibold text-[#285277] tabular-nums whitespace-nowrap`}>
                          {pNum || '—'}
                        </td>
                        <td className={`${rowPad} text-[11px] text-slate-500 whitespace-nowrap`}>
                          {pt.origem_numeracao === 'FISICA_EXISTENTE' ? 'Física preservada' : '6 dígitos'}
                        </td>
                        <td className={`${rowPad} font-mono text-slate-600 tabular-nums whitespace-nowrap`}>
                          {formatDoc(pt.cnpj_cpf || limpo)}
                        </td>
                        <td className={`${rowPad} font-medium text-slate-800 max-w-[260px] truncate`}>
                          {pt.razao_social}
                        </td>
                        <td className={`${rowPad} whitespace-nowrap font-medium`}>
                          <span
                            className={
                              sem.nivel === 'VERMELHO'
                                ? 'text-[#DC2626]'
                                : sem.nivel === 'AMARELO'
                                ? 'text-[#D97706]'
                                : 'text-[#16A34A]'
                            }
                          >
                            {sem.label}
                          </span>
                        </td>
                        <td className={`${rowPad} text-slate-600 whitespace-nowrap`}>
                          {pt.alvara_atualizado || '—'} · {pt.status_rf || 'ATIVA'}
                        </td>
                        <td className={`${rowPad} text-right whitespace-nowrap`}>
                          <span className="text-[#3b6d96] font-medium inline-flex items-center gap-1">
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Abrir 360°</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 5. FISCALIZAÇÃO
  if (activeTab === 'fiscalizacao') {
    const filtradas = fiscalizacoes.filter((f) => {
      if (statusFilter !== 'TODOS' && f.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (f.protocolo || '').toLowerCase().includes(q) ||
        (f.estabelecimento?.razaoSocial || '').toLowerCase().includes(q) ||
        (f.fiscalNome || '').toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-4 text-left">
        {renderSectionHeader(
          'Vistorias in loco e notificações com criação automática de lembrete na Agenda',
          <>
            <button
              type="button"
              onClick={() => onOpenWorkflowModal('nova_vistoria')}
              className="px-3 py-1.5 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Vistoria / Notificar</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateClassic('fiscalizacao')}
              className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>Módulo clássico</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {renderSearchBar('Filtrar por protocolo, estabelecimento ou fiscal...', [
          { id: 'TODOS', label: 'Todas' },
          { id: 'CONCLUIDA', label: 'Concluída' },
          { id: 'NOTIFICADO', label: 'Notificado' },
          { id: 'INTERDITADO', label: 'Interditado' },
          { id: 'EM_ANDAMENTO', label: 'Em andamento' },
        ])}

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f4f6f9] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3.5">Pasta</th>
                <th className="py-2.5 px-3.5">Protocolo</th>
                <th className="py-2.5 px-3.5">Estabelecimento</th>
                <th className="py-2.5 px-3.5">Tipo / Risco</th>
                <th className="py-2.5 px-3.5">Fiscal</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5 text-right">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs">
              {filtradas.slice(0, 60).map((f) => {
                const pLabel = getPastaLabelForDoc(f.estabelecimento?.cnpjCpf, f.numero_pasta);
                return (
                  <tr
                    key={f.id}
                    onClick={() => setSelectedFisc(f)}
                    className="hover:bg-[#f8fafc] transition-colors cursor-pointer"
                  >
                    <td className={`${rowPad} whitespace-nowrap`}>
                      {pLabel ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (f.estabelecimento?.cnpjCpf) {
                              onOpenDossiePorDoc(f.estabelecimento.cnpjCpf, f.estabelecimento.razaoSocial);
                            }
                          }}
                          className="px-2 py-0.5 rounded bg-[#e6eef6] text-[#285277] font-mono text-[11px] font-semibold cursor-pointer"
                        >
                          {pLabel}
                        </button>
                      ) : (
                        <span className="text-slate-400 font-mono">—</span>
                      )}
                    </td>
                    <td className={`${rowPad} font-mono text-slate-700 tabular-nums whitespace-nowrap`}>{f.protocolo}</td>
                    <td className={`${rowPad} font-medium text-slate-800`}>
                      {f.estabelecimento?.razaoSocial || f.estabelecimento?.nomeFantasia}
                    </td>
                    <td className={`${rowPad} text-slate-600`}>{f.tipoVistoria} · {f.risco}</td>
                    <td className={`${rowPad} text-slate-600`}>{f.fiscalNome}</td>
                    <td className={`${rowPad} font-medium whitespace-nowrap ${f.status === 'INTERDITADO' ? 'text-[#a13c46]' : 'text-slate-700'}`}>
                      {f.status}
                    </td>
                    <td className={`${rowPad} text-right font-mono text-slate-500 tabular-nums whitespace-nowrap`}>
                      {formatShortBrDate(f.dataHora)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {selectedFisc && (
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-800">
                Detalhe da inspeção {selectedFisc.protocolo} — {selectedFisc.estabelecimento?.razaoSocial}
              </h3>
              <button type="button" onClick={() => setSelectedFisc(null)} className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer">
                Fechar
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Medidas adotadas: {selectedFisc.medidasAdotadas || '—'} · Observações: {selectedFisc.observacoesFiscais || '—'}
              {selectedFisc.prazoAdequacaoDias ? ` · Prazo: ${selectedFisc.prazoAdequacaoDias} dia(s)` : ''}
            </p>
          </div>
        )}
      </div>
    );
  }

  // 6. TEMPORADA E EVENTOS (FEIRAS + PASTA VISA)
  if (activeTab === 'temporada') {
    const filtrados = feiras.filter((f) => {
      if (!q) return true;
      return (
        (f.nome_pf || '').toLowerCase().includes(q) ||
        (f.feira || '').toLowerCase().includes(q) ||
        (f.produtos || '').toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-4 text-left">
        {renderSectionHeader(
          'Feiras livres e ambulantes mantendo código físico do box vinculado à Pasta VISA',
          <button
            type="button"
            onClick={() => onOpenWorkflowModal('novo_feirante')}
            className="px-3 py-1.5 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Vincular Feirante à Pasta</span>
          </button>
        )}
        {renderSearchBar('Filtrar por permissionário, feira ou produto...')}

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f4f6f9] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3.5">Pasta VISA</th>
                <th className="py-2.5 px-3.5">Box / Prot</th>
                <th className="py-2.5 px-3.5">Permissionário / Razão</th>
                <th className="py-2.5 px-3.5">Feira / Evento</th>
                <th className="py-2.5 px-3.5">Produtos</th>
                <th className="py-2.5 px-3.5">Alvará</th>
                <th className="py-2.5 px-3.5 text-right">Validade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs">
              {filtrados.slice(0, 60).map((f) => {
                const doc = f.cnpj || f.cpf;
                const pLabel = getPastaLabelForDoc(doc, f.numero_pasta || f.pasta);
                return (
                  <tr
                    key={f.id}
                    onClick={() => doc && onOpenDossiePorDoc(doc, f.razao || f.nome_pf)}
                    className="hover:bg-[#f8fafc] transition-colors cursor-pointer"
                  >
                    <td className={`${rowPad} font-mono font-semibold text-[#285277]`}>{pLabel || '—'}</td>
                    <td className={`${rowPad} font-mono text-slate-600 tabular-nums`}>{f.num_prot || '—'}</td>
                    <td className={`${rowPad} font-medium text-slate-800`}>{f.razao || f.nome_pf}</td>
                    <td className={`${rowPad} text-slate-600`}>{f.feira}</td>
                    <td className={`${rowPad} text-slate-600 max-w-[200px] truncate`}>{f.produtos}</td>
                    <td className={`${rowPad} font-medium text-slate-700`}>{f.alvara || 'EM ANDAMENTO'}</td>
                    <td className={`${rowPad} text-right font-mono text-slate-500 tabular-nums`}>
                      {formatShortBrDate(f.validade)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 7. CONSULTA DE ALVARÁ & CERTIDÕES E DECLARAÇÕES
  if (activeTab === 'consulta_alvara' || activeTab === 'certidoes') {
    const cleanQ = certidaoQuery.trim().toLowerCase();
    const matchedAlvaras = metrics.alvarasLocais.filter(
      (a) =>
        !cleanQ ||
        (a.cnpj_cpf || '').toLowerCase().includes(cleanQ) ||
        (a.razao_social || '').toLowerCase().includes(cleanQ) ||
        (a.numero_pasta || a.pasta || '').toLowerCase().includes(cleanQ) ||
        (a.numero_alvara || '').toLowerCase().includes(cleanQ)
    );
    const matchedProcs = processos.filter(
      (p) =>
        p.status === 'DEFERIDO' &&
        (!cleanQ ||
          (p.cnpj_cpf || '').toLowerCase().includes(cleanQ) ||
          (p.razao_social || '').toLowerCase().includes(cleanQ) ||
          (p.numero_pasta || p.pasta || '').toLowerCase().includes(cleanQ) ||
          (p.num_processo || '').toLowerCase().includes(cleanQ))
    );

    return (
      <div className="space-y-5 text-left">
        {renderSectionHeader(
          activeTab === 'certidoes'
            ? 'Verificação de regularidade sanitária integrada à Pasta VISA'
            : 'Consulta direta de alvarás sanitários emitidos e vigentes',
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir consulta</span>
          </button>
        )}

        <div className="relative max-w-lg">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={certidaoQuery}
            onChange={(e) => setCertidaoQuery(e.target.value)}
            placeholder="Informe Pasta VISA, CNPJ, CPF, razão social ou número do alvará..."
            className="!pl-8 !py-2 !px-3 !text-xs !font-normal !rounded-md !border-slate-300 !bg-white"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
          {matchedAlvaras.length === 0 && matchedProcs.length === 0 ? (
            <p className="text-xs text-slate-500 p-6 text-center">
              Nenhum alvará ou processo deferido localizado para este filtro.
            </p>
          ) : (
            <>
              {matchedAlvaras.slice(0, 20).map((alv) => (
                <div
                  key={alv.id}
                  onClick={() => alv.cnpj_cpf && onOpenDossiePorDoc(alv.cnpj_cpf, alv.razao_social)}
                  className="p-4 flex items-center justify-between gap-4 text-xs hover:bg-[#f8fafc] cursor-pointer"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{alv.razao_social}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                      Pasta {alv.numero_pasta || alv.pasta || '—'} · Alvará {alv.numero_alvara} · CNPJ/CPF {alv.cnpj_cpf}
                    </div>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <div className="font-medium text-slate-800">{alv.status}</div>
                    <div className="text-[11px] text-slate-500">Validade: {formatShortBrDate(alv.validade)}</div>
                  </div>
                </div>
              ))}
              {matchedProcs.slice(0, 20).map((proc) => (
                <button
                  key={proc.id}
                  type="button"
                  onClick={() => onSelectProcesso(proc)}
                  className="w-full p-4 hover:bg-[#f8fafc] flex items-center justify-between gap-4 text-xs text-left cursor-pointer"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#3b6d96] shrink-0" />
                      <span className="truncate">{proc.razao_social}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                      Pasta {getPastaLabelForDoc(proc.cnpj_cpf, proc.numero_pasta || proc.pasta) || '—'} · Proc. {proc.num_processo}
                    </div>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <div className="font-medium text-emerald-700">Deferido</div>
                    <div className="text-[11px] text-slate-500">
                      Validade: {formatShortBrDate(proc.venc_licenca || proc.validade)}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    );
  }

  // 8. PROGRAMAS (Integração de Dados Laboratório + Espelho CCPU Intacto)
  if (activeTab === 'programas') {
    return (
      <div className="space-y-5 text-left">
        {renderSectionHeader(
          'Integração automática com Laboratório (telas originais preservadas) e espelho CCPU',
          <button
            type="button"
            onClick={() => onOpenSolicitarLab(null)}
            className="px-3 py-1.5 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Droplet className="w-3.5 h-3.5" />
            <span>Solicitar Coleta no Laboratório</span>
          </button>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 tabular-nums">
                Laboratório de Água ({amostrasLaboratorio.length} amostras · {metrics.solicitacoesLabLocais.length} solicitações)
              </span>
              <button
                type="button"
                onClick={() => onNavigateClassic('laboratorio')}
                className="text-[11px] font-medium text-[#3b6d96] hover:underline cursor-pointer"
              >
                Abrir Laboratório original
              </button>
            </div>
            <div className="divide-y divide-slate-200/70">
              {amostrasLaboratorio.slice(0, 10).map((am) => (
                <div
                  key={am.id}
                  onClick={() => am.cnpj_cpf && onOpenDossiePorDoc(am.cnpj_cpf, am.interessado || am.estabelecimento)}
                  className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs hover:bg-[#f8fafc] cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 truncate">
                      Amostra {am.codigo_amostra} · {am.interessado || am.local_coleta}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">
                      {am.cnpj_cpf || 'Sem CNPJ'} · {am.bairro} · {am.fiscal_coletor}
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-semibold shrink-0 ${
                      am.status === 'NÃO CONFORME' || am.status === 'NAO_CONFORME'
                        ? 'text-[#DC2626]'
                        : am.status === 'CONFORME' || am.status === 'LAUDO EMITIDO'
                        ? 'text-[#16A34A]'
                        : 'text-slate-700'
                    }`}
                  >
                    {am.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 tabular-nums">
                CCPU · Zoonoses e Pragas (Intacto · {metrics.ccpuLocais.length})
              </span>
              <button
                type="button"
                onClick={() => onNavigateClassic('ccpu')}
                className="text-[11px] font-medium text-[#3b6d96] hover:underline cursor-pointer"
              >
                Abrir CCPU original
              </button>
            </div>
            <div className="divide-y divide-slate-200/70">
              {metrics.ccpuLocais.length === 0 ? (
                <p className="text-xs text-slate-400 p-6 text-center">
                  Módulo CCPU preservado integralmente sem alterações.
                </p>
              ) : (
                metrics.ccpuLocais.slice(0, 10).map((cc) => (
                  <div key={cc.id} className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 truncate">
                        {cc.subtipoEspecie || cc.tipoPraga} · {cc.bairro}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums truncate">
                        {cc.protocolo} · {cc.temperatura}°C
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-slate-700 shrink-0">{cc.statusOcorrencia}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 9. RELATÓRIOS
  if (activeTab === 'relatorios') {
    const porSetor = new Map<string, number>();
    processos.forEach((p) => {
      const s = p.setor || 'Geral';
      porSetor.set(s, (porSetor.get(s) || 0) + 1);
    });

    return (
      <div className="space-y-5 text-left">
        {renderSectionHeader(
          'Consolidação quantitativa por setor e exportação unificada com número da Pasta VISA',
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV com Pasta VISA</span>
          </button>
        )}

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f4f6f9] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-4">Setor / Área Técnica</th>
                <th className="py-2.5 px-4 text-right">Processos vinculados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs">
              {Array.from(porSetor.entries()).map(([setor, total]) => (
                <tr key={setor} className="hover:bg-[#f8fafc]">
                  <td className="py-2.5 px-4 font-medium text-slate-800">{setor}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">{total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 10. GESTÃO DA EQUIPE, TRIAGEM DIRETORIA (PASSO 3) & CONSOLIDAÇÃO LEGADO (PASSO 9)
  if (activeTab === 'gestao') {
    const filaTriagem = processos.filter(
      (p) =>
        p.status !== 'DEFERIDO' &&
        p.status !== 'INDEFERIDO' &&
        (!p.fiscal_responsavel || p.fiscal_responsavel.toLowerCase().includes('aguardando'))
    );

    return (
      <div className="space-y-5 text-left">
        {renderSectionHeader('Triagem inteligente da Diretoria (Passo 3), carga técnica e consolidação híbrida (Passo 9)')}

        {triageFeedback && (
          <div className="px-3.5 py-2 rounded-md border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-800">
            {triageFeedback}
          </div>
        )}

        {/* Passo 3: Triagem Diretoria */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 tabular-nums">
              Fila de Triagem da Diretoria ({filaTriagem.length})
            </span>
            <span className="text-[11px] text-slate-500">
              Detecta automaticamente se a Pasta já possui demanda/notificação aberta com outro fiscal
            </span>
          </div>
          <div className="divide-y divide-slate-200">
            {filaTriagem.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">
                Nenhuma demanda aguardando distribuição no momento. Use &quot;Nova Demanda / Portal&quot; para testar a triagem.
              </p>
            ) : (
              filaTriagem.map((proc) => {
                const pendencia = verificarPendenciasAbertasNaPasta(proc, processos, fiscalizacoes);
                const pastaLabel = getPastaLabelForDoc(proc.cnpj_cpf, proc.numero_pasta || proc.pasta);
                const randomFiscal =
                  fiscaisAtivos.length > 0
                    ? fiscaisAtivos[Math.floor(Math.random() * fiscaisAtivos.length)].nome_completo
                    : 'Carlos Eduardo Silva';

                return (
                  <div key={proc.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {pastaLabel && (
                          <button
                            type="button"
                            onClick={() => onOpenDossiePorProcesso(proc)}
                            className="px-2 py-0.5 rounded bg-[#e6eef6] text-[#285277] font-mono font-semibold cursor-pointer"
                          >
                            Pasta {pastaLabel}
                          </button>
                        )}
                        <span className="font-mono font-semibold text-slate-800">{proc.num_processo}</span>
                        <span className="font-medium text-slate-800">{proc.razao_social}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">{proc.assunto} · {proc.setor || 'Geral'}</p>
                      {pendencia.possuiPendencia && (
                        <p className="text-[11.5px] font-medium text-[#D97706]">
                          Aviso inteligente: Pasta {pastaLabel || proc.cnpj_cpf} já possui {pendencia.motivo}
                          {pendencia.fiscalSugerido ? ` com ${pendencia.fiscalSugerido}` : ''}.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {pendencia.possuiPendencia && pendencia.fiscalSugerido && (
                        <button
                          type="button"
                          onClick={() => handleDistribuirDiretoria(proc, pendencia.fiscalSugerido!, 'MANTER_PASTA')}
                          className="px-3 py-1.5 rounded bg-[#3b6d96] hover:bg-[#315b7e] text-white font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Manter com {pendencia.fiscalSugerido.split(' ')[0]}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDistribuirDiretoria(proc, randomFiscal, 'SORTEIO')}
                        className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                        <span>Sortear fiscal</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Passo 9: Consolidação de Base Legada (Opção A Híbrida) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Consolidação de Base Legada (Opção A Híbrida)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Preserva 100% dos códigos de pastas físicas existentes e atribui código de 6 dígitos apenas para CPFs/CNPJs novos sem pasta.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExecutarConsolidacao}
              disabled={consolidating}
              className="px-4 py-2 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${consolidating ? 'animate-spin' : ''}`} />
              <span>{consolidating ? 'Consolidando...' : 'Executar Consolidação Híbrida'}</span>
            </button>
          </div>

          {consolidacaoRes && (
            <div className="pt-3 border-t border-slate-200 space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-2.5 bg-[#f4f6f9] rounded border border-slate-200">
                  <div className="text-base font-semibold text-slate-900 tabular-nums">{consolidacaoRes.totalPastasFinais}</div>
                  <div className="text-[11px] text-slate-500">Pastas únicas totais</div>
                </div>
                <div className="p-2.5 bg-[#f4f6f9] rounded border border-slate-200">
                  <div className="text-base font-semibold text-[#285277] tabular-nums">{consolidacaoRes.preservadasFisicas}</div>
                  <div className="text-[11px] text-slate-500">Físicas preservadas</div>
                </div>
                <div className="p-2.5 bg-[#f4f6f9] rounded border border-slate-200">
                  <div className="text-base font-semibold text-emerald-700 tabular-nums">{consolidacaoRes.geradas6Digitos}</div>
                  <div className="text-[11px] text-slate-500">Novas 6 dígitos</div>
                </div>
                <div className="p-2.5 bg-[#f4f6f9] rounded border border-slate-200">
                  <div className="text-base font-semibold text-slate-900 tabular-nums">{consolidacaoRes.processosVinculados}</div>
                  <div className="text-[11px] text-slate-500">Processos vinculados</div>
                </div>
                <div className="p-2.5 bg-[#f4f6f9] rounded border border-slate-200">
                  <div className="text-base font-semibold text-[#D97706] tabular-nums">{consolidacaoRes.registrosSemDocumento.length}</div>
                  <div className="text-[11px] text-slate-500">Sem CPF/CNPJ (saneamento)</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Carga técnica da equipe */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f4f6f9] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3.5">Profissional</th>
                <th className="py-2.5 px-3.5">Cargo</th>
                <th className="py-2.5 px-3.5">Matrícula</th>
                <th className="py-2.5 px-3.5 text-right">Processos atribuídos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs">
              {fiscaisAtivos.map((u) => {
                const count = processos.filter((p) =>
                  (p.fiscal_responsavel || '').toLowerCase().includes(u.nome_completo.toLowerCase().split(' ')[0])
                ).length;
                return (
                  <tr key={u.id} className="hover:bg-[#f8fafc]">
                    <td className={`${rowPad} font-medium text-slate-800`}>{u.nome_completo}</td>
                    <td className={`${rowPad} text-slate-600`}>{u.cargo}</td>
                    <td className={`${rowPad} font-mono text-slate-500 tabular-nums`}>{u.matricula || '—'}</td>
                    <td className={`${rowPad} text-right font-mono tabular-nums text-slate-700`}>{count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 11. CONFIGURAÇÕES E SCRIPT SQL SUPABASE
  return (
    <div className="space-y-5 text-left max-w-3xl">
      {renderSectionHeader('Preferências do painel e script SQL da Opção A Híbrida para o Supabase')}

      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200 text-xs">
        <div className="p-4 flex items-center justify-between gap-4">
          <div>
            <div className="font-medium text-slate-800">Densidade das tabelas</div>
            <div className="text-[11px] text-slate-500">Ajuste o espaçamento vertical das listas operacionais</div>
          </div>
          <div className="flex items-center gap-1 p-1 bg-[#f4f6f9] border border-slate-200 rounded-md">
            <button
              type="button"
              onClick={() => setCompactDensity(false)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer ${
                !compactDensity ? 'bg-white text-slate-900 border border-slate-200' : 'text-slate-600'
              }`}
            >
              Confortável
            </button>
            <button
              type="button"
              onClick={() => setCompactDensity(true)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer ${
                compactDensity ? 'bg-white text-slate-900 border border-slate-200' : 'text-slate-600'
              }`}
            >
              Compacto
            </button>
          </div>
        </div>

        <div className="p-4 flex items-center justify-between gap-4">
          <div>
            <div className="font-medium text-slate-800">Usuário autenticado</div>
            <div className="text-[11px] text-slate-500">
              {currentUser?.nome_completo || 'Visitante'} · {currentUser?.cargo || 'Perfil padrão'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateClassic('home')}
            className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
          >
            Retornar ao Portal Clássico
          </button>
        </div>

        <div className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="font-medium text-slate-800 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#3b6d96]" />
              <span>Script SQL Completo para o Supabase (Opção A Híbrida)</span>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(SQL_MIGRATION_SNIPPET);
                setCopiedSql(true);
                setTimeout(() => setCopiedSql(false), 2500);
              }}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedSql ? 'SQL Copiado' : 'Copiar SQL completo'}</span>
            </button>
          </div>
          <pre className="p-3 rounded bg-slate-900 text-slate-100 font-mono text-[11px] max-h-72 overflow-auto leading-relaxed">
            {SQL_MIGRATION_SNIPPET}
          </pre>
        </div>
      </div>
    </div>
  );
};
