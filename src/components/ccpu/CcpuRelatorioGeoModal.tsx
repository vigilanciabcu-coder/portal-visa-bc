import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Compass,
  Filter,
  Layers,
  Sparkles,
  Building2,
  Calendar
} from 'lucide-react';
import { CcpuOcorrenciaItem } from '../../types';
import { ANIMAIS_CCPU_CONFIG, getAnimalInfo, BAIRROS_BC_ALFABETICO } from '../../data/ccpuAnimaisData';

interface CcpuRelatorioGeoModalProps {
  ocorrencias: CcpuOcorrenciaItem[];
  onClose: () => void;
}

export const CcpuRelatorioGeoModal: React.FC<CcpuRelatorioGeoModalProps> = ({
  ocorrencias,
  onClose
}) => {
  const [filtroAnimal, setFiltroAnimal] = useState<string>('TODOS');
  const [filtroBairro, setFiltroBairro] = useState<string>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');

  // Filtragem
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
      if (filtroStatus !== 'TODOS' && o.statusOcorrencia !== filtroStatus) {
        return false;
      }
      return true;
    });
  }, [ocorrencias, filtroAnimal, filtroBairro, filtroStatus]);

  // Estatísticas geoespaciais
  const geoStats = useMemo(() => {
    const total = ocorrenciasFiltradas.length;
    const totalEspecimes = ocorrenciasFiltradas.reduce((acc, c) => acc + (c.quantidade || 0), 0);

    if (total === 0) {
      return {
        total: 0,
        totalEspecimes: 0,
        minLat: 0,
        maxLat: 0,
        minLng: 0,
        maxLng: 0,
        bairroMaisFrequente: '-'
      };
    }

    const lats = ocorrenciasFiltradas.map((o) => o.lat);
    const lngs = ocorrenciasFiltradas.map((o) => o.lng);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const freqBairro: Record<string, number> = {};
    ocorrenciasFiltradas.forEach((o) => {
      freqBairro[o.bairro] = (freqBairro[o.bairro] || 0) + 1;
    });

    let maxCont = 0;
    let bairroTop = '-';
    Object.entries(freqBairro).forEach(([b, c]) => {
      if (c > maxCont) {
        maxCont = c;
        bairroTop = `${b} (${c})`;
      }
    });

    return {
      total,
      totalEspecimes,
      minLat: minLat.toFixed(6),
      maxLat: maxLat.toFixed(6),
      minLng: minLng.toFixed(6),
      maxLng: maxLng.toFixed(6),
      bairroMaisFrequente: bairroTop
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
      'Latitude',
      'Longitude',
      'Bairro',
      'Endereco',
      'Numero',
      'Local_Bueiro',
      'Quantidade',
      'Status_Especime',
      'Status_Acao',
      'Fiscal_Responsavel',
      'Link_Google_Maps'
    ];

    const rows = ocorrenciasFiltradas.map((o) => {
      const animal = getAnimalInfo(o.tipoPraga);
      const linkMap = `https://www.google.com/maps?q=${o.lat},${o.lng}`;
      return [
        `"${o.protocolo}"`,
        `"${o.dataHora}"`,
        `"${animal.nome}"`,
        `"${o.subtipoEspecie || animal.descricaoGenerica}"`,
        o.lat,
        o.lng,
        `"${o.bairro}"`,
        `"${o.endereco || ''}"`,
        `"${o.numero || ''}"`,
        `"${o.identificacaoBueiroLocal || ''}"`,
        o.quantidade,
        `"${o.statusEspecime}"`,
        `"${o.statusOcorrencia}"`,
        `"${o.servidorResponsavel}"`,
        `"${linkMap}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_coordenadas_ccpu_${Date.now()}.csv`);
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
        
        {/* Barra de Ações Superior (Oculta na Impressão) */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-3.5 bg-slate-900 text-white gap-3 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-sm tracking-wide block uppercase">
                Relatório Geoespacial de Coordenadas Geográficas
              </span>
              <span className="text-[11px] text-slate-400">
                CCPU • Todas as Demandas e Mapeamento por Animal / Vetor
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
              <span>Exportar CSV (GPS)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition cursor-pointer shadow-sm active:scale-95"
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

        {/* Barra de Filtros Rápidos (Oculta na Impressão) */}
        <div className="p-4 bg-slate-100 border-b border-slate-200 text-xs print:hidden space-y-3 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 font-bold uppercase text-[11px] text-slate-600">
              <Filter className="w-3.5 h-3.5 text-amber-600" />
              <span>Filtros do Relatório:</span>
            </div>

            <span className="text-[11px] text-slate-500 font-semibold">
              Exibindo <strong>{ocorrenciasFiltradas.length}</strong> de <strong>{ocorrencias.length}</strong> demandas registradas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Animal / Demanda Específica:
              </label>
              <select
                value={filtroAnimal}
                onChange={(e) => setFiltroAnimal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-xs outline-none cursor-pointer"
              >
                <option value="TODOS">🐾 TODAS AS DEMANDAS / ANIMAIS</option>
                {ANIMAIS_CCPU_CONFIG.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.icon} {a.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Bairro de Balneário Camboriú:
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
                Status da Demanda:
              </label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-xs outline-none cursor-pointer"
              >
                <option value="TODOS">TODOS OS STATUS</option>
                <option value="COLETADO">COLETADO</option>
                <option value="BLOQUEIO_REALIZADO">BLOQUEIO REALIZADO</option>
                <option value="EM_MONITORAMENTO">EM MONITORAMENTO</option>
                <option value="CONCLUIDO">CONCLUÍDO</option>
              </select>
            </div>
          </div>
        </div>

        {/* Corpo do Relatório A4 (Imprimível) */}
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
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                  CCPU • Centro de Controle de Pragas Urbanas & Zoonoses
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  Relatório Oficial Cartográfico e Geoespacial de Coordenadas de Vetores e Sinantrópicos
                </p>
              </div>
            </div>

            <div className="text-right border border-slate-300 rounded-xl p-3 bg-slate-50 shrink-0 text-center sm:text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Emissão do Relatório</span>
              <span className="text-xs font-black text-slate-900 tracking-wider font-mono block">
                {dataEmissao}
              </span>
              <span className="text-[10px] text-amber-700 font-bold block mt-0.5 uppercase">
                Filtro: {filtroAnimal === 'TODOS' ? 'Todas as Demandas' : getAnimalInfo(filtroAnimal).nome}
              </span>
            </div>
          </div>

          {/* Título do Documento */}
          <div className="text-center py-2.5 bg-slate-100 rounded-xl border border-slate-200">
            <h2 className="text-sm sm:text-base font-black uppercase text-slate-900 tracking-wide">
              RELATÓRIO TÉCNICO DE COORDENADAS GEOGRÁFICAS E POSIÇÕES DAS DEMANDAS
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Levantamento espacial de ocorrências por latitude e longitude no território municipal
            </p>
          </div>

          {/* Quadro Síntese Geoespacial */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-amber-800 block">Total de Pontos Mapeados</span>
              <span className="text-lg font-black text-amber-950">{geoStats.total}</span>
              <span className="text-[10px] text-amber-700 block">ocorrências georreferenciadas</span>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-blue-800 block">Espécimes / Animais</span>
              <span className="text-lg font-black text-blue-950">{geoStats.totalEspecimes}</span>
              <span className="text-[10px] text-blue-700 block">indivíduos contabilizados</span>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-emerald-800 block">Concentração Máxima</span>
              <span className="text-xs font-black text-emerald-950 truncate block mt-1">{geoStats.bairroMaisFrequente}</span>
              <span className="text-[10px] text-emerald-700 block">bairro de maior incidência</span>
            </div>

            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-purple-800 block">Delimitação Territorial</span>
              <span className="text-[10px] font-mono font-bold text-purple-950 block mt-1">
                Lat: {geoStats.minLat} a {geoStats.maxLat}
              </span>
              <span className="text-[10px] font-mono font-bold text-purple-950 block">
                Lng: {geoStats.minLng} a {geoStats.maxLng}
              </span>
            </div>
          </div>

          {/* Tabela de Coordenadas Geográficas Específicas */}
          <div className="border border-slate-300 rounded-2xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-2.5">Protocolo</th>
                  <th className="p-2.5">Data / Hora</th>
                  <th className="p-2.5">Animal / Demanda</th>
                  <th className="p-2.5">Latitude (GPS)</th>
                  <th className="p-2.5">Longitude (GPS)</th>
                  <th className="p-2.5">Bairro / Localização</th>
                  <th className="p-2.5 text-center">Qtd.</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5 print:hidden text-center">Navegação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {ocorrenciasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 italic">
                      Nenhuma ocorrência encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  ocorrenciasFiltradas.map((o) => {
                    const animal = getAnimalInfo(o.tipoPraga);
                    const mapUrl = `https://www.google.com/maps?q=${o.lat},${o.lng}`;

                    return (
                      <tr key={o.id} className="hover:bg-amber-50/50 transition">
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
                        <td className="p-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                          {o.lat.toFixed(6)}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                          {o.lng.toFixed(6)}
                        </td>
                        <td className="p-2.5 text-[11px] leading-tight">
                          <strong className="text-slate-900 block">{o.bairro}</strong>
                          <span className="text-slate-500 block truncate max-w-[200px]">
                            {o.endereco}{o.numero ? `, ${o.numero}` : ''} • {o.identificacaoBueiroLocal || 'Ponto mapeado'}
                          </span>
                        </td>
                        <td className="p-2.5 font-black text-center text-amber-700">
                          {o.quantidade}
                        </td>
                        <td className="p-2.5 whitespace-nowrap text-[10px]">
                          <span className="px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-800 border border-slate-300">
                            {o.statusOcorrencia}
                          </span>
                        </td>
                        <td className="p-2.5 print:hidden text-center whitespace-nowrap">
                          <a
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[10px] border border-blue-200 transition"
                            title="Abrir coordenadas no Google Maps"
                          >
                            <span>Google Maps</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Nota Técnica de Vigilância Sanitária e Assinaturas */}
          <div className="pt-6 border-t border-slate-300 space-y-8">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <strong className="text-slate-800 uppercase block">Nota Técnica de Georreferenciamento:</strong>
              <p>
                As coordenadas geográficas acima expressas no Datum WGS-84 foram coletadas em campo durante vistorias ativas e atendimento de denúncias pelo Centro de Controle de Pragas Urbanas (CCPU/VISA-BC). Os dados subsidiam o planejamento de barreiras sanitárias, desratização de galerias pluviais, desinfecção de bueiros e medidas de contenção epidemiológica no município de Balneário Camboriú.
              </p>
            </div>

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
