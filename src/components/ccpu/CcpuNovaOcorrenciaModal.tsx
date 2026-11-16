import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Thermometer,
  MapPin,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  FileText,
  FlaskConical,
  LocateFixed
} from 'lucide-react';
import {
  CcpuEstoqueItem,
  CcpuInsumoUtilizado,
  CcpuOcorrenciaItem,
  TipoPragaCcpu,
  TipoLocalCcpu,
  StatusEspecimeCcpu,
  UserProfile,
  isUserDiretorOuAdministrativo
} from '../../types';
import { COORDENADAS_BAIRROS_BC } from '../../lib/geoService';
import { ANIMAIS_CCPU_CONFIG, BAIRROS_BC_ALFABETICO, getAnimalInfo } from '../../data/ccpuAnimaisData';
import { fetchCcpuEstoque, getLocalCcpuEstoqueItens } from '../../lib/ccpuEstoqueService';

interface InsumoOpcaoConfig {
  id: CcpuInsumoUtilizado['id'];
  nome: string;
  unidade: 'unidade' | 'litro';
  sigla: string;
  step: string;
}

const INSUMOS_CCPU_GRUPOS: Array<{
  id: string;
  titulo: string;
  subtitulo: string;
  emoji: string;
  badgeClass: string;
  gridClass: string;
  itens: InsumoOpcaoConfig[];
}> = [
  {
    id: 'RATO',
    titulo: 'Rato',
    subtitulo: 'Raticidas e armadilhas (Unidade)',
    emoji: '🐀',
    badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    gridClass: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    itens: [
      { id: 'PARAFINADO', nome: 'Parafinado', unidade: 'unidade', sigla: 'un', step: '1' },
      { id: 'COLANTE', nome: 'Colante', unidade: 'unidade', sigla: 'un', step: '1' },
      { id: 'EXTRUSADO', nome: 'Extrusado', unidade: 'unidade', sigla: 'un', step: '1' },
      { id: 'ISCA_FRESCA', nome: 'Isca Fresca', unidade: 'unidade', sigla: 'un', step: '1' }
    ]
  },
  {
    id: 'BARATA',
    titulo: 'Barata',
    subtitulo: 'Inseticidas em gel e pó (Unidade)',
    emoji: '🪳',
    badgeClass: 'bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-300 border-orange-300 dark:border-orange-700',
    gridClass: 'grid-cols-1 sm:grid-cols-2',
    itens: [
      { id: 'GEL', nome: 'Gel', unidade: 'unidade', sigla: 'un', step: '1' },
      { id: 'PO', nome: 'Pó', unidade: 'unidade', sigla: 'un', step: '1' }
    ]
  },
  {
    id: 'MOSQUITO',
    titulo: 'Mosquito',
    subtitulo: 'Controle larvário (Litro)',
    emoji: '🦟',
    badgeClass: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700',
    gridClass: 'grid-cols-1',
    itens: [
      { id: 'LARVICIDA', nome: 'Larvicida', unidade: 'litro', sigla: 'L', step: '0.1' }
    ]
  },
  {
    id: 'OUTROS',
    titulo: 'Formiga / Outros',
    subtitulo: 'Isca granulada complementar (Unidade)',
    emoji: '🐜',
    badgeClass: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600',
    gridClass: 'grid-cols-1',
    itens: [
      { id: 'GRANULADO', nome: 'Granulado', unidade: 'unidade', sigla: 'un', step: '1' }
    ]
  }
];

const INSUMOS_CCPU_OPCOES: InsumoOpcaoConfig[] = INSUMOS_CCPU_GRUPOS.flatMap((grupo) => grupo.itens);

interface CcpuNovaOcorrenciaModalProps {
  currentUser: UserProfile | null;
  onClose: () => void;
  onSave: (novaOcorrencia: CcpuOcorrenciaItem) => void;
}

