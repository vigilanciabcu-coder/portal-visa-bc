import React from 'react';
import { UserProfile, isUserMaster } from '../../types';
import { 
  Crown, 
  Building2, 
  Search, 
  ShieldCheck, 
  FileSignature, 
  Users, 
  BarChart3,
  Sparkles,
  Lightbulb,
  ArrowRight
} from 'lucide-react';

interface PortalProfileBannerProps {
  currentUser: UserProfile | null;
  canAccessFiscalDemandas: boolean;
  canAccessDiretorDemandas: boolean;
  onNavigate: (view: any) => void;
}

export const PortalProfileBanner: React.FC<PortalProfileBannerProps> = ({
  currentUser,
  canAccessFiscalDemandas,
  canAccessDiretorDemandas,
  onNavigate,
}) => {
  const userType = currentUser?.tipo_usuario || 'SERVIDOR';
  const isMaster = isUserMaster(currentUser);

  return (
    <div className="space-y-4 mb-4">
      {/* 1. SE FOR SERVIDOR MASTER COM ACESSO A DEMANDAS: BARRA UNIFICADA MEIO A MEIO */}
      {isMaster && userType === 'SERVIDOR' && (canAccessFiscalDemandas || canAccessDiretorDemandas) && (
        <div className="rounded-2xl overflow-hidden border-2 border-slate-700/60 shadow-xl grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-700/60 bg-slate-900">
          {/* METADE ESQUERDA: PAINEL MASTER & DIVISÃO DVIS (Gradiente Roxo / Dourado) */}
          <div
            onClick={() => onNavigate('master')}
            className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950 px-3.5 py-2.5 sm:px-4 sm:py-3 text-white flex items-center justify-between gap-3 cursor-pointer hover:bg-purple-900/30 transition group"
            title="Clique para acessar o Painel Master"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="bg-amber-400 text-slate-950 p-2 sm:p-2.5 rounded-xl shadow shrink-0 group-hover:scale-105 transition-transform">
                <Crown className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black uppercase text-xs sm:text-sm text-amber-300 truncate">
                    Painel Master & Divisão DVIS
                  </h3>
                  <span className="hidden xl:inline-block px-1.5 py-0.2 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded text-[9px] font-black uppercase tracking-wider">
                    Master
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 truncate max-w-[200px] sm:max-w-xs md:max-w-sm">
                  Operadores, Agenda Oficial, Mural & Permissões
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('master');
              }}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] px-3 py-1.5 rounded-xl uppercase shadow transition cursor-pointer shrink-0 flex items-center gap-1 active:scale-95 whitespace-nowrap"
            >
              <span>Acessar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* METADE DIREITA: CONTROLE OPERACIONAL DE DEMANDAS SANITÁRIAS (Gradiente Azul / Ardósia) */}
          <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 px-3.5 py-2.5 sm:px-4 sm:py-3 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-blue-600/30 text-blue-300 border border-blue-400/30 p-2 sm:p-2.5 rounded-xl shadow shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <div className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded text-[9px] font-black uppercase tracking-wider mb-0.5">
                  {canAccessDiretorDemandas ? 'Controle Operacional' : 'Área Fiscal'}
                </div>
                <h3 className="font-black uppercase text-xs sm:text-sm text-slate-100 truncate">
                  Demandas Sanitárias
                </h3>
              </div>
            </div>

            {/* Ações / Funções do Controle Operacional */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 justify-end">
              {canAccessFiscalDemandas && (
                <button
                  type="button"
                  onClick={() => onNavigate('demandas_fiscal')}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-900/60 border border-blue-500/50 hover:bg-blue-800/80 hover:border-blue-400 text-white font-black text-[11px] uppercase shadow transition flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                  title="Acessar Minhas Demandas & Ordens de Fiscalização"
                >
                  <FileSignature className="w-3.5 h-3.5 text-blue-300" />
                  <span>Demandas</span>
                </button>
              )}

              {canAccessDiretorDemandas && (
                <button
                  type="button"
                  onClick={() => onNavigate('demandas_diretor')}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-900/60 border border-purple-500/50 hover:bg-purple-800/80 hover:border-purple-400 text-white font-black text-[11px] uppercase shadow transition flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                  title="Gestão da Diretoria e Distribuição de Ordens"
                >
                  <Users className="w-3.5 h-3.5 text-purple-300" />
                  <span>Diretoria</span>
                </button>
              )}

              {canAccessDiretorDemandas && (
                <button
                  type="button"
                  onClick={() => onNavigate('demandas_diretor')}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 hover:bg-emerald-900/80 hover:border-emerald-400 text-emerald-200 font-black text-[11px] uppercase shadow transition flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                  title="Painel Executivo de Business Intelligence & Relatórios"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>BI Exec</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. CASO SEJA APENAS MASTER (SEM DEMANDAS DE DIRETOR OU FISCAL) */}
      {isMaster && userType === 'SERVIDOR' && !(canAccessFiscalDemandas || canAccessDiretorDemandas) && (
        <div
          onClick={() => onNavigate('master')}
          className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 p-3 sm:p-4 rounded-2xl border-2 border-amber-400/80 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl cursor-pointer hover:scale-[1.01] transition"
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

      {/* 3. BANNER CONTABILIDADE */}
      {userType === 'CONTABILIDADE' && (
        <div
          onClick={() => onNavigate('processos_lab')}
          className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 p-4 sm:p-5 rounded-2xl border-2 border-indigo-400 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl cursor-pointer hover:scale-[1.01] transition"
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

      {/* 4. BANNER CIDADAO & SERVIÇOS DO MUNÍCIPE */}
      {userType === 'CIDADAO' && (
        <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 p-4 sm:p-5 rounded-2xl border-2 border-emerald-400 text-white shadow-xl space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="bg-emerald-500 text-slate-950 p-3 rounded-2xl shadow-lg font-black">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/30 border border-emerald-400/40 rounded-md text-[10px] font-black uppercase text-emerald-300 mb-1">
                  🏛️ Portal do Munícipe & Ideias Inovadoras
                </div>
                <h3 className="font-black uppercase text-base sm:text-lg text-white">
                  Solicitar Serviços, Inovações Sanitárias & Acompanhar Processos
                </h3>
                <p className="text-xs text-emerald-200/90 max-w-2xl">
                  Abra novos chamados (alvarás, laudos de água potável, habite-se, defesas), acompanhe toda a tramitação em tempo real e interaja diretamente com os auditores fiscais da VISA.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => onNavigate('cidadao')}
                className="flex-1 sm:flex-none bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl uppercase shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Lightbulb className="w-4 h-4" />
                <span>Solicitar Serviços & Ideias</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('cidadao')}
                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2.5 rounded-xl uppercase shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Search className="w-4 h-4" />
                <span>Acompanhar Demandas</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. BANNER CONTRIBUINTE */}
      {userType === 'CONTRIBUINTE' && (
        <div
          onClick={() => onNavigate('processos_lab')}
          className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 p-4 sm:p-5 rounded-2xl border-2 border-blue-400 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl cursor-pointer hover:scale-[1.01] transition"
        >
          <div className="flex items-center gap-3.5">
            <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="text-left">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/30 border border-blue-400/40 rounded-md text-[10px] font-black uppercase text-blue-300 mb-1">
                🏢 Autoatendimento do Contribuinte
              </div>
              <h3 className="font-black uppercase text-base sm:text-lg text-white">
                Carteira de Processos & Alvará do Meu CNPJ
              </h3>
              <p className="text-xs text-blue-200">
                Acompanhe a tramitação sanitária, validade de licença, vistorias e notificações do seu estabelecimento em tempo real.
              </p>
            </div>
          </div>
          <button className="bg-blue-400 hover:bg-blue-300 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl uppercase shadow-md transition cursor-pointer shrink-0">
            Acessar Meus Processos →
          </button>
        </div>
      )}

      {/* 6. BANNER DEMANDAS FISCAIS & DIRETORIA (SERVIDOR NÃO-MASTER) */}
      {!isMaster && userType === 'SERVIDOR' && (canAccessFiscalDemandas || canAccessDiretorDemandas) && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-3 sm:p-4 rounded-2xl border-2 border-blue-500/50 shadow-xl text-left flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-[10px] font-black uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {canAccessDiretorDemandas ? 'Controle Operacional de Demandas Sanitárias' : 'Área Operacional de Fiscalização'}
            </div>
            <h3 className="font-black uppercase text-sm sm:text-base text-white">
              {canAccessDiretorDemandas ? 'Distribuição & Gestão de Ordens de Serviço' : 'Minhas Demandas & Ordens de Fiscalização'}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-300 leading-tight">
              {canAccessDiretorDemandas
                ? 'Acompanhe ordens de serviço por fiscal e setor, realize sorteio randômico e reatribua demandas.'
                : 'Acesse suas demandas de trabalho, prazos de vistoria sanitária e emita pareceres com assinatura digital.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto shrink-0">
            {canAccessFiscalDemandas && (
              <button
                type="button"
                onClick={() => onNavigate('demandas_fiscal')}
                className="px-3.5 py-2.5 rounded-xl bg-gradient-to-br from-blue-900/70 to-indigo-900/70 border border-blue-500/60 hover:border-blue-400 hover:bg-blue-900/90 transition-all text-left flex items-center justify-between gap-3 group cursor-pointer shadow-md hover:scale-[1.02]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-300 border border-blue-400/40 flex items-center justify-center shrink-0">
                    <FileSignature className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-wider text-blue-300 leading-none mb-0.5">
                      Área do Fiscal
                    </div>
                    <div className="font-black text-xs text-white uppercase leading-tight whitespace-nowrap">
                      📋 Minhas Demandas
                    </div>
                  </div>
                </div>
                <span className="text-blue-300 font-black text-xs group-hover:translate-x-1 transition-transform ml-1">
                  →
                </span>
              </button>
            )}

            {canAccessDiretorDemandas && (
              <button
                type="button"
                onClick={() => onNavigate('demandas_diretor')}
                className="px-3.5 py-2.5 rounded-xl bg-gradient-to-br from-purple-900/70 to-slate-900/70 border border-purple-500/60 hover:border-purple-400 hover:bg-purple-900/90 transition-all text-left flex items-center justify-between gap-3 group cursor-pointer shadow-md hover:scale-[1.02]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-600/30 text-purple-300 border border-purple-400/40 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-wider text-purple-300 leading-none mb-0.5">
                      Gestão da Diretoria
                    </div>
                    <div className="font-black text-xs text-white uppercase leading-tight whitespace-nowrap">
                      👔 Painel da Diretoria
                    </div>
                  </div>
                </div>
                <span className="text-purple-300 font-black text-xs group-hover:translate-x-1 transition-transform ml-1">
                  →
                </span>
              </button>
            )}

            {canAccessDiretorDemandas && (
              <button
                type="button"
                onClick={() => onNavigate('demandas_diretor')}
                className="px-3.5 py-2.5 rounded-xl bg-gradient-to-br from-emerald-950/80 to-teal-950/80 border border-emerald-500/60 hover:border-emerald-400 hover:bg-emerald-900/90 transition-all text-left flex items-center justify-between gap-3 group cursor-pointer shadow-md hover:scale-[1.02]"
                title="Acessar o Painel Executivo de Business Intelligence e Relatórios para a Prefeitura"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-300 border border-emerald-400/40 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-wider text-emerald-300 leading-none mb-0.5">
                      Prestação de Contas
                    </div>
                    <div className="font-black text-xs text-white uppercase leading-tight whitespace-nowrap">
                      📊 BI Executivo
                    </div>
                  </div>
                </div>
                <span className="text-emerald-300 font-black text-xs group-hover:translate-x-1 transition-transform ml-1">
                  →
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
