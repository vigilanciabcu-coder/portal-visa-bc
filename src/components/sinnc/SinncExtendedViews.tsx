import React, { useEffect, useMemo, useState } from 'react';
import {
  AlvaraSanitarioItem,
  AmostraLaboratorioItem,
  CcpuEstoqueItem,
  CcpuOcorrenciaItem,
  CidadaoProfile,
  ContabilidadeProfile,
  ContribuinteProfile,
  DocumentoContabilidade,
  MODULOS_SISTEMA,
  PRESET_PAGINAS,
  PastaVisaItem,
  PontoColetaLaboratorio,
  ProcessoItem,
  SolicitacaoLaudoPotabilidadeItem,
  TramitacaoItem,
  UserNivelAcesso,
  UserProfile,
  UserRole,
  UserSetor,
} from '../../types';
import {
  ExternalUserScope,
  SinncDashboardMetrics,
  diffDaysFromToday,
  formatShortBrDate,
  safeReadLocalArray,
} from './sinncTypes';
import {
  cleanDoc,
  formatDoc,
  getDisplayPastaNumero,
  isValidDocLength,
  obterOuCriarPastaPorCpfCnpj,
} from '../../lib/pastaVisaService';
import {
  fetchCidadaosFromSupabase,
  fetchContabilidadesFromSupabase,
  fetchContribuintesFromSupabase,
  fetchDocumentosContabilidadeFromSupabase,
  saveCidadaoToSupabase,
  saveContabilidadeToSupabase,
  saveContribuinteToSupabase,
  saveDocumentoContabilidadeToSupabase,
} from '../../lib/supabaseService';
import {
  fetchCcpuOcorrencias,
  getLocalCcpuOcorrencias,
  saveCcpuOcorrencia,
} from '../../lib/ccpuOcorrenciasService';
import {
  baixarEstoquePorOcorrencia,
  fetchCcpuEstoque,
  getLocalCcpuEstoqueItens,
} from '../../lib/ccpuEstoqueService';
import { CcpuNovaOcorrenciaModal } from '../ccpu/CcpuNovaOcorrenciaModal';
import { CcpuRelatorioOficialModal } from '../ccpu/CcpuRelatorioOficialModal';
import { SinncWorkflowModalKind } from './SinncDemoWorkflowModals';
import {
  ArrowUpRight,
  Award,
  Briefcase,
  Bug,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Droplet,
  Edit2,
  FileCheck2,
  FileText,
  FlaskConical,
  FolderOpen,
  Lock,
  Paperclip,
  Plus,
  Printer,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';

// Helpers locais compartilhados (mantendo sincronia 100% com o Portal Clássico)
const LS_CONTABILIDADES = 'visa_contabilidades_lab';
const LS_CONTRIBUINTES = 'visa_contribuintes';
const LS_CIDADAO = 'visa_cidadaos';
const LS_DOCS_CONTAB = 'visa_documentos_contabilidade';

function saveLocalArray<T>(key: string, items: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // ignore storage quota errors
  }
}

// ============================================================================
// 1. PORTAL DO MUNÍCIPE & CONTRIBUINTE (ESTÉTICA CAPA TESTE)
// ============================================================================
interface SinncMunicipeViewProps {
  currentUser: UserProfile | null;
  externalScope?: ExternalUserScope;
  metrics: SinncDashboardMetrics;
  processos: ProcessoItem[];
  onSelectProcesso: (proc: ProcessoItem) => void;
  onSaveProcesso: (proc: ProcessoItem) => Promise<void> | void;
  onOpenDossiePorDoc: (doc: string, razaoFallback?: string) => void;
  onOpenWorkflowModal: (kind: SinncWorkflowModalKind, initialPasta?: PastaVisaItem | null) => void;
  onOpenSolicitarLab: (pasta?: PastaVisaItem | null) => void;
  onRefreshState: () => void;
  onNavigateClassic: (view: string) => void;
  compactDensity: boolean;
}

