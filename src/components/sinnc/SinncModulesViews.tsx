import React, { useState, useMemo } from 'react';
import {
  ProcessoItem,
  FiscalizacaoItem,
  AmostraLaboratorioItem,
  FeiranteItem,
  EscalaItem,
  UserProfile,
} from '../../types';
import {
  SinncDashboardMetrics,
  SinncWorkspaceTabId,
  SINNC_MODULE_LABELS,
  diffDaysFromToday,
  formatShortBrDate,
} from './sinncTypes';
import {
  Search,
  Download,
  Printer,
  CheckCircle2,
  FileText,
  ArrowUpRight,
} from 'lucide-react';

interface SinncModulesViewsProps {
  activeTab: Exclude<SinncWorkspaceTabId, 'painel'>;
  currentUser: UserProfile | null;
  metrics: SinncDashboardMetrics;
  processos: ProcessoItem[];
  fiscalizacoes: FiscalizacaoItem[];
  amostrasLaboratorio: AmostraLaboratorioItem[];
  feiras: FeiranteItem[];
  escala: EscalaItem[];
  users: UserProfile[];
  onSelectProcesso: (proc: ProcessoItem) => void;
  onNavigateClassic: (view: string) => void;
  compactDensity: boolean;
  setCompactDensity: (v: boolean) => void;
}

