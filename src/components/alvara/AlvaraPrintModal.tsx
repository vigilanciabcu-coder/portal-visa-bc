import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  FileText,
  ExternalLink,
  Download,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Upload,
  RefreshCw,
  FileCheck2,
  Layers
} from 'lucide-react';
import { AlvaraSanitarioItem } from '../../types';
import {
  getGoogleDocsEditUrl,
  getGoogleDocsPdfUrl,
  formatAlvaraDataForDocs,
  MODELOS_DISPONIVEIS
} from './alvaraUtils';
import { generateAlvaraFilledHtml } from './alvaraTemplateEngine';
import {
  generateCompleteAlvaraPdf,
  uploadOfficialPdfTemplate,
  PDF_MODELO_SUPABASE_FILENAME,
  PDF_MODELO_SUPABASE_BUCKET,
  PDF_MODELO_SUPABASE_PUBLIC_URL
} from './pdfOverlayEngine';

export interface AlvaraPrintModalProps {
  selectedAlvaraForPrint: AlvaraSanitarioItem;
  onClose: () => void;
  printViewMode?: 'pdf_oficial' | 'docs_embed' | 'timbrado';
  setPrintViewMode?: (mode: 'pdf_oficial' | 'docs_embed' | 'timbrado') => void;
  googleDocsTemplateUrl: string;
  isMaster?: boolean;
  onUpdateAlvaraDocUrl?: (alvaraId: string, newUrl: string) => void;
  onApplyUrlToAllAlvaras?: (url: string) => void;
}

