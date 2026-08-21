import React, { useState, useEffect, useRef } from 'react';
import { PortalButton, EscalaItem, UserProfile, RecadoMural, ChatMessage } from '../types';
import { ShieldCheck, Calendar, Send, Info, Crown, ChevronLeft, ChevronRight, MessageSquare, Trash2 } from 'lucide-react';
import { AutoLinkText } from './AutoLinkText';

interface HomeViewProps {
  buttons: PortalButton[];
  escala: EscalaItem[];
  users: UserProfile[];
  mural: RecadoMural[];
  chat: ChatMessage[];
  currentUser: UserProfile | null;
  onNavigate: (view: 'home' | 'feiras' | 'agenda' | 'master' | 'fiscalizacao' | 'processos' | 'laboratorio') => void;
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
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chat]);

  // Auto-rotate mural every 6 seconds when there are multiple items
  useEffect(() => {
    if (mural.length <= 1) return;
    const interval = setInterval(() => {
      setMuralIndex((prev) => (prev + 1) % mural.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [mural.length]);

  const activeMural = mural.length > 0 ? mural[muralIndex % mural.length] : null;

  const todayISO = new Date().toISOString().split('T')[0];
  const todayDay = new Date().getDate();
  const todayMonth = new Date().getMonth();

  const formatPlantaoDate = (dateStr: string) => {
    if (!dateStr) return { dataFormatada: '', diaSemana: '', diaMes: '', relativo: '', completo: '' };
    const parts = dateStr.split('-');
    if (parts.length < 3) return { dataFormatada: dateStr, diaSemana: '', diaMes: dateStr, relativo: '', completo: dateStr };
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const diaSemana = diasSemana[d.getDay()] || '';
    const diaFmt = String(day).padStart(2, '0');
    const mesFmt = String(month + 1).padStart(2, '0');

    // Difference in days from today
    const now = new Date();
    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetZero = new Date(year, month, day);
    const diffMs = targetZero.getTime() - todayZero.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    let relativo = '';
    if (diffDays === 0) relativo = 'Hoje';
    else if (diffDays === 1) relativo = 'Amanhã';
    else if (diffDays > 1) relativo = `Em ${diffDays} dias`;

    return {
      dataFormatada: `${diaFmt}/${mesFmt}/${year}`,
      diaMes: `${diaFmt}/${mesFmt}`,
      diaSemana,
      relativo,
      completo: `${diaFmt}/${mesFmt} (${diaSemana})`
    };
  };

  const isMaster = currentUser?.nivel_acesso === 'MASTER (TUDO)';

  const visibleButtons = buttons.filter((b) => {
    if (b.somenteMaster || b.nome.toLowerCase().includes('teste')) {
      return isMaster;
    }
    return true;
  });

  // Find plantão: check today's plantão first, then find the next upcoming one
  const todayPlantao = escala.find((e) => e.data === todayISO && (e.tipo === 'PLANTAO' || !e.tipo));
  const nextPlantao = escala
    .filter((e) => e.data > todayISO && (e.tipo === 'PLANTAO' || !e.tipo))
    .sort((a, b) => a.data.localeCompare(b.data))[0];

  const todayInfo = formatPlantaoDate(todayISO);
  const nextInfo = nextPlantao ? formatPlantaoDate(nextPlantao.data) : null;

  // Find birthdays automatically from registered operators (users)
  const aniversariantesHoje = users.filter((u) => {
    if (!u.data_nascimento) return false;
    const parts = u.data_nascimento.split('-');
    if (parts.length < 3) return false;
    const birthMonth = parseInt(parts[1], 10) - 1;
    const birthDay = parseInt(parts[2], 10);
    return birthMonth === todayMonth && birthDay === todayDay;
  });

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput);
    setChatInput('');
  };

  const renderCardGraphic = (b: PortalButton) => {
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
    if (b.id === 'pref' || b.img.includes('brasao')) {
      return <img src={b.img} alt={b.nome} className="h-16 max-h-16 w-auto object-contain scale-125 transition-transform" />;
    }
    return <img src={b.img} alt={b.nome} className="h-12 w-auto object-contain" />;
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6">
      {/* Central App Grid */}
      <div className="flex-1 py-2">
        {/* Master Banner if user is MASTER (TUDO) */}
        {isMaster && (
          <div
            onClick={() => onNavigate('master')}
            className="mb-5 bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 p-4 rounded-2xl border-2 border-amber-400/80 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl cursor-pointer hover:scale-[1.01] transition"
          >
            <div className="flex items-center gap-3">
              <div className="bg-amber-400 text-slate-950 p-2.5 rounded-xl shadow">
                <Crown className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="font-black uppercase text-sm text-amber-300 flex items-center gap-2">
                  Painel Master & Diretoria DVIS
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

        <div className="mb-4 text-left">
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
            Serviços e Módulos Operacionais
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Selecione um módulo para acesso direto às ferramentas municipais e de fiscalização sanitária.
          </p>
        </div>

        <div className="grid-portal">
          {visibleButtons.map((b) => (
            <div
              key={b.id}
              onClick={() => {
                if (b.acao === 'link') {
                  onOpenExternal(b.url);
                } else if (b.view) {
                  onNavigate(b.view);
                }
              }}
              className={`card-app relative ${
                b.view === 'fiscalizacao'
                  ? 'border-2 border-emerald-500 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : b.id === 'tproc'
                  ? 'border-2 border-amber-500 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                  : ''
              }`}
            >
              {b.badgetext && (
                <span className="absolute top-2 right-2 bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow">
                  {b.badgetext}
                </span>
              )}
              <div className="flex justify-center items-center h-14 w-full">
                {renderCardGraphic(b)}
              </div>
              <h3 className="card-title">{b.nome}</h3>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column (Plantão, Aniversariantes, Mural, Chat) */}
      <div className="w-full lg:w-[320px] flex flex-col gap-4">
        {/* Plantão Box */}
        <section
          onClick={() => onNavigate('agenda')}
          className={`p-5 rounded-2xl text-white shadow-md text-left relative overflow-hidden cursor-pointer transition hover:scale-[1.01] ${
            todayPlantao
              ? 'bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 border border-blue-500/40'
              : nextPlantao
              ? 'bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 border border-amber-400/40'
              : 'bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700'
          }`}
        >
          <div className="absolute top-2 right-2 opacity-15 pointer-events-none">
            <Calendar className="w-20 h-20" />
          </div>

          <div className="flex items-center justify-between border-b border-white/15 pb-2 mb-2.5">
            <h2 className="text-xs font-black uppercase tracking-widest text-blue-100 flex items-center gap-1.5">
              <span>🛡️ Plantão DVIS</span>
            </h2>
            {todayPlantao ? (
              <span className="text-[9px] bg-emerald-500 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow animate-pulse">
                HOJE ATIVO
              </span>
            ) : nextPlantao ? (
              <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                PRÓXIMO PLANTÃO
              </span>
            ) : (
              <span className="text-[9px] bg-slate-600 text-slate-200 font-bold px-2 py-0.5 rounded-full uppercase">
                SEM ESCALA
              </span>
            )}
          </div>

          {todayPlantao ? (
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold text-blue-200 uppercase mb-1">
                <span>Escala em Andamento</span>
                <span className="text-emerald-300 font-black">{todayInfo.completo}</span>
              </div>
              <p id="txt-escala-nomes" className="text-base font-black leading-tight uppercase text-white drop-shadow-sm">
                {todayPlantao.servidores || 'Servidores em plantão'}
              </p>
              {todayPlantao.descricao && (
                <div className="mt-2 pt-2 border-t border-white/10 text-[11px] text-blue-100/90 leading-snug">
                  <AutoLinkText text={todayPlantao.descricao} onOpenExternal={onOpenExternal} />
                </div>
              )}
            </div>
          ) : nextPlantao ? (
            <div>
              <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-amber-300 uppercase mb-1.5">
                <span className="flex items-center gap-1">
                  <span>Sem plantão hoje</span>
                </span>
                {nextInfo?.relativo && (
                  <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full text-[9px] font-black border border-amber-400/30">
                    {nextInfo.relativo}
                  </span>
                )}
              </div>

              {/* Box com a Data e Dia da Semana do Próximo Plantão */}
              <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-2.5 my-1.5">
                <div className="text-[10px] font-black text-amber-300 uppercase flex items-center justify-between">
                  <span>📅 Data da Próxima Escala:</span>
                  <span className="text-white text-xs font-black">{nextInfo?.dataFormatada}</span>
                </div>
                <div className="text-[11px] font-bold text-amber-200 uppercase mt-0.5">
                  {nextInfo?.diaSemana}
                </div>
              </div>

              <div className="mt-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Fiscais Escalados:</span>
                <p id="txt-escala-nomes" className="text-sm font-black leading-tight uppercase text-white">
                  {nextPlantao.servidores || 'Servidores a definir'}
                </p>
              </div>

              {nextPlantao.descricao && (
                <div className="mt-2 pt-1.5 border-t border-white/10 text-[10px] text-slate-300 leading-snug">
                  <AutoLinkText text={nextPlantao.descricao} onOpenExternal={onOpenExternal} />
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-[11px] font-bold text-slate-300 my-1">
                Nenhum plantão agendado para os próximos dias.
              </p>
              <span className="text-[10px] text-blue-300 font-bold uppercase underline mt-2 block">
                Ver Agenda Completa →
              </span>
            </div>
          )}
        </section>

        {/* Aniversariantes Box */}
        <section className="bg-gradient-to-br from-indigo-700 via-purple-800 to-pink-800 p-4 rounded-2xl text-white shadow-md text-left relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-indigo-400/40 pb-1.5 mb-2">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-indigo-100 flex items-center gap-1">
              <span>🎂 Aniversariantes do Dia</span>
            </h2>
          </div>

          {aniversariantesHoje.length > 0 ? (
            <div className="my-2">
              <p className="text-[9px] font-black text-amber-300 uppercase tracking-widest flex items-center gap-1 animate-pulse">
                <span>🎉 HOJE É DIA DE FESTA!</span>
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {aniversariantesHoje.map((a) => {
                  const diaMes = a.data_nascimento?.split('-').reverse().slice(0, 2).join('/');
                  return (
                    <span
                      key={a.id}
                      className="bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-1 rounded-lg uppercase shadow flex items-center gap-1"
                    >
                      🎈 {a.nome_completo.split(' ')[0]} ({diaMes})
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs font-bold text-indigo-100 mt-1">
              Nenhum aniversariante hoje.
            </p>
          )}
        </section>

        {/* Mural de Recados - Card Único Rotativo */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-left">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
            <h2 className="text-[11px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest flex items-center gap-1.5">
              <Info className="w-4 h-4" /> Mural Informativo
            </h2>
            {mural.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMuralIndex((prev) => (prev - 1 + mural.length) % mural.length)}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
                  title="Aviso anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[9px] font-bold text-slate-400">
                  {((muralIndex % mural.length) + 1)}/{mural.length}
                </span>
                <button
                  type="button"
                  onClick={() => setMuralIndex((prev) => (prev + 1) % mural.length)}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
                  title="Próximo aviso"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div id="lista-recados-home" className="min-h-[90px] flex flex-col justify-between">
            {activeMural ? (
              (() => {
                const isUrgente = activeMural.prioridade === 'URGENTE';
                const isAlerta = activeMural.prioridade === 'ALERTA';

                return (
                  <div
                    key={activeMural.id}
                    className={`p-3 rounded-xl border transition-all duration-300 animate-fade-in flex flex-col justify-between ${
                      isUrgente
                        ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 shadow-xs ring-1 ring-red-400/30'
                        : isAlerta
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1.5 gap-2">
                        <span
                          className={`text-[10px] font-black uppercase tracking-tight ${
                            isUrgente
                              ? 'text-red-700 dark:text-red-300 flex items-center gap-1.5'
                              : isAlerta
                              ? 'text-amber-700 dark:text-amber-300'
                              : 'text-slate-800 dark:text-white'
                          }`}
                        >
                          {isUrgente && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-600 animate-ping shrink-0"></span>}
                          {activeMural.titulo}
                        </span>
                        <span
                          className={`text-[7.5px] font-extrabold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                            isUrgente
                              ? 'bg-red-600 text-white dark:bg-red-700 dark:text-white shadow-xs font-black animate-pulse'
                              : isAlerta
                              ? 'bg-amber-500 text-white dark:bg-amber-600 dark:text-white font-black'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                          }`}
                        >
                          {activeMural.prioridade}
                        </span>
                      </div>
                      <p
                        className={`text-[11px] leading-relaxed break-words ${
                          isUrgente
                            ? 'text-red-900/90 dark:text-red-200 font-medium'
                            : isAlerta
                            ? 'text-amber-900/90 dark:text-amber-200'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <AutoLinkText text={activeMural.conteudo} />
                      </p>
                    </div>

                    <div
                      className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[8.5px] ${
                        isUrgente
                          ? 'border-red-200 dark:border-red-900/50 text-red-700/80 dark:text-red-300 font-bold'
                          : isAlerta
                          ? 'border-amber-200 dark:border-amber-900/50 text-amber-700/80 dark:text-amber-300 font-bold'
                          : 'border-slate-200 dark:border-slate-700/60 text-slate-400'
                      }`}
                    >
                      <span className="font-semibold">{activeMural.autor}</span>
                      <span>{activeMural.data}</span>
                    </div>
                  </div>
                );
              })()
            ) : (
              <p className="text-xs text-slate-400 py-2">Nenhum aviso no mural.</p>
            )}

            {/* Indicadores de Paginação / Dots */}
            {mural.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-2.5">
                {mural.map((_, idx) => {
                  const isActive = (muralIndex % mural.length) === idx;
                  return (
                    <button
                      key={`dot-${idx}`}
                      type="button"
                      onClick={() => setMuralIndex(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                        isActive ? 'w-5 bg-blue-600 dark:bg-blue-400' : 'w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                      }`}
                      title={`Ir para o aviso ${idx + 1}`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Realtime Chat - Comunicação Interna */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm text-left min-h-[290px] max-h-[360px]">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
            <h2 className="text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Comunicação Interna</span>
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Ao Vivo
              </span>
            </div>
          </div>

          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto pr-1 space-y-2 mb-2 scroll-smooth text-[10px]"
            style={{ maxHeight: '200px' }}
          >
            {chat.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-6 text-slate-400 text-center">
                <MessageSquare className="w-6 h-6 mb-1 opacity-40" />
                <p className="text-[10px] font-semibold">Nenhuma mensagem recente.</p>
                <p className="text-[8px] opacity-70">Envie um recado para a equipe da Vigilância.</p>
              </div>
            ) : (
              chat.map((msg) => {
                const isMe =
                  (currentUser?.nome_completo &&
                    msg.sender.toLowerCase().includes(currentUser.nome_completo.split(' ')[0].toLowerCase())) ||
                  (currentUser?.id && msg.perfil_id === currentUser.id);

                const canDelete =
                  isMe ||
                  currentUser?.cargo === 'MASTER' ||
                  currentUser?.cargo === 'MASTER ADM' ||
                  currentUser?.cargo?.includes('DIRETOR') ||
                  currentUser?.nivel_acesso === 'MASTER (TUDO)';

                return (
                  <div
                    key={msg.id}
                    className={`p-2 rounded-xl border transition group relative ${
                      isMe
                        ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-900/60 ml-2'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-700/70 mr-2'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-0.5 gap-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-black text-[9px] uppercase ${
                            isMe
                              ? 'text-blue-700 dark:text-blue-300'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {msg.sender}
                        </span>
                        {msg.role && (
                          <span
                            className={`text-[7px] font-extrabold px-1 rounded uppercase ${
                              msg.role === 'MASTER' || msg.role === 'DIRETOR'
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {msg.role}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-slate-400 font-mono">
                          {msg.time}
                        </span>
                        {canDelete && onDeleteMessage && (
                          <button
                            type="button"
                            onClick={() => onDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 dark:text-red-400 p-0.5 transition"
                            title="Excluir mensagem"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-700 dark:text-slate-200 text-[10px] leading-relaxed break-words">
                      <AutoLinkText
                        text={msg.text}
                        linkClassName="text-blue-600 dark:text-blue-400 hover:underline font-bold inline-flex items-center gap-0.5 break-all cursor-pointer"
                      />
                    </p>
                  </div>
                );
              })
            )}
          </div>

          <form
            onSubmit={handleSendChat}
            className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 mt-auto"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={
                currentUser
                  ? `Mensagem como ${currentUser.nome_completo.split(' ')[0]}...`
                  : 'Digite sua mensagem interna...'
              }
              className="flex-1 py-1.5 px-3 text-[10px] border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-blue-500 outline-none transition"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2 rounded-xl font-bold text-xs flex items-center justify-center transition shadow-xs cursor-pointer shrink-0"
              title="Enviar mensagem"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
