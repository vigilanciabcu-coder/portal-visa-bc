import React, { useState, useEffect } from 'react';
import { PortalButton, EscalaItem, UserProfile, RecadoMural, ChatMessage, userHasAccessToPage, isUserMaster } from '../types';
import { PortalCapaWrapper } from './portal/PortalCapaWrapper';

interface HomeViewProps {
  buttons: PortalButton[];
  escala: EscalaItem[];
  users: UserProfile[];
  mural: RecadoMural[];
  chat: ChatMessage[];
  currentUser: UserProfile | null;
  onNavigate: (view: 'home' | 'demandas' | 'demandas_fiscal' | 'demandas_diretor' | 'feiras' | 'agenda' | 'master' | 'fiscalizacao' | 'processos' | 'processos_lab' | 'laboratorio' | 'cidadao' | 'portal_contador' | 'cnae' | 'telefone' | 'pasta_visa' | 'alvara_visa') => void;
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

  // Auto-rotate mural every 6 seconds when there are multiple items
  useEffect(() => {
    if (mural.length <= 1) return;
    const interval = setInterval(() => {
      setMuralIndex((prev) => (prev + 1) % mural.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [mural.length]);

  const isMaster = isUserMaster(currentUser);

  // Acesso a Minhas Demandas (Fiscal)
  const canAccessFiscalDemandas =
    isMaster ||
    userHasAccessToPage(currentUser, 'demandas_fiscal') ||
    userHasAccessToPage(currentUser, 'demandas');

  // Acesso a Gestão da Diretoria (Apenas Diretores, Master ou permissão explícita)
  const canAccessDiretorDemandas =
    isMaster ||
    userHasAccessToPage(currentUser, 'demandas_diretor');

  return (
    <PortalCapaWrapper
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
      canAccessFiscalDemandas={canAccessFiscalDemandas}
      canAccessDiretorDemandas={canAccessDiretorDemandas}
    />
  );
};
