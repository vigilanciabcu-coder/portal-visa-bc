import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Mail,
  Building2,
  User,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Send,
  ExternalLink,
  RefreshCw,
  Clock,
  LogIn,
  X,
  Store
} from 'lucide-react';
import { UserProfile, ContabilidadeProfile, CidadaoProfile, ContribuinteProfile } from '../types';
import { INITIAL_CIDADAOS, INITIAL_CONTABILIDADES, INITIAL_USERS, INITIAL_CONTRIBUINTES } from '../data/mockData';
import {
  updateContabilidadeSenhaSupabase,
  updateOperadorSenhaSupabase,
  updateContribuinteSenhaSupabase,
  updateCidadaoSenhaSupabase,
  fetchContabilidadesFromSupabase,
  fetchContribuintesFromSupabase,
  fetchCidadaosFromSupabase,
  isSupabaseConfigured
} from '../lib/supabaseService';

interface RecuperarSenhaModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProfile?: 'contabilidade' | 'contribuinte' | 'cidadao' | 'servidor';
  onSuccessReset?: (userType: 'contabilidade' | 'contribuinte' | 'cidadao' | 'servidor', identifier: string) => void;
}

export const RecuperarSenhaModal: React.FC<RecuperarSenhaModalProps> = ({
  isOpen,
  onClose,
  initialProfile = 'contabilidade',
  onSuccessReset
}) => {
  const [profile, setProfile] = useState<'contabilidade' | 'contribuinte' | 'cidadao' | 'servidor'>(initialProfile);
  const [step, setStep] = useState<'request' | 'sent' | 'reset' | 'success'>('request');
  
  // Step 1: Form
  const [identificador, setIdentificador] = useState('');
  const [emailRecuperacao, setEmailRecuperacao] = useState('');
  const [erroMsg, setErroMsg] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Recovery Session Data
  const [accountFound, setAccountFound] = useState<{
    id: string;
    nome: string;
    email: string;
    identificador: string;
    tipo: 'contabilidade' | 'contribuinte' | 'cidadao' | 'servidor';
  } | null>(null);

  const [codigoSeguranca, setCodigoSeguranca] = useState('');
  const [codigoDigitado, setCodigoDigitado] = useState('');
  const [tempoRestante, setTempoRestante] = useState(900); // 15 minutos

  // Step 3: New Password
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Sync profile when opened
  useEffect(() => {
    if (isOpen) {
      setProfile(initialProfile);
      setStep('request');
      setIdentificador('');
      setEmailRecuperacao('');
      setErroMsg('');
      setNovaSenha('');
      setConfirmarNovaSenha('');
      setCodigoDigitado('');
    }
  }, [isOpen, initialProfile]);

  // Timer countdown
  useEffect(() => {
    let timer: any;
    if (step === 'sent' && tempoRestante > 0) {
      timer = setInterval(() => {
        setTempoRestante(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, tempoRestante]);

  if (!isOpen) return null;

  // Helper de leitura das Contabilidades
  const getSavedContabs = (): ContabilidadeProfile[] => {
    const saved = localStorage.getItem('visa_contabilidades_lab');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (err) {
        console.error(err);
      }
    }
    return INITIAL_CONTABILIDADES || [];
  };

  // Helper de leitura dos Munícipes / Cidadãos
  const getSavedCidadaos = (): CidadaoProfile[] => {
    const saved = localStorage.getItem('visa_cidadaos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (err) {
        console.error(err);
      }
    }
    return INITIAL_CIDADAOS || [];
  };

  // Helper de leitura dos Contribuintes (Empresários / Feirantes)
  const getSavedContribuintes = (): ContribuinteProfile[] => {
    const saved = localStorage.getItem('visa_contribuintes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (err) {
        console.error(err);
      }
    }
    return INITIAL_CONTRIBUINTES || [];
  };

  // Helper de leitura dos Servidores
  const getSavedUsers = (): UserProfile[] => {
    const saved = localStorage.getItem('visa_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (err) {
        console.error(err);
      }
    }
    return INITIAL_USERS || [];
  };

  // 1. Validar e Solicitar Recuperação
  const handleSolicitarRecuperacao = (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg('');
    setCarregando(true);

    const cleanIdent = identificador.trim().toLowerCase();
    const cleanDigits = identificador.replace(/\D/g, '');
    const cleanEmail = emailRecuperacao.trim().toLowerCase();

    if (!cleanIdent || !cleanEmail) {
      setErroMsg('Por favor, preencha o identificador e o e-mail de recuperação.');
      setCarregando(false);
      return;
    }

    setTimeout(() => {
      let matchedAccount: any = null;

      if (profile === 'contabilidade') {
        const contabs = getSavedContabs();
        matchedAccount = contabs.find(c => {
          const cCnpj = (c.cnpj || '').replace(/\D/g, '');
          const cCrc = (c.crc || '').toLowerCase().replace(/\s/g, '');
          const cEmail = (c.email || '').toLowerCase().trim();

          const matchesIdent = (cleanDigits.length >= 8 && cCnpj.includes(cleanDigits)) ||
                               cCrc === cleanIdent.replace(/\s/g, '') ||
                               cEmail === cleanIdent;

          const matchesEmail = cEmail === cleanEmail;
          return matchesIdent && matchesEmail;
        });

        if (!matchedAccount) {
          // Verifica se encontrou pelo identificador mas o e-mail não confere
          const identExists = contabs.find(c => {
            const cCnpj = (c.cnpj || '').replace(/\D/g, '');
            const cCrc = (c.crc || '').toLowerCase().replace(/\s/g, '');
            return (cleanDigits.length >= 8 && cCnpj.includes(cleanDigits)) || cCrc === cleanIdent.replace(/\s/g, '');
          });

          if (identExists) {
            setErroMsg('O e-mail informado não corresponde ao e-mail cadastrado neste CNPJ/CRC.');
          } else {
            setErroMsg('Nenhum escritório contábil localizado com este CNPJ ou CRC.');
          }
          setCarregando(false);
          return;
        }

        setAccountFound({
          id: matchedAccount.id,
          nome: matchedAccount.nome_fantasia || matchedAccount.razao_social,
          email: matchedAccount.email,
          identificador: matchedAccount.cnpj,
          tipo: 'contabilidade'
        });

      } else if (profile === 'contribuinte') {
        const contribuintes = getSavedContribuintes();
        matchedAccount = contribuintes.find(c => {
          const cDocDigits = (c.cnpj_cpf || '').replace(/\D/g, '');
          const cEmail = (c.email || '').toLowerCase().trim();

          const matchesIdent = (cleanDigits.length >= 11 && cDocDigits === cleanDigits) || cEmail === cleanIdent;
          const matchesEmail = cEmail === cleanEmail;
          return matchesIdent && matchesEmail;
        });

        if (!matchedAccount) {
          const identExists = contribuintes.find(c => (c.cnpj_cpf || '').replace(/\D/g, '') === cleanDigits);
          if (identExists) {
            setErroMsg('O e-mail informado não corresponde ao e-mail cadastrado neste CNPJ/CPF.');
          } else {
            setErroMsg('Nenhum contribuinte ou feirante localizado com este CNPJ/CPF.');
          }
          setCarregando(false);
          return;
        }

        setAccountFound({
          id: matchedAccount.id,
          nome: matchedAccount.nome_fantasia || matchedAccount.razao_social,
          email: matchedAccount.email,
          identificador: matchedAccount.cnpj_cpf,
          tipo: 'contribuinte'
        });

      } else if (profile === 'cidadao') {
        const cidadaos = getSavedCidadaos();
        matchedAccount = cidadaos.find(c => {
          const cCpfDigits = (c.cpf || '').replace(/\D/g, '');
          const cEmail = (c.email || '').toLowerCase().trim();

          const matchesIdent = (cleanDigits.length >= 11 && cCpfDigits === cleanDigits) || cEmail === cleanIdent;
          const matchesEmail = cEmail === cleanEmail;
          return matchesIdent && matchesEmail;
        });

        if (!matchedAccount) {
          const identExists = cidadaos.find(c => (c.cpf || '').replace(/\D/g, '') === cleanDigits);
          if (identExists) {
            setErroMsg('O e-mail informado não corresponde ao e-mail cadastrado neste CPF.');
          } else {
            setErroMsg('Nenhum cidadão localizado com este CPF.');
          }
          setCarregando(false);
          return;
        }

        setAccountFound({
          id: matchedAccount.id,
          nome: matchedAccount.nome_completo,
          email: matchedAccount.email,
          identificador: matchedAccount.cpf,
          tipo: 'cidadao'
        });

      } else {
        // Servidor
        const servidores = getSavedUsers();
        matchedAccount = servidores.find(s => {
          const sEmail = (s.email || '').toLowerCase().trim();
          const sMatricula = (s.matricula || '').toLowerCase().trim();

          const matchesIdent = sEmail === cleanIdent || (sMatricula && sMatricula === cleanIdent);
          const matchesEmail = sEmail === cleanEmail;
          return matchesIdent && matchesEmail;
        });

        if (!matchedAccount) {
          setErroMsg('E-mail institucional ou matrícula não conferem com a base de servidores.');
          setCarregando(false);
          return;
        }

        setAccountFound({
          id: matchedAccount.id,
          nome: matchedAccount.nome_completo,
          email: matchedAccount.email,
          identificador: matchedAccount.email,
          tipo: 'servidor'
        });
      }

      // Gera código de 6 dígitos aleatório
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setCodigoSeguranca(code);
      setTempoRestante(900);
      setStep('sent');
      setCarregando(false);
    }, 600);
  };

  // 2. Validar Código ou Avançar via Link do E-mail
  const handleValidarCodigo = (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg('');

    if (codigoDigitado.trim() !== codigoSeguranca) {
      setErroMsg('Código de segurança incorreto. Verifique o código no e-mail recebido.');
      return;
    }

    setStep('reset');
  };

  // 3. Salvar Nova Senha
  const handleSalvarNovaSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg('');

    if (novaSenha.length < 6) {
      setErroMsg('A nova senha deve possuir pelo menos 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      setErroMsg('A confirmação de senha não coincide com a nova senha digitada.');
      return;
    }

    if (!accountFound) return;

    setCarregando(true);

    try {
      // 1. Atualiza no LocalStorage
      if (accountFound.tipo === 'contabilidade') {
        const contabs = getSavedContabs();
        const updated = contabs.map(c => {
          if (c.id === accountFound.id || c.cnpj === accountFound.identificador) {
            return { ...c, senha: novaSenha.trim() };
          }
          return c;
        });
        localStorage.setItem('visa_contabilidades_lab', JSON.stringify(updated));

        // Atualiza no Supabase
        await updateContabilidadeSenhaSupabase(accountFound.identificador, novaSenha.trim());

      } else if (accountFound.tipo === 'contribuinte') {
        const contribuintes = getSavedContribuintes();
        const updated = contribuintes.map(c => {
          if (c.id === accountFound.id || c.cnpj_cpf === accountFound.identificador) {
            return { ...c, senha: novaSenha.trim() };
          }
          return c;
        });
        localStorage.setItem('visa_contribuintes', JSON.stringify(updated));

        // Atualiza no Supabase
        await updateContribuinteSenhaSupabase(accountFound.identificador, novaSenha.trim());

      } else if (accountFound.tipo === 'cidadao') {
        const cidadaos = getSavedCidadaos();
        const updated = cidadaos.map(c => {
          if (c.id === accountFound.id || c.cpf === accountFound.identificador) {
            return { ...c, senha: novaSenha.trim() };
          }
          return c;
        });
        localStorage.setItem('visa_cidadaos', JSON.stringify(updated));

        // Atualiza no Supabase
        await updateCidadaoSenhaSupabase(accountFound.identificador, novaSenha.trim());

      } else {
        // Servidor
        const servidores = getSavedUsers();
        const updated = servidores.map(s => {
          if (s.id === accountFound.id || s.email.toLowerCase() === accountFound.email.toLowerCase()) {
            return { ...s, senha: novaSenha.trim() };
          }
          return s;
        });
        localStorage.setItem('visa_users', JSON.stringify(updated));

        // Atualiza no Supabase
        await updateOperadorSenhaSupabase(accountFound.email, novaSenha.trim());
      }

      setStep('success');
      if (onSuccessReset) {
        onSuccessReset(accountFound.tipo, accountFound.identificador);
      }
    } catch (err) {
      console.error('Erro ao salvar nova senha:', err);
      setErroMsg('Ocorreu um erro ao salvar a nova senha. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  const formatMinutos = (seg: number) => {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[2500] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl space-y-5 my-auto relative">
        
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full bg-slate-100 dark:bg-slate-800 cursor-pointer transition"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header */}
        <div className="text-center space-y-1.5 pt-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white tracking-tight">
            Recuperação de Senha
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Divisão de Vigilância Sanitária • Balneário Camboriú
          </p>
        </div>

        {/* ========================================================= */}
        {/* ETAPA 1: SOLICITAÇÃO COM CONFIRMAÇÃO DE E-MAIL           */}
        {/* ========================================================= */}
        {step === 'request' && (
          <div className="space-y-4">
            {/* Seletor de Perfil */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setProfile('servidor');
                  setErroMsg('');
                }}
                className={`py-2 px-1 rounded-xl text-[11px] font-black transition flex flex-col items-center gap-1 cursor-pointer ${
                  profile === 'servidor'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Servidor</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProfile('contabilidade');
                  setErroMsg('');
                }}
                className={`py-2 px-1 rounded-xl text-[11px] font-black transition flex flex-col items-center gap-1 cursor-pointer ${
                  profile === 'contabilidade'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Contabilista</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProfile('contribuinte');
                  setErroMsg('');
                }}
                className={`py-2 px-1 rounded-xl text-[11px] font-black transition flex flex-col items-center gap-1 cursor-pointer ${
                  profile === 'contribuinte'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Contribuinte</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProfile('cidadao');
                  setErroMsg('');
                }}
                className={`py-2 px-1 rounded-xl text-[11px] font-black transition flex flex-col items-center gap-1 cursor-pointer ${
                  profile === 'cidadao'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Cidadão</span>
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-left">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {profile === 'contabilidade' && (
                  <>🏢 <strong>Escritório Contábil (Contabilista):</strong> Informe o <b>CNPJ</b> ou <b>CRC</b> do escritório e o <b>e-mail cadastrado</b> para receber o link seguro de alteração de senha.</>
                )}
                {profile === 'contribuinte' && (
                  <>🏪 <strong>Contribuinte (Empresário / Feirante):</strong> Informe o seu <b>CNPJ</b> ou <b>CPF</b> e o <b>e-mail cadastrado</b> para receber o código de redefinição.</>
                )}
                {profile === 'cidadao' && (
                  <>👤 <strong>Cidadão:</strong> Informe o seu <b>CPF</b> e o <b>e-mail cadastrado</b> para validar sua identidade e redefinir sua senha.</>
                )}
                {profile === 'servidor' && (
                  <>🛡️ <strong>Servidor VISA:</strong> Informe seu <b>e-mail institucional</b> ou <b>matrícula</b> para receber o link de redefinição de credenciais.</>
                )}
              </p>
            </div>

            {erroMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{erroMsg}</span>
              </div>
            )}

            <form onSubmit={handleSolicitarRecuperacao} className="space-y-3 text-left">
              <div>
                <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                  {profile === 'contabilidade' ? 'CNPJ ou CRC do Escritório' : profile === 'contribuinte' ? 'CNPJ ou CPF do Contribuinte' : profile === 'cidadao' ? 'CPF do Cidadão' : 'E-mail ou Matrícula do Servidor'}
                </label>
                <div className="relative">
                  {profile === 'contabilidade' ? (
                    <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  ) : profile === 'contribuinte' ? (
                    <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  ) : profile === 'cidadao' ? (
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  )}
                  <input
                    type="text"
                    required
                    placeholder={
                      profile === 'contabilidade'
                        ? 'Ex: 83.102.285/0001-07 ou CRC/SC 12345'
                        : profile === 'contribuinte'
                        ? 'Ex: 00.000.000/0000-00 ou CPF'
                        : profile === 'cidadao'
                        ? 'Ex: 000.000.000-00'
                        : 'Ex: fiscal@bc.sc.gov.br'
                    }
                    value={identificador}
                    onChange={(e) => setIdentificador(e.target.value)}
                    className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none transition text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                  Confirme o E-mail de Recuperação (Cadastrado)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="Ex: seuemail@contabilidade.com.br"
                    value={emailRecuperacao}
                    onChange={(e) => setEmailRecuperacao(e.target.value)}
                    className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none transition text-xs"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  O link de alteração de senha só será enviado se este e-mail for idêntico ao registrado no cadastro.
                </span>
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black py-3 rounded-2xl shadow-xl transition uppercase tracking-wider text-xs cursor-pointer flex items-center justify-center gap-2 mt-3"
              >
                {carregando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verificando Dados...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirmar e Enviar Link de Redefinição</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* ETAPA 2: E-MAIL ENVIADO COM LINK DE ALTERAR SENHA         */}
        {/* ========================================================= */}
        {step === 'sent' && accountFound && (
          <div className="space-y-4 text-left">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-black text-emerald-800 dark:text-emerald-200">
                  E-mail de Recuperação Enviado com Sucesso!
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Enviamos as instruções para <b>{accountFound.email}</b>.
                </p>
              </div>
            </div>

            {/* Simulação de E-mail Oficial Institucional */}
            <div className="bg-slate-950 text-slate-100 rounded-2xl p-4 border border-slate-800 shadow-inner space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black text-white">
                    PMBC
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">DVIS • Prefeitura de Balneário Camboriú</p>
                    <p className="text-[10px] text-slate-400">dvis-notifica@bc.sc.gov.br</p>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                  Agora mesmo
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <p className="font-bold text-blue-300">
                  Assunto: [DVIS] Solicitação de Redefinição de Senha de Acesso
                </p>
                <p className="text-slate-300 leading-relaxed">
                  Olá, <strong>{accountFound.nome}</strong>! Recebemos uma solicitação de redefinição de senha para sua conta ({accountFound.identificador}).
                </p>

                {/* Botão de Redefinição no E-mail */}
                <div className="py-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('reset');
                      setErroMsg('');
                    }}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-black py-2.5 px-4 rounded-xl shadow-lg transition uppercase tracking-wider text-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>🔗 Redefinir Minha Senha Agora (Link Direto)</span>
                  </button>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase text-slate-400 font-bold block mb-1">
                    Ou utilize o Código PIN de Segurança de 6 dígitos:
                  </span>
                  <span className="font-mono text-xl font-black text-amber-400 tracking-widest">
                    {codigoSeguranca}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" /> Expira em: <b>{formatMinutos(tempoRestante)}</b>
                </span>
                <span>ID: #SEC-{codigoSeguranca}</span>
              </div>
            </div>

            {/* Digitar Código Manualmente */}
            <form onSubmit={handleValidarCodigo} className="space-y-2 pt-1">
              <label className="text-[10px] font-bold uppercase block text-slate-600 dark:text-slate-400">
                Inserir Código PIN para Continuar:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={codigoDigitado}
                  onChange={(e) => setCodigoDigitado(e.target.value.replace(/\D/g, ''))}
                  className="p-2.5 text-center font-mono font-black text-base tracking-widest w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
                <button
                  type="submit"
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer shrink-0 transition"
                >
                  Validar
                </button>
              </div>
            </form>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setStep('request')}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 cursor-pointer font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Corrigir e-mail
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ETAPA 3: DEFINIÇÃO DA NOVA SENHA                         */}
        {/* ========================================================= */}
        {step === 'reset' && accountFound && (
          <div className="space-y-4 text-left">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 rounded-2xl">
              <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
                Redefinindo senha para: <b>{accountFound.nome}</b>
              </p>
              <p className="text-[11px] text-blue-700 dark:text-blue-300">
                Identificador: {accountFound.identificador}
              </p>
            </div>

            {erroMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{erroMsg}</span>
              </div>
            )}

            <form onSubmit={handleSalvarNovaSenha} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                  Nova Senha (Mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    required
                    placeholder="Digite sua nova senha"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    className="p-2.5 pl-9 pr-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    required
                    placeholder="Repita a nova senha"
                    value={confirmarNovaSenha}
                    onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                    className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition text-xs"
                  />
                </div>
              </div>

              {/* Indicador de Força */}
              {novaSenha.length > 0 && (
                <div className="space-y-1">
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-300 ${
                        novaSenha.length < 6
                          ? 'w-1/3 bg-rose-500'
                          : novaSenha.length < 8
                          ? 'w-2/3 bg-amber-500'
                          : 'w-full bg-emerald-500'
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {novaSenha.length < 6
                      ? 'Muito fraca (mínimo 6 caracteres)'
                      : novaSenha.length < 8
                      ? 'Senha boa'
                      : 'Senha forte e segura!'}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={carregando}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-3 rounded-2xl shadow-xl transition uppercase tracking-wider text-xs cursor-pointer flex items-center justify-center gap-2 mt-3"
              >
                {carregando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Salvando Nova Senha...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Gravar Nova Senha & Atualizar Banco</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* ETAPA 4: SUCESSO                                         */}
        {/* ========================================================= */}
        {step === 'success' && (
          <div className="space-y-4 text-center py-4">
            <div className="inline-flex p-4 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">
                Senha Alterada com Sucesso!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Sua nova senha já está ativa no banco de dados e pronta para uso imediato no portal.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl shadow-xl transition uppercase tracking-wider text-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Voltar ao Login e Entrar</span>
            </button>
          </div>
        )}

        {/* Footer do Modal */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold uppercase transition cursor-pointer"
          >
            Voltar para a tela anterior
          </button>
        </div>
      </div>
    </div>
  );
};
