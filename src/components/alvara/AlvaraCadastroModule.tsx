import React from 'react';
import {
  Plus,
  Building2,
  Search,
  ExternalLink,
  Lock,
  FileText,
  Sparkles,
  Link2
} from 'lucide-react';
import { AlvaraSanitarioItem } from '../../types';
import { ModeloAlvaraDef, MODELOS_DISPONIVEIS, getGoogleDocsEditUrl } from './alvaraUtils';

interface AlvaraCadastroModuleProps {
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
            <label className="block text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>2. CPF / CNPJ *</span>
              <button
                type="button"
                onClick={onSearchCnpj}
                disabled={loadingCnpj}
                className="text-[10px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Search className="w-3 h-3" />
                <span>{loadingCnpj ? 'Buscando...' : 'Consultar CNPJ'}</span>
              </button>
            </label>
            <input
              type="text"
              value={cnpjCpfInput}
              onChange={(e) => setCnpjCpfInput(e.target.value)}
              placeholder="000.000.000-00 ou 00.000.000/0001-00"
              required
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
            />
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

        {/* Atividade / CNAE */}
        <div>
          <label className="block text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
            Atividade / Código CNAE Principal
          </label>
          <input
            type="text"
            value={cnaePrincipalInput}
            onChange={(e) => setCnaePrincipalInput(e.target.value)}
            placeholder="Código e denominação da atividade"
            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white uppercase focus:outline-none"
          />
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
    </div>
  );
}
