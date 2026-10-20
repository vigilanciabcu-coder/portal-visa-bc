import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  Droplet,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  X,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Building2,
  ArrowRight
} from 'lucide-react';
import { FiscalizacaoItem, AmostraLaboratorioItem } from '../types';

interface AlertasPreventivosBannerProps {
  fiscalizacoes?: FiscalizacaoItem[];
  amostrasLaboratorio?: AmostraLaboratorioItem[];
  onSelectFiscalizacao?: (item: FiscalizacaoItem) => void;
  onSelectAmostra?: (amostra: AmostraLaboratorioItem) => void;
  onNavigate?: (view: string) => void;
}

export interface AlertaNotificacaoItem {
  fiscalizacao: FiscalizacaoItem;
  diasAtraso: number;
  dataLimite: string;
  motivo: string;
}

export interface AlertaAguaItem {
  amostra: AmostraLaboratorioItem;
  gravidade: 'CRÍTICA' | 'ALTA' | 'MODERADA';
  motivo: string;
  parametroAfetado: string;
}

export const AlertasPreventivosBanner: React.FC<AlertasPreventivosBannerProps> = ({
  fiscalizacoes = [],
  amostrasLaboratorio = [],
  onSelectFiscalizacao,
  onSelectAmostra,
  onNavigate
}) => {
  const [expandido, setExpandido] = useState(false);
  const [abaAlerta, setAbaAlerta] = useState<'prazos' | 'agua'>('prazos');

  // 1. Processa Notificações com Prazo de Adequação Vencido
  const alertasNotificacoes = useMemo<AlertaNotificacaoItem[]>(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const lista: AlertaNotificacaoItem[] = [];

    fiscalizacoes.forEach((fisc) => {
      // Analisa itens notificados ou com prazo pendente
      const isNotificado =
        fisc.status === 'NOTIFICADO' ||
        (fisc.medidasAdotadas && fisc.medidasAdotadas.toLowerCase().includes('notifica')) ||
        (fisc.irregularidadesEncontradas && fisc.irregularidadesEncontradas.length > 0 && fisc.status !== 'CONFORME');

      if (!isNotificado) return;

      const dataBaseStr = (fisc.dataHora || '').split(' ')[0];
      if (!dataBaseStr) return;

      const dataVistoria = new Date(dataBaseStr);
      if (isNaN(dataVistoria.getTime())) return;

      const prazoDias = Number(fisc.prazoAdequacaoDias) || 5;
      const dataLimite = new Date(dataVistoria);
      dataLimite.setDate(dataLimite.getDate() + prazoDias);

      if (hoje.getTime() > dataLimite.getTime()) {
        const diffMs = hoje.getTime() - dataLimite.getTime();
        const diasAtraso = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        lista.push({
          fiscalizacao: fisc,
          diasAtraso,
          dataLimite: dataLimite.toLocaleDateString('pt-BR'),
          motivo: fisc.irregularidadesEncontradas?.[0] || fisc.medidasAdotadas || 'Prazo de adequação vencido sem cumprimento'
        });
      }
    });

    return lista.sort((a, b) => b.diasAtraso - a.diasAtraso);
  }, [fiscalizacoes]);

  // 2. Processa Amostras de Água Não Conformes (Emergência Sanitária)
  const alertasAgua = useMemo<AlertaAguaItem[]>(() => {
    const lista: AlertaAguaItem[] = [];

    amostrasLaboratorio.forEach((amostra) => {
      const eColiPres =
        String(amostra.escherichia_coli || '').toUpperCase().includes('PRESEN') ||
        String(amostra.escherichia_coli || '').toUpperCase() === 'POSITIVO';

      const coliformesPres =
        String(amostra.coliformes_totais || '').toUpperCase().includes('PRESEN') ||
        String(amostra.coliformes_totais || '').toUpperCase() === 'POSITIVO';

      const statusNaoConf =
        amostra.status === 'NÃO CONFORME' ||
        amostra.status === 'NAO_CONFORME' ||
        amostra.status === 'INTERDITADO';

      // Análise de Cloro Residual Livre fora do padrão (VMP Portaria GM/MS 888: 0.2 a 2.0 mg/L)
      let cloroForaPadrao = false;
      let cloroValor = 0;
      if (amostra.cloro) {
        cloroValor = parseFloat(String(amostra.cloro).replace(',', '.'));
        if (!isNaN(cloroValor) && (cloroValor < 0.2 || cloroValor > 2.0)) {
          cloroForaPadrao = true;
        }
      }

      if (eColiPres) {
        lista.push({
          amostra,
          gravidade: 'CRÍTICA',
          motivo: 'Presença de Escherichia coli (Contaminação Fecal Ativa)',
          parametroAfetado: 'Microbiológico: E. coli'
        });
      } else if (coliformesPres || statusNaoConf) {
        lista.push({
          amostra,
          gravidade: 'ALTA',
          motivo: statusNaoConf ? (amostra.conclusao_laudo || 'Laudo reprovado - Água Imprópria') : 'Presença de Coliformes Totais',
          parametroAfetado: 'Microbiológico'
        });
      } else if (cloroForaPadrao) {
        lista.push({
          amostra,
          gravidade: 'MODERADA',
          motivo: `Cloro Residual fora da faixa (${cloroValor} mg/L). Padrão: 0,2 a 2,0 mg/L`,
          parametroAfetado: 'Físico-Químico: Cloro'
        });
      }
    });

    return lista;
  }, [amostrasLaboratorio]);

  const totalAlertas = alertasNotificacoes.length + alertasAgua.length;

  if (totalAlertas === 0) return null;

  return (
    <div className="bg-gradient-to-r from-red-950/90 via-slate-900 to-amber-950/90 border border-red-500/50 rounded-2xl shadow-xl overflow-hidden mb-4 animate-fadeIn text-slate-100">
      {/* Barra de Alerta Principal */}
      <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500/60 flex items-center justify-center text-red-400 shrink-0 shadow-lg">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-600 text-white tracking-wider animate-pulse">
                🚨 ALERTA SANITÁRIO PREVENTIVO
              </span>
              <span className="text-xs font-bold text-red-200">
                {totalAlertas} {totalAlertas === 1 ? 'situação requer atenção imediata' : 'situações requerem atenção imediata'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {alertasNotificacoes.length > 0 && (
                <span className="mr-3 font-semibold text-amber-300">
                  ⏳ {alertasNotificacoes.length} {alertasNotificacoes.length === 1 ? 'prazo de notificação vencido' : 'prazos de notificação vencidos'}
                </span>
              )}
              {alertasAgua.length > 0 && (
                <span className="font-semibold text-red-300">
                  💧 {alertasAgua.length} {alertasAgua.length === 1 ? 'amostra de água não conforme' : 'amostras de água não conformes'}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => setExpandido(!expandido)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider transition border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            <span>{expandido ? 'Ocultar Detalhes' : 'Ver Prazos & Amostras'}</span>
            {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Painel Expandido com Lista Detalhada */}
      {expandido && (
        <div className="border-t border-slate-800 bg-[#0d121f] p-4 sm:p-5 space-y-4">
          {/* Navegação entre Abas de Alerta */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setAbaAlerta('prazos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition flex items-center gap-2 cursor-pointer ${
                abaAlerta === 'prazos'
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Prazos de Notificação Vencidos ({alertasNotificacoes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setAbaAlerta('agua')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition flex items-center gap-2 cursor-pointer ${
                abaAlerta === 'agua'
                  ? 'bg-red-600 text-white shadow'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <Droplet className="w-3.5 h-3.5" />
              <span>Água Não Conforme ({alertasAgua.length})</span>
            </button>
          </div>

          {/* Conteúdo Aba Prazos */}
          {abaAlerta === 'prazos' && (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {alertasNotificacoes.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                  Nenhuma notificação com prazo de adequação vencido no momento.
                </div>
              ) : (
                alertasNotificacoes.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900/90 border border-amber-600/50 hover:border-amber-400 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-red-600/30 text-red-300 font-black text-[10px] uppercase border border-red-500/40">
                          ⚠️ VENCIDO HÁ {item.diasAtraso} {item.diasAtraso === 1 ? 'DIA' : 'DIAS'}
                        </span>
                        <span className="font-mono text-xs font-bold text-white">
                          #{item.fiscalizacao.protocolo}
                        </span>
                        <span className="text-slate-400 text-xs">•</span>
                        <span className="font-bold text-amber-200 text-xs">
                          {item.fiscalizacao.estabelecimento?.nomeFantasia || item.fiscalizacao.estabelecimento?.razaoSocial}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-1">
                        <strong>Motivo:</strong> {item.motivo}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                        <span>Bairro: {item.fiscalizacao.estabelecimento?.bairro || 'Centro'}</span>
                        <span>Prazo limite era: {item.dataLimite}</span>
                        <span>Fiscal: {item.fiscalizacao.fiscalNome}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectFiscalizacao) {
                            onSelectFiscalizacao(item.fiscalizacao);
                          }
                          if (onNavigate) {
                            onNavigate('fiscalizacao');
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase flex items-center gap-1 transition shadow cursor-pointer active:scale-95"
                      >
                        <span>Abrir Vistoria</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Conteúdo Aba Água Não Conforme */}
          {abaAlerta === 'agua' && (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {alertasAgua.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                  Todas as amostras analisadas atendem aos parâmetros de potabilidade da Portaria 888.
                </div>
              ) : (
                alertasAgua.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md ${
                      item.gravidade === 'CRÍTICA'
                        ? 'bg-red-950/80 border-red-500/80'
                        : item.gravidade === 'ALTA'
                        ? 'bg-amber-950/70 border-amber-500/70'
                        : 'bg-slate-900/90 border-slate-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            item.gravidade === 'CRÍTICA'
                              ? 'bg-red-600 text-white animate-pulse'
                              : 'bg-amber-600 text-white'
                          }`}
                        >
                          {item.gravidade === 'CRÍTICA' ? '🚨 RISCO GRAVE À SAÚDE' : '⚠️ NÃO CONFORME'}
                        </span>
                        <span className="font-mono text-xs font-bold text-white">
                          Amostra #{item.amostra.codigo_amostra}
                        </span>
                        <span className="text-slate-400 text-xs">•</span>
                        <span className="font-bold text-slate-200 text-xs">
                          {item.amostra.interessado || item.amostra.local_coleta}
                        </span>
                      </div>

                      <p className="text-[11px] text-red-200 font-semibold">
                        {item.motivo}
                      </p>

                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                        <span>Ponto: {item.amostra.ponto_coleta_nome || item.amostra.local_coleta}</span>
                        <span>Bairro: {item.amostra.bairro || 'Centro'}</span>
                        <span>Data Coleta: {item.amostra.data_coleta}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectAmostra) {
                            onSelectAmostra(item.amostra);
                          }
                          if (onNavigate) {
                            onNavigate('laboratorio');
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase flex items-center gap-1 transition shadow cursor-pointer active:scale-95"
                      >
                        <span>Ver Laudo no Lab</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
