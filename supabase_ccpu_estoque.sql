-- ====================================================================
-- SCRIPT DE INSTALAÇÃO DO CONTROLE DE ESTOQUE CCPU NO SUPABASE POSTGRESQL
-- Centro de Controle de Pragas Urbanas (CCPU / DVIS / PMBC)
-- ====================================================================
-- Como usar:
-- 1. Acesse o painel do seu projeto no Supabase: https://supabase.com/dashboard
-- 2. Vá em "SQL Editor" no menu lateral esquerdo.
-- 3. Clique em "+ New Query".
-- 4. Cole todo este script e clique em "RUN".
-- ====================================================================

-- 1. TABELA DE SALDO ATUAL DOS ITENS DE ESTOQUE DA CCPU
CREATE TABLE IF NOT EXISTS public.ccpu_estoque_itens (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'ISCA_RATICIDA',
    unidade TEXT NOT NULL DEFAULT 'unidade', -- 'unidade' | 'litro'
    quantidade_atual NUMERIC(12, 2) NOT NULL DEFAULT 0,
    estoque_minimo NUMERIC(12, 2) NOT NULL DEFAULT 10,
    lote_atual TEXT,
    validade_lote TEXT,
    observacoes TEXT,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_por TEXT
);

-- 2. TABELA DE HISTÓRICO DE MOVIMENTAÇÕES (ENTRADAS, SAÍDAS E AJUSTES)
CREATE TABLE IF NOT EXISTS public.ccpu_estoque_movimentacoes (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES public.ccpu_estoque_itens(id) ON DELETE CASCADE,
    item_nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA', 'AJUSTE')),
    quantidade NUMERIC(12, 2) NOT NULL,
    saldo_anterior NUMERIC(12, 2) NOT NULL DEFAULT 0,
    saldo_posterior NUMERIC(12, 2) NOT NULL DEFAULT 0,
    unidade TEXT NOT NULL DEFAULT 'unidade',
    motivo TEXT NOT NULL,
    protocolo_ocorrencia TEXT,
    ocorrencia_id TEXT,
    lote TEXT,
    responsavel TEXT NOT NULL,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. MIGRAÇÕES SEGURAS DE COLUNAS
ALTER TABLE public.ccpu_estoque_itens ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'ISCA_RATICIDA';
ALTER TABLE public.ccpu_estoque_itens ADD COLUMN IF NOT EXISTS unidade TEXT NOT NULL DEFAULT 'unidade';
ALTER TABLE public.ccpu_estoque_itens ADD COLUMN IF NOT EXISTS quantidade_atual NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.ccpu_estoque_itens ADD COLUMN IF NOT EXISTS estoque_minimo NUMERIC(12, 2) NOT NULL DEFAULT 10;
ALTER TABLE public.ccpu_estoque_itens ADD COLUMN IF NOT EXISTS lote_atual TEXT;
ALTER TABLE public.ccpu_estoque_itens ADD COLUMN IF NOT EXISTS validade_lote TEXT;
ALTER TABLE public.ccpu_estoque_itens ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE public.ccpu_estoque_itens ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.ccpu_estoque_itens ADD COLUMN IF NOT EXISTS atualizado_por TEXT;

ALTER TABLE public.ccpu_estoque_movimentacoes ADD COLUMN IF NOT EXISTS protocolo_ocorrencia TEXT;
ALTER TABLE public.ccpu_estoque_movimentacoes ADD COLUMN IF NOT EXISTS ocorrencia_id TEXT;
ALTER TABLE public.ccpu_estoque_movimentacoes ADD COLUMN IF NOT EXISTS lote TEXT;

-- 4. CARGA INICIAL DOS 8 INSUMOS OFICIAIS DA CCPU
INSERT INTO public.ccpu_estoque_itens (id, nome, categoria, unidade, quantidade_atual, estoque_minimo, observacoes)
VALUES
    ('PARAFINADO', 'Parafinado', 'ISCA_RATICIDA', 'unidade', 0, 50, 'Bloco parafinado para raticida / bueiros e áreas úmidas'),
    ('COLANTE', 'Colante', 'ISCA_RATICIDA', 'unidade', 0, 30, 'Placa / armadilha colante'),
    ('EXTRUSADO', 'Extrusado', 'ISCA_RATICIDA', 'unidade', 0, 50, 'Isca extrusada em unidade'),
    ('ISCA_FRESCA', 'Isca Fresca', 'ISCA_RATICIDA', 'unidade', 0, 40, 'Isca fresca / sachê de alta palatabilidade'),
    ('GRANULADO', 'Granulado', 'INSUMO_QUIMICO', 'unidade', 0, 40, 'Isca / insumo granulado em unidade'),
    ('GEL', 'Gel', 'INSUMO_QUIMICO', 'unidade', 0, 20, 'Aplicador / seringa de inseticida em gel'),
    ('PO', 'Pó', 'INSUMO_QUIMICO', 'unidade', 0, 20, 'Insumo em pó seco / polvilhamento em unidade'),
    ('LARVICIDA', 'Larvicida', 'LARVICIDA', 'litro', 0, 5, 'Larvicida líquido / biológico medido em litros')
ON CONFLICT (id) DO NOTHING;

-- 5. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_ccpu_mov_item ON public.ccpu_estoque_movimentacoes(item_id);
CREATE INDEX IF NOT EXISTS idx_ccpu_mov_tipo ON public.ccpu_estoque_movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_ccpu_mov_data ON public.ccpu_estoque_movimentacoes(data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_ccpu_mov_protocolo ON public.ccpu_estoque_movimentacoes(protocolo_ocorrencia);

-- 6. SEGURANÇA E POLÍTICAS DE ACESSO (RLS)
ALTER TABLE public.ccpu_estoque_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ccpu_estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir Acesso Completo CCPU Estoque Itens" ON public.ccpu_estoque_itens;
CREATE POLICY "Permitir Acesso Completo CCPU Estoque Itens"
ON public.ccpu_estoque_itens
FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir Acesso Completo CCPU Estoque Movimentacoes" ON public.ccpu_estoque_movimentacoes;
CREATE POLICY "Permitir Acesso Completo CCPU Estoque Movimentacoes"
ON public.ccpu_estoque_movimentacoes
FOR ALL
USING (true)
WITH CHECK (true);

-- 7. HABILITAR SINCRONIZAÇÃO EM TEMPO REAL (SUPABASE REALTIME)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ccpu_estoque_itens;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ccpu_estoque_movimentacoes;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 8. DOCUMENTAÇÃO NO BANCO
COMMENT ON TABLE public.ccpu_estoque_itens IS 'Controle de saldo em estoque dos insumos utilizados pela CCPU (Parafinado, Colante, Extrusado, Isca Fresca, Granulado, Gel, Pó em unidade e Larvicida em litro).';
COMMENT ON TABLE public.ccpu_estoque_movimentacoes IS 'Histórico completo de entradas, saídas manuais, ajustes e baixas automáticas de ocorrências CCPU.';
