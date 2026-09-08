import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { Cake, Sparkles, PartyPopper, Heart, X, Gift, Smile } from 'lucide-react';

interface AniversarioModalProps {
  currentUser: UserProfile | null;
}

export const AniversarioModal: React.FC<AniversarioModalProps> = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [primeiroNome, setPrimeiroNome] = useState('');

  useEffect(() => {
    setIsOpen(false);
    if (!currentUser || !currentUser.data_nascimento) return;

    try {
      // Normaliza data de nascimento (suporta YYYY-MM-DD ou DD/MM/YYYY)
      const rawDate = currentUser.data_nascimento.trim();
      let birthMonth = '';
      let birthDay = '';

      if (rawDate.includes('-')) {
        const parts = rawDate.split('-');
        if (parts.length === 3) {
          // Se formato YYYY-MM-DD
          if (parts[0].length === 4) {
            birthMonth = parts[1].padStart(2, '0');
            birthDay = parts[2].padStart(2, '0');
          } else {
            // Se formato DD-MM-YYYY
            birthDay = parts[0].padStart(2, '0');
            birthMonth = parts[1].padStart(2, '0');
          }
        }
      } else if (rawDate.includes('/')) {
        const parts = rawDate.split('/');
        if (parts.length === 3) {
          birthDay = parts[0].padStart(2, '0');
          birthMonth = parts[1].padStart(2, '0');
        }
      }

      if (!birthMonth || !birthDay) {
        setIsOpen(false);
        return;
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
      const currentDay = String(now.getDate()).padStart(2, '0');

      const isAniversarioHoje = currentMonth === birthMonth && currentDay === birthDay;

      if (isAniversarioHoje) {
        const todayKey = `${currentYear}-${currentMonth}-${currentDay}`;
        const storageKey = `visa_niver_visto_${currentUser.id || currentUser.email}_${todayKey}`;
        const jaExibiuHoje = localStorage.getItem(storageKey);

        if (!jaExibiuHoje) {
          const nomeParts = currentUser.nome_completo.trim().split(' ');
          setPrimeiroNome(nomeParts[0] || currentUser.nome_completo);
          setIsOpen(true);
          // Marca no localStorage para não exibir repetidamente em cada troca de tela no mesmo dia
          localStorage.setItem(storageKey, 'true');
        } else {
          setIsOpen(false);
        }
      } else {
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Erro ao verificar aniversário:', err);
      setIsOpen(false);
    }
  }, [currentUser]);

  if (!isOpen || !currentUser) return null;

  return (
    <div
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-gradient-to-b from-amber-50 via-white to-orange-50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 border-2 border-amber-300 dark:border-amber-500/40 rounded-[2.5rem] shadow-2xl max-w-md w-full p-7 text-center overflow-hidden cursor-default"
      >
        {/* Confetes e luzes decorativas de fundo */}
        <div className="absolute -top-10 -left-10 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-orange-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-4 left-6 text-2xl animate-bounce">🎈</div>
        <div className="absolute top-6 right-6 text-2xl animate-bounce delay-150">🎉</div>
        <div className="absolute bottom-6 left-6 text-xl animate-pulse">✨</div>
        <div className="absolute bottom-6 right-6 text-xl animate-pulse delay-200">🎂</div>

        {/* Botão fechar */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ícone de Destaque Festivo */}
        <div className="relative mx-auto mb-4 w-20 h-20 bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 rounded-3xl p-1 shadow-lg shadow-orange-500/30 flex items-center justify-center">
          <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[1.35rem] flex items-center justify-center">
            <Cake className="w-10 h-10 text-amber-500 animate-pulse" />
          </div>
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
          </span>
        </div>

        {/* Mensagem Descontraída e Afetuosa */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-full text-xs font-black uppercase tracking-wider">
            <PartyPopper className="w-3.5 h-3.5" />
            Hoje o dia é todo seu!
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Feliz Aniversário, <span className="text-amber-600 dark:text-amber-400">{primeiroNome}</span>! 🥳
          </h2>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium px-2">
            Toda a equipe da <strong>Vigilância Sanitária</strong> deseja a você um novo ciclo cheio de saúde, conquistas, momentos incríveis e muita alegria!
          </p>

          <div className="bg-amber-100/70 dark:bg-slate-800/80 border border-amber-200/80 dark:border-amber-500/20 rounded-2xl p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-center gap-2">
            <Gift className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Que seu dia seja leve, especial e com direito a muito bolo! 🍰☕</span>
          </div>
        </div>

        {/* Botão de Agradecimento / Fechamento */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setIsOpen(false)}
            className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm py-3 px-6 rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transform active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wide"
          >
            <Smile className="w-4 h-4" />
            Valeu, Obrigado!
          </button>
        </div>
      </div>
    </div>
  );
};
