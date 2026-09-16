import React from 'react';
import { Search, Plus, FileText, Folder } from 'lucide-react';
import { AlvaraModuleType } from './alvaraUtils';

interface AlvaraModuleNavProps {
  activeModule: AlvaraModuleType;
  onChangeModule: (module: AlvaraModuleType) => void;
  totalAlvaras: number;
  totalPastas: number;
}

export function AlvaraModuleNav({
  activeModule,
  onChangeModule,
  totalAlvaras,
  totalPastas,
}: AlvaraModuleNavProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
      {/* BOTÃO MÓDULO 1: CONSULTAR */}
      <button
        type="button"
        onClick={() => onChangeModule('consultar')}
        className={`p-3.5 rounded-2xl font-black text-xs uppercase transition flex items-center justify-center gap-2 cursor-pointer border shadow-sm ${
          activeModule === 'consultar'
            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-amber-500/20 ring-2 ring-amber-500/30'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
        }`}
      >
        <Search className="w-4 h-4 shrink-0" />
        <span>1. Consultar Alvarás ({totalAlvaras})</span>
      </button>

      {/* BOTÃO MÓDULO 2: CADASTRAR & EMITIR */}
      <button
        type="button"
        onClick={() => onChangeModule('cadastrar')}
        className={`p-3.5 rounded-2xl font-black text-xs uppercase transition flex items-center justify-center gap-2 cursor-pointer border shadow-sm ${
          activeModule === 'cadastrar'
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20 ring-2 ring-emerald-500/30'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
        }`}
      >
        <Plus className="w-4 h-4 shrink-0" />
        <span>2. Cadastrar & Emitir</span>
      </button>

      {/* BOTÃO MÓDULO 3: DOCUMENTO GOOGLE DOCS */}
      <button
        type="button"
        onClick={() => onChangeModule('docs')}
        className={`p-3.5 rounded-2xl font-black text-xs uppercase transition flex items-center justify-center gap-2 cursor-pointer border shadow-sm ${
          activeModule === 'docs'
            ? 'bg-blue-600 text-white border-blue-600 shadow-blue-600/20 ring-2 ring-blue-500/30'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
        }`}
      >
        <FileText className="w-4 h-4 shrink-0" />
        <span>3. Documento Docs</span>
      </button>

      {/* BOTÃO MÓDULO 4: PASTAS SANITÁRIAS */}
      <button
        type="button"
        onClick={() => onChangeModule('pastas')}
        className={`p-3.5 rounded-2xl font-black text-xs uppercase transition flex items-center justify-center gap-2 cursor-pointer border shadow-sm ${
          activeModule === 'pastas'
            ? 'bg-purple-600 text-white border-purple-600 shadow-purple-600/20 ring-2 ring-purple-500/30'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
        }`}
      >
        <Folder className="w-4 h-4 shrink-0" />
        <span>4. Pastas Físicas ({totalPastas})</span>
      </button>
    </div>
  );
}
