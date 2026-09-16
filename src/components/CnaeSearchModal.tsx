import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Check, AlertTriangle, ShieldCheck, HelpCircle, Plus, ArrowRight } from 'lucide-react';
import { CnaeItem, CnaeGrouped, CnaeOption } from '../types';
import { groupCnaeRows, normalizeText, formatCnaeCode } from '../lib/cnaeService';

interface CnaeSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  cnaeDatabase: CnaeItem[];
  onSelectCnae: (selected: {
    codigo: string;
    denominacao: string;
    risco: 'ALTO RISCO' | 'MÉDIO RISCO' | 'BAIXO RISCO' | 'A DEFINIR' | string;
    observacao?: string;
    asPrincipal?: boolean;
  }) => void;
  currentPrincipal?: string;
}

export const CnaeSearchModal: React.FC<CnaeSearchModalProps> = ({
  isOpen,
  onClose,
  cnaeDatabase,
  onSelectCnae,
  currentPrincipal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCnae, setActiveCnae] = useState<CnaeGrouped | null>(null);
  const [selectedOption, setSelectedOption] = useState<CnaeOption | null>(null);
  const [overrideRisco, setOverrideRisco] = useState<'ALTO RISCO' | 'MÉDIO RISCO' | 'BAIXO RISCO' | null>(null);
  const [addToPrincipal, setAddToPrincipal] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Group database items
  const groupedCnaes = useMemo(() => {
    return groupCnaeRows(cnaeDatabase);
  }, [cnaeDatabase]);

  // Filter grouped items by search query
  const filteredCnaes = useMemo(() => {
    const q = normalizeText(searchQuery);
    if (!q) {
      return groupedCnaes.slice(0, 30);
    }
    const cleanDigits = searchQuery.replace(/\D/g, '');

    return groupedCnaes.filter((item) => {
      const codeClean = item.subclasse.replace(/\D/g, '');
      const codeMatches = cleanDigits.length > 0 && codeClean.includes(cleanDigits);
      const nameMatches = normalizeText(item.denominacaoOficial).includes(q);
      const questionMatches = item.pergunta ? normalizeText(item.pergunta).includes(q) : false;
      const optionsMatch = item.opcoes.some(
        op => normalizeText(op.resposta).includes(q) || (op.detalhes && normalizeText(op.detalhes).includes(q))
      );
      return codeMatches || nameMatches || questionMatches || optionsMatch;
    });
  }, [groupedCnaes, searchQuery]);

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      setSearchQuery('');
      setActiveCnae(null);
      setSelectedOption(null);
      setOverrideRisco(null);
      setAddToPrincipal(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectCnaeGroup = (item: CnaeGrouped) => {
    setActiveCnae(item);
    setOverrideRisco(null);
    if (item.temVariavel && item.opcoes.length > 0) {
      setSelectedOption(item.opcoes[0]);
    } else {
      setSelectedOption(null);
    }
  };

  // Determine effective risk
  const getEffectiveRisk = (): 'ALTO RISCO' | 'MÉDIO RISCO' | 'BAIXO RISCO' | 'A DEFINIR' | string => {
    if (overrideRisco) return overrideRisco;
    if (!activeCnae) return 'BAIXO RISCO';

    if (activeCnae.temVariavel) {
      if (selectedOption) {
        const norm = normalizeText(selectedOption.risco);
        if (norm.includes('alto') || norm.includes('iii') || norm.includes('3')) return 'ALTO RISCO';
        if (norm.includes('medio') || norm.includes('ii') || norm.includes('2')) return 'MÉDIO RISCO';
        if (norm.includes('baixo') || norm.includes('1') || norm.includes('dispensad')) return 'BAIXO RISCO';
        return selectedOption.risco.toUpperCase();
      }
      return 'A DEFINIR';
    }

    const norm = normalizeText(activeCnae.riscoFixo || 'Baixo Risco');
    if (norm.includes('alto') || norm.includes('iii') || norm.includes('3')) return 'ALTO RISCO';
    if (norm.includes('medio') || norm.includes('ii') || norm.includes('2')) return 'MÉDIO RISCO';
    if (norm.includes('baixo') || norm.includes('1') || norm.includes('dispensad')) return 'BAIXO RISCO';
    return (activeCnae.riscoFixo || 'BAIXO RISCO').toUpperCase();
  };

  const handleConfirmAdd = () => {
    if (!activeCnae) return;

    const finalRisk = getEffectiveRisk();
    const obs = activeCnae.temVariavel && selectedOption
      ? `${selectedOption.resposta}${selectedOption.detalhes ? ` - ${selectedOption.detalhes}` : ''}`
      : undefined;

    onSelectCnae({
      codigo: formatCnaeCode(activeCnae.subclasse) || activeCnae.subclasse,
      denominacao: activeCnae.denominacaoOficial,
      risco: finalRisk,
      observacao: obs,
      asPrincipal: addToPrincipal
    });

    onClose();
  };

  const renderBadge = (risco: string) => {
    const norm = normalizeText(risco);
    if (norm.includes('alto')) {
      return (
        <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow-xs">
          Alto Risco
        </span>
      );
    }
    if (norm.includes('medio')) {
      return (
        <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow-xs">
          Médio Risco
        </span>
      );
    }
    if (norm.includes('definir') || norm.includes('variavel')) {
      return (
        <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow-xs">
          A Definir
        </span>
      );
    }
    return (
      <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow-xs">
        Baixo Risco
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900">
        
        {/* Modal Header */}
        <div className="bg-[#0055A5] text-white p-3.5 px-4 flex items-center justify-between shadow">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-sky-200" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">
                Catálogo & Enquadramento de CNAEs (VISA BC)
              </h3>
              <p className="text-[11px] text-sky-100">
                Pesquise por código ou nome, responda variáveis do decreto se houver, ajuste o risco e adicione à tabela.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-sky-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Two columns on larger screens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-blue-600 absolute left-3 top-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite o código (ex: 5611, 4711, 1043) ou palavra-chave (restaurante, mercado, farmácia)..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs md:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            {/* Left list of suggestions */}
            <div className="md:col-span-5 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col max-h-[380px]">
              <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 text-[10px] font-black text-slate-600 uppercase flex items-center justify-between">
                <span>Resultados ({filteredCnaes.length})</span>
                <span className="text-[9px] text-slate-400">Clique para selecionar</span>
              </div>
              <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
                {filteredCnaes.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 italic">
                    Nenhum CNAE encontrado para "{searchQuery}".
                  </div>
                ) : (
                  filteredCnaes.map((item) => {
                    const isSelected = activeCnae?.subclasse === item.subclasse;
                    return (
                      <button
                        key={item.subclasse}
                        type="button"
                        onClick={() => handleSelectCnaeGroup(item)}
                        className={`w-full text-left p-2.5 hover:bg-blue-50 transition flex items-start justify-between gap-2 border-l-4 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-600'
                            : 'border-transparent'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                              {item.subclasse}
                            </span>
                            {item.temVariavel && (
                              <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-1 rounded uppercase">
                                ⚠️ Variável
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight">
                            {item.denominacaoOficial}
                          </p>
                        </div>
                        <div className="shrink-0 pt-0.5">
                          {renderBadge(item.temVariavel ? 'A Definir' : (item.riscoFixo || 'Baixo Risco'))}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Selected CNAE Details, Questions & Risk Assignment */}
            <div className="md:col-span-7 space-y-3">
              {activeCnae ? (
                <div className="bg-white border-2 border-blue-400 rounded-lg p-3.5 shadow-sm space-y-3">
                  
                  {/* Selected CNAE Header */}
                  <div className="border-b border-slate-200 pb-2.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-mono font-black bg-blue-700 text-white px-2 py-0.5 rounded">
                        CNAE {activeCnae.subclasse}
                      </span>
                      <div>
                        {renderBadge(getEffectiveRisk())}
                      </div>
                    </div>
                    <h4 className="text-xs md:text-sm font-black text-slate-900 leading-snug">
                      {activeCnae.denominacaoOficial}
                    </h4>
                  </div>

                  {/* If Variable: Show question and options */}
                  {activeCnae.temVariavel && (
                    <div className="space-y-2 bg-amber-50/70 border border-amber-200 rounded-lg p-2.5">
                      <div className="flex items-center gap-1.5 text-amber-800 font-black text-[10px] uppercase">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Pergunta Sanitária Condicionante (Decreto):</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 italic">
                        {activeCnae.pergunta || 'Qual das opções abaixo descreve a atividade realizada no local?'}
                      </p>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[9px] font-black uppercase text-slate-500 block">
                          Selecione a opção aplicável:
                        </span>
                        <div className="grid grid-cols-1 gap-1.5">
                          {activeCnae.opcoes.map((op, idx) => {
                            const isOptSelected = selectedOption?.resposta === op.resposta;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setSelectedOption(op);
                                  setOverrideRisco(null);
                                }}
                                className={`p-2 rounded text-left border transition flex items-center justify-between gap-2 cursor-pointer text-xs ${
                                  isOptSelected
                                    ? 'bg-blue-100/90 border-blue-600 font-bold text-blue-900 ring-1 ring-blue-500'
                                    : 'bg-white border-slate-200 hover:border-blue-300 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black border ${
                                    isOptSelected ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300'
                                  }`}>
                                    {isOptSelected ? '✓' : idx + 1}
                                  </span>
                                  <span className="line-clamp-2">{op.resposta}</span>
                                </div>
                                <div className="shrink-0">
                                  {renderBadge(op.risco)}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual Risk Override (Alteração de risco para a tabela) */}
                  <div className="space-y-1 bg-slate-50 p-2.5 rounded border border-slate-200">
                    <label className="text-[10px] font-black text-slate-600 uppercase block">
                      Ajustar / Alterar Risco Sanitário para a Tabela:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setOverrideRisco('ALTO RISCO')}
                        className={`text-[10px] font-black px-2.5 py-1 rounded transition cursor-pointer ${
                          getEffectiveRisk() === 'ALTO RISCO'
                            ? 'bg-red-600 text-white ring-2 ring-red-400'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-red-50'
                        }`}
                      >
                        🔴 Alto Risco
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverrideRisco('MÉDIO RISCO')}
                        className={`text-[10px] font-black px-2.5 py-1 rounded transition cursor-pointer ${
                          getEffectiveRisk() === 'MÉDIO RISCO'
                            ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-amber-50'
                        }`}
                      >
                        🟡 Médio Risco
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverrideRisco('BAIXO RISCO')}
                        className={`text-[10px] font-black px-2.5 py-1 rounded transition cursor-pointer ${
                          getEffectiveRisk() === 'BAIXO RISCO'
                            ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-emerald-50'
                        }`}
                      >
                        🟢 Baixo Risco
                      </button>
                      {overrideRisco && (
                        <button
                          type="button"
                          onClick={() => setOverrideRisco(null)}
                          className="text-[9px] text-slate-500 underline ml-1 hover:text-red-600"
                        >
                          Restaurar padrão
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Option: Insert as Principal or Secondary */}
                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addToPrincipal}
                        onChange={(e) => setAddToPrincipal(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <span>Definir como <strong>CNAE Principal</strong> (1º da lista)</span>
                    </label>
                  </div>

                  {/* Action Button OK */}
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmAdd}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-4 py-1.5 rounded shadow flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      <span>OK - Adicionar à Tabela</span>
                    </button>
                  </div>

                </div>
              ) : (
                <div className="bg-white border border-dashed border-slate-300 rounded-lg p-8 text-center text-xs text-slate-400 space-y-1">
                  <Search className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                  <p className="font-bold text-slate-600">Nenhuma CNAE selecionada</p>
                  <p>Escolha uma atividade na lista ao lado ou pesquise pelo código para visualizar os detalhes e classificar o risco.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 border-t border-slate-200 p-2.5 px-4 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px]">
            Base de enquadramento sanitário oficial de Balneário Camboriú / SC
          </span>
          <button
            onClick={onClose}
            className="bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold text-xs px-3 py-1 rounded transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
