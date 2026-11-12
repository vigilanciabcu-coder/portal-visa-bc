import React, { useState, useMemo, useEffect } from 'react';
import {
  Bug,
  MapPin,
  Thermometer,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Search,
  Filter,
  FileText,
  Printer,
  Download,
  ArrowLeft,
  Calendar,
  Clock,
  Sparkles,
  RefreshCw,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Building2,
  Trash2
} from 'lucide-react';
import { CcpuOcorrenciaItem, TipoPragaCcpu, UserProfile } from '../../types';
import { CcpuNovaOcorrenciaModal } from './CcpuNovaOcorrenciaModal';
import { CcpuRelatorioOficialModal } from './CcpuRelatorioOficialModal';
import { CcpuRelatorioGeoModal } from './CcpuRelatorioGeoModal';
import { CcpuRelatorioClimaModal } from './CcpuRelatorioClimaModal';
import { CcpuMapView } from './CcpuMapView';
import { INITIAL_CCPU_OCORRENCIAS } from '../../data/ccpuMockData';
import {
  ANIMAIS_CCPU_CONFIG,
  getAnimalInfo,
  BAIRROS_BC_ALFABETICO
} from '../../data/ccpuAnimaisData';

interface CcpuViewProps {
  currentUser: UserProfile | null;
  onNavigateHome: () => void;
}

