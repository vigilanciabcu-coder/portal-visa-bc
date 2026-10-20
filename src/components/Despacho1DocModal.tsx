import React, { useState } from 'react';
import {
  FileText,
  Send,
  X,
  CheckCircle2,
  Building2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Download,
  Share2,
  FileCheck2,
  Clock
} from 'lucide-react';
import { ProcessoItem, UserProfile, TramitacaoItem } from '../types';

interface Despacho1DocModalProps {
  isOpen: boolean;
  onClose: () => void;
  processo: ProcessoItem;
  currentUser: UserProfile | null;
  onConfirmDespacho: (tramitacao: TramitacaoItem, novoStatus?: string) => void;
}

export const SETORES_1DOC_BC = [
  'Secretaria da Fazenda / Tributos e Licenciamento',
  'Diretoria de Vigilância Sanitária (Gabinete DVIS)',
  'Secretaria de Planejamento e Gestão Urbana',
  'Secretaria Municipal de Saúde',
  'Procuradoria-Geral do Município (PGM)',
  'EMASA - Empresa Municipal de Água e Saneamento',
  'Contribuinte / Requerente (Notificação Externa)',
  'Arquivo Central Municipal'
];

export const MODELOS_DESPACHO_1DOC = [
  {
    titulo: 'Parecer Sanitário Favorável (Alvará Apto)',
    texto: 'Cumprimentando cordialmente, encaminho o presente processo instruído com Parecer Sanitário Favorável emitido pela Diretoria de Vigilância Sanitária após vistoria in loco. Estabelecimento em conformidade com as normas sanitárias vigentes, estando apto para emissão do respectivo Alvará de Licença Sanitária.'
  },
  {
    titulo: 'Notificação com Exigências Pendentes',
    texto: 'Encaminho o presente expediente para ciência do requerente acerca das exigências sanitárias pendentes apontadas no Termo de Notificação Sanitária anexo. Fica fixado prazo para saneamento das irregularidades com posterior re-inspeção.'
  },
  {
    titulo: 'Habite-se Sanitário Concluso',
    texto: 'Informo que a edificação foi devidamente vistoriada e aprovada pelo Setor de Habite-se da Vigilância Sanitária. Segue em anexo a Certidão de Habite-se Sanitário devidamente autenticada para prosseguimento junto à Secretaria de Planejamento Urbano.'
  },
  {
    titulo: 'Devolução / Saneamento de Documentação',
    texto: 'Devolvo os autos ao setor de origem solicitando a juntada de comprovante de responsabilidade técnica (ART/RRT/CRT) e layout hidrossanitário atualizado para continuidade da análise técnica.'
  }
];

