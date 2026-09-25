import React, { useState } from 'react';
import { ContabilidadeProfile } from '../types';
import { Briefcase, Building2, User, Mail, Phone, FileText, CheckCircle2, X, Sparkles, Cloud, Lock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchCnpj, validarCnaeContabilista, CNAES_CONTABEIS_PERMITIDOS } from '../lib/cnpjService';
import { saveContabilidadeToSupabase, isSupabaseConfigured } from '../lib/supabaseService';

interface CadastroContabilidadeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (novaContabilidade: ContabilidadeProfile) => void;
}

export const CadastroContabilidadeModal: React.FC<CadastroContabilidadeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [cnpj, setCnpj] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [crc, setCrc] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [cnpjsIniciais, setCnpjsIniciais] = useState('');
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erroMsg, setErroMsg] = useState('');

  // Estados para validação e armazenamento de CNAEs
  const [cnaePrincipal, setCnaePrincipal] = useState('');
  const [cnaePrincipalCodigo, setCnaePrincipalCodigo] = useState('');
  const [cnaePrincipalDescricao, setCnaePrincipalDescricao] = useState('');
  const [cnaesList, setCnaesList] = useState<string[]>([]);
  const [cnaesSecundarios, setCnaesSecundarios] = useState<string[]>([]);
  const [cnaeValidoInfo, setCnaeValidoInfo] = useState<string | null>(null);
  const [cnaePermitido, setCnaePermitido] = useState<boolean | null>(null);
  const [mostrarTodosCnaes, setMostrarTodosCnaes] = useState(false);

  if (!isOpen) return null;

  // Auto preenchimento via CNPJ com validação dos CNAEs 6920-6/01 e 6920-6/02
  const handleConsultarCNPJ = async () => {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) {
      setErroMsg('Digite um CNPJ válido com 14 dígitos para consultar.');
      return;
    }

    setBuscandoCnpj(true);
    setErroMsg('');
    setCnaePermitido(null);
    setCnaeValidoInfo(null);
    try {
      const data = await fetchCnpj(clean);
      if (data) {
        const allCnaes = data.cnaes || (data.cnae ? [data.cnae] : []);
        setCnaesList(allCnaes);
        setCnaesSecundarios(data.cnaes_secundarios || []);
        setCnaePrincipal(data.cnae || '');
        setCnaePrincipalCodigo(data.cnae_principal_codigo || '');
        setCnaePrincipalDescricao(data.cnae_principal_descricao || '');

        // Valida se possui 6920-6/01 ou 6920-6/02
        const validacao = validarCnaeContabilista(data);

        if (validacao.valido) {
          setCnaePermitido(true);
          setCnaeValidoInfo(validacao.cnaeValido || '6920-6/01');
          if (data.razao) setRazaoSocial(data.razao);
          if (data.nome_fantasia) setNomeFantasia(data.nome_fantasia || data.razao);
          if (data.telefone && !telefone) setTelefone(data.telefone);
          if (data.responsavel && !responsavel) setResponsavel(data.responsavel);
        } else {
          setCnaePermitido(false);
          setCnaeValidoInfo(null);
          setErroMsg(
            validacao.mensagem ||
              'CNPJ não autorizado: O cadastro de escritório contábil é restrito a empresas com CNAE 6920-6/01 (Atividades de contabilidade) ou 6920-6/02 (Consultoria e auditoria contábil e tributária).'
          );
        }
      }
    } catch (e) {
      console.error(e);
      setErroMsg('Falha ao consultar CNPJ nos serviços da Receita Federal.');
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg('');

    if (cnaePermitido === false) {
      setErroMsg(
        'Cadastro bloqueado: O CNPJ informado não possui as atividades de contabilidade obrigatórias (CNAE 6920-6/01 ou 6920-6/02).'
      );
      return;
    }

    if (!cnpj.trim() || !razaoSocial.trim() || !crc.trim() || !email.trim()) {
      setErroMsg('Por favor, preencha os campos obrigatórios: CNPJ, Razão Social, CRC e E-mail.');
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

    // Processa lista de CNPJs iniciais se houver
    const cnpjsArr = cnpjsIniciais
      .split(/[\n,;]+/)
      .map(c => c.trim())
      .filter(c => c.length > 0);

    const novoEscritorio: ContabilidadeProfile = {
      id: 'contab-' + Date.now(),
      razao_social: razaoSocial.trim(),
      nome_fantasia: (nomeFantasia.trim() || razaoSocial.trim()),
      cnpj: cnpj.trim(),
      crc: crc.trim().toUpperCase(),
      responsavel: responsavel.trim() || 'Responsável Técnico',
      email: email.trim().toLowerCase(),
      telefone: telefone.trim(),
      senha: senha.trim() || '123456',
      cnpjs_vinculados: cnpjsArr,
      data_cadastro: new Date().toISOString().split('T')[0],
      cnae_principal: cnaePrincipal.trim(),
      cnae_principal_codigo: cnaePrincipalCodigo.trim(),
      cnae_principal_descricao: cnaePrincipalDescricao.trim(),
      cnaes: cnaesList,
      cnaes_secundarios: cnaesSecundarios,
    };

    // Salva no LocalStorage das contabilidades
    const saved = localStorage.getItem('visa_contabilidades_lab');
    let lista: ContabilidadeProfile[] = [];
    if (saved) {
      try { lista = JSON.parse(saved); } catch (err) { console.error(err); }
    }
    lista.push(novoEscritorio);
    localStorage.setItem('visa_contabilidades_lab', JSON.stringify(lista));

    // Sincroniza em segundo plano com o Supabase
    if (isSupabaseConfigured) {
      saveContabilidadeToSupabase(novoEscritorio).catch(err => console.warn('Sync Supabase:', err));
    }

    setSucesso(true);
    setTimeout(() => {
      onSuccess(novoEscritorio);
      setSucesso(false);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[2500] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#1e232d] border border-blue-600/40 rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-2xl text-slate-100 relative my-8 animate-fadeIn">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-[#28303f] hover:bg-slate-700 p-1.5 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-700 pb-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
              Auto-Cadastro de Escritório Contábil
              <span className="text-[10px] bg-blue-600/30 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full font-bold">
                PORTAL VISA
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Cadastre seu escritório para gerenciar alvarás, processos e notificações dos seus clientes.
            </p>
          </div>
        </div>

        {erroMsg && (
          <div className="bg-rose-950/80 border border-rose-600 text-rose-200 text-xs p-3 rounded-lg font-semibold mb-4">
            {erroMsg}
          </div>
        )}

        {sucesso ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-600/20 border border-emerald-500 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-black text-white uppercase">Escritório Cadastrado com Sucesso!</h4>
            <p className="text-xs text-slate-300">
              Seu painel exclusivo foi preparado e vinculado com o sistema de processos sanitários.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* CNPJ e Botão de Busca */}
            <div>
              <label className="block text-slate-300 font-bold uppercase text-[11px] mb-1">
                CNPJ do Escritório Contábil <span className="text-rose-400">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="Ex: 00.000.000/0001-00"
                    className="w-full bg-[#13171f] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleConsultarCNPJ}
                  disabled={buscandoCnpj}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition text-xs shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {buscandoCnpj ? 'Consultando...' : 'Auto-Preencher'}
                </button>
              </div>

              {/* Status de Validação de CNAE Contábil */}
              {cnaePermitido === true && (
                <div className="mt-2 bg-emerald-950/40 border border-emerald-500/50 rounded-lg p-2.5 text-xs text-emerald-200 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>CNAE Contábil Validado:</span>
                      <span className="font-mono bg-emerald-900/70 border border-emerald-700/60 px-1.5 py-0.5 rounded text-emerald-300">
                        {cnaeValidoInfo}
                      </span>
                    </div>
                    {cnaesList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setMostrarTodosCnaes(!mostrarTodosCnaes)}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-0.5"
                      >
                        {cnaesList.length} CNAE(s) salvo(s)
                        {mostrarTodosCnaes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                  {mostrarTodosCnaes && (
                    <div className="mt-2 pt-2 border-t border-emerald-900/60 space-y-1 max-h-28 overflow-y-auto pr-1">
                      {cnaesList.map((c, idx) => (
                        <div key={idx} className="text-[10px] text-emerald-300/90 font-mono bg-emerald-950/60 p-1 rounded">
                          • {c}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {cnaePermitido === false && (
                <div className="mt-2 bg-rose-950/60 border border-rose-600/70 rounded-lg p-2.5 text-xs text-rose-200 animate-fadeIn">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black text-rose-300 uppercase tracking-tight block">CNPJ Não Permitido para Contabilista</span>
                      <p className="text-[11px] text-rose-200/90 mt-0.5">
                        O cadastro de escritório contábil é exclusivo para CNPJs com atividade de contabilidade (<strong className="text-white">6920-6/01</strong> ou <strong className="text-white">6920-6/02</strong>).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {cnaePermitido === null && !buscandoCnpj && (
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <span>Requisito: O CNPJ deve possuir CNAE <strong>6920-6/01</strong> (Contabilidade) ou <strong>6920-6/02</strong> (Auditoria/Consultoria Contábil).</span>
                </p>
              )}
            </div>

            {/* Razão Social e Nome Fantasia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-bold uppercase text-[11px] mb-1">
                  Razão Social <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  placeholder="Ex: Balneário Contabilidade Ltda"
                  className="w-full bg-[#13171f] border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase text-[11px] mb-1">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  value={nomeFantasia}
                  onChange={(e) => setNomeFantasia(e.target.value)}
                  placeholder="Ex: Contabilidade Balneário"
                  className="w-full bg-[#13171f] border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* CRC e Contador Responsável */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-bold uppercase text-[11px] mb-1">
                  Registro CRC (Conselho Regional) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={crc}
                    onChange={(e) => setCrc(e.target.value)}
                    placeholder="Ex: SC-012345/O"
                    className="w-full bg-[#13171f] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase text-[11px] mb-1">
                  Contador Responsável / Titular
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    placeholder="Ex: Carlos Eduardo Silva"
                    className="w-full bg-[#13171f] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* E-mail e WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-bold uppercase text-[11px] mb-1">
                  E-mail Oficial (Alertas de Alvará) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: contato@contabil.com.br"
                    className="w-full bg-[#13171f] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase text-[11px] mb-1">
                  WhatsApp / Telefone de Contato
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="Ex: (47) 99123-4567"
                    className="w-full bg-[#13171f] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Senha e Confirmação de Senha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-bold uppercase text-[11px] mb-1">
                  Senha de Acesso (Mín. 6 dígitos)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Padrão: 123456"
                    className="w-full bg-[#13171f] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase text-[11px] mb-1">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full bg-[#13171f] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* CNPJs Iniciais dos Clientes */}
            <div>
              <label className="block text-slate-300 font-bold uppercase text-[11px] mb-1">
                Clientes da Carteira (Opcional - Digite ou Cole os CNPJs):
              </label>
              <textarea
                rows={2}
                value={cnpjsIniciais}
                onChange={(e) => setCnpjsIniciais(e.target.value)}
                placeholder="Cole CNPJs dos clientes separados por vírgula ou um por linha (Ex: 12.345.678/0001-90, 98.765.432/0001-10)..."
                className="w-full bg-[#13171f] border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-[11px]"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Você também poderá adicionar ou remover clientes a qualquer momento dentro do painel.
              </p>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase px-5 py-2.5 rounded-lg shadow-lg flex items-center gap-2 transition"
              >
                <CheckCircle2 className="w-4 h-4" /> Concluir Cadastro e Abrir Painel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
