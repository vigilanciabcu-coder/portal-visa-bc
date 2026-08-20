import React, { useState, useMemo } from 'react';
import {
  ServidorColetaLaboratorio,
  LaboratorialistaResponsavel,
  AmostraLaboratorioItem,
  UserProfile
} from '../types';
import {
  Users,
  UserCheck,
  Award,
  BadgeCheck,
  Briefcase,
  UserPlus,
  Phone,
  Mail,
  Star,
  Search,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  FileSignature,
  FileText,
  AlertTriangle,
  X,
  Droplet,
  FlaskConical,
  ShieldCheck,
  ArrowRight,
  Info
} from 'lucide-react';

interface ServidoresLaboratorioSectionProps {
  coletores: ServidorColetaLaboratorio[];
  laboratorialistas: LaboratorialistaResponsavel[];
  amostras: AmostraLaboratorioItem[];
  users: UserProfile[];
  currentUser: UserProfile | null;
  onSaveColetor: (coletor: ServidorColetaLaboratorio) => void;
  onDeleteColetor: (id: string) => void;
  onSaveLaboratorialista: (lab: LaboratorialistaResponsavel) => void;
  onDeleteLaboratorialista: (id: string) => void;
}

export const ServidoresLaboratorioSection: React.FC<ServidoresLaboratorioSectionProps> = ({
  coletores,
  laboratorialistas,
  amostras,
  users,
  currentUser,
  onSaveColetor,
  onDeleteColetor,
  onSaveLaboratorialista,
  onDeleteLaboratorialista
}) => {
  const [subTab, setSubTab] = useState<'todos' | 'laboratorialistas' | 'coletores'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ATIVOS' | 'INATIVOS'>('ALL');

  // Estados de Formulário - Laboratorialista
  const [isFormLabOpen, setIsFormLabOpen] = useState(false);
  const [editingLabId, setEditingLabId] = useState<string | null>(null);
  const [labForm, setLabForm] = useState<Partial<LaboratorialistaResponsavel>>({
    nome_completo: '',
    funcao: 'FARMACÊUTICO E BIOQUIMICO',
    conselho_regional: 'CRF',
    registro_conselho: 'CRF/SC- 3321',
    email: '',
    telefone: '',
    ativo: true,
    padrao: false,
    observacao: ''
  });

  // Estados de Formulário - Coletor
  const [isFormColetorOpen, setIsFormColetorOpen] = useState(false);
  const [editingColetorId, setEditingColetorId] = useState<string | null>(null);
  const [coletorForm, setColetorForm] = useState<Partial<ServidorColetaLaboratorio>>({
    nome_completo: '',
    cargo: 'FISCAL DE VIGILÂNCIA SANITÁRIA',
    matricula: '',
    email: '',
    telefone: '',
    ativo: true,
    observacao: ''
  });

  // Modal de Importação de Servidores da VISA
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Modal de Exclusão
  const [deleteModalData, setDeleteModalData] = useState<{
    id: string;
    nome: string;
    tipo: 'laboratorialista' | 'coletor';
  } | null>(null);

  // Estatísticas de Laudos por Laboratorialista
  const laudosCountPorLab = useMemo(() => {
    const counts: Record<string, number> = {};
    amostras.forEach((a) => {
      if (a.laboratorialista) {
        const key = a.laboratorialista.trim().toUpperCase();
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [amostras]);

  // Estatísticas de Coletas por Fiscal
  const coletasCountPorFiscal = useMemo(() => {
    const counts: Record<string, number> = {};
    amostras.forEach((a) => {
      if (a.fiscal_coletor) {
        const key = a.fiscal_coletor.trim().toUpperCase();
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [amostras]);

  // Filtragem
  const laboratorialistasFiltrados = useMemo(() => {
    return laboratorialistas.filter((l) => {
      const matchSearch =
        l.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.funcao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.registro_conselho.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.email && l.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.observacao && l.observacao.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus =
        statusFilter === 'ALL' ? true : statusFilter === 'ATIVOS' ? l.ativo : !l.ativo;

      return matchSearch && matchStatus;
    });
  }, [laboratorialistas, searchTerm, statusFilter]);

  const coletoresFiltrados = useMemo(() => {
    return coletores.filter((c) => {
      const matchSearch =
        c.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.matricula && c.matricula.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.observacao && c.observacao.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus =
        statusFilter === 'ALL' ? true : statusFilter === 'ATIVOS' ? c.ativo : !c.ativo;

      return matchSearch && matchStatus;
    });
  }, [coletores, searchTerm, statusFilter]);

  // Servidores da VISA ainda não vinculados
  const servidoresVisaDisponiveis = useMemo(() => {
    const existingNames = new Set(coletores.map((c) => c.nome_completo.trim().toUpperCase()));
    return users.filter((u) => !existingNames.has(u.nome_completo.trim().toUpperCase()));
  }, [users, coletores]);

  // Handlers Laboratorialista
  const handleOpenAddLab = () => {
    setEditingLabId(null);
    setLabForm({
      nome_completo: '',
      funcao: 'FARMACÊUTICO E BIOQUIMICO',
      conselho_regional: 'CRF',
      registro_conselho: 'CRF/SC- 3321',
      email: '',
      telefone: '',
      ativo: true,
      padrao: laboratorialistas.length === 0,
      observacao: ''
    });
    setIsFormLabOpen(true);
  };

  const handleOpenEditLab = (lab: LaboratorialistaResponsavel) => {
    setEditingLabId(lab.id);
    setLabForm({ ...lab });
    setIsFormLabOpen(true);
  };

  const handleSubmitLab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labForm.nome_completo || !labForm.registro_conselho || !labForm.funcao) return;

    const item: LaboratorialistaResponsavel = {
      id: editingLabId || `lab-${Date.now()}`,
      nome_completo: labForm.nome_completo.trim().toUpperCase(),
      funcao: labForm.funcao.trim().toUpperCase(),
      registro_conselho: labForm.registro_conselho.trim().toUpperCase(),
      conselho_regional: labForm.conselho_regional || 'CRF',
      email: labForm.email?.trim() || '',
      telefone: labForm.telefone?.trim() || '',
      ativo: labForm.ativo ?? true,
      padrao: labForm.padrao ?? false,
      observacao: labForm.observacao?.trim() || '',
      created_at: editingLabId ? labForm.created_at : new Date().toISOString()
    };

    onSaveLaboratorialista(item);
    setIsFormLabOpen(false);
    setEditingLabId(null);
  };

  const handleToggleLabStatus = (lab: LaboratorialistaResponsavel) => {
    onSaveLaboratorialista({ ...lab, ativo: !lab.ativo });
  };

  const handleSetLabPadrao = (lab: LaboratorialistaResponsavel) => {
    onSaveLaboratorialista({ ...lab, padrao: true });
  };

  // Handlers Coletor
  const handleOpenAddColetor = () => {
    setEditingColetorId(null);
    setColetorForm({
      nome_completo: '',
      cargo: 'FISCAL DE VIGILÂNCIA SANITÁRIA',
      matricula: '',
      email: '',
      telefone: '',
      ativo: true,
      observacao: ''
    });
    setIsFormColetorOpen(true);
  };

  const handleOpenEditColetor = (coletor: ServidorColetaLaboratorio) => {
    setEditingColetorId(coletor.id);
    setColetorForm({ ...coletor });
    setIsFormColetorOpen(true);
  };

  const handleSubmitColetor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coletorForm.nome_completo || !coletorForm.cargo) return;

    const item: ServidorColetaLaboratorio = {
      id: editingColetorId || `coletor-${Date.now()}`,
      nome_completo: coletorForm.nome_completo.trim(),
      cargo: coletorForm.cargo.trim().toUpperCase(),
      matricula: coletorForm.matricula?.trim().toUpperCase() || '',
      email: coletorForm.email?.trim() || '',
      telefone: coletorForm.telefone?.trim() || '',
      ativo: coletorForm.ativo ?? true,
      observacao: coletorForm.observacao?.trim() || '',
      created_at: editingColetorId ? coletorForm.created_at : new Date().toISOString()
    };

    onSaveColetor(item);
    setIsFormColetorOpen(false);
    setEditingColetorId(null);
  };

  const handleToggleColetorStatus = (coletor: ServidorColetaLaboratorio) => {
    onSaveColetor({ ...coletor, ativo: !coletor.ativo });
  };

  const handleImportUser = (user: UserProfile) => {
    const newColetor: ServidorColetaLaboratorio = {
      id: `coletor-${user.id}-${Date.now()}`,
      nome_completo: user.nome_completo,
      cargo: user.cargo || 'FISCAL DE VIGILÂNCIA SANITÁRIA',
      matricula: user.matricula || '',
      email: user.email || '',
      telefone: user.telefone || '',
      ativo: true,
      observacao: `Servidor vinculado automaticamente da equipe (${user.setor || 'VISA'}).`
    };
    onSaveColetor(newColetor);
  };

  // Exclusão confirmada
  const handleConfirmDelete = () => {
    if (!deleteModalData) return;
    if (deleteModalData.tipo === 'laboratorialista') {
      onDeleteLaboratorialista(deleteModalData.id);
    } else {
      onDeleteColetor(deleteModalData.id);
    }
    setDeleteModalData(null);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Informativo e Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-cyan-900 to-slate-900 text-white p-5 rounded-2xl border border-cyan-700/50 shadow-md relative overflow-hidden">
          <div className="absolute top-3 right-3 text-cyan-400/20">
            <FlaskConical className="w-16 h-16" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider text-cyan-300">
            Laboratorialistas (CRF)
          </span>
          <div className="text-3xl font-black mt-1 text-white">
            {laboratorialistas.length}
          </div>
          <p className="text-[11px] text-cyan-200/80 mt-1">
            {laboratorialistas.filter((l) => l.ativo).length} ativos para emissão de laudos
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white p-5 rounded-2xl border border-blue-700/50 shadow-md relative overflow-hidden">
          <div className="absolute top-3 right-3 text-blue-400/20">
            <Droplet className="w-16 h-16" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider text-blue-300">
            Fiscais & Coletores
          </span>
          <div className="text-3xl font-black mt-1 text-white">
            {coletores.length}
          </div>
          <p className="text-[11px] text-blue-200/80 mt-1">
            {coletores.filter((c) => c.ativo).length} ativos nas coletas de água
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Laudos Oficiais Emitidos
          </span>
          <div className="text-3xl font-black mt-1 text-slate-800 dark:text-white">
            {amostras.filter((a) => a.laudo_numero || a.status === 'CONFORME' || a.status === 'NÃO CONFORME').length}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
            Assinados pelos responsáveis técnicos
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Coletas de Campo
          </span>
          <div className="text-3xl font-black mt-1 text-slate-800 dark:text-white">
            {amostras.length}
          </div>
          <p className="text-[11px] text-cyan-600 dark:text-cyan-400 font-bold mt-1">
            Registradas na Vigilância Sanitária
          </p>
        </div>
      </div>

      {/* Barra de Filtros, Sub-abas e Ações */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Sub-abas de Visualização */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold shrink-0">
          <button
            onClick={() => setSubTab('todos')}
            className={`px-3 py-1.5 rounded-lg transition uppercase flex items-center gap-1.5 ${
              subTab === 'todos'
                ? 'bg-cyan-600 text-white shadow font-black'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Todos ({laboratorialistas.length + coletores.length})
          </button>

          <button
            onClick={() => setSubTab('laboratorialistas')}
            className={`px-3 py-1.5 rounded-lg transition uppercase flex items-center gap-1.5 ${
              subTab === 'laboratorialistas'
                ? 'bg-cyan-600 text-white shadow font-black'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Laboratorialistas ({laboratorialistas.length})
          </button>

          <button
            onClick={() => setSubTab('coletores')}
            className={`px-3 py-1.5 rounded-lg transition uppercase flex items-center gap-1.5 ${
              subTab === 'coletores'
                ? 'bg-cyan-600 text-white shadow font-black'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Droplet className="w-3.5 h-3.5" />
            Fiscais Coletores ({coletores.length})
          </button>
        </div>

        {/* Busca e Status */}
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, função, cargo, matrícula ou CRF (ex: CRF/SC- 3321)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none w-full sm:w-auto"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ATIVOS">Apenas Ativos</option>
            <option value="INATIVOS">Apenas Inativos</option>
          </select>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={handleOpenAddLab}
            className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black px-3.5 py-2 rounded-xl uppercase flex items-center gap-1.5 shadow transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            + Laboratorialista (CRF)
          </button>

          <button
            onClick={handleOpenAddColetor}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-3.5 py-2 rounded-xl uppercase flex items-center gap-1.5 shadow transition cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            + Fiscal Coletor
          </button>

          {servidoresVisaDisponiveis.length > 0 && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-black px-3 py-2 rounded-xl uppercase flex items-center gap-1.5 transition cursor-pointer"
              title="Vincular servidor já cadastrado no sistema da VISA para realizar coletas"
            >
              <Users className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              Vincular da VISA ({servidoresVisaDisponiveis.length})
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* SEÇÃO 1: LABORATORIALISTAS (RESPONSÁVEIS TÉCNICOS & CRF)       */}
      {/* ============================================================== */}
      {(subTab === 'todos' || subTab === 'laboratorialistas') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 rounded-lg">
                <FlaskConical className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase text-slate-800 dark:text-white">
                  Laboratorialistas & Responsáveis Técnicos
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Profissionais habilitados para assinar os laudos oficiais de água com Nome, Função e Registro no Conselho (ex: CRF/SC- 3321).
                </p>
              </div>
            </div>

            <span className="text-xs font-black uppercase text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-200 dark:border-cyan-800">
              {laboratorialistasFiltrados.length} Cadastrado(s)
            </span>
          </div>

          {laboratorialistasFiltrados.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-slate-200 dark:border-slate-700 text-slate-500">
              <FlaskConical className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
              <p className="text-xs font-bold uppercase">Nenhum laboratorialista encontrado com os filtros atuais.</p>
              <button
                onClick={handleOpenAddLab}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-black uppercase text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Cadastrar novo laboratorialista
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {laboratorialistasFiltrados.map((lab) => {
                const laudosEmitidos = laudosCountPorLab[lab.nome_completo.trim().toUpperCase()] || 0;
                return (
                  <div
                    key={lab.id}
                    className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border transition-all shadow-sm flex flex-col justify-between relative overflow-hidden ${
                      lab.padrao
                        ? 'border-cyan-500/80 ring-2 ring-cyan-500/20 dark:border-cyan-500'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {/* Selo Padrão */}
                    {lab.padrao && (
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-cyan-600 to-blue-600 text-white text-[9px] font-black uppercase px-3 py-0.5 rounded-bl-xl shadow flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-current" /> Padrão nos Laudos
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* Topo do Cartão: Avatar e Dados Básicos */}
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md">
                          {lab.nome_completo.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </div>

                        <div className="flex-1 min-w-0 pr-12">
                          <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase truncate">
                            {lab.nome_completo}
                          </h4>
                          <div className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 uppercase leading-tight">
                            {lab.funcao}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                lab.ativo
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-slate-100 dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {lab.ativo ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                              {lab.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Registro no Conselho (CRF) em Destaque */}
                      <div className="bg-slate-50 dark:bg-slate-900/80 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 space-y-1">
                        <div className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 flex items-center justify-between">
                          <span>Registro no Conselho Profissional</span>
                          <Award className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div className="font-mono text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span className="bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200 px-2 py-0.5 rounded text-[11px] font-bold">
                            {lab.registro_conselho}
                          </span>
                        </div>
                      </div>

                      {/* Informações de Contato e Laudos */}
                      <div className="text-[11px] space-y-1 text-slate-600 dark:text-slate-300">
                        {lab.email && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{lab.email}</span>
                          </div>
                        )}
                        {lab.telefone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{lab.telefone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 pt-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          <FileSignature className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>
                            {laudosEmitidos} laudo(s) oficial(is) assinado(s)
                          </span>
                        </div>
                        {lab.observacao && (
                          <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-100 dark:border-slate-800 line-clamp-2">
                            "{lab.observacao}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Botões de Ação do Cartão */}
                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-1">
                        {!lab.padrao && lab.ativo && (
                          <button
                            onClick={() => handleSetLabPadrao(lab)}
                            className="text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/60 px-2 py-1 rounded transition cursor-pointer"
                            title="Definir este analista como padrão sugerido nos novos laudos"
                          >
                            Tornar Padrão
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleLabStatus(lab)}
                          className={`text-[10px] font-black uppercase px-2 py-1 rounded transition cursor-pointer ${
                            lab.ativo
                              ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                              : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          }`}
                        >
                          {lab.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditLab(lab)}
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-cyan-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                          title="Editar Laboratorialista"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteModalData({
                              id: lab.id,
                              nome: lab.nome_completo,
                              tipo: 'laboratorialista'
                            })
                          }
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SEÇÃO 2: FISCAIS & SERVIDORES QUE REALIZAM AS COLETAS          */}
      {/* ============================================================== */}
      {(subTab === 'todos' || subTab === 'coletores') && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 rounded-lg">
                <Droplet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase text-slate-800 dark:text-white">
                  Servidores que Realizam as Coletas (Campo)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Fiscais sanitários e agentes autorizados a realizar a coleta das amostras de água de consumo humano nos pontos da cidade.
                </p>
              </div>
            </div>

            <span className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
              {coletoresFiltrados.length} Servidor(es)
            </span>
          </div>

          {coletoresFiltrados.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-slate-200 dark:border-slate-700 text-slate-500">
              <Droplet className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
              <p className="text-xs font-bold uppercase">Nenhum fiscal coletor encontrado com os filtros atuais.</p>
              <button
                onClick={handleOpenAddColetor}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-black uppercase text-blue-600 dark:text-blue-400 hover:underline"
              >
                <UserPlus className="w-3.5 h-3.5" /> Cadastrar novo fiscal coletor
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coletoresFiltrados.map((coletor) => {
                const totalColetas = coletasCountPorFiscal[coletor.nome_completo.trim().toUpperCase()] || 0;
                return (
                  <div
                    key={coletor.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition shadow-sm flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Cabeçalho do Card */}
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md">
                          {coletor.nome_completo.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase truncate">
                            {coletor.nome_completo}
                          </h4>
                          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase leading-tight truncate">
                            {coletor.cargo}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            {coletor.matricula && (
                              <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                Mat: {coletor.matricula}
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                coletor.ativo
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-slate-100 dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {coletor.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Contagem de Coletas */}
                      <div className="bg-slate-50 dark:bg-slate-900/80 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-500 dark:text-slate-400 uppercase text-[10px]">
                          Coletas Efetuadas
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 font-black text-sm flex items-center gap-1">
                          <Droplet className="w-3.5 h-3.5" /> {totalColetas}
                        </span>
                      </div>

                      {/* Contatos */}
                      <div className="text-[11px] space-y-1 text-slate-600 dark:text-slate-300">
                        {coletor.email && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{coletor.email}</span>
                          </div>
                        )}
                        {coletor.telefone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{coletor.telefone}</span>
                          </div>
                        )}
                        {coletor.observacao && (
                          <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-100 dark:border-slate-800 line-clamp-2">
                            "{coletor.observacao}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-1 text-xs">
                      <button
                        onClick={() => handleToggleColetorStatus(coletor)}
                        className={`text-[10px] font-black uppercase px-2 py-1 rounded transition cursor-pointer ${
                          coletor.ativo
                            ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        }`}
                      >
                        {coletor.ativo ? 'Desativar' : 'Ativar'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditColetor(coletor)}
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                          title="Editar Coletor"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteModalData({
                              id: coletor.id,
                              nome: coletor.nome_completo,
                              tipo: 'coletor'
                            })
                          }
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL / FORMULÁRIO: LABORATORIALISTA & CRF                      */}
      {/* ============================================================== */}
      {isFormLabOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 my-auto text-left">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 rounded-xl">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base uppercase text-slate-900 dark:text-white">
                    {editingLabId ? 'Editar Laboratorialista' : 'Novo Laboratorialista / Resp. Técnico'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Dados do responsável pelas análises e assinatura dos laudos.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormLabOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLab} className="space-y-4">
              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ADRIANO GUARDINI"
                  value={labForm.nome_completo}
                  onChange={(e) => setLabForm({ ...labForm, nome_completo: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm uppercase font-bold focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>

              {/* Função e Conselho */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Função / Cargo Técnico *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: FARMACÊUTICO E BIOQUIMICO"
                    value={labForm.funcao}
                    onChange={(e) => setLabForm({ ...labForm, funcao: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm uppercase font-bold focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Conselho Regional
                  </label>
                  <select
                    value={labForm.conselho_regional || 'CRF'}
                    onChange={(e) => setLabForm({ ...labForm, conselho_regional: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-cyan-500 outline-none"
                  >
                    <option value="CRF">CRF (Farmácia e Bioquímica)</option>
                    <option value="CRBio">CRBio (Biologia)</option>
                    <option value="CRQ">CRQ (Química)</option>
                    <option value="CRMV">CRMV (Medicina Veterinária)</option>
                    <option value="OUTRO">Outro Conselho</option>
                  </select>
                </div>
              </div>

              {/* Registro no Conselho (CRF) com Exemplo Claro */}
              <div className="bg-cyan-50/70 dark:bg-cyan-950/30 p-3.5 rounded-xl border border-cyan-200 dark:border-cyan-800 space-y-1.5">
                <label className="block text-xs font-black uppercase text-cyan-900 dark:text-cyan-300">
                  Registro no Conselho (Exemplo: CRF/SC- 3321) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="CRF/SC- 3321"
                    value={labForm.registro_conselho}
                    onChange={(e) => setLabForm({ ...labForm, registro_conselho: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-cyan-300 dark:border-cyan-700 rounded-xl px-3 py-2 text-sm font-mono font-black focus:ring-2 focus:ring-cyan-500 outline-none uppercase"
                  />
                </div>
                <p className="text-[11px] text-cyan-700 dark:text-cyan-400">
                  Este número constará exatamente na assinatura técnica do laudo impresso.
                </p>
              </div>

              {/* Contatos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                    E-mail Institucional
                  </label>
                  <input
                    type="email"
                    placeholder="Ex: adriano.guardini@bc.sc.gov.br"
                    value={labForm.email}
                    onChange={(e) => setLabForm({ ...labForm, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Telefone / Ramal
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: (47) 3267-7050"
                    value={labForm.telefone}
                    onChange={(e) => setLabForm({ ...labForm, telefone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>
              </div>

              {/* Status e Opção de Padrão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={labForm.ativo}
                    onChange={(e) => setLabForm({ ...labForm, ativo: e.target.checked })}
                    className="w-4 h-4 text-cyan-600 rounded"
                  />
                  <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                    Laboratorialista Ativo
                  </span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={labForm.padrao}
                    onChange={(e) => setLabForm({ ...labForm, padrao: e.target.checked })}
                    className="w-4 h-4 text-cyan-600 rounded"
                  />
                  <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                    Definir como Padrão dos Laudos
                  </span>
                </label>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Observações / Área de Atuação
                </label>
                <input
                  type="text"
                  placeholder="Ex: Responsável Técnico Oficial pelas análises físico-químicas e microbiológicas."
                  value={labForm.observacao}
                  onChange={(e) => setLabForm({ ...labForm, observacao: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>

              {/* Botões */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormLabOpen(false)}
                  className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-black text-xs px-4 py-2.5 rounded-xl uppercase transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs px-6 py-2.5 rounded-xl uppercase shadow-lg shadow-cyan-600/20 transition cursor-pointer"
                >
                  {editingLabId ? 'Salvar Alterações' : 'Cadastrar Laboratorialista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL / FORMULÁRIO: FISCAL COLETOR                             */}
      {/* ============================================================== */}
      {isFormColetorOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 my-auto text-left">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base uppercase text-slate-900 dark:text-white">
                    {editingColetorId ? 'Editar Fiscal Coletor' : 'Novo Fiscal Coletor de Campo'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Servidor responsável pela coleta e transporte das amostras de água.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormColetorOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitColetor} className="space-y-4">
              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Nome Completo do Fiscal *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rita Sahd"
                  value={coletorForm.nome_completo}
                  onChange={(e) => setColetorForm({ ...coletorForm, nome_completo: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Cargo e Matrícula */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Cargo Sanitário *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: FISCAL DE VIGILÂNCIA SANITÁRIA"
                    value={coletorForm.cargo}
                    onChange={(e) => setColetorForm({ ...coletorForm, cargo: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm uppercase font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Matrícula Funcional
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: FIS-1044"
                    value={coletorForm.matricula}
                    onChange={(e) => setColetorForm({ ...coletorForm, matricula: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                  />
                </div>
              </div>

              {/* Contatos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    placeholder="Ex: fiscal@bc.sc.gov.br"
                    value={coletorForm.email}
                    onChange={(e) => setColetorForm({ ...coletorForm, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Telefone de Contato
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: (47) 99123-4567"
                    value={coletorForm.telefone}
                    onChange={(e) => setColetorForm({ ...coletorForm, telefone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={coletorForm.ativo}
                    onChange={(e) => setColetorForm({ ...coletorForm, ativo: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                    Servidor Ativo para Coletas de Campo
                  </span>
                </label>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Observações de Coleta / Rota
                </label>
                <input
                  type="text"
                  placeholder="Ex: Responsável por coletas de água potável na região central e postos salva-vidas."
                  value={coletorForm.observacao}
                  onChange={(e) => setColetorForm({ ...coletorForm, observacao: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Botões */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormColetorOpen(false)}
                  className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-black text-xs px-4 py-2.5 rounded-xl uppercase transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-6 py-2.5 rounded-xl uppercase shadow-lg shadow-blue-600/20 transition cursor-pointer"
                >
                  {editingColetorId ? 'Salvar Alterações' : 'Cadastrar Fiscal Coletor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: VINCULAR SERVIDOR JÁ CADASTRADO NA EQUIPE DA VISA       */}
      {/* ============================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 my-auto text-left">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base uppercase text-slate-900 dark:text-white">
                    Vincular Servidor da Equipe VISA
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Selecione membros da equipe da Vigilância para autorizar a realização de coletas.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {servidoresVisaDisponiveis.map((user) => (
                <div
                  key={user.id}
                  className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 hover:border-cyan-400 transition"
                >
                  <div className="min-w-0">
                    <div className="font-black text-xs uppercase text-slate-900 dark:text-white truncate">
                      {user.nome_completo}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase truncate">
                      {user.cargo} • Mat: {user.matricula || 'N/A'}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      handleImportUser(user);
                    }}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[11px] px-3 py-1.5 rounded-lg uppercase shadow transition shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Vincular
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-black text-xs px-4 py-2 rounded-xl uppercase transition cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO                               */}
      {/* ============================================================== */}
      {deleteModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-xl text-center border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-950 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base uppercase text-slate-800 dark:text-white mb-1">
                Confirmar Exclusão
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tem certeza que deseja remover {deleteModalData.tipo === 'laboratorialista' ? 'o laboratorialista' : 'o fiscal coletor'}{' '}
                <strong className="text-slate-900 dark:text-white uppercase">{deleteModalData.nome}</strong>?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteModalData(null)}
                className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-black text-xs py-2.5 rounded-xl uppercase transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-xs py-2.5 rounded-xl uppercase shadow-lg shadow-red-600/20 transition cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
