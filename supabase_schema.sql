-- ====================================================================
-- SCRIPT DE BANCO DE DADOS SUPABASE (VIGILÂNCIA SANITÁRIA BC)
-- Copie e cole este código no SQL Editor do seu projeto no Supabase
-- ====================================================================

-- 1. Tabela de Operadores e Fiscais
CREATE TABLE IF NOT EXISTS public.operadores (
    id TEXT PRIMARY KEY,
    nome_completo TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    cargo TEXT NOT NULL,
    data_nascimento TEXT,
    matricula TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Escala de Plantão
CREATE TABLE IF NOT EXISTS public.escala (
    id TEXT PRIMARY KEY,
    data DATE NOT NULL,
    tipo TEXT NOT NULL,
    servidores TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Cadastro de Feirantes
CREATE TABLE IF NOT EXISTS public.feiras (
    id TEXT PRIMARY KEY,
    data_prot DATE,
    num_prot TEXT,
    feira TEXT,
    pasta TEXT,
    cpf TEXT,
    nome_pf TEXT,
    produtos TEXT,
    validade TEXT,
    rua TEXT,
    num TEXT,
    bairro TEXT,
    vinculo TEXT,
    func TEXT,
    abertura TEXT,
    cnpj TEXT,
    razao TEXT,
    rua_api TEXT,
    num_api TEXT,
    municipio TEXT,
    estado TEXT,
    cnae TEXT,
    alvara TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Autos de Fiscalização Sanitária
CREATE TABLE IF NOT EXISTS public.fiscalizacoes (
    id TEXT PRIMARY KEY,
    protocolo TEXT UNIQUE NOT NULL,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fiscal_nome TEXT NOT NULL,
    estabelecimento TEXT NOT NULL,
    tipo_vistoria TEXT NOT NULL,
    risco TEXT NOT NULL,
    status TEXT NOT NULL,
    checklists JSONB,
    irregularidades JSONB,
    medidas_adotadas JSONB,
    observacoes_fiscais TEXT,
    parecer_ia TEXT,
    coordenadas JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de Chat e Comunicação Interna da Equipe
CREATE TABLE IF NOT EXISTS public.portal_chat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nome_usuario TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    perfil_id TEXT
);

-- 6. Inserir Usuários Iniciais de Exemplo
INSERT INTO public.operadores (id, nome_completo, email, cargo, matricula)
VALUES 
    ('u-1', 'CARLOS EDUARDO SILVA', 'fiscal@bc.sc.gov.br', 'FISCAL', 'FIS-4092'),
    ('u-2', 'ANA PAULA OLIVEIRA', 'agente@bc.sc.gov.br', 'AGENTE', 'AGE-1102'),
    ('u-3', 'MARCELO SOUZA', 'diretor@bc.sc.gov.br', 'DIRETOR', 'DIR-0001')
ON CONFLICT (id) DO NOTHING;

-- 7. Habilitar Permissões (Row Level Security - RLS)
ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscalizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_chat ENABLE ROW LEVEL SECURITY;

-- Liberar leitura e escrita para chaves anon/autenticadas da aplicação
DROP POLICY IF EXISTS "Permitir Acesso Anonimo Operadores" ON public.operadores;
CREATE POLICY "Permitir Acesso Anonimo Operadores" ON public.operadores FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir Acesso Anonimo Escala" ON public.escala;
CREATE POLICY "Permitir Acesso Anonimo Escala" ON public.escala FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir Acesso Anonimo Feiras" ON public.feiras;
CREATE POLICY "Permitir Acesso Anonimo Feiras" ON public.feiras FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir Acesso Anonimo Fiscalizacoes" ON public.fiscalizacoes;
CREATE POLICY "Permitir Acesso Anonimo Fiscalizacoes" ON public.fiscalizacoes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir Acesso Anonimo Chat" ON public.portal_chat;
CREATE POLICY "Permitir Acesso Anonimo Chat" ON public.portal_chat FOR ALL USING (true) WITH CHECK (true);

