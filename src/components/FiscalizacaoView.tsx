import React, { useState, useRef, useEffect } from 'react';
import {
  FiscalizacaoItem,
  InspectionCheckitem,
  InspectionStatus,
  RiskLevel,
  InspectionType,
  UserProfile,
  ProcessoItem,
  ParecerTecnicoItem,
  TramitacaoItem,
  TipoParecerTecnico,
  TipoAtoFiscalRito,
  CautelarItemQualificado,
  RelatorioCircunstanciadoItem
} from '../types';
import { BAIRROS_BC } from '../data/mockData';
import { fetchCnpj } from '../lib/cnpjService';
import { ConfirmModal } from './ConfirmModal';
import {
  INCISOS_ART_61_LEI_ESTADUAL_6320,
  INCISOS_ART_158_LCM_40_2019,
  DESCRICOES_ETAPAS_RITO
} from '../data/normativaSanitariaData';
import { RitoProcessualDocumentoModal } from './RitoProcessualDocumentoModal';
import {
  ShieldCheck,
  PlusCircle,
  MapPin,
  Sparkles,
  Printer,
  FileText,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
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
  ExternalLink,
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  FileSignature,
  Download,
  Wifi,
  WifiOff,
  UploadCloud,
  Scale,
  Lock
} from 'lucide-react';
import { exportFiscalizacoesToCSV, downloadCsvFile } from '../lib/csvExportService';

