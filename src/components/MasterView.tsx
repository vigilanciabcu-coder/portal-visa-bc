import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, UserRole, UserSetor, UserNivelAcesso, EscalaItem, RecadoMural, FiscalizacaoItem, FeiranteItem } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { ConfirmModal } from './ConfirmModal';
import { AutoLinkText } from './AutoLinkText';
import {
  UserCheck,
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Megaphone,
  Cake,
  Settings,
  Crown,
  BarChart3,
  Download,
  RotateCcw,
  Send,
  Users,
  CheckCircle2,
  AlertTriangle,
  X,
  Link as LinkIcon,
  Search
} from 'lucide-react';

interface MasterViewProps {
  currentUser: UserProfile | null;
  users: UserProfile[];
  onSaveUser: (user: UserProfile) => Promise<boolean | void> | void;
  onDeleteUser: (userId: string) => void;
  escala: EscalaItem[];
  onSaveEscalaItem: (item: EscalaItem) => void;
  onDeleteEscalaItem: (itemId: string) => void;
  mural: RecadoMural[];
  onSaveRecado: (recado: RecadoMural) => void;
  onDeleteRecado: (recadoId: string) => void;
  fiscalizacoes: FiscalizacaoItem[];
  feiras: FeiranteItem[];
  onResetSystemData?: () => void;
}

