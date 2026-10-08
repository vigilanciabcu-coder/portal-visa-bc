import React, { useRef, useEffect } from 'react';
import { EscalaItem, UserProfile, RecadoMural, ChatMessage } from '../../types';
import { 
  FileCheck, 
  Search, 
  ChevronRight, 
  ExternalLink, 
  Calendar, 
  Info, 
  MessageSquare, 
  Send, 
  Trash2, 
  Cake, 
  Gift 
} from 'lucide-react';
import { AutoLinkText } from '../AutoLinkText';

interface PortalSidePanelProps {
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
}

export const PortalSidePanel: React.FC<PortalSidePanelProps> = ({
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
  setMuralIndex
}) => {
  const userType = currentUser?.tipo_usuario || 'SERVIDOR';
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chat]);

  const today = new Date();
  const todayISO = today.toISOString().split('T')[0];
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  // Plantão do Dia (Hoje ou Mais Próximo)
  const sortedEscalas = [...escala].sort((a, b) => a.data.localeCompare(b.data));
  const plantaoHoje = sortedEscalas.find((e) => e.data === todayISO);
  const proximoPlantao = sortedEscalas.find((e) => e.data >= todayISO);
  const plantaoExibido = plantaoHoje || proximoPlantao || sortedEscalas[0];

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput);
    setChatInput('');
  };

  // Aniversariantes do Mês
  const aniversariantesMes = users.filter((u) => {
    if (!u.data_nascimento) return false;
    const parts = u.data_nascimento.split('-');
    if (parts.length < 3) return false;
    return parseInt(parts[1], 10) - 1 === todayMonth;
  });

  return (
    <div className="w-full lg:w-[320px] flex flex-col gap-4 text-left">
      {userType === 'CIDADAO' ? (
        /* Painel Exclusivo do Cidadão */
        <div className="space-y-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-sm">
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
                className="flex items-center gap-2 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                onClick={() => onNavigate('cidadao')}
              >
                <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
                <span>Consulta de Regularidade Sanitária</span>
              </li>
              <li
                className="flex items-center gap-2 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                onClick={() => onOpenExternal('https://leismunicipais.com.br/legislacao-municipal/4710/leis-de-balneario-camboriu')}
              >
                <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
                <span>Legislação Sanitária Municipal</span>
              </li>
              <li
                className="flex items-center gap-2 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                onClick={() => onOpenExternal('https://balneariocamboriu.atende.net/')}
              >
                <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
                <span>Portal da Prefeitura Municipal</span>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        /* Painel dos Servidores e Contabilidade */
        <>
          {/* Card Plantão do Dia */}
          {plantaoExibido && (
            <div
              onClick={() => onNavigate('agenda')}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-blue-400 transition text-left group"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2 mb-2.5">
                <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1 tracking-wider">
                  <Calendar className="w-3.5 h-3.5" /> Plantão Sanitário
                </span>
                <span className="text-[10px] text-slate-400 group-hover:text-blue-500 font-bold">
                  Ver Agenda →
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-slate-800 dark:text-white uppercase">
                    {plantaoExibido.fiscal}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {plantaoExibido.periodo || 'Plantão Integral'} • {plantaoExibido.data.split('-').reverse().join('/')}
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    {plantaoHoje ? 'HOJE' : 'PRÓXIMO'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Mural de Recados Institucionais */}
          {mural && mural.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm text-left">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2 mb-2.5">
                <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1 tracking-wider">
                  <Info className="w-3.5 h-3.5" /> Mural DVIS
                </span>
                {mural.length > 1 && (
                  <span className="text-[10px] font-bold text-slate-400">
                    {muralIndex + 1} de {mural.length}
                  </span>
                )}
              </div>
              <div className="min-h-[50px] flex flex-col justify-center">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                  <AutoLinkText text={mural[muralIndex]?.texto || ''} />
                </p>
                <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Por: {mural[muralIndex]?.autor || 'Diretoria'}</span>
                  {mural.length > 1 && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMuralIndex((prev) => (prev - 1 + mural.length) % mural.length);
                        }}
                        className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px] hover:bg-slate-200 font-bold"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMuralIndex((prev) => (prev + 1) % mural.length);
                        }}
                        className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px] hover:bg-slate-200 font-bold"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Chat Interno da Equipe VISA */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[280px]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2 mb-2">
              <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5 tracking-wider">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Chat Operacional
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Conectado em tempo real" />
            </div>

            {/* Mensagens */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs no-scrollbar"
            >
              {chat.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-8">
                  Nenhuma mensagem recente. Envie uma mensagem para a equipe!
                </div>
              ) : (
                chat.map((m) => {
                  const isMine = m.usuario_id === currentUser?.id;
                  return (
                    <div
                      key={m.id}
                      className={`p-2 rounded-xl text-left ${
                        isMine
                          ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 ml-4'
                          : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {m.autor}
                        </span>
                        <div className="flex items-center gap-1">
                          <span>{m.hora || ''}</span>
                          {onDeleteMessage && (currentUser?.cargo?.includes('MASTER') || isMine) && (
                            <button
                              type="button"
                              onClick={() => onDeleteMessage(m.id)}
                              className="text-slate-400 hover:text-rose-500 ml-1"
                              title="Excluir mensagem"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-800 dark:text-slate-200 break-words leading-snug">
                        <AutoLinkText text={m.texto} />
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Form Envio */}
            <form onSubmit={handleSendChat} className="mt-2 flex gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escreva para a equipe..."
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 text-slate-800 dark:text-white"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition cursor-pointer shadow-xs shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Aniversariantes do Mês */}
          {aniversariantesMes.length > 0 && (
            <div className="bg-gradient-to-r from-pink-50 to-amber-50 dark:from-pink-950/30 dark:to-amber-950/30 rounded-2xl p-3 border border-pink-200 dark:border-pink-900/60 text-left text-xs space-y-1.5">
              <span className="text-[10px] font-black uppercase text-pink-700 dark:text-pink-400 flex items-center gap-1 tracking-wider">
                <Cake className="w-3.5 h-3.5" /> Aniversariantes do Mês
              </span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {aniversariantesMes.map((u) => {
                  const day = u.data_nascimento?.split('-')[2];
                  const isHoje = parseInt(day || '0', 10) === todayDay;
                  return (
                    <span
                      key={u.id}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        isHoje
                          ? 'bg-pink-600 text-white shadow-xs animate-bounce'
                          : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-pink-200 dark:border-pink-900'
                      }`}
                    >
                      <Gift className="w-3 h-3 text-pink-500" />
                      {u.nome_completo.split(' ')[0]} ({day})
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
