import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Plus,
  Search,
  Droplet,
  Building2,
  MapPin,
  Clock,
  Download,
  Info,
  ExternalLink,
  ChevronDown,
  Trash2,
  Eye,
  FileCheck,
  ShieldCheck,
  Receipt,
  X
} from 'lucide-react';
import { SolicitacaoLaudoPotabilidadeItem, UserProfile } from '../types';
import { BAIRROS_BC } from '../data/mockData';
import { fetchCnpj } from '../lib/cnpjService';
import {
  getSolicitacoesPotabilidade,
  saveSolicitacaoPotabilidade,
  deleteSolicitacaoPotabilidade,
  subscribeSolicitacoesPotabilidade,
  mapSolicitacaoToProcesso,
  syncAllPotabilidadeToSupabase,
  fetchSolicitacoesPotabilidadeFromSupabase
} from '../lib/potabilidadeService';

export interface SolicitacaoLaudoPotabilidadeModuleProps {
  currentUser?: UserProfile | null;
  initialCnpj?: string;
  initialRazao?: string;
  initialNomeFantasia?: string;
  initialEndereco?: string;
  initialBairro?: string;
  initialTelefone?: string;
  initialEmail?: string;
  initialContato?: string;
  onEnviarParaColeta?: (solicitacao: SolicitacaoLaudoPotabilidadeItem) => void;
  onSaveProcesso?: (processo: any) => void;
  onClose?: () => void;
  isModal?: boolean;
}

const CATEGORIAS_ESTABELECIMENTOS = [
  {
    id: 'alimentacao',
    titulo: 'Serviços de Alimentação',
    descricao: 'restaurantes, lanchonetes, bares, padarias, confeitarias, cantinas, bufês, pastelarias, rotisserias, cozinhas industriais ou institucionais'
  },
  {
    id: 'saude',
    titulo: 'Estabelecimentos de Saúde',
    descricao: 'hospitais, clínicas, consultórios odontológicos e laboratórios'
  },
  {
    id: 'ensino',
    titulo: 'Instituições de ensino',
    descricao: 'faculdades, escolas e creches'
  },
  {
    id: 'comerciais',
    titulo: 'Estabelecimentos comerciais',
    descricao: 'supermercados, mercados, delicatéssens e comissarias'
  },
  {
    id: 'outros',
    titulo: 'Outros',
    descricao: 'hotéis, academias, clubes, spas, indústrias, centros logísticos ou outras atividades não especificadas anteriormente'
  }
];

const LOCAIS_COLETA_PADRAO = [
  'Torneira na área de produção industrial',
  'Torneira na área de manipulação de alimentos',
  'Torneira na área de copa/bar',
  'Bebedouro',
  'Filtro de água',
  'Outro tipo de ponto não especificado anteriormente'
];