export const CcpuView: React.FC<CcpuViewProps> = ({
  currentUser,
  onNavigateHome
}) => {
  // Estado das ocorrências com persistência local
  const [ocorrencias, setOcorrencias] = useState<CcpuOcorrenciaItem[]>(() => {
    try {
      const saved = localStorage.getItem('visa_ccpu_ocorrencias');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao restaurar ocorrências CCPU:', e);
    }
    return INITIAL_CCPU_OCORRENCIAS;
  });

  // Salva no localStorage sempre que houver alteração
  useEffect(() => {
    localStorage.setItem('visa_ccpu_ocorrencias', JSON.stringify(ocorrencias));
  }, [ocorrencias]);

  // Aba ativa: 'lista' | 'mapa' | 'relatorios'
  const [abaAtiva, setAbaAtiva] = useState<'lista' | 'mapa' | 'relatorios'>('lista');

  // Filtros
  const [filtroPraga, setFiltroPraga] = useState<string>('TODAS');
  const [filtroBairro, setFiltroBairro] = useState<string>('TODOS');
  const [buscaTexto, setBuscaTexto] = useState<string>('');

  // Modais
  const [modalNovaAberta, setModalNovaAberta] = useState(false);
  const [ocorrenciaSelecionadaRelatorio, setOcorrenciaSelecionadaRelatorio] = useState<CcpuOcorrenciaItem | null>(null);
  const [modalGeoRelatorioAberta, setModalGeoRelatorioAberta] = useState(false);
  const [modalClimaRelatorioAberta, setModalClimaRelatorioAberta] = useState(false);

  // Clima em tempo real no cabeçalho
  const [climaAtual, setClimaAtual] = useState<{ temp: number; cond: string } | null>(null);
  const [carregandoClima, setCarregandoClima] = useState(false);

  const fetchClimaHeader = async () => {
    setCarregandoClima(true);
    try {
      const res = await fetch('/api/clima/bc');
      if (res.ok) {
        const data = await res.json();
        setClimaAtual({ temp: data.temperatura ?? 24, cond: data.condicao ?? 'Estável' });
        return;
      }
    } catch {
      // Fallback
    } finally {
      setCarregandoClima(false);
    }
    setClimaAtual({ temp: 23.8, cond: 'Parcialmente Nublado' });
  };

  useEffect(() => {
    fetchClimaHeader();
  }, []);

  // Adiciona nova ocorrência
  const handleSaveNovaOcorrencia = (nova: CcpuOcorrenciaItem) => {
    setOcorrencias((prev) => [nova, ...prev]);
    setModalNovaAberta(false);
    setOcorrenciaSelecionadaRelatorio(nova); // Abre imediatamente o laudo oficial após salvar
  };

  // Exclui ocorrência
  const handleDeleteOcorrencia = (id: string) => {
    if (confirm('Deseja realmente remover este registro de coleta?')) {
      setOcorrencias((prev) => prev.filter((o) => o.id !== id));
    }
  };

  // Métricas
  const metricas = useMemo(() => {
    const total = ocorrencias.length;
    const escorpioes = ocorrencias.filter((o) => o.tipoPraga === 'ESCORPIAO');
    const totalEscorpioes = escorpioes.reduce((acc, curr) => acc + (curr.quantidade || 0), 0);

    // Média de temperatura nas coletas de escorpião
    const tempMediaEscorpiao = escorpioes.length > 0
      ? (escorpioes.reduce((acc, curr) => acc + (curr.temperatura || 0), 0) / escorpioes.length).toFixed(1)
      : '0.0';

    const bueirosMapeados = new Set(ocorrencias.map((o) => o.identificacaoBueiroLocal)).size;
    const concluidosOuBloqueados = ocorrencias.filter(
      (o) => o.statusOcorrencia === 'CONCLUIDO' || o.statusOcorrencia === 'BLOQUEIO_REALIZADO'
    ).length;

    return {
      total,
      totalEscorpioes,
      tempMediaEscorpiao,
      bueirosMapeados,
      concluidosOuBloqueados
    };
  }, [ocorrencias]);

  // Lista filtrada
  const ocorrenciasFiltradas = useMemo(() => {
    return ocorrencias.filter((o) => {
      if (filtroPraga !== 'TODAS') {
        const info = getAnimalInfo(o.tipoPraga);
        if (o.tipoPraga !== filtroPraga && info.id !== filtroPraga) return false;
      }
      if (filtroBairro !== 'TODOS' && o.bairro !== filtroBairro) return false;
      if (buscaTexto.trim()) {
        const q = buscaTexto.toLowerCase();
        const info = getAnimalInfo(o.tipoPraga);
        const match =
          o.protocolo.toLowerCase().includes(q) ||
          o.identificacaoBueiroLocal.toLowerCase().includes(q) ||
          o.endereco.toLowerCase().includes(q) ||
          o.bairro.toLowerCase().includes(q) ||
          o.servidorResponsavel.toLowerCase().includes(q) ||
          (o.subtipoEspecie && o.subtipoEspecie.toLowerCase().includes(q)) ||
          info.nome.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [ocorrencias, filtroPraga, filtroBairro, buscaTexto]);

  // Bairros ordenados alfabeticamente para o filtro
  const bairrosDisponiveis = useMemo(() => {
    const todos = new Set([...BAIRROS_BC_ALFABETICO, ...ocorrencias.map((o) => o.bairro)]);
    return Array.from(todos).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [ocorrencias]);

  // Exportar CSV
  const handleExportCSV = () => {
    const headers = [
      'Protocolo',
      'Praga',
      'Espécie',
      'Data/Hora',
      'Temperatura (°C)',
      'Condição Clima',
      'Bairro',
      'Endereço',
      'Tipo Local',
      'Identificação Bueiro/Local',
      'Latitude',
      'Longitude',
      'Quantidade',
      'Status Espécime',
      'Método Ação',
      'Servidor',
      'Status'
    ];

    const rows = ocorrenciasFiltradas.map((o) => [
      `"${o.protocolo}"`,
      `"${o.tipoPraga}"`,
      `"${o.subtipoEspecie}"`,
      `"${o.dataHora}"`,
      o.temperatura,
      `"${o.condicaoClima}"`,
      `"${o.bairro}"`,
      `"${o.endereco}, ${o.numero || 'S/N'}"`,
      `"${o.tipoLocal}"`,
      `"${o.identificacaoBueiroLocal}"`,
      o.lat,
      o.lng,
      o.quantidade,
      `"${o.statusEspecime}"`,
      `"${o.metodoColetaAcao}"`,
      `"${o.servidorResponsavel}"`,
      `"${o.statusOcorrencia}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_coletas_ccpu_bc_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPragaIcon = (tipo: string) => getAnimalInfo(tipo).icon;
  const getPragaBadgeClass = (tipo: string) => getAnimalInfo(tipo).badgeBg;

  return (
    <div className="flex flex-col gap-5 text-left w-full min-h-full p-3 sm:p-5 md:p-6 pb-24 animate-fadeIn">
      {/* 1. Header Oficial do Módulo CCPU (Tela Cheia) */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 text-white p-5 sm:p-7 rounded-3xl shadow-xl border-2 border-amber-400/40 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950/40 hover:bg-slate-950/60 text-white rounded-full text-xs font-bold uppercase tracking-wider transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Portal</span>
            </button>
            <span className="px-3 py-1 bg-amber-400 text-slate-950 rounded-full text-xs font-black uppercase tracking-wider">
              CCPU • ZOONOSES BC
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
            <span>Centro de Controle de Pragas Urbanas & Vetores</span>
          </h1>

          <p className="text-xs sm:text-sm font-medium text-amber-100 leading-relaxed">
            Monitoramento entomológico in loco, mapeamento de escorpiões em bueiros com registro de temperatura ambiente (Google Clima), desratização, controle de esporotricose e emissão de laudos oficiais.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
          {/* Card de Clima em Balneário Camboriú */}
          <div className="px-4 py-2.5 rounded-2xl bg-slate-950/40 border border-white/20 backdrop-blur-md flex items-center justify-between gap-3 text-white text-xs">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-amber-400" />
              <div>
                <span className="font-bold block text-[10px] uppercase text-amber-200">Clima BC Agora</span>
                <span className="font-black text-sm">
                  {climaAtual ? `${climaAtual.temp}°C` : '24.0°C'}
                </span>
                <span className="text-[10px] text-white/70 ml-1">
                  {climaAtual?.cond || 'Parcialmente Nublado'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchClimaHeader}
              className="p-1 text-white/70 hover:text-white transition cursor-pointer"
              title="Atualizar temperatura"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${carregandoClima ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Botão Primário: Nova Coleta */}
          <button
            type="button"
            onClick={() => setModalNovaAberta(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg active:scale-95 cursor-pointer ring-2 ring-white/50"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Ocorrência / Coleta</span>
          </button>
        </div>
      </div>

      {/* 2. Cards de Métricas / KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 text-2xl shrink-0">
            📋
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total de Ocorrências</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{metricas.total}</span>
            <span className="text-[11px] text-slate-500 block">registros no sistema</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/30 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-600 text-2xl shrink-0">
            🦂
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block">Escorpiões Coletados</span>
            <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">{metricas.totalEscorpioes}</span>
            <span className="text-[11px] text-slate-500 block">Média Temp: {metricas.tempMediaEscorpiao}°C</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 text-2xl shrink-0">
            📍
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Bueiros / Pontos</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{metricas.bueirosMapeados}</span>
            <span className="text-[11px] text-slate-500 block">locais georreferenciados</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-2xl shrink-0">
            🛡️
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Bloqueios & Concluídos</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{metricas.concluidosOuBloqueados}</span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block">ações de controle efetivas</span>
          </div>
        </div>
      </div>

      {/* 3. Navegação entre Abas (Lista / Mapa / Relatórios) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          <button
            type="button"
            onClick={() => setAbaAtiva('lista')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
              abaAtiva === 'lista'
                ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>📋 Ocorrências & Coletas</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              {ocorrenciasFiltradas.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('mapa')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
              abaAtiva === 'mapa'
                ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🗺️ Mapa de Coletas (Leaflet)</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('relatorios')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
              abaAtiva === 'relatorios'
                ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>📊 Relatórios Epidemiológicos</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* 4. Barra de Filtros (Praga, Bairro e Busca) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Filtro por Animal / Vetor */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none py-1 max-w-full">
          <span className="text-[11px] font-bold uppercase text-slate-400 mr-1 shrink-0">Animal / Vetor:</span>
          <button
            type="button"
            onClick={() => setFiltroPraga('TODAS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              filtroPraga === 'TODAS'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todos ({ocorrencias.length})
          </button>
          {ANIMAIS_CCPU_CONFIG.map((a) => {
            const count = ocorrencias.filter(
              (o) => o.tipoPraga === a.id || getAnimalInfo(o.tipoPraga).id === a.id
            ).length;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setFiltroPraga(a.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  filtroPraga === a.id
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{a.icon}</span>
                <span>{a.nome}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    filtroPraga === a.id ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filtro por Bairro e Busca */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={filtroBairro}
            onChange={(e) => setFiltroBairro(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="TODOS">Todos os Bairros</option>
            {bairrosDisponiveis.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              placeholder="Buscar bueiro, rua..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none"
            />
          </div>
        </div>
      </div>

      {/* 5. Conteúdo da Aba Ativa */}

      {/* ABA MAPA */}
      {abaAtiva === 'mapa' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Visualização Geográfica dos Bueiros e Coletas em Balneário Camboriú
            </span>
            <span className="text-xs text-slate-500">
              Clique nos pontos para visualizar o bueiro, temperatura e laudo técnico
            </span>
          </div>

          <CcpuMapView
            ocorrencias={ocorrenciasFiltradas}
            onSelectOcorrencia={(o) => setOcorrenciaSelecionadaRelatorio(o)}
            pragaFiltro={filtroPraga}
          />
        </div>
      )}

      {/* ABA LISTA DE OCORRÊNCIAS */}
      {abaAtiva === 'lista' && (
        <div className="space-y-3">
          {ocorrenciasFiltradas.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
              <span className="text-4xl block mb-2">🔍</span>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Nenhuma ocorrência encontrada para os filtros selecionados
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tente ajustar os filtros de praga ou bairro acima, ou registre uma nova coleta.
              </p>
              <button
                type="button"
                onClick={() => setModalNovaAberta(true)}
                className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl uppercase tracking-wider transition cursor-pointer"
              >
                + Registrar Ocorrência CCPU
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {ocorrenciasFiltradas.map((item) => {
                const dataFormatada = new Date(item.dataHora).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400/60 dark:hover:border-amber-400/40 shadow-sm transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      {(() => {
                        const animalInfo = getAnimalInfo(item.tipoPraga);
                        return (
                          <>
                            {/* Ícone do animal */}
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl shrink-0 border border-slate-200 dark:border-slate-700">
                              {animalInfo.icon}
                            </div>

                            {/* Dados principais */}
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${animalInfo.badgeBg}`}>
                                  {animalInfo.icon} {animalInfo.nome} • {item.quantidade} {item.quantidade === 1 ? 'registrado' : 'registrados'}
                                </span>
                                <span className="text-xs font-mono font-bold text-slate-500">
                                  {item.protocolo}
                                </span>
                                <span className="text-xs text-slate-400">·</span>
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {dataFormatada}
                                </span>
                              </div>

                              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <span className="text-amber-600 dark:text-amber-400">📍</span>
                                <span>{item.identificacaoBueiroLocal}</span>
                              </h4>

                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {item.endereco}, {item.numero || 'S/N'} • Bairro <strong className="text-slate-800 dark:text-slate-200">{item.bairro}</strong>
                              </p>

                              <div className="flex flex-wrap items-center gap-3 text-[11px] pt-1">
                                <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                  <Thermometer className="w-3.5 h-3.5" />
                                  {item.temperatura}°C ({item.condicaoClima})
                                  {item.umidadeRelativa ? ` • ${item.umidadeRelativa}% UR` : ''}
                                </span>
                                <span className="text-slate-400">·</span>
                                <span className="text-slate-600 dark:text-slate-300 font-medium">
                                  {item.subtipoEspecie || animalInfo.descricaoGenerica}
                                </span>
                                <span className="text-slate-400">·</span>
                                <span className="text-slate-600 dark:text-slate-300 font-semibold">
                                  Fiscal: {item.servidorResponsavel}
                                </span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0 w-full md:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setOcorrenciaSelecionadaRelatorio(item)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-sm active:scale-95"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Abrir Laudo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteOcorrencia(item.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition cursor-pointer"
                        title="Excluir ocorrência"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA RELATÓRIOS EPIDEMIOLÓGICOS E ANÁLISES */}
      {abaAtiva === 'relatorios' && (
        <div className="space-y-6">
          {/* Dois Novos Relatórios Especializados Solicitados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Relatório Geoespacial de Coordenadas */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-900/10 via-slate-900/5 to-amber-900/10 dark:from-blue-950/40 dark:to-slate-900/60 border-2 border-blue-500/30 hover:border-blue-500/60 transition shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                    Mapeamento Espacial • GPS
                  </span>
                  <span className="text-2xl">📍</span>
                </div>
                <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Relatório Geoespacial de Coordenadas</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Relatório detalhado das posições geográficas exatas (Latitude e Longitude) de todas as demandas e ocorrências em Balneário Camboriú. Filtrável por animal ou todas as espécies, com link direto ao Google Maps, bounding box e exportação CSV.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500">
                  {ocorrencias.length} pontos mapeados
                </span>
                <button
                  type="button"
                  onClick={() => setModalGeoRelatorioAberta(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-md active:scale-95"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Gerar Relatório Geoespacial</span>
                </button>
              </div>
            </div>

            {/* 2. Relatório Climatológico & Epidemiológico */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-900/10 via-slate-900/5 to-emerald-900/10 dark:from-amber-950/40 dark:to-slate-900/60 border-2 border-amber-500/30 hover:border-amber-500/60 transition shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                    Meteorologia & Zoonoses
                  </span>
                  <span className="text-2xl">🌡️</span>
                </div>
                <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Relatório Climatológico & Epidemiológico</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Correlação direta entre as demandas registradas por animal e as variáveis de microclima: temperatura ambiente (°C), umidade relativa do ar (%) e condição climática, permitindo identificar picos de infestação em períodos quentes ou chuvosos.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500">
                  Temp média: {climaAtual ? `${climaAtual.temp}°C` : '24°C'}
                </span>
                <button
                  type="button"
                  onClick={() => setModalClimaRelatorioAberta(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-md active:scale-95"
                >
                  <Thermometer className="w-3.5 h-3.5" />
                  <span>Gerar Relatório de Clima</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black uppercase text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                  <span>Análise Epidemiológica Integrada de Zoonoses & Vetores • BC</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consolidação municipal por bairro e espécies registradas na CCPU
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Baixar Planilha Consolidada
              </button>
            </div>

            {/* Destaque Escorpiões e Temperatura */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <span className="font-black uppercase text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
                  <span>🦂</span> Fator Biológico: Escorpiões vs. Temperatura
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  Os escorpiões amarelos (<em>Tityus serrulatus</em>) possuem atividade estritamente noturna e metabolismo acelerado em temperaturas acima de <strong>24°C</strong> aliadas à umidade relativa elevada, saindo das tubulações e galerias para caçar baratas de esgoto.
                </p>
                <div className="pt-2 flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
                  <span>Média Térmica nas Capturas:</span>
                  <span className="text-base font-black">{metricas.tempMediaEscorpiao}°C</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-2">
                <span className="font-black uppercase text-xs text-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <span>📍</span> Bueiros de Atenção Crítica
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  Bueiros com frestas acima de 3cm na grelha e presença de entulho/lixo orgânico representam <strong>80%</strong> das ocorrências de roedores e escorpiões, exigindo bloqueio físico e tela milimétrica.
                </p>
                <div className="pt-2 flex items-center justify-between text-xs font-bold text-blue-800 dark:text-blue-300">
                  <span>Pontos com Bloqueio Realizado:</span>
                  <span className="text-base font-black">{metricas.concluidosOuBloqueados}</span>
                </div>
              </div>
            </div>

            {/* Tabela de Incidência por Bairro */}
            <div className="pt-2">
              <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-2">
                Incidência de Ocorrências por Bairro de Balneário Camboriú (Ordem Alfabética)
              </h4>
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Bairro</th>
                      <th className="p-3">Ocorrências</th>
                      <th className="p-3">Animais / Vetores Principais</th>
                      <th className="p-3">Temperatura Média</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {bairrosDisponiveis.map((b) => {
                      const itensBairro = ocorrencias.filter((o) => o.bairro === b);
                      if (itensBairro.length === 0) return null;
                      const pragasBairro = Array.from(new Set(itensBairro.map((o) => getAnimalInfo(o.tipoPraga).nome))).join(', ');
                      const mediaTemp = (itensBairro.reduce((acc, c) => acc + c.temperatura, 0) / itensBairro.length).toFixed(1);

                      return (
                        <tr key={b} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-black text-slate-900 dark:text-slate-100">{b}</td>
                          <td className="p-3 font-bold text-amber-600">{itensBairro.length}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{pragasBairro}</td>
                          <td className="p-3 font-mono font-semibold">{mediaTemp}°C</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nova Ocorrência */}
      {modalNovaAberta && (
        <CcpuNovaOcorrenciaModal
          currentUser={currentUser}
          onClose={() => setModalNovaAberta(false)}
          onSave={handleSaveNovaOcorrencia}
        />
      )}

      {/* Modal de Laudo / Relatório Oficial */}
      {ocorrenciaSelecionadaRelatorio && (
        <CcpuRelatorioOficialModal
          ocorrencia={ocorrenciaSelecionadaRelatorio}
          onClose={() => setOcorrenciaSelecionadaRelatorio(null)}
        />
      )}

      {/* Modal de Relatório Geoespacial de Coordenadas */}
      {modalGeoRelatorioAberta && (
        <CcpuRelatorioGeoModal
          ocorrencias={ocorrencias}
          onClose={() => setModalGeoRelatorioAberta(false)}
        />
      )}

      {/* Modal de Relatório Climatológico & Epidemiológico */}
      {modalClimaRelatorioAberta && (
        <CcpuRelatorioClimaModal
          ocorrencias={ocorrencias}
          onClose={() => setModalClimaRelatorioAberta(false)}
        />
      )}
    </div>
  );
};
