import React, { useMemo, useState } from 'react';
import {
  ContabilidadeProfile,
  FeiranteItem,
  FiscalizacaoItem,
  PastaVisaItem,
  ProcessoItem,
  TramitacaoItem,
  UserProfile,
  EscalaItem,
  AmostraLaboratorioItem,
  PontoColetaLaboratorio,
  SolicitacaoLaudoPotabilidadeItem,
} from '../../types';
import {
  ExternalUserScope,
  SinncDashboardMetrics,
  SinncWorkspaceTabId,
  SINNC_MODULE_LABELS,
  diffDaysFromToday,
  formatShortBrDate,
} from './sinncTypes';
import { saveContabilidadeToSupabase } from '../../lib/supabaseService';
import { fetchCnpj } from '../../lib/cnpjService';
import { BAIRROS_BC } from '../../data/mockData';
import {
  ConsolidacaoRelatorio,
  cleanDoc,
  executarConsolidacaoLegadoHibrida,
  formatDoc,
  gerarProximoNumeroPasta6Digitos,
  getDisplayPastaNumero,
  isSixDigitPastaCode,
  isValidDocLength,
  loadAllPastasUnificadas,
  matchesFuzzySearch,
  savePastaVisaEnhanced,
  verificarPendenciasAbertasNaPasta,
} from '../../lib/pastaVisaService';
import { computePastaSemaforo, getLabRecordsForPasta } from '../../lib/interlaceServices';
import { SinncWorkflowModalKind } from './SinncDemoWorkflowModals';
import {
  SinncCcpuAestheticView,
  SinncConfiguracoesUsuariosView,
  SinncContadorView,
  SinncLaboratorioAestheticView,
  SinncMunicipeView,
} from './SinncExtendedViews';
import { SinncRelatoriosBiView } from './SinncRelatoriosBiView';
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
  Save,
  Search,
  Shuffle,
  UserCheck,
  Download,
  X,
} from 'lucide-react';