interface FiscalizacaoViewProps {
  fiscalizacoes: FiscalizacaoItem[];
  currentUser: UserProfile | null;
  onSaveFiscalizacao: (item: FiscalizacaoItem) => void;
  onDeleteFiscalizacao?: (id: string) => void;
  processoVinculado?: ProcessoItem | null;
  onLimparProcessoVinculado?: () => void;
  onVoltarParaDemandas?: () => void;
  onSaveProcesso?: (processo: ProcessoItem) => void;
  onOpenExternal?: (url: string) => void;
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
  onDeleteFiscalizacao,
  processoVinculado,
  onLimparProcessoVinculado,
  onVoltarParaDemandas,
  onSaveProcesso,
  onOpenExternal
}) => {
  const [activeTab, setActiveTab] = useState<'lista' | 'nova' | 'mapa' | 'termo'>('lista');
  const [selectedItem, setSelectedItem] = useState<FiscalizacaoItem | null>(null);
  const [notificacaoVinculoSucesso, setNotificacaoVinculoSucesso] = useState<{
    titulo: string;
    mensagem: string;
    protocolo: string;
    processoNum: string;
  } | null>(null);

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

  // ⚖️ Rito Processual Sanitário (Normativa Interna DVIS - Sequência Lógica em 5 Etapas)
  const [tipoAtoFiscal, setTipoAtoFiscal] = useState<TipoAtoFiscalRito>('INTIMACAO');
  const [art61EstadualIncisos, setArt61EstadualIncisos] = useState<string[]>([]);
  const [art158MunicipalIncisos, setArt158MunicipalIncisos] = useState<string[]>([]);
  const [irregularidadeImputada, setIrregularidadeImputada] = useState<string>('');
  const [autoIntimacaoAnterior, setAutoIntimacaoAnterior] = useState<string>('');

  // 3.5 Relatório de Inspeção Sanitária Circunstanciado (Peça Técnica Obrigatória no PAS)
  const [relCircFatos, setRelCircFatos] = useState<string>('');
  const [relCircDificultacao, setRelCircDificultacao] = useState<boolean>(false);
  const [relCircCompromisso, setRelCircCompromisso] = useState<boolean>(true);
  const [relCircConduta, setRelCircConduta] = useState<string>('');

  // 4. Medida Cautelar (Peça Exclusiva com Qualificação e Lacres)
  const [cautelarTipo, setCautelarTipo] = useState<'INTERDICAO_TOTAL' | 'INTERDICAO_PARCIAL' | 'APREENSAO' | 'INUTILIZACAO'>('INTERDICAO_PARCIAL');
  const [cautelarItens, setCautelarItens] = useState<CautelarItemQualificado[]>([
    { descricao: 'Alimentos perecíveis sem comprovação de origem ou rotulagem', quantidade: '15 kg', lacreNumero: 'LACRE-DVIS-0941', lote: 'L-2026/01' }
  ]);
  const [cautelarFielDepositarioNome, setCautelarFielDepositarioNome] = useState<string>('');
  const [cautelarFielDepositarioCpf, setCautelarFielDepositarioCpf] = useState<string>('');

  // 5. Auto de Imposição de Penalidade (Julgamento do PAS - Autoridade Sanitária)
  const [penalidadeTipo, setPenalidadeTipo] = useState<'ADVERTENCIA' | 'MULTA' | 'INUTILIZACAO' | 'INTERDICAO' | 'CANCELAMENTO_LICENCA'>('MULTA');
  const [penalidadeValorMulta, setPenalidadeValorMulta] = useState<number>(1500);
  const [penalidadeFundamentacao, setPenalidadeFundamentacao] = useState<string>('');

  // Entrega Presencial / Ciência com Comprovação / Recusa por 2 Testemunhas
  const [entregaPresencialTipo, setEntregaPresencialTipo] = useState<'PRESENCIAL_RECEBIDO' | 'RECUSA_TESTEMUNHAS' | 'POSTAL'>('PRESENCIAL_RECEBIDO');
  const [recusaTestemunha1Nome, setRecusaTestemunha1Nome] = useState<string>('');
  const [recusaTestemunha1Cpf, setRecusaTestemunha1Cpf] = useState<string>('');
  const [recusaTestemunha2Nome, setRecusaTestemunha2Nome] = useState<string>('');
  const [recusaTestemunha2Cpf, setRecusaTestemunha2Cpf] = useState<string>('');

  // Modal do Documento Oficial do Rito
  const [modalRitoOpen, setModalRitoOpen] = useState(false);
  const [itemParaRitoModal, setItemParaRitoModal] = useState<FiscalizacaoItem | null>(null);

  // 📡 Modo Offline de Campo Robusto & Fila de Sincronização em Segundo Plano
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [offlineQueue, setOfflineQueue] = useState<FiscalizacaoItem[]>(() => {
    try {
      const saved = localStorage.getItem('visa_offline_fiscalizacoes_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [syncToast, setSyncToast] = useState<{ count: number; timestamp: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listener para restabelecimento de conexão e sincronização automática
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const raw = localStorage.getItem('visa_offline_fiscalizacoes_queue');
      if (raw) {
        try {
          const queue: FiscalizacaoItem[] = JSON.parse(raw);
          if (queue.length > 0) {
            queue.forEach((item) => {
              onSaveFiscalizacao(item);
            });
            localStorage.removeItem('visa_offline_fiscalizacoes_queue');
            setOfflineQueue([]);
            setSyncToast({ count: queue.length, timestamp: new Date().toLocaleTimeString('pt-BR') });
          }
        } catch (e) {
          console.error('Erro na sincronização de vistorias offline:', e);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onSaveFiscalizacao]);

  // Sincronização manual da fila offline
  const handleSincronizarFilaManual = () => {
    if (offlineQueue.length === 0) return;
    offlineQueue.forEach((item) => {
      onSaveFiscalizacao(item);
    });
    localStorage.removeItem('visa_offline_fiscalizacoes_queue');
    const qtd = offlineQueue.length;
    setOfflineQueue([]);
    setSyncToast({ count: qtd, timestamp: new Date().toLocaleTimeString('pt-BR') });
  };

  // Captura e upload de fotos da câmera/galeria via Base64 offline
  const handleCapturePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setFormData((prev) => ({
            ...prev,
            fotosUrl: [...prev.fotosUrl, result]
          }));
        }
      };
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      fotosUrl: prev.fotosUrl.filter((_, i) => i !== index)
    }));
  };

  // 🔗 Preenchimento automático quando acionado a partir de uma Demanda / Processo
  useEffect(() => {
    if (processoVinculado) {
      setActiveTab('nova');
      setNotificacaoVinculoSucesso(null);

      // Normalização do Bairro sem acentos para casar com BAIRROS_BC
      const rawBairro = processoVinculado.bairro || '';
      const normStr = (str: string) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const matchedBairro = BAIRROS_BC.find(
        (b) => normStr(b) === normStr(rawBairro)
      ) || BAIRROS_BC.find(
        (b) => normStr(rawBairro).includes(normStr(b)) || normStr(b).includes(normStr(rawBairro))
      ) || 'Centro';

      // Mapeamento do Grau de Risco
      let riscoMapeado: RiskLevel = 'MÉDIO';
      if (processoVinculado.grau_risco === 'ALTO RISCO') riscoMapeado = 'ALTO';
      else if (processoVinculado.grau_risco === 'BAIXO RISCO') riscoMapeado = 'BAIXO';

      // Tipo de Vistoria
      let tipoVist: InspectionType = 'ROTINA';
      const assuntoLower = (processoVinculado.assunto || processoVinculado.motivacao || '').toLowerCase();
      if (assuntoLower.includes('denuncia') || assuntoLower.includes('denúncia')) {
        tipoVist = 'DENÚNCIA';
      } else if (assuntoLower.includes('renova') || assuntoLower.includes('alvará')) {
        tipoVist = 'RENOVAÇÃO';
      }

      // Tipo de Atividade sanitária
      let tipoAtv = 'Restaurante / Alimentação';
      const descAtv = (processoVinculado.descricao_atividade || processoVinculado.assunto || '').toLowerCase();
      if (descAtv.includes('farmacia') || descAtv.includes('farmácia') || descAtv.includes('drogaria')) tipoAtv = 'Drogaria / Farmácia';
      else if (descAtv.includes('mercado') || descAtv.includes('açougue') || descAtv.includes('supermercado')) tipoAtv = 'Supermercado / Açougue';
      else if (descAtv.includes('hotel') || descAtv.includes('pousada')) tipoAtv = 'Hotel / Pousada';
      else if (descAtv.includes('estetica') || descAtv.includes('estética') || descAtv.includes('salão') || descAtv.includes('beleza')) tipoAtv = 'Estética / Salão';
      else if (descAtv.includes('lanchonete') || descAtv.includes('fast food')) tipoAtv = 'Lanchonete / Fast Food';
      else if (descAtv.includes('feira') || descAtv.includes('ambulante')) tipoAtv = 'Feira Livre / Ambulante';

      const obsTexto = `Vistoria sanitária in loco realizada para instrução e despacho do Processo nº ${processoVinculado.num_processo || processoVinculado.prot_1doc || 'S/N'}${processoVinculado.pasta ? ` (Pasta ${processoVinculado.pasta})` : ''}. Requerente: ${processoVinculado.razao_social}. Motivação: ${processoVinculado.motivacao || processoVinculado.assunto || 'Inspeção Sanitária'}.`;

      setFormData({
        nomeFantasia: processoVinculado.nome_fantasia || processoVinculado.razao_social || 'ESTABELECIMENTO CADASTRADO',
        razaoSocial: processoVinculado.razao_social || processoVinculado.nome_fantasia || 'ESTABELECIMENTO',
        cnpjCpf: processoVinculado.cnpj_cpf || '',
        situacaoCadastral: processoVinculado.situacao_cadastral || 'ATIVA',
        tipo: tipoAtv,
        bairro: matchedBairro,
        endereco: processoVinculado.endereco || '',
        numero: processoVinculado.numero_complemento || '',
        responsavel: processoVinculado.nome_fantasia || 'GERENTE / RESPONSÁVEL',
        telefone: '(47) 3367-0000',
        tipoVistoria: tipoVist,
        risco: riscoMapeado,
        medidasAdotadas: 'Termo de Notificação Sanitária',
        prazoAdequacaoDias: 3,
        observacoesFiscais: obsTexto,
        fotosUrl: []
      });

      setCnpjNotice(`🔗 Dados do local carregados da Demanda / Processo nº ${processoVinculado.num_processo || processoVinculado.prot_1doc}`);
      setTimeout(() => setCnpjNotice(null), 6000);
    }
  }, [processoVinculado]);

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
      parecerIA: aiAnalysis,
      processoId: processoVinculado?.id,
      numProcesso: processoVinculado ? (processoVinculado.num_processo || processoVinculado.prot_1doc) : undefined,
      tipoAtoFiscal,
      art61EstadualIncisos: art61EstadualIncisos.length > 0 ? art61EstadualIncisos : ['I'],
      art158MunicipalIncisos: art158MunicipalIncisos.length > 0 ? art158MunicipalIncisos : ['I'],
      irregularidadeImputada: irregularidadeImputada || (irregularidades.length > 0 ? irregularidades.join('; ') : 'Descumprimento de requisitos e normas sanitárias vigentes'),
      autoIntimacaoAnterior: autoIntimacaoAnterior || undefined,
      relatorioCircunstanciado: {
        fatosOcorridos: relCircFatos || formData.observacoesFiscais || `Inspeção sanitária fiscal in loco realizada no estabelecimento ${formData.nomeFantasia}.`,
        comportamentoAutuado: relCircDificultacao ? 'DIFICULTOU' : 'COOPERATIVO',
        comprometeuSanar: relCircCompromisso,
        detalhesAcao: relCircConduta || (relCircCompromisso ? 'Autuado cooperou com o ato fiscal e comprometeu-se a regularizar a situação.' : 'Autuado advertido formalmente quanto aos prazos e deveres legais.')
      },
      cautelarTipo: tipoAtoFiscal === 'MEDIDA_CAUTELAR' ? cautelarTipo : undefined,
      cautelarItensQualificacao: tipoAtoFiscal === 'MEDIDA_CAUTELAR' ? cautelarItens.filter((it) => it.descricao.trim().length > 0) : undefined,
      cautelarFielDepositario: tipoAtoFiscal === 'MEDIDA_CAUTELAR' && cautelarFielDepositarioNome ? {
        nome: cautelarFielDepositarioNome,
        cpf: cautelarFielDepositarioCpf,
        cargo: 'Fiel Depositário'
      } : undefined,
      pasVinculado: (tipoAtoFiscal === 'INFRACAO' || tipoAtoFiscal === 'MEDIDA_CAUTELAR' || tipoAtoFiscal === 'IMPOSICAO_PENALIDADE') ? `PAS-2026/${Math.floor(100 + Math.random() * 900)}` : undefined,
      penalidadeTipo: tipoAtoFiscal === 'IMPOSICAO_PENALIDADE' ? penalidadeTipo : undefined,
      penalidadeValorMulta: tipoAtoFiscal === 'IMPOSICAO_PENALIDADE' ? String(penalidadeValorMulta) : undefined,
      penalidadeFundamentacao: tipoAtoFiscal === 'IMPOSICAO_PENALIDADE' ? (penalidadeFundamentacao || 'Decisão proferida após julgamento do PAS pela Autoridade Sanitária com aplicação da dosimetria legal.') : undefined,
      penalidadeAutoridadeNome: 'Dr. Roberto Santos • Autoridade Sanitária Municipal',
      penalidadeAutoridadeCargo: 'Diretor de Vigilância Sanitária',
      entregaTipo: entregaPresencialTipo,
      recebidoPorNome: signatureOwner || formData.responsavel || undefined,
      recebidoPorCpf: signatureOwner ? 'CPF informado no auto' : undefined,
      recusaTestemunha1: entregaPresencialTipo === 'RECUSA_TESTEMUNHAS' ? {
        nome: recusaTestemunha1Nome || 'Testemunha Presencial 1',
        cpf: recusaTestemunha1Cpf || 'Identificação Física'
      } : undefined,
      recusaTestemunha2: entregaPresencialTipo === 'RECUSA_TESTEMUNHAS' ? {
        nome: recusaTestemunha2Nome || 'Testemunha Presencial 2',
        cpf: recusaTestemunha2Cpf || 'Identificação Física'
      } : undefined,
      protocolo1Doc: `1DOC-${Math.floor(100000 + Math.random() * 900000)}/2026`
    };

    // Se o dispositivo estiver offline (garagem, câmara fria, subsolo), adiciona à fila de sincronização
    const isDeviceOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isDeviceOffline) {
      const offlineItem = {
        ...newItem,
        observacoesFiscais: `${newItem.observacoesFiscais || ''} [Registrado em Modo Offline de Campo]`
      };
      const curQueue = (() => {
        try {
          const raw = localStorage.getItem('visa_offline_fiscalizacoes_queue');
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      })();
      const updatedQueue = [...curQueue, offlineItem];
      localStorage.setItem('visa_offline_fiscalizacoes_queue', JSON.stringify(updatedQueue));
      setOfflineQueue(updatedQueue);
    }

    onSaveFiscalizacao(newItem);
    setSelectedItem(newItem);
    setActiveTab('termo');

    // 🔗 Se houver processo vinculado, atualiza automaticamente a linha do tempo e pareceres do processo
    if (processoVinculado && onSaveProcesso) {
      const procNum = processoVinculado.num_processo || processoVinculado.prot_1doc || 'S/N';
      
      const novaTramitacao: TramitacaoItem = {
        id: `tram-vist-${Date.now()}`,
        data_hora: nowStr,
        tipo: 'VISTORIA_REALIZADA',
        titulo: `Vistoria In Loco Realizada - Termo ${newProtocol}`,
        descricao: `Vistoria sanitária in loco realizada no local por ${currentUser?.nome_completo || 'Fiscal Sanitarista'}. Status apurado: ${status}. Medidas adotadas: ${formData.medidasAdotadas}. Checklist concluído com ${irregularidades.length} irregularidade(s) registrada(s). Auto/Termo oficial gerado sob protocolo ${newProtocol}.`,
        responsavel_nome: currentUser?.nome_completo || 'Fiscal Sanitarista',
        responsavel_cargo: currentUser?.cargo || 'FISCAL SANITÁRIO',
        responsavel_matricula: currentUser?.matricula || 'DVIS-BC',
        setor_origem: currentUser?.setor || 'DVIS',
        status_processo_momento: status === 'CONFORME' ? 'EM ANÁLISE' : status === 'INTERDITADO' ? 'INTERDITADO' : 'NOTIFICADO',
        documento_relacionado: {
          tipo: formData.medidasAdotadas.includes('Infração') ? 'AUTO_INFRACAO' : formData.medidasAdotadas.includes('Notificação') ? 'AUTO_NOTIFICACAO' : 'TERMO_VISTORIA',
          auth_code: newProtocol
        }
      };

      const tipoParecerCalculado: TipoParecerTecnico =
        status === 'CONFORME'
          ? 'FAVORÁVEL (DEFERIMENTO)'
          : status === 'INTERDITADO'
          ? 'DESFAVORÁVEL (INDEFERIMENTO)'
          : 'EXIGÊNCIA / NOTIFICAÇÃO';

      const novoParecer: ParecerTecnicoItem = {
        id: `par-vist-${Date.now()}`,
        autor_nome: currentUser?.nome_completo || 'Fiscal Sanitarista',
        autor_cargo: currentUser?.cargo || 'Fiscal de Vigilância Sanitária',
        autor_matricula: currentUser?.matricula || 'DVIS-BC',
        autor_email: currentUser?.email || 'visa@bc.sc.gov.br',
        data_hora: nowStr,
        tipo_parecer: tipoParecerCalculado,
        parecer_texto: `Vistoria Sanitária In Loco realizada no estabelecimento ${formData.nomeFantasia || formData.razaoSocial}. Resultado da vistoria: ${status}. Medida formal adotada: ${formData.medidasAdotadas}. ${irregularidades.length > 0 ? `Inconformidades apontadas: ${irregularidades.join('; ')}.` : 'Estabelecimento em plena conformidade higiênico-sanitária no momento da fiscalização.'} Relatório técnico e termo arquivados sob protocolo ${newProtocol}.`,
        condicionantes: irregularidades.length > 0 ? irregularidades.join('\n') : undefined,
        novo_status: status === 'CONFORME' ? 'EM ANÁLISE' : status === 'INTERDITADO' ? 'INDEFERIDO' : 'NOTIFICADO',
        assinatura_digital: `Assinado Digitalmente por ${currentUser?.nome_completo || 'Fiscal Sanitarista'} via Certificado Institucional DVIS-BC`,
        codigo_autenticacao: `SHA256-VISTORIA-${newProtocol.replace(/[^A-Za-z0-9]/g, '')}`
      };

      const processoAtualizado: ProcessoItem = {
        ...processoVinculado,
        status: status === 'CONFORME' ? 'EM ANÁLISE' : status === 'INTERDITADO' ? 'INDEFERIDO' : 'NOTIFICADO',
        tramitacoes: [...(processoVinculado.tramitacoes || []), novaTramitacao],
        pareceres: [novoParecer, ...(processoVinculado.pareceres || [])],
        observacoes: `${processoVinculado.observacoes || ''}\n[${nowStr}] Vistoria in loco realizada: ${newProtocol} (${status}).`.trim()
      };

      onSaveProcesso(processoAtualizado);

      setNotificacaoVinculoSucesso({
        titulo: 'Vistoria In Loco Vinculada ao Processo!',
        mensagem: `O laudo da vistoria ${newProtocol} foi formalmente vinculado ao Processo nº ${procNum}. A Linha do Tempo e o histórico de pareceres foram atualizados.`,
        protocolo: newProtocol,
        processoNum: procNum
      });
    }

    // Limpar o formulário para a próxima vistoria iniciar do zero
    setFormData(initialFormData);
    setChecklists(CHECKLIST_DEFAULT.map((item, idx) => ({ ...item, id: `chk-new-${idx}-${Date.now()}` })));
    setAiAnalysis('');
    setSignatureInspector('');
    setSignatureOwner('');
    setShowHistoryDropdown(false);
    setCnpjNotice(null);
    setTipoAtoFiscal('INTIMACAO');
    setArt61EstadualIncisos([]);
    setArt158MunicipalIncisos([]);
    setIrregularidadeImputada('');
    setAutoIntimacaoAnterior('');
    setRelCircFatos('');
    setRelCircDificultacao(false);
    setRelCircCompromisso(true);
    setRelCircConduta('');
    setCautelarTipo('INTERDICAO_PARCIAL');
    setCautelarItens([
      { descricao: 'Alimentos perecíveis sem comprovação de origem ou rotulagem', quantidade: '15 kg', lacreNumero: 'LACRE-DVIS-0941', lote: 'L-2026/01' }
    ]);
    setCautelarFielDepositarioNome('');
    setCautelarFielDepositarioCpf('');
    setPenalidadeTipo('MULTA');
    setPenalidadeValorMulta(1500);
    setPenalidadeFundamentacao('');
    setEntregaPresencialTipo('PRESENCIAL_RECEBIDO');
    setRecusaTestemunha1Nome('');
    setRecusaTestemunha1Cpf('');
    setRecusaTestemunha2Nome('');
    setRecusaTestemunha2Cpf('');
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
    <div className="w-full space-y-6 text-left">
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

      {/* 📡 MODO OFFLINE DE CAMPO & STATUS DE SINCRONIZAÇÃO EM SEGUNDO PLANO */}
      <div className="space-y-2">
        {syncToast && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500 rounded-2xl text-emerald-200 text-xs flex items-center justify-between shadow-lg animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="text-base">🟢</span>
              <div>
                <strong className="block font-black uppercase text-[11px] text-emerald-300">
                  Conexão Restabelecida • Sincronização Automática
                </strong>
                <span>
                  {syncToast.count} vistoria(s) preenchida(s) em campo foram sincronizadas com sucesso às {syncToast.timestamp}.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSyncToast(null)}
              className="text-emerald-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className={`p-3 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-sm text-xs ${
          !isOnline
            ? 'bg-amber-950/70 border-amber-500/70 text-amber-200'
            : offlineQueue.length > 0
            ? 'bg-blue-950/70 border-blue-500/60 text-blue-200'
            : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {!isOnline ? (
              <div className="p-1.5 rounded-xl bg-amber-500/30 text-amber-300 border border-amber-500/50">
                <WifiOff className="w-4 h-4 animate-pulse" />
              </div>
            ) : (
              <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <Wifi className="w-4 h-4" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <strong className="font-black uppercase tracking-wider text-[11px]">
                  {!isOnline
                    ? 'Modo Offline de Campo Ativo'
                    : 'Modo de Campo Conectado'}
                </strong>
                <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase ${
                  !isOnline
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {!isOnline ? 'Área sem sinal / 4G oscilante' : 'Online'}
                </span>
              </div>
              <p className="text-[11px] opacity-90 mt-0.5">
                {!isOnline
                  ? 'Você pode preencher relatórios, tirar fotos e assinar autos mesmo dentro de garagens ou câmaras frias. Os dados ficam salvos localmente e serão sincronizados automaticamente em segundo plano.'
                  : 'Sincronização contínua com os servidores municipais da Vigilância Sanitária.'}
              </p>
            </div>
          </div>

          {offlineQueue.length > 0 && (
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <span className="text-[11px] font-mono font-bold text-amber-300">
                {offlineQueue.length} {offlineQueue.length === 1 ? 'vistoria pendente' : 'vistorias pendentes'}
              </span>
              <button
                type="button"
                onClick={handleSincronizarFilaManual}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow transition cursor-pointer active:scale-95"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Sincronizar Agora</span>
              </button>
            </div>
          )}
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
          <PlusCircle className="w-4 h-4" />
          <span>
            {processoVinculado
              ? `Vistoria Vinculada (Proc. ${processoVinculado.num_processo || processoVinculado.prot_1doc})`
              : 'Nova Fiscalização em Tempo Real'}
          </span>
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
        <button
          type="button"
          onClick={() => {
            const csv = exportFiscalizacoesToCSV(fiscalizacoes);
            downloadCsvFile(`fiscalizacoes_sanitarias_bc_${new Date().toISOString().slice(0, 10)}`, csv);
          }}
          className="ml-auto px-4 py-2 rounded-xl font-black text-xs uppercase transition cursor-pointer flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm active:scale-95 border border-emerald-500/50"
          title="Exportar todas as fiscalizações em arquivo CSV compatível com Excel"
        >
          <Download className="w-3.5 h-3.5" /> Exportar CSV ({fiscalizacoes.length})
        </button>
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

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-slate-400">Risco: {f.risco}</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-[9px] bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                      <Scale className="w-2.5 h-2.5" />
                      {f.tipoAtoFiscal ? DESCRICOES_ETAPAS_RITO[f.tipoAtoFiscal]?.titulo || f.tipoAtoFiscal : 'Rito Sanitário'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setItemParaRitoModal(f);
                        setModalRitoOpen(true);
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] px-2.5 py-1.5 rounded-xl uppercase transition cursor-pointer flex items-center gap-1 shadow-sm active:scale-95 flex-1 justify-center"
                      title="Visualizar e Imprimir Peça Formal do Rito Processual Sanitário"
                    >
                      <Scale className="w-3 h-3 text-amber-200" />
                      <span>Auto Oficial (Rito)</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedItem(f);
                        setActiveTab('termo');
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] px-2.5 py-1.5 rounded-xl uppercase transition cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <Printer className="w-3 h-3" /> Termo
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
        <div className="space-y-4">
          {/* 🔗 BANNER DE VISTORIA VINCULADA À DEMANDA / PROCESSO */}
          {processoVinculado && (
            <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-purple-950 border border-indigo-500/60 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-white animate-fadeIn">
              <div className="flex items-start md:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-blue-500/30 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider font-mono">
                      VISTORIA IN LOCO VINCULADA AO PROCESSO
                    </span>
                    <span className="font-mono font-bold text-white text-xs bg-slate-900/90 px-2.5 py-0.5 rounded-lg border border-slate-700">
                      PROC: {processoVinculado.num_processo || processoVinculado.prot_1doc || 'S/N'}
                    </span>
                    {processoVinculado.pasta && (
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-normal">
                        Pasta {processoVinculado.pasta}
                      </span>
                    )}
                    {processoVinculado.grau_risco && (
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                        processoVinculado.grau_risco === 'ALTO RISCO'
                          ? 'bg-rose-950/80 text-rose-300 border-rose-700'
                          : 'bg-amber-950/80 text-amber-300 border-amber-700'
                      }`}>
                        {processoVinculado.grau_risco}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    {processoVinculado.razao_social}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-300 flex-wrap">
                    <span>📍 {processoVinculado.endereco}{processoVinculado.numero_complemento ? `, ${processoVinculado.numero_complemento}` : ''}</span>
                    <span>•</span>
                    <span className="text-amber-300 font-semibold">{processoVinculado.bairro || 'Balneário Camboriú'}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-400">{processoVinculado.cnpj_cpf}</span>
                  </div>
                  <p className="text-[11px] text-cyan-300/90 font-medium pt-0.5">
                    💡 Os dados do estabelecimento já estão pré-preenchidos abaixo. Ao concluir e emitir a vistoria, ela será vinculada automaticamente ao histórico e tramitação deste processo.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                {onVoltarParaDemandas && (
                  <button
                    type="button"
                    onClick={onVoltarParaDemandas}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer shadow-sm active:scale-95"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar a Minhas Demandas</span>
                  </button>
                )}
                {onLimparProcessoVinculado && (
                  <button
                    type="button"
                    onClick={onLimparProcessoVinculado}
                    className="p-2 text-slate-400 hover:text-rose-300 rounded-xl hover:bg-rose-950/40 border border-transparent hover:border-rose-800/40 transition cursor-pointer"
                    title="Desvincular deste processo (lavrar vistoria avulsa)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 🌟 NOTIFICAÇÃO DE VISTORIA CONCLUÍDA & VINCULADA */}
          {notificacaoVinculoSucesso && (
            <div className="p-4 bg-emerald-950/90 border border-emerald-500 rounded-3xl text-emerald-200 text-xs shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">{notificacaoVinculoSucesso.titulo}</h4>
                  <p className="text-xs text-emerald-300 font-normal">{notificacaoVinculoSucesso.mensagem}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                {onVoltarParaDemandas && (
                  <button
                    type="button"
                    onClick={onVoltarParaDemandas}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Ir para Minhas Demandas</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setNotificacaoVinculoSucesso(null)}
                  className="p-1.5 text-emerald-400 hover:text-white rounded-lg hover:bg-emerald-900/40 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

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
                <p className="text-xs text-slate-500">
                  Tire fotos de irregularidades com a câmera ou anexe arquivos do aparelho (funciona 100% offline em garagens ou câmaras frias).
                </p>

                {/* Input de arquivo real com suporte a câmera do celular */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handleCapturePhoto}
                  className="hidden"
                />

                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase cursor-pointer transition inline-flex items-center gap-1.5 shadow"
                  >
                    <Camera className="w-4 h-4" /> Tirar Foto / Câmera
                  </button>

                  <button
                    type="button"
                    onClick={handleAddPhotoSample}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer"
                    title="Inserir foto de exemplo"
                  >
                    + Exemplo
                  </button>
                </div>

                {formData.fotosUrl.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-[11px] font-bold text-slate-400">
                      {formData.fotosUrl.length} {formData.fotosUrl.length === 1 ? 'foto anexada' : 'fotos anexadas'}
                    </p>
                    <div className="flex flex-wrap gap-2.5 justify-center">
                      {formData.fotosUrl.map((url, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={url}
                            alt={`Evidência ${i + 1}`}
                            className="w-20 h-20 object-cover rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(i)}
                            className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full shadow transition cursor-pointer"
                            title="Remover foto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
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

          {/* Seção 5: Rito Processual Sanitário em 5 Etapas Oficiais */}
          <div className="space-y-6 border-t border-slate-200 dark:border-slate-800 pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-500" />
                  5. Rito Processual Sanitário • Sequência Lógica em 5 Etapas (Normativa Interna DVIS)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Observe estritamente o rito sequencial: Orientação ➔ Intimação ➔ Auto de Infração (PAS) ➔ Medida Cautelar ➔ Imposição de Penalidade.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                <span>Tramitação 1Doc Integrada</span>
              </div>
            </div>

            {/* Seletor Visual das 5 Etapas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {(Object.keys(DESCRICOES_ETAPAS_RITO) as TipoAtoFiscalRito[]).map((etapaKey) => {
                const etapa = DESCRICOES_ETAPAS_RITO[etapaKey];
                const isSelected = tipoAtoFiscal === etapaKey;
                return (
                  <button
                    key={etapaKey}
                    type="button"
                    onClick={() => {
                      setTipoAtoFiscal(etapaKey);
                      if (etapaKey === 'ORIENTACAO') {
                        setFormData((p) => ({ ...p, medidasAdotadas: 'Orientação e Conscientização Sanitária' }));
                      } else if (etapaKey === 'INTIMACAO') {
                        setFormData((p) => ({ ...p, medidasAdotadas: 'Auto de Intimação com Prazo' }));
                      } else if (etapaKey === 'INFRACAO') {
                        setFormData((p) => ({ ...p, medidasAdotadas: 'Auto de Infração Sanitária (Instaura PAS)' }));
                      } else if (etapaKey === 'MEDIDA_CAUTELAR') {
                        setFormData((p) => ({ ...p, medidasAdotadas: 'Medida Cautelar (Peça Exclusiva com Lacres)' }));
                      } else if (etapaKey === 'IMPOSICAO_PENALIDADE') {
                        setFormData((p) => ({ ...p, medidasAdotadas: 'Auto de Imposição de Penalidade Sanitária' }));
                      }
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer relative ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 shadow-md ring-2 ring-amber-500/30 dark:bg-amber-950/40'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded uppercase font-mono ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          Etapa {etapa.numero}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
                      </div>
                      <h4 className="font-black text-xs text-slate-900 dark:text-white leading-snug">
                        {etapa.titulo}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-3">
                        {etapa.descricao}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Painel Específico da Etapa 1: Orientação / Educação */}
            {tipoAtoFiscal === 'ORIENTACAO' && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/60 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-xs font-black uppercase text-emerald-900 dark:text-emerald-200">
                    Etapa 1 • Abordagem Educativa Inicial & Conscientização Sanitária
                  </h4>
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  Procedimento fiscal com foco pedagógico. Registre orientações técnicas discricionárias para que o responsável tome ciência das boas práticas e legislações aplicáveis.
                </p>
                <div>
                  <label className="text-[10px] font-bold uppercase block mb-1">Orientações e Recomendações Educativas Repassadas</label>
                  <textarea
                    rows={2}
                    placeholder="Descreva as orientações sanitárias repassadas ao estabelecimento..."
                    value={formData.observacoesFiscais}
                    onChange={(e) => setFormData({ ...formData, observacoesFiscais: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Painel Específico da Etapa 2: Auto de Intimação */}
            {tipoAtoFiscal === 'INTIMACAO' && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800/60 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-xs font-black uppercase text-blue-900 dark:text-blue-200">
                    Etapa 2 • Auto de Intimação (Formalização de Irregularidade com Prazo)
                  </h4>
                </div>
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  Formalize a inconformidade sanitária constatada e determine a exigência necessária com prazo improrrogável de cumprimento.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1">Prazo para Adequação (Dias)</label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={formData.prazoAdequacaoDias}
                      onChange={(e) => setFormData({ ...formData, prazoAdequacaoDias: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold uppercase block mb-1">Exigência Formal Intimada</label>
                    <input
                      type="text"
                      placeholder="Ex: Apresentar comprovante de desratização e reparar tela milimétrica em 5 dias úteis"
                      value={formData.observacoesFiscais}
                      onChange={(e) => setFormData({ ...formData, observacoesFiscais: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Painel Específico da Etapa 3: Auto de Infração (PAS - Nulidade Absoluta) */}
            {tipoAtoFiscal === 'INFRACAO' && (
              <div className="p-5 bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-400 dark:border-rose-700 rounded-2xl space-y-4">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black uppercase text-rose-900 dark:text-rose-200 tracking-wide">
                      Etapa 3 • Auto de Infração Sanitária • Instaura o PAS
                    </h4>
                    <p className="text-[11px] text-rose-800 dark:text-rose-300 font-bold mt-0.5">
                      ⚠️ REQUISITOS OBRIGATÓRIOS SOB PENA DE NULIDADE PROCESSUAL (Itens 3.1, 3.2, 3.3, 3.4 e 3.5 da Normativa):
                    </p>
                  </div>
                </div>

                {/* 3.1 Indicação do art. 61 da LE 6.320/1983 */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-rose-200 dark:border-rose-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">
                      3.1 Enquadramento: Art. 61 da Lei Estadual nº 6.320/1983 (Selecione os Incisos Aplicáveis)
                    </label>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono font-bold">
                      {art61EstadualIncisos.length} selecionado(s)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {INCISOS_ART_61_LEI_ESTADUAL_6320.map((incDef) => {
                      const checked = art61EstadualIncisos.includes(incDef.inciso);
                      return (
                        <label
                          key={incDef.inciso}
                          className={`flex items-start gap-2 p-2 rounded-lg border text-[11px] cursor-pointer transition ${
                            checked
                              ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 text-rose-950 dark:text-rose-100 font-bold'
                              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setArt61EstadualIncisos([...art61EstadualIncisos, incDef.inciso]);
                              } else {
                                setArt61EstadualIncisos(art61EstadualIncisos.filter((x) => x !== incDef.inciso));
                              }
                            }}
                            className="mt-0.5 text-rose-600 rounded"
                          />
                          <span className="leading-tight">{incDef.rotulo}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 3.2 Indicação do art. 158 da LCM 40/2019 */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-rose-200 dark:border-rose-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">
                      3.2 Enquadramento: Art. 158 da Lei Complementar Municipal nº 40/2019 - BC (Selecione os Incisos)
                    </label>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono font-bold">
                      {art158MunicipalIncisos.length} selecionado(s)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {INCISOS_ART_158_LCM_40_2019.map((incDef) => {
                      const checked = art158MunicipalIncisos.includes(incDef.inciso);
                      return (
                        <label
                          key={incDef.inciso}
                          className={`flex items-start gap-2 p-2 rounded-lg border text-[11px] cursor-pointer transition ${
                            checked
                              ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 text-rose-950 dark:text-rose-100 font-bold'
                              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setArt158MunicipalIncisos([...art158MunicipalIncisos, incDef.inciso]);
                              } else {
                                setArt158MunicipalIncisos(art158MunicipalIncisos.filter((x) => x !== incDef.inciso));
                              }
                            }}
                            className="mt-0.5 text-rose-600 rounded"
                          />
                          <span className="leading-tight">{incDef.rotulo}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 3.3 Irregularidade Imputada (Apenas a irregularidade em si) */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-rose-200 dark:border-rose-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      3.3 Irregularidade Imputada ao Infrator
                    </label>
                    <span className="text-[10px] font-bold text-rose-600 uppercase">
                      ⚠️ Não relatar nada aqui, apenas a irregularidade em si
                    </span>
                  </div>
                  <input
                    type="text"
                    required={tipoAtoFiscal === 'INFRACAO'}
                    placeholder="Ex: Comercialização de alimentos sem rotulagem e com prazo de validade expirado"
                    value={irregularidadeImputada}
                    onChange={(e) => setIrregularidadeImputada(e.target.value)}
                    className="w-full font-bold text-xs"
                  />
                  <p className="text-[10px] text-slate-500 italic">
                    Determinação expressa da diretriz: insira de forma estritamente concisa e objetiva a infração imputada. O detalhamento dos fatos pertence ao item 3.5 (Relatório Circunstanciado).
                  </p>
                </div>

                {/* 3.4 Auto de Intimação Anterior Vinculado */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-rose-200 dark:border-rose-800/80 space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 block">
                    3.4 Auto de Intimação Anterior (Para Obrigação Subsistente / Reincidência)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Auto de Intimação nº INTIM-2026/0412 lavrado em 12/03/2026 (descumprido)"
                    value={autoIntimacaoAnterior}
                    onChange={(e) => setAutoIntimacaoAnterior(e.target.value)}
                    className="w-full text-xs font-mono"
                  />
                </div>

                {/* 3.5 Relatório de Inspeção Sanitária Circunstanciado */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-2 border-indigo-400 dark:border-indigo-600 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileSignature className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h5 className="text-[11px] font-black uppercase text-indigo-900 dark:text-indigo-200">
                      3.5 Peça Técnica Anexa: Relatório de Inspeção Sanitária Circunstanciado
                    </h5>
                  </div>
                  <p className="text-[10px] text-indigo-800 dark:text-indigo-300">
                    Relatório circunstanciado que descreve todo o fato ocorrido, levanta informações cadastrais e detalha a ação fiscal.
                  </p>

                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1">Descrição Circunstanciada dos Fatos Ocorridos</label>
                    <textarea
                      rows={3}
                      placeholder="Descreva de forma pormenorizada a diligência fiscal no local, o que foi inspecionado, materiais encontrados e ambiente..."
                      value={relCircFatos}
                      onChange={(e) => setRelCircFatos(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Houve Dificultação do Ato Fiscal?</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRelCircDificultacao(false)}
                          className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${
                            !relCircDificultacao ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
                          }`}
                        >
                          Não
                        </button>
                        <button
                          type="button"
                          onClick={() => setRelCircDificultacao(true)}
                          className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${
                            relCircDificultacao ? 'bg-rose-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
                          }`}
                        >
                          Sim
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Autuado Prontamente se Comprometeu a Sanar?</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRelCircCompromisso(true)}
                          className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${
                            relCircCompromisso ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
                          }`}
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => setRelCircCompromisso(false)}
                          className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${
                            !relCircCompromisso ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
                          }`}
                        >
                          Não
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1">Detalhamento da Conduta e Postura do Autuado</label>
                    <input
                      type="text"
                      placeholder="Ex: O autuado acompanhou todo o ato fiscal sem resistência e comprometeu-se a inutilizar os lotes"
                      value={relCircConduta}
                      onChange={(e) => setRelCircConduta(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Painel Específico da Etapa 4: Medida Cautelar (Peça Exclusiva com Lacres) */}
            {tipoAtoFiscal === 'MEDIDA_CAUTELAR' && (
              <div className="p-5 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-600 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h4 className="text-xs font-black uppercase text-amber-950 dark:text-amber-200">
                    Etapa 4 • Medida Cautelar Sanitária (Auto de Intimação Próprio / Peça Exclusiva)
                  </h4>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Lavratura em peça exclusiva. Exige qualificação expressa dos produtos, equipamentos e materiais, com número de lacres e nomeação de fiel depositário. Haverá instauração compulsória de PAS para garantir ampla defesa e contraditório.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1">Modalidade da Medida Cautelar</label>
                    <select
                      value={cautelarTipo}
                      onChange={(e) => setCautelarTipo(e.target.value as any)}
                    >
                      <option value="INTERDICAO_PARCIAL">Interdição Cautelar Parcial do Estabelecimento / Setor</option>
                      <option value="INTERDICAO_TOTAL">Interdição Cautelar Total do Estabelecimento</option>
                      <option value="APREENSAO_PRODUTOS">Apreensão Cautelar de Produtos / Alimentos / Insumos</option>
                      <option value="INTERDICAO_EQUIPAMENTOS">Interdição Cautelar de Máquinas e Equipamentos</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1">Fiel Depositário (Nome Completo e CPF)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nome do depositário"
                        value={cautelarFielDepositarioNome}
                        onChange={(e) => setCautelarFielDepositarioNome(e.target.value)}
                        className="text-xs"
                      />
                      <input
                        type="text"
                        placeholder="CPF do depositário"
                        value={cautelarFielDepositarioCpf}
                        onChange={(e) => setCautelarFielDepositarioCpf(e.target.value)}
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Tabela de Bens Cautelados e Lacrados */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-300 dark:border-amber-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">
                      Qualificação dos Produtos, Equipamentos e Materiais Cautelados
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCautelarItens([
                          ...cautelarItens,
                          {
                            descricao: '',
                            quantidade: '1',
                            lacreNumero: `LACRE-DVIS-${Math.floor(1000 + Math.random() * 9000)}`,
                            lote: ''
                          }
                        ]);
                      }}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-[10px] uppercase transition cursor-pointer flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Adicionar Item Cautelado
                    </button>
                  </div>

                  <div className="space-y-2">
                    {cautelarItens.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 items-center text-xs">
                        <div className="md:col-span-5">
                          <input
                            type="text"
                            placeholder="Descrição do produto/equipamento..."
                            value={item.descricao}
                            onChange={(e) => {
                              const updated = [...cautelarItens];
                              updated[idx].descricao = e.target.value;
                              setCautelarItens(updated);
                            }}
                            className="w-full text-xs"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <input
                            type="text"
                            placeholder="Qtd (ex: 10 kg)"
                            value={item.quantidade}
                            onChange={(e) => {
                              const updated = [...cautelarItens];
                              updated[idx].quantidade = e.target.value;
                              setCautelarItens(updated);
                            }}
                            className="w-full text-xs"
                          />
                        </div>
                        <div className="md:col-span-4">
                          <input
                            type="text"
                            placeholder="Nº Lacre Aposto (ex: LACRE-0891)"
                            value={item.lacreNumero}
                            onChange={(e) => {
                              const updated = [...cautelarItens];
                              updated[idx].lacreNumero = e.target.value;
                              setCautelarItens(updated);
                            }}
                            className="w-full text-xs font-mono font-bold text-amber-600 dark:text-amber-400"
                          />
                        </div>
                        <div className="md:col-span-1 flex justify-center">
                          {cautelarItens.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setCautelarItens(cautelarItens.filter((_, i) => i !== idx))}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Painel Específico da Etapa 5: Auto de Imposição de Penalidade */}
            {tipoAtoFiscal === 'IMPOSICAO_PENALIDADE' && (
              <div className="p-5 bg-purple-50 dark:bg-purple-950/30 border-2 border-purple-400 dark:border-purple-600 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h4 className="text-xs font-black uppercase text-purple-950 dark:text-purple-200">
                    Etapa 5 • Auto de Imposição de Penalidade (Decisão do Julgamento do PAS)
                  </h4>
                </div>
                <p className="text-xs text-purple-800 dark:text-purple-300">
                  Documento lavrado pela Autoridade de Vigilância Sanitária com a decisão do julgamento do PAS e as penas aplicadas após o direito de defesa, com cópia ao infrator para ciência.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1">Penalidade Decidida no Julgamento</label>
                    <select
                      value={penalidadeTipo}
                      onChange={(e) => setPenalidadeTipo(e.target.value as any)}
                    >
                      <option value="MULTA">Multa Pecuniária</option>
                      <option value="ADVERTENCIA">Pena de Advertência Formal</option>
                      <option value="INUTILIZACAO_PRODUTOS">Inutilização de Produtos e Mercadorias</option>
                      <option value="INTERDICAO_DEFINITIVA">Interdição Definitiva de Atividade</option>
                      <option value="CANCELAMENTO_ALVARA">Cancelamento do Alvará de Licença Sanitária</option>
                    </select>
                  </div>

                  {penalidadeTipo === 'MULTA' && (
                    <div>
                      <label className="text-[10px] font-bold uppercase block mb-1">Valor da Multa Aplicada (R$)</label>
                      <input
                        type="number"
                        min={100}
                        step={50}
                        value={penalidadeValorMulta}
                        onChange={(e) => setPenalidadeValorMulta(parseFloat(e.target.value) || 0)}
                        className="font-bold text-sm"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase block mb-1">Fundamentação Técnica e Dosimetria da Decisão</label>
                  <textarea
                    rows={3}
                    placeholder="Exponha as razões do julgamento do PAS, atenuantes/agravantes e aplicação dosimétrica das penas..."
                    value={penalidadeFundamentacao}
                    onChange={(e) => setPenalidadeFundamentacao(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            )}

            {/* Comprovação de Entrega Presencial (Exigência Expressa da Normativa) */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  Comprovação de Entrega Presencial ao Notificado
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEntregaPresencialTipo('PRESENCIAL_RECEBIDO')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase cursor-pointer transition ${
                      entregaPresencialTipo === 'PRESENCIAL_RECEBIDO'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Ciência Presencial
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntregaPresencialTipo('RECUSA_TESTEMUNHAS')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase cursor-pointer transition ${
                      entregaPresencialTipo === 'RECUSA_TESTEMUNHAS'
                        ? 'bg-rose-600 text-white shadow'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Certidão de Recusa (2 Testemunhas)
                  </button>
                </div>
              </div>

              {entregaPresencialTipo === 'PRESENCIAL_RECEBIDO' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1">Responsável que Recebeu Presencialmente</label>
                    <input
                      type="text"
                      placeholder="Nome legível de quem tomou ciência no local"
                      value={signatureOwner}
                      onChange={(e) => setSignatureOwner(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1">Fiscal Responsável pela Entrega</label>
                    <input
                      type="text"
                      readOnly
                      value={`${currentUser?.nome_completo || 'Carlos Eduardo Silva'} • Matrícula ${currentUser?.matricula || 'DVIS-BC'}`}
                      className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl space-y-3">
                  <p className="text-[11px] font-bold text-rose-900 dark:text-rose-200">
                    ✍️ O notificado recusou-se a assinar ou dar ciência ao auto presencial. Identifique as 2 (duas) testemunhas presenciais da recusa:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">Testemunha Presencial 1</label>
                      <input
                        type="text"
                        placeholder="Nome completo da Testemunha 1"
                        value={recusaTestemunha1Nome}
                        onChange={(e) => setRecusaTestemunha1Nome(e.target.value)}
                        className="text-xs mb-1"
                      />
                      <input
                        type="text"
                        placeholder="CPF ou RG da Testemunha 1"
                        value={recusaTestemunha1Cpf}
                        onChange={(e) => setRecusaTestemunha1Cpf(e.target.value)}
                        className="text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">Testemunha Presencial 2</label>
                      <input
                        type="text"
                        placeholder="Nome completo da Testemunha 2"
                        value={recusaTestemunha2Nome}
                        onChange={(e) => setRecusaTestemunha2Nome(e.target.value)}
                        className="text-xs mb-1"
                      />
                      <input
                        type="text"
                        placeholder="CPF ou RG da Testemunha 2"
                        value={recusaTestemunha2Cpf}
                        onChange={(e) => setRecusaTestemunha2Cpf(e.target.value)}
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Aviso Obrigatório do 1DOC */}
            <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black font-mono shrink-0">
                  1D
                </div>
                <div>
                  <p className="font-black text-blue-950 dark:text-blue-100">
                    Encaminhamento Obrigatório à Direção via 1Doc
                  </p>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300">
                    Todos os autos lavrados devem ser despachados para a Direção da Vigilância Sanitária na plataforma 1Doc Municipal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onOpenExternal) {
                    onOpenExternal('https://bc.1doc.com.br/b.php?pg=o/login&n=3');
                  } else {
                    window.open('https://bc.1doc.com.br/b.php?pg=o/login&n=3', '_blank');
                  }
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition"
              >
                <span>Acessar 1Doc BC</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
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
        </div>
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
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500">Documento Oficial de Fiscalização Sanitária</span>
              {selectedItem.numProcesso && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700 font-mono text-[10px] font-bold">
                  🔗 Vinculado ao Processo nº {selectedItem.numProcesso}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onVoltarParaDemandas && (
                <button
                  type="button"
                  onClick={onVoltarParaDemandas}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl text-xs uppercase cursor-pointer flex items-center gap-1.5 transition active:scale-95 shadow-sm border border-slate-700"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar a Minhas Demandas
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setItemParaRitoModal(selectedItem);
                  setModalRitoOpen(true);
                }}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black px-5 py-2 rounded-xl text-xs uppercase cursor-pointer flex items-center gap-1.5 transition active:scale-95 shadow"
              >
                <Scale className="w-4 h-4 text-amber-200" />
                <span>Auto Oficial do Rito Sanitário</span>
              </button>
              <button
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-2 rounded-xl text-xs uppercase cursor-pointer flex items-center gap-1.5 transition active:scale-95 shadow"
              >
                <Printer className="w-4 h-4" /> Imprimir Documento
              </button>
            </div>
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
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">SECRETARIA MUNICIPAL DE SAÚDE • DIVISÃO DE VIGILÂNCIA SANITÁRIA (DVIS)</h2>
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
                {selectedItem.numProcesso && (
                  <p className="col-span-2 bg-slate-100 p-2 rounded font-mono font-bold text-slate-800 border border-slate-200">
                    <strong>PROCESSO SANITÁRIO VINCULADO:</strong> Nº {selectedItem.numProcesso} (DVIS-BC)
                  </p>
                )}
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

      {/* Modal do Documento Oficial do Rito Processual Sanitário (Normativa DVIS) */}
      {itemParaRitoModal && (
        <RitoProcessualDocumentoModal
          isOpen={modalRitoOpen}
          onClose={() => {
            setModalRitoOpen(false);
            setItemParaRitoModal(null);
          }}
          fiscalizacao={itemParaRitoModal}
          currentUser={currentUser}
          onOpenExternal={(url: string) => {
            if (onOpenExternal) {
              onOpenExternal(url);
            } else {
              window.open(url, '_blank');
            }
          }}
        />
      )}
    </div>
  );
};
