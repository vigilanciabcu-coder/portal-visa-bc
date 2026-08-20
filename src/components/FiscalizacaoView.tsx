import React, { useState, useRef } from 'react';
import { FiscalizacaoItem, InspectionCheckitem, InspectionStatus, RiskLevel, InspectionType, UserProfile } from '../types';
import { BAIRROS_BC } from '../data/mockData';
import { fetchCnpj } from '../lib/cnpjService';
import { ConfirmModal } from './ConfirmModal';
import {
  ShieldCheck,
  PlusCircle,
  MapPin,
  Sparkles,
  Printer,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Camera,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Calendar,
  UserCheck,
  Trash2,
  X,
  History,
  Eye,
  ExternalLink
} from 'lucide-react';

interface FiscalizacaoViewProps {
  fiscalizacoes: FiscalizacaoItem[];
  currentUser: UserProfile | null;
  onSaveFiscalizacao: (item: FiscalizacaoItem) => void;
  onDeleteFiscalizacao?: (id: string) => void;
}

const CHECKLIST_DEFAULT: Omit<InspectionCheckitem, 'id'>[] = [
  { categoria: 'Higiene e Limpeza', item: 'Limpeza de bancadas, piso e equipamentos de manipulação', status: 'CONFORME' },
  { categoria: 'Higiene e Limpeza', item: 'Lixeiras com tampa acionada por pedal e sacos plásticos', status: 'CONFORME' },
  { categoria: 'Temperatura e Alimentos', item: 'Termômetro em geladeiras/freezeres e controle térmico adequado', status: 'CONFORME' },
  { categoria: 'Temperatura e Alimentos', item: 'Separação de alimentos crus e cozidos (evitar contaminação cruzada)', status: 'CONFORME' },
  { categoria: 'Validade e Procedência', item: 'Produtos dentro do prazo de validade e com rotulagem completa', status: 'CONFORME' },
  { categoria: 'Validade e Procedência', item: 'Comprovação de origem e selo de inspeção para carnes e pescados', status: 'CONFORME' },
  { categoria: 'Licenciamento e Normas', item: 'Alvará de Licença Sanitária exposto em local visível', status: 'CONFORME' },
  { categoria: 'Controle de Pragas', item: 'Comprovante atualizado de desinsetização/desratização por empresa habilitada', status: 'CONFORME' },
  { categoria: 'Manipuladores', item: 'Manipuladores com uniformes claros, limpos e proteção para cabelos (touca)', status: 'CONFORME' }
];

