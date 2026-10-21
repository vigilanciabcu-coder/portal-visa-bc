import React from 'react';
import { EscalaItem, UserProfile, RecadoMural, ChatMessage } from '../../types';
import { PORTAL_BUTTONS_CONFIG } from './portalButtonsData';
import { PortalButtonsGrid } from './PortalButtonsGrid';
import { PortalProfileBanner } from './PortalProfileBanner';
import { PortalSidePanel } from './PortalSidePanel';
import { Building2, Lightbulb, Sparkles, Search } from 'lucide-react';

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
  onOpenIdeiasModal?: () => void;
  onOpenSolicitacaoMunicipe?: () => void;
  onOpenAcompanhamentoMunicipe?: () => void;
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
  canAccessDiretorDemandas,
  onOpenIdeiasModal,
  onOpenSolicitacaoMunicipe,
  onOpenAcompanhamentoMunicipe
}) => {
  const userType = currentUser?.tipo_usuario || 'SERVIDOR';
  const todayDay = new Date().getDate();

  return (
    <div className="flex flex-col gap-5 text-left">
      {/* 🌟 BANNER DE DESTAQUE SUPERIOR: PORTAL DO MUNÍCIPE & BANCO DE IDEIAS SANITÁRIAS */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-slate-950 p-4 sm:p-6 rounded-3xl shadow-xl border-2 border-amber-300 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950/20 text-slate-950 rounded-full text-xs font-black uppercase tracking-wider">
              <span>💡</span> Inovação Pública • Balneário Camboriú
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950">
              Portal do Munícipe: Solicitar Serviços & Ideias Inovadoras
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
              O munícipe solicita alvarás, vistorias, laudos de água e defesas online, acompanhando tudo em tempo real. Pelo outro lado, os servidores analisam, tramitam e interagem com acesso imediato ao histórico de vigilância (alvarás, fiscalizações e laudos).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto">
            <button
              type="button"
              onClick={onOpenIdeiasModal}
              className="px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-amber-300 hover:text-amber-200 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer ring-2 ring-slate-900/40"
              title="Visualizar as 8 Ideias Inovadoras Sanitárias"
            >
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>Ver 8 Ideias Inovadoras</span>
            </button>

            <button
              type="button"
              onClick={onOpenSolicitacaoMunicipe}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer ring-2 ring-white/60"
              title="Abrir formulário de solicitação de serviço"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Solicitar Serviço</span>
            </button>

            <button
              type="button"
              onClick={onOpenAcompanhamentoMunicipe}
              className="px-4 py-2.5 bg-amber-900/30 hover:bg-amber-900/50 text-slate-950 border border-slate-950/30 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              title="Acompanhar demandas pelo protocolo ou CPF"
            >
              <Search className="w-4 h-4 text-slate-950" />
              <span>Acompanhar Demanda</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🌟 MÓDULO CAPA: BANNER INSTITUCIONAL & CONTEXTO */}
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
