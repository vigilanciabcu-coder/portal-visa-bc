import React, { useState } from 'react';
import {
  X,
  Building2,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Lock,
  KeyRound,
  FileCheck2,
  Calendar,
  User,
  Printer,
  Sparkles,
  Layers,
  ChevronRight,
  AlertOctagon,
  Eye,
  Edit3,
  Check,
  Hash,
  Send,
  HelpCircle,
  FileSignature
} from 'lucide-react';
import { ProcessoItem, ProcessoStatus, TipoParecerTecnico, ParecerTecnicoItem, UserProfile } from '../types';

interface ProcessoDetalhesParecerModalProps {
  isOpen: boolean;
  onClose: () => void;
  processo: ProcessoItem | null;
  currentUser: UserProfile | null;
  users: UserProfile[];
  onSaveProcesso: (updated: ProcessoItem) => void;
}

export const ProcessoDetalhesParecerModal: React.FC<ProcessoDetalhesParecerModalProps> = ({
  isOpen,
  onClose,
  processo,
  currentUser,
  users,
  onSaveProcesso
}) => {
  if (!isOpen || !processo) return null;

  // Permissões: Somente servidores públicos da VISA ou Master podem editar e emitir parecer
  const isMaster = currentUser?.nivel_acesso?.toUpperCase().includes('MASTER') ||
    currentUser?.nivel_acesso === 'MASTER (TUDO)' ||
    currentUser?.cargo === 'MASTER ADM';
  const isServidor = currentUser?.tipo_usuario === 'SERVIDOR' || isMaster;

  // Estado do formulário de novo parecer (para servidores)
  const [novoStatus, setNovoStatus] = useState<ProcessoStatus>(processo.status || 'EM ANÁLISE');
  const [tipoParecer, setTipoParecer] = useState<TipoParecerTecnico>('FAVORÁVEL (DEFERIMENTO)');
  const [textoParecer, setTextoParecer] = useState('');
  const [condicionantes, setCondicionantes] = useState('');
  const [novaValidade, setNovaValidade] = useState(processo.validade || '');
  const [fiscalDesignado, setFiscalDesignado] = useState(processo.fiscal_responsavel || currentUser?.nome_completo || '');

  // Estado da Assinatura Digital com Senha
  const [modalAssinaturaOpen, setModalAssinaturaOpen] = useState(false);
  const [senhaAssinatura, setSenhaAssinatura] = useState('');
  const [erroSenhaAssinatura, setErroSenhaAssinatura] = useState<string | null>(null);
  const [feedbackSucesso, setFeedbackSucesso] = useState<string | null>(null);

  // Lista de pareceres existentes
  const pareceres = processo.pareceres || [];

  // Gera código único de autenticação para o parecer
  const generateAuthCode = () => {
    const ano = new Date().getFullYear();
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `BC-VISA-PAR-${ano}-${rand}`;
  };

  // Ao clicar em dar parecer, abre a solicitação de assinatura digital com senha
  const handleIniciarAssinatura = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isServidor) {
      alert('Operação restrita a Servidores Públicos da Vigilância Sanitária.');
      return;
    }
    if (!textoParecer.trim()) {
      alert('Por favor, descreva a fundamentação técnica do parecer antes de assinar.');
      return;
    }
    setErroSenhaAssinatura(null);
    setSenhaAssinatura('');
    setModalAssinaturaOpen(true);
  };

  // Confirma a senha institucional e registra o parecer assinado digitalmente
  const handleConfirmarAssinatura = (e: React.FormEvent) => {
    e.preventDefault();
    setErroSenhaAssinatura(null);

    // Validação de senha: busca no perfil do usuário logado ou na lista de usuários
    const userMatched = users.find(
      (u) => u.id === currentUser?.id || (currentUser?.email && u.email.toLowerCase() === currentUser.email.toLowerCase())
    );
    const senhaEsperada = (currentUser?.senha || userMatched?.senha || '123456').trim();

    if (senhaAssinatura.trim() !== senhaEsperada) {
      setErroSenhaAssinatura('Senha incorreta. Digite sua senha de usuário institucional para validar a assinatura digital.');
      return;
    }

    const agora = new Date();
    const dataHoraStr = `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    const authCode = generateAuthCode();

    const novoParecerItem: ParecerTecnicoItem = {
      id: 'par-' + Date.now(),
      autor_nome: currentUser?.nome_completo || 'Fiscal Sanitário',
      autor_cargo: currentUser?.cargo || 'AUDITOR FISCAL SANITÁRIO',
      autor_matricula: currentUser?.matricula || 'MAT-DVIS',
      autor_email: currentUser?.email || '',
      data_hora: dataHoraStr,
      tipo_parecer: tipoParecer,
      parecer_texto: textoParecer.trim(),
      condicionantes: condicionantes.trim() ? condicionantes.trim() : undefined,
      novo_status: novoStatus,
      codigo_autenticacao: authCode,
      assinatura_digital: `Validado e assinado digitalmente por ${currentUser?.nome_completo || 'Autoridade Sanitária'}, Matrícula ${currentUser?.matricula || 'DVIS'}, em ${dataHoraStr} via autenticação eletrônica (LC nº 40/2019).`
    };

    // Atualiza o processo
    const updatedPareceres = [novoParecerItem, ...pareceres];
    
    // Atualiza campo de observações para compatibilidade legada com relatórios e planilhas
    const logParecer = `[PARECER SANITÁRIO - ${dataHoraStr} por ${currentUser?.nome_completo} (${currentUser?.matricula})]: ${tipoParecer} -> ${textoParecer.trim()}`;
    const novasObservacoes = processo.observacoes 
      ? `${logParecer}\n\n${processo.observacoes}` 
      : logParecer;

    const processoAtualizado: ProcessoItem = {
      ...processo,
      status: novoStatus,
      fiscal_responsavel: fiscalDesignado || processo.fiscal_responsavel,
      validade: novaValidade || processo.validade,
      observacoes: novasObservacoes,
      pareceres: updatedPareceres
    };

    onSaveProcesso(processoAtualizado);

    // Feedback e limpeza
    setModalAssinaturaOpen(false);
    setTextoParecer('');
    setCondicionantes('');
    setFeedbackSucesso(`✅ Parecer Sanitário assinado digitalmente e registrado com sucesso! (Código: ${authCode})`);
    setTimeout(() => {
      setFeedbackSucesso(null);
    }, 5000);
  };

  const sit = (processo.status || '').toUpperCase();
  const isVigente = sit.includes('DEFERIDO') || sit.includes('ALVARÁ') || sit.includes('APROVADO');
  const isPend = sit.includes('NOTIF') || sit.includes('PEND');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#1e1e1e] border border-slate-700 text-slate-100 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        
        {/* 🌟 CABEÇALHO DO MODAL */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-[#1a202c] to-indigo-950 border-b border-slate-700/80 flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {processo.setor || 'PROCESSO SANITÁRIO'}
              </span>

              {isServidor ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                  <Edit3 className="w-3 h-3 text-amber-400" />
                  Modo Autoridade Sanitária (Edição & Parecer)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-700/80 text-slate-300 border border-slate-600 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" />
                  Modo Leitura (Consulta Pública / Sem Edição)
                </span>
              )}

              {isPend ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-950 text-rose-300 border border-rose-700 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  {processo.status}
                </span>
              ) : isVigente ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {processo.status}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-700 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  {processo.status}
                </span>
              )}
            </div>

            <h2 className="text-base sm:text-xl font-black text-white uppercase tracking-tight truncate">
              {processo.razao_social || processo.nome_fantasia || 'Processo Sanitário'}
            </h2>

            <div className="flex items-center gap-3 text-xs text-slate-300 font-mono flex-wrap">
              <span><strong>Processo:</strong> {processo.num_processo || 'S/N'}</span>
              <span><strong>CNPJ/CPF:</strong> {processo.cnpj_cpf}</span>
              {processo.pasta && <span><strong>Pasta:</strong> {processo.pasta}</span>}
              {processo.prot_1doc && <span><strong>1Doc:</strong> {processo.prot_1doc}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
              title="Imprimir espelho sanitário"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
              title="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MENSAGEM DE SUCESSO AO REGISTRAR PARECER */}
        {feedbackSucesso && (
          <div className="bg-emerald-950/80 border-b border-emerald-600 p-3 px-5 text-xs text-emerald-200 font-bold flex items-center justify-between animate-fadeIn">
            <span>{feedbackSucesso}</span>
            <button
              type="button"
              onClick={() => setFeedbackSucesso(null)}
              className="text-emerald-400 hover:text-white text-xs font-black cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* 📜 CORPO DO MODAL (ROLÁVEL) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* SEÇÃO 1: ESPELHO CADASTRAL E SANITÁRIO DA EMPRESA */}
          <div className="bg-[#242424] border border-[#333333] rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#333333] pb-2">
              <h3 className="font-black uppercase text-slate-200 text-xs flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Dados do Requerimento & Estabelecimento
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                Entrada: {processo.data_entrada || processo.data_protocolo || 'Recente'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Nome Fantasia</span>
                <span className="text-white font-semibold">{processo.nome_fantasia || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Razão Social</span>
                <span className="text-white font-semibold">{processo.razao_social || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">CNPJ / CPF</span>
                <span className="text-blue-300 font-mono font-bold">{processo.cnpj_cpf}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Endereço da Atividade / Obra</span>
                <span className="text-slate-200">
                  {processo.endereco} {processo.numero_complemento ? `• ${processo.numero_complemento}` : ''}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Bairro / Município</span>
                <span className="text-slate-200">{processo.bairro || 'Balneário Camboriú'} - SC</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Classificação de Risco</span>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase mt-0.5 ${
                  processo.grau_risco === 'ALTO RISCO'
                    ? 'bg-red-600 text-white'
                    : processo.grau_risco === 'MÉDIO RISCO'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-emerald-600 text-white'
                }`}>
                  {processo.grau_risco || 'MÉDIO RISCO'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Validade do Alvará</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {processo.validade || processo.venc_licenca || 'Em tramitação'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Fiscal Responsável</span>
                <span className="text-white font-semibold">{processo.fiscal_responsavel || 'A Distribuir'}</span>
              </div>
            </div>

            {/* CNAEs e Atividades */}
            {(processo.descricao_atividade || (processo.cnaes && processo.cnaes.length > 0)) && (
              <div className="pt-2 border-t border-[#333333]">
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                  Atividades Econômicas / CNAEs Cadastrados
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {processo.descricao_atividade && (
                    <span className="bg-[#181818] border border-slate-700 text-slate-300 px-2 py-0.5 rounded text-[11px]">
                      {processo.descricao_atividade}
                    </span>
                  )}
                  {processo.cnaes && processo.cnaes.map((c, idx) => (
                    <span key={idx} className="bg-slate-800 text-blue-200 border border-slate-700 px-2 py-0.5 rounded font-mono text-[10px]">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO 2: HISTÓRICO DE PARECERES TÉCNICOS & DESPACHOS SANITÁRIOS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black uppercase text-slate-200 text-xs flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-emerald-400" />
                Histórico Oficial de Pareceres & Despachos Sanitários ({pareceres.length})
              </h3>
              <span className="text-[11px] text-slate-400">
                Auditoria Oficial • Autenticação Eletrônica
              </span>
            </div>

            {pareceres.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#242424] border border-dashed border-[#3d3d3d] text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-xs font-bold text-slate-300">Nenhum parecer técnico registrado até o momento</h4>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  {isServidor
                    ? 'Como autoridade sanitária, utilize o formulário abaixo para formalizar o parecer técnico oficial, assinar digitalmente e atualizar a situação do processo.'
                    : 'Os pareceres e despachos técnicos emitidos pelos fiscais sanitários serão listados aqui assim que forem lavrados.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pareceres.map((par) => {
                  const isFavoravel = par.tipo_parecer.includes('FAVORÁVEL') || par.tipo_parecer.includes('DEFERIMENTO');
                  const isExigencia = par.tipo_parecer.includes('EXIGÊNCIA') || par.tipo_parecer.includes('NOTIFICAÇÃO');
                  const isDesfavoravel = par.tipo_parecer.includes('DESFAVORÁVEL') || par.tipo_parecer.includes('INDEFERIMENTO');

                  return (
                    <div
                      key={par.id}
                      className="bg-[#242424] border border-[#333333] hover:border-slate-600 rounded-xl p-4 space-y-3 shadow-md transition"
                    >
                      {/* Topo do Parecer */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#333333] pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            isFavoravel
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : isExigencia
                                ? 'bg-amber-950 text-amber-300 border border-amber-700'
                                : isDesfavoravel
                                  ? 'bg-rose-950 text-rose-300 border border-rose-700'
                                  : 'bg-blue-950 text-blue-300 border border-blue-700'
                          }`}>
                            {par.tipo_parecer}
                          </span>

                          <span className="text-slate-300 font-bold text-xs flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {par.autor_nome}
                          </span>
                          <span className="text-slate-500 font-mono text-[10px]">
                            ({par.autor_matricula})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{par.data_hora}</span>
                        </div>
                      </div>

                      {/* Texto da Fundamentação Técnica */}
                      <div className="space-y-1 text-slate-200 text-xs whitespace-pre-wrap leading-relaxed bg-[#1b1b1b] p-3 rounded-lg border border-[#2e2e2e]">
                        <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                          Fundamentação Sanitária / Despacho:
                        </span>
                        {par.parecer_texto}
                      </div>

                      {/* Condicionantes se houver */}
                      {par.condicionantes && (
                        <div className="bg-amber-950/30 border border-amber-700/40 p-2.5 rounded-lg text-amber-200/90 text-xs">
                          <strong className="text-amber-300 block mb-0.5 text-[10px] uppercase">
                            ⚠️ Condicionantes / Exigências:
                          </strong>
                          {par.condicionantes}
                        </div>
                      )}

                      {/* Carimbo de Assinatura Digital e Código de Autenticação */}
                      <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-2 text-emerald-300 font-medium">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{par.assinatura_digital}</span>
                        </div>
                        <div className="font-mono text-[10px] bg-slate-900/90 text-emerald-400 px-2.5 py-1 rounded border border-emerald-900 shrink-0 text-center">
                          AUTH: {par.codigo_autenticacao}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SEÇÃO 3: ÁREA EXCLUSIVA DO SERVIDOR PÚBLICO (DAR SEU PARECER & ATUALIZAR STATUS) */}
          {isServidor ? (
            <div className="bg-gradient-to-r from-slate-900 to-[#192233] border-2 border-indigo-500/50 rounded-xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-600/30 text-indigo-300 rounded-lg border border-indigo-500/40">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase text-white text-sm">
                      Lavrar Parecer Técnico Sanitário • Servidor da VISA
                    </h3>
                    <p className="text-[11px] text-indigo-200/80">
                      Preencha os termos do parecer e clique em assinar digitalmente (requer confirmação com sua senha de usuário).
                    </p>
                  </div>
                </div>

                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-amber-300 bg-amber-950/60 border border-amber-700/60 px-2.5 py-1 rounded-md font-bold">
                  <KeyRound className="w-3.5 h-3.5" /> Requer Senha
                </span>
              </div>

              <form onSubmit={handleIniciarAssinatura} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Tipo de Parecer */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-indigo-200 block mb-1">
                      Tipo de Parecer Técnico *
                    </label>
                    <select
                      value={tipoParecer}
                      onChange={(e) => setTipoParecer(e.target.value as TipoParecerTecnico)}
                      className="w-full bg-[#181818] border border-indigo-500/40 text-white rounded-lg p-2 text-xs font-bold focus:outline-none focus:border-indigo-400"
                    >
                      <option value="FAVORÁVEL (DEFERIMENTO)">FAVORÁVEL (DEFERIMENTO)</option>
                      <option value="FAVORÁVEL COM CONDICIONANTES">FAVORÁVEL COM CONDICIONANTES</option>
                      <option value="EXIGÊNCIA / NOTIFICAÇÃO">EXIGÊNCIA / NOTIFICAÇÃO</option>
                      <option value="DESFAVORÁVEL (INDEFERIMENTO)">DESFAVORÁVEL (INDEFERIMENTO)</option>
                      <option value="VISTORIA AGENDADA">VISTORIA AGENDADA</option>
                      <option value="DILIGÊNCIA / REQUISIÇÃO">DILIGÊNCIA / REQUISIÇÃO</option>
                      <option value="DESPACHO ADMINISTRATIVO">DESPACHO ADMINISTRATIVO</option>
                    </select>
                  </div>

                  {/* Atualizar Status do Processo */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-indigo-200 block mb-1">
                      Atualizar Status do Processo *
                    </label>
                    <select
                      value={novoStatus}
                      onChange={(e) => setNovoStatus(e.target.value as ProcessoStatus)}
                      className="w-full bg-[#181818] border border-indigo-500/40 text-white rounded-lg p-2 text-xs font-bold focus:outline-none focus:border-indigo-400"
                    >
                      <option value="DEFERIDO">DEFERIDO</option>
                      <option value="EM ANÁLISE">EM ANÁLISE</option>
                      <option value="PENDENTE DOCS">PENDENTE DOCS</option>
                      <option value="VISTORIA AGENDADA">VISTORIA AGENDADA</option>
                      <option value="INDEFERIDO">INDEFERIDO</option>
                      <option value="NOTIFICADO">NOTIFICADO</option>
                    </select>
                  </div>

                  {/* Fiscal Atribuído */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-indigo-200 block mb-1">
                      Fiscal Responsável
                    </label>
                    <input
                      type="text"
                      value={fiscalDesignado}
                      onChange={(e) => setFiscalDesignado(e.target.value)}
                      placeholder="Nome do fiscal..."
                      className="w-full bg-[#181818] border border-indigo-500/40 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-400 font-semibold"
                    />
                  </div>
                </div>

                {/* Texto do Parecer */}
                <div>
                  <label className="text-[10px] font-black uppercase text-indigo-200 block mb-1">
                    Fundamentação Sanitária / Parecer Técnico Oficial *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={textoParecer}
                    onChange={(e) => setTextoParecer(e.target.value)}
                    placeholder="Descreva detalhadamente a vistoria sanitária realizada, condições higiênico-sanitárias, conformidade com a LC nº 40/2019 e decretos municipais..."
                    className="w-full bg-[#181818] border border-indigo-500/40 text-white rounded-lg p-3 text-xs leading-relaxed focus:outline-none focus:border-indigo-400 placeholder-slate-500 font-sans"
                  />
                </div>

                {/* Condicionantes e Validade */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black uppercase text-indigo-200 block mb-1">
                      Condicionantes Sanitárias / Prazos (Opcional)
                    </label>
                    <input
                      type="text"
                      value={condicionantes}
                      onChange={(e) => setCondicionantes(e.target.value)}
                      placeholder="Ex: Apresentar PGRSS atualizado e comprovante de controle de pragas no prazo de 30 dias..."
                      className="w-full bg-[#181818] border border-indigo-500/40 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-400 placeholder-slate-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-indigo-200 block mb-1">
                      Validade do Alvará / Licença
                    </label>
                    <input
                      type="date"
                      value={novaValidade}
                      onChange={(e) => setNovaValidade(e.target.value)}
                      className="w-full bg-[#181818] border border-indigo-500/40 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-400 font-mono"
                    />
                  </div>
                </div>

                {/* Botão de Ação: Assinar Digitalmente */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition active:scale-95 flex items-center gap-2 cursor-pointer ring-1 ring-emerald-400/50"
                  >
                    <FileSignature className="w-4 h-4" />
                    <span>Assinar Digitalmente e Publicar Parecer</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* AVISO PARA NÃO-SERVIDORES (CIDADÃO, CONTRIBUINTE, CONTABILIDADE) */
            <div className="bg-[#1c2233] border border-blue-900/60 rounded-xl p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 text-blue-300 font-bold">
                <Lock className="w-4 h-4 text-blue-400" />
                <span>Área Restrita aos Servidores e Auditores Fiscais da VISA</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Você está visualizando este processo em modo público/auditoria com transparência de dados. A emissão de pareceres sanitários, alteração de status e concessão de licenças são prerrogativas exclusivas de Servidores Públicos da Diretoria de Vigilância Sanitária (DVIS) mediante assinatura digital.
              </p>
            </div>
          )}
        </div>

        {/* 🌟 RODAPÉ DO MODAL */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Sistema Oficial DVIS • Balneário Camboriú/SC</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* 🔐 MODAL DE CONFIRMAÇÃO DE ASSINATURA DIGITAL COM SENHA */}
      {modalAssinaturaOpen && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#242424] border border-amber-500/50 text-white rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shadow-inner">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Assinatura Digital da Autoridade Sanitária
                  </h3>
                  <p className="text-xs text-slate-400">
                    Validação Eletrônica de Parecer Técnico
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalAssinaturaOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informações do Certificado do Fiscal */}
            <div className="p-3.5 bg-[#1a1a1a] rounded-xl border border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Autoridade:</span>
                <strong className="text-white">{currentUser?.nome_completo || 'Fiscal Sanitário'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Matrícula:</span>
                <span className="font-mono text-amber-400 font-bold">{currentUser?.matricula || 'DVIS-BC'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Parecer Proposto:</span>
                <span className="text-emerald-400 font-bold">{tipoParecer}</span>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-amber-300 font-medium">
                Ao informar sua senha, será aposto o carimbo eletrônico oficial com verificação de autenticidade no sistema.
              </div>
            </div>

            {/* Formulário de Senha */}
            <form onSubmit={handleConfirmarAssinatura} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Digite sua senha institucional para assinar *</span>
                </label>
                <input
                  type="password"
                  autoFocus
                  required
                  value={senhaAssinatura}
                  onChange={(e) => {
                    setSenhaAssinatura(e.target.value);
                    setErroSenhaAssinatura(null);
                  }}
                  placeholder="Informe sua senha..."
                  className="w-full px-4 py-2.5 bg-[#181818] border border-slate-600 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
                />
                {erroSenhaAssinatura && (
                  <p className="mt-1.5 text-xs text-rose-400 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {erroSenhaAssinatura}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAssinaturaOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar Assinatura</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
