import React, { useState, useRef, useEffect } from 'react';
import { EscalaItem, UserProfile } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { AutoLinkText } from './AutoLinkText';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  Users, 
  Shield, 
  Trash2, 
  Info, 
  Clock, 
  AlertCircle,
  Filter,
  Printer,
  Sparkles,
  CheckCircle2,
  Link as LinkIcon,
  Search
} from 'lucide-react';

interface AgendaViewProps {
  escala: EscalaItem[];
  onSaveEscalaItem: (item: EscalaItem) => void;
  onDeleteEscalaItem?: (id: string) => void;
  users?: UserProfile[];
  currentUser?: UserProfile | null;
}

const MONTH_NAMES = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO'
];

const WEEKDAY_NAMES = [
  { short: 'DOM', full: 'Domingo' },
  { short: 'SEG', full: 'Segunda-feira' },
  { short: 'TER', full: 'Terça-feira' },
  { short: 'QUA', full: 'Quarta-feira' },
  { short: 'QUI', full: 'Quinta-feira' },
  { short: 'SEX', full: 'Sexta-feira' },
  { short: 'SÁB', full: 'Sábado' }
];

export const AgendaView: React.FC<AgendaViewProps> = ({
  escala,
  onSaveEscalaItem,
  onDeleteEscalaItem,
  users = [],
  currentUser
}) => {
  const isMaster =
    currentUser?.cargo === 'MASTER' ||
    currentUser?.cargo === 'MASTER ADM' ||
    currentUser?.nivel_acesso === 'MASTER (TUDO)';
  const todayObj = new Date();
  const [currentMonth, setCurrentMonth] = useState(todayObj.getMonth());
  const [currentYear, setCurrentYear] = useState(todayObj.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PLANTAO' | 'EVENTO' | 'FERIADO'>('ALL');

  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    itemId: string;
    itemDesc: string;
  }>({
    isOpen: false,
    itemId: '',
    itemDesc: ''
  });

  // Form for new event (Master only)
  const [eventForm, setEventForm] = useState({
    tipo: 'PLANTAO' as 'PLANTAO' | 'EVENTO' | 'FERIADO' | 'FACULTATIVO',
    servidores: [] as string[],
    descricao: '',
    link: ''
  });
  const [agendaServidorSearch, setAgendaServidorSearch] = useState('');
  const [showAgendaServidorDropdown, setShowAgendaServidorDropdown] = useState(false);
  const agendaServidorDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (agendaServidorDropdownRef.current && !agendaServidorDropdownRef.current.contains(event.target as Node)) {
        setShowAgendaServidorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectServidorAgenda = (nome: string) => {
    const norm = nome.trim();
    if (!eventForm.servidores.some((s) => s.toUpperCase() === norm.toUpperCase())) {
      setEventForm({ ...eventForm, servidores: [...eventForm.servidores, norm] });
    }
    setAgendaServidorSearch('');
    setShowAgendaServidorDropdown(false);
  };

  const handleRemoveServidorAgenda = (nome: string) => {
    setEventForm({
      ...eventForm,
      servidores: eventForm.servidores.filter((s) => s.toUpperCase() !== nome.trim().toUpperCase())
    });
  };

  const changeMonth = (delta: number) => {
    let newM = currentMonth + delta;
    let newY = currentYear;
    if (newM < 0) {
      newM = 11;
      newY -= 1;
    } else if (newM > 11) {
      newM = 0;
      newY += 1;
    }
    setCurrentMonth(newM);
    setCurrentYear(newY);
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
  };

  // Calendar Calculation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const handleDayClick = (dStr: string) => {
    setSelectedDate(dStr);
    setEventForm({ tipo: 'PLANTAO', servidores: [], descricao: '', link: '' });
    setAgendaServidorSearch('');
    setModalOpen(true);
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMaster) return;
    if (!selectedDate) return;

    let finalDescricao = eventForm.descricao.trim();
    if (eventForm.link.trim()) {
      const linkFormatado = eventForm.link.trim().startsWith('http') 
        ? eventForm.link.trim() 
        : `https://${eventForm.link.trim()}`;
      finalDescricao = finalDescricao 
        ? `${finalDescricao} - Link: ${linkFormatado}` 
        : linkFormatado;
    }

    const newItem: EscalaItem = {
      id: `esc-${Date.now()}`,
      data: selectedDate,
      tipo: eventForm.tipo,
      servidores: eventForm.servidores.length > 0 
        ? eventForm.servidores.map(s => s.toUpperCase()).join(' / ') 
        : 'GERAL / SEM ESCALA INDIVIDUAL',
      descricao: finalDescricao
    };

    onSaveEscalaItem(newItem);
    setEventForm({ tipo: 'PLANTAO', servidores: [], descricao: '', link: '' });
    setAgendaServidorSearch('');
  };

  const handleDeleteItem = (itemId: string, itemDesc: string) => {
    if (!isMaster) return;
    setConfirmDelete({
      isOpen: true,
      itemId,
      itemDesc
    });
  };

  // Get items for specific date with filter
  const getItemsForDate = (dStr: string) => {
    const all = escala.filter((x) => x.data === dStr);
    if (typeFilter === 'ALL') return all;
    if (typeFilter === 'FERIADO') return all.filter((x) => x.tipo === 'FERIADO' || x.tipo === 'FACULTATIVO');
    return all.filter((x) => x.tipo === typeFilter);
  };

  // Stats for the current month
  const monthStrPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const monthItems = escala.filter((x) => x.data.startsWith(monthStrPrefix));
  const countPlantoes = monthItems.filter((x) => x.tipo === 'PLANTAO').length;
  const countEventos = monthItems.filter((x) => x.tipo === 'EVENTO').length;
  const countFeriados = monthItems.filter((x) => x.tipo === 'FERIADO' || x.tipo === 'FACULTATIVO').length;

  return (
    <div className="w-full max-w-[1750px] mx-auto space-y-4 text-left">
      {/* Top Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm gap-4">
        {/* Title & Badge */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 rounded-2xl text-indigo-600 dark:text-indigo-400">
            <CalendarIcon className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Agenda & Escala Operacional
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Vigilância Sanitária • Balneário Camboriú
            </p>
          </div>

          <div className="ml-auto sm:ml-2">
            {isMaster ? (
              <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-2xl shadow-xs">
                <Shield className="w-3.5 h-3.5 text-amber-500" /> Acesso Master (Edição Ativa)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-2xl">
                <Clock className="w-3.5 h-3.5 text-slate-500" /> Modo Consulta
              </span>
            )}
          </div>
        </div>

        {/* Month Selector & Controls */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
          <button
            onClick={goToToday}
            className="px-3.5 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 font-black text-xs uppercase tracking-wider transition border border-indigo-200/60 dark:border-slate-700 cursor-pointer shadow-xs"
            title="Ir para o mês atual"
          >
            Hoje
          </button>

          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
            <button
              onClick={() => changeMonth(-1)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white w-8 h-8 rounded-xl font-black flex items-center justify-center cursor-pointer transition shadow active:scale-95"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="font-black text-indigo-900 dark:text-indigo-200 w-32 sm:w-36 text-center uppercase text-sm sm:text-base tracking-wide">
              {MONTH_NAMES[currentMonth]}
            </span>

            <button
              onClick={() => changeMonth(1)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white w-8 h-8 rounded-xl font-black flex items-center justify-center cursor-pointer transition shadow active:scale-95"
              title="Próximo Mês"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value, 10))}
              className="bg-white dark:bg-slate-900 font-black uppercase text-xs sm:text-sm px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none cursor-pointer"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-xs"
            title="Imprimir Escala do Mês"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Chips & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 gap-3">
        {/* Monthly Summary Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-black">
          <span className="text-[11px] text-slate-400 font-bold uppercase mr-1">No Mês:</span>
          <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-xl">
            🛡️ {countPlantoes} Plantões
          </span>
          <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-xl">
            ⚡ {countEventos} Eventos
          </span>
          <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-2.5 py-1 rounded-xl">
            📌 {countFeriados} Feriados/Ptos
          </span>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-end sm:self-auto">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase transition cursor-pointer ${
              typeFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setTypeFilter('PLANTAO')}
            className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase transition cursor-pointer ${
              typeFilter === 'PLANTAO'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-blue-600'
            }`}
          >
            Plantão
          </button>
          <button
            onClick={() => setTypeFilter('EVENTO')}
            className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase transition cursor-pointer ${
              typeFilter === 'EVENTO'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-amber-600'
            }`}
          >
            Eventos
          </button>
          <button
            onClick={() => setTypeFilter('FERIADO')}
            className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase transition cursor-pointer ${
              typeFilter === 'FERIADO'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-rose-600'
            }`}
          >
            Feriados
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-2 text-center">
        {WEEKDAY_NAMES.map((w, idx) => (
          <div
            key={w.short}
            className={`py-2 px-1 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-xs ${
              idx === 0 || idx === 6
                ? 'bg-indigo-100/70 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300'
                : 'bg-slate-200/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200'
            }`}
          >
            <span className="hidden sm:inline">{w.full}</span>
            <span className="sm:hidden">{w.short}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 sm:gap-2.5 bg-slate-200/90 dark:bg-slate-800/90 p-2 sm:p-3 rounded-3xl shadow-inner border border-slate-300/60 dark:border-slate-700/60">
        {/* Empty slots for week padding */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="bg-slate-100/40 dark:bg-slate-900/30 min-h-[90px] sm:min-h-[110px] rounded-2xl opacity-25 border border-dashed border-slate-300 dark:border-slate-800"
          ></div>
        ))}

        {/* Days of the Month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const monthStr = String(currentMonth + 1).padStart(2, '0');
          const dayStr = String(dayNum).padStart(2, '0');
          const fullDateISO = `${currentYear}-${monthStr}-${dayStr}`;

          const dayItems = getItemsForDate(fullDateISO);
          const isToday = fullDateISO === new Date().toISOString().split('T')[0];
          const dayOfWeek = new Date(currentYear, currentMonth, dayNum).getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          return (
            <div
              key={`day-${dayNum}`}
              onClick={() => handleDayClick(fullDateISO)}
              className={`dia-calendario min-h-[90px] sm:min-h-[110px] h-auto rounded-2xl p-2 sm:p-2.5 transition-all flex flex-col justify-between relative cursor-pointer group ${
                isToday
                  ? 'border-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-md ring-2 ring-indigo-500/20'
                  : isWeekend
                  ? 'bg-slate-50/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
              title={`Clique para ver ou editar a escala do dia ${dayStr}/${monthStr}/${currentYear}`}
            >
              {/* Card Header with Large Date Number */}
              <div className="w-full">
                <div className="flex items-center justify-between mb-1.5">
                  <div
                    className={`flex items-center justify-center font-black transition-transform group-hover:scale-110 ${
                      isToday
                        ? 'bg-indigo-600 text-white rounded-xl px-2 py-0.5 text-sm sm:text-base md:text-lg shadow-sm'
                        : 'text-base sm:text-lg md:text-xl text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                    }`}
                  >
                    {dayNum}
                  </div>

                  {/* Indicators / Counter */}
                  <div className="flex items-center gap-1">
                    {isToday && (
                      <span className="text-[9px] font-black uppercase bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-md hidden md:inline">
                        Hoje
                      </span>
                    )}
                    {dayItems.length > 0 && (
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {dayItems.length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Event Tags inside the Day Box - Auto expansível conforme informações */}
                {dayItems.length > 0 && (
                  <div className="space-y-1.5 w-full mt-1">
                    {dayItems.map((item) => (
                      <div
                        key={item.id}
                        className={`tag-evento tipo-${item.tipo.toLowerCase()} text-[10.5px] p-1.5 rounded-lg font-black tracking-tight leading-snug break-words whitespace-normal`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="opacity-75 font-black text-[9px] px-1 py-0.2 bg-black/10 dark:bg-white/10 rounded">
                            {item.tipo}
                          </span>
                        </div>
                        <p className="mt-0.5 text-slate-900 dark:text-white font-black text-[11px] leading-tight">
                          {item.servidores}
                        </p>
                        {item.descricao && (
                          <p className="text-[9.5px] opacity-85 font-medium mt-0.5 line-clamp-2">
                            {item.descricao}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Quick Indicator on empty / hover */}
              <div className="mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[9px] text-slate-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                <span>{isMaster ? '+ Adicionar' : 'Ver escala'}</span>
                <span className="text-[10px]">↗</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail / View / Edit Modal */}
      {modalOpen && selectedDate && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[1200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-[2.5rem] p-6 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-2xl animate-fade-in text-left">
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-4 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">
                    Escala do Dia {selectedDate.split('-').reverse().join('/')}
                  </h3>
                </div>
                <div className="mt-1">
                  {isMaster ? (
                    <span className="text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      Modo Administrador (Master)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full">
                      Visualização de Escala
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-red-500 font-black text-xl p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List Existing Events */}
            <div className="space-y-2.5 mb-4 max-h-64 overflow-y-auto pr-1">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center justify-between">
                <span>Eventos e Fiscais Escalados</span>
                <span className="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full text-[10px]">
                  {getItemsForDate(selectedDate).length} registros
                </span>
              </h4>

              {getItemsForDate(selectedDate).map((evt) => (
                <div
                  key={evt.id}
                  className={`p-3.5 rounded-2xl text-xs font-bold tag-evento tipo-${evt.tipo.toLowerCase()} border border-black/5 dark:border-white/5 flex items-start justify-between gap-3`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wide bg-black/10 dark:bg-white/10 px-2.5 py-0.5 rounded-md">
                        {evt.tipo}
                      </span>
                    </div>
                    <p className="font-black text-base text-slate-900 dark:text-white mt-1">
                      {evt.servidores}
                    </p>
                    {evt.descricao && (
                      <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                        <AutoLinkText text={evt.descricao} />
                      </p>
                    )}
                  </div>

                  {/* Delete button only for Master */}
                  {isMaster && onDeleteEscalaItem && (
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(evt.id, `${evt.tipo}: ${evt.servidores} (${evt.data})`)}
                      className="text-rose-600 hover:text-rose-700 dark:text-rose-400 p-2 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-950/40 transition cursor-pointer shrink-0"
                      title="Excluir este plantão/evento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {getItemsForDate(selectedDate).length === 0 && (
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-1">
                  <Clock className="w-7 h-7 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Nenhuma escala cadastrada para esta data.
                  </p>
                  <p className="text-xs text-slate-400">
                    {isMaster ? 'Utilize o formulário abaixo para escalar servidores.' : 'Não há plantões ou eventos agendados para este dia.'}
                  </p>
                </div>
              )}
            </div>

            {/* If NOT master, show simple info card and close button */}
            {!isMaster ? (
              <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-4">
                <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl flex items-start gap-2.5 text-slate-600 dark:text-slate-300 text-xs">
                  <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    Você está em <b>Modo Consulta</b>. Apenas usuários com perfil <b>Master</b> possuem permissão para cadastrar, editar ou remover servidores da escala.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-6 py-2.5 text-xs font-black rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white uppercase shadow-md transition cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              /* If MASTER, show Form to Add/Edit */
              <form onSubmit={handleAddEvent} className="space-y-3.5 border-t border-slate-200 dark:border-slate-700 pt-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Plus className="w-4 h-4" /> Adicionar Servidores / Plantão
                  </h4>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Painel Master</span>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase block mb-1 text-slate-600 dark:text-slate-400">
                    Tipo de Evento
                  </label>
                  <select
                    value={eventForm.tipo}
                    onChange={(e) => setEventForm({ ...eventForm, tipo: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="PLANTAO">PLANTÃO</option>
                    <option value="EVENTO">EVENTO / BLITZ</option>
                    <option value="FERIADO">FERIADO</option>
                    <option value="FACULTATIVO">PONTO FACULTATIVO</option>
                  </select>
                </div>

                {/* Servidores Escalados com busca preditiva, tags com X e dropdown */}
                <div className="relative" ref={agendaServidorDropdownRef}>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-black uppercase block text-slate-600 dark:text-slate-400">
                      Servidores Escalados <span className="text-slate-400 font-normal">(Opcional)</span>
                    </label>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                      {users.length} operadores
                    </span>
                  </div>

                  <div className="min-h-[42px] p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 flex flex-wrap items-center gap-1.5 transition">
                    {eventForm.servidores.map((nome) => {
                      const u = users.find(x => x.nome_completo.toUpperCase() === nome.toUpperCase());
                      return (
                        <span
                          key={nome}
                          className="inline-flex items-center gap-1.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-black px-2.5 py-1 rounded-lg shadow-xs animate-fadeIn"
                        >
                          <Users className="w-3 h-3 opacity-70" />
                          <span>{nome}</span>
                          {u && <span className="text-[9px] font-semibold opacity-75">({u.cargo})</span>}
                          <button
                            type="button"
                            onClick={() => handleRemoveServidorAgenda(nome)}
                            className="w-4 h-4 rounded-full bg-indigo-200 dark:bg-indigo-800 hover:bg-red-500 hover:text-white flex items-center justify-center text-indigo-900 dark:text-indigo-200 transition cursor-pointer ml-0.5"
                            title="Remover servidor"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}

                    <div className="flex-1 min-w-[130px] flex items-center gap-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
                      <input
                        type="text"
                        className="w-full bg-transparent border-none p-1 text-xs font-bold outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                        placeholder={eventForm.servidores.length === 0 ? "Digite para buscar servidor..." : "Adicionar outro..."}
                        value={agendaServidorSearch}
                        onChange={(e) => {
                          setAgendaServidorSearch(e.target.value);
                          setShowAgendaServidorDropdown(true);
                        }}
                        onFocus={() => setShowAgendaServidorDropdown(true)}
                      />
                    </div>
                  </div>

                  {/* Dropdown com servidores filtrados ao digitar */}
                  {showAgendaServidorDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-50 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
                      {users
                        .filter((u) => {
                          const search = agendaServidorSearch.toLowerCase().trim();
                          const matchText = `${u.nome_completo} ${u.cargo} ${u.matricula || ''}`.toLowerCase();
                          const alreadySelected = eventForm.servidores.some(s => s.toUpperCase() === u.nome_completo.toUpperCase());
                          return !alreadySelected && (search === '' || matchText.includes(search));
                        })
                        .map((u) => (
                          <div
                            key={u.id}
                            onClick={() => handleSelectServidorAgenda(u.nome_completo)}
                            className="p-2 hover:bg-indigo-50 dark:hover:bg-slate-800/80 cursor-pointer transition flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-[10px]">
                                {u.nome_completo.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                  {u.nome_completo}
                                </p>
                                <p className="text-[9px] text-slate-500 dark:text-slate-400">
                                  {u.cargo} • Matrícula: {u.matricula || 'N/A'}
                                </p>
                              </div>
                            </div>
                            <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800 group-hover:bg-indigo-600 group-hover:text-white transition">
                              + Selecionar
                            </span>
                          </div>
                        ))}

                      {users.filter(u => {
                        const search = agendaServidorSearch.toLowerCase().trim();
                        const matchText = `${u.nome_completo} ${u.cargo} ${u.matricula || ''}`.toLowerCase();
                        const alreadySelected = eventForm.servidores.some(s => s.toUpperCase() === u.nome_completo.toUpperCase());
                        return !alreadySelected && (search === '' || matchText.includes(search));
                      }).length === 0 && (
                        <div className="p-2.5 text-center text-xs text-slate-400 italic">
                          Nenhum servidor encontrado para "{agendaServidorSearch}".
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase block mb-1 text-slate-600 dark:text-slate-400">
                    Descrição / Rota (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Plantão Noturno Orla / Central de Fiscalização"
                    value={eventForm.descricao}
                    onChange={(e) => setEventForm({ ...eventForm, descricao: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase block mb-1 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <LinkIcon className="w-3.5 h-3.5 text-indigo-500" /> Link / URL Externa (Opcional)
                  </label>
                  <input
                    type="url"
                    placeholder="Ex: https://drive.google.com/... ou https://bc.1doc.com.br/..."
                    value={eventForm.link}
                    onChange={(e) => setEventForm({ ...eventForm, link: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 uppercase hover:bg-slate-300 dark:hover:bg-slate-600 transition cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-black rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white uppercase shadow-md transition cursor-pointer active:scale-95"
                  >
                    Salvar Escala
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal for deletion */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="Excluir Plantão / Escala"
        message="Tem certeza de que deseja remover esta escala do calendário oficial?"
        itemDescription={confirmDelete.itemDesc}
        confirmText="Sim, Remover"
        onConfirm={() => {
          if (onDeleteEscalaItem && confirmDelete.itemId) {
            onDeleteEscalaItem(confirmDelete.itemId);
          }
        }}
        onClose={() => setConfirmDelete({ isOpen: false, itemId: '', itemDesc: '' })}
      />
    </div>
  );
};
