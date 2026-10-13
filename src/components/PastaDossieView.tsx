import React, { useState, useMemo, useEffect } from 'react';
import {
  FolderArchive,
  Search,
  Building2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Microscope,
  Plus,
  Sparkles,
  Printer,
  ExternalLink,
  Calendar,
  MapPin,
  Phone,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  X,
  Check,
  FileSignature,
  Folder,
  Award,
  Hash,
  Layers,
  Tag,
  Eye,
  ArrowLeft,
  FileSpreadsheet,
  FileBox,
  BadgeCheck,
  FilePlus,
  Lock,
  Edit3
} from 'lucide-react';
import {
  PastaVisaItem,
  AlvaraSanitarioItem,
  ProcessoItem,
  FiscalizacaoItem,
  AmostraLaboratorioItem,
  UserProfile
} from '../types';
import { fetchCnpj } from '../lib/cnpjService';

interface PastaDossieViewProps {
  onBack: () => void;
  currentUser: UserProfile | null;
  pastas?: PastaVisaItem[];
  alvaras?: AlvaraSanitarioItem[];
  processos?: ProcessoItem[];
  fiscalizacoes?: FiscalizacaoItem[];
  amostrasLaboratorio?: AmostraLaboratorioItem[];
  onNavigate?: (view: string) => void;
  onSalvarNovaPasta?: (novaPasta: PastaVisaItem) => void;
}