export const SolicitacaoLaudoPotabilidadeModule: React.FC<SolicitacaoLaudoPotabilidadeModuleProps> = ({
  currentUser,
  initialCnpj,
  initialRazao,
  initialNomeFantasia,
  initialEndereco,
  initialBairro,
  initialTelefone,
  initialEmail,
  initialContato,
  onEnviarParaColeta,
  onSaveProcesso,
  onClose,
  isModal
}) => {
  // Lista persistida de solicitações
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoLaudoPotabilidadeItem[]>(() => getSolicitacoesPotabilidade());
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    return subscribeSolicitacoesPotabilidade((items) => {
      setSolicitacoes(items);
    });
  }, []);

  const handleSincronizarSupabase = async () => {
    setSyncingCloud(true);
    setSyncMsg(null);
    try {
      const res = await syncAllPotabilidadeToSupabase();
      await fetchSolicitacoesPotabilidadeFromSupabase();
      setSyncMsg(`✅ Sincronizado com Sucesso! ${res.success} solicitação(ões) gravadas na nuvem Supabase.`);
      setTimeout(() => setSyncMsg(null), 6000);
    } catch (err: any) {
      setSyncMsg('⚠️ Erro ao sincronizar: ' + (err?.message || 'Falha de conexão'));
    } finally {
      setSyncingCloud(false);
    }
  };

  // Aba ativa: 'formulario' ou 'historico'
  const [subAba, setSubAba] = useState<'formulario' | 'historico'>('formulario');

  // Estado do formulário
  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState({
    categoria_estabelecimento: '',
    quantidade_pontos: 1,
    locais_coleta: [] as string[],
    outro_local_especificado: '',
    cnpj_cpf: initialCnpj || '',
    razao_social: initialRazao || '',
    nome_fantasia: initialNomeFantasia || initialRazao || '',
    protocolo_1doc: `${Math.floor(60000 + Math.random() * 9000)}/${currentYear}`,
    endereco: initialEndereco || '',
    numero_complemento: '',
    bairro: initialBairro || 'Centro',
    cep: '88330-000',
    telefone: initialTelefone || '',
    email: initialEmail || '',
    responsavel_contato: initialContato || '',
    observacoes: '',
    declaracao_compromisso: false
  });

  useEffect(() => {
    if (initialCnpj || initialRazao) {
      setFormData((prev) => ({
        ...prev,
        cnpj_cpf: initialCnpj || prev.cnpj_cpf,
        razao_social: initialRazao || prev.razao_social,
        nome_fantasia: initialNomeFantasia || prev.nome_fantasia || initialRazao || '',
        endereco: initialEndereco || prev.endereco,
        bairro: initialBairro || prev.bairro,
        telefone: initialTelefone || prev.telefone,
        email: initialEmail || prev.email,
        responsavel_contato: initialContato || prev.responsavel_contato
      }));
    }
  }, [initialCnpj, initialRazao, initialNomeFantasia, initialEndereco, initialBairro, initialTelefone, initialEmail, initialContato]);

  const [isLoadingCnpj, setIsLoadingCnpj] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [solicitacaoParaImprimir, setSolicitacaoParaImprimir] = useState<SolicitacaoLaudoPotabilidadeItem | null>(null);

  // Filtros do Histórico
  const [buscaHistorico, setBuscaHistorico] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');

  // Cálculo da Taxa UFM
  const taxaUfmTotal = useMemo(() => {
    const qtd = Number(formData.quantidade_pontos) || 0;
    return Number((qtd * 0.40).toFixed(2));
  }, [formData.quantidade_pontos]);

  // Handler: Alternar seleção de local de coleta
  const toggleLocalColeta = (local: string) => {
    setFormData((prev) => {
      const existe = prev.locais_coleta.includes(local);
      const novos = existe
        ? prev.locais_coleta.filter((l) => l !== local)
        : [...prev.locais_coleta, local];
      return { ...prev, locais_coleta: novos };
    });
  };

  // Handler: Consulta automática de CNPJ
  const handleConsultarCnpj = async () => {
    const clean = formData.cnpj_cpf.replace(/\D/g, '');
    if (clean.length !== 14) {
      alert('Informe um CNPJ válido com 14 dígitos para consultar.');
      return;
    }

    setIsLoadingCnpj(true);
    try {
      const dados = await fetchCnpj(clean);
      if (dados && dados.razao) {
        setFormData((prev) => ({
          ...prev,
          razao_social: dados.razao || prev.razao_social,
          nome_fantasia: dados.nome_fantasia || prev.nome_fantasia || dados.razao,
          endereco: dados.rua_api ? `${dados.rua_api}, ${dados.num_api || 'S/N'}` : prev.endereco,
          bairro: dados.bairro || prev.bairro,
          cep: dados.cep || prev.cep,
          telefone: dados.telefone || prev.telefone,
          email: dados.email || prev.email
        }));
        setFeedbackMsg({
          tipo: 'sucesso',
          texto: `Dados de "${dados.razao}" carregados automaticamente via Receita Federal!`
        });
        setTimeout(() => setFeedbackMsg(null), 4000);
      }
    } catch (err: any) {
      console.warn('Erro ao consultar CNPJ:', err);
    } finally {
      setIsLoadingCnpj(false);
    }
  };

  // Handler: Envio do Formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.categoria_estabelecimento) {
      alert('Por favor, selecione os Estabelecimentos sujeitos à solicitação do Laudo.');
      return;
    }

    if (!formData.quantidade_pontos || formData.quantidade_pontos < 1 || formData.quantidade_pontos > 10) {
      alert('A quantidade de pontos de coleta deve ser de 1 a 10.');
      return;
    }

    if (formData.locais_coleta.length === 0) {
      alert('Selecione pelo menos um Local da coleta.');
      return;
    }

    if (formData.locais_coleta.includes('Outro tipo de ponto não especificado anteriormente') && !formData.outro_local_especificado.trim()) {
      alert('Por favor, descreva o outro tipo de ponto de coleta especificado.');
      return;
    }

    if (!formData.cnpj_cpf.trim() || !formData.razao_social.trim()) {
      alert('Preencha o CNPJ/CPF e a Razão Social do estabelecimento.');
      return;
    }

    if (!formData.declaracao_compromisso) {
      alert('É obrigatório assinalar a Declaração de Compromisso para concluir a solicitação.');
      return;
    }

    const novaSolicitacao: SolicitacaoLaudoPotabilidadeItem = {
      id: `sol-${Date.now()}`,
      protocolo_1doc: formData.protocolo_1doc || `${Math.floor(60000 + Math.random() * 9000)}/${currentYear}`,
      data_solicitacao: new Date().toISOString().split('T')[0],
      cnpj_cpf: formData.cnpj_cpf.trim(),
      razao_social: formData.razao_social.trim().toUpperCase(),
      nome_fantasia: formData.nome_fantasia.trim().toUpperCase() || formData.razao_social.trim().toUpperCase(),
      categoria_estabelecimento: formData.categoria_estabelecimento,
      quantidade_pontos: Number(formData.quantidade_pontos),
      locais_coleta: formData.locais_coleta,
      outro_local_especificado: formData.outro_local_especificado.trim(),
      declaracao_compromisso: true,
      taxa_ufm_total: taxaUfmTotal,
      status_solicitacao: 'AGUARDANDO PAGAMENTO',
      endereco: formData.endereco,
      numero_complemento: formData.numero_complemento,
      bairro: formData.bairro,
      cep: formData.cep,
      telefone: formData.telefone,
      email: formData.email,
      responsavel_contato: formData.responsavel_contato,
      observacoes: formData.observacoes,
      created_at: new Date().toISOString()
    };

    saveSolicitacaoPotabilidade(novaSolicitacao);

    if (onSaveProcesso) {
      try {
        const processoEquivalente = mapSolicitacaoToProcesso(novaSolicitacao);
        onSaveProcesso(processoEquivalente);
      } catch (err) {
        console.warn('Erro ao repassar processo de potabilidade:', err);
      }
    }

    setFeedbackMsg({
      tipo: 'sucesso',
      texto: `✅ Solicitação protocolada com sucesso! Protocolo 1Doc: ${novaSolicitacao.protocolo_1doc} • Taxa: ${novaSolicitacao.taxa_ufm_total.toFixed(2)} UFM (${novaSolicitacao.quantidade_pontos} ponto(s)).`
    });

    setSolicitacaoParaImprimir(novaSolicitacao);

    // Limpa campos mantendo valores padrão
    setFormData({
      categoria_estabelecimento: '',
      quantidade_pontos: 1,
      locais_coleta: [],
      outro_local_especificado: '',
      cnpj_cpf: '',
      razao_social: '',
      nome_fantasia: '',
      protocolo_1doc: `${Math.floor(60000 + Math.random() * 9000)}/${currentYear}`,
      endereco: '',
      numero_complemento: '',
      bairro: 'Centro',
      cep: '88330-000',
      telefone: '',
      email: '',
      responsavel_contato: '',
      observacoes: '',
      declaracao_compromisso: false
    });
  };

  // Exclusão de solicitação
  const handleExcluir = (id: string) => {
    if (confirm('Tem certeza de que deseja remover esta solicitação de laudo de potabilidade?')) {
      deleteSolicitacaoPotabilidade(id);
    }
  };

  // Filtro de solicitações no histórico
  const solicitacoesFiltradas = useMemo(() => {
    return solicitacoes.filter((s) => {
      const matchBusca =
        !buscaHistorico ||
        s.razao_social.toLowerCase().includes(buscaHistorico.toLowerCase()) ||
        s.cnpj_cpf.includes(buscaHistorico) ||
        (s.protocolo_1doc || '').includes(buscaHistorico) ||
        (s.bairro || '').toLowerCase().includes(buscaHistorico.toLowerCase());

      const matchStatus = filtroStatus === 'TODOS' || s.status_solicitacao === filtroStatus;

      return matchBusca && matchStatus;
    });
  }, [solicitacoes, buscaHistorico, filtroStatus]);

  // Impressão da Ficha Oficial
  const handleImprimirFicha = (sol: SolicitacaoLaudoPotabilidadeItem) => {
    setSolicitacaoParaImprimir(sol);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Sub-navegação do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h2 className="text-base font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
            <Droplet className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Solicitação de Laudo de Análise de Potabilidade da Água
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Formulário oficial para requisição de coleta sanitária e laudo de água para consumo humano.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubAba('formulario')}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase transition cursor-pointer flex items-center gap-1.5 ${
              subAba === 'formulario'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            Nova Solicitação
          </button>

          <button
            type="button"
            onClick={() => setSubAba('historico')}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase transition cursor-pointer flex items-center gap-1.5 ${
              subAba === 'historico'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Solicitações Realizadas ({solicitacoes.length})
          </button>

          <button
            type="button"
            onClick={handleSincronizarSupabase}
            disabled={syncingCloud}
            className="px-3 py-2 rounded-xl text-xs font-black uppercase transition cursor-pointer flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md disabled:opacity-50"
            title="Sincronizar com a Nuvem Supabase"
          >
            <ShieldCheck className={`w-4 h-4 ${syncingCloud ? 'animate-spin' : ''}`} />
            {syncingCloud ? 'Sincronizando...' : 'Sincronizar Nuvem'}
          </button>
        </div>
      </div>

      {/* Alerta de Sincronização Supabase */}
      {syncMsg && (
        <div className="p-3.5 rounded-xl border border-cyan-300 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/70 text-cyan-900 dark:text-cyan-100 text-xs font-bold flex items-center justify-between">
          <span>{syncMsg}</span>
          <button onClick={() => setSyncMsg(null)} className="text-cyan-600 hover:text-cyan-800 font-black ml-2">✕</button>
        </div>
      )}

      {/* Alerta de Feedback */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-bold ${
            feedbackMsg.tipo === 'sucesso'
              ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
              : 'bg-red-50 dark:bg-red-950/70 border-red-300 dark:border-red-800 text-red-900 dark:text-red-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{feedbackMsg.texto}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-600 text-sm font-black p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 1: FORMULÁRIO OFICIAL (FIEL À IMAGEM FORNECIDA PELO USUÁRIO) */}
      {/* ============================================================== */}
      {subAba === 'formulario' && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-md space-y-7">
          
          {/* 1. SELEÇÃO DE ESTABELECIMENTOS SUJEITOS À SOLICITAÇÃO DO LAUDO */}
          <div className="space-y-2">
            <label className="block text-sm font-black text-slate-800 dark:text-slate-100">
              Estabelecimentos sujeitos à solicitação do Laudo<span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                required
                value={formData.categoria_estabelecimento}
                onChange={(e) => setFormData({ ...formData, categoria_estabelecimento: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-cyan-500 focus:outline-none appearance-none cursor-pointer pr-10"
              >
                <option value="">- selecione -</option>
                {CATEGORIAS_ESTABELECIMENTOS.map((cat) => (
                  <option
                    key={cat.id}
                    value={`${cat.titulo}: ${cat.descricao}`}
                  >
                    {cat.titulo}: {cat.descricao}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            {/* Pré-visualização da categoria selecionada */}
            {formData.categoria_estabelecimento && (
              <div className="p-3 bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 rounded-xl text-xs text-cyan-900 dark:text-cyan-200">
                <span className="font-bold">Categoria Selecionada: </span>
                <span>{formData.categoria_estabelecimento}</span>
              </div>
            )}
          </div>

          {/* 2. TEXTO OFICIAL DE CIÊNCIA (CONFORME FOTO) */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            <h4 className="font-black uppercase text-slate-900 dark:text-white tracking-wide">
              Ciência:
            </h4>
            <p className="leading-relaxed text-justify">
              A Autoridade de Vigilância Sanitária poderá solicitar o Laudo de Análise de Potabilidade da Água para consumo humano em quaisquer estabelecimentos comerciais ou locais em que houver atividades econômicas ou não, sendo exercidas de forma discricionária, visando resguardar a Saúde Pública.
            </p>
          </div>

          {/* 3. QUANTIDADE DE PONTOS (LUGARES) DE COLETA */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="block text-sm font-black text-slate-800 dark:text-slate-100">
                Em quantos pontos (lugares) a água será coletada?<span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                de 1 a 10 pontos
              </span>
            </div>

            <div className="flex items-center gap-3">
              <select
                id="quantidade_pontos"
                name="quantidade_pontos"
                required
                value={formData.quantidade_pontos}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 1;
                  setFormData({ ...formData, quantidade_pontos: val });
                }}
                style={{ height: '38.4583px', width: '93.67px' }}
                className="shrink-0 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-2.5 text-sm font-black font-mono text-center text-slate-800 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none shadow-xs cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>

              <div className="flex-1 flex flex-wrap items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl text-xs text-amber-950 dark:text-amber-200">
                <Receipt className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Taxa Calculada: <strong className="font-mono font-black">{formData.quantidade_pontos} ponto(s) × 0,40 UFM = {taxaUfmTotal.toFixed(2)} UFM</strong>
                </span>
                <span className="text-[10px] text-amber-800 dark:text-amber-300">
                  (Cada ponto gerará 1 laudo oficial de análise físico-química e microbiológica)
                </span>
              </div>
            </div>
          </div>

          {/* 4. LOCAL DA COLETA (CHECKBOXES CONFORME FOTO) */}
          <div className="space-y-2.5">
            <label className="block text-sm font-black text-slate-800 dark:text-slate-100">
              Local da coleta<span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Selecione todos os pontos onde a água será captada para análise laboratorial:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {LOCAIS_COLETA_PADRAO.map((local) => {
                const isSelected = formData.locais_coleta.includes(local);
                return (
                  <label
                    key={local}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none text-xs ${
                      isSelected
                        ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-400 dark:border-cyan-600 text-cyan-950 dark:text-cyan-100 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleLocalColeta(local)}
                      className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 mt-0.5"
                    />
                    <span className="font-semibold leading-relaxed">{local}</span>
                  </label>
                );
              })}
            </div>

            {/* Campo extra quando "Outro tipo de ponto não especificado anteriormente" for marcado */}
            {formData.locais_coleta.includes('Outro tipo de ponto não especificado anteriormente') && (
              <div className="pt-2 animate-fadeIn">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Especifique detalhadamente o outro tipo de ponto:*
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Torneira do vestiário de funcionários, Chuveiro lava-olhos, Reservatório cisterna..."
                  value={formData.outro_local_especificado}
                  onChange={(e) => setFormData({ ...formData, outro_local_especificado: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-cyan-400 dark:border-cyan-600 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* 5. IDENTIFICAÇÃO DO ESTABELECIMENTO / REQUERENTE */}
          <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-600" />
                Dados do Estabelecimento & Requerente
              </h3>
              <span className="text-[11px] text-slate-500">
                Campos cadastrais para vinculação do Laudo Sanitário
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
              {/* CNPJ / CPF com botão de busca */}
              <div>
                <label className="block font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                  CNPJ / CPF *
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    required
                    placeholder="00.000.000/0000-00"
                    value={formData.cnpj_cpf}
                    onChange={(e) => setFormData({ ...formData, cnpj_cpf: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 font-mono font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleConsultarCnpj}
                    disabled={isLoadingCnpj}
                    title="Buscar na Receita Federal"
                    className="px-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-black uppercase text-[10px] transition cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isLoadingCnpj ? '...' : <Search className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Razão Social */}
              <div className="md:col-span-2">
                <label className="block font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Razão Social / Nome Oficial *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome empresarial conforme cartão CNPJ"
                  value={formData.razao_social}
                  onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 font-bold uppercase text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>

              {/* Nome Fantasia */}
              <div>
                <label className="block font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  placeholder="Nome comercial do local"
                  value={formData.nome_fantasia}
                  onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>

              {/* Protocolo 1Doc */}
              <div>
                <label className="block font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Protocolo 1Doc / Ano
                </label>
                <input
                  type="text"
                  placeholder="Ex: 60.455/2026"
                  value={formData.protocolo_1doc}
                  onChange={(e) => setFormData({ ...formData, protocolo_1doc: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 font-mono font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>

              {/* Responsável pelo Contato */}
              <div>
                <label className="block font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Responsável / Solicitante
                </label>
                <input
                  type="text"
                  placeholder="Nome de quem acompanhará a coleta"
                  value={formData.responsavel_contato}
                  onChange={(e) => setFormData({ ...formData, responsavel_contato: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>

              {/* Endereço */}
              <div className="md:col-span-2">
                <label className="block font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Endereço do Local de Coleta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Av./Rua, número, sala ou bloco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>

              {/* Bairro */}
              <div>
                <label className="block font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Bairro *
                </label>
                <select
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-cyan-500 outline-none"
                >
                  {BAIRROS_BC.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Telefone */}
              <div>
                <label className="block font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Telefone / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  placeholder="(47) 99999-9999"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>

              {/* E-mail */}
              <div className="md:col-span-2">
                <label className="block font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                  E-mail para Recebimento do Laudo *
                </label>
                <input
                  type="email"
                  required
                  placeholder="empresa@exemplo.com.br"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 6. DECLARAÇÃO DE COMPROMISSO (EXATAMENTE COMO NA FOTO) */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
              Declaração
            </h3>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Declaração de Compromisso<span className="text-red-500">*</span>:
              </label>

              <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 hover:bg-slate-100/80 dark:hover:bg-slate-900 transition cursor-pointer select-none text-xs text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  required
                  checked={formData.declaracao_compromisso}
                  onChange={(e) => setFormData({ ...formData, declaracao_compromisso: e.target.checked })}
                  className="w-5 h-5 rounded text-cyan-600 focus:ring-cyan-500 mt-0.5 shrink-0"
                />
                <span className="leading-relaxed text-justify">
                  Declaro estar ciente: <strong>a)</strong> Da obrigação de utilizar água potável para consumo humano em minhas atividades, cujo padrão de potabilidade é definido pelo Ministério da Saúde, devendo estar livre de contaminantes; <strong>b)</strong> Da necessidade de análises periódicas por laboratório capacitado, público ou privado, e do compromisso de manter laudos, bem como registros semestrais de limpeza dos reservatórios, à disposição da fiscalização; e, por fim, declaro saber que o descumprimento constitui infração sanitária, sujeitando o estabelecimento às penalidades cabíveis previstas em lei.
                </span>
              </label>
            </div>
          </div>

          {/* 7. ORIENTAÇÕES IMPORTANTES (CONFORME FOTO) */}
          <div className="p-4 sm:p-5 rounded-2xl border-2 border-amber-400/80 bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 space-y-2 text-xs">
            <h4 className="font-black uppercase tracking-wider flex items-center gap-2 text-amber-900 dark:text-amber-100">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              ORIENTAÇÕES IMPORTANTES:
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 font-bold leading-relaxed text-amber-900 dark:text-amber-200">
              <li>A COLETA DE ÁGUA É COBRADA POR PONTO COLETADO (0,40 UFM / PONTO).</li>
              <li>PARA CADA PONTO SERÁ EMITIDO UM LAUDO.</li>
              <li>O PONTO DE COLETA É O LUGAR EM QUE A COLETA DE ÁGUA SERÁ REALIZADA.</li>
              <li>O LAUDO SOMENTE É EMITIDO APÓS A QUITAÇÃO DA TAXA.</li>
              <li>RECOMENDA-SE QUE O REQUERENTE COMPARTILHE O COMPROVANTE DE PAGAMENTO DA TAXA NESTE PROTOCOLO.</li>
            </ol>
          </div>

          {/* 8. BOTÕES DE AÇÃO */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                if (confirm('Deseja realmente limpar todos os campos do formulário?')) {
                  setFormData({
                    categoria_estabelecimento: '',
                    quantidade_pontos: 1,
                    locais_coleta: [],
                    outro_local_especificado: '',
                    cnpj_cpf: '',
                    razao_social: '',
                    nome_fantasia: '',
                    protocolo_1doc: `${Math.floor(60000 + Math.random() * 9000)}/${currentYear}`,
                    endereco: '',
                    numero_complemento: '',
                    bairro: 'Centro',
                    cep: '88330-000',
                    telefone: '',
                    email: '',
                    responsavel_contato: '',
                    observacoes: '',
                    declaracao_compromisso: false
                  });
                }
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold uppercase transition cursor-pointer text-center"
            >
              Limpar Formulário
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              <span>Registrar Solicitação de Laudo</span>
            </button>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* ABA 2: HISTÓRICO DE SOLICITAÇÕES REALIZADAS                     */}
      {/* ============================================================== */}
      {subAba === 'historico' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden space-y-4 p-5">
          {/* Barra de Filtros */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por razão social, CNPJ ou protocolo..."
                value={buscaHistorico}
                onChange={(e) => setBuscaHistorico(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500">Status:</span>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="AGUARDANDO PAGAMENTO">Aguardando Pagamento</option>
                <option value="PAGO / AGUARDANDO COLETA">Pago / Aguardando Coleta</option>
                <option value="COLETA REALIZADA">Coleta Realizada</option>
                <option value="LAUDO EMITIDO">Laudo Emitido</option>
              </select>
            </div>
          </div>

          {/* Tabela de Solicitações */}
          {solicitacoesFiltradas.length === 0 ? (
            <div className="p-12 text-center text-slate-400 italic">
              Nenhuma solicitação encontrada para os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3">Protocolo / Data</th>
                    <th className="p-3">Estabelecimento / CNPJ</th>
                    <th className="p-3">Pontos & Locais de Coleta</th>
                    <th className="p-3 text-center">Taxa UFM</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {solicitacoesFiltradas.map((sol) => (
                    <tr
                      key={sol.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition"
                    >
                      {/* Protocolo / Data */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                          {sol.protocolo_1doc || '1Doc Pendente'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(sol.data_solicitacao).toLocaleDateString('pt-BR')}
                        </div>
                      </td>

                      {/* Estabelecimento / CNPJ */}
                      <td className="p-3">
                        <div className="font-bold text-slate-800 dark:text-white uppercase truncate max-w-xs" title={sol.razao_social}>
                          {sol.razao_social}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          CNPJ: {sol.cnpj_cpf} • {sol.bairro || 'BC'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">
                          📍 {sol.endereco}
                        </div>
                      </td>

                      {/* Pontos & Locais */}
                      <td className="p-3">
                        <div className="font-black text-slate-700 dark:text-slate-200">
                          {sol.quantidade_pontos} ponto(s) solicitado(s)
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 max-w-xs truncate" title={sol.locais_coleta.join(', ')}>
                          {sol.locais_coleta.join(' • ')}
                        </div>
                      </td>

                      {/* Taxa UFM */}
                      <td className="p-3 text-center whitespace-nowrap font-mono font-bold text-amber-600 dark:text-amber-400">
                        {sol.taxa_ufm_total.toFixed(2)} UFM
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            sol.status_solicitacao === 'LAUDO EMITIDO'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700'
                              : sol.status_solicitacao === 'PAGO / AGUARDANDO COLETA'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700'
                              : sol.status_solicitacao === 'COLETA REALIZADA'
                              ? 'bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-700'
                              : 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700'
                          }`}
                        >
                          {sol.status_solicitacao}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="p-3 text-center whitespace-nowrap space-x-1">
                        <button
                          type="button"
                          onClick={() => handleImprimirFicha(sol)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                          title="Imprimir Ficha Oficial de Solicitação"
                        >
                          <Printer className="w-3.5 h-3.5 inline" />
                        </button>

                        {onEnviarParaColeta && (
                          <button
                            type="button"
                            onClick={() => onEnviarParaColeta(sol)}
                            className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-950/80 hover:bg-cyan-200 text-cyan-800 dark:text-cyan-200 transition cursor-pointer"
                            title="Vincular diretamente a uma Coleta do Laboratório"
                          >
                            <Droplet className="w-3.5 h-3.5 inline" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleExcluir(sol.id)}
                          className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950/80 hover:bg-red-200 text-red-700 dark:text-red-300 transition cursor-pointer"
                          title="Excluir solicitação"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL / VISÃO DE IMPRESSÃO DA FICHA OFICIAL DE REQUISIÇÃO      */}
      {/* ============================================================== */}
      {solicitacaoParaImprimir && (
        <FichaSolicitacaoPotabilidadeModal
          solicitacao={solicitacaoParaImprimir}
          onClose={() => setSolicitacaoParaImprimir(null)}
        />
      )}
    </div>
  );
};

export interface FichaSolicitacaoPotabilidadeModalProps {
  solicitacao: SolicitacaoLaudoPotabilidadeItem | null;
  onClose: () => void;
}

export const FichaSolicitacaoPotabilidadeModal: React.FC<FichaSolicitacaoPotabilidadeModalProps> = ({
  solicitacao,
  onClose
}) => {
  if (!solicitacao) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl max-w-3xl w-full p-8 shadow-2xl space-y-5 text-left border border-slate-300 relative print:p-0 print:border-none print:shadow-none">
        {/* Botão Fechar (não impresso) */}
        <div className="flex justify-between items-center border-b pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-cyan-600" />
            <h3 className="font-black text-sm uppercase text-slate-800">
              Ficha Oficial de Solicitação de Laudo de Potabilidade
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Ficha
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold uppercase cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>

        {/* CABEÇALHO OFICIAL (TIMBRADO) */}
        <div className="text-center space-y-1 border-b pb-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
            MUNICÍPIO DE BALNEÁRIO CAMBORIÚ / SC
          </h2>
          <h3 className="text-xs font-black uppercase text-slate-700">
            SECRETARIA MUNICIPAL DE SAÚDE • DIRETORIA DE VIGILÂNCIA SANITÁRIA (DVIS)
          </h3>
          <p className="text-[11px] font-bold text-slate-600 uppercase">
            LABORATÓRIO DE ANÁLISE DE POTABILIDADE DA ÁGUA PARA CONSUMO HUMANO
          </p>
          <div className="pt-2">
            <span className="inline-block bg-slate-100 border border-slate-400 text-slate-900 text-xs font-black uppercase px-3 py-1 rounded">
              SOLICITAÇÃO DE LAUDO DE ANÁLISE DE POTABILIDADE DA ÁGUA
            </span>
          </div>
        </div>

        {/* DADOS DA SOLICITAÇÃO */}
        <div className="grid grid-cols-2 gap-3 text-xs border p-3 rounded-lg bg-slate-50">
          <div>
            <span className="font-bold text-slate-600 block">Protocolo 1Doc:</span>
            <span className="font-mono font-bold text-sm text-slate-900">
              {solicitacao.protocolo_1doc || 'S/N'}
            </span>
          </div>
          <div>
            <span className="font-bold text-slate-600 block">Data da Solicitação:</span>
            <span className="font-mono text-slate-900">
              {new Date(solicitacao.data_solicitacao).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <div className="col-span-2">
            <span className="font-bold text-slate-600 block">Categoria do Estabelecimento:</span>
            <span className="text-slate-900">{solicitacao.categoria_estabelecimento}</span>
          </div>
        </div>

        {/* DADOS DO REQUERENTE */}
        <div className="space-y-2 border p-3 rounded-lg text-xs">
          <h4 className="font-black uppercase text-slate-800 text-[11px] border-b pb-1">
            Identificação do Estabelecimento
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-bold text-slate-600 block">Razão Social:</span>
              <span className="font-bold uppercase text-slate-900">{solicitacao.razao_social}</span>
            </div>
            <div>
              <span className="font-bold text-slate-600 block">CNPJ / CPF:</span>
              <span className="font-mono font-bold text-slate-900">{solicitacao.cnpj_cpf}</span>
            </div>
            <div className="col-span-2">
              <span className="font-bold text-slate-600 block">Endereço da Coleta:</span>
              <span className="text-slate-900">{solicitacao.endereco} • Bairro: {solicitacao.bairro}</span>
            </div>
            <div>
              <span className="font-bold text-slate-600 block">Telefone:</span>
              <span className="text-slate-900">{solicitacao.telefone || '-'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-600 block">E-mail:</span>
              <span className="text-slate-900">{solicitacao.email || '-'}</span>
            </div>
          </div>
        </div>

        {/* PONTOS DE COLETA E TAXA */}
        <div className="space-y-2 border p-3 rounded-lg text-xs">
          <h4 className="font-black uppercase text-slate-800 text-[11px] border-b pb-1">
            Pontos de Coleta Solicitados & Cobrança de Taxa
          </h4>
          <div className="space-y-1">
            <p>
              <strong>Quantidade de Pontos:</strong> {solicitacao.quantidade_pontos} ponto(s)
            </p>
            <p>
              <strong>Taxa Municipal:</strong> {solicitacao.taxa_ufm_total.toFixed(2)} UFM (0,40 UFM por ponto coletado)
            </p>
            <div className="pt-1">
              <strong>Locais Selecionados:</strong>
              <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-slate-700">
                {solicitacao.locais_coleta.map((loc) => (
                  <li key={loc}>
                    {loc}
                    {loc === 'Outro tipo de ponto não especificado anteriormente' && solicitacao.outro_local_especificado && (
                      <span className="italic"> ({solicitacao.outro_local_especificado})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* DECLARAÇÃO DE COMPROMISSO ASSINADA */}
        <div className="border p-3 rounded-lg text-[10px] space-y-1 bg-slate-50 leading-relaxed text-justify">
          <p className="font-bold uppercase text-slate-800">Declaração de Compromisso Firmada:</p>
          <p>
            "Declaro estar ciente: a) Da obrigação de utilizar água potável para consumo humano em minhas atividades, cujo padrão de potabilidade é definido pelo Ministério da Saúde, devendo estar livre de contaminantes; b) Da necessidade de análises periódicas por laboratório capacitado, público ou privado, e do compromisso de manter laudos, bem como registros semestrais de limpeza dos reservatórios, à disposição da fiscalização; e, por fim, declaro saber que o descumprimento constitui infração sanitária, sujeitando o estabelecimento às penalidades cabíveis previstas em lei."
          </p>
        </div>

        {/* ORIENTAÇÕES */}
        <div className="text-[10px] space-y-1 text-slate-700">
          <p className="font-bold uppercase">Orientações:</p>
          <p>1. A coleta de água é cobrada por ponto coletado (0,40 UFM / ponto).</p>
          <p>2. Para cada ponto será emitido um laudo.</p>
          <p>3. O ponto de coleta é o lugar em que a coleta de água será realizada.</p>
          <p>4. O laudo somente é emitido após a quitação da taxa.</p>
          <p>5. Recomenda-se que o requerente compartilhe o comprovante de pagamento da taxa neste protocolo.</p>
        </div>

        {/* ASSINATURA */}
        <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
          <div className="border-t border-slate-400 pt-1">
            <p className="font-bold uppercase">{solicitacao.responsavel_contato || solicitacao.razao_social}</p>
            <p className="text-[10px] text-slate-500">Requerente / Responsável Legal</p>
          </div>
          <div className="border-t border-slate-400 pt-1">
            <p className="font-bold uppercase">VIGILÂNCIA SANITÁRIA - BC</p>
            <p className="text-[10px] text-slate-500">Autoridade Sanitária / Recebido em {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export interface SolicitacaoLaudoPotabilidadeModalProps extends SolicitacaoLaudoPotabilidadeModuleProps {
  isOpen: boolean;
}

export const SolicitacaoLaudoPotabilidadeModal: React.FC<SolicitacaoLaudoPotabilidadeModalProps> = ({
  isOpen,
  onClose,
  ...props
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl max-w-7xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[94vh] my-auto">
        <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 border-b border-cyan-500/30 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/30 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shrink-0">
              <Droplet className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-tight flex items-center gap-2 truncate">
                Solicitação de Laudo de Análise de Potabilidade da Água
                <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/50 px-2 py-0.5 rounded font-mono font-bold shrink-0">
                  1Doc / VISA BC
                </span>
              </h2>
              <p className="text-xs text-slate-300 truncate">
                Requisição oficial de laudo para análise laboratorial de reservatórios, poços e rede predial.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer shrink-0"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <SolicitacaoLaudoPotabilidadeModule
            {...props}
            isModal={true}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};