export const Despacho1DocModal: React.FC<Despacho1DocModalProps> = ({
  isOpen,
  onClose,
  processo,
  currentUser,
  onConfirmDespacho
}) => {
  const [numero1Doc, setNumero1Doc] = useState(processo.prot_1doc || processo.num_processo || '2026/01234');
  const [setorDestino, setSetorDestino] = useState(SETORES_1DOC_BC[0]);
  const [tipoDocumentoAnexo, setTipoDocumentoAnexo] = useState('Parecer Técnico Sanitário Digital');
  const [textoDespacho, setTextoDespacho] = useState(MODELOS_DESPACHO_1DOC[0].texto);
  const [alterarStatus, setAlterarStatus] = useState<string>('TRAMITADO');
  
  // Estados de envio
  const [enviando, setEnviando] = useState(false);
  const [reciboDespacho, setReciboDespacho] = useState<{
    protocolo1Doc: string;
    dataHora: string;
    hashAutenticacao: string;
    destinatario: string;
  } | null>(null);
  const [copiado, setCopiado] = useState(false);

  if (!isOpen) return null;

  const handleAplicarModelo = (texto: string) => {
    setTextoDespacho(texto);
  };

  const handleEnviarDespacho = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);

    // Simula comunicação com a API REST / Webhook do 1Doc da Prefeitura de Balneário Camboriú
    await new Promise((res) => setTimeout(res, 1200));

    const agora = new Date();
    const dataHoraStr = agora.toISOString().replace('T', ' ').substring(0, 16);
    const hashUnico = `1DOC-BC-${agora.getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const novaTramitacao: TramitacaoItem = {
      id: `tram-1doc-${Date.now()}`,
      data_hora: dataHoraStr,
      tipo: 'DESPACHO_ADMINISTRATIVO',
      titulo: `Despacho Oficial 1Doc • Prot. ${numero1Doc}`,
      descricao: `Enviado para "${setorDestino}". Documento anexo: ${tipoDocumentoAnexo}. Despacho: "${textoDespacho}". Hash de validação: ${hashUnico}.`,
      responsavel_nome: currentUser?.nome_completo || 'Fiscal Sanitário DVIS',
      responsavel_cargo: currentUser?.cargo || 'FISCAL SANITÁRIO',
      responsavel_matricula: currentUser?.matricula || 'DVIS-BC',
      setor_origem: currentUser?.setor || 'DVIS',
      setor_destino: setorDestino,
      status_processo_momento: 'EM ANÁLISE',
      anexo_nome: tipoDocumentoAnexo,
      documento_relacionado: {
        tipo: 'DESPACHO_1DOC',
        auth_code: hashUnico
      }
    };

    onConfirmDespacho(novaTramitacao, 'TRAMITADO AO 1DOC');

    setReciboDespacho({
      protocolo1Doc: numero1Doc,
      dataHora: agora.toLocaleDateString('pt-BR') + ' às ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      hashAutenticacao: hashUnico,
      destinatario: setorDestino
    });

    setEnviando(false);
  };

  const handleCopiarHash = () => {
    if (!reciboDespacho) return;
    navigator.clipboard.writeText(reciboDespacho.hashAutenticacao);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#101726] border border-emerald-500/40 text-slate-100 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-4">
        
        {/* Cabeçalho */}
        <div className="p-5 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-teal-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Despacho Eletrônico Direto ao 1Doc
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono">
                  PREFEITURA BC
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Integração oficial de tramitação de pareceres e alvarás sanitários
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recibo de Sucesso */}
        {reciboDespacho ? (
          <div className="p-6 sm:p-8 space-y-6 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-xl font-black text-white uppercase tracking-wide">
                Documento Despachado com Sucesso ao 1Doc!
              </h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                O parecer técnico sanitário foi transmitido e vinculado ao protocolo oficial da Prefeitura Municipal de Balneário Camboriú.
              </p>
            </div>

            {/* Cartão de Comprovante */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-700 max-w-md mx-auto space-y-3 shadow-inner text-left text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Protocolo 1Doc:</span>
                <span className="font-mono font-bold text-emerald-300">{reciboDespacho.protocolo1Doc}</span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Destinatário:</span>
                <span className="font-semibold text-white">{reciboDespacho.destinatario}</span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Data/Hora:</span>
                <span className="text-slate-300 font-mono">{reciboDespacho.dataHora}</span>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Hash de Tramitação Digital:</span>
                <div className="p-2 bg-slate-950 rounded-lg font-mono text-[11px] text-cyan-300 flex items-center justify-between border border-slate-800">
                  <span className="truncate">{reciboDespacho.hashAutenticacao}</span>
                  <button
                    type="button"
                    onClick={handleCopiarHash}
                    className="ml-2 text-slate-400 hover:text-white cursor-pointer"
                    title="Copiar Hash"
                  >
                    {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer"
              >
                Concluir & Fechar
              </button>

              <button
                type="button"
                onClick={() => window.open(`https://bc.1doc.com.br/b.php?pg=o/login&n=3`, '_blank')}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir Portal 1Doc</span>
              </button>
            </div>
          </div>
        ) : (
          /* Formulário de Despacho */
          <form onSubmit={handleEnviarDespacho} className="p-5 sm:p-6 space-y-4 text-xs text-slate-200 max-h-[75vh] overflow-y-auto">
            
            {/* Informações do Processo */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Estabelecimento:</span>
                <span className="font-bold text-white truncate block">
                  {processo.nome_fantasia || processo.razao_social}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">CNPJ / CPF:</span>
                <span className="font-mono text-emerald-300 font-bold block">{processo.cnpj_cpf}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Processo Sanitário:</span>
                <span className="font-mono text-white block">{processo.num_processo || 'S/N'}</span>
              </div>
            </div>

            {/* Configuração do Protocolo e Setor no 1Doc */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-300 block mb-1">
                  Número do Protocolo no 1Doc *
                </label>
                <input
                  type="text"
                  required
                  value={numero1Doc}
                  onChange={(e) => setNumero1Doc(e.target.value)}
                  placeholder="Ex: 54.321/2026 ou 1234/2026"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-slate-300 block mb-1">
                  Setor de Destino no 1Doc *
                </label>
                <select
                  value={setorDestino}
                  onChange={(e) => setSetorDestino(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-emerald-500 focus:outline-none"
                >
                  {SETORES_1DOC_BC.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-black uppercase text-slate-300 block mb-1">
                  Documento Anexo a ser Transmitido *
                </label>
                <select
                  value={tipoDocumentoAnexo}
                  onChange={(e) => setTipoDocumentoAnexo(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Parecer Técnico Sanitário Digital">📄 Parecer Técnico Sanitário Digital (Com Hash & QR Code)</option>
                  <option value="Auto de Notificação Sanitária">⚠️ Auto de Notificação Sanitária com Prazos de Adequação</option>
                  <option value="Termo de Vistoria e Inspeção In Loco">🔍 Termo de Vistoria e Inspeção Sanitária In Loco</option>
                  <option value="Certidão de Habite-se Sanitário">🏗️ Certidão de Habite-se Sanitário Aprovado</option>
                  <option value="Auto de Infração e Penalidades">🚫 Auto de Infração e Aplicação de Penalidades</option>
                </select>
              </div>
            </div>

            {/* Modelos Rápidos de Despacho */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-black uppercase text-slate-300 block">
                  Modelos Rápidos de Texto para Despacho:
                </label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MODELOS_DESPACHO_1DOC.map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAplicarModelo(m.texto)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white border border-slate-700 text-[10px] font-bold uppercase transition cursor-pointer"
                  >
                    + {m.titulo}
                  </button>
                ))}
              </div>
            </div>

            {/* Texto do Despacho */}
            <div>
              <label className="text-[11px] font-black uppercase text-slate-300 block mb-1">
                Texto do Despacho Administrativo Oficial *
              </label>
              <textarea
                rows={4}
                required
                value={textoDespacho}
                onChange={(e) => setTextoDespacho(e.target.value)}
                placeholder="Insira o texto de despacho a ser transmitido ao 1Doc..."
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs leading-relaxed focus:border-emerald-500 focus:outline-none font-sans"
              />
            </div>

            {/* Botões de Ação */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={enviando}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {enviando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Transmitindo ao 1Doc...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Despachar e Tramitar no 1Doc</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
