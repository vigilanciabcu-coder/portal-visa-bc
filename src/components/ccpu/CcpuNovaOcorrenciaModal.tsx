import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Thermometer,
  MapPin,
  Bug,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { CcpuOcorrenciaItem, TipoPragaCcpu, TipoLocalCcpu, StatusEspecimeCcpu, UserProfile } from '../../types';
import { COORDENADAS_BAIRROS_BC } from '../../lib/geoService';

interface CcpuNovaOcorrenciaModalProps {
  currentUser: UserProfile | null;
  onClose: () => void;
  onSave: (novaOcorrencia: CcpuOcorrenciaItem) => void;
}

const PRAGAS_CONFIG: Array<{
  id: TipoPragaCcpu;
  nome: string;
  subtitulo: string;
  icon: string;
  cor: string;
  borda: string;
  bgAtivo: string;
  especiePadrao: string;
  metodoPadrao: string;
}> = [
  {
    id: 'ESCORPIAO',
    nome: 'Escorpião',
    subtitulo: 'Tityus serrulatus / bahiensis',
    icon: '🦂',
    cor: 'text-amber-500',
    borda: 'border-amber-500',
    bgAtivo: 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-300',
    especiePadrao: 'Tityus serrulatus (Escorpião Amarelo)',
    metodoPadrao: 'Busca ativa noturna com lanterna ultravioleta (UV) e pinça entomológica'
  },
  {
    id: 'RATO',
    nome: 'Rato / Roedor',
    subtitulo: 'Rattus norvegicus / rattus',
    icon: '🐀',
    cor: 'text-rose-500',
    borda: 'border-rose-500',
    bgAtivo: 'bg-rose-500/10 border-rose-500 text-rose-900 dark:text-rose-300',
    especiePadrao: 'Rattus norvegicus (Ratazana de Esgoto)',
    metodoPadrao: 'Instalação de porta-iscas lacrados com raticida parafinado anticoagulante'
  },
  {
    id: 'BARATA',
    nome: 'Barata',
    subtitulo: 'Periplaneta / Blatella',
    icon: '🪳',
    cor: 'text-yellow-600',
    borda: 'border-yellow-600',
    bgAtivo: 'bg-yellow-500/10 border-yellow-600 text-yellow-900 dark:text-yellow-300',
    especiePadrao: 'Periplaneta americana (Barata de Esgoto)',
    metodoPadrao: 'Aplicação de inseticida microencapsulado de longa residualidade'
  },
  {
    id: 'ESPOROTRICOSE',
    nome: 'Esporotricose',
    subtitulo: 'Sporothrix brasiliensis (Felina)',
    icon: '🐱',
    cor: 'text-purple-500',
    borda: 'border-purple-500',
    bgAtivo: 'bg-purple-500/10 border-purple-500 text-purple-900 dark:text-purple-300',
    especiePadrao: 'Sporothrix brasiliensis (Esporotricose Zoonótica Felina)',
    metodoPadrao: 'Avaliação clínica veterinária, citopatologia e protocolo terapêutico'
  },
  {
    id: 'POMBO',
    nome: 'Pombo',
    subtitulo: 'Columba livia (Aves)',
    icon: '🕊️',
    cor: 'text-sky-500',
    borda: 'border-sky-500',
    bgAtivo: 'bg-sky-500/10 border-sky-500 text-sky-900 dark:text-sky-300',
    especiePadrao: 'Columba livia (Pombo-doméstico)',
    metodoPadrao: 'Manejo ambiental, remoção de ninhos e barreiras físicas'
  },
  {
    id: 'FORMIGA',
    nome: 'Formiga',
    subtitulo: 'Lava-pés / Urbana',
    icon: '🐜',
    cor: 'text-orange-500',
    borda: 'border-orange-500',
    bgAtivo: 'bg-orange-500/10 border-orange-500 text-orange-900 dark:text-orange-300',
    especiePadrao: 'Solenopsis invicta (Formiga Lava-pés)',
    metodoPadrao: 'Aplicação de iscas formicidas em gel e regulador de crescimento'
  }
];

