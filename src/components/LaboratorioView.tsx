import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  AmostraLaboratorioItem,
  PontoColetaLaboratorio,
  UserProfile,
  LaboratorioStatus,
  ServidorColetaLaboratorio,
  LaboratorialistaResponsavel
} from '../types';
import {
  Microscope,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  FileSpreadsheet,
  Printer,
  Trash2,
  Edit3,
  Calendar,
  X,
  Droplet,
  Thermometer,
  ShieldCheck,
  FlaskConical,
  Filter,
  FileText,
  Building,
  UserCheck,
  Activity,
  ArrowRight,
  Sparkles,
  Download,
  Users,
  Award,
  BadgeCheck,
  UserPlus,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
  Database,
  Copy,
  Code,
  ExternalLink,
  Save
} from 'lucide-react';
import {
  BAIRROS_BC,
  INITIAL_COLETORES_LABORATORIO,
  INITIAL_LABORATORIALISTAS
} from '../data/mockData';
import { ServidoresLaboratorioSection } from './ServidoresLaboratorioSection';
import { syncAllLaboratorioToSupabase, isSupabaseConfigured } from '../lib/supabaseService';

interface LaboratorioViewProps {
  amostras: AmostraLaboratorioItem[];
  pontos: PontoColetaLaboratorio[];
  coletores?: ServidorColetaLaboratorio[];
  laboratorialistas?: LaboratorialistaResponsavel[];
  currentUser: UserProfile | null;
  users: UserProfile[];
  onSaveAmostra: (amostra: AmostraLaboratorioItem) => void;
  onDeleteAmostra: (id: string) => void;
  onSavePonto?: (ponto: PontoColetaLaboratorio) => void;
  onDeletePonto?: (id: string) => void;
  onSaveColetor?: (coletor: ServidorColetaLaboratorio) => void;
  onDeleteColetor?: (id: string) => void;
  onSaveLaboratorialista?: (lab: LaboratorialistaResponsavel) => void;
  onDeleteLaboratorialista?: (id: string) => void;
}

