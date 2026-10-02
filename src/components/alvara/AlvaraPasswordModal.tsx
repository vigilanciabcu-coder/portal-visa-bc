import React from 'react';
import { Lock, X, KeyRound, CheckCircle } from 'lucide-react';
import { UserProfile } from '../../types';

interface AlvaraPasswordModalProps {
  currentUser: UserProfile | null;
  userPasswordInput: string;
  setUserPasswordInput: (val: string) => void;
  passwordError: string | null;
  setPasswordError: (val: string | null) => void;
  isSigning: boolean;
  onConfirm: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function AlvaraPasswordModal({
  currentUser,
  userPasswordInput,
  setUserPasswordInput,
  passwordError,
  setPasswordError,
  isSigning,
  onConfirm,
  onClose,
}: AlvaraPasswordModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Assinatura Digital do Alvará
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Autenticação da Autoridade Sanitária
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="text-xs text-slate-700 dark:text-slate-300">
            <span className="font-bold text-slate-900 dark:text-white">Responsável: </span>
            {currentUser?.nome_completo || 'Autoridade Sanitária'}
          </div>
          <div className="text-xs text-slate-700 dark:text-slate-300">
            <span className="font-bold text-slate-900 dark:text-white">Matrícula: </span>
            {currentUser?.matricula || 'DVIS-BC'}
          </div>
          <div className="text-[11px] text-amber-800 dark:text-amber-300 font-medium bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
            Ao confirmar com sua senha, o sistema aplicará o carimbo oficial:
            <div className="mt-1 font-mono text-[10px] text-slate-700 dark:text-slate-300 italic">
              &ldquo;Validado administrativamente por {currentUser?.nome_completo || 'XXXXXXXXX'} em {new Date().toLocaleDateString('pt-BR')}, via classificação de risco sanitário.&rdquo;
            </div>
          </div>
        </div>

        <form onSubmit={onConfirm} className="space-y-4">
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              <span>Digite sua senha de usuário *</span>
            </label>
            <input
              type="password"
              autoFocus
              required
              value={userPasswordInput}
              onChange={(e) => {
                setUserPasswordInput(e.target.value);
                setPasswordError(null);
              }}
              placeholder="Informe sua senha para assinar..."
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {passwordError && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-semibold">
                {passwordError}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSigning}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSigning ? 'Assinando...' : 'Confirmar & Assinar Digitalmente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