export function PastaDossieView({
  onBack,
  currentUser,
  pastas: initialPastas = [],
  alvaras: initialAlvaras = [],
  processos = [],
  fiscalizacoes = [],
  amostrasLaboratorio = [],
  onNavigate,
  onSalvarNovaPasta
}: PastaDossieViewProps) {
  // Lista de Pastas (com fallback de localStorage)
  const [pastas, setPastas] = useState<PastaVisaItem[]>(() => {
    if (initialPastas && initialPastas.length > 0) return initialPastas;
    try {
      const saved = localStorage.getItem('visa_pastas_administrativo');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'pasta-seed-1',
        cnpj_cpf: '04.892.110/0001-22',
        pasta: 'PASTA 204/MILHO',
        razao_social: 'JOÃO BATISTA DA SILVA ME',
        status_rf: 'ATIVA',
        alvara_atualizado: 'SIM',
        setor: 'ALIMENTOS',
        observacoes: 'Arquivo Central • Estante B, Prateleira 3. Histórico completo de ambulante e quiosque volante.',
        criado_por: 'ADMINISTRATIVO',
        criado_em: '2026-01-10T09:00:00Z'
      },
      {
        id: 'pasta-seed-2',
        cnpj_cpf: '83.102.285/0001-07',
        pasta: 'PASTA 1042/2024',
        razao_social: 'MERCADO CENTRAL E DISTRIBUIDORA LTDA',
        status_rf: 'ATIVA',
        alvara_atualizado: 'SIM',
        setor: 'ALIMENTOS',
        observacoes: 'Arquivo Geral • Armário A, Gaveta 2. Laudos de potabilidade de água anexados semestralmente.',
        criado_por: 'ADMINISTRATIVO',
        criado_em: '2024-05-14T11:30:00Z'
      },
      {
        id: 'pasta-seed-3',
        cnpj_cpf: '04.223.119/0001-55',
        pasta: 'PASTA 890/2023',
        razao_social: 'FARMÁCIA E DROGARIA ATLÂNTICA ME',
        status_rf: 'ATIVA',
        alvara_atualizado: 'EM RENOVAÇÃO',
        setor: 'MEDICAMENTOS',
        observacoes: 'Arquivo Geral • Armário Medicamentos, Pasta Suspensa 14.',
        criado_por: 'ADMINISTRATIVO',
        criado_em: '2023-08-20T14:15:00Z'
      }
    ];
  });

  // Lista de Alvarás (com fallback de localStorage)
  const [alvaras] = useState<AlvaraSanitarioItem[]>(() => {
    if (initialAlvaras && initialAlvaras.length > 0) return initialAlvaras;
    try {
      const saved = localStorage.getItem('visa_alvaras_cadastrados');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'alv-seed-milho-2026',
        numero_alvara: 'ALV-2026/00142',
        ano_exercicio: '2026',
        tipo_alvara: 'RENOVAÇÃO',
        modelo_tipo: 'PONTO_MILHO_CHURROS',
        pasta: 'PASTA 204/MILHO',
        cnpj_cpf: '04.892.110/0001-22',
        razao_social: 'JOÃO BATISTA DA SILVA ME',
        nome_fantasia: 'MILHO & CHURRO DA BARRA',
        endereco: 'AVENIDA ATLÂNTICA (PONTO Nº 12)',
        numero: 'S/N',
        complemento: 'QUIOSQUE VOLANTE 12',
        bairro: 'CENTRO',
        municipio: 'Balneário Camboriú',
        cep: '88330-000',
        cnae_principal: '5612-1/00 - SERVIÇOS AMBULANTES DE ALIMENTAÇÃO',
        responsavel_tecnico: '',
        validade: '2027-03-31',
        data_emissao: '2026-03-10',
        status: 'ATIVO',
        setor: 'ALIMENTOS',
        codigo_autenticacao: 'BC-VISA-2026-MILHO-9A8B'
      },
      {
        id: 'alv-seed-milho-2025',
        numero_alvara: 'ALV-2025/00098',
        ano_exercicio: '2025',
        tipo_alvara: 'RENOVAÇÃO',
        modelo_tipo: 'PONTO_MILHO_CHURROS',
        pasta: 'PASTA 204/MILHO',
        cnpj_cpf: '04.892.110/0001-22',
        razao_social: 'JOÃO BATISTA DA SILVA ME',
        nome_fantasia: 'MILHO & CHURRO DA BARRA',
        endereco: 'AVENIDA ATLÂNTICA (PONTO Nº 12)',
        numero: 'S/N',
        complemento: 'QUIOSQUE VOLANTE 12',
        bairro: 'CENTRO',
        municipio: 'Balneário Camboriú',
        cep: '88330-000',
        cnae_principal: '5612-1/00 - SERVIÇOS AMBULANTES DE ALIMENTAÇÃO',
        responsavel_tecnico: '',
        validade: '2026-03-31',
        data_emissao: '2025-03-15',
        status: 'ATIVO',
        setor: 'ALIMENTOS',
        codigo_autenticacao: 'BC-VISA-2025-MILHO-4A1C'
      },
      {
        id: 'alv-seed-mercado-2026',
        numero_alvara: 'ALV-2026/00085',
        ano_exercicio: '2026',
        tipo_alvara: 'RENOVAÇÃO',
        modelo_tipo: 'GERAL',
        pasta: 'PASTA 1042/2024',
        cnpj_cpf: '83.102.285/0001-07',
        razao_social: 'MERCADO CENTRAL E DISTRIBUIDORA LTDA',
        nome_fantasia: 'SUPERMERCADO CENTRAL BC',
        endereco: '3ª AVENIDA',
        numero: '1250',
        bairro: 'CENTRO',
        municipio: 'Balneário Camboriú',
        cnae_principal: '4711-3/02 - COMÉRCIO VAREJISTA DE MERCADORIAS EM GERAL (SUPERMERCADOS)',
        validade: '2027-03-31',
        data_emissao: '2026-02-18',
        status: 'ATIVO',
        setor: 'ALIMENTOS',
        codigo_autenticacao: 'BC-VISA-2026-MERC-88F1'
      }
    ];
  });

  // Pasta Ativa Selecionada
  const [selectedPastaId, setSelectedPastaId] = useState<string>(() => {
    return pastas[0]?.id || '';
  });

  // Busca e Filtros
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [setorFiltro, setSetorFiltro] = useState<string>('TODOS');

  // Aba Ativa do Dossiê
  const [activeTab, setActiveTab] = useState<
    'timeline' | 'alvaras' | 'processos' | 'fiscalizacoes' | 'laboratorio' | 'cadastro' | 'arquivo'
  >('timeline');

  // Modal: Criar Nova Pasta com Gerador Sequencial
  const [modalNovaPastaOpen, setModalNovaPastaOpen] = useState(false);
  const [novoCnpj, setNovoCnpj] = useState('');
  const [novoNumeroPasta, setNovoNumeroPasta] = useState('');
  const [novaRazao, setNovaRazao] = useState('');
  const [novoSetor, setNovoSetor] = useState('ALIMENTOS');
  const [novoArmario, setNovoArmario] = useState('ARMÁRIO A');
  const [novaGaveta, setNovaGaveta] = useState('GAVETA 1');
  const [novasObs, setNovasObs] = useState('');
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [avisoDuplicidade, setAvisoDuplicidade] = useState<string | null>(null);

  // Pasta ativa atual
  const activePasta = useMemo(() => {
    return pastas.find((p) => p.id === selectedPastaId) || pastas[0] || null;
  }, [pastas, selectedPastaId]);

  // Limpa caracteres especiais do CNPJ para cruzamento perfeito
  const cleanDoc = (doc?: string) => (doc || '').replace(/\D/g, '');

  const activeCnpjClean = useMemo(() => {
    return cleanDoc(activePasta?.cnpj_cpf);
  }, [activePasta]);

  // 1. HISTÓRICO DE ALVARÁS DO CNPJ
  const historicoAlvaras = useMemo(() => {
    if (!activeCnpjClean) return [];
    return alvaras.filter((a) => {
      const c1 = cleanDoc(a.cnpj_cpf);
      const pastaMatch = activePasta?.pasta && a.pasta && a.pasta.toUpperCase() === activePasta.pasta.toUpperCase();
      return (c1 && c1 === activeCnpjClean) || pastaMatch;
    });
  }, [alvaras, activeCnpjClean, activePasta]);

  // 2. HISTÓRICO DE PROCESSOS DO CNPJ
  const historicoProcessos = useMemo(() => {
    if (!activeCnpjClean) return [];
    return processos.filter((p) => {
      const c1 = cleanDoc(p.cnpj_cpf);
      const pastaMatch = activePasta?.pasta && p.pasta && p.pasta.toUpperCase() === activePasta.pasta.toUpperCase();
      return (c1 && c1 === activeCnpjClean) || pastaMatch;
    });
  }, [processos, activeCnpjClean, activePasta]);

  // 3. HISTÓRICO DE FISCALIZAÇÕES DO CNPJ
  const historicoFiscalizacoes = useMemo(() => {
    if (!activeCnpjClean) return [];
    return fiscalizacoes.filter((f) => {
      const c1 = cleanDoc(f.estabelecimento?.cnpjCpf);
      const procMatch = f.numProcesso && historicoProcessos.some((p) => p.num_processo === f.numProcesso || p.prot_1doc === f.numProcesso);
      return (c1 && c1 === activeCnpjClean) || procMatch;
    });
  }, [fiscalizacoes, activeCnpjClean, historicoProcessos]);

  // 4. HISTÓRICO DE LABORATÓRIO DO CNPJ
  const historicoLaboratorio = useMemo(() => {
    if (!activeCnpjClean) return [];
    return amostrasLaboratorio.filter((a) => {
      const c1 = cleanDoc(a.cnpj_cpf);
      const nomeMatch = activePasta?.razao_social && a.interessado && a.interessado.toLowerCase().includes(activePasta.razao_social.toLowerCase().slice(0, 10));
      return (c1 && c1 === activeCnpjClean) || nomeMatch;
    });
  }, [amostrasLaboratorio, activeCnpjClean, activePasta]);

  // 5. TIMELINE UNIFICADA 360° (CRUZAMENTO CRONOLÓGICO)
  interface TimelineEvent {
    id: string;
    tipo: 'ALVARA' | 'PROCESSO' | 'VISTORIA' | 'LABORATORIO';
    titulo: string;
    subtitulo: string;
    data: string; // YYYY-MM-DD ou data legível
    statusBadge: string;
    statusColor: string;
    detalhes: string;
    responsavel?: string;
  }

  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];

    // Adiciona Alvarás
    historicoAlvaras.forEach((a) => {
      events.push({
        id: `alv-${a.id}`,
        tipo: 'ALVARA',
        titulo: `Alvará Sanitário ${a.numero_alvara || 'Oficial'}`,
        subtitulo: `Exercício ${a.ano_exercicio} • Modelo: ${a.modelo_tipo || 'Geral'}`,
        data: a.data_emissao || a.validade || '2026-01-01',
        statusBadge: a.status,
        statusColor: a.status === 'ATIVO' ? 'bg-emerald-500' : 'bg-amber-500',
        detalhes: `Validade: ${a.validade || '31/03/2027'} • Autenticação: ${a.codigo_autenticacao || 'VALIDADO'}`,
        responsavel: a.fiscal_emissor || 'DIVISÃO DVIS'
      });
    });

    // Adiciona Processos
    historicoProcessos.forEach((p) => {
      const ultimoParecer = p.pareceres && p.pareceres.length > 0 ? p.pareceres[p.pareceres.length - 1] : null;
      events.push({
        id: `proc-${p.id}`,
        tipo: 'PROCESSO',
        titulo: `Processo nº ${p.num_processo || p.prot_1doc || '1Doc'}`,
        subtitulo: p.assunto || 'Licenciamento / Renovação Sanitária',
        data: p.data_protocolo || p.data_entrada || p.data_1doc || '2026-01-01',
        statusBadge: p.status,
        statusColor: p.status === 'DEFERIDO' ? 'bg-blue-500' : 'bg-indigo-500',
        detalhes: ultimoParecer
          ? `Parecer (${ultimoParecer.tipo_parecer}): ${ultimoParecer.parecer_texto?.slice(0, 100)}...`
          : `Distribuído para: ${p.fiscal_responsavel || 'Aguardando atribuição'}`,
        responsavel: p.fiscal_responsavel || 'Setor Protocolo'
      });
    });

    // Adiciona Fiscalizações
    historicoFiscalizacoes.forEach((f) => {
      events.push({
        id: `fisc-${f.id}`,
        tipo: 'VISTORIA',
        titulo: `Vistoria Sanitária • Termo ${f.protocolo}`,
        subtitulo: `Tipo: ${f.tipoVistoria} • Risco: ${f.risco}`,
        data: f.dataHora ? f.dataHora.slice(0, 10) : '2026-01-01',
        statusBadge: f.status,
        statusColor: f.status === 'CONFORME' ? 'bg-emerald-500' : 'bg-rose-500',
        detalhes: f.medidasAdotadas
          ? `Medidas: ${f.medidasAdotadas} • Obs: ${f.observacoesFiscais?.slice(0, 90) || 'Sem observações'}`
          : `Fiscal responsável: ${f.fiscalNome}`,
        responsavel: f.fiscalNome
      });
    });

    // Adiciona Laboratório
    historicoLaboratorio.forEach((l) => {
      events.push({
        id: `lab-${l.id}`,
        tipo: 'LABORATORIO',
        titulo: `Análise Laboratorial • Amostra ${l.codigo_amostra || l.protocolo}`,
        subtitulo: `Matriz: ${l.tipo_matriz || 'Água Potável'} • Local: ${l.local_coleta}`,
        data: l.data_coleta || l.data_resultado || '2026-01-01',
        statusBadge: l.status,
        statusColor: l.status === 'CONFORME' ? 'bg-cyan-500' : 'bg-amber-500',
        detalhes: `pH: ${l.ph || '7.0'} • Cloro: ${l.cloro || '1.5mg/L'} • Coliformes: ${l.coliformes_totais || 'Ausente'} • Laudo: ${l.conclusao_laudo?.slice(0, 80) || 'Em análise'}`,
        responsavel: l.laboratorialista || l.fiscal_coletor
      });
    });

    // Ordena decrescente por data
    return events.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  }, [historicoAlvaras, historicoProcessos, historicoFiscalizacoes, historicoLaboratorio]);

  // Lista de Pastas filtradas na busca
  const pastasFiltradas = useMemo(() => {
    return pastas.filter((p) => {
      if (setorFiltro !== 'TODOS' && p.setor !== setorFiltro) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.pasta.toLowerCase().includes(q) ||
        p.razao_social.toLowerCase().includes(q) ||
        p.cnpj_cpf.includes(q)
      );
    });
  }, [pastas, searchQuery, setorFiltro]);

  // FUNÇÃO: GERADOR SEQUENCIAL DE PRÓXIMA PASTA (Ideia 2)
  const handleGerarProximoNumeroPasta = () => {
    // Procura por números existentes nas pastas
    let maxNum = 0;
    pastas.forEach((p) => {
      const match = p.pasta.match(/(\d+)/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum && n < 99999) maxNum = n;
      }
    });

    const proximo = maxNum > 0 ? maxNum + 1 : 1001;
    const anoAtual = new Date().getFullYear();
    setNovoNumeroPasta(`PASTA ${proximo}/${anoAtual}`);
  };

  // FUNÇÃO: CONSULTA CNPJ AUTOMÁTICA NA RECEITA FEDERAL
  const handleConsultarCnpj = async () => {
    const raw = cleanDoc(novoCnpj);
    if (raw.length !== 14 && raw.length !== 11) {
      alert('Informe um CNPJ válido com 14 dígitos ou CPF com 11 dígitos.');
      return;
    }

    // Verifica duplicidade com pastas existentes
    const jaExiste = pastas.find((p) => cleanDoc(p.cnpj_cpf) === raw);
    if (jaExiste) {
      setAvisoDuplicidade(
        `⚠️ Atenção: Este documento já possui a pasta física "${jaExiste.pasta}" (${jaExiste.razao_social}) no arquivo!`
      );
    } else {
      setAvisoDuplicidade(null);
    }

    if (raw.length === 14) {
      setBuscandoCnpj(true);
      try {
        const dados = await fetchCnpj(raw);
        if (dados) {
          setNovaRazao(dados.razao || dados.nome_fantasia || '');
          if (!novoNumeroPasta) {
            handleGerarProximoNumeroPasta();
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setBuscandoCnpj(false);
      }
    }
  };

  // Salvar Nova Pasta
  const handleSalvarNovaPasta = () => {
    if (!novoCnpj.trim() || !novoNumeroPasta.trim()) {
      alert('Preencha o CNPJ/CPF e o Número da Pasta.');
      return;
    }

    const nova: PastaVisaItem = {
      id: 'pasta-' + Date.now(),
      cnpj_cpf: novoCnpj.trim(),
      pasta: novoNumeroPasta.trim(),
      razao_social: novaRazao.trim() || 'ESTABELECIMENTO CADASTRADO',
      status_rf: 'ATIVA',
      alvara_atualizado: 'SIM',
      setor: novoSetor,
      observacoes: `${novoArmario} • ${novaGaveta}. ${novasObs}`.trim(),
      criado_por: currentUser?.nome_completo || 'ADMINISTRATIVO',
      criado_em: new Date().toISOString()
    };

    const atualizadas = [nova, ...pastas];
    setPastas(atualizadas);
    localStorage.setItem('visa_pastas_administrativo', JSON.stringify(atualizadas));
    if (onSalvarNovaPasta) onSalvarNovaPasta(nova);

    setSelectedPastaId(nova.id);
    setModalNovaPastaOpen(false);
    // Limpa campos
    setNovoCnpj('');
    setNovoNumeroPasta('');
    setNovaRazao('');
    setNovasObs('');
    setAvisoDuplicidade(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-2 sm:p-4 space-y-4 font-sans text-left">
      
      {/* ========================================================= */}
      {/* 1. CABEÇALHO DO MÓDULO DOSSIÊ / TESTE PASTA              */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer shrink-0"
            title="Voltar ao Portal Principal"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/30 px-2.5 py-0.5 rounded-full">
                Prontuário Sanitário Único 360°
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                Arquivo Municipal DVIS
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mt-1 flex items-center gap-2">
              <FolderArchive className="w-6 h-6 text-purple-400" />
              Dossiê Integrado da Pasta VISA
            </h1>
            <p className="text-xs text-slate-300">
              Histórico unificado do CNPJ: alvarás anuais, processos 1Doc, termos de fiscalização, laudos laboratoriais e arquivo físico.
            </p>
          </div>
        </div>

        {/* Botões de Ação Rápida no Topo */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              handleGerarProximoNumeroPasta();
              setModalNovaPastaOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl shadow flex items-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova Pasta (Sequencial)
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-black text-xs uppercase px-3.5 py-2.5 rounded-xl shadow flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
            title="Imprimir Prontuário Oficial do Estabelecimento"
          >
            <Printer className="w-4 h-4" />
            Imprimir Dossiê
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. BARRA DE BUSCA INTELIGENTE & SELEÇÃO DE PASTAS        */}
      {/* ========================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por CNPJ, Razão Social ou Número da Pasta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-bold"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={setorFiltro}
            onChange={(e) => setSetorFiltro(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
          >
            <option value="TODOS">Todos os Setores</option>
            <option value="ALIMENTOS">Alimentos</option>
            <option value="SAÚDE">Saúde</option>
            <option value="MEDICAMENTOS">Medicamentos</option>
            <option value="SERVIÇOS">Serviços</option>
            <option value="FEIRAS">Feiras</option>
          </select>

          {/* Seletor Rápido de Pasta Ativa */}
          <select
            value={selectedPastaId}
            onChange={(e) => setSelectedPastaId(e.target.value)}
            className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 rounded-xl px-3 py-2 text-xs font-black outline-none cursor-pointer max-w-[220px] truncate"
            title="Selecione a Pasta para visualizar o histórico"
          >
            {pastasFiltradas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.pasta} • {p.razao_social}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. HERO CARD DO ESTABELECIMENTO (RESUMO EXECUTIVO DO CNPJ) */}
      {/* ========================================================= */}
      {activePasta ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Bloco de Identificação */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex flex-col items-center justify-center font-black shadow-lg shadow-purple-500/20 shrink-0">
                <FolderArchive className="w-7 h-7" />
                <span className="text-[9px] uppercase tracking-tighter mt-0.5">Dossiê</span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                    {activePasta.pasta}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    RF: {activePasta.status_rf || 'ATIVA'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                    Setor: {activePasta.setor}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    Alvará: {activePasta.alvara_atualizado}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase mt-1">
                  {activePasta.razao_social}
                </h2>

                <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                  <span>CNPJ/CPF: <strong>{activePasta.cnpj_cpf}</strong></span>
                  <span>•</span>
                  <span>Arquivo: {activePasta.observacoes || 'Arquivo Geral VISA BC'}</span>
                </p>
              </div>
            </div>

            {/* Ações Diretas Integradas (Ideia 4: Do Dossiê para Alvará e Fiscalização) */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('alvara_visa')}
                className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs uppercase px-3.5 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                title="Emitir ou Renovar Alvará Sanitário para este CNPJ"
              >
                <FileSignature className="w-4 h-4" />
                Emitir / Renovar Alvará
              </button>

              <button
                type="button"
                onClick={() => onNavigate && onNavigate('fiscalizacao')}
                className="bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-black text-xs uppercase px-3.5 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                title="Iniciar Vistoria In Loco para este Estabelecimento"
              >
                <ShieldCheck className="w-4 h-4" />
                Nova Vistoria
              </button>

              <button
                type="button"
                onClick={() => onNavigate && onNavigate('demandas_fiscal')}
                className="bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 font-black text-xs uppercase px-3.5 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                title="Visualizar Demandas e Processos"
              >
                <FileText className="w-4 h-4" />
                Processos 1Doc
              </button>
            </div>

          </div>

          {/* Cards Rápidos de Indicadores do CNPJ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <p className="text-[10px] font-black uppercase text-slate-400">Alvarás Emitidos</p>
              <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {historicoAlvaras.length} {historicoAlvaras.length === 1 ? 'ano' : 'anos'}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <p className="text-[10px] font-black uppercase text-slate-400">Processos 1Doc</p>
              <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {historicoProcessos.length} registros
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <p className="text-[10px] font-black uppercase text-slate-400">Vistorias Realizadas</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {historicoFiscalizacoes.length} termos
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <p className="text-[10px] font-black uppercase text-slate-400">Laudos Laboratório</p>
              <p className="text-xl font-black text-cyan-600 dark:text-cyan-400 mt-0.5">
                {historicoLaboratorio.length} amostras
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center text-slate-500">
          Nenhuma pasta selecionada.
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. ABAS DO DOSSIÊ SANITÁRIO (HISTÓRICO COMPLETO 360°)     */}
      {/* ========================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
        
        {/* Barra de Abas */}
        <div className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-xs font-black uppercase">
          
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`px-3.5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'timeline'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            Linha do Tempo 360° ({timelineEvents.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('alvaras')}
            className={`px-3.5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'alvaras'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <FileSignature className="w-4 h-4" />
            Alvarás Sanitários ({historicoAlvaras.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('processos')}
            className={`px-3.5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'processos'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Processos & 1Doc ({historicoProcessos.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fiscalizacoes')}
            className={`px-3.5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'fiscalizacoes'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Vistorias & Termos ({historicoFiscalizacoes.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('laboratorio')}
            className={`px-3.5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'laboratorio'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Microscope className="w-4 h-4" />
            Laboratório & Água ({historicoLaboratorio.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cadastro')}
            className={`px-3.5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'cadastro'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Ficha Cadastral & CNAE
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('arquivo')}
            className={`px-3.5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'arquivo'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <FileBox className="w-4 h-4" />
            Arquivo Físico & Localização
          </button>

        </div>

        {/* Conteúdo das Abas */}
        <div className="p-4 sm:p-6 text-left">
          
          {/* ========================================================= */}
          {/* ABA 1: TIMELINE 360° (LINHA DO TEMPO CRONOLÓGICA)        */}
          {/* ========================================================= */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    Histórico Cronológico Geral do Estabelecimento
                  </h3>
                  <p className="text-xs text-slate-500">
                    Todos os atos sanitários ordenados do mais recente ao mais antigo.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-400 font-mono">
                  {timelineEvents.length} eventos registrados
                </span>
              </div>

              {timelineEvents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Clock className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-bold uppercase">Nenhum evento registrado para este documento ainda.</p>
                  <p className="text-[11px] text-slate-500">
                    Conforme novos alvarás, vistorias e processos forem criados com este CNPJ, eles aparecerão aqui automaticamente.
                  </p>
                </div>
              ) : (
                <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-2 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {timelineEvents.map((ev) => (
                    <div key={ev.id} className="relative group">
                      
                      {/* Ponto / Ícone na linha vertical */}
                      <div className={`absolute -left-6 sm:-left-8 top-1 w-5 h-5 rounded-full ${ev.statusColor} border-4 border-white dark:border-slate-900 shadow flex items-center justify-center`} />

                      {/* Card do Evento */}
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 hover:border-purple-400 transition space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                              {ev.tipo}
                            </span>
                            <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase">
                              {ev.titulo}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-500">
                              {ev.data}
                            </span>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                              {ev.statusBadge}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                          {ev.subtitulo}
                        </p>

                        <p className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          {ev.detalhes}
                        </p>

                        {ev.responsavel && (
                          <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-purple-500" />
                            Responsável / Fiscal: {ev.responsavel}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 2: HISTÓRICO DE ALVARÁS SANITÁRIOS                   */}
          {/* ========================================================= */}
          {activeTab === 'alvaras' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
                    <FileSignature className="w-4 h-4 text-indigo-600" />
                    Alvarás Sanitários Emitidos ao Longo dos Exercícios
                  </h3>
                  <p className="text-xs text-slate-500">
                    Histórico de licenças sanitárias ativas, renovações e anos anteriores vinculados à pasta.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('alvara_visa')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-3.5 py-1.5 rounded-xl uppercase flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Emitir Novo Alvará
                </button>
              </div>

              {historicoAlvaras.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <FileSignature className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-bold uppercase">Nenhum alvará vinculado a este documento.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {historicoAlvaras.map((alv) => (
                    <div
                      key={alv.id}
                      className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-indigo-600 dark:text-indigo-400 font-mono">
                          {alv.numero_alvara}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          {alv.status}
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        <p><strong>Exercício:</strong> {alv.ano_exercicio} • <strong>Tipo:</strong> {alv.tipo_alvara}</p>
                        <p><strong>Modelo:</strong> {alv.modelo_tipo || 'Geral'}</p>
                        <p><strong>Validade da Licença:</strong> {alv.validade || '31/03/2027'}</p>
                        <p className="text-slate-500 font-mono text-[11px]">
                          Autenticação: {alv.codigo_autenticacao || 'VALIDADO'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">
                          Emissão: {alv.data_emissao || 'Oficial'}
                        </span>
                        <button
                          type="button"
                          onClick={() => onNavigate && onNavigate('alvara_visa')}
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver no Módulo de Alvará
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 3: PROCESSOS E PROTOCOLOS 1DOC                       */}
          {/* ========================================================= */}
          {activeTab === 'processos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Processos Administrativos e Protocolos 1Doc
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tramitações, requerimentos e defesas vinculadas a este CNPJ.
                  </p>
                </div>
              </div>

              {historicoProcessos.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-bold uppercase">Nenhum processo administrativo localizado para este CNPJ.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historicoProcessos.map((proc) => (
                    <div
                      key={proc.id}
                      className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-blue-600 dark:text-blue-400 font-mono">
                            Proc. {proc.num_processo || proc.prot_1doc}
                          </span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            {proc.status}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                          Data: {proc.data_protocolo || proc.data_1doc || '2026'}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {proc.assunto || 'Requerimento Geral de Vigilância Sanitária'}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-500 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <p><strong>Fiscal:</strong> {proc.fiscal_responsavel || 'Não distribuído'}</p>
                        <p><strong>Setor:</strong> {proc.setor || 'Geral'}</p>
                        <p><strong>Grau de Risco:</strong> {proc.grau_risco || 'MÉDIO RISCO'}</p>
                      </div>

                      {proc.pareceres && proc.pareceres.length > 0 && (
                        <div className="text-xs bg-blue-50/60 dark:bg-blue-950/30 p-2.5 rounded-xl border border-blue-200 dark:border-blue-900">
                          <p className="font-bold text-blue-800 dark:text-blue-300">
                            Último Parecer ({proc.pareceres[proc.pareceres.length - 1].tipo_parecer}):
                          </p>
                          <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                            {proc.pareceres[proc.pareceres.length - 1].parecer_texto}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 4: FISCALIZAÇÕES E VISTORIAS IN LOCO                 */}
          {/* ========================================================= */}
          {activeTab === 'fiscalizacoes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Histórico de Vistorias e Fiscalizações Sanitárias
                  </h3>
                  <p className="text-xs text-slate-500">
                    Termos de inspeção, autos de infração, intimações e relatórios técnicos.
                  </p>
                </div>
              </div>

              {historicoFiscalizacoes.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <ShieldCheck className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-bold uppercase">Nenhuma vistoria de campo vinculada a este CNPJ.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historicoFiscalizacoes.map((fisc) => (
                    <div
                      key={fisc.id}
                      className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                            Termo #{fisc.protocolo}
                          </span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            {fisc.status}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {fisc.tipoVistoria}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                          {fisc.dataHora}
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        <p><strong>Fiscal Responsável:</strong> {fisc.fiscalNome}</p>
                        <p><strong>Risco Sanitário:</strong> {fisc.risco}</p>
                        {fisc.medidasAdotadas && (
                          <p className="text-emerald-700 dark:text-emerald-400">
                            <strong>Medidas Adotadas:</strong> {fisc.medidasAdotadas}
                          </p>
                        )}
                        {fisc.irregularidadesEncontradas && fisc.irregularidadesEncontradas.length > 0 && (
                          <p className="text-rose-600 dark:text-rose-400">
                            <strong>Irregularidades:</strong> {fisc.irregularidadesEncontradas.join(', ')}
                          </p>
                        )}
                      </div>

                      {fisc.observacoesFiscais && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <strong>Relatório do Fiscal:</strong> {fisc.observacoesFiscais}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 5: LABORATÓRIO E ANÁLISES DE ÁGUA / ALIMENTOS        */}
          {/* ========================================================= */}
          {activeTab === 'laboratorio' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
                    <Microscope className="w-4 h-4 text-cyan-600" />
                    Histórico Laboratorial & Controle de Potabilidade
                  </h3>
                  <p className="text-xs text-slate-500">
                    Amostras de água, parâmetros físico-químicos e ensaios microbiológicos.
                  </p>
                </div>
              </div>

              {historicoLaboratorio.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Microscope className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-bold uppercase">Nenhuma amostra de laboratório cadastrada para este estabelecimento.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historicoLaboratorio.map((lab) => (
                    <div
                      key={lab.id}
                      className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-cyan-600 dark:text-cyan-400 font-mono">
                            Amostra #{lab.codigo_amostra || lab.protocolo}
                          </span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
                            {lab.status}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                          Coleta: {lab.data_coleta} {lab.hora_coleta}
                        </span>
                      </div>

                      <p className="text-xs font-bold">
                        Local da Coleta: {lab.local_coleta} ({lab.bairro})
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase">pH Medido</span>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{lab.ph || '-'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase">Cloro Residual</span>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{lab.cloro ? `${lab.cloro} mg/L` : '-'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase">Turbidez</span>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{lab.turbidez ? `${lab.turbidez} uT` : '-'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase">Coliformes</span>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{lab.coliformes_totais || 'AUSENTE'}</p>
                        </div>
                      </div>

                      {lab.conclusao_laudo && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 bg-cyan-50/50 dark:bg-cyan-950/20 p-2.5 rounded-xl border border-cyan-200 dark:border-cyan-900">
                          <strong>Conclusão do Laudo:</strong> {lab.conclusao_laudo}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 6: FICHA CADASTRAL & CNAES                           */}
          {/* ========================================================= */}
          {activeTab === 'cadastro' && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  Ficha Cadastral e Dados Econômicos (Receita Federal & Município)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <h4 className="font-black uppercase text-slate-700 dark:text-slate-300">Identificação Jurídica</h4>
                  <p><strong>Razão Social:</strong> {activePasta.razao_social}</p>
                  <p><strong>CNPJ / CPF:</strong> {activePasta.cnpj_cpf}</p>
                  <p><strong>Situação na Receita Federal:</strong> <span className="text-emerald-600 font-bold">{activePasta.status_rf || 'ATIVA'}</span></p>
                  <p><strong>Setor Sanitário:</strong> {activePasta.setor}</p>
                  <p><strong>Alvará Atualizado:</strong> {activePasta.alvara_atualizado}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <h4 className="font-black uppercase text-slate-700 dark:text-slate-300">Localização e Registro</h4>
                  <p><strong>Município:</strong> Balneário Camboriú - SC</p>
                  <p><strong>Pasta Física no Arquivo:</strong> {activePasta.pasta}</p>
                  <p><strong>Data de Cadastro na VISA:</strong> {activePasta.criado_em ? new Date(activePasta.criado_em).toLocaleDateString('pt-BR') : 'Histórico'}</p>
                  <p><strong>Cadastrado por:</strong> {activePasta.criado_por || 'ADMINISTRATIVO'}</p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 7: GESTÃO DO ARQUIVO FÍSICO (LOCALIZAÇÃO & ANEXOS)   */}
          {/* ========================================================= */}
          {activeTab === 'arquivo' && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
                  <FileBox className="w-4 h-4 text-purple-600" />
                  Gestão do Arquivo Físico Municipal da VISA
                </h3>
                <p className="text-xs text-slate-500">
                  Controle de localização da pasta de papel e documentos arquivados.
                </p>
              </div>

              <div className="bg-purple-50/60 dark:bg-purple-950/20 p-5 rounded-2xl border border-purple-200 dark:border-purple-800/60 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black">
                    <Folder className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black uppercase text-purple-900 dark:text-purple-200 text-sm">
                      {activePasta.pasta}
                    </h4>
                    <p className="text-xs text-purple-700 dark:text-purple-300">
                      Localização Física: <strong>{activePasta.observacoes || 'Arquivo Central DVIS'}</strong>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-purple-100 dark:border-purple-900">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Estado de Conservação</span>
                    <p className="font-black text-slate-800 dark:text-slate-200 mt-0.5">Em Bom Estado • Ativa</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-purple-100 dark:border-purple-900">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Digitalização dos Autos</span>
                    <p className="font-black text-emerald-600 dark:text-emerald-400 mt-0.5">Parcialmente Digitalizada</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-purple-100 dark:border-purple-900">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Descarte / Temporalidade</span>
                    <p className="font-black text-slate-800 dark:text-slate-200 mt-0.5">Guarda Permanente (Ativa)</p>
                  </div>
                </div>
              </div>

              {/* Lista de Documentos Anexos Arquivados na Pasta Física */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                  Documentos Essenciais no Arquivo Físico
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span>📄 Contrato Social / Requerimento de Empresário</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span>📄 Cópia do Comprovante de Inscrição no CNPJ</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span>📄 Comprovante de Taxa Sanitária (TMI)</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span>📄 Termos e Relatórios Fiscais Anteriores</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. MODAL: CRIAR NOVA PASTA COM GERADOR SEQUENCIAL         */}
      {/* ========================================================= */}
      {modalNovaPastaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden text-left">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black uppercase text-base text-white">
                    Cadastrar Nova Pasta Sanitária
                  </h3>
                  <p className="text-xs text-slate-300">
                    Gera a pasta física oficial vinculada a um CNPJ ou CPF
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNovaPastaOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              
              {/* Aviso de Duplicidade em Tempo Real */}
              {avisoDuplicidade && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="font-bold">{avisoDuplicidade}</span>
                </div>
              )}

              {/* Campo 1: CNPJ / CPF */}
              <div className="space-y-1">
                <label className="font-black uppercase text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>1. CNPJ ou CPF do Estabelecimento</span>
                  <span className="text-purple-600 dark:text-purple-400 font-bold cursor-pointer" onClick={handleConsultarCnpj}>
                    {buscandoCnpj ? 'Buscando...' : '🔍 Consultar Receita'}
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00 ou 000.000.000-00"
                    value={novoCnpj}
                    onChange={(e) => {
                      setNovoCnpj(e.target.value);
                      if (avisoDuplicidade) setAvisoDuplicidade(null);
                    }}
                    onBlur={handleConsultarCnpj}
                    className="flex-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleConsultarCnpj}
                    disabled={buscandoCnpj}
                    className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black uppercase text-xs transition cursor-pointer"
                  >
                    OK
                  </button>
                </div>
              </div>

              {/* Campo 2: Razão Social */}
              <div className="space-y-1">
                <label className="font-black uppercase text-slate-700 dark:text-slate-300">
                  2. Razão Social / Nome da Pessoa Física
                </label>
                <input
                  type="text"
                  placeholder="Nome empresarial completo..."
                  value={novaRazao}
                  onChange={(e) => setNovaRazao(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>

              {/* Campo 3: Número da Pasta com Gerador Sequencial */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-black uppercase text-slate-700 dark:text-slate-300">
                    3. Número da Pasta Física no Arquivo
                  </label>
                  <button
                    type="button"
                    onClick={handleGerarProximoNumeroPasta}
                    className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Gerar Próximo Sequencial
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Ex: PASTA 1043/2026 ou PASTA 85"
                  value={novoNumeroPasta}
                  onChange={(e) => setNovoNumeroPasta(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-black text-purple-600 dark:text-purple-400"
                />
              </div>

              {/* Campo 4: Setor e Localização Física */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-black uppercase text-slate-700 dark:text-slate-300">Setor</label>
                  <select
                    value={novoSetor}
                    onChange={(e) => setNovoSetor(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="ALIMENTOS">Alimentos</option>
                    <option value="SAÚDE">Saúde</option>
                    <option value="MEDICAMENTOS">Medicamentos</option>
                    <option value="SERVIÇOS">Serviços</option>
                    <option value="FEIRAS">Feiras</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-black uppercase text-slate-700 dark:text-slate-300">Armário / Estante</label>
                  <input
                    type="text"
                    value={novoArmario}
                    onChange={(e) => setNovoArmario(e.target.value)}
                    placeholder="Ex: ARMÁRIO A"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-black uppercase text-slate-700 dark:text-slate-300">Gaveta / Prateleira</label>
                  <input
                    type="text"
                    value={novaGaveta}
                    onChange={(e) => setNovaGaveta(e.target.value)}
                    placeholder="Ex: GAVETA 2"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
              </div>

              {/* Campo 5: Observações */}
              <div className="space-y-1">
                <label className="font-black uppercase text-slate-700 dark:text-slate-300">
                  Observações do Arquivo Físico
                </label>
                <textarea
                  rows={2}
                  placeholder="Anotações de localização, caixas arquivo ou observações cadastrais..."
                  value={novasObs}
                  onChange={(e) => setNovasObs(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold resize-none"
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setModalNovaPastaOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 font-bold uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSalvarNovaPasta}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black uppercase shadow-md flex items-center gap-1.5 transition active:scale-95"
              >
                <Check className="w-4 h-4" />
                Salvar Nova Pasta e Abrir Dossiê
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
