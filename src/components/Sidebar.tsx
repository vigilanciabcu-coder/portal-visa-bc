import React from 'react';
import { PortalButton, UserProfile } from '../types';
import { ShieldCheck, Calendar, Microscope, Crown } from 'lucide-react';

interface SidebarProps {
  buttons: PortalButton[];
  currentView: string;
  currentUser: UserProfile | null;
  onNavigate: (view: 'home' | 'feiras' | 'agenda' | 'master' | 'fiscalizacao' | 'processos' | 'laboratorio') => void;
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
    currentUser?.nivel_acesso === 'MASTER (TUDO)';
  const todayDay = new Date().getDate();

  const visibleButtons = buttons.filter((b) => {
    if (b.somenteMaster || b.nome.toLowerCase().includes('teste')) {
      return isMaster;
    }
    return true;
  });

  const renderIcon = (b: PortalButton) => {
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

        {isMaster && (
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