interface SinncModulesViewsProps {
  activeTab: Exclude<SinncWorkspaceTabId, 'painel'>;
  currentUser: UserProfile | null;
  externalScope?: ExternalUserScope;
  metrics: SinncDashboardMetrics;
  processos: ProcessoItem[];
  fiscalizacoes: FiscalizacaoItem[];
  amostrasLaboratorio: AmostraLaboratorioItem[];
  pontosColeta?: PontoColetaLaboratorio[];
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
  onOpenTermoColeta?: (amostra?: AmostraLaboratorioItem | null, solicitacao?: SolicitacaoLaudoPotabilidadeItem | null) => void;
  onOpenLaudoOficial?: (amostra?: AmostraLaboratorioItem | null, solicitacao?: SolicitacaoLaudoPotabilidadeItem | null) => void;
  onSaveUser?: (user: UserProfile) => Promise<boolean> | void;
  onDeleteUser?: (userId: string) => void;
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
  externalScope,
  metrics,
  processos,
  fiscalizacoes,
  amostrasLaboratorio,
  pontosColeta = [],
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
  onOpenTermoColeta,
  onOpenLaudoOficial,
  onSaveUser,
  onDeleteUser,
  onRefreshState,
  onNavigateClassic,
  compactDensity,
  setCompactDensity,
}) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [certidaoQuery, setCertidaoQuery] = useState('');
  const [selectedFisc, setSelectedFisc] = useState<FiscalizacaoItem | null>(null);

  // Resolver rápido de Pasta em Cadastros (abre janela de conferência/edição antes de salvar)
  const [quickDoc, setQuickDoc] = useState('');
  const [quickFisica, setQuickFisica] = useState('');
  const [resolvingPasta, setResolvingPasta] = useState(false);
  const [quickFeedback, setQuickFeedback] = useState<string | null>(null);
  const [pastaDraft, setPastaDraft] = useState<{
    isExisting: boolean;
    existingId?: string;
    limpoDoc: string;
    cnpj_cpf: string;
    numero_pasta: string;
    pasta_referencia_anterior?: string;
    origem_numeracao: 'FISICA_EXISTENTE' | 'DIGITAL_6_DIGITOS';
    razao_social: string;
    status_rf: string;
    alvara_atualizado: string;
    setor: string;
    telefone: string;
    email: string;
    endereco: string;
    bairro: string;
    cnae_principal: string;
    grau_risco: string;
    observacoes: string;
    criado_por?: string;
    criado_em?: string;
  } | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [loadingDraftRf, setLoadingDraftRf] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

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

  const handleResolverOuCriarPasta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidDocLength(quickDoc)) {
      setQuickFeedback('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.');
      return;
    }
    setResolvingPasta(true);
    setQuickFeedback(null);
    setDraftError(null);
    try {
      const limpo = cleanDoc(quickDoc);
      const formatted = formatDoc(limpo);
      const allPastas = loadAllPastasUnificadas();
      const existing =
        allPastas.find((p) => cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === limpo) ||
        metrics.pastasLocais.find((p) => cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === limpo);

      if (existing) {
        const numPasta = getDisplayPastaNumero(existing);
        setPastaDraft({
          isExisting: true,
          existingId: existing.id,
          limpoDoc: limpo,
          cnpj_cpf: existing.cnpj_cpf || formatted,
          numero_pasta: numPasta,
          pasta_referencia_anterior: existing.pasta_referencia_anterior || quickFisica.trim() || undefined,
          origem_numeracao:
            existing.origem_numeracao ||
            (isSixDigitPastaCode(numPasta) ? 'DIGITAL_6_DIGITOS' : 'FISICA_EXISTENTE'),
          razao_social: existing.razao_social || '',
          status_rf: existing.status_rf || 'ATIVA',
          alvara_atualizado: existing.alvara_atualizado || 'NÃO',
          setor: existing.setor || 'VIGILÂNCIA SANITÁRIA',
          telefone: existing.telefone || '',
          email: existing.email || '',
          endereco: existing.endereco || '',
          bairro: existing.bairro || 'Centro',
          cnae_principal: existing.cnae_principal || '',
          grau_risco: existing.grau_risco || '',
          observacoes: existing.observacoes || '',
          criado_por: existing.criado_por,
          criado_em: existing.criado_em,
        });
        return;
      }

      // Novo registro: pré-carrega dados da RFB (se CNPJ) ou de processos/feiras/cidadãos locais (se CPF)
      let razao = '';
      let statusRf = 'ATIVA';
      let endereco = '';
      let bairro = 'Centro';
      let telefone = '';
      let email = '';
      let cnae = '';
      let grauRisco = '';

      if (limpo.length === 14) {
        try {
          const rf = await fetchCnpj(limpo);
          if (rf && rf.razao) {
            razao = rf.razao;
            statusRf = rf.situacao_cadastral || rf.situacao || statusRf;
            endereco = `${rf.rua_api || ''} ${rf.num_api ? `, ${rf.num_api}` : ''}`.trim();
            bairro = rf.bairro || bairro;
            telefone = rf.telefone || '';
            email = rf.email || '';
            cnae = rf.cnaes?.[0] || rf.cnae || '';
            grauRisco = rf.risco ? `${rf.risco} RISCO` : '';
          }
        } catch {
          // Usuário poderá preencher manualmente no modal
        }
      } else {
        // Para CPF, tenta aproveitar nome/contato caso já exista em processos, feirantes ou cidadãos
        const procHint = processos.find((p) => cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === limpo);
        const feiraHint = feiras.find((f) => cleanDoc(f.cpf_cnpj_limpo || f.cpf || f.cnpj) === limpo);
        let cidHint: { nome_completo?: string; telefone?: string; email?: string; endereco?: string; bairro?: string } | undefined;
        try {
          const rawCid = localStorage.getItem('visa_cidadaos');
          if (rawCid) {
            const cids = JSON.parse(rawCid);
            if (Array.isArray(cids)) {
              cidHint = cids.find((c: any) => cleanDoc(c.cpf) === limpo);
            }
          }
        } catch {
          // ignore
        }
        razao = cidHint?.nome_completo || procHint?.razao_social || feiraHint?.nome_pf || '';
        telefone = cidHint?.telefone || procHint?.telefone || '';
        email = cidHint?.email || procHint?.email || '';
        endereco = cidHint?.endereco || procHint?.endereco || (feiraHint?.rua ? `${feiraHint.rua} ${feiraHint.num || ''}`.trim() : '');
        bairro = cidHint?.bairro || procHint?.bairro || feiraHint?.bairro || 'Centro';
      }

      const fisicaInformada = quickFisica.trim();
      const numeroPasta = fisicaInformada || (await gerarProximoNumeroPasta6Digitos(allPastas));
      const origem: 'FISICA_EXISTENTE' | 'DIGITAL_6_DIGITOS' =
        fisicaInformada && !isSixDigitPastaCode(fisicaInformada)
          ? 'FISICA_EXISTENTE'
          : 'DIGITAL_6_DIGITOS';

      setPastaDraft({
        isExisting: false,
        limpoDoc: limpo,
        cnpj_cpf: formatted,
        numero_pasta: numeroPasta,
        pasta_referencia_anterior: origem === 'FISICA_EXISTENTE' ? numeroPasta : undefined,
        origem_numeracao: origem,
        razao_social: razao,
        status_rf: statusRf,
        alvara_atualizado: 'NÃO',
        setor: 'VIGILÂNCIA SANITÁRIA',
        telefone,
        email,
        endereco,
        bairro,
        cnae_principal: cnae,
        grau_risco: grauRisco,
        observacoes: '',
      });
    } finally {
      setResolvingPasta(false);
    }
  };

  const handleConsultarRfbNoModal = async () => {
    if (!pastaDraft || pastaDraft.limpoDoc.length !== 14) return;
    setLoadingDraftRf(true);
    setDraftError(null);
    try {
      const rf = await fetchCnpj(pastaDraft.limpoDoc);
      if (rf && rf.razao) {
        setPastaDraft((prev) =>
          prev
            ? {
                ...prev,
                razao_social: rf.razao || prev.razao_social,
                status_rf: rf.situacao_cadastral || rf.situacao || prev.status_rf,
                endereco: `${rf.rua_api || ''} ${rf.num_api ? `, ${rf.num_api}` : ''}`.trim() || prev.endereco,
                bairro: rf.bairro || prev.bairro,
                telefone: rf.telefone || prev.telefone,
                email: rf.email || prev.email,
                cnae_principal: rf.cnaes?.[0] || rf.cnae || prev.cnae_principal,
                grau_risco: rf.risco ? `${rf.risco} RISCO` : prev.grau_risco,
              }
            : prev
        );
      } else {
        setDraftError('Não foi possível obter os dados na Receita Federal para este CNPJ. Preencha manualmente.');
      }
    } catch {
      setDraftError('Erro ao consultar a Receita Federal. Você pode preencher ou editar os campos manualmente.');
    } finally {
      setLoadingDraftRf(false);
    }
  };

  const handleSalvarPastaDraft = async (abrirDossieDepois: boolean) => {
    if (!pastaDraft) return;
    const nomeLimpo = pastaDraft.razao_social.trim();
    if (!nomeLimpo) {
      setDraftError(
        pastaDraft.limpoDoc.length === 11
          ? 'Informe o Nome Completo do contribuinte (CPF) antes de salvar.'
          : 'Informe a Razão Social / Nome do estabelecimento antes de salvar.'
      );
      return;
    }

    setSavingDraft(true);
    setDraftError(null);
    try {
      const numFinal = pastaDraft.numero_pasta.trim() || (await gerarProximoNumeroPasta6Digitos());
      const origemFinal: 'FISICA_EXISTENTE' | 'DIGITAL_6_DIGITOS' = pastaDraft.isExisting
        ? pastaDraft.origem_numeracao
        : isSixDigitPastaCode(numFinal)
        ? 'DIGITAL_6_DIGITOS'
        : 'FISICA_EXISTENTE';

      const nowIso = new Date().toISOString();
      const pastaSalvar: PastaVisaItem = {
        id:
          pastaDraft.existingId ||
          `pasta-${pastaDraft.limpoDoc || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        cnpj_cpf: pastaDraft.cnpj_cpf,
        cpf_cnpj_limpo: pastaDraft.limpoDoc,
        pasta: numFinal,
        numero_pasta: numFinal,
        pasta_referencia_anterior:
          pastaDraft.pasta_referencia_anterior ||
          (origemFinal === 'FISICA_EXISTENTE' ? numFinal : undefined),
        origem_numeracao: origemFinal,
        razao_social: nomeLimpo,
        status_rf: pastaDraft.status_rf || 'ATIVA',
        alvara_atualizado: pastaDraft.alvara_atualizado || 'NÃO',
        setor: pastaDraft.setor || 'VIGILÂNCIA SANITÁRIA',
        telefone: pastaDraft.telefone.trim(),
        email: pastaDraft.email.trim(),
        endereco: pastaDraft.endereco.trim(),
        bairro: pastaDraft.bairro.trim(),
        cnae_principal: pastaDraft.cnae_principal.trim(),
        grau_risco: pastaDraft.grau_risco.trim(),
        observacoes: pastaDraft.observacoes.trim(),
        criado_por: pastaDraft.criado_por || currentUser?.nome_completo || 'Cadastro VISA',
        criado_em: pastaDraft.criado_em || nowIso,
        atualizado_em: nowIso,
      };

      await savePastaVisaEnhanced(pastaSalvar);

      if (externalScope?.mode === 'CONTABILIDADE' && externalScope.contabilidade) {
        const curLinks = externalScope.contabilidade.cnpjs_vinculados || [];
        if (!curLinks.some((d) => cleanDoc(d) === pastaDraft.limpoDoc)) {
          try {
            const raw = localStorage.getItem('visa_contabilidades_lab');
            const list: ContabilidadeProfile[] = raw ? JSON.parse(raw) : [];
            const updatedContab: ContabilidadeProfile = {
              ...externalScope.contabilidade,
              cnpjs_vinculados: [pastaDraft.cnpj_cpf, ...curLinks],
            };
            const nextList = list.some((c) => c.id === updatedContab.id)
              ? list.map((c) => (c.id === updatedContab.id ? updatedContab : c))
              : [updatedContab, ...list];
            localStorage.setItem('visa_contabilidades_lab', JSON.stringify(nextList));
            await saveContabilidadeToSupabase(updatedContab);
            window.dispatchEvent(new Event('visa_contabilidades_updated'));
          } catch {
            // ignore storage errors
          }
        }
      }

      onRefreshState();
      setQuickDoc('');
      setQuickFisica('');
      setQuickFeedback(
        pastaDraft.isExisting
          ? `Pasta ${numFinal} (${nomeLimpo}) atualizada com sucesso.`
          : `Pasta ${numFinal} (${nomeLimpo}) criada e salva (${origemFinal === 'FISICA_EXISTENTE' ? 'Física preservada' : '6 dígitos automática'}).`
      );
      setPastaDraft(null);
      if (abrirDossieDepois) {
        onOpenDossiePasta(pastaSalvar);
      }
    } finally {
      setSavingDraft(false);
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

  const renderSectionHeader = (subtitle: string, rightAction?: React.ReactNode, customTitle?: string) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
      <div>
        <h1 className="text-[17px] font-semibold text-slate-800 tracking-tight">
          {customTitle || SINNC_MODULE_LABELS[activeTab]}
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
      return matchesFuzzySearch(query, [
        p.num_processo,
        p.prot_1doc,
        p.razao_social,
        p.nome_fantasia,
        p.cnpj_cpf,
        pastaCode,
        p.assunto,
        p.setor,
        p.bairro,
        p.fiscal_responsavel,
      ]);
    });

    const subtitleMap: Record<string, string> = externalScope?.isExternal
      ? {
          tarefas: 'Pendências sob sua responsabilidade vinculadas à sua conta',
          processos:
            externalScope.mode === 'CONTABILIDADE'
              ? 'Processos sanitários e protocolos das empresas vinculadas à sua carteira'
              : 'Seus processos sanitários, protocolos e andamentos na Vigilância Sanitária',
          licenciamento:
            externalScope.mode === 'CONTABILIDADE'
              ? 'Pedidos de alvará inicial, renovação e Habite-se das empresas da carteira'
              : 'Seus pedidos de alvará inicial, renovação e Habite-se sanitário (LC 40/2019)',
          atendimento: 'Suas solicitações e retornos enviados pelo portal',
        }
      : {
          tarefas: 'Pendências sob responsabilidade técnica vinculadas à Pasta VISA',
          processos: 'Processos sanitários, pareceres e PAS jurídicos entrelaçados pela Pasta',
          licenciamento: 'Pedidos de alvará inicial, renovação e Habite-se sanitário (LC 40/2019)',
          atendimento: 'Entradas do Portal do Cidadão, Portal do Contador, Denúncias e Cumprimentos',
        };

    const customProcTitle = externalScope?.isExternal
      ? activeTab === 'processos'
        ? externalScope.mode === 'CONTABILIDADE'
          ? 'Processos da Carteira'
          : 'Meus Processos'
        : activeTab === 'licenciamento'
        ? externalScope.mode === 'CONTABILIDADE'
          ? 'Alvarás & Licenciamentos da Carteira'
          : 'Meus Alvarás & Licenciamentos'
        : undefined
      : undefined;

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
              <span>{externalScope?.isExternal ? 'Nova Solicitação' : 'Nova Demanda / Portal'}</span>
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
          </>,
          customProcTitle
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
      if (!query.trim()) return true;
      return matchesFuzzySearch(query, [
        getDisplayPastaNumero(pt),
        pt.pasta,
        pt.pasta_referencia_anterior,
        pt.razao_social,
        pt.cnpj_cpf,
        pt.cpf_cnpj_limpo,
        pt.setor,
        pt.bairro,
        pt.endereco,
        pt.cnae_principal,
        pt.email,
        pt.telefone,
        pt.alvara_atualizado,
        pt.observacoes,
      ]);
    });

    return (
      <div className="space-y-4 text-left">
        {renderSectionHeader(
          externalScope?.isExternal
            ? `Pastas VISA vinculadas à sua conta (${metrics.pastasLocais.length})`
            : `Pastas VISA cadastradas (${metrics.pastasLocais.length}) — 1 CPF/CNPJ = 1 Pasta (Opção A Híbrida)`,
          undefined,
          externalScope?.isExternal
            ? externalScope.mode === 'CONTABILIDADE'
              ? 'Pastas da Carteira'
              : 'Minha Pasta VISA'
            : undefined
        )}

        {/* Resolvedor instantâneo Opção A Híbrida (interno ou vínculo de novo cliente pela Contabilidade) */}
        {(!externalScope?.isExternal || externalScope.mode === 'CONTABILIDADE') && (
          <form onSubmit={handleResolverOuCriarPasta} className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5">
            <div className="flex flex-col lg:flex-row lg:items-end gap-3">
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {externalScope?.mode === 'CONTABILIDADE'
                    ? 'Vincular novo cliente à sua carteira e abrir/gerar Pasta VISA'
                    : 'Localizar ou Gerar Pasta VISA por CPF ou CNPJ'}
                </label>
                <input
                  type="text"
                  value={quickDoc}
                  onChange={(e) => setQuickDoc(e.target.value)}
                  placeholder="Digite CPF (11 dígitos) ou CNPJ (14 dígitos)"
                  className="w-full !text-xs !py-2 !px-3 font-mono"
                />
              </div>
              {!externalScope?.isExternal && (
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
              )}
              <button
                type="submit"
                disabled={resolvingPasta}
                className="px-4 py-2 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium cursor-pointer whitespace-nowrap shrink-0"
              >
                {resolvingPasta
                  ? 'Carregando dados...'
                  : externalScope?.mode === 'CONTABILIDADE'
                  ? 'Vincular Cliente & Abrir Pasta'
                  : 'Abrir / Criar Pasta VISA'}
              </button>
            </div>
            {quickFeedback && (
              <p className="text-xs font-medium text-[#285277]">{quickFeedback}</p>
            )}
          </form>
        )}

        {renderSearchBar('Busca vaga: número da Pasta, nome/razão social, CPF/CNPJ, bairro ou setor (ignora pontos e acentos)...')}

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
                      {externalScope?.isExternal ? (
                        <div className="space-y-2">
                          <p>Nenhuma Pasta VISA vinculada ao seu documento foi localizada até o momento.</p>
                          {externalScope.primaryDoc && externalScope.mode !== 'CONTABILIDADE' && (
                            <button
                              type="button"
                              onClick={() => onOpenDossiePorDoc(externalScope.primaryDoc!, currentUser?.nome_completo)}
                              className="px-3 py-1.5 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium cursor-pointer"
                            >
                              Gerar / Abrir Minha Pasta VISA
                            </button>
                          )}
                        </div>
                      ) : (
                        'Nenhuma Pasta encontrada. Digite um CPF/CNPJ acima ou execute a Consolidação em Gestão.'
                      )}
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

        {/* Modal de Conferência e Edição antes de Salvar a Pasta VISA */}
        {pastaDraft && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[1px] flex items-center justify-center p-4 text-left"
            onClick={() => !savingDraft && setPastaDraft(null)}
          >
            <div
              className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-3.5 bg-[#f8fafc] border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {pastaDraft.isExisting
                        ? 'Visualizar e Editar Pasta VISA Existente'
                        : 'Conferir e Completar Dados da Nova Pasta VISA'}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        pastaDraft.isExisting
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-[#e6eef6] text-[#285277] border border-[#cfe0ee]'
                      }`}
                    >
                      {pastaDraft.isExisting ? 'Pasta Existente' : 'Novo Cadastro'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-medium">
                      {pastaDraft.limpoDoc.length === 11 ? 'CPF · Pessoa Física' : 'CNPJ · Pessoa Jurídica'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Confira, adicione ou edite as informações antes de gravar a Pasta VISA.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={savingDraft}
                  onClick={() => setPastaDraft(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
                  title="Fechar janela"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3.5 overflow-y-auto text-xs">
                {draftError && (
                  <div className="px-3 py-2 rounded-md border border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium">
                    {draftError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      {pastaDraft.limpoDoc.length === 11 ? 'CPF' : 'CNPJ'}
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={pastaDraft.cnpj_cpf}
                      className="w-full !text-xs !py-2 !px-2.5 font-mono bg-slate-100 text-slate-700"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Nº Pasta VISA {pastaDraft.isExisting ? '(preservado)' : '(6 dígitos ou física)'}
                    </label>
                    <input
                      type="text"
                      readOnly={pastaDraft.isExisting}
                      value={pastaDraft.numero_pasta}
                      onChange={(e) =>
                        setPastaDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                numero_pasta: e.target.value,
                                origem_numeracao: isSixDigitPastaCode(e.target.value.trim())
                                  ? 'DIGITAL_6_DIGITOS'
                                  : 'FISICA_EXISTENTE',
                              }
                            : prev
                        )
                      }
                      className={`w-full !text-xs !py-2 !px-2.5 font-mono font-semibold text-[#285277] ${
                        pastaDraft.isExisting ? 'bg-slate-100' : ''
                      }`}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Origem</label>
                    <input
                      type="text"
                      readOnly
                      value={pastaDraft.origem_numeracao === 'FISICA_EXISTENTE' ? 'Física' : 'Digital 6 díg.'}
                      className="w-full !text-xs !py-2 !px-2.5 bg-slate-100 text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium text-slate-700">
                      {pastaDraft.limpoDoc.length === 11
                        ? 'Nome Completo (Pessoa Física / CPF) *'
                        : 'Razão Social / Nome do Estabelecimento *'}
                    </label>
                    {pastaDraft.limpoDoc.length === 14 && (
                      <button
                        type="button"
                        onClick={handleConsultarRfbNoModal}
                        disabled={loadingDraftRf}
                        className="text-[11px] font-medium text-[#3b6d96] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${loadingDraftRf ? 'animate-spin' : ''}`} />
                        <span>{loadingDraftRf ? 'Consultando RFB...' : 'Atualizar da Receita Federal'}</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    autoFocus={!pastaDraft.razao_social}
                    value={pastaDraft.razao_social}
                    onChange={(e) =>
                      setPastaDraft((prev) => (prev ? { ...prev, razao_social: e.target.value } : prev))
                    }
                    placeholder={
                      pastaDraft.limpoDoc.length === 11
                        ? 'Digite o nome completo da pessoa física...'
                        : 'Digite a razão social ou nome empresarial...'
                    }
                    className="w-full !text-xs !py-2 !px-2.5"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Setor Sanitário</label>
                    <select
                      value={pastaDraft.setor}
                      onChange={(e) =>
                        setPastaDraft((prev) => (prev ? { ...prev, setor: e.target.value } : prev))
                      }
                      className="w-full !text-xs !py-2 !px-2"
                    >
                      <option value="VIGILÂNCIA SANITÁRIA">VIGILÂNCIA SANITÁRIA</option>
                      <option value="ALIMENTOS">ALIMENTOS</option>
                      <option value="SAÚDE">SAÚDE</option>
                      <option value="FARMÁCIAS & MEDICAMENTOS">FARMÁCIAS & MEDICAMENTOS</option>
                      <option value="SANEAMENTO & AMBIENTAL">SANEAMENTO & AMBIENTAL</option>
                      <option value="EVENTOS & FEIRAS">EVENTOS & FEIRAS</option>
                      <option value="HABITE-SE SANITÁRIO">HABITE-SE SANITÁRIO</option>
                      <option value="GERAL">GERAL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Situação Cadastral / RF</label>
                    <select
                      value={pastaDraft.status_rf}
                      onChange={(e) =>
                        setPastaDraft((prev) => (prev ? { ...prev, status_rf: e.target.value } : prev))
                      }
                      className="w-full !text-xs !py-2 !px-2"
                    >
                      <option value="ATIVA">ATIVA</option>
                      <option value="REGULAR">REGULAR</option>
                      <option value="EM ANÁLISE">EM ANÁLISE</option>
                      <option value="SUSPENSA">SUSPENSA</option>
                      <option value="BAIXADA">BAIXADA</option>
                      <option value="INAPTA">INAPTA</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Alvará Sanitário</label>
                    <select
                      value={pastaDraft.alvara_atualizado}
                      onChange={(e) =>
                        setPastaDraft((prev) => (prev ? { ...prev, alvara_atualizado: e.target.value } : prev))
                      }
                      className="w-full !text-xs !py-2 !px-2"
                    >
                      <option value="NÃO">NÃO</option>
                      <option value="SIM">SIM (Vigente)</option>
                      <option value="EM ANÁLISE">EM ANÁLISE</option>
                      <option value="EM RENOVAÇÃO">EM RENOVAÇÃO</option>
                      <option value="VENCIDO">VENCIDO</option>
                      <option value="ISENTO">ISENTO</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={pastaDraft.telefone}
                      onChange={(e) =>
                        setPastaDraft((prev) => (prev ? { ...prev, telefone: e.target.value } : prev))
                      }
                      placeholder="(47) 99999-9999"
                      className="w-full !text-xs !py-2 !px-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={pastaDraft.email}
                      onChange={(e) =>
                        setPastaDraft((prev) => (prev ? { ...prev, email: e.target.value } : prev))
                      }
                      placeholder="contato@empresa.com.br"
                      className="w-full !text-xs !py-2 !px-2.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-7">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Endereço Completo</label>
                    <input
                      type="text"
                      value={pastaDraft.endereco}
                      onChange={(e) =>
                        setPastaDraft((prev) => (prev ? { ...prev, endereco: e.target.value } : prev))
                      }
                      placeholder="Rua / Avenida, número, sala..."
                      className="w-full !text-xs !py-2 !px-2.5"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Bairro</label>
                    <select
                      value={pastaDraft.bairro}
                      onChange={(e) =>
                        setPastaDraft((prev) => (prev ? { ...prev, bairro: e.target.value } : prev))
                      }
                      className="w-full !text-xs !py-2 !px-2"
                    >
                      {pastaDraft.bairro && !BAIRROS_BC.includes(pastaDraft.bairro) && (
                        <option value={pastaDraft.bairro}>{pastaDraft.bairro}</option>
                      )}
                      {BAIRROS_BC.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-8">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">CNAE / Atividade Principal</label>
                    <input
                      type="text"
                      value={pastaDraft.cnae_principal}
                      onChange={(e) =>
                        setPastaDraft((prev) => (prev ? { ...prev, cnae_principal: e.target.value } : prev))
                      }
                      placeholder="Ex: 5611-2/01 - Restaurantes e similares"
                      className="w-full !text-xs !py-2 !px-2.5"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Grau de Risco</label>
                    <select
                      value={pastaDraft.grau_risco}
                      onChange={(e) =>
                        setPastaDraft((prev) => (prev ? { ...prev, grau_risco: e.target.value } : prev))
                      }
                      className="w-full !text-xs !py-2 !px-2"
                    >
                      <option value="">Não definido</option>
                      <option value="BAIXO RISCO">BAIXO RISCO</option>
                      <option value="MÉDIO RISCO">MÉDIO RISCO</option>
                      <option value="ALTO RISCO">ALTO RISCO</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Observações da Pasta</label>
                  <textarea
                    rows={2}
                    value={pastaDraft.observacoes}
                    onChange={(e) =>
                      setPastaDraft((prev) => (prev ? { ...prev, observacoes: e.target.value } : prev))
                    }
                    placeholder="Anotações cadastrais, histórico físico ou informações complementares..."
                    className="w-full !text-xs !p-2.5"
                  />
                </div>
              </div>

              <div className="px-5 py-3 bg-[#f8fafc] border-t border-slate-200 flex flex-wrap items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  disabled={savingDraft}
                  onClick={() => setPastaDraft(null)}
                  className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={savingDraft}
                  onClick={() => handleSalvarPastaDraft(false)}
                  className="px-3.5 py-1.5 rounded-md border border-[#3b6d96] bg-white hover:bg-[#f4f8fc] text-[#285277] text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingDraft ? 'Salvando...' : 'Salvar Pasta'}</span>
                </button>
                <button
                  type="button"
                  disabled={savingDraft}
                  onClick={() => handleSalvarPastaDraft(true)}
                  className="px-4 py-1.5 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>{savingDraft ? 'Salvando...' : 'Salvar e Abrir Dossiê 360°'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 5. FISCALIZAÇÃO
  if (activeTab === 'fiscalizacao') {
    const filtradas = fiscalizacoes.filter((f) => {
      if (statusFilter !== 'TODOS' && f.status !== statusFilter) return false;
      if (!query.trim()) return true;
      return matchesFuzzySearch(query, [
        f.protocolo,
        f.numero_pasta,
        f.estabelecimento?.razaoSocial,
        f.estabelecimento?.nomeFantasia,
        f.estabelecimento?.cnpjCpf,
        f.estabelecimento?.bairro,
        f.fiscalNome,
        f.tipoVistoria,
      ]);
    });

    return (
      <div className="space-y-4 text-left">
        {renderSectionHeader(
          externalScope?.isExternal
            ? 'Vistorias e notificações sanitárias vinculadas à sua conta'
            : 'Vistorias in loco e notificações com criação automática de lembrete na Agenda',
          !externalScope?.isExternal ? (
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
          ) : undefined
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
      if (!query.trim()) return true;
      return matchesFuzzySearch(query, [
        f.nome_pf,
        f.razao,
        f.feira,
        f.produtos,
        f.cpf,
        f.cnpj,
        f.num_prot,
        f.numero_pasta,
        f.pasta,
      ]);
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
    const matchedAlvaras = metrics.alvarasLocais.filter(
      (a) =>
        !certidaoQuery.trim() ||
        matchesFuzzySearch(certidaoQuery, [
          a.cnpj_cpf,
          a.razao_social,
          a.numero_pasta,
          a.pasta,
          a.numero_alvara,
          a.bairro,
          a.status,
        ])
    );
    const matchedProcs = processos.filter(
      (p) =>
        p.status === 'DEFERIDO' &&
        (!certidaoQuery.trim() ||
          matchesFuzzySearch(certidaoQuery, [
            p.cnpj_cpf,
            p.razao_social,
            p.nome_fantasia,
            p.numero_pasta,
            p.pasta,
            p.num_processo,
            p.assunto,
          ]))
    );

    const consultaCustomTitle = externalScope?.isExternal
      ? activeTab === 'certidoes'
        ? 'Minhas Certidões e Regularidade'
        : externalScope.mode === 'CONTABILIDADE'
        ? 'Alvarás da Carteira'
        : 'Meus Alvarás Sanitários'
      : undefined;

    return (
      <div className="space-y-5 text-left">
        {renderSectionHeader(
          externalScope?.isExternal
            ? activeTab === 'certidoes'
              ? 'Verificação de regularidade sanitária dos registros vinculados à sua conta'
              : 'Consulta direta dos alvarás sanitários emitidos para sua conta'
            : activeTab === 'certidoes'
            ? 'Verificação de regularidade sanitária integrada à Pasta VISA'
            : 'Consulta direta de alvarás sanitários emitidos e vigentes',
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir consulta</span>
          </button>,
          consultaCustomTitle
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

  // 9. RELATÓRIOS & BI EXECUTIVO
  if (activeTab === 'relatorios') {
    return (
      <SinncRelatoriosBiView
        currentUser={currentUser}
        externalScope={externalScope}
        metrics={metrics}
        processos={processos}
        fiscalizacoes={fiscalizacoes}
        amostrasLaboratorio={amostrasLaboratorio}
        pontosColeta={pontosColeta}
        users={users}
        onSelectProcesso={onSelectProcesso}
        onOpenDossiePorProcesso={onOpenDossiePorProcesso}
        onOpenLaudoOficial={onOpenLaudoOficial}
        compactDensity={compactDensity}
      />
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

  // 10B. TELAS DEDICADAS: MUNÍCIPE, CONTADOR, LABORATÓRIO E CCPU (ESTÉTICA CAPA TESTE)
  if (activeTab === 'municipe') {
    return (
      <SinncMunicipeView
        currentUser={currentUser}
        externalScope={externalScope}
        metrics={metrics}
        processos={processos}
        onSelectProcesso={onSelectProcesso}
        onSaveProcesso={onSaveProcesso}
        onOpenDossiePorDoc={onOpenDossiePorDoc}
        onOpenWorkflowModal={onOpenWorkflowModal}
        onOpenSolicitarLab={onOpenSolicitarLab}
        onRefreshState={onRefreshState}
        onNavigateClassic={onNavigateClassic}
        compactDensity={compactDensity}
      />
    );
  }

  if (activeTab === 'contador') {
    return (
      <SinncContadorView
        currentUser={currentUser}
        externalScope={externalScope}
        metrics={metrics}
        processos={processos}
        onSelectProcesso={onSelectProcesso}
        onOpenDossiePorDoc={onOpenDossiePorDoc}
        onOpenWorkflowModal={onOpenWorkflowModal}
        onRefreshState={onRefreshState}
        onNavigateClassic={onNavigateClassic}
        compactDensity={compactDensity}
      />
    );
  }

  if (activeTab === 'laboratorio') {
    return (
      <SinncLaboratorioAestheticView
        metrics={metrics}
        amostrasLaboratorio={amostrasLaboratorio}
        pontosColeta={pontosColeta}
        isExternal={Boolean(externalScope?.isExternal)}
        onOpenDossiePorDoc={onOpenDossiePorDoc}
        onOpenSolicitarLab={onOpenSolicitarLab}
        onOpenTermoColeta={onOpenTermoColeta}
        onOpenLaudoOficial={onOpenLaudoOficial}
        onNavigateClassic={onNavigateClassic}
        compactDensity={compactDensity}
      />
    );
  }

  if (activeTab === 'ccpu') {
    return (
      <SinncCcpuAestheticView
        currentUser={currentUser}
        onRefreshState={onRefreshState}
        onNavigateClassic={onNavigateClassic}
        compactDensity={compactDensity}
      />
    );
  }

  // 11. CONFIGURAÇÕES, CADASTRO DE USUÁRIOS & SCRIPT SQL SUPABASE
  return (
    <SinncConfiguracoesUsuariosView
      currentUser={currentUser}
      users={users}
      onSaveUser={onSaveUser}
      onDeleteUser={onDeleteUser}
      onOpenDossiePorDoc={onOpenDossiePorDoc}
      onNavigateClassic={onNavigateClassic}
      compactDensity={compactDensity}
      setCompactDensity={setCompactDensity}
      sqlMigrationSnippet={SQL_MIGRATION_SNIPPET}
    />
  );
};
