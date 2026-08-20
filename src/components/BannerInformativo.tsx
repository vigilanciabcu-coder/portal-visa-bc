import React, { useEffect, useRef } from 'react';

/**
 * Componente de Divulgação e Banner Institucional / Parceiro (728x90)
 */
export const BannerInformativo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Limpa filhos anteriores para evitar duplicações
    containerRef.current.innerHTML = '';
    const container = containerRef.current;

    // Configuração de carregamento do frame institucional
    (window as any).atOptions = {
      key: 'aad16494a7657559300a9756202cad54',
      format: 'iframe',
      height: 90,
      width: 728,
      params: {}
    };

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://www.highperformanceformat.com/aad16494a7657559300a9756202cad54/invoke.js';
    script.async = true;

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="w-full flex justify-center items-center py-2 bg-slate-100/50 dark:bg-slate-900/50 border-t border-slate-200/40 dark:border-slate-800/40">
      <div
        ref={containerRef}
        id="painel-divulgacao-728x90"
        className="w-[728px] h-[90px] max-w-full flex justify-center items-center overflow-hidden rounded-lg bg-transparent"
        style={{ minHeight: '90px', minWidth: '300px' }}
      />
    </div>
  );
};