export const SinncMunicipeView: React.FC<SinncMunicipeViewProps> = ({
  currentUser,
  externalScope,
  metrics,
  processos,
  onSelectProcesso,
  onSaveProcesso,
  onOpenDossiePorDoc,
  onOpenWorkflowModal,
  onOpenSolicitarLab,
  onRefreshState,
  onNavigateClassic,
  compactDensity,
}) => {
  const isExternal = Boolean(externalScope?.isExternal);
  const isContribuinte = externalScope?.mode === 'CONTRIBUINTE';
  const isFeirante =
    currentUser?.categoria_contribuinte === 'FEIRANTE' ||
    (currentUser?.cargo || '').toUpperCase().includes('FEIRANTE');
  const [subTab, setSubTab] = useState<'acompanhamento' | 'servicos' | 'alvaras' | 'perfil'>('acompanhamento');
  const [buscaDoc, setBuscaDoc] = useState<string>(isExternal ? '' : (currentUser?.cpf || currentUser?.cnpj || ''));
  const [selectedProcId, setSelectedProcId] = useState<string | null>(null);
  const [respostaTexto, setRespostaTexto] = useState('');
  const [anexosResposta, setAnexosResposta] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Cadastro de Munícipe / Contribuinte
  const [cidadaos, setCidadaos] = useState<CidadaoProfile[]>(() => safeReadLocalArray<CidadaoProfile>(LS_CIDADAO));
  const [perfilNome, setPerfilNome] = useState(currentUser?.nome_completo || '');
  const [perfilCpfCnpj, setPerfilCpfCnpj] = useState(
    (externalScope?.primaryDoc ? formatDoc(externalScope.primaryDoc) : '') || currentUser?.cpf || currentUser?.cnpj || ''
  );
  const [perfilEmail, setPerfilEmail] = useState(currentUser?.email || '');
  const [perfilTelefone, setPerfilTelefone] = useState(currentUser?.telefone || '');
  const [perfilBairro, setPerfilBairro] = useState(currentUser?.bairro || '');
  const [perfilEndereco, setPerfilEndereco] = useState(currentUser?.endereco || '');
  const [perfilSenha, setPerfilSenha] = useState('123456');
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  useEffect(() => {
    if (isExternal) return;
    void fetchCidadaosFromSupabase().then((remote) => {
      if (remote && remote.length > 0) {
        setCidadaos(remote);
        saveLocalArray(LS_CIDADAO, remote);
      }
    });
  }, [isExternal]);

  const rowPad = compactDensity ? 'py-2 px-3' : 'py-2.5 px-3.5';
  const buscaNorm = buscaDoc.trim().toLowerCase();
  const buscaDigits = cleanDoc(buscaDoc);

  const pastaEncontrada = useMemo(() => {
    if (isExternal) {
      if (!buscaNorm) return metrics.pastasLocais[0] || null;
      return (
        metrics.pastasLocais.find(
          (pt) =>
            (buscaDigits && cleanDoc(pt.cpf_cnpj_limpo || pt.cnpj_cpf) === buscaDigits) ||
            getDisplayPastaNumero(pt).toLowerCase() === buscaNorm ||
            (pt.razao_social || '').toLowerCase().includes(buscaNorm)
        ) || metrics.pastasLocais[0] || null
      );
    }
    if (!buscaNorm) return null;
    return (
      metrics.pastasLocais.find(
        (pt) =>
          (buscaDigits && cleanDoc(pt.cpf_cnpj_limpo || pt.cnpj_cpf) === buscaDigits) ||
          getDisplayPastaNumero(pt).toLowerCase() === buscaNorm
      ) || null
    );
  }, [metrics.pastasLocais, buscaNorm, buscaDigits, isExternal]);

  const processosMunicipe = useMemo(() => {
    if (!buscaNorm) {
      if (isExternal) return processos;
      return processos.filter(
        (p) =>
          p.origem_solicitacao === 'PORTAL_MUNICIPE' ||
          p.status === 'NOTIFICADO' ||
          p.status === 'PENDENTE DOCS' ||
          Boolean(p.cumprimento_cidadao)
      );
    }
    return processos.filter((p) => {
      const pDigits = cleanDoc(p.cnpj_cpf);
      return (
        (buscaDigits.length >= 3 && pDigits.includes(buscaDigits)) ||
        (p.num_processo || '').toLowerCase().includes(buscaNorm) ||
        (p.numero_pasta || p.pasta || '').toLowerCase().includes(buscaNorm) ||
        (p.assunto || '').toLowerCase().includes(buscaNorm) ||
        (p.status || '').toLowerCase().includes(buscaNorm) ||
        (p.razao_social || '').toLowerCase().includes(buscaNorm)
      );
    });
  }, [processos, buscaNorm, buscaDigits, isExternal]);

  const alvarasMunicipe = useMemo(() => {
    if (!buscaNorm) return metrics.alvarasLocais;
    return metrics.alvarasLocais.filter((a) => {
      const aDigits = cleanDoc(a.cnpj_cpf);
      return (
        (buscaDigits.length >= 3 && aDigits.includes(buscaDigits)) ||
        (a.numero_pasta || a.pasta || '').toLowerCase().includes(buscaNorm) ||
        (a.razao_social || '').toLowerCase().includes(buscaNorm) ||
        (a.numero_alvara || '').toLowerCase().includes(buscaNorm)
      );
    });
  }, [metrics.alvarasLocais, buscaNorm, buscaDigits]);

  const processoSelecionado = useMemo(
    () => processos.find((p) => p.id === selectedProcId) || null,
    [processos, selectedProcId]
  );

  const handleAnexarArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const names = Array.from(files).map((f) => f.name);
    setAnexosResposta((prev) => [...prev, ...names]);
  };

  const handleEnviarCumprimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processoSelecionado || (!respostaTexto.trim() && anexosResposta.length === 0)) return;
    setEnviando(true);
    try {
      const nowIso = new Date().toISOString();
      const respNome = perfilNome || currentUser?.nome_completo || processoSelecionado.razao_social || 'Contribuinte';
      const descText = respostaTexto.trim() || 'Comprovante de adequação anexado pelo contribuinte.';
      const anexoNomeJoined = anexosResposta.length > 0 ? anexosResposta.join(', ') : undefined;
      const tram: TramitacaoItem = {
        id: `tram-mun-${Date.now()}`,
        data_hora: nowIso,
        tipo: 'CUMPRIMENTO_EXIGENCIA',
        titulo: 'Cumprimento enviado pelo Portal do Munícipe',
        descricao: descText,
        responsavel_nome: respNome,
        anexo_nome: anexoNomeJoined,
        status_processo_momento: 'EM ANÁLISE',
      };
      const updated: ProcessoItem = {
        ...processoSelecionado,
        status: 'EM ANÁLISE',
        tramitacoes: [tram, ...(processoSelecionado.tramitacoes || [])],
        cumprimento_cidadao: {
          data_envio: nowIso.slice(0, 10),
          responsavel: respNome,
          descricao: descText,
          anexo_nome: anexoNomeJoined,
          status: 'AGUARDANDO_CONFERENCIA',
        },
      };
      await onSaveProcesso(updated);
      onRefreshState();
      setRespostaTexto('');
      setAnexosResposta([]);
      setSelectedProcId(null);
      setFeedback(`Cumprimento registrado no protocolo ${updated.num_processo}. O fiscal titular já foi notificado para conferência.`);
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setEnviando(false);
    }
  };

  const handleSalvarPerfilMunicipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perfilNome.trim() || !isValidDocLength(perfilCpfCnpj)) {
      setFeedback('Informe o nome completo e um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.');
      return;
    }
    setSalvandoPerfil(true);
    try {
      const { pasta } = await obterOuCriarPastaPorCpfCnpj(perfilCpfCnpj, {
        razao_social: perfilNome.trim(),
        telefone: perfilTelefone,
        email: perfilEmail,
        bairro: perfilBairro,
        endereco: perfilEndereco,
        criado_por: 'Portal do Munícipe (Capa Teste)',
      });
      const novoCid: CidadaoProfile = {
        id: `cid-${Date.now()}`,
        nome_completo: perfilNome.trim(),
        cpf: formatDoc(perfilCpfCnpj),
        email: perfilEmail.trim().toLowerCase(),
        telefone: perfilTelefone.trim(),
        bairro: perfilBairro.trim(),
        endereco: perfilEndereco.trim(),
        senha: perfilSenha || '123456',
        data_cadastro: new Date().toISOString().slice(0, 10),
      };
      const updated = [novoCid, ...cidadaos.filter((c) => cleanDoc(c.cpf) !== cleanDoc(perfilCpfCnpj))];
      setCidadaos(updated);
      saveLocalArray(LS_CIDADAO, updated);
      await saveCidadaoToSupabase(novoCid);
      onRefreshState();
      setBuscaDoc(cleanDoc(perfilCpfCnpj));
      setFeedback(`Cadastro salvo e vinculado automaticamente à Pasta VISA ${getDisplayPastaNumero(pasta)}.`);
    } finally {
      setSalvandoPerfil(false);
    }
  };

  return (
    <div className="space-y-5 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-[17px] font-semibold text-slate-800 tracking-tight">
            {isContribuinte
              ? 'Área do Contribuinte & Empresa'
              : externalScope?.mode === 'CIDADAO'
              ? 'Portal do Munícipe'
              : 'Portal do Munícipe & Contribuinte'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isExternal
              ? 'Acompanhamento exclusivo dos seus processos, notificações, alvarás e solicitações vinculados à sua conta'
              : 'Acompanhamento de processos, resposta a notificações, consulta de alvarás e autoatendimento vinculados à Pasta VISA'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenWorkflowModal('nova_demanda', pastaEncontrada)}
            className="px-3 py-1.5 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Solicitação</span>
          </button>
          {!isExternal && (
            <button
              type="button"
              onClick={() => onNavigateClassic('cidadao')}
              className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>Portal clássico</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {isExternal && (
        <div className="px-3.5 py-2 rounded-md border border-[#cfe0ee] bg-[#f4f8fc] text-xs text-[#285277] flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>
              Sessão protegida: exibindo exclusivamente os dados do documento{' '}
              <span className="font-mono font-semibold">
                {externalScope?.primaryDoc ? formatDoc(externalScope.primaryDoc) : currentUser?.email || 'vinculado'}
              </span>
            </span>
          </span>
        </div>
      )}

      {feedback && (
        <div className="px-3.5 py-2.5 rounded-md border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-800">
          {feedback}
        </div>
      )}

      {/* Barra de identificação por CPF/CNPJ/Pasta + Abas */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={buscaDoc}
            onChange={(e) => setBuscaDoc(e.target.value)}
            placeholder={
              isExternal
                ? 'Filtrar meus processos por protocolo, assunto ou status...'
                : 'Digite CPF, CNPJ, Pasta (000001) ou protocolo...'
            }
            className="!pl-8 !py-1.5 !px-3 !text-xs !font-normal !rounded-md !border-slate-300 !bg-white"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#f4f6f9] border border-slate-200 rounded-md overflow-x-auto">
          {[
            { id: 'acompanhamento', label: `Processos & Notificações (${processosMunicipe.length})` },
            { id: 'servicos', label: 'Solicitar Serviços' },
            { id: 'alvaras', label: `Meus Alvarás (${alvarasMunicipe.length})` },
            { id: 'perfil', label: isContribuinte ? 'Dados da Empresa' : 'Cadastro de Munícipe' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as any)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === t.id
                  ? 'bg-white text-slate-900 border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {pastaEncontrada && (
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="font-mono text-[#285277]">Pasta {getDisplayPastaNumero(pastaEncontrada)}</span>
              <span>·</span>
              <span>{pastaEncontrada.razao_social}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {pastaEncontrada.cnpj_cpf} · Alvará: {pastaEncontrada.alvara_atualizado || '—'} · Setor: {pastaEncontrada.setor}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenDossiePorDoc(pastaEncontrada.cnpj_cpf, pastaEncontrada.razao_social)}
            className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-[#285277] flex items-center gap-1.5 cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Ver Dossiê 360°</span>
          </button>
        </div>
      )}

      {subTab === 'acompanhamento' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f4f6f9] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                    <th className="py-2.5 px-3.5">Pasta VISA</th>
                    <th className="py-2.5 px-3.5">Protocolo</th>
                    <th className="py-2.5 px-3.5">Solicitação / Assunto</th>
                    <th className="py-2.5 px-3.5">Situação</th>
                    <th className="py-2.5 px-3.5">Prazo</th>
                    <th className="py-2.5 px-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 text-xs">
                  {processosMunicipe.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhum processo localizado para o filtro informado.
                      </td>
                    </tr>
                  ) : (
                    processosMunicipe.slice(0, 50).map((proc) => {
                      const dias = diffDaysFromToday(proc.prazo_vistoria || proc.venc_1doc || proc.agendado_para);
                      const needsReply = proc.status === 'NOTIFICADO' || proc.status === 'PENDENTE DOCS';
                      return (
                        <tr key={proc.id} className="hover:bg-[#f8fafc] transition-colors">
                          <td className={`${rowPad} font-mono font-semibold text-[#285277] whitespace-nowrap`}>
                            {proc.numero_pasta || proc.pasta || '—'}
                          </td>
                          <td className={`${rowPad} font-mono text-slate-700 tabular-nums whitespace-nowrap`}>
                            {proc.num_processo || proc.id}
                          </td>
                          <td className={`${rowPad} min-w-[200px]`}>
                            <div className="font-medium text-slate-800">{proc.assunto || 'Solicitação Sanitária'}</div>
                            <div className="text-[11px] text-slate-500">
                              {proc.razao_social} · Fiscal: {proc.fiscal_responsavel || 'Em triagem'}
                            </div>
                          </td>
                          <td className={`${rowPad} whitespace-nowrap`}>
                            <span
                              className={`font-medium ${
                                proc.status === 'DEFERIDO'
                                  ? 'text-emerald-700'
                                  : needsReply
                                  ? 'text-amber-700'
                                  : 'text-slate-700'
                              }`}
                            >
                              {proc.cumprimento_cidadao?.status === 'AGUARDANDO_CONFERENCIA'
                                ? 'Cumprimento Enviado'
                                : proc.status}
                            </span>
                          </td>
                          <td className={`${rowPad} font-mono tabular-nums whitespace-nowrap ${dias !== null && dias < 0 ? 'text-[#a13c46] font-semibold' : 'text-slate-600'}`}>
                            {proc.prazo_vistoria ? formatShortBrDate(proc.prazo_vistoria) : '—'}
                          </td>
                          <td className={`${rowPad} text-right whitespace-nowrap space-x-2`}>
                            {needsReply && (
                              <button
                                type="button"
                                onClick={() => setSelectedProcId(proc.id)}
                                className="px-2.5 py-1 rounded bg-[#3b6d96] hover:bg-[#315b7e] text-white text-[11px] font-medium cursor-pointer"
                              >
                                Responder Exigência
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onSelectProcesso(proc)}
                              className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium cursor-pointer"
                            >
                              Detalhes
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {processoSelecionado && (
            <form onSubmit={handleEnviarCumprimento} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-800">
                    Enviar Cumprimento de Exigência — Proc. {processoSelecionado.num_processo}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    O retorno será enviado diretamente para {processoSelecionado.fiscal_responsavel || 'o fiscal responsável'} sem voltar à fila inicial.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProcId(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
              <textarea
                rows={3}
                value={respostaTexto}
                onChange={(e) => setRespostaTexto(e.target.value)}
                placeholder="Descreva as adequações realizadas e documentos comprobatórios anexados..."
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 bg-[#f8fafc] hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Anexar foto ou comprovante ({anexosResposta.length})</span>
                  <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleAnexarArquivo} />
                </label>
                <button
                  type="submit"
                  disabled={enviando}
                  className="px-4 py-1.5 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{enviando ? 'Enviando...' : 'Enviar para Conferência do Fiscal'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {subTab === 'servicos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[
            {
              title: 'Alvará Sanitário (Inicial / Renovação)',
              desc: 'Solicitação de licenciamento sanitário com geração automática da Pasta VISA de 6 dígitos.',
              actionLabel: 'Abrir solicitação',
              onClick: () => onOpenWorkflowModal('nova_demanda', pastaEncontrada),
            },
            {
              title: 'Análise de Potabilidade da Água',
              desc: 'Solicitação oficial de coleta e laudo laboratorial vinculada diretamente à Pasta.',
              actionLabel: 'Solicitar coleta',
              onClick: () => onOpenSolicitarLab(pastaEncontrada),
            },
            {
              title: 'Habite-se Sanitário (LC 40/2019)',
              desc: 'Requerimento de vistoria de conclusão de obra com protocolo e vínculo cadastral.',
              actionLabel: 'Requerer Habite-se',
              onClick: () => onOpenWorkflowModal('novo_habite_se', pastaEncontrada),
            },
            ...(!isExternal || isFeirante
              ? [
                  {
                    title: 'Feirantes & Ambulantes',
                    desc: 'Regularização de box/banca mantendo vínculo único por CPF ou MEI na Pasta VISA.',
                    actionLabel: 'Vincular permissão',
                    onClick: () => onOpenWorkflowModal('novo_feirante', pastaEncontrada),
                  },
                ]
              : []),
            {
              title: 'Denúncia Sanitária / Ouvidoria',
              desc: 'Registro de ocorrência sanitária para triagem e vinculação ao estabelecimento alvo.',
              actionLabel: 'Registrar denúncia',
              onClick: () => onOpenWorkflowModal('nova_demanda', null),
            },
          ].map((srv) => (
            <div key={srv.title} className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold text-slate-800">{srv.title}</h3>
                <p className="text-[11.5px] text-slate-500 mt-1 leading-relaxed">{srv.desc}</p>
              </div>
              <button
                type="button"
                onClick={srv.onClick}
                className="self-start px-3 py-1.5 rounded bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium cursor-pointer"
              >
                {srv.actionLabel}
              </button>
            </div>
          ))}
        </div>
      )}

      {subTab === 'alvaras' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 tabular-nums">
              Alvarás Sanitários Emitidos ({alvarasMunicipe.length})
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              className="text-[11px] font-medium text-[#3b6d96] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3 h-3" />
              <span>Imprimir</span>
            </button>
          </div>
          <div className="divide-y divide-slate-200/80 text-xs">
            {alvarasMunicipe.length === 0 ? (
              <p className="p-6 text-center text-slate-400">Nenhum alvará encontrado para o filtro atual.</p>
            ) : (
              alvarasMunicipe.slice(0, 30).map((alv) => (
                <div
                  key={alv.id}
                  onClick={() => alv.cnpj_cpf && onOpenDossiePorDoc(alv.cnpj_cpf, alv.razao_social)}
                  className="p-3.5 hover:bg-[#f8fafc] flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{alv.razao_social}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      Pasta {alv.numero_pasta || alv.pasta || '—'} · Alvará {alv.numero_alvara} · {alv.cnpj_cpf}
                    </div>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <div className="font-medium text-slate-800">{alv.status}</div>
                    <div className="text-[11px] text-slate-500">Validade: {formatShortBrDate(alv.validade)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {subTab === 'perfil' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <form onSubmit={handleSalvarPerfilMunicipe} className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
            <h3 className="text-xs font-semibold text-slate-800">
              {isContribuinte ? 'Dados Cadastrais da Empresa / Contribuinte' : 'Cadastro Rápido de Munícipe / Contribuinte'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Nome Completo / Razão Social *</label>
                <input
                  type="text"
                  required
                  value={perfilNome}
                  onChange={(e) => setPerfilNome(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">CPF ou CNPJ *</label>
                <input
                  type="text"
                  required
                  readOnly={Boolean(isExternal && externalScope?.primaryDoc)}
                  value={perfilCpfCnpj}
                  onChange={(e) => setPerfilCpfCnpj(e.target.value)}
                  placeholder="Somente números ou formatado"
                  className={`w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-mono ${
                    isExternal && externalScope?.primaryDoc ? 'bg-slate-100 text-slate-600' : ''
                  }`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">E-mail</label>
                <input
                  type="email"
                  value={perfilEmail}
                  onChange={(e) => setPerfilEmail(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={perfilTelefone}
                  onChange={(e) => setPerfilTelefone(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Bairro</label>
                <input
                  type="text"
                  value={perfilBairro}
                  onChange={(e) => setPerfilBairro(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Senha de Acesso Portal</label>
                <input
                  type="password"
                  value={perfilSenha}
                  onChange={(e) => setPerfilSenha(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Endereço Completo</label>
              <input
                type="text"
                value={perfilEndereco}
                onChange={(e) => setPerfilEndereco(e.target.value)}
                className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={salvandoPerfil}
              className="px-4 py-1.5 rounded bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium cursor-pointer"
            >
              {salvandoPerfil ? 'Salvando...' : 'Salvar Cadastro e Gerar Pasta VISA'}
            </button>
          </form>

          {isExternal ? (
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#3b6d96]" />
                <span>Resumo da Conta Vinculada</span>
              </div>
              <div className="space-y-2 text-slate-600">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span>Titular</span>
                  <span className="font-medium text-slate-800">{currentUser?.nome_completo || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span>Documento</span>
                  <span className="font-mono text-slate-800">
                    {externalScope?.primaryDoc ? formatDoc(externalScope.primaryDoc) : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span>Pasta(s) VISA</span>
                  <span className="font-mono font-semibold text-[#285277]">{metrics.pastasLocais.length}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>Processos / Alvarás</span>
                  <span className="font-mono text-slate-800">
                    {processos.length} proc. · {metrics.alvarasLocais.length} alvará(s)
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 text-xs font-semibold text-slate-700">
                Munícipes Cadastrados ({cidadaos.length})
              </div>
              <div className="divide-y divide-slate-200/80 max-h-80 overflow-y-auto text-xs">
                {cidadaos.length === 0 ? (
                  <p className="p-6 text-center text-slate-400">Nenhum munícipe registrado localmente.</p>
                ) : (
                  cidadaos.slice(0, 20).map((cid) => (
                    <button
                      key={cid.id}
                      type="button"
                      onClick={() => {
                        setBuscaDoc(cid.cpf);
                        setSubTab('acompanhamento');
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-[#f8fafc] flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800 truncate">{cid.nome_completo}</div>
                        <div className="text-[11px] font-mono text-slate-500">{cid.cpf} · {cid.email}</div>
                      </div>
                      <span className="text-[11px] text-[#3b6d96] font-medium shrink-0">Filtrar</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. PORTAL DO CONTADOR & ESCRITÓRIO CONTÁBIL (ESTÉTICA CAPA TESTE)
// ============================================================================
interface SinncContadorViewProps {
  currentUser: UserProfile | null;
  externalScope?: ExternalUserScope;
  metrics: SinncDashboardMetrics;
  processos: ProcessoItem[];
  onSelectProcesso: (proc: ProcessoItem) => void;
  onOpenDossiePorDoc: (doc: string, razaoFallback?: string) => void;
  onOpenWorkflowModal: (kind: SinncWorkflowModalKind, initialPasta?: PastaVisaItem | null) => void;
  onRefreshState: () => void;
  onNavigateClassic: (view: string) => void;
  compactDensity: boolean;
}

export const SinncContadorView: React.FC<SinncContadorViewProps> = ({
  currentUser,
  externalScope,
  metrics,
  processos,
  onSelectProcesso,
  onOpenDossiePorDoc,
  onOpenWorkflowModal,
  onRefreshState,
  onNavigateClassic,
  compactDensity,
}) => {
  const isExternalContador = externalScope?.mode === 'CONTABILIDADE';
  const [contabilidades, setContabilidades] = useState<ContabilidadeProfile[]>(() =>
    safeReadLocalArray<ContabilidadeProfile>(LS_CONTABILIDADES)
  );
  const [documentos, setDocumentos] = useState<DocumentoContabilidade[]>(() =>
    safeReadLocalArray<DocumentoContabilidade>(LS_DOCS_CONTAB)
  );
  const [selectedContabId, setSelectedContabId] = useState<string>('');
  const [subTab, setSubTab] = useState<'carteira' | 'processos' | 'documentos' | 'escritorio'>('carteira');
  const [novoClienteDoc, setNovoClienteDoc] = useState('');
  const [novoClienteRazao, setNovoClienteRazao] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Novo documento contábil
  const [docCnpj, setDocCnpj] = useState('');
  const [docTipo, setDocTipo] = useState('PGRSS');
  const [docArquivo, setDocArquivo] = useState('');
  const [docObs, setDocObs] = useState('');

  // Cadastro de escritório contábil
  const [escRazao, setEscRazao] = useState('');
  const [escCnpj, setEscCnpj] = useState('');
  const [escCrc, setEscCrc] = useState('');
  const [escResp, setEscResp] = useState('');
  const [escEmail, setEscEmail] = useState('');
  const [escTel, setEscTel] = useState('');

  useEffect(() => {
    void fetchContabilidadesFromSupabase().then((remote) => {
      if (remote && remote.length > 0) {
        setContabilidades(remote);
        saveLocalArray(LS_CONTABILIDADES, remote);
        setSelectedContabId((prev) => prev || currentUser?.contabilidade_id || remote[0].id);
      }
    });
    void fetchDocumentosContabilidadeFromSupabase().then((remoteDocs) => {
      if (remoteDocs && remoteDocs.length > 0) {
        setDocumentos(remoteDocs);
        saveLocalArray(LS_DOCS_CONTAB, remoteDocs);
      }
    });
  }, [currentUser?.contabilidade_id]);

  const activeContab = useMemo(() => {
    if (isExternalContador && externalScope?.contabilidade) {
      return (
        contabilidades.find((c) => c.id === externalScope.contabilidade?.id) ||
        externalScope.contabilidade
      );
    }
    return (
      contabilidades.find((c) => c.id === selectedContabId) ||
      contabilidades.find((c) => c.id === currentUser?.contabilidade_id) ||
      (isExternalContador ? null : contabilidades[0]) ||
      null
    );
  }, [contabilidades, selectedContabId, currentUser?.contabilidade_id, isExternalContador, externalScope?.contabilidade]);

  const carteiraDocs = useMemo(() => {
    const rawList = activeContab?.cnpjs_vinculados || [];
    if (isExternalContador || rawList.length > 0) return rawList;
    // Fallback apenas para visão interna da VISA quando nenhum escritório tem vínculos ainda
    const fromPortal = Array.from(
      new Set(
        processos
          .filter((p) => p.origem_solicitacao === 'PORTAL_CONTADOR' && p.cnpj_cpf)
          .map((p) => p.cnpj_cpf)
      )
    );
    return fromPortal;
  }, [activeContab, processos, isExternalContador]);

  const cleanCarteiraSet = useMemo(
    () => new Set(carteiraDocs.map((d) => cleanDoc(d)).filter(Boolean)),
    [carteiraDocs]
  );

  const processosCarteira = useMemo(() => {
    if (isExternalContador) {
      return processos.filter((p) => p.cnpj_cpf && cleanCarteiraSet.has(cleanDoc(p.cnpj_cpf)));
    }
    return processos.filter(
      (p) =>
        p.origem_solicitacao === 'PORTAL_CONTADOR' ||
        (p.cnpj_cpf && cleanCarteiraSet.has(cleanDoc(p.cnpj_cpf)))
    );
  }, [processos, cleanCarteiraSet, isExternalContador]);

  const documentosVisiveis = useMemo(() => {
    if (!isExternalContador) return documentos;
    return documentos.filter((d) => cleanCarteiraSet.has(cleanDoc(d.cnpj_empresa)));
  }, [documentos, isExternalContador, cleanCarteiraSet]);

  const rowPad = compactDensity ? 'py-2 px-3' : 'py-2.5 px-3.5';

  const handleVincularEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidDocLength(novoClienteDoc)) {
      setFeedback('Informe um CNPJ (14 dígitos) ou CPF (11 dígitos) válido para vincular à carteira.');
      return;
    }
    const { pasta } = await obterOuCriarPastaPorCpfCnpj(novoClienteDoc, {
      razao_social: novoClienteRazao || undefined,
      criado_por: activeContab?.responsavel || currentUser?.nome_completo || 'Portal do Contador',
    });
    const docFormatado = formatDoc(novoClienteDoc);
    if (activeContab) {
      const updatedCnpjs = Array.from(new Set([docFormatado, ...(activeContab.cnpjs_vinculados || [])]));
      const updatedContab: ContabilidadeProfile = { ...activeContab, cnpjs_vinculados: updatedCnpjs };
      const updatedList = contabilidades.some((c) => c.id === activeContab.id)
        ? contabilidades.map((c) => (c.id === activeContab.id ? updatedContab : c))
        : [updatedContab, ...contabilidades];
      setContabilidades(updatedList);
      saveLocalArray(LS_CONTABILIDADES, updatedList);
      await saveContabilidadeToSupabase(updatedContab);
      window.dispatchEvent(new Event('visa_contabilidades_updated'));
    }
    onRefreshState();
    setNovoClienteDoc('');
    setNovoClienteRazao('');
    setFeedback(`Empresa vinculada à carteira e associada à Pasta VISA ${getDisplayPastaNumero(pasta)}.`);
  };

  const handleEnviarDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docCnpj.trim() || !docArquivo.trim()) {
      setFeedback('Selecione a empresa e informe o arquivo/protocolo do documento.');
      return;
    }
    const novoDoc: DocumentoContabilidade = {
      id: `doc-cont-${Date.now()}`,
      cnpj_empresa: formatDoc(docCnpj),
      tipo_documento: docTipo,
      nome_arquivo: docArquivo.trim(),
      data_envio: new Date().toISOString().slice(0, 10),
      status: 'ANALISE',
      observacao: docObs.trim(),
    };
    const nextDocs = [novoDoc, ...documentos];
    setDocumentos(nextDocs);
    saveLocalArray(LS_DOCS_CONTAB, nextDocs);
    await saveDocumentoContabilidadeToSupabase({
      ...novoDoc,
      contabilidade_id: activeContab?.id,
    });
    setDocArquivo('');
    setDocObs('');
    setFeedback(`Documento ${docTipo} registrado para o CNPJ ${novoDoc.cnpj_empresa}.`);
  };

  const handleSalvarEscritorio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escRazao.trim() || !isValidDocLength(escCnpj)) {
      setFeedback('Informe a Razão Social e CNPJ válido do escritório contábil.');
      return;
    }
    const novoEsc: ContabilidadeProfile = {
      id: `contab-${Date.now()}`,
      razao_social: escRazao.trim(),
      nome_fantasia: escRazao.trim(),
      cnpj: formatDoc(escCnpj),
      crc: escCrc.trim(),
      responsavel: escResp.trim() || 'Contador Responsável',
      email: escEmail.trim().toLowerCase(),
      telefone: escTel.trim(),
      cnpjs_vinculados: [],
      data_cadastro: new Date().toISOString().slice(0, 10),
    };
    const next = [novoEsc, ...contabilidades];
    setContabilidades(next);
    saveLocalArray(LS_CONTABILIDADES, next);
    setSelectedContabId(novoEsc.id);
    await saveContabilidadeToSupabase(novoEsc);
    setEscRazao('');
    setEscCnpj('');
    setEscCrc('');
    setEscResp('');
    setEscEmail('');
    setEscTel('');
    setSubTab('carteira');
    setFeedback(`Escritório ${novoEsc.razao_social} cadastrado.`);
  };

  return (
    <div className="space-y-5 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-[17px] font-semibold text-slate-800 tracking-tight">
            Portal do Contador &amp; Carteira de Empresas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestão multi-CNPJ com resolução automática da Pasta VISA de 6 dígitos, protocolos e envio de documentos sanitários
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenWorkflowModal('nova_demanda')}
            className="px-3 py-1.5 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Demanda (Cliente)</span>
          </button>
          {!externalScope?.isExternal && (
            <button
              type="button"
              onClick={() => onNavigateClassic('portal_contador')}
              className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>Portal clássico</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="px-3.5 py-2.5 rounded-md border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-800">
          {feedback}
        </div>
      )}

      {/* Seleção do escritório ativo + Sub-tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-slate-600 whitespace-nowrap">Escritório ativo:</span>
          {isExternalContador ? (
            <div className="inline-flex items-center gap-1.5 rounded-md border border-[#cfe0ee] bg-[#f4f8fc] px-2.5 py-1.5 text-xs font-medium text-[#285277]">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {activeContab?.razao_social || currentUser?.nome_completo}
                {activeContab?.crc || activeContab?.cnpj ? ` (${activeContab?.crc || activeContab?.cnpj})` : ''}
              </span>
            </div>
          ) : (
            <select
              value={activeContab?.id || ''}
              onChange={(e) => setSelectedContabId(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 min-w-[240px]"
            >
              {contabilidades.length === 0 ? (
                <option value="">Nenhum escritório cadastrado</option>
              ) : (
                contabilidades.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razao_social} ({c.crc || c.cnpj})
                  </option>
                ))
              )}
            </select>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#f4f6f9] border border-slate-200 rounded-md overflow-x-auto">
          {[
            { id: 'carteira', label: `Carteira de Clientes (${carteiraDocs.length})` },
            { id: 'processos', label: `Processos (${processosCarteira.length})` },
            { id: 'documentos', label: `Documentos (${documentosVisiveis.length})` },
            ...(!isExternalContador ? [{ id: 'escritorio', label: '+ Novo Escritório' }] : []),
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as any)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === t.id
                  ? 'bg-white text-slate-900 border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'carteira' && (
        <div className="space-y-4">
          <form onSubmit={handleVincularEmpresa} className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-end gap-3 text-xs">
            <div className="flex-1">
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Vincular CNPJ/CPF à carteira *</label>
              <input
                type="text"
                value={novoClienteDoc}
                onChange={(e) => setNovoClienteDoc(e.target.value)}
                placeholder="00.000.000/0001-00 ou CPF"
                className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Razão Social (opcional se CNPJ novo)</label>
              <input
                type="text"
                value={novoClienteRazao}
                onChange={(e) => setNovoClienteRazao(e.target.value)}
                placeholder="Consulta automática Receita se vazio"
                className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium cursor-pointer whitespace-nowrap"
            >
              Vincular &amp; Resolver Pasta
            </button>
          </form>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f4f6f9] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-3.5">Pasta VISA</th>
                  <th className="py-2.5 px-3.5">CNPJ / CPF</th>
                  <th className="py-2.5 px-3.5">Empresa / Cliente</th>
                  <th className="py-2.5 px-3.5">Alvará</th>
                  <th className="py-2.5 px-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-xs">
                {carteiraDocs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Nenhuma empresa vinculada a este escritório ainda.
                    </td>
                  </tr>
                ) : (
                  carteiraDocs.map((doc) => {
                    const limpo = cleanDoc(doc);
                    const pasta = metrics.pastasLocais.find((p) => cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === limpo);
                    return (
                      <tr key={doc} className="hover:bg-[#f8fafc] transition-colors">
                        <td className={`${rowPad} font-mono font-semibold text-[#285277]`}>
                          {pasta ? getDisplayPastaNumero(pasta) : 'Pendente'}
                        </td>
                        <td className={`${rowPad} font-mono text-slate-600 tabular-nums`}>{doc}</td>
                        <td className={`${rowPad} font-medium text-slate-800`}>
                          {pasta?.razao_social || 'Empresa da Carteira'}
                        </td>
                        <td className={`${rowPad} text-slate-600`}>{pasta?.alvara_atualizado || '—'}</td>
                        <td className={`${rowPad} text-right space-x-2 whitespace-nowrap`}>
                          <button
                            type="button"
                            onClick={() => onOpenDossiePorDoc(doc, pasta?.razao_social)}
                            className="text-[#3b6d96] font-medium hover:underline cursor-pointer"
                          >
                            Dossiê 360°
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenWorkflowModal('nova_demanda', pasta || null)}
                            className="text-emerald-700 font-medium hover:underline cursor-pointer"
                          >
                            + Demanda
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDocCnpj(doc);
                              setSubTab('documentos');
                            }}
                            className="text-slate-600 font-medium hover:underline cursor-pointer"
                          >
                            Enviar Doc
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'processos' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f4f6f9] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3.5">Pasta</th>
                <th className="py-2.5 px-3.5">Protocolo</th>
                <th className="py-2.5 px-3.5">Empresa</th>
                <th className="py-2.5 px-3.5">Assunto</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5 text-right">Prazo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs">
              {processosCarteira.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhum processo vinculado à carteira contábil no momento.
                  </td>
                </tr>
              ) : (
                processosCarteira.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => onSelectProcesso(p)}
                    className="hover:bg-[#f8fafc] cursor-pointer"
                  >
                    <td className={`${rowPad} font-mono font-semibold text-[#285277]`}>
                      {p.numero_pasta || p.pasta || '—'}
                    </td>
                    <td className={`${rowPad} font-mono text-slate-700`}>{p.num_processo}</td>
                    <td className={`${rowPad} font-medium text-slate-800`}>{p.razao_social}</td>
                    <td className={`${rowPad} text-slate-600`}>{p.assunto}</td>
                    <td className={`${rowPad} font-medium text-slate-700`}>{p.status}</td>
                    <td className={`${rowPad} text-right font-mono text-slate-500 tabular-nums`}>
                      {formatShortBrDate(p.prazo_vistoria || p.validade)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'documentos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <form onSubmit={handleEnviarDocumento} className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
            <h3 className="text-xs font-semibold text-slate-800">Protocolar Documento Contábil / Sanitário</h3>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">CNPJ da Empresa *</label>
              {isExternalContador ? (
                <select
                  required
                  value={docCnpj}
                  onChange={(e) => setDocCnpj(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-mono bg-white"
                >
                  <option value="">Selecione uma empresa da sua carteira...</option>
                  {carteiraDocs.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  value={docCnpj}
                  onChange={(e) => setDocCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                />
              )}
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Tipo de Documento</label>
              <select
                value={docTipo}
                onChange={(e) => setDocTipo(e.target.value)}
                className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
              >
                <option value="PGRSS">PGRSS</option>
                <option value="Manual de Boas Práticas">Manual de Boas Práticas</option>
                <option value="Laudo de Dedetização">Laudo de Dedetização</option>
                <option value="Contrato Social / Alteração">Contrato Social / Alteração</option>
                <option value="Comprovante de Taxa / TMI">Comprovante de Taxa / TMI</option>
                <option value="ART / CRT Responsável Técnico">ART / CRT Responsável Técnico</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Nome / Referência do Arquivo *</label>
              <input
                type="text"
                required
                value={docArquivo}
                onChange={(e) => setDocArquivo(e.target.value)}
                placeholder="Ex: PGRSS_2026_assinado.pdf"
                className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Observações</label>
              <textarea
                rows={2}
                value={docObs}
                onChange={(e) => setDocObs(e.target.value)}
                className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium cursor-pointer"
            >
              Registrar Documento
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 text-xs font-semibold text-slate-700">
              Documentos Enviados ({documentosVisiveis.length})
            </div>
            <div className="divide-y divide-slate-200/80 text-xs">
              {documentosVisiveis.length === 0 ? (
                <p className="p-6 text-center text-slate-400">Nenhum documento enviado ainda.</p>
              ) : (
                documentosVisiveis.slice(0, 30).map((d) => (
                  <div key={d.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 truncate">{d.tipo_documento} · {d.nome_arquivo}</div>
                      <div className="text-[11px] font-mono text-slate-500">CNPJ {d.cnpj_empresa} · {formatShortBrDate(d.data_envio)}</div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 shrink-0">{d.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {subTab === 'escritorio' && (
        <form onSubmit={handleSalvarEscritorio} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 text-xs max-w-2xl">
          <h3 className="text-xs font-semibold text-slate-800">Cadastrar Novo Escritório de Contabilidade</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Razão Social *</label>
              <input type="text" required value={escRazao} onChange={(e) => setEscRazao(e.target.value)} className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">CNPJ *</label>
              <input type="text" required value={escCnpj} onChange={(e) => setEscCnpj(e.target.value)} className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-mono" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">CRC</label>
              <input type="text" value={escCrc} onChange={(e) => setEscCrc(e.target.value)} className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Contador Responsável</label>
              <input type="text" value={escResp} onChange={(e) => setEscResp(e.target.value)} className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">E-mail</label>
              <input type="email" value={escEmail} onChange={(e) => setEscEmail(e.target.value)} className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Telefone</label>
              <input type="text" value={escTel} onChange={(e) => setEscTel(e.target.value)} className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs" />
            </div>
          </div>
          <button type="submit" className="px-4 py-1.5 rounded bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium cursor-pointer">
            Salvar Escritório Contábil
          </button>
        </form>
      )}
    </div>
  );
};

// ============================================================================
// 3. LABORATÓRIO NA ESTÉTICA CAPA TESTE (SEM ALTERAR JANELAS ORIGINAIS DO LAB)
// ============================================================================
interface SinncLaboratorioAestheticViewProps {
  metrics: SinncDashboardMetrics;
  amostrasLaboratorio: AmostraLaboratorioItem[];
  pontosColeta: PontoColetaLaboratorio[];
  isExternal?: boolean;
  onOpenDossiePorDoc: (doc: string, razaoFallback?: string) => void;
  onOpenSolicitarLab: (pasta?: PastaVisaItem | null) => void;
  onOpenTermoColeta?: (amostra?: AmostraLaboratorioItem | null, solicitacao?: SolicitacaoLaudoPotabilidadeItem | null) => void;
  onOpenLaudoOficial?: (amostra?: AmostraLaboratorioItem | null, solicitacao?: SolicitacaoLaudoPotabilidadeItem | null) => void;
  onNavigateClassic: (view: string) => void;
  compactDensity: boolean;
}

export const SinncLaboratorioAestheticView: React.FC<SinncLaboratorioAestheticViewProps> = ({
  metrics,
  amostrasLaboratorio,
  pontosColeta,
  isExternal = false,
  onOpenDossiePorDoc,
  onOpenSolicitarLab,
  onOpenTermoColeta,
  onOpenLaudoOficial,
  onNavigateClassic,
  compactDensity,
}) => {
  const [subTab, setSubTab] = useState<'amostras' | 'solicitacoes' | 'pontos'>('amostras');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const rowPad = compactDensity ? 'py-2 px-3' : 'py-2.5 px-3.5';
  const q = query.trim().toLowerCase();

  const pastaByDoc = useMemo(() => {
    const map = new Map<string, PastaVisaItem>();
    metrics.pastasLocais.forEach((pt) => {
      const limpo = cleanDoc(pt.cpf_cnpj_limpo || pt.cnpj_cpf);
      if (limpo) map.set(limpo, pt);
    });
    return map;
  }, [metrics.pastasLocais]);

  const filtradasAmostras = useMemo(() => {
    return amostrasLaboratorio.filter((a) => {
      if (statusFilter === 'NAO_CONFORME') {
        if (a.status !== 'NÃO CONFORME' && a.status !== 'NAO_CONFORME' && a.status !== 'INTERDITADO') return false;
      } else if (statusFilter === 'CONFORME') {
        if (a.status !== 'CONFORME' && a.status !== 'LAUDO EMITIDO') return false;
      } else if (statusFilter === 'PENDENTES') {
        if (a.status === 'CONFORME' || a.status === 'LAUDO EMITIDO' || a.status === 'NÃO CONFORME') return false;
      }
      if (!q) return true;
      return (
        (a.codigo_amostra || '').toLowerCase().includes(q) ||
        (a.interessado || a.estabelecimento || '').toLowerCase().includes(q) ||
        (a.cnpj_cpf || '').toLowerCase().includes(q) ||
        (a.bairro || '').toLowerCase().includes(q) ||
        (a.local_coleta || '').toLowerCase().includes(q)
      );
    });
  }, [amostrasLaboratorio, statusFilter, q]);

  const filtradasSolicitacoes = useMemo(() => {
    return metrics.solicitacoesLabLocais.filter((s) => {
      if (!q) return true;
      return (
        (s.protocolo_1doc || '').toLowerCase().includes(q) ||
        (s.razao_social || '').toLowerCase().includes(q) ||
        (s.cnpj_cpf || '').toLowerCase().includes(q)
      );
    });
  }, [metrics.solicitacoesLabLocais, q]);

  return (
    <div className="space-y-5 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-[17px] font-semibold text-slate-800 tracking-tight">
            Laboratório Municipal de Água &amp; Potabilidade
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isExternal
              ? 'Solicitações e laudos de potabilidade vinculados exclusivamente à sua conta'
              : 'Painel integrado à Pasta VISA · Janelas, termos de coleta e laudos oficiais preservados sem alterações'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenSolicitarLab(null)}
            className="px-3 py-1.5 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Droplet className="w-3.5 h-3.5" />
            <span>Solicitar Coleta / Potabilidade</span>
          </button>
          {!isExternal && (
            <button
              type="button"
              onClick={() => onNavigateClassic('laboratorio')}
              className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>Abrir Laboratório original</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* KPIs Laboratório */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total de amostras', value: amostrasLaboratorio.length, sub: 'Registros físico-químicos e microbiológicos' },
          { label: 'Aguardando coleta / análise', value: metrics.amostrasAguardando, sub: 'Em andamento no laboratório' },
          { label: 'Resultados não conformes', value: metrics.amostrasInsatisfatorias, sub: isExternal ? 'Acompanhe análises fora do padrão' : 'Requerem ação fiscal na Pasta', danger: metrics.amostrasInsatisfatorias > 0 },
          { label: 'Solicitações de potabilidade', value: metrics.solicitacoesLabLocais.length, sub: isExternal ? 'Protocolos de coleta solicitados' : `${pontosColeta.length} ponto(s) monitorado(s)` },
        ].map((k) => (
          <div key={k.label} className="bg-[#f4f6f9] border border-slate-200/90 rounded-lg p-3.5">
            <div className="text-[11.5px] font-medium text-slate-600">{k.label}</div>
            <div className={`text-2xl font-semibold tabular-nums mt-1 ${k.danger ? 'text-[#a13c46]' : 'text-slate-800'}`}>
              {k.value}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Filtro e Sub-abas */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar por amostra, estabelecimento, CNPJ ou bairro..."
            className="!pl-8 !py-1.5 !px-3 !text-xs !font-normal !rounded-md !border-slate-300 !bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#f4f6f9] border border-slate-200 rounded-md">
            {[
              { id: 'amostras', label: `Amostras (${amostrasLaboratorio.length})` },
              { id: 'solicitacoes', label: `Solicitações (${metrics.solicitacoesLabLocais.length})` },
              ...(!isExternal ? [{ id: 'pontos', label: `Pontos de Coleta (${pontosColeta.length})` }] : []),
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id as any)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  subTab === t.id ? 'bg-white text-slate-900 border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {subTab === 'amostras' && (
        <div className="space-y-3">
          <div className="flex items-center gap-1 p-1 bg-[#f4f6f9] border border-slate-200 rounded-md w-fit">
            {[
              { id: 'TODOS', label: 'Todas' },
              { id: 'PENDENTES', label: 'Em andamento' },
              { id: 'CONFORME', label: 'Conformes' },
              { id: 'NAO_CONFORME', label: 'Não conformes' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded cursor-pointer whitespace-nowrap ${
                  statusFilter === f.id ? 'bg-white text-slate-900 border border-slate-200' : 'text-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f4f6f9] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                    <th className="py-2.5 px-3.5">Pasta</th>
                    <th className="py-2.5 px-3.5">Amostra</th>
                    <th className="py-2.5 px-3.5">Estabelecimento / Ponto</th>
                    <th className="py-2.5 px-3.5">Coleta</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5 text-right">Documentos Oficiais</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 text-xs">
                  {filtradasAmostras.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhuma amostra encontrada para este filtro.
                      </td>
                    </tr>
                  ) : (
                    filtradasAmostras.slice(0, 60).map((am) => {
                      const pt = am.cnpj_cpf ? pastaByDoc.get(cleanDoc(am.cnpj_cpf)) : undefined;
                      const isBad = am.status === 'NÃO CONFORME' || am.status === 'NAO_CONFORME' || am.status === 'INTERDITADO';
                      const isOk = am.status === 'CONFORME' || am.status === 'LAUDO EMITIDO';
                      return (
                        <tr key={am.id} className="hover:bg-[#f8fafc] transition-colors">
                          <td className={`${rowPad} font-mono whitespace-nowrap`}>
                            {pt ? (
                              <button
                                type="button"
                                onClick={() => onOpenDossiePorDoc(pt.cnpj_cpf, pt.razao_social)}
                                className="px-2 py-0.5 rounded bg-[#e6eef6] text-[#285277] font-semibold cursor-pointer"
                              >
                                {getDisplayPastaNumero(pt)}
                              </button>
                            ) : am.cnpj_cpf ? (
                              <button
                                type="button"
                                onClick={() => onOpenDossiePorDoc(am.cnpj_cpf!, am.interessado || am.estabelecimento)}
                                className="text-[#3b6d96] hover:underline cursor-pointer"
                              >
                                Vincular
                              </button>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className={`${rowPad} font-mono font-medium text-slate-800 whitespace-nowrap`}>
                            #{am.codigo_amostra}
                            {am.protocolo ? <div className="text-[10.5px] text-slate-500">Prot. {am.protocolo}</div> : null}
                          </td>
                          <td className={`${rowPad}`}>
                            <div className="font-medium text-slate-800">{am.interessado || am.estabelecimento || am.local_coleta}</div>
                            <div className="text-[11px] text-slate-500">{am.local_coleta} · {am.bairro}</div>
                          </td>
                          <td className={`${rowPad} text-slate-600 whitespace-nowrap tabular-nums`}>
                            <div>{am.data_coleta || '—'}</div>
                            <div className="text-[11px] text-slate-500">{am.fiscal_coletor || '—'}</div>
                          </td>
                          <td className={`${rowPad} font-semibold whitespace-nowrap ${isBad ? 'text-[#a13c46]' : isOk ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {am.status}
                          </td>
                          <td className={`${rowPad} text-right whitespace-nowrap space-x-1.5`}>
                            {onOpenTermoColeta && (
                              <button
                                type="button"
                                onClick={() => onOpenTermoColeta(am, null)}
                                className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-700 cursor-pointer"
                              >
                                Termo Coleta
                              </button>
                            )}
                            {onOpenLaudoOficial && (
                              <button
                                type="button"
                                onClick={() => onOpenLaudoOficial(am, null)}
                                className="px-2.5 py-1 rounded bg-[#3b6d96] hover:bg-[#315b7e] text-white text-[11px] font-medium cursor-pointer"
                              >
                                Laudo Oficial
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'solicitacoes' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f4f6f9] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3.5">Protocolo</th>
                <th className="py-2.5 px-3.5">Estabelecimento</th>
                <th className="py-2.5 px-3.5">Pontos / Taxa</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs">
              {filtradasSolicitacoes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Nenhuma solicitação de potabilidade registrada.
                  </td>
                </tr>
              ) : (
                filtradasSolicitacoes.map((sol) => (
                  <tr key={sol.id} className="hover:bg-[#f8fafc]">
                    <td className={`${rowPad} font-mono text-slate-700`}>{sol.protocolo_1doc || sol.id}</td>
                    <td className={`${rowPad}`}>
                      <div className="font-medium text-slate-800">{sol.razao_social}</div>
                      <div className="text-[11px] font-mono text-slate-500">{sol.cnpj_cpf}</div>
                    </td>
                    <td className={`${rowPad} tabular-nums text-slate-600`}>
                      {sol.quantidade_pontos} ponto(s) · {sol.taxa_ufm_total} UFM
                    </td>
                    <td className={`${rowPad} font-medium text-slate-700`}>{sol.status_solicitacao}</td>
                    <td className={`${rowPad} text-right space-x-2 whitespace-nowrap`}>
                      {onOpenTermoColeta && (
                        <button
                          type="button"
                          onClick={() => onOpenTermoColeta(null, sol)}
                          className="text-slate-600 hover:underline font-medium cursor-pointer"
                        >
                          Termo
                        </button>
                      )}
                      {onOpenLaudoOficial && (
                        <button
                          type="button"
                          onClick={() => onOpenLaudoOficial(null, sol)}
                          className="text-[#3b6d96] hover:underline font-medium cursor-pointer"
                        >
                          Laudo
                        </button>
                      )}
                      {sol.cnpj_cpf && (
                        <button
                          type="button"
                          onClick={() => onOpenDossiePorDoc(sol.cnpj_cpf, sol.razao_social)}
                          className="text-slate-700 hover:underline font-medium cursor-pointer"
                        >
                          Pasta
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'pontos' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f4f6f9] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3.5">Ponto</th>
                <th className="py-2.5 px-3.5">Local</th>
                <th className="py-2.5 px-3.5">Endereço</th>
                <th className="py-2.5 px-3.5">Bairro</th>
                <th className="py-2.5 px-3.5 text-right">Matriz</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs">
              {pontosColeta.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Nenhum ponto de coleta cadastrado.
                  </td>
                </tr>
              ) : (
                pontosColeta.map((pt) => (
                  <tr key={pt.id} className="hover:bg-[#f8fafc]">
                    <td className={`${rowPad} font-semibold text-slate-800`}>{pt.ponto}</td>
                    <td className={`${rowPad} text-slate-700`}>{pt.local}</td>
                    <td className={`${rowPad} text-slate-600`}>{pt.endereco}</td>
                    <td className={`${rowPad} text-slate-600`}>{pt.bairro}</td>
                    <td className={`${rowPad} text-right font-mono text-slate-500`}>{pt.tipo_matriz_padrao || 'Água Tratada'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 4. CCPU NA ESTÉTICA CAPA TESTE (SEM ALTERAR ARQUIVOS ORIGINAIS DA CCPU)
// ============================================================================
interface SinncCcpuAestheticViewProps {
  currentUser: UserProfile | null;
  onRefreshState: () => void;
  onNavigateClassic: (view: string) => void;
  compactDensity: boolean;
}

export const SinncCcpuAestheticView: React.FC<SinncCcpuAestheticViewProps> = ({
  currentUser,
  onRefreshState,
  onNavigateClassic,
  compactDensity,
}) => {
  const [ocorrencias, setOcorrencias] = useState<CcpuOcorrenciaItem[]>(() => getLocalCcpuOcorrencias());
  const [estoque, setEstoque] = useState<CcpuEstoqueItem[]>(() => getLocalCcpuEstoqueItens());
  const [subTab, setSubTab] = useState<'ocorrencias' | 'estoque'>('ocorrencias');
  const [query, setQuery] = useState('');
  const [pragaFilter, setPragaFilter] = useState('TODOS');
  const [modalNovaAberta, setModalNovaAberta] = useState(false);
  const [relatorioOcorrencia, setRelatorioOcorrencia] = useState<CcpuOcorrenciaItem | null>(null);

  useEffect(() => {
    void fetchCcpuOcorrencias().then((res) => setOcorrencias(res.ocorrencias));
    void fetchCcpuEstoque().then((res) => setEstoque(res.itens));
  }, []);

  const rowPad = compactDensity ? 'py-2 px-3' : 'py-2.5 px-3.5';
  const q = query.trim().toLowerCase();

  const handleSaveNova = (nova: CcpuOcorrenciaItem) => {
    setOcorrencias((prev) => [nova, ...prev]);
    setModalNovaAberta(false);
    setRelatorioOcorrencia(nova);
    void saveCcpuOcorrencia(nova);
    if (nova.insumosUtilizados && nova.insumosUtilizados.length > 0) {
      void baixarEstoquePorOcorrencia(nova, nova.servidorResponsavel).then(() => {
        setEstoque(getLocalCcpuEstoqueItens());
      });
    }
    onRefreshState();
  };

  const filtradas = useMemo(() => {
    return ocorrencias.filter((o) => {
      if (pragaFilter === 'NOTIFICADAS') {
        if (!o.notificacaoEmitida) return false;
      } else if (pragaFilter !== 'TODOS' && o.tipoPraga !== pragaFilter) {
        return false;
      }
      if (!q) return true;
      return (
        (o.protocolo || '').toLowerCase().includes(q) ||
        (o.bairro || '').toLowerCase().includes(q) ||
        (o.endereco || '').toLowerCase().includes(q) ||
        (o.subtipoEspecie || '').toLowerCase().includes(q) ||
        (o.servidorResponsavel || '').toLowerCase().includes(q)
      );
    });
  }, [ocorrencias, pragaFilter, q]);

  const totalEspecimes = useMemo(
    () => ocorrencias.reduce((acc, o) => acc + (Number(o.quantidade) || 0), 0),
    [ocorrencias]
  );
  const emAbertoCount = useMemo(
    () => ocorrencias.filter((o) => o.statusOcorrencia !== 'CONCLUIDO').length,
    [ocorrencias]
  );
  const estoqueCritico = useMemo(
    () => estoque.filter((i) => i.quantidade_atual <= i.estoque_minimo).length,
    [estoque]
  );

  return (
    <div className="space-y-5 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-[17px] font-semibold text-slate-800 tracking-tight">
            CCPU · Centro de Controle de Pragas Urbanas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoramento de ocorrências, bueiros, espécimes e insumos · Módulos originais preservados
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setModalNovaAberta(true)}
            className="px-3 py-1.5 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Ocorrência CCPU</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateClassic('ccpu')}
            className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>Abrir CCPU original</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPIs CCPU */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Ocorrências registradas', value: ocorrencias.length, sub: `${emAbertoCount} em monitoramento/aberto` },
          { label: 'Espécimes registrados', value: totalEspecimes, sub: 'Total acumulado nas coletas' },
          { label: 'Notificações emitidas', value: ocorrencias.filter((o) => o.notificacaoEmitida).length, sub: 'Com auto de notificação vinculado' },
          { label: 'Insumos abaixo do mínimo', value: estoqueCritico, sub: `${estoque.length} itens monitorados`, danger: estoqueCritico > 0 },
        ].map((k) => (
          <div key={k.label} className="bg-[#f4f6f9] border border-slate-200/90 rounded-lg p-3.5">
            <div className="text-[11.5px] font-medium text-slate-600">{k.label}</div>
            <div className={`text-2xl font-semibold tabular-nums mt-1 ${k.danger ? 'text-[#a13c46]' : 'text-slate-800'}`}>
              {k.value}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar por protocolo CCPU, bairro, endereço, espécie ou agente..."
            className="!pl-8 !py-1.5 !px-3 !text-xs !font-normal !rounded-md !border-slate-300 !bg-white"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#f4f6f9] border border-slate-200 rounded-md w-fit">
          {[
            { id: 'ocorrencias', label: `Ocorrências (${ocorrencias.length})` },
            { id: 'estoque', label: `Estoque de Insumos (${estoque.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as any)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded cursor-pointer whitespace-nowrap ${
                subTab === t.id ? 'bg-white text-slate-900 border border-slate-200' : 'text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'ocorrencias' && (
        <div className="space-y-3">
          <div className="flex items-center gap-1 p-1 bg-[#f4f6f9] border border-slate-200 rounded-md overflow-x-auto w-fit">
            {[
              { id: 'TODOS', label: 'Todos' },
              { id: 'ESCORPIAO', label: 'Escorpião' },
              { id: 'ROEDOR', label: 'Roedor' },
              { id: 'BARATA', label: 'Barata' },
              { id: 'MOSQUITO', label: 'Mosquito' },
              { id: 'NOTIFICADAS', label: 'Com Notificação' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPragaFilter(f.id)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded cursor-pointer whitespace-nowrap ${
                  pragaFilter === f.id ? 'bg-white text-slate-900 border border-slate-200' : 'text-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f4f6f9] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                    <th className="py-2.5 px-3.5">Protocolo</th>
                    <th className="py-2.5 px-3.5">Praga / Espécie</th>
                    <th className="py-2.5 px-3.5">Local / Bairro</th>
                    <th className="py-2.5 px-3.5">Qtd / Clima</th>
                    <th className="py-2.5 px-3.5">Agente</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5 text-right">Relatório</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 text-xs">
                  {filtradas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Nenhuma ocorrência encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filtradas.slice(0, 60).map((o) => (
                      <tr key={o.id} className="hover:bg-[#f8fafc] transition-colors">
                        <td className={`${rowPad} font-mono font-medium text-slate-800 whitespace-nowrap`}>
                          {o.protocolo}
                          {o.notificacaoEmitida && (
                            <div className="text-[10.5px] text-amber-700 font-sans">Notif. {o.numeroNotificacao || 'Emitida'}</div>
                          )}
                        </td>
                        <td className={`${rowPad}`}>
                          <div className="font-medium text-slate-800">{o.subtipoEspecie || o.tipoPraga}</div>
                          <div className="text-[11px] text-slate-500">{o.tipoPraga}</div>
                        </td>
                        <td className={`${rowPad}`}>
                          <div className="text-slate-800">{o.endereco}{o.numero ? `, ${o.numero}` : ''}</div>
                          <div className="text-[11px] text-slate-500">{o.bairro} · {o.identificacaoBueiroLocal || o.tipoLocal}</div>
                        </td>
                        <td className={`${rowPad} tabular-nums whitespace-nowrap text-slate-600`}>
                          <div>{o.quantidade} un · {o.temperatura}°C</div>
                          <div className="text-[11px] text-slate-500">{formatShortBrDate(o.dataHora)}</div>
                        </td>
                        <td className={`${rowPad} text-slate-600`}>{o.servidorResponsavel}</td>
                        <td className={`${rowPad} font-medium text-slate-700 whitespace-nowrap`}>{o.statusOcorrencia}</td>
                        <td className={`${rowPad} text-right whitespace-nowrap`}>
                          <button
                            type="button"
                            onClick={() => setRelatorioOcorrencia(o)}
                            className="px-2.5 py-1 rounded bg-[#3b6d96] hover:bg-[#315b7e] text-white text-[11px] font-medium cursor-pointer"
                          >
                            Relatório Oficial
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'estoque' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Saldo Atual de Iscas e Larvicidas</span>
            <button
              type="button"
              onClick={() => onNavigateClassic('ccpu')}
              className="text-[11px] font-medium text-[#3b6d96] hover:underline cursor-pointer"
            >
              Movimentar estoque no CCPU original
            </button>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f4f6f9] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3.5">Insumo</th>
                <th className="py-2.5 px-3.5">Categoria</th>
                <th className="py-2.5 px-3.5 text-right">Saldo Atual</th>
                <th className="py-2.5 px-3.5 text-right">Mínimo</th>
                <th className="py-2.5 px-3.5">Lote / Validade</th>
                <th className="py-2.5 px-3.5 text-right">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs">
              {estoque.map((item) => {
                const critico = item.quantidade_atual <= item.estoque_minimo;
                return (
                  <tr key={item.id} className="hover:bg-[#f8fafc]">
                    <td className={`${rowPad} font-medium text-slate-800`}>{item.nome}</td>
                    <td className={`${rowPad} text-slate-600`}>{item.categoria}</td>
                    <td className={`${rowPad} text-right font-mono tabular-nums font-semibold text-slate-800`}>
                      {item.quantidade_atual} {item.unidade === 'litro' ? 'L' : 'un'}
                    </td>
                    <td className={`${rowPad} text-right font-mono tabular-nums text-slate-500`}>
                      {item.estoque_minimo} {item.unidade === 'litro' ? 'L' : 'un'}
                    </td>
                    <td className={`${rowPad} font-mono text-slate-500`}>
                      {item.lote_atual || '—'} {item.validade_lote ? `· Val. ${formatShortBrDate(item.validade_lote)}` : ''}
                    </td>
                    <td className={`${rowPad} text-right font-semibold ${critico ? 'text-[#a13c46]' : 'text-emerald-700'}`}>
                      {critico ? 'Abaixo do mínimo' : 'Adequado'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modais Originais da CCPU (100% Intactos) */}
      {modalNovaAberta && (
        <CcpuNovaOcorrenciaModal
          currentUser={currentUser}
          onClose={() => setModalNovaAberta(false)}
          onSave={handleSaveNova}
        />
      )}

      <CcpuRelatorioOficialModal
        ocorrencia={relatorioOcorrencia}
        onClose={() => setRelatorioOcorrencia(null)}
      />
    </div>
  );
};

// ============================================================================
// 5. CONFIGURAÇÕES, CADASTRO DE USUÁRIOS, PERMISSÕES E SQL SUPABASE
// ============================================================================
interface SinncConfiguracoesUsuariosViewProps {
  currentUser: UserProfile | null;
  users: UserProfile[];
  onSaveUser?: (user: UserProfile) => Promise<boolean> | void;
  onDeleteUser?: (userId: string) => void;
  onOpenDossiePorDoc: (doc: string, razaoFallback?: string) => void;
  onNavigateClassic: (view: string) => void;
  compactDensity: boolean;
  setCompactDensity: (v: boolean) => void;
  sqlMigrationSnippet: string;
}

const ROLES_OPCOES: UserRole[] = [
  'FISCAL DE VIGILÂNCIA SANITÁRIA',
  'FISCAL DE SAÚDE PÚBLICA',
  'DIRETOR-GERAL',
  'DIRETOR DE ALIMENTOS',
  'DIRETOR DE SAÚDE',
  'DIRETOR DE HABITE-SE E ENGENHARIA',
  'DIRETOR DE SANEAMENTO E AMBIENTAL',
  'ASSISTENTE ADMINISTRATIVO',
  'FARMACÊUTICO/BIOQUÍMICO',
  'MÉDICO VETERINÁRIO',
  'NUTRICIONISTA',
  'AGENTE DE ENDEMIAS',
  'MASTER ADM',
];

const NIVEIS_OPCOES: UserNivelAcesso[] = [
  'MASTER (TUDO)',
  'DIRETOR GERAL (TODOS OS SETORES)',
  'DIRETOR (ALIMENTOS)',
  'DIRETOR (SAÚDE)',
  'DIRETOR (HABITE-SE)',
  'DIRETOR (SANEAMENTO & AMBIENTAL)',
  'VISA (FISCAL)',
  'VISA (ALIMENTOS)',
  'VISA (SAÚDE)',
  'VISA (LABORATÓRIO)',
  'VISA (FEIRAS)',
];

const SETORES_OPCOES: UserSetor[] = [
  'VIGILÂNCIA SANITÁRIA',
  'VIGILÂNCIA AMBIENTAL',
  'VIGILÂNCIA SANITÁRIA E AMBIENTAL',
];

export const SinncConfiguracoesUsuariosView: React.FC<SinncConfiguracoesUsuariosViewProps> = ({
  currentUser,
  users,
  onSaveUser,
  onDeleteUser,
  onOpenDossiePorDoc,
  onNavigateClassic,
  compactDensity,
  setCompactDensity,
  sqlMigrationSnippet,
}) => {
  const [subTab, setSubTab] = useState<'usuarios' | 'externos' | 'sistema'>('usuarios');
  const [userSearch, setUserSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Campos do formulário de Operador/Servidor
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [dataNasc, setDataNasc] = useState('1990-01-01');
  const [cargo, setCargo] = useState<UserRole>('FISCAL DE VIGILÂNCIA SANITÁRIA');
  const [setor, setSetor] = useState<UserSetor>('VIGILÂNCIA SANITÁRIA');
  const [nivelAcesso, setNivelAcesso] = useState<UserNivelAcesso>('VISA (FISCAL)');
  const [conselho, setConselho] = useState('');
  const [matricula, setMatricula] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [paginasPermitidas, setPaginasPermitidas] = useState<string[]>(PRESET_PAGINAS.FISCAL);

  // Bases externas (Contabilidades / Contribuintes / Cidadãos)
  const [contabilidades, setContabilidades] = useState<ContabilidadeProfile[]>(() =>
    safeReadLocalArray<ContabilidadeProfile>(LS_CONTABILIDADES)
  );
  const [contribuintes, setContribuintes] = useState<ContribuinteProfile[]>(() =>
    safeReadLocalArray<ContribuinteProfile>(LS_CONTRIBUINTES)
  );
  const [cidadaos, setCidadaos] = useState<CidadaoProfile[]>(() =>
    safeReadLocalArray<CidadaoProfile>(LS_CIDADAO)
  );

  useEffect(() => {
    if (subTab === 'externos') {
      void fetchContabilidadesFromSupabase().then((r) => r && setContabilidades(r));
      void fetchContribuintesFromSupabase().then((r) => r && setContribuintes(r));
      void fetchCidadaosFromSupabase().then((r) => r && setCidadaos(r));
    }
  }, [subTab]);

  const rowPad = compactDensity ? 'py-2 px-3' : 'py-2.5 px-3.5';

  const openCreateForm = () => {
    setEditingUser(null);
    setNome('');
    setEmail('');
    setSenha('123456');
    setDataNasc('1990-01-01');
    setCargo('FISCAL DE VIGILÂNCIA SANITÁRIA');
    setSetor('VIGILÂNCIA SANITÁRIA');
    setNivelAcesso('VISA (FISCAL)');
    setConselho('');
    setMatricula('');
    setTelefone('');
    setCpf('');
    setPaginasPermitidas([...PRESET_PAGINAS.FISCAL]);
    setShowForm(true);
  };

  const openEditForm = (u: UserProfile) => {
    setEditingUser(u);
    setNome(u.nome_completo || '');
    setEmail(u.email || '');
    setSenha(u.senha || '123456');
    setDataNasc(u.data_nascimento || '1990-01-01');
    setCargo(u.cargo || 'FISCAL DE VIGILÂNCIA SANITÁRIA');
    setSetor(u.setor || 'VIGILÂNCIA SANITÁRIA');
    setNivelAcesso(u.nivel_acesso || 'VISA (FISCAL)');
    setConselho(u.conselho_regional || '');
    setMatricula(u.matricula || '');
    setTelefone(u.telefone || '');
    setCpf(u.cpf || '');
    setPaginasPermitidas(
      Array.isArray(u.paginas_permitidas) && u.paginas_permitidas.length > 0
        ? [...u.paginas_permitidas]
        : [...PRESET_PAGINAS.FISCAL]
    );
    setShowForm(true);
  };

  const toggleModulo = (id: string) => {
    setPaginasPermitidas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSalvarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) {
      setFeedback('Informe nome completo e e-mail do usuário.');
      return;
    }
    setSavingUser(true);
    try {
      const payload: UserProfile = {
        ...(editingUser || {}),
        id: editingUser?.id || `usr-${Date.now()}`,
        nome_completo: nome.trim(),
        email: email.trim().toLowerCase(),
        senha: senha || editingUser?.senha || '123456',
        data_nascimento: dataNasc || '1990-01-01',
        cargo,
        setor,
        nivel_acesso: nivelAcesso,
        conselho_regional: conselho.trim(),
        matricula: matricula.trim(),
        telefone: telefone.trim(),
        cpf: cpf.trim(),
        tipo_usuario: editingUser?.tipo_usuario || 'SERVIDOR',
        paginas_permitidas: paginasPermitidas,
      };
      if (onSaveUser) {
        await onSaveUser(payload);
      }
      setShowForm(false);
      setEditingUser(null);
      setFeedback(
        editingUser
          ? `Usuário ${payload.nome_completo} atualizado com ${paginasPermitidas.length} módulo(s) liberado(s).`
          : `Usuário ${payload.nome_completo} cadastrado e sincronizado.`
      );
    } finally {
      setSavingUser(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.nome_completo || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.cargo || '').toLowerCase().includes(q) ||
        (u.matricula || '').toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  return (
    <div className="space-y-5 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-[17px] font-semibold text-slate-800 tracking-tight">
            Configurações, Cadastro de Usuários &amp; Acessos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestão de servidores, permissões por módulo, cadastros externos e preferências do sistema
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {subTab === 'usuarios' && !showForm && (
            <button
              type="button"
              onClick={openCreateForm}
              className="px-3 py-1.5 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Novo Usuário / Servidor</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigateClassic('master')}
            className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>Painel Master clássico</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {feedback && (
        <div className="px-3.5 py-2.5 rounded-md border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-800">
          {feedback}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 p-1 bg-[#f4f6f9] border border-slate-200 rounded-md w-fit overflow-x-auto">
        {[
          { id: 'usuarios', label: `Usuários & Permissões (${users.length})` },
          { id: 'externos', label: `Munícipes & Contadores (${contabilidades.length + contribuintes.length + cidadaos.length})` },
          { id: 'sistema', label: 'Preferências & Script SQL' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id as any)}
            className={`px-3 py-1 text-[11.5px] font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              subTab === t.id ? 'bg-white text-slate-900 border border-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ABA 1: USUÁRIOS E PERMISSÕES */}
      {subTab === 'usuarios' && (
        <div className="space-y-4">
          {showForm && (
            <form onSubmit={handleSalvarUsuario} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-800">
                  {editingUser ? `Editar Usuário: ${editingUser.nome_completo}` : 'Cadastrar Novo Usuário / Servidor'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
                  }}
                  className="text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Nome Completo *</label>
                  <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">E-mail Institucional *</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Senha</label>
                  <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Cargo / Função</label>
                  <select value={cargo} onChange={(e) => setCargo(e.target.value)} className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white">
                    {ROLES_OPCOES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Setor</label>
                  <select value={setor} onChange={(e) => setSetor(e.target.value as UserSetor)} className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white">
                    {SETORES_OPCOES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Nível de Acesso</label>
                  <select value={nivelAcesso} onChange={(e) => setNivelAcesso(e.target.value)} className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white">
                    {NIVEIS_OPCOES.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Matrícula</label>
                  <input type="text" value={matricula} onChange={(e) => setMatricula(e.target.value)} className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Conselho Regional (CRF, CRM, CRMV...)</label>
                  <input type="text" value={conselho} onChange={(e) => setConselho(e.target.value)} className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">CPF</label>
                  <input type="text" value={cpf} onChange={(e) => setCpf(e.target.value)} className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-mono" />
                </div>
              </div>

              {/* Perfis rápidos + Permissões de módulos */}
              <div className="pt-2 border-t border-slate-200 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-700">
                    Módulos e Permissões de Acesso ({paginasPermitidas.length} selecionados)
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { label: 'Fiscal', list: PRESET_PAGINAS.FISCAL },
                      { label: 'Diretor Geral', list: PRESET_PAGINAS.DIRETOR_GERAL },
                      { label: 'Administrativo', list: PRESET_PAGINAS.ADMINISTRATIVO },
                      { label: 'Laboratório', list: PRESET_PAGINAS.LABORATORIO },
                      { label: 'Feiras', list: PRESET_PAGINAS.FEIRAS },
                      { label: 'Todos', list: PRESET_PAGINAS.TODAS },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setPaginasPermitidas([...preset.list])}
                        className="px-2 py-0.5 rounded border border-slate-300 bg-[#f8fafc] hover:bg-slate-100 text-[10.5px] font-medium text-slate-700 cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 bg-[#f8fafc] border border-slate-200 rounded-md">
                  {MODULOS_SISTEMA.map((mod) => {
                    const checked = paginasPermitidas.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        className={`flex items-start gap-2 p-2 rounded border text-left cursor-pointer transition-colors ${
                          checked ? 'bg-white border-[#3b6d96]/50' : 'bg-transparent border-transparent hover:bg-white/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleModulo(mod.id)}
                          className="mt-0.5 rounded border-slate-300 text-[#3b6d96]"
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 truncate">{mod.nome}</div>
                          <div className="text-[10.5px] text-slate-500 truncate">{mod.categoria}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
                  }}
                  className="px-3.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-4 py-1.5 rounded bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium cursor-pointer"
                >
                  {savingUser ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          )}

          <div className="relative max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Buscar usuário por nome, e-mail, cargo ou matrícula..."
              className="!pl-8 !py-1.5 !px-3 !text-xs !font-normal !rounded-md !border-slate-300 !bg-white"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f4f6f9] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                    <th className="py-2.5 px-3.5">Nome / E-mail</th>
                    <th className="py-2.5 px-3.5">Cargo / Nível</th>
                    <th className="py-2.5 px-3.5">Matrícula</th>
                    <th className="py-2.5 px-3.5">Setor</th>
                    <th className="py-2.5 px-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 text-xs">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className={rowPad}>
                        <div className="font-medium text-slate-800">{u.nome_completo}</div>
                        <div className="text-[11px] font-mono text-slate-500">{u.email}</div>
                      </td>
                      <td className={rowPad}>
                        <div className="text-slate-700">{u.cargo}</div>
                        <div className="text-[11px] text-slate-500">{u.nivel_acesso || 'Padrão'}</div>
                      </td>
                      <td className={`${rowPad} font-mono text-slate-600 tabular-nums`}>{u.matricula || '—'}</td>
                      <td className={`${rowPad} text-slate-600`}>{u.setor || 'VIGILÂNCIA SANITÁRIA'}</td>
                      <td className={`${rowPad} text-right whitespace-nowrap space-x-2`}>
                        <button
                          type="button"
                          onClick={() => openEditForm(u)}
                          className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-700 cursor-pointer"
                        >
                          Editar
                        </button>
                        {onDeleteUser && u.id !== currentUser?.id && (
                          confirmDeleteId === u.id ? (
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteUser(u.id);
                                setConfirmDeleteId(null);
                                setFeedback(`Usuário ${u.nome_completo} removido.`);
                              }}
                              className="px-2.5 py-1 rounded bg-[#a13c46] text-white text-[11px] font-medium cursor-pointer"
                            >
                              Confirmar exclusão
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(u.id)}
                              className="px-2.5 py-1 rounded border border-slate-200 text-[#a13c46] hover:bg-rose-50 text-[11px] font-medium cursor-pointer"
                            >
                              Excluir
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: MUNÍCIPES, CONTRIBUINTES & CONTADORES CADASTRADOS */}
      {subTab === 'externos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 text-xs font-semibold text-slate-700">
              Escritórios Contábeis ({contabilidades.length})
            </div>
            <div className="divide-y divide-slate-200/80 max-h-96 overflow-y-auto text-xs">
              {contabilidades.length === 0 ? (
                <p className="p-5 text-center text-slate-400">Nenhum escritório registrado.</p>
              ) : (
                contabilidades.map((c) => (
                  <div key={c.id} className="p-3 space-y-0.5">
                    <div className="font-medium text-slate-800">{c.razao_social}</div>
                    <div className="text-[11px] font-mono text-slate-500">CNPJ {c.cnpj} · CRC {c.crc || '—'}</div>
                    <div className="text-[11px] text-slate-500">{c.responsavel} · {(c.cnpjs_vinculados || []).length} empresa(s)</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 text-xs font-semibold text-slate-700">
              Contribuintes / Empresas ({contribuintes.length})
            </div>
            <div className="divide-y divide-slate-200/80 max-h-96 overflow-y-auto text-xs">
              {contribuintes.length === 0 ? (
                <p className="p-5 text-center text-slate-400">Nenhum contribuinte registrado.</p>
              ) : (
                contribuintes.map((ct) => (
                  <div
                    key={ct.id}
                    onClick={() => ct.cnpj_cpf && onOpenDossiePorDoc(ct.cnpj_cpf, ct.razao_social)}
                    className="p-3 hover:bg-[#f8fafc] cursor-pointer space-y-0.5"
                  >
                    <div className="font-medium text-slate-800">{ct.razao_social}</div>
                    <div className="text-[11px] font-mono text-slate-500">{ct.cnpj_cpf} · {ct.categoria}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 text-xs font-semibold text-slate-700">
              Munícipes / Cidadãos ({cidadaos.length})
            </div>
            <div className="divide-y divide-slate-200/80 max-h-96 overflow-y-auto text-xs">
              {cidadaos.length === 0 ? (
                <p className="p-5 text-center text-slate-400">Nenhum munícipe registrado.</p>
              ) : (
                cidadaos.map((cid) => (
                  <div
                    key={cid.id}
                    onClick={() => cid.cpf && onOpenDossiePorDoc(cid.cpf, cid.nome_completo)}
                    className="p-3 hover:bg-[#f8fafc] cursor-pointer space-y-0.5"
                  >
                    <div className="font-medium text-slate-800">{cid.nome_completo}</div>
                    <div className="text-[11px] font-mono text-slate-500">{cid.cpf} · {cid.email}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: PREFERÊNCIAS & SCRIPT SQL */}
      {subTab === 'sistema' && (
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200 text-xs max-w-4xl">
          <div className="p-4 flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-slate-800">Densidade das tabelas</div>
              <div className="text-[11px] text-slate-500">Ajuste o espaçamento vertical das listas operacionais</div>
            </div>
            <div className="flex items-center gap-1 p-1 bg-[#f4f6f9] border border-slate-200 rounded-md">
              <button
                type="button"
                onClick={() => setCompactDensity(false)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer ${
                  !compactDensity ? 'bg-white text-slate-900 border border-slate-200' : 'text-slate-600'
                }`}
              >
                Confortável
              </button>
              <button
                type="button"
                onClick={() => setCompactDensity(true)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer ${
                  compactDensity ? 'bg-white text-slate-900 border border-slate-200' : 'text-slate-600'
                }`}
              >
                Compacto
              </button>
            </div>
          </div>

          <div className="p-4 flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-slate-800">Usuário autenticado</div>
              <div className="text-[11px] text-slate-500">
                {currentUser?.nome_completo || 'Visitante'} · {currentUser?.cargo || 'Perfil padrão'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateClassic('home')}
              className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
            >
              Retornar ao Portal Clássico
            </button>
          </div>

          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="font-medium text-slate-800 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#3b6d96]" />
                <span>Script SQL Completo para o Supabase (Opção A Híbrida)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(sqlMigrationSnippet);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 2500);
                }}
                className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedSql ? 'SQL Copiado' : 'Copiar SQL completo'}</span>
              </button>
            </div>
            <pre className="p-3 rounded bg-slate-900 text-slate-100 font-mono text-[11px] max-h-72 overflow-auto leading-relaxed">
              {sqlMigrationSnippet}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
