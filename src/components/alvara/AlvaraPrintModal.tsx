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
  CheckCircle2
} from 'lucide-react';
import { AlvaraSanitarioItem } from '../../types';
import {
  getGoogleDocsEditUrl,
  getGoogleDocsPdfUrl,
  formatAlvaraDataForDocs,
  MODELOS_DISPONIVEIS
} from './alvaraUtils';
import { generateAlvaraFilledHtml } from './alvaraTemplateEngine';

interface AlvaraPrintModalProps {
  selectedAlvaraForPrint: AlvaraSanitarioItem;
  onClose: () => void;
  printViewMode?: 'docs_embed' | 'timbrado';
  setPrintViewMode?: (mode: 'docs_embed' | 'timbrado') => void;
  googleDocsTemplateUrl: string;
  isMaster?: boolean;
  onUpdateAlvaraDocUrl?: (alvaraId: string, newUrl: string) => void;
  onApplyUrlToAllAlvaras?: (url: string) => void;
}

export function AlvaraPrintModal({
  selectedAlvaraForPrint,
  onClose,
  googleDocsTemplateUrl,
  isMaster = false,
  onUpdateAlvaraDocUrl,
  onApplyUrlToAllAlvaras,
}: AlvaraPrintModalProps) {
  const [copiedToken, setCopiedToken] = useState(false);
  const [appliedAllFeedback, setAppliedAllFeedback] = useState(false);
  const [filledHtml, setFilledHtml] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Determinar a URL do Google Docs a ser exibida:
  const activeDocsUrl =
    selectedAlvaraForPrint.modelo_doc_url?.trim() ||
    googleDocsTemplateUrl ||
    MODELOS_DISPONIVEIS[0].docsUrl;

  const pdfUrl = getGoogleDocsPdfUrl(activeDocsUrl);

  // Gera o documento com os dados do contribuinte preenchidos imediatamente
  useEffect(() => {
    const initialFilled = generateAlvaraFilledHtml(selectedAlvaraForPrint);
    setFilledHtml(initialFilled);

    // Tenta atualizar dinamicamente a partir do Google Docs caso seja fornecida URL customizada
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
          console.warn('[AlvaraPrintModal] Usando template embutido:', err);
        });
    }
  }, [selectedAlvaraForPrint, activeDocsUrl]);

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

  // Download do arquivo HTML preenchido para arquivamento digital
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

  // Imprime ou Salva como PDF direto pelo navegador com alta definição vetorial
  const handlePrintOrSavePdf = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-3 print:p-0 print:bg-white print:static">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[1600px] h-[95vh] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden print:border-none print:shadow-none print:w-full print:h-auto print:max-w-none">
        {/* Barra Superior Compacta (Máxima Área de Trabalho) */}
        <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          {/* Título e Identificação do Alvará com dados preenchidos */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-900 dark:text-white truncate">
                  Alvará Nº {selectedAlvaraForPrint.numero_alvara || selectedAlvaraForPrint.pasta}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                  Dados do Contribuinte Preenchidos • Pronto para PDF
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-xs sm:max-w-md font-bold">
                {selectedAlvaraForPrint.razao_social} • CNPJ/CPF: {selectedAlvaraForPrint.cnpj_cpf}
              </p>
            </div>
          </div>

          {/* Botões de Ação Imediata */}
          <div className="flex flex-wrap items-center gap-2">
            {/* BOTÃO PRINCIPAL: SALVAR EM PDF / IMPRIMIR */}
            <button
              type="button"
              onClick={handlePrintOrSavePdf}
              id="btn-modal-salvar-pdf-imprimir"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer animate-pulse"
              title="Salvar como PDF ou Imprimir o Alvará Oficial com todos os dados preenchidos"
            >
              <Printer className="w-4 h-4" />
              <span>Salvar em PDF / Imprimir</span>
            </button>

            {/* Download do arquivo HTML */}
            <button
              type="button"
              onClick={handleDownloadHtml}
              id="btn-modal-baixar-html"
              className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Baixar arquivo HTML oficial com dados preenchidos"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar HTML</span>
            </button>

            {/* ABRIR NO GOOGLE DOCS MATRIZ */}
            <a
              href={getGoogleDocsEditUrl(activeDocsUrl)}
              target="_blank"
              rel="noreferrer"
              id="btn-modal-abrir-docs"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase rounded-xl transition flex items-center gap-1.5 shadow-sm"
              title="Abrir o modelo matriz no Google Docs em nova aba"
            >
              <span>Modelo Docs</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Copiar Dados Formatados */}
            <button
              type="button"
              onClick={handleCopyFields}
              id="btn-modal-copiar-dados"
              className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Copiar os dados formatados do alvará para a área de transferência"
            >
              {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedToken ? 'Copiado!' : 'Copiar Dados'}</span>
            </button>

            {/* Fechar Modal */}
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

        {/* Linha Compacta do Master (Apenas se usuário for Master e puder trocar modelo) */}
        {isMaster && onUpdateAlvaraDocUrl && (
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

        {/* ÁREA DE TRABALHO MAXIMIZADA: DOCUMENTO OFICIAL PREENCHIDO COM DADOS DO CONTRIBUINTE */}
        <div className="flex-1 w-full bg-slate-200 dark:bg-slate-950 flex flex-col min-h-0 relative">
          <iframe
            ref={iframeRef}
            srcDoc={filledHtml}
            title="Alvará Sanitário Oficial Preenchido com Dados do Contribuinte"
            className="w-full h-full border-0 bg-slate-100 dark:bg-slate-950"
          />
        </div>

        {/* Rodapé Informativo Slim */}
        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-600 dark:text-slate-400 shrink-0 print:hidden">
          <div className="truncate">
            Documento Oficial Integrado com Google Docs • Razão Social: <strong className="text-slate-800 dark:text-slate-200">{selectedAlvaraForPrint.razao_social}</strong>
          </div>
          <div className="text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
            Pronto para PDF: clique em "Salvar em PDF / Imprimir" e selecione "Salvar como PDF"
          </div>
        </div>
      </div>
    </div>
  );
}

