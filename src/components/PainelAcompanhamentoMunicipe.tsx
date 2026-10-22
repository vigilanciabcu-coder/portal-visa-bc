import React, { useState, useMemo } from 'react';
import {
  Search,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Send,
  Building2,
  User,
  Paperclip,
  Check,
  ArrowRight,
  Sparkles,
  Download,
  Calendar,
  Layers,
  HelpCircle,
  X,
  Camera,
  Lightbulb,
  Image
} from 'lucide-react';
import { ProcessoItem, TramitacaoItem, UserProfile } from '../types';
import { SERVICOS_IDEIAS_VISA, ESTABELECIMENTOS_TESTE_LINKADOS } from './SolicitacaoMunicipeModal';

export interface PainelAcompanhamentoMunicipeProps {
  processos: ProcessoItem[];
  currentUser: UserProfile | null;
  onSaveProcesso: (updated: ProcessoItem) => void;
  onOpenSolicitarServico?: (servicoId?: string) => void;
  onNovaSolicitacao?: () => void;
  onOpenExternal?: (url: string) => void;
  onOpenIdeiasModal?: () => void;
}

export const PainelAcompanhamentoMunicipe: React.FC<PainelAcompanhamentoMunicipeProps> = ({
  processos,
  currentUser,
  onSaveProcesso,
  onOpenSolicitarServico,
  onNovaSolicitacao,
  onOpenExternal = () => {},
  onOpenIdeiasModal
}) => {
  const [termoBusca, setTermoBusca] = useState<string>(() => {
    return currentUser?.cpf || currentUser?.cnpj || '';
  });
  const [processoSelecionado, setProcessoSelecionado] = useState<ProcessoItem | null>(null);

  // Mensagem e anexos do cidadão no processo
  const [mensagemCidadao, setMensagemCidadao] = useState('');
  const [fotosAnexasCidadao, setFotosAnexasCidadao] = useState<string[]>([]);
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState(false);

  const handleAbrirSolicitar = (id?: string) => {
    if (onNovaSolicitacao) onNovaSolicitacao();
    else if (onOpenSolicitarServico) onOpenSolicitarServico(id);
  };

  // Filtragem dos processos do munícipe
  const cleanDoc = (val?: string) => (val || '').replace(/\D/g, '');
  const termoNorm = termoBusca.trim().toLowerCase();
  const termoNum = cleanDoc(termoBusca);

  const demandasEncontradas = useMemo(() => {
    if (!termoNorm) return [];

    return processos.filter((p) => {
      const pCnpjNum = cleanDoc(p.cnpj_cpf);
      const pProc = (p.num_processo || '').toLowerCase();
      const pProt1doc = (p.prot_1doc || '').toLowerCase();
      const pRazao = (p.razao_social || '').toLowerCase();
      const pFantasia = (p.nome_fantasia || '').toLowerCase();
      const pEndereco = (p.endereco || '').toLowerCase();
      const pAssunto = (p.assunto || '').toLowerCase();

      return (
        (termoNum.length >= 3 && pCnpjNum.includes(termoNum)) ||
        pProc.includes(termoNorm) ||
        pProt1doc.includes(termoNorm) ||
        pRazao.includes(termoNorm) ||
        pFantasia.includes(termoNorm) ||
        pEndereco.includes(termoNorm) ||
        pAssunto.includes(termoNorm)
      );
    });
  }, [processos, termoNorm, termoNum]);

  // Se houver apenas 1 resultado e nenhum selecionado, seleciona automaticamente
  const processoAtivo = useMemo(() => {
    if (processoSelecionado) {
      // Sincroniza com a versão mais recente em processos
      const atual = processos.find((p) => p.id === processoSelecionado.id);
      return atual || processoSelecionado;
    }
    if (demandasEncontradas.length === 1) {
      return demandasEncontradas[0];
    }
    return null;
  }, [processoSelecionado, processos, demandasEncontradas]);

  // Leitura de fotos/arquivos de comprovação anexados pelo cidadão
  const handleAnexarFotoCidadao = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setFotosAnexasCidadao((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = '';
  };

  // Enviar mensagem / esclarecimento ou cumprimento de exigência do cidadão
  const handleEnviarMensagemCidadao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!processoAtivo || (!mensagemCidadao.trim() && fotosAnexasCidadao.length === 0)) return;

    setEnviandoMensagem(true);
    const agora = new Date();
    const dataHoraStr = agora.toISOString().replace('T', ' ').substring(0, 16);
    const autorNome = currentUser?.nome_completo || 'Munícipe / Solicitante';

    const isExigencia =
      processoAtivo.status === 'PENDENTE DOCS' ||
      processoAtivo.status === 'NOTIFICADO' ||
      (processoAtivo.status || '').toUpperCase().includes('PENDENTE');

    const statusNovo = isExigencia ? 'EM ANÁLISE' : processoAtivo.status;

    let descFinal = `[MENSAGEM DO MUNÍCIPE]: "${mensagemCidadao.trim() || 'Cumprimento de exigência com juntada de comprovantes'}"`;
    if (fotosAnexasCidadao.length > 0) {
      descFinal += ` • [${fotosAnexasCidadao.length} COMPROVANTE(S) / FOTO(S) ANEXADA(S)]`;
    }

    const novaTramitacao: TramitacaoItem = {
      id: `tram-msg-cid-${Date.now()}`,
      data_hora: dataHoraStr,
      tipo: 'DOCUMENTO_ANEXADO',
      titulo: isExigencia
        ? 'Cumprimento de Exigência pelo Cidadão • Juntada de Documentos / Fotos'
        : 'Interação do Cidadão • Mensagem / Juntada de Esclarecimento',
      descricao: descFinal,
      responsavel_nome: autorNome,
      responsavel_cargo: 'REQUERENTE (PORTAL DO CIDADÃO)',
      setor_origem: 'PORTAL DO CIDADÃO',
      setor_destino: processoAtivo.fiscal_responsavel || 'DIRETORIA DE VIGILÂNCIA SANITÁRIA',
      status_processo_momento: statusNovo
    };

    const processoAtualizado: ProcessoItem = {
      ...processoAtivo,
      status: statusNovo,
      observacoes: `${processoAtivo.observacoes || ''}\n[INTERAÇÃO MUNÍCIPE ${agora.toLocaleDateString('pt-BR')}]: ${mensagemCidadao.trim()}${fotosAnexasCidadao.length > 0 ? ` (${fotosAnexasCidadao.length} fotos)` : ''}`,
      tramitacoes: [novaTramitacao, ...(processoAtivo.tramitacoes || [])]
    };

    onSaveProcesso(processoAtualizado);
    setProcessoSelecionado(processoAtualizado);
    setMensagemCidadao('');
    setFotosAnexasCidadao([]);
    setEnviandoMensagem(false);
    setMensagemSucesso(true);
    setTimeout(() => setMensagemSucesso(false), 4000);
  };

  // Pipeline de 5 etapas
  const getFaseProcesso = (proc: ProcessoItem) => {
    const st = (proc.status || '').toUpperCase();
    if (st.includes('CONCLU') || st.includes('DEFER')) return 5;
    if (proc.pareceres && proc.pareceres.length > 0) return 4;
    if (st.includes('VISTORIA') || st.includes('INSPEC')) return 3;
    if (proc.fiscal_responsavel && !proc.fiscal_responsavel.includes('A Distribuir')) return 2;
    return 1;
  };

  return (
    <div className="space-y-6 text-left select-none">
      
      {/* 🌟 BANNER SUPERIOR INTERATIVO DE IDEIAS & ACOMPANHAMENTO */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-blue-800/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Balneário Camboriú • Inovação Sanitária
            </div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
              Painel de Solicitações & Acompanhamento do Cidadão
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              Solicite novos serviços sanitários com sugestões inteligentes, acompanhe cada etapa da sua demanda em tempo real e interaja diretamente com os fiscais da VISA sem burocracia.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleAbrirSolicitar()}
              className="px-5 py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition active:scale-95 cursor-pointer ring-2 ring-amber-300/50"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Solicitar Novo Serviço</span>
            </button>

            {onOpenIdeiasModal && (
              <button
                type="button"
                onClick={onOpenIdeiasModal}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer ring-1 ring-purple-300/40"
              >
                <Lightbulb className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>8 Ideias de Inovação VISA</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenExternal('https://bc.1doc.com.br/b.php?pg=o/login&n=3')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border border-white/20 transition cursor-pointer"
            >
              <span>📄</span> Protocolos no 1Doc
            </button>
          </div>
        </div>
      </div>

      {/* 🔎 CAMPO DE BUSCA DE DEMANDAS / PROTOCOLOS DO MUNÍCIPE */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="space-y-0.5">
            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Acompanhar Minhas Demandas & Protocolos
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Digite seu número de protocolo (ex: SOL-2026/001), CNPJ, CPF ou nome da empresa para localizar seus processos.
            </p>
          </div>

          {currentUser?.cpf && (
            <button
              type="button"
              onClick={() => setTermoBusca(currentUser.cpf || '')}
              className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold transition hover:bg-blue-100"
            >
              Buscar meu CPF ({currentUser.cpf})
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Digite o número do protocolo, CPF/CNPJ ou razão social..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-inner"
          />
          {termoBusca && (
            <button
              type="button"
              onClick={() => {
                setTermoBusca('');
                setProcessoSelecionado(null);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 🏢 CHIPS DE TESTE RÁPIDO COM DADOS INTEGRADOS */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
            ⚡ Testar com Estabelecimento da Base:
          </span>
          {ESTABELECIMENTOS_TESTE_LINKADOS.map((est) => (
            <button
              key={est.cnpj_cpf}
              type="button"
              onClick={() => {
                setTermoBusca(est.protocoloVinculado);
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-blue-900/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-300 font-bold text-[11px] border border-slate-200 dark:border-slate-700 transition cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <span>{est.nome.split(' ')[0]}</span>
              <span className="font-mono text-[10px] text-blue-500 font-bold">({est.protocoloVinculado})</span>
            </button>
          ))}
        </div>

        {/* Lista Rápida de Resultados Encontrados */}
        {termoBusca.trim().length >= 2 && (
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span>{demandasEncontradas.length} demanda(s) encontrada(s)</span>
              {processoAtivo && (
                <span className="text-blue-600 dark:text-blue-400 font-bold">
                  Processo ativo: #{processoAtivo.num_processo || processoAtivo.prot_1doc}
                </span>
              )}
            </div>

            {demandasEncontradas.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 space-y-2">
                <p>Nenhum processo sanitário localizado com este termo.</p>
                <button
                  type="button"
                  onClick={() => handleAbrirSolicitar()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Abrir Nova Solicitação Agora
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {demandasEncontradas.map((proc) => {
                  const isSelected = processoAtivo?.id === proc.id;
                  const st = (proc.status || '').toUpperCase();
                  return (
                    <div
                      key={proc.id}
                      onClick={() => setProcessoSelecionado(proc)}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between text-xs space-y-2 ${
                        isSelected
                          ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-500 shadow-md ring-2 ring-blue-500/30'
                          : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[11px] font-black text-blue-600 dark:text-blue-400">
                            #{proc.num_processo || proc.prot_1doc || 'S/N'}
                          </span>
                          <span
                            className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase ${
                              st.includes('CONCLU') || st.includes('DEFER')
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                                : st.includes('NOTIF')
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                            }`}
                          >
                            {proc.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                          {proc.nome_fantasia || proc.razao_social}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {proc.assunto || proc.tipo_servico || 'Processo Sanitário'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-1.5">
                        <span>📍 {proc.bairro || 'Centro'}</span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-0.5">
                          Ver detalhes →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 📋 DETALHES & LINHA DO TEMPO DA DEMANDA SELECIONADA */}
      {processoAtivo && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 animate-fadeIn">
          
          {/* Cabeçalho da Demanda */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono">
                  PROTOCOLO: {processoAtivo.num_processo || processoAtivo.prot_1doc || 'S/N'}
                </span>
                {processoAtivo.origem_solicitacao && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200">
                    Origem: {processoAtivo.origem_solicitacao}
                  </span>
                )}
                <span className="text-xs text-slate-400 font-mono">
                  Data: {processoAtivo.data_protocolo || processoAtivo.data_entrada || 'Recente'}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase mt-1">
                {processoAtivo.nome_fantasia || processoAtivo.razao_social}
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                {processoAtivo.endereco}, {processoAtivo.bairro} • Balneário Camboriú/SC
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                Status Atual da Demanda
              </span>
              <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm inline-block ${
                processoAtivo.status === 'PENDENTE DOCS' || processoAtivo.status === 'NOTIFICADO'
                  ? 'bg-amber-500 text-slate-950 font-black animate-pulse'
                  : 'bg-blue-600 text-white'
              }`}>
                {processoAtivo.status}
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Fiscal Responsável: <strong className="text-slate-700 dark:text-slate-200">{processoAtivo.fiscal_responsavel || 'A Distribuir'}</strong>
              </p>
            </div>
          </div>

          {/* ⚠️ ALERTA DE EXIGÊNCIA SANITÁRIA NOTIFICADA PELO FISCAL */}
          {(processoAtivo.status === 'PENDENTE DOCS' || processoAtivo.status === 'NOTIFICADO' || (processoAtivo.status || '').toUpperCase().includes('PENDENTE')) && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500 text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 font-black shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black uppercase text-xs sm:text-sm text-amber-900 dark:text-amber-300">
                    ⚠️ Notificação de Cumprimento de Exigência Sanitária
                  </h4>
                  <p className="text-[11px] text-amber-800 dark:text-amber-200/90 leading-relaxed">
                    O fiscal responsável notificou uma pendência para conclusão deste processo (ex: apresentação de alvará dos bombeiros, controle de pragas ou fotos de adequação estrutural). Anexe a comprovação no formulário de interação abaixo para reativar a análise da VISA!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 🚀 PIPELINE VISUAL DE 5 FASES DO PROCESSO */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-500" /> Acompanhamento do Fluxo Sanitário
            </h4>

            {(() => {
              const faseAtual = getFaseProcesso(processoAtivo);
              const etapas = [
                { num: 1, label: 'Protocolo Aberto', desc: 'Solicitação registrada no portal' },
                { num: 2, label: 'Triagem & Fiscal', desc: 'Diretoria designa fiscal da região' },
                { num: 3, label: 'Vistoria In Loco', desc: 'Inspeção sanitária no local' },
                { num: 4, label: 'Análise Técnica', desc: 'Emissão de laudo ou parecer' },
                { num: 5, label: 'Despacho & Alvará', desc: 'Conclusão e documento oficial' }
              ];

              return (
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                  {etapas.map((et) => {
                    const isConcluida = faseAtual > et.num;
                    const isAtiva = faseAtual === et.num;

                    return (
                      <div
                        key={et.num}
                        className={`p-2.5 rounded-xl border transition text-center space-y-1 ${
                          isConcluida
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                            : isAtiva
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md ring-2 ring-blue-400/40'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {isConcluida ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                              isAtiva ? 'bg-white text-blue-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                              {et.num}
                            </span>
                          )}
                          <span className="text-[11px] font-black uppercase tracking-tight">
                            {et.label}
                          </span>
                        </div>
                        <p className={`text-[10px] leading-tight ${isAtiva ? 'text-blue-100' : 'opacity-80'}`}>
                          {et.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* 📜 HISTÓRICO DE TRAMITAÇÕES & DESPACHOS DOS SERVIDORES */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
              <FileText className="w-4 h-4 text-indigo-500" /> Linha do Tempo de Despachos & Andamento Oficial
            </h4>

            {(!processoAtivo.tramitacoes || processoAtivo.tramitacoes.length === 0) ? (
              <p className="text-xs text-slate-500 italic py-2">
                Aguardando despacho inicial da equipe técnica da Vigilância Sanitária.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {processoAtivo.tramitacoes.map((tram, i) => (
                  <div
                    key={tram.id || i}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-xs space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-900 dark:text-white">
                          {tram.titulo || 'Despacho'}
                        </span>
                        {tram.status_processo_momento && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                            {tram.status_processo_momento}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {tram.data_hora}
                      </span>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                      {tram.descricao}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200/60 dark:border-slate-800 pt-1">
                      <span>👤 {tram.responsavel_nome} ({tram.responsavel_cargo || 'VISA BC'})</span>
                      {tram.setor_destino && <span>Destino: {tram.setor_destino}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 💬 CANAL DE INTERAÇÃO DIRETO DO MUNÍCIPE COM A VISA */}
          <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="text-xs font-black uppercase text-blue-950 dark:text-blue-300">
                  Canal de Interação Munícipe ↔ Servidores da VISA
                </h4>
              </div>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                Sem filas • 100% digital
              </span>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              Precisa enviar um esclarecimento para o fiscal, anexar comprovação de cumprimento de exigência ou tirar dúvidas sobre este processo? Digite abaixo:
            </p>

            <form onSubmit={handleEnviarMensagemCidadao} className="space-y-3">
              <textarea
                rows={2}
                placeholder={
                  processoAtivo.status === 'PENDENTE DOCS' || processoAtivo.status === 'NOTIFICADO'
                    ? 'Descreva a adequação realizada ou documentos anexados para cumprimento da exigência do fiscal...'
                    : 'Ex: Segue em anexo o comprovante da dedetização realizada hoje ou esclarecimento sobre a vistoria...'
                }
                value={mensagemCidadao}
                onChange={(e) => setMensagemCidadao(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-inner"
              ></textarea>

              {/* Miniaturas de Fotos/Comprovantes Anexados */}
              {fotosAnexasCidadao.length > 0 && (
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                    {fotosAnexasCidadao.length} foto(s) de comprovação anexada(s):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {fotosAnexasCidadao.map((f, i) => (
                      <div key={i} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 shadow-xs">
                        <img src={f} alt="Anexo" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFotosAnexasCidadao((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute inset-0 bg-red-600/80 text-white font-black text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 text-xs font-bold transition shadow-2xs">
                  <Camera className="w-3.5 h-3.5 text-blue-500" />
                  <span>Anexar Foto / Comprovante</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    className="hidden"
                    onChange={handleAnexarFotoCidadao}
                  />
                </label>

                {mensagemSucesso ? (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-fadeIn">
                    <Check className="w-4 h-4" /> Mensagem e comprovantes transmitidos com sucesso à VISA!
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">
                    Sua mensagem será lida diretamente pelo fiscal responsável no painel DVIS.
                  </span>
                )}

                <button
                  type="submit"
                  disabled={enviandoMensagem}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow active:scale-95 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" /> Enviar à Equipe VISA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 💡 VITRINE DE IDEIAS & INOVAÇÕES SANITÁRIAS PARA O CIDADÃO */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Catálogo de Inovações
            </div>
            <h3 className="text-sm sm:text-base font-black uppercase text-slate-900 dark:text-white">
              Ideias & Serviços Digitais da Vigilância Sanitária de Balneário Camboriú
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Conheça os serviços disponíveis para solicitação imediata e acompanhamento online.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleAbrirSolicitar()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow transition cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" /> Ver Todos os Serviços ({SERVICOS_IDEIAS_VISA.length})
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {SERVICOS_IDEIAS_VISA.slice(0, 4).map((serv) => (
            <div
              key={serv.id}
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 hover:border-blue-500 transition flex flex-col justify-between space-y-2.5 text-xs shadow-2xs group"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-2xl p-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-2xs">
                    {serv.icone}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    ⏱️ {serv.prazoMedio}
                  </span>
                </div>

                <h4 className="font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-snug">
                  {serv.titulo}
                </h4>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  {serv.resumo}
                </p>

                <div className="p-2 rounded-xl bg-blue-100/60 dark:bg-blue-950/40 text-[10px] text-blue-900 dark:text-blue-200 font-medium">
                  <strong>💡 Ideia VISA:</strong> {serv.inovacaoIdeia}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAbrirSolicitar(serv.id)}
                className="w-full py-1.5 px-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-600 hover:text-white border border-slate-200 dark:border-slate-700 font-bold text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs"
              >
                <span>Solicitar</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
