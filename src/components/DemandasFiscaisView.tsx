import React, { useState, useMemo } from 'react';
import {
  ProcessoItem,
  UserProfile,
  SetorDemanda,
  SETORES_DEMANDA_LISTA,
  isUserDiretor,
  isUserFiscal,
  isUserMaster,
  getSetorRestritoDoDiretor
} from '../types';
import {
  normalizarSetorDemanda,
  getFiscaisDoSetor,
  sortearFiscalRandomicamente,
  trocarFiscalDemanda,
  distribuirDemandasNaoAtribuidas,
  getEstatisticasDiretoria,
  calcularPrazoVistoria
} from '../lib/demandasService';
import { ProcessoDetalhesParecerModal } from './ProcessoDetalhesParecerModal';
import {
  Search,
  Users,
  UserCheck,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Shuffle,
  RefreshCw,
  FileSignature,
  Edit3,
  X,
  Filter,
  ArrowRight,
  ShieldCheck,
  Check,
  Send,
  Eye,
  SlidersHorizontal,
  Home,
  Utensils,
  HeartPulse,
  Pill,
  Waves,
  Tent,
  FileText,
  MapPin,
  Tag,
  Briefcase
} from 'lucide-react';

interface DemandasFiscaisViewProps {
  processos: ProcessoItem[];
  currentUser: UserProfile | null;
  users: UserProfile[];
  onSaveProcesso: (updated: ProcessoItem) => void;
  onNavigate?: (view: string) => void;
  initialModo?: 'minhas_demandas' | 'painel_diretoria';
}

