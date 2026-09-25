import React, { useState } from 'react';
import { ContribuinteProfile, ResponsavelTecnicoItem } from '../types';
import { 
  Briefcase, Building2, User, Mail, Phone, CheckCircle2, X, Sparkles, 
  Lock, Store, MapPin, FileText, ChevronDown, ChevronUp, Clock, 
  HelpCircle, ShieldAlert, ArrowRight, ArrowLeft, Check, Plus, Trash2,
  Building, Award, IdCard, AlertTriangle, Stethoscope
} from 'lucide-react';
import { fetchCnpj } from '../lib/cnpjService';
import { BAIRROS_BC } from '../data/mockData';
import { 
  saveContribuinteToSupabase, 
  isSupabaseConfigured, 
  fetchCnaesInfoFromSupabase, 
  CnaeRtInfo 
} from '../lib/supabaseService';

interface CadastroContribuinteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (novoContribuinte: ContribuinteProfile) => void;
}

const CONSELHOS_CLASSE_COMUNS = [
  'CRF/SC - Conselho Regional de Farmácia',
  'CRM/SC - Conselho Regional de Medicina',
  'CRO/SC - Conselho Regional de Odontologia',
  'COREN/SC - Conselho Regional de Enfermagem',
  'CRN-10/SC - Conselho Regional de Nutricionistas',
  'CRBio-09/SC - Conselho Regional de Biologia',
  'CREA/SC - Conselho de Engenharia e Agronomia',
  'CRQ-XIII/SC - Conselho Regional de Química',
  'CRMV/SC - Conselho Regional de Medicina Veterinária',
  'CREFITO-10/SC - Fisioterapia e Terapia Ocupacional',
  'Outro Conselho de Classe'
];

const PRESETS_HORARIOS = [
  'Segunda a Sexta: 08:00 às 18:00',
  'Segunda a Sexta: 08:00 às 12:00 e 13:30 às 18:00',
  'Segunda a Sábado: 08:00 às 20:00',
  'Segunda a Domingo: 10:00 às 22:00',
  'Atendimento 24 Horas'
];

