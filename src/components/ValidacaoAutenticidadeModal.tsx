import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Building2,
  FileCheck2,
  Calendar,
  X,
  ExternalLink,
  Lock,
  QrCode
} from 'lucide-react';

interface ValidacaoAutenticidadeModalProps {
  token: string;
  numProcesso?: string;
  razaoSocial?: string;
  tipoDoc?: string;
  onClose: () => void;
}

export const ValidacaoAutenticidadeModal: React.FC<ValidacaoAutenticidadeModalProps> = ({
  token,
  numProcesso,
  razaoSocial,
  tipoDoc,
  onClose
}) => {
  const dataHoje = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const horaAgora = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-emerald-500/40 text-slate-100 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden relative">
        {/* Faixa Superior de Sucesso */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-3 ring-4 ring-emerald-400/30">
            <ShieldCheck className="w-10 h-10 text-emerald-600" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-950/80 text-emerald-200 border border-emerald-400/30 mb-1.5">
            Autenticidade Oficial Confirmada
          </span>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">
            Documento Sanitário Válido
          </h2>
          <p className="text-xs text-emerald-100 font-medium">
            Prefeitura Municipal de Balneário Camboriú • DVIS
          </p>
        </div>

        {/* Corpo com Detalhes da Certificação */}
        <div className="p-6 space-y-4 text-xs">
          {/* Card com Código e Status */}
          <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-400 block tracking-wider">
                Chave de Autenticação Digital
              </span>
              <span className="font-mono text-sm sm:text-base font-black text-white tracking-wider block mt-0.5">
                {token}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl font-black text-[10px] uppercase">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Autêntico</span>
            </div>
          </div>

          {/* Dados do Processo Vinculado */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-blue-400" />
                Dados do Ato Fiscal
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Consulta em {dataHoje} às {horaAgora}
              </span>
            </div>

            <div className="space-y-1.5">
              {numProcesso && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Processo Sanitário:</span>
                  <strong className="text-blue-300 font-mono font-bold text-xs">{numProcesso}</strong>
                </div>
              )}

              {razaoSocial && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Estabelecimento:</span>
                  <strong className="text-white uppercase truncate max-w-[240px] text-right font-bold">
                    {razaoSocial}
                  </strong>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Órgão Emissor:</span>
                <span className="text-slate-200 font-medium text-right">
                  Divisão de Vigilância Sanitária (DVIS)
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Município / Estado:</span>
                <span className="text-slate-200 font-medium">Balneário Camboriú / SC</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Certificação:</span>
                <span className="text-emerald-400 font-mono text-[11px] font-bold">
                  ✓ MP 2.200-2/2001 & LC 40/2019
                </span>
              </div>
            </div>
          </div>

          {/* Declaração Legal */}
          <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-slate-700/60 text-center">
            A autenticidade e integridade deste documento oficial foram verificadas diretamente no banco de dados da <strong>Diretoria de Vigilância Sanitária e Ambiental de Balneário Camboriú</strong>.
          </p>

          {/* Botão de Fechar / Acessar */}
          <div className="pt-2 flex items-center justify-center">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition active:scale-95 cursor-pointer text-center"
            >
              Concluir Verificação & Acessar Portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
