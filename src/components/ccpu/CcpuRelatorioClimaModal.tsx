import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  Thermometer,
  CloudRain,
  Sun,
  Droplets,
  Filter,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Building2,
  Calendar
} from 'lucide-react';
import { CcpuOcorrenciaItem } from '../../types';
import { ANIMAIS_CCPU_CONFIG, getAnimalInfo, BAIRROS_BC_ALFABETICO } from '../../data/ccpuAnimaisData';

interface CcpuRelatorioClimaModalProps {
  ocorrencias: CcpuOcorrenciaItem[];
  onClose: () => void;
}

export const CcpuRelatorioClimaModal: React.FC<CcpuRelatorioClimaModalProps> = ({
  ocorrencias,
  onClose
}) => {
  const [filtroAnimal, setFiltroAnimal] = useState<string>('TODOS');
  const [filtroBairro, setFiltroBairro] = useState<string>('TODOS');
  const [filtroFaixaTemp, setFiltroFaixaTemp] = useState<string>('TODAS');
  const [filtroFaixaUmidade, setFiltroFaixaUmidade] = useState<string>('TODAS');

  // Filtragem analítica
  const ocorrenciasFiltradas = useMemo(() => {
    return ocorrencias.filter((o) => {
      if (filtroAnimal !== 'TODOS') {
        const info = getAnimalInfo(o.tipoPraga);
        if (info.id !== filtroAnimal && o.tipoPraga !== filtroAnimal) {
          return false;
        }
      }
      if (filtroBairro !== 'TODOS' && o.bairro !== filtroBairro) {
        return false;
      }
      if (filtroFaixaTemp === 'CALOR_CRITICO' && o.temperatura < 25) {
        return false;
      }
      if (filtroFaixaTemp === 'AMENO' && (o.temperatura < 20 || o.temperatura >= 25)) {
        return false;
      }
      if (filtroFaixaTemp === 'FRIO' && o.temperatura >= 20) {
        return false;
      }
      const umidade = o.umidadeRelativa ?? 70;
      if (filtroFaixaUmidade === 'ALTA' && umidade < 80) {
        return false;
      }
      if (filtroFaixaUmidade === 'MEDIA' && (umidade < 70 || umidade >= 80)) {
        return false;
      }
      if (filtroFaixaUmidade === 'BAIXA' && umidade >= 70) {
        return false;
      }
      return true;
    });
  }, [ocorrencias, filtroAnimal, filtroBairro, filtroFaixaTemp, filtroFaixaUmidade]);

  // Indicadores climatológicos consolidados
  const climaStats = useMemo(() => {
    const total = ocorrenciasFiltradas.length;
    if (total === 0) {
      return {
        total: 0,
        tempMedia: '0.0',
        umidadeMedia: '0',
        tempMax: '0.0',
        umidadeMax: '0',
        condicaoMaisComum: '-'
      };
    }

    const somaTemp = ocorrenciasFiltradas.reduce((acc, c) => acc + (c.temperatura || 0), 0);
    const somaUmid = ocorrenciasFiltradas.reduce((acc, c) => acc + (c.umidadeRelativa || 75), 0);
    const maxTemp = Math.max(...ocorrenciasFiltradas.map((c) => c.temperatura || 0));
    const maxUmid = Math.max(...ocorrenciasFiltradas.map((c) => c.umidadeRelativa || 0));

    const freqCond: Record<string, number> = {};
    ocorrenciasFiltradas.forEach((c) => {
      const cond = c.condicaoClima || 'Estável';
      freqCond[cond] = (freqCond[cond] || 0) + 1;
    });

    let topCond = '-';
    let maxCount = 0;
    Object.entries(freqCond).forEach(([cond, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topCond = `${cond} (${count})`;
      }
    });

    return {
      total,
      tempMedia: (somaTemp / total).toFixed(1),
      umidadeMedia: Math.round(somaUmid / total).toString(),
      tempMax: maxTemp.toFixed(1),
      umidadeMax: maxUmid.toString(),
      condicaoMaisComum: topCond
    };
  }, [ocorrenciasFiltradas]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [
      'Protocolo',
      'DataHora',
      'Animal_Vetor',
      'Identificacao_Generica',
      'Bairro',
      'Latitude',
      'Longitude',
      'Temperatura_C',
      'Umidade_Relativa_Pct',
      'Condicao_Clima',
      'Fonte_Clima',
      'Quantidade_Especimes',
      'Fatores_Atrativos',
      'Fiscal_Responsavel'
    ];

    const rows = ocorrenciasFiltradas.map((o) => {
      const animal = getAnimalInfo(o.tipoPraga);
      const atrativos = Array.isArray(o.fatoresAtrativos) ? o.fatoresAtrativos.join(' | ') : '';
      return [
        `"${o.protocolo}"`,
        `"${o.dataHora}"`,
        `"${animal.nome}"`,
        `"${o.subtipoEspecie || animal.descricaoGenerica}"`,
        `"${o.bairro}"`,
        o.lat,
        o.lng,
        o.temperatura,
        o.umidadeRelativa ?? '',
        `"${o.condicaoClima}"`,
        `"${o.fonteTemperatura}"`,
        o.quantidade,
        `"${atrativos}"`,
        `"${o.servidorResponsavel}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_climatologico_ccpu_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dataEmissao = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-6xl bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:rounded-none">
        
        {/* Barra Superior de Ações (Oculta na Impressão) */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-3.5 bg-slate-900 text-white gap-3 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-sm tracking-wide block uppercase">
                Relatório Climatológico & Epidemiológico
              </span>
              <span className="text-[11px] text-slate-400">
                CCPU • Análise de Demandas vs. Temperatura, Umidade e Clima
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition cursor-pointer border border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV (Clima)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider bg-orange-500 hover:bg-orange-400 text-slate-950 rounded-lg transition cursor-pointer shadow-sm active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Filtros Climatológicos (Oculta na Impressão) */}
        <div className="p-4 bg-slate-100 border-b border-slate-200 text-xs print:hidden space-y-3 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 font-bold uppercase text-[11px] text-slate-600">
              <Filter className="w-3.5 h-3.5 text-orange-600" />
              <span>Filtros Climatológicos & Amostrais:</span>
            </div>

            <span className="text-[11px] text-slate-500 font-semibold">
              Exibindo <strong>{ocorrenciasFiltradas.length}</strong> de <strong>{ocorrencias.length}</strong> demandas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Animal / Vetor:
              </label>
              <select
                value={filtroAnimal}
                onChange={(e) => setFiltroAnimal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-xs outline-none cursor-pointer"
              >
                <option value="TODOS">🐾 TODOS OS ANIMAIS</option>
                {ANIMAIS_CCPU_CONFIG.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.icon} {a.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Bairro (Ordem Alfabética):
              </label>
              <select
                value={filtroBairro}
                onChange={(e) => setFiltroBairro(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-xs outline-none cursor-pointer"
              >
                <option value="TODOS">📍 TODOS OS BAIRROS</option>
                {BAIRROS_BC_ALFABETICO.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Faixa de Temperatura:
              </label>
              <select
                value={filtroFaixaTemp}
                onChange={(e) => setFiltroFaixaTemp(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-xs outline-none cursor-pointer"
              >
                <option value="TODAS">TODAS AS TEMPERATURAS</option>
                <option value="CALOR_CRITICO">🔥 Acima de 25°C (Calor Crítico)</option>
                <option value="AMENO">🌤️ 20°C a 25°C (Ameno)</option>
                <option value="FRIO">❄️ Abaixo de 20°C (Frio)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Faixa de Umidade Relativa:
              </label>
              <select
                value={filtroFaixaUmidade}
                onChange={(e) => setFiltroFaixaUmidade(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-xs outline-none cursor-pointer"
              >
                <option value="TODAS">TODAS AS UMIDformatterADES</option>
                <option value="ALTA">💧 Acima de 80% (Alta Umidade)</option>
                <option value="MEDIA">⛅ 70% a 80% (Média)</option>
                <option value="BAIXA">🌵 Abaixo de 70% (Baixa)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Corpo do Laudo Climatológico A4 (Imprimível) */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-6 text-left print:p-6 print:overflow-visible">
          
          {/* Cabeçalho Institucional Oficial */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src="/brasao_bc.png"
                alt="Brasão de Balneário Camboriú"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="space-y-0.5 text-center sm:text-left">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                  Estado de Santa Catarina • Município de Balneário Camboriú
                </p>
                <h1 className="text-base sm:text-lg font-black uppercase text-slate-950 leading-tight">
                  Secretaria Municipal de Saúde • Diretoria de Vigilância Sanitária
                </h1>
                <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">
                  CCPU • Centro de Controle de Pragas Urbanas & Zoonoses
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  Relatório Oficial de Correlação Epidemiológica: Clima, Temperatura e Umidade
                </p>
              </div>
            </div>

            <div className="text-right border border-slate-300 rounded-xl p-3 bg-slate-50 shrink-0 text-center sm:text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Emissão do Relatório</span>
              <span className="text-xs font-black text-slate-900 tracking-wider font-mono block">
                {dataEmissao}
              </span>
              <span className="text-[10px] text-orange-700 font-bold block mt-0.5 uppercase">
                {filtroAnimal === 'TODOS' ? 'Todas as Demandas' : getAnimalInfo(filtroAnimal).nome}
              </span>
            </div>
          </div>

          {/* Título do Documento */}
          <div className="text-center py-2.5 bg-orange-500/10 rounded-xl border border-orange-300">
            <h2 className="text-sm sm:text-base font-black uppercase text-slate-950 tracking-wide flex items-center justify-center gap-2">
              <Thermometer className="w-5 h-5 text-orange-600" />
              <span>RELATÓRIO CLIMATOLÓGICO: DEMANDAS vs. TEMPERATURA E UMIDADE</span>
            </h2>
            <p className="text-xs text-slate-700 font-medium">
              Vigilância Ativa Baseada em Condições Meteorológicas no Momento das Vistorias Sanitárias
            </p>
          </div>

          {/* Cards de Métricas Climatológicas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-orange-800 block">Temperatura Média</span>
              <span className="text-xl font-black text-orange-950">{climaStats.tempMedia}°C</span>
              <span className="text-[10px] text-orange-700 block">pico máximo: {climaStats.tempMax}°C</span>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-blue-800 block">Umidade Relativa Média</span>
              <span className="text-xl font-black text-blue-950">{climaStats.umidadeMedia}%</span>
              <span className="text-[10px] text-blue-700 block">pico máximo: {climaStats.umidadeMax}%</span>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-amber-800 block">Condição de Maior Atividade</span>
              <span className="text-xs font-black text-amber-950 truncate block mt-1">{climaStats.condicaoMaisComum}</span>
              <span className="text-[10px] text-amber-700 block">frequência climática dominante</span>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-emerald-800 block">Amostras Climáticas</span>
              <span className="text-xl font-black text-emerald-950">{climaStats.total}</span>
              <span className="text-[10px] text-emerald-700 block">ocorrências analisadas</span>
            </div>
          </div>

          {/* Análise Biológica Comportamental */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <span className="font-black uppercase text-[11px] text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <span>Interpretação Epidemiológica: Atividade Biológica e Fatores Climáticos em Balneário Camboriú</span>
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-slate-700 leading-relaxed pt-1">
              <div>
                <p>
                  <strong>• Artrópodes e Escorpiões:</strong> A atividade metabólica e de caça noturna se intensifica drasticamente com temperaturas superiores a <strong>24°C</strong> e umidade relativa acima de <strong>75%</strong>, momentos em que saem dos bueiros e redes pluviais em busca de alimento (baratas).
                </p>
              </div>
              <div>
                <p>
                  <strong>• Roedores, Mosquitos e Moluscos:</strong> Períodos com umidade relativa superior a <strong>80%</strong> pós-chuva estimulam a eclosão de larvas de mosquitos e a proliferação superficial de caramujos africanos e roedores deslocados de galerias alagadas.
                </p>
              </div>
            </div>
          </div>

          {/* Tabela Detalhada com Clima, Temperatura e Umidade */}
          <div className="border border-slate-300 rounded-2xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-2.5">Protocolo</th>
                  <th className="p-2.5">Data / Hora</th>
                  <th className="p-2.5">Animal / Demanda</th>
                  <th className="p-2.5">Bairro & Posição</th>
                  <th className="p-2.5 text-center">Temp. (°C)</th>
                  <th className="p-2.5 text-center">Umidade (%)</th>
                  <th className="p-2.5">Condição do Clima</th>
                  <th className="p-2.5">Fiscal Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {ocorrenciasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 italic">
                      Nenhuma ocorrência encontrada com os parâmetros climáticos selecionados.
                    </td>
                  </tr>
                ) : (
                  ocorrenciasFiltradas.map((o) => {
                    const animal = getAnimalInfo(o.tipoPraga);
                    const umid = o.umidadeRelativa ?? 70;

                    const tempCor =
                      o.temperatura >= 26
                        ? 'bg-red-100 text-red-900 border-red-300'
                        : o.temperatura >= 23
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-blue-100 text-blue-900 border-blue-300';

                    const umidCor =
                      umid >= 80
                        ? 'bg-teal-100 text-teal-900 border-teal-300'
                        : 'bg-sky-50 text-sky-900 border-sky-200';

                    return (
                      <tr key={o.id} className="hover:bg-orange-50/40 transition">
                        <td className="p-2.5 font-mono font-black text-slate-900 whitespace-nowrap">
                          {o.protocolo}
                        </td>
                        <td className="p-2.5 whitespace-nowrap text-slate-600 text-[11px]">
                          {new Date(o.dataHora).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="font-bold flex items-center gap-1.5">
                            <span>{animal.icon}</span>
                            <span>{animal.nome}</span>
                          </span>
                        </td>
                        <td className="p-2.5 text-[11px] leading-tight">
                          <strong className="text-slate-900 block">{o.bairro}</strong>
                          <span className="text-slate-500 font-mono text-[10px]">
                            Lat: {o.lat.toFixed(4)}, Lng: {o.lng.toFixed(4)}
                          </span>
                        </td>
                        <td className="p-2.5 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full font-black text-xs border ${tempCor}`}>
                            {o.temperatura.toFixed(1)}°C
                          </span>
                        </td>
                        <td className="p-2.5 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full font-black text-xs border ${umidCor}`}>
                            {umid}%
                          </span>
                        </td>
                        <td className="p-2.5 whitespace-nowrap text-[11px]">
                          <span className="font-semibold text-slate-800 block">
                            {o.condicaoClima}
                          </span>
                          <span className="text-[9px] text-slate-500 block truncate max-w-[150px]">
                            {o.fonteTemperatura}
                          </span>
                        </td>
                        <td className="p-2.5 whitespace-nowrap text-slate-700 text-[11px]">
                          {o.servidorResponsavel}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Assinaturas Técnicas */}
          <div className="pt-6 border-t border-slate-300 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center pt-4">
              <div className="space-y-1">
                <div className="border-b border-slate-400 w-3/4 mx-auto mb-1"></div>
                <p className="font-bold text-xs uppercase text-slate-800">
                  Responsável Técnico CCPU / Zoonoses
                </p>
                <p className="text-[10px] text-slate-500">
                  Centro de Controle de Pragas Urbanas • VISA Balneário Camboriú
                </p>
              </div>

              <div className="space-y-1">
                <div className="border-b border-slate-400 w-3/4 mx-auto mb-1"></div>
                <p className="font-bold text-xs uppercase text-slate-800">
                  Diretoria de Vigilância Sanitária e Ambiental
                </p>
                <p className="text-[10px] text-slate-500">
                  Secretaria Municipal de Saúde • Balneário Camboriú / SC
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
