import React, { useState, useEffect } from 'react';
import { FeiranteItem } from '../types';
import { BAIRROS_BC } from '../data/mockData';
import { fetchCnpj } from '../lib/cnpjService';
import { ConfirmModal } from './ConfirmModal';
import { Plus, Edit2, Search, X, Check, RefreshCw, FileSpreadsheet, ExternalLink, Settings, Store, CheckCircle, AlertTriangle, AlertCircle, Copy, HelpCircle, Trash2 } from 'lucide-react';
import {
  fetchFeirantesFromSheets,
  saveFeiranteToSheets,
  getSheetsWebhookUrl,
  setSheetsWebhookUrl,
  testSheetsWebhook
} from '../lib/googleSheetsService';

interface FeirasViewProps {
  feiras: FeiranteItem[];
  onSaveFeirante: (item: FeiranteItem) => void;
  onDeleteFeirante?: (id: string) => void;
  onSyncFeirantesFromSheets?: (items: FeiranteItem[]) => void;
}

export const FeirasView: React.FC<FeirasViewProps> = ({
  feiras,
  onSaveFeirante,
  onDeleteFeirante,
  onSyncFeirantesFromSheets
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [sheetsNotice, setSheetsNotice] = useState<string | null>(null);
  const [configUrlModal, setConfigUrlModal] = useState(false);
  const [webhookUrlInput, setWebhookUrlInput] = useState(() => getSheetsWebhookUrl());
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  // Confirmation Modal State
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    feiranteId: string;
    feiranteDesc: string;
  }>({
    isOpen: false,
    feiranteId: '',
    feiranteDesc: ''
  });

  // Sincronização inicial ao carregar a tela
  useEffect(() => {
    handleSyncFromSheets(true);
  }, []);

  const handleSyncFromSheets = async (silent = false) => {
    setSyncingSheets(true);
    try {
      const dataFromSheets = await fetchFeirantesFromSheets();
      if (dataFromSheets && dataFromSheets.length > 0) {
        if (onSyncFeirantesFromSheets) {
          onSyncFeirantesFromSheets(dataFromSheets);
        }
        if (!silent) {
          setSheetsNotice(`✨ ${dataFromSheets.length} feirantes sincronizados diretamente do Google Sheets!`);
          setTimeout(() => setSheetsNotice(null), 4000);
        }
      } else if (!silent) {
        setSheetsNotice('⚠️ A planilha não retornou registros válidos. Clique na engrenagem ao lado para testar a URL do Webhook do Google Apps Script.');
        setTimeout(() => setSheetsNotice(null), 6000);
      }
    } catch (e) {
      if (!silent) {
        setSheetsNotice('⚠️ Erro ao consultar Webhook. Verifique a URL na engrenagem de configurações.');
        setTimeout(() => setSheetsNotice(null), 5000);
      }
    } finally {
      setSyncingSheets(false);
    }
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setTestResult(null);
    try {
      const res = await testSheetsWebhook(webhookUrlInput);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Erro: ${err?.message || 'Falha ao testar conexão'}`
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleSaveWebhookUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setSheetsWebhookUrl(webhookUrlInput);
    setConfigUrlModal(false);
    setSheetsNotice('URL do Webhook do Google Sheets atualizada!');
    setTimeout(() => setSheetsNotice(null), 3000);
    handleSyncFromSheets(false);
  };

  const [formItem, setFormItem] = useState<Partial<FeiranteItem>>({
    id: '',
    data_prot: '',
    num_prot: '',
    feira: '',
    pasta: '',
    cpf: '',
    nome_pf: '',
    produtos: '',
    validade: '',
    rua: '',
    num: '',
    bairro: 'Centro',
    vinculo: 'NÃO',
    func: '1',
    abertura: '',
    cnpj: '',
    razao: '',
    rua_api: '',
    num_api: '',
    municipio: 'BALNEÁRIO CAMBORIÚ',
    estado: 'SC',
    cnae: '',
    alvara: 'SIM'
  });

  const [selectedFeirasOpts, setSelectedFeirasOpts] = useState<string[]>([]);

  const openNewForm = () => {
    setFormItem({
      id: '',
      data_prot: new Date().toISOString().split('T')[0],
      num_prot: `2026/${Math.floor(1000 + Math.random() * 9000)}`,
      feira: '',
      pasta: 'A-01',
      cpf: '',
      nome_pf: '',
      produtos: '',
      validade: '2026-12-31',
      rua: '',
      num: '',
      bairro: 'Centro',
      vinculo: 'NÃO',
      func: '1',
      abertura: new Date().getFullYear().toString(),
      cnpj: '',
      razao: '',
      rua_api: '',
      num_api: '',
      municipio: 'BALNEÁRIO CAMBORIÚ',
      estado: 'SC',
      cnae: '',
      alvara: 'SIM'
    });
    setSelectedFeirasOpts([]);
    setModalOpen(true);
  };

  const openEditForm = (item: FeiranteItem) => {
    setFormItem(item);
    const opts = item.feira ? item.feira.split(', ').map((s) => s.trim()) : [];
    setSelectedFeirasOpts(opts);
    setModalOpen(true);
  };

  const toggleFeiraOpt = (val: string) => {
    const exists = selectedFeirasOpts.some((x) => x.toLowerCase() === val.toLowerCase());
    if (exists) {
      setSelectedFeirasOpts(selectedFeirasOpts.filter((x) => x.toLowerCase() !== val.toLowerCase()));
    } else {
      setSelectedFeirasOpts([...selectedFeirasOpts, val]);
    }
  };

  const handleBuscarCNPJ = async () => {
    const rawVal = formItem.cnpj || '';
    const cleanVal = rawVal.replace(/\D/g, '');
    if (!cleanVal) return;

    setLoadingCnpj(true);
    try {
      const d = await fetchCnpj(cleanVal);
      setFormItem((prev) => ({
        ...prev,
        razao: d.razao || `ESTABELECIMENTO (${cleanVal}) LTDA`,
        nome_pf: d.responsavel || d.razao || prev.nome_pf || 'PROPRIETÁRIO CADASTRADO',
        municipio: d.municipio || 'BALNEÁRIO CAMBORIÚ',
        estado: d.estado || 'SC',
        rua_api: d.rua_api || 'AVENIDA BRASIL',
        num_api: d.num_api || '100',
        bairro: d.bairro || 'Centro',
        cnae: d.cnae || '5611-2/01 Serviços de Alimentação'
      }));
    } catch {
      setFormItem((prev) => ({
        ...prev,
        razao: `ESTABELECIMENTO (${cleanVal}) LTDA`,
        rua_api: 'AVENIDA BRASIL',
        num_api: '100',
        municipio: 'BALNEÁRIO CAMBORIÚ',
        estado: 'SC'
      }));
    } finally {
      setLoadingCnpj(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const idToUse = formItem.id || String(Date.now());
    const feiraStr = selectedFeirasOpts.join(', ');

    const updated: FeiranteItem = {
      id: idToUse,
      data_prot: formItem.data_prot || '',
      num_prot: formItem.num_prot || '',
      feira: feiraStr,
      pasta: formItem.pasta || '',
      cpf: formItem.cpf || '',
      nome_pf: formItem.nome_pf || '',
      produtos: formItem.produtos || '',
      validade: formItem.validade || '',
      rua: formItem.rua || '',
      num: formItem.num || '',
      bairro: formItem.bairro || 'Centro',
      vinculo: formItem.vinculo || 'NÃO',
      func: formItem.func || '',
      abertura: formItem.abertura || '',
      cnpj: formItem.cnpj || '',
      razao: formItem.razao || '',
      rua_api: formItem.rua_api || '',
      num_api: formItem.num_api || '',
      municipio: formItem.municipio || 'BALNEÁRIO CAMBORIÚ',
      estado: formItem.estado || 'SC',
      cnae: formItem.cnae || '',
      alvara: formItem.alvara || 'SIM'
    };

    onSaveFeirante(updated);

    // Salva no Google Sheets via Webhook
    const savedSheets = await saveFeiranteToSheets(updated);
    if (savedSheets) {
      setSheetsNotice(`✅ Feirante "${updated.nome_pf}" salvo com sucesso no Google Sheets!`);
    } else {
      setSheetsNotice(`💾 Feirante "${updated.nome_pf}" salvo localmente!`);
    }
    setTimeout(() => setSheetsNotice(null), 4000);

    setModalOpen(false);
  };

  const filteredFeiras = feiras.filter(
    (f) =>
      f.nome_pf.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.num_prot.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.produtos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.feira.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-left">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-blue-600 dark:text-blue-400 uppercase italic flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="h-10 w-10 fill-blue-600 dark:fill-blue-400">
              <path d="M12 2L2 7v2h20V7L12 2zm-7.5 9v11h3V11h-3zm6 0v11h3V11h-3zm6 0v11h3V11h-3z" />
            </svg>
            Gestão de Feiras e Ambulantes
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1 flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Sincronizado automaticamente com a Planilha Google Sheets
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          <div className="relative flex-1 md:w-56">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar feirante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full text-xs"
            />
          </div>

          {/* Sincronizar com Google Sheets */}
          <button
            type="button"
            onClick={() => handleSyncFromSheets(false)}
            disabled={syncingSheets}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-3 rounded-2xl shadow uppercase text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            title="Atualizar dados da planilha do Google Sheets"
          >
            <RefreshCw className={`w-4 h-4 ${syncingSheets ? 'animate-spin' : ''}`} />
            {syncingSheets ? 'Sincronizando...' : 'Google Sheets'}
          </button>

          {/* Configurar Webhook URL */}
          <button
            type="button"
            onClick={() => setConfigUrlModal(true)}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold p-3 rounded-2xl transition cursor-pointer shrink-0"
            title="Configurar URL do Webhook do Google Sheets"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={openNewForm}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black px-5 py-3 rounded-2xl shadow-lg uppercase text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" /> Novo Cadastro
          </button>
        </div>
      </div>

      {sheetsNotice && (
        <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 rounded-2xl text-xs font-bold transition flex items-center justify-between">
          <span>{sheetsNotice}</span>
          <button onClick={() => setSheetsNotice(null)} className="text-emerald-700 dark:text-emerald-400 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-sm text-center">
        <table className="w-full text-left text-[10px] whitespace-nowrap">
          <thead className="bg-slate-100 dark:bg-slate-800 font-black uppercase text-slate-900 dark:text-slate-100 text-[11px]">
            <tr>
              <th className="p-3 text-center">ID</th>
              <th className="p-3">Data Prot.</th>
              <th className="p-3">Nº Prot.</th>
              <th className="p-3">Feiras Autorizadas</th>
              <th className="p-3">Pasta</th>
              <th className="p-3">Feirante</th>
              <th className="p-3">Produtos</th>
              <th className="p-3">Validade</th>
              <th className="p-3">Rua / Local</th>
              <th className="p-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredFeiras.length > 0 ? (
              filteredFeiras.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => openEditForm(r)}
                  className="hover:bg-blue-50 dark:hover:bg-slate-800 border-b dark:border-slate-800 cursor-pointer transition-colors text-left"
                >
                  <td className="p-3 text-[10px] text-slate-500 text-center font-mono">{r.id}</td>
                  <td className="p-3 text-[10px]">{r.data_prot}</td>
                  <td className="p-3 text-[10px] font-bold text-blue-600 dark:text-blue-400">{r.num_prot}</td>
                  <td className="p-3 text-[10px] font-bold text-amber-600 uppercase">{r.feira || '---'}</td>
                  <td className="p-3 text-[10px] font-bold">{r.pasta}</td>
                  <td className="p-3 text-[10px] font-bold uppercase">{r.nome_pf}</td>
                  <td className="p-3 text-[10px] truncate max-w-[150px]">{r.produtos}</td>
                  <td className="p-3 text-[10px]">{r.validade}</td>
                  <td className="p-3 text-[10px]">{r.rua || '---'}</td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditForm(r);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-bold p-1 rounded hover:bg-blue-50 dark:hover:bg-slate-700 transition"
                        title="Editar feirante"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {onDeleteFeirante && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete({
                              isOpen: true,
                              feiranteId: r.id,
                              feiranteDesc: `${r.nome_pf} (${r.feira || 'Feira'}) • Pasta: ${r.pasta}`
                            });
                          }}
                          className="text-rose-500 hover:text-rose-700 font-bold p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Excluir feirante"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-500 italic">
                  Nenhum feirante encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-3 md:p-4">
          <div className="bg-[#EAEAEA] dark:bg-slate-900 w-full max-w-5xl max-h-[95vh] overflow-y-auto rounded-xl shadow-2xl border border-slate-300 dark:border-slate-700 p-4 md:p-6 text-slate-900 dark:text-white">
            <div className="flex justify-between items-center mb-4 bg-white dark:bg-slate-800 p-3 rounded border border-slate-300 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="bg-blue-600 text-white p-2 rounded">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                    {formItem.id ? 'Editar Cadastro de Feirante' : 'Novo Cadastro de Feirante'}
                  </h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                    Vigilância Sanitária • Município de Balneário Camboriú
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-red-500 font-black text-xl px-2 py-1 rounded transition cursor-pointer"
                title="Fechar formulário"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-left">
              <input type="hidden" value={formItem.id || ''} />

              {/* BLOCO 1: PROTOCOLO E PASTA VISA */}
              <div className="bg-white dark:bg-slate-800 p-3.5 rounded border border-slate-300 dark:border-slate-700 shadow-sm space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5 mb-1">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">1</span>
                    <span>1. PROTOCOLO & LOCALIZAÇÃO</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 mb-0.5">
                      DATA PROTOCOLO
                    </label>
                    <input
                      type="date"
                      value={formItem.data_prot || ''}
                      onChange={(e) => setFormItem({ ...formItem, data_prot: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs py-1.5 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 mb-0.5">
                      Nº PROTOCOLO
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 2026/00123"
                      value={formItem.num_prot || ''}
                      onChange={(e) => setFormItem({ ...formItem, num_prot: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs py-1.5 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold uppercase font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 mb-0.5">
                      PASTA VISA
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: P-01"
                      value={formItem.pasta || ''}
                      onChange={(e) => setFormItem({ ...formItem, pasta: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs py-1.5 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold uppercase font-mono"
                    />
                  </div>

                  <div className="md:col-span-6 bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-200 dark:border-slate-700">
                    <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase block mb-1">
                      FEIRAS AUTORIZADAS / SETOR
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {['CULTURA', 'PESCADOR', 'ORLA', 'RUA 200'].map((fOpt) => (
                        <label key={fOpt} className="flex items-center gap-1.5 text-[11px] font-extrabold cursor-pointer bg-white dark:bg-slate-800 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 hover:border-blue-500 transition text-slate-800 dark:text-slate-200 whitespace-nowrap flex-shrink-0 select-none shadow-xs">
                          <input
                            type="checkbox"
                            checked={selectedFeirasOpts.some((x) => x.toLowerCase() === fOpt.toLowerCase())}
                            onChange={() => toggleFeiraOpt(fOpt)}
                            className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="uppercase whitespace-nowrap">{fOpt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* BLOCO 2: PESSOA FÍSICA / FEIRANTE */}
              <div className="bg-white dark:bg-slate-800 p-3.5 rounded border border-slate-300 dark:border-slate-700 shadow-sm space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5 mb-1">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">2</span>
                    <span>2. DADOS DA PESSOA FÍSICA / FEIRANTE</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 mb-0.5">
                      CPF FEIRANTE
                    </label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={formItem.cpf || ''}
                      onChange={(e) => setFormItem({ ...formItem, cpf: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs py-1.5 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 mb-0.5">
                      NOME COMPLETO *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nome do Feirante Responsável"
                      value={formItem.nome_pf || ''}
                      onChange={(e) => setFormItem({ ...formItem, nome_pf: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs py-1.5 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold uppercase"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 mb-0.5">
                      PRODUTOS AUTORIZADOS
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Artesanatos, Pães, Pasteis..."
                      value={formItem.produtos || ''}
                      onChange={(e) => setFormItem({ ...formItem, produtos: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs py-1.5 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-medium uppercase"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 mb-0.5">
                      VALIDADE AUT.
                    </label>
                    <input
                      type="date"
                      value={formItem.validade || ''}
                      onChange={(e) => setFormItem({ ...formItem, validade: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs py-1.5 px-1.5 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-4">
                    <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 mb-0.5">
                      ENDEREÇO PF
                    </label>
                    <input
                      type="text"
                      placeholder="Rua ou avenida do feirante..."
                      value={formItem.rua || ''}
                      onChange={(e) => setFormItem({ ...formItem, rua: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs py-1.5 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none uppercase font-medium"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 mb-0.5">
                      Nº / COMPL. PF
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 100, Apto 201"
                      value={formItem.num || ''}
                      onChange={(e) => setFormItem({ ...formItem, num: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs py-1.5 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none uppercase font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 mb-0.5">
                      BAIRRO PF
                    </label>
                    <select
                      value={formItem.bairro || 'Centro'}
                      onChange={(e) => setFormItem({ ...formItem, bairro: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs py-1.5 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                    >
                      {BAIRROS_BC.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 mb-0.5">
                      VÍNCULO COMERCIAL
                    </label>
                    <select
                      value={formItem.vinculo || 'NÃO'}
                      onChange={(e) => setFormItem({ ...formItem, vinculo: e.target.value as 'SIM' | 'NÃO' })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs py-1.5 px-1.5 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                    >
                      <option value="NÃO">NÃO - Somente PF</option>
                      <option value="SIM">SIM - Possui CNPJ/PJ</option>
                    </select>
                  </div>

                  <div className="sm:col-span-1">
                    <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 mb-0.5">
                      FUNC.
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="1"
                      value={formItem.func || ''}
                      onChange={(e) => setFormItem({ ...formItem, func: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs py-1.5 px-1 rounded focus:ring-2 focus:ring-blue-500 outline-none text-center font-bold"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 mb-0.5">
                      ANO
                    </label>
                    <input
                      type="number"
                      placeholder="2026"
                      value={formItem.abertura || ''}
                      onChange={(e) => setFormItem({ ...formItem, abertura: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs py-1.5 px-1 rounded focus:ring-2 focus:ring-blue-500 outline-none text-center font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* BLOCO 3: PESSOA JURÍDICA / EMPRESA (Apenas se Vínculo Comercial for SIM) */}
              {formItem.vinculo === 'SIM' && (
                <div className="bg-white dark:bg-slate-800 p-3.5 rounded border border-slate-300 dark:border-slate-700 shadow-sm space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5 mb-1">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="bg-amber-600 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">3</span>
                      <span>3. DADOS DA PESSOA JURÍDICA / EMPRESA</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 mb-0.5">
                        CNPJ DA EMPRESA
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={formItem.cnpj || ''}
                          onChange={(e) => setFormItem({ ...formItem, cnpj: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleBuscarCNPJ();
                            }
                          }}
                          onBlur={() => {
                            if ((formItem.cnpj || '').replace(/\D/g, '').length >= 11 && !formItem.razao) {
                              handleBuscarCNPJ();
                            }
                          }}
                          placeholder="00.000.000/0001-00"
                          className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs py-1.5 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
                        />
                        <button
                          type="button"
                          onClick={handleBuscarCNPJ}
                          disabled={loadingCnpj}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-2.5 py-1 rounded transition flex items-center gap-1 shrink-0 h-[30px] cursor-pointer shadow"
                          title="Buscar dados na Receita Federal"
                        >
                          {loadingCnpj ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                          <span>API</span>
                        </button>
                      </div>
                    </div>

                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 mb-0.5">
                        RAZÃO SOCIAL / FANTASIA
                      </label>
                      <input
                        type="text"
                        placeholder="Razão Social ou Nome Fantasia da Empresa"
                        value={formItem.razao || ''}
                        onChange={(e) => setFormItem({ ...formItem, razao: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs py-1.5 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold uppercase"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 mb-0.5">
                        ENDEREÇO PJ
                      </label>
                      <input
                        type="text"
                        placeholder="Rua da Empresa - Importado via CNPJ"
                        value={formItem.rua_api || ''}
                        onChange={(e) => setFormItem({ ...formItem, rua_api: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs py-1.5 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-medium uppercase"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 mb-0.5">
                        Nº / COMPL. PJ
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 500, Sala 02"
                        value={formItem.num_api || ''}
                        onChange={(e) => setFormItem({ ...formItem, num_api: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs py-1.5 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-semibold uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 mb-0.5">
                        MUNICÍPIO PJ
                      </label>
                      <input
                        type="text"
                        placeholder="BALNEÁRIO CAMBORIÚ"
                        value={formItem.municipio || ''}
                        onChange={(e) => setFormItem({ ...formItem, municipio: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs py-1.5 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold uppercase"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 mb-0.5">
                        ESTADO / UF
                      </label>
                      <input
                        type="text"
                        placeholder="SC"
                        value={formItem.estado || ''}
                        onChange={(e) => setFormItem({ ...formItem, estado: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs py-1.5 px-1 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold uppercase text-center"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 mb-0.5">
                        CNAE PRINCIPAL / ATIVIDADE
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 5611-2/01 Serviços de alimentação ambulante"
                        value={formItem.cnae || ''}
                        onChange={(e) => setFormItem({ ...formItem, cnae: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs py-1.5 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono font-medium uppercase"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 mb-0.5">
                        ALVARÁ SANITÁRIO
                      </label>
                      <select
                        value={formItem.alvara || 'SIM'}
                        onChange={(e) =>
                          setFormItem({ ...formItem, alvara: e.target.value as 'SIM' | 'NÃO' | 'EM ANDAMENTO' })
                        }
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs py-1.5 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                      >
                        <option value="SIM">SIM</option>
                        <option value="NÃO">NÃO</option>
                        <option value="EM ANDAMENTO">EM ANDAMENTO</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* BOTTOM ACTION BAR */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-300 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="bg-[#D4D4D4] hover:bg-slate-300 text-slate-900 font-extrabold text-xs px-6 py-2.5 rounded shadow transition uppercase cursor-pointer"
                  >
                    CANCELAR
                  </button>

                  {formItem.id && onDeleteFeirante && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDelete({
                          isOpen: true,
                          feiranteId: formItem.id,
                          feiranteDesc: `${formItem.nome_pf} (${formItem.feira || 'Feira'}) • Pasta: ${formItem.pasta}`
                        });
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-4 py-2.5 rounded shadow transition uppercase cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" /> EXCLUIR
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="bg-[#28783B] hover:bg-[#1e5a2c] text-white font-extrabold text-xs md:text-sm px-8 py-2.5 rounded shadow-lg transition uppercase tracking-wider cursor-pointer flex items-center gap-2 active:scale-98"
                >
                  <Check className="w-5 h-5" />
                  <span>SALVAR CADASTRO DO FEIRANTE</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Configuração do Google Sheets Webhook */}
      {configUrlModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 text-left shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3 dark:border-slate-700">
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Sincronização com Planilha Google Sheets
              </h3>
              <button onClick={() => setConfigUrlModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Conecte o sistema diretamente à sua planilha do Google Sheets através do <strong>Google Apps Script</strong> para enviar e ler todas as <strong>23 colunas (Col A a Col W)</strong> em tempo real.
            </p>

            <form onSubmit={handleSaveWebhookUrl} className="space-y-3">
              <div>
                <label className="text-xs font-black uppercase text-slate-900 dark:text-slate-100 block mb-1">
                  URL do Webhook (Google Apps Script - /exec)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={webhookUrlInput}
                    onChange={(e) => {
                      setWebhookUrlInput(e.target.value);
                      setTestResult(null);
                    }}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 text-xs font-mono p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    disabled={testingWebhook || !webhookUrlInput}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingWebhook ? 'animate-spin' : ''}`} />
                    {testingWebhook ? 'Testando...' : 'Testar Conexão'}
                  </button>
                </div>
              </div>

              {/* Resultado do Teste de Conexão */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2.5 transition ${
                    testResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold">{testResult.message}</p>
                    {!testResult.success && (
                      <p className="text-[11px] opacity-90">
                        Dica: Na hora de implantar no Google Sheets, certifique-se de escolher <strong>"Quem pode acessar: Qualquer pessoa"</strong>. Se escolher "Apenas eu", o navegador não consegue sincronizar.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Informação das 23 Colunas */}
              <div className="bg-slate-100 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] space-y-1 font-mono">
                <div className="font-black text-blue-600 dark:text-blue-400 uppercase text-[10px]">
                  📋 Ordem Exata das 23 Colunas da Planilha (A a W):
                </div>
                <div className="text-slate-600 dark:text-slate-400 leading-relaxed text-[10.5px]">
                  <strong>A:</strong> ID • <strong>B:</strong> Data Prot • <strong>C:</strong> Nº Prot • <strong>D:</strong> Feiras/Setor • <strong>E:</strong> Pasta VISA • <strong>F:</strong> CPF • <strong>G:</strong> Nome PF • <strong>H:</strong> Produtos • <strong>I:</strong> Validade • <strong>J:</strong> Endereço PF • <strong>K:</strong> Nº/Compl PF • <strong>L:</strong> Bairro • <strong>M:</strong> Vínculo • <strong>N:</strong> Func • <strong>O:</strong> Ano Abertura • <strong>P:</strong> CNPJ • <strong>Q:</strong> Razão/Fantasia • <strong>R:</strong> Endereço PJ • <strong>S:</strong> Nº/Compl PJ • <strong>T:</strong> Município • <strong>U:</strong> UF • <strong>V:</strong> CNAE • <strong>W:</strong> Alvará
                </div>
              </div>

              {/* Tutorial de Implantação Rápida */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="w-full bg-slate-50 dark:bg-slate-900/60 p-3 text-left font-bold text-slate-700 dark:text-slate-300 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    Como criar/atualizar a Macro na sua Planilha Google (Passo a Passo)
                  </span>
                  <span className="text-[10px] text-blue-600 uppercase font-black">
                    {showInstructions ? 'Ocultar' : 'Ver Instruções'}
                  </span>
                </button>

                {showInstructions && (
                  <div className="p-3 bg-white dark:bg-slate-800 space-y-2 text-[11px] text-slate-600 dark:text-slate-300 border-t dark:border-slate-700">
                    <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                      <li>Abra sua Planilha Google e clique no menu superior <strong>Extensões &gt; Apps Script</strong>.</li>
                      <li>Apague o código que estiver no editor e cole o código da Macro (botão abaixo).</li>
                      <li>Clique em <strong>Implantar &gt; Nova implantação</strong> (ícone azul no topo).</li>
                      <li>Clique na engrenagem ao lado de "Selecione o tipo" e escolha <strong>Aplicativo da Web</strong>.</li>
                      <li>Em <em>"Executar como"</em>, deixe <strong>Eu (seu email)</strong>.</li>
                      <li>Em <em>"Quem pode acessar"</em>, selecione <strong>Qualquer pessoa</strong> <span className="text-red-500 font-bold">(Obrigatório)</span>.</li>
                      <li>Clique em <strong>Implantar</strong>, autorize as permissões e copie a <strong>URL do Aplicativo da Web</strong> que termina com <code>/exec</code>.</li>
                      <li>Cole a URL acima e clique em <strong>Testar Conexão</strong>!</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Código Apps Script para Copiar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                    Código Oficial da Macro (Apps Script - Código.gs):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const code = `/**
 * GOOGLE APPS SCRIPT - VIGILÂNCIA SANITÁRIA BC
 * Macro Oficial: Feirantes e Ambulantes (23 Colunas A a W)
 */

function doPost(e) {
  return handleRequest(e);
}

function doGet(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("FEIRAS") || 
                ss.getSheetByName("FEIRANTES") || 
                ss.getSheetByName("Feirantes") || 
                ss.getSheetByName("Feiras") || 
                ss.getActiveSheet() || 
                ss.getSheets()[0];
    
    var params = {};
    if (e && e.parameter) {
      for (var k in e.parameter) params[k] = e.parameter[k];
    }
    if (e && e.postData && e.postData.contents) {
      try {
        var j = JSON.parse(e.postData.contents);
        for (var key in j) params[key] = j[key];
      } catch(err) {
        try {
          var pairs = e.postData.contents.split('&');
          for (var p = 0; p < pairs.length; p++) {
            var pair = pairs[p].split('=');
            if (pair.length === 2) {
              params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1].replace(/\\+/g, ' '));
            }
          }
        } catch(err2){}
      }
    }
    
    var action = params.action || "";
    
    // 1. LER DADOS DA PLANILHA (GET / SINCRONIZAR)
    if (action === "getFeirantes" || (!action && !params.nome_pf && !params.cpf && !params.row && !params.id)) {
      var data = sheet.getDataRange().getValues();
      var rows = [];
      for (var i = 1; i < data.length; i++) {
        var r = data[i];
        if (!r[0] && !r[1] && !r[5] && !r[6]) continue;
        rows.push({
          id: String(r[0] || ("sheet-" + i)),
          data_prot: formatDateBR(r[1]),
          num_prot: String(r[2] || ""),
          feira: String(r[3] || ""),
          pasta: String(r[4] || ""),
          cpf: String(r[5] || ""),
          nome_pf: String(r[6] || ""),
          produtos: String(r[7] || ""),
          validade: formatDateBR(r[8]),
          rua: String(r[9] || ""),
          num: String(r[10] || ""),
          bairro: String(r[11] || "Centro"),
          vinculo: String(r[12] || "NÃO"),
          func: String(r[13] || "1"),
          abertura: String(r[14] || ""),
          cnpj: String(r[15] || ""),
          razao: String(r[16] || ""),
          rua_api: String(r[17] || ""),
          num_api: String(r[18] || ""),
          municipio: String(r[19] || "BALNEÁRIO CAMBORIÚ"),
          estado: String(r[20] || "SC"),
          cnae: String(r[21] || ""),
          alvara: String(r[22] || "SIM")
        });
      }
      return ContentService.createTextOutput(JSON.stringify(rows)).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. SALVAR / ATUALIZAR FEIRANTE (23 COLUNAS)
    var id = String(params.id || new Date().getTime());
    var data_prot = formatDateBR(params.data_prot || params.data_protocolo || params.DATA_PROT || "");
    var num_prot = String(params.num_prot || params.num_protocolo || params.NUM_PROT || "");
    var feira = String(params.feira || params.feiras || params.setor || params.FEIRA || "");
    var pasta = String(params.pasta || params.pasta_visa || params.pastaVisa || params.PASTA || "");
    var cpf = String(params.cpf || params.CPF || "");
    var nome_pf = String(params.nome_pf || params.nomePf || params.NOME_PF || params.nome || "");
    var produtos = String(params.produtos || params.PRODUTOS || "");
    var validade = formatDateBR(params.validade || params.VALIDADE || "");
    var rua = String(params.rua || params.endereco_rua || params.endereco || params.RUA || "");
    var num = String(params.num || params.num_complemento || params.numero || params.NUM || "");
    var bairro = String(params.bairro || params.BAIRRO || "Centro");
    var vinculo = String(params.vinculo || params.VINCULO || "NÃO");
    var func = String(params.func || params.num_func || params.FUNC || "1");
    var abertura = String(params.abertura || params.ano_abertura || params.ano || params.ANO || "");
    var cnpj = String(params.cnpj || params.CNPJ || "");
    var razao = String(params.razao || params.nome_pj_api || params.razao_social || params.nome_fantasia || params.RAZAO || "");
    var rua_api = String(params.rua_api || params.endereco_pj || params.RUA_API || "");
    var num_api = String(params.num_api || params.num_comp_api || params.NUM_API || "");
    var municipio = String(params.municipio || params.MUNICIPIO || "BALNEÁRIO CAMBORIÚ");
    var estado = String(params.estado || params.ESTADO || params.uf || "SC");
    var cnae = String(params.cnae || params.cnae_api || params.CNAE || "");
    var alvara = String(params.alvara || params.alvara_sanitario || params.ALVARA || "SIM");

    if (params.row && Array.isArray(params.row) && params.row.length >= 20) {
      var r = params.row;
      id = r[0] ? String(r[0]) : id;
      data_prot = r[1] ? formatDateBR(r[1]) : data_prot;
      num_prot = r[2] ? String(r[2]) : num_prot;
      feira = r[3] ? String(r[3]) : feira;
      pasta = r[4] ? String(r[4]) : pasta;
      cpf = r[5] ? String(r[5]) : cpf;
      nome_pf = r[6] ? String(r[6]) : nome_pf;
      produtos = r[7] ? String(r[7]) : produtos;
      validade = r[8] ? formatDateBR(r[8]) : validade;
      rua = r[9] ? String(r[9]) : rua;
      num = r[10] ? String(r[10]) : num;
      bairro = r[11] ? String(r[11]) : bairro;
      vinculo = r[12] ? String(r[12]) : vinculo;
      func = r[13] ? String(r[13]) : func;
      abertura = r[14] ? String(r[14]) : abertura;
      cnpj = r[15] ? String(r[15]) : cnpj;
      razao = r[16] ? String(r[16]) : razao;
      rua_api = r[17] ? String(r[17]) : rua_api;
      num_api = r[18] ? String(r[18]) : num_api;
      municipio = r[19] ? String(r[19]) : municipio;
      estado = r[20] ? String(r[20]) : estado;
      cnae = r[21] ? String(r[21]) : cnae;
      alvara = r[22] ? String(r[22]) : alvara;
    }

    var rowValues = [
      id, data_prot, num_prot, feira, pasta,
      cpf, nome_pf, produtos, validade, rua,
      num, bairro, vinculo, func, abertura,
      cnpj, razao, rua_api, num_api, municipio,
      estado, cnae, alvara
    ];

    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    var cleanCpf = cpf.replace(/\\D/g, "");

    for (var j = 1; j < data.length; j++) {
      var rowId = String(data[j][0] || "");
      var rowCpf = String(data[j][5] || "").replace(/\\D/g, "");
      if ((id && rowId === id) || (cleanCpf && rowCpf === cleanCpf)) {
        rowIndex = j + 1;
        break;
      }
    }
    
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      id: id,
      message: "Feirante gravado com sucesso nas 23 colunas" 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

function formatDateBR(val) {
  if (!val) return "";
  if (val instanceof Date) {
    var d = val.getDate();
    var m = val.getMonth() + 1;
    var y = val.getFullYear();
    return (d < 10 ? "0" + d : d) + "/" + (m < 10 ? "0" + m : m) + "/" + y;
  }
  var str = String(val).trim();
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(str)) {
    var p = str.split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }
  return str;
}`;
                      navigator.clipboard.writeText(code);
                      alert('Código da Macro do Google Apps Script copiado para a Área de Transferência!');
                    }}
                    className="text-[11px] bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 font-bold px-2 py-0.5 rounded cursor-pointer hover:bg-blue-100 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copiar Macro (Código.gs)
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setConfigUrlModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow uppercase cursor-pointer"
                >
                  Salvar e Sincronizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Confirmação de Exclusão de Feirante */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="Excluir Cadastro de Feirante"
        message="Tem certeza de que deseja remover o registro deste feirante do sistema municipal?"
        itemDescription={confirmDelete.feiranteDesc}
        confirmText="Sim, Excluir Feirante"
        onConfirm={() => {
          if (onDeleteFeirante && confirmDelete.feiranteId) {
            onDeleteFeirante(confirmDelete.feiranteId);
            if (formItem.id === confirmDelete.feiranteId) {
              setModalOpen(false);
            }
          }
        }}
        onClose={() => setConfirmDelete({ isOpen: false, feiranteId: '', feiranteDesc: '' })}
      />
    </div>
  );
};