export const SinncModulesViews: React.FC<SinncModulesViewsProps> = ({
  activeTab,
  currentUser,
  metrics,
  processos,
  fiscalizacoes,
  amostrasLaboratorio,
  feiras,
  escala,
  users,
  onSelectProcesso,
  onNavigateClassic,
  compactDensity,
  setCompactDensity,
}) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [certidaoQuery, setCertidaoQuery] = useState('');
  const [selectedFisc, setSelectedFisc] = useState<FiscalizacaoItem | null>(null);

  const rowPad = compactDensity ? 'py-2 px-3' : 'py-2.5 px-3.5';

  // Normaliza termos de busca
  const q = query.trim().toLowerCase();

  // Lista consolidada de empresas para Cadastros
  const empresasConsolidadas = useMemo(() => {
    const map = new Map<
      string,
      {
        chave: string;
        cnpjCpf: string;
        razao: string;
        bairro: string;
        setor: string;
        situacao: string;
        procRef?: ProcessoItem;
      }
    >();

    processos.forEach((p) => {
      const key = (p.cnpj_cpf || p.razao_social || p.id).trim().toLowerCase();
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, {
          chave: key,
          cnpjCpf: p.cnpj_cpf || 'Não informado',
          razao: p.razao_social || p.nome_fantasia || 'Sem razão social',
          bairro: p.bairro || '—',
          setor: p.setor || 'Geral',
          situacao: p.status,
          procRef: p,
        });
      }
    });

    metrics.pastasLocais.forEach((pt) => {
      const key = (pt.cnpj_cpf || pt.razao_social || pt.id).trim().toLowerCase();
      if (!key || map.has(key)) return;
      map.set(key, {
        chave: key,
        cnpjCpf: pt.cnpj_cpf || '—',
        razao: pt.razao_social || 'Sem razão social',
        bairro: '—',
        setor: pt.setor || 'Pasta VISA',
        situacao: pt.alvara_atualizado || pt.status_rf || 'Ativa',
      });
    });

    return Array.from(map.values());
  }, [processos, metrics.pastasLocais]);

  // Exportação CSV real para Relatórios
  const handleExportCsv = () => {
    const header = ['Protocolo', 'Razao Social', 'CNPJ/CPF', 'Bairro', 'Setor', 'Status', 'Fiscal', 'Prazo'];
    const rows = processos.map((p) => [
      p.num_processo || p.id,
      (p.razao_social || '').replace(/;/g, ','),
      p.cnpj_cpf || '',
      p.bairro || '',
      p.setor || '',
      p.status || '',
      p.fiscal_responsavel || '',
      p.prazo_vistoria || p.validade || '',
    ]);
    const csv = [header.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-visa-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Cabeçalho padrão minimalista de módulo
  const renderSectionHeader = (subtitle: string, rightAction?: React.ReactNode) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
      <div>
        <h1 className="text-[17px] font-semibold text-slate-800 tracking-tight">
          {SINNC_MODULE_LABELS[activeTab]}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      {rightAction && <div className="flex items-center gap-2 shrink-0">{rightAction}</div>}
    </div>
  );

  const renderSearchBar = (placeholder: string, filters?: { id: string; label: string }[]) => (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div className="relative flex-1 max-w-md">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="!pl-8 !py-1.5 !px-3 !text-xs !font-normal !rounded-md !border-slate-300 !bg-white"
        />
      </div>

      {filters && filters.length > 0 && (
        <div className="flex items-center gap-1 p-1 bg-[#f4f6f9] border border-slate-200 rounded-md overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-white text-slate-900 border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // 1. TAREFAS / PROCESSOS / LICENCIAMENTO / ATENDIMENTO
  if (
    activeTab === 'tarefas' ||
    activeTab === 'processos' ||
    activeTab === 'licenciamento' ||
    activeTab === 'atendimento'
  ) {
    const baseList =
      activeTab === 'tarefas'
        ? metrics.minhasTarefas
        : activeTab === 'licenciamento'
        ? metrics.licenciamentosAndamento
        : activeTab === 'atendimento'
        ? processos.filter(
            (p) =>
              p.origem_solicitacao === 'PORTAL_MUNICIPE' ||
              (p.motivacao || '').toUpperCase().includes('DENÚNCIA') ||
              (p.setor || '').toUpperCase().includes('OUVIDORIA')
          )
        : processos;

    const filtered = baseList.filter((p) => {
      if (statusFilter === 'ATRASADOS') {
        const diff = diffDaysFromToday(p.prazo_vistoria || p.venc_1doc || p.agendado_para);
        if (diff === null || diff >= 0) return false;
      } else if (statusFilter !== 'TODOS' && p.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        (p.num_processo || '').toLowerCase().includes(q) ||
        (p.razao_social || '').toLowerCase().includes(q) ||
        (p.cnpj_cpf || '').toLowerCase().includes(q) ||
        (p.assunto || '').toLowerCase().includes(q) ||
        (p.fiscal_responsavel || '').toLowerCase().includes(q)
      );
    });

    const subtitleMap: Record<string, string> = {
      tarefas: 'Pendências sob responsabilidade técnica e fila operacional',
      processos: 'Processos sanitários, administrativos e pareceres em tramitação',
      licenciamento: 'Pedidos de alvará inicial, renovação e análises documentais',
      atendimento: 'Solicitações recebidas pelo portal do munícipe e ouvidoria',
    };

    return (
      <div className="space-y-4 text-left">
        {renderSectionHeader(subtitleMap[activeTab])}
        {renderSearchBar('Filtrar por protocolo, razão social, CNPJ ou fiscal...', [
          { id: 'TODOS', label: 'Todos' },
          { id: 'ATRASADOS', label: 'Prazo vencido' },
          { id: 'EM ANÁLISE', label: 'Em análise' },
          { id: 'PENDENTE DOCS', label: 'Exigências' },
          { id: 'DEFERIDO', label: 'Deferidos' },
        ])}

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f4f6f9] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-3.5">Protocolo</th>
                  <th className="py-2.5 px-3.5">Estabelecimento / Requerente</th>
                  <th className="py-2.5 px-3.5">Assunto</th>
                  <th className="py-2.5 px-3.5">Responsável</th>
                  <th className="py-2.5 px-3.5">Situação</th>
                  <th className="py-2.5 px-3.5 text-right">Prazo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-xs">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Nenhum registro encontrado para os critérios selecionados.
                    </td>
                  </tr>
                ) : (
                  filtered.slice(0, 80).map((proc) => {
                    const prazoStr = proc.prazo_vistoria || proc.venc_1doc || proc.agendado_para;
                    const diff = diffDaysFromToday(prazoStr);
                    const isOverdue = diff !== null && diff < 0 && proc.status !== 'DEFERIDO';
                    return (
                      <tr
                        key={proc.id}
                        onClick={() => onSelectProcesso(proc)}
                        className="hover:bg-[#f8fafc] transition-colors cursor-pointer"
                      >
                        <td className={`${rowPad} font-mono text-slate-700 tabular-nums whitespace-nowrap`}>
                          {proc.num_processo || proc.id}
                        </td>
                        <td className={`${rowPad} text-slate-800 font-medium max-w-[260px] truncate`}>
                          {proc.razao_social || proc.nome_fantasia || 'Não informado'}
                        </td>
                        <td className={`${rowPad} text-slate-600 max-w-[240px] truncate`}>
                          {proc.assunto || 'Análise sanitária'}
                        </td>
                        <td className={`${rowPad} text-slate-600 whitespace-nowrap`}>
                          {proc.fiscal_responsavel || 'Não distribuído'}
                        </td>
                        <td className={`${rowPad} whitespace-nowrap`}>
                          <span className="text-slate-700 font-medium">{proc.status}</span>
                        </td>
                        <td
                          className={`${rowPad} text-right font-mono tabular-nums whitespace-nowrap ${
                            isOverdue ? 'text-[#a13c46] font-medium' : 'text-slate-500'
                          }`}
                        >
                          {formatShortBrDate(prazoStr)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 2. BUSCAR (Busca Global Unificada)
  if (activeTab === 'buscar') {
    const procHits = q
      ? processos.filter(
          (p) =>
            (p.num_processo || '').toLowerCase().includes(q) ||
            (p.razao_social || '').toLowerCase().includes(q) ||
            (p.cnpj_cpf || '').toLowerCase().includes(q) ||
            (p.assunto || '').toLowerCase().includes(q)
        )
      : processos.slice(0, 8);

    const fiscHits = q
      ? fiscalizacoes.filter(
          (f) =>
            (f.protocolo || '').toLowerCase().includes(q) ||
            (f.estabelecimento?.razaoSocial || '').toLowerCase().includes(q) ||
            (f.estabelecimento?.cnpjCpf || '').toLowerCase().includes(q)
        )
      : fiscalizacoes.slice(0, 6);

    return (
      <div className="space-y-5 text-left">
        {renderSectionHeader('Pesquisa instantânea em processos, estabelecimentos e inspeções')}
        {renderSearchBar('Digite protocolo, CNPJ, razão social, bairro ou assunto...')}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5">
            <h2 className="text-xs font-semibold text-slate-700 tabular-nums">
              Processos encontrados ({procHits.length})
            </h2>
            <div className="divide-y divide-slate-200/70">
              {procHits.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">Nenhum processo correspondente.</p>
              ) : (
                procHits.slice(0, 12).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectProcesso(p)}
                    className="w-full py-2 text-left hover:bg-[#f8fafc] px-1.5 -mx-1.5 rounded transition-colors flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate">
                        {p.razao_social || p.nome_fantasia}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums truncate">
                        {p.num_processo} · {p.cnpj_cpf || 'S/ CNPJ'} · {p.status}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5">
            <h2 className="text-xs font-semibold text-slate-700 tabular-nums">
              Inspeções sanitárias ({fiscHits.length})
            </h2>
            <div className="divide-y divide-slate-200/70">
              {fiscHits.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">Nenhuma inspeção correspondente.</p>
              ) : (
                fiscHits.slice(0, 12).map((f) => (
                  <div key={f.id} className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate">
                        {f.estabelecimento?.razaoSocial || f.estabelecimento?.nomeFantasia}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums truncate">
                        {f.protocolo} · {f.fiscalNome} · {f.status}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. AGENDA
  if (activeTab === 'agenda') {
    const vistoriasAgendadas = processos.filter(
      (p) => p.status === 'VISTORIA AGENDADA' || Boolean(p.agendado_para)
    );
    return (
      <div className="space-y-4 text-left">
        {renderSectionHeader('Agenda de inspeções programadas e escalas de plantão')}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 text-xs font-semibold text-slate-700 tabular-nums">
              Inspeções agendadas ({vistoriasAgendadas.length})
            </div>
            <div className="divide-y divide-slate-200/70">
              {vistoriasAgendadas.length === 0 ? (
                <p className="text-xs text-slate-400 p-6 text-center">
                  Nenhuma vistoria com data agendada no momento.
                </p>
              ) : (
                vistoriasAgendadas.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectProcesso(p)}
                    className="w-full px-4 py-2.5 hover:bg-[#f8fafc] flex items-center justify-between gap-3 text-left text-xs cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 truncate">{p.razao_social}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {p.endereco} {p.bairro ? `· ${p.bairro}` : ''} · {p.fiscal_responsavel || 'Equipe'}
                      </div>
                    </div>
                    <span className="font-mono text-slate-700 tabular-nums shrink-0">
                      {formatShortBrDate(p.agendado_para || p.prazo_vistoria)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 text-xs font-semibold text-slate-700 tabular-nums">
              Escalas e eventos registrados ({escala.length})
            </div>
            <div className="divide-y divide-slate-200/70">
              {escala.slice(0, 15).map((item) => (
                <div key={item.id} className="px-4 py-2.5 flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 truncate">{item.servidores}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {item.tipo} {item.descricao ? `· ${item.descricao}` : ''}
                    </div>
                  </div>
                  <span className="font-mono text-slate-600 tabular-nums shrink-0">
                    {formatShortBrDate(item.data)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. CADASTROS
  if (activeTab === 'cadastros') {
    const filtradas = empresasConsolidadas.filter((emp) => {
      if (!q) return true;
      return (
        emp.razao.toLowerCase().includes(q) ||
        emp.cnpjCpf.toLowerCase().includes(q) ||
        emp.bairro.toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-4 text-left">
        {renderSectionHeader(`Diretório de estabelecimentos e responsáveis (${empresasConsolidadas.length})`)}
        {renderSearchBar('Buscar por razão social, CNPJ/CPF ou bairro...')}

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f4f6f9] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3.5">CNPJ / CPF</th>
                <th className="py-2.5 px-3.5">Razão Social</th>
                <th className="py-2.5 px-3.5">Bairro</th>
                <th className="py-2.5 px-3.5">Setor</th>
                <th className="py-2.5 px-3.5 text-right">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs">
              {filtradas.slice(0, 80).map((emp) => (
                <tr
                  key={emp.chave}
                  onClick={() => emp.procRef && onSelectProcesso(emp.procRef)}
                  className={`hover:bg-[#f8fafc] transition-colors ${emp.procRef ? 'cursor-pointer' : ''}`}
                >
                  <td className={`${rowPad} font-mono text-slate-600 tabular-nums whitespace-nowrap`}>
                    {emp.cnpjCpf}
                  </td>
                  <td className={`${rowPad} font-medium text-slate-800`}>{emp.razao}</td>
                  <td className={`${rowPad} text-slate-600`}>{emp.bairro}</td>
                  <td className={`${rowPad} text-slate-600`}>{emp.setor}</td>
                  <td className={`${rowPad} text-right text-slate-700 font-medium whitespace-nowrap`}>
                    {emp.situacao}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 5. FISCALIZAÇÃO
  if (activeTab === 'fiscalizacao') {
    const filtradas = fiscalizacoes.filter((f) => {
      if (statusFilter !== 'TODOS' && f.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (f.protocolo || '').toLowerCase().includes(q) ||
        (f.estabelecimento?.razaoSocial || '').toLowerCase().includes(q) ||
        (f.fiscalNome || '').toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-4 text-left">
        {renderSectionHeader(
          'Histórico de vistorias in loco, autos lavrados e interdições',
          <button
            type="button"
            onClick={() => onNavigateClassic('fiscalizacao')}
            className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <span>Abrir módulo de vistoria</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
        {renderSearchBar('Filtrar por protocolo, estabelecimento ou fiscal...', [
          { id: 'TODOS', label: 'Todas' },
          { id: 'CONCLUIDA', label: 'Concluída' },
          { id: 'NOTIFICADO', label: 'Notificado' },
          { id: 'INTERDITADO', label: 'Interditado' },
          { id: 'EM_ANDAMENTO', label: 'Em andamento' },
        ])}

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f4f6f9] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3.5">Protocolo</th>
                <th className="py-2.5 px-3.5">Estabelecimento</th>
                <th className="py-2.5 px-3.5">Tipo / Risco</th>
                <th className="py-2.5 px-3.5">Fiscal</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5 text-right">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs">
              {filtradas.slice(0, 60).map((f) => (
                <tr
                  key={f.id}
                  onClick={() => setSelectedFisc(f)}
                  className="hover:bg-[#f8fafc] transition-colors cursor-pointer"
                >
                  <td className={`${rowPad} font-mono text-slate-700 tabular-nums whitespace-nowrap`}>
                    {f.protocolo}
                  </td>
                  <td className={`${rowPad} font-medium text-slate-800`}>
                    {f.estabelecimento?.razaoSocial || f.estabelecimento?.nomeFantasia}
                  </td>
                  <td className={`${rowPad} text-slate-600`}>
                    {f.tipoVistoria} · {f.risco}
                  </td>
                  <td className={`${rowPad} text-slate-600`}>{f.fiscalNome}</td>
                  <td
                    className={`${rowPad} font-medium whitespace-nowrap ${
                      f.status === 'INTERDITADO' ? 'text-[#a13c46]' : 'text-slate-700'
                    }`}
                  >
                    {f.status}
                  </td>
                  <td className={`${rowPad} text-right font-mono text-slate-500 tabular-nums whitespace-nowrap`}>
                    {formatShortBrDate(f.dataHora)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedFisc && (
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-800">
                Detalhe da inspeção {selectedFisc.protocolo} — {selectedFisc.estabelecimento?.razaoSocial}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedFisc(null)}
                className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Fechar
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Medidas adotadas: {selectedFisc.medidasAdotadas || '—'} · Observações:{' '}
              {selectedFisc.observacoesFiscais || '—'}
            </p>
          </div>
        )}
      </div>
    );
  }

  // 6. TEMPORADA E EVENTOS
  if (activeTab === 'temporada') {
    const filtrados = feiras.filter((f) => {
      if (!q) return true;
      return (
        (f.nome_pf || '').toLowerCase().includes(q) ||
        (f.feira || '').toLowerCase().includes(q) ||
        (f.produtos || '').toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-4 text-left">
        {renderSectionHeader('Licenciamento temporário de feiras livres, ambulantes e eventos sazonais')}
        {renderSearchBar('Filtrar por permissionário, feira ou produto...')}

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f4f6f9] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3.5">Protocolo</th>
                <th className="py-2.5 px-3.5">Permissionário / Razão</th>
                <th className="py-2.5 px-3.5">Feira / Evento</th>
                <th className="py-2.5 px-3.5">Produtos</th>
                <th className="py-2.5 px-3.5">Alvará</th>
                <th className="py-2.5 px-3.5 text-right">Validade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs">
              {filtrados.slice(0, 60).map((f) => (
                <tr key={f.id} className="hover:bg-[#f8fafc] transition-colors">
                  <td className={`${rowPad} font-mono text-slate-600 tabular-nums`}>{f.num_prot || '—'}</td>
                  <td className={`${rowPad} font-medium text-slate-800`}>{f.razao || f.nome_pf}</td>
                  <td className={`${rowPad} text-slate-600`}>{f.feira}</td>
                  <td className={`${rowPad} text-slate-600 max-w-[220px] truncate`}>{f.produtos}</td>
                  <td className={`${rowPad} font-medium text-slate-700`}>{f.alvara || 'EM ANDAMENTO'}</td>
                  <td className={`${rowPad} text-right font-mono text-slate-500 tabular-nums`}>
                    {formatShortBrDate(f.validade)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 7. CONSULTA DE ALVARÁ & CERTIDÕES E DECLARAÇÕES
  if (activeTab === 'consulta_alvara' || activeTab === 'certidoes') {
    const cleanQ = certidaoQuery.trim().toLowerCase();
    const matchedAlvaras = metrics.alvarasLocais.filter(
      (a) =>
        !cleanQ ||
        (a.cnpj_cpf || '').toLowerCase().includes(cleanQ) ||
        (a.razao_social || '').toLowerCase().includes(cleanQ) ||
        (a.numero_alvara || '').toLowerCase().includes(cleanQ)
    );
    const matchedProcs = processos.filter(
      (p) =>
        p.status === 'DEFERIDO' &&
        (!cleanQ ||
          (p.cnpj_cpf || '').toLowerCase().includes(cleanQ) ||
          (p.razao_social || '').toLowerCase().includes(cleanQ) ||
          (p.num_processo || '').toLowerCase().includes(cleanQ))
    );

    return (
      <div className="space-y-5 text-left">
        {renderSectionHeader(
          activeTab === 'certidoes'
            ? 'Verificação de regularidade sanitária e emissão de certidão de situação'
            : 'Consulta direta de alvarás sanitários emitidos e vigentes',
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir consulta</span>
          </button>
        )}

        <div className="relative max-w-lg">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={certidaoQuery}
            onChange={(e) => setCertidaoQuery(e.target.value)}
            placeholder="Informe CNPJ, CPF, razão social ou número do alvará..."
            className="!pl-8 !py-2 !px-3 !text-xs !font-normal !rounded-md !border-slate-300 !bg-white"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
          {matchedAlvaras.length === 0 && matchedProcs.length === 0 ? (
            <p className="text-xs text-slate-500 p-6 text-center">
              Nenhum alvará ou processo deferido localizado para este filtro.
            </p>
          ) : (
            <>
              {matchedAlvaras.slice(0, 20).map((alv) => (
                <div key={alv.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{alv.razao_social}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                      Alvará {alv.numero_alvara} · CNPJ/CPF {alv.cnpj_cpf} · {alv.setor}
                    </div>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <div className="font-medium text-slate-800">{alv.status}</div>
                    <div className="text-[11px] text-slate-500">Validade: {formatShortBrDate(alv.validade)}</div>
                  </div>
                </div>
              ))}
              {matchedProcs.slice(0, 20).map((proc) => (
                <button
                  key={proc.id}
                  type="button"
                  onClick={() => onSelectProcesso(proc)}
                  className="w-full p-4 hover:bg-[#f8fafc] flex items-center justify-between gap-4 text-xs text-left cursor-pointer"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#3b6d96] shrink-0" />
                      <span className="truncate">{proc.razao_social}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                      Proc. {proc.num_processo} · CNPJ/CPF {proc.cnpj_cpf || '—'} · {proc.assunto}
                    </div>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <div className="font-medium text-emerald-700">Deferido</div>
                    <div className="text-[11px] text-slate-500">
                      Validade: {formatShortBrDate(proc.venc_licenca || proc.validade)}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    );
  }

  // 8. PROGRAMAS (Laboratório & CCPU Zoonoses)
  if (activeTab === 'programas') {
    return (
      <div className="space-y-5 text-left">
        {renderSectionHeader('Programas de monitoramento ambiental, água e controle de pragas urbanas')}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 tabular-nums">
                Laboratório de Água ({amostrasLaboratorio.length})
              </span>
              <button
                type="button"
                onClick={() => onNavigateClassic('laboratorio')}
                className="text-[11px] font-medium text-[#3b6d96] hover:underline cursor-pointer"
              >
                Abrir laboratório
              </button>
            </div>
            <div className="divide-y divide-slate-200/70">
              {amostrasLaboratorio.slice(0, 10).map((am) => (
                <div key={am.id} className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 truncate">
                      Amostra {am.codigo_amostra} · {am.local_coleta}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {am.bairro} · {am.fiscal_coletor}
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-slate-700 shrink-0">{am.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f4f6f9] border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 tabular-nums">
                CCPU · Zoonoses e Pragas ({metrics.ccpuLocais.length})
              </span>
              <button
                type="button"
                onClick={() => onNavigateClassic('ccpu')}
                className="text-[11px] font-medium text-[#3b6d96] hover:underline cursor-pointer"
              >
                Abrir CCPU completo
              </button>
            </div>
            <div className="divide-y divide-slate-200/70">
              {metrics.ccpuLocais.length === 0 ? (
                <p className="text-xs text-slate-400 p-6 text-center">
                  Nenhuma ocorrência CCPU registrada localmente.
                </p>
              ) : (
                metrics.ccpuLocais.slice(0, 10).map((cc) => (
                  <div key={cc.id} className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 truncate">
                        {cc.subtipoEspecie || cc.tipoPraga} · {cc.bairro}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums truncate">
                        {cc.protocolo} · {cc.temperatura}°C
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-slate-700 shrink-0">
                      {cc.statusOcorrencia}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 9. RELATÓRIOS
  if (activeTab === 'relatorios') {
    const porSetor = new Map<string, number>();
    processos.forEach((p) => {
      const s = p.setor || 'Geral';
      porSetor.set(s, (porSetor.get(s) || 0) + 1);
    });

    return (
      <div className="space-y-5 text-left">
        {renderSectionHeader(
          'Consolidação quantitativa por setor e exportação de dados',
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 rounded-md bg-[#3b6d96] hover:bg-[#315b7e] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        )}

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f4f6f9] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-4">Setor / Área Técnica</th>
                <th className="py-2.5 px-4 text-right">Processos vinculados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs">
              {Array.from(porSetor.entries()).map(([setor, total]) => (
                <tr key={setor} className="hover:bg-[#f8fafc]">
                  <td className="py-2.5 px-4 font-medium text-slate-800">{setor}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">{total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 10. GESTÃO DA EQUIPE
  if (activeTab === 'gestao') {
    const servidores = users.filter((u) => !u.tipo_usuario || u.tipo_usuario === 'SERVIDOR');
    return (
      <div className="space-y-4 text-left">
        {renderSectionHeader('Distribuição de carga técnica por profissional')}

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f4f6f9] border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3.5">Profissional</th>
                <th className="py-2.5 px-3.5">Cargo</th>
                <th className="py-2.5 px-3.5">Matrícula</th>
                <th className="py-2.5 px-3.5 text-right">Processos atribuídos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs">
              {servidores.map((u) => {
                const count = processos.filter((p) =>
                  (p.fiscal_responsavel || '').toLowerCase().includes(u.nome_completo.toLowerCase().split(' ')[0])
                ).length;
                return (
                  <tr key={u.id} className="hover:bg-[#f8fafc]">
                    <td className={`${rowPad} font-medium text-slate-800`}>{u.nome_completo}</td>
                    <td className={`${rowPad} text-slate-600`}>{u.cargo}</td>
                    <td className={`${rowPad} font-mono text-slate-500 tabular-nums`}>{u.matricula || '—'}</td>
                    <td className={`${rowPad} text-right font-mono tabular-nums text-slate-700`}>{count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 11. CONFIGURAÇÕES
  return (
    <div className="space-y-5 text-left max-w-2xl">
      {renderSectionHeader('Preferências do painel minimalista e dados da sessão')}

      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200 text-xs">
        <div className="p-4 flex items-center justify-between gap-4">
          <div>
            <div className="font-medium text-slate-800">Densidade das tabelas</div>
            <div className="text-[11px] text-slate-500">
              Ajuste o espaçamento vertical das listas operacionais
            </div>
          </div>
          <div className="flex items-center gap-1 p-1 bg-[#f4f6f9] border border-slate-200 rounded-md">
            <button
              type="button"
              onClick={() => setCompactDensity(false)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer ${
                !compactDensity ? 'bg-white text-slate-900 border border-slate-200' : 'text-slate-600'
              }`}
            >
              Confortável
            </button>
            <button
              type="button"
              onClick={() => setCompactDensity(true)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer ${
                compactDensity ? 'bg-white text-slate-900 border border-slate-200' : 'text-slate-600'
              }`}
            >
              Compacto
            </button>
          </div>
        </div>

        <div className="p-4 flex items-center justify-between gap-4">
          <div>
            <div className="font-medium text-slate-800">Usuário autenticado</div>
            <div className="text-[11px] text-slate-500">
              {currentUser?.nome_completo || 'Visitante'} · {currentUser?.cargo || 'Perfil padrão'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateClassic('home')}
            className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
          >
            Retornar ao Portal Clássico
          </button>
        </div>
      </div>
    </div>
  );
};
