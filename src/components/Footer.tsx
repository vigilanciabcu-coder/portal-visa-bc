import React, { useEffect, useState } from 'react';

export const Footer: React.FC = () => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [marqueeText, setMarqueeText] = useState('⚠️ PORTAL VIGILÂNCIA BC • SISTEMA DE FISCALIZAÇÃO ATIVO • ');

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

  useEffect(() => {
    const fetchHistory = async () => {
      const now = new Date();
      const dia = now.getDate();
      const mes = now.getMonth() + 1;
      const diaSemana = now.toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase();

      try {
        const res = await fetch(`https://pt.wikipedia.org/api/rest_v1/feed/onthisday/events/${mes}/${dia}`);
        if (res.ok) {
          const data = await res.json();
          const fato = data.events ? data.events[0] : { year: now.getFullYear(), text: 'Desejamos um excelente trabalho a toda equipe de fiscalização!' };
          setMarqueeText(
            `⚠️ PORTAL VIGILÂNCIA BC • SISTEMA DE FISCALIZAÇÃO EM TEMPO REAL ATIVO • ${diaSemana} • HOJE NA HISTÓRIA: EM ${fato.year}, ${fato.text.toUpperCase()} • `
          );
          return;
        }
      } catch {
        // Fallback
      }
      setMarqueeText(`⚠️ PORTAL VIGILÂNCIA BC • SISTEMA DE FISCALIZAÇÃO EM TEMPO REAL ATIVO • ${diaSemana} • BOM TRABALHO A TODA A EQUIPE!`);
    };

    fetchHistory();
  }, []);

  return (
    <footer className="footer-bar text-center">
      <div className="marquee-box">
        <div id="marquee-text">{marqueeText}</div>
      </div>
      <div className="relogio-windows text-center px-2">
        <p id="win-hora" className="text-amber-400 font-mono tracking-wider">{timeStr}</p>
        <p id="win-data" className="text-slate-300 font-mono text-[9px]">{dateStr}</p>
      </div>
    </footer>
  );
};
