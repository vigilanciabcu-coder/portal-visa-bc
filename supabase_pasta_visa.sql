-- ====================================================================
-- SCRIPT DE INSTALAÇÃO DO MÓDULO PASTA VISA NO SUPABASE POSTGRESQL
-- Vigilância Sanitária de Balneário Camboriú (DVIS / PMBC)
-- ====================================================================
-- Como usar:
-- 1. Acesse o seu painel do Supabase: https://supabase.com/dashboard
-- 2. Selecione o seu projeto e vá em "SQL Editor" no menu lateral esquerdo.
-- 3. Clique em "+ New Query" (Nova Consulta).
-- 4. Copie todo o conteúdo deste arquivo, cole no editor e clique em "RUN".
-- ====================================================================

-- 1. CRIAR A TABELA DE PASTAS FÍSICAS E ARQUIVOS VISA
CREATE TABLE IF NOT EXISTS public.pastas_visa (
    id TEXT PRIMARY KEY,
    cnpj_cpf TEXT NOT NULL,
    pasta TEXT,
    razao_social TEXT,
    status_rf TEXT DEFAULT 'ATIVA',
    alvara_atualizado TEXT DEFAULT 'SIM',
    setor TEXT DEFAULT 'VIGILÂNCIA SANITÁRIA',
    observacoes TEXT,
    criado_por TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. MIGRAÇÕES SEGURAS (CASO A TABELA JÁ EXISTA COM MENOS COLUNAS)
ALTER TABLE public.pastas_visa ADD COLUMN IF NOT EXISTS pasta TEXT;
ALTER TABLE public.pastas_visa ADD COLUMN IF NOT EXISTS razao_social TEXT;
ALTER TABLE public.pastas_visa ADD COLUMN IF NOT EXISTS status_rf TEXT DEFAULT 'ATIVA';
ALTER TABLE public.pastas_visa ADD COLUMN IF NOT EXISTS alvara_atualizado TEXT DEFAULT 'SIM';
ALTER TABLE public.pastas_visa ADD COLUMN IF NOT EXISTS setor TEXT DEFAULT 'VIGILÂNCIA SANITÁRIA';
ALTER TABLE public.pastas_visa ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE public.pastas_visa ADD COLUMN IF NOT EXISTS criado_por TEXT;
ALTER TABLE public.pastas_visa ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.pastas_visa ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. ÍNDICES DE PERFORMANCE PARA PESQUISA RÁPIDA
CREATE INDEX IF NOT EXISTS idx_pastas_visa_cnpj_cpf ON public.pastas_visa(cnpj_cpf);
CREATE INDEX IF NOT EXISTS idx_pastas_visa_pasta ON public.pastas_visa(pasta);
CREATE INDEX IF NOT EXISTS idx_pastas_visa_razao ON public.pastas_visa(razao_social);
CREATE INDEX IF NOT EXISTS idx_pastas_visa_setor ON public.pastas_visa(setor);

-- 4. SEGURANÇA E POLÍTICAS DE ACESSO (RLS)
ALTER TABLE public.pastas_visa ENABLE ROW LEVEL SECURITY;

-- Permitir leitura e escrita para o portal (chaves anônimas e autenticadas)
DROP POLICY IF EXISTS "Permitir Acesso Completo Pastas Visa" ON public.pastas_visa;
CREATE POLICY "Permitir Acesso Completo Pastas Visa" 
ON public.pastas_visa 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 5. HABILITAR SINCRONIZAÇÃO EM TEMPO REAL (SUPABASE REALTIME)
-- Caso você utilize escuta em tempo real no app:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pastas_visa;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 6. COMENTÁRIOS DE DOCUMENTAÇÃO NO BANCO
COMMENT ON TABLE public.pastas_visa IS 'Armazena o controle e cadastro de pastas físicas e arquivos de contribuintes da Vigilância Sanitária de Balneário Camboriú';
COMMENT ON COLUMN public.pastas_visa.id IS 'Identificador único da pasta (UUID ou pasta-timestamp)';
COMMENT ON COLUMN public.pastas_visa.cnpj_cpf IS 'Documento do titular ou empresa (CNPJ ou CPF)';
COMMENT ON COLUMN public.pastas_visa.pasta IS 'Número ou código de identificação física da pasta no arquivo';
COMMENT ON COLUMN public.pastas_visa.razao_social IS 'Razão social ou nome civil completo do titular';
COMMENT ON COLUMN public.pastas_visa.status_rf IS 'Situação cadastral na Receita Federal (ex: ATIVA, BAIXADA, SUSPENSA)';
COMMENT ON COLUMN public.pastas_visa.alvara_atualizado IS 'Situação do Alvará Sanitário / Taxa TMI (ex: SIM, NÃO, EM RENOVAÇÃO)';
COMMENT ON COLUMN public.pastas_visa.setor IS 'Setor responsável (ex: ALIMENTOS, SAÚDE, SANEAMENTO, MEDICAMENTOS)';