export const FiscalizacaoView: React.FC<FiscalizacaoViewProps> = ({
  fiscalizacoes,
  currentUser,
  onSaveFiscalizacao,
  onDeleteFiscalizacao
}) => {
  const [activeTab, setActiveTab] = useState<'lista' | 'nova' | 'mapa' | 'termo'>('lista');
  const [selectedItem, setSelectedItem] = useState<FiscalizacaoItem | null>(null);

  // Confirmation Modal State
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    id: string;
    description: string;
  }>({
    isOpen: false,
    id: '',
    description: ''
  });

  // Filters
  const [filterSearch, setFilterSearch] = useState('');
  const [filterBairro, setFilterBairro] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Initial Form State
  const initialFormData = {
    nomeFantasia: '',
    razaoSocial: '',
    cnpjCpf: '',
    situacaoCadastral: 'ATIVA',
    tipo: 'Restaurante / Alimentação',
    bairro: 'Centro',
    endereco: '',
    numero: '',
    responsavel: '',
    telefone: '',
    tipoVistoria: 'ROTINA' as InspectionType,
    risco: 'MÉDIO' as RiskLevel,
    medidasAdotadas: 'Termo de Notificação Sanitária',
    prazoAdequacaoDias: 3,
    observacoesFiscais: '',
    fotosUrl: [] as string[]
  };

  // Form State
  const [formData, setFormData] = useState(initialFormData);

  const [checklists, setChecklists] = useState<InspectionCheckitem[]>(
    CHECKLIST_DEFAULT.map((item, idx) => ({ ...item, id: `chk-new-${idx}` }))
  );

  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [signatureInspector, setSignatureInspector] = useState<string>('');
  const [signatureOwner, setSignatureOwner] = useState<string>('');
  const [cnpjNotice, setCnpjNotice] = useState<string | null>(null);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  // Lista de registros correspondentes ao CNPJ/CPF digitado (ou todos os registros do histórico se o campo estiver vazio ao focar)
  const historicoMatches = fiscalizacoes.filter((f) => {
    const cleanInput = formData.cnpjCpf.replace(/\D/g, '');
    if (!cleanInput) return true; // Se estiver em branco e focar, exibe os últimos registros disponíveis
    const cleanDoc = f.estabelecimento.cnpjCpf.replace(/\D/g, '');
    const nome = (f.estabelecimento.nomeFantasia || '').toLowerCase();
    const razao = (f.estabelecimento.razaoSocial || '').toLowerCase();
    const termo = formData.cnpjCpf.toLowerCase().trim();
    return cleanDoc.includes(cleanInput) || cleanInput.includes(cleanDoc) || nome.includes(termo) || razao.includes(termo);
  });

  // Função para carregar os dados completos do registro selecionado do histórico para o formulário
  const handleCarregarDoHistorico = (item: FiscalizacaoItem) => {
    setFormData((prev) => ({
      ...prev,
      cnpjCpf: item.estabelecimento.cnpjCpf,
      nomeFantasia: item.estabelecimento.nomeFantasia,
      razaoSocial: item.estabelecimento.razaoSocial || item.estabelecimento.nomeFantasia,
      tipo: item.estabelecimento.tipo,
      bairro: item.estabelecimento.bairro,
      endereco: item.estabelecimento.endereco,
      numero: item.estabelecimento.numero,
      responsavel: item.estabelecimento.responsavel,
      telefone: item.estabelecimento.telefone,
      tipoVistoria: item.tipoVistoria,
      risco: item.risco,
      medidasAdotadas: item.medidasAdotadas,
      prazoAdequacaoDias: item.prazoAdequacaoDias || 3,
      observacoesFiscais: item.observacoesFiscais || ''
    }));

    if (item.checklists && item.checklists.length > 0) {
      setChecklists(item.checklists);
    }

    setShowHistoryDropdown(false);
    setCnpjNotice(`📋 Dados carregados da vistoria anterior (${item.protocolo} • ${item.dataHora})`);
    setTimeout(() => setCnpjNotice(null), 5000);
  };

  // Navegar para o histórico filtrando pelo CNPJ/CPF
  const handleVerHistoricoCnpj = (customCnpj?: string) => {
    const rawVal = customCnpj || formData.cnpjCpf || '';
    const cleanDigits = rawVal.replace(/\D/g, '');
    
    // Configura o filtro com o texto digitado ou dígitos limpos
    const termoBusca = rawVal.trim() || cleanDigits;
    if (termoBusca) {
      setFilterSearch(termoBusca);
      setFilterBairro('');
      setFilterStatus('');
      setActiveTab('lista');
    } else {
      setActiveTab('lista');
    }
  };

  // Contagem de histórico anterior existente no sistema para o CNPJ/CPF informado
  const historicoCount = formData.cnpjCpf.replace(/\D/g, '').length >= 6
    ? fiscalizacoes.filter((f) => {
        const cleanDoc = f.estabelecimento.cnpjCpf.replace(/\D/g, '');
        const cleanInput = formData.cnpjCpf.replace(/\D/g, '');
        return cleanDoc.includes(cleanInput) || cleanInput.includes(cleanDoc);
      }).length
    : 0;

  // CNPJ / CPF Auto-Fill Lookup
  const handleBuscarCNPJ = async (customVal?: string) => {
    const rawVal = customVal || formData.cnpjCpf || '';
    const cleanVal = rawVal.replace(/\D/g, '');

    if (!cleanVal) {
      setCnpjNotice('⚠️ Digite o CNPJ ou CPF para buscar os dados na API da Receita Federal.');
      setTimeout(() => setCnpjNotice(null), 3500);
      return;
    }

    setLoadingCnpj(true);
    setCnpjNotice('🔍 Consultando API da Receita Federal...');

    try {
      const data = await fetchCnpj(cleanVal);

      // Normalização do Bairro sem acentos para corresponder à lista BAIRROS_BC
      const normStr = (str: string) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const rawBairro = data.bairro || '';
      const matchedBairro = BAIRROS_BC.find(
        (b) => normStr(b) === normStr(rawBairro)
      ) || BAIRROS_BC.find(
        (b) => normStr(rawBairro).includes(normStr(b)) || normStr(b).includes(normStr(rawBairro))
      ) || 'Centro';

      // Normalização do Tipo de Atividade
      let matchedTipo = 'Restaurante / Alimentação';
      if (data.tipo_atividade) {
        const t = data.tipo_atividade.toLowerCase();
        if (t.includes('feira') || t.includes('ambulante')) matchedTipo = 'Feira Livre / Ambulante';
        else if (t.includes('supermercado') || t.includes('açougue') || t.includes('acougue')) matchedTipo = 'Supermercado / Açougue';
        else if (t.includes('lanchonete') || t.includes('fast food')) matchedTipo = 'Lanchonete / Fast Food';
        else if (t.includes('drogaria') || t.includes('farmácia') || t.includes('farmacia')) matchedTipo = 'Drogaria / Farmácia';
        else if (t.includes('hotel') || t.includes('pousada')) matchedTipo = 'Hotel / Pousada';
        else if (t.includes('estética') || t.includes('estetica') || t.includes('salão') || t.includes('salao')) matchedTipo = 'Estética / Salão';
      }

      setFormData((prev) => ({
        ...prev,
        cnpjCpf: rawVal.length > 11 && !rawVal.includes('/') 
          ? cleanVal.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
          : rawVal,
        razaoSocial: data.razao || `ESTABELECIMENTO (${cleanVal}) LTDA`,
        nomeFantasia: data.nome_fantasia || data.razao || 'ESTABELECIMENTO CADASTRADO',
        situacaoCadastral: data.situacao || 'ATIVA',
        endereco: data.rua_api || 'AVENIDA BRASIL',
        numero: data.num_api || '100',
        bairro: matchedBairro,
        responsavel: data.responsavel || 'GERENTE RESPONSÁVEL',
        telefone: data.telefone || '(47) 3367-0000',
        tipo: matchedTipo,
        risco: (data.risco as RiskLevel) || 'MÉDIO'
      }));
      setCnpjNotice(`✅ Dados da Receita Federal carregados para: ${data.nome_fantasia || data.razao}`);
    } catch (e) {
      console.error('Erro na busca de CNPJ:', e);
      setCnpjNotice('⚠️ Não foi possível consultar o CNPJ automaticamente.');
    } finally {
      setLoadingCnpj(false);
      setTimeout(() => setCnpjNotice(null), 5000);
    }
  };

  // Run AI Legal Analysis
  const handleAnalisarIA = async () => {
    const irregularidades = checklists
      .filter((c) => c.status === 'NAO_CONFORME')
      .map((c) => `${c.categoria}: ${c.item} ${c.observacao ? `(${c.observacao})` : ''}`);

    setLoadingAi(true);
    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoVistoria: formData.tipoVistoria,
          tipoEstabelecimento: `${formData.tipo} - ${formData.nomeFantasia}`,
          irregularidades,
          observacoes: formData.observacoesFiscais,
          risco: formData.risco
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data.text || 'Análise concluída.');
      } else {
        setAiAnalysis('Não foi possível conectar ao assistente Gemini. Utilize a fundamentação legal padrão.');
      }
    } catch {
      setAiAnalysis('Análise de RDC executada off-line. Enquadramento legal recomendado: RDC Anvisa nº 216/2004 e Lei de Saúde de BC.');
    } finally {
      setLoadingAi(false);
    }
  };

  // Add Photo
  const handleAddPhotoSample = () => {
    const samples = [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=600&q=80'
    ];
    const picked = samples[Math.floor(Math.random() * samples.length)];
    setFormData((prev) => ({
      ...prev,
      fotosUrl: [...prev.fotosUrl, picked]
    }));
  };

  // Submit Inspection
  const handleSubmitNewInspection = (e: React.FormEvent) => {
    e.preventDefault();

    const irregularidades = checklists
      .filter((c) => c.status === 'NAO_CONFORME')
      .map((c) => `${c.item}${c.observacao ? `: ${c.observacao}` : ''}`);

    let status: InspectionStatus = 'CONFORME';
    if (irregularidades.length > 0) {
      if (formData.risco === 'CRÍTICO' || formData.medidasAdotadas.includes('Interdição')) {
        status = 'INTERDITADO';
      } else {
        status = 'NOTIFICADO';
      }
    }

    const newProtocol = `FIS-2026/${Math.floor(1000 + Math.random() * 9000)}`;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const newItem: FiscalizacaoItem = {
      id: `fisc-${Date.now()}`,
      protocolo: newProtocol,
      dataHora: nowStr,
      fiscalId: currentUser?.id || 'f1',
      fiscalNome: currentUser?.nome_completo || 'Carlos Eduardo Silva',
      estabelecimento: {
        nomeFantasia: formData.nomeFantasia || 'Estabelecimento sem nome',
        razaoSocial: formData.razaoSocial || formData.nomeFantasia,
        cnpjCpf: formData.cnpjCpf || '00.000.000/0001-00',
        tipo: formData.tipo,
        bairro: formData.bairro,
        endereco: formData.endereco,
        numero: formData.numero,
        responsavel: formData.responsavel || 'Não informado',
        telefone: formData.telefone || '(47) 3367-0000'
      },
      tipoVistoria: formData.tipoVistoria,
      risco: formData.risco,
      status,
      checklists,
      irregularidadesEncontradas: irregularidades,
      medidasAdotadas: formData.medidasAdotadas,
      prazoAdequacaoDias: formData.prazoAdequacaoDias,
      observacoesFiscais: formData.observacoesFiscais,
      fotosUrl: formData.fotosUrl,
      assinaturaInspector: signatureInspector || 'Assinado Digitalmente por Fiscal DVIS',
      assinaturaResponsavel: signatureOwner || 'Ciente do Responsável Técnico',
      coordenadas: { lat: -26.9922 + (Math.random() - 0.5) * 0.03, lng: -48.6345 + (Math.random() - 0.5) * 0.03 },
      parecerIA: aiAnalysis
    };

    onSaveFiscalizacao(newItem);
    setSelectedItem(newItem);
    setActiveTab('termo');

    // Limpar o formulário para a próxima vistoria iniciar do zero
    setFormData(initialFormData);
    setChecklists(CHECKLIST_DEFAULT.map((item, idx) => ({ ...item, id: `chk-new-${idx}-${Date.now()}` })));
    setAiAnalysis('');
    setSignatureInspector('');
    setSignatureOwner('');
    setShowHistoryDropdown(false);
    setCnpjNotice(null);
  };

  // Filtered List
  const filteredList = fiscalizacoes.filter((f) => {
    const matchText =
      f.estabelecimento.nomeFantasia.toLowerCase().includes(filterSearch.toLowerCase()) ||
      f.protocolo.toLowerCase().includes(filterSearch.toLowerCase()) ||
      f.estabelecimento.cnpjCpf.includes(filterSearch);
    const matchBairro = !filterBairro || f.estabelecimento.bairro === filterBairro;
    const matchStatus = !filterStatus || f.status === filterStatus;
    return matchText && matchBairro && matchStatus;
  });

  // Print term
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-left">
      {/* Top Banner & Stats */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 p-6 rounded-3xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-500/40 uppercase tracking-widest flex items-center gap-1.5 inline-flex mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Sistema de Vistorias em Tempo Real • DVIS BC
          </span>
          <h1 className="text-2xl md:text-3xl font-black italic tracking-tight">
            Fiscalização Sanitária Integrada
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Emissão de Termos de Notificação, Intimação, Autuação e Interdição Cautelar em campo com validação legal e assinatura digital.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('nova')}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-5 py-3 rounded-2xl shadow-lg transition flex items-center gap-2 text-xs uppercase cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> Nova Vistoria
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('lista')}
          className={`px-4 py-2 rounded-xl font-bold text-xs uppercase transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'lista'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" /> Vistorias Registradas ({fiscalizacoes.length})
        </button>

        <button
          onClick={() => setActiveTab('nova')}
          className={`px-4 py-2 rounded-xl font-bold text-xs uppercase transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'nova'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          <PlusCircle className="w-4 h-4" /> Nova Fiscalização em Tempo Real
        </button>

        <button
          onClick={() => setActiveTab('mapa')}
          className={`px-4 py-2 rounded-xl font-bold text-xs uppercase transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'mapa'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          <MapPin className="w-4 h-4" /> Mapa de Campo (BC)
        </button>

        {selectedItem && (
          <button
            onClick={() => setActiveTab('termo')}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'termo'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Printer className="w-4 h-4" /> Termo Oficial #{selectedItem.protocolo}
          </button>
        )}
      </div>

      {/* TAB 1: LISTA DE VISTORIAS */}
      {activeTab === 'lista' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome, protocolo ou CNPJ..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="pl-9 pr-7 w-full"
              />
              {filterSearch && (
                <button
                  type="button"
                  onClick={() => setFilterSearch('')}
                  className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div>
              <select value={filterBairro} onChange={(e) => setFilterBairro(e.target.value)} className="w-full">
                <option value="">Todos os Bairros de BC</option>
                {BAIRROS_BC.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full">
                <option value="">Todos os Status</option>
                <option value="CONFORME">CONFORME</option>
                <option value="NOTIFICADO">NOTIFICADO</option>
                <option value="INTERDITADO">INTERDITADO</option>
                <option value="EM_ANDAMENTO">EM ANDAMENTO</option>
              </select>
            </div>

            <div className="flex items-center text-xs text-slate-500 justify-between md:justify-end gap-2 font-bold">
              {(filterSearch || filterBairro || filterStatus) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterSearch('');
                    setFilterBairro('');
                    setFilterStatus('');
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] cursor-pointer"
                >
                  Ver Todos
                </button>
              )}
              <span>Exibindo {filteredList.length} registro(s)</span>
            </div>
          </div>

          {/* Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map((f) => (
              <div
                key={f.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-blue-500 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 uppercase">
                      {f.protocolo}
                    </span>

                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                        f.status === 'CONFORME'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : f.status === 'INTERDITADO'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 animate-pulse'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {f.status}
                    </span>
                  </div>

                  <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight uppercase mb-1">
                    {f.estabelecimento.nomeFantasia}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mb-3">
                    {f.estabelecimento.tipo} • Bairro {f.estabelecimento.bairro}
                  </p>

                  <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-2 mb-3">
                    <p className="truncate">📍 {f.estabelecimento.endereco}, {f.estabelecimento.numero}</p>
                    <p>👨‍💼 Responsável: {f.estabelecimento.responsavel}</p>
                    <p>👮 Fiscal: {f.fiscalNome}</p>
                    <p>🕒 {f.dataHora}</p>
                  </div>

                  {f.irregularidadesEncontradas.length > 0 && (
                    <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-[10px] text-red-800 dark:text-red-300 mb-3">
                      <p className="font-black uppercase mb-0.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-600" /> Irregularidades ({f.irregularidadesEncontradas.length}):
                      </p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {f.irregularidadesEncontradas.slice(0, 2).map((ir, i) => (
                          <li key={i} className="truncate">{ir}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-400">Risco: {f.risco}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedItem(f);
                        setActiveTab('termo');
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] px-3 py-1.5 rounded-xl uppercase transition cursor-pointer flex items-center gap-1"
                    >
                      <Printer className="w-3 h-3" /> Ver Termo
                    </button>
                    {onDeleteFiscalizacao && (
                      <button
                        onClick={() => {
                          setConfirmDelete({
                            isOpen: true,
                            id: f.id,
                            description: `${f.protocolo} • ${f.estabelecimento.nomeFantasia} (${f.dataHora})`
                          });
                        }}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition cursor-pointer"
                        title="Excluir auto de vistoria"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: NOVA FISCALIZAÇÃO */}
      {activeTab === 'nova' && (
        <form onSubmit={handleSubmitNewInspection} className="space-y-6 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg text-slate-900 dark:text-white">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h2 className="text-xl font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-500" /> Formulário de Vistoria e Fiscalização em Tempo Real
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Preencha os dados do local, realize o checklist de conformidade e emita o documento oficial com validade fiscal.
            </p>
          </div>

          {/* Secao 1: Dados do Estabelecimento */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-500" /> 1. Identificação do Estabelecimento
            </h3>

            {cnpjNotice && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 rounded-2xl text-xs font-bold transition flex items-center justify-between">
                <span>{cnpjNotice}</span>
                <button type="button" onClick={() => setCnpjNotice(null)} className="text-blue-600 dark:text-blue-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold uppercase block">CNPJ / CPF</label>
                  {historicoMatches.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                      className="text-[9px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Ver e carregar vistorias anteriores deste CNPJ/CPF"
                    >
                      <History className="w-3 h-3 text-amber-500" />
                      <span>{historicoMatches.length} no histórico (Ver/Carregar)</span>
                    </button>
                  ) : (
                    <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">⚡ API Receita Sync</span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Ex: 00.000.000/0001-00"
                    value={formData.cnpjCpf}
                    onFocus={() => {
                      if (historicoMatches.length > 0) {
                        setShowHistoryDropdown(true);
                      }
                    }}
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

                      setFormData((prev) => ({ ...prev, cnpjCpf: formatted }));
                      setShowHistoryDropdown(true);

                      if (digits.length === 14 || digits.length === 11) {
                        handleBuscarCNPJ(digits);
                      }
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text');
                      const digits = pasted.replace(/\D/g, '');
                      if (digits.length === 14 || digits.length === 11) {
                        setTimeout(() => handleBuscarCNPJ(digits), 60);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleBuscarCNPJ();
                      }
                    }}
                    className="flex-1 font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                    title="Exibir histórico de vistorias deste CNPJ/CPF"
                    className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <History className="w-3 h-3" />
                    <span>Histórico</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBuscarCNPJ()}
                    disabled={loadingCnpj}
                    title="Consultar dados na API da Receita Federal"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    {loadingCnpj ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'API'}
                  </button>
                </div>

                {/* Dropdown de Histórico Interativo de Vistorias do CNPJ/CPF */}
                {showHistoryDropdown && historicoMatches.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 border-2 border-amber-400/80 dark:border-amber-500/50 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-72 overflow-y-auto">
                    <div className="bg-amber-50 dark:bg-amber-950/80 px-3 py-2 border-b border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-300">
                        <History className="w-3.5 h-3.5 text-amber-600" />
                        <span>Histórico Encontrado ({historicoMatches.length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            handleVerHistoricoCnpj();
                            setShowHistoryDropdown(false);
                          }}
                          className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Ver Lista Geral
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowHistoryDropdown(false)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50 text-left">
                      {historicoMatches.map((hist) => (
                        <div
                          key={hist.id}
                          className="p-3 hover:bg-amber-50/50 dark:hover:bg-slate-700/60 transition flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/70 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800">
                                {hist.protocolo}
                              </span>
                              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                                🕒 {hist.dataHora}
                              </span>
                              <span
                                className={`text-[8.5px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                                  hist.status === 'CONFORME'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : hist.status === 'INTERDITADO'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {hist.status}
                              </span>
                            </div>
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {hist.estabelecimento.nomeFantasia}
                            </h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {hist.estabelecimento.cnpjCpf} • {hist.estabelecimento.endereco}, {hist.estabelecimento.numero} - {hist.estabelecimento.bairro}
                            </p>
                            {hist.irregularidadesEncontradas && hist.irregularidadesEncontradas.length > 0 && (
                              <p className="text-[9.5px] text-rose-600 dark:text-rose-400 font-bold truncate mt-0.5">
                                ⚠️ {hist.irregularidadesEncontradas.length} irregularidade(s) registrada(s)
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCarregarDoHistorico(hist)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] px-2.5 py-1.5 rounded-xl uppercase transition cursor-pointer flex items-center gap-1 shadow-xs"
                              title="Carregar dados desta vistoria para o formulário"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>Carregar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItem(hist);
                                setActiveTab('termo');
                                setShowHistoryDropdown(false);
                              }}
                              className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-[10px] px-2 py-1.5 rounded-xl uppercase transition cursor-pointer flex items-center gap-1"
                              title="Visualizar Termo Completo"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Ver</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase block mb-1">Situação Cadastral</label>
                <input
                  type="text"
                  placeholder="Ex: ATIVA"
                  value={formData.situacaoCadastral}
                  onChange={(e) => setFormData({ ...formData, situacaoCadastral: e.target.value })}
                  className={`font-black uppercase tracking-wider ${
                    formData.situacaoCadastral?.toUpperCase().includes('ATIV')
                      ? 'text-emerald-700 bg-emerald-50/80 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                      : 'text-red-700 bg-red-50/80 dark:bg-red-950/50 dark:text-red-400 border-red-300 dark:border-red-800'
                  }`}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase block mb-1">Nome Fantasia / Local</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Quiosque / Restaurante"
                  value={formData.nomeFantasia}
                  onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase block mb-1">Razão Social</label>
                <input
                  type="text"
                  placeholder="Razão social oficial"
                  value={formData.razaoSocial}
                  onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase block mb-1">Tipo de Atividade</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                >
                  <option value="Restaurante / Alimentação">Restaurante / Gastronomia</option>
                  <option value="Feira Livre / Ambulante">Feira Livre / Feirante</option>
                  <option value="Supermercado / Açougue">Supermercado / Açougue</option>
                  <option value="Lanchonete / Fast Food">Lanchonete / Fast Food</option>
                  <option value="Drogaria / Farmácia">Drogaria / Farmácia</option>
                  <option value="Hotel / Pousada">Hotel / Pousada</option>
                  <option value="Estética / Salão">Estética / Salão de Beleza</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase block mb-1">Bairro</label>
                <select
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                >
                  {BAIRROS_BC.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase block mb-1">Logradouro / Rua</label>
                    <input
                      type="text"
                      placeholder="Ex: Avenida Brasil, Rua 1500"
                      value={formData.endereco}
                      onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1">Número</label>
                    <input
                      type="text"
                      placeholder="Ex: 870"
                      maxLength={10}
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value.slice(0, 10) })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase block mb-1">Responsável do Local</label>
                <input
                  type="text"
                  placeholder="Nome do gerente / proprietário"
                  value={formData.responsavel}
                  onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase block mb-1">Telefone Contato</label>
                <input
                  type="text"
                  placeholder="(47) 99999-0000"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase block mb-1">Tipo de Vistoria</label>
                <select
                  value={formData.tipoVistoria}
                  onChange={(e) => setFormData({ ...formData, tipoVistoria: e.target.value as InspectionType })}
                >
                  <option value="ROTINA">ROTINA</option>
                  <option value="DENÚNCIA">DENÚNCIA</option>
                  <option value="RENOVAÇÃO">RENOVAÇÃO DE ALVARÁ</option>
                  <option value="REINSPEÇÃO">REINSPEÇÃO</option>
                  <option value="OPERAÇÃO_VERÃO">OPERAÇÃO VERÃO / BLITZ</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase block mb-1">Classificação de Risco</label>
                <select
                  value={formData.risco}
                  onChange={(e) => setFormData({ ...formData, risco: e.target.value as RiskLevel })}
                  className="font-bold text-amber-600"
                >
                  <option value="BAIXO">BAIXO RISCO</option>
                  <option value="MÉDIO">MÉDIO RISCO</option>
                  <option value="ALTO">ALTO RISCO</option>
                  <option value="CRÍTICO">CRÍTICO - INTERDIÇÃO</option>
                </select>
              </div>
            </div>
          </div>

          {/* Secao 2: Checklist Sanitário */}
          <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-6">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> 2. Roteiro de Inspeção Higiênico-Sanitária
              </span>
              <span className="text-[10px] text-slate-400">RDC Anvisa nº 216/2004</span>
            </h3>

            <div className="space-y-3">
              {checklists.map((chk, index) => (
                <div
                  key={chk.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex-1">
                    <span className="text-[8px] font-black uppercase bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                      {chk.categoria}
                    </span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1">
                      {chk.item}
                    </p>
                    {chk.status === 'NAO_CONFORME' && (
                      <input
                        type="text"
                        placeholder="Detalhes da irregularidade encontrada..."
                        value={chk.observacao || ''}
                        onChange={(e) => {
                          const updated = [...checklists];
                          updated[index].observacao = e.target.value;
                          setChecklists(updated);
                        }}
                        className="mt-2 text-[10px] w-full border-red-300 focus:border-red-500"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...checklists];
                        updated[index].status = 'CONFORME';
                        setChecklists(updated);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition cursor-pointer ${
                        chk.status === 'CONFORME'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Conforme
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...checklists];
                        updated[index].status = 'NAO_CONFORME';
                        setChecklists(updated);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition cursor-pointer ${
                        chk.status === 'NAO_CONFORME'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Não Conforme
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...checklists];
                        updated[index].status = 'NAO_APLICA';
                        setChecklists(updated);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition cursor-pointer ${
                        chk.status === 'NAO_APLICA'
                          ? 'bg-slate-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      N/A
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Secao 3: Evidencias Fotográficas & Inteligência Artificial */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200 dark:border-slate-800 pt-6">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-500 mb-3 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-purple-500" /> 3. Registro Fotográfico de Campo
              </h3>

              <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-3">
                <p className="text-xs text-slate-500">Capture ou anexe fotos de não conformidades para instrução do auto.</p>
                <button
                  type="button"
                  onClick={handleAddPhotoSample}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase cursor-pointer transition inline-flex items-center gap-1.5"
                >
                  <Camera className="w-4 h-4" /> Anexar Foto de Evidência
                </button>

                {formData.fotosUrl.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 justify-center">
                    {formData.fotosUrl.map((url, i) => (
                      <img key={i} src={url} alt="Evidência" className="w-20 h-20 object-cover rounded-xl border border-slate-300" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase text-slate-500 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" /> 4. Assistente IA Gemini de Fundamentação Legal
                </span>
                <button
                  type="button"
                  onClick={handleAnalisarIA}
                  disabled={loadingAi}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-3 py-1 rounded-lg text-[10px] uppercase transition cursor-pointer flex items-center gap-1"
                >
                  {loadingAi ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Analisar Legislação'}
                </button>
              </h3>

              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 text-xs min-h-[120px]">
                {aiAnalysis ? (
                  <p className="whitespace-pre-wrap text-slate-800 dark:text-amber-100 text-[11px] leading-relaxed">{aiAnalysis}</p>
                ) : (
                  <p className="text-slate-400 text-center italic py-6">
                    Clique em &quot;Analisar Legislação&quot; para gerar automaticamente os enquadramentos legais da RDC 216/2004 Anvisa e Lei Municipal.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Secao 4: Medidas Adotadas e Assinatura */}
          <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-6">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">
              5. Decisão Fiscal & Assinatura do Termo
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase block mb-1">Medida Cautelar / Termo Emitido</label>
                <select
                  value={formData.medidasAdotadas}
                  onChange={(e) => setFormData({ ...formData, medidasAdotadas: e.target.value })}
                >
                  <option value="Termo de Notificação Sanitária">Termo de Notificação - Conforme</option>
                  <option value="Termo de Intimação com Prazo">Termo de Intimação - Adequação</option>
                  <option value="Auto de Infração e Autuação">Auto de Infração - Penalidade</option>
                  <option value="Termo de Interdição Cautelar Parcial">Termo de Interdição Parcial</option>
                  <option value="Termo de Interdição Cautelar Total">Termo de Interdição Total</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase block mb-1">Prazo para Adequação</label>
                <input
                  type="number"
                  value={formData.prazoAdequacaoDias}
                  onChange={(e) => setFormData({ ...formData, prazoAdequacaoDias: parseInt(e.target.value, 10) || 0 })}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase block mb-1">Assinatura Digital do Responsável</label>
                <input
                  type="text"
                  placeholder="Nome por extenso do responsável legal"
                  value={signatureOwner}
                  onChange={(e) => setSignatureOwner(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase block mb-1">Observações Fiscais do Auto</label>
              <textarea
                rows={3}
                placeholder="Insira detalhes complementares da vistoria..."
                value={formData.observacoesFiscais}
                onChange={(e) => setFormData({ ...formData, observacoesFiscais: e.target.value })}
              />
            </div>
          </div>

          {/* Botao Salvar */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('lista')}
              className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-6 py-3 rounded-2xl uppercase text-xs cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-10 py-3 rounded-2xl uppercase text-xs shadow-xl cursor-pointer transition flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" /> Emitir e Finalizar Fiscalização
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: MAPA DE CAMPO */}
      {activeTab === 'mapa' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black uppercase text-blue-600 dark:text-blue-400">
                Mapa Operacional de Balneário Camboriú
              </h2>
              <p className="text-xs text-slate-500">Distribuição geográfica das vistorias ativas e interdições.</p>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-black px-3 py-1 rounded-full uppercase">
              Ao Vivo
            </span>
          </div>

          {/* Interactive Map Visual */}
          <div className="relative w-full h-[450px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
            {/* Map Background Grid */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>

            {/* Sea representation */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-blue-950/60 border-l border-blue-800/40 flex items-center justify-center">
              <span className="text-blue-500/40 text-sm font-black uppercase rotate-90 tracking-widest">Oceano Atlântico • Praia Central BC</span>
            </div>

            {/* Pins */}
            {fiscalizacoes.map((f, i) => (
              <div
                key={f.id}
                onClick={() => {
                  setSelectedItem(f);
                  setActiveTab('termo');
                }}
                className="absolute z-20 cursor-pointer group transform -translate-x-1/2 -translate-y-1/2 transition hover:scale-125"
                style={{
                  top: `${25 + (i * 22) % 65}%`,
                  left: `${20 + (i * 18) % 45}%`
                }}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-[10px] shadow-lg border-2 border-white ${
                    f.status === 'INTERDITADO'
                      ? 'bg-red-600 animate-bounce'
                      : f.status === 'NOTIFICADO'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                </div>

                {/* Tooltip */}
                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-950 text-white p-2 rounded-xl text-[10px] shadow-2xl border border-slate-700 z-50">
                  <p className="font-black uppercase text-blue-400">{f.estabelecimento.nomeFantasia}</p>
                  <p className="text-slate-300">Bairro: {f.estabelecimento.bairro}</p>
                  <p className="font-bold text-amber-400">Status: {f.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TERMO OFICIAL IMPRESSÃO */}
      {activeTab === 'termo' && selectedItem && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500">Documento Oficial de Fiscalização Sanitária</span>
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-2 rounded-xl text-xs uppercase cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Imprimir Documento
            </button>
          </div>

          {/* Printable Document Box */}
          <div
            id="printable-term"
            className="bg-white text-slate-900 p-8 md:p-12 rounded-3xl border border-slate-300 shadow-2xl max-w-4xl mx-auto space-y-6 font-serif"
          >
            {/* Header Documento */}
            <div className="text-center border-b-2 border-slate-900 pb-6 space-y-2">
              <div className="flex justify-center items-center gap-4 mb-2">
                <img
                  src="https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/logo_bc.avif"
                  alt="Prefeitura"
                  className="h-14"
                />
                <img
                  src="https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/DVIS.2.avif"
                  alt="DVIS"
                  className="h-14"
                />
              </div>
              <h1 className="text-lg font-black uppercase tracking-tight">PREFEITURA MUNICIPAL DE BALNEÁRIO CAMBORIÚ</h1>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">SECRETARIA MUNICIPAL DE SAÚDE • DIRETORIA DE VIGILÂNCIA SANITÁRIA (DVIS)</h2>
              <div className="inline-block bg-slate-900 text-white font-sans font-black text-xs px-4 py-1 uppercase tracking-widest rounded mt-2">
                {selectedItem.medidasAdotadas.toUpperCase()} #{selectedItem.protocolo}
              </div>
            </div>

            {/* Identificação do Estabelecimento */}
            <div className="font-sans text-xs space-y-2 border-b border-slate-300 pb-4">
              <div className="grid grid-cols-2 gap-2">
                <p><strong>ESTABELECIMENTO:</strong> {selectedItem.estabelecimento.nomeFantasia}</p>
                <p><strong>RAZÃO SOCIAL:</strong> {selectedItem.estabelecimento.razaoSocial}</p>
                <p><strong>CNPJ/CPF:</strong> {selectedItem.estabelecimento.cnpjCpf}</p>
                <p><strong>TIPO ATIVIDADE:</strong> {selectedItem.estabelecimento.tipo}</p>
                <p><strong>ENDEREÇO:</strong> {selectedItem.estabelecimento.endereco}, {selectedItem.estabelecimento.numero} - {selectedItem.estabelecimento.bairro}</p>
                <p><strong>RESPONSÁVEL:</strong> {selectedItem.estabelecimento.responsavel}</p>
                <p><strong>DATA / HORA:</strong> {selectedItem.dataHora}</p>
                <p><strong>NÍVEL DE RISCO:</strong> {selectedItem.risco}</p>
              </div>
            </div>

            {/* Constatações e Irregularidades */}
            <div className="font-sans text-xs space-y-3">
              <h3 className="font-black uppercase text-sm border-b border-slate-200 pb-1">1. CONSTATAÇÕES FISCAIS</h3>
              {selectedItem.irregularidadesEncontradas.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 text-red-900 bg-red-50 p-3 rounded-lg border border-red-200">
                  {selectedItem.irregularidadesEncontradas.map((ir, i) => (
                    <li key={i}>{ir}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-emerald-800 bg-emerald-50 p-3 rounded-lg border border-emerald-200 font-bold">
                  Nenhuma irregularidade detectada durante a inspeção de rotina. Estabelecimento em conformidade.
                </p>
              )}
            </div>

            {/* Medidas Sanitárias e Prazo */}
            <div className="font-sans text-xs space-y-2">
              <h3 className="font-black uppercase text-sm border-b border-slate-200 pb-1">2. DETERMINAÇÕES SANITÁRIAS</h3>
              <p><strong>MEDIDA ADOTADA:</strong> {selectedItem.medidasAdotadas}</p>
              {selectedItem.prazoAdequacaoDias ? (
                <p><strong>PRAZO CONCEDIDO PARA ADEQUAÇÃO:</strong> {selectedItem.prazoAdequacaoDias} dia(s) a contar do recebimento deste termo.</p>
              ) : null}
              <p><strong>OBSERVAÇÕES:</strong> {selectedItem.observacoesFiscais || 'Conforme disposto na legislação sanitária municipal e federal.'}</p>
            </div>

            {/* Enquadramento Legal */}
            {selectedItem.parecerIA && (
              <div className="font-sans text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <p className="font-black uppercase text-slate-700">3. ENQUADRAMENTO LEGAL E FUNDAMENTAÇÃO</p>
                <p className="whitespace-pre-wrap">{selectedItem.parecerIA}</p>
              </div>
            )}

            {/* Assinaturas */}
            <div className="font-sans pt-12 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="border-t border-slate-900 pt-2">
                <p className="font-black uppercase">{selectedItem.fiscalNome}</p>
                <p className="text-slate-600 text-[10px]">Fiscal de Vigilância Sanitária • DVIS BC</p>
              </div>

              <div className="border-t border-slate-900 pt-2">
                <p className="font-black uppercase">{selectedItem.assinaturaResponsavel || selectedItem.estabelecimento.responsavel}</p>
                <p className="text-slate-600 text-[10px]">Responsável / Representante Legal</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Fiscalização */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="Excluir Auto de Fiscalização"
        message="Tem certeza de que deseja excluir este auto de vistoria e termo do sistema?"
        itemDescription={confirmDelete.description}
        confirmText="Sim, Excluir Vistoria"
        onConfirm={() => {
          if (onDeleteFiscalizacao && confirmDelete.id) {
            onDeleteFiscalizacao(confirmDelete.id);
            if (selectedItem?.id === confirmDelete.id) {
              setSelectedItem(null);
              setActiveTab('lista');
            }
          }
        }}
        onClose={() => setConfirmDelete({ isOpen: false, id: '', description: '' })}
      />
    </div>
  );
};
