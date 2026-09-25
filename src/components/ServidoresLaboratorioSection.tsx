import React, { useState, useMemo } from 'react';
import {
  ServidorColetaLaboratorio,
  LaboratorialistaResponsavel,
  AmostraLaboratorioItem,
  UserProfile
} from '../types';
import {
  Users,
  Award,
  Phone,
  Mail,
  Star,
  Search,
  CheckCircle2,
  FileSignature,
  Droplet,
  FlaskConical,
  ShieldCheck,
  Check,
  Sparkles
} from 'lucide-react';

interface ServidoresLaboratorioSectionProps {
  coletores: ServidorColetaLaboratorio[];
  laboratorialistas: LaboratorialistaResponsavel[];
  amostras: AmostraLaboratorioItem[];
  users: UserProfile[];
  currentUser: UserProfile | null;
  onSaveColetor: (coletor: ServidorColetaLaboratorio) => void;
  onDeleteColetor: (id: string) => void;
  onSaveLaboratorialista: (lab: LaboratorialistaResponsavel) => void;
  onDeleteLaboratorialista: (id: string) => void;
}

export const ServidoresLaboratorioSection: React.FC<ServidoresLaboratorioSectionProps> = ({
  coletores,
  laboratorialistas,
  amostras,
  users,
  onSaveColetor,
  onSaveLaboratorialista
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'TODOS' | 'HABILITADOS' | 'LAB' | 'COLETOR'>('TODOS');

  // Estatísticas de Laudos por Laboratorialista
  const laudosCountPorLab = useMemo(() => {
    const counts: Record<string, number> = {};
    amostras.forEach((a) => {
      if (a.laboratorialista) {
        const key = a.laboratorialista.trim().toUpperCase();
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [amostras]);

  // Estatísticas de Coletas por Fiscal
  const coletasCountPorFiscal = useMemo(() => {
    const counts: Record<string, number> = {};
    amostras.forEach((a) => {
      if (a.fiscal_coletor) {
        const key = a.fiscal_coletor.trim().toUpperCase();
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [amostras]);

  // Helper: mapear se um usuário registrado está habilitado como Laboratorialista ou Coletor
  const userRolesMap = useMemo(() => {
    const map = new Map<string, { lab?: LaboratorialistaResponsavel; col?: ServidorColetaLaboratorio }>();
    users.forEach((u) => {
      const uName = u.nome_completo.trim().toUpperCase();
      const lab = laboratorialistas.find(
        (l) => l.id === u.id || l.nome_completo.trim().toUpperCase() === uName
      );
      const col = coletores.find(
        (c) => c.id === u.id || c.nome_completo.trim().toUpperCase() === uName
      );
      map.set(u.id, { lab, col });
    });
    return map;
  }, [users, laboratorialistas, coletores]);

  // Filtragem da lista geral de servidores da VISA
  const servidoresFiltrados = useMemo(() => {
    return users.filter((u) => {
      const roles = userRolesMap.get(u.id) || {};
      const isLab = roles.lab && roles.lab.ativo;
      const isCol = roles.col && roles.col.ativo;
      const isHabilitado = isLab || isCol;

      if (roleFilter === 'HABILITADOS' && !isHabilitado) return false;
      if (roleFilter === 'LAB' && !isLab) return false;
      if (roleFilter === 'COLETOR' && !isCol) return false;

      if (!searchTerm.trim()) return true;

      const term = searchTerm.toLowerCase();
      return (
        u.nome_completo.toLowerCase().includes(term) ||
        (u.cargo && u.cargo.toLowerCase().includes(term)) ||
        (u.matricula && u.matricula.toLowerCase().includes(term)) ||
        (u.conselho_regional && u.conselho_regional.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (roles.lab?.registro_conselho && roles.lab.registro_conselho.toLowerCase().includes(term))
      );
    });
  }, [users, userRolesMap, roleFilter, searchTerm]);

  // ==============================================================
  // AÇÕES DIRETAS: HABILITAR / DESABILITAR FUNÇÃO DE SERVIDOR
  // ==============================================================

  const handleToggleUserAsLab = (user: UserProfile) => {
    const existing = laboratorialistas.find(
      (l) => l.id === user.id || l.nome_completo.trim().toUpperCase() === user.nome_completo.trim().toUpperCase()
    );

    if (existing) {
      onSaveLaboratorialista({
        ...existing,
        ativo: !existing.ativo
      });
    } else {
      const isPharmacist = user.cargo?.toUpperCase().includes('FARMAC') || user.cargo?.toUpperCase().includes('BIOQU');
      const isAdriano = user.nome_completo.toUpperCase().includes('ADRIANO');

      const newLab: LaboratorialistaResponsavel = {
        id: user.id || `lab-${Date.now()}`,
        nome_completo: user.nome_completo.trim().toUpperCase(),
        funcao: user.cargo ? user.cargo.trim().toUpperCase() : 'FARMACÊUTICO E BIOQUIMICO',
        conselho_regional: user.conselho_regional ? user.conselho_regional.split('/')[0] : 'CRF',
        registro_conselho: user.conselho_regional || (isPharmacist || isAdriano ? 'CRF/SC- 3321' : 'CRF/SC- REG'),
        email: user.email || '',
        telefone: user.telefone || '',
        senha: user.senha || '123456',
        ativo: true,
        padrao: laboratorialistas.length === 0 || isAdriano,
        observacao: `Servidor oficial habilitado da equipe (${user.setor || 'VISA'}).`
      };
      onSaveLaboratorialista(newLab);
    }
  };

  const handleSetUserAsLabPadrao = (user: UserProfile) => {
    const existing = laboratorialistas.find(
      (l) => l.id === user.id || l.nome_completo.trim().toUpperCase() === user.nome_completo.trim().toUpperCase()
    );
    if (existing) {
      onSaveLaboratorialista({ ...existing, padrao: true, ativo: true });
    } else {
      handleToggleUserAsLab(user);
    }
  };

  const handleToggleUserAsColetor = (user: UserProfile) => {
    const existing = coletores.find(
      (c) => c.id === user.id || c.nome_completo.trim().toUpperCase() === user.nome_completo.trim().toUpperCase()
    );

    if (existing) {
      onSaveColetor({
        ...existing,
        ativo: !existing.ativo
      });
    } else {
      const newColetor: ServidorColetaLaboratorio = {
        id: user.id || `coletor-${Date.now()}`,
        nome_completo: user.nome_completo.trim(),
        cargo: user.cargo ? user.cargo.trim().toUpperCase() : 'FISCAL DE VIGILÂNCIA SANITÁRIA',
        matricula: user.matricula || '',
        email: user.email || '',
        telefone: user.telefone || '',
        ativo: true,
        observacao: `Fiscal de campo habilitado (${user.setor || 'VISA'}).`
      };
      onSaveColetor(newColetor);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Informativo e Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-cyan-900 to-slate-900 text-white p-5 rounded-2xl border border-cyan-700/50 shadow-md relative overflow-hidden">
          <div className="absolute top-3 right-3 text-cyan-400/20">
            <FlaskConical className="w-16 h-16" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider text-cyan-300">
            Laboratorialistas (CRF)
          </span>
          <div className="text-3xl font-black mt-1 text-white">
            {laboratorialistas.filter((l) => l.ativo).length}
          </div>
          <p className="text-[11px] text-cyan-200/80 mt-1">
            Habilitado(s) para assinar laudos oficiais
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white p-5 rounded-2xl border border-blue-700/50 shadow-md relative overflow-hidden">
          <div className="absolute top-3 right-3 text-blue-400/20">
            <Droplet className="w-16 h-16" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider text-blue-300">
            Fiscais Coletores
          </span>
          <div className="text-3xl font-black mt-1 text-white">
            {coletores.filter((c) => c.ativo).length}
          </div>
          <p className="text-[11px] text-blue-200/80 mt-1">
            Habilitado(s) para coletas de campo
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Equipe Total da VISA
          </span>
          <div className="text-3xl font-black mt-1 text-slate-800 dark:text-white">
            {users.length}
          </div>
          <p className="text-[11px] text-cyan-600 dark:text-cyan-400 font-bold mt-1">
            Servidores cadastrados no sistema
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Laudos Técnicos Emitidos
          </span>
          <div className="text-3xl font-black mt-1 text-slate-800 dark:text-white">
            {amostras.filter((a) => a.laudo_numero || a.status === 'CONFORME' || a.status === 'NÃO CONFORME').length}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
            Com assinatura e autenticação
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PAINEL CENTRAL DIRETO: HABILITAÇÃO DOS SERVIDORES CADASTRADOS */}
      {/* ============================================================== */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white rounded-3xl p-6 border border-cyan-800/60 shadow-xl space-y-5">
        {/* Cabeçalho da Central */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-cyan-800/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-2xl border border-cyan-400/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-black text-base uppercase tracking-wide text-white">
                  Habilitação de Funções dos Servidores Cadastrados
                </h3>
                <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full border border-cyan-400/30">
                  {users.length} Servidores na Base
                </span>
              </div>
              <p className="text-xs text-cyan-200/80 mt-0.5">
                Defina com 1 clique quem pode atuar como <strong className="text-cyan-300">Laboratorialista (Assina Laudos com CRF)</strong> e <strong className="text-blue-300">Fiscal Coletor (Campo)</strong>. Todos os dados (nome, cargo, matrícula, conselho e credencial) são repassados integralmente aos laudos e coletas.
              </p>
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Busca Rápida */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/60">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar servidor por nome, matrícula, cargo, CRF/conselho..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-700 text-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-cyan-500 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-700 text-[11px] font-black uppercase shrink-0">
            <button
              onClick={() => setRoleFilter('TODOS')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                roleFilter === 'TODOS'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Todos ({users.length})
            </button>
            <button
              onClick={() => setRoleFilter('HABILITADOS')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                roleFilter === 'HABILITADOS'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Habilitados ({users.filter((u) => {
                const r = userRolesMap.get(u.id);
                return (r?.lab && r.lab.ativo) || (r?.col && r.col.ativo);
              }).length})
            </button>
            <button
              onClick={() => setRoleFilter('LAB')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                roleFilter === 'LAB'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FlaskConical className="w-3 h-3" />
              Resp. Técnicos ({laboratorialistas.filter((l) => l.ativo).length})
            </button>
            <button
              onClick={() => setRoleFilter('COLETOR')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                roleFilter === 'COLETOR'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Droplet className="w-3 h-3" />
              Coletores ({coletores.filter((c) => c.ativo).length})
            </button>
          </div>
        </div>

        {/* Grade de Cartões dos Servidores */}
        {servidoresFiltrados.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-8 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto text-slate-500 mb-2 opacity-60" />
            <p className="text-xs font-bold uppercase">Nenhum servidor encontrado com os critérios de busca.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {servidoresFiltrados.map((user) => {
              const roles = userRolesMap.get(user.id) || {};
              const isLab = !!roles.lab;
              const isLabActive = roles.lab?.ativo ?? false;
              const isLabPadrao = roles.lab?.padrao ?? false;
              const isCol = !!roles.col;
              const isColActive = roles.col?.ativo ?? false;

              const laudosEmitidos = laudosCountPorLab[user.nome_completo.trim().toUpperCase()] || 0;
              const coletasFeitas = coletasCountPorFiscal[user.nome_completo.trim().toUpperCase()] || 0;

              return (
                <div
                  key={user.id}
                  className={`bg-slate-800/90 hover:bg-slate-800 border rounded-2xl p-4 transition shadow-md flex flex-col justify-between space-y-3.5 relative overflow-hidden ${
                    isLabPadrao
                      ? 'border-cyan-400 ring-2 ring-cyan-500/20'
                      : isLabActive || isColActive
                      ? 'border-cyan-700/80 hover:border-cyan-500'
                      : 'border-slate-700/70 hover:border-slate-600'
                  }`}
                >
                  {/* Selo de Responsável Padrão nos Laudos */}
                  {isLabPadrao && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-cyan-600 to-blue-600 text-white text-[9px] font-black uppercase px-3 py-0.5 rounded-bl-xl shadow flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-current" /> Padrão nos Laudos
                    </div>
                  )}

                  <div className="space-y-2">
                    {/* Linha 1: Avatar, Nome e Cargo */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                        {user.nome_completo.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>

                      <div className="min-w-0 flex-1 pr-10">
                        <h4 className="font-black text-xs text-white uppercase truncate" title={user.nome_completo}>
                          {user.nome_completo}
                        </h4>
                        <div className="text-[11px] text-cyan-300 font-bold uppercase truncate" title={user.cargo}>
                          {user.cargo || 'FISCAL SANITÁRIO'}
                        </div>
                      </div>
                    </div>

                    {/* Linha 2: Matrícula, Conselho Regional e Contatos */}
                    <div className="bg-slate-900/70 rounded-xl p-2.5 border border-slate-700/70 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {user.matricula ? (
                          <span className="font-mono text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            Mat: <strong>{user.matricula}</strong>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Sem matrícula</span>
                        )}

                        {user.conselho_regional || roles.lab?.registro_conselho ? (
                          <div className="text-[10px] font-mono font-bold text-cyan-200 flex items-center gap-1 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                            <Award className="w-3 h-3 text-cyan-400" />
                            <span>{roles.lab?.registro_conselho || user.conselho_regional}</span>
                          </div>
                        ) : null}
                      </div>

                      {(user.email || user.telefone) && (
                        <div className="text-[10px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-800">
                          {user.email && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>
                          )}
                          {user.telefone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>{user.telefone}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Estatísticas Rápidas de Produção */}
                    {(laudosEmitidos > 0 || coletasFeitas > 0) && (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 pt-0.5">
                        {laudosEmitidos > 0 && (
                          <span className="bg-cyan-950/60 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800/40 flex items-center gap-1">
                            <FileSignature className="w-2.5 h-2.5" /> {laudosEmitidos} laudo(s) assinado(s)
                          </span>
                        )}
                        {coletasFeitas > 0 && (
                          <span className="bg-blue-950/60 text-blue-300 px-2 py-0.5 rounded border border-blue-800/40 flex items-center gap-1">
                            <Droplet className="w-2.5 h-2.5" /> {coletasFeitas} coleta(s)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ações de Habilitação do Servidor */}
                  <div className="space-y-2 pt-2 border-t border-slate-700/60">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Botão: Laboratorialista / Responsável Técnico */}
                      <button
                        onClick={() => handleToggleUserAsLab(user)}
                        className={`text-[10px] font-black uppercase px-2.5 py-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          isLab
                            ? isLabActive
                              ? 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-sm'
                              : 'bg-amber-900/50 text-amber-300 border border-amber-700/50 hover:bg-amber-900'
                            : 'bg-slate-700/60 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-slate-600/50'
                        }`}
                        title={
                          isLab
                            ? isLabActive
                              ? 'Clique para desativar a função de Resp. Técnico'
                              : 'Clique para reativar função'
                            : 'Habilitar este servidor para emissão e assinatura de laudos com CRF'
                        }
                      >
                        <FlaskConical className="w-3.5 h-3.5" />
                        {isLab ? (isLabActive ? 'Resp. Técnico ✓' : 'Lab. Inativo') : '+ Resp. Técnico'}
                      </button>

                      {/* Botão: Fiscal Coletor */}
                      <button
                        onClick={() => handleToggleUserAsColetor(user)}
                        className={`text-[10px] font-black uppercase px-2.5 py-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          isCol
                            ? isColActive
                              ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-sm'
                              : 'bg-amber-900/50 text-amber-300 border border-amber-700/50 hover:bg-amber-900'
                            : 'bg-slate-700/60 hover:bg-blue-950 text-slate-300 hover:text-blue-300 border border-slate-600/50'
                        }`}
                        title={
                          isCol
                            ? isColActive
                              ? 'Clique para desativar coleta de campo'
                              : 'Clique para reativar'
                            : 'Habilitar este servidor para lançamentos de coleta de água'
                        }
                      >
                        <Droplet className="w-3.5 h-3.5" />
                        {isCol ? (isColActive ? 'Coletor ✓' : 'Col. Inativo') : '+ Coletor'}
                      </button>
                    </div>

                    {/* Botão para Definir como Padrão nos Laudos */}
                    {isLabActive && !isLabPadrao && (
                      <button
                        onClick={() => handleSetUserAsLabPadrao(user)}
                        className="w-full text-[10px] font-black uppercase py-1 px-2 text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/70 border border-cyan-800/60 rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
                        title="Tornar este profissional o responsável padrão pré-selecionado nos novos laudos"
                      >
                        <Star className="w-3 h-3 text-cyan-400" />
                        Definir como Padrão dos Laudos
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
