import React, { useState } from 'react';
import { PortalButtonDef, PortalCategoria, CATEGORIAS_PORTAL_LABELS } from './portalButtonsData';
import { PortalButtonCard } from './PortalButtonCard';
import { UserProfile, isUserMaster } from '../../types';
import { Filter } from 'lucide-react';

interface PortalButtonsGridProps {
  buttons: PortalButtonDef[];
  currentUser: UserProfile | null;
  onNavigate: (view: any) => void;
  onOpenExternal: (url: string) => void;
  todayDay?: number;
}

export const PortalButtonsGrid: React.FC<PortalButtonsGridProps> = ({
  buttons,
  currentUser,
  onNavigate,
  onOpenExternal,
  todayDay
}) => {
  const [categoriaAtiva, setCategoriaAtiva] = useState<PortalCategoria>('TODOS');
  const userType = currentUser?.tipo_usuario || 'SERVIDOR';
  const isMaster = isUserMaster(currentUser);

  // Filtragem por permissão de usuário
  const allowedButtons = buttons.filter((b) => {
    // 1. Somente Master
    if (b.somenteMaster && !isMaster) return false;

    // 2. Perfis permitidos
    if (b.perfisPermitidos && b.perfisPermitidos.length > 0) {
      if (!b.perfisPermitidos.includes(userType)) return false;
    }

    // 3. Permissão explícita por página individual para Servidor
    if (userType === 'SERVIDOR' && !isMaster && b.view) {
      if (currentUser?.paginas_permitidas && currentUser.paginas_permitidas.length > 0) {
        // Se possui páginas específicas configuradas, respeita a lista
        if (!currentUser.paginas_permitidas.includes(b.view) && b.view !== 'home' && b.view !== 'cidadao' && b.view !== 'alvara_visa') {
          return false;
        }
      }
    }

    return true;
  });

  // Filtragem por Categoria selecionada
  const filteredButtons = allowedButtons.filter((b) => {
    if (categoriaAtiva === 'TODOS') return true;
    return b.categoria_portal === categoriaAtiva;
  });

  // Categorias que possuem pelo menos 1 botão permitido para este perfil
  const categoriasDisponiveis = (Object.keys(CATEGORIAS_PORTAL_LABELS) as PortalCategoria[]).filter((cat) => {
    if (cat === 'TODOS') return true;
    return allowedButtons.some((b) => b.categoria_portal === cat);
  });

  const handleCardClick = (b: PortalButtonDef) => {
    if (b.acao === 'link') {
      onOpenExternal(b.url);
    } else if (b.view) {
      onNavigate(b.view);
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Filtros de Módulos (Visual, Rápida e Intuitiva) */}
      {categoriasDisponiveis.length > 2 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5" /> Módulos:
          </span>
          {categoriasDisponiveis.map((cat) => {
            const info = CATEGORIAS_PORTAL_LABELS[cat];
            const isActive = categoriaAtiva === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaAtiva(cat)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-1 ring-blue-400'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-slate-600'
                }`}
              >
                <span>{info.icon}</span>
                <span>{info.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Grade de Botões Modularizada */}
      <div className="grid-portal">
        {filteredButtons.map((b) => (
          <PortalButtonCard
            key={b.id}
            button={b}
            onClick={() => handleCardClick(b)}
            todayDay={todayDay}
          />
        ))}
      </div>
    </div>
  );
};
