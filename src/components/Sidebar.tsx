import React from 'react';
import { PortalButton, UserProfile } from '../types';
import { ShieldCheck, Calendar, Microscope, Crown, User, Building2, Search, FileText, FileSpreadsheet, PhoneCall } from 'lucide-react';

interface SidebarProps {
  buttons: PortalButton[];
  currentView: string;
  currentUser: UserProfile | null;
  onNavigate: (view: 'home' | 'feiras' | 'agenda' | 'master' | 'fiscalizacao' | 'processos' | 'processos_lab' | 'laboratorio' | 'cidadao' | 'portal_contador' | 'cnae' | 'telefone') => void;
  onOpenExternal: (url: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  buttons,
  currentView,
  currentUser,
  onNavigate,
  onOpenExternal,
}) => {
  const isMaster = 
    currentUser?.nivel_acesso?.toUpperCase().includes('MASTER') ||
    currentUser?.nivel_acesso === 'MASTER (TUDO)' ||
    currentUser?.cargo === 'MASTER ADM';

  const isLabUser =
    isMaster ||
    currentUser?.nivel_acesso === 'VISA (LABORATÓRIO)' ||
    currentUser?.setor?.toUpperCase().includes('LAB') ||
    currentUser?.cargo?.toUpperCase().includes('LAB');

  const todayDay = new Date().getDate();
  const userType = currentUser?.tipo_usuario || 'SERVIDOR';

  const visibleButtons = buttons.filter((b) => {
    // Verificação de perfis permitidos (tipo de usuário)
    if (b.perfisPermitidos && b.perfisPermitidos.length > 0) {
      if (!b.perfisPermitidos.includes(userType)) {
        return false;
      }
    } else {
      // Se não especificado e o usuário for Cidadão ou Contabilidade, oculta ferramentas exclusivas de servidores
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
      return isMaster;
    }
    return true;
  });

  const renderIcon = (b: PortalButton) => {
    if (b.view === 'cidadao' || b.id === 'cidadao_view') {
      return <Search className="w-6 h-6 text-emerald-400" />;
    }
    if (b.view === 'processos_lab' || b.id === 'tproc_lab' || b.id === 'contab_carteira') {
      return <Building2 className="w-6 h-6 text-indigo-400" />;
    }
    if (b.img === 'shield') {
      return <ShieldCheck className="w-6 h-6 text-emerald-400" />;
    }
    if (b.img === 'calendar') {
      return (
        <div className="sidebar-cal-icon">
          <div className="sidebar-cal-header"></div>
          <span className="sidebar-cal-day">{todayDay}</span>
        </div>
      );
    }
    if (b.img === 'tent') {
      return (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-amber-400">
          <path d="M12 2L2 7v2h20V7L12 2zm-7.5 9v11h3V11h-3zm6 0v11h3V11h-3zm6 0v11h3V11h-3z" />
        </svg>
      );
    }
    if (b.img === 'lab-icon') {
      return <Microscope className="w-6 h-6 text-cyan-400" />;
    }
    if (b.view === 'cnae' || b.img === 'cnae-icon' || b.id === 'cnae_btn') {
      return <FileSpreadsheet className="w-6 h-6 text-indigo-400" />;
    }
    if (b.view === 'telefone' || b.id === 'telefone_btn' || b.img === 'phone-icon') {
      return <PhoneCall className="w-6 h-6 text-blue-400" />;
    }
    if (b.img === 'alvara' || b.id === 'alva') {
      return (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none">
          <path d="M4 4a2 2 0 0 1 2-2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
          <polyline points="14 2 14 8 20 8" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
          <circle cx="12" cy="14" r="3.5" fill="#10b981" stroke="#34d399" strokeWidth="1" />
          <path d="m10.5 14 1 1 2-2" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    if (b.id === 'pref' || b.img.includes('brasao')) {
      return <img src={b.img} alt={b.nome} className="w-8 h-8 max-w-none object-contain scale-125" />;
    }
    return <img src={b.img} alt={b.nome} className="w-6 h-6 object-contain" />;
  };

  return (
    <aside className="sidebar h-full flex flex-col py-4 shadow-xl bg-slate-900 border-r border-slate-800">
      <nav id="sidebar-nav" className="flex-1 w-full space-y-1 px-1.5 text-white">
        {visibleButtons.map((b) => {
          const isActive = b.view && currentView === b.view;
          return (
            <button
              key={b.id}
              onClick={() => {
                if (b.acao === 'link') {
                  onOpenExternal(b.url);
                } else if (b.view) {
                  onNavigate(b.view);
                }
              }}
              className={`w-full flex items-center py-1.5 px-2 rounded-lg transition cursor-pointer text-xs ${
                isActive
                  ? 'bg-blue-600 text-white font-bold'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
              title={b.nome}
            >
              <div className="w-8 flex justify-center flex-shrink-0">
                {renderIcon(b)}
              </div>
              <span className="sidebar-text">{b.nome}</span>
            </button>
          );
        })}

        {isMaster && userType === 'SERVIDOR' && (
          <div className="mt-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => onNavigate('master')}
              className={`w-full flex items-center py-1.5 px-2 rounded-lg transition cursor-pointer text-xs ${
                currentView === 'master'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'hover:bg-slate-800 text-purple-300'
              }`}
              title="Painel Master / Diretor"
            >
              <div className="w-8 flex justify-center flex-shrink-0">
                <Crown className="w-6 h-6 text-amber-400" />
              </div>
              <span className="sidebar-text font-black">PAINEL MASTER</span>
            </button>
          </div>
        )}
      </nav>
    </aside>
  );
};