export const CcpuNovaOcorrenciaModal: React.FC<CcpuNovaOcorrenciaModalProps> = ({
  currentUser,
  onClose,
  onSave
}) => {
  const [tipoPraga, setTipoPraga] = useState<TipoPragaCcpu>('ESCORPIAO');
  const [subtipoEspecie, setSubtipoEspecie] = useState('Escorpião');
  const [dataHora, setDataHora] = useState(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  });

  // Clima e temperatura
  const [temperatura, setTemperatura] = useState<number>(24.5);
  const [umidadeRelativa, setUmidadeRelativa] = useState<number>(78);
  const [condicaoClima, setCondicaoClima] = useState<string>('Parcialmente Nublado');
  const [fonteTemperatura, setFonteTemperatura] = useState<string>('Google / Open-Meteo BC (Tempo Real)');
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherSuccess, setWeatherSuccess] = useState(false);

  // Localização
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('CENTRO');
  const [tipoLocal, setTipoLocal] = useState<TipoLocalCcpu>('BUEIRO_BOCA_LOBO');
  const [identificacaoBueiroLocal, setIdentificacaoBueiroLocal] = useState('');
  const [lat, setLat] = useState<number>(-26.9925);
  const [lng, setLng] = useState<number>(-48.6353);
  const [capturandoGps, setCapturandoGps] = useState(false);
  const [gpsFeedback, setGpsFeedback] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  // Coleta
  const [quantidade, setQuantidade] = useState<number>(1);
  const [statusEspecime, setStatusEspecime] = useState<StatusEspecimeCcpu>('VIVO');
  const [metodoColetaAcao, setMetodoColetaAcao] = useState(
    'Busca ativa noturna com lanterna ultravioleta (UV), pinça entomológica e vedação mecânica de grelhas'
  );
  const [condicaoEstrutural, setCondicaoEstrutural] = useState(
    'Grelha com fresta de passagem; acúmulo de matéria orgânica no fundo do bueiro'
  );
  const [fatoresAtrativos, setFatoresAtrativos] = useState<string[]>([
    'Presença de baratas de esgoto (alimento)',
    'Água estagnada / alta umidade'
  ]);
  const [novoFator, setNovoFator] = useState('');
  const [insumosQtd, setInsumosQtd] = useState<Record<CcpuInsumoUtilizado['id'], string>>({
    PARAFINADO: '',
    COLANTE: '',
    EXTRUSADO: '',
    ISCA_FRESCA: '',
    GRANULADO: '',
    GEL: '',
    PO: '',
    LARVICIDA: ''
  });
  const canSeeEstoqueSaldo = isUserDiretorOuAdministrativo(currentUser);
  const [estoqueItens, setEstoqueItens] = useState<CcpuEstoqueItem[]>(() =>
    canSeeEstoqueSaldo ? getLocalCcpuEstoqueItens() : []
  );

  // Responsável e Ações
  const [servidorResponsavel, setServidorResponsavel] = useState(() => {
    return currentUser ? `${currentUser.nome_completo} (${currentUser.cargo})` : 'Agente CCPU / Fiscal Sanitário';
  });
  const [matriculaServidor, setMatriculaServidor] = useState(() => currentUser?.matricula || '');
  const [statusOcorrencia, setStatusOcorrencia] = useState<
    'COLETADO' | 'EM_MONITORAMENTO' | 'BLOQUEIO_REALIZADO' | 'AGUARDANDO_OBRAS' | 'CONCLUIDO'
  >('COLETADO');
  const [notificacaoEmitida, setNotificacaoEmitida] = useState(false);
  const [numeroNotificacao, setNumeroNotificacao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [medidasAdotadas, setMedidasAdotadas] = useState(
    'Coleta e contenção sanitária; registro no banco de dados epidemiológico do CCPU e orientação preventiva.'
  );

  // Informações do animal selecionado para exibição visual
  const animalSelecionadoInfo = useMemo(() => getAnimalInfo(tipoPraga), [tipoPraga]);

  // Atualiza coordenadas ao mudar bairro
  const aplicarBairro = (novoBairro: string) => {
    setBairro(novoBairro);
    setGpsFeedback(null);
    const coords = COORDENADAS_BAIRROS_BC[novoBairro.toUpperCase()];
    if (coords) {
      setLat(coords.lat);
      setLng(coords.lng);
    }
  };

  // Captura coordenadas GPS (WGS-84) da posição atual do dispositivo
  const handleCapturarGpsAtual = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsFeedback({ tipo: 'erro', texto: 'Geolocalização não suportada neste dispositivo.' });
      return;
    }
    setCapturandoGps(true);
    setGpsFeedback(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        const precisao = Math.round(pos.coords.accuracy || 0);
        setGpsFeedback({
          tipo: 'ok',
          texto: precisao > 0 ? `Posição atual capturada (±${precisao}m)` : 'Posição atual capturada'
        });
        setCapturandoGps(false);
      },
      (err) => {
        let msg = 'Não foi possível obter a posição GPS atual.';
        if (err.code === 1) msg = 'Permissão de localização negada no navegador.';
        else if (err.code === 2) msg = 'Sinal GPS indisponível no momento.';
        else if (err.code === 3) msg = 'Tempo esgotado ao buscar coordenadas GPS.';
        setGpsFeedback({ tipo: 'erro', texto: msg });
        setCapturandoGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Ao mudar de animal/vetor, atualiza método e rótulo genérico
  const handleAnimalChange = (animalId: TipoPragaCcpu) => {
    setTipoPraga(animalId);
    const info = getAnimalInfo(animalId);
    setSubtipoEspecie(info.nome); // Modo genérico sem exigência taxonômica
    setMetodoColetaAcao(info.metodoPadrao);
  };

  // Consulta clima em tempo real
  const handleFetchWeather = async () => {
    setLoadingWeather(true);
    setWeatherSuccess(false);
    try {
      const res = await fetch('/api/clima/bc');
      if (res.ok) {
        const data = await res.json();
        setTemperatura(data.temperatura ?? 24.5);
        if (data.umidade) setUmidadeRelativa(data.umidade);
        if (data.condicao) setCondicaoClima(data.condicao);
        if (data.fonte) setFonteTemperatura(data.fonte);
        setWeatherSuccess(true);
        return;
      }
      throw new Error('Falha na rota interna');
    } catch {
      try {
        const directRes = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=-26.9926&longitude=-48.6353&current=temperature_2m,relative_humidity_2m,weather_code'
        );
        if (directRes.ok) {
          const directData = await directRes.json();
          const curr = directData.current || {};
          setTemperatura(Math.round((curr.temperature_2m ?? 23.8) * 10) / 10);
          setUmidadeRelativa(curr.relative_humidity_2m ?? 75);
          setCondicaoClima('Clima Balneário Camboriú (Tempo Real)');
          setFonteTemperatura('Google / Open-Meteo Direct (BC)');
          setWeatherSuccess(true);
          return;
        }
      } catch (e) {
        console.warn('Erro ao consultar clima:', e);
      }
      setTemperatura(24.0);
      setCondicaoClima('Parcialmente Nublado');
      setFonteTemperatura('Estimativa Balneário Camboriú');
      setWeatherSuccess(true);
    } finally {
      setLoadingWeather(false);
    }
  };

  useEffect(() => {
    handleFetchWeather();
    if (canSeeEstoqueSaldo) {
      fetchCcpuEstoque().then((res) => setEstoqueItens(res.itens));
    }
  }, [canSeeEstoqueSaldo]);

  const handleAddFator = () => {
    if (!novoFator.trim()) return;
    if (!fatoresAtrativos.includes(novoFator.trim())) {
      setFatoresAtrativos([...fatoresAtrativos, novoFator.trim()]);
    }
    setNovoFator('');
  };

  const handleRemoveFator = (idx: number) => {
    setFatoresAtrativos(fatoresAtrativos.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!endereco.trim()) {
      alert('Por favor, informe o endereço / logradouro da ocorrência.');
      return;
    }

    const protocoloGerado = `CCPU-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
    const identificacaoFinal =
      identificacaoBueiroLocal.trim() ||
      (tipoLocal === 'BUEIRO_BOCA_LOBO'
        ? `Bueiro na ${endereco}, ${numero || 'S/N'}`
        : `${endereco}, ${numero || 'S/N'}`);

    const animalInfo = getAnimalInfo(tipoPraga);
    const insumosSelecionados: CcpuInsumoUtilizado[] = INSUMOS_CCPU_OPCOES.reduce<CcpuInsumoUtilizado[]>(
      (acc, item) => {
        const raw = (insumosQtd[item.id] || '').replace(',', '.').trim();
        const qtd = parseFloat(raw);
        if (!isNaN(qtd) && qtd > 0) {
          acc.push({
            id: item.id,
            nome: item.nome,
            quantidade: item.unidade === 'unidade' ? Math.round(qtd) : Math.round(qtd * 100) / 100,
            unidade: item.unidade
          });
        }
        return acc;
      },
      []
    );

    const nova: CcpuOcorrenciaItem = {
      id: `ccpu-${Date.now()}`,
      protocolo: protocoloGerado,
      tipoPraga,
      subtipoEspecie: subtipoEspecie.trim() || animalInfo.nome,
      dataHora,
      temperatura: Number(temperatura) || 24,
      umidadeRelativa: Number(umidadeRelativa) || undefined,
      condicaoClima: condicaoClima || 'Estável',
      fonteTemperatura,
      endereco: endereco.trim(),
      numero: numero.trim(),
      bairro,
      tipoLocal,
      identificacaoBueiroLocal: identificacaoFinal,
      lat,
      lng,
      quantidade: Math.max(1, Number(quantidade) || 1),
      statusEspecime,
      metodoColetaAcao: metodoColetaAcao.trim(),
      condicaoEstrutural: condicaoEstrutural.trim(),
      insumosUtilizados: insumosSelecionados.length > 0 ? insumosSelecionados : undefined,
      fatoresAtrativos,
      servidorResponsavel: servidorResponsavel.trim(),
      matriculaServidor: matriculaServidor.trim(),
      statusOcorrencia,
      notificacaoEmitida,
      numeroNotificacao: notificacaoEmitida ? numeroNotificacao || `NOT-${protocoloGerado}` : undefined,
      observacoes: observacoes.trim(),
      medidasAdotadas: medidasAdotadas.trim(),
      createdAt: new Date().toISOString()
    };

    onSave(nova);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-[1600.33px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Cabeçalho */}
        <div className="w-[1600.33px] max-w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950/40 flex items-center justify-center text-xl shadow-inner">
              🐾
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">
                Nova Ocorrência / Atendimento CCPU
              </h2>
              <p className="text-xs text-amber-200 font-medium">
                Centro de Controle de Pragas Urbanas e Zoonoses • Balneário Camboriú
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 overflow-y-auto space-y-6 text-left">
          
          {/* 1. Escolha do Animal / Demanda + Identificação Genérica + Data/Hora */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 block">
                1. Selecione o Animal / Demanda para Atendimento *
              </label>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                Modo genérico ativo • 17 categorias de atendimento
              </span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-start gap-3">
              {/* Figura + Dropdown de Animal */}
              <div className="shrink-0">
                <label className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1">
                  Animal / Demanda *
                </label>
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center text-2xl shadow-sm shrink-0 bg-white dark:bg-slate-800 ${animalSelecionadoInfo.borda}`}
                    title={`Animal selecionado: ${animalSelecionadoInfo.nome}`}
                  >
                    <span>{animalSelecionadoInfo.icon}</span>
                  </div>

                  <select
                    value={tipoPraga}
                    onChange={(e) => handleAnimalChange(e.target.value as TipoPragaCcpu)}
                    className="w-[260px] sm:w-[300px] max-w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-sm"
                  >
                    {ANIMAIS_CCPU_CONFIG.map((a) => (
                      <option key={a.id} value={a.id} className="py-2 text-sm font-semibold">
                        {a.icon} {a.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Identificação Genérica */}
              <div className="flex-1 min-w-0 w-full">
                <label className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1 truncate">
                  Identificação do Animal / Detalhe (Genérico e Opcional)
                </label>
                <input
                  type="text"
                  value={subtipoEspecie}
                  onChange={(e) => setSubtipoEspecie(e.target.value)}
                  placeholder="Ex: Cão de porte médio, Aranha marrom, etc."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Preenchido automaticamente com o animal selecionado. Pode ser alterado ou complementado livremente.
                </span>
              </div>

              {/* Data e Hora */}
              <div className="w-full lg:w-[225px] shrink-0">
                <label className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1 truncate">
                  Data e Hora da Coleta / Atendimento *
                </label>
                <input
                  type="datetime-local"
                  value={dataHora}
                  onChange={(e) => setDataHora(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 2. Temperatura e Clima no Momento da Ocorrência */}
          <div className="p-4 sm:h-[168.688px] rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-slate-100 dark:to-slate-800/40 border border-amber-300 dark:border-amber-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="text-xs font-black uppercase text-amber-950 dark:text-amber-200 block">
                    2. Condições Climáticas & Temperatura no Momento do Atendimento
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    Dados meteorológicos automáticos de Balneário Camboriú integrados ao laudo.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFetchWeather}
                disabled={loadingWeather}
                className="flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingWeather ? 'animate-spin' : ''}`} />
                <span>{loadingWeather ? 'Buscando...' : 'Atualizar Clima BC'}</span>
              </button>
            </div>

            {/* Barras de Temperatura e Umidade com a largura do nome da coluna, e Condição reduzida em ~50px */}
            <div className="flex flex-wrap items-end gap-3 sm:gap-4">
              {/* Barra de Temperatura (°C) * -> do tamanho do nome da coluna (~140px) */}
              <div className="w-36 shrink-0">
                <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1 whitespace-nowrap">
                  Temperatura (°C) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={temperatura}
                    onChange={(e) => setTemperatura(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-amber-600 dark:text-amber-400 outline-none pr-8"
                  />
                  <span className="absolute right-2.5 top-2 text-xs font-black text-slate-400">°C</span>
                </div>
              </div>

              {/* Barra de Umidade Relativa (%) -> do tamanho do nome da coluna (~160px) */}
              <div className="w-40 shrink-0">
                <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1 whitespace-nowrap">
                  Umidade Relativa (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={umidadeRelativa}
                    onChange={(e) => setUmidadeRelativa(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none pr-7"
                  />
                  <span className="absolute right-2.5 top-2 text-xs font-black text-slate-400">%</span>
                </div>
              </div>

              {/* Barra de Condição / Descrição do clima -> ~50px a menos (w-56) */}
              <div className="w-56 max-w-full shrink-0">
                <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1 whitespace-nowrap">
                  Condição / Descrição
                </label>
                <input
                  type="text"
                  value={condicaoClima}
                  onChange={(e) => setCondicaoClima(e.target.value)}
                  placeholder="Ex: Parcialmente Nublado"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Fonte: <strong className="text-slate-700 dark:text-slate-300">{fonteTemperatura}</strong></span>
              {weatherSuccess && (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Atualizado com sucesso
                </span>
              )}
            </div>
          </div>

          {/* 3. Localização do Ponto • Bairro (Lista Completa em Ordem Alfabética A-Z) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>3. Localização • Bairro (Ordem Alfabética A-Z)</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-semibold">
                Lista completa dos 20 bairros oficiais de Balneário Camboriú
              </span>
            </div>

            {/* Linha 1: BAIRRO (pouco maior que Várzea do Ranchinho) + Logradouro (ocupa o resto da linha) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              <div className="w-full sm:w-[250px] shrink-0">
                <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1">
                  BAIRRO
                </label>
                <select
                  value={bairro}
                  onChange={(e) => aplicarBairro(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-amber-700 dark:text-amber-400 outline-none cursor-pointer"
                >
                  {BAIRROS_BC_ALFABETICO.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-0">
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Logradouro / Avenida / Rua *
                </label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  required
                  placeholder="Ex: Avenida Brasil, esquina com Rua 1500"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
                />
              </div>
            </div>

            {/* Linha 2: Número / Referência, Tipo de Local / Instalação *, Identificação do Bueiro ou Ponto Exato, Coordenadas GPS (WGS-84) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-2">
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1 truncate">
                  Número / Referência
                </label>
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Ex: 1500 ou S/N"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1 truncate">
                  Tipo de Local / Instalação *
                </label>
                <select
                  value={tipoLocal}
                  onChange={(e) => setTipoLocal(e.target.value as TipoLocalCcpu)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none cursor-pointer"
                >
                  <option value="BUEIRO_BOCA_LOBO">Bueiro / Boca de Lobo</option>
                  <option value="CAIXA_INSPECAO">Caixa de Inspeção Pluvial / Esgoto</option>
                  <option value="GALERIA_ESGOTO">Galeria Pluvial Subterrânea</option>
                  <option value="RESIDENCIA">Residência Unifamiliar / Edifício</option>
                  <option value="COMERCIO">Estabelecimento Comercial</option>
                  <option value="TERRENO_BALDIO">Terreno Baldio</option>
                  <option value="VIA_PUBLICA">Via Pública / Calçada</option>
                  <option value="ESCOLA_CRECHE">Escola / Creche</option>
                  <option value="UNIDADE_SAUDE">Unidade de Saúde</option>
                  <option value="OUTRO">Outro Local</option>
                </select>
              </div>

              <div className="lg:col-span-4">
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1 truncate">
                  Identificação do Bueiro ou Ponto Exato
                </label>
                <input
                  type="text"
                  value={identificacaoBueiroLocal}
                  onChange={(e) => setIdentificacaoBueiroLocal(e.target.value)}
                  placeholder="Ex: Bueiro #BC-C12 calçada ímpar ou Pátio interno"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1 truncate">
                  Coordenadas GPS (WGS-84)
                </label>
                <div className="flex items-stretch gap-2">
                  <div className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center justify-between gap-2">
                    <span className="truncate">Lat: {lat.toFixed(5)}</span>
                    <span className="truncate">Lng: {lng.toFixed(5)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCapturarGpsAtual}
                    disabled={capturandoGps}
                    title="Pegar coordenadas GPS da posição atual"
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wide transition cursor-pointer shadow-sm active:scale-95 disabled:opacity-60 flex items-center gap-1.5 shrink-0"
                  >
                    <LocateFixed className={`w-3.5 h-3.5 ${capturandoGps ? 'animate-spin' : ''}`} />
                    <span>{capturandoGps ? 'Buscando...' : 'GPS Atual'}</span>
                  </button>
                </div>
                {gpsFeedback && (
                  <span
                    className={`text-[10px] font-semibold mt-1 block ${
                      gpsFeedback.tipo === 'ok'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {gpsFeedback.texto}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 4. Dados da Coleta e Espécimes */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              4. Quantidade e Caracterização dos Espécimes
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Quantidade Coletada / Avistada *
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                  required
                  className="w-[300px] max-w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-black outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Status do Animal / Espécime *
                </label>
                <select
                  value={statusEspecime}
                  onChange={(e) => setStatusEspecime(e.target.value as StatusEspecimeCcpu)}
                  className="w-[300px] max-w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none cursor-pointer"
                >
                  <option value="VIVO">Animal Vivo</option>
                  <option value="MORTO">Animal Morto</option>
                  <option value="AMBOS">Vivos e Mortos</option>
                  <option value="APENAS_VESTIGIOS">Apenas Vestígios (Fezes / Marcas / Exoesqueleto)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                Método de Ação / Coleta Realizada
              </label>
              <input
                type="text"
                value={metodoColetaAcao}
                onChange={(e) => setMetodoColetaAcao(e.target.value)}
                className="w-[1013.65px] max-w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                Condições Estruturais do Local / Bueiro
              </label>
              <input
                type="text"
                value={condicaoEstrutural}
                onChange={(e) => setCondicaoEstrutural(e.target.value)}
                placeholder="Ex: Fresta de 5cm na tampa, acúmulo de lixo orgânico"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
              />
            </div>
          </div>

          {/* 5. Uso de Iscas, Insumos e Larvicida (Quando Houver Uso) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    5. Uso de Iscas, Insumos e Larvicida (Quando Houver Uso)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Preencha apenas os itens aplicados no local (Iscas/Insumos em Unidade e Larvicida em Litro).
                  </p>
                </div>
              </div>
              {Object.values(insumosQtd).some((v) => parseFloat((v || '0').replace(',', '.')) > 0) && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  {Object.values(insumosQtd).filter((v) => parseFloat((v || '0').replace(',', '.')) > 0).length} item(ns) aplicado(s)
                </span>
              )}
            </div>

            <div className="space-y-4">
              {INSUMOS_CCPU_GRUPOS.map((grupo) => {
                const qtdAtivosGrupo = grupo.itens.filter((item) => {
                  const v = parseFloat((insumosQtd[item.id] || '0').replace(',', '.'));
                  return !isNaN(v) && v > 0;
                }).length;

                return (
                  <div
                    key={grupo.id}
                    className="p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 space-y-2.5"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-black uppercase tracking-wide border ${grupo.badgeClass}`}
                        >
                          <span>{grupo.emoji}</span>
                          <span>Venenos para {grupo.titulo}</span>
                        </span>
                        <span className="text-[11px] text-slate-500">{grupo.subtitulo}</span>
                      </div>
                      {qtdAtivosGrupo > 0 && (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          {qtdAtivosGrupo} selecionado(s)
                        </span>
                      )}
                    </div>

                    <div className={`grid ${grupo.gridClass} gap-3`}>
                      {grupo.itens.map((item) => {
                        const rawVal = insumosQtd[item.id];
                        const numVal = parseFloat((rawVal || '0').replace(',', '.'));
                        const isAtivo = !isNaN(numVal) && numVal > 0;
                        const isLitro = item.unidade === 'litro';
                        const estoqueAtual = estoqueItens.find((e) => e.id === item.id)?.quantidade_atual ?? 0;

                        return (
                          <div
                            key={item.id}
                            className={`p-3 rounded-xl border transition ${
                              isAtivo
                                ? isLitro
                                  ? 'bg-cyan-50/70 dark:bg-cyan-950/30 border-cyan-400 dark:border-cyan-600'
                                  : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-400 dark:border-amber-600'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <label
                                htmlFor={`insumo-${item.id}`}
                                className="text-xs font-bold uppercase text-slate-800 dark:text-slate-200"
                              >
                                {item.nome}
                              </label>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  isLitro
                                    ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {item.unidade === 'litro' ? 'Litro' : 'Unidade'}
                              </span>
                            </div>

                            <div className="relative">
                              <input
                                id={`insumo-${item.id}`}
                                type="number"
                                min="0"
                                step={item.step}
                                value={rawVal}
                                onChange={(e) =>
                                  setInsumosQtd((prev) => ({ ...prev, [item.id]: e.target.value }))
                                }
                                placeholder="0"
                                className="w-full px-3 py-2 pr-14 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                              />
                              <span className="absolute right-3 top-2 text-xs font-bold text-slate-400 pointer-events-none">
                                {item.sigla}
                              </span>
                            </div>
                            {canSeeEstoqueSaldo && (
                              <span className="text-[10px] text-slate-500 mt-1 block">
                                Estoque atual:{' '}
                                <strong className="text-slate-700 dark:text-slate-300">
                                  {estoqueAtual} {item.sigla}
                                </strong>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6. Fatores Atrativos */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block">
              6. Fatores Atrativos Identificados
            </label>
            <div className="flex flex-wrap gap-2">
              {fatoresAtrativos.map((fator, index) => (
                <span
                  key={index}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1.5"
                >
                  <span>{fator}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFator(index)}
                    className="text-amber-600 hover:text-amber-800 dark:hover:text-amber-100 font-bold ml-1 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={novoFator}
                onChange={(e) => setNovoFator(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFator();
                  }
                }}
                placeholder="Digite outro fator atrativo e pressione Adicionar"
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
              />
              <button
                type="button"
                onClick={handleAddFator}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* 7. Servidor e Status */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              7. Responsabilidade Técnica & Providências
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Servidor Responsável *
                </label>
                <input
                  type="text"
                  value={servidorResponsavel}
                  onChange={(e) => setServidorResponsavel(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Status Inicial da Ocorrência *
                </label>
                <select
                  value={statusOcorrencia}
                  onChange={(e) => setStatusOcorrencia(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none cursor-pointer"
                >
                  <option value="COLETADO">Coletado / Atendido</option>
                  <option value="EM_MONITORAMENTO">Em Monitoramento Contínuo</option>
                  <option value="BLOQUEIO_REALIZADO">Bloqueio Realizado com Sucesso</option>
                  <option value="AGUARDANDO_OBRAS">Aguardando Intervenção de Obras/EMASA</option>
                  <option value="CONCLUIDO">Concluído</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                Medidas Adotadas / Providências Imediatas
              </label>
              <textarea
                rows={2}
                value={medidasAdotadas}
                onChange={(e) => setMedidasAdotadas(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                Observações Técnicas Complementares
              </label>
              <textarea
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Detalhes adicionais da vistoria, número de telefone do solicitante, encaminhamentos..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none resize-none"
              />
            </div>
          </div>

          {/* Botões do Rodapé */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition cursor-pointer active:scale-95 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Salvar e Gerar Laudo Oficial</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
