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
    telefone TEXT,
    conselho_regional TEXT,
    setor TEXT DEFAULT 'VIGILÂNCIA SANITÁRIA',
    nivel_acesso TEXT DEFAULT 'VISA (FISCAL)',
    senha TEXT DEFAULT '123456',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrações seguras (caso a tabela já exista):
ALTER TABLE public.operadores ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE public.operadores ADD COLUMN IF NOT EXISTS conselho_regional TEXT;
ALTER TABLE public.operadores ADD COLUMN IF NOT EXISTS setor TEXT DEFAULT 'VIGILÂNCIA SANITÁRIA';
ALTER TABLE public.operadores ADD COLUMN IF NOT EXISTS nivel_acesso TEXT DEFAULT 'VISA (FISCAL)';
ALTER TABLE public.operadores ADD COLUMN IF NOT EXISTS senha TEXT DEFAULT '123456';

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

-- 6. Tabela de Amostras e Laudos de Laboratório (Água / Matrizes)
CREATE TABLE IF NOT EXISTS public.laboratorio (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    codigo_amostra TEXT UNIQUE NOT NULL,
    protocolo TEXT,
    mes_ano_referencia TEXT,
    responsavel_distribuicao TEXT DEFAULT 'EMASA',
    interessado TEXT,
    cnpj_cpf TEXT,
    numero_alvara TEXT,
    local_coleta TEXT,
    ponto_coleta_id TEXT,
    ponto_coleta_nome TEXT,
    bairro TEXT,
    estabelecimento TEXT,
    endereco TEXT,
    data_coleta DATE,
    hora_coleta TEXT,
    fiscal_coletor TEXT,
    tipo_matriz TEXT DEFAULT 'ÁGUA POTÁVEL',
    temperatura_coleta TEXT,
    observacoes TEXT,
    
    -- Características Organolépticas
    aspecto TEXT DEFAULT 'Límpido',
    odor TEXT DEFAULT 'Inobjetável',
    cor TEXT DEFAULT 'Incolor',
    
    -- Parâmetros Físico-Químicos
    ph TEXT,
    equipamento_ph TEXT,
    cloro TEXT,
    equipamento_cloro TEXT,
    fluoreto TEXT,
    equipamento_fluor TEXT,
    turbidez TEXT,
    equipamento_turbidez TEXT,
    fluoretacao TEXT,
    
    -- Análises Microbiológicas
    coliformes_totais TEXT DEFAULT 'AUSENTE',
    metodologia_coliformes_totais TEXT,
    escherichia_coli TEXT DEFAULT 'AUSENTE',
    metodologia_escherichia_coli TEXT,
    
    -- Conclusão, Laudo e Responsável Técnico
    status TEXT DEFAULT 'COLETA REALIZADA',
    laudo_numero TEXT,
    conclusao_laudo TEXT,
    data_resultado DATE,
    laboratorialista TEXT,
    cargo_laboratorialista TEXT,
    registro_conselho TEXT,
    responsavel_analise TEXT,
    
    -- Assinatura Digital com Validação por Senha
    assinatura_digital_validada BOOLEAN DEFAULT false,
    assinatura_digital_data TEXT,
    assinatura_digital_hash TEXT,
    
    parametros JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrações seguras para a tabela laboratorio:
ALTER TABLE public.laboratorio ADD COLUMN IF NOT EXISTS assinatura_digital_validada BOOLEAN DEFAULT false;
ALTER TABLE public.laboratorio ADD COLUMN IF NOT EXISTS assinatura_digital_data TEXT;
ALTER TABLE public.laboratorio ADD COLUMN IF NOT EXISTS assinatura_digital_hash TEXT;
ALTER TABLE public.laboratorio ADD COLUMN IF NOT EXISTS cargo_laboratorialista TEXT;
ALTER TABLE public.laboratorio ADD COLUMN IF NOT EXISTS registro_conselho TEXT;

-- 7. Tabela de Pontos de Coleta e Monitoramento
CREATE TABLE IF NOT EXISTS public.pontos_coleta (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    ponto TEXT,
    nome_identificacao TEXT,
    bairro TEXT NOT NULL,
    endereco TEXT NOT NULL,
    local TEXT,
    local_especifico TEXT,
    tipo_matriz_padrao TEXT DEFAULT 'ÁGUA POTÁVEL',
    tipo_estabelecimento TEXT,
    estabelecimento TEXT,
    responsavel_contato TEXT,
    telefone TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    ativo BOOLEAN DEFAULT true,
    frequencia_meses INTEGER DEFAULT 1,
    ultima_coleta_data DATE,
    proxima_coleta_prevista DATE,
    total_coletas_realizadas INTEGER DEFAULT 0,
    observacao TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.pontos_coleta ADD COLUMN IF NOT EXISTS ponto TEXT;
ALTER TABLE public.pontos_coleta ADD COLUMN IF NOT EXISTS local TEXT;
ALTER TABLE public.pontos_coleta ADD COLUMN IF NOT EXISTS observacao TEXT;
ALTER TABLE public.pontos_coleta ADD COLUMN IF NOT EXISTS tipo_matriz_padrao TEXT DEFAULT 'ÁGUA POTÁVEL';

-- 8. Inserir Amostras de Laboratório Iniciais (Exemplo Laudos Oficiais)
INSERT INTO public.laboratorio (
    id, codigo_amostra, protocolo, mes_ano_referencia, responsavel_distribuicao, 
    interessado, cnpj_cpf, numero_alvara, endereco, local_coleta, bairro, estabelecimento, 
    data_coleta, hora_coleta, fiscal_coletor, tipo_matriz, observacoes, 
    aspecto, odor, cor, ph, equipamento_ph, cloro, equipamento_cloro, fluoreto, equipamento_fluor, 
    turbidez, equipamento_turbidez, coliformes_totais, escherichia_coli, 
    status, laudo_numero, data_resultado, conclusao_laudo, 
    laboratorialista, cargo_laboratorialista, registro_conselho, responsavel_analise
) VALUES 
(
    'lab-1', '169', '60.455/2026', 'JULHO /2026', 'EMASA',
    'MERCADO BAGÉ LTDA', '63.457.239/0001-05', 'Solicitado', 'Rua 1500, 381 - CENTRO - Balneário Camboriú/SC', 'TORNEIRA CAFETERIA', 'Centro', 'MERCADO BAGÉ LTDA',
    '2026-07-15', '08:20', 'Rita Sahd', 'ÁGUA POTÁVEL', 'ANÁLISE SOLICITADA PARA VERIFICAR QUALIDADE DA ÁGUA PARA CONSUMO HUMANO',
    'Límpido', 'Inobjetável', 'Incolor', '7,0', 'pH indicator strips MQuant 0 – 14 Marca MERCK', '1,59', 'Chlorine Reagente for 10ml Sample(DLA-CL)', '0,72', 'Colorímetro Digital para Flúor (Modelo DLA-FL)',
    '0,52', 'Turbidímetro Digital modelo DLT-WV', 'AUSENTE', 'AUSENTE',
    'CONFORME', '169/2026', '2026-08-04', 'Para os parâmetros analisados, a amostra está em ACORDO com a Portaria GM/MS Nº 888, de 4 maio de 2021. Água PRÓPRIA para o consumo humano, considerando os parâmetros descritos.',
    'ADRIANO GUARDINI', 'FARMACÊUTICO E BIOQUIMICO', 'CRF/SC- 3321', 'Laboratório Central Municipal VISA'
),
(
    'lab-2', '170', '60.458/2026', 'JULHO /2026', 'EMASA',
    'REDE PÚBLICA MUNICIPAL', '83.102.285/0001-07', 'Isento', 'Av. Atlântica esq. Rua 1400 - Centro', 'POSTO SALVA-VIDAS 02', 'Centro', 'Posto de Salva-Vidas 02',
    '2026-07-16', '09:40', 'Carlos Eduardo Silva', 'ÁGUA POTÁVEL', 'Controle de qualidade de água da orla da Praia Central.',
    'Límpido', 'Inobjetável', 'Incolor', '7,2', 'pH indicator strips MQuant 0 – 14 Marca MERCK', '1,45', 'Chlorine Reagente for 10ml Sample(DLA-CL)', '0,75', 'Colorímetro Digital para Flúor (Modelo DLA-FL)',
    '0,48', 'Turbidímetro Digital modelo DLT-WV', 'AUSENTE', 'AUSENTE',
    'CONFORME', '170/2026', '2026-08-04', 'Para os parâmetros analisados, a amostra está em ACORDO com a Portaria GM/MS Nº 888, de 4 maio de 2021.',
    'ADRIANO GUARDINI', 'FARMACÊUTICO E BIOQUIMICO', 'CRF/SC- 3321', 'Laboratório Central Municipal VISA'
)
ON CONFLICT (id) DO UPDATE SET
    conclusao_laudo = EXCLUDED.conclusao_laudo,
    laboratorialista = EXCLUDED.laboratorialista;

-- 8. Inserir Usuários Iniciais de Exemplo
INSERT INTO public.operadores (id, nome_completo, email, cargo, matricula, conselho_regional, setor, nivel_acesso, senha)
VALUES 
    ('u-1', 'CARLOS EDUARDO SILVA', 'fiscal@bc.sc.gov.br', 'FISCAL DE VIGILÂNCIA SANITÁRIA', 'FIS-4092', 'CRBio 10293', 'VIGILÂNCIA SANITÁRIA', 'VISA (FISCAL)', '123456'),
    ('u-2', 'ANA PAULA OLIVEIRA', 'agente@bc.sc.gov.br', 'AGENTE DE ENDEMIAS', 'AGE-1102', NULL, 'CCPU', 'VISA (FISCAL)', '123456'),
    ('u-3', 'ADRIANO GUARDINI', 'adriano.guardini@bc.sc.gov.br', 'FARMACÊUTICO/BIOQUÍMICO', 'MAT-8842', 'CRF/SC- 3321', 'LABORATÓRIO CENTRAL', 'VISA (FISCAL)', '123456'),
    ('u-4', 'MARCELO SOUZA', 'diretor@bc.sc.gov.br', 'DIRETOR VIGILÂNCIA SANITÁRIA', 'DIR-0001', NULL, 'DIRETORIA', 'MASTER (TUDO)', '123456')
ON CONFLICT (id) DO UPDATE SET
    cargo = EXCLUDED.cargo,
    conselho_regional = EXCLUDED.conselho_regional;

-- 9. Habilitar Permissões (Row Level Security - RLS)
ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscalizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laboratorio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pontos_coleta ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Permitir Acesso Anonimo Laboratorio" ON public.laboratorio;
CREATE POLICY "Permitir Acesso Anonimo Laboratorio" ON public.laboratorio FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir Acesso Anonimo Pontos Coleta" ON public.pontos_coleta;
CREATE POLICY "Permitir Acesso Anonimo Pontos Coleta" ON public.pontos_coleta FOR ALL USING (true) WITH CHECK (true);

