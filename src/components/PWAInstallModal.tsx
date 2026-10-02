import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  Monitor,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  Sparkles,
  Zap,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { usePWAInstall } from '../lib/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [instalanding, setInstalanding] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setInstalanding(true);
    const success = await install();
    setInstalanding(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#111625] border border-blue-500/40 text-slate-100 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Cabeçalho do Modal */}
        <div className="p-5 bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center p-1.5 shadow-lg">
              <img
                src="/brasao_bc.png"
                alt="Brasão Balneário Camboriú"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Instalar App VISA-BC
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 font-mono">
                  PWA OFICIAL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Diretoria de Vigilância Sanitária de Balneário Camboriú
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo Informativo & Benefícios */}
        <div className="p-5 sm:p-6 space-y-5 text-xs text-slate-300">
          
          {/* Se já estiver instalado */}
          {isInstalled ? (
            <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-600/60 text-emerald-200 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
              <h4 className="text-sm font-black uppercase text-white">Aplicativo Já Instalado!</h4>
              <p className="text-xs text-emerald-300">
                Você já está utilizando a versão instalada oficial do <strong>Portal VISA-BC</strong>. O app está pronto na sua tela de início.
              </p>
            </div>
          ) : (
            <>
              <p className="text-slate-300 leading-relaxed">
                Você pode instalar o <strong>Portal VISA-BC</strong> diretamente no seu <strong>celular, tablet ou computador</strong> sem precisar acessar a Google Play Store ou Apple App Store.
              </p>

              {/* Vantagens do App */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h5 className="font-bold text-white text-[11px]">Acesso Rápido</h5>
                  <p className="text-[10px] text-slate-400">Ícone exclusivo na tela de início com 1 toque.</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <Smartphone className="w-5 h-5 text-blue-400" />
                  <h5 className="font-bold text-white text-[11px]">Tela Inteira</h5>
                  <p className="text-[10px] text-slate-400">Interface limpa sem barra de URL do navegador.</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <Compass className="w-5 h-5 text-cyan-400" />
                  <h5 className="font-bold text-white text-[11px]">Vistoria em Campo</h5>
                  <p className="text-[10px] text-slate-400">Mapas e formulários otimizados para a rua.</p>
                </div>
              </div>

              {/* Instruções para iOS (iPhone / iPad) */}
              {isIOS ? (
                <div className="p-4 rounded-2xl bg-blue-950/60 border border-blue-700/60 space-y-3">
                  <div className="flex items-center gap-2 text-blue-300 font-bold">
                    <Smartphone className="w-4 h-4" />
                    <span>Como instalar no iPhone ou iPad (Safari):</span>
                  </div>

                  <ol className="space-y-2 text-[11px] text-slate-200 list-decimal list-inside pl-1">
                    <li className="leading-snug">
                      Toque no botão <strong>Compartilhar</strong> do Safari{' '}
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-900/80 text-blue-200 text-[10px] font-mono">
                        <Share className="w-3 h-3 inline mr-1" /> ícone do quadrado com seta
                      </span>
                    </li>
                    <li className="leading-snug">
                      Role o menu para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>{' '}
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-900/80 text-blue-200 text-[10px] font-mono">
                        <PlusSquare className="w-3 h-3 inline mr-1" />
                      </span>
                    </li>
                    <li className="leading-snug">
                      Toque em <strong>"Adicionar"</strong> no canto superior direito. Pronto!
                    </li>
                  </ol>
                </div>
              ) : isInstallable ? (
                /* Botão Nativo de Instalação (Android / Windows / Chrome / Edge) */
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/60 to-slate-900 border border-blue-600/40 text-center space-y-3">
                  <p className="text-xs text-blue-200">
                    Clique no botão abaixo para autorizar a instalação automática no seu dispositivo:
                  </p>

                  <button
                    onClick={handleInstallClick}
                    disabled={instalanding}
                    className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-blue-600/30 transition transform active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-5 h-5 animate-bounce" />
                    <span>{instalanding ? 'Instalando...' : 'Baixar e Instalar Aplicativo'}</span>
                  </button>
                </div>
              ) : (
                /* Fallback para navegadores Desktop ou quando o evento ainda não disparou */
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-slate-300 font-bold">
                    <Monitor className="w-4 h-4 text-blue-400" />
                    <span>Como instalar no Chrome ou Edge (Computador):</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Clique no ícone de <strong>Instalar</strong> <span className="font-mono text-white">⊕</span> que aparece no final da barra de endereços do seu navegador (no canto direito superior da URL) e confirme <strong>"Instalar"</strong>.
                  </p>
                  {isAndroid && (
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      No Android, você também pode tocar nos <strong>três pontinhos (⋮)</strong> no topo do navegador e escolher <strong>"Adicionar à Tela Inicial"</strong> ou <strong>"Instalar Aplicativo"</strong>.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Aplicativo Seguro e Certificado • DVIS BC</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
