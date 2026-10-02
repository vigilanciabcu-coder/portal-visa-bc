-- ==============================================================================
-- SCRIPT DE CRIAÇÃO DA TABELA ALVARAS_SANITARIOS NO SUPABASE
-- Execute este script no SQL Editor do seu projeto Supabase
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.alvaras_sanitarios (
    id TEXT PRIMARY KEY,
    numero_alvara TEXT NOT NULL,
    ano_exercicio TEXT NOT NULL,
    tipo_alvara TEXT NOT NULL DEFAULT 'INICIAL',
    modelo_tipo TEXT DEFAULT 'PONTO_MILHO_CHURROS',
    pasta TEXT,
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

-- Adicionar colunas caso a tabela já exista
ALTER TABLE public.alvaras_sanitarios ADD COLUMN IF NOT EXISTS assinatura_digital TEXT;
ALTER TABLE public.alvaras_sanitarios ADD COLUMN IF NOT EXISTS assinado_por TEXT;
ALTER TABLE public.alvaras_sanitarios ADD COLUMN IF NOT EXISTS assinado_em TEXT;

-- Índices de busca rápida
CREATE INDEX IF NOT EXISTS idx_alvaras_cnpj ON public.alvaras_sanitarios (cnpj_cpf);
CREATE INDEX IF NOT EXISTS idx_alvaras_numero ON public.alvaras_sanitarios (numero_alvara);
CREATE INDEX IF NOT EXISTS idx_alvaras_status ON public.alvaras_sanitarios (status);

-- Habilitar RLS (Row Level Security) permissivo para leitura e gravação autenticada/anônima do portal
ALTER TABLE public.alvaras_sanitarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso completo aos alvarás sanitários" 
ON public.alvaras_sanitarios 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- ==============================================================================
-- TABELA DE MODELOS OFICIAIS DO GOOGLE DOCS (Para escolha entre modelos)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.modelos_alvara_docs (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    autor TEXT NOT NULL,
    descricao TEXT,
    docs_url TEXT NOT NULL,
    template_texto TEXT,
    is_ativo BOOLEAN DEFAULT FALSE,
    legislacao_base TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.modelos_alvara_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso completo aos modelos de alvarás" ON public.modelos_alvara_docs;
CREATE POLICY "Acesso completo aos modelos de alvarás" 
ON public.modelos_alvara_docs 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Carga inicial com os dois modelos (Modelo DVIS Clássico e Modelo Proposto 2026):
INSERT INTO public.modelos_alvara_docs (id, nome, autor, descricao, docs_url, template_texto, is_ativo, legislacao_base)
VALUES 
(
  'modelo_dvis_padrao',
  'Modelo DVIS Anterior / Clássico (Seu Modelo)',
  'Divisão de Vigilância Sanitária',
  'Modelo clássico simplificado da Vigilância Sanitária em formato direto de cartaz e tabela.',
  'https://docs.google.com/document/d/1MkvPN6i0wEqY4vADxaFbbIs0S_Y2R5QQnsrDIPobvKQ/edit?tab=t.0',
  'PREFEITURA DE BALNEÁRIO CAMBORIÚ - VIGILÂNCIA SANITÁRIA\nALVARÁ SANITÁRIO Nº {{NUMERO_ALVARA}} - EXERCÍCIO {{ANO}}\nNOME/RAZÃO SOCIAL: {{RAZAO_SOCIAL}}\nCPF/CNPJ: {{CPF_CNPJ}}\nENDEREÇO: {{ENDERECO}}, {{NUMERO_COMPLEMENTO}} - {{BAIRRO}} - {{CEP}}\nSETOR: {{SETOR}}\nATIVIDADE (CNAE): {{CNAE}}\nVALIDADE: {{DATA_VALIDADE}}\nCONDICIONANTES: {{CONDICIONANTES}}\nASSINATURA DIGITAL: {{ASSINATURA_DIGITAL}}',
  false,
  'Código Sanitário Municipal'
),
(
  'modelo_proposto_diretoria',
  'Modelo 2026 com Fundamentação Legal (Proposto para Diretoria)',
  'Minuta DVIS / Fiscalização Sanitária',
  'Modelo atualizado com base nas Leis Comp. nº 40/2019 e 125/2025, Lei nº 4.999/2025 e Decreto nº 12.965/2026 (Liberdade Econômica e Risco Sanitário).',
  'https://docs.google.com/document/d/1MkvPN6i0wEqY4vADxaFbbIs0S_Y2R5QQnsrDIPobvKQ/edit?tab=t.0',
  'ESTADO DE SANTA CATARINA\nPREFEITURA DE BALNEÁRIO CAMBORIÚ\nSECRETARIA MUNICIPAL DE SAÚDE\nDIVISÃO DE VIGILÂNCIA SANITÁRIA\n\nALVARÁ SANITÁRIO {{SETOR}}\nNº {{PASTA}}/{{ANO}}\nNOME DA PESSOA FÍSICA E/OU JURÍDICA: {{NOME}}\nCPF / CNPJ: {{DOC}}\nDENOMINAÇÃO COMERCIAL/NOME FANTASIA: {{FANTASIA}}\nENDEREÇO: {{ENDERECO}}\nNº / COMPLEMENTO/ SALA: {{NUMERO}}\nBAIRRO: {{BAIRRO}}\nCEP: {{CEP}}\nMUNICÍPIO / ESTADO: BALNEÁRIO CAMBORIÚ/SC.\n\nCIÊNCIA:\nAlvará Sanitário expedido com fundamento na Lei Complementar nº 40/2019, que institui o Código Sanitário Municipal; na Lei Municipal nº 4.999/2025, que institui e integra as taxas ao Sistema Tributário Municipal, na Lei Complementar nº 125/2025, que institui a Declaração de Direitos da Liberdade Econômica Municipal e no Decreto Municipal nº 12.965/2026, que regulamenta o enquadramento das atividades econômicas em baixo, médio e alto risco locacional.\nO presente documento autorizativo possui validade anual, tendo sua eficácia renovada mediante quitação da Taxa de Vigilância Sanitária (TVS) do exercício correspondente, salvo as hipóteses de isenção previstas em lei.\nA expedição do Alvará Sanitário implica a ciência do exposto na Declaração de Compromisso Sanitário, por meio do qual o responsável se compromete a manter suas atividades dentro das normas sanitárias aplicáveis e a receber as inspeções sanitárias a qualquer tempo, inclusive em imóvel residencial, quando for o caso.\nO descumprimento das normas sanitárias, de qualquer natureza, é classificado como infração sanitária e sujeita o infrator às penalidades previstas em lei, sem prejuízo das sanções penal e administrativas cabíveis.\n\nAUTORIDADE DE VIGILÂNCIA SANITÁRIA / OBSERVAÇÕES:\n{{CONDICIONANTES}}\n{{ASSINATURA_DIGITAL}}\n\nINÍCIO DA ATIVIDADE: 01/01/2022\nEMISSÃO: {{EMISSAO}}\nVALIDADE: {{VALIDADE}}\nCLASSIFICAÇÃO DE RISCO: BAIXO GRAU DE RISCO SANITÁRIO\nCÓD. CNAE / DESCRIÇÃO / RISCO SANITÁRIO:\n{{CNAE}}\n\nMANTER EM LOCAL VISÍVEL AO PÚBLICO\nDIVISÃO DE VIGILÂNCIA SANITÁRIA\nAvenida Palestina, Nº 150 - Nações - CEP 88338-010 - (47) 3267-7000 - E-mail: devs@bc.sc.gov.br / www.bc.sc.gov.br',
  true,
  'LC 40/2019, LC 125/2025, Lei 4.999/2025 e Dec. 12.965/2026'
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  autor = EXCLUDED.autor,
  descricao = EXCLUDED.descricao,
  docs_url = EXCLUDED.docs_url,
  template_texto = EXCLUDED.template_texto,
  is_ativo = EXCLUDED.is_ativo,
  legislacao_base = EXCLUDED.legislacao_base,
  atualizado_em = NOW();

