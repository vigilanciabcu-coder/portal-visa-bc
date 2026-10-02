import React, { useState, useEffect } from 'react';
import { UserProfile, ContabilidadeProfile, CidadaoProfile, ContribuinteProfile } from '../types';
import { INITIAL_CIDADAOS, INITIAL_CONTABILIDADES, INITIAL_CONTRIBUINTES } from '../data/mockData';
import { RecuperarSenhaModal } from './RecuperarSenhaModal';
import {
  saveCidadaoToSupabase,
  fetchCidadaosFromSupabase,
  fetchContribuintesFromSupabase,
  fetchContabilidadesFromSupabase,
  isSupabaseConfigured
} from '../lib/supabaseService';
import {
  ShieldCheck,
  Building2,
  Store,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
  Mail,
  FileText,
  UserPlus,
  Phone,
  MapPin,
  KeyRound,
  AlertCircle,
  HelpCircle,
  LogIn,
  Eye,
  EyeOff,
  X,
  XCircle
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  users: UserProfile[];
  initialTab?: 'servidor' | 'contabilidade' | 'contribuinte' | 'cidadao';
  initialCidadaoMode?: 'login' | 'cadastro';
  onLoginSuccess: (user: UserProfile) => void;
  onOpenCadastroContabilidade?: () => void;
  onOpenCadastroContribuinte?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  users,
  initialTab = 'servidor',
  initialCidadaoMode = 'login',
  onLoginSuccess,
  onOpenCadastroContabilidade,
  onOpenCadastroContribuinte,
}) => {
  const [tab, setTab] = useState<'servidor' | 'contabilidade' | 'contribuinte' | 'cidadao'>(initialTab);
  
  // Atualiza a aba inicial quando o modal é aberto
  useEffect(() => {
    if (isOpen) {
      if (initialTab) setTab(initialTab);
      if (initialCidadaoMode) setCidadaoMode(initialCidadaoMode);
    }
  }, [isOpen, initialTab, initialCidadaoMode]);
  
  // Estado Servidor
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estado Contabilista (Contabilidade)
  const [contabIdentificador, setContabIdentificador] = useState('');
  const [contabSenha, setContabSenha] = useState('');
  const [showContabSenha, setShowContabSenha] = useState(false);
  const [contabError, setContabError] = useState('');

  // Estado Contribuinte (Empresário / Feirante)
  const [contribIdentificador, setContribIdentificador] = useState('');
  const [contribSenha, setContribSenha] = useState('');
  const [showContribSenha, setShowContribSenha] = useState(false);
  const [contribError, setContribError] = useState('');

  // Estado Cidadão
  const [cidadaoMode, setCidadaoMode] = useState<'login' | 'cadastro'>(initialCidadaoMode);
  const [cidadaoIdentificador, setCidadaoIdentificador] = useState('');
  const [cidadaoSenha, setCidadaoSenha] = useState('');
  const [showCidadaoSenha, setShowCidadaoSenha] = useState(false);
  const [cidadaoError, setCidadaoError] = useState('');
  const [cidadaoSuccess, setCidadaoSuccess] = useState('');

  // Formulário de Cadastro do Cidadão (Novo Usuário)
  const [novoNome, setNovoNome] = useState('');
  const [novoCpf, setNovoCpf] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novoBairro, setNovoBairro] = useState('Centro');
  const [novaSenha, setNovaSenha] = useState('');
  const [novaSenhaConfirm, setNovaSenhaConfirm] = useState('');
  const [showNovaSenha, setShowNovaSenha] = useState(false);

  // Estado Modal Recuperar Senha
  const [recuperarSenhaOpen, setRecuperarSenhaOpen] = useState(false);
  const [recuperarProfile, setRecuperarProfile] = useState<'contabilidade' | 'contribuinte' | 'cidadao' | 'servidor'>('contabilidade');

  // Sincronizar listas do Supabase na abertura do modal
  useEffect(() => {
    if (!isOpen || !isSupabaseConfigured) return;
    async function syncCloudUsers() {
      try {
        const [cloudContabs, cloudContribs, cloudCidadaos] = await Promise.all([
          fetchContabilidadesFromSupabase(),
          fetchContribuintesFromSupabase(),
          fetchCidadaosFromSupabase()
        ]);
        if (cloudContabs && cloudContabs.length > 0) {
          localStorage.setItem('visa_contabilidades_lab', JSON.stringify(cloudContabs));
        }
        if (cloudContribs && cloudContribs.length > 0) {
          localStorage.setItem('visa_contribuintes', JSON.stringify(cloudContribs));
        }
        if (cloudCidadaos && cloudCidadaos.length > 0) {
          localStorage.setItem('visa_cidadaos', JSON.stringify(cloudCidadaos));
        }
      } catch (err) {
        console.warn('Erro ao sincronizar perfis do Supabase:', err);
      }
    }
    syncCloudUsers();
  }, [isOpen]);

  if (!isOpen) return null;

  // Helper para ler contabilidades salvas
  const getSavedContabs = (): ContabilidadeProfile[] => {
    const saved = localStorage.getItem('visa_contabilidades_lab');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (err) {
        console.error('Erro ao ler contabilidades:', err);
      }
    }
    return INITIAL_CONTABILIDADES || [];
  };

  // Helper para ler contribuintes salvos
  const getSavedContribuintes = (): ContribuinteProfile[] => {
    const saved = localStorage.getItem('visa_contribuintes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (err) {
        console.error('Erro ao ler contribuintes:', err);
      }
    }
    return INITIAL_CONTRIBUINTES || [];
  };

  // Helper para ler cidadãos salvos
  const getSavedCidadaos = (): CidadaoProfile[] => {
    const saved = localStorage.getItem('visa_cidadaos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (err) {
        console.error('Erro ao ler cidadãos:', err);
      }
    }
    return INITIAL_CIDADAOS || [];
  };

  // Máscara de CPF
  const formatCPF = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 3) return raw;
    if (raw.length <= 6) return `${raw.slice(0, 3)}.${raw.slice(3)}`;
    if (raw.length <= 9) return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9, 11)}`;
  };

  // Máscara de Telefone
  const formatTelefone = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) return raw;
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
  };

  // 1. LOGIN SERVIDOR
  const handleLoginServidor = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail) {
      setErrorMsg('Por favor, digite o e-mail do operador.');
      return;
    }

    if (!cleanPass) {
      setErrorMsg('Por favor, digite a sua senha de acesso.');
      return;
    }

    const matched = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (matched) {
      const expectedPassword = (matched.senha || '123456').trim();
      if (cleanPass === expectedPassword) {
        onLoginSuccess({
          ...matched,
          tipo_usuario: 'SERVIDOR'
        });
      } else {
        setErrorMsg(`Senha incorreta para ${matched.nome_completo.split(' ')[0]}. Verifique os dados digitados ou utilize "Esqueceu a senha?".`);
      }
    } else {
      setErrorMsg('Operador não encontrado. Verifique o e-mail digitado ou solicite cadastro ao Master.');
    }
  };

  // 2. LOGIN CONTABILISTA (CONTABILIDADE) COM LOGIN E SENHA
  const handleLoginContabilidade = (e: React.FormEvent) => {
    e.preventDefault();
    setContabError('');
    const term = contabIdentificador.trim().toLowerCase();
    const termClean = contabIdentificador.replace(/\D/g, '');
    const cleanPass = contabSenha.trim();

    if (!term) {
      setContabError('Informe o CNPJ, E-mail ou CRC do escritório contábil.');
      return;
    }

    if (!cleanPass) {
      setContabError('Por favor, digite sua senha de acesso.');
      return;
    }

    const listaContabs = getSavedContabs();

    // Procura por CNPJ, E-mail ou CRC
    const matched = listaContabs.find((c) => {
      const cCnpj = (c.cnpj || '').replace(/\D/g, '');
      const cEmail = (c.email || '').toLowerCase();
      const cCrc = (c.crc || '').toLowerCase().replace(/\s/g, '');
      const cleanTerm = term.replace(/\s/g, '');

      return (
        (termClean.length >= 8 && cCnpj.includes(termClean)) ||
        cEmail === term ||
        cCrc === cleanTerm
      );
    });

    if (matched) {
      // Validação de senha estrita
      const expectedPassword = (matched.senha || '123456').trim();
      if (cleanPass === expectedPassword) {
        const contabUser: UserProfile = {
          id: matched.id,
          email: matched.email || 'contabilidade@bc.sc.gov.br',
          nome_completo: matched.razao_social || matched.nome_fantasia || 'Escritório Contábil',
          data_nascimento: '',
          cargo: 'CONTABILISTA / ESCRITÓRIO CONTÁBIL',
          tipo_usuario: 'CONTABILIDADE',
          contabilidade_id: matched.id,
          matricula: matched.crc || matched.cnpj,
          telefone: matched.telefone || ''
        };
        onLoginSuccess(contabUser);
      } else {
        setContabError(`Senha incorreta para ${matched.nome_fantasia || matched.razao_social}. Verifique a senha ou utilize a recuperação de senha.`);
      }
    } else {
      setContabError('Escritório contábil não localizado. Clique em "Cadastrar Novo Escritório Contábil" para registrar seu acesso.');
    }
  };

  // 3. LOGIN CONTRIBUINTE (EMPRESÁRIO / FEIRANTE)
  const handleLoginContribuinte = (e: React.FormEvent) => {
    e.preventDefault();
    setContribError('');
    const term = contribIdentificador.trim().toLowerCase();
    const termDigits = contribIdentificador.replace(/\D/g, '');
    const cleanPass = contribSenha.trim();

    if (!term) {
      setContribError('Informe o CNPJ, CPF ou E-mail do contribuinte.');
      return;
    }

    if (!cleanPass) {
      setContribError('Por favor, digite sua senha de acesso.');
      return;
    }

    const listaContribs = getSavedContribuintes();

    // Procura por CNPJ/CPF ou E-mail
    const matched = listaContribs.find((c) => {
      const cDocDigits = (c.cnpj_cpf || '').replace(/\D/g, '');
      const cEmail = (c.email || '').toLowerCase();
      return (termDigits.length >= 11 && cDocDigits === termDigits) || cEmail === term;
    });

    if (matched) {
      const expectedPassword = (matched.senha || '123456').trim();
      if (cleanPass === expectedPassword) {
        const contribUser: UserProfile = {
          id: matched.id,
          email: matched.email || 'contribuinte@bc.sc.gov.br',
          nome_completo: matched.nome_fantasia || matched.razao_social || 'Contribuinte / Empresário',
          cpf: matched.cnpj_cpf,
          bairro: matched.bairro,
          telefone: matched.telefone,
          data_nascimento: '',
          cargo: `CONTRIBUINTE (${matched.categoria || 'EMPRESÁRIO'})`,
          tipo_usuario: 'CONTRIBUINTE',
          nivel_acesso: 'VISA (FISCAL)'
        };
        onLoginSuccess(contribUser);
      } else {
        setContribError(`Senha incorreta para ${matched.nome_fantasia || matched.razao_social}. Verifique a senha ou utilize a recuperação.`);
      }
    } else {
      setContribError('Contribuinte não localizado. Clique em "Cadastrar Novo Contribuinte / Feirante" para registrar seu acesso.');
    }
  };

  // 4. LOGIN CIDADÃO (COM CPF/E-MAIL E SENHA)
  const handleLoginMunicipe = (e: React.FormEvent) => {
    e.preventDefault();
    setCidadaoError('');
    const term = cidadaoIdentificador.trim().toLowerCase();
    const termDigits = cidadaoIdentificador.replace(/\D/g, '');
    const cleanPass = cidadaoSenha.trim();

    if (!term) {
      setCidadaoError('Por favor, informe seu CPF ou E-mail cadastrado.');
      return;
    }

    if (!cleanPass) {
      setCidadaoError('Por favor, digite sua senha de acesso.');
      return;
    }

    const listaCidadaos = getSavedCidadaos();

    // Procura por CPF ou E-mail
    const matched = listaCidadaos.find((c) => {
      const cCpfDigits = (c.cpf || '').replace(/\D/g, '');
      const cEmail = (c.email || '').toLowerCase();
      return (termDigits.length >= 11 && cCpfDigits === termDigits) || cEmail === term;
    });

    if (matched) {
      const expectedPass = (matched.senha || '123456').trim();
      if (cleanPass === expectedPass) {
        const cidadaoUser: UserProfile = {
          id: matched.id,
          email: matched.email || 'cidadao@bc.sc.gov.br',
          nome_completo: matched.nome_completo || 'Cidadão Registrado',
          cpf: matched.cpf,
          bairro: matched.bairro,
          telefone: matched.telefone,
          data_nascimento: '',
          cargo: 'CIDADÃO (USUÁRIO REGISTRADO)',
          tipo_usuario: 'CIDADAO',
          nivel_acesso: 'VISA (FISCAL)'
        };
        onLoginSuccess(cidadaoUser);
      } else {
        setCidadaoError(`Senha incorreta para ${matched.nome_completo.split(' ')[0]}. Verifique os dados digitados ou utilize a recuperação.`);
      }
    } else {
      // Se não encontrou na lista de cidadãos registrados
      setCidadaoError('Usuário não encontrado. Se ainda não possui conta, clique na aba "Criar Novo Usuário" ao lado.');
    }
  };

  // 5. CADASTRO DE NOVO USUÁRIO CIDADÃO
  const handleCadastrarNovoMunicipe = (e: React.FormEvent) => {
    e.preventDefault();
    setCidadaoError('');
    setCidadaoSuccess('');

    if (!novoNome.trim()) {
      setCidadaoError('Por favor, informe seu Nome Completo.');
      return;
    }

    const cleanCpf = novoCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setCidadaoError('Por favor, informe um CPF válido com 11 dígitos.');
      return;
    }

    if (!novoEmail.trim() || !novoEmail.includes('@')) {
      setCidadaoError('Por favor, informe um E-mail válido.');
      return;
    }

    if (!novaSenha || novaSenha.length < 6) {
      setCidadaoError('A senha deve conter pelo menos 6 caracteres.');
      return;
    }

    if (novaSenha !== novaSenhaConfirm) {
      setCidadaoError('A confirmação de senha não coincide com a senha digitada.');
      return;
    }

    const listaCidadaos = getSavedCidadaos();

    // Verifica se CPF ou E-mail já existem
    const jaExiste = listaCidadaos.some(
      (c) => c.cpf.replace(/\D/g, '') === cleanCpf || c.email.toLowerCase() === novoEmail.trim().toLowerCase()
    );

    if (jaExiste) {
      setCidadaoError('Este CPF ou E-mail já possui cadastro. Acesse a aba "Entrar" com sua senha.');
      return;
    }

    const novoCidadao: CidadaoProfile = {
      id: 'cid-' + Date.now(),
      nome_completo: novoNome.trim(),
      cpf: formatCPF(cleanCpf),
      email: novoEmail.trim().toLowerCase(),
      telefone: novoTelefone.trim() ? formatTelefone(novoTelefone) : '',
      bairro: novoBairro,
      senha: novaSenha.trim(),
      data_cadastro: new Date().toISOString().split('T')[0]
    };

    const updatedList = [...listaCidadaos, novoCidadao];
    localStorage.setItem('visa_cidadaos', JSON.stringify(updatedList));

    // Sincroniza com Supabase
    if (isSupabaseConfigured) {
      saveCidadaoToSupabase(novoCidadao).catch((err) =>
        console.warn('Erro ao salvar cidadão no Supabase:', err)
      );
    }

    setCidadaoSuccess('Cadastro realizado com sucesso! Conectando ao portal...');

    setTimeout(() => {
      const cidadaoUser: UserProfile = {
        id: novoCidadao.id,
        email: novoCidadao.email,
        nome_completo: novoCidadao.nome_completo,
        cpf: novoCidadao.cpf,
        bairro: novoCidadao.bairro,
        telefone: novoCidadao.telefone,
        data_nascimento: '',
        cargo: 'CIDADÃO (USUÁRIO REGISTRADO)',
        tipo_usuario: 'CIDADAO',
        nivel_acesso: 'VISA (FISCAL)'
      };
      onLoginSuccess(cidadaoUser);
    }, 900);
  };

  // 6. ACESSO PÚBLICO LIVRE (SEM SENHA)
  const handleEntrarCidadaoPublico = () => {
    const cidadaoUser: UserProfile = {
      id: 'cidadao-publico',
      email: 'cidadao@bc.sc.gov.br',
      nome_completo: 'Cidadão (Consulta Pública)',
      data_nascimento: '',
      cargo: 'ACESSO PÚBLICO (CIDADÃO)',
      tipo_usuario: 'CIDADAO',
      nivel_acesso: 'VISA (FISCAL)'
    };
    onLoginSuccess(cidadaoUser);
  };

  const bairrosBC = [
    'Centro',
    'Nações',
    'Pioneiros',
    'Barra',
    'Barra Sul',
    'Praia dos Amores',
    'Ariribá',
    'Vila Real',
    'Municípios',
    'Iate Clube',
    'Estados',
    'Nova Esperança',
    'São Judas Tadeu',
    'Taquaras',
    'Laranjeiras',
    'Estaleiro',
    'Estaleirinho',
    'Praia Brava (Itajaí/BC)',
    'Outro Bairro / Região'
  ];

  if (!isOpen) return null;

  return (
    <section className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[2000] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 p-5 sm:p-7 rounded-[2.5rem] shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 text-center text-slate-900 dark:text-white space-y-4 my-auto">
        {/* Brasão Oficial e Título */}
        <div>
          <img
            src="https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/logo_bc.avif"
            alt="Prefeitura de Balneário Camboriú"
            className="h-13 mx-auto mb-1.5 object-contain"
          />
          <h2 className="text-lg sm:text-xl font-black uppercase text-blue-900 dark:text-blue-400 tracking-tight">
            Portal Vigilância Sanitária
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Balneário Camboriú • Selecione seu perfil de acesso
          </p>
        </div>

        {/* Seletor de Perfis / 4 Abas Principais */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => {
              setTab('servidor');
              setErrorMsg('');
            }}
            className={`py-2 px-1 rounded-xl text-[11px] font-black transition flex flex-col items-center gap-1 cursor-pointer ${
              tab === 'servidor'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Servidor</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('contabilidade');
              setContabError('');
            }}
            className={`py-2 px-1 rounded-xl text-[11px] font-black transition flex flex-col items-center gap-1 cursor-pointer ${
              tab === 'contabilidade'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Contabilista</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('contribuinte');
              setContribError('');
            }}
            className={`py-2 px-1 rounded-xl text-[11px] font-black transition flex flex-col items-center gap-1 cursor-pointer ${
              tab === 'contribuinte'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Contribuinte</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('cidadao');
              setCidadaoError('');
              setCidadaoSuccess('');
            }}
            className={`py-2 px-1 rounded-xl text-[11px] font-black transition flex flex-col items-center gap-1 cursor-pointer ${
              tab === 'cidadao'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Cidadão</span>
          </button>
        </div>

        {/* 1. ABA SERVIDOR VISA */}
        {tab === 'servidor' && (
          <div className="space-y-3.5 pt-1 text-left">
            <div className="bg-blue-50/70 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200/60 dark:border-blue-900/60">
              <p className="text-[11px] text-blue-900 dark:text-blue-200 font-medium">
                🛡️ <strong>Acesso Institucional:</strong> Fiscais, agentes sanitários e servidores municipais da DVIS.
              </p>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-500 font-bold bg-red-50 dark:bg-red-950/60 p-2.5 rounded-xl border border-red-200 dark:border-red-800">
                {errorMsg}
              </p>
            )}

            <form onSubmit={handleLoginServidor} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                  E-mail do Operador
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="Ex: fiscal@bc.sc.gov.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">
                    Senha de Acesso
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRecuperarProfile('servidor');
                      setRecuperarSenhaOpen(true);
                    }}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Digite sua senha de acesso"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="p-2.5 pl-9 pr-10 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-2xl shadow-xl transition uppercase tracking-widest text-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Acessar como Servidor</span>
              </button>
            </form>
          </div>
        )}

        {/* 2. ABA CONTABILISTA (ESCRITÓRIOS CONTÁBEIS) */}
        {tab === 'contabilidade' && (
          <div className="space-y-3.5 pt-1 text-left">
            <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-200/60 dark:border-indigo-900/60">
              <p className="text-[11px] text-indigo-900 dark:text-indigo-200 font-medium">
                🏢 <strong>Portal do Contabilista:</strong> Gestão de alvarás de clientes, consulta de processos e envio de documentos.
              </p>
            </div>

            {contabError && (
              <p className="text-xs text-red-500 font-bold bg-red-50 dark:bg-red-950/60 p-2.5 rounded-xl border border-red-200 dark:border-red-800">
                {contabError}
              </p>
            )}

            <form onSubmit={handleLoginContabilidade} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                  CNPJ, E-mail ou CRC do Escritório
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: 83.102.285/0001-07 ou CRC/SC 12345"
                    value={contabIdentificador}
                    onChange={(e) => setContabIdentificador(e.target.value)}
                    className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">
                    Senha de Acesso do Contabilista
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRecuperarProfile('contabilidade');
                      setRecuperarSenhaOpen(true);
                    }}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showContabSenha ? 'text' : 'password'}
                    required
                    placeholder="Digite a senha do escritório"
                    value={contabSenha}
                    onChange={(e) => setContabSenha(e.target.value)}
                    className="p-2.5 pl-9 pr-10 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowContabSenha(!showContabSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showContabSenha ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showContabSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-2xl shadow-xl transition uppercase tracking-widest text-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Acessar Portal do Contabilista</span>
              </button>
            </form>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setRecuperarProfile('contabilidade');
                  setRecuperarSenhaOpen(true);
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Recuperar Senha por E-mail (Link Seguro)</span>
              </button>

              {onOpenCadastroContabilidade && (
                <button
                  type="button"
                  onClick={onOpenCadastroContabilidade}
                  className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-indigo-200 dark:border-indigo-800"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Cadastrar Novo Escritório Contábil</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 3. ABA CONTRIBUINTE (EMPRESÁRIO / FEIRANTE) */}
        {tab === 'contribuinte' && (
          <div className="space-y-3.5 pt-1 text-left">
            <div className="bg-amber-50/70 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/60">
              <p className="text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                🏪 <strong>Portal do Contribuinte:</strong> Acesso direto para empresários, comerciantes e feirantes acompanharem seus processos e alvarás.
              </p>
            </div>

            {contribError && (
              <p className="text-xs text-red-500 font-bold bg-red-50 dark:bg-red-950/60 p-2.5 rounded-xl border border-red-200 dark:border-red-800">
                {contribError}
              </p>
            )}

            <form onSubmit={handleLoginContribuinte} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                  CNPJ, CPF ou E-mail do Contribuinte
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: 00.000.000/0000-00 ou CPF"
                    value={contribIdentificador}
                    onChange={(e) => setContribIdentificador(e.target.value)}
                    className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none transition text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">
                    Senha de Acesso
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRecuperarProfile('contribuinte');
                      setRecuperarSenhaOpen(true);
                    }}
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-bold cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showContribSenha ? 'text' : 'password'}
                    required
                    placeholder="Digite sua senha de acesso"
                    value={contribSenha}
                    onChange={(e) => setContribSenha(e.target.value)}
                    className="p-2.5 pl-9 pr-10 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none transition text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowContribSenha(!showContribSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showContribSenha ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showContribSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3 rounded-2xl shadow-xl transition uppercase tracking-widest text-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Acessar Portal do Contribuinte</span>
              </button>
            </form>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setRecuperarProfile('contribuinte');
                  setRecuperarSenhaOpen(true);
                }}
                className="text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Recuperar Senha por E-mail</span>
              </button>

              {onOpenCadastroContribuinte && (
                <button
                  type="button"
                  onClick={onOpenCadastroContribuinte}
                  className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-amber-700 dark:text-amber-300 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-amber-200 dark:border-amber-800"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Cadastrar Novo Contribuinte / Feirante</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 4. ABA CIDADÃO (LOGIN + CRIAR NOVO USUÁRIO + CONSULTA LIVRE) */}
        {tab === 'cidadao' && (
          <div className="space-y-3.5 pt-1 text-left">
            {/* Sub-Aba: Entrar / Criar Novo Usuário */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-xs">
              <button
                type="button"
                onClick={() => {
                  setCidadaoMode('login');
                  setCidadaoError('');
                  setCidadaoSuccess('');
                }}
                className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  cidadaoMode === 'login'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar (Cidadão)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCidadaoMode('cadastro');
                  setCidadaoError('');
                  setCidadaoSuccess('');
                }}
                className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  cidadaoMode === 'cadastro'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Criar Novo Usuário</span>
              </button>
            </div>

            {cidadaoError && (
              <p className="text-xs text-red-500 font-bold bg-red-50 dark:bg-red-950/60 p-2.5 rounded-xl border border-red-200 dark:border-red-800">
                {cidadaoError}
              </p>
            )}

            {cidadaoSuccess && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{cidadaoSuccess}</span>
              </p>
            )}

            {/* MODO A: LOGIN DO CIDADÃO COM LOGIN E SENHA */}
            {cidadaoMode === 'login' && (
              <form onSubmit={handleLoginMunicipe} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                    CPF ou E-mail do Cidadão
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: 000.000.000-00 ou cidadao@email.com"
                      value={cidadaoIdentificador}
                      onChange={(e) => setCidadaoIdentificador(e.target.value)}
                      className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition text-xs"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">
                      Senha de Acesso
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setRecuperarProfile('cidadao');
                        setRecuperarSenhaOpen(true);
                      }}
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showCidadaoSenha ? 'text' : 'password'}
                      required
                      placeholder="Digite sua senha de acesso"
                      value={cidadaoSenha}
                      onChange={(e) => setCidadaoSenha(e.target.value)}
                      className="p-2.5 pl-9 pr-10 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCidadaoSenha(!showCidadaoSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title={showCidadaoSenha ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {showCidadaoSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl shadow-xl transition uppercase tracking-wider text-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Entrar como Cidadão</span>
                </button>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRecuperarProfile('cidadao');
                      setRecuperarSenhaOpen(true);
                    }}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-bold hover:underline text-center cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Esqueceu a senha? Recuperar por E-mail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCidadaoMode('cadastro');
                      setCidadaoError('');
                    }}
                    className="text-xs text-slate-600 dark:text-slate-400 font-medium hover:underline text-center cursor-pointer flex items-center justify-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Não tem uma conta? Cadastre-se gratuitamente</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleEntrarCidadaoPublico}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Acesso Rápido / Consulta Livre Sem Senha</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            {/* MODO B: CRIAR NOVO USUÁRIO (CADASTRO CIDADÃO) */}
            {cidadaoMode === 'cadastro' && (
              <form onSubmit={handleCadastrarNovoMunicipe} className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
                <div>
                  <label className="text-[10px] font-bold uppercase block mb-0.5 text-slate-600 dark:text-slate-400">
                    Nome Completo <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: João da Silva"
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      className="p-2 pl-8 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-0.5 text-slate-600 dark:text-slate-400">
                      CPF <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <FileText className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="000.000.000-00"
                        value={novoCpf}
                        onChange={(e) => setNovoCpf(formatCPF(e.target.value))}
                        className="p-2 pl-8 font-mono w-full border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-0.5 text-slate-600 dark:text-slate-400">
                      WhatsApp / Telefone
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="(47) 99999-9999"
                        value={novoTelefone}
                        onChange={(e) => setNovoTelefone(formatTelefone(e.target.value))}
                        className="p-2 pl-8 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-0.5 text-slate-600 dark:text-slate-400">
                      E-mail <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="joao@email.com"
                        value={novoEmail}
                        onChange={(e) => setNovoEmail(e.target.value)}
                        className="p-2 pl-8 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-0.5 text-slate-600 dark:text-slate-400">
                      Bairro em BC
                    </label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <select
                        value={novoBairro}
                        onChange={(e) => setNovoBairro(e.target.value)}
                        className="p-2 pl-8 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition text-xs"
                      >
                        {bairrosBC.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-0.5 text-slate-600 dark:text-slate-400">
                      Senha (Mín. 6 dígitos) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        required
                        placeholder="Sua senha"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        className="p-2 pl-8 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-0.5 text-slate-600 dark:text-slate-400">
                      Confirmar Senha <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        required
                        placeholder="Repita a senha"
                        value={novaSenhaConfirm}
                        onChange={(e) => setNovaSenhaConfirm(e.target.value)}
                        className="p-2 pl-8 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition text-xs"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl shadow-lg transition uppercase tracking-wider text-xs cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Cadastrar e Acessar Portal</span>
                </button>

                <div className="pt-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setCidadaoMode('login');
                      setCidadaoError('');
                    }}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                  >
                    Já possui cadastro? Fazer Login com Senha →
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Modal de Recuperação de Senha por E-mail */}
      <RecuperarSenhaModal
        isOpen={recuperarSenhaOpen}
        initialProfile={recuperarProfile}
        onClose={() => setRecuperarSenhaOpen(false)}
        onSuccessReset={(tipo, id) => {
          if (tipo === 'contabilidade') {
            setContabIdentificador(id);
            setContabSenha('');
            setContabError('');
            setTab('contabilidade');
          } else if (tipo === 'contribuinte') {
            setContribIdentificador(id);
            setContribSenha('');
            setContribError('');
            setTab('contribuinte');
          } else if (tipo === 'cidadao') {
            setCidadaoIdentificador(id);
            setCidadaoSenha('');
            setCidadaoError('');
            setCidadaoMode('login');
            setTab('cidadao');
          } else {
            setEmail(id);
            setPassword('');
            setErrorMsg('');
            setTab('servidor');
          }
        }}
      />
    </section>
  );
};

interface TrocaSenhaModalProps {
  isOpen: boolean;
  currentUser: UserProfile | null;
  onSaveUser: (u: UserProfile) => void;
  onClose: () => void;
}

export const TrocaSenhaModal: React.FC<TrocaSenhaModalProps> = ({
  isOpen,
  currentUser,
  onSaveUser,
  onClose
}) => {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [erroMsg, setErroMsg] = useState('');
  const [success, setSuccess] = useState(false);

  // Reseta campos ao abrir
  useEffect(() => {
    if (isOpen) {
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setErroMsg('');
      setSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg('');

    if (!currentUser) {
      setErroMsg('Nenhum usuário logado identificado.');
      return;
    }

    const expectedCurrent = (currentUser.senha || '123456').trim();
    if (currentPass.trim() !== expectedCurrent) {
      setErroMsg('Senha atual incorreta. Verifique a senha digitada.');
      return;
    }

    if (newPass.trim().length < 6) {
      setErroMsg('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPass.trim() !== confirmPass.trim()) {
      setErroMsg('A confirmação não coincide com a nova senha digitada.');
      return;
    }

    const updated: UserProfile = { ...currentUser, senha: newPass.trim() };
    onSaveUser(updated);

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[1500] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2rem] p-6 sm:p-8 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-2xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wide">
                Alterar Senha de Acesso
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {currentUser?.nome_completo || 'Operador'} ({currentUser?.cargo || 'VISA'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              Senha alterada com sucesso!
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sua nova senha foi salva e sincronizada. A senha antiga e o padrão de fábrica não terão mais acesso.
            </p>
          </div>
        ) : (
          <form onSubmit={handleConfirm} className="space-y-3.5">
            {erroMsg && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{erroMsg}</span>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                Senha Atual
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  placeholder="Digite sua senha atual"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className="p-2.5 pl-9 pr-10 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title={showCurrentPass ? 'Ocultar' : 'Ver'}
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                Nova Senha (Mínimo 6 caracteres)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  placeholder="Digite a nova senha segura"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="p-2.5 pl-9 pr-10 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title={showNewPass ? 'Ocultar' : 'Ver'}
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                  type={showNewPass ? 'text' : 'password'}
                  required
                  placeholder="Repita a nova senha"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className="p-2.5 pl-9 pr-10 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl shadow-lg transition uppercase text-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Nova Senha</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold uppercase text-xs rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