export const CadastroContribuinteModal: React.FC<CadastroContribuinteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Controle de Etapas do Cadastro:
  // Etapa 1: Dados Cadastrais & Empresa
  // Etapa 2: Questionário Operacional & Responsabilidade Técnica (RT)
  const [etapa, setEtapa] = useState<1 | 2>(1);

  const [tipoPessoa, setTipoPessoa] = useState<'PJ' | 'PF'>('PJ'); // PJ (Empresário) ou PF (Feirante/Autônomo)
  const [categoria, setCategoria] = useState<'EMPRESARIO' | 'FEIRANTE' | 'AUTONOMO'>('EMPRESARIO');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [ramoAtividade, setRamoAtividade] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [bairro, setBairro] = useState('Centro');
  const [endereco, setEndereco] = useState('');
  
  // Campos obrigatórios do Proprietário (visíveis antes da senha)
  const [nomeProprietario, setNomeProprietario] = useState('');
  const [emailProprietario, setEmailProprietario] = useState('');
  const [telefoneProprietario, setTelefoneProprietario] = useState('');

  // Campos adicionais do CNPJ capturados em segundo plano (ocultos da visualização do usuário)
  const [dataAbertura, setDataAbertura] = useState('');
  const [situacaoCadastral, setSituacaoCadastral] = useState('');
  const [dataSituacaoCadastral, setDataSituacaoCadastral] = useState('');
  const [cnaePrincipalCodigo, setCnaePrincipalCodigo] = useState('');
  const [cnaePrincipalDescricao, setCnaePrincipalDescricao] = useState('');
  const [cnaePrincipal, setCnaePrincipal] = useState('');
  const [cnaesList, setCnaesList] = useState<string[]>([]);
  const [cnaesSecundarios, setCnaesSecundarios] = useState<string[]>([]);
  const [mostrarTodosCnaes, setMostrarTodosCnaes] = useState(false);

  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erroMsg, setErroMsg] = useState('');

  // ================= ESTADOS DA ETAPA 2 (PERGUNTAS OPERACIONAIS & RT) =================
  const [horarioFuncionamento, setHorarioFuncionamento] = useState('Segunda a Sexta: 08:00 às 18:00');
  const [enderecoCorrespondencia, setEnderecoCorrespondencia] = useState(false);
  const [isCoworking, setIsCoworking] = useState(false);
  const [nomeCoworking, setNomeCoworking] = useState('');
  
  // Consulta de CNAEs e Responsabilidade Técnica
  const [carregandoRt, setCarregandoRt] = useState(false);
  const [cnaesRtInfo, setCnaesRtInfo] = useState<CnaeRtInfo[]>([]);
  const [responsaveisTecnicos, setResponsaveisTecnicos] = useState<ResponsavelTecnicoItem[]>([]);

  // Normaliza o bairro vindo da API para a grafia padrão oficial de Balneário Camboriú
  const matchBairroPadrao = (raw: string): string => {
    if (!raw) return 'Centro';
    const clean = raw.trim();
    const normalizedRaw = clean.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Procura correspondência na lista oficial de Balneário Camboriú
    const matched = BAIRROS_BC.find((b) => {
      const normB = b.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normB === normalizedRaw || normB.includes(normalizedRaw) || normalizedRaw.includes(normB);
    });
    
    if (matched) return matched;
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  // Garante que a lista suspensa contenha os bairros oficiais de BC e qualquer bairro especial da API
  const listaBairrosDisponiveis = Array.from(
    new Set([
      ...BAIRROS_BC,
      ...(bairro && !BAIRROS_BC.includes(bairro) ? [bairro] : [])
    ])
  );

  if (!isOpen) return null;

  // Auto preenchimento via CNPJ para PJ
  const handleConsultarCNPJ = async () => {
    const clean = cnpjCpf.replace(/\D/g, '');
    if (clean.length !== 14) {
      setErroMsg('Digite um CNPJ válido com 14 dígitos para consultar.');
      return;
    }

    setBuscandoCnpj(true);
    setErroMsg('');
    try {
      const data = await fetchCnpj(clean);
      if (data) {
        if (data.razao) setRazaoSocial(data.razao);
        if (data.nome_fantasia) setNomeFantasia(data.nome_fantasia || data.razao);
        if (data.telefone && !telefone) setTelefone(data.telefone);
        if (data.responsavel && !responsavel) setResponsavel(data.responsavel);
        if (data.cnae) setRamoAtividade(data.cnae);
        if (data.rua_api) {
          const endCompl = data.num_api ? `${data.rua_api}, ${data.num_api}` : data.rua_api;
          setEndereco(endCompl);
        }
        if (data.bairro) {
          const bPadrao = matchBairroPadrao(data.bairro);
          setBairro(bPadrao);
        }

        // Armazena dados de segundo plano do CNPJ (ocultos da tela)
        if (data.data_abertura) setDataAbertura(data.data_abertura);
        if (data.situacao_cadastral || data.situacao) setSituacaoCadastral(data.situacao_cadastral || data.situacao || '');
        if (data.data_situacao_cadastral) setDataSituacaoCadastral(data.data_situacao_cadastral);
        if (data.cnae_principal_codigo) setCnaePrincipalCodigo(data.cnae_principal_codigo);
        if (data.cnae_principal_descricao) setCnaePrincipalDescricao(data.cnae_principal_descricao);
        
        const cnaeCompleto = data.cnae_principal_codigo
          ? `${data.cnae_principal_codigo} - ${data.cnae_principal_descricao || data.cnae || ''}`.trim()
          : (data.cnae || '');
        setCnaePrincipal(cnaeCompleto);

        // Captura lista completa de CNAEs (principal + secundários)
        const allCnaes = data.cnaes || (data.cnae ? [data.cnae] : []);
        setCnaesList(allCnaes);
        setCnaesSecundarios(data.cnaes_secundarios || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const formatCnpjCpf = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (clean.length <= 11) {
      // CPF format
      if (clean.length <= 3) return clean;
      if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
      if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
      return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
    } else {
      // CNPJ format
      const c = clean.slice(0, 14);
      if (c.length <= 2) return c;
      if (c.length <= 5) return `${c.slice(0, 2)}.${c.slice(2)}`;
      if (c.length <= 8) return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5)}`;
      if (c.length <= 12) return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8)}`;
      return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12, 14)}`;
    }
  };

  const formatCpfOnly = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 11);
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
    if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
  };

  const formatTelefone = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) return raw;
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
  };

  // Carrega e verifica a lista de CNAEs em relação à necessidade de RT
  const carregarVerificacaoRt = async (cnaesParaVerificar: string[]) => {
    setCarregandoRt(true);
    try {
      const infoList = await fetchCnaesInfoFromSupabase(cnaesParaVerificar);
      setCnaesRtInfo(infoList);

      // Prepara lista inicial de Responsáveis Técnicos para CNAEs que exigem RT
      const cnaesQueExigem = infoList.filter((item) => item.exige_rt);
      setResponsaveisTecnicos((prev) => {
        const novos: ResponsavelTecnicoItem[] = [];
        cnaesQueExigem.forEach((cq) => {
          const jaExiste = prev.find((p) => p.cnae === cq.codigo || p.cnae === cq.cnae);
          if (jaExiste) {
            novos.push(jaExiste);
          } else {
            novos.push({
              cnae: cq.codigo || cq.cnae,
              cnae_descricao: cq.descricao,
              nome_profissional: '',
              numero_rt: '',
              conselho_classe_uf: 'CRF/SC - Conselho Regional de Farmácia',
              numero_inscricao: '',
              cpf_profissional: '',
            });
          }
        });
        return novos;
      });
    } catch (err) {
      console.error('Erro ao verificar exigências de RT na tabela de CNAEs:', err);
    } finally {
      setCarregandoRt(false);
    }
  };

  // Transição da Etapa 1 para a Etapa 2
  const handleAvancarParaEtapa2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg('');

    if (!cnpjCpf.trim() || !razaoSocial.trim() || !email.trim()) {
      setErroMsg('Por favor, preencha os campos obrigatórios: CPF/CNPJ, Razão Social/Nome e E-mail Oficial.');
      return;
    }

    if (!nomeProprietario.trim() || !emailProprietario.trim() || !telefoneProprietario.trim()) {
      setErroMsg('Por favor, preencha os campos obrigatórios do Proprietário: Nome, E-mail e Telefone.');
      return;
    }

    if (senha && senha.length < 6) {
      setErroMsg('A senha de acesso deve conter pelo menos 6 caracteres.');
      return;
    }

    if (senha && confirmarSenha && senha !== confirmarSenha) {
      setErroMsg('As senhas digitadas não coincidem.');
      return;
    }

    // Verifica duplicidade no LocalStorage antes de avançar
    const saved = localStorage.getItem('visa_contribuintes');
    let lista: ContribuinteProfile[] = [];
    if (saved) {
      try {
        lista = JSON.parse(saved);
      } catch (err) {
        console.error(err);
      }
    }
    const cleanDoc = cnpjCpf.replace(/\D/g, '');
    const existe = lista.find((c) => (c.cnpj_cpf || '').replace(/\D/g, '') === cleanDoc);
    if (existe) {
      setErroMsg('Este CNPJ/CPF já possui cadastro ativo no portal do contribuinte.');
      return;
    }

    // Monta lista consolidada de CNAEs para verificar no Supabase
    const cnaesParaVerificar = cnaesList.length > 0
      ? cnaesList
      : (cnaePrincipal ? [cnaePrincipal] : (ramoAtividade ? [ramoAtividade] : []));

    setEtapa(2);
    carregarVerificacaoRt(cnaesParaVerificar);
  };

  // Atualização dos campos de um Responsável Técnico
  const handleAtualizarRt = (index: number, campo: keyof ResponsavelTecnicoItem, valor: string) => {
    setResponsaveisTecnicos((prev) => {
      const copia = [...prev];
      if (copia[index]) {
        copia[index] = { ...copia[index], [campo]: valor };
      }
      return copia;
    });
  };

  // Adicionar RT voluntário
  const handleAdicionarRtManual = () => {
    const cnaeRef = cnaesList[0] || cnaePrincipal || 'Atividade Geral';
    setResponsaveisTecnicos((prev) => [
      ...prev,
      {
        cnae: cnaeRef,
        cnae_descricao: ramoAtividade || 'Atividade regulada',
        nome_profissional: '',
        numero_rt: '',
        conselho_classe_uf: 'CRF/SC - Conselho Regional de Farmácia',
        numero_inscricao: '',
        cpf_profissional: '',
      }
    ]);
  };

  // Remover RT da lista
  const handleRemoverRt = (index: number) => {
    setResponsaveisTecnicos((prev) => prev.filter((_, i) => i !== index));
  };

  // Submissão Final do Cadastro (Etapa 2)
  const handleSalvarFinal = async () => {
    setErroMsg('');

    // Validação do Horário de Funcionamento
    if (!horarioFuncionamento.trim()) {
      setErroMsg('Por favor, informe o horário de funcionamento do estabelecimento.');
      return;
    }

    // Se houver CNAE que exige RT, valida se os campos do RT foram preenchidos
    const cnaesObrigatorios = cnaesRtInfo.filter((c) => c.exige_rt);
    if (cnaesObrigatorios.length > 0) {
      for (const rt of responsaveisTecnicos) {
        if (!rt.nome_profissional.trim() || !rt.numero_rt.trim() || !rt.numero_inscricao.trim() || !rt.cpf_profissional.trim()) {
          setErroMsg(`Preencha todos os dados do Responsável Técnico para a CNAE ${rt.cnae} (Nome, Número da RT, Inscrição e CPF).`);
          return;
        }
        const cleanCpf = rt.cpf_profissional.replace(/\D/g, '');
        if (cleanCpf.length !== 11) {
          setErroMsg(`O CPF do Responsável Técnico para a CNAE ${rt.cnae} deve ter 11 dígitos.`);
          return;
        }
      }
    }

    const novoContribuinte: ContribuinteProfile = {
      id: 'contrib-' + Date.now(),
      tipo_pessoa: tipoPessoa,
      categoria,
      cnpj_cpf: cnpjCpf.trim(),
      razao_social: razaoSocial.trim(),
      nome_fantasia: nomeFantasia.trim() || razaoSocial.trim(),
      responsavel: responsavel.trim() || nomeProprietario.trim() || razaoSocial.trim(),
      nome_proprietario: nomeProprietario.trim(),
      email_proprietario: emailProprietario.trim().toLowerCase(),
      telefone_proprietario: telefoneProprietario.trim(),
      email: email.trim().toLowerCase(),
      telefone: telefone.trim(),
      ramo_atividade: ramoAtividade.trim(),
      bairro: bairro.trim(),
      endereco: endereco.trim(),
      senha: senha.trim() || '123456',
      data_cadastro: new Date().toISOString().split('T')[0],
      // Dados de segundo plano sincronizados no Supabase
      data_abertura: dataAbertura.trim(),
      situacao_cadastral: situacaoCadastral.trim(),
      data_situacao_cadastral: dataSituacaoCadastral.trim(),
      cnae_principal: cnaePrincipal.trim(),
      cnae_principal_codigo: cnaePrincipalCodigo.trim(),
      cnae_principal_descricao: cnaePrincipalDescricao.trim(),
      cnaes: cnaesList,
      cnaes_secundarios: cnaesSecundarios,
      // Questionário Operacional & Responsabilidade Técnica
      horario_funcionamento: horarioFuncionamento.trim(),
      endereco_correspondencia: enderecoCorrespondencia,
      is_coworking: isCoworking,
      nome_coworking: isCoworking ? nomeCoworking.trim() : '',
      responsaveis_tecnicos: responsaveisTecnicos,
    };

    // Salva no LocalStorage dos contribuintes
    const saved = localStorage.getItem('visa_contribuintes');
    let lista: ContribuinteProfile[] = [];
    if (saved) {
      try {
        lista = JSON.parse(saved);
      } catch (err) {
        console.error(err);
      }
    }

    lista.push(novoContribuinte);
    localStorage.setItem('visa_contribuintes', JSON.stringify(lista));

    // Sincroniza com Supabase
    if (isSupabaseConfigured) {
      saveContribuinteToSupabase(novoContribuinte).catch((err) =>
        console.warn('Erro ao sincronizar contribuinte no Supabase:', err)
      );
    }

    setSucesso(true);
    setTimeout(() => {
      onSuccess(novoContribuinte);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[2100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-2xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 my-auto text-left text-slate-900 dark:text-white max-h-[94vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <span>Cadastro de Contribuinte</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold">
                  Etapa {etapa} de 2
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {etapa === 1 
                  ? 'Acesso para Empresários, Feirantes e Autônomos Regulados' 
                  : 'Questionário Operacional & Responsabilidade Técnica Sanitária'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Indicador de Passos */}
        <div className="grid grid-cols-2 gap-2 text-xs font-bold shrink-0">
          <div className={`p-2 rounded-xl border flex items-center gap-2 transition ${
            etapa === 1 
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-600/60 text-amber-800 dark:text-amber-300' 
              : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300'
          }`}>
            <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">
              {etapa > 1 ? <Check className="w-3 h-3" /> : '1'}
            </span>
            <span className="truncate">1. Dados da Empresa & Acesso</span>
          </div>

          <div className={`p-2 rounded-xl border flex items-center gap-2 transition ${
            etapa === 2 
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-600/60 text-amber-800 dark:text-amber-300' 
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400'
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              etapa === 2 ? 'bg-amber-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}>
              2
            </span>
            <span className="truncate">2. Operação & RT</span>
          </div>
        </div>

        {sucesso ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black uppercase text-emerald-600 dark:text-emerald-400">
              Cadastro de Contribuinte Concluído!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Questionário e dados operacionais registrados com sucesso. Redirecionando para o portal...
            </p>
          </div>
        ) : (
          <>
            {erroMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2 font-medium shrink-0">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{erroMsg}</span>
              </div>
            )}

            {/* ============================================================ */}
            {/* ETAPA 1: DADOS CADASTRAIS DA EMPRESA / ESTABELECIMENTO */}
            {/* ============================================================ */}
            {etapa === 1 && (
              <form onSubmit={handleAvancarParaEtapa2} className="space-y-3 overflow-y-auto pr-1 flex-1">
                {/* Tipo de Cadastro e Categoria */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                      Tipo de Pessoa
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl">
                      <button
                        type="button"
                        onClick={() => { setTipoPessoa('PJ'); setCategoria('EMPRESARIO'); }}
                        className={`py-1.5 text-xs font-bold rounded-lg transition ${
                          tipoPessoa === 'PJ'
                            ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        Pessoa Jurídica (CNPJ)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTipoPessoa('PF'); setCategoria('FEIRANTE'); }}
                        className={`py-1.5 text-xs font-bold rounded-lg transition ${
                          tipoPessoa === 'PF'
                            ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        Pessoa Física (CPF)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                      Categoria do Estabelecimento
                    </label>
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value as any)}
                      className="p-2.5 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="EMPRESARIO">Empresário / Comércio / Indústria / Serviço</option>
                      <option value="FEIRANTE">Feirante Livre</option>
                      <option value="AUTONOMO">Profissional Autônomo</option>
                    </select>
                  </div>
                </div>

                {/* CNPJ ou CPF com busca automática */}
                <div>
                  <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                    {tipoPessoa === 'PJ' ? 'CNPJ do Estabelecimento' : 'CPF do Titular / Autônomo'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <FileText className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder={tipoPessoa === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                        value={cnpjCpf}
                        onChange={(e) => setCnpjCpf(formatCnpjCpf(e.target.value))}
                        className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    {tipoPessoa === 'PJ' && (
                      <button
                        type="button"
                        onClick={handleConsultarCNPJ}
                        disabled={buscandoCnpj}
                        className="px-4 py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition flex items-center gap-1.5 shrink-0"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${buscandoCnpj ? 'animate-spin' : 'text-amber-400'}`} />
                        <span>{buscandoCnpj ? 'Buscando...' : 'Autocompletar'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Razão Social e Nome Fantasia */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                      Razão Social / Nome Oficial <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="Nome da empresa ou titular"
                        value={razaoSocial}
                        onChange={(e) => setRazaoSocial(e.target.value)}
                        className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                      Nome Fantasia / Denominação Comercial
                    </label>
                    <input
                      type="text"
                      placeholder="Nome fantasia (opcional)"
                      value={nomeFantasia}
                      onChange={(e) => setNomeFantasia(e.target.value)}
                      className="p-2.5 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Contatos Oficiais */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                      E-mail Oficial (Login Principal) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="contato@empresa.com.br"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                      Telefone / WhatsApp Comercial <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="(47) 99999-9999"
                        value={telefone}
                        onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                        className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Localização */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-1">
                    <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                      Bairro em Balneário Camboriú <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      className="p-2.5 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      {listaBairrosDisponiveis.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                      Logradouro, Nº e Complemento <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="Ex: Av. Brasil, 1500 - Sala 02"
                        value={endereco}
                        onChange={(e) => setEndereco(e.target.value)}
                        className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Atividade Econômica / CNAE */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">
                      Ramo de Atividade / CNAE Principal
                    </label>
                    {cnaesList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setMostrarTodosCnaes(!mostrarTodosCnaes)}
                        className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-0.5"
                      >
                        <span>{cnaesList.length} CNAEs identificados</span>
                        {mostrarTodosCnaes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Briefcase className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ex: Restaurantes e similares ou Código CNAE"
                      value={ramoAtividade}
                      onChange={(e) => setRamoAtividade(e.target.value)}
                      className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Lista recolhível de CNAEs */}
                  {mostrarTodosCnaes && cnaesList.length > 0 && (
                    <div className="mt-2 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 max-h-36 overflow-y-auto space-y-1">
                      <p className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300">
                        CNAEs Vinculados ao CNPJ (Receita Federal):
                      </p>
                      {cnaesList.map((c, idx) => (
                        <div key={idx} className="text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-1">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dados do Proprietário */}
                <div className="p-3 bg-amber-50/40 dark:bg-amber-950/20 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-black text-xs uppercase">
                    <User className="w-4 h-4" />
                    <span>Dados do Proprietário / Sócio Responsável</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                        Nome do Proprietário <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Nome completo"
                        value={nomeProprietario}
                        onChange={(e) => setNomeProprietario(e.target.value)}
                        className="p-2 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                        E-mail do Proprietário <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="proprietario@email.com"
                        value={emailProprietario}
                        onChange={(e) => setEmailProprietario(e.target.value)}
                        className="p-2 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                        Celular / WhatsApp <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="(47) 99999-9999"
                        value={telefoneProprietario}
                        onChange={(e) => setTelefoneProprietario(formatTelefone(e.target.value))}
                        className="p-2 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Senhas de Acesso */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                      Senha de Acesso (Mín. 6 dígitos) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        required
                        placeholder="Digite sua senha"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                      Confirmar Senha <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        required
                        placeholder="Repita a senha"
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Botões da Etapa 1 */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg flex items-center gap-2"
                  >
                    <span>Avançar para Perguntas Complementares</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* ============================================================ */}
            {/* ETAPA 2: QUESTIONÁRIO OPERACIONAL & RESPONSABILIDADE TÉCNICA */}
            {/* ============================================================ */}
            {etapa === 2 && (
              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                {/* Pergunta 1: Horário de Funcionamento */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <label className="text-xs font-black uppercase text-slate-900 dark:text-white">
                      1. Qual o horário de funcionamento do estabelecimento? <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  
                  {/* Presets rápidos */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {PRESETS_HORARIOS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setHorarioFuncionamento(preset)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border font-semibold transition ${
                          horarioFuncionamento === preset
                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="Ex: Segunda a Sexta: 08:00 às 18:00, Sábados: 08:00 às 12:00"
                    value={horarioFuncionamento}
                    onChange={(e) => setHorarioFuncionamento(e.target.value)}
                    className="p-2.5 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-800 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Pergunta 2: Endereço para Fins de Correspondência */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <label className="text-xs font-black uppercase text-slate-900 dark:text-white">
                      2. É endereço exclusivamente para fins de correspondência? <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Indique se o endereço é apenas domicílio fiscal/correspondência (sem atendimento presencial ou manipulação de produtos no local).
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setEnderecoCorrespondencia(true)}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                        enderecoCorrespondencia
                          ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-300 shadow-sm ring-1 ring-amber-500'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center ${
                        enderecoCorrespondencia ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-400'
                      }`}>
                        {enderecoCorrespondencia && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold block">SIM</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          Apenas endereço fiscal / correspondência (sem atividade no local)
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEnderecoCorrespondencia(false)}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                        !enderecoCorrespondencia
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-300 shadow-sm ring-1 ring-emerald-500'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center ${
                        !enderecoCorrespondencia ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400'
                      }`}>
                        {!enderecoCorrespondencia && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold block">NÃO</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          Há atendimento presencial, estoque ou operações no local
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Pergunta 3: É Coworking? */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <label className="text-xs font-black uppercase text-slate-900 dark:text-white">
                      3. É Coworking / Escritório Compartilhado? <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    O estabelecimento está sediado em um espaço compartilhado ou centro comercial colaborativo?
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCoworking(true)}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                        isCoworking
                          ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-300 shadow-sm ring-1 ring-amber-500'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center ${
                        isCoworking ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-400'
                      }`}>
                        {isCoworking && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold block">SIM</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          Funciona em coworking ou sala compartilhada
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setIsCoworking(false); setNomeCoworking(''); }}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                        !isCoworking
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-300 shadow-sm ring-1 ring-emerald-500'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center ${
                        !isCoworking ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400'
                      }`}>
                        {!isCoworking && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold block">NÃO</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          Imóvel individual, exclusivo ou sede própria
                        </span>
                      </div>
                    </button>
                  </div>

                  {isCoworking && (
                    <div className="pt-2 animate-fadeIn">
                      <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                        Nome do Coworking / Identificação da Sala / Estação
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Hub Plural BC - Sala 402 ou Estação 12"
                        value={nomeCoworking}
                        onChange={(e) => setNomeCoworking(e.target.value)}
                        className="p-2.5 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-800 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Pergunta 4: Verificação de RT na Tabela CNAE */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <label className="text-xs font-black uppercase text-slate-900 dark:text-white">
                        4. Responsabilidade Técnica Sanitária (RT)
                      </label>
                    </div>
                    {carregandoRt && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 animate-pulse font-bold">
                        Consultando tabela CNAE...
                      </span>
                    )}
                  </div>

                  {/* Alerta explicativo */}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    O sistema cruzou a lista de CNAEs informada com as regras sanitárias (tabela de CNAEs da Vigilância Sanitária). 
                    Atividades com exigência de <strong>RT</strong> requerem profissional técnico habilitado e respectivo conselho.
                  </p>

                  {/* Caso esteja carregando */}
                  {carregandoRt ? (
                    <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      <span>Verificando exigências sanitárias na tabela de CNAEs do Supabase...</span>
                    </div>
                  ) : (
                    <>
                      {/* Caso existam CNAEs com exigência de RT */}
                      {responsaveisTecnicos.length > 0 ? (
                        <div className="space-y-3">
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs flex items-center gap-2 font-medium">
                            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>
                              Identificamos <strong>{responsaveisTecnicos.length}</strong> atividade(s) sujeita(s) à indicação de Responsável Técnico:
                            </span>
                          </div>

                          {responsaveisTecnicos.map((rt, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-2xl border border-amber-300 dark:border-amber-700/80 bg-white dark:bg-slate-800 shadow-sm space-y-2.5"
                            >
                              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-black text-[10px]">
                                    CNAE {rt.cnae}
                                  </span>
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                                    {rt.cnae_descricao || 'Atividade regulada'}
                                  </span>
                                </div>
                                {responsaveisTecnicos.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoverRt(idx)}
                                    className="text-slate-400 hover:text-rose-500 p-1"
                                    title="Remover este RT"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {/* Nome do profissional */}
                                <div>
                                  <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                                    Nome Completo do Profissional <span className="text-rose-500">*</span>
                                  </label>
                                  <div className="relative">
                                    <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                      type="text"
                                      required
                                      placeholder="Ex: Dra. Juliana Souza"
                                      value={rt.nome_profissional}
                                      onChange={(e) => handleAtualizarRt(idx, 'nome_profissional', e.target.value)}
                                      className="p-2 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                    />
                                  </div>
                                </div>

                                {/* Número da RT */}
                                <div>
                                  <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                                    Número da RT (Certidão / Anotação) <span className="text-rose-500">*</span>
                                  </label>
                                  <div className="relative">
                                    <Award className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                      type="text"
                                      required
                                      placeholder="Ex: RT-2026/8941"
                                      value={rt.numero_rt}
                                      onChange={(e) => handleAtualizarRt(idx, 'numero_rt', e.target.value)}
                                      className="p-2 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                    />
                                  </div>
                                </div>

                                {/* Conselho de Classe e UF */}
                                <div>
                                  <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                                    Conselho de Classe e UF <span className="text-rose-500">*</span>
                                  </label>
                                  <select
                                    value={rt.conselho_classe_uf}
                                    onChange={(e) => handleAtualizarRt(idx, 'conselho_classe_uf', e.target.value)}
                                    className="p-2 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                  >
                                    {CONSELHOS_CLASSE_COMUNS.map((c) => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Número de Inscrição no Conselho */}
                                <div>
                                  <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                                    Nº de Inscrição no Conselho <span className="text-rose-500">*</span>
                                  </label>
                                  <div className="relative">
                                    <IdCard className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                      type="text"
                                      required
                                      placeholder="Ex: 14285-SC"
                                      value={rt.numero_inscricao}
                                      onChange={(e) => handleAtualizarRt(idx, 'numero_inscricao', e.target.value)}
                                      className="p-2 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                    />
                                  </div>
                                </div>

                                {/* CPF do Profissional */}
                                <div className="sm:col-span-2">
                                  <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                                    CPF do Profissional RT <span className="text-rose-500">*</span>
                                  </label>
                                  <div className="relative">
                                    <FileText className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                      type="text"
                                      required
                                      placeholder="000.000.000-00"
                                      value={rt.cpf_profissional}
                                      onChange={(e) => handleAtualizarRt(idx, 'cpf_profissional', formatCpfOnly(e.target.value))}
                                      className="p-2 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 space-y-2">
                          <div className="flex items-center gap-2 font-bold text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              Nenhum dos seus CNAEs exige Responsável Técnico (RT) obrigatório.
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            As atividades econômicas informadas não possuem previsão de responsabilidade técnica compulsória na tabela sanitária municipal.
                          </p>
                          <button
                            type="button"
                            onClick={handleAdicionarRtManual}
                            className="text-[11px] text-amber-700 dark:text-amber-400 font-bold hover:underline flex items-center gap-1 pt-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Informar Responsável Técnico voluntariamente (opcional)</span>
                          </button>
                        </div>
                      )}

                      {/* Botão de Adicionar Mais RT */}
                      {responsaveisTecnicos.length > 0 && (
                        <button
                          type="button"
                          onClick={handleAdicionarRtManual}
                          className="text-[11px] text-amber-700 dark:text-amber-400 font-bold hover:underline flex items-center gap-1 pt-0.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Adicionar outro Responsável Técnico</span>
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Botões da Etapa 2 */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setEtapa(1); setErroMsg(''); }}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar para Dados</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSalvarFinal}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Salvar e Acessar Portal</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
