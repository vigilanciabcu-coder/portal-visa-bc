import React, { useState, useMemo } from 'react';
import {
  X,
  Clock,
  Calendar,
  Building2,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  FileCheck2,
  ArrowRight,
  Plus,
  Printer,
  ChevronDown,
  ChevronUp,
  Send,
  Sparkles,
  Shuffle,
  Eye,
  Tag,
  MapPin,
  Lock,
  Layers,
  FileSignature
} from 'lucide-react';
import { ProcessoItem, TramitacaoItem, TipoTramitacao, UserProfile } from '../types';
import {
  getLinhaDoTempoProcesso,
  getEtapasPipelineProcesso,
  adicionarTramitacaoAoProcesso,
  calcularDiasDecorridos
} from '../lib/timelineService';
import { DocumentoOficialPdfModal, TipoDocumentoOficial } from './DocumentoOficialPdfModal';

export interface ProcessoTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  processo: ProcessoItem | null;
  currentUser: UserProfile | null;
  onProcessoAtualizado?: (processoAtualizado: ProcessoItem) => void;
}

export const ProcessoTimelineModal: React.FC<ProcessoTimelineModalProps> = ({
  isOpen,
  onClose,
  processo,
  currentUser,
  onProcessoAtualizado
}) => {
  if (!isOpen || !processo) return null;

  const isMaster = currentUser?.nivel_acesso?.toUpperCase().includes('MASTER') ||
    currentUser?.cargo === 'MASTER ADM';
  const isServidor = currentUser?.tipo_usuario === 'SERVIDOR' || isMaster;

  // Estados locais
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [ordemCrescente, setOrdemCrescente] = useState<boolean>(true);
  const [formNovoDespachoAberto, setFormNovoDespachoAberto] = useState<boolean>(false);

  // Estados do formulário de novo despacho
  const [novoTipo, setNovoTipo] = useState<TipoTramitacao>('DESPACHO_ADMINISTRATIVO');
  const [novoTitulo, setNovoTitulo] = useState<string>('');
  const [novaDescricao, setNovaDescricao] = useState<string>('');
  const [novoPrazoDias, setNovoPrazoDias] = useState<number>(0);
  const [novoSetorDestino, setNovoSetorDestino] = useState<string>('');
  const [erroForm, setErroForm] = useState<string | null>(null);

  // Modal de visualização de PDF
  const [modalPdfOpen, setModalPdfOpen] = useState(false);
  const [modalPdfTipo, setModalPdfTipo] = useState<TipoDocumentoOficial>('AUTO_NOTIFICACAO');

  // Recupera histórico e pipeline
  const pipelineEtapas = useMemo(() => getEtapasPipelineProcesso(processo), [processo]);
  const todosEventos = useMemo(() => getLinhaDoTempoProcesso(processo), [processo]);

  // Tempo total decorrido do processo
  const dataInicioProcesso = processo.data_protocolo || processo.data_entrada || processo.data_1doc || '2026-01-05';
  const totalDiasDecorridos = useMemo(() => calcularDiasDecorridos(dataInicioProcesso), [dataInicioProcesso]);

  // Eventos filtrados e ordenados
  const eventosFiltrados = useMemo(() => {
    let lista = [...todosEventos];

    if (filtroTipo === 'PARECERES') {
      lista = lista.filter((e) =>
        e.tipo === 'PARECER_EMITIDO' ||
        e.tipo === 'NOTIFICACAO_LAVRADA' ||
        e.tipo === 'DEFERIMENTO_ALVARA' ||
        e.tipo === 'AUTO_INFRACAO'
      );
    } else if (filtroTipo === 'VISTORIAS') {
      lista = lista.filter((e) => e.tipo === 'VISTORIA_AGENDADA' || e.tipo === 'VISTORIA_REALIZADA');
    } else if (filtroTipo === 'DESPACHOS') {
      lista = lista.filter((e) =>
        e.tipo === 'DESPACHO_ADMINISTRATIVO' ||
        e.tipo === 'DISTRIBUICAO_FISCAL' ||
        e.tipo === 'TROCA_FISCAL' ||
        e.tipo === 'DILIGENCIA_EXTERNA'
      );
    }

    if (!ordemCrescente) {
      lista.reverse();
    }

    return lista;
  }, [todosEventos, filtroTipo, ordemCrescente]);

  // Grava novo despacho
  const handleGravarNovoDespacho = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.trim() || !novaDescricao.trim()) {
      setErroForm('Por favor, informe o título e a descrição do despacho sanitário.');
      return;
    }

    const { processoAtualizado } = adicionarTramitacaoAoProcesso(
      processo,
      {
        tipo: novoTipo,
        titulo: novoTitulo.trim(),
        descricao: novaDescricao.trim(),
        prazo_dias: novoPrazoDias > 0 ? novoPrazoDias : undefined,
        setor_origem: currentUser?.setor || 'DVIS',
        setor_destino: novoSetorDestino.trim() || undefined
      },
      currentUser
    );

    if (onProcessoAtualizado) {
      onProcessoAtualizado(processoAtualizado);
    }

    // Limpa campos
    setNovoTitulo('');
    setNovaDescricao('');
    setNovoPrazoDias(0);
    setNovoSetorDestino('');
    setErroForm(null);
    setFormNovoDespachoAberto(false);
  };

  const getIconeTipo = (tipo: TipoTramitacao) => {
    switch (tipo) {
      case 'PROTOCOLO_CRIADO':
        return <Building2 className="w-4 h-4 text-blue-400" />;
      case 'DISTRIBUICAO_FISCAL':
      case 'TROCA_FISCAL':
        return <User className="w-4 h-4 text-purple-400" />;
      case 'VISTORIA_AGENDADA':
      case 'VISTORIA_REALIZADA':
        return <Clock className="w-4 h-4 text-cyan-400" />;
      case 'NOTIFICACAO_LAVRADA':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'DEFERIMENTO_ALVARA':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'AUTO_INFRACAO':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'DOCUMENTO_ANEXADO':
        return <FileCheck2 className="w-4 h-4 text-indigo-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-300" />;
    }
  };

  const getCorBadgeTipo = (tipo: TipoTramitacao) => {
    switch (tipo) {
      case 'PROTOCOLO_CRIADO':
        return 'bg-blue-950 text-blue-300 border-blue-800';
      case 'DISTRIBUICAO_FISCAL':
      case 'TROCA_FISCAL':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      case 'VISTORIA_AGENDADA':
      case 'VISTORIA_REALIZADA':
        return 'bg-cyan-950 text-cyan-300 border-cyan-800';
      case 'NOTIFICACAO_LAVRADA':
        return 'bg-amber-950 text-amber-300 border-amber-700';
      case 'DEFERIMENTO_ALVARA':
        return 'bg-emerald-950 text-emerald-300 border-emerald-700';
      case 'AUTO_INFRACAO':
        return 'bg-rose-950 text-rose-300 border-rose-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-[105] bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#141824] border border-slate-700 text-slate-100 rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[95vh] my-auto">
        
        {/* 🌟 CABEÇALHO DO PROCESSO & AÇÕES */}
        <div className="p-4 sm:p-5 bg-[#0f121d] border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-900/60 text-blue-300 border border-blue-500/40 font-mono">
                PROC: {processo.num_processo || 'S/N'}
              </span>
              {processo.prot_1doc && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold text-slate-300 bg-slate-800 border border-slate-700 font-mono">
                  1Doc: {processo.prot_1doc}
                </span>
              )}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                processo.status === 'DEFERIDO'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : processo.status === 'NOTIFICADO'
                  ? 'bg-amber-950 text-amber-300 border-amber-700'
                  : processo.status === 'INDEFERIDO'
                  ? 'bg-rose-950 text-rose-300 border-rose-700'
                  : 'bg-indigo-950 text-indigo-300 border-indigo-700'
              }`}>
                {processo.status}
              </span>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                <Clock className="w-3 h-3" />
                {totalDiasDecorridos} dias em tramitação
              </span>
            </div>

            <h2 className="text-base sm:text-xl font-black text-white uppercase tracking-tight truncate">
              {processo.razao_social || processo.nome_fantasia || 'Processo Sanitário'}
            </h2>

            <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
              <span><strong>CNPJ/CPF:</strong> {processo.cnpj_cpf}</span>
              <span>•</span>
              <span><strong>Bairro:</strong> {processo.bairro || 'Centro'}</span>
              <span>•</span>
              <span><strong>Fiscal:</strong> <span className="text-amber-300 font-semibold">{processo.fiscal_responsavel || 'A Distribuir'}</span></span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {/* Botão Novo Despacho Sanitário */}
            {isServidor && (
              <button
                type="button"
                onClick={() => setFormNovoDespachoAberto(!formNovoDespachoAberto)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  formNovoDespachoAberto
                    ? 'bg-amber-600 text-white'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
                }`}
                title="Inserir despacho formal na linha do tempo deste processo"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{formNovoDespachoAberto ? 'Fechar Despacho' : 'Novo Despacho'}</span>
              </button>
            )}

            {/* Imprimir Linha do Tempo */}
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
              title="Imprimir relatório cronológico de tramitação"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Fechar */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 🛣️ PIPELINE VISUAL DE ETAPAS (STEPPER SANITÁRIO) */}
        <div className="p-4 bg-[#111420] border-b border-slate-800 overflow-x-auto shrink-0">
          <div className="min-w-[620px]">
            <div className="flex items-center justify-between relative">
              {/* Linha conectora de fundo */}
              <div className="absolute left-6 right-6 top-4 h-1 bg-slate-800 -z-0"></div>

              {pipelineEtapas.map((etapa, idx) => {
                const isConcluida = etapa.status === 'CONCLUIDA';
                const isAtual = etapa.status === 'EM_ANDAMENTO';

                return (
                  <div key={etapa.id} className="relative z-10 flex flex-col items-center text-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md transition ${
                        isConcluida
                          ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/20'
                          : isAtual
                          ? 'bg-blue-600 text-white ring-4 ring-blue-500/30 animate-pulse'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {isConcluida ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>

                    <span className={`text-[11px] font-black uppercase mt-1.5 ${
                      isConcluida ? 'text-emerald-300' : isAtual ? 'text-blue-300' : 'text-slate-500'
                    }`}>
                      {etapa.nome}
                    </span>

                    <span className="text-[10px] text-slate-400 font-mono">
                      {etapa.subtitulo}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ✏️ FORMULÁRIO DE NOVO DESPACHO SANITÁRIO (EXPANSÍVEL) */}
        {formNovoDespachoAberto && isServidor && (
          <form
            onSubmit={handleGravarNovoDespacho}
            className="p-4 sm:p-5 bg-slate-950 border-b border-amber-600/40 text-xs space-y-3 shrink-0 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-black uppercase text-amber-400 flex items-center gap-1.5">
                <FileSignature className="w-4 h-4" /> Lançar Nova Movimentação / Despacho Sanitário
              </span>
              <span className="text-[11px] text-slate-400">
                Assinatura automática por <strong>{currentUser?.nome_completo || 'Servidor'}</strong>
              </span>
            </div>

            {erroForm && (
              <div className="p-2.5 bg-rose-950/80 border border-rose-600 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{erroForm}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-300 block mb-1">
                  Tipo de Movimentação *
                </label>
                <select
                  value={novoTipo}
                  onChange={(e) => setNovoTipo(e.target.value as TipoTramitacao)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="DESPACHO_ADMINISTRATIVO">📝 Despacho Administrativo</option>
                  <option value="DOCUMENTO_ANEXADO">📎 Juntada de Documentos</option>
                  <option value="VISTORIA_AGENDADA">🔍 Agendamento de Vistoria</option>
                  <option value="VISTORIA_REALIZADA">✅ Vistoria Sanitária Concluída</option>
                  <option value="DILIGENCIA_EXTERNA">🚗 Diligência Externa</option>
                  <option value="LAUDO_POTABILIDADE_SOLICITADO">💧 Solicitação ao Laboratório</option>
                  <option value="CUMPRIMENTO_EXIGENCIA">📑 Cumprimento de Exigências</option>
                  <option value="ARQUIVAMENTO">📁 Despacho de Arquivamento</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-300 block mb-1">
                  Título do Ato / Assunto *
                </label>
                <input
                  type="text"
                  required
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  placeholder="Ex: Juntada de Laudo de Potabilidade..."
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-amber-400"
                >
                </input>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-300 block mb-1">
                    Prazo (Dias)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={novoPrazoDias}
                    onChange={(e) => setNovoPrazoDias(parseInt(e.target.value, 10) || 0)}
                    placeholder="Ex: 30"
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-300 block mb-1">
                    Destino (Setor)
                  </label>
                  <input
                    type="text"
                    value={novoSetorDestino}
                    onChange={(e) => setNovoSetorDestino(e.target.value)}
                    placeholder="Ex: Laboratório / Gabinete"
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-300 block mb-1">
                Texto Circunstanciado do Despacho *
              </label>
              <textarea
                rows={2}
                required
                value={novaDescricao}
                onChange={(e) => setNovaDescricao(e.target.value)}
                placeholder="Descreva detalhadamente o teor da tramitação, juntada ou determinação sanitária..."
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setFormNovoDespachoAberto(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gravar Movimentação Oficial</span>
              </button>
            </div>
          </form>
        )}

        {/* 🎛️ BARRA DE FILTROS E ORDENAÇÃO */}
        <div className="p-3 bg-[#0d101a] border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto text-xs shrink-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-black uppercase text-slate-400 mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Filtro:</span>
            </span>

            {[
              { id: 'TODOS', label: `Todos (${todosEventos.length})` },
              { id: 'PARECERES', label: '⚖️ Pareceres & Autos' },
              { id: 'VISTORIAS', label: '🔍 Vistorias' },
              { id: 'DESPACHOS', label: '📝 Despachos' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroTipo(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filtroTipo === f.id
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/80'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setOrdemCrescente(!ordemCrescente)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
              title="Alternar ordem da timeline"
            >
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{ordemCrescente ? 'Antigos Primeiro' : 'Recentes Primeiro'}</span>
            </button>
          </div>
        </div>

        {/* 📜 CORPO DA LINHA DO TEMPO CRONOLÓGICA */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 bg-[#0f121d]">
          {eventosFiltrados.length === 0 ? (
            <div className="p-12 text-center text-slate-500 italic space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
              <p>Nenhuma movimentação sanitária localizada para o filtro selecionado.</p>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-blue-600 before:via-purple-600 before:to-emerald-500">
              {eventosFiltrados.map((evento, idx) => {
                const corBadge = getCorBadgeTipo(evento.tipo);
                const icone = getIconeTipo(evento.tipo);

                return (
                  <div key={evento.id || idx} className="relative group">
                    {/* Nó conector da timeline */}
                    <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full bg-slate-900 border-2 border-blue-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition shrink-0 z-10">
                      {icone}
                    </div>

                    {/* Card da Movimentação */}
                    <div className="bg-[#171c2b] border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg space-y-2.5 hover:border-slate-600 transition">
                      {/* Linha 1: Título, Data e Badge de Status */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${corBadge}`}>
                            {evento.tipo.replace(/_/g, ' ')}
                          </span>
                          <h4 className="text-sm font-bold text-white tracking-wide">
                            {evento.titulo}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                          <Calendar className="w-3.5 h-3.5 text-blue-400" />
                          <span>{evento.data_hora}</span>
                        </div>
                      </div>

                      {/* Linha 2: Descrição Detalhada */}
                      <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                        {evento.descricao}
                      </div>

                      {/* Linha 3: Prazos e Condicionantes (se houver) */}
                      {evento.prazo_dias && evento.prazo_dias > 0 && (
                        <div className="p-2.5 bg-amber-950/40 border border-amber-600/40 rounded-xl flex items-center justify-between text-xs">
                          <span className="text-amber-300 font-bold flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            Prazo Regulamentar para Adequação:
                          </span>
                          <span className="font-mono font-black text-amber-200 bg-amber-900/60 px-2 py-0.5 rounded border border-amber-600">
                            {evento.prazo_dias} DIAS CORRIDOS
                          </span>
                        </div>
                      )}

                      {/* Linha 4: Responsável, Setor e Ações Rápidas */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1 text-slate-300 font-medium">
                            <User className="w-3 h-3 text-slate-500" />
                            <strong>{evento.responsavel_nome}</strong>
                          </span>
                          {evento.responsavel_cargo && (
                            <span className="text-slate-500">({evento.responsavel_cargo})</span>
                          )}
                          {evento.setor_origem && (
                            <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                              Origem: {evento.setor_origem}
                            </span>
                          )}
                          {evento.setor_destino && (
                            <span className="font-mono text-[10px] bg-blue-950 text-blue-300 px-1.5 py-0.5 rounded border border-blue-900">
                              Destino: {evento.setor_destino}
                            </span>
                          )}
                        </div>

                        {/* Botão de Documento Relacionado */}
                        {evento.documento_relacionado && (
                          <button
                            type="button"
                            onClick={() => {
                              const tipoDocTarget =
                                evento.documento_relacionado?.tipo === 'AUTO_NOTIFICACAO'
                                  ? 'AUTO_NOTIFICACAO'
                                  : evento.documento_relacionado?.tipo === 'PARECER_TECNICO'
                                  ? 'PARECER_TECNICO'
                                  : evento.documento_relacionado?.tipo === 'AUTO_INFRACAO'
                                  ? 'AUTO_INFRACAO'
                                  : 'TERMO_VISTORIA';
                              setModalPdfTipo(tipoDocTarget);
                              setModalPdfOpen(true);
                            }}
                            className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white rounded-lg border border-blue-500/40 text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                            title="Visualizar documento oficial correspondente em PDF com QR Code"
                          >
                            <FileCheck2 className="w-3 h-3" />
                            <span>Ver PDF do Ato</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 🌟 RODAPÉ COM RESUMO */}
        <div className="p-3 bg-[#0d101a] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Linha do Tempo Oficial • DVIS Balneário Camboriú/SC</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de PDF Oficial se solicitado a partir de um ato */}
      <DocumentoOficialPdfModal
        isOpen={modalPdfOpen}
        onClose={() => setModalPdfOpen(false)}
        processo={processo}
        currentUser={currentUser}
        tipoDocumentoDefault={modalPdfTipo}
      />
    </div>
  );
};