export function AlvaraPrintModal({
  selectedAlvaraForPrint,
  onClose,
  printViewMode = 'pdf_oficial',
  setPrintViewMode,
  googleDocsTemplateUrl,
  isMaster = false,
  onUpdateAlvaraDocUrl,
  onApplyUrlToAllAlvaras,
}: AlvaraPrintModalProps) {
  const [viewFormat, setViewFormat] = useState<'pdf_oficial' | 'docs_embed' | 'timbrado'>(
    printViewMode || 'pdf_oficial'
  );
  // Permite selecionar e alternar entre os dois modelos de PDF solicitados (Padrão: Vetorial Oficial com dados 100% dinâmicos e sem sobreposição)
  const [selectedPdfModel, setSelectedPdfModel] = useState<'supabase' | 'vector'>('vector');
  // Modo de exibição: 'direct' não sofre bloqueio de plugins do Chrome; 'embed' exibe o leitor PDF do navegador
  const [pdfDisplayMode, setPdfDisplayMode] = useState<'direct' | 'embed'>('direct');
  const [copiedToken, setCopiedToken] = useState(false);
  const [appliedAllFeedback, setAppliedAllFeedback] = useState(false);

  // Estados do Modelo em PDF
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfSource, setPdfSource] = useState<'supabase' | 'url' | 'custom' | 'cache' | 'vector'>('supabase');
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  // Estados do Modelo Google Docs (HTML)
  const [filledHtml, setFilledHtml] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pdfIframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincroniza viewFormat com printViewMode caso seja alterado externamente
  useEffect(() => {
    if (printViewMode) {
      setViewFormat(printViewMode);
    }
  }, [printViewMode]);

  const handleFormatChange = (mode: 'pdf_oficial' | 'docs_embed' | 'timbrado') => {
    setViewFormat(mode);
    if (setPrintViewMode) {
      setPrintViewMode(mode);
    }
  };

  const handleSelectModel = (model: 'supabase' | 'vector') => {
    setSelectedPdfModel(model);
    setViewFormat('pdf_oficial');
    if (setPrintViewMode) {
      setPrintViewMode('pdf_oficial');
    }
    loadPdf(null, model);
  };

  // Determinar a URL do Google Docs
  const activeDocsUrl =
    selectedAlvaraForPrint.modelo_doc_url?.trim() ||
    googleDocsTemplateUrl ||
    MODELOS_DISPONIVEIS[0].docsUrl;

  // Função para gerar o PDF Oficial (Supabase / Overlay / Vetorial)
  const loadPdf = async (
    customBytes?: Uint8Array | null,
    modelChoice: 'supabase' | 'vector' = selectedPdfModel
  ) => {
    setPdfLoading(true);
    try {
      const { pdfBytes, source } = await generateCompleteAlvaraPdf(
        selectedAlvaraForPrint,
        customBytes,
        modelChoice
      );
      setPdfSource(source);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (err) {
      console.error('[AlvaraPrintModal] Erro ao gerar PDF oficial:', err);
    } finally {
      setPdfLoading(false);
    }
  };

  // Carrega o PDF inicial ao abrir o modal
  useEffect(() => {
    loadPdf();
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [selectedAlvaraForPrint]);

  // Gera a visualização do Google Docs (HTML) preenchida
  useEffect(() => {
    const initialFilled = generateAlvaraFilledHtml(selectedAlvaraForPrint);
    setFilledHtml(initialFilled);

    if (activeDocsUrl && activeDocsUrl.includes('docs.google.com')) {
      fetch(`/api/alvara/doc-template?url=${encodeURIComponent(activeDocsUrl)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.success && data.html) {
            const updated = generateAlvaraFilledHtml(selectedAlvaraForPrint, data.html);
            setFilledHtml(updated);
          }
        })
        .catch((err) => {
          console.warn('[AlvaraPrintModal] Usando template HTML embutido:', err);
        });
    }
  }, [selectedAlvaraForPrint, activeDocsUrl]);

  // Upload e ativação de nova matriz PDF para o Supabase Storage
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadFeedback('Erro: Selecione um arquivo com extensão .PDF');
      setTimeout(() => setUploadFeedback(null), 4000);
      return;
    }

    setUploadingPdf(true);
    try {
      const res = await uploadOfficialPdfTemplate(file);
      setUploadFeedback(res.message);
      if (res.bytes) {
        await loadPdf(res.bytes);
      } else {
        await loadPdf();
      }
    } catch (err: any) {
      setUploadFeedback('Erro no upload: ' + (err.message || 'Falha ao processar arquivo'));
    } finally {
      setUploadingPdf(false);
      setTimeout(() => setUploadFeedback(null), 5000);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCopyFields = () => {
    const text = formatAlvaraDataForDocs(selectedAlvaraForPrint);
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleApplyToAllClick = () => {
    if (onApplyUrlToAllAlvaras) {
      onApplyUrlToAllAlvaras(activeDocsUrl);
      setAppliedAllFeedback(true);
      setTimeout(() => setAppliedAllFeedback(false), 2500);
    }
  };

  // Download do arquivo PDF Oficial
  const handleDownloadPdf = () => {
    if (!pdfBlobUrl) return;
    const a = document.createElement('a');
    a.href = pdfBlobUrl;
    const cleanNum = (selectedAlvaraForPrint.numero_alvara || selectedAlvaraForPrint.pasta || 'ALV').replace(
      /[^a-zA-Z0-9_-]/g,
      '_'
    );
    const cleanRazao = (selectedAlvaraForPrint.razao_social || 'Contribuinte')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 30);
    a.download = `Alvara_${cleanNum}_${cleanRazao}.pdf`;
    a.click();
  };

  // Download do arquivo HTML preenchido
  const handleDownloadHtml = () => {
    if (!filledHtml) return;
    const blob = new Blob([filledHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanRazao = (selectedAlvaraForPrint.razao_social || 'Contribuinte')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 30);
    a.download = `Alvara_${selectedAlvaraForPrint.numero_alvara || selectedAlvaraForPrint.pasta || 'Sanitario'}_${cleanRazao}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Imprimir ou Salvar como PDF
  const handlePrint = () => {
    if (viewFormat === 'pdf_oficial') {
      if (pdfBlobUrl) {
        // Tenta imprimir o PDF gerado diretamente através de iframe temporário
        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        printFrame.src = pdfBlobUrl;
        document.body.appendChild(printFrame);
        printFrame.onload = () => {
          setTimeout(() => {
            try {
              printFrame.contentWindow?.focus();
              printFrame.contentWindow?.print();
            } catch {
              window.open(pdfBlobUrl, '_blank');
            }
          }, 300);
        };
      }
    } else {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } else {
        window.print();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-3 print:p-0 print:bg-white print:static">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[1600px] h-[96vh] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden print:border-none print:shadow-none print:w-full print:h-auto print:max-w-none">
        
        {/* BARRA SUPERIOR: IDENTIFICAÇÃO + SELETOR DE FORMATOS + AÇÕES */}
        <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          
          {/* 1. Identificação do Alvará */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-900 dark:text-white truncate">
                  Alvará Nº {selectedAlvaraForPrint.numero_alvara || selectedAlvaraForPrint.pasta}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                  Validade: {selectedAlvaraForPrint.validade || '2027'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-xs sm:max-w-md font-bold">
                {selectedAlvaraForPrint.razao_social} • CNPJ/CPF: {selectedAlvaraForPrint.cnpj_cpf}
              </p>
            </div>
          </div>

          {/* 2. SELETOR DE MODELOS E FORMATOS (Permite comparar Modelo 1 Supabase e Modelo 2 Vetorial) */}
          <div className="flex flex-wrap items-center p-1 bg-slate-200/90 dark:bg-slate-700/80 rounded-xl border border-slate-300 dark:border-slate-600 gap-1">
            {/* MODELO 1: MODELO VETORIAL OFICIAL (BC) - 100% EDITÁVEL E SEM SOBREPOSIÇÃO */}
            <button
              type="button"
              onClick={() => handleSelectModel('vector')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition flex items-center gap-1.5 cursor-pointer ${
                viewFormat === 'pdf_oficial' && selectedPdfModel === 'vector'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Modelo 1: Modelo Oficial Balneário Camboriú 100% Editável, sem sobreposição e com ajuste dinâmico de CNAEs"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>1. Modelo Oficial BC (Editável)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/30 text-emerald-100">Sem Sobreposição</span>
            </button>

            {/* MODELO 2: MATRIZ SUPABASE ORIGINAL */}
            <button
              type="button"
              onClick={() => handleSelectModel('supabase')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition flex items-center gap-1.5 cursor-pointer ${
                viewFormat === 'pdf_oficial' && selectedPdfModel === 'supabase'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Modelo 2: Matriz original do Supabase Storage (alvara_modelo_oficial.pdf.pdf com máscara)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>2. Matriz Supabase (PDF)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-white/20 text-white">Supabase</span>
            </button>

            {/* MODELO GOOGLE DOCS */}
            <button
              type="button"
              onClick={() => handleFormatChange('docs_embed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition flex items-center gap-1.5 cursor-pointer ${
                viewFormat === 'docs_embed'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Visualizar no Modelo Google Docs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Google Docs</span>
            </button>

            {/* CERTIFICADO WEB */}
            <button
              type="button"
              onClick={() => handleFormatChange('timbrado')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition flex items-center gap-1.5 cursor-pointer ${
                viewFormat === 'timbrado'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Visualizar Certificado Timbrado Web com QR Code"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Certificado Web</span>
            </button>
          </div>

          {/* 3. Ações: Imprimir / Download / Abrir Nova Aba / Atualizar PDF */}
          <div className="flex flex-wrap items-center gap-2">
            {/* BOTÃO PRINCIPAL: IMPRIMIR / SALVAR EM PDF */}
            <button
              type="button"
              onClick={handlePrint}
              id="btn-modal-salvar-pdf-imprimir"
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer"
              title="Imprimir ou Salvar diretamente em arquivo PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            {/* BOTÃO ABRIR EM NOVA ABA (Resolve 100% o bloqueio do Chrome) */}
            {viewFormat === 'pdf_oficial' && (
              <button
                type="button"
                onClick={() => {
                  if (pdfBlobUrl) {
                    window.open(pdfBlobUrl, '_blank');
                  }
                }}
                disabled={!pdfBlobUrl || pdfLoading}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                title="Abrir o PDF em uma nova aba do Chrome (sem restrições de bloqueio do navegador)"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir em Nova Aba</span>
              </button>
            )}

            {/* BOTÃO BAIXAR PDF (Quando em modo PDF Oficial) */}
            {viewFormat === 'pdf_oficial' && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={!pdfBlobUrl || pdfLoading}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                title="Baixar o arquivo .PDF oficial gerado"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar .PDF</span>
              </button>
            )}

            {/* BOTÃO BAIXAR HTML (Quando em modo Docs) */}
            {viewFormat === 'docs_embed' && (
              <button
                type="button"
                onClick={handleDownloadHtml}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Baixar arquivo HTML oficial"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar HTML</span>
              </button>
            )}

            {/* BOTÃO ATUALIZAR / UPLOAD DE MATRIZ PDF */}
            {viewFormat === 'pdf_oficial' && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePdfUpload}
                  accept="application/pdf"
                  className="hidden"
                  id="input-upload-pdf-modelo"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPdf}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  title="Enviar novo modelo PDF oficial para o Supabase Storage ou testar modelo local"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingPdf ? 'Enviando...' : 'Trocar Matriz PDF'}</span>
                </button>
              </>
            )}

            {/* ABRIR NO GOOGLE DOCS (Quando no modo Docs) */}
            {viewFormat === 'docs_embed' && (
              <a
                href={getGoogleDocsEditUrl(activeDocsUrl)}
                target="_blank"
                rel="noreferrer"
                id="btn-modal-abrir-docs"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase rounded-xl transition flex items-center gap-1.5 shadow-sm"
                title="Abrir o modelo matriz no Google Docs em nova aba"
              >
                <span>Abrir no Docs</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {/* COPIAR DADOS */}
            <button
              type="button"
              onClick={handleCopyFields}
              id="btn-modal-copiar-dados"
              className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Copiar os dados formatados do alvará"
            >
              {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedToken ? 'Copiado!' : 'Copiar'}</span>
            </button>

            {/* FECHAR MODAL */}
            <button
              type="button"
              onClick={onClose}
              id="btn-modal-fechar"
              className="p-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl transition cursor-pointer"
              title="Fechar janela"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* FEEDBACK DE UPLOAD OU STATUS DO PDF */}
        {uploadFeedback && (
          <div className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 border-b border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              {uploadFeedback}
            </span>
            <button
              type="button"
              onClick={() => setUploadFeedback(null)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
            >
              Fechar
            </button>
          </div>
        )}

        {/* SUB-BARRA DE STATUS E CONTROLE DE EXIBIÇÃO EM MODO PDF OFICIAL */}
        {viewFormat === 'pdf_oficial' && (
          <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
            {/* Status do Modelo Selecionado */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-black uppercase text-[10px] text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                Modelo Ativo:
              </span>
              <span className="px-2.5 py-0.5 rounded-md font-mono text-[11px] bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-bold flex items-center gap-1">
                {selectedPdfModel === 'vector' ? (
                  <>
                    <span>✓ Modelo 1: Oficial Vetorial BC (100% Editável & Sem Sobreposição)</span>
                  </>
                ) : (
                  <>
                    <span>✓ Modelo 2: Matriz Supabase Storage ({PDF_MODELO_SUPABASE_BUCKET}/{PDF_MODELO_SUPABASE_FILENAME})</span>
                  </>
                )}
              </span>
              <a
                href={PDF_MODELO_SUPABASE_PUBLIC_URL}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 ml-1"
                title="Ver arquivo original no Supabase"
              >
                <span>Ver URL Supabase</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            {/* Seletor de Modo de Exibição (Resolve o problema 'Esta página foi bloqueada pelo Chrome') */}
            <div className="flex items-center gap-2">
              <div className="inline-flex p-0.5 bg-slate-200 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPdfDisplayMode('direct')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    pdfDisplayMode === 'direct'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                  title="Exibir sem bloqueio do navegador Chrome"
                >
                  <FileCheck2 className="w-3 h-3" />
                  <span>Visualização Direta (Sem Bloqueio)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPdfDisplayMode('embed')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    pdfDisplayMode === 'embed'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                  title="Exibir no leitor nativo de PDF embutido"
                >
                  <FileText className="w-3 h-3" />
                  <span>Leitor PDF Embutido</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => loadPdf(null, selectedPdfModel)}
                disabled={pdfLoading}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                title="Recarregar e atualizar dados sobre o PDF"
              >
                <RefreshCw className={`w-3 h-3 ${pdfLoading ? 'animate-spin' : ''}`} />
                <span>Recarregar</span>
              </button>
            </div>
          </div>
        )}

        {/* LINHA DO MASTER PARA TROCA DE URL DO GOOGLE DOCS (Apenas em modo Docs) */}
        {viewFormat === 'docs_embed' && isMaster && onUpdateAlvaraDocUrl && (
          <div className="px-4 py-1.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 flex flex-wrap items-center justify-between gap-2 shrink-0 print:hidden text-xs">
            <div className="flex-1 min-w-[280px] flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-amber-950 dark:text-amber-300 shrink-0 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                Trocar Matriz Google Docs (Master):
              </span>
              <input
                type="url"
                value={activeDocsUrl}
                onChange={(e) => {
                  onUpdateAlvaraDocUrl(selectedAlvaraForPrint.id, e.target.value);
                }}
                placeholder="https://docs.google.com/document/d/..."
                className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {onApplyUrlToAllAlvaras && (
              <button
                type="button"
                onClick={handleApplyToAllClick}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-[10px] font-black uppercase shrink-0 transition cursor-pointer flex items-center gap-1 shadow-xs"
                title="Salvar e aplicar este documento para todos os alvarás cadastrados"
              >
                {appliedAllFeedback ? <Check className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                <span>{appliedAllFeedback ? 'Salvo em Todos!' : 'Aplicar Geral'}</span>
              </button>
            )}
          </div>
        )}

        {/* ÁREA DE VISUALIZAÇÃO PRINCIPAL */}
        <div className="flex-1 w-full bg-slate-300 dark:bg-slate-950 flex flex-col min-h-0 relative">
          {viewFormat === 'pdf_oficial' ? (
            pdfLoading ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-sm font-bold uppercase tracking-wider">
                  Carregando {selectedPdfModel === 'supabase' ? 'Modelo 1 (Matriz Supabase)' : 'Modelo 2 (Vetorial Oficial)'}...
                </p>
                <span className="text-xs text-slate-500">
                  Preenchendo campos cadastrais e ajustando automaticamente os CNAEs
                </span>
              </div>
            ) : pdfDisplayMode === 'direct' ? (
              /* MODO VISUALIZAÇÃO DIRETA (Nunca sofre bloqueio do Chrome) */
              <div className="w-full h-full flex flex-col">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 px-4 py-1 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>
                    ✓ <strong>Visualização Direta sem Bloqueio</strong> ({selectedPdfModel === 'supabase' ? 'Matriz Supabase' : 'Modelo Vetorial BC com CNAEs autoajustáveis'}).
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (pdfBlobUrl) window.open(pdfBlobUrl, '_blank');
                      }}
                      className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Abrir em Nova Aba</span>
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setPdfDisplayMode('embed')}
                      className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline"
                    >
                      Ver no Leitor PDF
                    </button>
                  </div>
                </div>
                <iframe
                  ref={iframeRef}
                  srcDoc={filledHtml}
                  title="Alvará Sanitário Oficial"
                  className="w-full flex-1 border-0 bg-white"
                />
              </div>
            ) : pdfBlobUrl ? (
              /* MODO LEITOR PDF EMBUTIDO (Com fallback gracioso se o Chrome bloquear) */
              <object
                data={`${pdfBlobUrl}#toolbar=1&navpanes=0`}
                type="application/pdf"
                className="w-full h-full border-0 bg-slate-200 dark:bg-slate-950"
              >
                <div className="p-8 text-center flex flex-col items-center justify-center h-full gap-4 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">
                  <FileText className="w-14 h-14 text-blue-600" />
                  <div className="max-w-md">
                    <p className="text-base font-bold text-slate-900 dark:text-white mb-1">
                      O Chrome bloqueou o leitor interno de PDF dentro do quadro
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                      O arquivo PDF foi gerado perfeitamente! Para visualizá-lo sem restrições, abra-o diretamente em uma nova aba do Chrome ou utilize a visualização direta.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => window.open(pdfBlobUrl, '_blank')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase rounded-xl flex items-center gap-1.5 shadow-md"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Abrir PDF em Nova Aba</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfDisplayMode('direct')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase rounded-xl flex items-center gap-1.5 shadow-md"
                      >
                        <FileCheck2 className="w-4 h-4" />
                        <span>Visualização Direta (Sem Bloqueio)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </object>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-600 dark:text-slate-400">
                <p className="text-sm font-bold">Não foi possível carregar a visualização do PDF.</p>
                <button
                  type="button"
                  onClick={() => loadPdf()}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase"
                >
                  Tentar Novamente
                </button>
              </div>
            )
          ) : (
            <iframe
              ref={iframeRef}
              srcDoc={filledHtml}
              title="Alvará Sanitário Oficial (Google Docs/HTML)"
              className="w-full h-full border-0 bg-slate-100 dark:bg-slate-950"
            />
          )}
        </div>

        {/* RODAPÉ INFORMATIVO */}
        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-600 dark:text-slate-400 shrink-0 print:hidden">
          <div className="truncate">
            Vigilância Sanitária de Balneário Camboriú • Alvará Sanitário Nº{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {selectedAlvaraForPrint.numero_alvara || selectedAlvaraForPrint.pasta}
            </strong>{' '}
            • Contribuinte:{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {selectedAlvaraForPrint.razao_social}
            </strong>
          </div>
          <div className="text-emerald-700 dark:text-emerald-400 font-bold shrink-0 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Documento Oficial Pronto para Emissão e Impressão</span>
          </div>
        </div>

      </div>
    </div>
  );
}
