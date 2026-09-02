import React, { useState, useEffect, useRef } from 'react';
import { PortalButton, EscalaItem, UserProfile, RecadoMural, ChatMessage } from '../types';
import { 
  ShieldCheck, 
  Calendar, 
  Send, 
  Info, 
  Crown, 
  ChevronLeft, 
  ChevronRight, 
  MessageSquare, 
  Trash2, 
  Building2, 
  Search, 
  FileCheck, 
  PhoneCall, 
  HelpCircle, 
  ExternalLink,
  Users,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  Cake,
  Sparkles,
  Gift,
  MapPin,
  Clock,
  Phone,
  Mail
} from 'lucide-react';
import { AutoLinkText } from './AutoLinkText';

interface HomeViewProps {
  buttons: PortalButton[];
  escala: EscalaItem[];
  users: UserProfile[];
  mural: RecadoMural[];
  chat: ChatMessage[];
  currentUser: UserProfile | null;
  onNavigate: (view: 'home' | 'feiras' | 'agenda' | 'master' | 'fiscalizacao' | 'processos' | 'processos_lab' | 'laboratorio' | 'cidadao' | 'portal_contador' | 'cnae' | 'telefone') => void;
  onOpenExternal: (url: string) => void;
  onSendMessage: (text: string) => void;
  onDeleteMessage?: (id: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  buttons,
  escala,
  users,
  mural,
  chat,
  currentUser,
  onNavigate,
  onOpenExternal,
  onSendMessage,
  onDeleteMessage,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [muralIndex, setMuralIndex] = useState(0);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const userType = currentUser?.tipo_usuario || 'SERVIDOR';

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chat]);

  // Auto-rotate mural every 6 seconds when there are multiple items
  useEffect(() => {
    if (mural.length <= 1) return;
    const interval = setInterval(() => {
      setMuralIndex((prev) => (prev + 1) % mural.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [mural.length]);

  const today = new Date();
  const todayISO = today.toISOString().split('T')[0];
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  // Helper para formatar a data do plantão com dia da semana amigável
  const formatPlantaoDate = (dateStr: string) => {
    if (!dateStr) return { dataFormatada: '', diaMes: '', diaSemana: '', relativo: '', completo: '' };
    const parts = dateStr.split('-');
    if (parts.length < 3) return { dataFormatada: dateStr, diaMes: dateStr, diaSemana: '', relativo: '', completo: dateStr };
    
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);

    const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const diaSemana = diasSemana[dateObj.getDay()] || '';

    const diaFmt = String(day).padStart(2, '0');
    const mesFmt = String(month + 1).padStart(2, '0');

    // Calcular dias restantes em relação a hoje
    const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const targetClean = new Date(year, month, day);
    const diffTime = targetClean.getTime() - todayClean.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    let relativo = '';
    if (diffDays === 0) relativo = 'Hoje';
    else if (diffDays === 1) relativo = 'Amanhã';
    else if (diffDays > 1) relativo = `Em ${diffDays} dias`;

    return {
      dataFormatada: `${diaFmt}/${mesFmt}/${year}`,
      diaMes: `${diaFmt}/${mesFmt}`,
      diaSemana,
      relativo,
      completo: `${diaFmt}/${mesFmt} (${diaSemana})`
    };
  };

  const isMaster = 
    currentUser?.nivel_acesso?.toUpperCase().includes('MASTER') ||
    currentUser?.nivel_acesso === 'MASTER (TUDO)' ||
    currentUser?.cargo === 'MASTER ADM';

  const isLabUser =
    isMaster ||
    currentUser?.nivel_acesso === 'VISA (LABORATÓRIO)' ||
    currentUser?.setor?.toUpperCase().includes('LAB') ||
    currentUser?.cargo?.toUpperCase().includes('LAB');

  const visibleButtons = buttons.filter((b) => {
    // Verificação de perfis permitidos (tipo de usuário)
    if (b.perfisPermitidos && b.perfisPermitidos.length > 0) {
      if (!b.perfisPermitidos.includes(userType)) {
        return false;
      }
    } else {
      if (userType === 'CIDADAO') {
        const publicIds = ['pref', '1doc', 'alva', 'cnpj', 'debi', 'leis', 'mapa', 'cidadao_view'];
        if (!publicIds.includes(b.id)) return false;
      } else if (userType === 'CONTABILIDADE') {
        const contabIds = ['pref', '1doc', 'alva', 'cnpj', 'debi', 'domm', 'leis', 'mapa', 'regi'];
        if (!contabIds.includes(b.id)) return false;
      }
    }

    // 1. Processos e Carteira de Processos (Lab): Apenas Master
    if (
      b.id === 'proc' ||
      b.id === 'tproc' ||
      b.id === 'tproc_lab' ||
      b.view === 'processos' ||
      b.view === 'processos_lab'
    ) {
      return isMaster && userType === 'SERVIDOR';
    }

    // 2. Laboratório: Apenas VISA (LABORATÓRIO) e Master
    if (b.id === 'tlab' || b.view === 'laboratorio') {
      return isLabUser && userType === 'SERVIDOR';
    }

    // 3. Fiscalização e Feiras: Todos os servidores VISA e Master
    if (b.id === 'fisc' || b.id === 'feir' || b.view === 'fiscalizacao' || b.view === 'feiras') {
      return userType === 'SERVIDOR' || (b.id === 'feir' && userType === 'CONTRIBUINTE');
    }

    if (b.somenteMaster || (b.nome.toLowerCase().includes('teste') && b.id !== 'tlab')) {
      return isMaster && userType === 'SERVIDOR';
    }
    return true;
  });

  // Find plantão: check today's plantão first, then find the next upcoming one
  const todayPlantao = escala.find((e) => e.data === todayISO && (e.tipo === 'PLANTAO' || !e.tipo));
  const nextPlantao = escala
    .filter((e) => e.data > todayISO && (e.tipo === 'PLANTAO' || !e.tipo))
    .sort((a, b) => a.data.localeCompare(b.data))[0];

  const todayInfo = formatPlantaoDate(todayISO);
  const nextInfo = nextPlantao ? formatPlantaoDate(nextPlantao.data) : null;

  // Helper robusto para parser de datas de aniversário
  const parseBirthDate = (raw: string | undefined | null) => {
    if (!raw) return null;
    const str = raw.trim();
    let day = 0;
    let month = 0; // 0-indexed

    if (str.includes('-')) {
      const parts = str.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          month = parseInt(parts[1], 10) - 1;
          day = parseInt(parts[2], 10);
        } else {
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
        }
      }
    } else if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
      }
    }

    if (day > 0 && day <= 31 && month >= 0 && month <= 11) {
      return { day, month };
    }
    return null;
  };

  // Aniversariantes de hoje (Usuários cadastrados + Eventos de aniversário na escala)
  const aniversariantesHojeUsers = users.filter((u) => {
    const parsed = parseBirthDate(u.data_nascimento);
    return parsed && parsed.month === todayMonth && parsed.day === todayDay;
  });

  const aniversariantesHojeEscala = escala
    .filter((e) => e.data === todayISO && e.tipo === 'ANIVERSARIO')
    .map((e) => ({
      id: e.id,
      nome_completo: e.servidores || e.descricao || 'Aniversariante',
      cargo: 'SERVIDOR'
    }));

  const aniversariantesHoje = [
    ...aniversariantesHojeUsers.map((u) => ({ id: u.id, nome_completo: u.nome_completo, cargo: u.cargo })),
    ...aniversariantesHojeEscala
  ];

  // Próximos aniversariantes da equipe ordenados por data
  const proximosAniversariantes = users
    .map((u) => {
      const parsed = parseBirthDate(u.data_nascimento);
      if (!parsed) return null;
      
      let targetYear = today.getFullYear();
      let targetDate = new Date(targetYear, parsed.month, parsed.day);
      const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // Se a data já passou este ano, o próximo será no próximo ano
      if (targetDate.getTime() < todayClean.getTime()) {
        targetYear += 1;
        targetDate = new Date(targetYear, parsed.month, parsed.day);
      }

      const diffDays = Math.round((targetDate.getTime() - todayClean.getTime()) / (1000 * 60 * 60 * 24));
      const diaFmt = String(parsed.day).padStart(2, '0');
      const mesFmt = String(parsed.month + 1).padStart(2, '0');

      return {
        id: u.id,
        nome_completo: u.nome_completo,
        cargo: u.cargo,
        diaMes: `${diaFmt}/${mesFmt}`,
        diffDays,
        isThisMonth: parsed.month === todayMonth
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null && item.diffDays > 0)
    .sort((a, b) => a.diffDays - b.diffDays);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput);
    setChatInput('');
  };

  const renderCardGraphic = (b: PortalButton) => {
    if (b.view === 'cidadao' || b.id === 'cidadao_view') {
      return <Search className="h-12 w-12 text-emerald-500" />;
    }
    if (b.view === 'processos_lab' || b.id === 'tproc_lab' || b.id === 'contab_carteira') {
      return <Building2 className="h-12 w-12 text-indigo-500" />;
    }
    if (b.img === 'shield') {
      return (
        <div className="relative flex items-center justify-center">
          <ShieldCheck className="h-12 w-12 text-emerald-600 dark:text-emerald-400 animate-pulse" />
          <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest animate-bounce">
            LIVE
          </span>
        </div>
      );
    }
    if (b.img === 'calendar') {
      return (
        <div className="calendar-icon">
          <div className="calendar-icon-header"></div>
          <span className="calendar-icon-day">{todayDay}</span>
        </div>
      );
    }
    if (b.img === 'tent') {
      return (
        <svg viewBox="0 0 24 24" className="h-12 w-12 fill-blue-600 dark:fill-blue-400">
          <path d="M12 2L2 7v2h20V7L12 2zm-7.5 9v11h3V11h-3zm6 0v11h3V11h-3zm6 0v11h3V11h-3z" />
        </svg>
      );
    }
    if (b.img === 'lab-icon') {
      return <span className="text-4xl">🔬</span>;
    }
    if (b.view === 'cnae' || b.img === 'cnae-icon' || b.id === 'cnae_btn') {
      return (
        <div className="relative flex items-center justify-center">
          <FileSpreadsheet className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
          <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-[8px] font-black px-1 py-0.2 rounded uppercase">
            VISA
          </span>
        </div>
      );
    }
    if (b.view === 'telefone' || b.id === 'telefone_btn' || b.img === 'phone-icon') {
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md">
            <PhoneCall className="w-6 h-6 animate-pulse" />
          </div>
          <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase shadow">
            RAMAIS
          </span>
        </div>
      );
    }
    if (b.img === 'alvara' || b.id === 'alva') {
      return (
        <div className="relative flex items-center justify-center">
          <svg viewBox="0 0 64 64" className="h-12 w-12 drop-shadow-md">
            <defs>
              <linearGradient id="alvaraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              <linearGradient id="paperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#f8fafc" />
              </linearGradient>
              <linearGradient id="sealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
            </defs>
            <rect x="9" y="6" width="46" height="52" rx="4" fill="url(#paperGrad)" stroke="#cbd5e1" strokeWidth="1.5" />
            <path d="M9 10 C9 7.8 10.8 6 13 6 L51 6 C53.2 6 55 7.8 55 10 L55 16 L9 16 Z" fill="url(#alvaraGrad)" />
            <circle cx="16" cy="11" r="1.5" fill="#fef3c7" />
            <circle cx="48" cy="11" r="1.5" fill="#fef3c7" />
            <rect x="15" y="21" width="34" height="2.5" rx="1.25" fill="#94a3b8" />
            <rect x="15" y="26" width="24" height="2" rx="1" fill="#cbd5e1" />
            <rect x="15" y="31" width="28" height="2" rx="1" fill="#cbd5e1" />
            <g transform="translate(34, 34)">
              <path d="M6 14 L10 22 L14 14" fill="#047857" />
              <path d="M12 14 L16 22 L20 14" fill="#065f46" />
              <circle cx="13" cy="11" r="9" fill="url(#sealGrad)" stroke="#34d399" strokeWidth="1.5" />
              <path d="M9 11 L12 14 L17 8.5" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
        </div>
      );
    }
    if (b.id === 'pref' || b.img.includes('brasao')) {
      return <img src={b.img} alt={b.nome} className="h-16 max-h-16 w-auto object-contain scale-125 transition-transform" />;
    }
    return <img src={b.img} alt={b.nome} className="h-12 w-auto object-contain" />;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Upper Content: App Grid and Right Column */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Central App Grid */}
        <div className="flex-1 py-2">
          {/* Banner Master if user is MASTER and SERVIDOR */}
          {isMaster && userType === 'SERVIDOR' && (
            <div
              onClick={() => onNavigate('master')}
              className="mb-5 bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 p-4 rounded-2xl border-2 border-amber-400/80 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl cursor-pointer hover:scale-[1.01] transition"
            >
              <div className="flex items-center gap-3">
                <div className="bg-amber-400 text-slate-950 p-2.5 rounded-xl shadow">
                  <Crown className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-black uppercase text-sm text-amber-300 flex items-center gap-2">
                    Painel Master & Divisão DVIS
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Controle total do sistema: Cadastre Operadores, controle a Agenda, Mural de Recados e Aniversários.
                  </p>
                </div>
              </div>
              <button className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2 rounded-xl uppercase shadow transition cursor-pointer shrink-0">
                Acessar Painel Master →
              </button>
            </div>
          )}

          {/* Banner Especial para CONTABILIDADE */}
          {userType === 'CONTABILIDADE' && (
            <div
              onClick={() => onNavigate('processos_lab')}
              className="mb-5 bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 p-4 sm:p-5 rounded-2xl border-2 border-indigo-400 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl cursor-pointer hover:scale-[1.01] transition"
            >
              <div className="flex items-center gap-3.5">
                <div className="bg-indigo-500 text-white p-3 rounded-2xl shadow-lg">
                  <Building2 className="w-7 h-7" />
                </div>
                <div className="text-left">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/30 border border-indigo-400/40 rounded-md text-[10px] font-black uppercase text-indigo-300 mb-1">
                    🏢 Painel do Escritório Contábil
                  </div>
                  <h3 className="font-black uppercase text-base sm:text-lg text-white">
                    Minha Carteira de Empresas & Processos
                  </h3>
                  <p className="text-xs text-indigo-200">
                    Acompanhe em tempo real o status dos alvarás sanitários, pendências e vistorias dos seus clientes.
                  </p>
                </div>
              </div>
              <button className="bg-indigo-400 hover:bg-indigo-300 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl uppercase shadow-md transition cursor-pointer shrink-0">
                Abrir Minha Carteira →
              </button>
            </div>
          )}

          {/* Banner Especial para CIDADAO */}
          {userType === 'CIDADAO' && (
            <div
              onClick={() => onNavigate('cidadao')}
              className="mb-5 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-4 sm:p-5 rounded-2xl border-2 border-emerald-400 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl cursor-pointer hover:scale-[1.01] transition"
            >
              <div className="flex items-center gap-3.5">
                <div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-lg">
                  <Search className="w-7 h-7" />
                </div>
                <div className="text-left">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/30 border border-emerald-400/40 rounded-md text-[10px] font-black uppercase text-emerald-300 mb-1">
                    🏛️ Autoatendimento do Munícipe
                  </div>
                  <h3 className="font-black uppercase text-base sm:text-lg text-white">
                    Consulta de Alvarás & Regularidade Sanitária
                  </h3>
                  <p className="text-xs text-emerald-200">
                    Pesquise estabelecimentos por CNPJ, Razão Social ou Endereço para verificar a vigência do alvará.
                  </p>
                </div>
              </div>
              <button className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl uppercase shadow-md transition cursor-pointer shrink-0">
                Consultar Estabelecimentos →
              </button>
            </div>
          )}

          <div className="mb-4 text-left">
            <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
              {userType === 'CIDADAO'
                ? 'Serviços Públicos e Consultas'
                : userType === 'CONTABILIDADE'
                ? 'Módulos e Acessos Contábeis'
                : 'Serviços e Módulos Operacionais'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {userType === 'CIDADAO'
                ? 'Acesse os serviços oficiais da Vigilância Sanitária de Balneário Camboriú.'
                : userType === 'CONTABILIDADE'
                ? 'Ferramentas de integração e consulta para escritórios contábeis credenciados.'
                : 'Selecione um módulo para acesso direto às ferramentas municipais e de fiscalização sanitária.'}
            </p>
          </div>

          <div className="grid-portal">
            {visibleButtons.map((b) => (
              <div
                key={b.id}
                onClick={() => {
                  if (b.acao === 'link') {
                    onOpenExternal(b.url);
                  } else if (b.view) {
                    onNavigate(b.view);
                  }
                }}
                className={`card-app relative ${
                  b.view === 'fiscalizacao'
                    ? 'border-2 border-emerald-500 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : b.id === 'tproc' || b.id === 'tproc_lab'
                    ? 'border-2 border-indigo-500 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                    : ''
                }`}
              >
                {b.badgetext && (
                  <span className="absolute top-2 right-2 bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow">
                    {b.badgetext}
                  </span>
                )}
                <div className="flex justify-center items-center h-14 w-full">
                  {renderCardGraphic(b)}
                </div>
                <h3 className="card-title">{b.nome}</h3>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (Conditional by User Role) */}
        <div className="w-full lg:w-[320px] flex flex-col gap-4">
          {userType === 'CIDADAO' ? (
            /* Central de Atendimento ao Cidadão */
            <div className="space-y-4 text-left">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                <h4 className="text-xs font-black uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-2">
                  <FileCheck className="w-4 h-4" /> Protocolo 1Doc
                </h4>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed mb-3">
                  Precisa solicitar novo alvará ou protocolar defesa de notificação? Utilize o sistema 1Doc online.
                </p>
                <button
                  onClick={() => onOpenExternal('https://bc.1doc.com.br/b.php?pg=o/login&n=3')}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow"
                >
                  <span>Acessar 1Doc Prefeitura</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white flex items-center gap-1.5 mb-2.5">
                  <Search className="w-4 h-4 text-emerald-500" /> Canais e Serviços Rápidos
                </h4>
                <ul className="space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <li
                    className="flex items-center gap-2 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                    onClick={() => onNavigate('cidadao')}
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Consulta de Regularidade Sanitária</span>
                  </li>
                  <li
                    className="flex items-center gap-2 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                    onClick={() => onOpenExternal('https://leismunicipais.com.br/legislacao-municipal/4710/leis-de-balneario-camboriu')}
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Legislação Sanitária Municipal</span>
                  </li>
                  <li
                    className="flex items-center gap-2 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                    onClick={() => onOpenExternal('https://balneariocamboriu.atende.net/')}
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Portal Tributário e Débitos</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : userType === 'CONTABILIDADE' ? (
            /* Painel do Escritório Contábil */
            <div className="space-y-4 text-left">
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4" /> Escritório Conectado
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                  Você está conectado com o perfil contábil oficial. Monitore e gerencie os alvarás dos seus clientes com agilidade.
                </p>
                <button
                  onClick={() => onNavigate('processos_lab')}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow"
                >
                  <span>Ver Carteira de Processos</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white flex items-center gap-1.5 mb-2.5">
                  <FileText className="w-4 h-4 text-indigo-500" /> Guia Rápido do Contabilista
                </h4>
                <ul className="space-y-2 text-[11px] text-slate-600 dark:text-slate-300 list-disc pl-4">
                  <li>Consulte a viabilidade e código CNAE no <strong>Regin</strong>.</li>
                  <li>Anexe projetos e memoriais descritivos via <strong>1Doc</strong>.</li>
                  <li>Emita taxas sanitárias no portal de <strong>Débitos</strong>.</li>
                  <li>Consulte a legislação de saúde em <strong>Leis</strong>.</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Painel Interno do Servidor (Plantão, Aniversariantes, Mural, Chat) */
            <>
              {/* Plantão Box */}
              <section
                onClick={() => onNavigate('agenda')}
                className={`p-5 rounded-2xl text-white shadow-md text-left relative overflow-hidden cursor-pointer transition hover:scale-[1.01] ${
                  todayPlantao
                    ? 'bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 border border-blue-500/40'
                    : nextPlantao
                    ? 'bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 border border-amber-400/40'
                    : 'bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700'
                }`}
              >
                <div className="absolute top-2 right-2 opacity-15 pointer-events-none">
                  <Calendar className="w-20 h-20" />
                </div>

                <div className="flex items-center justify-between border-b border-white/15 pb-2 mb-2.5">
                  <h2 className="text-xs font-black uppercase tracking-widest text-blue-100 flex items-center gap-1.5">
                    <span>🛡️ Plantão DVIS</span>
                  </h2>
                  {todayPlantao ? (
                    <span className="text-[9px] bg-emerald-500 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow animate-pulse">
                      HOJE ATIVO
                    </span>
                  ) : nextPlantao ? (
                    <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                      PRÓXIMO PLANTÃO
                    </span>
                  ) : (
                    <span className="text-[9px] bg-slate-600 text-slate-200 font-bold px-2 py-0.5 rounded-full uppercase">
                      SEM ESCALA
                    </span>
                  )}
                </div>

                {todayPlantao ? (
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-blue-200 uppercase mb-1">
                      <span>Escala em Andamento</span>
                      <span className="text-emerald-300 font-black">{todayInfo.completo}</span>
                    </div>
                    <p id="txt-escala-nomes" className="text-base font-black leading-tight uppercase text-white drop-shadow-sm">
                      {todayPlantao.servidores || 'Servidores em plantão'}
                    </p>
                    {todayPlantao.descricao && (
                      <div className="mt-2 pt-2 border-t border-white/10 text-[11px] text-blue-100/90 leading-snug">
                        <AutoLinkText text={todayPlantao.descricao} onOpenExternal={onOpenExternal} />
                      </div>
                    )}
                  </div>
                ) : nextPlantao ? (
                  <div>
                    <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-amber-300 uppercase mb-1.5">
                      <span className="flex items-center gap-1">
                        <span>Sem plantão hoje</span>
                      </span>
                      {nextInfo?.relativo && (
                        <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full text-[9px] font-black border border-amber-400/30">
                          {nextInfo.relativo}
                        </span>
                      )}
                    </div>

                    <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-2.5 my-1.5">
                      <div className="text-[10px] font-black text-amber-300 uppercase flex items-center justify-between">
                        <span>📅 Data da Próxima Escala:</span>
                        <span className="text-white text-xs font-black">{nextInfo?.dataFormatada}</span>
                      </div>
                      <div className="text-[11px] font-black text-white uppercase mt-1">
                        {nextInfo?.diaSemana}
                      </div>
                    </div>

                    <p id="txt-escala-nomes" className="text-sm font-black leading-tight uppercase text-amber-100 mt-1">
                      {nextPlantao.servidores || 'Servidores escalados'}
                    </p>
                    {nextPlantao.descricao && (
                      <div className="mt-2 pt-1.5 border-t border-white/10 text-[10px] text-slate-300 line-clamp-2">
                        <AutoLinkText text={nextPlantao.descricao} onOpenExternal={onOpenExternal} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-2 text-center text-xs text-blue-200">
                    Nenhuma escala de plantão cadastrada.
                  </div>
                )}
              </section>

              {/* Bloco Dedicado de Aniversariante(s) do Dia / Aniversários DVIS */}
              <div
                id="card-aniversariante-dvis"
                onClick={() => onNavigate('agenda')}
                className={`rounded-2xl p-4 shadow-md text-left cursor-pointer transition-all hover:scale-[1.01] relative overflow-hidden ${
                  aniversariantesHoje.length > 0
                    ? 'bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 text-white border-2 border-pink-400/70 shadow-pink-500/20'
                    : 'bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/30 text-slate-800 dark:text-slate-100 shadow-sm'
                }`}
              >
                {aniversariantesHoje.length > 0 ? (
                  /* Caso HÁ Aniversariante(s) HOJE */
                  <div>
                    <div className="flex items-center justify-between border-b border-white/20 pb-2 mb-2.5">
                      <div className="flex items-center gap-2 font-black uppercase text-xs tracking-wider">
                        <Cake className="w-4 h-4 text-amber-200 animate-bounce" />
                        <span>🎂 Aniversariante do Dia</span>
                      </div>
                      <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow animate-pulse">
                        HOJE É FESTA! 🎉
                      </span>
                    </div>

                    <div className="space-y-1.5 py-0.5">
                      {aniversariantesHoje.map((a) => (
                        <div key={a.id} className="flex items-center gap-2">
                          <span className="text-amber-200 text-base">🎈</span>
                          <div>
                            <div className="text-base font-black tracking-tight leading-snug drop-shadow-xs">
                              {a.nome_completo}
                            </div>
                            <span className="text-[10px] text-pink-100/90 font-medium">Equipe Vigilância Sanitária</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="text-[10px] text-pink-100 mt-2.5 pt-2 border-t border-white/15 flex items-center justify-between">
                      <span>Parabéns em nome de toda a equipe DVIS! 🥳</span>
                      <span className="font-bold underline text-amber-200 hover:text-white">Ver Agenda →</span>
                    </div>
                  </div>
                ) : (
                  /* Caso NÃO HÁ Aniversariante HOJE -> Mostra Próximos Aniversários e Mantém o Espaço Fixo */
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2.5">
                      <div className="flex items-center gap-1.5 font-black uppercase text-xs tracking-wider text-amber-600 dark:text-amber-400">
                        <Cake className="w-4 h-4 text-amber-500" />
                        <span>🎂 Aniversariante do Dia</span>
                      </div>
                    </div>

                    {proximosAniversariantes.length > 0 ? (
                      <div className="space-y-1.5">
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="text-amber-500">🎁</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                              {proximosAniversariantes[0].diffDays === 1
                                ? 'Próximo aniversário: Amanhã!'
                                : `Próximo aniversário em ${proximosAniversariantes[0].diffDays} dias`}
                            </span>
                          </span>
                          <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 shrink-0 ml-1">
                            {proximosAniversariantes[0].diaMes}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-1">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          Nenhum aniversariante registrado hoje. Clique para abrir a agenda de eventos da equipe.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mural de Recados */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-left">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider">
                      Mural de Recados
                    </h3>
                  </div>
                  {mural.length > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setMuralIndex((prev) => (prev - 1 + mural.length) % mural.length)}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[9px] font-black text-slate-400">
                        {muralIndex + 1}/{mural.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMuralIndex((prev) => (prev + 1) % mural.length)}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {mural.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">Nenhum aviso no momento.</p>
                ) : (
                  <div className="space-y-2">
                    {mural[muralIndex] && (
                      <div
                        key={mural[muralIndex].id}
                        className={`p-3 rounded-xl border text-xs text-left transition-all ${
                          mural[muralIndex].prioridade === 'ALTA'
                            ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
                            : mural[muralIndex].prioridade === 'URGENTE'
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                            : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-black uppercase tracking-tight text-[11px] flex items-center gap-1.5">
                            <span>📢</span> {mural[muralIndex].titulo}
                          </span>
                          <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase bg-white/70 dark:bg-slate-900/70">
                            {mural[muralIndex].prioridade}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed break-words opacity-90">
                          <AutoLinkText
                            text={mural[muralIndex].conteudo}
                            linkClassName="text-blue-700 dark:text-blue-300 underline font-bold"
                          />
                        </p>
                        <div className="mt-2 pt-1.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[9px] opacity-75">
                          <span>Por: {mural[muralIndex].autor}</span>
                          <span>{mural[muralIndex].data}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chat Interno da Equipe */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-left flex flex-col h-72">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider">
                      Chat Interno da Equipe
                    </h3>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Chat online"></span>
                </div>

                <div
                  ref={chatScrollRef}
                  className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs mb-2 max-h-48 scrollbar-thin"
                >
                  {chat.length === 0 ? (
                    <p className="text-slate-400 text-center py-6 text-[11px]">
                      Nenhuma mensagem enviada hoje. Inicie uma conversa!
                    </p>
                  ) : (
                    chat.map((msg) => {
                      const isMe = currentUser && msg.sender.includes(currentUser.nome_completo.split(' ')[0]);
                      const canDelete = isMaster || isMe;
                      return (
                        <div
                          key={msg.id}
                          className={`p-2 rounded-xl text-left transition group ${
                            isMe
                              ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 ml-3'
                              : 'bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 mr-3'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[9px] font-black uppercase truncate max-w-[120px] ${
                                  isMe
                                    ? 'text-blue-700 dark:text-blue-300'
                                    : 'text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                {msg.sender}
                              </span>
                              {msg.role && (
                                <span
                                  className={`text-[7px] font-extrabold px-1 rounded uppercase ${
                                    msg.role === 'MASTER' || msg.role === 'DIRETOR'
                                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}
                                >
                                  {msg.role}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[8px] text-slate-400 font-mono">
                                {msg.time}
                              </span>
                              {canDelete && onDeleteMessage && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteMessage(msg.id)}
                                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 dark:text-red-400 p-0.5 transition"
                                  title="Excluir mensagem"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-slate-700 dark:text-slate-200 text-[10px] leading-relaxed break-words">
                            <AutoLinkText
                              text={msg.text}
                              linkClassName="text-blue-600 dark:text-blue-400 hover:underline font-bold inline-flex items-center gap-0.5 break-all cursor-pointer"
                            />
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                <form
                  onSubmit={handleSendChat}
                  className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 mt-auto"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={
                      currentUser
                        ? `Mensagem como ${currentUser.nome_completo.split(' ')[0]}...`
                        : 'Digite sua mensagem interna...'
                    }
                    className="flex-1 py-1.5 px-3 text-[10px] border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-blue-500 outline-none transition"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2 rounded-xl font-bold text-xs flex items-center justify-center transition shadow-xs cursor-pointer shrink-0"
                    title="Enviar mensagem"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Rodapé Oficial da Divisão DVIS (Barra Total em Tom Azul Institucional, máx 3 linhas, fina e elegante) */}
      <footer className="w-full pt-2.5 pb-2.5 px-4 sm:px-6 bg-gradient-to-r from-blue-950 via-[#0d1b2e] to-slate-900 rounded-2xl border border-blue-600/40 shadow-lg text-slate-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 border-b border-blue-800/40 pb-1.5 text-center sm:text-left">
          <div className="flex items-center gap-2 font-black uppercase text-blue-300 tracking-wider text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
            <span className="text-white">Divisão de Vigilância Sanitária e Ambiental (DVIS)</span>
            <span className="text-blue-600 hidden md:inline">•</span>
            <span className="text-blue-300 font-bold hidden md:inline">Secretaria Municipal de Saúde</span>
          </div>
          <div className="text-[10px] text-blue-300/80 font-medium">
            Prefeitura Municipal de Balneário Camboriú / SC
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-[11px] text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span><strong className="text-white">Presencial:</strong> Av. Palestina, Nº 150 - Nações (88338-010)</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span><strong className="text-white">Atendimento:</strong> Seg a Sex, 07:00 às 19:00</span>
          </div>
          <div className="flex items-center justify-center sm:justify-end gap-3 text-slate-300">
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> (47) 3267-7000
            </span>
            <span className="text-blue-700">|</span>
            <a
              href="mailto:devs@bc.sc.gov.br"
              className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200 font-bold hover:underline"
            >
              <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> devs@bc.sc.gov.br
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
