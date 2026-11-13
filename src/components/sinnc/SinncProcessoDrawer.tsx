import React, { useState } from 'react';
import {
  ProcessoItem,
  ProcessoStatus,
  TipoParecerTecnico,
  UserProfile,
  ParecerTecnicoItem,
  TramitacaoItem,
} from '../../types';
import { X, FileCheck2, Clock, MapPin, Building2, Send, CheckCircle2 } from 'lucide-react';
import { formatShortBrDate } from './sinncTypes';

interface SinncProcessoDrawerProps {
  processo: ProcessoItem | null;
  currentUser: UserProfile | null;
  onClose: () => void;
  onSaveProcesso: (updated: ProcessoItem) => Promise<void> | void;
  onOpenClassicVistoria?: (proc: ProcessoItem) => void;
}

export const SinncProcessoDrawer: React.FC<SinncProcessoDrawerProps> = ({
  processo,
  currentUser,
  onClose,
  onSaveProcesso,
}) => {
  const [tipoParecer, setTipoParecer] = useState<TipoParecerTecnico>('FAVORÁVEL (DEFERIMENTO)');
  const [novoStatus, setNovoStatus] = useState<ProcessoStatus>(processo?.status || 'EM ANÁLISE');
  const [parecerTexto, setParecerTexto] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!processo) return null;

  const handleEmitirParecer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parecerTexto.trim()) return;
    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const authCode = `SINNC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const autorNome = currentUser?.nome_completo || 'Coordenação VISA';
      const autorCargo = currentUser?.cargo || 'Auditor Fiscal';
      const autorMat = currentUser?.matricula || 'DVIS';

      const novoParecer: ParecerTecnicoItem = {
        id: `par-${Date.now()}`,
        autor_nome: autorNome,
        autor_cargo: autorCargo,
        autor_matricula: autorMat,
        autor_email: currentUser?.email,
        data_hora: nowIso,
        tipo_parecer: tipoParecer,
        parecer_texto: parecerTexto.trim(),
        novo_status: novoStatus,
        assinatura_digital: `Assinado digitalmente por ${autorNome} em ${new Date().toLocaleString('pt-BR')}`,
        codigo_autenticacao: authCode,
      };

      const novaTramitacao: TramitacaoItem = {
        id: `tram-${Date.now()}`,
        data_hora: nowIso,
        tipo: 'PARECER_EMITIDO',
        titulo: `Parecer técnico: ${tipoParecer}`,
        descricao: parecerTexto.trim(),
        responsavel_nome: autorNome,
        responsavel_cargo: autorCargo,
        responsavel_matricula: autorMat,
        status_processo_momento: novoStatus,
      };

      const updated: ProcessoItem = {
        ...processo,
        status: novoStatus,
        pareceres: [novoParecer, ...(processo.pareceres || [])],
        tramitacoes: [novaTramitacao, ...(processo.tramitacoes || [])],
      };

      await onSaveProcesso(updated);
      setParecerTexto('');
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[1px] flex justify-end text-left"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white h-full border-l border-slate-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Drawer Bar */}
        <div className="px-6 py-4 border-b border-slate-200 bg-[#f8fafc] flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
              <span>Processo {processo.num_processo || processo.id}</span>
              <span aria-hidden="true">·</span>
              <span>{processo.setor || 'Vigilância Sanitária'}</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-slate-700">{processo.status}</span>
            </div>
            <h2 className="text-base font-semibold text-slate-900 mt-1 truncate">
              {processo.razao_social || processo.nome_fantasia || 'Estabelecimento não informado'}
            </h2>
            {processo.nome_fantasia && processo.nome_fantasia !== processo.razao_social && (
              <p className="text-xs text-slate-500 truncate">{processo.nome_fantasia}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
            title="Fechar painel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Dados Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-slate-200">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                CNPJ / CPF e Assunto
              </span>
              <p className="text-sm font-mono text-slate-800 tabular-nums">{processo.cnpj_cpf || 'Não informado'}</p>
              <p className="text-xs text-slate-600">{processo.assunto || 'Análise sanitária'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Localização e Prazo
              </span>
              <p className="text-xs text-slate-800">
                {processo.endereco || 'Endereço não cadastrado'} {processo.bairro ? `· ${processo.bairro}` : ''}
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                Protocolo: {formatShortBrDate(processo.data_protocolo)} · Prazo:{' '}
                {formatShortBrDate(processo.prazo_vistoria || processo.venc_1doc || processo.agendado_para)}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-slate-400" />
                Fiscal Responsável
              </span>
              <p className="text-xs font-medium text-slate-800">
                {processo.fiscal_responsavel || 'Aguardando distribuição'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Grau de Risco e PAS
              </span>
              <p className="text-xs text-slate-800">
                {processo.grau_risco || 'Classificação padrão'} {processo.pas ? `· PAS ${processo.pas}` : ''}
              </p>
            </div>
          </div>

          {processo.observacoes && (
            <div className="pb-5 border-b border-slate-200 space-y-1.5">
              <h3 className="text-xs font-semibold text-slate-700">Observações registradas</h3>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{processo.observacoes}</p>
            </div>
          )}

          {/* Novo Parecer / Despacho */}
          <form onSubmit={handleEmitirParecer} className="space-y-3 pb-5 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-800">Registrar parecer ou despacho técnico</h3>
              {savedNotice && (
                <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Parecer registrado
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Tipo de manifestação</label>
                <select
                  value={tipoParecer}
                  onChange={(e) => setTipoParecer(e.target.value as TipoParecerTecnico)}
                  className="!text-xs !font-medium !py-2 !px-2.5 !rounded-md !border-slate-300"
                >
                  <option value="FAVORÁVEL (DEFERIMENTO)">Favorável (Deferimento)</option>
                  <option value="FAVORÁVEL COM CONDICIONANTES">Favorável com condicionantes</option>
                  <option value="EXIGÊNCIA / NOTIFICAÇÃO">Exigência / Notificação</option>
                  <option value="VISTORIA AGENDADA">Vistoria agendada</option>
                  <option value="DILIGÊNCIA / REQUISIÇÃO">Diligência / Requisição</option>
                  <option value="DESFAVORÁVEL (INDEFERIMENTO)">Desfavorável (Indeferimento)</option>
                  <option value="DESPACHO ADMINISTRATIVO">Despacho administrativo</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Atualizar situação</label>
                <select
                  value={novoStatus}
                  onChange={(e) => setNovoStatus(e.target.value as ProcessoStatus)}
                  className="!text-xs !font-medium !py-2 !px-2.5 !rounded-md !border-slate-300"
                >
                  <option value="EM ANÁLISE">Em análise</option>
                  <option value="PENDENTE DOCS">Pendente docs / Exigência</option>
                  <option value="VISTORIA AGENDADA">Vistoria agendada</option>
                  <option value="NOTIFICADO">Notificado</option>
                  <option value="DEFERIDO">Deferido</option>
                  <option value="INDEFERIDO">Indeferido</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Texto técnico</label>
              <textarea
                rows={3}
                value={parecerTexto}
                onChange={(e) => setParecerTexto(e.target.value)}
                placeholder="Descreva a análise documental, exigências ou conclusão da vistoria..."
                className="!text-xs !font-normal !py-2 !px-3 !rounded-md !border-slate-300"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || !parecerTexto.trim()}
                className="px-4 py-2 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{saving ? 'Salvando...' : 'Salvar parecer'}</span>
              </button>
            </div>
          </form>

          {/* Histórico de Pareceres e Tramitações */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-800">
              Histórico do processo ({(processo.pareceres?.length || 0) + (processo.tramitacoes?.length || 0)})
            </h3>

            {(!processo.pareceres || processo.pareceres.length === 0) &&
            (!processo.tramitacoes || processo.tramitacoes.length === 0) ? (
              <p className="text-xs text-slate-500">Nenhuma tramitação ou parecer anterior registrado.</p>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg bg-[#fafbfc]">
                {(processo.pareceres || []).map((par) => (
                  <div key={par.id} className="p-3.5 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-800">{par.tipo_parecer}</span>
                      <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {formatShortBrDate(par.data_hora)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{par.parecer_texto}</p>
                    <p className="text-[11px] text-slate-400">
                      {par.autor_nome} · {par.codigo_autenticacao}
                    </p>
                  </div>
                ))}
                {(processo.tramitacoes || []).map((tr) => (
                  <div key={tr.id} className="p-3.5 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-800">{tr.titulo}</span>
                      <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {formatShortBrDate(tr.data_hora)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{tr.descricao}</p>
                    <p className="text-[11px] text-slate-400">{tr.responsavel_nome}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
