-- ====================================================================
-- SCRIPT DE INSTALAÇÃO DAS OCORRÊNCIAS CCPU NO SUPABASE POSTGRESQL
-- Centro de Controle de Pragas Urbanas (CCPU / DVIS / PMBC)
-- ====================================================================
-- Como usar:
-- 1. Acesse o painel do seu projeto no Supabase: https://supabase.com/dashboard
-- 2. Vá em "SQL Editor" no menu lateral esquerdo.
-- 3. Clique em "+ New Query".
-- 4. Cole todo este script e clique em "RUN".
-- ====================================================================

-- 1. TABELA PRINCIPAL DE OCORRÊNCIAS, COLETAS DE ANIMAIS E CONSUMO
CREATE TABLE IF NOT EXISTS public.ccpu_ocorrencias (
    id TEXT PRIMARY KEY,
    protocolo TEXT NOT NULL,
    tipo_praga TEXT NOT NULL,
    subtipo_especie TEXT NOT NULL,
    data_hora TEXT NOT NULL,
    temperatura NUMERIC(6, 2) NOT NULL DEFAULT 24.0,
    umidade_relativa NUMERIC(5, 2),
    condicao_clima TEXT NOT NULL DEFAULT '',
    fonte_temperatura TEXT NOT NULL DEFAULT '',
    endereco TEXT NOT NULL,
    numero TEXT,
    bairro TEXT NOT NULL,
    tipo_local TEXT NOT NULL,
    identificacao_bueiro_local TEXT NOT NULL,
    lat NUMERIC(10, 6) NOT NULL,
    lng NUMERIC(10, 6) NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1, -- Quantidade de animais/espécimes recolhidos ou avistados
    status_especime TEXT NOT NULL DEFAULT 'VIVO', -- VIVO | MORTO | AMBOS | APENAS_VESTIGIOS
    metodo_coleta_acao TEXT NOT NULL DEFAULT '',
    condicao_estrutural TEXT,
    insumos_utilizados JSONB NOT NULL DEFAULT '[]'::jsonb, -- Lista detalhada de iscas, insumos e larvicida consumidos
    resumo_insumos_consumidos TEXT, -- Resumo legível (ex: Parafinado: 2 un; Larvicida: 0.5 L)
    fatores_atrativos JSONB NOT NULL DEFAULT '[]'::jsonb,
    servidor_responsavel TEXT NOT NULL,
    matricula_servidor TEXT,
    status_ocorrencia TEXT NOT NULL DEFAULT 'COLETADO',
    notificacao_emitida BOOLEAN NOT NULL DEFAULT false,
    numero_notificacao TEXT,
    observacoes TEXT NOT NULL DEFAULT '',
    medidas_adotadas TEXT NOT NULL DEFAULT '',
    fotos JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DETALHADA DE CONSUMO POR OCORRÊNCIA (RELACIONAL PARA RELATÓRIOS SQL)
CREATE TABLE IF NOT EXISTS public.ccpu_ocorrencias_consumo (
    id TEXT PRIMARY KEY,
    ocorrencia_id TEXT NOT NULL REFERENCES public.ccpu_ocorrencias(id) ON DELETE CASCADE,
    protocolo TEXT NOT NULL,
    insumo_id TEXT NOT NULL,
    insumo_nome TEXT NOT NULL,
    quantidade_consumida NUMERIC(12, 2) NOT NULL DEFAULT 0,
    unidade TEXT NOT NULL DEFAULT 'unidade',
    tipo_praga TEXT NOT NULL,
    quantidade_animais INTEGER NOT NULL DEFAULT 0,
    bairro TEXT NOT NULL,
    servidor_responsavel TEXT NOT NULL,
    data_hora TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. MIGRAÇÕES SEGURAS DE COLUNAS
ALTER TABLE public.ccpu_ocorrencias ADD COLUMN IF NOT EXISTS umidade_relativa NUMERIC(5, 2);
ALTER TABLE public.ccpu_ocorrencias ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE public.ccpu_ocorrencias ADD COLUMN IF NOT EXISTS condicao_estrutural TEXT;
ALTER TABLE public.ccpu_ocorrencias ADD COLUMN IF NOT EXISTS insumos_utilizados JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.ccpu_ocorrencias ADD COLUMN IF NOT EXISTS resumo_insumos_consumidos TEXT;
ALTER TABLE public.ccpu_ocorrencias ADD COLUMN IF NOT EXISTS fatores_atrativos JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.ccpu_ocorrencias ADD COLUMN IF NOT EXISTS matricula_servidor TEXT;
ALTER TABLE public.ccpu_ocorrencias ADD COLUMN IF NOT EXISTS numero_notificacao TEXT;
ALTER TABLE public.ccpu_ocorrencias ADD COLUMN IF NOT EXISTS fotos JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 4. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_ccpu_ocorrencias_protocolo ON public.ccpu_ocorrencias(protocolo);
CREATE INDEX IF NOT EXISTS idx_ccpu_ocorrencias_praga ON public.ccpu_ocorrencias(tipo_praga);
CREATE INDEX IF NOT EXISTS idx_ccpu_ocorrencias_bairro ON public.ccpu_ocorrencias(bairro);
CREATE INDEX IF NOT EXISTS idx_ccpu_ocorrencias_data ON public.ccpu_ocorrencias(data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_ccpu_ocorrencias_created ON public.ccpu_ocorrencias(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ccpu_consumo_ocorrencia ON public.ccpu_ocorrencias_consumo(ocorrencia_id);
CREATE INDEX IF NOT EXISTS idx_ccpu_consumo_insumo ON public.ccpu_ocorrencias_consumo(insumo_id);
CREATE INDEX IF NOT EXISTS idx_ccpu_consumo_bairro ON public.ccpu_ocorrencias_consumo(bairro);

-- 5. SEGURANÇA E POLÍTICAS DE ACESSO (RLS)
ALTER TABLE public.ccpu_ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ccpu_ocorrencias_consumo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir Acesso Completo CCPU Ocorrencias" ON public.ccpu_ocorrencias;
CREATE POLICY "Permitir Acesso Completo CCPU Ocorrencias"
ON public.ccpu_ocorrencias
FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir Acesso Completo CCPU Ocorrencias Consumo" ON public.ccpu_ocorrencias_consumo;
CREATE POLICY "Permitir Acesso Completo CCPU Ocorrencias Consumo"
ON public.ccpu_ocorrencias_consumo
FOR ALL
USING (true)
WITH CHECK (true);

-- 6. HABILITAR SINCRONIZAÇÃO EM TEMPO REAL (SUPABASE REALTIME)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ccpu_ocorrencias;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ccpu_ocorrencias_consumo;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 7. DOCUMENTAÇÃO NO BANCO
COMMENT ON TABLE public.ccpu_ocorrencias IS 'Ocorrências e demandas do CCPU com quantitativo de animais recolhidos/avistados e registro de iscas, insumos e larvicida consumidos.';
COMMENT ON TABLE public.ccpu_ocorrencias_consumo IS 'Detalhamento por item consumido em cada ocorrência registrada no CCPU.';
