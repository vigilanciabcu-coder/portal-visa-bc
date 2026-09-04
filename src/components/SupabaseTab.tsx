import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  Database, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  Server, 
  ShieldCheck, 
  Table, 
  Terminal, 
  ExternalLink,
  Info,
  AlertTriangle,
  Play
} from 'lucide-react';

interface SupabaseTabProps {
  onRefreshData?: () => Promise<void> | void;
}

interface TableStatus {
  name: string;
  description: string;
  status: 'checking' | 'ok' | 'missing' | 'error';
  count?: number;
  errorMsg?: string;
}

export const SupabaseTab: React.FC<SupabaseTabProps> = ({ onRefreshData }) => {
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copiedSql, setCopiedSql] = useState(false);
  const [selectedSqlFilter, setSelectedSqlFilter] = useState<'all' | 'essential' | 'views'>('all');

  const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_URL) || 'https://wcbzmpnvcjamlgljsksk.supabase.co';
  const supabaseKey = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

  const [tables, setTables] = useState<TableStatus[]>([
    { name: 'operadores', description: 'Servidores, fiscais, diretores e senhas do sistema', status: 'checking' },
    { name: 'escala', description: 'Plantões, eventos, feriados e pontos facultativos', status: 'checking' },
    { name: 'fiscalizacoes', description: 'Autos de infração, vistorias e relatórios de campo', status: 'checking' },
    { name: 'recados_mural', description: 'Mural de avisos, comunicados e felicitações', status: 'checking' },
    { name: 'portal_chat', description: 'Chat interno em tempo real entre servidores', status: 'checking' },
    { name: 'processos', description: 'Processos sanitários, 1Doc e alvarás', status: 'checking' },
    { name: 'laboratorio', description: 'Amostras de água e análises laboratoriais', status: 'checking' },
    { name: 'pontos_coleta', description: 'Pontos georreferenciados de coleta no município', status: 'checking' },
    { name: 'feiras', description: 'Cadastros de feirantes e barracas do município', status: 'checking' },
    { name: 'contabilidades', description: 'Escritórios contábeis e contabilistas credenciados', status: 'checking' },
    { name: 'documentos_contabilidade', description: 'Protocolos e documentos enviados por contabilistas', status: 'checking' },
    { name: 'contribuintes', description: 'Empresários, comerciantes, feirantes e autônomos', status: 'checking' },
    { name: 'cidadaos', description: 'Cidadãos cadastrados para consultas e solicitações', status: 'checking' }
  ]);

  const checkTables = async () => {
    if (!supabase || !isSupabaseConfigured) {
      setConnectionStatus('error');
      setTables(prev => prev.map(t => ({ ...t, status: 'error', errorMsg: 'Supabase não configurado' })));
      return;
    }

    setTestingConnection(true);
    setConnectionStatus('idle');

    const updatedTables = await Promise.all(
      tables.map(async (table) => {
        try {
          const { data, count, error } = await supabase
            .from(table.name)
            .select('*', { count: 'exact', head: true });

          if (error) {
            // Fallbacks caso o banco tenha sido criado com nomes alternativos
            const fallbacks: Record<string, string> = {
              'recados_mural': 'mural',
              'escala': 'escala_plantao',
              'feiras': 'feirantes',
              'laboratorio': 'amostras_laboratorio',
              'pontos_coleta': 'pontos_coleta_laboratorio'
            };
            if (fallbacks[table.name]) {
              const fb = await supabase.from(fallbacks[table.name]).select('*', { count: 'exact', head: true });
              if (!fb.error) {
                return { ...table, status: 'ok' as const, count: fb.count ?? 0 };
              }
            }
            return {
              ...table,
              status: error.code === '42P01' ? 'missing' as const : 'error' as const,
              errorMsg: error.message
            };
          }

          return {
            ...table,
            status: 'ok' as const,
            count: count ?? 0
          };
        } catch (err: any) {
          return {
            ...table,
            status: 'error' as const,
            errorMsg: err?.message || 'Falha de rede'
          };
        }
      })
    );

    setTables(updatedTables);
    const anyOk = updatedTables.some(t => t.status === 'ok');
    setConnectionStatus(anyOk ? 'success' : 'error');
    setTestingConnection(false);
  };

  useEffect(() => {
    checkTables();
  }, []);

  const fullSqlScript = `-- =========================================================================
-- SCRIPT COMPLETO DE CRIAÇÃO E ADAPTAÇÃO DO SUPABASE
-- DIRETORIA DE VIGILÂNCIA SANITÁRIA E AMBIENTAL (DVIS) - BALNEÁRIO CAMBORIÚ
-- Execute este script no SQL Editor do seu projeto Supabase
-- =========================================================================

-- 1. TABELA DE OPERADORES (SERVIDORES / FISCAIS / MASTER)
CREATE TABLE IF NOT EXISTS public.operadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    data_nascimento DATE,
    cargo TEXT NOT NULL DEFAULT 'FISCAL DE VIGILÂNCIA SANITÁRIA',
    setor TEXT NOT NULL DEFAULT 'VIGILÂNCIA SANITÁRIA',
    conselho_regional TEXT,
    nivel_acesso TEXT NOT NULL DEFAULT 'VISA (FISCAL)',
    matricula TEXT,
    telefone TEXT,
    senha TEXT NOT NULL DEFAULT '123456',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA DE ESCALAS E PLANTÕES
CREATE TABLE IF NOT EXISTS public.escala_plantao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'PLANTAO', -- PLANTAO, EVENTO, FERIADO, FACULTATIVO
    servidores TEXT[] DEFAULT '{}',
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE FISCALIZAÇÕES E AUTOS DE CAMPO
CREATE TABLE IF NOT EXISTS public.fiscalizacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocolo TEXT UNIQUE NOT NULL,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    fiscal_id TEXT,
    fiscal_nome TEXT NOT NULL,
    estabelecimento_nome TEXT NOT NULL,
    cnpj_cpf TEXT,
    endereco TEXT NOT NULL,
    bairro TEXT,
    tipo_vistoria TEXT NOT NULL, -- ALVARA, DENUNCIA, ROTINA, REINSPECAO
    status TEXT NOT NULL DEFAULT 'CONCLUIDO', -- CONCLUIDO, EM_ANDAMENTO, PENDENTE
    infracoes TEXT[] DEFAULT '{}',
    orientacoes TEXT,
    notificacao_emitida BOOLEAN DEFAULT false,
    auto_infracao_emitido BOOLEAN DEFAULT false,
    interdicao_emitida BOOLEAN DEFAULT false,
    prazo_regularizacao INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELA DE MURAL DE RECADOS
CREATE TABLE IF NOT EXISTS public.recados_mural (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    prioridade TEXT NOT NULL DEFAULT 'NORMAL', -- NORMAL, IMPORTANTE, URGENTE, ALERTA
    autor TEXT NOT NULL DEFAULT 'DIRETORIA DVIS',
    cargo TEXT DEFAULT 'DIRETOR',
    data DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABELA DE CHAT INTERNO EM TEMPO REAL
CREATE TABLE IF NOT EXISTS public.portal_chat (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    nome_usuario TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    perfil_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABELA DE PROCESSOS SANITÁRIOS / 1DOC
CREATE TABLE IF NOT EXISTS public.processos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    num_processo TEXT UNIQUE NOT NULL,
    data_protocolo DATE,
    cnpj_cpf TEXT,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    assunto TEXT,
    bairro TEXT,
    endereco TEXT,
    fiscal_responsavel TEXT,
    status TEXT DEFAULT 'EM_ANDAMENTO',
    validade DATE,
    observacoes TEXT,
    cnaes TEXT[] DEFAULT '{}',
    setor TEXT,
    motivacao TEXT,
    data_entrada DATE,
    data_1doc DATE,
    venc_1doc DATE,
    prot_1doc TEXT,
    pasta TEXT,
    cep TEXT,
    numero_complemento TEXT,
    situacao_cadastral TEXT,
    motivo_situacao TEXT,
    data_situacao DATE,
    venc_licenca DATE,
    grau_risco TEXT,
    data_entregue_fiscal DATE,
    agendado_para DATE,
    conclusao TEXT,
    pas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABELA DE AMOSTRAS DO LABORATÓRIO DE ÁGUA
CREATE TABLE IF NOT EXISTS public.amostras_laboratorio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_amostra TEXT UNIQUE NOT NULL,
    ponto_coleta_id TEXT,
    ponto_coleta_nome TEXT NOT NULL,
    data_coleta DATE NOT NULL,
    hora_coleta TIME,
    tipo_agua TEXT NOT NULL, -- TRATADA, PRAIA, RIO, POCO
    temperatura_amostra NUMERIC,
    ph NUMERIC,
    cloro_residual NUMERIC,
    turbidez NUMERIC,
    coliformes_totais TEXT, -- AUSENTE, PRESENTE
    escherichia_coli TEXT, -- AUSENTE, PRESENTE
    resultado_geral TEXT NOT NULL DEFAULT 'CONFORME', -- CONFORME, NAO_CONFORME, EM_ANALISE
    coletor_nome TEXT,
    responsavel_analise TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. TABELA DE PONTOS DE COLETA (LABORATÓRIO)
CREATE TABLE IF NOT EXISTS public.pontos_coleta_laboratorio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    codigo TEXT UNIQUE NOT NULL,
    tipo_agua TEXT NOT NULL,
    endereco TEXT NOT NULL,
    bairro TEXT NOT NULL,
    latitude NUMERIC,
    longitude NUMERIC,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. TABELA DE FEIRANTES MUNICIPAIS
CREATE TABLE IF NOT EXISTS public.feirantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_barraca TEXT NOT NULL,
    nome_titular TEXT NOT NULL,
    cpf TEXT,
    telefone TEXT,
    feira_nome TEXT NOT NULL, -- FEIRA_QUARTA_CENTRO, FEIRA_SABADO_CENTRO, FEIRA_BARRA
    produtos TEXT[] DEFAULT '{}',
    status_alvara TEXT NOT NULL DEFAULT 'REGULAR', -- REGULAR, PENDENTE, VENCIDO
    validade_licenca DATE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. TABELA DE CONTABILIDADES
CREATE TABLE IF NOT EXISTS public.contabilidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj TEXT UNIQUE NOT NULL,
    crc TEXT NOT NULL,
    responsavel TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT,
    senha TEXT DEFAULT '123456',
    cnpjs_vinculados TEXT[] DEFAULT '{}',
    data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. TABELA DE DOCUMENTOS DE CONTABILIDADES
CREATE TABLE IF NOT EXISTS public.documentos_contabilidade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contabilidade_id UUID REFERENCES public.contabilidades(id) ON DELETE SET NULL,
    cnpj_empresa TEXT NOT NULL,
    tipo_documento TEXT NOT NULL,
    nome_arquivo TEXT,
    observacao TEXT,
    status TEXT NOT NULL DEFAULT 'ANALISE', -- ANALISE, APROVADO, REJEITADO
    data_envio TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. TABELA DE CONTRIBUINTES (EMPRESÁRIOS / FEIRANTES / AUTÔNOMOS)
CREATE TABLE IF NOT EXISTS public.contribuintes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_pessoa TEXT DEFAULT 'PJ',
    categoria TEXT DEFAULT 'EMPRESARIO',
    cnpj_cpf TEXT UNIQUE NOT NULL,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    responsavel TEXT NOT NULL,
    nome_proprietario TEXT,
    email_proprietario TEXT,
    telefone_proprietario TEXT,
    email TEXT NOT NULL,
    telefone TEXT,
    ramo_atividade TEXT,
    bairro TEXT,
    endereco TEXT,
    senha TEXT DEFAULT '123456',
    data_abertura TEXT,
    situacao_cadastral TEXT,
    data_situacao_cadastral TEXT,
    cnae_principal TEXT,
    cnae_principal_codigo TEXT,
    cnae_principal_descricao TEXT,
    data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- MIGRATION PARA BANCOS EXISTENTES (ADICIONAR NOVAS COLUNAS CASO A TABELA JÁ EXISTA):
ALTER TABLE public.contribuintes ADD COLUMN IF NOT EXISTS nome_proprietario TEXT;
ALTER TABLE public.contribuintes ADD COLUMN IF NOT EXISTS email_proprietario TEXT;
ALTER TABLE public.contribuintes ADD COLUMN IF NOT EXISTS telefone_proprietario TEXT;
ALTER TABLE public.contribuintes ADD COLUMN IF NOT EXISTS data_abertura TEXT;
ALTER TABLE public.contribuintes ADD COLUMN IF NOT EXISTS situacao_cadastral TEXT;
ALTER TABLE public.contribuintes ADD COLUMN IF NOT EXISTS data_situacao_cadastral TEXT;
ALTER TABLE public.contribuintes ADD COLUMN IF NOT EXISTS cnae_principal TEXT;
ALTER TABLE public.contribuintes ADD COLUMN IF NOT EXISTS cnae_principal_codigo TEXT;
ALTER TABLE public.contribuintes ADD COLUMN IF NOT EXISTS cnae_principal_descricao TEXT;

-- 13. TABELA DE CIDADÃOS
CREATE TABLE IF NOT EXISTS public.cidadaos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT,
    bairro TEXT,
    endereco TEXT,
    senha TEXT DEFAULT '123456',
    data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HABILITAR REALTIME NAS TABELAS CRÍTICAS
ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recados_mural;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escala_plantao;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fiscalizacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.amostras_laboratorio;

-- DESABILITAR RLS TEMPORARIAMENTE OU CRIAR POLÍTICAS PÚBLICAS PARA AMBIENTE INTERNO
ALTER TABLE public.operadores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_plantao DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscalizacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recados_mural DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_chat DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.processos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.amostras_laboratorio DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pontos_coleta_laboratorio DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.feirantes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contabilidades DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_contabilidade DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribuintes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cidadaos DISABLE ROW LEVEL SECURITY;
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullSqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 md:p-10 lg:p-12 text-slate-900 dark:text-white space-y-8 min-h-[650px] transition-all">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 border border-emerald-500/20">
              <Database className="w-3.5 h-3.5" /> Integração Supabase PostgreSQL
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic flex items-center gap-2.5">
            <Server className="w-7 h-7 text-emerald-600 dark:text-emerald-400" /> Painel de Sincronização e Schema Supabase
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Verifique a saúde da conexão, valide as 11 tabelas do banco de dados relacional e execute os scripts de adaptação.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={checkTables}
            disabled={testingConnection}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider shadow transition cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${testingConnection ? 'animate-spin' : ''}`} />
            {testingConnection ? 'Verificando...' : 'Re-testar Conexão'}
          </button>
        </div>
      </div>

      {/* Connection Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Card */}
        <div className={`p-6 rounded-3xl border transition flex flex-col justify-between ${
          connectionStatus === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
            : connectionStatus === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">Status Geral</span>
              {connectionStatus === 'success' ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" /> Online & Ativo
                </span>
              ) : connectionStatus === 'error' ? (
                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-xs">
                  <XCircle className="w-4 h-4" /> Atenção Necessária
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Verificando...
                </span>
              )}
            </div>
            <p className="text-xl font-black mt-2 text-slate-800 dark:text-white">
              {tables.filter(t => t.status === 'ok').length} de {tables.length} Tabelas OK
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Sincronização bidirecional em tempo real ativada para o sistema.
            </p>
          </div>
        </div>

        {/* Project URL Card */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          <div>
            <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">Endpoint do Projeto</span>
            <p className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400 truncate mt-2" title={supabaseUrl}>
              {supabaseUrl}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Região: AWS sa-east-1 / Cloud PostgreSQL
            </p>
          </div>
          <div className="mt-3">
            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-2 py-0.5 rounded">
              Anon Key Configurada
            </span>
          </div>
        </div>

        {/* Action / Help Card */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-3xl border border-indigo-700/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase">
              <ShieldCheck className="w-4 h-4" /> SQL Editor Pronto
            </div>
            <p className="text-xs text-slate-200 mt-2 leading-relaxed">
              Precisa recriar ou adaptar colunas no seu banco? Copie o script SQL abaixo e cole no SQL Editor do seu console Supabase.
            </p>
          </div>
          <button
            onClick={copyToClipboard}
            className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 shadow cursor-pointer transition"
          >
            {copiedSql ? (
              <>
                <Check className="w-4 h-4 text-slate-950" /> Script Copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copiar SQL Completo
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabelas e Status de Cada Módulo */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
            <Table className="w-5 h-5 text-emerald-600" /> Diagnóstico de Tabelas do Banco de Dados
          </h3>
          <span className="text-xs text-slate-500">
            Atualizado automaticamente
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((t) => (
            <div
              key={t.name}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                t.status === 'ok'
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                  : t.status === 'missing'
                  ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                  : t.status === 'checking'
                  ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700'
                  : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    {t.name}
                  </span>
                  {t.status === 'ok' ? (
                    <span className="bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {t.count !== undefined ? `${t.count} reg.` : 'OK'}
                    </span>
                  ) : t.status === 'missing' ? (
                    <span className="bg-amber-100 dark:bg-amber-900/80 text-amber-700 dark:text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Não Criada
                    </span>
                  ) : t.status === 'checking' ? (
                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Testando...
                    </span>
                  ) : (
                    <span className="bg-rose-100 dark:bg-rose-900/80 text-rose-700 dark:text-rose-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Erro
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                  {t.description}
                </p>
              </div>

              {t.errorMsg && t.status !== 'ok' && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                  <p className="text-[10px] font-mono text-rose-600 dark:text-rose-400 truncate" title={t.errorMsg}>
                    {t.errorMsg}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SQL Script Viewer */}
      <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Script SQL de Criação e Adaptação (PostgreSQL / Supabase)
            </h3>
          </div>
          <button
            onClick={copyToClipboard}
            className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-lg uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow"
          >
            {copiedSql ? (
              <>
                <Check className="w-3.5 h-3.5" /> Copiado!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copiar SQL
              </>
            )}
          </button>
        </div>

        <div className="relative">
          <pre className="font-mono text-xs text-emerald-300 bg-slate-950 p-4 rounded-2xl overflow-x-auto max-h-72 leading-relaxed border border-slate-800">
            {fullSqlScript}
          </pre>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 p-3 rounded-xl border border-slate-700">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            <b>Como aplicar:</b> Abra seu painel no Supabase (<code className="text-emerald-300">https://supabase.com/dashboard</code>), clique no menu <b>SQL Editor</b>, crie uma <b>New Query</b>, cole o código acima e clique em <b>Run (▶)</b>.
          </span>
        </div>
      </div>
    </section>
  );
};