export const MasterView: React.FC<MasterViewProps> = ({
  currentUser,
  users,
  onSaveUser,
  onDeleteUser,
  escala,
  onSaveEscalaItem,
  onDeleteEscalaItem,
  mural,
  onSaveRecado,
  onDeleteRecado,
  fiscalizacoes,
  feiras,
  onResetSystemData
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'escala' | 'mural' | 'birthdays' | 'system'>('users');

  // Confirmation Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemDescription?: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const triggerConfirm = (opts: {
    title: string;
    message: string;
    itemDescription?: string;
    confirmText?: string;
    onConfirm: () => void;
  }) => {
    setConfirmState({
      isOpen: true,
      title: opts.title,
      message: opts.message,
      itemDescription: opts.itemDescription,
      confirmText: opts.confirmText || 'Sim, Excluir',
      onConfirm: opts.onConfirm
    });
  };

  // --- TAB 1: USERS FORM STATE ---
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
    nome_completo: '',
    email: '',
    data_nascimento: '',
    cargo: 'FISCAL DE VIGILÂNCIA SANITÁRIA' as UserRole,
    setor: 'VIGILÂNCIA SANITÁRIA' as UserSetor,
    conselho_regional: '',
    nivel_acesso: 'VISA (FISCAL)' as UserNivelAcesso,
    matricula: '',
    telefone: '',
    senha: ''
  });

  const [isSavingUser, setIsSavingUser] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleEditUser = (u: UserProfile) => {
    setEditingUserId(u.id);
    setUserForm({
      nome_completo: u.nome_completo,
      email: u.email,
      data_nascimento: u.data_nascimento || '',
      cargo: u.cargo,
      setor: u.setor || 'VIGILÂNCIA SANITÁRIA',
      conselho_regional: u.conselho_regional || '',
      nivel_acesso: u.nivel_acesso || (u.cargo === 'MASTER' || u.cargo === 'MASTER ADM' ? 'MASTER (TUDO)' : 'VISA (FISCAL)'),
      matricula: u.matricula || '',
      telefone: u.telefone || '',
      senha: u.senha || ''
    });
    setSaveStatus(null);
  };

  const handleClearUserForm = () => {
    setEditingUserId(null);
    setUserForm({
      nome_completo: '',
      email: '',
      data_nascimento: '',
      cargo: 'FISCAL DE VIGILÂNCIA SANITÁRIA',
      setor: 'VIGILÂNCIA SANITÁRIA',
      conselho_regional: '',
      nivel_acesso: 'VISA (FISCAL)',
      matricula: '',
      telefone: '',
      senha: ''
    });
  };

  const handleResetUserPassword = async (u: UserProfile) => {
    const updated = { ...u, senha: '123456' };
    await onSaveUser(updated);
    setSaveStatus({
      type: 'success',
      text: `Senha do operador ${u.nome_completo.split(' ')[0]} redefinida com sucesso para 123456 (Sincronizado no Supabase)!`
    });
    setTimeout(() => setSaveStatus(null), 5000);
  };

  const handleSaveUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.nome_completo.trim()) return;

    setIsSavingUser(true);
    setSaveStatus(null);

    const userToSave: UserProfile = {
      id: editingUserId || `u-${Date.now()}`,
      email: userForm.email ? userForm.email.trim().toLowerCase() : `${userForm.nome_completo.toLowerCase().trim().replace(/\s+/g, '.')}@bc.sc.gov.br`,
      nome_completo: userForm.nome_completo.trim().toUpperCase(),
      data_nascimento: userForm.data_nascimento,
      cargo: userForm.cargo,
      setor: userForm.setor,
      conselho_regional: userForm.conselho_regional ? userForm.conselho_regional.trim().toUpperCase() : '',
      nivel_acesso: userForm.nivel_acesso,
      matricula: userForm.matricula ? userForm.matricula.trim() : `FIS-${Math.floor(1000 + Math.random() * 9000)}`,
      telefone: userForm.telefone ? userForm.telefone.trim() : '',
      senha: userForm.senha ? userForm.senha.trim() : '123456'
    };

    try {
      await onSaveUser(userToSave);
      setSaveStatus({
        type: 'success',
        text: editingUserId
          ? `✅ Operador ${userToSave.nome_completo.split(' ')[0]} atualizado e sincronizado no Supabase com sucesso!`
          : `✅ Novo operador ${userToSave.nome_completo.split(' ')[0]} salvo e sincronizado no Supabase com sucesso (Senha Inicial: ${userToSave.senha})!`
      });
      handleClearUserForm();
    } catch (err: any) {
      setSaveStatus({
        type: 'error',
        text: `Erro ao salvar operador: ${err?.message || 'Verifique a conexão com o Supabase'}`
      });
    } finally {
      setIsSavingUser(false);
      setTimeout(() => setSaveStatus(null), 6000);
    }
  };

  // --- TAB 2: ESCALA FORM STATE ---
  const [escalaForm, setEscalaForm] = useState({
    data: new Date().toISOString().split('T')[0],
    tipo: 'PLANTAO' as 'PLANTAO' | 'EVENTO' | 'FERIADO' | 'FACULTATIVO',
    servidores: [] as string[],
    descricao: '',
    link: ''
  });
  const [servidorSearch, setServidorSearch] = useState('');
  const [showServidorDropdown, setShowServidorDropdown] = useState(false);
  const servidorDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (servidorDropdownRef.current && !servidorDropdownRef.current.contains(event.target as Node)) {
        setShowServidorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectServidor = (nome: string) => {
    const norm = nome.trim();
    if (!escalaForm.servidores.some((s) => s.toUpperCase() === norm.toUpperCase())) {
      setEscalaForm({ ...escalaForm, servidores: [...escalaForm.servidores, norm] });
    }
    setServidorSearch('');
    setShowServidorDropdown(false);
  };

  const handleRemoveServidor = (nome: string) => {
    setEscalaForm({
      ...escalaForm,
      servidores: escalaForm.servidores.filter((s) => s.toUpperCase() !== nome.trim().toUpperCase())
    });
  };

  const handleAddEscalaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalaForm.data) return;

    // Combina a descrição e o link separadamente caso haja link
    let finalDescricao = escalaForm.descricao.trim();
    if (escalaForm.link.trim()) {
      const linkFormatado = escalaForm.link.trim().startsWith('http') 
        ? escalaForm.link.trim() 
        : `https://${escalaForm.link.trim()}`;
      finalDescricao = finalDescricao 
        ? `${finalDescricao} - Link: ${linkFormatado}` 
        : linkFormatado;
    }

    const newItem: EscalaItem = {
      id: `esc-${Date.now()}`,
      data: escalaForm.data,
      tipo: escalaForm.tipo,
      servidores: escalaForm.servidores.length > 0 
        ? escalaForm.servidores.map(s => s.toUpperCase()).join(' / ') 
        : 'GERAL / SEM ESCALA INDIVIDUAL',
      descricao: finalDescricao
    };

    onSaveEscalaItem(newItem);
    setEscalaForm({
      data: new Date().toISOString().split('T')[0],
      tipo: 'PLANTAO',
      servidores: [],
      descricao: '',
      link: ''
    });
    setServidorSearch('');
  };

  // --- TAB 3: MURAL FORM STATE ---
  const [editingRecadoId, setEditingRecadoId] = useState<string | null>(null);
  const [muralForm, setMuralForm] = useState({
    titulo: '',
    conteudo: '',
    prioridade: 'NORMAL' as 'NORMAL' | 'URGENTE' | 'ALERTA',
    autor: currentUser ? currentUser.nome_completo : 'DIRETORIA DVIS'
  });

  const handleSaveMuralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!muralForm.titulo.trim() || !muralForm.conteudo.trim()) return;

    const todayStr = new Date().toLocaleDateString('pt-BR');
    const newRecado: RecadoMural = {
      id: editingRecadoId || `rec-${Date.now()}`,
      titulo: muralForm.titulo.toUpperCase(),
      conteudo: muralForm.conteudo,
      prioridade: muralForm.prioridade,
      autor: muralForm.autor || (currentUser ? currentUser.nome_completo : 'DIRETORIA DVIS'),
      cargo: currentUser ? currentUser.cargo : 'DIRETOR',
      data: todayStr
    };

    onSaveRecado(newRecado);
    setEditingRecadoId(null);
    setMuralForm({
      titulo: '',
      conteudo: '',
      prioridade: 'NORMAL',
      autor: currentUser ? currentUser.nome_completo : 'DIRETORIA DVIS'
    });
  };

  const handleEditRecado = (r: RecadoMural) => {
    setEditingRecadoId(r.id);
    setMuralForm({
      titulo: r.titulo,
      conteudo: r.conteudo,
      prioridade: r.prioridade,
      autor: r.autor
    });
  };

  // --- TAB 4: BIRTHDAY PUBLICATOR ---
  const [publishedSuccess, setPublishedSuccess] = useState<string | null>(null);

  const handlePostBirthdayMural = (u: UserProfile) => {
    const firstName = u.nome_completo.split(' ')[0];
    const todayStr = new Date().toLocaleDateString('pt-BR');
    const bdayRecado: RecadoMural = {
      id: `bday-${Date.now()}`,
      titulo: `🎂 FELIZ ANIVERSÁRIO - ${firstName.toUpperCase()}`,
      conteudo: `Desejamos um excelente aniversário e muitas felicidades ao nosso servidor(a) ${u.nome_completo} (${u.cargo})! Homenagem da Diretoria e Equipe DVIS/BC. 🎉🎈`,
      prioridade: 'ALERTA',
      autor: currentUser ? currentUser.nome_completo : 'DIRETORIA DVIS',
      cargo: 'DIRETOR',
      data: todayStr
    };

    onSaveRecado(bdayRecado);
    setPublishedSuccess(`Felicitação para ${firstName} publicada no Mural Oficial!`);
    setTimeout(() => setPublishedSuccess(null), 3000);
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const fullBackup = {
      data_exportacao: new Date().toISOString(),
      usuarios: users,
      escalas: escala,
      mural,
      fiscalizacoes,
      feiras
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `backup_visa_bc_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Calculate birthdays
  const todayDate = new Date();
  const currentMonth = todayDate.getMonth();
  const currentDay = todayDate.getDate();

  const birthdayList = users.map((u) => {
    if (!u.data_nascimento) return { ...u, isToday: false, month: -1, day: -1 };
    const parts = u.data_nascimento.split('-');
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const isToday = m === currentMonth && d === currentDay;
    return { ...u, isToday, month: m, day: d };
  });

  return (
    <div className="w-full max-w-[1750px] mx-auto space-y-8 text-left pb-24 px-2 sm:px-6">
      {/* Top Banner Header */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-[2.5rem] p-7 md:p-10 shadow-2xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
          <Crown className="w-72 h-72 text-amber-400" />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-amber-400 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow">
                <Crown className="w-4 h-4" /> MASTER / DIRETORIA
              </span>
              <span className="text-xs text-blue-300 font-bold uppercase tracking-wider">
                Portal de Administração Integral
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tight">
              Painel de Controle Total do Sistema
            </h1>
            <p className="text-sm text-slate-300 mt-1.5 max-w-3xl leading-relaxed">
              Gerencie operadores, cargos, agenda de plantões, mural informativo, aniversários da equipe e relatórios globais de fiscalização.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-right shrink-0">
            <p className="text-xs text-blue-200 uppercase font-black">Operador Responsável</p>
            <p className="text-base font-black uppercase text-white">{currentUser?.nome_completo || 'ADMINISTRADOR MASTER'}</p>
            <span className="text-[10px] bg-purple-500/80 text-white font-extrabold px-2.5 py-1 rounded uppercase inline-block mt-1">
              {currentUser?.cargo || 'MASTER'}
            </span>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex flex-wrap gap-2.5 mt-8 pt-6 border-t border-white/10 relative z-10">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" /> Operadores & Cargos
          </button>

          <button
            onClick={() => setActiveTab('escala')}
            className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'escala'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" /> Agenda & Escalas
          </button>

          <button
            onClick={() => setActiveTab('mural')}
            className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'mural'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
          >
            <Megaphone className="w-4 h-4" /> Mural de Recados
          </button>

          <button
            onClick={() => setActiveTab('birthdays')}
            className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'birthdays'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
          >
            <Cake className="w-4 h-4" /> Aniversariantes
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'system'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Métricas & Sistema
          </button>
        </div>
      </section>

      {/* ========================================================= */}
      {/* TAB 1: OPERADORES & CARGOS                                */}
      {/* ========================================================= */}
      {activeTab === 'users' && (
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 md:p-10 lg:p-12 text-slate-900 dark:text-white min-h-[650px] transition-all">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-blue-600 dark:text-blue-400 uppercase italic flex items-center gap-2.5">
                <UserCheck className="w-7 h-7 text-blue-600" /> Cadastro e Permissões de Operadores
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                Cadastre servidores e defina seus cargos (AGENTE, FISCAL, DIRETOR, MASTER) para liberação de acessos no portal.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-black px-3.5 py-1.5 rounded-xl uppercase flex items-center gap-1.5 ${
                  isSupabaseConfigured
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                }`}
                title={
                  isSupabaseConfigured
                    ? 'Supabase Conectado: Cadastro e permissões sincronizados em tempo real no banco cloud'
                    : 'Modo Local / Vercel Env VITE_SUPABASE_URL pendente'
                }
              >
                {isSupabaseConfigured ? '⚡ Supabase On' : '💾 Local Persistence'}
              </span>
              <span className="text-xs font-black bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-3.5 py-1.5 rounded-xl uppercase border border-blue-200 dark:border-blue-800">
                {users.length} Servidores
              </span>
            </div>
          </div>

          {saveStatus && (
            <div
              className={`mb-4 p-3.5 border rounded-2xl text-xs font-black uppercase flex items-center justify-between shadow-md transition-all ${
                saveStatus.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/80 border-red-400 dark:border-red-600 text-red-900 dark:text-red-200'
              }`}
            >
              <span>{saveStatus.text}</span>
              <button
                onClick={() => setSaveStatus(null)}
                className="text-xs cursor-pointer font-black px-2 py-1 hover:bg-black/10 rounded-lg"
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleSaveUserSubmit} className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase text-slate-600 dark:text-slate-300">
                {editingUserId ? '✏️ Editar Operador' : '➕ Novo Operador'}
              </h3>
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Senha Padrão Inicial: <b className="text-blue-600 dark:text-blue-400 font-mono">123456</b>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[2.3fr_1.7fr_1.15fr_0.9fr_1.05fr_1.05fr] gap-3.5 items-end">
              <div>
                <label className="text-[10px] font-bold uppercase block mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo Silva"
                  value={userForm.nome_completo}
                  onChange={(e) => setUserForm({ ...userForm, nome_completo: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase block mb-1">E-mail Operador</label>
                <input
                  type="email"
                  placeholder="fiscal@bc.sc.gov.br"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase block mb-1">Data Nascimento</label>
                <input
                  type="date"
                  value={userForm.data_nascimento}
                  onChange={(e) => setUserForm({ ...userForm, data_nascimento: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase block mb-1">Matrícula</label>
                <input
                  type="text"
                  placeholder="FIS-4092"
                  value={userForm.matricula}
                  onChange={(e) => setUserForm({ ...userForm, matricula: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase block mb-1">Telefone</label>
                <input
                  type="tel"
                  placeholder="(47) 99999-9999"
                  value={userForm.telefone}
                  onChange={(e) => setUserForm({ ...userForm, telefone: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase block mb-1 text-amber-600 dark:text-amber-400">Senha de Acesso</label>
                <input
                  type="text"
                  placeholder="Ex: 123456 (Padrão)"
                  value={userForm.senha}
                  onChange={(e) => setUserForm({ ...userForm, senha: e.target.value })}
                  className="font-mono font-bold text-center border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
              <div className="md:col-span-3">
                <label className="text-[10px] font-bold uppercase block mb-1">Cargo / Função</label>
                <select
                  value={userForm.cargo}
                  onChange={(e) => setUserForm({ ...userForm, cargo: e.target.value as UserRole })}
                  className="w-full font-bold text-xs"
                >
                  <option value="AGENTE DE ENDEMIAS">AGENTE DE ENDEMIAS</option>
                  <option value="ASSISTENTE ADMINISTRATIVO">ASSISTENTE ADMINISTRATIVO</option>
                  <option value="DIRETOR DAL">DIRETOR DAL</option>
                  <option value="DIRETOR PMCD">DIRETOR PMCD</option>
                  <option value="DIRETORA CCPU">DIRETORA CCPU</option>
                  <option value="DIRETORA DFSIS">DIRETORA DFSIS</option>
                  <option value="DIRETORA-GERAL">DIRETORA-GERAL</option>
                  <option value="FARMACÊUTICO/BIOQUÍMICO">FARMACÊUTICO/BIOQUÍMICO</option>
                  <option value="FISCAL DE SAÚDE PÚBLICA">FISCAL DE SAÚDE PÚBLICA</option>
                  <option value="FISCAL DE VIGILÂNCIA SANITÁRIA">FISCAL DE VIGILÂNCIA SANITÁRIA</option>
                  <option value="MASTER ADM">MASTER ADM</option>
                  <option value="MÉDICO VETERINÁRIO">MÉDICO VETERINÁRIO</option>
                  <option value="NUTRICIONISTA">NUTRICIONISTA</option>
                  <option value="SUPERVISOR DE CAMPO">SUPERVISOR DE CAMPO</option>
                  <option value="SUPERVISOR GERAL">SUPERVISOR GERAL</option>
                  <option value="FISCAL">FISCAL</option>
                  <option value="DIRETOR">DIRETOR</option>
                  <option value="MASTER">MASTER</option>
                  <option value="AGENTE">AGENTE</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="text-[10px] font-bold uppercase block mb-1 text-blue-600 dark:text-blue-400">Setor de Atuação</label>
                <select
                  value={userForm.setor}
                  onChange={(e) => setUserForm({ ...userForm, setor: e.target.value as UserSetor })}
                  className="w-full font-bold text-xs border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30"
                >
                  <option value="VIGILÂNCIA SANITÁRIA">VIGILÂNCIA SANITÁRIA</option>
                  <option value="VIGILÂNCIA AMBIENTAL">VIGILÂNCIA AMBIENTAL</option>
                  <option value="VIGILÂNCIA SANITÁRIA E AMBIENTAL">VIGILÂNCIA SANITÁRIA E AMBIENTAL</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold uppercase block mb-1 text-emerald-700 dark:text-emerald-400">Conselho Regional.</label>
                <input
                  type="text"
                  placeholder="Ex: CRF/SC 3321..."
                  value={userForm.conselho_regional}
                  onChange={(e) => setUserForm({ ...userForm, conselho_regional: e.target.value })}
                  className="w-full font-bold text-xs uppercase"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold uppercase block mb-1 text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-purple-500" /> Acesso
                </label>
                <select
                  value={userForm.nivel_acesso}
                  onChange={(e) => setUserForm({ ...userForm, nivel_acesso: e.target.value as UserNivelAcesso })}
                  className="w-full font-black text-[11px] border-purple-300 dark:border-purple-700 bg-purple-50/60 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 px-2 py-2 rounded-xl"
                >
                  <option value="MASTER (TUDO)">MASTER (TUDO)</option>
                  <option value="VISA (FEIRAS)">VISA (FEIRAS)</option>
                  <option value="VISA (FISCAL)">VISA (FISCAL)</option>
                  <option value="VISA (LABORATÓRIO)">VISA (LABORATÓRIO)</option>
                </select>
              </div>

              <div className="md:col-span-2 flex justify-end gap-1.5 pt-2 md:pt-0">
                {editingUserId && (
                  <button
                    type="button"
                    onClick={handleClearUserForm}
                    className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-3 rounded-xl text-xs font-bold uppercase cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className={`bg-blue-600 hover:bg-blue-700 text-white font-black px-3.5 py-3 rounded-xl text-xs uppercase shadow transition cursor-pointer flex items-center justify-center gap-1.5 w-full md:w-auto ${
                    isSavingUser ? 'opacity-70 cursor-wait' : ''
                  }`}
                >
                  <Plus className={`w-4 h-4 ${isSavingUser ? 'animate-spin' : ''}`} />
                  {isSavingUser ? 'Salvando...' : editingUserId ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </div>

            <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-[10px] text-blue-900 dark:text-blue-200 flex items-start gap-2">
              <span className="text-sm">🔑</span>
              <div>
                <p className="font-extrabold uppercase">Instruções de Acesso & Senha:</p>
                <p>
                  Todo novo usuário é criado com a senha inicial <b>123456</b> (ou a configurada no campo acima). O operador pode alterar a própria senha a qualquer momento clicando em <b>&quot;Senha&quot;</b> no topo da página. Se o operador esquecer a senha, você como <b>Master</b> pode clicar em <b>&quot;Resetar Senha&quot;</b> na tabela abaixo para restaurar o acesso para <b>123456</b> instantaneamente.
                </p>
              </div>
            </div>
          </form>

          {/* Users List Table */}
          <div className="mt-6 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[1050px]">
                <thead className="bg-slate-100 dark:bg-slate-800/90 font-black uppercase text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Nome do Servidor</th>
                    <th className="py-3.5 px-4">E-mail Institucional</th>
                    <th className="py-3.5 px-3 text-center">Matrícula</th>
                    <th className="py-3.5 px-3 text-center">Nascimento</th>
                    <th className="py-3.5 px-4">Cargo / Função</th>
                    <th className="py-3.5 px-4">Setor</th>
                    <th className="py-3.5 px-4 text-center">Nível de Acesso</th>
                    <th className="py-3.5 px-3 text-center">Senha Atual</th>
                    <th className="py-3.5 px-4 text-center">Ações de Controle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((u) => {
                    const nivel = u.nivel_acesso || (u.cargo === 'MASTER' || u.cargo === 'MASTER ADM' ? 'MASTER (TUDO)' : 'VISA (FISCAL)');
                    return (
                    <tr key={u.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="py-3.5 px-4 font-black uppercase text-slate-900 dark:text-white whitespace-nowrap">
                        {u.nome_completo}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap">{u.email}</td>
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {u.matricula || '---'}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {u.data_nascimento ? u.data_nascimento.split('-').reverse().slice(0, 2).join('/') : '---'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase inline-block ${
                              u.cargo === 'MASTER' || u.cargo === 'MASTER ADM'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : u.cargo.includes('DIRETOR')
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : u.cargo.includes('SUPERVISOR')
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            }`}
                          >
                            {u.cargo}
                          </span>
                          {u.conselho_regional && (
                            <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded inline-flex items-center gap-1">
                              ⚖️ {u.conselho_regional}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 ${
                            u.setor === 'VIGILÂNCIA AMBIENTAL'
                              ? 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800'
                              : u.setor === 'VIGILÂNCIA SANITÁRIA E AMBIENTAL'
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800'
                              : 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800'
                          }`}
                        >
                          🏢 {u.setor || 'VIGILÂNCIA SANITÁRIA'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 shadow-xs ${
                            nivel === 'MASTER (TUDO)'
                              ? 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-700'
                              : nivel === 'VISA (FEIRAS)'
                              ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700'
                              : nivel === 'VISA (LABORATÓRIO)'
                              ? 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-200 dark:border-cyan-700'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700'
                          }`}
                        >
                          {nivel === 'MASTER (TUDO)' ? '👑' : nivel === 'VISA (FEIRAS)' ? '🎪' : nivel === 'VISA (LABORATÓRIO)' ? '🔬' : '📋'} {nivel}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className="font-mono font-black text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700">
                          {u.senha || '123456'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap space-x-2">
                        <button
                          onClick={() => handleResetUserPassword(u)}
                          className="text-amber-700 dark:text-amber-300 hover:bg-amber-200 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 font-extrabold px-2.5 py-1.5 rounded-lg text-[10px] uppercase transition cursor-pointer inline-flex items-center gap-1 shadow-xs"
                          title="Redefinir senha deste usuário para 123456"
                        >
                          🔑 Resetar (123456)
                        </button>
                        <button
                          onClick={() => handleEditUser(u)}
                          className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 dark:bg-blue-950/60 rounded-lg border border-blue-200 dark:border-blue-800 cursor-pointer inline-flex items-center"
                          title="Editar operador e senha"
                        >
                          <Edit2 className="w-4 h-4 inline" />
                        </button>
                        {users.length > 1 && (
                          <button
                            onClick={() => {
                              triggerConfirm({
                                title: 'Excluir Operador',
                                message: `Tem certeza de que deseja remover o cadastro do servidor do sistema?`,
                                itemDescription: `${u.nome_completo} (${u.cargo}) • ${u.email}`,
                                confirmText: 'Sim, Excluir Operador',
                                onConfirm: () => onDeleteUser(u.id)
                              });
                            }}
                            className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 dark:bg-red-950/60 rounded-lg border border-red-200 dark:border-red-800 cursor-pointer inline-flex items-center"
                            title="Excluir operador"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 2: AGENDA & ESCALAS                                    */}
      {/* ========================================================= */}
      {activeTab === 'escala' && (
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 md:p-10 lg:p-12 text-slate-900 dark:text-white min-h-[650px] transition-all">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 uppercase italic flex items-center gap-2.5">
                <Calendar className="w-7 h-7 text-indigo-600" /> Gestão da Agenda e Plantões
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                Adicione, modifique ou remova escalas de plantão, blitz e eventos diretamente no calendário oficial da DVIS.
              </p>
            </div>
            <span className="text-xs font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-3.5 py-1.5 rounded-xl uppercase border border-indigo-200 dark:border-indigo-800">
              {escala.length} Escalas
            </span>
          </div>

          <form onSubmit={handleAddEscalaSubmit} className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-black uppercase text-slate-700 dark:text-slate-200">
              ➕ Cadastrar Nova Escala / Plantão
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold uppercase block mb-1">Data do Evento/Plantão</label>
                <input
                  type="date"
                  required
                  value={escalaForm.data}
                  onChange={(e) => setEscalaForm({ ...escalaForm, data: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase block mb-1">Tipo de Escala</label>
                <select
                  value={escalaForm.tipo}
                  onChange={(e) => setEscalaForm({ ...escalaForm, tipo: e.target.value as any })}
                >
                  <option value="PLANTAO">PLANTÃO</option>
                  <option value="EVENTO">EVENTO / BLITZ</option>
                  <option value="FERIADO">FERIADO</option>
                  <option value="FACULTATIVO">PONTO FACULTATIVO</option>
                </select>
              </div>

              {/* Servidores Escalados com busca preditiva, dropdown e tags com X */}
              <div className="md:col-span-2 relative" ref={servidorDropdownRef}>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold uppercase block">
                    Servidores Escalados <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                    {users.length} operadores cadastrados
                  </span>
                </div>

                <div className="min-h-[48px] p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 flex flex-wrap items-center gap-2 transition">
                  {escalaForm.servidores.map((nome) => {
                    const u = users.find(x => x.nome_completo.toUpperCase() === nome.toUpperCase());
                    return (
                      <span
                        key={nome}
                        className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-black px-3 py-1.5 rounded-lg shadow-xs animate-fadeIn"
                      >
                        <Users className="w-3.5 h-3.5 opacity-70" />
                        <span>{nome}</span>
                        {u && <span className="text-[10px] font-semibold opacity-75">({u.cargo})</span>}
                        <button
                          type="button"
                          onClick={() => handleRemoveServidor(nome)}
                          className="w-4 h-4 rounded-full bg-indigo-200/70 dark:bg-indigo-800 hover:bg-red-500 hover:text-white flex items-center justify-center text-indigo-900 dark:text-indigo-200 transition cursor-pointer ml-1"
                          title="Remover servidor"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}

                  <div className="flex-1 min-w-[140px] flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
                    <input
                      type="text"
                      className="w-full bg-transparent border-none p-1.5 text-xs font-bold outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                      placeholder={escalaForm.servidores.length === 0 ? "Digite o nome para buscar e selecionar..." : "Adicionar outro..."}
                      value={servidorSearch}
                      onChange={(e) => {
                        setServidorSearch(e.target.value);
                        setShowServidorDropdown(true);
                      }}
                      onFocus={() => setShowServidorDropdown(true)}
                    />
                  </div>
                </div>

                {/* Dropdown com servidores filtrados ao digitar */}
                {showServidorDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-50 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
                    {users
                      .filter((u) => {
                        const search = servidorSearch.toLowerCase().trim();
                        const matchText = `${u.nome_completo} ${u.cargo} ${u.matricula || ''}`.toLowerCase();
                        const alreadySelected = escalaForm.servidores.some(s => s.toUpperCase() === u.nome_completo.toUpperCase());
                        return !alreadySelected && (search === '' || matchText.includes(search));
                      })
                      .map((u) => (
                        <div
                          key={u.id}
                          onClick={() => handleSelectServidor(u.nome_completo)}
                          className="p-3 hover:bg-indigo-50 dark:hover:bg-slate-800/80 cursor-pointer transition flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs">
                              {u.nome_completo.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                {u.nome_completo}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {u.cargo} • Matrícula: {u.matricula || 'N/A'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-800 group-hover:bg-indigo-600 group-hover:text-white transition">
                            + Selecionar
                          </span>
                        </div>
                      ))}

                    {users.filter(u => {
                      const search = servidorSearch.toLowerCase().trim();
                      const matchText = `${u.nome_completo} ${u.cargo} ${u.matricula || ''}`.toLowerCase();
                      const alreadySelected = escalaForm.servidores.some(s => s.toUpperCase() === u.nome_completo.toUpperCase());
                      return !alreadySelected && (search === '' || matchText.includes(search));
                    }).length === 0 && (
                      <div className="p-3 text-center text-xs text-slate-400 italic">
                        Nenhum servidor encontrado para "{servidorSearch}".
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Descrição / Observações */}
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase block mb-1">
                  Descrição / Observações da Escala
                </label>
                <input
                  type="text"
                  placeholder="Ex: Plantão Noturno Orla / Fiscalização Geral"
                  value={escalaForm.descricao}
                  onChange={(e) => setEscalaForm({ ...escalaForm, descricao: e.target.value })}
                />
              </div>

              {/* Campo Específico para Link / URL */}
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase block mb-1 flex items-center gap-1">
                  <LinkIcon className="w-4 h-4 text-indigo-500" /> Link / URL Externa <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="url"
                  placeholder="Ex: https://drive.google.com/... ou https://bc.1doc.com.br/..."
                  value={escalaForm.link}
                  onChange={(e) => setEscalaForm({ ...escalaForm, link: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-3.5 rounded-xl text-xs uppercase shadow transition cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Salvar Escala na Agenda
              </button>
            </div>
          </form>

          {/* List Escalas */}
          <div className="mt-8 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden bg-white dark:bg-slate-900 shadow-md">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 font-black uppercase text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-4 px-5">Data</th>
                  <th className="py-4 px-5">Tipo</th>
                  <th className="py-4 px-5">Servidores Escalados</th>
                  <th className="py-4 px-5">Descrição / Detalhes</th>
                  <th className="py-4 px-5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {escala.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-4 px-5 font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {item.data.split('-').reverse().join('/')}
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tag-evento tipo-${item.tipo.toLowerCase()}`}>
                        {item.tipo}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-bold uppercase text-slate-800 dark:text-slate-100">{item.servidores}</td>
                    <td className="py-4 px-5 text-slate-600 dark:text-slate-300 max-w-sm">
                      {item.descricao ? <AutoLinkText text={item.descricao} /> : '---'}
                    </td>
                    <td className="py-4 px-5 text-center whitespace-nowrap">
                      <button
                        onClick={() => {
                          triggerConfirm({
                            title: 'Remover Escala / Plantão',
                            message: `Tem certeza de que deseja excluir este agendamento do calendário?`,
                            itemDescription: `${item.data} - ${item.tipo}: ${item.servidores}`,
                            confirmText: 'Sim, Remover',
                            onConfirm: () => onDeleteEscalaItem(item.id)
                          });
                        }}
                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg cursor-pointer"
                        title="Remover Escala"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 3: MURAL DE RECADOS                                   */}
      {/* ========================================================= */}
      {activeTab === 'mural' && (
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 md:p-10 lg:p-12 text-slate-900 dark:text-white min-h-[650px] transition-all">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-amber-600 dark:text-amber-400 uppercase italic flex items-center gap-2.5">
                <Megaphone className="w-7 h-7 text-amber-600" /> Controle do Mural Oficial de Recados
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                Publique avisos importantes, alertas de fiscalização e comunicado da diretoria visíveis na tela inicial do sistema.
              </p>
            </div>
            <span className="text-xs font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-3.5 py-1.5 rounded-xl uppercase border border-amber-200 dark:border-amber-800">
              {mural.length} Recados
            </span>
          </div>

          <form onSubmit={handleSaveMuralSubmit} className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-black uppercase text-slate-700 dark:text-slate-200">
              {editingRecadoId ? '✏️ Editar Recado do Mural' : '📢 Publicar Novo Comunicado'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase block mb-1">Título do Recado</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: REUNIÃO GERAL DE METAS DVIS"
                  value={muralForm.titulo}
                  onChange={(e) => setMuralForm({ ...muralForm, titulo: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase block mb-1">Prioridade</label>
                <select
                  value={muralForm.prioridade}
                  onChange={(e) => setMuralForm({ ...muralForm, prioridade: e.target.value as any })}
                >
                  <option value="NORMAL">NORMAL (INFORMATIVO)</option>
                  <option value="ALERTA">ALERTA (IMPORTANTE)</option>
                  <option value="URGENTE">URGENTE (AÇÃO IMEDIATA)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase block mb-1">Assinado Por</label>
                <input
                  type="text"
                  value={muralForm.autor}
                  onChange={(e) => setMuralForm({ ...muralForm, autor: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase block mb-1">Conteúdo da Mensagem</label>
              <textarea
                rows={4}
                required
                placeholder="Escreva a mensagem que aparecerá para toda a equipe..."
                value={muralForm.conteudo}
                onChange={(e) => setMuralForm({ ...muralForm, conteudo: e.target.value })}
                className="w-full p-3.5 text-xs border rounded-xl dark:bg-slate-700 dark:border-slate-600 text-slate-900 dark:text-white"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {editingRecadoId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRecadoId(null);
                    setMuralForm({ titulo: '', conteudo: '', prioridade: 'NORMAL', autor: currentUser?.nome_completo || 'DIRETORIA' });
                  }}
                  className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-xl text-xs font-bold uppercase cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase shadow transition cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" /> {editingRecadoId ? 'Atualizar Recado' : 'Publicar no Mural'}
              </button>
            </div>
          </form>

          {/* List Mural */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {mural.map((m) => {
              const isUrgente = m.prioridade === 'URGENTE';
              const isAlerta = m.prioridade === 'ALERTA';

              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-2xl border relative text-left transition-all ${
                    isUrgente
                      ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800/80 shadow-xs ring-1 ring-red-400/30'
                      : isAlerta
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`font-black text-sm uppercase ${
                        isUrgente
                          ? 'text-red-900 dark:text-red-200 flex items-center gap-1.5'
                          : isAlerta
                          ? 'text-amber-900 dark:text-amber-200'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {isUrgente && <span className="inline-block w-2 h-2 rounded-full bg-red-600 animate-ping"></span>}
                      {m.titulo}
                    </span>
                    <span
                      className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                        isUrgente
                          ? 'bg-red-600 text-white dark:bg-red-700 dark:text-white shadow-xs animate-pulse'
                          : isAlerta
                          ? 'bg-amber-500 text-white dark:bg-amber-600 dark:text-white'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {m.prioridade}
                    </span>
                  </div>
                  <p
                    className={`text-xs mb-3 leading-relaxed ${
                      isUrgente
                        ? 'text-red-900/90 dark:text-red-200 font-medium'
                        : isAlerta
                        ? 'text-amber-900/90 dark:text-amber-200'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <AutoLinkText text={m.conteudo} />
                  </p>
                  <div
                    className={`flex justify-between items-center text-[10px] border-t pt-2 ${
                      isUrgente
                        ? 'text-red-700/80 dark:text-red-400 border-red-200 dark:border-red-900/50'
                        : isAlerta
                        ? 'text-amber-700/80 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
                        : 'text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>Por: {m.autor}</span>
                    <span>{m.data}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditRecado(m)}
                        className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          triggerConfirm({
                            title: 'Excluir Recado do Mural',
                            message: `Tem certeza de que deseja remover este aviso do mural?`,
                            itemDescription: `${m.titulo} (${m.prioridade}) - Por: ${m.autor}`,
                            confirmText: 'Sim, Excluir Recado',
                            onConfirm: () => onDeleteRecado(m.id)
                          });
                        }}
                        className="text-red-500 hover:text-red-700 font-bold cursor-pointer"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 4: ANIVERSARIANTES                                    */}
      {/* ========================================================= */}
      {activeTab === 'birthdays' && (
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 md:p-10 lg:p-12 text-slate-900 dark:text-white min-h-[650px] transition-all">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-pink-600 dark:text-pink-400 uppercase italic flex items-center gap-2.5">
                <Cake className="w-7 h-7 text-pink-600" /> Controle de Aniversariantes da DVIS
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                Acompanhe as datas comemorativas dos servidores e envie felicitações automáticas ao Mural de Recados com um único clique.
              </p>
            </div>
          </div>

          {publishedSuccess && (
            <div className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 p-4 rounded-2xl text-xs font-bold mb-6 flex items-center gap-2.5 border border-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> {publishedSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {birthdayList.map((u) => (
              <div
                key={u.id}
                className={`p-6 rounded-3xl border transition flex flex-col justify-between ${
                  u.isToday
                    ? 'bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500 dark:border-pink-500 shadow-lg ring-2 ring-pink-500/30'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-black text-base text-slate-900 dark:text-white uppercase tracking-tight">{u.nome_completo}</span>
                    {u.isToday && (
                      <span className="bg-pink-600 text-white font-black text-[10px] px-2.5 py-1 rounded-full uppercase animate-bounce shadow">
                        HOJE! 🎈
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase">{u.cargo}</p>
                  <p className="text-sm text-slate-500 mt-2 font-mono">
                    Aniversário: <b className="text-pink-600 dark:text-pink-400">{u.data_nascimento ? u.data_nascimento.split('-').reverse().slice(0, 2).join('/') : 'Não informada'}</b>
                    <span className="text-xs text-slate-400 block font-sans mt-0.5">
                      (Ano de nascimento omitido por privacidade)
                    </span>
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <button
                    onClick={() => handlePostBirthdayMural(u)}
                    className="bg-pink-600 hover:bg-pink-700 text-white font-black text-xs px-4 py-2.5 rounded-xl uppercase shadow transition cursor-pointer flex items-center gap-1.5"
                  >
                    🎉 Parabenizar no Mural
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('users');
                      handleEditUser(u);
                    }}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Editar Data
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 5: MÉTRICAS & CONTROLE DO SISTEMA                     */}
      {/* ========================================================= */}
      {activeTab === 'system' && (
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 md:p-10 lg:p-12 text-slate-900 dark:text-white space-y-8 min-h-[650px] transition-all">
          <div>
            <h2 className="text-2xl font-black text-blue-600 dark:text-blue-400 uppercase italic flex items-center gap-2.5">
              <BarChart3 className="w-7 h-7 text-blue-600" /> Resumo Geral e Métricas de Operação
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              Estatísticas completas de todos os registros e ações do sistema municipal de vigilância sanitária.
            </p>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-blue-50 dark:bg-blue-950/40 p-6 rounded-3xl border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-black uppercase text-blue-600 dark:text-blue-400">Total de Operadores</p>
              <p className="text-4xl font-black text-blue-900 dark:text-blue-200 mt-2">{users.length}</p>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-950/40 p-6 rounded-3xl border border-indigo-200 dark:border-indigo-800">
              <p className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">Escalas Cadastradas</p>
              <p className="text-4xl font-black text-indigo-900 dark:text-indigo-200 mt-2">{escala.length}</p>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-6 rounded-3xl border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">Autos de Vistoria</p>
              <p className="text-4xl font-black text-emerald-900 dark:text-emerald-200 mt-2">{fiscalizacoes.length}</p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 p-6 rounded-3xl border border-amber-200 dark:border-amber-800">
              <p className="text-xs font-black uppercase text-amber-600 dark:text-amber-400">Feirantes Cadastrados</p>
              <p className="text-4xl font-black text-amber-900 dark:text-amber-200 mt-2">{feiras.length}</p>
            </div>
          </div>

          {/* Admin Tools */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-6">
            <h3 className="text-base font-black uppercase text-slate-800 dark:text-white flex items-center gap-2.5">
              <Settings className="w-5 h-5 text-blue-600" /> Ferramentas do Administrador Master
            </h3>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleExportBackup}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3.5 rounded-2xl text-xs uppercase shadow transition cursor-pointer flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Exportar Backup do Sistema (JSON)
              </button>

              {onResetSystemData && (
                <button
                  onClick={() => {
                    triggerConfirm({
                      title: 'Restaurar Dados Iniciais',
                      message: 'Tem certeza de que deseja restaurar as configurações e dados de fábrica? Registros locais não salvos em nuvem serão resetados.',
                      confirmText: 'Sim, Restaurar Sistema',
                      onConfirm: onResetSystemData
                    });
                  }}
                  className="bg-slate-700 hover:bg-slate-800 text-white font-black px-6 py-3 rounded-2xl text-xs uppercase shadow transition cursor-pointer flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Restaurar Dados Iniciais de Fábrica
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Modal Universal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        itemDescription={confirmState.itemDescription}
        confirmText={confirmState.confirmText}
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
