import React, { useState, useMemo } from 'react';
import {
  X,
  Building2,
  User,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Printer,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Calendar,
  BadgeCheck,
  AlertCircle,
  Hash,
  FileCheck2,
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { UserProfile, ContribuinteProfile, ContabilidadeProfile, CidadaoProfile } from '../types';
import { INITIAL_CONTRIBUINTES, INITIAL_CONTABILIDADES, INITIAL_FEIRAS } from '../data/mockData';

interface ConferenciaCadastralModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
}

export const ConferenciaCadastralModal: React.FC<ConferenciaCadastralModalProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  // 1. Identificar se é CNPJ ou CPF
  const isCnpj = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.tipo_usuario === 'CONTABILIDADE') return true;
    if (currentUser.tipo_usuario === 'CONTRIBUINTE') {
      const doc = currentUser.cpf || '';
      const clean = doc.replace(/\D/g, '');
      if (clean.length === 14 || doc.includes('/')) return true;
      if (currentUser.categoria_contribuinte === 'EMPRESARIO') return true;
    }
    return false;
  }, [currentUser]);

  // 2. Buscar cadastro estendido de contribuinte se existir
  const dadosContribuinte = useMemo<ContribuinteProfile | null>(() => {
    if (!currentUser) return null;
    try {
      const saved = localStorage.getItem('visa_contribuintes');
      const lista: ContribuinteProfile[] = saved ? JSON.parse(saved) : INITIAL_CONTRIBUINTES;
      const docLimpo = (currentUser.cpf || '').replace(/\D/g, '');
      
      const encontrado = lista.find(c => {
        const cDoc = (c.cnpj_cpf || '').replace(/\D/g, '');
        return (docLimpo && cDoc === docLimpo) || c.id === currentUser.contribuinte_id || c.email === currentUser.email;
      });
      if (encontrado) return encontrado;
    } catch (e) {
      console.error(e);
    }
    return null;
  }, [currentUser]);

  // 3. Buscar cadastro estendido de contabilidade se for escritório
  const dadosContabilidade = useMemo<ContabilidadeProfile | null>(() => {
    if (!currentUser || currentUser.tipo_usuario !== 'CONTABILIDADE') return null;
    try {
      const saved = localStorage.getItem('visa_contabilidades_lab');
      const lista: ContabilidadeProfile[] = saved ? JSON.parse(saved) : INITIAL_CONTABILIDADES;
      const docLimpo = (currentUser.cpf || '').replace(/\D/g, '');

      const encontrado = lista.find(c => {
        const cDoc = (c.cnpj || '').replace(/\D/g, '');
        return (docLimpo && cDoc === docLimpo) || c.id === currentUser.contabilidade_id || c.email === currentUser.email;
      });
      if (encontrado) return encontrado;
    } catch (e) {
      console.error(e);
    }
    return null;
  }, [currentUser]);

  // 4. Buscar dados de feirante se aplicável
  const dadosFeirante = useMemo(() => {
    if (!currentUser) return null;
    const docLimpo = (currentUser.cpf || '').replace(/\D/g, '');
    const encontrado = INITIAL_FEIRAS.find(f => (f.cpf || '').replace(/\D/g, '') === docLimpo);
    return encontrado || null;
  }, [currentUser]);

  if (!isOpen || !currentUser) return null;

  const tipo = currentUser.tipo_usuario || 'SERVIDOR';

  // Copiar resumo geral dos dados
  const handleCopyResumo = () => {
    let resumo = `=== FICHA CADASTRAL • VISA BALNEÁRIO CAMBORIÚ ===\n`;
    resumo += `Data da Consulta: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}\n`;
    
    if (tipo === 'CONTRIBUINTE' && isCnpj) {
      resumo += `Tipo: Empresa (Pessoa Jurídica - CNPJ)\n`;
      resumo += `Razão Social: ${dadosContribuinte?.razao_social || currentUser.nome_completo}\n`;
      resumo += `Nome Fantasia: ${dadosContribuinte?.nome_fantasia || 'Não informado'}\n`;
      resumo += `CNPJ: ${dadosContribuinte?.cnpj_cpf || currentUser.cpf || 'Não informado'}\n`;
      resumo += `Atividade: ${dadosContribuinte?.ramo_atividade || dadosContribuinte?.cnae_principal_descricao || 'Serviços sujeitos à Vigilância Sanitária'}\n`;
      resumo += `Endereço: ${dadosContribuinte?.endereco || currentUser.endereco || 'Balneário Camboriú/SC'}, ${dadosContribuinte?.bairro || currentUser.bairro || 'Centro'}\n`;
      resumo += `Responsável: ${dadosContribuinte?.responsavel || dadosContribuinte?.nome_proprietario || currentUser.nome_completo}\n`;
      resumo += `E-mail: ${dadosContribuinte?.email || currentUser.email}\n`;
      resumo += `Telefone: ${dadosContribuinte?.telefone || currentUser.telefone || 'Não informado'}\n`;
    } else if (tipo === 'CONTABILIDADE') {
      resumo += `Tipo: Escritório de Contabilidade (Pessoa Jurídica)\n`;
      resumo += `Razão Social: ${dadosContabilidade?.razao_social || currentUser.nome_completo}\n`;
      resumo += `Nome Fantasia: ${dadosContabilidade?.nome_fantasia || 'Não informado'}\n`;
      resumo += `CNPJ: ${dadosContabilidade?.cnpj || currentUser.cpf || 'Não informado'}\n`;
      resumo += `CRC: ${dadosContabilidade?.crc || 'CRC/SC Registrado'}\n`;
      resumo += `Responsável Técnico Contábil: ${dadosContabilidade?.responsavel || currentUser.nome_completo}\n`;
      resumo += `E-mail: ${dadosContabilidade?.email || currentUser.email}\n`;
      resumo += `Telefone: ${dadosContabilidade?.telefone || currentUser.telefone || 'Não informado'}\n`;
    } else if (tipo === 'SERVIDOR') {
      resumo += `Tipo: Servidor Público Municipal (Vigilância Sanitária)\n`;
      resumo += `Servidor: ${currentUser.nome_completo}\n`;
      resumo += `Matrícula: ${currentUser.matricula || 'Oficial DVIS'}\n`;
      resumo += `Cargo: ${currentUser.cargo}\n`;
      resumo += `Setor: ${currentUser.setor || 'Vigilância Sanitária e Ambiental - DVIS'}\n`;
      resumo += `Nível de Acesso: ${currentUser.nivel_acesso || 'VISA'}\n`;
      resumo += `E-mail Institucional: ${currentUser.email}\n`;
      resumo += `Lotação: Secretaria de Saúde e Saneamento de Balneário Camboriú\n`;
    } else {
      resumo += `Tipo: Contribuinte Individual / Cidadão (Pessoa Física)\n`;
      resumo += `Nome: ${currentUser.nome_completo}\n`;
      resumo += `CPF: ${currentUser.cpf || 'Não informado'}\n`;
      resumo += `Categoria: ${currentUser.categoria_contribuinte || (dadosFeirante ? 'Feirante' : 'Cidadão')}\n`;
      resumo += `Endereço: ${currentUser.endereco || 'Balneário Camboriú/SC'}, ${currentUser.bairro || 'Centro'}\n`;
      resumo += `E-mail: ${currentUser.email}\n`;
      resumo += `Telefone: ${currentUser.telefone || 'Não informado'}\n`;
    }
    resumo += `================================================`;

    navigator.clipboard.writeText(resumo);
    setCopiedField('resumo_completo');
    setTimeout(() => setCopiedField(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#151928] border border-slate-200 dark:border-indigo-500/30 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.4)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden my-auto text-left">
        
        {/* Top Accent Banner */}
        <div className={`h-2.5 w-full ${
          tipo === 'SERVIDOR'
            ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500'
            : isCnpj || tipo === 'CONTABILIDADE'
            ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600'
            : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600'
        }`} />

        {/* Header */}
        <div className="px-5 sm:px-7 pt-5 pb-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 ${
              tipo === 'SERVIDOR'
                ? 'bg-blue-600 dark:bg-blue-500'
                : isCnpj || tipo === 'CONTABILIDADE'
                ? 'bg-amber-600 dark:bg-amber-500'
                : 'bg-emerald-600 dark:bg-emerald-500'
            }`}>
              {tipo === 'SERVIDOR' ? (
                <ShieldCheck className="w-6 h-6" />
              ) : isCnpj || tipo === 'CONTABILIDADE' ? (
                <Building2 className="w-6 h-6" />
              ) : (
                <User className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  tipo === 'SERVIDOR'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-200 dark:border-blue-400/30'
                    : isCnpj || tipo === 'CONTABILIDADE'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-400/30'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-400/30'
                }`}>
                  <BadgeCheck className="w-3 h-3" />
                  {tipo === 'SERVIDOR'
                    ? 'Servidor Municipal Ativo'
                    : tipo === 'CONTABILIDADE'
                    ? 'Escritório Contábil Homologado'
                    : isCnpj
                    ? 'Pessoa Jurídica • CNPJ Cadastrado'
                    : 'Pessoa Física • Cadastro Ativo'}
                </span>

                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  VISA BC • DVIS
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {tipo === 'SERVIDOR'
                  ? 'Ficha Funcional do Servidor'
                  : isCnpj
                  ? 'Conferência Cadastral da Empresa (CNPJ)'
                  : tipo === 'CONTABILIDADE'
                  ? 'Ficha Cadastral da Contabilidade (CRC)'
                  : 'Conferência Cadastral Individual (CPF)'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verifique os dados registrados perante a Vigilância Sanitária de Balneário Camboriú.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-7 max-h-[68vh] overflow-y-auto space-y-5">
          
          {/* ======================= CASO 1: EMPRESA (CNPJ) ======================= */}
          {(isCnpj && tipo !== 'CONTABILIDADE') && (
            <>
              {/* Cartão de Identificação da Empresa */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 dark:border-amber-500/20 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Razão Social
                    </span>
                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">
                      {dadosContribuinte?.razao_social || currentUser.nome_completo}
                    </h3>
                    {dadosContribuinte?.nome_fantasia && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        Nome Fantasia: <strong className="text-amber-800 dark:text-amber-300">{dadosContribuinte.nome_fantasia}</strong>
                      </p>
                    )}
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                      CNPJ da Empresa
                    </span>
                    <div className="inline-flex items-center gap-2 mt-0.5">
                      <span className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-amber-200">
                        {dadosContribuinte?.cnpj_cpf || currentUser.cpf || '12.345.678/0001-90'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(dadosContribuinte?.cnpj_cpf || currentUser.cpf || '12.345.678/0001-90', 'cnpj')}
                        className="p-1 rounded-lg hover:bg-amber-200/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 transition cursor-pointer"
                        title="Copiar CNPJ"
                      >
                        {copiedField === 'cnpj' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Situação Cadastral:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ATIVA / REGULAR NA VISA BC
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Município de Funcionamento:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Balneário Camboriú - SC
                    </span>
                  </div>
                </div>
              </div>

              {/* Atividade Econômica / CNAE */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <Briefcase className="w-4 h-4 text-indigo-500" />
                  <span>Atividade Econômica Registrada</span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 block">
                    CNAE Principal
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {dadosContribuinte?.ramo_atividade || dadosContribuinte?.cnae_principal_descricao || '56.11-2-01 - Restaurantes e similares / Estabelecimentos Gastronômicos'}
                  </p>
                  {dadosContribuinte?.cnae_principal_codigo && (
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block">
                      Código Oficial: {dadosContribuinte.cnae_principal_codigo}
                    </span>
                  )}
                </div>

                {dadosContribuinte?.cnaes_secundarios && dadosContribuinte.cnaes_secundarios.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      CNAEs Secundários ({dadosContribuinte.cnaes_secundarios.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {dadosContribuinte.cnaes_secundarios.map((cnae, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-mono">
                          {cnae}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Endereço Sanitário */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>Endereço Sanitário do Estabelecimento</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Logradouro:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {dadosContribuinte?.endereco || currentUser.endereco || 'Av. Atlântica, 2400'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Bairro:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {dadosContribuinte?.bairro || currentUser.bairro || 'Centro'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Cidade / Estado:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      Balneário Camboriú / SC
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">CEP:</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-100">
                      88330-000
                    </span>
                  </div>
                </div>
              </div>

              {/* Responsáveis e Contatos */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <User className="w-4 h-4 text-emerald-500" />
                  <span>Responsáveis e Meios de Notificação</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Responsável Legal</span>
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {dadosContribuinte?.responsavel || dadosContribuinte?.nome_proprietario || currentUser.nome_completo}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Telefone / WhatsApp</span>
                    <p className="font-bold text-slate-900 dark:text-white font-mono flex items-center justify-between">
                      <span>{dadosContribuinte?.telefone || currentUser.telefone || '(47) 3361-9090'}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(dadosContribuinte?.telefone || currentUser.telefone || '(47) 3361-9090', 'tel')}
                        className="p-1 hover:text-indigo-500 transition"
                      >
                        {copiedField === 'tel' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      </button>
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 sm:col-span-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">E-mail Cadastrado para Intimações e Notificações</span>
                    <p className="font-bold text-slate-900 dark:text-white font-mono flex items-center justify-between">
                      <span className="truncate">{dadosContribuinte?.email || currentUser.email}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(dadosContribuinte?.email || currentUser.email, 'email')}
                        className="p-1 hover:text-indigo-500 transition shrink-0"
                      >
                        {copiedField === 'email' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ======================= CASO 2: CONTABILIDADE (CRC) ======================= */}
          {tipo === 'CONTABILIDADE' && (
            <>
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/60 dark:border-indigo-500/20 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                      Escritório Contábil Homologado
                    </span>
                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">
                      {dadosContabilidade?.razao_social || currentUser.nome_completo}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Nome Fantasia: <strong>{dadosContabilidade?.nome_fantasia || 'Balneário Assessoria Contábil'}</strong>
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block">
                      CNPJ Contábil
                    </span>
                    <div className="inline-flex items-center gap-2 mt-0.5">
                      <span className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-indigo-200">
                        {dadosContabilidade?.cnpj || currentUser.cpf || '83.102.285/0001-07'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(dadosContabilidade?.cnpj || currentUser.cpf || '83.102.285/0001-07', 'cnpj_contab')}
                        className="p-1 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900 text-indigo-800 dark:text-indigo-300 transition"
                      >
                        {copiedField === 'cnpj_contab' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Registro no Conselho (CRC):</span>
                    <span className="font-mono font-black text-indigo-700 dark:text-indigo-300 text-sm">
                      {dadosContabilidade?.crc || 'CRC/SC-012345/O'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Responsável Técnico Contábil:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {dadosContabilidade?.responsavel || currentUser.nome_completo}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <span>Carteira de Empresas Vinculadas</span>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-700">
                    {dadosContabilidade?.cnpjs_vinculados?.length || 3} CNPJs Gerenciados
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Telefone Comercial:</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                      {dadosContabilidade?.telefone || currentUser.telefone || '(47) 3367-1020'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">E-mail para Tramitação:</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200 truncate block">
                      {dadosContabilidade?.email || currentUser.email}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ======================= CASO 3: SERVIDOR PÚBLICO (VISA BC) ======================= */}
          {tipo === 'SERVIDOR' && (
            <>
              {/* Cartão Funcional do Servidor */}
              <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/60 dark:border-blue-500/20 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
                      Nome do Servidor Público
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase">
                      {currentUser.nome_completo}
                    </h3>
                    <p className="text-xs text-blue-800 dark:text-blue-300 font-bold uppercase tracking-wider">
                      {currentUser.cargo || 'FISCAL DE VIGILÂNCIA SANITÁRIA'}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 block">
                      Matrícula Funcional Oficial
                    </span>
                    <div className="inline-flex items-center gap-2 mt-0.5">
                      <span className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-blue-200">
                        {currentUser.matricula || 'FIS-4092'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(currentUser.matricula || 'FIS-4092', 'matricula')}
                        className="p-1 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900 text-blue-800 dark:text-blue-300 transition"
                        title="Copiar Matrícula"
                      >
                        {copiedField === 'matricula' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Lotação / Órgão:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Divisão de Vigilância Sanitária e Ambiental - DVIS
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Secretaria Municipal:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Sec. de Saúde e Saneamento de Balneário Camboriú
                    </span>
                  </div>
                </div>
              </div>

              {/* Parâmetros de Acesso e Competência Técnica */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                  <span>Competência e Credenciais no Portal</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Nível de Acesso</span>
                    <span className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase">
                      {currentUser.nivel_acesso || 'VISA (FISCAL)'}
                    </span>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Setor de Atuação</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">
                      {currentUser.setor || 'VIGILÂNCIA SANITÁRIA'}
                    </span>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl sm:col-span-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">E-mail Institucional Oficial (@bc.sc.gov.br)</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                        {currentUser.email}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(currentUser.email, 'email_servidor')}
                        className="p-1 hover:text-blue-500 transition"
                      >
                        {copiedField === 'email_servidor' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl sm:col-span-2 text-xs">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Telefone e Ramal DVIS</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      (47) 3267-7000 • Ramal 7050 (Atendimento ao Público: 13h às 17h)
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ======================= CASO 4: PESSOA FÍSICA / CPF (FEIRANTE / AUTÔNOMO / CIDADÃO) ======================= */}
          {(!isCnpj && tipo !== 'SERVIDOR' && tipo !== 'CONTABILIDADE') && (
            <>
              {/* Cartão de Identificação PF */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 dark:border-emerald-500/20 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Nome do Titular
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase">
                      {currentUser.nome_completo}
                    </h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 font-bold uppercase">
                      {currentUser.categoria_contribuinte 
                        ? `Categoria: ${currentUser.categoria_contribuinte}` 
                        : (dadosFeirante ? 'Feirante Autorizado' : 'Munícipe / Contribuinte Individual')}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                      CPF do Contribuinte
                    </span>
                    <div className="inline-flex items-center gap-2 mt-0.5">
                      <span className="text-base font-black font-mono text-slate-900 dark:text-emerald-200">
                        {currentUser.cpf || '123.456.789-00'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(currentUser.cpf || '123.456.789-00', 'cpf')}
                        className="p-1 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 transition"
                      >
                        {copiedField === 'cpf' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {dadosFeirante && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800/50 space-y-1 text-xs">
                    <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block">
                      Ponto de Atuação na Feira
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {dadosFeirante.feira} • Pasta: {dadosFeirante.pasta}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      Produtos: {dadosFeirante.produtos}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Bairro / Localidade:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {currentUser.bairro || 'Centro, Balneário Camboriú - SC'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Status do Cadastro Sanitário:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> HABILITADO / ATIVO
                    </span>
                  </div>
                </div>
              </div>

              {/* Contatos para Notificação */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  <span>Canais Oficiais de Contato</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Telefone / WhatsApp</span>
                    <p className="font-bold text-slate-900 dark:text-white font-mono flex items-center justify-between">
                      <span>{currentUser.telefone || '(47) 98888-1234'}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(currentUser.telefone || '(47) 98888-1234', 'tel_pf')}
                        className="p-1 hover:text-emerald-500 transition"
                      >
                        {copiedField === 'tel_pf' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      </button>
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">E-mail Cadastrado</span>
                    <p className="font-bold text-slate-900 dark:text-white font-mono flex items-center justify-between">
                      <span className="truncate">{currentUser.email}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(currentUser.email, 'email_pf')}
                        className="p-1 hover:text-emerald-500 transition shrink-0"
                      >
                        {copiedField === 'email_pf' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Rodapé Informativo / Segurança de Dados */}
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Informações Protegidas nos Termos da LGPD (Lei Federal nº 13.709/2018)
              </p>
              <p className="mt-0.5 leading-relaxed">
                Estes dados são sincronizados com a base cadastral oficial da Vigilância Sanitária de Balneário Camboriú. Caso necessite retificar telefones, endereços ou responsáveis, realize a solicitação de alteração cadastral no portal.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 sm:px-7 py-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyResumo}
              className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {copiedField === 'resumo_completo' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Dados Copiados!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Ficha Cadastral</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              title="Imprimir ou gerar PDF desta ficha"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