export const DemandasFiscaisView: React.FC<DemandasFiscaisViewProps> = ({
  processos,
  currentUser,
  users,
  onSaveProcesso,
  onNavigate,
  initialModo
}) => {
  // Verificação de papéis
  const isDiretor = isUserDiretor(currentUser);
  const isFiscal = isUserFiscal(currentUser);
  const isMaster = isUserMaster(currentUser);

  // Aba principal: 'minhas_demandas' (visão do fiscal) ou 'painel_diretoria' (visão do diretor)
  const [modoAtivo, setModoAtivo] = useState<'minhas_demandas' | 'painel_diretoria'>(() => {
    if (initialModo) return initialModo;
    if (isDiretor && !currentUser?.cargo?.toUpperCase().includes('FISCAL')) {
      return 'painel_diretoria';
    }
    return 'minhas_demandas';
  });

  React.useEffect(() => {
    if (initialModo) {
      setModoAtivo(initialModo);
    }
  }, [initialModo]);

  // Identifica se o diretor atual possui jurisdição em um setor específico (ou se é Diretor Geral)
  const setorDiretorRestrito = useMemo(() => {
    return getSetorRestritoDoDiretor(currentUser);
  }, [currentUser]);

  // Filtros de busca e visualização (inicializa no setor do diretor caso seja setorial)
  const [buscaTexto, setBuscaTexto] = useState('');
  const [filtroSetor, setFiltroSetor] = useState<string>(() => {
    return setorDiretorRestrito || 'TODOS';
  });
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [filtroFiscalDiretoria, setFiltroFiscalDiretoria] = useState<string>('TODOS');

  // Para diretores navegando na visão de fiscal: permite simular a visão de qualquer fiscal
  const [fiscalVisualizadoId, setFiscalVisualizadoId] = useState<string>(() => {
    return currentUser?.id || '';
  });

  // Modal de Detalhes & Parecer Sanitário
  const [modalDetalhesOpen, setModalDetalhesOpen] = useState<{ open: boolean; processo: ProcessoItem | null }>({
    open: false,
    processo: null
  });

  // Modal de Troca de Fiscal da Diretoria
  const [modalTrocaFiscal, setModalTrocaFiscal] = useState<{
    open: boolean;
    processo: ProcessoItem | null;
    novoFiscalId: string;
    motivo: string;
  }>({
    open: false,
    processo: null,
    novoFiscalId: '',
    motivo: ''
  });

  // Feedback de notificações
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const exibirSucesso = (msg: string) => {
    setMensagemSucesso(msg);
    setTimeout(() => setMensagemSucesso(null), 5000);
  };

  // Lista de todos os fiscais ativos
  const fiscaisDisponiveis = useMemo(() => {
    return users.filter((u) => isUserFiscal(u));
  }, [users]);

  // Fiscal atualmente selecionado para a visão "Minhas Demandas"
  const fiscalAtual = useMemo(() => {
    if (fiscalVisualizadoId) {
      const match = users.find((u) => u.id === fiscalVisualizadoId);
      if (match) return match;
    }
    return currentUser;
  }, [users, fiscalVisualizadoId, currentUser]);

  // Estatísticas da Diretoria
  const statsDiretoria = useMemo(() => {
    return getEstatisticasDiretoria(processos, users);
  }, [processos, users]);

  // Demandas atribuídas ao fiscal atual
  const demandasDoFiscal = useMemo(() => {
    if (!fiscalAtual) return [];
    const nomeFiscal = (fiscalAtual.nome_completo || '').toLowerCase().trim();

    return processos.filter((p) => {
      const pFiscal = (p.fiscal_responsavel || '').toLowerCase().trim();
      return pFiscal.includes(nomeFiscal) || (nomeFiscal && nomeFiscal.includes(pFiscal));
    });
  }, [processos, fiscalAtual]);

  // Demandas filtradas para o Fiscal
  const demandasFiscalFiltradas = useMemo(() => {
    return demandasDoFiscal.filter((p) => {
      const setorNorm = normalizarSetorDemanda(p.setor, p.assunto || p.motivacao);
      if (filtroSetor !== 'TODOS' && setorNorm !== filtroSetor) return false;

      const sit = (p.status || '').toUpperCase();
      const isConcluido = sit.includes('DEFERIDO') || sit.includes('CONCLU');
      const isPendente = !isConcluido;

      if (filtroStatus === 'PENDENTES' && !isPendente) return false;
      if (filtroStatus === 'CONCLUIDOS' && !isConcluido) return false;
      if (filtroStatus === 'ALTO_RISCO' && p.grau_risco !== 'ALTO RISCO') return false;

      if (buscaTexto.trim()) {
        const q = buscaTexto.toLowerCase();
        const razao = (p.razao_social || '').toLowerCase();
        const fantasia = (p.nome_fantasia || '').toLowerCase();
        const cnpj = (p.cnpj_cpf || '').replace(/\D/g, '');
        const procNum = (p.num_processo || '').toLowerCase();
        const servico = (p.tipo_servico || p.assunto || p.motivacao || '').toLowerCase();
        const bairro = (p.bairro || '').toLowerCase();

        return (
          razao.includes(q) ||
          fantasia.includes(q) ||
          cnpj.includes(q.replace(/\D/g, '')) ||
          procNum.includes(q) ||
          servico.includes(q) ||
          bairro.includes(q)
        );
      }
      return true;
    });
  }, [demandasDoFiscal, filtroSetor, filtroStatus, buscaTexto]);

  // Demandas filtradas para o Painel da Diretoria
  const demandasDiretoriaFiltradas = useMemo(() => {
    return processos.filter((p) => {
      const setorNorm = normalizarSetorDemanda(p.setor, p.assunto || p.motivacao);
      if (filtroSetor !== 'TODOS' && setorNorm !== filtroSetor) return false;

      const sit = (p.status || '').toUpperCase();
      const isConcluido = sit.includes('DEFERIDO') || sit.includes('CONCLU');
      const isPendente = !isConcluido;

      if (filtroStatus === 'PENDENTES' && !isPendente) return false;
      if (filtroStatus === 'CONCLUIDOS' && !isConcluido) return false;
      if (filtroStatus === 'SEM_FISCAL') {
        const pFiscal = (p.fiscal_responsavel || '').toUpperCase();
        if (pFiscal && !pFiscal.includes('A DISTRIBUIR') && !pFiscal.includes('NÃO ATRIBUÍDO')) return false;
      }

      if (filtroFiscalDiretoria !== 'TODOS') {
        const fiscalFiltro = users.find((u) => u.id === filtroFiscalDiretoria);
        if (fiscalFiltro) {
          const nomeF = fiscalFiltro.nome_completo.toLowerCase();
          const pF = (p.fiscal_responsavel || '').toLowerCase();
          if (!pF.includes(nomeF)) return false;
        }
      }

      if (buscaTexto.trim()) {
        const q = buscaTexto.toLowerCase();
        const razao = (p.razao_social || '').toLowerCase();
        const fantasia = (p.nome_fantasia || '').toLowerCase();
        const cnpj = (p.cnpj_cpf || '').replace(/\D/g, '');
        const procNum = (p.num_processo || '').toLowerCase();
        const fiscal = (p.fiscal_responsavel || '').toLowerCase();
        const servico = (p.tipo_servico || p.assunto || p.motivacao || '').toLowerCase();

        return (
          razao.includes(q) ||
          fantasia.includes(q) ||
          cnpj.includes(q.replace(/\D/g, '')) ||
          procNum.includes(q) ||
          fiscal.includes(q) ||
          servico.includes(q)
        );
      }
      return true;
    });
  }, [processos, filtroSetor, filtroStatus, filtroFiscalDiretoria, buscaTexto, users]);

  // Ação: Distribuir uma demanda específica randomicamente por setor
  const handleSortearFiscalDemanda = (processo: ProcessoItem) => {
    const resultado = sortearFiscalRandomicamente(processo, users);
    if (resultado) {
      onSaveProcesso(resultado.processoAtualizado);
      exibirSucesso(`🎲 Demanda ${processo.num_processo || processo.razao_social} sorteada randomicamente para o fiscal: ${resultado.fiscalEscolhido.nome_completo} (${resultado.fiscalEscolhido.matricula || 'DVIS'}).`);
    } else {
      alert('Não foram encontrados fiscais disponíveis para o setor desta demanda.');
    }
  };

  // Ação: Distribuir todas as demandas pendentes automaticamente
  const handleDistribuirTodas = () => {
    const { processosAtualizados, totalDistribuidas } = distribuirDemandasNaoAtribuidas(processos, users);
    if (totalDistribuidas === 0) {
      alert('Todas as demandas já possuem fiscal atribuído.');
      return;
    }

    processosAtualizados.forEach((p) => onSaveProcesso(p));
    exibirSucesso(`✅ ${totalDistribuidas} demandas foram distribuídas randomicamente entre os fiscais de seus respectivos setores!`);
  };

  // Ação: Abrir modal da Diretoria para trocar fiscal
  const handleAbrirTrocaFiscal = (processo: ProcessoItem) => {
    const fiscalAtualNome = (processo.fiscal_responsavel || '').toLowerCase();
    const fiscalAtualObj = fiscaisDisponiveis.find((f) => fiscalAtualNome.includes(f.nome_completo.toLowerCase()));

    setModalTrocaFiscal({
      open: true,
      processo,
      novoFiscalId: fiscalAtualObj ? fiscalAtualObj.id : fiscaisDisponiveis[0]?.id || '',
      motivo: ''
    });
  };

  // Ação: Confirmar a troca de fiscal pela diretoria
  const handleConfirmarTrocaFiscal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTrocaFiscal.processo || !modalTrocaFiscal.novoFiscalId) return;

    const novoFiscal = users.find((u) => u.id === modalTrocaFiscal.novoFiscalId);
    if (!novoFiscal) return;

    const diretor = currentUser || {
      id: 'dir-admin',
      nome_completo: 'Diretoria de Vigilância Sanitária',
      cargo: 'DIRETOR-GERAL',
      email: 'diretoria@bc.sc.gov.br',
      data_nascimento: ''
    };

    const atualizado = trocarFiscalDemanda(
      modalTrocaFiscal.processo,
      novoFiscal,
      diretor,
      modalTrocaFiscal.motivo.trim() || 'Reatribuição pela Diretoria'
    );

    onSaveProcesso(atualizado);
    setModalTrocaFiscal({ open: false, processo: null, novoFiscalId: '', motivo: '' });
    exibirSucesso(`🔄 Demanda ${modalTrocaFiscal.processo.num_processo || ''} reatribuída com sucesso para o fiscal: ${novoFiscal.nome_completo}!`);
  };

  return (
    <div className="min-h-screen bg-[#181818] text-slate-100 p-2 sm:p-4 font-sans space-y-4 animate-fadeIn selection:bg-blue-600 selection:text-white">
      
      {/* 🌟 BARRA SUPERIOR: NAVEGADOR PRINCIPAL (BOTÕES FISCAL & DIRETOR) */}
      <div className="bg-[#222] border border-[#383838] p-2.5 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-3 relative z-30">
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="px-3 py-2 bg-[#2a2a2a] hover:bg-[#333] text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer shadow-sm"
              title="Voltar para a página inicial"
            >
              <span>← Início</span>
            </button>
          )}

          {/* BOTÃO 1: MINHAS DEMANDAS (VISÃO DO FISCAL) */}
          <button
            type="button"
            onClick={() => setModoAtivo('minhas_demandas')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2.5 shadow-md transition-all cursor-pointer ${
              modoAtivo === 'minhas_demandas'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white ring-2 ring-blue-400/50 scale-102'
                : 'bg-[#2a2a2a] text-slate-300 hover:bg-[#333] hover:text-white border border-slate-700'
            }`}
          >
            <FileSignature className="w-4 h-4 text-blue-300" />
            <span>📋 Minhas Demandas de Trabalho</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/40 text-blue-200 border border-blue-400/30">
              {demandasDoFiscal.length}
            </span>
          </button>

          {/* BOTÃO 2: PAINEL DA DIRETORIA (CONTROLE GERAL & TROCA DE FISCAIS) */}
          <button
            type="button"
            onClick={() => setModoAtivo('painel_diretoria')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2.5 shadow-md transition-all cursor-pointer ${
              modoAtivo === 'painel_diretoria'
                ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white ring-2 ring-purple-400/50 scale-102'
                : 'bg-[#2a2a2a] text-slate-300 hover:bg-[#333] hover:text-white border border-slate-700'
            }`}
          >
            <Users className="w-4 h-4 text-purple-300" />
            <span>👔 Painel da Diretoria (Demandas & Fiscais)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/40 text-purple-200 border border-purple-400/30">
              {processos.length}
            </span>
          </button>
        </div>

        {/* LADO DIREITO: INFORMAÇÃO DO USUÁRIO & AÇÕES RÁPIDAS */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          {modoAtivo === 'painel_diretoria' && (
            <button
              type="button"
              onClick={handleDistribuirTodas}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg transition active:scale-95 cursor-pointer ring-1 ring-emerald-400/40"
              title="Distribui automaticamente todas as demandas sem fiscal atribuído randomicamente por setor"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>🎲 Sortear Demandas Pendentes</span>
            </button>
          )}

          {modoAtivo === 'minhas_demandas' && (isDiretor || isMaster) && (
            <div className="flex items-center gap-1.5 bg-[#1b1b1b] border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-slate-400 font-bold">Ver como Fiscal:</span>
              <select
                value={fiscalVisualizadoId}
                onChange={(e) => setFiscalVisualizadoId(e.target.value)}
                className="bg-transparent text-blue-300 font-bold focus:outline-none cursor-pointer"
              >
                {fiscaisDisponiveis.map((f) => (
                  <option key={f.id} value={f.id} className="bg-[#242424] text-white">
                    {f.nome_completo} ({f.matricula || 'DVIS'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-black/40 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{isDiretor ? 'Perfil: Diretoria VISA' : 'Perfil: Fiscal Sanitário'}</span>
          </div>
        </div>
      </div>

      {/* FEEDBACK DE SUCESSO TEMPORÁRIO */}
      {mensagemSucesso && (
        <div className="bg-emerald-950/80 border border-emerald-600 p-3.5 px-5 rounded-xl text-xs text-emerald-200 font-bold flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensagemSucesso(null)}
            className="text-emerald-400 hover:text-white font-black text-xs cursor-pointer ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 📋 MODO 1: VISÃO DO FISCAL ("MINHAS DEMANDAS DE TRABALHO") */}
      {/* ======================================================== */}
      {modoAtivo === 'minhas_demandas' && (
        <div className="space-y-4 animate-fadeIn">
          {/* BANNER DO FISCAL & INDICADORES */}
          <div className="bg-gradient-to-r from-blue-950 via-[#151c2e] to-slate-900 border border-blue-500/40 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3" />
                  Ordens de Serviço • Carteira Individual do Servidor
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <span>Demandas Atribuídas a:</span>
                  <span className="text-blue-300">{fiscalAtual?.nome_completo || 'Fiscal Sanitário'}</span>
                </h2>
                <p className="text-xs text-blue-200/80">
                  Matrícula: <strong>{fiscalAtual?.matricula || 'DVIS-BC'}</strong> • Cargo: <strong>{fiscalAtual?.cargo || 'FISCAL SANITÁRIO'}</strong> • Setor Principal: <strong>{fiscalAtual?.setor || 'VIGILÂNCIA SANITÁRIA'}</strong>
                </p>
              </div>

              {/* CARDS DE INDICADORES RÁPIDOS DO FISCAL */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
                <div className="bg-[#181f33]/90 border border-blue-500/30 p-2.5 rounded-xl text-center min-w-[95px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total</span>
                  <strong className="text-lg font-black text-white">{demandasDoFiscal.length}</strong>
                </div>
                <div className="bg-[#181f33]/90 border border-amber-500/30 p-2.5 rounded-xl text-center min-w-[95px]">
                  <span className="text-[10px] font-bold text-amber-300 uppercase block">Pendentes</span>
                  <strong className="text-lg font-black text-amber-400">
                    {demandasDoFiscal.filter((d) => !(d.status || '').toUpperCase().includes('DEFERIDO')).length}
                  </strong>
                </div>
                <div className="bg-[#181f33]/90 border border-red-500/30 p-2.5 rounded-xl text-center min-w-[95px]">
                  <span className="text-[10px] font-bold text-rose-300 uppercase block">Alto Risco</span>
                  <strong className="text-lg font-black text-rose-400">
                    {demandasDoFiscal.filter((d) => d.grau_risco === 'ALTO RISCO').length}
                  </strong>
                </div>
                <div className="bg-[#181f33]/90 border border-emerald-500/30 p-2.5 rounded-xl text-center min-w-[95px]">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase block">Concluídas</span>
                  <strong className="text-lg font-black text-emerald-400">
                    {demandasDoFiscal.filter((d) => (d.status || '').toUpperCase().includes('DEFERIDO')).length}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* BARRA DE FILTROS DO FISCAL */}
          <div className="bg-[#242424] border border-[#333] p-3 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                placeholder="Buscar por Razão Social, CNPJ/CPF, Protocolo, Bairro ou Tipo de Serviço..."
                className="w-full bg-[#181818] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <select
                value={filtroSetor}
                onChange={(e) => setFiltroSetor(e.target.value)}
                className="bg-[#181818] border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="TODOS">Todos os Setores</option>
                {SETORES_DEMANDA_LISTA.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>

              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="bg-[#181818] border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="PENDENTES">Aguardando Vistoria / Análise</option>
                <option value="ALTO_RISCO">Somente Alto Risco</option>
                <option value="CONCLUIDOS">Concluídos / Deferidos</option>
              </select>
            </div>
          </div>

          {/* LISTA DE DEMANDAS DO FISCAL */}
          {demandasFiscalFiltradas.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#242424] border border-dashed border-[#3d3d3d] text-center space-y-3">
              <FileSignature className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-300 uppercase">
                Nenhuma demanda de trabalho encontrada para este filtro
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No momento não há ordens de serviço pendentes para o fiscal selecionado com os filtros atuais. Novas solicitações serão distribuídas automaticamente pela Diretoria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {demandasFiscalFiltradas.map((demanda) => {
                const setorNorm = normalizarSetorDemanda(demanda.setor, demanda.assunto || demanda.motivacao);
                const setorConfig = SETORES_DEMANDA_LISTA.find((s) => s.id === setorNorm) || SETORES_DEMANDA_LISTA[7];
                const sit = (demanda.status || '').toUpperCase();
                const isConcluido = sit.includes('DEFERIDO') || sit.includes('CONCLU');
                const isPend = !isConcluido;
                const totalPareceres = demanda.pareceres?.length || 0;

                return (
                  <div
                    key={demanda.id}
                    onDoubleClick={() => setModalDetalhesOpen({ open: true, processo: demanda })}
                    className="bg-[#242424] border border-[#383838] hover:border-blue-500/70 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5 transition-all select-none group relative"
                    title="Dê 2 cliques para abrir o espelho sanitário e dar seu parecer com assinatura digital"
                  >
                    {/* Linha 1: Setor, Protocolo e Risco */}
                    <div className="flex items-start justify-between gap-2 border-b border-[#333] pb-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${setorConfig.badgeCor}`}>
                            {setorConfig.nome}
                          </span>
                          <span className="text-xs text-blue-300 font-mono font-black">
                            {demanda.num_processo || demanda.prot_1doc || 'S/N'}
                          </span>
                          {demanda.pasta && (
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                              Pasta: {demanda.pasta}
                            </span>
                          )}
                        </div>

                        {/* Tipo de Serviço */}
                        <h4 className="text-sm font-black text-white group-hover:text-blue-200 transition-colors uppercase leading-snug">
                          {demanda.tipo_servico || demanda.assunto || demanda.motivacao || 'Vistoria Sanitária Regular'}
                        </h4>
                      </div>

                      {/* Status Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                        isConcluido
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : demanda.grau_risco === 'ALTO RISCO'
                            ? 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse'
                            : 'bg-amber-950 text-amber-300 border border-amber-700'
                      }`}>
                        {demanda.status}
                      </span>
                    </div>

                    {/* Linha 2: Dados do Estabelecimento */}
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-slate-200 uppercase truncate" title={demanda.razao_social}>
                        {demanda.razao_social || demanda.nome_fantasia}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 font-mono flex-wrap">
                        <span>CNPJ/CPF: {demanda.cnpj_cpf}</span>
                        {demanda.bairro && <span>• Bairro: {demanda.bairro}</span>}
                      </div>
                      <div className="text-[11px] text-slate-300 truncate" title={demanda.endereco}>
                        📍 {demanda.endereco} {demanda.numero_complemento ? `• ${demanda.numero_complemento}` : ''}
                      </div>
                    </div>

                    {/* Linha 3: Data de Entrada e Prazo de Vistoria (SLA) */}
                    <div className="bg-[#1b1b1b] border border-slate-800 p-2.5 rounded-xl grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase block">Data da Demanda</span>
                        <span className="font-mono text-slate-300 font-semibold">
                          {demanda.data_distribuicao || demanda.data_entrada || demanda.data_protocolo || 'Recente'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase block">Prazo Recomendado (SLA)</span>
                        <span className="font-mono font-bold text-amber-300">
                          {demanda.prazo_vistoria || calcularPrazoVistoria(demanda.grau_risco, demanda.motivacao || demanda.assunto)}
                        </span>
                      </div>
                    </div>

                    {/* Linha 4: Ações Imediatas do Fiscal */}
                    <div className="pt-2 border-t border-[#333] flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-[11px] text-slate-400 font-medium">
                        {totalPareceres > 0 ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {totalPareceres} parecer(es) emitido(s)
                          </span>
                        ) : (
                          <span className="text-amber-400/90 italic flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Aguardando parecer técnico
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setModalDetalhesOpen({ open: true, processo: demanda })}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase rounded-lg shadow transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                          title="Abrir parecer técnico e assinar digitalmente com sua senha"
                        >
                          <FileSignature className="w-3.5 h-3.5" />
                          <span>Dar Parecer</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 👔 MODO 2: PAINEL DA DIRETORIA (CONTROLE, VISÃO & TROCA) */}
      {/* ======================================================== */}
      {modoAtivo === 'painel_diretoria' && (
        <div className="space-y-5 animate-fadeIn">
          {/* CABEÇALHO DA DIRETORIA & CARGA DE TRABALHO DOS FISCAIS */}
          <div className="bg-gradient-to-r from-purple-950 via-[#1e1a33] to-slate-900 border border-purple-500/40 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[10px] font-black uppercase tracking-wider">
                  <Briefcase className="w-3 h-3" />
                  {setorDiretorRestrito
                    ? `🎯 Diretoria Setorial • ${setorDiretorRestrito}`
                    : '👑 Painel Executivo da Diretoria • Gestão Geral VISA'}
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                  {setorDiretorRestrito
                    ? `Controle de Demandas • Setor ${setorDiretorRestrito}`
                    : 'Controle Geral de Demandas por Fiscal e Setor'}
                </h2>
                <p className="text-xs text-purple-200/80">
                  {setorDiretorRestrito
                    ? `Painel gerencial focado nas ordens de serviço e equipe de fiscais do setor de ${setorDiretorRestrito}.`
                    : 'Monitore a carga de trabalho de cada fiscal, redistribua ordens de serviço e garanta o cumprimento de prazos em todos os setores.'}
                </p>
              </div>

              {/* BOTÃO DE DISTRIBUIÇÃO AUTOMÁTICA EM MASSA */}
              <button
                type="button"
                onClick={handleDistribuirTodas}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xl transition active:scale-95 cursor-pointer ring-1 ring-emerald-400/50 shrink-0"
              >
                <Shuffle className="w-4 h-4" />
                <span>Distribuir Demandas Pendentes</span>
              </button>
            </div>

            {/* 📊 GRID COM A CARGA DE TRABALHO DE CADA FISCAL */}
            <div className="space-y-2 pt-2 border-t border-purple-800/50">
              <div className="flex items-center justify-between text-xs text-purple-200 font-bold">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-400" />
                  Carga de Trabalho Atual por Fiscal ({statsDiretoria.fiscaisCarga.length} fiscais ativos):
                </span>
                <span className="text-[11px] text-purple-300 font-mono">
                  {statsDiretoria.naoAtribuidas > 0 ? (
                    <span className="text-amber-300 font-bold">⚠️ {statsDiretoria.naoAtribuidas} demanda(s) sem fiscal atribuído</span>
                  ) : (
                    '✅ 100% das demandas atribuídas'
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {statsDiretoria.fiscaisCarga.map(({ fiscal, total, pendentes, concluidas }) => {
                  const isSelected = filtroFiscalDiretoria === fiscal.id;

                  return (
                    <div
                      key={fiscal.id}
                      onClick={() => setFiltroFiscalDiretoria(isSelected ? 'TODOS' : fiscal.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none space-y-2 ${
                        isSelected
                          ? 'bg-purple-900/60 border-purple-400 ring-2 ring-purple-400/40 shadow-lg'
                          : 'bg-[#1c1c28]/90 border-slate-700/80 hover:border-purple-500/60 hover:bg-[#232333]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-white uppercase truncate" title={fiscal.nome_completo}>
                            {fiscal.nome_completo}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {fiscal.matricula || 'DVIS'}
                          </span>
                        </div>
                        <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-black/40 text-purple-300 shrink-0">
                          {fiscal.nivel_acesso?.replace('VISA (', '').replace(')', '') || 'FISCAL'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1 text-center bg-black/30 p-1.5 rounded-lg text-[10px]">
                        <div>
                          <span className="text-slate-500 block">Total</span>
                          <strong className="text-white font-black">{total}</strong>
                        </div>
                        <div>
                          <span className="text-amber-400/90 block">Pend.</span>
                          <strong className="text-amber-400 font-black">{pendentes}</strong>
                        </div>
                        <div>
                          <span className="text-emerald-400/90 block">Concl.</span>
                          <strong className="text-emerald-400 font-black">{concluidas}</strong>
                        </div>
                      </div>

                      <div className="text-[9px] text-purple-300/80 text-center font-semibold">
                        {isSelected ? '▼ Filtrando demandas' : 'Clique para ver demandas →'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* BARRA DE FILTROS DA DIRETORIA */}
          <div className="bg-[#242424] border border-[#333] p-3 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                placeholder="Buscar por Empresa, CNPJ, Protocolo, Fiscal ou Tipo de Serviço..."
                className="w-full bg-[#181818] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              {/* Filtro por Fiscal */}
              <select
                value={filtroFiscalDiretoria}
                onChange={(e) => setFiltroFiscalDiretoria(e.target.value)}
                className="bg-[#181818] border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="TODOS">Todos os Fiscais</option>
                {fiscaisDisponiveis.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome_completo}
                  </option>
                ))}
              </select>

              {/* Filtro por Setor */}
              <select
                value={filtroSetor}
                onChange={(e) => setFiltroSetor(e.target.value)}
                className="bg-[#181818] border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="TODOS">Todos os Setores (Geral)</option>
                {SETORES_DEMANDA_LISTA.map((s) => {
                  const isMeuSetor = s.id === setorDiretorRestrito;
                  return (
                    <option key={s.id} value={s.id}>
                      {isMeuSetor ? `🎯 ${s.nome} (Meu Setor)` : s.nome}
                    </option>
                  );
                })}
              </select>

              {/* Filtro por Status */}
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="bg-[#181818] border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="PENDENTES">Apenas Pendentes / Em Análise</option>
                <option value="SEM_FISCAL">⚠️ Sem Fiscal Atribuído</option>
                <option value="CONCLUIDOS">Apenas Concluídos</option>
              </select>
            </div>
          </div>

          {/* TABELA GERAL DE CONTROLE DA DIRETORIA */}
          <div className="bg-[#242424] border border-[#333] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-3 bg-[#1e1e1e] border-b border-[#333] flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-black uppercase text-slate-200 tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                Demandas Sanitárias Sob Controle da Diretoria ({demandasDiretoriaFiltradas.length})
              </h3>
              <div className="text-[11px] text-slate-400">
                💡 O diretor pode trocar o fiscal responsável com 1 clique a qualquer momento
              </div>
            </div>

            {demandasDiretoriaFiltradas.length === 0 ? (
              <div className="p-10 text-center text-slate-500 italic">
                Nenhuma demanda encontrada para os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#181818] text-slate-400 border-b border-[#333] uppercase text-[10px] tracking-wider font-bold">
                      <th className="p-3">Protocolo / Data</th>
                      <th className="p-3">Tipo de Serviço / Assunto</th>
                      <th className="p-3">Setor</th>
                      <th className="p-3">Estabelecimento / Bairro</th>
                      <th className="p-3">Fiscal Atual</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Ações da Diretoria</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#333]">
                    {demandasDiretoriaFiltradas.map((demanda) => {
                      const setorNorm = normalizarSetorDemanda(demanda.setor, demanda.assunto || demanda.motivacao);
                      const setorConfig = SETORES_DEMANDA_LISTA.find((s) => s.id === setorNorm) || SETORES_DEMANDA_LISTA[7];
                      const semFiscal = !demanda.fiscal_responsavel ||
                        demanda.fiscal_responsavel.toUpperCase().includes('A DISTRIBUIR') ||
                        demanda.fiscal_responsavel.toUpperCase().includes('NÃO ATRIBUÍDO');

                      return (
                        <tr
                          key={demanda.id}
                          onDoubleClick={() => setModalDetalhesOpen({ open: true, processo: demanda })}
                          className="hover:bg-[#2b2b2b] transition cursor-pointer select-none group"
                          title="Dê 2 cliques para abrir o espelho sanitário e histórico completo"
                        >
                          {/* Protocolo & Data */}
                          <td className="p-3 font-mono font-bold text-blue-300 whitespace-nowrap">
                            <div>{demanda.num_processo || demanda.prot_1doc || 'S/N'}</div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              Entrada: {demanda.data_distribuicao || demanda.data_entrada || demanda.data_protocolo || '-'}
                            </div>
                          </td>

                          {/* Tipo de Serviço */}
                          <td className="p-3">
                            <div className="font-bold text-white uppercase text-xs group-hover:text-purple-300 transition-colors">
                              {demanda.tipo_servico || demanda.assunto || demanda.motivacao || 'Vistoria Sanitária'}
                            </div>
                            <div className="text-[10px] text-amber-300/90 font-mono">
                              Prazo SLA: {demanda.prazo_vistoria || calcularPrazoVistoria(demanda.grau_risco, demanda.motivacao || demanda.assunto)}
                            </div>
                          </td>

                          {/* Setor */}
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${setorConfig.badgeCor}`}>
                              {setorConfig.nome}
                            </span>
                          </td>

                          {/* Estabelecimento */}
                          <td className="p-3">
                            <div className="font-bold text-slate-200 uppercase truncate max-w-xs" title={demanda.razao_social}>
                              {demanda.razao_social || demanda.nome_fantasia}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {demanda.cnpj_cpf} • {demanda.bairro || 'BC'}
                            </div>
                          </td>

                          {/* Fiscal Atual */}
                          <td className="p-3 whitespace-nowrap">
                            {semFiscal ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-300 bg-rose-950/80 border border-rose-700 px-2 py-0.5 rounded">
                                ⚠️ Não Atribuído
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                                <span>{demanda.fiscal_responsavel}</span>
                              </div>
                            )}
                            {demanda.trocado_por_diretor && (
                              <div className="text-[9px] text-purple-300/90 italic mt-0.5">
                                Reatribuído por: {demanda.trocado_por_diretor}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              (demanda.status || '').toUpperCase().includes('DEFERIDO')
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                : 'bg-amber-950 text-amber-300 border border-amber-700'
                            }`}>
                              {demanda.status}
                            </span>
                          </td>

                          {/* Ações da Diretoria */}
                          <td className="p-3 text-center whitespace-nowrap" onDoubleClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Botão Trocar Fiscal */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAbrirTrocaFiscal(demanda);
                                }}
                                className="px-2.5 py-1.5 bg-purple-700 hover:bg-purple-600 text-white font-bold text-[11px] rounded-lg transition flex items-center gap-1 shadow cursor-pointer"
                                title="Trocar ou reatribuir o fiscal responsável por esta demanda"
                              >
                                <Users className="w-3.5 h-3.5" />
                                <span>Trocar Fiscal</span>
                              </button>

                              {/* Botão Sortear Randomicamente */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSortearFiscalDemanda(demanda);
                                }}
                                className="px-2 py-1.5 bg-[#2b2b2b] hover:bg-slate-700 text-amber-300 hover:text-white border border-slate-700 text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                                title="Sortear randomicamente entre os fiscais deste setor"
                              >
                                <Shuffle className="w-3 h-3" />
                                <span>Sortear</span>
                              </button>

                              {/* Botão Ver Parecer / Espelho */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModalDetalhesOpen({ open: true, processo: demanda });
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                                title="Ver espelho técnico e histórico de pareceres"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🔄 MODAL DA DIRETORIA: TROCA MANUAL / REATRIBUIÇÃO DE FISCAL */}
      {/* ======================================================== */}
      {modalTrocaFiscal.open && modalTrocaFiscal.processo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-[#242424] border border-purple-500/50 text-white rounded-2xl max-w-lg w-full shadow-2xl p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/40 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Troca de Fiscal Responsável • Diretoria VISA
                  </h3>
                  <p className="text-xs text-slate-400">
                    Reatribuição oficial da demanda sanitária
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalTrocaFiscal({ open: false, processo: null, novoFiscalId: '', motivo: '' })}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dados da Demanda */}
            <div className="p-3.5 bg-[#1a1a1a] rounded-xl border border-slate-700 space-y-1.5 text-xs">
              <div>
                <span className="text-slate-400 font-semibold">Demanda: </span>
                <strong className="text-white">{modalTrocaFiscal.processo.num_processo || modalTrocaFiscal.processo.prot_1doc}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Serviço: </span>
                <span className="text-blue-300 font-bold">{modalTrocaFiscal.processo.tipo_servico || modalTrocaFiscal.processo.assunto}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Setor: </span>
                <span className="text-purple-300 font-mono font-bold">
                  {normalizarSetorDemanda(modalTrocaFiscal.processo.setor, modalTrocaFiscal.processo.assunto)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Estabelecimento: </span>
                <span className="text-slate-200">{modalTrocaFiscal.processo.razao_social}</span>
              </div>
              <div className="pt-1 border-t border-slate-800 flex justify-between">
                <span className="text-slate-400">Fiscal Atual:</span>
                <strong className="text-amber-400">{modalTrocaFiscal.processo.fiscal_responsavel || 'Não atribuído'}</strong>
              </div>
            </div>

            {/* Formulário de Seleção do Novo Fiscal */}
            <form onSubmit={handleConfirmarTrocaFiscal} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-black uppercase text-slate-300">
                    Selecione o Novo Fiscal Responsável *
                  </label>

                  {/* Sorteio randômico rápido dentro do modal */}
                  <button
                    type="button"
                    onClick={() => {
                      const setor = normalizarSetorDemanda(modalTrocaFiscal.processo?.setor, modalTrocaFiscal.processo?.assunto);
                      const fiscaisSetor = getFiscaisDoSetor(fiscaisDisponiveis, setor);
                      if (fiscaisSetor.length > 0) {
                        const random = fiscaisSetor[Math.floor(Math.random() * fiscaisSetor.length)];
                        setModalTrocaFiscal((prev) => ({ ...prev, novoFiscalId: random.id }));
                      }
                    }}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Shuffle className="w-3 h-3" /> Sortear Fiscal do Setor
                  </button>
                </div>

                <select
                  required
                  value={modalTrocaFiscal.novoFiscalId}
                  onChange={(e) => setModalTrocaFiscal({ ...modalTrocaFiscal, novoFiscalId: e.target.value })}
                  className="w-full p-2.5 bg-[#181818] border border-slate-600 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="">Selecione um fiscal...</option>
                  {fiscaisDisponiveis.map((f) => {
                    // Contagem de demandas atuais do fiscal
                    const demandasQtd = processos.filter((p) => (p.fiscal_responsavel || '').toLowerCase().includes(f.nome_completo.toLowerCase())).length;
                    return (
                      <option key={f.id} value={f.id}>
                        {f.nome_completo} ({f.matricula || 'DVIS'}) • {demandasQtd} demanda(s) atual(is)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Justificativa da Troca */}
              <div>
                <label className="text-[11px] font-black uppercase text-slate-300 block mb-1">
                  Motivo da Troca / Despacho da Diretoria
                </label>
                <input
                  type="text"
                  value={modalTrocaFiscal.motivo}
                  onChange={(e) => setModalTrocaFiscal({ ...modalTrocaFiscal, motivo: e.target.value })}
                  placeholder="Ex: Redistribuição de carga, fiscal em férias, demanda urgente..."
                  className="w-full p-2.5 bg-[#181818] border border-slate-600 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setModalTrocaFiscal({ open: false, processo: null, novoFiscalId: '', motivo: '' })}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white shadow-lg transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar Troca</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 📜 MODAL COMPLETO DE DETALHES & PARECER COM ASSINATURA */}
      {/* ======================================================== */}
      <ProcessoDetalhesParecerModal
        isOpen={modalDetalhesOpen.open}
        onClose={() => setModalDetalhesOpen({ open: false, processo: null })}
        processo={modalDetalhesOpen.processo}
        currentUser={currentUser}
        users={users}
        onSaveProcesso={(updated) => {
          onSaveProcesso(updated);
          setModalDetalhesOpen({ open: true, processo: updated });
        }}
      />
    </div>
  );
};
