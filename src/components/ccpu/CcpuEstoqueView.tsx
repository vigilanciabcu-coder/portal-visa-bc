import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Minus,
  SlidersHorizontal,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Copy,
  Check,
  History,
  Database
} from 'lucide-react';
import {
  CcpuEstoqueItem,
  CcpuEstoqueMovimentacao,
  CcpuInsumoId,
  UserProfile
} from '../../types';
import {
  fetchCcpuEstoque,
  registrarMovimentacaoEstoque,
  atualizarParametrosItemEstoque,
  getLocalCcpuEstoqueItens,
  getLocalCcpuEstoqueMovs
} from '../../lib/ccpuEstoqueService';

interface CcpuEstoqueViewProps {
  currentUser: UserProfile | null;
  onStockSummaryChange?: (criticosCount: number) => void;
}

type ModalMode = 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'PARAMETROS';

const GRUPOS_ESTOQUE_CCPU: Array<{
  id: string;
  titulo: string;
  subtitulo: string;
  emoji: string;
  badgeClass: string;
  gridClass: string;
  itemIds: CcpuInsumoId[];
}> = [
  {
    id: 'RATO',
    titulo: 'Venenos para Rato',
    subtitulo: 'Raticidas e placas adesivas (Unidade)',
    emoji: '🐀',
    badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    gridClass: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4',
    itemIds: ['PARAFINADO', 'COLANTE', 'EXTRUSADO', 'ISCA_FRESCA']
  },
  {
    id: 'BARATA',
    titulo: 'Venenos para Barata',
    subtitulo: 'Inseticidas em gel e pó (Unidade)',
    emoji: '🪳',
    badgeClass: 'bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-300 border-orange-300 dark:border-orange-700',
    gridClass: 'grid-cols-1 sm:grid-cols-2',
    itemIds: ['GEL', 'PO']
  },
  {
    id: 'MOSQUITO',
    titulo: 'Veneno para Mosquito',
    subtitulo: 'Controle larvário (Litro)',
    emoji: '🦟',
    badgeClass: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700',
    gridClass: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
    itemIds: ['LARVICIDA']
  },
  {
    id: 'OUTROS',
    titulo: 'Formiga / Outros Insumos',
    subtitulo: 'Isca granulada complementar (Unidade)',
    emoji: '🐜',
    badgeClass: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600',
    gridClass: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
    itemIds: ['GRANULADO']
  }
];

const SQL_RESUMO_COPIA = `-- Execute no SQL Editor do Supabase (arquivo supabase_ccpu_estoque.sql)
CREATE TABLE IF NOT EXISTS public.ccpu_estoque_itens (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'ISCA_RATICIDA',
    unidade TEXT NOT NULL DEFAULT 'unidade',
    quantidade_atual NUMERIC(12, 2) NOT NULL DEFAULT 0,
    estoque_minimo NUMERIC(12, 2) NOT NULL DEFAULT 10,
    lote_atual TEXT,
    validade_lote TEXT,
    observacoes TEXT,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_por TEXT
);

CREATE TABLE IF NOT EXISTS public.ccpu_estoque_movimentacoes (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES public.ccpu_estoque_itens(id) ON DELETE CASCADE,
    item_nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA', 'AJUSTE')),
    quantidade NUMERIC(12, 2) NOT NULL,
    saldo_anterior NUMERIC(12, 2) NOT NULL DEFAULT 0,
    saldo_posterior NUMERIC(12, 2) NOT NULL DEFAULT 0,
    unidade TEXT NOT NULL DEFAULT 'unidade',
    motivo TEXT NOT NULL,
    protocolo_ocorrencia TEXT,
    ocorrencia_id TEXT,
    lote TEXT,
    responsavel TEXT NOT NULL,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.ccpu_estoque_itens (id, nome, categoria, unidade, quantidade_atual, estoque_minimo)
VALUES
    ('PARAFINADO', 'Parafinado', 'ISCA_RATICIDA', 'unidade', 0, 50),
    ('COLANTE', 'Colante', 'ISCA_RATICIDA', 'unidade', 0, 30),
    ('EXTRUSADO', 'Extrusado', 'ISCA_RATICIDA', 'unidade', 0, 50),
    ('ISCA_FRESCA', 'Isca Fresca', 'ISCA_RATICIDA', 'unidade', 0, 40),
    ('GRANULADO', 'Granulado', 'INSUMO_QUIMICO', 'unidade', 0, 40),
    ('GEL', 'Gel', 'INSUMO_QUIMICO', 'unidade', 0, 20),
    ('PO', 'Pó', 'INSUMO_QUIMICO', 'unidade', 0, 20),
    ('LARVICIDA', 'Larvicida', 'LARVICIDA', 'litro', 0, 5)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ccpu_estoque_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ccpu_estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir Acesso Completo CCPU Estoque Itens" ON public.ccpu_estoque_itens;
CREATE POLICY "Permitir Acesso Completo CCPU Estoque Itens" ON public.ccpu_estoque_itens FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir Acesso Completo CCPU Estoque Movimentacoes" ON public.ccpu_estoque_movimentacoes;
CREATE POLICY "Permitir Acesso Completo CCPU Estoque Movimentacoes" ON public.ccpu_estoque_movimentacoes FOR ALL USING (true) WITH CHECK (true);`;