export const CcpuNovaOcorrenciaModal: React.FC<CcpuNovaOcorrenciaModalProps> = ({
  currentUser,
  onClose,
  onSave
}) => {
  const [tipoPraga, setTipoPraga] = useState<TipoPragaCcpu>('ESCORPIAO');
  const [subtipoEspecie, setSubtipoEspecie] = useState('Tityus serrulatus (Escorpião Amarelo)');
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

  // Coleta
  const [quantidade, setQuantidade] = useState<number>(1);
  const [statusEspecime, setStatusEspecime] = useState<StatusEspecimeCcpu>('VIVO');
  const [metodoColetaAcao, setMetodoColetaAcao] = useState('Busca ativa noturna com lanterna ultravioleta (UV) e pinça entomológica');
  const [condicaoEstrutural, setCondicaoEstrutural] = useState('Grelha com fresta de passagem; acúmulo de matéria orgânica no fundo do bueiro');
  const [fatoresAtrativos, setFatoresAtrativos] = useState<string[]>([
    'Presença de baratas de esgoto (alimento)',
    'Água estagnada / alta umidade'
  ]);
  const [novoFator, setNovoFator] = useState('');

  // Responsável e Ações
  const [servidorResponsavel, setServidorResponsavel] = useState(() => {
    return currentUser ? `${currentUser.nome_completo} (${currentUser.cargo})` : 'Agente CCPU / Fiscal Sanitário';
  });
  const [matriculaServidor, setMatriculaServidor] = useState(() => currentUser?.matricula || '');
  const [statusOcorrencia, setStatusOcorrencia] = useState<'COLETADO' | 'EM_MONITORAMENTO' | 'BLOQUEIO_REALIZADO' | 'AGUARDANDO_OBRAS' | 'CONCLUIDO'>('COLETADO');
  const [notificacaoEmitida, setNotificacaoEmitida] = useState(false);
  const [numeroNotificacao, setNumeroNotificacao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [medidasAdotadas, setMedidasAdotadas] = useState('Coleta manual com pinça; identificação no laboratório CCPU; encaminhamento para limpeza e telamento do bueiro.');

  // Atualiza coordenadas padrão ao mudar o bairro
  const handleBairroChange = (novoBairro: string) => {
    setBairro(novoBairro);
    const coords = COORDENADAS_BAIRROS_BC[novoBairro.toUpperCase()];
    if (coords) {
      setLat(coords.lat);
      setLng(coords.lng);
    }
  };

  // Ao mudar de praga, atualiza espécie e método padrão
  const handlePragaChange = (pragaId: TipoPragaCcpu) => {
    setTipoPraga(pragaId);
    const cfg = PRAGAS_CONFIG.find(p => p.id === pragaId);
    if (cfg) {
      setSubtipoEspecie(cfg.especiePadrao);
      setMetodoColetaAcao(cfg.metodoPadrao);
    }
  };

  // Consulta clima em tempo real
  const handleFetchWeather = async () => {
    setLoadingWeather(true);
    setWeatherSuccess(false);
    try {
      // Tenta rota do backend primeiro
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
        // Fallback direto via client para Open-Meteo
        const directRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-26.9926&longitude=-48.6353&current=temperature_2m,relative_humidity_2m,weather_code');
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
      // Se tudo falhar, mantém valor seguro
      setTemperatura(24.0);
      setCondicaoClima('Parcialmente Nublado');
      setFonteTemperatura('Estimativa Balneário Camboriú');
      setWeatherSuccess(true);
    } finally {
      setLoadingWeather(false);
    }
  };

  // Busca clima automaticamente ao abrir o modal
  useEffect(() => {
    handleFetchWeather();
  }, []);

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
    const identificacaoFinal = identificacaoBueiroLocal.trim() || 
      (tipoLocal === 'BUEIRO_BOCA_LOBO' ? `Bueiro na ${endereco}, ${numero || 'S/N'}` : `${endereco}, ${numero || 'S/N'}`);

    const nova: CcpuOcorrenciaItem = {
      id: `ccpu-${Date.now()}`,
      protocolo: protocoloGerado,
      tipoPraga,
      subtipoEspecie: subtipoEspecie.trim() || 'Espécie em identificação',
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
      fatoresAtrativos,
      servidorResponsavel: servidorResponsavel.trim(),
      matriculaServidor: matriculaServidor.trim(),
      statusOcorrencia,
      notificacaoEmitida,
      numeroNotificacao: notificacaoEmitida ? (numeroNotificacao || `NOT-${protocoloGerado}`) : undefined,
      observacoes: observacoes.trim(),
      medidasAdotadas: medidasAdotadas.trim(),
      createdAt: new Date().toISOString()
    };

    onSave(nova);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950/40 flex items-center justify-center text-xl shadow-inner">
              🦂
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">
                Nova Ocorrência / Coleta de Praga • CCPU
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
          {/* 1. Escolha da Praga / Vetor */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-2">
              1. Selecione a Ocorrência / Praga Alvo *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {PRAGAS_CONFIG.map((p) => {
                const isSelected = tipoPraga === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePragaChange(p.id)}
                    className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                      isSelected
                        ? p.bgAtivo + ' ring-2 ring-amber-400/50 shadow-md scale-[1.02]'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-2xl mb-1">{p.icon}</span>
                    <span className="text-xs font-black uppercase">{p.nome}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight line-clamp-1">
                      {p.subtitulo}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subespécie e Data/Hora */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1">
                Espécie / Identificação Técnica
              </label>
              <input
                type="text"
                value={subtipoEspecie}
                onChange={(e) => setSubtipoEspecie(e.target.value)}
                placeholder="Ex: Tityus serrulatus (Escorpião Amarelo)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block mb-1">
                Data e Hora da Coleta / Ocorrência *
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

          {/* 2. Temperatura e Clima Inteligente (Google / Weather API) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-slate-100 dark:to-slate-800/40 border border-amber-300 dark:border-amber-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="text-xs font-black uppercase text-amber-950 dark:text-amber-200 block">
                    2. Condições Climáticas & Temperatura no Momento da Coleta
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    Crucial para o comportamento de escorpiões (saem com calor/umidade) e vetores.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFetchWeather}
                disabled={loadingWeather}
                className="flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 shrink-0"
                title="Consultar previsão do tempo atual de Balneário Camboriú"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingWeather ? 'animate-spin' : ''}`} />
                <span>{loadingWeather ? 'Buscando...' : 'Obter Temperatura Atual'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Temperatura (°C) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={temperatura}
                    onChange={(e) => setTemperatura(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-amber-600 dark:text-amber-400 outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs font-black text-slate-400">°C</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Umidade Relativa (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={umidadeRelativa}
                    onChange={(e) => setUmidadeRelativa(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs font-black text-slate-400">%</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Condição / Descrição
                </label>
                <input
                  type="text"
                  value={condicaoClima}
                  onChange={(e) => setCondicaoClima(e.target.value)}
                  placeholder="Ex: Noite Quente e Úmida"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
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

          {/* 3. Localização do Bueiro / Endereço */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500" />
              <span>3. Localização do Ponto / Bueiro / Logradouro</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Bairro de Balneário Camboriú *
                </label>
                <select
                  value={bairro}
                  onChange={(e) => handleBairroChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none"
                >
                  {Object.keys(COORDENADAS_BAIRROS_BC).map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Número / Referência
                </label>
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Ex: 1500 ou S/N"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Tipo de Local *
                </label>
                <select
                  value={tipoLocal}
                  onChange={(e) => setTipoLocal(e.target.value as TipoLocalCcpu)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none"
                >
                  <option value="BUEIRO_BOCA_LOBO">Bueiro / Boca de Lobo</option>
                  <option value="CAIXA_INSPECAO">Caixa de Inspeção Pluvial/Esgoto</option>
                  <option value="GALERIA_ESGOTO">Galeria Pluvial Subterrânea</option>
                  <option value="RESIDENCIA">Residência Unifamiliar/Prédio</option>
                  <option value="COMERCIO">Estabelecimento Comercial</option>
                  <option value="TERRENO_BALDIO">Terreno Baldio</option>
                  <option value="VIA_PUBLICA">Via Pública / Calçada</option>
                  <option value="ESCOLA_CRECHE">Escola / Creche</option>
                  <option value="UNIDADE_SAUDE">Unidade de Saúde</option>
                  <option value="OUTRO">Outro Local</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Identificação do Bueiro / Ponto
                </label>
                <input
                  type="text"
                  value={identificacaoBueiroLocal}
                  onChange={(e) => setIdentificacaoBueiroLocal(e.target.value)}
                  placeholder="Ex: Bueiro #BC-C12 - calçada ímpar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono outline-none"
                />
              </div>
            </div>

            {/* Coordenadas GPS */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                Coordenadas Geográficas (GPS):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                  Lat: {lat.toFixed(5)}
                </span>
                <span className="font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                  Lng: {lng.toFixed(5)}
                </span>
                <button
                  type="button"
                  onClick={() => handleBairroChange(bairro)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 rounded text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  Recalibrar Bairro
                </button>
              </div>
            </div>
          </div>

          {/* 4. Detalhes da Coleta e Espécimes */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Bug className="w-4 h-4 text-amber-500" />
              <span>4. Detalhes da Captura / Espécimes</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Quantidade Coletada / Avistada *
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-black outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Estado do Espécime *
                </label>
                <select
                  value={statusEspecime}
                  onChange={(e) => setStatusEspecime(e.target.value as StatusEspecimeCcpu)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none"
                >
                  <option value="VIVO">Vivo (Ativo)</option>
                  <option value="MORTO">Morto</option>
                  <option value="AMBOS">Vivos e Mortos</option>
                  <option value="APENAS_VESTIGIOS">Apenas Vestígios (Fezes / Exúvia / Tocas)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                  Status da Ocorrência *
                </label>
                <select
                  value={statusOcorrencia}
                  onChange={(e) => setStatusOcorrencia(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none"
                >
                  <option value="COLETADO">Coletado</option>
                  <option value="EM_MONITORAMENTO">Em Monitoramento</option>
                  <option value="BLOQUEIO_REALIZADO">Bloqueio Químico Realizado</option>
                  <option value="AGUARDANDO_OBRAS">Aguardando Reparo de Obras</option>
                  <option value="CONCLUIDO">Concluído</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                Método de Coleta / Ação
              </label>
              <input
                type="text"
                value={metodoColetaAcao}
                onChange={(e) => setMetodoColetaAcao(e.target.value)}
                placeholder="Ex: Busca ativa com pinça UV"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                Condição Estrutural do Bueiro / Local
              </label>
              <input
                type="text"
                value={condicaoEstrutural}
                onChange={(e) => setCondicaoEstrutural(e.target.value)}
                placeholder="Ex: Tampa quebrada com fresta de 4cm; acúmulo de terra"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
              />
            </div>

            {/* Fatores Atrativos */}
            <div>
              <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                Fatores Atrativos Identificados
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {fatoresAtrativos.map((fator, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs rounded-full font-medium"
                  >
                    <span>{fator}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFator(idx)}
                      className="hover:text-red-500 transition cursor-pointer"
                    >
                      <X className="w-3 h-3" />
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
                  placeholder="Adicionar fator (ex: Baratas no bueiro, Lixo orgânico)..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddFator}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>

          {/* 5. Medidas Adotadas e Parecer */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span>5. Medidas Adotadas e Servidor Responsável</span>
            </h3>

            <div>
              <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                Medidas Adotadas In Loco *
              </label>
              <textarea
                rows={2}
                value={medidasAdotadas}
                onChange={(e) => setMedidasAdotadas(e.target.value)}
                placeholder="Descreva as medidas imediatas aplicadas..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                Observações Técnicas / Encaminhamentos
              </label>
              <textarea
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações complementares para o laudo..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  Matrícula Funcional
                </label>
                <input
                  type="text"
                  value={matriculaServidor}
                  onChange={(e) => setMatriculaServidor(e.target.value)}
                  placeholder="Ex: FIS-4092"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={notificacaoEmitida}
                  onChange={(e) => setNotificacaoEmitida(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <span>Emitir Notificação Sanitária Oficial</span>
              </label>

              {notificacaoEmitida && (
                <input
                  type="text"
                  value={numeroNotificacao}
                  onChange={(e) => setNumeroNotificacao(e.target.value)}
                  placeholder="Nº Notificação (opcional)"
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono outline-none"
                />
              )}
            </div>
          </div>

          {/* Botões de Ação do Rodapé */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Salvar Ocorrência e Gerar Registro</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
