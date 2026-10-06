import React, { useState, useEffect } from 'react';
import {
  X,
  Github,
  GitBranch,
  GitCommit,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  UploadCloud,
  Terminal,
  Key,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface GitHubSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubSyncModal: React.FC<GitHubSyncModalProps> = ({ isOpen, onClose }) => {
  const [repoUrl, setRepoUrl] = useState(
    () => localStorage.getItem('visa_github_repo') || 'https://github.com/vigilanciabcu-coder/portal-visa-bc.git'
  );
  const [token, setToken] = useState(() => localStorage.getItem('visa_github_token') || '');
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [gitStatus, setGitStatus] = useState<{
    initialized: boolean;
    currentBranch: string;
    lastCommit: string;
  } | null>(null);
  const [resultado, setResultado] = useState<{
    sucesso: boolean;
    mensagem: string;
    detalhes?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Busca status do repositório local
  const carregarStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/github/status');
      const data = await res.json();
      setGitStatus(data);
    } catch (err) {
      console.warn('Erro ao obter status git:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      carregarStatus();
      setResultado(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim() || !token.trim()) {
      alert('Por favor, informe a URL do repositório e o Personal Access Token do GitHub.');
      return;
    }

    setLoading(true);
    setResultado(null);

    // Salva URL localmente para conveniência
    localStorage.setItem('visa_github_repo', repoUrl.trim());
    localStorage.setItem('visa_github_token', token.trim());

    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: repoUrl.trim(),
          token: token.trim(),
          branch: branch.trim() || 'main'
        })
      });

      const data = await res.json();
      if (res.ok && data.sucesso) {
        setResultado({
          sucesso: true,
          mensagem: data.mensagem || 'Código enviado com sucesso para o GitHub!',
          detalhes: data.detalhes
        });
        carregarStatus();
      } else {
        setResultado({
          sucesso: false,
          mensagem: data.erro || 'Falha ao sincronizar com o GitHub.',
          detalhes: data.detalhes
        });
      }
    } catch (err: any) {
      setResultado({
        sucesso: false,
        mensagem: 'Erro de comunicação ao enviar para o GitHub.',
        detalhes: err?.message || String(err)
      });
    } finally {
      setLoading(false);
    }
  };

  const comandoManual = `git remote add origin ${repoUrl || 'https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git'}\ngit branch -M main\ngit push -u origin main --force`;

  const copiarComando = () => {
    navigator.clipboard.writeText(comandoManual);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#111625] border border-blue-500/40 text-slate-100 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-4">
        
        {/* Cabeçalho */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-lg">
              <Github className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Enviar Código para o GitHub
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  GIT ATIVO
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sincronize o projeto VISA-BC com seu repositório remoto oficial
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 sm:p-6 space-y-5 text-xs text-slate-300">
          
          {/* Card de Status do Git Local */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <GitBranch className="w-3.5 h-3.5 text-blue-400" />
                <span>Branch Local:</span>
                <strong className="text-white font-mono">{gitStatus?.currentBranch || 'main'}</strong>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <GitCommit className="w-3.5 h-3.5 text-emerald-400" />
                <span>Último Commit:</span>
                <strong className="text-emerald-300 font-mono truncate max-w-[280px] sm:max-w-md">
                  {gitStatus?.lastCommit || 'Carregando...'}
                </strong>
              </div>
            </div>

            <button
              onClick={carregarStatus}
              disabled={statusLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Atualizar status"
            >
              <RefreshCw className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Feedback de Resultado */}
          {resultado && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                resultado.sucesso
                  ? 'bg-emerald-950/70 border-emerald-600/70 text-emerald-200'
                  : 'bg-rose-950/70 border-rose-600/70 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {resultado.sucesso ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <span>{resultado.mensagem}</span>
              </div>
              {resultado.detalhes && (
                <pre className="p-2 rounded-lg bg-black/40 text-[10px] font-mono whitespace-pre-wrap overflow-x-auto max-h-24">
                  {resultado.detalhes}
                </pre>
              )}
            </div>
          )}

          {/* Formulário de Push Direto */}
          <form onSubmit={handlePush} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                URL do Repositório GitHub
              </label>
              <div className="relative">
                <Github className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="https://github.com/seu-usuario/visa-bc.git"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Exemplo: <code>https://github.com/manof1/visa-bc.git</code>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-200 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>GitHub Personal Access Token (PAT)</span>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=VISA-BC-App"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-[10px] lowercase flex items-center gap-0.5"
                  >
                    <span>gerar token</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Token com permissão de escrita (escopo <code>repo</code>). O token é usado apenas para autenticar o push e não é salvo no repositório.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                  Branch
                </label>
                <div className="relative">
                  <GitBranch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="main"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg transition active:scale-98 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Enviando código para o GitHub...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>🚀 Enviar Todo o Código para o GitHub</span>
                </>
              )}
            </button>
          </form>

          {/* Opção Alternativa: Comandos no Terminal do Desenvolvedor */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                Ou execute os comandos no terminal do seu computador:
              </span>
              <button
                type="button"
                onClick={copiarComando}
                className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            <pre className="p-3 rounded-xl bg-black/60 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto">
              {comandoManual}
            </pre>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Todos os arquivos e histórico git preservados</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
