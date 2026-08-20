import React, { useState } from 'react';
import { UserProfile } from '../types';
import { ChevronDown, LogOut, Key, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  currentUser: UserProfile | null;
  users: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  onOpenTrocaSenha: () => void;
  onLogout: () => void;
  onToggleDarkMode: () => void;
  onGoHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  users,
  onSelectUser,
  onOpenTrocaSenha,
  onLogout,
  onToggleDarkMode,
  onGoHome,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="h-16 md:h-20 bg-white dark:bg-slate-900 border-b dark:border-slate-800 grid grid-cols-[auto_1fr_auto] md:grid-cols-3 items-center px-3 md:px-6 z-50 shrink-0 shadow-xs relative">
      {/* Logos Left */}
      <div className="flex items-center space-x-2 md:space-x-3 text-left">
        <button
          type="button"
          onClick={onGoHome}
          title="Prefeitura Municipal de Balneário Camboriú - Início"
          className="cursor-pointer bg-transparent border-0 p-0 flex items-center justify-center outline-none focus:outline-none"
        >
          <img
            src="https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/brasao__1_-removebg-preview%20(1).avif"
            alt="Brasão Oficial - Prefeitura de Balneário Camboriú"
            className="h-13 sm:h-15 md:h-16 max-h-[62px] w-auto object-contain drop-shadow-sm hover:scale-105 transition-transform duration-200"
          />
        </button>
        <div className="h-9 md:h-10 w-[1.5px] bg-slate-200 dark:bg-slate-700"></div>
        <button
          type="button"
          onClick={onGoHome}
          title="Diretoria de Vigilância Sanitária - DVIS"
          className="cursor-pointer bg-transparent border-0 p-0 flex items-center justify-center outline-none focus:outline-none"
        >
          <img
            src="https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/DVIS.2.avif"
            alt="Diretoria de Vigilância Sanitária - DVIS"
            className="h-10 sm:h-12 md:h-13 max-h-[52px] w-auto object-contain drop-shadow-sm hover:scale-105 transition-transform duration-200"
          />
        </button>
      </div>

      {/* Title Center - Fonte Maior e Mais Destacada */}
      <div className="flex flex-col items-center justify-center text-center px-2">
        <h1 className="font-black text-blue-900 dark:text-blue-400 uppercase text-xs sm:text-base md:text-xl lg:text-2xl tracking-tight leading-tight whitespace-nowrap drop-shadow-2xs">
          Vigilância Sanitária e Ambiental
        </h1>
      </div>

      {/* User Info & Theme Right */}
      <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 relative">
        <div
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="cursor-pointer group bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50/80 dark:hover:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center gap-2 shadow-2xs hover:shadow-xs"
          title="Clique para alterar senha ou sair do sistema"
        >
          <div className="text-right">
            {/* Nome Completo do Servidor */}
            <p className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center justify-end gap-1">
              {currentUser ? currentUser.nome_completo : 'NENHUM USUÁRIO LOGADO'}
              <ChevronDown className="w-3 h-3 text-blue-600 dark:text-blue-400 group-hover:translate-y-0.5 transition-transform" />
            </p>
            {/* Função / Cargo e Matrícula */}
            <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center justify-end gap-1">
              <span>{currentUser ? currentUser.cargo : 'VISA BC'}</span>
              {currentUser?.matricula && <span>• MAT. {currentUser.matricula}</span>}
            </p>
          </div>

          {/* Botão Azul com Inicial do Servidor */}
          <div className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center uppercase shadow-xs group-hover:scale-105 transition shrink-0">
            {currentUser ? currentUser.nome_completo.charAt(0) : '?'}
          </div>
        </div>

        {/* Botão Tema Claro / Escuro após o Servidor */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          title="Alternar Tema Claro / Escuro"
          className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-amber-400 border border-slate-200 dark:border-slate-700 transition shadow-2xs hover:shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <Sun className="w-4 h-4 hidden dark:block text-amber-400" />
          <Moon className="w-4 h-4 block dark:hidden text-slate-700" />
          <span className="hidden md:inline text-[11px] font-black uppercase text-slate-700 dark:text-slate-200">
            Tema
          </span>
        </button>

        {/* Dropdown Menu ao clicar no Perfil */}
        {dropdownOpen && (
          <div className="absolute right-0 top-12 md:top-14 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[1000] p-2.5 text-left space-y-2">
            {/* Info do usuário logado */}
            {currentUser && (
              <div className="px-2.5 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700/80 mb-1">
                <p className="text-[9px] font-black uppercase text-slate-400">Servidor Conectado</p>
                <p className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase truncate">{currentUser.nome_completo}</p>
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                  {currentUser.cargo} {currentUser.matricula ? `• Mat. ${currentUser.matricula}` : ''}
                </p>
              </div>
            )}

            {/* Direct Actions: Alterar Senha e Sair */}
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenTrocaSenha();
                }}
                className="w-full p-2.5 rounded-xl bg-blue-50 dark:bg-slate-700/60 hover:bg-blue-100 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 font-extrabold text-xs flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                  <Key className="w-4 h-4" />
                </div>
                <span>Alterar Minha Senha</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onLogout();
                }}
                className="w-full p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-extrabold text-xs flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="p-1.5 bg-red-600 text-white rounded-lg">
                  <LogOut className="w-4 h-4" />
                </div>
                <span>Sair / Deslogar do Sistema</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

