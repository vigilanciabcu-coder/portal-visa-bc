import React, { useState, useMemo } from 'react';
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
  Check
} from 'lucide-react';
import {
  BAIRROS_BC,
  INITIAL_COLETORES_LABORATORIO,
  INITIAL_LABORATORIALISTAS
} from '../data/mockData';
import { ServidoresLaboratorioSection } from './ServidoresLaboratorioSection';

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

  // ==========================================
  // ESTADO DO FORMULÁRIO: ABA COLETA
  // ==========================================
  const currentYear = new Date().getFullYear();
  const [coletaForm, setColetaForm] = useState<Partial<AmostraLaboratorioItem>>({
    codigo_amostra: String(amostras.length + 171),
    protocolo: `${Math.floor(60000 + Math.random() * 9000)}/${currentYear}`,
    mes_ano_referencia: `JULHO /${currentYear}`,
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
    conclusao_laudo: 'Para os parâmetros analisados, a amostra está em ACORDO com a Portaria GM/MS Nº 888, de 4 maio de 2021. Água PRÓPRIA para o consumo humano, considerando os parâmetros descritos.',
    data_resultado: new Date().toISOString().split('T')[0],
    laboratorialista: 'ADRIANO GUARDINI',
    cargo_laboratorialista: 'FARMACÊUTICO E BIOQUIMICO',
    registro_conselho: 'CRF/SC- 3321',
    responsavel_analise: 'Laboratório Central Municipal VISA'
  });

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
      created_at: new Date().toISOString()
    };

    onSaveAmostra(newAmostra);

    setColetaForm({
      codigo_amostra: String(amostras.length + 172),
      protocolo: `${Math.floor(60000 + Math.random() * 9000)}/${currentYear}`,
      mes_ano_referencia: `JULHO /${currentYear}`,
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

    alert('Coleta cadastrada com sucesso e enviada ao laboratório!');
  };

  // Handler: Salvar Ponto
  const handleSubmitPonto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pontoForm.ponto || !pontoForm.local || !pontoForm.endereco) {
      alert('Preencha os campos obrigatórios: Ponto, Local, Endereço e Bairro.');
      return;
    }

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
    const lab = laboratorialistas.find((l) => l.nome_completo === currentName) || {
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
        status: 'CONFORME',
        conclusao_laudo: selected.conclusao_laudo || 'Para os parâmetros analisados, a amostra está em ACORDO com a Portaria GM/MS Nº 888, de 4 maio de 2021. Água PRÓPRIA para o consumo humano, considerando os parâmetros descritos.',
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

  // Handler: Salvar Laudo Oficial
  const handleSubmitLaboratorio = (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = selectedPendingColetaId || labForm.id;
    if (!targetId) {
      alert('Selecione uma amostra da lista de coletas pendentes para laudar.');
      return;
    }

    const baseAmostra = amostras.find((a) => a.id === targetId) || ({} as AmostraLaboratorioItem);

    const updatedAmostra: AmostraLaboratorioItem = {
      ...baseAmostra,
      ...labForm,
      id: targetId,
      status: (labForm.status as LaboratorioStatus) || 'CONFORME',
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
    setSelectedPendingColetaId('');
    setSelectedAmostraForLaudo(updatedAmostra);
    alert('Laudo oficial finalizado com sucesso! O modelo pronto para impressão já está aberto.');
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

      {/* Conteúdo Principal */}
      <div className="p-6 flex-1 max-w-7xl w-full mx-auto space-y-6">

        {/* ============================================================== */}
        {/* 1. COLETA (ENTRADA DO COLETOR - BASEADA NO LAUDO OFICIAL)       */}
        {/* ============================================================== */}
        {activeTab === 'coleta' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
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
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Nº da Amostra</span>
                  <span className="bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 text-xs font-mono font-bold px-2.5 py-1 rounded-lg border border-cyan-300 dark:border-cyan-800">
                    {coletaForm.codigo_amostra}
                  </span>
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
                    <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Ponto Cadastrado no Sistema (Opcional)
                    </label>
                    <select
                      value={coletaForm.ponto_coleta_id || ''}
                      onChange={(e) => handlePontoSelection(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                    >
                      <option value="">-- Selecione ponto cadastrado --</option>
                      {pontos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.ponto} ({p.local} - {p.bairro})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Local de Coleta Específico *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: TORNEIRA CAFETERIA"
                      value={coletaForm.local_coleta}
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
                      value={coletaForm.endereco}
                      onChange={(e) => setColetaForm({ ...coletaForm, endereco: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Bairro *
                    </label>
                    <select
                      value={coletaForm.bairro}
                      onChange={(e) => setColetaForm({ ...coletaForm, bairro: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none font-bold"
                    >
                      {BAIRROS_BC.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
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
                        Coletado por (Fiscal Sanitário) *
                      </label>
                      {coletores.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('servidores')}
                          className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                        >
                          Gerenciar Servidores ({coletores.length})
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {coletores.length > 0 && (
                        <select
                          value={coletores.some((c) => c.nome_completo === coletaForm.fiscal_coletor) ? coletaForm.fiscal_coletor : ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              setColetaForm({ ...coletaForm, fiscal_coletor: e.target.value });
                            }
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-cyan-500 outline-none"
                        >
                          <option value="">-- Selecionar Servidor Coletor Cadastrado --</option>
                          {coletores.filter((c) => c.ativo).map((c) => (
                            <option key={c.id} value={c.nome_completo}>
                              {c.nome_completo} ({c.cargo} {c.matricula ? `• Mat: ${c.matricula}` : ''})
                            </option>
                          ))}
                        </select>
                      )}

                      <input
                        type="text"
                        required
                        placeholder="Nome do fiscal coletor..."
                        value={coletaForm.fiscal_coletor || ''}
                        onChange={(e) => setColetaForm({ ...coletaForm, fiscal_coletor: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none font-bold"
                      />
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

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs px-6 py-3 rounded-xl uppercase shadow-lg shadow-cyan-600/20 flex items-center gap-2 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Salvar Coleta e Enviar ao Laboratório
                  </button>
                </div>
              </form>
            </div>

            {/* Painel Lateral: Resumo */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm text-left flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-cyan-500" />
                  Últimas Amostras Cadastradas
                </h3>
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {amostras.slice(0, 5).map((a) => (
                    <div
                      key={a.id}
                      onClick={() => setSelectedAmostraForLaudo(a)}
                      className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-cyan-500 transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-black text-cyan-600 dark:text-cyan-400">
                          Amostra Nº {a.codigo_amostra}
                        </span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                          a.status === 'CONFORME'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        }`}>
                          {a.status}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {a.interessado || a.estabelecimento || a.local_coleta}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {a.local_coleta} • {a.data_coleta} às {a.hora_coleta || '--:--'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
                <button
                  onClick={() => setActiveTab('relatorios')}
                  className="w-full bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black uppercase py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  Ver Todas as Amostras & Laudos <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. PONTOS (GESTÃO DE PONTOS COM BOTÃO DE EXCLUSÃO EM X)        */}
        {/* ============================================================== */}
        {activeTab === 'pontos' && (
          <div className="space-y-6 text-left">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
                <h2 className="text-base font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-cyan-500" />
                  {editingPontoId ? 'Editar Ponto de Coleta' : 'Adicionar Novo Ponto de Coleta'}
                </h2>
                {editingPontoId && (
                  <button
                    onClick={() => {
                      setEditingPontoId(null);
                      setPontoForm({ ponto: '', local: '', endereco: '', bairro: 'Centro', observacao: '', ativo: true });
                    }}
                    className="text-xs text-red-500 hover:underline font-bold"
                  >
                    Cancelar Edição
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmitPonto} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Ponto (Identificador) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ponto 09 - Pontal Norte"
                    value={pontoForm.ponto}
                    onChange={(e) => setPontoForm({ ...pontoForm, ponto: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
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

                <div className="md:col-span-1 flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs py-2.5 rounded-xl uppercase shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    {editingPontoId ? 'Atualizar Ponto' : 'Cadastrar Ponto'}
                  </button>
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
                    Use o botão vermelho <strong className="text-red-500">"X Excluir"</strong> para remover um ponto.
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
                    {pontos.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
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
                              }}
                              title="Editar Ponto"
                              className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 text-slate-700 dark:text-slate-300 hover:text-cyan-600 rounded-lg transition"
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
                    ))}
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
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs font-bold mb-2 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Equipamento"
                        value={labForm.equipamento_ph || 'pH indicator strips MQuant 0 – 14 Marca MERCK'}
                        onChange={(e) => setLabForm({ ...labForm, equipamento_ph: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-500 outline-none"
                      />
                    </div>

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
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs font-bold mb-2 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Equipamento"
                        value={labForm.equipamento_cloro || 'Chlorine Reagente for 10ml Sample(DLA-CL)'}
                        onChange={(e) => setLabForm({ ...labForm, equipamento_cloro: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Flúor e Turbidez */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs font-bold mb-2 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Equipamento"
                        value={labForm.equipamento_fluor || 'Colorímetro Digital para Flúor (Modelo DLA-FL)'}
                        onChange={(e) => setLabForm({ ...labForm, equipamento_fluor: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-500 outline-none"
                      />
                    </div>

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
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs font-bold mb-2 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Equipamento"
                        value={labForm.equipamento_turbidez || 'Turbidímetro Digital modelo DLT-WV'}
                        onChange={(e) => setLabForm({ ...labForm, equipamento_turbidez: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Análise Microbiológica */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white mb-2">
                    3. Análise Microbiológica (Ref: Ausência em 100 ml)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                      <label className="block text-xs font-black uppercase text-slate-800 dark:text-white mb-1">
                        Coliformes Totais *
                      </label>
                      <select
                        value={labForm.coliformes_totais || 'AUSENTE'}
                        onChange={(e) => setLabForm({ ...labForm, coliformes_totais: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs font-black mb-2 outline-none"
                      >
                        <option value="AUSENTE">AUSENTE</option>
                        <option value="PRESENTE">PRESENTE</option>
                      </select>
                      <textarea
                        rows={2}
                        value={labForm.metodologia_coliformes_totais || ''}
                        onChange={(e) => setLabForm({ ...labForm, metodologia_coliformes_totais: e.target.value })}
                        placeholder="Metodologia / Kit"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[10px] text-slate-500 outline-none"
                      />
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                      <label className="block text-xs font-black uppercase text-slate-800 dark:text-white mb-1">
                        Coliformes Fecais (E. coli Termoresistente) *
                      </label>
                      <select
                        value={labForm.escherichia_coli || 'AUSENTE'}
                        onChange={(e) => setLabForm({ ...labForm, escherichia_coli: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs font-black mb-2 outline-none"
                      >
                        <option value="AUSENTE">AUSENTE</option>
                        <option value="PRESENTE">PRESENTE</option>
                      </select>
                      <textarea
                        rows={2}
                        value={labForm.metodologia_escherichia_coli || ''}
                        onChange={(e) => setLabForm({ ...labForm, metodologia_escherichia_coli: e.target.value })}
                        placeholder="Metodologia / Kit"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[10px] text-slate-500 outline-none"
                      />
                    </div>
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

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Conclusão Oficial do Laudo *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={labForm.conclusao_laudo || ''}
                      onChange={(e) => setLabForm({ ...labForm, conclusao_laudo: e.target.value })}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl p-3 text-xs font-bold outline-none"
                    />
                  </div>

                  {/* Seleção Rápida de Laboratorialista Cadastrado com Validação por Senha */}
                  {laboratorialistas.length > 0 && (
                    <div className="bg-cyan-50/80 dark:bg-cyan-950/40 p-3 rounded-2xl border border-cyan-200 dark:border-cyan-800 space-y-2.5">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <span className="text-[11px] font-black uppercase text-cyan-900 dark:text-cyan-300 flex items-center gap-1.5 shrink-0">
                          <Award className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                          Responsável Técnico Cadastrado:
                        </span>
                        <select
                          value={laboratorialistas.some((l) => l.nome_completo === labForm.laboratorialista) ? labForm.laboratorialista : ''}
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
                            const chosen = laboratorialistas.find((l) => l.nome_completo === selectedName);
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
                          {laboratorialistas.filter((l) => l.ativo).map((l) => (
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

                <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500">
                    O laudo oficial segue a formatação exata da Vigilância Sanitária de Balneário Camboriú.
                  </span>
                  <button
                    type="submit"
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs px-6 py-3 rounded-xl uppercase shadow-lg shadow-cyan-600/20 flex items-center gap-2 transition cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    Finalizar Laudo Oficial & Abrir Impressão
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
            coletores={coletores}
            laboratorialistas={laboratorialistas}
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
            className="bg-white text-black max-w-3xl w-full p-6 sm:p-8 my-auto rounded-xl shadow-2xl relative font-sans text-left border border-slate-300 print:m-0 print:p-0 print:border-none print:shadow-none print:w-full print:max-w-full"
          >
            {/* Fechar modal */}
            <button
              onClick={() => setSelectedAmostraForLaudo(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 print:hidden cursor-pointer"
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
                    <th className="border-r border-black p-0.5 w-[12%]">Resultado</th>
                    <th className="p-0.5 w-[38%]">Valores de Referência de acordo com a</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black text-center">
                  <tr>
                    <td className="border-r border-black p-0.5 font-bold text-center">pH</td>
                    <td className="border-r border-black p-0.5 text-left text-[8.5px] leading-tight">
                      {selectedAmostraForLaudo.equipamento_ph || 'pH indicator strips MQuant 0 – 14 Marca MERCK'}
                    </td>
                    <td className="border-r border-black p-0.5 font-bold text-xs">
                      {selectedAmostraForLaudo.ph || '7,0'}
                    </td>
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
                    <td className="border-r border-black p-0.5 font-bold text-xs">
                      {selectedAmostraForLaudo.cloro || '1,59'}
                    </td>
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
                    <td className="border-r border-black p-0.5 font-bold text-xs">
                      {selectedAmostraForLaudo.fluoreto || '0,72'}
                    </td>
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
                    <td className="border-r border-black p-0.5 font-bold text-xs">
                      {selectedAmostraForLaudo.turbidez || '0,52'}
                    </td>
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
                    <td className="border-r border-black p-1 text-center font-black text-[11px] text-black align-middle">
                      {selectedAmostraForLaudo.coliformes_totais || 'AUSENTE'}
                    </td>
                    <td className="p-1 text-center text-[8.5px] italic font-bold align-middle">
                      Ausência em 100 ml
                    </td>
                  </tr>

                  <tr>
                    <td className="border-r border-black p-1 text-[8px] text-justify leading-tight">
                      <strong className="block text-[8.5px] text-black">COLIFORMES FECAIS- (E.coli Termoresistente):</strong>
                      {selectedAmostraForLaudo.metodologia_escherichia_coli || 'KIT ANALISES COLILERT-DST-P/A em cartela QUANTY-TRAY/2000-marca IDEXX+QUANTY TRAY SEALER – Model 2 X + estufa FABBE PRIMAR 36ºC100ml por 24 horas + LONG WAVE Ultravioleta 365 NM – marca CE.'}
                    </td>
                    <td className="border-r border-black p-1 text-center font-black text-[11px] text-black align-middle">
                      {selectedAmostraForLaudo.escherichia_coli || 'AUSENTE'}
                    </td>
                    <td className="p-1 text-center text-[8.5px] italic font-bold align-middle">
                      Ausência em 100 ml
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Conclusão Oficial */}
            <div className="border border-black p-1.5 text-[9.5px] mb-2">
              <div className="font-black uppercase mb-0.5 text-[9.5px]">CONCLUSÃO:</div>
              <p className="font-bold text-justify leading-tight text-[9px]">
                {selectedAmostraForLaudo.conclusao_laudo || 'Para os parâmetros analisados, a amostra está em ACORDO com a Portaria GM/MS Nº 888, de 4 maio de 2021.'}
              </p>
              <div className="text-center font-black mt-1 text-[10px]">
                Água <span className="underline">PRÓPRIA</span> para o consumo humano, considerando os parâmetros descritos.
              </div>
            </div>

            {/* Data e Assinatura Técnica */}
            <div className="grid grid-cols-2 gap-3 border border-black p-2 text-[10px] items-center mb-2">
              <div>
                <span className="font-bold">Data:</span> {selectedAmostraForLaudo.data_resultado || '04/08/2026'}
                {selectedAmostraForLaudo.assinatura_digital_validada && (
                  <div className="mt-1 text-[8px] text-slate-700 bg-slate-100 p-1 rounded border border-slate-300">
                    <div className="flex items-center gap-1 font-black text-emerald-800">
                      <span>✓ ASSINATURA ELETRÔNICA VALIDADA</span>
                    </div>
                    <div className="font-mono text-[7.5px] mt-0.5">
                      Hash: {selectedAmostraForLaudo.assinatura_digital_hash || 'VISA-CRF-SC-VALID'}
                    </div>
                    <div className="text-[7.5px] text-slate-500">
                      Autenticado em {selectedAmostraForLaudo.assinatura_digital_data || '04/08/2026'}
                    </div>
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="font-black uppercase text-[10.5px]">{selectedAmostraForLaudo.laboratorialista || 'ADRIANO GUARDINI'}</div>
                <div className="text-[9px] font-bold uppercase text-slate-700">
                  {selectedAmostraForLaudo.cargo_laboratorialista || 'FARMACÊUTICO E BIOQUIMICO'}
                </div>
                <div className="font-mono text-[9px] font-bold">
                  {selectedAmostraForLaudo.registro_conselho || 'CRF/SC- 3321'}
                </div>
                {selectedAmostraForLaudo.assinatura_digital_validada && (
                  <div className="inline-block mt-0.5 text-[7.5px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded-full border border-emerald-300">
                    Assinado Digitalmente por Senha
                  </div>
                )}
              </div>
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
                onClick={() => window.print()}
                className="bg-black hover:bg-slate-800 text-white font-black text-xs px-5 py-2.5 rounded-xl uppercase flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir Laudo Oficial (A4)
              </button>
              <button
                onClick={() => setSelectedAmostraForLaudo(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-xs px-4 py-2.5 rounded-xl uppercase cursor-pointer"
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
    </div>
  );
};
