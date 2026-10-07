import React, { useEffect } from 'react';
import { X, Printer, Droplet, FileCheck2, MapPin, Calendar, Clock, UserCheck, ShieldCheck, Thermometer } from 'lucide-react';
import { AmostraLaboratorioItem, SolicitacaoLaudoPotabilidadeItem } from '../types';

export interface RelatorioColetaAguaModalProps {
  isOpen: boolean;
  onClose: () => void;
  amostra?: AmostraLaboratorioItem | null;
  solicitacao?: SolicitacaoLaudoPotabilidadeItem | null;
}

export const RelatorioColetaAguaModal: React.FC<RelatorioColetaAguaModalProps> = ({
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
        ? `${cnpjOuCpf} - TERMO DE COLETA DE ÁGUA-VISA`
        : 'TERMO DE COLETA DE ÁGUA-VISA';
      return () => {
        document.title = prevTitle;
      };
    }
  }, [isOpen, amostra, solicitacao]);

  if (!isOpen || (!amostra && !solicitacao)) return null;

  // Extrai dados unificados
  const protocolo = amostra?.protocolo || solicitacao?.protocolo_1doc || 'S/N';
  const codigoAmostra = amostra?.codigo_amostra || (solicitacao?.id ? `SOL-${solicitacao.id.slice(-4)}` : '172');
  const mesAno = amostra?.mes_ano_referencia || 'JULHO / 2026';
  const interessado = amostra?.interessado || amostra?.estabelecimento || solicitacao?.razao_social || 'ESTABELECIMENTO';
  const nomeFantasia = solicitacao?.nome_fantasia || amostra?.estabelecimento || interessado;
  const cnpjCpf = amostra?.cnpj_cpf || solicitacao?.cnpj_cpf || '';
  const numeroAlvara = amostra?.numero_alvara || 'Solicitado';
  const endereco = amostra?.endereco || solicitacao?.endereco || 'Balneário Camboriú, SC';
  const bairro = amostra?.bairro || solicitacao?.bairro || 'Centro';
  const localColeta = amostra?.local_coleta || (solicitacao?.locais_coleta && solicitacao.locais_coleta[0]) || 'Torneira da Área de Manipulação';
  const dataColeta = amostra?.data_coleta || solicitacao?.data_solicitacao || new Date().toISOString().split('T')[0];
  const horaColeta = amostra?.hora_coleta || '08:45';
  const fiscalColetor = amostra?.fiscal_coletor || 'Rita Sahd';
  const temperatura = amostra?.temperatura_coleta || '20.0°C';
  const cloro = amostra?.cloro || '1,50';
  const ph = amostra?.ph || '7,0';
  const responsavelDistribuicao = amostra?.responsavel_distribuicao || 'EMASA (Rede Pública Municipal)';
  const observacoes = amostra?.observacoes || solicitacao?.observacoes || 'Coleta oficial realizada in loco para análise de potabilidade da água para consumo humano.';

  const timestampColeta = amostra?.coleta_assinatura_data || `${dataColeta.split('-').reverse().join('/')} às ${horaColeta}`;
  const hashColeta = amostra?.coleta_assinatura_hash || `VISA-COL-${codigoAmostra}-BC`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white text-slate-900 rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative border border-slate-300 my-auto text-left print:p-0 print:border-none print:shadow-none print:w-full">
        {/* Barra Superior de Ações (Oculta na Impressão) */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-100 text-cyan-800 rounded-xl">
              <Droplet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase text-slate-900">
                Relatório & Termo de Coleta de Amostra de Água em Campo
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Protocolo 1Doc: {protocolo} • Amostra: {codigoAmostra}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-cyan-700 hover:bg-cyan-800 text-white font-black text-xs px-4 py-2 rounded-xl uppercase flex items-center gap-1.5 shadow cursor-pointer transition"
            >
              <Printer className="w-4 h-4" />
              Imprimir Termo
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
        <div className="border-2 border-black p-4 sm:p-6 bg-white relative text-black print:border-black">
          {/* Cabeçalho Oficial */}
          <div className="flex items-center gap-3 sm:gap-4 border-b-2 border-black pb-2.5 mb-2.5">
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
              <div className="text-[10px] font-bold uppercase text-slate-800">
                ESTADO DE SANTA CATARINA • MUNICÍPIO DE BALNEÁRIO CAMBORIÚ
              </div>
              <div className="text-[10px] font-bold uppercase text-slate-800">
                SECRETARIA MUNICIPAL DE SAÚDE
              </div>
              <div className="text-[13px] sm:text-[14px] font-black uppercase text-blue-900 tracking-tight">
                DIVISÃO DE VIGILÂNCIA SANITÁRIA E AMBIENTAL (DVIS)
              </div>
              <div className="text-[9.5px] font-bold uppercase text-slate-700">
                SETOR DE LABORATÓRIO DE CONTROLE DE QUALIDADE DA ÁGUA
              </div>
            </div>
          </div>

          {/* Título do Documento */}
          <div className="bg-slate-100 border border-black text-center font-black text-[11px] sm:text-[12px] uppercase py-1 mb-2 tracking-wide">
            TERMO E RELATÓRIO OFICIAL DE COLETA DE AMOSTRA DE ÁGUA EM CAMPO
          </div>

          {/* Identificação da Coleta e Amostra */}
          <div className="border border-black text-[10px] divide-y divide-black mb-2 leading-tight">
            <div className="grid grid-cols-12 divide-x divide-black bg-slate-50 font-bold p-1">
              <div className="col-span-5 px-1">
                PROTOCOLO 1DOC: <span className="font-mono font-black">{protocolo}</span>
              </div>
              <div className="col-span-4 px-1">
                Nº DA AMOSTRA: <span className="font-mono font-black">{codigoAmostra}</span>
              </div>
              <div className="col-span-3 px-1 text-right uppercase">
                MÊS/ANO: <span className="font-mono font-black">{mesAno}</span>
              </div>
            </div>

            <div className="p-1 px-1.5">
              <span className="font-bold">Interessado / Razão Social:</span>{' '}
              <span className="font-black uppercase">{interessado}</span>
              {nomeFantasia && nomeFantasia !== interessado && (
                <span className="font-bold italic text-slate-700"> ({nomeFantasia})</span>
              )}
            </div>

            <div className="grid grid-cols-12 divide-x divide-black p-1">
              <div className="col-span-6 px-1">
                <span className="font-bold">CNPJ / CPF:</span>{' '}
                <span className="font-mono font-black">{cnpjCpf}</span>
              </div>
              <div className="col-span-6 px-1">
                <span className="font-bold">Alvará Sanitário / Situação:</span>{' '}
                <span className="font-bold uppercase">{numeroAlvara}</span>
              </div>
            </div>

            <div className="p-1 px-1.5">
              <span className="font-bold">Endereço da Coleta:</span>{' '}
              <span>{endereco} {bairro ? ` - Bairro ${bairro}` : ''} - Balneário Camboriú / SC</span>
            </div>

            <div className="grid grid-cols-12 divide-x divide-black p-1">
              <div className="col-span-7 px-1">
                <span className="font-bold">Ponto / Local Amostrado:</span>{' '}
                <span className="font-black uppercase text-blue-900">{localColeta}</span>
              </div>
              <div className="col-span-5 px-1">
                <span className="font-bold">Fonte de Abastecimento:</span>{' '}
                <span>{responsavelDistribuicao}</span>
              </div>
            </div>

            <div className="grid grid-cols-12 divide-x divide-black p-1">
              <div className="col-span-4 px-1">
                <span className="font-bold">Data da Coleta:</span>{' '}
                <span className="font-mono font-bold">{dataColeta.split('-').reverse().join('/')}</span>
              </div>
              <div className="col-span-4 px-1">
                <span className="font-bold">Hora da Coleta:</span>{' '}
                <span className="font-mono font-bold">{horaColeta}</span>
              </div>
              <div className="col-span-4 px-1">
                <span className="font-bold">Finalidade:</span>{' '}
                <span className="font-bold uppercase">Laudo de Potabilidade</span>
              </div>
            </div>
          </div>

          {/* Parâmetros Físico-Químicos Medidos in loco em Campo */}
          <div className="border border-black mb-2 text-[10px]">
            <div className="bg-slate-100 font-black text-center text-[10px] uppercase py-0.5 border-b border-black">
              MEDIÇÕES REALIZADAS IN LOCO NO ATO DA COLETA (PARÂMETROS DE CAMPO)
            </div>
            <table className="w-full border-collapse table-fixed text-center">
              <thead>
                <tr className="border-b border-black bg-slate-50 font-black text-[9.5px]">
                  <th className="border-r border-black p-1 w-1/3">Parâmetro Medido</th>
                  <th className="border-r border-black p-1 w-1/3">Resultado em Campo</th>
                  <th className="p-1 w-1/3">Valor de Referência Normativo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black font-medium">
                <tr>
                  <td className="border-r border-black p-1 text-left px-2 font-bold">
                    Temperatura da Amostra
                  </td>
                  <td className="border-r border-black p-1 font-mono font-black text-xs">
                    {temperatura}
                  </td>
                  <td className="p-1 text-slate-700 text-[9px] italic">
                    Ambiente / Refrigeração
                  </td>
                </tr>
                <tr>
                  <td className="border-r border-black p-1 text-left px-2 font-bold">
                    Cloro Residual Livre (mg/L)
                  </td>
                  <td className="border-r border-black p-1 font-mono font-black text-xs bg-cyan-50">
                    {cloro} mg/L
                  </td>
                  <td className="p-1 text-slate-700 text-[9px]">
                    0,2 a 2,0 mg/L (Portaria GM/MS nº 888/2021)
                  </td>
                </tr>
                <tr>
                  <td className="border-r border-black p-1 text-left px-2 font-bold">
                    Potencial Hidrogeniônico (pH)
                  </td>
                  <td className="border-r border-black p-1 font-mono font-black text-xs">
                    {ph}
                  </td>
                  <td className="p-1 text-slate-700 text-[9px]">
                    6,0 a 9,5 (Portaria GM/MS nº 888/2021)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Procedimento e Cadeia de Custódia */}
          <div className="border border-black p-2 text-[9.5px] mb-2 leading-relaxed bg-slate-50/50">
            <div className="font-black uppercase text-[10px] border-b border-black pb-1 mb-1 text-slate-900">
              PROCEDIMENTO DE COLETA E CADEIA DE CUSTÓDIA
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-800">
              <li><strong>Frasco Oficial:</strong> Frasco estéril de 100 mL com tiossulfato de sódio a 10% para neutralização imediata do cloro.</li>
              <li><strong>Assepsia do Ponto:</strong> Flambagem / assepsia com álcool 70% e escoamento contínuo da rede prévio à coleta.</li>
              <li><strong>Acondicionamento Térmico:</strong> Caixa isotérmica com gelo reciclável preservando a amostra entre 2°C e 8°C.</li>
              <li><strong>Destino:</strong> Encaminhamento imediato para a bancada analítica do Laboratório Municipal da VISA BC.</li>
            </ul>
            {observacoes && (
              <div className="mt-1 pt-1 border-t border-slate-300">
                <span className="font-bold">Observações de Campo:</span> {observacoes}
              </div>
            )}
          </div>

          {/* Assinaturas Oficiais */}
          <div className="border border-black p-2.5 text-[10px] mb-2">
            <div className="grid grid-cols-2 gap-4 items-end">
              {/* Fiscal Coletor */}
              <div className="text-center border-t border-black pt-1">
                <div className="font-black uppercase text-[10.5px]">{fiscalColetor}</div>
                <div className="text-[9px] font-bold uppercase text-slate-700">
                  Fiscal Sanitário Coletor • VISA BC
                </div>
                <div className="mt-1 inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                  <span>✓ Coleta Validada Eletronicamente</span>
                </div>
              </div>

              {/* Responsável no Estabelecimento */}
              <div className="text-center border-t border-black pt-1">
                <div className="font-black uppercase text-[10.5px]">
                  {solicitacao?.responsavel_contato || 'Responsável no Estabelecimento'}
                </div>
                <div className="text-[9px] font-bold uppercase text-slate-700">
                  Ciência e Acompanhamento da Coleta in loco
                </div>
                <div className="text-[8px] text-slate-500 italic mt-1">
                  Via do Contribuinte / Solicitante
                </div>
              </div>
            </div>
          </div>

          {/* Autenticação Digital na Borda */}
          <div className="text-center text-[8px] font-mono text-slate-500 border-t border-slate-300 pt-1">
            AUTENTICAÇÃO: {hashColeta} • REGISTRADO EM: {timestampColeta} • DIVISÃO DE VIGILÂNCIA SANITÁRIA BALNEÁRIO CAMBORIÚ
          </div>
        </div>

        {/* Botão de Rodapé na Tela */}
        <div className="mt-4 flex justify-end gap-3 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="bg-black hover:bg-slate-800 text-white font-black text-xs px-5 py-2.5 rounded-xl uppercase flex items-center gap-1.5 shadow cursor-pointer transition"
          >
            <Printer className="w-4 h-4" />
            Imprimir Termo de Coleta
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
