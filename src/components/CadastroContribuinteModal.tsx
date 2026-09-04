import React, { useState } from 'react';
import { ContribuinteProfile } from '../types';
import { Briefcase, Building2, User, Mail, Phone, CheckCircle2, X, Sparkles, Lock, Store, MapPin, FileText } from 'lucide-react';
import { fetchCnpj } from '../lib/cnpjService';
import { BAIRROS_BC } from '../data/mockData';
import { saveContribuinteToSupabase, isSupabaseConfigured } from '../lib/supabaseService';

interface CadastroContribuinteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (novoContribuinte: ContribuinteProfile) => void;
}

export const CadastroContribuinteModal: React.FC<CadastroContribuinteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
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

  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erroMsg, setErroMsg] = useState('');

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
        if (data.bairro) setBairro(data.bairro);

        // Preenche dados do proprietário sugeridos pelo CNPJ (caso vazios)
        const socio = data.nome_proprietario || data.responsavel;
        if (socio && !nomeProprietario) setNomeProprietario(socio);
        if (data.email && !emailProprietario) setEmailProprietario(data.email);
        if (data.telefone && !telefoneProprietario) setTelefoneProprietario(data.telefone);

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

  const formatTelefone = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) return raw;
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
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
      // Dados de segundo plano sincronizados no Supabase (ocultos da UI)
      data_abertura: dataAbertura.trim(),
      situacao_cadastral: situacaoCadastral.trim(),
      data_situacao_cadastral: dataSituacaoCadastral.trim(),
      cnae_principal: cnaePrincipal.trim(),
      cnae_principal_codigo: cnaePrincipalCodigo.trim(),
      cnae_principal_descricao: cnaePrincipalDescricao.trim(),
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

    // Verifica duplicidade de CNPJ/CPF
    const cleanDoc = novoContribuinte.cnpj_cpf.replace(/\D/g, '');
    const existe = lista.find(c => (c.cnpj_cpf || '').replace(/\D/g, '') === cleanDoc);
    if (existe) {
      setErroMsg('Este CNPJ/CPF já possui cadastro ativo no portal do contribuinte.');
      return;
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[2100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 my-auto text-left text-slate-900 dark:text-white max-h-[92vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 dark:text-white">
                Cadastro de Contribuinte
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acesso para Empresários, Feirantes e Estabelecimentos Regulados
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

        {sucesso ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black uppercase text-emerald-600 dark:text-emerald-400">
              Cadastro de Contribuinte Concluído!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Acesso configurado com sucesso. Redirecionando para o portal...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 overflow-y-auto pr-1 flex-1">
            {erroMsg && (
              <p className="text-xs text-red-500 font-bold bg-red-50 dark:bg-red-950/60 p-2.5 rounded-xl border border-red-200 dark:border-red-800">
                {erroMsg}
              </p>
            )}

            {/* Seleção do Perfil de Contribuinte */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => {
                  setCategoria('EMPRESARIO');
                  setTipoPessoa('PJ');
                }}
                className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                  categoria === 'EMPRESARIO'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Empresário</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategoria('FEIRANTE');
                  setTipoPessoa('PF');
                }}
                className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                  categoria === 'FEIRANTE'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Feirante</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategoria('AUTONOMO');
                  setTipoPessoa('PF');
                }}
                className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                  categoria === 'AUTONOMO'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Autônomo</span>
              </button>
            </div>

            {/* CNPJ / CPF com botão de busca */}
            <div>
              <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                {tipoPessoa === 'PJ' ? 'CNPJ do Estabelecimento' : 'CPF do Titular / Feirante'} <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder={tipoPessoa === 'PJ' ? "00.000.000/0000-00" : "000.000.000-00"}
                    value={cnpjCpf}
                    onChange={(e) => setCnpjCpf(formatCnpjCpf(e.target.value))}
                    className="p-2.5 pl-9 font-mono font-bold w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                {tipoPessoa === 'PJ' && (
                  <button
                    type="button"
                    onClick={handleConsultarCNPJ}
                    disabled={buscandoCnpj}
                    className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs px-3.5 rounded-xl transition flex items-center gap-1.5 shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {buscandoCnpj ? 'Buscando...' : 'Autocompletar'}
                  </button>
                )}
              </div>
            </div>

            {/* Razão Social / Nome Fantasia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                  {tipoPessoa === 'PJ' ? 'Razão Social' : 'Nome Completo'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={tipoPessoa === 'PJ' ? "Ex: Padaria Central Ltda" : "Ex: Maria Silva"}
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  className="p-2.5 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                  Nome Fantasia / Barraca
                </label>
                <input
                  type="text"
                  placeholder="Ex: Padaria Central ou Barraca da Pastelaria"
                  value={nomeFantasia}
                  onChange={(e) => setNomeFantasia(e.target.value)}
                  className="p-2.5 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Responsável e Ramo de Atividade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                  Responsável Legal / Titular
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ex: João da Silva"
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                  Atividade / Produtos / Feira
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pastel e Caldo de Cana, Feira da Cultura"
                  value={ramoAtividade}
                  onChange={(e) => setRamoAtividade(e.target.value)}
                  className="p-2.5 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Contatos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                  E-mail Oficial <span className="text-rose-500">*</span>
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
                  WhatsApp / Telefone
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="(47) 99999-9999"
                    value={telefone}
                    onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                    className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Bairro e Endereço */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                  Bairro / Distrito <span className="text-slate-400 font-normal">(Editável)</span>
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    list="bairros-bc-list"
                    placeholder="Ex: Centro, Nações, Pioneiros..."
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <datalist id="bairros-bc-list">
                    {BAIRROS_BC.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                  Endereço / Ponto
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ex: Av. Brasil, 1500 ou Praça da Cultura"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Dados Obrigatórios do Proprietário (Visíveis) */}
            <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/20 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-black text-xs uppercase">
                <User className="w-3.5 h-3.5" />
                <span>Dados do Proprietário / Titular</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                    Nome do Proprietário <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Nome do proprietário"
                      value={nomeProprietario}
                      onChange={(e) => setNomeProprietario(e.target.value)}
                      className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                    E-mail do Proprietário <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="proprietario@email.com"
                      value={emailProprietario}
                      onChange={(e) => setEmailProprietario(e.target.value)}
                      className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase block mb-1 text-slate-600 dark:text-slate-400">
                    Telefone do Proprietário <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="(47) 99999-9999"
                      value={telefoneProprietario}
                      onChange={(e) => setTelefoneProprietario(formatTelefone(e.target.value))}
                      className="p-2.5 pl-9 font-medium w-full border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Senhas */}
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

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar e Acessar Portal</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
