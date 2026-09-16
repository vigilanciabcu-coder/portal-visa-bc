import React from 'react';
import { ArrowLeft, FileCheck, FileText } from 'lucide-react';
import { getGoogleDocsEditUrl } from './alvaraUtils';

interface AlvaraHeaderProps {
  onBack: () => void;
  googleDocsTemplateUrl: string;
}

export function AlvaraHeader({ onBack, googleDocsTemplateUrl }: AlvaraHeaderProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
          title="Voltar ao Início"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-600 to-yellow-500 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20">
          <FileCheck className="w-5 h-5 text-slate-950 font-black" />
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[9px] font-black uppercase rounded tracking-wider">
            🏛️ Vigilância Sanitária • DVIS Balneário Camboriú
          </div>
          <h1 className="text-base md:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Módulo de Alvará Sanitário
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <a
          href={getGoogleDocsEditUrl(googleDocsTemplateUrl)}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-black uppercase transition flex items-center gap-1.5 border border-blue-200 dark:border-blue-900 shadow-sm cursor-pointer"
          title="Abrir o Documento Oficial no Google Docs em nova aba"
        >
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          <span>Abrir Docs ↗</span>
        </a>
      </div>
    </div>
  );
}
