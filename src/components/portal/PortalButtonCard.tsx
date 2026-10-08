import React from 'react';
import { PortalButtonDef } from './portalButtonsData';
import { 
  ShieldCheck, 
  FileSignature, 
  Users, 
  FolderArchive, 
  Search, 
  Building2, 
  FileSpreadsheet, 
  PhoneCall, 
  ExternalLink 
} from 'lucide-react';

interface PortalButtonCardProps {
  button: PortalButtonDef;
  onClick: () => void;
  todayDay?: number;
}

export const PortalButtonCard: React.FC<PortalButtonCardProps> = ({
  button: b,
  onClick,
  todayDay = new Date().getDate()
}) => {
  const renderCardGraphic = () => {
    if (b.view === 'demandas_fiscal' || b.id === 'demandas_fiscal' || b.img === 'demandas-fiscal') {
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md">
            <FileSignature className="w-6 h-6" />
          </div>
          <span className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase shadow">
            FISCAL
          </span>
        </div>
      );
    }
    if (b.view === 'demandas_diretor' || b.id === 'demandas_diretor' || b.img === 'demandas-diretor') {
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-700 via-purple-800 to-indigo-700 flex items-center justify-center text-white shadow-md">
            <Users className="w-6 h-6" />
          </div>
          <span className="absolute -bottom-1 -right-1 bg-purple-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase shadow">
            DIRETORIA
          </span>
        </div>
      );
    }
    if (b.view === 'pasta_visa' || b.id === 'pasta_visa' || b.img === 'folder-archive') {
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-600 to-yellow-500 flex items-center justify-center text-white shadow-md">
            <FolderArchive className="w-6 h-6" />
          </div>
          <span className="absolute -bottom-1 -right-1 bg-amber-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase shadow">
            ADM
          </span>
        </div>
      );
    }
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
    if (b.img === 'alvara' || b.id === 'alva' || b.view === 'alvara_visa') {
      return (
        <div className="relative flex items-center justify-center">
          <svg viewBox="0 0 64 64" className="h-12 w-12 drop-shadow-md">
            <defs>
              <linearGradient id={`alvaraGrad-${b.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              <linearGradient id={`paperGrad-${b.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#f8fafc" />
              </linearGradient>
              <linearGradient id={`sealGrad-${b.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
            </defs>
            <rect x="9" y="6" width="46" height="52" rx="4" fill={`url(#paperGrad-${b.id})`} stroke="#cbd5e1" strokeWidth="1.5" />
            <path d="M9 10 C9 7.8 10.8 6 13 6 L51 6 C53.2 6 55 7.8 55 10 L55 16 L9 16 Z" fill={`url(#alvaraGrad-${b.id})`} />
            <circle cx="16" cy="11" r="1.5" fill="#fef3c7" />
            <circle cx="48" cy="11" r="1.5" fill="#fef3c7" />
            <rect x="15" y="21" width="34" height="2.5" rx="1.25" fill="#94a3b8" />
            <rect x="15" y="26" width="24" height="2" rx="1" fill="#cbd5e1" />
            <rect x="15" y="31" width="28" height="2" rx="1" fill="#cbd5e1" />
            <g transform="translate(34, 34)">
              <path d="M6 14 L10 22 L14 14" fill="#047857" />
              <path d="M12 14 L16 22 L20 14" fill="#065f46" />
              <circle cx="13" cy="11" r="9" fill={`url(#sealGrad-${b.id})`} stroke="#34d399" strokeWidth="1.5" />
              <path d="M9 11 L12 14 L17 8.5" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
        </div>
      );
    }
    if (b.id === 'pref' || (b.img && b.img.includes('brasao'))) {
      return <img src={b.img} alt={b.nome} className="h-16 max-h-16 w-auto object-contain scale-125 transition-transform" />;
    }
    return <img src={b.img} alt={b.nome} className="h-12 w-auto object-contain" />;
  };

  const getBorderHighlightClass = () => {
    if (b.view === 'demandas_fiscal' || b.id === 'demandas_fiscal') {
      return 'border-2 border-blue-500 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/20';
    }
    if (b.view === 'demandas_diretor' || b.id === 'demandas_diretor') {
      return 'border-2 border-purple-500 dark:border-purple-500 bg-purple-50/50 dark:bg-purple-950/20';
    }
    if (b.view === 'alvara_visa' || b.id === 'alvara_visa') {
      return 'border-2 border-amber-500 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-950/20';
    }
    if (b.view === 'fiscalizacao') {
      return 'border-2 border-emerald-500 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20';
    }
    if (b.id === 'tproc' || b.id === 'tproc_lab' || b.id === 'setores') {
      return 'border-2 border-indigo-500 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20';
    }
    return '';
  };

  return (
    <div
      onClick={onClick}
      title={b.descricao || b.nome}
      className={`card-app relative group transition-all duration-200 hover:scale-[1.02] cursor-pointer select-none ${getBorderHighlightClass()}`}
    >
      {/* Badge Superior */}
      {b.badgetext && (
        <span className="absolute top-1.5 right-1.5 bg-amber-500 text-slate-950 text-[8.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow">
          {b.badgetext}
        </span>
      )}

      {/* Ícone de link externo para links */}
      {b.acao === 'link' && !b.badgetext && (
        <span className="absolute top-1.5 right-1.5 text-slate-400 group-hover:text-blue-500 transition-colors">
          <ExternalLink className="w-3 h-3" />
        </span>
      )}

      <div className="flex justify-center items-center h-12 w-full">
        {renderCardGraphic()}
      </div>

      <h3 className="card-title text-center px-1 font-bold">
        {b.nome}
      </h3>
    </div>
  );
};
