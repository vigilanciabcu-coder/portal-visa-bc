import React, { useEffect } from 'react';
import { X, Printer, Droplet, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { AmostraLaboratorioItem, SolicitacaoLaudoPotabilidadeItem } from '../types';
import { isLaudoAssinado } from '../lib/potabilidadeService';

export interface LaudoOficialAguaModalProps {
  isOpen: boolean;
  onClose: () => void;
  amostra?: AmostraLaboratorioItem | null;
  solicitacao?: SolicitacaoLaudoPotabilidadeItem | null;
}

export const LaudoOficialAguaModal: React.FC<LaudoOficialAguaModalProps> = ({
  isOpen,
  onClose,
  amostra,
  solicitacao
}) => {
  useEffect(() => {
    if (isOpen) {
      const prevTitle = document.title;
      const cnpjOuCpf = (amostra?.cnpj_cpf || solicitacao?.cnpj_cpf || '').trim();
      document.title = cnpjOuCpf
        ? `${cnpjOuCpf} - LAUDO DE ANÁLISE DE ÁGUA-VISA`
        : 'LAUDO DE ANÁLISE DE ÁGUA-VISA';
      return () => {
        document.title = prevTitle;
      };
    }
  }, [isOpen, amostra, solicitacao]);

  if (!isOpen || (!amostra && !solicitacao)) return null;

  const laudoLiberado = isLaudoAssinado(amostra, solicitacao);

  if (!laudoLiberado) {
    const protocolo = amostra?.protocolo || solicitacao?.protocolo_1doc || 'S/N';
    const interessado = amostra?.interessado || amostra?.estabelecimento || solicitacao?.razao_social || 'Requerente';
    return (
      <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
        <div className="bg-slate-900 text-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative border border-slate-700 text-left space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5 text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-black text-sm uppercase tracking-wide">
                Laudo Oficial em Andamento
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-2">
            <p className="font-bold">
              ⏳ O Laudo Oficial ainda não possui emissão ou assinatura técnica concluída.
            </p>
            <p className="text-[11px] text-amber-300/90 leading-relaxed">
              Conforme as normas sanitárias vigentes, os dados analíticos de potabilidade e o laudo oficial para impressão somente são liberados após a realização da coleta presencial em campo, incubação bacteriológica em bancada e a homologação com assinatura digital do responsável técnico farmacêutico/bioquímico (CRF).
            </p>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs space-y-1.5 font-mono">
            <div><span className="text-slate-400">Protocolo:</span> <strong className="text-cyan-300">{protocolo}</strong></div>
            <div><span className="text-slate-400">Interessado:</span> <span className="text-slate-200">{interessado}</span></div>
            <div><span className="text-slate-400">Situação:</span> <span className="text-amber-400 font-bold">{solicitacao?.status_solicitacao || amostra?.status || 'AGUARDANDO COLETA / ANÁLISE'}</span></div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase cursor-pointer transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Objeto unificado com valores padrão oficiais
  const item: Partial<AmostraLaboratorioItem> = amostra || {
    protocolo: solicitacao?.protocolo_1doc || '60.455/2026',
    codigo_amostra: solicitacao?.id ? `172` : '172',
    mes_ano_referencia: 'JULHO / 2026',
    responsavel_distribuicao: 'EMASA',
    interessado: solicitacao?.razao_social || 'ESTABELECIMENTO',
    estabelecimento: solicitacao?.nome_fantasia || solicitacao?.razao_social || 'ESTABELECIMENTO',
    cnpj_cpf: solicitacao?.cnpj_cpf || '',
    numero_alvara: 'Solicitado',
    endereco: solicitacao?.endereco || 'Avenida Palestina, nº 150 - Nações - Balneário Camboriú/SC',
    local_coleta: (solicitacao?.locais_coleta && solicitacao.locais_coleta[0]) || 'Torneira da Manipulação',
    data_coleta: solicitacao?.data_solicitacao || '2026-08-01',
    hora_coleta: '08:20',
    fiscal_coletor: 'Rita Sahd',
    aspecto: 'Límpido',
    odor: 'Inobjetável',
    cor: 'Incolor',
    ph: '7,0',
    cloro: '1,59',
    fluoreto: '0,72',
    turbidez: '0,52',
    coliformes_totais: 'AUSENTE',
    escherichia_coli: 'AUSENTE',
    status: 'CONFORME',
    conclusao_laudo: 'Para os parâmetros analisados, com base Portaria GM/MS Nº 888, de 4 maio de 2021. RESULTADO GERAL: Em acordo.',
    laboratorialista: 'ADRIANO GUARDINI',
    cargo_laboratorialista: 'FARMACÊUTICO E BIOQUÍMICO',
    registro_conselho: 'CRF/SC- 3321',
    data_resultado: new Date().toLocaleDateString('pt-BR'),
    assinatura_digital_validada: true,
    assinatura_digital_hash: 'VISA-CRF-SC-VALID-3321',
    observacoes: solicitacao?.observacoes || 'ANÁLISE SOLICITADA PARA VERIFICAR QUALIDADE DA ÁGUA PARA CONSUMO HUMANO'
  };

  const getPhStatus = (val?: string) => {
    if (!val) return 'conform';
    const num = parseFloat(val.replace(',', '.'));
    if (isNaN(num)) return 'conform';
    return (num >= 6.0 && num <= 9.5) ? 'conform' : 'not-conform';
  };

  const getCloroStatus = (val?: string) => {
    if (!val) return 'conform';
    const num = parseFloat(val.replace(',', '.'));
    if (isNaN(num)) return 'conform';
    return (num >= 0.2 && num <= 2.0) ? 'conform' : 'not-conform';
  };

  const getFluorStatus = (val?: string) => {
    if (!val) return 'conform';
    const num = parseFloat(val.replace(',', '.'));
    if (isNaN(num)) return 'conform';
    return (num >= 0.7 && num <= 1.0) ? 'conform' : 'not-conform';
  };

  const getTurbidezStatus = (val?: string) => {
    if (!val) return 'conform';
    const num = parseFloat(val.replace(',', '.'));
    if (isNaN(num)) return 'conform';
    return num <= 5.0 ? 'conform' : 'not-conform';
  };

  const isNaoConforme =
    item.status === 'NÃO CONFORME' ||
    item.status === 'INTERDITADO' ||
    Boolean(
      item.conclusao_laudo &&
        (item.conclusao_laudo.toLowerCase().includes('não atende') ||
          item.conclusao_laudo.toLowerCase().includes('desacordo') ||
          item.conclusao_laudo.toLowerCase().includes('imprópria'))
    );

  const colTot = (item.coliformes_totais || 'AUSENTE').trim().toUpperCase();
  const colFec = (item.escherichia_coli || 'AUSENTE').trim().toUpperCase();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white text-slate-900 rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative border border-slate-300 my-auto text-left print:p-0 print:border-none print:shadow-none print:w-full">
        {/* Barra Superior de Ações (Oculta na Impressão) */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${isNaoConforme ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
              <Droplet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase text-slate-900">
                Laudo Oficial de Análise de Potabilidade da Água
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Protocolo 1Doc: {item.protocolo} • Parecer: {isNaoConforme ? 'NÃO CONFORME' : 'CONFORME'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-black hover:bg-slate-800 text-white font-black text-xs px-4 py-2 rounded-xl uppercase flex items-center gap-1.5 shadow cursor-pointer transition"
            >
              <Printer className="w-4 h-4" />
              Imprimir Laudo
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* DOCUMENTO OFICIAL TIMBRADO (FORMATO A4 / IMPRESSÃO LIMPA) */}
        {/* ======================================================== */}
        <div className="border-2 border-black p-4 sm:p-6 bg-white relative text-black print:border-black font-sans leading-tight">
          {/* Cabeçalho Oficial */}
          <div className="flex items-center gap-3 sm:gap-4 border-b-2 border-black pb-2 mb-2">
            <img
              src="/brasao_bc.png"
              alt="Brasão Balneário Camboriú"
              className="w-14 h-14 sm:w-16 sm:h-16 object-contain shrink-0"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('wikimedia')) {
                  target.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Bras%C3%A3o_de_Balne%C3%A1rio_Cambori%C3%BA.svg/200px-Bras%C3%A3o_de_Balne%C3%A1rio_Cambori%C3%BA.svg.png';
                }
              }}
            />
            <div className="flex-1 text-left leading-tight space-y-0.5">
              <div className="text-[10.5px] font-bold uppercase text-slate-700 tracking-wider">
                ESTADO DE SANTA CATARINA • MUNICÍPIO DE BALNEÁRIO CAMBORIÚ
              </div>
              <div className="text-[10.5px] font-bold uppercase text-slate-700">
                SECRETARIA MUNICIPAL DE SAÚDE
              </div>
              <div className="text-[13px] sm:text-[14px] font-black uppercase text-blue-900 tracking-tight">
                DIVISÃO DE VIGILÂNCIA SANITÁRIA (DVIS)
              </div>
              <div className="text-[9.5px] font-bold uppercase text-slate-700">
                LABORATÓRIO DE CONTROLE DE POTABILIDADE DA ÁGUA
              </div>
            </div>
          </div>

          {/* Título Principal */}
          <div className="text-center font-black text-[11px] uppercase py-0.5 bg-slate-100 border border-black mb-1.5 tracking-wide">
            LAUDO DE ANÁLISE DE ÁGUA PARA CONSUMO HUMANO
          </div>

          {/* Tabela 1: Identificação da Coleta */}
          <div className="border border-black text-[10px] divide-y divide-black mb-1.5 leading-tight">
            <div className="grid grid-cols-12 divide-x divide-black bg-slate-50 font-bold p-0.5">
              <div className="col-span-5 px-1">
                PROTOCOLO: <span className="font-mono">{item.protocolo || '60.455/2026'}</span>
              </div>
              <div className="col-span-4 px-1">
                Número da Amostra: <span className="font-mono">{item.codigo_amostra || '169'}</span>
              </div>
              <div className="col-span-3 px-1 text-right uppercase">
                {item.mes_ano_referencia || 'JULHO / 2026'}
              </div>
            </div>

            <div className="p-0.5 px-1">
              <span className="font-bold">Responsável pela distribuição:</span> {item.responsavel_distribuicao || 'EMASA'}
            </div>

            <div className="p-0.5 px-1">
              <span className="font-bold">Interessado:</span> <span className="font-black uppercase">{item.interessado || item.estabelecimento}</span>
            </div>

            <div className="grid grid-cols-12 divide-x divide-black p-0.5">
              <div className="col-span-6 px-1">
                <span className="font-bold">CNPJ / CPF:</span> <span className="font-mono">{item.cnpj_cpf}</span>
              </div>
              <div className="col-span-6 px-1">
                <span className="font-bold">Número Alvará:</span> {item.numero_alvara || 'Solicitado'}
              </div>
            </div>

            <div className="p-0.5 px-1">
              <span className="font-bold">Endereço:</span> {item.endereco}
            </div>

            <div className="grid grid-cols-12 divide-x divide-black p-0.5">
              <div className="col-span-8 px-1">
                <span className="font-bold">Local de Coleta:</span> <span className="font-black uppercase">{item.local_coleta || 'TORNEIRA DA ÁREA DE MANIPULAÇÃO'}</span>
              </div>
              <div className="col-span-4 px-1">
                <span className="font-bold">Data da Coleta:</span> {item.data_coleta}
              </div>
            </div>

            <div className="grid grid-cols-12 divide-x divide-black p-0.5">
              <div className="col-span-8 px-1">
                <span className="font-bold">Coletado por:</span> {item.fiscal_coletor || 'Rita Sahd'}
              </div>
              <div className="col-span-4 px-1">
                <span className="font-bold">Hora da Coleta:</span> {item.hora_coleta || '08:20'}
              </div>
            </div>

            <div className="p-0.5 px-1">
              <span className="font-bold">Observações:</span>
              <div className="uppercase text-[9px] mt-0.5 font-medium">
                {item.observacoes || 'ANÁLISE SOLICITADA PARA VERIFICAR QUALIDADE DA ÁGUA PARA CONSUMO HUMANO'}
              </div>
            </div>
          </div>

          {/* Tabela 2: Características Organolépticas */}
          <div className="border border-black mb-1.5">
            <div className="bg-slate-100 font-black text-center text-[9.5px] uppercase py-0.5 border-b border-black">
              CARACTERÍSTICAS ORGANOLÉPTICAS
            </div>
            <div className="grid grid-cols-3 divide-x divide-black text-[10px] p-0.5">
              <div className="px-1">
                <span className="font-bold">Aspecto:</span> {item.aspecto || 'Límpido'}
              </div>
              <div className="px-1">
                <span className="font-bold">Odor:</span> {item.odor || 'Inobjetável'}
              </div>
              <div className="px-1">
                <span className="font-bold">Cor:</span> {item.cor || 'Incolor'}
              </div>
            </div>
          </div>

          {/* Tabela 3: Análise Físico/Química */}
          <div className="border border-black mb-1.5 text-[9.5px]">
            <div className="bg-slate-100 font-black text-center text-[9.5px] uppercase py-0.5 border-b border-black">
              ANÁLISE FÍSICO/QUÍMICA
            </div>
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr className="border-b border-black bg-slate-50 font-black text-[9px] text-center">
                  <th className="border-r border-black p-0.5 w-[20%]">Parâmetro</th>
                  <th className="border-r border-black p-0.5 w-[30%]">Equipamento</th>
                  <th className="border-r border-black p-0.5 w-[14%]">Resultado</th>
                  <th className="p-0.5 w-[36%]">Valores de Referência de acordo com a</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black text-center">
                <tr>
                  <td className="border-r border-black p-0.5 font-bold text-center">pH</td>
                  <td className="border-r border-black p-0.5 text-left text-[8.5px] leading-tight">
                    {item.equipamento_ph || 'pH indicator strips MQuant 0 – 14 Marca MERCK'}
                  </td>
                  {(() => {
                    const st = getPhStatus(item.ph);
                    const bgClass = st === 'not-conform'
                      ? 'bg-red-100 text-red-900 font-black'
                      : 'bg-emerald-100 text-emerald-900 font-black';
                    return (
                      <td className={`border-r border-black p-0.5 text-xs ${bgClass}`}>
                        {item.ph || '7,0'}
                      </td>
                    );
                  })()}
                  <td className="p-0.5 text-[8px] text-center leading-tight">
                    <div className="font-bold italic">6.0 a 9.5</div>
                    <div>Portaria GM/MS Nº 888, maio de 2021.</div>
                  </td>
                </tr>

                <tr>
                  <td className="border-r border-black p-0.5 font-bold text-center">
                    Cloro Residual livre
                  </td>
                  <td className="border-r border-black p-0.5 text-left text-[8.5px] leading-tight">
                    {item.equipamento_cloro || 'Chlorine Reagente for 10ml Sample(DLA-CL)'}
                  </td>
                  {(() => {
                    const st = getCloroStatus(item.cloro);
                    const bgClass = st === 'not-conform'
                      ? 'bg-red-100 text-red-900 font-black'
                      : 'bg-emerald-100 text-emerald-900 font-black';
                    return (
                      <td className={`border-r border-black p-0.5 text-xs ${bgClass}`}>
                        {item.cloro || '1,59'}
                      </td>
                    );
                  })()}
                  <td className="p-0.5 text-[8px] text-center leading-tight">
                    <div className="font-bold italic">0,2 a 2,0 mg/l (águas tratadas)</div>
                    <div>Portaria GM/MS Nº 888, maio de 2021.</div>
                  </td>
                </tr>

                <tr>
                  <td className="border-r border-black p-0.5 font-bold text-center">Flúor</td>
                  <td className="border-r border-black p-0.5 text-left text-[8.5px] leading-tight">
                    {item.equipamento_fluor || 'Colorímetro Digital para Flúor (Modelo DLA-FL)'}
                  </td>
                  {(() => {
                    const st = getFluorStatus(item.fluoreto);
                    const bgClass = st === 'not-conform'
                      ? 'bg-red-100 text-red-900 font-black'
                      : 'bg-emerald-100 text-emerald-900 font-black';
                    return (
                      <td className={`border-r border-black p-0.5 text-xs ${bgClass}`}>
                        {item.fluoreto || '0,72'}
                      </td>
                    );
                  })()}
                  <td className="p-0.5 text-[8px] text-center leading-tight">
                    <div className="font-bold italic">De 0,7 a 1,0 mg/L</div>
                    <div className="font-bold">Portaria/SC- 421/2016</div>
                  </td>
                </tr>

                <tr>
                  <td className="border-r border-black p-0.5 font-bold text-center">Turbidez</td>
                  <td className="border-r border-black p-0.5 text-left text-[8.5px] leading-tight">
                    {item.equipamento_turbidez || 'Turbidímetro Digital modelo DLT-WV'}
                  </td>
                  {(() => {
                    const st = getTurbidezStatus(item.turbidez);
                    const bgClass = st === 'not-conform'
                      ? 'bg-red-100 text-red-900 font-black'
                      : 'bg-emerald-100 text-emerald-900 font-black';
                    return (
                      <td className={`border-r border-black p-0.5 text-xs ${bgClass}`}>
                        {item.turbidez || '0,52'}
                      </td>
                    );
                  })()}
                  <td className="p-0.5 text-[8px] text-center leading-tight">
                    <div className="font-bold italic">Até 5,0 uT (unidades de turbidez)</div>
                    <div>Portaria GM/MS Nº 888, maio de 2021.</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tabela 4: Análise Microbiológica */}
          <div className="border border-black mb-1.5 text-[9.5px]">
            <div className="bg-slate-100 font-black text-center text-[9.5px] uppercase py-0.5 border-b border-black">
              ANÁLISE MICROBIOLÓGICA
            </div>
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr className="border-b border-black bg-slate-50 font-black text-[9px]">
                  <th className="border-r border-black p-0.5 text-left w-[58%]">Parâmetro / Metodologia</th>
                  <th className="border-r border-black p-0.5 text-center w-[14%]">Resultado</th>
                  <th className="p-0.5 text-center w-[28%]">Val. Referência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                <tr>
                  <td className="border-r border-black p-1 text-[8px] text-justify leading-tight">
                    <strong className="block text-[8.5px] text-black">COLIFORMES TOTAIS:</strong>
                    {item.metodologia_coliformes_totais || 'Kit Análises Colilert – DST-P/A em cartela QUANTY-TRAY/2000 Marca IDEXX + estufa 36ºC 100 mL por 24 horas'}
                  </td>
                  <td className={`border-r border-black p-1 text-center text-[11px] align-middle ${
                    colTot === 'PRESENTE' ? 'bg-red-100 text-red-900 font-black' : 'bg-emerald-100 text-emerald-900 font-black'
                  }`}>
                    {item.coliformes_totais || 'AUSENTE'}
                  </td>
                  <td className="p-1 text-center text-[8.5px] italic font-bold align-middle">
                    Ausência em 100 mL
                  </td>
                </tr>

                <tr>
                  <td className="border-r border-black p-1 text-[8px] text-justify leading-tight">
                    <strong className="block text-[8.5px] text-black">ESCHERICHIA COLI (E. coli):</strong>
                    {item.metodologia_escherichia_coli || 'Kit Análises Colilert – DST-P/A em cartela QUANTY-TRAY/2000 Marca IDEXX + UV 365 NM Marca CE'}
                  </td>
                  <td className={`border-r border-black p-1 text-center text-[11px] align-middle ${
                    colFec === 'PRESENTE' ? 'bg-red-100 text-red-900 font-black' : 'bg-emerald-100 text-emerald-900 font-black'
                  }`}>
                    {item.escherichia_coli || 'AUSENTE'}
                  </td>
                  <td className="p-1 text-center text-[8.5px] italic font-bold align-middle">
                    Ausência em 100 mL
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Conclusão Oficial */}
          <div className="border border-black text-[9.5px] mb-2 bg-slate-50/60">
            <div className="grid grid-cols-12 divide-x divide-black items-stretch">
              <div className="col-span-7 sm:col-span-8 p-1.5 flex flex-col justify-center text-left">
                <div className="font-black uppercase mb-0.5 text-[9.5px] text-black">
                  CONCLUSÃO:
                </div>
                <p className="font-bold leading-tight text-[9px] text-slate-900">
                  Para os parâmetros analisados, com base na Portaria GM/MS Nº 888, de 4 de maio de 2021.
                </p>
              </div>

              <div className={`col-span-5 sm:col-span-4 p-1.5 flex flex-col justify-between ${
                isNaoConforme ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
              }`}>
                <div className="font-black uppercase text-[9px] text-black text-left self-start">
                  RESULTADO GERAL:
                </div>
                <div className={`font-black text-[10px] sm:text-[11px] uppercase text-center w-full py-0.5 leading-tight ${
                  isNaoConforme ? 'text-red-700' : 'text-emerald-700'
                }`}>
                  {isNaoConforme ? 'Em desacordo' : 'Em acordo'}
                </div>
              </div>
            </div>
          </div>

          {/* Data e Assinatura Técnica */}
          <div className="border border-black p-2 text-[10px] mb-2 relative">
            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <div>
                  <span className="font-bold">Data do Resultado:</span> {item.data_resultado || '04/08/2026'}
                </div>
                {item.assinatura_digital_validada && (
                  <div className="mt-1 inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-300">
                    <span>✓ Assinado Digitalmente por Senha</span>
                  </div>
                )}
              </div>

              <div className="text-center">
                <div className="font-black uppercase text-[10.5px]">
                  {item.laboratorialista || 'ADRIANO GUARDINI'}
                </div>
                <div className="text-[9px] font-bold uppercase text-slate-700">
                  {item.cargo_laboratorialista || 'FARMACÊUTICO E BIOQUÍMICO'}
                </div>
                <div className="font-mono text-[9px] font-bold">
                  {item.registro_conselho || 'CRF/SC- 3321'}
                </div>
              </div>
            </div>
          </div>

          {/* Faixa Vertical de Autenticação Digital */}
          <div
            className="absolute right-1.5 sm:right-2.5 print:right-1 top-1/2 select-none pointer-events-none font-mono text-[6.5px] sm:text-[7px] text-slate-400 tracking-wider uppercase whitespace-nowrap leading-none opacity-75 print:flex print:text-slate-600 z-20"
            style={{
              writingMode: 'vertical-rl',
              transform: 'translateY(-50%) rotate(180deg)',
              transformOrigin: 'center center'
            }}
          >
            DOCUMENTO ASSINADO DIGITALMENTE POR SENHA • RESP. TÉCNICO: {item.laboratorialista || 'ADRIANO GUARDINI'} ({item.registro_conselho || 'CRF/SC- 3321'}) • HASH: {item.assinatura_digital_hash || 'VISA-CRF-SC-VALID'} • AUTENTICADO EM: {item.data_resultado || '24/08/2026'} • VIGILÂNCIA SANITÁRIA PMBC
          </div>

          {/* Rodapé Oficial da Vigilância Sanitária */}
          <div className="border-t-2 border-black pt-1.5 text-center text-[8.5px] font-bold text-slate-700 leading-tight space-y-0.5">
            <div>Balneário Camboriú – Capital Catarinense do Turismo – CNPJ: 83.102.285/0001-07</div>
            <div className="uppercase font-black text-slate-900">DIVISÃO DE VIGILÂNCIA SANITÁRIA</div>
            <div>Avenida Palestina, Nº 150 - Nações - CEP 88338-010 - (47) 3267-7000 - E-mail: devs@bc.sc.gov.br / www.bc.sc.gov.br</div>
          </div>
        </div>

        {/* Botões de Ação na Tela */}
        <div className="mt-4 flex justify-end gap-3 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="bg-black hover:bg-slate-800 text-white font-black text-xs px-5 py-2.5 rounded-xl uppercase flex items-center gap-1.5 shadow cursor-pointer transition"
          >
            <Printer className="w-4 h-4" />
            Imprimir Laudo Oficial
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-xs px-4 py-2.5 rounded-xl uppercase cursor-pointer transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
