import React, { useState, useEffect } from 'react';
import { ProcessoItem, ProcessoStatus, UserProfile } from '../types';
import { BAIRROS_BC } from '../data/mockData';
import { fetchCnpj } from '../lib/cnpjService';
import { ConfirmModal } from './ConfirmModal';
import {
  fetchProcessosFromSheets,
  saveProcessoToSheets,
  getProcessosSheetsWebhookUrl,
  setProcessosSheetsWebhookUrl,
  testProcessosWebhook,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  PROCESSOS_SHEETS_WEBHOOK_URL
} from '../lib/googleSheetsService';
import {
  Search,
  RotateCcw,
  Save,
  Plus,
  FileText,
  Table,
  BarChart3,
  AlertOctagon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Calendar,
  Check,
  X,
  Building2,
  FileCheck,
  ExternalLink,
  Edit2,
  Trash2,
  RefreshCw,
  Loader2,
  Sparkles,
  ShieldCheck,
  Settings,
  FileSpreadsheet,
  Copy,
  HelpCircle
} from 'lucide-react';

const add180Days = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  d.setDate(d.getDate() + 180);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const add30Days = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  d.setDate(d.getDate() + 30);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

interface ProcessosViewProps {
  processos: ProcessoItem[];
  currentUser: UserProfile | null;
  users: UserProfile[];
  onSaveProcesso: (item: ProcessoItem) => void;
  onDeleteProcesso?: (id: string) => void;
}