export const LaboratorioView: React.FC<LaboratorioViewProps> = ({
  amostras,
  pontos = [],
  coletores = INITIAL_COLETORES_LABORATORIO,
  laboratorialistas = INITIAL_LABORATORIALISTAS,
  currentUser,
  users,
  onSaveAmostra,
  onDeleteAmostra,
  onSavePonto,
  onDeletePonto,
  onSaveColetor,
  onDeleteColetor,
  onSaveLaboratorialista,
  onDeleteLaboratorialista
}) => {
  // Abas do Módulo: 'coleta', 'pontos', 'laboratorio', 'relatorios', 'servidores'
  const [activeTab, setActiveTab] = useState<'coleta' | 'pontos' | 'laboratorio' | 'relatorios' | 'servidores'>('coleta');

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LaboratorioStatus>('ALL');
  const [selectedBairro, setSelectedBairro] = useState('ALL');

  // Modal de Exclusão
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'amostra' | 'ponto'>('amostra');

  // Modal / Visualização de Laudo Oficial
  const [selectedAmostraForLaudo, setSelectedAmostraForLaudo] = useState<AmostraLaboratorioItem | null>(null);

  // Modal de Autenticação / Confirmação de Assinatura Digital por Senha
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingLaboratorialista, setPendingLaboratorialista] = useState<LaboratorialistaResponsavel | null>(null);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Sincronização direta com o Supabase
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string; detail?: string } | null>(null);
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleSyncWithSupabase = async () => {
    setIsSyncingSupabase(true);
    setSyncFeedback(null);
    try {
      const res = await syncAllLaboratorioToSupabase(amostras);
      if (res.success > 0) {
        setSyncFeedback({
          type: 'success',
          message: `${res.success} de ${res.total} amostras foram sincronizadas com sucesso na tabela 'laboratorio' do Supabase!`
        });
      } else {
        setSyncFeedback({
          type: 'error',
          message: 'Nenhuma amostra pôde ser gravada no Supabase. Execute o script SQL no painel do Supabase para criar as tabelas.',
          detail: res.error
        });
      }
    } catch (e: any) {
      setSyncFeedback({
        type: 'error',
        message: `Falha na sincronização: ${e.message || 'Erro de conexão'}`,
        detail: e.message
      });
    } finally {
      setIsSyncingSupabase(false);
      setTimeout(() => {
        // Only clear if success
      }, 6000);
    }
  };

  // Sincroniza Servidores Coletores: enriquece a lista de designados com os dados em tempo real dos Operadores (users)
  const effectiveColetores: ServidorColetaLaboratorio[] = useMemo(() => {
    const baseList = (coletores && coletores.length > 0) ? coletores : (users && users.length > 0 ? users.map((u) => ({
      id: u.id,
      nome_completo: u.nome_completo,
      cargo: u.cargo || 'FISCAL DE VIGILÂNCIA SANITÁRIA',
      matricula: u.matricula || '',
      telefone: u.telefone || '',
      email: u.email || '',
      ativo: true,
      observacao: u.conselho_regional ? `Conselho: ${u.conselho_regional}` : ''
    })) : []);

    return baseList.map((col) => {
      const matchUser = users?.find(
        (u) => u.id === col.id || u.nome_completo.trim().toUpperCase() === col.nome_completo.trim().toUpperCase()
      );
      if (matchUser) {
        return {
          ...col,
          nome_completo: matchUser.nome_completo,
          cargo: matchUser.cargo || col.cargo,
          matricula: matchUser.matricula || col.matricula,
          telefone: matchUser.telefone || col.telefone,
          email: matchUser.email || col.email
        };
      }
      return col;
    });
  }, [users, coletores]);

  // Sincroniza Responsáveis Técnicos (Laboratorialistas): enriquece a lista de designados com os dados em tempo real dos Operadores (users)
  const effectiveLaboratorialistas: LaboratorialistaResponsavel[] = useMemo(() => {
    let baseList = laboratorialistas;
    if (!baseList || baseList.length === 0) {
      // Fallback inicial se ainda não houver nenhum designado explicitamente
      baseList = [
        {
          id: 'lab-resp-1',
          nome_completo: 'ADRIANO GUARDINI',
          funcao: 'FARMACÊUTICO E BIOQUIMICO',
          conselho_regional: 'CRF',
          registro_conselho: 'CRF/SC- 3321',
          email: 'adriano.guardini@bc.sc.gov.br',
          telefone: '(47) 3267-7050',
          ativo: true,
          padrao: true,
          observacao: 'Responsável Técnico Oficial pelas análises físico-químicas e microbiológicas.'
        }
      ];
    }

    return baseList.map((lab) => {
      const matchUser = users?.find(
        (u) => u.id === lab.id || u.nome_completo.trim().toUpperCase() === lab.nome_completo.trim().toUpperCase()
      );
      if (matchUser) {
        return {
          ...lab,
          nome_completo: matchUser.nome_completo,
          funcao: matchUser.cargo || lab.funcao,
          registro_conselho: matchUser.conselho_regional || lab.registro_conselho,
          conselho_regional: matchUser.conselho_regional ? matchUser.conselho_regional.split('/')[0] : lab.conselho_regional,
          email: matchUser.email || lab.email,
          telefone: matchUser.telefone || lab.telefone,
          senha: matchUser.senha || lab.senha || '123456'
        };
      }
      return lab;
    });
  }, [users, laboratorialistas]);

  // ==========================================
  // VALIDADORES DE PARÂMETROS FÍSICO-QUÍMICOS
  // ==========================================
  const parseNumParam = (val?: string | number | null): number | null => {
    if (val === undefined || val === null) return null;
    const str = String(val).replace(',', '.').replace(/[^\d.-]/g, '').trim();
    if (!str) return null;
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  };

  const getPhStatus = (val?: string | number | null): 'conform' | 'not-conform' | 'empty' => {
    const num = parseNumParam(val);
    if (num === null) return 'empty';
    return num >= 6.0 && num <= 9.5 ? 'conform' : 'not-conform';
  };

  const getCloroStatus = (val?: string | number | null): 'conform' | 'not-conform' | 'empty' => {
    const num = parseNumParam(val);
    if (num === null) return 'empty';
    return num >= 0.2 && num <= 2.0 ? 'conform' : 'not-conform';
  };

  const getFluorStatus = (val?: string | number | null): 'conform' | 'not-conform' | 'empty' => {
    const num = parseNumParam(val);
    if (num === null) return 'empty';
    return num >= 0.7 && num <= 1.0 ? 'conform' : 'not-conform';
  };

  const getTurbidezStatus = (val?: string | number | null): 'conform' | 'not-conform' | 'empty' => {
    const num = parseNumParam(val);
    if (num === null) return 'empty';
    return num >= 0 && num <= 5.0 ? 'conform' : 'not-conform';
  };

  const getParamInputClass = (status: 'conform' | 'not-conform' | 'empty') => {
    if (status === 'conform') {
      return 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-600 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/40 font-black';
    }
    if (status === 'not-conform') {
      return 'bg-red-100 dark:bg-red-950/70 border-red-600 text-red-950 dark:text-red-200 ring-2 ring-red-500/40 font-black';
    }
    return 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100';
  };

  const checkParamsConformity = (form: Partial<AmostraLaboratorioItem>) => {
    const ph = getPhStatus(form.ph);
    const cloro = getCloroStatus(form.cloro);
    const fluor = getFluorStatus(form.fluoreto);
    const turb = getTurbidezStatus(form.turbidez);
    const coliformes = form.coliformes_totais === 'PRESENTE';
    const ecoli = form.escherichia_coli === 'PRESENTE';

    const hasInconformity =
      ph === 'not-conform' ||
      cloro === 'not-conform' ||
      fluor === 'not-conform' ||
      turb === 'not-conform' ||
      coliformes ||
      ecoli;

    return {
      hasInconformity,
      status: (hasInconformity ? 'NÃO CONFORME' : 'CONFORME') as LaboratorioStatus
    };
  };

  // ==========================================
  // ESTADO DO FORMULÁRIO: ABA COLETA
  // ==========================================
  const currentYear = new Date().getFullYear();
  const getMesAnoReferenciaAtual = () => {
    const meses = [
      'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
      'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];
    const mesAtual = meses[new Date().getMonth()];
    return `${mesAtual} /${currentYear}`;
  };

  const [senhaColetor, setSenhaColetor] = useState<string>('');
  const [showSenhaColetor, setShowSenhaColetor] = useState<boolean>(false);
  const [erroSenhaColetor, setErroSenhaColetor] = useState<string>('');
  const [modoPontoExtra, setModoPontoExtra] = useState<boolean>(false);
  const [coletaForm, setColetaForm] = useState<Partial<AmostraLaboratorioItem>>({
    codigo_amostra: String(amostras.length + 171),
    protocolo: `${Math.floor(60000 + Math.random() * 9000)}/${currentYear}`,
    mes_ano_referencia: getMesAnoReferenciaAtual(),
    responsavel_distribuicao: 'EMASA',
    interessado: '',
    cnpj_cpf: '',
    numero_alvara: 'Solicitado',
    data_coleta: new Date().toISOString().split('T')[0],
    hora_coleta: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    ponto_coleta_id: '',
    ponto_coleta_nome: '',
    local_coleta: 'TORNEIRA CAFETERIA',
    endereco: 'Rua 1500, 381 - CENTRO - Balneário Camboriú/SC - 88.330-528',
    bairro: 'Centro',
    fiscal_coletor: currentUser?.nome_completo || 'Rita Sahd',
    temperatura_coleta: '20.0°C',
    cloro: '1,50',
    ph: '7,0',
    status: 'COLETA REALIZADA',
    tipo_matriz: 'ÁGUA POTÁVEL',
    observacoes: 'ANÁLISE SOLICITADA PARA VERIFICAR QUALIDADE DA ÁGUA PARA CONSUMO HUMANO'
  });

  // ==========================================
  // ESTADO DO FORMULÁRIO: ABA PONTOS
  // ==========================================
  const [pontoForm, setPontoForm] = useState<Partial<PontoColetaLaboratorio>>({
    ponto: '',
    local: '',
    endereco: '',
    bairro: 'Centro',
    observacao: '',
    ativo: true
  });
  const [editingPontoId, setEditingPontoId] = useState<string | null>(null);
  const pontoFormRef = useRef<HTMLDivElement>(null);
  const pontoInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // ESTADO DO FORMULÁRIO: ABA LABORATÓRIO (PADRÃO OFICIAL)
  // ==========================================
  const [selectedPendingColetaId, setSelectedPendingColetaId] = useState<string>('');
  const [labForm, setLabForm] = useState<Partial<AmostraLaboratorioItem>>({
    // Organolépticas
    aspecto: 'Límpido',
    odor: 'Inobjetável',
    cor: 'Incolor',

    // Físico-Química
    ph: '7,0',
    equipamento_ph: 'pH indicator strips MQuant 0 – 14 Marca MERCK',
    cloro: '1,59',
    equipamento_cloro: 'Chlorine Reagente for 10ml Sample(DLA-CL)',
    fluoreto: '0,72',
    equipamento_fluor: 'Colorímetro Digital para Flúor (Modelo DLA-FL)',
    turbidez: '0,52',
    equipamento_turbidez: 'Turbidímetro Digital modelo DLT-WV',

    // Microbiológica
    coliformes_totais: 'AUSENTE',
    metodologia_coliformes_totais: 'Kit Analisis Colilert –DST-P/A em cartela QUANTY-TRAY/2000-MARCA IDEXX+QUANTY TRAY SEALER – Model 2 X +estufa FABBE PRIMAR 36ºC100 ml por 24 horas',
    escherichia_coli: 'AUSENTE',
    metodologia_escherichia_coli: 'KIT ANALISES COLILERT-DST-P/A em cartela QUANTY-TRAY/2000-marca IDEXX+QUANTY TRAY SEALER – Model 2 X + estufa FABBE PRIMAR 36ºC100ml por 24 horas + LONG WAVE Ultravioleta 365 NM – marca CE.',

    // Parecer e Assinatura
    status: 'CONFORME',
    conclusao_laudo: 'Para os parâmetros analisados, com base Portaria GM/MS Nº 888, de 4 maio de 2021.',
    data_resultado: new Date().toISOString().split('T')[0],
    laboratorialista: 'ADRIANO GUARDINI',
    cargo_laboratorialista: 'FARMACÊUTICO E BIOQUIMICO',
    registro_conselho: 'CRF/SC- 3321',
    responsavel_analise: 'Laboratório Central Municipal VISA'
  });

  // Automação do Parecer (ÁGUA Em acordo / Em desacordo) com base nos 6 parâmetros
  useEffect(() => {
    const result = checkParamsConformity(labForm);
    const expectedStatus = result.status;
    if (
      labForm.status !== expectedStatus &&
      (labForm.status === 'CONFORME' ||
        labForm.status === 'NÃO CONFORME' ||
        labForm.status === 'NAO_CONFORME' ||
        !labForm.status)
    ) {
      setLabForm((prev) => ({
        ...prev,
        status: expectedStatus
      }));
    }
  }, [
    labForm.ph,
    labForm.cloro,
    labForm.fluoreto,
    labForm.turbidez,
    labForm.coliformes_totais,
    labForm.escherichia_coli
  ]);

  // Modal Informativo de Ação (Rascunho / Finalização / Exigência de Senha)
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    type: 'draft_saved' | 'finalized' | 'signature_required';
    title: string;
    message: string;
    amostra?: AmostraLaboratorioItem;
  } | null>(null);

  // Coletas Pendentes
  const coletasPendentes = useMemo(() => {
    return amostras.filter(
      (a) => a.status === 'COLETA REALIZADA' || a.status === 'EM ANÁLISE' || a.status === 'AGUARDANDO COLETA'
    );
  }, [amostras]);

  // Filtro geral
  const amostrasFiltradas = useMemo(() => {
    return amostras.filter((item) => {
      const matchSearch =
        item.codigo_amostra.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.protocolo && item.protocolo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.interessado && item.interessado.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.local_coleta.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.endereco && item.endereco.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.bairro && item.bairro.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.fiscal_coletor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.laboratorialista && item.laboratorialista.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchBairro = selectedBairro === 'ALL' || item.bairro === selectedBairro;

      return matchSearch && matchStatus && matchBairro;
    });
  }, [amostras, searchTerm, statusFilter, selectedBairro]);

  // Handler: Seleção de Ponto Cadastrado
  const handlePontoSelection = (pontoId: string) => {
    if (pontoId === 'EXTRA') {
      setModoPontoExtra(true);
      setColetaForm((prev) => ({
        ...prev,
        ponto_coleta_id: 'EXTRA',
        ponto_coleta_nome: prev.ponto_coleta_nome || 'Ponto Extra / Avulso'
      }));
      return;
    }

    setModoPontoExtra(false);
    const p = pontos.find((item) => item.id === pontoId);
    if (p) {
      setColetaForm((prev) => ({
        ...prev,
        ponto_coleta_id: p.id,
        ponto_coleta_nome: p.ponto,
        local_coleta: p.local,
        endereco: p.endereco,
        bairro: p.bairro,
        tipo_matriz: p.tipo_matriz_padrao || prev.tipo_matriz || 'ÁGUA POTÁVEL'
      }));
    } else {
      setColetaForm((prev) => ({
        ...prev,
        ponto_coleta_id: '',
        ponto_coleta_nome: ''
      }));
    }
  };

  // Handler: Salvar Coleta
  const handleSubmitColeta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coletaForm.local_coleta) {
      alert('Por favor, informe o local da coleta.');
      return;
    }
    if (!coletaForm.fiscal_coletor) {
      alert('Por favor, selecione o coletor responsável.');
      return;
    }

    // Validação estrita de senha para assinatura digital do coletor selecionado
    const inputPass = senhaColetor.trim();
    if (!inputPass) {
      setErroSenhaColetor('Insira a senha do coletor selecionado para autenticar a assinatura digital.');
      alert('Por favor, insira a senha do coletor selecionado para confirmar a identidade e validar a assinatura digital.');
      return;
    }

    const selectedColetorNome = (coletaForm.fiscal_coletor || '').trim().toLowerCase();
    const matchingUser = users.find(
      (u) => u.nome_completo.trim().toLowerCase() === selectedColetorNome
    );

    // Obtém a senha cadastrada especificamente para o usuário do campo 'Coletado por'
    const correctPassword = matchingUser?.senha || (matchingUser?.matricula ? matchingUser.matricula.trim() : null);

    // Validação estrita: a senha digitada DEVE corresponder à senha do usuário selecionado
    if (!correctPassword || inputPass !== correctPassword) {
      setErroSenhaColetor(`A senha informada não confere com a do usuário "${coletaForm.fiscal_coletor}". Por favor, informe a senha correta deste coletor.`);
      alert(`Erro de Autenticação: A senha digitada não confere com o usuário "${coletaForm.fiscal_coletor}".\n\nPor favor, informe a senha cadastrada para este coletor para validar a assinatura digital.`);
      return;
    }

    setErroSenhaColetor('');

    const now = new Date();
    const timestamp = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const hash = `COLETA-${(coletaForm.fiscal_coletor || 'VISA').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}-${Math.floor(100000 + Math.random() * 900000)}`;

    const newAmostra: AmostraLaboratorioItem = {
      id: coletaForm.id || `col-${Date.now()}`,
      codigo_amostra: coletaForm.codigo_amostra || String(amostras.length + 171),
      protocolo: coletaForm.protocolo || `${Math.floor(60000 + Math.random() * 9000)}/${currentYear}`,
      mes_ano_referencia: coletaForm.mes_ano_referencia || `JULHO /${currentYear}`,
      responsavel_distribuicao: coletaForm.responsavel_distribuicao || 'EMASA',
      interessado: coletaForm.interessado || coletaForm.estabelecimento || '',
      cnpj_cpf: coletaForm.cnpj_cpf || '',
      numero_alvara: coletaForm.numero_alvara || '',
      data_coleta: coletaForm.data_coleta || new Date().toISOString().split('T')[0],
      hora_coleta: coletaForm.hora_coleta || '08:20',
      ponto_coleta_id: coletaForm.ponto_coleta_id || '',
      ponto_coleta_nome: coletaForm.ponto_coleta_nome || '',
      local_coleta: coletaForm.local_coleta || '',
      endereco: coletaForm.endereco || '',
      bairro: coletaForm.bairro || 'Centro',
      estabelecimento: coletaForm.interessado || coletaForm.local_coleta || 'REDE PÚBLICA',
      fiscal_coletor: coletaForm.fiscal_coletor || 'Rita Sahd',
      temperatura_coleta: coletaForm.temperatura_coleta || '',
      cloro: coletaForm.cloro || '1,59',
      ph: coletaForm.ph || '7,0',
      observacoes: coletaForm.observacoes || 'ANÁLISE SOLICITADA PARA VERIFICAR QUALIDADE DA ÁGUA PARA CONSUMO HUMANO',
      status: (coletaForm.status as LaboratorioStatus) || 'COLETA REALIZADA',
      tipo_matriz: coletaForm.tipo_matriz || 'ÁGUA POTÁVEL',
      assinatura_digital_validada: true,
      assinatura_digital_data: timestamp,
      assinatura_digital_hash: hash,
      created_at: new Date().toISOString()
    };

    onSaveAmostra(newAmostra);
    setSenhaColetor('');

    setColetaForm({
      codigo_amostra: String(amostras.length + 172),
      protocolo: `${Math.floor(60000 + Math.random() * 9000)}/${currentYear}`,
      mes_ano_referencia: getMesAnoReferenciaAtual(),
      responsavel_distribuicao: 'EMASA',
      interessado: '',
      cnpj_cpf: '',
      numero_alvara: 'Solicitado',
      data_coleta: new Date().toISOString().split('T')[0],
      hora_coleta: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      ponto_coleta_id: '',
      ponto_coleta_nome: '',
      local_coleta: 'TORNEIRA CAFETERIA',
      endereco: 'Rua 1500, 381 - CENTRO - Balneário Camboriú/SC - 88.330-528',
      bairro: 'Centro',
      fiscal_coletor: currentUser?.nome_completo || 'Rita Sahd',
      temperatura_coleta: '20.0°C',
      cloro: '1,50',
      ph: '7,0',
      status: 'COLETA REALIZADA',
      tipo_matriz: 'ÁGUA POTÁVEL',
      observacoes: 'ANÁLISE SOLICITADA PARA VERIFICAR QUALIDADE DA ÁGUA PARA CONSUMO HUMANO'
    });

    alert('Coleta cadastrada e assinada digitalmente com sucesso!');
  };

  // Handler: Salvar Ponto
  const handleSubmitPonto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pontoForm.ponto || !pontoForm.local || !pontoForm.endereco) {
      alert('Preencha os campos obrigatórios: Ponto, Local, Endereço e Bairro.');
      return;
    }

    const wasEditing = !!editingPontoId;
    const novoPonto: PontoColetaLaboratorio = {
      id: editingPontoId || `pto-${Date.now()}`,
      ponto: pontoForm.ponto || '',
      local: pontoForm.local || '',
      endereco: pontoForm.endereco || '',
      bairro: pontoForm.bairro || 'Centro',
      observacao: pontoForm.observacao || '',
      ativo: true
    };

    if (onSavePonto) {
      onSavePonto(novoPonto);
    }

    setPontoForm({
      ponto: '',
      local: '',
      endereco: '',
      bairro: 'Centro',
      observacao: '',
      ativo: true
    });
    setEditingPontoId(null);
    alert(wasEditing ? 'Ponto de coleta atualizado com sucesso!' : 'Novo ponto de coleta cadastrado com sucesso!');
  };

  // Handler: Autenticação de Assinatura Digital por Senha
  const handleConfirmPasswordSignature = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pendingLaboratorialista) return;

    const inputPass = authPassword.trim();
    if (!inputPass) {
      setAuthError('Por favor, digite sua senha de acesso.');
      return;
    }

    // 1. Procurar perfil do usuário no sistema pelo nome ou email
    const matchingUser = users.find(
      (u) =>
        u.nome_completo.trim().toLowerCase() === pendingLaboratorialista.nome_completo.trim().toLowerCase() ||
        (pendingLaboratorialista.email && u.email.trim().toLowerCase() === pendingLaboratorialista.email.trim().toLowerCase())
    );

    // 2. Senhas válidas aceitas:
    // - Senha cadastrada no perfil do laboratorialista (se houver)
    // - Senha do usuário correspondente no sistema da VISA
    // - Senha do usuário logado atualmente se for o próprio servidor ou se for MASTER
    // - Senha padrão de teste '123456'
    const isCurrentUserMatched =
      currentUser &&
      (currentUser.nome_completo.trim().toLowerCase() === pendingLaboratorialista.nome_completo.trim().toLowerCase() ||
        (pendingLaboratorialista.email && currentUser.email.trim().toLowerCase() === pendingLaboratorialista.email.trim().toLowerCase()));

    const isMasterUser = currentUser?.nivel_acesso === 'MASTER (TUDO)';

    const validPasswords = [
      pendingLaboratorialista.senha,
      matchingUser?.senha,
      isCurrentUserMatched ? currentUser?.senha : null,
      isMasterUser ? currentUser?.senha : null,
      '123456'
    ].filter(Boolean) as string[];

    const isPasswordCorrect = validPasswords.some((pass) => pass === inputPass);

    if (isPasswordCorrect) {
      const now = new Date();
      const timestamp = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const hash = `VISA-${pendingLaboratorialista.registro_conselho.replace(/[^a-zA-Z0-9]/g, '')}-${Math.floor(100000 + Math.random() * 900000)}`;

      setLabForm((prev) => ({
        ...prev,
        laboratorialista: pendingLaboratorialista.nome_completo,
        cargo_laboratorialista: pendingLaboratorialista.funcao,
        registro_conselho: pendingLaboratorialista.registro_conselho,
        assinatura_digital_validada: true,
        assinatura_digital_data: timestamp,
        assinatura_digital_hash: hash
      }));

      setAuthSuccess(true);
      setAuthError(null);

      setTimeout(() => {
        setAuthModalOpen(false);
        setPendingLaboratorialista(null);
        setAuthPassword('');
        setAuthSuccess(false);
      }, 600);
    } else {
      setAuthError('Senha incorreta! A validação da assinatura técnica falhou. Verifique sua senha.');
    }
  };

  // Abrir modal de validação para o responsável atual
  const handleOpenAuthForCurrentLab = () => {
    const currentName = labForm.laboratorialista;
    const lab = effectiveLaboratorialistas.find((l) => l.nome_completo === currentName) || {
      id: 'temp-lab',
      nome_completo: currentName || 'ADRIANO GUARDINI',
      funcao: labForm.cargo_laboratorialista || 'FARMACÊUTICO E BIOQUIMICO',
      registro_conselho: labForm.registro_conselho || 'CRF/SC- 3321',
      ativo: true
    };
    setPendingLaboratorialista(lab);
    setAuthPassword('');
    setAuthError(null);
    setAuthSuccess(false);
    setShowPassword(false);
    setAuthModalOpen(true);
  };

  // Handler: Selecionar Coleta Pendente no Laboratório
  const handleSelectPendingColeta = (coletaId: string) => {
    setSelectedPendingColetaId(coletaId);
    const selected = amostras.find((a) => a.id === coletaId);
    if (selected) {
      setLabForm({
        ...selected,
        aspecto: selected.aspecto || 'Límpido',
        odor: selected.odor || 'Inobjetável',
        cor: selected.cor || 'Incolor',
        ph: selected.ph || '7,0',
        equipamento_ph: selected.equipamento_ph || 'pH indicator strips MQuant 0 – 14 Marca MERCK',
        cloro: selected.cloro || '1,59',
        equipamento_cloro: selected.equipamento_cloro || 'Chlorine Reagente for 10ml Sample(DLA-CL)',
        fluoreto: selected.fluoreto || '0,72',
        equipamento_fluor: selected.equipamento_fluor || 'Colorímetro Digital para Flúor (Modelo DLA-FL)',
        turbidez: selected.turbidez || '0,52',
        equipamento_turbidez: selected.equipamento_turbidez || 'Turbidímetro Digital modelo DLT-WV',
        coliformes_totais: selected.coliformes_totais || 'AUSENTE',
        metodologia_coliformes_totais: selected.metodologia_coliformes_totais || 'Kit Analisis Colilert –DST-P/A em cartela QUANTY-TRAY/2000-MARCA IDEXX+QUANTY TRAY SEALER – Model 2 X +estufa FABBE PRIMAR 36ºC100 ml por 24 horas',
        escherichia_coli: selected.escherichia_coli || 'AUSENTE',
        metodologia_escherichia_coli: selected.metodologia_escherichia_coli || 'KIT ANALISES COLILERT-DST-P/A em cartela QUANTY-TRAY/2000-marca IDEXX+QUANTY TRAY SEALER – Model 2 X + estufa FABBE PRIMAR 36ºC100ml por 24 horas + LONG WAVE Ultravioleta 365 NM – marca CE.',
        status: selected.status === 'NÃO CONFORME' || selected.status === 'NAO_CONFORME' ? 'NÃO CONFORME' : 'CONFORME',
        conclusao_laudo: selected.conclusao_laudo || 'Para os parâmetros analisados, com base Portaria GM/MS Nº 888, de 4 maio de 2021.',
        data_resultado: new Date().toISOString().split('T')[0],
        laboratorialista: selected.laboratorialista || 'ADRIANO GUARDINI',
        cargo_laboratorialista: selected.cargo_laboratorialista || 'FARMACÊUTICO E BIOQUIMICO',
        registro_conselho: selected.registro_conselho || 'CRF/SC- 3321',
        assinatura_digital_validada: selected.assinatura_digital_validada || false,
        assinatura_digital_data: selected.assinatura_digital_data,
        assinatura_digital_hash: selected.assinatura_digital_hash
      });
    }
  };

  // Handler: Salvar Rascunho / Salvamento Parcial dos Dados do Laudo
  const handleSaveDraftLaboratorio = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetId = selectedPendingColetaId || labForm.id;
    if (!targetId) {
      alert('Selecione uma amostra da lista de coletas pendentes para salvar o rascunho.');
      return;
    }

    const baseAmostra = amostras.find((a) => a.id === targetId) || ({} as AmostraLaboratorioItem);

    const updatedAmostra: AmostraLaboratorioItem = {
      ...baseAmostra,
      ...labForm,
      id: targetId,
      status:
        baseAmostra.status === 'CONFORME' ||
        baseAmostra.status === 'NÃO CONFORME' ||
        baseAmostra.status === 'NAO_CONFORME'
          ? baseAmostra.status
          : 'EM ANÁLISE',
      aspecto: labForm.aspecto || 'Límpido',
      odor: labForm.odor || 'Inobjetável',
      cor: labForm.cor || 'Incolor',
      ph: labForm.ph || '7,0',
      equipamento_ph: labForm.equipamento_ph,
      cloro: labForm.cloro || '1,59',
      equipamento_cloro: labForm.equipamento_cloro,
      fluoreto: labForm.fluoreto || '0,72',
      equipamento_fluor: labForm.equipamento_fluor,
      turbidez: labForm.turbidez || '0,52',
      equipamento_turbidez: labForm.equipamento_turbidez,
      coliformes_totais: labForm.coliformes_totais || 'AUSENTE',
      metodologia_coliformes_totais: labForm.metodologia_coliformes_totais,
      escherichia_coli: labForm.escherichia_coli || 'AUSENTE',
      metodologia_escherichia_coli: labForm.metodologia_escherichia_coli,
      conclusao_laudo: labForm.conclusao_laudo,
      data_resultado: labForm.data_resultado || new Date().toISOString().split('T')[0],
      laboratorialista: labForm.laboratorialista || 'ADRIANO GUARDINI',
      cargo_laboratorialista: labForm.cargo_laboratorialista || 'FARMACÊUTICO E BIOQUIMICO',
      registro_conselho: labForm.registro_conselho || 'CRF/SC- 3321',
      assinatura_digital_validada: labForm.assinatura_digital_validada || false,
      assinatura_digital_data: labForm.assinatura_digital_data,
      assinatura_digital_hash: labForm.assinatura_digital_hash
    };

    onSaveAmostra(updatedAmostra);

    setFeedbackModal({
      isOpen: true,
      type: 'draft_saved',
      title: 'Rascunho do Laudo Salvo com Sucesso!',
      message: 'Os parâmetros e dados informados da análise foram preservados com segurança. A amostra permanece em aberto até a validação com senha e finalização.',
      amostra: updatedAmostra
    });
  };

  // Handler: Salvar e Finalizar Laudo Oficial com Validação Estrita de Senha do Responsável
  const handleSubmitLaboratorio = (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = selectedPendingColetaId || labForm.id;
    if (!targetId) {
      alert('Selecione uma amostra da lista de coletas pendentes para laudar.');
      return;
    }

    // 1. BLOQUEIO OBRIGATÓRIO: Sem assinatura validada por senha do técnico, NÃO permite salvar
    if (!labForm.assinatura_digital_validada) {
      setFeedbackModal({
        isOpen: true,
        type: 'signature_required',
        title: 'Falta a assinatura do técnico',
        message: 'Falta a assinatura do técnico. Para salvar o laudo oficial, realize a autenticação com a senha do responsável técnico para assinar digitalmente.',
        amostra: undefined
      });
      return;
    }

    const baseAmostra = amostras.find((a) => a.id === targetId) || ({} as AmostraLaboratorioItem);
    const resultConformity = checkParamsConformity(labForm);
    const finalStatus: LaboratorioStatus = resultConformity.status;

    const updatedAmostra: AmostraLaboratorioItem = {
      ...baseAmostra,
      ...labForm,
      id: targetId,
      status: finalStatus,
      aspecto: labForm.aspecto || 'Límpido',
      odor: labForm.odor || 'Inobjetável',
      cor: labForm.cor || 'Incolor',
      ph: labForm.ph || '7,0',
      equipamento_ph: labForm.equipamento_ph,
      cloro: labForm.cloro || '1,59',
      equipamento_cloro: labForm.equipamento_cloro,
      fluoreto: labForm.fluoreto || '0,72',
      equipamento_fluor: labForm.equipamento_fluor,
      turbidez: labForm.turbidez || '0,52',
      equipamento_turbidez: labForm.equipamento_turbidez,
      coliformes_totais: labForm.coliformes_totais || 'AUSENTE',
      metodologia_coliformes_totais: labForm.metodologia_coliformes_totais,
      escherichia_coli: labForm.escherichia_coli || 'AUSENTE',
      metodologia_escherichia_coli: labForm.metodologia_escherichia_coli,
      conclusao_laudo: labForm.conclusao_laudo,
      data_resultado: labForm.data_resultado || new Date().toISOString().split('T')[0],
      laboratorialista: labForm.laboratorialista || 'ADRIANO GUARDINI',
      cargo_laboratorialista: labForm.cargo_laboratorialista || 'FARMACÊUTICO E BIOQUIMICO',
      registro_conselho: labForm.registro_conselho || 'CRF/SC- 3321',
      assinatura_digital_validada: true,
      assinatura_digital_data: labForm.assinatura_digital_data,
      assinatura_digital_hash: labForm.assinatura_digital_hash
    };

    onSaveAmostra(updatedAmostra);
    setSelectedPendingColetaId('');

    setFeedbackModal({
      isOpen: true,
      type: 'finalized',
      title: 'Salvo com sucesso!',
      message:
        finalStatus === 'CONFORME'
          ? 'O laudo oficial foi assinado e salvo com sucesso. A água analisada foi atestada como EM ACORDO com os padrões de potabilidade.'
          : 'O laudo oficial foi assinado e salvo com sucesso. A água analisada foi atestada como EM DESACORDO com os padrões de potabilidade.',
      amostra: updatedAmostra
    });
  };

  return (
    <div id="laboratorio-root-container" className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-y-auto">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-xl border border-cyan-500/20">
            <Microscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black uppercase text-slate-800 dark:text-white tracking-tight">
                Módulo de Laboratório & Coletas
              </h1>
              <span className="bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                VISA Balneário Camboriú
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Coletas de campo, cadastro de pontos, laudo oficial de água para consumo humano e relatórios imediatos.
            </p>
          </div>
        </div>

        {/* Abas de Navegação (Sem a palavra 'Aba') */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
          <button
            id="tab-btn-coleta"
            onClick={() => setActiveTab('coleta')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition uppercase ${
              activeTab === 'coleta'
                ? 'bg-cyan-600 text-white shadow font-black'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Droplet className="w-3.5 h-3.5" />
            Coleta
          </button>

          <button
            id="tab-btn-pontos"
            onClick={() => setActiveTab('pontos')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition uppercase ${
              activeTab === 'pontos'
                ? 'bg-cyan-600 text-white shadow font-black'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Pontos ({pontos.length})
          </button>

          <button
            id="tab-btn-laboratorio"
            onClick={() => setActiveTab('laboratorio')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition uppercase relative ${
              activeTab === 'laboratorio'
                ? 'bg-cyan-600 text-white shadow font-black'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Laboratório
            {coletasPendentes.length > 0 && (
              <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-full ml-1">
                {coletasPendentes.length}
              </span>
            )}
          </button>

          <button
            id="tab-btn-relatorios"
            onClick={() => setActiveTab('relatorios')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition uppercase ${
              activeTab === 'relatorios'
                ? 'bg-cyan-600 text-white shadow font-black'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Relatórios ({amostras.length})
          </button>

          <button
            id="tab-btn-servidores"
            onClick={() => setActiveTab('servidores')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition uppercase ${
              activeTab === 'servidores'
                ? 'bg-cyan-600 text-white shadow font-black'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Servidores ({coletores.length + laboratorialistas.length})
          </button>
        </div>
      </div>
      </div>

      {/* Banner de Feedback de Sincronização */}
      {syncFeedback && (
        <div className={`mx-6 mt-4 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold ${
          syncFeedback.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            : 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200'
        }`}>
          <div className="flex items-start gap-2.5">
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-black">{syncFeedback.message}</p>
              {syncFeedback.detail && (
                <p className="text-[11px] font-mono opacity-80 mt-1 bg-black/5 dark:bg-black/20 p-1.5 rounded">
                  Detalhe: {syncFeedback.detail}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {syncFeedback.type === 'error' && (
              <button
                onClick={() => setSqlModalOpen(true)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg uppercase text-[10px] font-black flex items-center gap-1.5 transition cursor-pointer"
              >
                <Code className="w-3.5 h-3.5" />
                Copiar Script SQL
              </button>
            )}
            <button onClick={() => setSyncFeedback(null)} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <div className="p-6 flex-1 max-w-7xl w-full mx-auto space-y-6">

        {/* ============================================================== */}
        {/* 1. COLETA (ENTRADA DO COLETOR - BASEADA NO LAUDO OFICIAL)       */}
        {/* ============================================================== */}
        {activeTab === 'coleta' && (
          <div className="text-left max-w-5xl mx-auto w-full">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 mb-5">
                <div>
                  <h2 className="text-base font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
                    <Droplet className="w-5 h-5 text-cyan-500" />
                    Registro de Coleta para Análise de Água
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Preencha os dados oficiais do estabelecimento, ponto e parâmetros de coleta.
                  </p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <label htmlFor="input-codigo-amostra-coleta" className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1 cursor-pointer">
                    <Edit3 className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                    <span>Nº da Amostra (Editável)</span>
                  </label>
                  <div className="relative inline-flex items-center">
                    <input
                      id="input-codigo-amostra-coleta"
                      type="text"
                      required
                      placeholder="Ex: 171"
                      title="Número automático da amostra (você pode editar manualmente se necessário)"
                      value={coletaForm.codigo_amostra || ''}
                      onChange={(e) => setColetaForm({ ...coletaForm, codigo_amostra: e.target.value })}
                      className="bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100/80 dark:hover:bg-cyan-950/90 text-cyan-800 dark:text-cyan-200 text-xs font-mono font-black px-3 py-1.5 rounded-xl border border-cyan-300 dark:border-cyan-700/80 text-right w-32 sm:w-36 focus:w-44 transition-all focus:ring-2 focus:ring-cyan-500 focus:outline-none shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmitColeta} className="space-y-4">
                {/* Linha: Protocolo, Mês/Ano, Distribuição */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Protocolo Oficial *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 60.455/2026"
                      value={coletaForm.protocolo}
                      onChange={(e) => setColetaForm({ ...coletaForm, protocolo: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Mês / Ano Referência *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: JULHO /2026"
                      value={coletaForm.mes_ano_referencia}
                      onChange={(e) => setColetaForm({ ...coletaForm, mes_ano_referencia: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm uppercase font-bold focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Resp. pela Distribuição *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: EMASA"
                      value={coletaForm.responsavel_distribuicao}
                      onChange={(e) => setColetaForm({ ...coletaForm, responsavel_distribuicao: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-bold uppercase focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>
                </div>

                {/* Linha: Interessado / Razão Social, CNPJ, Número Alvará */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Interessado (Razão Social)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: MERCADO BAGÉ LTDA (Opcional)"
                      value={coletaForm.interessado || ''}
                      onChange={(e) => setColetaForm({ ...coletaForm, interessado: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm uppercase focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                      CNPJ / CPF
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 63.457.239/0001-05 (Opcional)"
                      value={coletaForm.cnpj_cpf || ''}
                      onChange={(e) => setColetaForm({ ...coletaForm, cnpj_cpf: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Número Alvará
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Solicitado ou 1234/2026"
                      value={coletaForm.numero_alvara || ''}
                      onChange={(e) => setColetaForm({ ...coletaForm, numero_alvara: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>
                </div>

                {/* Linha: Ponto Cadastrado, Local de Coleta, Endereço e Bairro */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300">
                        {modoPontoExtra ? 'Identificação do Ponto Extra (Manual) *' : 'Ponto Cadastrado no Sistema (Opcional)'}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const nextMode = !modoPontoExtra;
                          setModoPontoExtra(nextMode);
                          if (nextMode) {
                            setColetaForm((prev) => ({
                              ...prev,
                              ponto_coleta_id: 'EXTRA',
                              ponto_coleta_nome: prev.ponto_coleta_nome || 'Ponto Extra / Avulso'
                            }));
                          } else {
                            setColetaForm((prev) => ({
                              ...prev,
                              ponto_coleta_id: '',
                              ponto_coleta_nome: ''
                            }));
                          }
                        }}
                        className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        {modoPontoExtra ? 'Selecionar da Lista Cadastrada' : '✍️ Digitar Ponto Extra / Avulso'}
                      </button>
                    </div>

                    {modoPontoExtra ? (
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="Ex: PONTO EXTRA 01 - ESCOLA IVETE ou PONTO AVULSO"
                          value={coletaForm.ponto_coleta_nome || ''}
                          onChange={(e) =>
                            setColetaForm({
                              ...coletaForm,
                              ponto_coleta_nome: e.target.value,
                              ponto_coleta_id: 'EXTRA'
                            })
                          }
                          className="w-full bg-cyan-50/50 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-700 rounded-xl px-3 py-2 text-sm font-bold uppercase focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white"
                        />
                      </div>
                    ) : (
                      <select
                        value={coletaForm.ponto_coleta_id || ''}
                        onChange={(e) => handlePontoSelection(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none font-medium"
                      >
                        <option value="">-- Selecione ponto cadastrado --</option>
                        <option value="EXTRA">✍️ + Ponto Extra / Digitação Manual Livre</option>
                        {pontos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.ponto} ({p.local} - {p.bairro})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Local de Coleta Específico *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: TORNEIRA CAFETERIA, BEBEDOURO PÁTIO, CAVALETE EXTERNO"
                      value={coletaForm.local_coleta || ''}
                      onChange={(e) => setColetaForm({ ...coletaForm, local_coleta: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm uppercase font-bold focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Endereço Completo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Rua 1500, 381 - CENTRO - Balneário Camboriú/SC - 88.330-528"
                      value={coletaForm.endereco || ''}
                      onChange={(e) => setColetaForm({ ...coletaForm, endereco: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Bairro / Localidade *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        list="bairros-laboratorio-coleta-list"
                        placeholder="Ex: Centro, Nações..."
                        value={coletaForm.bairro || ''}
                        onChange={(e) => setColetaForm({ ...coletaForm, bairro: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none font-bold text-slate-900 dark:text-white"
                      />
                      <datalist id="bairros-laboratorio-coleta-list">
                        {BAIRROS_BC.map((b) => (
                          <option key={b} value={b} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                </div>

                {/* Linha: Data da Coleta, Hora da Coleta, Coletado por */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Data da Coleta *
                    </label>
                    <input
                      type="date"
                      required
                      value={coletaForm.data_coleta}
                      onChange={(e) => setColetaForm({ ...coletaForm, data_coleta: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Hora da Coleta *
                    </label>
                    <input
                      type="time"
                      required
                      value={coletaForm.hora_coleta}
                      onChange={(e) => setColetaForm({ ...coletaForm, hora_coleta: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none font-bold"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300">
                        Coletado por
                      </label>
                      {effectiveColetores.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('servidores')}
                          className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                        >
                          Gerenciar Servidores ({effectiveColetores.length})
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <select
                        value={coletaForm.fiscal_coletor || ''}
                        onChange={(e) => {
                          setColetaForm({ ...coletaForm, fiscal_coletor: e.target.value });
                          setErroSenhaColetor('');
                        }}
                        required
                        className={`w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2 text-xs font-bold outline-none transition ${
                          erroSenhaColetor
                            ? 'border-red-500 ring-2 ring-red-400/40 dark:border-red-500'
                            : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-cyan-500'
                        }`}
                      >
                        <option value="">-- Selecione o Coletor --</option>
                        {effectiveColetores.filter((c) => c.ativo).map((c) => (
                          <option key={c.id} value={c.nome_completo}>
                            {c.nome_completo}
                          </option>
                        ))}
                      </select>

                      <div className="relative">
                        <input
                          type={showSenhaColetor ? 'text' : 'password'}
                          required
                          placeholder="Senha do coletor (Assinatura Digital)..."
                          value={senhaColetor}
                          onChange={(e) => {
                            setSenhaColetor(e.target.value);
                            if (erroSenhaColetor) setErroSenhaColetor('');
                          }}
                          className={`w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2 pr-9 text-xs outline-none font-bold placeholder:font-normal placeholder:text-slate-400 transition ${
                            erroSenhaColetor
                              ? 'border-red-500 ring-2 ring-red-400/40 text-red-700 dark:text-red-300 dark:border-red-500'
                              : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-cyan-500'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSenhaColetor(!showSenhaColetor)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          tabIndex={-1}
                          title={showSenhaColetor ? 'Ocultar senha' : 'Ver senha'}
                        >
                          {showSenhaColetor ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {erroSenhaColetor && (
                        <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-[11px] text-red-700 dark:text-red-300 font-bold flex items-start gap-1.5 animate-fadeIn">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                          <span>{erroSenhaColetor}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Observações da Coleta */}
                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Observações do Pedido de Análise
                  </label>
                  <input
                    type="text"
                    value={coletaForm.observacoes}
                    onChange={(e) => setColetaForm({ ...coletaForm, observacoes: e.target.value })}
                    placeholder="Ex: ANÁLISE SOLICITADA PARA VERIFICAR QUALIDADE DA ÁGUA PARA CONSUMO HUMANO"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm uppercase focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Ao salvar a coleta, a amostra entrará na fila da aba <strong>Laboratório</strong> para realização das análises físico-químicas e microbiológicas.
                  </span>
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs px-6 py-3 rounded-xl uppercase shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Salvar Coleta e Enviar ao Laboratório
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. PONTOS (GESTÃO DE PONTOS COM BOTÃO DE EXCLUSÃO EM X)        */}
        {/* ============================================================== */}
        {activeTab === 'pontos' && (
          <div className="space-y-6 text-left">
            <div
              ref={pontoFormRef}
              className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border shadow-sm transition-all duration-300 ${
                editingPontoId
                  ? 'border-amber-400 dark:border-amber-500 ring-4 ring-amber-500/15'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${editingPontoId ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300'}`}>
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
                      {editingPontoId ? 'Editar Ponto de Coleta' : 'Adicionar Novo Ponto de Coleta'}
                    </h2>
                    {editingPontoId && (
                      <p className="text-xs text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1">
                        <span>✏️ Editando:</span>
                        <span className="font-mono underline">{pontoForm.ponto || 'Ponto selecionado'}</span>
                      </p>
                    )}
                  </div>
                </div>

                {editingPontoId && (
                  <button
                    onClick={() => {
                      setEditingPontoId(null);
                      setPontoForm({ ponto: '', local: '', endereco: '', bairro: 'Centro', observacao: '', ativo: true });
                    }}
                    className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-black uppercase transition cursor-pointer"
                  >
                    ✕ Cancelar Edição
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmitPonto} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Ponto (Identificador) *
                  </label>
                  <input
                    ref={pontoInputRef}
                    type="text"
                    required
                    placeholder="Ex: Ponto 09 - Pontal Norte"
                    value={pontoForm.ponto}
                    onChange={(e) => setPontoForm({ ...pontoForm, ponto: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Local *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Posto de Salva-Vidas 01"
                    value={pontoForm.local}
                    onChange={(e) => setPontoForm({ ...pontoForm, local: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Endereço *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Av. Atlântica, final norte"
                    value={pontoForm.endereco}
                    onChange={(e) => setPontoForm({ ...pontoForm, endereco: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Bairro *
                  </label>
                  <select
                    value={pontoForm.bairro}
                    onChange={(e) => setPontoForm({ ...pontoForm, bairro: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none font-bold"
                  >
                    {BAIRROS_BC.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Observações de Amostragem
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Torneira externa do posto, abrir 2 min antes da amostragem..."
                    value={pontoForm.observacao}
                    onChange={(e) => setPontoForm({ ...pontoForm, observacao: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>

                <div className="md:col-span-1 flex items-end gap-2">
                  <button
                    type="submit"
                    className={`w-full text-white font-black text-xs py-2.5 rounded-xl uppercase shadow transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      editingPontoId
                        ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                        : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/30'
                    }`}
                  >
                    {editingPontoId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingPontoId ? 'Salvar Alterações' : 'Cadastrar Ponto'}
                  </button>
                  {editingPontoId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPontoId(null);
                        setPontoForm({ ponto: '', local: '', endereco: '', bairro: 'Centro', observacao: '', ativo: true });
                      }}
                      className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl uppercase transition cursor-pointer"
                      title="Cancelar Edição"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Listagem de Pontos */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white">
                    Pontos Oficiais de Amostragem do Município
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Clique no lápis <strong className="text-cyan-600 dark:text-cyan-400">"Editar"</strong> para carregar os dados no formulário acima ou no <strong className="text-red-500">"X Excluir"</strong> para remover.
                  </p>
                </div>
                <span className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold px-3 py-1 rounded-full">
                  Total: {pontos.length} pontos
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-black uppercase border-b border-slate-200 dark:border-slate-700">
                      <th className="py-3 px-4">Ponto</th>
                      <th className="py-3 px-4">Local</th>
                      <th className="py-3 px-4">Endereço</th>
                      <th className="py-3 px-4">Bairro</th>
                      <th className="py-3 px-4">Observação</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {pontos.map((p) => {
                      const isEditingThis = editingPontoId === p.id;
                      return (
                        <tr
                          key={p.id}
                          className={`transition ${
                            isEditingThis
                              ? 'bg-amber-50/80 dark:bg-amber-950/40 ring-1 ring-amber-400/50'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'
                          }`}
                        >
                          <td className="py-3 px-4 font-black text-slate-900 dark:text-white font-mono">
                            {p.ponto}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                            {p.local}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            {p.endereco}
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded text-[11px] font-bold">
                              {p.bairro}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 truncate max-w-xs">
                            {p.observacao || '--'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingPontoId(p.id);
                                  setPontoForm(p);
                                  setTimeout(() => {
                                    pontoFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    pontoInputRef.current?.focus();
                                  }, 60);
                                }}
                                title="Editar Ponto"
                                className={`p-1.5 rounded-lg transition ${
                                  isEditingThis
                                    ? 'bg-amber-500 text-slate-950 font-bold ring-2 ring-amber-400'
                                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 text-slate-700 dark:text-slate-300 hover:text-cyan-600'
                                }`}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Botão de Excluir 'X' */}
                              <button
                                onClick={() => {
                                  setDeleteType('ponto');
                                  setDeleteConfirmId(p.id);
                                }}
                                title="Excluir Ponto (X)"
                                className="px-2.5 py-1 bg-red-100 hover:bg-red-600 text-red-600 hover:text-white font-black rounded-lg transition text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5 stroke-[3]" />
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. LABORATÓRIO (PREENCHIMENTO COM BASE NO MODELO OFICIAL)      */}
        {/* ============================================================== */}
        {activeTab === 'laboratorio' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
            {/* Lista de Coletas Pendentes */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
                  <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Amostras para Análise
                  </h3>
                  <span className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-mono font-black px-2.5 py-0.5 rounded-full">
                    {coletasPendentes.length} pendentes
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {coletasPendentes.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                      Todas as amostras coletadas já foram laudadas!
                    </div>
                  ) : (
                    coletasPendentes.map((cp) => {
                      const isSelected = selectedPendingColetaId === cp.id;
                      return (
                        <div
                          key={cp.id}
                          onClick={() => handleSelectPendingColeta(cp.id)}
                          className={`p-3.5 rounded-xl border transition cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 ring-2 ring-cyan-500/20 shadow'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs font-black text-cyan-600 dark:text-cyan-400">
                              Amostra Nº {cp.codigo_amostra}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">
                              {cp.data_coleta} às {cp.hora_coleta || '--:--'}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">
                            {cp.interessado || cp.local_coleta}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {cp.local_coleta} • {cp.bairro}
                          </p>
                          <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px]">
                            <span className="text-slate-600 dark:text-slate-400 font-mono">
                              Prot: {cp.protocolo || '--'}
                            </span>
                            <span className="text-cyan-600 dark:text-cyan-400 font-black flex items-center gap-1">
                              Preencher Laudo →
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-500">
                Padrão analítico oficial: <strong>Portaria GM/MS nº 888/2021</strong> e <strong>Portaria/SC- 421/2016</strong>.
              </div>
            </div>

            {/* Formulário do Laudo Laboratorial */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 mb-5">
                <div>
                  <h2 className="text-base font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
                    <FlaskConical className="w-5 h-5 text-cyan-500" />
                    Emissão de Laudo de Análise de Água
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Insira as características organolépticas, análises físico-químicas e microbiológicas.
                  </p>
                </div>
                {labForm.codigo_amostra && (
                  <span className="bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-mono text-xs font-black px-3 py-1 rounded-lg">
                    Amostra: {labForm.codigo_amostra}
                  </span>
                )}
              </div>

              <form onSubmit={handleSubmitLaboratorio} className="space-y-5">
                {/* 1. Características Organolépticas */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white mb-3">
                    1. Características Organolépticas
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                        Aspecto
                      </label>
                      <input
                        type="text"
                        value={labForm.aspecto || 'Límpido'}
                        onChange={(e) => setLabForm({ ...labForm, aspecto: e.target.value })}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                        Odor
                      </label>
                      <input
                        type="text"
                        value={labForm.odor || 'Inobjetável'}
                        onChange={(e) => setLabForm({ ...labForm, odor: e.target.value })}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                        Cor
                      </label>
                      <input
                        type="text"
                        value={labForm.cor || 'Incolor'}
                        onChange={(e) => setLabForm({ ...labForm, cor: e.target.value })}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Análise Físico/Química */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white mb-2">
                    2. Análise Físico/Química
                  </h3>
                  
                  {/* pH e Cloro */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* pH (Ref: 6.0 a 9.5) */}
                    {(() => {
                      const phStatus = getPhStatus(labForm.ph);
                      return (
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-black uppercase text-slate-800 dark:text-white">
                              pH (Ref: 6.0 a 9.5)
                            </label>
                            <span className="text-[10px] text-slate-400 font-mono">Portaria 888/2021</span>
                          </div>
                          <input
                            type="text"
                            placeholder="Resultado (Ex: 7,0)"
                            value={labForm.ph || ''}
                            onChange={(e) => setLabForm({ ...labForm, ph: e.target.value })}
                            className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-black mb-2 outline-none transition ${getParamInputClass(
                              phStatus
                            )}`}
                          />
                          <input
                            type="text"
                            placeholder="Equipamento"
                            value={labForm.equipamento_ph || 'pH indicator strips MQuant 0 – 14 Marca MERCK'}
                            onChange={(e) => setLabForm({ ...labForm, equipamento_ph: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-500 outline-none"
                          />
                        </div>
                      );
                    })()}

                    {/* Cloro (Ref: 0,2 a 2,0 mg/l) */}
                    {(() => {
                      const cloroStatus = getCloroStatus(labForm.cloro);
                      return (
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-black uppercase text-slate-800 dark:text-white">
                              Cloro Residual Livre (0,2 a 2,0 mg/l)
                            </label>
                            <span className="text-[10px] text-slate-400 font-mono">Portaria 888/2021</span>
                          </div>
                          <input
                            type="text"
                            placeholder="Resultado (Ex: 1,59)"
                            value={labForm.cloro || ''}
                            onChange={(e) => setLabForm({ ...labForm, cloro: e.target.value })}
                            className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-black mb-2 outline-none transition ${getParamInputClass(
                              cloroStatus
                            )}`}
                          />
                          <input
                            type="text"
                            placeholder="Equipamento"
                            value={labForm.equipamento_cloro || 'Chlorine Reagente for 10ml Sample(DLA-CL)'}
                            onChange={(e) => setLabForm({ ...labForm, equipamento_cloro: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-500 outline-none"
                          />
                        </div>
                      );
                    })()}
                  </div>

                  {/* Flúor e Turbidez */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Flúor (Ref: 0,7 a 1,0 mg/L) */}
                    {(() => {
                      const fluorStatus = getFluorStatus(labForm.fluoreto);
                      return (
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-black uppercase text-slate-800 dark:text-white">
                              Flúor (Ref: 0,7 a 1,0 mg/L)
                            </label>
                            <span className="text-[10px] text-slate-400 font-mono">Portaria/SC- 421/2016</span>
                          </div>
                          <input
                            type="text"
                            placeholder="Resultado (Ex: 0,72)"
                            value={labForm.fluoreto || ''}
                            onChange={(e) => setLabForm({ ...labForm, fluoreto: e.target.value })}
                            className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-black mb-2 outline-none transition ${getParamInputClass(
                              fluorStatus
                            )}`}
                          />
                          <input
                            type="text"
                            placeholder="Equipamento"
                            value={labForm.equipamento_fluor || 'Colorímetro Digital para Flúor (Modelo DLA-FL)'}
                            onChange={(e) => setLabForm({ ...labForm, equipamento_fluor: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-500 outline-none"
                          />
                        </div>
                      );
                    })()}

                    {/* Turbidez (Ref: Até 5,0 NTu) */}
                    {(() => {
                      const turbidezStatus = getTurbidezStatus(labForm.turbidez);
                      return (
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-black uppercase text-slate-800 dark:text-white">
                              Turbidez (Ref: Até 5,0 NTu)
                            </label>
                            <span className="text-[10px] text-slate-400 font-mono">Portaria 888/2021</span>
                          </div>
                          <input
                            type="text"
                            placeholder="Resultado (Ex: 0,52)"
                            value={labForm.turbidez || ''}
                            onChange={(e) => setLabForm({ ...labForm, turbidez: e.target.value })}
                            className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-black mb-2 outline-none transition ${getParamInputClass(
                              turbidezStatus
                            )}`}
                          />
                          <input
                            type="text"
                            placeholder="Equipamento"
                            value={labForm.equipamento_turbidez || 'Turbidímetro Digital modelo DLT-WV'}
                            onChange={(e) => setLabForm({ ...labForm, equipamento_turbidez: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-500 outline-none"
                          />
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 3. Análise Microbiológica */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white mb-2">
                    3. Análise Microbiológica (Ref: Ausência em 100 ml)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Coliformes Totais */}
                    {(() => {
                      const isPresente = labForm.coliformes_totais === 'PRESENTE';
                      return (
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                          <label className="block text-xs font-black uppercase text-slate-800 dark:text-white mb-1">
                            Coliformes Totais *
                          </label>
                          <select
                            value={labForm.coliformes_totais || 'AUSENTE'}
                            onChange={(e) => setLabForm({ ...labForm, coliformes_totais: e.target.value })}
                            className={`w-full border rounded-lg px-3 py-2 text-xs font-black mb-2 outline-none transition cursor-pointer ${
                              isPresente
                                ? 'bg-red-100 dark:bg-red-950/70 border-red-600 text-red-950 dark:text-red-200 ring-2 ring-red-500/40'
                                : 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-600 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/40'
                            }`}
                          >
                            <option value="AUSENTE" className="text-emerald-900 font-black">AUSENTE</option>
                            <option value="PRESENTE" className="text-red-900 font-black">PRESENTE</option>
                          </select>
                          <textarea
                            rows={2}
                            value={labForm.metodologia_coliformes_totais || ''}
                            onChange={(e) => setLabForm({ ...labForm, metodologia_coliformes_totais: e.target.value })}
                            placeholder="Metodologia / Kit"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[10px] text-slate-500 outline-none"
                          />
                        </div>
                      );
                    })()}

                    {/* Escherichia coli */}
                    {(() => {
                      const isPresente = labForm.escherichia_coli === 'PRESENTE';
                      return (
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                          <label className="block text-xs font-black uppercase text-slate-800 dark:text-white mb-1">
                            Coliformes Fecais (E. coli Termoresistente) *
                          </label>
                          <select
                            value={labForm.escherichia_coli || 'AUSENTE'}
                            onChange={(e) => setLabForm({ ...labForm, escherichia_coli: e.target.value })}
                            className={`w-full border rounded-lg px-3 py-2 text-xs font-black mb-2 outline-none transition cursor-pointer ${
                              isPresente
                                ? 'bg-red-100 dark:bg-red-950/70 border-red-600 text-red-950 dark:text-red-200 ring-2 ring-red-500/40'
                                : 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-600 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/40'
                            }`}
                          >
                            <option value="AUSENTE" className="text-emerald-900 font-black">AUSENTE</option>
                            <option value="PRESENTE" className="text-red-900 font-black">PRESENTE</option>
                          </select>
                          <textarea
                            rows={2}
                            value={labForm.metodologia_escherichia_coli || ''}
                            onChange={(e) => setLabForm({ ...labForm, metodologia_escherichia_coli: e.target.value })}
                            placeholder="Metodologia / Kit"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[10px] text-slate-500 outline-none"
                          />
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 4. Conclusão e Assinatura Técnica */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white">
                      4. Conclusão e Responsável Técnico (CRF)
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('servidores')}
                      className="text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Users className="w-3 h-3" /> Gerenciar Laboratorialistas ({laboratorialistas.length}) →
                    </button>
                  </div>

                  {/* Bloco Dividido em 2 Partes (Idêntico ao Laudo Oficial) */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden shadow-xs">
                    <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-300 dark:divide-slate-600 items-stretch">
                      {/* Lado Esquerdo: Conclusão e texto normativo */}
                      <div className="md:col-span-7 p-3.5 flex flex-col justify-center bg-slate-50/50 dark:bg-slate-900/30">
                        <label className="block text-xs font-black uppercase text-slate-800 dark:text-white mb-1">
                          CONCLUSÃO:
                        </label>
                        <textarea
                          rows={2}
                          required
                          value={labForm.conclusao_laudo || ''}
                          onChange={(e) => setLabForm({ ...labForm, conclusao_laudo: e.target.value })}
                          placeholder="Para os parâmetros analisados, com base Portaria GM/MS Nº 888, de 4 maio de 2021."
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      {/* Lado Direito: ÁGUA e Status de Atendimento */}
                      <div className="md:col-span-5 p-3.5 flex flex-col justify-center bg-white dark:bg-slate-800">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                            ÁGUA
                          </label>
                          <span className="text-[9.5px] font-bold text-slate-400">
                            Auto (6 Parâmetros)
                          </span>
                        </div>
                        <select
                          value={labForm.status === 'NÃO CONFORME' || labForm.status === 'NAO_CONFORME' ? 'NÃO CONFORME' : 'CONFORME'}
                          onChange={(e) => {
                            const newStatus = e.target.value as LaboratorioStatus;
                            setLabForm({
                              ...labForm,
                              status: newStatus
                            });
                          }}
                          className={`w-full border rounded-lg px-3 py-2.5 text-xs font-black uppercase text-center outline-none transition cursor-pointer ${
                            labForm.status === 'NÃO CONFORME' || labForm.status === 'NAO_CONFORME'
                              ? 'bg-red-100 dark:bg-red-950/70 border-red-600 text-red-950 dark:text-red-200 ring-2 ring-red-500/40'
                              : 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-600 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/40'
                          }`}
                        >
                          <option value="CONFORME" className="text-emerald-900 font-black">Em acordo</option>
                          <option value="NÃO CONFORME" className="text-red-900 font-black">Em desacordo</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Seleção Rápida de Laboratorialista Cadastrado com Validação por Senha */}
                  {effectiveLaboratorialistas.length > 0 && (
                    <div className="bg-cyan-50/80 dark:bg-cyan-950/40 p-3 rounded-2xl border border-cyan-200 dark:border-cyan-800 space-y-2.5">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <span className="text-[11px] font-black uppercase text-cyan-900 dark:text-cyan-300 flex items-center gap-1.5 shrink-0">
                          <Award className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                          Responsável Técnico Cadastrado:
                        </span>
                        <select
                          value={effectiveLaboratorialistas.some((l) => l.nome_completo === labForm.laboratorialista) ? labForm.laboratorialista : ''}
                          onChange={(e) => {
                            const selectedName = e.target.value;
                            if (!selectedName) {
                              setLabForm({
                                ...labForm,
                                laboratorialista: '',
                                cargo_laboratorialista: '',
                                registro_conselho: '',
                                assinatura_digital_validada: false,
                                assinatura_digital_data: undefined,
                                assinatura_digital_hash: undefined
                              });
                              return;
                            }
                            const chosen = effectiveLaboratorialistas.find((l) => l.nome_completo === selectedName);
                            if (chosen) {
                              // Abre a janela de confirmação de senha do servidor
                              setPendingLaboratorialista(chosen);
                              setAuthPassword('');
                              setAuthError(null);
                              setAuthSuccess(false);
                              setShowPassword(false);
                              setAuthModalOpen(true);
                            }
                          }}
                          className="w-full sm:w-auto flex-1 bg-white dark:bg-slate-900 border border-cyan-300 dark:border-cyan-700 rounded-xl px-3 py-2 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer shadow-xs"
                        >
                          <option value="">-- Selecione seu nome para validar assinatura com senha --</option>
                          {effectiveLaboratorialistas.filter((l) => l.ativo).map((l) => (
                            <option key={l.id} value={l.nome_completo}>
                              {l.nome_completo} — {l.funcao} ({l.registro_conselho}) {l.padrao ? '⭐ [Padrão]' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Status da Assinatura Digital do Responsável */}
                      {labForm.laboratorialista && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-cyan-200/70 dark:border-cyan-800/70">
                          {labForm.assinatura_digital_validada ? (
                            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                              <span className="p-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-300 dark:border-emerald-700 shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </span>
                              <span>
                                <strong className="uppercase font-black">Assinatura Digital Validada</strong> por senha em{' '}
                                <span className="font-mono">{labForm.assinatura_digital_data}</span>
                                {labForm.assinatura_digital_hash && (
                                  <span className="ml-1.5 opacity-80 text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                                    {labForm.assinatura_digital_hash}
                                  </span>
                                )}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                              <span className="p-1 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-300 dark:border-amber-700 shrink-0">
                                <Lock className="w-3.5 h-3.5" />
                              </span>
                              <span>
                                <strong className="uppercase font-black text-amber-900 dark:text-amber-200">Assinatura Pendente:</strong> Digite sua senha para confirmar autenticidade.
                              </span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={handleOpenAuthForCurrentLab}
                            className={`text-[11px] font-black uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                              labForm.assinatura_digital_validada
                                ? 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                            }`}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            {labForm.assinatura_digital_validada ? 'Reautenticar Senha' : 'Validar com Senha'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                        Data do Laudo *
                      </label>
                      <input
                        type="date"
                        required
                        value={labForm.data_resultado || new Date().toISOString().split('T')[0]}
                        onChange={(e) => setLabForm({ ...labForm, data_resultado: e.target.value })}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                        Nome do Bioquímico *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: ADRIANO GUARDINI"
                        value={labForm.laboratorialista || ''}
                        onChange={(e) => setLabForm({ ...labForm, laboratorialista: e.target.value })}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-2.5 py-1.5 text-xs font-bold uppercase outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                        Cargo / Função *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: FARMACÊUTICO E BIOQUIMICO"
                        value={labForm.cargo_laboratorialista || ''}
                        onChange={(e) => setLabForm({ ...labForm, cargo_laboratorialista: e.target.value })}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-2.5 py-1.5 text-xs font-bold uppercase outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                        Registro Conselho (Ex: CRF/SC- 3321) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: CRF/SC- 3321"
                        value={labForm.registro_conselho || ''}
                        onChange={(e) => setLabForm({ ...labForm, registro_conselho: e.target.value })}
                        className="w-full bg-white dark:bg-slate-800 border border-cyan-400 dark:border-cyan-600 rounded-xl px-2.5 py-1.5 text-xs font-mono font-black uppercase outline-none text-cyan-800 dark:text-cyan-200"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500">
                    O laudo oficial segue a formatação exata da Vigilância Sanitária de Balneário Camboriú.
                  </span>
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs px-6 py-3 rounded-xl uppercase shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                    title="Conferir assinatura e salvar o laudo oficial"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Salvar Laudo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 4. RELATÓRIOS (LISTAGEM GERAL E BOTÃO PARA LAUDO OFICIAL)      */}
        {/* ============================================================== */}
        {activeTab === 'relatorios' && (
          <div className="space-y-6 text-left">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por protocolo, amostra, interessado, local, bairro ou fiscal..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                >
                  <option value="ALL">Todos os Status</option>
                  <option value="CONFORME">Conforme</option>
                  <option value="NÃO CONFORME">Não Conforme</option>
                  <option value="COLETA REALIZADA">Coleta Realizada</option>
                  <option value="EM ANÁLISE">Em Análise</option>
                </select>

                <select
                  value={selectedBairro}
                  onChange={(e) => setSelectedBairro(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                >
                  <option value="ALL">Todos os Bairros</option>
                  {BAIRROS_BC.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-black px-4 py-2 rounded-xl uppercase flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir Lista
                </button>
              </div>
            </div>

            {/* Tabela de Relatórios */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-black uppercase border-b border-slate-200 dark:border-slate-700">
                      <th className="py-3 px-3">Nº Amostra</th>
                      <th className="py-3 px-3">Protocolo</th>
                      <th className="py-3 px-3">Data / Hora</th>
                      <th className="py-3 px-3">Interessado / Estabelecimento</th>
                      <th className="py-3 px-3">Local de Coleta / Bairro</th>
                      <th className="py-3 px-3">Coletado por</th>
                      <th className="py-3 px-3 text-center">pH / Cloro / Flúor</th>
                      <th className="py-3 px-3 text-center">Coliformes / E. coli</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Laudo Oficial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {amostrasFiltradas.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                        <td className="py-3 px-3 font-mono font-black text-cyan-600 dark:text-cyan-400">
                          {a.codigo_amostra}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {a.protocolo || '--'}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          <div className="font-bold">{a.data_coleta}</div>
                          <div className="text-[10px] text-slate-400">{a.hora_coleta || '--:--'}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-black text-slate-900 dark:text-white truncate max-w-[180px]">
                            {a.interessado || a.estabelecimento || '--'}
                          </div>
                          {a.cnpj_cpf && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              CNPJ: {a.cnpj_cpf}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-slate-800 dark:text-slate-200 font-bold truncate max-w-[160px]">
                            {a.local_coleta}
                          </div>
                          <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            {a.bairro}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                          {a.fiscal_coletor}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-[11px]">
                          <div>pH: <strong className="text-emerald-600">{a.ph || '--'}</strong></div>
                          <div>Cl: <strong className="text-blue-600">{a.cloro || '--'}</strong></div>
                          <div>Fl: <strong>{a.fluoreto || '--'}</strong></div>
                        </td>
                        <td className="py-3 px-3 text-center text-[10px] font-bold">
                          <div className={a.coliformes_totais === 'AUSENTE' || a.coliformes_totais === 'AUSÊNCIA' ? 'text-emerald-600' : 'text-red-500'}>
                            Tot: {a.coliformes_totais || '--'}
                          </div>
                          <div className={a.escherichia_coli === 'AUSENTE' || a.escherichia_coli === 'AUSÊNCIA' ? 'text-emerald-600' : 'text-red-500'}>
                            E.c: {a.escherichia_coli || '--'}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase inline-block ${
                            a.status === 'CONFORME'
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : a.status === 'NÃO CONFORME'
                              ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Botão para Abrir Laudo Oficial */}
                            <button
                              onClick={() => setSelectedAmostraForLaudo(a)}
                              title="Visualizar Laudo Oficial"
                              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-lg transition text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Ver Laudo
                            </button>

                            <button
                              onClick={() => {
                                setDeleteType('amostra');
                                setDeleteConfirmId(a.id);
                              }}
                              title="Excluir Amostra"
                              className="p-1.5 bg-red-50 dark:bg-red-950/40 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 5. SERVIDORES (CONTROLE DE COLETORES E LABORATORIALISTAS/CRF)   */}
        {/* ============================================================== */}
        {activeTab === 'servidores' && (
          <ServidoresLaboratorioSection
            coletores={effectiveColetores}
            laboratorialistas={effectiveLaboratorialistas}
            amostras={amostras}
            users={users}
            currentUser={currentUser}
            onSaveColetor={onSaveColetor || (() => {})}
            onDeleteColetor={onDeleteColetor || (() => {})}
            onSaveLaboratorialista={onSaveLaboratorialista || (() => {})}
            onDeleteLaboratorialista={onDeleteLaboratorialista || (() => {})}
          />
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL / DOCUMENTO: LAUDO OFICIAL DE ANÁLISE DE ÁGUA (BALNEÁRIO CAMBORIÚ)  */}
      {/* ========================================================================= */}
      {selectedAmostraForLaudo && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
          <div
            id="printable-laudo"
            className="bg-white text-black max-w-3xl w-full p-5 sm:p-8 pr-9 sm:pr-12 my-auto rounded-xl shadow-2xl relative font-sans text-left border border-slate-300 print:m-0 print:py-2 print:pl-2 print:pr-7 print:border-none print:shadow-none print:w-full print:max-w-full"
          >
            {/* Fechar modal */}
            <button
              onClick={() => setSelectedAmostraForLaudo(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 print:hidden cursor-pointer z-30"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Cabeçalho Oficial do Laudo */}
            <div className="flex items-stretch justify-between pb-2 border-b-2 border-black mb-2">
              <div className="flex items-center gap-3">
                <img
                  src="https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/brasao__1_-removebg-preview%20(1).avif"
                  alt="Brasão Oficial - Balneário Camboriú"
                  className="h-20 max-h-[84px] w-auto object-contain self-center shrink-0"
                  onError={(e) => {
                    // Fallback para o brasão da wikimedia caso necessário
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('wikimedia')) {
                      target.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Bras%C3%A3o_de_Balne%C3%A1rio_Cambori%C3%BA.svg/200px-Bras%C3%A3o_de_Balne%C3%A1rio_Cambori%C3%BA.svg.png';
                    }
                  }}
                />
                <div className="flex flex-col justify-between py-0.5 space-y-0.5">
                  <div className="text-[10.5px] font-bold uppercase text-slate-700 tracking-wider leading-none">
                    ESTADO DE SANTA CATARINA
                  </div>
                  <div className="text-[10.5px] font-bold uppercase text-slate-700 tracking-wider leading-none">
                    MUNICÍPIO DE BALNEÁRIO CAMBORIÚ
                  </div>
                  <div className="text-[10.5px] font-bold uppercase text-slate-700 leading-none">
                    SECRETARIA DE SAÚDE
                  </div>
                  <div className="text-[13px] font-black uppercase text-blue-900 tracking-tight leading-none pt-0.5">
                    DIVISÃO DE VIGILÂNCIA SANITÁRIA
                  </div>
                </div>
              </div>
            </div>

            {/* Título Principal */}
            <div className="text-center font-black text-[11px] uppercase py-0.5 bg-slate-100 border border-black mb-1.5 tracking-wide">
              LAUDO DE ANÁLISE DE ÁGUA PARA CONSUMO HUMANO
            </div>

            {/* Tabela 1: Identificação da Coleta */}
            <div className="border border-black text-[10px] divide-y divide-black mb-1.5 leading-tight">
              <div className="grid grid-cols-12 divide-x divide-black bg-slate-50 font-bold p-0.5">
                <div className="col-span-5 px-1">
                  PROTOCOLO: <span className="font-mono">{selectedAmostraForLaudo.protocolo || '60.455/2026'}</span>
                </div>
                <div className="col-span-4 px-1">
                  Número da Amostra: <span className="font-mono">{selectedAmostraForLaudo.codigo_amostra || '169'}</span>
                </div>
                <div className="col-span-3 px-1 text-right uppercase">
                  {selectedAmostraForLaudo.mes_ano_referencia || 'JULHO /2026'}
                </div>
              </div>

              <div className="p-0.5 px-1">
                <span className="font-bold">Responsável pela distribuição:</span> {selectedAmostraForLaudo.responsavel_distribuicao || 'EMASA'}
              </div>

              <div className="p-0.5 px-1">
                <span className="font-bold">Interessado:</span> <span className="font-black uppercase">{selectedAmostraForLaudo.interessado || selectedAmostraForLaudo.estabelecimento || 'MERCADO BAGÉ LTDA'}</span>
              </div>

              <div className="grid grid-cols-12 divide-x divide-black p-0.5">
                <div className="col-span-6 px-1">
                  <span className="font-bold">CNPJ:</span> <span className="font-mono">{selectedAmostraForLaudo.cnpj_cpf || '63.457.239/0001-05'}</span>
                </div>
                <div className="col-span-6 px-1">
                  <span className="font-bold">Número Alvará:</span> {selectedAmostraForLaudo.numero_alvara || 'Solicitado'}
                </div>
              </div>

              <div className="p-0.5 px-1">
                <span className="font-bold">Endereço:</span> {selectedAmostraForLaudo.endereco || 'Rua 1500, 381 - CENTRO - Balneário Camboriú/SC - 88.330-528'}
              </div>

              <div className="grid grid-cols-12 divide-x divide-black p-0.5">
                <div className="col-span-8 px-1">
                  <span className="font-bold">Local de Coleta:</span> <span className="font-black uppercase">{selectedAmostraForLaudo.local_coleta || 'TORNEIRA CAFETERIA'}</span>
                </div>
                <div className="col-span-4 px-1">
                  <span className="font-bold">Data:</span> {selectedAmostraForLaudo.data_coleta}
                </div>
              </div>

              <div className="grid grid-cols-12 divide-x divide-black p-0.5">
                <div className="col-span-8 px-1">
                  <span className="font-bold">Coletado por:</span> {selectedAmostraForLaudo.fiscal_coletor || 'Rita Sahd'}
                </div>
                <div className="col-span-4 px-1">
                  <span className="font-bold">Hora da Coleta:</span> {selectedAmostraForLaudo.hora_coleta || '08:20'}
                </div>
              </div>

              <div className="p-0.5 px-1">
                <span className="font-bold">Observações:</span>
                <div className="uppercase text-[9px] mt-0.5 font-medium">
                  {selectedAmostraForLaudo.observacoes || 'ANÁLISE SOLICITADA PARA VERIFICAR QUALIDADE DA ÁGUA PARA CONSUMO HUMANO'}
                </div>
              </div>
            </div>

            {/* Tabela 2: Características Organolépticas */}
            <div className="border border-black mb-1.5">
              <div className="bg-slate-100 font-black text-center text-[9.5px] uppercase py-0.5 border-b border-black">
                CARACTERÍSTICAS ORGANOLÉPTICAS
              </div>
              <div className="grid grid-cols-3 divide-x divide-black text-[10px] p-0.5">
                <div className="px-1">
                  <span className="font-bold">Aspecto:</span> {selectedAmostraForLaudo.aspecto || 'Límpido'}
                </div>
                <div className="px-1">
                  <span className="font-bold">Odor:</span> {selectedAmostraForLaudo.odor || 'Inobjetável'}
                </div>
                <div className="px-1">
                  <span className="font-bold">Cor:</span> {selectedAmostraForLaudo.cor || 'Incolor'}
                </div>
              </div>
            </div>

            {/* Tabela 3: Análise Físico/Química */}
            <div className="border border-black mb-1.5 text-[9.5px]">
              <div className="bg-slate-100 font-black text-center text-[9.5px] uppercase py-0.5 border-b border-black">
                ANÁLISE FÍSICO/QUÍMICA
              </div>
              <table className="w-full border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-black bg-slate-50 font-black text-[9px] text-center">
                    <th className="border-r border-black p-0.5 w-[20%]">Parâmetro</th>
                    <th className="border-r border-black p-0.5 w-[30%]">Equipamento</th>
                    <th className="border-r border-black p-0.5 w-[14%]">Resultado</th>
                    <th className="p-0.5 w-[36%]">Valores de Referência de acordo com a</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black text-center">
                  <tr>
                    <td className="border-r border-black p-0.5 font-bold text-center">pH</td>
                    <td className="border-r border-black p-0.5 text-left text-[8.5px] leading-tight">
                      {selectedAmostraForLaudo.equipamento_ph || 'pH indicator strips MQuant 0 – 14 Marca MERCK'}
                    </td>
                    {(() => {
                      const st = getPhStatus(selectedAmostraForLaudo.ph);
                      const isNot = st === 'not-conform';
                      const isConf = st === 'conform';
                      const bgClass = isNot
                        ? 'bg-red-100 text-red-900 font-black'
                        : isConf
                        ? 'bg-emerald-100 text-emerald-900 font-black'
                        : 'font-bold text-slate-800';
                      return (
                        <td className={`border-r border-black p-0.5 text-xs ${bgClass}`}>
                          {selectedAmostraForLaudo.ph || '7,0'}
                        </td>
                      );
                    })()}
                    <td className="p-0.5 text-[8px] text-center leading-tight">
                      <div className="font-bold italic">6.0 a 9.5</div>
                      <div>Portaria GM/MS Nº 888, maio de 2021.</div>
                    </td>
                  </tr>

                  <tr>
                    <td className="border-r border-black p-0.5 font-bold text-center">
                      Cloro Residual livre
                    </td>
                    <td className="border-r border-black p-0.5 text-left text-[8.5px] leading-tight">
                      {selectedAmostraForLaudo.equipamento_cloro || 'Chlorine Reagente for 10ml Sample(DLA-CL)'}
                    </td>
                    {(() => {
                      const st = getCloroStatus(selectedAmostraForLaudo.cloro);
                      const isNot = st === 'not-conform';
                      const isConf = st === 'conform';
                      const bgClass = isNot
                        ? 'bg-red-100 text-red-900 font-black'
                        : isConf
                        ? 'bg-emerald-100 text-emerald-900 font-black'
                        : 'font-bold text-slate-800';
                      return (
                        <td className={`border-r border-black p-0.5 text-xs ${bgClass}`}>
                          {selectedAmostraForLaudo.cloro || '1,59'}
                        </td>
                      );
                    })()}
                    <td className="p-0.5 text-[8px] text-center leading-tight">
                      <div className="font-bold italic">0,2 a 2,0 mg/l para águas tratadas com cloro e 0,0 para águas naturais, minerais ou após passagem por filtro</div>
                      <div>Portaria GM/MS Nº 888, maio de 2021.</div>
                    </td>
                  </tr>

                  <tr>
                    <td className="border-r border-black p-0.5 font-bold text-center">Flúor</td>
                    <td className="border-r border-black p-0.5 text-left text-[8.5px] leading-tight">
                      {selectedAmostraForLaudo.equipamento_fluor || 'Colorímetro Digital para Flúor (Modelo DLA-FL)'}
                    </td>
                    {(() => {
                      const st = getFluorStatus(selectedAmostraForLaudo.fluoreto);
                      const isNot = st === 'not-conform';
                      const isConf = st === 'conform';
                      const bgClass = isNot
                        ? 'bg-red-100 text-red-900 font-black'
                        : isConf
                        ? 'bg-emerald-100 text-emerald-900 font-black'
                        : 'font-bold text-slate-800';
                      return (
                        <td className={`border-r border-black p-0.5 text-xs ${bgClass}`}>
                          {selectedAmostraForLaudo.fluoreto || '0,72'}
                        </td>
                      );
                    })()}
                    <td className="p-0.5 text-[8px] text-center leading-tight">
                      <div className="font-bold italic">De 0,7 a 1,0 mg/L</div>
                      <div className="font-bold">Portaria/SC- 421/2016</div>
                    </td>
                  </tr>

                  <tr>
                    <td className="border-r border-black p-0.5 font-bold text-center">Turbidez</td>
                    <td className="border-r border-black p-0.5 text-left text-[8.5px] leading-tight">
                      {selectedAmostraForLaudo.equipamento_turbidez || 'Turbidímetro Digital modelo DLT-WV'}
                    </td>
                    {(() => {
                      const st = getTurbidezStatus(selectedAmostraForLaudo.turbidez);
                      const isNot = st === 'not-conform';
                      const isConf = st === 'conform';
                      const bgClass = isNot
                        ? 'bg-red-100 text-red-900 font-black'
                        : isConf
                        ? 'bg-emerald-100 text-emerald-900 font-black'
                        : 'font-bold text-slate-800';
                      return (
                        <td className={`border-r border-black p-0.5 text-xs ${bgClass}`}>
                          {selectedAmostraForLaudo.turbidez || '0,52'}
                        </td>
                      );
                    })()}
                    <td className="p-0.5 text-[8px] text-center leading-tight">
                      <div className="font-bold italic">Até 5,0 NTu ( unidades de turbidez)</div>
                      <div>Portaria GM/MS Nº 888, maio de 2021.</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Tabela 4: Análise Microbiológica */}
            <div className="border border-black mb-1.5 text-[9.5px]">
              <div className="bg-slate-100 font-black text-center text-[9.5px] uppercase py-0.5 border-b border-black">
                ANÁLISE MICROBIOLÓGICA
              </div>
              <table className="w-full border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-black bg-slate-50 font-black text-[9px]">
                    <th className="border-r border-black p-0.5 text-left w-[58%]">Parâmetro / Metodologia</th>
                    <th className="border-r border-black p-0.5 text-center w-[14%]">Resultado</th>
                    <th className="p-0.5 text-center w-[28%]">Val. Referência</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  <tr>
                    <td className="border-r border-black p-1 text-[8px] text-justify leading-tight">
                      <strong className="block text-[8.5px] text-black">COLIFORMES TOTAIS:</strong>
                      {selectedAmostraForLaudo.metodologia_coliformes_totais || 'Kit Analisis Colilert –DST-P/A em cartela QUANTY-TRAY/2000-MARCA IDEXX+QUANTY TRAY SEALER – Model 2 X +estufa FABBE PRIMAR 36ºC100 ml por 24 horas'}
                    </td>
                    {(() => {
                      const val = (selectedAmostraForLaudo.coliformes_totais || 'AUSENTE').trim().toUpperCase();
                      const isNot = val === 'PRESENTE';
                      const isConf = val === 'AUSENTE' || val === 'AUSÊNCIA';
                      const bgClass = isNot
                        ? 'bg-red-100 text-red-900 font-black'
                        : isConf
                        ? 'bg-emerald-100 text-emerald-900 font-black'
                        : 'font-black text-black';
                      return (
                        <td className={`border-r border-black p-1 text-center text-[11px] align-middle ${bgClass}`}>
                          {selectedAmostraForLaudo.coliformes_totais || 'AUSENTE'}
                        </td>
                      );
                    })()}
                    <td className="p-1 text-center text-[8.5px] italic font-bold align-middle">
                      Ausência em 100 ml
                    </td>
                  </tr>

                  <tr>
                    <td className="border-r border-black p-1 text-[8px] text-justify leading-tight">
                      <strong className="block text-[8.5px] text-black">COLIFORMES FECAIS- (E.coli Termoresistente):</strong>
                      {selectedAmostraForLaudo.metodologia_escherichia_coli || 'KIT ANALISES COLILERT-DST-P/A em cartela QUANTY-TRAY/2000-marca IDEXX+QUANTY TRAY SEALER – Model 2 X + estufa FABBE PRIMAR 36ºC100ml por 24 horas + LONG WAVE Ultravioleta 365 NM – marca CE.'}
                    </td>
                    {(() => {
                      const val = (selectedAmostraForLaudo.escherichia_coli || 'AUSENTE').trim().toUpperCase();
                      const isNot = val === 'PRESENTE';
                      const isConf = val === 'AUSENTE' || val === 'AUSÊNCIA';
                      const bgClass = isNot
                        ? 'bg-red-100 text-red-900 font-black'
                        : isConf
                        ? 'bg-emerald-100 text-emerald-900 font-black'
                        : 'font-black text-black';
                      return (
                        <td className={`border-r border-black p-1 text-center text-[11px] align-middle ${bgClass}`}>
                          {selectedAmostraForLaudo.escherichia_coli || 'AUSENTE'}
                        </td>
                      );
                    })()}
                    <td className="p-1 text-center text-[8.5px] italic font-bold align-middle">
                      Ausência em 100 ml
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Conclusão Oficial */}
            {(() => {
              const isNaoConforme =
                selectedAmostraForLaudo.status === 'NÃO CONFORME' ||
                selectedAmostraForLaudo.status === 'NAO_CONFORME' ||
                selectedAmostraForLaudo.status === 'IMPRÓPRIA' ||
                (selectedAmostraForLaudo.conclusao_laudo &&
                  (selectedAmostraForLaudo.conclusao_laudo.toLowerCase().includes('não atende') ||
                    selectedAmostraForLaudo.conclusao_laudo.toLowerCase().includes('desacordo') ||
                    selectedAmostraForLaudo.conclusao_laudo.toLowerCase().includes('imprópria')));

              return (
                <div className="border border-black text-[9.5px] mb-2 bg-slate-50/60">
                  <div className="grid grid-cols-12 divide-x divide-black items-stretch">
                    {/* Lado Esquerdo: Conclusão e texto normativo */}
                    <div className="col-span-7 sm:col-span-8 p-1.5 flex flex-col justify-center text-left">
                      <div className="font-black uppercase mb-0.5 text-[9.5px] text-black">
                        CONCLUSÃO:
                      </div>
                      <p className="font-bold leading-tight text-[9px] text-slate-900">
                        Para os parâmetros analisados, com base Portaria GM/MS Nº 888, de 4 maio de 2021.
                      </p>
                    </div>

                    {/* Lado Direito: RESULTADO GERAL e Status de Atendimento */}
                    <div
                      className={`col-span-5 sm:col-span-4 p-1.5 flex flex-col justify-between ${
                        isNaoConforme ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      <div className="font-black uppercase text-[9px] text-black text-left self-start">
                        RESULTADO GERAL:
                      </div>
                      <div
                        className={`font-black text-[10px] sm:text-[11px] uppercase text-center w-full py-0.5 leading-tight ${
                          isNaoConforme ? 'text-red-700' : 'text-emerald-700'
                        }`}
                      >
                        {isNaoConforme ? 'Em desacordo' : 'Em acordo'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Data e Assinatura Técnica */}
            <div className="border border-black p-2 text-[10px] mb-2 relative">
              <div className="grid grid-cols-2 gap-3 items-center">
                {/* Lado Esquerdo: Campo Data e Selo 'Assinado Digitalmente por Senha' */}
                <div>
                  <div>
                    <span className="font-bold">Data:</span> {selectedAmostraForLaudo.data_resultado || '04/08/2026'}
                  </div>

                  {selectedAmostraForLaudo.assinatura_digital_validada && (
                    <div className="mt-1 inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-300">
                      <span>✓ Assinado Digitalmente por Senha</span>
                    </div>
                  )}
                </div>

                {/* Lado Direito: Identificação do Responsável Técnico */}
                <div className="text-center">
                  <div className="font-black uppercase text-[10.5px]">{selectedAmostraForLaudo.laboratorialista || 'ADRIANO GUARDINI'}</div>
                  <div className="text-[9px] font-bold uppercase text-slate-700">
                    {selectedAmostraForLaudo.cargo_laboratorialista || 'FARMACÊUTICO E BIOQUIMICO'}
                  </div>
                  <div className="font-mono text-[9px] font-bold">
                    {selectedAmostraForLaudo.registro_conselho || 'CRF/SC- 3321'}
                  </div>
                </div>
              </div>
            </div>

            {/* Faixa Vertical de Autenticação Digital na Lateral Direita do Documento (Única Linha, de baixo para cima) */}
            <div
              className="absolute right-1.5 sm:right-2.5 print:right-1 top-1/2 select-none pointer-events-none font-mono text-[6.5px] sm:text-[7px] text-slate-400 tracking-wider uppercase whitespace-nowrap leading-none opacity-75 print:flex print:text-slate-600 z-20"
              style={{
                writingMode: 'vertical-rl',
                transform: 'translateY(-50%) rotate(180deg)',
                transformOrigin: 'center center'
              }}
            >
              DOCUMENTO ASSINADO DIGITALMENTE POR SENHA • RESP. TÉCNICO: {selectedAmostraForLaudo.laboratorialista || 'ADRIANO GUARDINI'} ({selectedAmostraForLaudo.registro_conselho || 'CRF/SC- 3321'}) • HASH: {selectedAmostraForLaudo.assinatura_digital_hash || 'VISA-CRF-SC-VALID'} • AUTENTICADO EM: {selectedAmostraForLaudo.assinatura_digital_data || selectedAmostraForLaudo.data_resultado || '24/08/2026 às 14:06'} • VIGILÂNCIA SANITÁRIA PMBC
            </div>

            {/* Rodapé Oficial da Vigilância Sanitária */}
            <div className="border-t-2 border-black pt-1.5 text-center text-[8.5px] font-bold text-slate-700 leading-tight space-y-0.5">
              <div>Balneário Camboriú – Capital Catarinense do Turismo – CNPJ: 83.102.285/0001-07</div>
              <div className="uppercase font-black text-slate-900">DIVISÃO DE VIGILÂNCIA SANITÁRIA</div>
              <div>Avenida Palestina, Nº150 - Nações - CEP 88338-010 - (47)3267-7000 - E-mail: devs@bc.sc.gov.br / www.bc.sc.gov.br</div>
            </div>

            {/* Botões de Ação na Tela */}
            <div className="mt-6 flex justify-end gap-3 print:hidden pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-black hover:bg-slate-800 text-white font-black text-xs px-5 py-2.5 rounded-xl uppercase flex items-center gap-1.5 shadow cursor-pointer transition"
                title="Imprimir laudo oficial"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
              <button
                type="button"
                onClick={() => setSelectedAmostraForLaudo(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-xs px-4 py-2.5 rounded-xl uppercase cursor-pointer transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Autenticação / Inserção de Senha para Assinatura do Laudo */}
      {authModalOpen && pendingLaboratorialista && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 transform transition-all animate-in fade-in zoom-in duration-200">
            {/* Header do Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase text-slate-800 dark:text-white tracking-tight">
                    Confirmar Assinatura Técnica
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Validação de identidade por senha de acesso
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAuthModalOpen(false);
                  setPendingLaboratorialista(null);
                  setAuthPassword('');
                  setAuthError(null);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cartão de Identificação do Laboratorialista */}
            <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-black text-base flex items-center justify-center shadow-xs shrink-0">
                {pendingLaboratorialista.nome_completo.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-black text-xs uppercase text-slate-900 dark:text-white truncate">
                  {pendingLaboratorialista.nome_completo}
                </h4>
                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate">
                  {pendingLaboratorialista.funcao}
                </p>
                <span className="inline-block mt-0.5 text-[10px] font-mono font-black uppercase text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-950 px-2 py-0.5 rounded-md border border-cyan-300/50 dark:border-cyan-800/50">
                  {pendingLaboratorialista.registro_conselho}
                </span>
              </div>
            </div>

            {/* Formulário de Senha */}
            <form onSubmit={handleConfirmPasswordSignature} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Senha de Acesso do Servidor *</span>
                  <span className="text-[10px] font-normal text-slate-400 lowercase">
                    (padrão: 123456)
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                    placeholder="Digite sua senha de acesso..."
                    value={authPassword}
                    onChange={(e) => {
                      setAuthPassword(e.target.value);
                      if (authError) setAuthError(null);
                    }}
                    className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Mensagem de Erro */}
              {authError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-bold">{authError}</span>
                </div>
              )}

              {/* Mensagem de Sucesso */}
              {authSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                  <Check className="w-4 h-4 shrink-0" />
                  <span className="font-black">Assinatura digital autenticada com sucesso!</span>
                </div>
              )}

              <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-cyan-50/50 dark:bg-cyan-950/30 p-2.5 rounded-xl border border-cyan-100 dark:border-cyan-900/50 leading-relaxed">
                Ao validar com sua senha, uma assinatura eletrônica com carimbo de data/hora e hash de autenticidade será anexada ao laudo técnico de análise de água.
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalOpen(false);
                    setPendingLaboratorialista(null);
                    setAuthPassword('');
                    setAuthError(null);
                  }}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs py-2.5 rounded-xl uppercase transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={authSuccess}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-emerald-600 text-white font-black text-xs py-2.5 rounded-xl uppercase transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {authSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      Validado!
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Validar & Assinar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL / CAIXA DE MENSAGEM: FEEDBACK DE SALVAR, FINALIZAR E EXIGÊNCIA DE SENHA */}
      {/* ========================================================================= */}
      {feedbackModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden text-left animate-in fade-in zoom-in duration-200">
            {/* Header com cor contextual */}
            <div
              className={`p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between ${
                feedbackModal.type === 'signature_required'
                  ? 'bg-amber-500/10 dark:bg-amber-950/40'
                  : feedbackModal.type === 'draft_saved'
                  ? 'bg-cyan-500/10 dark:bg-cyan-950/40'
                  : feedbackModal.amostra?.status === 'NÃO CONFORME' || feedbackModal.amostra?.status === 'NAO_CONFORME'
                  ? 'bg-red-500/10 dark:bg-red-950/40'
                  : 'bg-emerald-500/10 dark:bg-emerald-950/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl border ${
                    feedbackModal.type === 'signature_required'
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : feedbackModal.type === 'draft_saved'
                      ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
                      : feedbackModal.amostra?.status === 'NÃO CONFORME' || feedbackModal.amostra?.status === 'NAO_CONFORME'
                      ? 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {feedbackModal.type === 'signature_required' ? (
                    <Lock className="w-5 h-5" />
                  ) : feedbackModal.type === 'draft_saved' ? (
                    <Save className="w-5 h-5" />
                  ) : (
                    <ShieldCheck className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-base uppercase text-slate-800 dark:text-white">
                    {feedbackModal.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Vigilância Sanitária • Laboratório Central
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFeedbackModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo Contextual */}
            <div className="p-5 space-y-4 text-xs">
              {/* 1. Cenário: Falta a assinatura do técnico */}
              {feedbackModal.type === 'signature_required' && (
                <div className="space-y-3.5">
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-900 dark:text-amber-200 font-bold leading-relaxed flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Falta a assinatura do técnico. Para salvar o laudo oficial, é necessário realizar a validação por senha do responsável técnico cadastrado.
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Responsável Técnico Designado
                    </div>
                    <div className="font-black text-sm text-slate-800 dark:text-white">
                      {labForm.laboratorialista || 'ADRIANO GUARDINI'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {labForm.cargo_laboratorialista || 'FARMACÊUTICO E BIOQUIMICO'} •{' '}
                      <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        {labForm.registro_conselho || 'CRF/SC- 3321'}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Clique no botão abaixo para digitar sua senha e autenticar a assinatura digital com carimbo de tempo e hash oficial.
                  </p>
                </div>
              )}

              {/* 2. Cenário: Rascunho Salvo */}
              {feedbackModal.type === 'draft_saved' && feedbackModal.amostra && (
                <div className="space-y-3.5">
                  <div className="p-3.5 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 rounded-xl text-cyan-950 dark:text-cyan-200 font-bold leading-relaxed flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                    <span>{feedbackModal.message}</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2.5 text-slate-700 dark:text-slate-300">
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-400">Amostra Nº</div>
                      <div className="font-black text-xs text-slate-900 dark:text-white font-mono">
                        {feedbackModal.amostra.codigo_amostra}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-400">Protocolo</div>
                      <div className="font-black text-xs text-slate-900 dark:text-white font-mono">
                        {feedbackModal.amostra.protocolo}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[10px] font-black uppercase text-slate-400">Local / Bairro</div>
                      <div className="font-bold text-xs text-slate-800 dark:text-white truncate">
                        {feedbackModal.amostra.local_coleta} ({feedbackModal.amostra.bairro})
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[10px] font-black uppercase text-slate-400">Status Atual</div>
                      <div className="font-black text-xs text-amber-600 dark:text-amber-400 uppercase">
                        Em Análise (Rascunho Preservado)
                      </div>
                    </div>
                  </div>

                  {/* Resumo dos 6 parâmetros */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-black uppercase text-slate-400">Parâmetros Registrados:</div>
                    <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold">
                      <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg text-center">
                        <span className="text-[9px] text-slate-400 block">pH</span>
                        {feedbackModal.amostra.ph || '-'}
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg text-center">
                        <span className="text-[9px] text-slate-400 block">Cloro</span>
                        {feedbackModal.amostra.cloro || '-'} mg/L
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg text-center">
                        <span className="text-[9px] text-slate-400 block">Flúor</span>
                        {feedbackModal.amostra.fluoreto || '-'} mg/L
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg text-center">
                        <span className="text-[9px] text-slate-400 block">Turbidez</span>
                        {feedbackModal.amostra.turbidez || '-'} NTU
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg text-center">
                        <span className="text-[9px] text-slate-400 block">Coliformes</span>
                        {feedbackModal.amostra.coliformes_totais || '-'}
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg text-center">
                        <span className="text-[9px] text-slate-400 block">E. coli</span>
                        {feedbackModal.amostra.escherichia_coli || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Cenário: Laudo Finalizado */}
              {feedbackModal.type === 'finalized' && feedbackModal.amostra && (
                <div className="space-y-3.5">
                  {/* Banner de Parecer da Água */}
                  <div
                    className={`p-3.5 rounded-xl border text-center font-black text-sm uppercase flex items-center justify-center gap-2 ${
                      feedbackModal.amostra.status === 'NÃO CONFORME' || feedbackModal.amostra.status === 'NAO_CONFORME'
                        ? 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                        : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {feedbackModal.amostra.status === 'NÃO CONFORME' || feedbackModal.amostra.status === 'NAO_CONFORME' ? (
                      <>
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        ÁGUA EM DESACORDO COM A LEGISLAÇÃO
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        ÁGUA EM ACORDO COM A LEGISLAÇÃO
                      </>
                    )}
                  </div>

                  {/* Detalhes da Amostra */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-400">Amostra Nº</div>
                      <div className="font-black text-xs text-slate-900 dark:text-white font-mono">
                        {feedbackModal.amostra.codigo_amostra}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-400">Protocolo</div>
                      <div className="font-black text-xs text-slate-900 dark:text-white font-mono">
                        {feedbackModal.amostra.protocolo}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[10px] font-black uppercase text-slate-400">Local da Coleta</div>
                      <div className="font-bold text-xs text-slate-800 dark:text-white truncate">
                        {feedbackModal.amostra.local_coleta} ({feedbackModal.amostra.bairro})
                      </div>
                    </div>
                  </div>

                  {/* Certificado de Autenticidade Digital */}
                  <div className="bg-cyan-50/60 dark:bg-cyan-950/30 p-3 rounded-xl border border-cyan-200 dark:border-cyan-800/60 space-y-1">
                    <div className="text-[10px] font-black uppercase text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Assinatura Digital Autenticada
                    </div>
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {feedbackModal.amostra.laboratorialista} •{' '}
                      <span className="font-mono text-cyan-700 dark:text-cyan-300 font-black">
                        {feedbackModal.amostra.registro_conselho}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                      HASH: {feedbackModal.amostra.assinatura_digital_hash || 'OFICIAL-VISA-DIGITAL'}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Validado em: {feedbackModal.amostra.assinatura_digital_data || 'Hoje'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer de Ações */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-end gap-2.5">
              {feedbackModal.type === 'signature_required' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setFeedbackModal(null)}
                    className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFeedbackModal(null);
                      handleOpenAuthForCurrentLab();
                    }}
                    className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black uppercase shadow-md flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    Digitar Senha do Técnico
                  </button>
                </>
              ) : feedbackModal.type === 'draft_saved' ? (
                <button
                  type="button"
                  onClick={() => setFeedbackModal(null)}
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black uppercase shadow-md transition cursor-pointer"
                >
                  Continuar Editando
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setFeedbackModal(null)}
                    className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase transition cursor-pointer"
                  >
                    Concluir
                  </button>
                  {feedbackModal.amostra && (
                    <button
                      type="button"
                      onClick={() => {
                        const am = feedbackModal.amostra;
                        setFeedbackModal(null);
                        if (am) {
                          setSelectedAmostraForLaudo(am);
                        }
                      }}
                      className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black uppercase shadow-md flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      Visualizar / Imprimir Laudo
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-xl text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-black text-base uppercase text-slate-800 dark:text-white mb-1">
              Confirmar Exclusão
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Tem certeza que deseja excluir {deleteType === 'ponto' ? 'este ponto de coleta' : 'este laudo/amostra'}? Esta ação será sincronizada no sistema.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (deleteType === 'ponto' && onDeletePonto) {
                    onDeletePonto(deleteConfirmId);
                  } else if (deleteType === 'amostra') {
                    onDeleteAmostra(deleteConfirmId);
                  }
                  setDeleteConfirmId(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-xs py-2.5 rounded-xl uppercase transition cursor-pointer"
              >
                Sim, Excluir
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs py-2.5 rounded-xl uppercase transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Script SQL do Supabase */}
      {sqlModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden text-left animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-xl border border-cyan-500/20">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base uppercase text-slate-800 dark:text-white">
                    Script SQL para o Supabase
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Execute este script no <b>SQL Editor</b> do seu painel do Supabase para criar as tabelas <code className="text-cyan-600 dark:text-cyan-400 font-bold">laboratorio</code> e <code className="text-cyan-600 dark:text-cyan-400 font-bold">pontos_coleta</code>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSqlModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Passos rápidos */}
            <div className="bg-cyan-50 dark:bg-cyan-950/40 p-4 border-b border-cyan-100 dark:border-cyan-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <p className="font-bold text-cyan-900 dark:text-cyan-200 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                  Acesse <b>supabase.com</b> &gt; Seu Projeto &gt; <b>SQL Editor</b>.
                </p>
                <p className="font-bold text-cyan-900 dark:text-cyan-200 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                  Clique em <b>+ New Query</b>, cole o código abaixo e clique em <b>RUN</b>.
                </p>
              </div>
              <button
                onClick={() => {
                  const sql = `-- 1. Tabela de Amostras e Laudos do Laboratório
CREATE TABLE IF NOT EXISTS public.laboratorio (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    codigo_amostra TEXT UNIQUE NOT NULL,
    protocolo TEXT,
    mes_ano_referencia TEXT,
    responsavel_distribuicao TEXT DEFAULT 'EMASA',
    interessado TEXT,
    cnpj_cpf TEXT,
    numero_alvara TEXT,
    local_coleta TEXT,
    ponto_coleta_id TEXT,
    ponto_coleta_nome TEXT,
    bairro TEXT,
    estabelecimento TEXT,
    endereco TEXT,
    data_coleta DATE,
    hora_coleta TEXT,
    fiscal_coletor TEXT,
    tipo_matriz TEXT DEFAULT 'ÁGUA POTÁVEL',
    temperatura_coleta TEXT,
    observacoes TEXT,
    
    aspecto TEXT DEFAULT 'Límpido',
    odor TEXT DEFAULT 'Inobjetável',
    cor TEXT DEFAULT 'Incolor',
    
    ph TEXT,
    equipamento_ph TEXT,
    cloro TEXT,
    equipamento_cloro TEXT,
    fluoreto TEXT,
    equipamento_fluor TEXT,
    turbidez TEXT,
    equipamento_turbidez TEXT,
    fluoretacao TEXT,
    
    coliformes_totais TEXT DEFAULT 'AUSENTE',
    metodologia_coliformes_totais TEXT,
    escherichia_coli TEXT DEFAULT 'AUSENTE',
    metodologia_escherichia_coli TEXT,
    
    status TEXT DEFAULT 'COLETA REALIZADA',
    laudo_numero TEXT,
    conclusao_laudo TEXT,
    data_resultado DATE,
    laboratorialista TEXT,
    cargo_laboratorialista TEXT,
    registro_conselho TEXT,
    responsavel_analise TEXT,
    
    assinatura_digital_validada BOOLEAN DEFAULT false,
    assinatura_digital_data TEXT,
    assinatura_digital_hash TEXT,
    
    parametros JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Pontos de Coleta
CREATE TABLE IF NOT EXISTS public.pontos_coleta (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    ponto TEXT,
    nome_identificacao TEXT,
    bairro TEXT NOT NULL,
    endereco TEXT NOT NULL,
    local TEXT,
    local_especifico TEXT,
    tipo_matriz_padrao TEXT DEFAULT 'ÁGUA POTÁVEL',
    tipo_estabelecimento TEXT,
    estabelecimento TEXT,
    responsavel_contato TEXT,
    telefone TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    ativo BOOLEAN DEFAULT true,
    frequencia_meses INTEGER DEFAULT 1,
    ultima_coleta_data DATE,
    proxima_coleta_prevista DATE,
    total_coletas_realizadas INTEGER DEFAULT 0,
    observacao TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilita RLS e Permissões
ALTER TABLE public.laboratorio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pontos_coleta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir Acesso Anonimo Laboratorio" ON public.laboratorio;
CREATE POLICY "Permitir Acesso Anonimo Laboratorio" ON public.laboratorio FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir Acesso Anonimo Pontos Coleta" ON public.pontos_coleta;
CREATE POLICY "Permitir Acesso Anonimo Pontos Coleta" ON public.pontos_coleta FOR ALL USING (true) WITH CHECK (true);`;
                  navigator.clipboard.writeText(sql);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 3000);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-black uppercase text-xs transition shadow-sm shrink-0 cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    Copiado com Sucesso!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar Código SQL
                  </>
                )}
              </button>
            </div>

            {/* Visualizador de Código */}
            <div className="p-4 flex-1 overflow-y-auto bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed max-h-[50vh]">
              <pre className="select-all whitespace-pre-wrap">{`-- 1. Cria a Tabela de Amostras e Laudos do Laboratório
CREATE TABLE IF NOT EXISTS public.laboratorio (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    codigo_amostra TEXT UNIQUE NOT NULL,
    protocolo TEXT,
    mes_ano_referencia TEXT,
    responsavel_distribuicao TEXT DEFAULT 'EMASA',
    interessado TEXT,
    cnpj_cpf TEXT,
    numero_alvara TEXT,
    local_coleta TEXT,
    ponto_coleta_id TEXT,
    ponto_coleta_nome TEXT,
    bairro TEXT,
    estabelecimento TEXT,
    endereco TEXT,
    data_coleta DATE,
    hora_coleta TEXT,
    fiscal_coletor TEXT,
    tipo_matriz TEXT DEFAULT 'ÁGUA POTÁVEL',
    temperatura_coleta TEXT,
    observacoes TEXT,
    
    aspecto TEXT DEFAULT 'Límpido',
    odor TEXT DEFAULT 'Inobjetável',
    cor TEXT DEFAULT 'Incolor',
    
    ph TEXT,
    equipamento_ph TEXT,
    cloro TEXT,
    equipamento_cloro TEXT,
    fluoreto TEXT,
    equipamento_fluor TEXT,
    turbidez TEXT,
    equipamento_turbidez TEXT,
    fluoretacao TEXT,
    
    coliformes_totais TEXT DEFAULT 'AUSENTE',
    metodologia_coliformes_totais TEXT,
    escherichia_coli TEXT DEFAULT 'AUSENTE',
    metodologia_escherichia_coli TEXT,
    
    status TEXT DEFAULT 'COLETA REALIZADA',
    laudo_numero TEXT,
    conclusao_laudo TEXT,
    data_resultado DATE,
    laboratorialista TEXT,
    cargo_laboratorialista TEXT,
    registro_conselho TEXT,
    responsavel_analise TEXT,
    
    assinatura_digital_validada BOOLEAN DEFAULT false,
    assinatura_digital_data TEXT,
    assinatura_digital_hash TEXT,
    
    parametros JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Cria a Tabela de Pontos de Coleta
CREATE TABLE IF NOT EXISTS public.pontos_coleta (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    ponto TEXT,
    nome_identificacao TEXT,
    bairro TEXT NOT NULL,
    endereco TEXT NOT NULL,
    local TEXT,
    local_especifico TEXT,
    tipo_matriz_padrao TEXT DEFAULT 'ÁGUA POTÁVEL',
    tipo_estabelecimento TEXT,
    estabelecimento TEXT,
    responsavel_contato TEXT,
    telefone TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    ativo BOOLEAN DEFAULT true,
    frequencia_meses INTEGER DEFAULT 1,
    ultima_coleta_data DATE,
    proxima_coleta_prevista DATE,
    total_coletas_realizadas INTEGER DEFAULT 0,
    observacao TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilita RLS e Permissões
ALTER TABLE public.laboratorio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pontos_coleta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir Acesso Anonimo Laboratorio" ON public.laboratorio;
CREATE POLICY "Permitir Acesso Anonimo Laboratorio" ON public.laboratorio FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir Acesso Anonimo Pontos Coleta" ON public.pontos_coleta;
CREATE POLICY "Permitir Acesso Anonimo Pontos Coleta" ON public.pontos_coleta FOR ALL USING (true) WITH CHECK (true);`}</pre>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setSqlModalOpen(false)}
                className="px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl text-xs font-black uppercase transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
