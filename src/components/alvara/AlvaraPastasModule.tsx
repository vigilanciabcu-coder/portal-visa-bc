import React from 'react';
import { Folder, FolderArchive, ArrowRight, FileCheck, Search } from 'lucide-react';
import { AlvaraSanitarioItem } from '../../types';

interface AlvaraPastasModuleProps {
  alvaras: AlvaraSanitarioItem[];
  pastasAgrupadas: Record<string, AlvaraSanitarioItem[]>;
  onSelectPasta: (pastaNome: string) => void;
  onOpenViewer?: (alvara: AlvaraSanitarioItem, mode?: 'pdf_oficial' | 'docs_embed' | 'timbrado' | 'minuta_texto') => void;
}

export function AlvaraPastasModule({
  alvaras,
  pastasAgrupadas,
  onSelectPasta,
  onOpenViewer,
}: AlvaraPastasModuleProps) {
  const pastasKeys = Object.keys(pastasAgrupadas);

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo de Pastas */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
            <FolderArchive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black uppercase text-base text-slate-900 dark:text-white">
              Controle de Arquivo & Pastas Físicas
            </h3>
            <p className="text-xs text-slate-500">
              Total de <strong>{pastasKeys.length}</strong> pastas organizadas com <strong>{alvaras.length}</strong> alvarás vinculados.
            </p>
          </div>
        </div>
      </div>

      {/* Grid de Pastas Físicas em Botões Modulares */}
      {pastasKeys.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
          <Folder className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="text-sm font-black uppercase text-slate-700 dark:text-slate-300">
            Nenhuma Pasta Física Registrada
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Ao cadastrar um alvará sanitário, preencha o campo <strong>"9. PASTA (ARQUIVO/FÍSICA)"</strong> para organizar os documentos fisicamente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pastasKeys.map((pastaNome) => {
            const items = pastasAgrupadas[pastaNome];

            return (
              <div
                key={pastaNome}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-purple-400 dark:hover:border-purple-700 transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600">
                        <Folder className="w-4 h-4" />
                      </span>
                      <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white line-clamp-1">
                        {pastaNome}
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300">
                      {items.length} {items.length === 1 ? 'Alvará' : 'Alvarás'}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {items.slice(0, 3).map((it) => (
                      <div
                        key={it.id}
                        className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1"
                      >
                        <span className="font-semibold truncate max-w-[170px]" title={it.razao_social}>
                          {it.razao_social}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">
                          Nº {it.numero_alvara}
                        </span>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <p className="text-[10px] text-purple-600 font-bold italic">
                        + {items.length - 3} outros alvarás nesta pasta
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectPasta(pastaNome)}
                    className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                  >
                    <span>Ver Alvarás</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
