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

  // Helper para renderizar o Mural DVIS Oficial de forma padronizada e completa
  const renderMural = () => {
    const activeMural = mural && mural.length > 0 ? mural : [];
    if (activeMural.length === 0) {
      return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm text-left">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2 mb-2">
            <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1 tracking-wider">
              <Info className="w-3.5 h-3.5" /> Mural DVIS
            </span>
          </div>
          <p className="text-xs text-slate-400 py-3 text-center">Nenhum aviso no momento no mural.</p>
        </div>
      );
    }

    const safeIndex = muralIndex % activeMural.length;
    const item = activeMural[safeIndex] || activeMural[0];
    const itemTexto = item?.conteudo || (item as any)?.texto || (item as any)?.mensagem || '';
    const itemTitulo = item?.titulo || 'Comunicado Oficial DVIS';
    const isUrgente = item?.prioridade === 'URGENTE' || (item as any)?.prioridade === 'ALTA';
    const isAlerta = item?.prioridade === 'ALERTA';

    return (
      <div
        className={`rounded-2xl p-4 border shadow-sm text-left transition-all ${
          isUrgente
            ? 'bg-red-50/80 dark:bg-red-950/40 border-red-200 dark:border-red-900/60'
            : isAlerta
            ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2 mb-2.5">
          <span
            className={`text-[10px] font-black uppercase flex items-center gap-1 tracking-wider ${
              isUrgente
                ? 'text-red-600 dark:text-red-400'
                : isAlerta
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            <Info className="w-3.5 h-3.5" /> Mural DVIS
          </span>
          <div className="flex items-center gap-2">
            {item?.prioridade && (
              <span
                className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                  isUrgente
                    ? 'bg-red-600 text-white animate-pulse'
                    : isAlerta
                    ? 'bg-amber-500 text-white'
                    : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                }`}
              >
                {item.prioridade}
              </span>
            )}
            {activeMural.length > 1 && (
              <span className="text-[10px] font-bold text-slate-400">
                {safeIndex + 1}/{activeMural.length}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          {itemTitulo && (
            <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-1.5 leading-snug">
              <span>📢</span>
              <span>{itemTitulo}</span>
            </h5>
          )}
          <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200 leading-relaxed break-words">
            <AutoLinkText
              text={itemTexto}
              linkClassName="text-blue-600 dark:text-blue-400 hover:underline font-bold inline-flex items-center gap-0.5"
            />
          </p>
        </div>

        <div className="mt-3 pt-2 border-t border-black/5 dark:border-white/5 text-[10px] text-slate-400 flex items-center justify-between">
          <span className="truncate max-w-[190px]">
            Por: <strong className="text-slate-600 dark:text-slate-300">{item?.autor || 'Diretoria'}</strong> {item?.data ? `• ${item.data}` : ''}
          </span>
          {activeMural.length > 1 && (
            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMuralIndex((prev) => (prev - 1 + activeMural.length) % activeMural.length);
                }}
                className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded text-[9px] font-bold cursor-pointer transition"
                title="Aviso Anterior"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMuralIndex((prev) => (prev + 1) % activeMural.length);
                }}
                className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded text-[9px] font-bold cursor-pointer transition"
                title="Próximo Aviso"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

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

          {/* Mural DVIS Oficial para Cidadãos */}
          {renderMural()}
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
          {renderMural()}

          {/* Chat Interno da Equipe VISA */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[300px]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2 mb-2">
              <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5 tracking-wider">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Chat Operacional
              </span>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Conectado em tempo real" />
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Ativo</span>
              </div>
            </div>

            {/* Mensagens */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs no-scrollbar min-h-0"
            >
              {chat.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-8">
                  Nenhuma mensagem recente. Envie uma mensagem para a equipe!
                </div>
              ) : (
                chat.map((m) => {
                  const senderName = m.sender || (m as any).autor || 'Operador';
                  const messageText = m.text || (m as any).texto || (m as any).mensagem || '';
                  const messageTime = m.time || (m as any).hora || '';
                  const messageRole = m.role || (m as any).cargo;
                  const isMine = Boolean(
                    (currentUser && ((m.perfil_id && m.perfil_id === currentUser.id) || ((m as any).usuario_id && (m as any).usuario_id === currentUser.id))) ||
                    (currentUser && senderName && senderName.toLowerCase().includes(currentUser.nome_completo.split(' ')[0].toLowerCase()))
                  );
                  const canDelete = Boolean(
                    onDeleteMessage && (currentUser?.cargo?.includes('MASTER') || isMine)
                  );

                  return (
                    <div
                      key={m.id}
                      className={`p-2 rounded-xl text-left transition group ${
                        isMine
                          ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 ml-3'
                          : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mr-3'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                        <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                          <span className={`font-bold uppercase truncate ${
                            isMine ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {senderName}
                          </span>
                          {messageRole && (
                            <span className={`text-[7px] font-extrabold px-1 rounded uppercase shrink-0 ${
                              messageRole === 'MASTER' || messageRole === 'DIRETOR'
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                              {messageRole}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="font-mono text-[9px]">{messageTime}</span>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => onDeleteMessage!(m.id)}
                              className="opacity-60 group-hover:opacity-100 text-slate-400 hover:text-rose-500 ml-1 p-0.5 transition cursor-pointer"
                              title="Excluir mensagem"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-800 dark:text-slate-200 break-words leading-snug">
                        <AutoLinkText
                          text={messageText}
                          linkClassName="text-blue-600 dark:text-blue-400 hover:underline font-bold inline-flex items-center gap-0.5 break-all cursor-pointer"
                        />
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Form Envio */}
            <form onSubmit={handleSendChat} className="mt-2 flex gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={currentUser ? `Mensagem como ${currentUser.nome_completo.split(' ')[0]}...` : "Escreva para a equipe..."}
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 text-slate-800 dark:text-white"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition cursor-pointer shadow-xs shrink-0 flex items-center justify-center"
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