export const ProcessosView: React.FC<ProcessosViewProps> = ({
  processos,
  currentUser,
  users,
  onSaveProcesso,
  onDeleteProcesso
}) => {
  // Navigation Tabs: 'cadastro' | 'denuncias' | 'historico' | 'dashboard'
  const [currentTab, setCurrentTab] = useState<'cadastro' | 'denuncias' | 'historico' | 'dashboard'>('cadastro');

  // Search Bar Top Inputs
  const [searchIdInput, setSearchIdInput] = useState('');
  const [searchCnpjInput, setSearchCnpjInput] = useState('');
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState<string | null>(null);
  const [saveStatusType, setSaveStatusType] = useState<'success' | 'warning' | null>(null);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [savingSheets, setSavingSheets] = useState(false);
  const [syncingSheets, setSyncingSheets] = useState(false);

  // Webhook Modal & Config
  const [configUrlModal, setConfigUrlModal] = useState(false);
  const [webhookUrlInput, setWebhookUrlInput] = useState(() => getProcessosSheetsWebhookUrl());
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  // Filter state for Historico tab
  const [historicoSearch, setHistoricoSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [selectedDashboardStatus, setSelectedDashboardStatus] = useState<string | null>(null);

  // Confirmation Modal State for deletion
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    processoId: string;
    processoDesc: string;
  }>({
    isOpen: false,
    processoId: '',
    processoDesc: ''
  });

  // CNAE List
  const [cnaeInput, setCnaeInput] = useState('');
  const [cnaeList, setCnaeList] = useState<string[]>([]);

  // Servidores / Fiscais Designados List
  const [servidoresDesignados, setServidoresDesignados] = useState<{ id: string; nome: string; matricula: string }[]>([]);

  // Main Form Data initialized clean with empty/placeholder states for user input
  const [formData, setFormData] = useState({
    id: '',
    setor: '',
    motivacao: '',
    dataEntrada: '',
    data1Doc: '',
    venc1Doc: '',
    prot1Doc: '',
    pasta: '',

    cnpjCpf: '',
    razaoSocial: '',
    nomeFantasia: '',

    cep: '',
    endereco: '',
    numeroComplemento: '',
    bairro: '',

    situacaoCadastral: 'ATIVA',
    motivoSituacao: '',
    dataSituacao: '',
    vencLicenca: '',
    grauRisco: 'BAIXO RISCO' as 'ALTO RISCO' | 'MÉDIO RISCO' | 'BAIXO RISCO',

    fiscalResponsavel: currentUser?.nome_completo || '',
    dataEntregueFiscal: '',

    status: 'EM ANÁLISE' as ProcessoStatus,
    observacao: '',
    agendadoPara: '',
    conclusao: '',
    pas: '',

    // 23 columns compat
    num_processo: `2026/${String(processos.length + 101).padStart(5, '0')}`,
    data_protocolo: new Date().toISOString().split('T')[0],
    num_protocolo: `2026/${String(processos.length + 101).padStart(5, '0')}`,
    feira: '',
    pasta_visa: '',
    cpf: '',
    nome_pf: '',
    produtos: '',
    validade: '',
    endereco_rua: '',
    num_complemento: '',
    vinculo: 'ATIVA',
    num_func: currentUser?.nome_completo || '',
    ano_abertura: '2026',
    cnpj: '',
    nome_pj_api: '',
    rua_api: '',
    num_comp_api: '',
    municipio: 'BALNEÁRIO CAMBORIÚ',
    estado: 'SC',
    cnae_api: '',
    alvara: 'SIM'
  });

  // Calculate high risk automatically when CNAEs change
  useEffect(() => {
    const hasAlto = cnaeList.some(c => c.toLowerCase().includes('alto risco'));
    const hasMedio = cnaeList.some(c => c.toLowerCase().includes('médio risco') || c.toLowerCase().includes('medio risco'));
    if (hasAlto) {
      setFormData(prev => ({ ...prev, grauRisco: 'ALTO RISCO' }));
    } else if (hasMedio) {
      setFormData(prev => ({ ...prev, grauRisco: 'MÉDIO RISCO' }));
    } else if (cnaeList.length > 0) {
      setFormData(prev => ({ ...prev, grauRisco: 'BAIXO RISCO' }));
    }
  }, [cnaeList]);

  // Handle Search by ID
  const handleSearchById = () => {
    if (!searchIdInput.trim()) {
      setSearchNotice('⚠️ Digite o ID ou Número do processo.');
      setTimeout(() => setSearchNotice(null), 3000);
      return;
    }
    const found = processos.find(
      (p) => p.id === searchIdInput.trim() || p.num_processo.includes(searchIdInput.trim()) || p.pasta === searchIdInput.trim()
    );
    if (found) {
      loadProcessoIntoForm(found);
      setSearchNotice(`✅ Processo ${found.num_processo} encontrado!`);
    } else {
      setSearchNotice(`❌ Nenhum processo encontrado com ID/Nº "${searchIdInput}".`);
    }
    setTimeout(() => setSearchNotice(null), 4000);
  };

  // Handle Search by CNPJ (Queries external API Receita Federal / BrasilAPI)
  const handleSearchByCnpj = async (cnpjToSearch?: string) => {
    const cleanVal = (cnpjToSearch || searchCnpjInput).replace(/\D/g, '');
    if (cleanVal.length < 11) {
      setSearchNotice('⚠️ Digite um CNPJ ou CPF válido.');
      setTimeout(() => setSearchNotice(null), 3000);
      return;
    }

    setLoadingCnpj(true);
    setSearchNotice('🔍 Consultando API Oficial da Receita Federal...');

    try {
      // 1. If found locally, load baseline process fields
      const foundLocal = processos.find((p) => p.cnpj_cpf.replace(/\D/g, '') === cleanVal);
      if (foundLocal) {
        loadProcessoIntoForm(foundLocal);
      }

      // 2. Fetch live data from API
      const apiData = await fetchCnpj(cleanVal);
      const formattedCnpjCpf = cleanVal.length === 14 
        ? cleanVal.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
        : cleanVal.length === 11 
          ? cleanVal.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
          : cleanVal;

      setFormData((prev) => ({
        ...prev,
        cnpjCpf: formattedCnpjCpf,
        cnpj: cleanVal.length === 14 ? formattedCnpjCpf : prev.cnpj,
        cpf: cleanVal.length === 11 ? formattedCnpjCpf : prev.cpf,
        razaoSocial: apiData.razao || prev.razaoSocial,
        nomeFantasia: apiData.nome_fantasia || apiData.razao || prev.nomeFantasia,
        nome_pj_api: apiData.nome_fantasia || apiData.razao || prev.nome_pj_api,
        nome_pf: cleanVal.length === 11 ? (apiData.razao || prev.nome_pf) : prev.nome_pf,
        endereco: apiData.rua_api || prev.endereco,
        endereco_rua: apiData.rua_api || prev.endereco_rua,
        rua_api: apiData.rua_api || prev.rua_api,
        numeroComplemento: apiData.num_api || prev.numeroComplemento,
        num_complemento: apiData.num_api || prev.num_complemento,
        num_comp_api: apiData.num_api || prev.num_comp_api,
        bairro: BAIRROS_BC.find(b => b.toLowerCase() === apiData.bairro.toLowerCase()) || apiData.bairro || 'Centro',
        municipio: apiData.municipio || 'BALNEÁRIO CAMBORIÚ',
        estado: apiData.estado || 'SC',
        situacaoCadastral: apiData.situacao || 'ATIVA',
        motivoSituacao: 'SEM MOTIVO',
        dataSituacao: new Date().toISOString().split('T')[0],
        vencLicenca: add180Days(new Date().toISOString().split('T')[0]),
        cnae_api: apiData.cnae || prev.cnae_api
      }));

      // Update CNAE list from API
      if (apiData.cnaes && apiData.cnaes.length > 0) {
        setCnaeList(apiData.cnaes);
      } else if (apiData.cnae) {
        setCnaeList([apiData.cnae.toUpperCase()]);
      }

      setSearchNotice(`✅ Dados importados da Receita Federal: ${apiData.razao} (${apiData.situacao || 'ATIVA'})`);
    } catch (err) {
      console.error(err);
      setSearchNotice('⚠️ Não foi possível consultar o CNPJ na API externa.');
    } finally {
      setLoadingCnpj(false);
      setTimeout(() => setSearchNotice(null), 5000);
    }
  };

  const loadProcessoIntoForm = (p: ProcessoItem) => {
    setFormData({
      id: p.id,
      setor: p.setor || 'ALIMENTAÇÃO',
      motivacao: p.motivacao || p.assunto || 'ALVARÁ SANITÁRIO INICIAL',
      dataEntrada: p.data_entrada || p.data_protocolo || new Date().toISOString().split('T')[0],
      data1Doc: p.data_1doc || p.data_protocolo || new Date().toISOString().split('T')[0],
      venc1Doc: p.venc_1doc || add30Days(p.data_protocolo || new Date().toISOString().split('T')[0]),
      prot1Doc: p.prot_1doc || `1DOC-${p.num_processo.replace('/', '-')}`,
      pasta: p.pasta || '46514',

      cnpjCpf: p.cnpj_cpf,
      razaoSocial: p.razao_social,
      nomeFantasia: p.nome_fantasia || p.razao_social,

      cep: p.cep || '88330-378',
      endereco: p.endereco,
      numeroComplemento: p.numero_complemento || 'S/N',
      bairro: p.bairro || 'Centro',

      situacaoCadastral: p.situacao_cadastral || 'ATIVA',
      motivoSituacao: p.motivo_situacao || 'SEM MOTIVO',
      dataSituacao: p.data_situacao || '2025-04-25',
      vencLicenca: p.venc_licenca || p.validade || add180Days(p.data_protocolo || new Date().toISOString().split('T')[0]),
      grauRisco: p.grau_risco || 'ALTO RISCO',

      fiscalResponsavel: p.fiscal_responsavel || 'Carlos Eduardo Silva',
      dataEntregueFiscal: p.data_entregue_fiscal || p.data_protocolo || new Date().toISOString().split('T')[0],

      status: p.status,
      observacao: p.observacoes || '...',
      agendadoPara: p.agendado_para || '',
      conclusao: p.conclusao || '...',
      pas: p.pas || '',

      // 23 columns aliases
      num_processo: p.num_processo,
      data_protocolo: p.data_protocolo || new Date().toISOString().split('T')[0],
      num_protocolo: p.num_processo,
      feira: p.setor || 'ALIMENTAÇÃO',
      pasta_visa: p.pasta || '46514',
      cpf: p.cnpj_cpf.length <= 14 ? p.cnpj_cpf : '',
      nome_pf: p.razao_social,
      produtos: p.motivacao || p.assunto || 'ALVARÁ SANITÁRIO',
      validade: p.venc_licenca || p.validade || '2026-12-31',
      endereco_rua: p.endereco,
      num_complemento: p.numero_complemento || '',
      vinculo: p.situacao_cadastral || 'ATIVA',
      num_func: p.fiscal_responsavel || 'Carlos Eduardo Silva',
      ano_abertura: '2026',
      cnpj: p.cnpj_cpf.length > 14 ? p.cnpj_cpf : '',
      nome_pj_api: p.nome_fantasia || p.razao_social,
      rua_api: p.endereco,
      num_comp_api: p.numero_complemento || '',
      municipio: 'BALNEÁRIO CAMBORIÚ',
      estado: 'SC',
      cnae_api: (p.cnaes || []).join('; '),
      alvara: p.status === 'DEFERIDO' ? 'SIM' : 'EM ANÁLISE'
    });

    if (p.cnaes && p.cnaes.length > 0) {
      setCnaeList(p.cnaes);
    }

    if (p.servidores && p.servidores.length > 0) {
      setServidoresDesignados(p.servidores);
    } else if (p.fiscal_responsavel) {
      const names = p.fiscal_responsavel.split(',').map(s => s.trim()).filter(Boolean);
      const matched = names.map(n => {
        const foundU = users.find(u => u.nome_completo.toLowerCase() === n.toLowerCase());
        return {
          id: foundU?.id || `s-${Math.random()}`,
          nome: n,
          matricula: foundU?.matricula || 'FIS-BC'
        };
      });
      setServidoresDesignados(matched);
    } else {
      setServidoresDesignados([]);
    }

    setCurrentTab('cadastro');
  };

  const handleClearForm = () => {
    setFormData({
      id: '',
      setor: '',
      motivacao: '',
      dataEntrada: '',
      data1Doc: '',
      venc1Doc: '',
      prot1Doc: '',
      pasta: '',

      cnpjCpf: '',
      razaoSocial: '',
      nomeFantasia: '',

      cep: '',
      endereco: '',
      numeroComplemento: '',
      bairro: '',

      situacaoCadastral: 'ATIVA',
      motivoSituacao: '',
      dataSituacao: '',
      vencLicenca: '',
      grauRisco: 'BAIXO RISCO',

      fiscalResponsavel: '',
      dataEntregueFiscal: '',

      status: 'EM ANÁLISE' as ProcessoStatus,
      observacao: '',
      agendadoPara: '',
      conclusao: '',
      pas: '',

      num_processo: `2026/${String(processos.length + 101).padStart(5, '0')}`,
      data_protocolo: new Date().toISOString().split('T')[0],
      num_protocolo: `2026/${String(processos.length + 101).padStart(5, '0')}`,
      feira: '',
      pasta_visa: '',
      cpf: '',
      nome_pf: '',
      produtos: '',
      validade: '',
      endereco_rua: '',
      num_complemento: '',
      vinculo: 'ATIVA',
      num_func: currentUser?.nome_completo || '',
      ano_abertura: '2026',
      cnpj: '',
      nome_pj_api: '',
      rua_api: '',
      num_comp_api: '',
      municipio: 'BALNEÁRIO CAMBORIÚ',
      estado: 'SC',
      cnae_api: '',
      alvara: 'SIM'
    });
    setCnaeList([]);
    setServidoresDesignados([]);
    setSearchIdInput('');
    setSearchCnpjInput('');
    setSearchNotice('Formulário limpo com sucesso.');
    setTimeout(() => setSearchNotice(null), 3000);
  };

  const handleAddCnae = () => {
    if (cnaeInput.trim()) {
      const formatted = cnaeInput.trim();
      setCnaeList([...cnaeList, formatted]);
      setCnaeInput('');
    }
  };

  const handleRemoveCnae = (index: number) => {
    setCnaeList(cnaeList.filter((_, i) => i !== index));
  };

  const handleAddServidor = (userObj: { id: string; nome_completo: string; matricula?: string }) => {
    const today = new Date().toISOString().split('T')[0];
    if (!servidoresDesignados.some(s => s.id === userObj.id || s.nome.toLowerCase() === userObj.nome_completo.toLowerCase())) {
      const updated = [
        ...servidoresDesignados,
        { id: userObj.id, nome: userObj.nome_completo, matricula: userObj.matricula || 'S/N' }
      ];
      setServidoresDesignados(updated);
      setFormData(prev => ({
        ...prev,
        fiscalResponsavel: updated.map(u => u.nome).join(', '),
        dataEntregueFiscal: today
      }));
    }
  };

  const handleRemoveServidor = (idOrNome: string) => {
    const today = new Date().toISOString().split('T')[0];
    const updated = servidoresDesignados.filter(s => s.id !== idOrNome && s.nome !== idOrNome);
    setServidoresDesignados(updated);
    setFormData(prev => ({
      ...prev,
      fiscalResponsavel: updated.length > 0 ? updated.map(u => u.nome).join(', ') : 'Selecione...',
      dataEntregueFiscal: updated.length > 0 ? today : prev.dataEntregueFiscal
    }));
  };

  const handleSyncFromSheets = async () => {
    setSyncingSheets(true);
    setSearchNotice('🔄 Sincronizando processos com a Planilha Google Sheets...');
    try {
      const remote = await fetchProcessosFromSheets();
      if (remote && remote.length > 0) {
        remote.forEach(p => onSaveProcesso(p));
        setSearchNotice(`✅ ${remote.length} processos sincronizados com sucesso da Planilha Google!`);
      } else {
        setSearchNotice('✅ Conexão com Google Sheets ativa!');
      }
    } catch (err) {
      setSearchNotice('⚠️ Erro ao comunicar com a Planilha Google Sheets.');
    } finally {
      setSyncingSheets(false);
      setTimeout(() => setSearchNotice(null), 5000);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSheets(true);
    setSearchNotice('💾 Salvando no sistema e enviando para o Google Sheets...');

    const fiscalNames = servidoresDesignados.length > 0 
      ? servidoresDesignados.map(s => s.nome).join(', ') 
      : (formData.fiscalResponsavel !== 'Selecione...' && formData.fiscalResponsavel ? formData.fiscalResponsavel : (currentUser?.nome_completo || 'Carlos Eduardo Silva'));

    const itemToSave: ProcessoItem = {
      id: formData.id || `proc-${Date.now()}`,
      num_processo: formData.prot1Doc || formData.num_processo || `2026/${String(processos.length + 101).padStart(5, '0')}`,
      data_protocolo: formData.dataEntrada || new Date().toISOString().split('T')[0],
      cnpj_cpf: formData.cnpjCpf || '00.000.000/0000-00',
      razao_social: formData.razaoSocial || 'EMPRESA REGISTRADA',
      nome_fantasia: formData.nomeFantasia || formData.razaoSocial || 'ESTABELECIMENTO',
      assunto: formData.motivacao !== '...' ? formData.motivacao : 'Alvará Sanitário',
      bairro: formData.bairro !== '...' ? formData.bairro : 'Centro',
      endereco: `${formData.endereco} ${formData.numeroComplemento}`.trim(),
      fiscal_responsavel: fiscalNames,
      status: formData.status,
      validade: formData.vencLicenca || '31/12/2026',
      observacoes: formData.observacao !== '...' ? formData.observacao : '',
      cnaes: cnaeList,
      servidores: servidoresDesignados,

      // Specific official fields
      setor: formData.setor,
      motivacao: formData.motivacao,
      data_entrada: formData.dataEntrada,
      data_1doc: formData.data1Doc,
      venc_1doc: formData.venc1Doc,
      prot_1doc: formData.prot1Doc,
      pasta: formData.pasta,
      cep: formData.cep,
      numero_complemento: formData.numeroComplemento,
      situacao_cadastral: formData.situacaoCadastral,
      motivo_situacao: formData.motivoSituacao,
      data_situacao: formData.dataSituacao,
      venc_licenca: formData.vencLicenca,
      grau_risco: formData.grauRisco,
      data_entregue_fiscal: formData.dataEntregueFiscal,
      agendado_para: formData.agendadoPara,
      conclusao: formData.conclusao,
      pas: formData.pas
    };

    onSaveProcesso(itemToSave);

    // Envia diretamente para o Google Apps Script (Sheets) e aguarda confirmação real
    const sheetsResult = await saveProcessoToSheets(itemToSave, formData);

    setSavingSheets(false);
    if (sheetsResult.isSavedToSheets) {
      setSaveStatusType('success');
      setShowSaveSuccess(`Processo ${itemToSave.num_processo} (${itemToSave.razao_social}) salvo no sistema e gravado com sucesso na Planilha do Google Sheets!`);
    } else {
      setSaveStatusType('warning');
      setShowSaveSuccess(`Processo ${itemToSave.num_processo} (${itemToSave.razao_social}) salvo localmente no sistema. ⚠️ Nota: A gravação na Planilha Google Sheets não foi confirmada pelo Webhook. Verifique a URL nas configurações (⚙️).`);
    }
    setSearchNotice(null);
  };

  // Filtered Historico List
  const filteredHistorico = processos.filter((p) => {
    if (statusFilter !== 'TODOS' && p.status !== statusFilter) return false;
    if (historicoSearch.trim()) {
      const q = historicoSearch.toLowerCase();
      return (
        p.num_processo.toLowerCase().includes(q) ||
        p.cnpj_cpf.toLowerCase().includes(q) ||
        p.razao_social.toLowerCase().includes(q) ||
        p.nome_fantasia.toLowerCase().includes(q) ||
        p.bairro.toLowerCase().includes(q) ||
        (p.pasta && p.pasta.includes(q))
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#181818] text-slate-100 p-2 md:p-4 font-sans selection:bg-blue-600 selection:text-white">
      {/* ⬛ TOP CONTROL BAR */}
      <div className="bg-[#242424] border border-[#333333] rounded-t-md p-2.5 flex flex-col lg:flex-row items-center justify-between gap-3 shadow-lg">
        {/* Left Side: ID and CNPJ Search Inputs */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* ID / Pasta Input */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-white uppercase tracking-wider">ID / PASTA:</span>
            <input
              type="text"
              placeholder="Ex: 46514"
              value={searchIdInput}
              onChange={(e) => setSearchIdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchById()}
              className="w-24 bg-white text-black font-bold text-xs px-2 py-1 rounded border border-slate-300 focus:ring-2 focus:ring-amber-400 outline-none"
            />
            <button
              onClick={handleSearchById}
              className="bg-[#FFCC00] hover:bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded tracking-wider shadow active:scale-95 transition cursor-pointer"
            >
              PESQUISAR
            </button>
          </div>

          <span className="text-slate-500 hidden sm:inline">|</span>

          {/* CNPJ Input */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-white uppercase tracking-wider">CNPJ:</span>
            <input
              type="text"
              placeholder="00.000.000/0000-00"
              value={searchCnpjInput}
              onChange={(e) => setSearchCnpjInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchByCnpj()}
              className="w-36 md:w-44 bg-white text-black font-bold text-xs px-2 py-1 rounded border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none font-mono"
            />
            <button
              onClick={() => handleSearchByCnpj()}
              disabled={loadingCnpj}
              className="bg-[#007BFF] hover:bg-blue-600 text-white font-black text-xs px-3 py-1 rounded tracking-wider shadow active:scale-95 transition cursor-pointer flex items-center gap-1"
            >
              {loadingCnpj ? <Loader2 className="w-3 h-3 animate-spin" /> : 'OK'}
            </button>
          </div>
        </div>

        {/* Right Side: Navigation Buttons & Google Sheets Sync */}
        <div className="flex items-center gap-1.5 flex-wrap w-full lg:w-auto justify-end">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleSyncFromSheets}
              disabled={syncingSheets}
              className="bg-emerald-700 hover:bg-emerald-600 text-emerald-100 border border-emerald-500 text-xs font-black px-2.5 py-1.5 rounded tracking-wide uppercase transition cursor-pointer shadow flex items-center gap-1"
              title="Sincronizar processos diretamente da Planilha Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingSheets ? 'animate-spin' : ''}`} />
              {syncingSheets ? 'SINCRONIZANDO...' : 'SHEETS'}
            </button>
            <button
              type="button"
              onClick={() => {
                setWebhookUrlInput(getProcessosSheetsWebhookUrl());
                setTestResult(null);
                setConfigUrlModal(true);
              }}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-500 text-xs font-black px-2 py-1.5 rounded tracking-wide uppercase transition cursor-pointer shadow flex items-center gap-1"
              title="Configurar Webhook e Integração do Google Sheets"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setCurrentTab('cadastro')}
            className={`text-xs font-black px-3.5 py-1.5 rounded tracking-wide uppercase transition cursor-pointer shadow ${
              currentTab === 'cadastro'
                ? 'bg-[#0066CC] text-white border border-blue-400 ring-2 ring-blue-300'
                : 'bg-[#0055A5] text-slate-100 hover:bg-[#0066CC]'
            }`}
          >
            CADASTRO VISA
          </button>

          <button
            onClick={() => setCurrentTab('denuncias')}
            className={`text-xs font-black px-3.5 py-1.5 rounded tracking-wide uppercase transition cursor-pointer shadow ${
              currentTab === 'denuncias'
                ? 'bg-[#0066CC] text-white border border-blue-400 ring-2 ring-blue-300'
                : 'bg-[#0055A5] text-slate-100 hover:bg-[#0066CC]'
            }`}
          >
            DENÚNCIAS
          </button>

          <button
            onClick={() => setCurrentTab('historico')}
            className={`text-xs font-black px-3.5 py-1.5 rounded tracking-wide uppercase transition cursor-pointer shadow ${
              currentTab === 'historico'
                ? 'bg-[#0066CC] text-white border border-blue-400 ring-2 ring-blue-300'
                : 'bg-[#0055A5] text-slate-100 hover:bg-[#0066CC]'
            }`}
          >
            HISTÓRICO
          </button>

          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`text-xs font-black px-3.5 py-1.5 rounded tracking-wide uppercase transition cursor-pointer shadow ${
              currentTab === 'dashboard'
                ? 'bg-[#28783B] text-white border border-emerald-400 ring-2 ring-emerald-300'
                : 'bg-[#20602F] text-emerald-100 hover:bg-[#28783B]'
            }`}
          >
            DASHBOARD
          </button>
        </div>
      </div>

      {/* Save Success / Warning Banner */}
      {showSaveSuccess && (
        <div className={`border-2 p-3.5 md:p-4 rounded-lg shadow-xl animate-fade-in my-2 flex flex-col md:flex-row items-center justify-between gap-3 ${
          saveStatusType === 'warning'
            ? 'bg-amber-950/90 border-amber-500 text-amber-100'
            : 'bg-emerald-900/90 border-emerald-500 text-emerald-100'
        }`}>
          <div className="flex items-start gap-3">
            {saveStatusType === 'warning' ? (
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`font-extrabold text-sm ${saveStatusType === 'warning' ? 'text-amber-200' : 'text-emerald-200'}`}>
                {showSaveSuccess}
              </p>
              <p className={`text-xs mt-0.5 ${saveStatusType === 'warning' ? 'text-amber-300/80' : 'text-emerald-300/80'}`}>
                {saveStatusType === 'warning'
                  ? 'O registro foi gravado no sistema local, mas não houve resposta positiva do Google Apps Script.'
                  : 'Registro oficial de fiscalização atualizado e gravado na Planilha do Google Sheets.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {saveStatusType === 'warning' && (
              <button
                onClick={() => {
                  setWebhookUrlInput(getProcessosSheetsWebhookUrl());
                  setTestResult(null);
                  setConfigUrlModal(true);
                }}
                className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs px-3 py-1 rounded shadow cursor-pointer uppercase flex items-center gap-1"
              >
                <Settings className="w-3.5 h-3.5" /> Configurar Webhook
              </button>
            )}
            <button
              onClick={() => setShowSaveSuccess(null)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800/50 cursor-pointer"
              title="Fechar aviso"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Search Notice Banner */}
      {searchNotice && (
        <div className="bg-[#2a2a2a] border border-amber-500/50 text-amber-200 px-4 py-2 text-xs font-bold flex items-center justify-between animate-fade-in my-1 rounded">
          <span>{searchNotice}</span>
          <button onClick={() => setSearchNotice(null)} className="text-amber-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 📄 CADASTRO VISA FORM CONTAINER */}
      {currentTab === 'cadastro' && (
        <div className="bg-[#EAEAEA] text-slate-900 border border-slate-300 rounded-b-md p-3 md:p-5 shadow-2xl space-y-3 font-sans">
          <form onSubmit={handleSaveForm} className="space-y-3">
            
            {/* ROW 1: SETOR | MOTIVAÇÃO | DATA ENTRADA | DATA 1DOC | VENC. 1DOC | 1DOC (PROT.) | PASTA */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 bg-white p-2.5 rounded border border-slate-300 shadow-sm">
              <div>
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">SETOR</label>
                <select
                  value={formData.setor}
                  onChange={(e) => setFormData({ ...formData, setor: e.target.value, feira: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-1.5 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                >
                  <option value="">Selecione o Setor...</option>
                  <option value="ALIMENTAÇÃO">ALIMENTAÇÃO</option>
                  <option value="SAÚDE">SAÚDE</option>
                  <option value="SANEAMENTO">SANEAMENTO</option>
                  <option value="ENSINO">ENSINO</option>
                  <option value="EVENTOS / FEIRAS">EVENTOS / FEIRAS</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">MOTIVAÇÃO</label>
                <select
                  value={formData.motivacao}
                  onChange={(e) => setFormData({ ...formData, motivacao: e.target.value, produtos: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-1.5 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                >
                  <option value="">Selecione a Motivação...</option>
                  <option value="ALVARÁ SANITÁRIO INICIAL">ALVARÁ SANITÁRIO INICIAL</option>
                  <option value="RENOVAÇÃO DE LICENÇA">RENOVAÇÃO DE LICENÇA</option>
                  <option value="ALTERAÇÃO DE ENDEREÇO">ALTERAÇÃO DE ENDEREÇO</option>
                  <option value="INCLUSÃO DE ATIVIDADE">INCLUSÃO DE ATIVIDADE</option>
                  <option value="VISTORIA PRÉVIA (PBA)">VISTORIA PRÉVIA (PBA)</option>
                  <option value="DENÚNCIA SANITÁRIA">DENÚNCIA SANITÁRIA</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">DATA ENTRADA</label>
                <input
                  type="date"
                  value={formData.dataEntrada}
                  onChange={(e) => setFormData({ ...formData, dataEntrada: e.target.value, data_protocolo: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-1 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">DATA 1DOC</label>
                <input
                  type="date"
                  value={formData.data1Doc}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      data1Doc: val,
                      venc1Doc: add30Days(val)
                    });
                  }}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-1 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">VENC. 1DOC</label>
                <input
                  type="date"
                  value={formData.venc1Doc}
                  onChange={(e) => setFormData({ ...formData, venc1Doc: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-1 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">1DOC (PROT.)</label>
                <input
                  type="text"
                  placeholder="Ex: 98421/2026"
                  value={formData.prot1Doc}
                  onChange={(e) => setFormData({ ...formData, prot1Doc: e.target.value, num_protocolo: e.target.value, num_processo: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-1.5 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">PASTA</label>
                <input
                  type="text"
                  placeholder="Ex: 46514"
                  value={formData.pasta}
                  onChange={(e) => setFormData({ ...formData, pasta: e.target.value, pasta_visa: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-1.5 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono font-black text-blue-900"
                />
              </div>
            </div>

            {/* ROW 2: CNPJ / CPF | RAZÃO SOCIAL | NOME FANTASIA */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-2.5 rounded border border-slate-300 shadow-sm">
              <div className="sm:col-span-3 lg:col-span-3">
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">CNPJ / CPF</label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="Ex: 00.000.000/0001-00"
                    value={formData.cnpjCpf}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const digits = raw.replace(/\D/g, '');
                      let formatted = raw;
                      if (digits.length <= 11) {
                        if (digits.length > 9) formatted = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
                        else if (digits.length > 6) formatted = digits.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
                        else if (digits.length > 3) formatted = digits.replace(/(\d{3})(\d{1,3})/, '$1.$2');
                        else formatted = digits;
                      } else {
                        const d = digits.slice(0, 14);
                        if (d.length > 12) formatted = d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
                        else if (d.length > 8) formatted = d.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
                        else if (d.length > 5) formatted = d.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
                        else if (d.length > 2) formatted = d.replace(/(\d{2})(\d{1,3})/, '$1.$2');
                        else formatted = d;
                      }

                      setFormData({ ...formData, cnpjCpf: formatted, cnpj: digits.length > 11 ? formatted : formData.cnpj, cpf: digits.length <= 11 ? formatted : formData.cpf });
                      if (digits.length === 14 || digits.length === 11) {
                        handleSearchByCnpj(digits);
                      }
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text');
                      const digits = pasted.replace(/\D/g, '');
                      if (digits.length === 14 || digits.length === 11) {
                        setTimeout(() => handleSearchByCnpj(digits), 60);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchByCnpj(formData.cnpjCpf);
                      }
                    }}
                    onBlur={() => {
                      const digits = formData.cnpjCpf.replace(/\D/g, '');
                      if (digits.length === 14 || digits.length === 11) {
                        handleSearchByCnpj(digits);
                      }
                    }}
                    className="flex-1 min-w-0 bg-white border border-slate-300 text-slate-900 text-xs py-1 px-1.5 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => handleSearchByCnpj(formData.cnpjCpf)}
                    disabled={loadingCnpj}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-2 py-1 rounded transition flex items-center gap-1 shrink-0 h-[26px] cursor-pointer shadow"
                    title="Buscar dados na Receita Federal"
                  >
                    {loadingCnpj ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                    <span>API</span>
                  </button>
                </div>
              </div>

              <div className="sm:col-span-5 lg:col-span-5">
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">RAZÃO SOCIAL</label>
                <input
                  type="text"
                  placeholder="Ex: EMPRESA EXEMPLO LTDA"
                  value={formData.razaoSocial}
                  onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value, nome_pf: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold uppercase"
                />
              </div>

              <div className="sm:col-span-4 lg:col-span-4">
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">NOME FANTASIA</label>
                <input
                  type="text"
                  placeholder="Ex: NOME FANTASIA COMERCIAL"
                  value={formData.nomeFantasia}
                  onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value, nome_pj_api: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold uppercase"
                />
              </div>
            </div>

            {/* ROW 3: CEP | ENDEREÇO (RUA) | Nº / COMPLEMENTO | BAIRRO */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-2.5 rounded border border-slate-300 shadow-sm">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">CEP</label>
                <input
                  type="text"
                  placeholder="Ex: 88330-000"
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">ENDEREÇO (RUA)</label>
                <input
                  type="text"
                  placeholder="Ex: AV. BRASIL ou RUA 1500"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value, endereco_rua: e.target.value, rua_api: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none uppercase font-semibold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">Nº / COMPLEMENTO</label>
                <input
                  type="text"
                  placeholder="Ex: 100, SALA 01"
                  value={formData.numeroComplemento}
                  onChange={(e) => setFormData({ ...formData, numeroComplemento: e.target.value, num_complemento: e.target.value, num_comp_api: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none uppercase font-bold"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">BAIRRO</label>
                <select
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                >
                  <option value="">Selecione o Bairro...</option>
                  {BAIRROS_BC.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ROW 4: SITUAÇÃO CADASTRAL | MOTIVO SITUAÇÃO | DATA SITUAÇÃO | VENC. LICENÇA (180D) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2.5 rounded border border-slate-300 shadow-sm">
              <div>
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">SITUAÇÃO CADASTRAL</label>
                <input
                  type="text"
                  placeholder="Ex: ATIVA"
                  value={formData.situacaoCadastral}
                  onChange={(e) => setFormData({ ...formData, situacaoCadastral: e.target.value, vinculo: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold uppercase text-emerald-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">MOTIVO SITUAÇÃO</label>
                <input
                  type="text"
                  placeholder="Ex: SEM MOTIVO"
                  value={formData.motivoSituacao}
                  onChange={(e) => setFormData({ ...formData, motivoSituacao: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">DATA SITUAÇÃO</label>
                <input
                  type="date"
                  value={formData.dataSituacao}
                  onChange={(e) => setFormData({ ...formData, dataSituacao: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">VENC. LICENÇA (180D)</label>
                <input
                  type="date"
                  value={formData.vencLicenca}
                  onChange={(e) => setFormData({ ...formData, vencLicenca: e.target.value, validade: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
                />
              </div>
            </div>

            {/* ROW 5: ADICIONAR CNAE + LISTA DE CNAEs + CLASSIFICAÇÃO DE RISCO */}
            <div className="bg-white p-3 rounded border border-slate-300 shadow-sm space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black text-blue-700 uppercase">ADICIONAR CNAE:</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Ex: 5611201 ou 4729699"
                      value={cnaeInput}
                      onChange={(e) => setCnaeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCnae())}
                      className="w-40 bg-white border border-slate-300 text-slate-900 text-xs py-1 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddCnae}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-2.5 py-1 rounded shadow cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Badge de Risco do Estabelecimento */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-600 uppercase">CLASSIFICAÇÃO SANITÁRIA:</span>
                  <span className={`px-3 py-1 rounded text-xs font-black uppercase tracking-wider shadow ${
                    formData.grauRisco === 'ALTO RISCO'
                      ? 'bg-red-600 text-white animate-pulse'
                      : formData.grauRisco === 'MÉDIO RISCO'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-emerald-600 text-white'
                  }`}>
                    {formData.grauRisco}
                  </span>
                </div>
              </div>

              {/* CNAE Pills (Tags) */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {cnaeList.map((c, idx) => {
                  const codeOnly = c.split(' - ')[0].replace(/\D/g, '');
                  return (
                    <div
                      key={idx}
                      className="bg-slate-100 border border-slate-300 text-slate-800 text-xs px-2.5 py-1 rounded flex items-center gap-1.5 font-mono font-bold shadow-sm"
                    >
                      <span>{codeOnly || c.slice(0, 10)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCnae(idx)}
                        className="text-slate-400 hover:text-red-600 font-black text-sm transition cursor-pointer ml-1"
                        title="Remover CNAE"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Full CNAE Descriptions */}
              <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs space-y-1 font-mono">
                {cnaeList.map((c, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-slate-700">
                    <span className="text-slate-400">•</span>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ROW 6: FISCAIS & SERVIDORES DESIGNADOS */}
            <div className="bg-white p-3 rounded border border-slate-300 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
              <div className="md:col-span-4">
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">FISCAL RESPONSÁVEL</label>
                <select
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      const selectedUser = users.find(u => u.id === val || u.nome_completo === val);
                      if (selectedUser) {
                        handleAddServidor(selectedUser);
                      }
                    }
                  }}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1.5 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-semibold shadow-sm"
                >
                  <option value="">Selecione...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome_completo} ({u.matricula || 'Sem Matrícula'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-5 bg-slate-50 border border-slate-300 rounded p-2 min-h-[38px] flex flex-col justify-center gap-1 shadow-inner">
                <div className="flex items-center justify-between text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5 border-b border-slate-200 pb-0.5">
                  <span>Fiscais Atribuídos ({servidoresDesignados.length})</span>
                </div>
                {servidoresDesignados.length === 0 ? (
                  <span className="text-slate-400 text-xs italic">Nenhum servidor atribuído. Selecione ao lado.</span>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {servidoresDesignados.map((s) => (
                      <span
                        key={s.id || s.nome}
                        className="bg-white text-slate-900 border border-slate-300 text-xs font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-sm"
                      >
                        <span className="bg-slate-800 text-white text-[9px] font-black px-1 py-0.5 rounded font-mono uppercase">
                          {s.matricula || 'FIS-BC'}
                        </span>
                        <span className="font-sans font-bold text-slate-900 text-[11px]">{s.nome}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveServidor(s.id || s.nome)}
                          className="text-slate-400 hover:text-rose-600 rounded-full w-4 h-4 flex items-center justify-center font-black text-xs transition cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-3">
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">DATA ENTREGUE FISCAL</label>
                <input
                  type="date"
                  value={formData.dataEntregueFiscal}
                  onChange={(e) => setFormData({ ...formData, dataEntregueFiscal: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1.5 px-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono shadow-sm"
                />
              </div>
            </div>

            {/* ROW 7: STATUS | OBSERVAÇÃO | AGENDADO PARA | CONCLUSÃO | PAS */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-white p-2.5 rounded border border-slate-300 shadow-sm">
              <div>
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">STATUS</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ProcessoStatus })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-1.5 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold text-emerald-800"
                >
                  <option value="EM ANÁLISE">EM ANÁLISE</option>
                  <option value="DEFERIDO">DEFERIDO</option>
                  <option value="VISTORIA AGENDADA">VISTORIA AGENDADA</option>
                  <option value="PENDENTE DOCS">PENDENTE DOCS</option>
                  <option value="INDEFERIDO">INDEFERIDO</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">OBSERVAÇÃO</label>
                <select
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-1.5 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Selecione Observação...</option>
                  <option value="AGUARDANDO VISTORIA TÉCNICA">AGUARDANDO VISTORIA TÉCNICA</option>
                  <option value="AGUARDANDO DOCUMENTAÇÃO">AGUARDANDO DOCUMENTAÇÃO</option>
                  <option value="LAUDO EMISSÃO">LAUDO EMISSÃO</option>
                  <option value="NOTIFICAÇÃO EMITIDA">NOTIFICAÇÃO EMITIDA</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">AGENDADO PARA</label>
                <input
                  type="datetime-local"
                  value={formData.agendadoPara}
                  onChange={(e) => setFormData({ ...formData, agendadoPara: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-1.5 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">CONCLUSÃO</label>
                <select
                  value={formData.conclusao}
                  onChange={(e) => setFormData({ ...formData, conclusao: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-1.5 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Selecione Conclusão...</option>
                  <option value="EM ANDAMENTO">EM ANDAMENTO</option>
                  <option value="APROVADO / EMITIDO">APROVADO / EMITIDO</option>
                  <option value="INDEFERIDO">INDEFERIDO</option>
                  <option value="ARQUIVADO">ARQUIVADO</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-blue-700 uppercase block mb-0.5">PAS</label>
                <input
                  type="text"
                  placeholder="Ex: PAS-2026/044"
                  value={formData.pas}
                  onChange={(e) => setFormData({ ...formData, pas: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs py-1 px-1.5 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase"
                />
              </div>
            </div>

            {/* BOTTOM ACTIONS */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-300">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="bg-[#D4D4D4] hover:bg-slate-300 text-slate-900 font-extrabold text-xs px-6 py-2.5 rounded shadow transition uppercase cursor-pointer"
                >
                  LIMPAR
                </button>

                {formData.id && onDeleteProcesso && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete({
                        isOpen: true,
                        processoId: formData.id,
                        processoDesc: `Processo ${formData.pasta ? 'PASTA ' + formData.pasta : formData.prot1Doc || formData.id} - ${formData.nomeFantasia || formData.razaoSocial}`
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
                disabled={savingSheets}
                className="bg-[#28783B] hover:bg-[#1e5a2c] disabled:opacity-75 text-white font-extrabold text-sm px-8 md:px-12 py-3 rounded shadow-lg transition uppercase tracking-wider cursor-pointer flex items-center gap-2 active:scale-98"
              >
                <Save className={`w-5 h-5 ${savingSheets ? 'animate-bounce' : ''}`} />
                {savingSheets ? 'ENVIANDO PARA PLANILHA...' : 'SALVAR REGISTRO'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 📜 HISTÓRICO TAB */}
      {currentTab === 'historico' && (
        <div className="bg-[#EAEAEA] text-slate-900 border border-slate-300 rounded-b-md p-4 space-y-4 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-md border border-slate-300">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por Nº 1Doc, Pasta, CNPJ, Razão, Bairro..."
                value={historicoSearch}
                onChange={(e) => setHistoricoSearch(e.target.value)}
                className="w-full md:w-80 text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1.5 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Filtrar Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-bold"
              >
                <option value="TODOS">TODOS OS STATUS</option>
                <option value="DEFERIDO">DEFERIDO</option>
                <option value="EM ANÁLISE">EM ANÁLISE</option>
                <option value="VISTORIA AGENDADA">VISTORIA AGENDADA</option>
                <option value="PENDENTE DOCS">PENDENTE DOCS</option>
                <option value="INDEFERIDO">INDEFERIDO</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-md border border-slate-300 overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-[#242424] text-white font-bold uppercase">
                  <th className="p-2.5 border-b">Pasta / Prot.</th>
                  <th className="p-2.5 border-b">Data</th>
                  <th className="p-2.5 border-b">CNPJ</th>
                  <th className="p-2.5 border-b">Estabelecimento / Razão</th>
                  <th className="p-2.5 border-b">Bairro</th>
                  <th className="p-2.5 border-b">Risco</th>
                  <th className="p-2.5 border-b">Fiscal</th>
                  <th className="p-2.5 border-b text-center">Status</th>
                  <th className="p-2.5 border-b text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredHistorico.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500 italic">
                      Nenhum processo encontrado no histórico.
                    </td>
                  </tr>
                ) : (
                  filteredHistorico.map((p) => (
                    <tr key={p.id} className="hover:bg-blue-50/60 transition">
                      <td className="p-2.5 font-mono font-bold text-blue-700">
                        <div>{p.pasta ? `PASTA ${p.pasta}` : p.num_processo}</div>
                        <div className="text-[10px] text-slate-500">{p.prot_1doc || p.num_processo}</div>
                      </td>
                      <td className="p-2.5 font-mono">{p.data_entrada || p.data_protocolo}</td>
                      <td className="p-2.5 font-mono">{p.cnpj_cpf}</td>
                      <td className="p-2.5">
                        <div className="font-bold uppercase text-slate-900">{p.nome_fantasia || p.razao_social}</div>
                        <div className="text-[10px] text-slate-500">{p.razao_social}</div>
                      </td>
                      <td className="p-2.5 font-semibold">{p.bairro}</td>
                      <td className="p-2.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          p.grau_risco === 'ALTO RISCO'
                            ? 'bg-red-100 text-red-700 border border-red-300'
                            : p.grau_risco === 'MÉDIO RISCO'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {p.grau_risco || 'MÉDIO'}
                        </span>
                      </td>
                      <td className="p-2.5">{p.fiscal_responsavel}</td>
                      <td className="p-2.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-800 border border-slate-300">
                          {p.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => loadProcessoIntoForm(p)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded text-[11px] transition cursor-pointer"
                            title="Carregar processo no formulário"
                          >
                            CARREGAR
                          </button>
                          {onDeleteProcesso && (
                            <button
                              onClick={() => {
                                setConfirmDelete({
                                  isOpen: true,
                                  processoId: p.id,
                                  processoDesc: `Processo ${p.pasta ? 'PASTA ' + p.pasta : p.num_processo} - ${p.nome_fantasia || p.razao_social}`
                                });
                              }}
                              className="bg-rose-100 hover:bg-rose-200 text-rose-700 p-1 rounded transition cursor-pointer"
                              title="Excluir processo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 📊 DASHBOARD TAB */}
      {currentTab === 'dashboard' && (
        <div className="bg-[#EAEAEA] text-slate-900 border border-slate-300 rounded-b-md p-5 space-y-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 uppercase flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-700" /> Painel de Controle de Processos
              </h3>
              <p className="text-xs text-slate-600">
                Clique em qualquer um dos blocos abaixo para visualizar e gerenciar a lista de processos correspondente.
              </p>
            </div>
            {selectedDashboardStatus && (
              <button
                type="button"
                onClick={() => setSelectedDashboardStatus(null)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-1.5 rounded shadow-sm hover:bg-slate-50 transition cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Limpar Seleção
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Deferidos */}
            <div
              onClick={() => setSelectedDashboardStatus(selectedDashboardStatus === 'DEFERIDO' ? null : 'DEFERIDO')}
              className={`bg-white p-4 rounded-xl border-2 transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] flex items-center gap-3 ${
                selectedDashboardStatus === 'DEFERIDO'
                  ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/30'
                  : 'border-slate-300 hover:border-emerald-400'
              }`}
            >
              <div className="bg-emerald-100 text-emerald-800 p-3 rounded-xl shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-black text-slate-900">
                  {processos.filter((p) => p.status === 'DEFERIDO').length}
                </div>
                <div className="text-xs font-bold text-slate-600 uppercase truncate">Processos Deferidos</div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                  {selectedDashboardStatus === 'DEFERIDO' ? '▼ Visualizando lista' : 'Clique para ver lista →'}
                </div>
              </div>
            </div>

            {/* 2. Em Análise / Agendados */}
            <div
              onClick={() => setSelectedDashboardStatus(selectedDashboardStatus === 'EM ANÁLISE' ? null : 'EM ANÁLISE')}
              className={`bg-white p-4 rounded-xl border-2 transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] flex items-center gap-3 ${
                selectedDashboardStatus === 'EM ANÁLISE'
                  ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-400/30'
                  : 'border-slate-300 hover:border-amber-400'
              }`}
            >
              <div className="bg-amber-100 text-amber-800 p-3 rounded-xl shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-black text-slate-900">
                  {processos.filter((p) => p.status === 'EM ANÁLISE' || p.status === 'VISTORIA AGENDADA').length}
                </div>
                <div className="text-xs font-bold text-slate-600 uppercase truncate">Em Análise / Agendados</div>
                <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                  {selectedDashboardStatus === 'EM ANÁLISE' ? '▼ Visualizando lista' : 'Clique para ver lista →'}
                </div>
              </div>
            </div>

            {/* 3. Pendentes de Documentos */}
            <div
              onClick={() => setSelectedDashboardStatus(selectedDashboardStatus === 'PENDENTE DOCS' ? null : 'PENDENTE DOCS')}
              className={`bg-white p-4 rounded-xl border-2 transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] flex items-center gap-3 ${
                selectedDashboardStatus === 'PENDENTE DOCS'
                  ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-400/30'
                  : 'border-slate-300 hover:border-purple-400'
              }`}
            >
              <div className="bg-purple-100 text-purple-800 p-3 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-black text-slate-900">
                  {processos.filter((p) => p.status === 'PENDENTE DOCS').length}
                </div>
                <div className="text-xs font-bold text-slate-600 uppercase truncate">Pendentes Docs</div>
                <div className="text-[10px] text-purple-700 font-semibold mt-0.5">
                  {selectedDashboardStatus === 'PENDENTE DOCS' ? '▼ Visualizando lista' : 'Clique para ver lista →'}
                </div>
              </div>
            </div>

            {/* 4. Indeferidos */}
            <div
              onClick={() => setSelectedDashboardStatus(selectedDashboardStatus === 'INDEFERIDO' ? null : 'INDEFERIDO')}
              className={`bg-white p-4 rounded-xl border-2 transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] flex items-center gap-3 ${
                selectedDashboardStatus === 'INDEFERIDO'
                  ? 'border-rose-600 bg-rose-50/50 ring-2 ring-rose-400/30'
                  : 'border-slate-300 hover:border-rose-400'
              }`}
            >
              <div className="bg-rose-100 text-rose-800 p-3 rounded-xl shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-black text-slate-900">
                  {processos.filter((p) => p.status === 'INDEFERIDO').length}
                </div>
                <div className="text-xs font-bold text-slate-600 uppercase truncate">Indeferidos</div>
                <div className="text-[10px] text-rose-700 font-semibold mt-0.5">
                  {selectedDashboardStatus === 'INDEFERIDO' ? '▼ Visualizando lista' : 'Clique para ver lista →'}
                </div>
              </div>
            </div>
          </div>

          {/* TABELA DE DETALHAMENTO DO STATUS CLICADO */}
          {selectedDashboardStatus && (
            <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-md animate-fade-in">
              <div className="bg-[#242424] text-white p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    Lista de Processos ({selectedDashboardStatus}):
                  </span>
                  <span className="bg-white/20 text-white text-[11px] font-black px-2 py-0.5 rounded-full">
                    {
                      processos.filter((p) =>
                        selectedDashboardStatus === 'EM ANÁLISE'
                          ? p.status === 'EM ANÁLISE' || p.status === 'VISTORIA AGENDADA'
                          : p.status === selectedDashboardStatus
                      ).length
                    }{' '}
                    processos
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDashboardStatus(null)}
                  className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded transition flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Fechar Lista
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold uppercase border-b border-slate-300">
                      <th className="p-2.5">Pasta / Prot.</th>
                      <th className="p-2.5">Data Entrada</th>
                      <th className="p-2.5">CNPJ / CPF</th>
                      <th className="p-2.5">Estabelecimento / Razão</th>
                      <th className="p-2.5">Bairro</th>
                      <th className="p-2.5">Risco</th>
                      <th className="p-2.5">Fiscal</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(() => {
                      const list = processos.filter((p) =>
                        selectedDashboardStatus === 'EM ANÁLISE'
                          ? p.status === 'EM ANÁLISE' || p.status === 'VISTORIA AGENDADA'
                          : p.status === selectedDashboardStatus
                      );

                      if (list.length === 0) {
                        return (
                          <tr>
                            <td colSpan={9} className="p-6 text-center text-slate-500 italic">
                              Nenhum processo encontrado com este status.
                            </td>
                          </tr>
                        );
                      }

                      return list.map((p) => (
                        <tr key={p.id} className="hover:bg-blue-50/60 transition">
                          <td className="p-2.5 font-mono font-bold text-blue-700">
                            <div>{p.pasta ? `PASTA ${p.pasta}` : p.num_processo}</div>
                            <div className="text-[10px] text-slate-500">{p.prot_1doc || p.num_processo}</div>
                          </td>
                          <td className="p-2.5 font-mono">{p.data_entrada || p.data_protocolo}</td>
                          <td className="p-2.5 font-mono">{p.cnpj_cpf}</td>
                          <td className="p-2.5">
                            <div className="font-bold uppercase text-slate-900">{p.nome_fantasia || p.razao_social}</div>
                            <div className="text-[10px] text-slate-500">{p.razao_social}</div>
                          </td>
                          <td className="p-2.5 font-semibold">{p.bairro}</td>
                          <td className="p-2.5">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                p.grau_risco === 'ALTO RISCO'
                                  ? 'bg-red-100 text-red-700 border border-red-300'
                                  : p.grau_risco === 'MÉDIO RISCO'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              }`}
                            >
                              {p.grau_risco || 'MÉDIO'}
                            </span>
                          </td>
                          <td className="p-2.5">{p.fiscal_responsavel}</td>
                          <td className="p-2.5 text-center">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-800 border border-slate-300">
                              {p.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                loadProcessoIntoForm(p);
                                setCurrentTab('cadastro');
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1 rounded text-[11px] transition cursor-pointer shadow-sm flex items-center gap-1 mx-auto"
                              title="Abrir processo no formulário de edição"
                            >
                              <Edit2 className="w-3 h-3" /> CARREGAR
                            </button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 🚨 DENÚNCIAS TAB */}
      {currentTab === 'denuncias' && (
        <div className="bg-[#EAEAEA] text-slate-900 border border-slate-300 rounded-b-md p-5 space-y-4 shadow-xl">
          <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-sm">
            <h3 className="font-extrabold text-base text-slate-900 uppercase flex items-center gap-2 mb-2">
              <AlertOctagon className="w-5 h-5 text-rose-600" /> Registro e Triagem de Denúncias Sanitárias
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Módulo de recebimento via Ouvidoria / 1Doc para agendamento de fiscalização emergencial ou de rotina.
            </p>
            <button
              onClick={() => {
                setFormData((prev) => ({ ...prev, motivacao: 'DENÚNCIA SANITÁRIA', status: 'VISTORIA AGENDADA' }));
                setCurrentTab('cadastro');
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded shadow transition cursor-pointer"
            >
              + ABRIR PROCESSO DE DENÚNCIA
            </button>
          </div>
        </div>
      )}

      {/* ⚙️ MODAL DE CONFIGURAÇÃO DO GOOGLE SHEETS */}
      {configUrlModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#242424] border border-[#444] text-slate-100 rounded-xl max-w-2xl w-full p-5 md:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-900/60 text-emerald-400 rounded-lg border border-emerald-700/50">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                    Configuração do Google Sheets (Processos VISA)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Conexão bidirecional via Webhook do Google Apps Script
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfigUrlModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  URL do Webhook do Google Apps Script (Macro Web App):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={webhookUrlInput}
                    onChange={(e) => setWebhookUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="flex-1 bg-[#181818] border border-slate-600 rounded-lg px-3 py-2 text-xs font-mono text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <button
                    type="button"
                    disabled={testingWebhook || !webhookUrlInput.trim()}
                    onClick={async () => {
                      setTestingWebhook(true);
                      setTestResult(null);
                      const res = await testProcessosWebhook(webhookUrlInput.trim());
                      setTestResult(res);
                      setTestingWebhook(false);
                    }}
                    className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs px-3 py-2 rounded-lg transition flex items-center gap-1.5 shrink-0"
                  >
                    {testingWebhook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    {testingWebhook ? 'Testando...' : 'Testar Conexão'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Esta URL é gerada ao publicar o código do Apps Script na sua Planilha Google com permissão de acesso público ("Qualquer pessoa").
                </p>
              </div>

              {/* Resultado do Teste de Conexão */}
              {testResult && (
                <div className={`p-3 rounded-lg border text-xs font-medium ${
                  testResult.success
                    ? 'bg-emerald-950/70 border-emerald-600 text-emerald-200'
                    : 'bg-rose-950/70 border-rose-600 text-rose-200'
                }`}>
                  <p className="font-bold flex items-center gap-1.5">
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                    {testResult.message}
                  </p>
                </div>
              )}

              {/* Instruções de Implantação */}
              <div className="bg-[#181818] border border-slate-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4" /> Como vincular com sua Planilha Google Sheets:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="text-xs text-blue-400 hover:underline font-semibold"
                  >
                    {showInstructions ? 'Ocultar Código' : 'Ver Código do Google Apps Script'}
                  </button>
                </div>

                {showInstructions && (
                  <div className="space-y-2 pt-2 border-t border-slate-700">
                    <ol className="text-xs text-slate-300 list-decimal list-inside space-y-1">
                      <li>Abra sua Planilha Google de Processos.</li>
                      <li>No menu superior, vá em <strong>Extensões</strong> &gt; <strong>Apps Script</strong>.</li>
                      <li>Cole o código abaixo substituindo o conteúdo de <code className="text-amber-300 font-mono">Código.gs</code>:</li>
                    </ol>

                    <div className="relative">
                      <pre className="bg-black/90 p-3 rounded text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-48 border border-slate-800">
                        {GOOGLE_APPS_SCRIPT_TEMPLATE}
                      </pre>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
                          setSearchNotice('✅ Código do Apps Script copiado para a área de transferência!');
                          setTimeout(() => setSearchNotice(null), 4000);
                        }}
                        className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow"
                      >
                        <Copy className="w-3 h-3" /> Copiar Código
                      </button>
                    </div>

                    <ol start={4} className="text-xs text-slate-300 list-decimal list-inside space-y-1">
                      <li>Clique no botão azul <strong>Implantar</strong> &gt; <strong>Nova implantação</strong>.</li>
                      <li>Selecione o tipo <strong>Aplicativo da Web</strong>.</li>
                      <li>Em <em>Quem pode acessar</em>, escolha <strong>Qualquer pessoa</strong>.</li>
                      <li>Copie a URL gerada e cole no campo acima!</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setConfigUrlModal(false)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs px-4 py-2 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setProcessosSheetsWebhookUrl(webhookUrlInput.trim());
                  setConfigUrlModal(false);
                  setSearchNotice('✅ Configuração do Google Sheets atualizada com sucesso!');
                  setTimeout(() => setSearchNotice(null), 4000);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-5 py-2 rounded-lg transition flex items-center gap-1.5 shadow-lg"
              >
                <Save className="w-4 h-4" /> Salvar Configuração
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Processo */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="Confirmar Exclusão de Processo"
        message="Tem certeza de que deseja excluir este processo do histórico da Vigilância Sanitária?"
        itemDescription={confirmDelete.processoDesc}
        confirmText="Sim, Excluir Processo"
        onConfirm={() => {
          if (onDeleteProcesso && confirmDelete.processoId) {
            onDeleteProcesso(confirmDelete.processoId);
            if (formData.id === confirmDelete.processoId) {
              handleClearForm();
            }
          }
        }}
        onClose={() => setConfirmDelete({ isOpen: false, processoId: '', processoDesc: '' })}
      />
    </div>
  );
};
