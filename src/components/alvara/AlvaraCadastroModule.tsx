import React, { useState, useMemo } from 'react';
import {
  Plus,
  Building2,
  Search,
  ExternalLink,
  Lock,
  FileText,
  Sparkles,
  Link2,
  Check,
  X,
  KeyRound,
  ShieldAlert,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { AlvaraSanitarioItem, UserProfile } from '../../types';
import {
  ModeloAlvaraDef,
  MODELOS_DISPONIVEIS,
  getGoogleDocsEditUrl,
  formatCpfCnpj,
  CNAES_SUGESTOES_VISA
} from './alvaraUtils';

interface AlvaraCadastroModuleProps {
  currentUser?: UserProfile | null;
  editingId: string | null;
  categoriaInput: 'PONTO_MILHO_CHURROS' | 'FEIRANTE' | 'GERAL';
  setCategoriaInput: (cat: 'PONTO_MILHO_CHURROS' | 'FEIRANTE' | 'GERAL') => void;
  numeroAlvaraInput: string;
  setNumeroAlvaraInput: (val: string) => void;
  anoExercicioInput: number;
  setAnoExercicioInput: (val: number) => void;
  razaoSocialInput: string;
  setRazaoSocialInput: (val: string) => void;
  cnpjCpfInput: string;
  setCnpjCpfInput: (val: string) => void;
  nomeFantasiaInput: string;
  setNomeFantasiaInput: (val: string) => void;
  enderecoInput: string;
  setEnderecoInput: (val: string) => void;
  numeroComplementoInput: string;
  setNumeroComplementoInput: (val: string) => void;
  bairroInput: string;
  setBairroInput: (val: string) => void;
  cepInput: string;
  setCepInput: (val: string) => void;
  dataEmissaoInput: string;
  setDataEmissaoInput: (val: string) => void;
  pastaInput: string;
  setPastaInput: (val: string) => void;
  validadeInput: string;
  setValidadeInput: (val: string) => void;
  cnaePrincipalInput: string;
  setCnaePrincipalInput: (val: string) => void;
  condicionantesInput: string;
  setCondicionantesInput: (val: string) => void;
  modeloDocUrlInput: string;
  setModeloDocUrlInput: (val: string) => void;
  googleDocsTemplateUrl: string;
  loadingCnpj: boolean;
  onSearchCnpj: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onSelectModeloParaCadastro: (modelo: ModeloAlvaraDef) => void;
}

export function AlvaraCadastroModule({
  currentUser,
  editingId,
  categoriaInput,
  setCategoriaInput,
  numeroAlvaraInput,
  setNumeroAlvaraInput,
  anoExercicioInput,
  setAnoExercicioInput,
  razaoSocialInput,
  setRazaoSocialInput,
  cnpjCpfInput,
  setCnpjCpfInput,
  nomeFantasiaInput,
  setNomeFantasiaInput,
  enderecoInput,
  setEnderecoInput,
  numeroComplementoInput,
  setNumeroComplementoInput,
  bairroInput,
  setBairroInput,
  cepInput,
  setCepInput,
  dataEmissaoInput,
  setDataEmissaoInput,
  pastaInput,
  setPastaInput,
  validadeInput,
  setValidadeInput,
  cnaePrincipalInput,
  setCnaePrincipalInput,
  condicionantesInput,
  setCondicionantesInput,
  modeloDocUrlInput,
  setModeloDocUrlInput,
  googleDocsTemplateUrl,
  loadingCnpj,
  onSearchCnpj,
  onSubmit,
  onCancel,
  onSelectModeloParaCadastro,
}: AlvaraCadastroModuleProps) {
  // Gerenciamento dos CNAEs em lista vertical
  const [cnaeSearchInput, setCnaeSearchInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cnaeError, setCnaeError] = useState<string | null>(null);

  // Estados para exclusão com confirmação por senha pessoal
  const [cnaeToDeleteIndex, setCnaeToDeleteIndex] = useState<number | null>(null);
  const [cnaeDeletePasswordInput, setCnaeDeletePasswordInput] = useState('');
  const [cnaeDeletePasswordError, setCnaeDeletePasswordError] = useState<string | null>(null);
  const [isDeletingModalOpen, setIsDeletingModalOpen] = useState(false);

  // Converte a string de CNAEs em array de itens
  const cnaeList: string[] = useMemo(() => {
    if (!cnaePrincipalInput) return [];
    return cnaePrincipalInput
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }, [cnaePrincipalInput]);

  // Filtra sugestões de CNAEs sanitários com base na busca
  const filteredCnaes = useMemo(() => {
    if (!cnaeSearchInput.trim()) {
      return CNAES_SUGESTOES_VISA.slice(0, 8);
    }
    const cleanSearch = cnaeSearchInput
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return CNAES_SUGESTOES_VISA.filter((item) => {
      const cleanItem = item
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return cleanItem.includes(cleanSearch);
    }).slice(0, 10);
  }, [cnaeSearchInput]);

  // Adiciona novo CNAE à lista vertical
  const handleAddCnae = (cnaeText: string) => {
    const trimmed = cnaeText.trim().toUpperCase();
    if (!trimmed) {
      setCnaeError('Informe o código ou descrição da atividade CNAE.');
      setTimeout(() => setCnaeError(null), 3000);
      return;
    }
    if (cnaeList.some((item) => item.toUpperCase() === trimmed)) {
      setCnaeError('Esta atividade CNAE já consta na lista.');
      setTimeout(() => setCnaeError(null), 3000);
      return;
    }
    const updated = [...cnaeList, trimmed].join('\n');
    setCnaePrincipalInput(updated);
    setCnaeSearchInput('');
    setShowSuggestions(false);
    setCnaeError(null);
  };

  // Solicita exclusão de um CNAE (abre modal de senha)
  const handleRequestDeleteCnae = (index: number) => {
    setCnaeToDeleteIndex(index);
    setCnaeDeletePasswordInput('');
    setCnaeDeletePasswordError(null);
    setIsDeletingModalOpen(true);
  };

  // Confirma a exclusão validando a senha pessoal do servidor
  const handleConfirmDeleteCnae = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cnaeToDeleteIndex === null) return;

    const userPass = currentUser?.senha?.trim();
    const enteredPass = cnaeDeletePasswordInput.trim();

    if (!enteredPass) {
      setCnaeDeletePasswordError('Por favor, informe sua senha pessoal de servidor.');
      return;
    }

    if (userPass && enteredPass !== userPass) {
      setCnaeDeletePasswordError('Senha pessoal incorreta. Operação cancelada por segurança.');
      return;
    }

    if (!userPass && enteredPass.length < 3) {
      setCnaeDeletePasswordError('A senha pessoal deve conter no mínimo 3 caracteres.');
      return;
    }

    // Remoção autorizada com senha
    const updated = cnaeList.filter((_, idx) => idx !== cnaeToDeleteIndex).join('\n');
    setCnaePrincipalInput(updated);
    setIsDeletingModalOpen(false);
    setCnaeToDeleteIndex(null);
    setCnaeDeletePasswordInput('');
    setCnaeDeletePasswordError(null);
  };
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" />
            <span>{editingId ? 'Editar Alvará Sanitário' : 'Novo Cadastro & Emissão de Alvará Sanitário'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            Formulário oficial com os 9 campos obrigatórios, vinculação com o Google Docs e assinatura digital.
          </p>
        </div>

        {/* Seleção rápida do modelo em botões */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Predefinir:</span>
          {MODELOS_DISPONIVEIS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelectModeloParaCadastro(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition flex items-center gap-1.5 cursor-pointer border ${
                categoriaInput === m.id
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{m.icone}</span>
              <span>{m.titulo}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Identificação Básica */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
              Nº Alvará *
            </label>
            <input
              type="text"
              value={numeroAlvaraInput}
              onChange={(e) => setNumeroAlvaraInput(e.target.value)}
              placeholder="Ex: 00142"
              required
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
              Ano Exercício *
            </label>
            <input
              type="number"
              value={anoExercicioInput}
              onChange={(e) => setAnoExercicioInput(Number(e.target.value))}
              required
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-bold focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
              Categoria / Modelo
            </label>
            <select
              value={categoriaInput}
              onChange={(e) => setCategoriaInput(e.target.value as any)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="PONTO_MILHO_CHURROS">🌽 Ponto de Milho e Churro (Orla / Ambulante)</option>
              <option value="FEIRANTE">🎪 Alvará Feirante (Feiras Livres)</option>
              <option value="GERAL">🏢 Alvará Sanitário Geral</option>
            </select>
          </div>
        </div>

        {/* 1. NOME DA PESSOA FÍSICA E/OU JURÍDICA E 2. CPF/CNPJ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                2. CPF / CNPJ *
              </label>
              <button
                type="button"
                onClick={onSearchCnpj}
                disabled={loadingCnpj}
                className="text-[10px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
                title="Consultar dados da empresa na Receita Federal ou Carteira"
              >
                <Search className="w-3 h-3" />
                <span>{loadingCnpj ? 'Buscando...' : 'Consultar CNPJ'}</span>
              </button>
            </div>
            <input
              type="text"
              value={cnpjCpfInput}
              onChange={(e) => setCnpjCpfInput(formatCpfCnpj(e.target.value))}
              placeholder="000.000.000-00 ou 00.000.000/0001-00"
              required
              maxLength={18}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {/* Indicador de padronização do documento */}
            <div className="mt-1 flex items-center justify-between text-[10px]">
              {(() => {
                const digitsCount = (cnpjCpfInput || '').replace(/\D/g, '').length;
                if (digitsCount === 11) {
                  return (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> CPF Padronizado (Pessoa Física)
                    </span>
                  );
                }
                if (digitsCount === 14) {
                  return (
                    <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> CNPJ Padronizado (Pessoa Jurídica)
                    </span>
                  );
                }
                if (digitsCount > 0) {
                  return (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {digitsCount <= 11
                        ? `Padronizando CPF (${digitsCount}/11 dígitos)`
                        : `Padronizando CNPJ (${digitsCount}/14 dígitos)`}
                    </span>
                  );
                }
                return (
                  <span className="text-slate-400 dark:text-slate-500">
                    Filtro ativo: formatação automática
                  </span>
                );
              })()}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
              1. NOME DA PESSOA FÍSICA OU JURÍDICA *
            </label>
            <input
              type="text"
              value={razaoSocialInput}
              onChange={(e) => setRazaoSocialInput(e.target.value)}
              placeholder="Nome civil ou Razão Social"
              required
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white uppercase font-bold focus:outline-none"
            />
          </div>

          {/* 3. DENOMINAÇÃO COMERCIAL/NOME FANTASIA */}
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
              3. DENOMINAÇÃO COMERCIAL / FANTASIA
            </label>
            <input
              type="text"
              value={nomeFantasiaInput}
              onChange={(e) => setNomeFantasiaInput(e.target.value)}
              placeholder="Nome do ponto de venda, banca ou fantasia"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white uppercase focus:outline-none"
            />
          </div>
        </div>

        {/* Endereço e Localização */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
              4. ENDEREÇO *
            </label>
            <input
              type="text"
              value={enderecoInput}
              onChange={(e) => setEnderecoInput(e.target.value)}
              placeholder="Rua, Avenida, Praça ou Ponto da Feira/Praia"
              required
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white uppercase focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
              5. Nº / COMPLEMENTO / SALA
            </label>
            <input
              type="text"
              value={numeroComplementoInput}
              onChange={(e) => setNumeroComplementoInput(e.target.value)}
              placeholder="Ex: S/N / PONTO 12"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white uppercase focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
              6. BAIRRO
            </label>
            <input
              type="text"
              value={bairroInput}
              onChange={(e) => setBairroInput(e.target.value)}
              placeholder="Ex: Centro, Barra, Nações"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white uppercase focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
              7. CEP
            </label>
            <input
              type="text"
              value={cepInput}
              onChange={(e) => setCepInput(e.target.value)}
              placeholder="88330-000"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
              8. EMISSÃO
            </label>
            <input
              type="date"
              value={dataEmissaoInput}
              onChange={(e) => setDataEmissaoInput(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-bold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-purple-700 dark:text-purple-300 mb-1">
              9. PASTA (ARQUIVO/FÍSICA)
            </label>
            <input
              type="text"
              value={pastaInput}
              onChange={(e) => setPastaInput(e.target.value)}
              placeholder="Ex: PASTA 142/MILHO"
              className="w-full px-3.5 py-2 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-300 dark:border-purple-800 rounded-xl text-xs text-slate-900 dark:text-white uppercase font-bold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-300 mb-1">
              Válido Até *
            </label>
            <input
              type="date"
              value={validadeInput}
              onChange={(e) => setValidadeInput(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-slate-900 dark:text-white font-bold focus:outline-none"
            />
          </div>
        </div>

        {/* Atividades / Códigos CNAE em Lista Vertical */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>Atividade / Códigos CNAE do Alvará</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                {cnaeList.length} {cnaeList.length === 1 ? 'atividade' : 'atividades'}
              </span>
            </label>
            <span className="text-[10px] text-slate-400">
              Pesquise ou digite o código da atividade e clique em OK para incluir
            </span>
          </div>

          {/* Campo para o servidor pesquisar e dar o OK para entrar */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={cnaeSearchInput}
                  onChange={(e) => {
                    setCnaeSearchInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCnae(cnaeSearchInput);
                    }
                  }}
                  placeholder="Pesquisar CNAE ou digitar código/descrição (ex: 5612, milho, churros, restaurante, feirante)..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={() => handleAddCnae(cnaeSearchInput)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-blue-600/20 cursor-pointer shrink-0"
                title="Inserir atividade no alvará"
              >
                <Check className="w-3.5 h-3.5" />
                <span>OK</span>
              </button>
            </div>

            {/* Dropdown de sugestões rápidas ao digitar ou focar */}
            {showSuggestions && filteredCnaes.length > 0 && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSuggestions(false)}
                />
                <div className="absolute left-0 right-16 mt-1.5 max-h-56 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 divide-y divide-slate-100 dark:divide-slate-700/50">
                  <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                    <span>Sugestões CNAE VISA Balneário Camboriú</span>
                    <button
                      type="button"
                      onClick={() => setShowSuggestions(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  {filteredCnaes.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        handleAddCnae(sug);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-300 font-medium transition cursor-pointer flex items-center justify-between group"
                    >
                      <span className="truncate pr-2">{sug}</span>
                      <span className="text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 font-bold shrink-0">
                        + Incluir
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Feedback de erro caso tente inserir duplicado ou vazio */}
          {cnaeError && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{cnaeError}</span>
            </div>
          )}

          {/* Lista de CNAEs uma embaixo da outra */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-3 space-y-2">
            {cnaeList.length === 0 ? (
              <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                <p className="font-semibold">Nenhuma atividade CNAE cadastrada ainda.</p>
                <p className="text-[11px] mt-0.5">
                  Pesquise ou digite o código da atividade acima e pressione o botão <strong>OK</strong> para adicionar.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {cnaeList.map((cnaeItem, index) => {
                  const isPrincipal = index === 0;
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-3 p-2.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl shadow-xs transition hover:border-slate-300 dark:hover:border-slate-600"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 ${
                            isPrincipal
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {isPrincipal ? 'Principal' : `#${index + 1}`}
                        </span>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {cnaeItem}
                        </p>
                      </div>

                      {/* Botão X para excluir com a senha pessoal */}
                      <button
                        type="button"
                        onClick={() => handleRequestDeleteCnae(index)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 border border-transparent hover:border-red-200 dark:hover:border-red-900/50 transition cursor-pointer shrink-0"
                        title="Excluir atividade com a senha pessoal"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Condicionantes Sanitárias */}
        <div>
          <label className="block text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
            Condicionantes Sanitárias Impressas no Alvará
          </label>
          <textarea
            rows={3}
            value={condicionantesInput}
            onChange={(e) => setCondicionantesInput(e.target.value)}
            placeholder="Observações sanitárias ou exigências regulamentares para o ponto ou barraca..."
            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
          />
        </div>

        {/* Vínculo Específico com o Google Docs deste Alvará */}
        <div className="p-4 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-2xl space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="block text-[11px] font-black uppercase text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Documento Oficial no Google Docs (Link Compartilhado deste Alvará)</span>
            </label>
            <div className="flex items-center gap-2">
              {googleDocsTemplateUrl && (
                <button
                  type="button"
                  onClick={() => setModeloDocUrlInput(googleDocsTemplateUrl)}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                >
                  Usar Link Padrão
                </button>
              )}
              {modeloDocUrlInput && (
                <a
                  href={getGoogleDocsEditUrl(modeloDocUrlInput)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5"
                >
                  <span>Testar Link</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>
          <input
            type="url"
            value={modeloDocUrlInput}
            onChange={(e) => setModeloDocUrlInput(e.target.value)}
            placeholder={googleDocsTemplateUrl || 'https://docs.google.com/document/d/...'}
            className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Se deixar em branco, o sistema usará o link padrão ativo configurado no <strong>Módulo 3: Documento Docs</strong>.
          </p>
        </div>

        {/* Botões do Formulário */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Voltar à Lista
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <Lock className="w-4 h-4" />
            <span>{editingId ? 'Salvar & Assinar Digitalmente' : 'Emitir, Assinar & Cadastrar Alvará'}</span>
          </button>
        </div>
      </form>

      {/* Modal de confirmação de exclusão de CNAE com senha pessoal */}
      {isDeletingModalOpen && cnaeToDeleteIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-black text-sm uppercase">
                <ShieldAlert className="w-5 h-5" />
                <span>Excluir Atividade / CNAE</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDeletingModalOpen(false);
                  setCnaeToDeleteIndex(null);
                  setCnaeDeletePasswordInput('');
                  setCnaeDeletePasswordError(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Por segurança e auditoria da Vigilância Sanitária, informe sua <strong>senha pessoal de servidor</strong> para excluir esta atividade do alvará:
              </p>
              <div className="p-3 bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl text-xs font-bold text-red-900 dark:text-red-300">
                {cnaeList[cnaeToDeleteIndex]}
              </div>
            </div>

            <form onSubmit={handleConfirmDeleteCnae} className="space-y-4 pt-1">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sua Senha Pessoal *</span>
                </label>
                <input
                  type="password"
                  value={cnaeDeletePasswordInput}
                  onChange={(e) => {
                    setCnaeDeletePasswordInput(e.target.value);
                    if (cnaeDeletePasswordError) setCnaeDeletePasswordError(null);
                  }}
                  autoFocus
                  placeholder="Digite sua senha de servidor..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/30 font-mono"
                />
                {cnaeDeletePasswordError && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{cnaeDeletePasswordError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeletingModalOpen(false);
                    setCnaeToDeleteIndex(null);
                    setCnaeDeletePasswordInput('');
                    setCnaeDeletePasswordError(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase rounded-xl transition flex items-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirmar & Excluir</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
