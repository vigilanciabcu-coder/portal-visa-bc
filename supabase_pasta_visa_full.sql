-- ============================================================================
-- MIGRAÇÃO COMPLETA: ENTRELAÇAMENTO TOTAL PELA PASTA VISA (OPÇÃO A - HÍBRIDA)
-- Vigilância Sanitária de Balneário Camboriú (DVIS / PMBC)
-- ============================================================================
-- Regra Híbrida (Opção A):
--   1. Pastas físicas existentes preservam o código original (ex: 1042/2024).
--   2. Novos CPFs/CNPJs sem pasta física recebem número sequencial de 6 dígitos
--      (ex: 000001, 000002...), único por cpf_cnpj_limpo.
--   3. Módulos CCPU e Telas do Laboratório permanecem intactos; apenas os dados
--      de solicitação/coleta/laudo passam a referenciar numero_pasta e cpf_cnpj_limpo.
--   4. Script 100% seguro/idempotente: cria tabelas faltantes (alvaras_sanitarios,
--      pastas_visa, habite_se_registros, pas_juridico) e protege alterações
--      em tabelas opcionais para evitar erros 42P01.
--
-- Como executar no Supabase:
--   Acesse Dashboard > SQL Editor > + New Query > Cole este script > RUN.
-- ============================================================================

-- 1. EVOLUÇÃO DA TABELA PASTAS_VISA (IDENTIDADE ÚNICA POR CPF/CNPJ)
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

-- Preenche cpf_cnpj_limpo e numero_pasta para registros legados (preservando código físico!)
UPDATE public.pastas_visa
SET
  cpf_cnpj_limpo = COALESCE(NULLIF(cpf_cnpj_limpo, ''), regexp_replace(COALESCE(cnpj_cpf, ''), '\D', '', 'g')),
  numero_pasta   = COALESCE(NULLIF(numero_pasta, ''), NULLIF(pasta, '')),
  pasta_referencia_anterior = COALESCE(pasta_referencia_anterior, pasta),
  origem_numeracao = CASE
    WHEN COALESCE(origem_numeracao, '') <> '' THEN origem_numeracao
    WHEN COALESCE(pasta, '') ~ '^\d{6}$' THEN 'DIGITAL_6_DIGITOS'
    ELSE 'FISICA_EXISTENTE'
  END
WHERE cpf_cnpj_limpo IS NULL OR numero_pasta IS NULL;

-- Índice único por CPF/CNPJ limpo (quando válido com 11 ou 14 dígitos)
CREATE UNIQUE INDEX IF NOT EXISTS uq_pastas_visa_cpf_cnpj_limpo
  ON public.pastas_visa (cpf_cnpj_limpo)
  WHERE cpf_cnpj_limpo IS NOT NULL AND length(cpf_cnpj_limpo) IN (11, 14);

CREATE INDEX IF NOT EXISTS idx_pastas_visa_numero_pasta ON public.pastas_visa(numero_pasta);

ALTER TABLE public.pastas_visa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir Acesso Anonimo Pastas Visa" ON public.pastas_visa;
CREATE POLICY "Permitir Acesso Anonimo Pastas Visa"
  ON public.pastas_visa FOR ALL USING (true) WITH CHECK (true);

-- 2. SEQUÊNCIA E FUNÇÃO ATÔMICA PARA GERAR PRÓXIMA PASTA DE 6 DÍGITOS
CREATE SEQUENCE IF NOT EXISTS public.seq_pasta_visa_6d START 1 INCREMENT 1;

CREATE OR REPLACE FUNCTION public.gerar_proximo_numero_pasta_6d()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_num BIGINT;
  v_codigo TEXT;
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

-- 3. TABELA ALVARAS_SANITARIOS (CRIA SE NÃO EXISTIR E ADICIONA VÍNCULO DA PASTA)
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

-- 4. COLUNAS DE ENTRELAÇAMENTO EM TABELAS EXISTENTES (EXECUÇÃO CONDICIONAL SEGURA)
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

-- 5. TABELA HABITE-SE SANITÁRIO VINCULADA À PASTA VISA
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

-- 6. TABELA PAS JURÍDICO VINCULADA À PASTA VISA
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
  ON public.pas_juridico FOR ALL USING (true) WITH CHECK (true);
