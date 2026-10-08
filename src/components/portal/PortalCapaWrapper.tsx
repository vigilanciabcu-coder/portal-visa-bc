import React from 'react';
import { EscalaItem, UserProfile, RecadoMural, ChatMessage } from '../../types';
import { PORTAL_BUTTONS_CONFIG } from './portalButtonsData';
import { PortalButtonsGrid } from './PortalButtonsGrid';
import { PortalProfileBanner } from './PortalProfileBanner';
import { PortalSidePanel } from './PortalSidePanel';
import { Building2 } from 'lucide-react';

interface PortalCapaWrapperProps {
  currentUser: UserProfile | null;
  escala: EscalaItem[];
  users: UserProfile[];
  mural: RecadoMural[];
  chat: ChatMessage[];
  chatInput: string;
  setChatInput: (val: string) => void;
  onSendMessage: (text: string) => void;
  onDeleteMessage?: (id: string) => void;
  onNavigate: (view: any) => void;
  onOpenExternal: (url: string) => void;
  muralIndex: number;
  setMuralIndex: React.Dispatch<React.SetStateAction<number>>;
  canAccessFiscalDemandas: boolean;
  canAccessDiretorDemandas: boolean;
}

export const PortalCapaWrapper: React.FC<PortalCapaWrapperProps> = ({
  currentUser,
  escala,
  users,
  mural,
  chat,
  chatInput,
  setChatInput,
  onSendMessage,
  onDeleteMessage,
  onNavigate,
  onOpenExternal,
  muralIndex,
  setMuralIndex,
  canAccessFiscalDemandas,
  canAccessDiretorDemandas
}) => {
  const userType = currentUser?.tipo_usuario || 'SERVIDOR';
  const todayDay = new Date().getDate();

  return (
    <div className="flex flex-col gap-5 text-left">
      {/* 🌟 MÓDULO CAPA SUPERIOR: BANNER INSTITUCIONAL & CONTEXTO */}
      <PortalProfileBanner
        currentUser={currentUser}
        canAccessFiscalDemandas={canAccessFiscalDemandas}
        canAccessDiretorDemandas={canAccessDiretorDemandas}
        onNavigate={onNavigate}
      />

      {/* 🌟 LAYOUT PRINCIPAL DO PORTAL: GRADE DE MÓDULOS + PAINEL COMPLEMENTAR */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Coluna Central: Título da Seção & Grade Modular de Botões */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div>
              <h1 className="text-lg md:text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                {userType === 'CIDADAO'
                  ? 'Serviços Públicos e Autoatendimento'
                  : userType === 'CONTABILIDADE'
                  ? 'Módulos e Acessos Contábeis'
                  : userType === 'CONTRIBUINTE'
                  ? 'Serviços do Contribuinte & Alvará'
                  : 'Serviços e Módulos Operacionais VISA'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {userType === 'CIDADAO'
                  ? 'Acesse os serviços oficiais da Vigilância Sanitária de Balneário Camboriú.'
                  : userType === 'CONTABILIDADE'
                  ? 'Ferramentas de integração e consulta para escritórios contábeis credenciados.'
                  : userType === 'CONTRIBUINTE'
                  ? 'Acompanhe alvarás, processos, requerimentos e laudos do seu CNPJ.'
                  : 'Selecione um módulo operacional para acesso direto às ferramentas municipais.'}
              </p>
            </div>
          </div>

          {/* Grade Modular de Todos os Botões */}
          <PortalButtonsGrid
            buttons={PORTAL_BUTTONS_CONFIG}
            currentUser={currentUser}
            onNavigate={onNavigate}
            onOpenExternal={onOpenExternal}
            todayDay={todayDay}
          />
        </div>

        {/* Coluna Lateral Modular: Plantão, Mural, Chat, Aniversariantes */}
        <PortalSidePanel
          currentUser={currentUser}
          escala={escala}
          users={users}
          mural={mural}
          chat={chat}
          chatInput={chatInput}
          setChatInput={setChatInput}
          onSendMessage={onSendMessage}
          onDeleteMessage={onDeleteMessage}
          onNavigate={onNavigate}
          onOpenExternal={onOpenExternal}
          muralIndex={muralIndex}
          setMuralIndex={setMuralIndex}
        />
      </div>
    </div>
  );
};
