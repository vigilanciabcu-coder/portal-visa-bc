import React, { useEffect, useState } from 'react';
import { MapPin, Clock, Phone, Mail, Building2 } from 'lucide-react';

export const Footer: React.FC = () => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString('pt-BR'));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="footer-bar text-xs select-none">
      {/* Dados Institucionais em Linha Única no Padrão Solicitado */}
      <div className="flex-1 flex items-center justify-start lg:justify-center gap-2 sm:gap-3 md:gap-4 overflow-x-auto no-scrollbar whitespace-nowrap text-[11px] text-slate-300 font-medium py-1">
        {/* 1. PREFEITURA */}
        <div className="flex items-center gap-1.5 text-blue-300 font-bold shrink-0">
          <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Prefeitura Municipal de Balneário Camboriú / SC</span>
        </div>

        <span className="text-blue-700/60 shrink-0 hidden sm:inline">•</span>

        {/* 2. DIVISÃO DE VIGILÂNCIA */}
        <div className="flex items-center gap-1.5 text-white font-black uppercase tracking-wider text-[11px] shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.8)]"></span>
          <span>Divisão de Vigilância Sanitária e Ambiental (DVIS)</span>
        </div>

        <span className="text-blue-700/60 shrink-0 hidden sm:inline">•</span>

        {/* 3. PRESENCIAL */}
        <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
          <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span><strong className="text-white">Presencial:</strong> Av. Palestina, Nº 150 - Nações (88338-010)</span>
        </div>

        <span className="text-blue-700/60 shrink-0 hidden md:inline">•</span>

        {/* 4. ATENDIMENTO */}
        <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span><strong className="text-white">Atendimento:</strong> Seg a Sex, 07:00 às 19:00</span>
        </div>

        <span className="text-blue-700/60 shrink-0 hidden md:inline">•</span>

        {/* 5. TELEFONE */}
        <div className="flex items-center gap-1 text-slate-300 shrink-0">
          <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-bold text-slate-200">(47) 3267-7000</span>
        </div>

        <span className="text-blue-700/60 shrink-0 hidden lg:inline">•</span>

        {/* 6. EMAIL */}
        <div className="flex items-center gap-1 shrink-0">
          <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <a
            href="mailto:devs@bc.sc.gov.br"
            className="text-cyan-300 hover:text-cyan-200 font-bold hover:underline"
          >
            devs@bc.sc.gov.br
          </a>
        </div>
      </div>

      {/* Relógio Compacto à Direita */}
      <div className="relogio-windows shrink-0 px-2">
        <p id="win-hora" className="text-amber-400 font-mono tracking-wider font-black text-[11px] leading-tight">{timeStr}</p>
        <p id="win-data" className="text-slate-400 font-mono text-[9px] leading-tight">{dateStr}</p>
      </div>
    </footer>
  );
};
