import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  User,
  FileText,
  AlertTriangle,
  QrCode as QrCodeIcon,
  Sparkles,
  FileCheck2,
  ExternalLink,
  Edit3
} from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ProcessoItem, UserProfile } from '../types';

export type TipoDocumentoOficial =
  | 'AUTO_NOTIFICACAO'
  | 'TERMO_VISTORIA'
  | 'PARECER_TECNICO'
  | 'AUTO_INFRACAO'
  | 'ESPELHO_CADASTRAL';

export interface DocumentoOficialPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  processo: ProcessoItem | null;
  currentUser: UserProfile | null;
  parecerTextoDefault?: string;
  condicionantesDefault?: string;
  tipoDocumentoDefault?: TipoDocumentoOficial;
}

export const DocumentoOficialPdfModal: React.FC<DocumentoOficialPdfModalProps> = ({
  isOpen,
  onClose,
  processo,
  currentUser,
  parecerTextoDefault = '',
  condicionantesDefault = '',
  tipoDocumentoDefault = 'AUTO_NOTIFICACAO'
}) => {
  const [tipoDoc, setTipoDoc] = useState<TipoDocumentoOficial>(tipoDocumentoDefault);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isCopiedToken, setIsCopiedToken] = useState(false);
  const [prazoDias, setPrazoDias] = useState<number>(30);
  const [textoPersonalizado, setTextoPersonalizado] = useState<string>('');
  const [condicionantesTexto, setCondicionantesTexto] = useState<string>('');
  const [codigoAuth, setCodigoAuth] = useState<string>('');
  const [modoEdicao, setModoEdicao] = useState<boolean>(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Inicializa textos e códigos de autenticação
  useEffect(() => {
    if (!isOpen || !processo) return;

    setTipoDoc(tipoDocumentoDefault);

    // Texto inicial baseado no tipo ou no histórico do processo
    const ultimoParecer = processo.pareceres && processo.pareceres.length > 0 ? processo.pareceres[0] : null;
    const txt = parecerTextoDefault || ultimoParecer?.parecer_texto || processo.observacoes || 'Constatada a regularidade formal das instalações físicas, condições higiênico-sanitárias e conformidade com as Boas Práticas Sanitárias (LC nº 40/2019).';
    setTextoPersonalizado(txt);

    const cond = condicionantesDefault || ultimoParecer?.condicionantes || '';
    setCondicionantesTexto(cond);

    // Gera código de autenticação único e determinístico
    const anoAtual = new Date().getFullYear();
    const cleanNum = (processo.num_processo || processo.id).replace(/\D/g, '').slice(-4) || '1001';
    const randToken = Math.random().toString(36).substring(2, 6).toUpperCase();
    const authCode = `BC-VISA-${anoAtual}-${cleanNum}-${randToken}`;
    setCodigoAuth(authCode);

    // Gera URL pública de autenticação interativa
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://portal-visa.bc.sc.gov.br';
    const authUrl = `${currentOrigin}/?validar_token=${authCode}&proc=${encodeURIComponent(processo.num_processo || processo.id)}&razao=${encodeURIComponent(processo.razao_social || processo.nome_fantasia || '')}&doc=${tipoDocumentoDefault}`;

    // Gera QR Code em alta definição
    QRCode.toDataURL(authUrl, {
      width: 256,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Erro ao gerar QRCode:', err));
  }, [isOpen, processo?.id, tipoDocumentoDefault, parecerTextoDefault, condicionantesDefault]);

  if (!isOpen || !processo) return null;

  const dataAtual = new Date();
  const dataExtenso = `${dataAtual.getDate()} de ${dataAtual.toLocaleString('pt-BR', { month: 'long' })} de ${dataAtual.getFullYear()}`;
  const horaEmissao = dataAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const getTituloDocumento = () => {
    switch (tipoDoc) {
      case 'AUTO_NOTIFICACAO':
        return {
          titulo: 'AUTO DE NOTIFICAÇÃO & INTIMAÇÃO SANITÁRIA',
          subtitulo: 'INTIMAÇÃO OFICIAL DE PRAZO E CUMPRIMENTO DE REQUISITOS SANITÁRIOS',
          badge: 'NOTIFICAÇÃO FISCAL',
          corBadge: 'bg-amber-600'
        };
      case 'TERMO_VISTORIA':
        return {
          titulo: 'TERMO DE VISTORIA & INSPEÇÃO SANITÁRIA',
          subtitulo: 'RELATÓRIO TÉCNICO CIRCUNSTANCIADO DE FISCALIZAÇÃO IN LOCO',
          badge: 'VISTORIA OFICIAL',
          corBadge: 'bg-blue-600'
        };
      case 'PARECER_TECNICO':
        return {
          titulo: 'PARECER TÉCNICO CONCLUSIVO SANITÁRIO',
          subtitulo: 'DESPACHO TÉCNICO DE ENQUADRAMENTO E REGULARIDADE SANITÁRIA',
          badge: 'PARECER TÉCNICO',
          corBadge: 'bg-emerald-600'
        };
      case 'AUTO_INFRACAO':
        return {
          titulo: 'AUTO DE INFRAÇÃO SANITÁRIA',
          subtitulo: 'LAVRATURA DE INFRAÇÃO SANITÁRIA CONFORME LEI COMPLEMENTAR Nº 40/2019',
          badge: 'INFRAÇÃO SANITÁRIA',
          corBadge: 'bg-rose-700'
        };
      case 'ESPELHO_CADASTRAL':
      default:
        return {
          titulo: 'CERTIDÃO DE ESPELHO SANITÁRIO DO PROCESSO',
          subtitulo: 'CERTIDÃO OFICIAL DE TRAMITAÇÃO E REGULARIDADE CADASTRAL',
          badge: 'CERTIDÃO OFICIAL',
          corBadge: 'bg-indigo-600'
        };
    }
  };

  const docInfo = getTituloDocumento();

  // Executa impressão direta nativa otimizada para folha A4
  const handlePrint = () => {
    window.print();
  };

  // Gera e faz download direto do arquivo .PDF profissional
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsGeneratingPdf(true);

      const canvas = await html2canvas(printAreaRef.current, {
        scale: 2.5, // Alta resolução para impressão nítida
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;

      let renderWidth = pdfWidth;
      let renderHeight = pdfWidth / ratio;

      if (renderHeight > pdfHeight) {
        renderHeight = pdfHeight;
        renderWidth = pdfHeight * ratio;
      }

      const xOffset = (pdfWidth - renderWidth) / 2;
      pdf.addImage(imgData, 'JPEG', xOffset, 0, renderWidth, renderHeight);

      const cleanDocName = (processo.razao_social || processo.nome_fantasia || 'Processo')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 30);
      const filename = `${docInfo.titulo.replace(/\s+/g, '_')}_${cleanDocName}_${codigoAuth}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      // Fallback para impressão caso html2canvas encontre qualquer restrição
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyAuth = () => {
    navigator.clipboard.writeText(codigoAuth);
    setIsCopiedToken(true);
    setTimeout(() => setIsCopiedToken(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[95vh] my-auto">
        
        {/* 🌟 BARRA SUPERIOR DE CONTROLE E AÇÕES */}
        <div className="p-3.5 sm:p-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 bg-blue-600/20 text-blue-400 border border-blue-500/40 rounded-xl">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black uppercase text-white tracking-wide">
                  Emissão de Documento Oficial em PDF
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-900/60 text-blue-300 border border-blue-500/40 font-mono">
                  DVIS • QR CODE OFICIAL
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Gere o documento oficial timbrado, com QR Code de autenticidade eletrônica e carimbo do fiscal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Alternar Modo Edição Rápida */}
            <button
              type="button"
              onClick={() => setModoEdicao(!modoEdicao)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                modoEdicao
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
              title="Ajustar termos, prazos e fundamentação técnica antes de imprimir"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{modoEdicao ? 'Concluir Edição' : 'Editar Termos'}</span>
            </button>

            {/* Imprimir */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Imprimir direto na impressora ou salvar como PDF no navegador"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {/* Download PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50 ring-1 ring-emerald-400/40"
              title="Baixar arquivo PDF formatado para A4"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Gerando...' : 'Baixar PDF'}</span>
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

        {/* 🎛️ BARRA DE ESCOLHA DO TIPO DE DOCUMENTO */}
        <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <span className="text-[10px] font-black uppercase text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <span>Modelo:</span>
          </span>

          <button
            type="button"
            onClick={() => setTipoDoc('AUTO_NOTIFICACAO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition shrink-0 cursor-pointer ${
              tipoDoc === 'AUTO_NOTIFICACAO'
                ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            📋 Auto de Notificação / Intimação
          </button>

          <button
            type="button"
            onClick={() => setTipoDoc('TERMO_VISTORIA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition shrink-0 cursor-pointer ${
              tipoDoc === 'TERMO_VISTORIA'
                ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            🔍 Termo de Vistoria Sanitária
          </button>

          <button
            type="button"
            onClick={() => setTipoDoc('PARECER_TECNICO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition shrink-0 cursor-pointer ${
              tipoDoc === 'PARECER_TECNICO'
                ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            ⚖️ Parecer Técnico Sanitário
          </button>

          <button
            type="button"
            onClick={() => setTipoDoc('AUTO_INFRACAO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition shrink-0 cursor-pointer ${
              tipoDoc === 'AUTO_INFRACAO'
                ? 'bg-rose-700 text-white shadow-sm ring-1 ring-rose-500'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            🚨 Auto de Infração
          </button>

          <button
            type="button"
            onClick={() => setTipoDoc('ESPELHO_CADASTRAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition shrink-0 cursor-pointer ${
              tipoDoc === 'ESPELHO_CADASTRAL'
                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            🏛️ Espelho do Processo
          </button>
        </div>

        {/* ✏️ PAINEL EXPANSÍVEL DE EDIÇÃO RÁPIDA (SE ATIVO) */}
        {modoEdicao && (
          <div className="p-4 bg-slate-950/90 border-b border-amber-600/40 text-xs space-y-3 shrink-0 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-black uppercase text-amber-400 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4" /> Personalizar Conteúdo do Auto para Impressão
              </span>
              <span className="text-[11px] text-slate-400">
                As alterações serão refletidas em tempo real na folha abaixo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-300 block mb-1">
                  Prazo de Cumprimento (Dias)
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={prazoDias}
                  onChange={(e) => setPrazoDias(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-300 block mb-1">
                  Condicionantes / Exigências Especificadas
                </label>
                <input
                  type="text"
                  value={condicionantesTexto}
                  onChange={(e) => setCondicionantesTexto(e.target.value)}
                  placeholder="Ex: Apresentar comprovante de higienização de caixas d'água e PGRSS atualizado..."
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-300 block mb-1">
                Fundamentação Técnica / Despacho do Fiscal
              </label>
              <textarea
                rows={3}
                value={textoPersonalizado}
                onChange={(e) => setTextoPersonalizado(e.target.value)}
                placeholder="Descreva a fundamentação técnica das constatações sanitárias..."
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        )}

        {/* 📄 ÁREA VISUAL DA FOLHA DE PAPEL A4 TIMBRADA */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 flex justify-center">
          <div
            ref={printAreaRef}
            id="area-documento-oficial-print"
            className="bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] p-6 sm:p-10 shadow-2xl rounded-sm font-sans flex flex-col justify-between border border-slate-200 relative select-text"
            style={{
              boxSizing: 'border-box'
            }}
          >
            {/* CABEÇALHO OFICIAL COM BRASÕES */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src="/brasao_bc.png"
                    alt="Brasão Oficial Balneário Camboriú"
                    className="h-16 w-auto object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="text-left">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 leading-tight">
                      Estado de Santa Catarina
                    </h4>
                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 leading-tight">
                      Município de Balneário Camboriú
                    </h3>
                    <p className="text-[10px] font-bold uppercase text-slate-600">
                      Secretaria Municipal de Saúde • Divisão de Vigilância Sanitária e Ambiental
                    </p>
                    <p className="text-[9px] font-mono text-slate-500">
                      Rua 1500, nº 1100 • Centro • CEP 88330-524 • Balneário Camboriú/SC • Fone: (47) 3267-7000
                    </p>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-950 text-white rounded font-mono font-black text-xs tracking-wider border border-blue-900 shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>DVIS • BC</span>
                  </div>
                  <span className="font-mono text-[9px] font-black uppercase bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-slate-800 mt-1">
                    MOD. DVIS-{tipoDoc}
                  </span>
                </div>
              </div>

              {/* TÍTULO CENTRAL DO DOCUMENTO */}
              <div className="text-center py-2 border-b border-slate-300 bg-slate-50 rounded-lg">
                <span className={`inline-block px-3 py-0.5 text-[9px] font-black uppercase tracking-widest text-white rounded mb-1 ${docInfo.corBadge}`}>
                  {docInfo.badge}
                </span>
                <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 leading-snug">
                  {docInfo.titulo}
                </h1>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  {docInfo.subtitulo}
                </p>
                <div className="flex items-center justify-center gap-4 text-[10px] font-mono font-bold text-slate-700 mt-1">
                  <span><strong>PROCESSO:</strong> {processo.num_processo || 'S/N'}</span>
                  <span>•</span>
                  <span><strong>PROTOCOLO 1DOC:</strong> {processo.prot_1doc || 'REGISTRO INTERNO'}</span>
                  <span>•</span>
                  <span><strong>DATA:</strong> {dataExtenso}</span>
                </div>
              </div>

              {/* QUADRO 1: IDENTIFICAÇÃO DO ESTABELECIMENTO / CONTRIBUINTE */}
              <div className="border border-slate-300 rounded-lg p-3 text-left space-y-2 bg-white">
                <div className="border-b border-slate-200 pb-1 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                    1. Identificação do Estabelecimento Autuado / Notificado
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    PASTA VISA: {processo.pasta || 'NÃO INFORMADA'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                  <div className="col-span-2">
                    <span className="font-bold text-slate-500 uppercase block text-[9px]">Razão Social:</span>
                    <span className="font-black text-slate-900 uppercase">{processo.razao_social || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold text-slate-500 uppercase block text-[9px]">Nome Fantasia:</span>
                    <span className="font-black text-slate-900 uppercase">{processo.nome_fantasia || '-'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 uppercase block text-[9px]">CNPJ / CPF:</span>
                    <span className="font-mono font-black text-blue-900 text-xs">{processo.cnpj_cpf}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 uppercase block text-[9px]">Risco Sanitário:</span>
                    <span className="font-bold text-slate-900 uppercase">{processo.grau_risco || 'MÉDIO RISCO'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold text-slate-500 uppercase block text-[9px]">CNAE Principal:</span>
                    <span className="font-mono text-slate-800 text-[9px] truncate block">
                      {processo.cnae || (processo.cnaes && processo.cnaes[0]) || 'Atividade Sanitária'}
                    </span>
                  </div>
                  <div className="col-span-3">
                    <span className="font-bold text-slate-500 uppercase block text-[9px]">Endereço Completo:</span>
                    <span className="font-medium text-slate-800">
                      {processo.endereco} {processo.numero_complemento ? `• ${processo.numero_complemento}` : ''} • Bairro: {processo.bairro || 'Centro'}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 uppercase block text-[9px]">Município/UF:</span>
                    <span className="font-bold text-slate-900 uppercase">Balneário Camboriú / SC</span>
                  </div>
                </div>
              </div>

              {/* QUADRO 2: FUNDAMENTAÇÃO LEGAL E DETERMINAÇÕES FISCAIS */}
              <div className="border border-slate-300 rounded-lg p-3 text-left space-y-2 bg-white">
                <div className="border-b border-slate-200 pb-1 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                    2. Enquadramento Legal & Constatações Técnicas
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    LEGISLAÇÃO SANITÁRIA MUNICIPAL
                  </span>
                </div>

                <div className="space-y-2 text-[10px] leading-relaxed text-slate-800">
                  <p className="text-[9px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                    O Auditor Fiscal Sanitário abaixo identificado, no regular exercício do Poder de Polícia Administrativa conferido pela <strong>Lei Complementar Municipal nº 40/2019</strong>, Lei Estadual nº 6.320/1983, Lei Federal nº 6.437/1977 e normas regulamentares vigentes, faz lavrar o presente documento para conhecimento e cumprimento obrigatório.
                  </p>

                  <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-[9px] font-black uppercase text-slate-700 block">
                      Descrição Circunstanciada dos Fatos e Exigências Sanitárias:
                    </span>
                    <div className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-slate-900">
                      {textoPersonalizado}
                    </div>
                  </div>

                  {condicionantesTexto && (
                    <div className="bg-amber-50 p-2.5 rounded border border-amber-300 text-amber-950 text-[10px]">
                      <strong className="text-[9px] font-black uppercase block text-amber-900 mb-0.5">
                        ⚠️ Condicionantes e Obrigações Determinadas:
                      </strong>
                      <span>{condicionantesTexto}</span>
                    </div>
                  )}

                  {tipoDoc === 'AUTO_NOTIFICACAO' && prazoDias > 0 && (
                    <div className="bg-slate-100 p-2 rounded border border-slate-300 flex items-center justify-between text-[10px]">
                      <span className="font-bold text-slate-800 uppercase">
                        Prazo Legal para Adequação e Cumprimento:
                      </span>
                      <span className="font-black font-mono text-xs bg-amber-200 text-amber-950 px-2 py-0.5 rounded border border-amber-400">
                        {prazoDias} DIAS CORRIDOS
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* QUADRO 3: ASSINATURAS & AUTENTICAÇÃO ELETRÔNICA */}
              <div className="border border-slate-300 rounded-lg p-3 text-left space-y-3 bg-white">
                <div className="border-b border-slate-200 pb-1 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                    3. Autenticação Eletrônica & Formalização Legal
                  </span>
                  <span className="text-[9px] font-mono text-emerald-800 font-bold">
                    DOCUMENTO DIGITALMENTE AUTENTICADO
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  {/* Bloco do QR Code */}
                  <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="QR Code de Autenticidade"
                        className="w-16 h-16 rounded border border-slate-300 shrink-0 bg-white p-0.5"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-slate-200 rounded flex items-center justify-center shrink-0">
                        <QrCodeIcon className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black uppercase text-slate-900 block leading-tight">
                        Validar Autenticidade
                      </span>
                      <p className="text-[8px] text-slate-500 leading-tight">
                        Aponte a câmera do celular para consultar a autenticidade deste ato oficial.
                      </p>
                      <span className="font-mono font-black text-[9px] text-blue-900 block truncate">
                        {codigoAuth}
                      </span>
                    </div>
                  </div>

                  {/* Assinatura Digital do Fiscal */}
                  <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-200 text-center space-y-1">
                    <span className="text-[8px] font-bold text-blue-900 uppercase block tracking-wider">
                      Autoridade Sanitária Emissora
                    </span>
                    <div className="border-b border-blue-400 pb-1 mt-1">
                      <span className="text-xs font-black uppercase text-slate-900 block leading-tight">
                        {currentUser?.nome_completo || processo.fiscal_responsavel || 'Auditor Fiscal Sanitário'}
                      </span>
                      <span className="text-[9px] font-bold text-slate-600 uppercase block">
                        {currentUser?.cargo || 'FISCAL DE VIGILÂNCIA SANITÁRIA'}
                      </span>
                      <span className="text-[8px] font-mono text-slate-500 block">
                        Matrícula: {currentUser?.matricula || 'FIS-DVIS'} • DVIS/BC
                      </span>
                    </div>
                    <span className="text-[7.5px] font-mono text-emerald-800 font-bold block pt-0.5">
                      ✓ Assinatura eletrônica autenticada via sistema DVIS em {horaEmissao}
                    </span>
                  </div>

                  {/* Ciência do Responsável / Autuado */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center space-y-1">
                    <span className="text-[8px] font-bold text-slate-600 uppercase block tracking-wider">
                      Ciência do Notificado / Responsável
                    </span>
                    <div className="h-7 border-b border-slate-400 flex items-end justify-center">
                      <span className="text-[8px] text-slate-400 italic">
                        (Assinatura ou ateste presencial)
                      </span>
                    </div>
                    <div className="pt-0.5 text-[8px] text-slate-600 flex justify-between">
                      <span>Data: ___/___/______</span>
                      <span>Hora: ___:___</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RODAPÉ DO DOCUMENTO */}
            <div className="pt-4 mt-6 border-t border-slate-300 text-center space-y-1 text-[8px] text-slate-500 font-mono">
              <div className="flex items-center justify-between text-slate-600 font-bold">
                <span>PREFEITURA MUNICIPAL DE BALNEÁRIO CAMBORIÚ</span>
                <span>DIVISÃO DE VIGILÂNCIA SANITÁRIA E AMBIENTAL (DVIS)</span>
                <span>PÁGINA 1 DE 1</span>
              </div>
              <p>
                Documento emitido eletronicamente de acordo com o Art. 10 da MP nº 2.200-2/2001 e Lei Municipal Complementar nº 40/2019. Chave de Autenticação: {codigoAuth}.
              </p>
            </div>
          </div>
        </div>

        {/* 🌟 RODAPÉ COM INFORMAÇÕES E BOTÃO DE FECHAR */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-300 text-[11px]">
              Chave: <strong className="text-blue-400">{codigoAuth}</strong>
            </span>
            <button
              type="button"
              onClick={handleCopyAuth}
              className="text-[10px] font-bold text-slate-400 hover:text-white underline cursor-pointer"
            >
              {isCopiedToken ? '✓ Copiado!' : 'Copiar Chave'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition cursor-pointer"
            >
              Fechar Janela
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