function formatQuantidade(valor: number, unidade: 'unidade' | 'litro'): string {
  const num = Number(valor) || 0;
  const formatted = Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
  if (unidade === 'litro') {
    return `${formatted} ${num === 1 ? 'litro' : 'litros'}`;
  }
  return `${formatted} ${num === 1 ? 'unidade' : 'unidades'}`;
}

export const CcpuEstoqueView: React.FC<CcpuEstoqueViewProps> = ({
  currentUser,
  onStockSummaryChange
}) => {
  const [itens, setItens] = useState<CcpuEstoqueItem[]>(() => getLocalCcpuEstoqueItens());
  const [movimentacoes, setMovimentacoes] = useState<CcpuEstoqueMovimentacao[]>(() => getLocalCcpuEstoqueMovs());
  const [carregando, setCarregando] = useState(false);
  const [missingTables, setMissingTables] = useState(false);
  const [sqlCopiado, setSqlCopiado] = useState(false);

  // Filtros do histórico
  const [filtroItem, setFiltroItem] = useState<string>('TODOS');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [buscaMov, setBuscaMov] = useState<string>('');

  // Modal de movimentação / configuração
  const [modalItem, setModalItem] = useState<CcpuEstoqueItem | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('ENTRADA');
  const [qtdInput, setQtdInput] = useState<string>('');
  const [motivoInput, setMotivoInput] = useState<string>('');
  const [loteInput, setLoteInput] = useState<string>('');
  const [validadeInput, setValidadeInput] = useState<string>('');
  const [minimoInput, setMinimoInput] = useState<string>('');
  const [obsInput, setObsInput] = useState<string>('');
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [feedbackAcao, setFeedbackAcao] = useState<string | null>(null);

  const nomeResponsavel = currentUser
    ? `${currentUser.nome_completo}${currentUser.matricula ? ` (Mat. ${currentUser.matricula})` : ''}`
    : 'Servidor CCPU';

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const res = await fetchCcpuEstoque();
      setItens(res.itens);
      setMovimentacoes(res.movimentacoes);
      setMissingTables(res.missingTables);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const metricas = useMemo(() => {
    const criticos = itens.filter((i) => i.quantidade_atual <= i.estoque_minimo).length;
    const zerados = itens.filter((i) => i.quantidade_atual <= 0).length;
    const entradas = movimentacoes.filter((m) => m.tipo === 'ENTRADA').length;
    const saidas = movimentacoes.filter((m) => m.tipo === 'SAIDA').length;
    return { totalItens: itens.length, criticos, zerados, entradas, saidas };
  }, [itens, movimentacoes]);

  useEffect(() => {
    if (onStockSummaryChange) {
      onStockSummaryChange(metricas.criticos);
    }
  }, [metricas.criticos, onStockSummaryChange]);

  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoes.filter((m) => {
      if (filtroItem !== 'TODOS' && m.item_id !== filtroItem) return false;
      if (filtroTipo !== 'TODOS' && m.tipo !== filtroTipo) return false;
      if (buscaMov.trim()) {
        const q = buscaMov.toLowerCase();
        const match =
          m.item_nome.toLowerCase().includes(q) ||
          m.motivo.toLowerCase().includes(q) ||
          m.responsavel.toLowerCase().includes(q) ||
          (m.protocolo_ocorrencia && m.protocolo_ocorrencia.toLowerCase().includes(q)) ||
          (m.lote && m.lote.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [movimentacoes, filtroItem, filtroTipo, buscaMov]);

  const abrirModal = (item: CcpuEstoqueItem, mode: ModalMode) => {
    setModalItem(item);
    setModalMode(mode);
    setErroForm(null);
    setLoteInput(item.lote_atual || '');
    setValidadeInput(item.validade_lote || '');
    setMinimoInput(String(item.estoque_minimo ?? 0));
    setObsInput(item.observacoes || '');

    if (mode === 'ENTRADA') {
      setQtdInput('');
      setMotivoInput('Recebimento / Reposição de Estoque CCPU');
    } else if (mode === 'SAIDA') {
      setQtdInput('');
      setMotivoInput('Retirada para ação de campo CCPU');
    } else if (mode === 'AJUSTE') {
      setQtdInput(String(item.quantidade_atual));
      setMotivoInput('Conferência / Ajuste de inventário');
    } else {
      setQtdInput(String(item.quantidade_atual));
      setMotivoInput('');
    }
  };

  const handleConfirmarModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalItem) return;
    setErroForm(null);

    if (modalMode === 'PARAMETROS') {
      const novoMin = parseFloat(minimoInput.replace(',', '.'));
      if (isNaN(novoMin) || novoMin < 0) {
        setErroForm('Informe um estoque mínimo válido (maior ou igual a zero).');
        return;
      }
      setSalvando(true);
      try {
        const res = await atualizarParametrosItemEstoque({
          itemId: modalItem.id as CcpuInsumoId,
          estoque_minimo: novoMin,
          lote_atual: loteInput,
          validade_lote: validadeInput,
          observacoes: obsInput,
          responsavel: nomeResponsavel
        });
        setItens(res.itens);
        setFeedbackAcao(`Configurações de ${modalItem.nome} atualizadas.`);
        setModalItem(null);
      } finally {
        setSalvando(false);
      }
      return;
    }

    const qtd = parseFloat((qtdInput || '').replace(',', '.'));
    if (isNaN(qtd) || (modalMode !== 'AJUSTE' && qtd <= 0) || (modalMode === 'AJUSTE' && qtd < 0)) {
      setErroForm(
        modalMode === 'AJUSTE'
          ? 'Informe um saldo válido (maior ou igual a zero).'
          : 'Informe uma quantidade maior que zero.'
      );
      return;
    }

    if (modalMode === 'SAIDA' && qtd > modalItem.quantidade_atual) {
      setErroForm(
        `Saldo insuficiente em estoque (${formatQuantidade(modalItem.quantidade_atual, modalItem.unidade)} disponível).`
      );
      return;
    }

    setSalvando(true);
    try {
      const res = await registrarMovimentacaoEstoque({
        itemId: modalItem.id,
        tipo: modalMode,
        quantidade: qtd,
        motivo: motivoInput,
        lote: loteInput,
        validadeLote: validadeInput,
        responsavel: nomeResponsavel
      });

      if (!res.ok) {
        setErroForm(res.erro || 'Não foi possível registrar a movimentação.');
        return;
      }

      setItens(res.itens);
      setMovimentacoes(res.movimentacoes);
      setFeedbackAcao(
        `${modalMode === 'ENTRADA' ? 'Entrada' : modalMode === 'SAIDA' ? 'Saída' : 'Ajuste'} registrada para ${modalItem.nome}.`
      );
      setModalItem(null);
    } finally {
      setSalvando(false);
    }
  };

  const handleCopiarSql = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(SQL_RESUMO_COPIA).then(() => {
        setSqlCopiado(true);
        setTimeout(() => setSqlCopiado(false), 3000);
      });
    }
  };

  const handleExportarEstoqueCSV = () => {
    const headers = [
      'Item',
      'Unidade',
      'Saldo Atual',
      'Estoque Minimo',
      'Situacao',
      'Lote Atual',
      'Validade',
      'Ultima Atualizacao',
      'Atualizado Por'
    ];
    const rows = itens.map((i) => {
      const situacao =
        i.quantidade_atual <= 0
          ? 'ZERADO'
          : i.quantidade_atual <= i.estoque_minimo
            ? 'ABAIXO DO MINIMO'
            : 'ADEQUADO';
      return [
        `"${i.nome}"`,
        `"${i.unidade}"`,
        i.quantidade_atual,
        i.estoque_minimo,
        `"${situacao}"`,
        `"${i.lote_atual || ''}"`,
        `"${i.validade_lote || ''}"`,
        `"${i.atualizado_em || ''}"`,
        `"${i.atualizado_por || ''}"`
      ];
    });

    const csv =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `estoque_ccpu_bc_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportarMovimentacoesCSV = () => {
    const headers = [
      'Data/Hora',
      'Item',
      'Tipo',
      'Quantidade',
      'Unidade',
      'Saldo Anterior',
      'Saldo Posterior',
      'Protocolo Ocorrencia',
      'Motivo',
      'Lote',
      'Responsavel'
    ];
    const rows = movimentacoesFiltradas.map((m) => [
      `"${m.data_hora}"`,
      `"${m.item_nome}"`,
      `"${m.tipo}"`,
      m.quantidade,
      `"${m.unidade}"`,
      m.saldo_anterior,
      m.saldo_posterior,
      `"${m.protocolo_ocorrencia || ''}"`,
      `"${m.motivo}"`,
      `"${m.lote || ''}"`,
      `"${m.responsavel}"`
    ]);

    const csv =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `movimentacoes_estoque_ccpu_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 text-left">
      {/* Banner de configuração inicial no Supabase (exibido somente se as tabelas ainda não foram criadas lá) */}
      {missingTables && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase text-amber-950 dark:text-amber-200">
                Configuração pendente no Supabase (tabelas de estoque CCPU)
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                As tabelas <strong>ccpu_estoque_itens</strong> e <strong>ccpu_estoque_movimentacoes</strong> ainda não foram criadas no seu projeto Supabase. Copie o script SQL ao lado e execute no <strong>SQL Editor</strong> do Supabase para sincronizar na nuvem.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopiarSql}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition cursor-pointer shrink-0 shadow-sm"
          >
            {sqlCopiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{sqlCopiado ? 'SQL Copiado!' : 'Copiar SQL Supabase'}</span>
          </button>
        </div>
      )}

      {feedbackAcao && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between gap-3 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackAcao}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackAcao(null)}
            className="p-1 hover:bg-emerald-200/40 rounded-lg cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Cabeçalho da aba de Estoque + KPIs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>Controle de Estoque de Iscas, Insumos & Larvicida</span>
          </h2>
          <p className="text-xs text-slate-500">
            Baixa automática ao registrar ocorrências em campo e controle de entradas, lotes e estoque mínimo no Supabase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={carregarDados}
            disabled={carregando}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            type="button"
            onClick={handleExportarEstoqueCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV Saldo</span>
          </button>
        </div>
      </div>

      {/* Resumo Numérico */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Itens Controlados
          </span>
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{metricas.totalItens}</span>
          <span className="text-[11px] text-slate-500 block">7 em unidade · 1 em litro</span>
        </div>

        <div
          className={`p-4 rounded-2xl border shadow-sm ${
            metricas.criticos > 0
              ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-700'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Abaixo do Mínimo / Zerados
          </span>
          <span
            className={`text-2xl font-black ${
              metricas.criticos > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {metricas.criticos}
          </span>
          <span className="text-[11px] text-slate-500 block">{metricas.zerados} sem saldo</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Entradas Registradas
          </span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{metricas.entradas}</span>
          <span className="text-[11px] text-slate-500 block">reposições e lotes</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Saídas / Baixas
          </span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{metricas.saidas}</span>
          <span className="text-[11px] text-slate-500 block">uso em campo e retiradas</span>
        </div>
      </div>

      {/* Grade dos Itens de Estoque Agrupados por Vetor */}
      <div className="space-y-5">
        {GRUPOS_ESTOQUE_CCPU.map((grupo) => {
          const itensGrupo = grupo.itemIds
            .map((id) => itens.find((item) => item.id === id))
            .filter((item): item is CcpuEstoqueItem => Boolean(item));

          if (itensGrupo.length === 0) return null;

          return (
            <div
              key={grupo.id}
              className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wide border ${grupo.badgeClass}`}
                  >
                    <span>{grupo.emoji}</span>
                    <span>{grupo.titulo}</span>
                  </span>
                  <span className="text-xs text-slate-500">{grupo.subtitulo}</span>
                </div>
                <span className="text-[11px] font-bold text-slate-500">
                  {itensGrupo.length} {itensGrupo.length === 1 ? 'item' : 'itens'}
                </span>
              </div>

              <div className={`grid ${grupo.gridClass} gap-3.5`}>
                {itensGrupo.map((item) => {
                  const isLitro = item.unidade === 'litro';
                  const zerado = item.quantidade_atual <= 0;
                  const critico = item.quantidade_atual > 0 && item.quantidade_atual <= item.estoque_minimo;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm flex flex-col justify-between gap-3 transition ${
                        zerado
                          ? 'border-rose-300 dark:border-rose-700'
                          : critico
                            ? 'border-amber-300 dark:border-amber-600'
                            : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-slate-100">
                              {item.nome}
                            </h3>
                            <span
                              className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                isLitro
                                  ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              Medido em {isLitro ? 'Litro (L)' : 'Unidade (un)'}
                            </span>
                          </div>

                          {zerado ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Zerado
                            </span>
                          ) : critico ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Baixo
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              OK
                            </span>
                          )}
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">Saldo Disponível</span>
                          <div className="flex items-baseline justify-between gap-2 mt-0.5">
                            <span className="text-xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                              {formatQuantidade(item.quantidade_atual, item.unidade)}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              Mín: {item.estoque_minimo} {isLitro ? 'L' : 'un'}
                            </span>
                          </div>
                        </div>

                        {(item.lote_atual || item.validade_lote) && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between gap-2">
                            <span className="truncate">
                              {item.lote_atual ? `Lote: ${item.lote_atual}` : ''}
                            </span>
                            <span className="shrink-0 font-mono">
                              {item.validade_lote ? `Val: ${item.validade_lote}` : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => abrirModal(item, 'ENTRADA')}
                          className="flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase transition cursor-pointer active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Entrada</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => abrirModal(item, 'SAIDA')}
                          className="flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold uppercase transition cursor-pointer active:scale-95"
                        >
                          <Minus className="w-3.5 h-3.5" />
                          <span>Saída</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => abrirModal(item, 'AJUSTE')}
                          title="Ajustar saldo ou configurar estoque mínimo/lote"
                          className="flex items-center justify-center gap-1 px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold uppercase transition cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Ajuste</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Histórico de Movimentações */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="text-sm font-black uppercase text-slate-900 dark:text-slate-100">
                Histórico de Movimentações ({movimentacoesFiltradas.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Registro automático de baixas em campo e movimentações manuais
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filtroItem}
              onChange={(e) => setFiltroItem(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            >
              <option value="TODOS">Todos os Itens</option>
              {itens.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </select>

            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            >
              <option value="TODOS">Todos os Tipos</option>
              <option value="ENTRADA">Entradas</option>
              <option value="SAIDA">Saídas</option>
              <option value="AJUSTE">Ajustes</option>
            </select>

            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2" />
              <input
                type="text"
                value={buscaMov}
                onChange={(e) => setBuscaMov(e.target.value)}
                placeholder="Buscar protocolo, motivo..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleExportarMovimentacoesCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Histórico</span>
            </button>
          </div>
        </div>

        {movimentacoesFiltradas.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            Nenhuma movimentação registrada ainda. Utilize <strong>+ Entrada</strong> nos itens acima para lançar o saldo inicial ou registre ocorrências em campo com uso de insumos.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Item</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Qtd</th>
                  <th className="p-3">Saldo (Ant → Atual)</th>
                  <th className="p-3">Motivo / Protocolo</th>
                  <th className="p-3">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {movimentacoesFiltradas.map((m) => {
                  const dataStr = new Date(m.data_hora).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  const sigla = m.unidade === 'litro' ? 'L' : 'un';

                  return (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {dataStr}
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{m.item_nome}</td>
                      <td className="p-3">
                        {m.tipo === 'ENTRADA' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <ArrowUpRight className="w-3 h-3" /> Entrada
                          </span>
                        ) : m.tipo === 'SAIDA' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            <ArrowDownRight className="w-3 h-3" /> Saída
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                            Ajuste
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-black tabular-nums whitespace-nowrap">
                        {m.tipo === 'ENTRADA' ? '+' : m.tipo === 'SAIDA' ? '-' : ''}
                        {m.quantidade} {sigla}
                      </td>
                      <td className="p-3 font-mono text-[11px] whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {m.saldo_anterior} {sigla} → <strong>{m.saldo_posterior} {sigla}</strong>
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        <div className="space-y-0.5">
                          {m.protocolo_ocorrencia && (
                            <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px] font-bold">
                              {m.protocolo_ocorrencia}
                            </span>
                          )}
                          <span>{m.motivo}</span>
                          {m.lote && <span className="block text-[10px] text-slate-500">Lote: {m.lote}</span>}
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{m.responsavel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Entrada / Saída / Ajuste / Parâmetros */}
      {modalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide">
                  {modalItem.nome} •{' '}
                  {modalMode === 'ENTRADA'
                    ? 'Registrar Entrada'
                    : modalMode === 'SAIDA'
                      ? 'Registrar Saída'
                      : modalMode === 'AJUSTE'
                        ? 'Ajustar Saldo'
                        : 'Configurar Mínimo e Lote'}
                </h3>
                <p className="text-[11px] text-slate-300">
                  Saldo atual: {formatQuantidade(modalItem.quantidade_atual, modalItem.unidade)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalItem(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarModal} className="p-6 space-y-4 text-left">
              {/* Abas rápidas entre Ajuste de Saldo e Parâmetros */}
              {(modalMode === 'AJUSTE' || modalMode === 'PARAMETROS') && (
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalMode('AJUSTE')}
                    className={`py-2 rounded-lg text-xs font-bold uppercase cursor-pointer transition ${
                      modalMode === 'AJUSTE'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    Ajustar Saldo Atual
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode('PARAMETROS')}
                    className={`py-2 rounded-lg text-xs font-bold uppercase cursor-pointer transition ${
                      modalMode === 'PARAMETROS'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    Mínimo & Lote
                  </button>
                </div>
              )}

              {erroForm && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 text-xs font-bold text-rose-700 dark:text-rose-300">
                  {erroForm}
                </div>
              )}

              {modalMode === 'PARAMETROS' ? (
                <>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                      Estoque Mínimo para Alerta ({modalItem.unidade === 'litro' ? 'Litros' : 'Unidades'}) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step={modalItem.unidade === 'litro' ? '0.1' : '1'}
                      value={minimoInput}
                      onChange={(e) => setMinimoInput(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                        Lote Atual
                      </label>
                      <input
                        type="text"
                        value={loteInput}
                        onChange={(e) => setLoteInput(e.target.value)}
                        placeholder="Ex: LOTE-2026-A"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                        Validade do Lote
                      </label>
                      <input
                        type="date"
                        value={validadeInput}
                        onChange={(e) => setValidadeInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                      Observações do Item
                    </label>
                    <input
                      type="text"
                      value={obsInput}
                      onChange={(e) => setObsInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                      {modalMode === 'AJUSTE'
                        ? `Novo Saldo Conferido (${modalItem.unidade === 'litro' ? 'Litros' : 'Unidades'}) *`
                        : `Quantidade (${modalItem.unidade === 'litro' ? 'Litros' : 'Unidades'}) *`}
                    </label>
                    <input
                      type="number"
                      min={modalMode === 'AJUSTE' ? '0' : modalItem.unidade === 'litro' ? '0.1' : '1'}
                      step={modalItem.unidade === 'litro' ? '0.1' : '1'}
                      value={qtdInput}
                      onChange={(e) => setQtdInput(e.target.value)}
                      placeholder="0"
                      required
                      autoFocus
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-black outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                      Motivo / Origem *
                    </label>
                    <input
                      type="text"
                      value={motivoInput}
                      onChange={(e) => setMotivoInput(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
                    />
                  </div>

                  {modalMode === 'ENTRADA' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                          Lote (Opcional)
                        </label>
                        <input
                          type="text"
                          value={loteInput}
                          onChange={(e) => setLoteInput(e.target.value)}
                          placeholder="Ex: LOTE-2026-01"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                          Validade (Opcional)
                        </label>
                        <input
                          type="date"
                          value={validadeInput}
                          onChange={(e) => setValidadeInput(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer disabled:opacity-60"
                >
                  {salvando ? 'Salvando...' : 'Confirmar e Salvar no Supabase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
