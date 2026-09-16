import React, { useState } from 'react';
import {
  FileText,
  ExternalLink,
  Check,
  Copy,
  Eye,
  EyeOff,
  Link2,
  Sparkles,
  Download,
  ShieldCheck,
  Lock,
  FileCheck
} from 'lucide-react';
import { AlvaraSanitarioItem } from '../../types';
import {
  getGoogleDocsEmbedUrl,
  getGoogleDocsEditUrl,
  getGoogleDocsPdfUrl,
  formatAlvaraDataForDocs,
  MODELOS_DOCS_INICIAIS
} from './alvaraUtils';

interface AlvaraDocsModuleProps {
  googleDocsTemplateUrl: string;
  setGoogleDocsTemplateUrl: (url: string) => void;
  onSaveGlobalDocsUrl: (url: string) => void;
  onApplyUrlToAllAlvaras: (url: string) => void;
  alvaras: AlvaraSanitarioItem[];
  isMaster?: boolean;
  setFeedbackMsg: (msg: { tipo: 'sucesso' | 'erro' | 'info'; texto: string } | null) => void;
}

export function AlvaraDocsModule({
  googleDocsTemplateUrl,
  setGoogleDocsTemplateUrl,
  onSaveGlobalDocsUrl,
  onApplyUrlToAllAlvaras,
  alvaras,
  isMaster = false,
  setFeedbackMsg,
}: AlvaraDocsModuleProps) {
  const [inputUrl, setInputUrl] = useState(googleDocsTemplateUrl);
  const [showDocsEmbed, setShowDocsEmbed] = useState(true);
  const [selectedAlvaraForCopy, setSelectedAlvaraForCopy] = useState<string>(
    alvaras.length > 0 ? alvaras[0].id : ''
  );
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const activeUrl = googleDocsTemplateUrl || inputUrl || MODELOS_DOCS_INICIAIS[0].docs_url;
  const pdfUrl = getGoogleDocsPdfUrl(activeUrl);

  // Manipular salvamento do link oficial (Exclusivo Master)
  const handleSaveLink = () => {
    if (!isMaster) {
      setFeedbackMsg({
        tipo: 'erro',
        texto: 'Apenas o Administrador Master tem permissão para alterar o modelo oficial de Alvará.'
      });
      return;
    }
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      setFeedbackMsg({ tipo: 'erro', texto: 'Por favor, insira um link válido do Google Docs.' });
      return;
    }
    setGoogleDocsTemplateUrl(trimmed);
    onSaveGlobalDocsUrl(trimmed);
    setFeedbackMsg({
      tipo: 'sucesso',
      texto: 'Novo modelo oficial do Alvará salvo com sucesso pelo Administrador Master!'
    });
  };

  // Aplicar o link a todos os alvarás existentes (Exclusivo Master)
  const handleApplyToAll = () => {
    if (!isMaster) {
      setFeedbackMsg({
        tipo: 'erro',
        texto: 'Apenas o Administrador Master tem permissão para aplicar alterações globais de modelo.'
      });
      return;
    }
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      setFeedbackMsg({ tipo: 'erro', texto: 'Por favor, insira um link válido antes de aplicar.' });
      return;
    }
    setGoogleDocsTemplateUrl(trimmed);
    onSaveGlobalDocsUrl(trimmed);
    onApplyUrlToAllAlvaras(trimmed);
    setFeedbackMsg({
      tipo: 'sucesso',
      texto: `O novo modelo oficial foi aplicado a todos os ${alvaras.length} alvarás cadastrados!`
    });
  };

  // Copiar dados do alvará selecionado para colar no Docs
  const handleCopyAlvaraData = () => {
    const alv = alvaras.find((a) => a.id === selectedAlvaraForCopy) || alvaras[0];
    if (!alv) {
      setFeedbackMsg({ tipo: 'info', texto: 'Nenhum alvará cadastrado para copiar dados.' });
      return;
    }
    const formatted = formatAlvaraDataForDocs(alv);
    navigator.clipboard.writeText(formatted);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
    setFeedbackMsg({
      tipo: 'sucesso',
      texto: `9 Campos do Alvará nº ${alv.numero_alvara} copiados com sucesso!`
    });
  };

  return (
    <div className="space-y-6">
      {/* HUB PRINCIPAL: CONFIGURAÇÃO DO MODELO OFICIAL NO GOOGLE DOCS (COM CONTROLE MASTER) */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-blue-950/40 p-5 sm:p-6 rounded-3xl border-2 border-blue-400 dark:border-blue-700 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-200 dark:border-blue-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-blue-600 text-white shadow-md">
              <FileText className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white">
                  Modelo Ativo para PDF
                </span>
                {isMaster ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Permissão Master Ativa
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Visualização Servidor/Munícipe
                  </span>
                )}
              </div>
              <h3 className="text-base font-black uppercase text-slate-900 dark:text-white mt-1">
                Modelo Oficial de Alvará Sanitário (Google Docs & PDF)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Este modelo do Google Docs é a matriz oficial utilizada para geração do arquivo PDF do Alvará Sanitário.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download Direto do PDF do Modelo */}
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl transition flex items-center gap-1.5 shadow"
                title="Baixar diretamente em PDF o documento oficial do Google Docs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar PDF</span>
              </a>
            )}

            <a
              href={getGoogleDocsEditUrl(activeUrl)}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase rounded-xl transition flex items-center gap-1.5 shadow"
              title="Abrir no Google Docs"
            >
              <span>Abrir no Docs</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={() => setShowDocsEmbed(!showDocsEmbed)}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-black uppercase rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {showDocsEmbed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showDocsEmbed ? 'Recolher' : 'Expandir'}</span>
            </button>
          </div>
        </div>

        {/* CAMPO DE TROCA DO ALVARÁ (DESTACADO PARA O USUÁRIO MASTER) */}
        {isMaster ? (
          <div className="bg-amber-50/80 dark:bg-amber-950/40 p-4 rounded-2xl border-2 border-amber-300 dark:border-amber-700/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black uppercase text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Campo Master: Trocar Modelo do Alvará (Google Docs)</span>
              </label>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                Apenas Master pode editar
              </span>
            </div>

            <p className="text-xs text-amber-900/80 dark:text-amber-300/80">
              Cole a URL de qualquer documento do Google Docs para substituir o modelo oficial. O servidor ou munícipe irá gerar o PDF com base nesta nova matriz.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://docs.google.com/document/d/..."
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveLink}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Novo Modelo de Alvará</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplyToAll}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer"
                  title="Aplica este documento a todos os alvarás cadastrados"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Aplicar Geral a Todos os Alvarás ({alvaras.length})</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const defaultUrl = MODELOS_DOCS_INICIAIS[0].docs_url;
                  setInputUrl(defaultUrl);
                  setGoogleDocsTemplateUrl(defaultUrl);
                  onSaveGlobalDocsUrl(defaultUrl);
                  setFeedbackMsg({ tipo: 'info', texto: 'Link restaurado para o modelo homologado DVIS.' });
                }}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 font-bold underline cursor-pointer"
              >
                Restaurar Modelo Padrão DVIS
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-blue-600" />
                URL do Modelo Oficial em Operação:
              </span>
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Edição restrita ao usuário Master
              </span>
            </div>
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-xs text-slate-700 dark:text-slate-300 truncate">
              {activeUrl}
            </div>
            <p className="text-[11px] text-slate-500">
              Para solicitar alterações no modelo ou trocar a matriz do documento, contate o Administrador Master do sistema.
            </p>
          </div>
        )}

        {/* Iframe Interativo do Documento Google Docs */}
        {showDocsEmbed && (
          <div className="rounded-2xl border-2 border-blue-300 dark:border-blue-800 overflow-hidden bg-white dark:bg-slate-950 shadow-inner">
            <div className="p-3 bg-blue-100/90 dark:bg-blue-950/80 border-b border-blue-200 dark:border-blue-900 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-blue-950 dark:text-blue-200 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-600" />
                Visualização do Documento no Google Docs (Atualização em Tempo Real)
              </span>
              <span className="text-[11px] text-blue-800 dark:text-blue-300 font-medium">
                Documento utilizado na emissão automática e geração de PDF.
              </span>
            </div>
            <iframe
              src={getGoogleDocsEmbedUrl(activeUrl)}
              title="Google Docs Modelo Oficial do Alvará"
              className="w-full h-[620px] border-0"
              allow="clipboard-write"
            />
          </div>
        )}

        {/* Ferramenta Rápida: Copiar os 9 Campos de um Alvará para colar no seu Google Docs */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <h5 className="text-xs font-black uppercase text-slate-800 dark:text-white flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5 text-blue-600" />
              <span>Copiar Dados Formatados do Alvará para o Google Docs:</span>
            </h5>
            <p className="text-[11px] text-slate-500">
              Selecione qualquer alvará cadastrado para copiar os 9 campos formatados e colá-los no documento.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedAlvaraForCopy}
              onChange={(e) => setSelectedAlvaraForCopy(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white font-bold focus:outline-none cursor-pointer max-w-[220px] truncate"
            >
              {alvaras.map((alv) => (
                <option key={alv.id} value={alv.id}>
                  Nº {alv.numero_alvara} - {alv.razao_social}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleCopyAlvaraData}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer"
            >
              {copiedSuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSuccess ? 'Copiado!' : 'Copiar Dados'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
