import React from 'react';
import { X, Printer, Download, MapPin, Thermometer, ShieldCheck, Bug, Calendar, User, FileText } from 'lucide-react';
import { CcpuOcorrenciaItem } from '../../types';

interface CcpuRelatorioOficialModalProps {
  ocorrencia: CcpuOcorrenciaItem | null;
  onClose: () => void;
}

export const CcpuRelatorioOficialModal: React.FC<CcpuRelatorioOficialModalProps> = ({
  ocorrencia,
  onClose
}) => {
  if (!ocorrencia) return null;

  const handlePrint = () => {
    window.print();
  };

  const getPragaNome = (tipo: string) => {
    switch (tipo) {
      case 'ESCORPIAO': return 'Escorpião (Aracnídeo)';
      case 'RATO': return 'Roedor / Rato';
      case 'BARATA': return 'Barata / Barata de Esgoto';
      case 'ESPOROTRICOSE': return 'Esporotricose Zoonótica';
      case 'POMBO': return 'Pombo Urbano (Aves Sinantrópicas)';
      case 'FORMIGA': return 'Formiga Urbana';
      default: return tipo;
    }
  };

  const getLocalNome = (tipo: string) => {
    switch (tipo) {
      case 'BUEIRO_BOCA_LOBO': return 'Bueiro / Boca de Lobo';
      case 'CAIXA_INSPECAO': return 'Caixa de Inspeção Pluvial/Esgoto';
      case 'GALERIA_ESGOTO': return 'Galeria Pluvial Subterrânea';
      case 'RESIDENCIA': return 'Residência Unifamiliar/Edifício';
      case 'COMERCIO': return 'Estabelecimento Comercial';
      case 'TERRENO_BALDIO': return 'Terreno Baldio';
      case 'VIA_PUBLICA': return 'Via Pública / Calçada';
      case 'ESCOLA_CRECHE': return 'Escola / Creche';
      case 'UNIDADE_SAUDE': return 'Unidade de Saúde';
      default: return tipo;
    }
  };

  const dataFormatada = new Date(ocorrencia.dataHora).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:rounded-none">
        {/* Barra superior de ações (oculta na impressão) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm tracking-wide">
              Relatório Oficial de Coleta e Monitoramento CCPU
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition cursor-pointer shadow-sm active:scale-95"
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

        {/* Corpo do Laudo / Relatório Oficial A4 */}
        <div className="p-8 sm:p-12 overflow-y-auto space-y-6 text-left print:p-8">
          {/* Cabeçalho Institucional Oficial */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row items-center justify-between gap-4">
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
                <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Estado de Santa Catarina • Município de Balneário Camboriú
                </p>
                <h1 className="text-base sm:text-lg font-black uppercase text-slate-950 leading-tight">
                  Secretaria Municipal de Saúde • Diretoria de Vigilância Sanitária e Ambiental
                </h1>
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                  CCPU • Centro de Controle de Pragas Urbanas e Zoonoses
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  Av. Palestina, 150 - Bairro das Nações • Fone: (47) 3267-7000 • Balneário Camboriú/SC
                </p>
              </div>
            </div>

            <div className="text-right border border-slate-300 rounded-xl p-3 bg-slate-50 shrink-0 text-center sm:text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Nº Protocolo Oficial</span>
              <span className="text-base font-black text-slate-900 tracking-wider font-mono">
                {ocorrencia.protocolo}
              </span>
              <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                STATUS: {ocorrencia.statusOcorrencia}
              </span>
            </div>
          </div>

          {/* Título do Documento */}
          <div className="text-center py-2 bg-slate-100 rounded-lg border border-slate-200">
            <h2 className="text-sm sm:text-base font-black uppercase text-slate-900 tracking-wide">
              LAUDO TÉCNICO DE COLETA E VISTORIA ENTOMOLÓGICA / ZOONÓTICA
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Vigilância Ativa de Vetores e Sinantrópicos Urbanos • Balneário Camboriú
            </p>
          </div>

          {/* Grid de Informações Básicas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-500 uppercase text-[10px] block">Praga Alvo</span>
              <p className="font-black text-slate-900 text-sm">{getPragaNome(ocorrencia.tipoPraga)}</p>
              <p className="text-slate-600 italic text-[11px]">{ocorrencia.subtipoEspecie}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-500 uppercase text-[10px] block">Data e Hora da Coleta</span>
              <p className="font-black text-slate-900 text-sm">{dataFormatada}</p>
              <p className="text-slate-600 text-[11px]">Registro em Tempo Real</p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
              <span className="font-bold text-amber-800 uppercase text-[10px] block flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                Temperatura & Clima no Momento
              </span>
              <p className="font-black text-amber-950 text-base">{ocorrencia.temperatura}°C</p>
              <p className="text-amber-800 text-[11px] font-medium">
                {ocorrencia.condicaoClima} {ocorrencia.umidadeRelativa ? `• Umidade: ${ocorrencia.umidadeRelativa}%` : ''}
              </p>
              <p className="text-[10px] text-amber-700">Fonte: {ocorrencia.fonteTemperatura}</p>
            </div>
          </div>

          {/* Detalhes de Localização do Bueiro / Endereço */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <MapPin className="w-4 h-4 text-rose-600" />
              <span>1. Georreferenciamento e Identificação do Ponto / Bueiro</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="font-bold text-slate-500 text-[10px] uppercase block">Logradouro / Endereço</span>
                <span className="font-semibold text-slate-800">{ocorrencia.endereco}, {ocorrencia.numero || 'S/N'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 text-[10px] uppercase block">Bairro de Balneário Camboriú</span>
                <span className="font-semibold text-slate-800">{ocorrencia.bairro}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 text-[10px] uppercase block">Tipo de Local</span>
                <span className="font-semibold text-slate-800">{getLocalNome(ocorrencia.tipoLocal)}</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 block text-[11px] mb-0.5">Identificação Específica do Bueiro / Local Coletado:</span>
              <p className="font-black text-slate-900 font-mono text-xs">{ocorrencia.identificacaoBueiroLocal}</p>
              <p className="text-[10px] text-slate-500 mt-1">
                Coordenadas Geográficas GPS: <span className="font-mono font-bold text-slate-700">{ocorrencia.lat.toFixed(5)}, {ocorrencia.lng.toFixed(5)}</span>
              </p>
            </div>

            {ocorrencia.condicaoEstrutural && (
              <div className="text-xs">
                <span className="font-bold text-slate-600 block text-[10px] uppercase">Condição Estrutural do Bueiro/Grelha:</span>
                <p className="text-slate-800 mt-0.5">{ocorrencia.condicaoEstrutural}</p>
              </div>
            )}
          </div>

          {/* Dados Entomológicos e Coleta */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Bug className="w-4 h-4 text-amber-600" />
              <span>2. Dados da Captura, Espécimes e Ação</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="font-bold text-slate-500 text-[10px] uppercase block">Quantidade Registrada</span>
                <span className="font-black text-slate-900 text-base">{ocorrencia.quantidade} {ocorrencia.quantidade === 1 ? 'indivíduo' : 'indivíduos'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 text-[10px] uppercase block">Estado do Espécime</span>
                <span className="font-semibold text-slate-800">{ocorrencia.statusEspecime}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 text-[10px] uppercase block">Método de Captura / Controle</span>
                <span className="font-semibold text-slate-800">{ocorrencia.metodoColetaAcao}</span>
              </div>
            </div>

            {ocorrencia.fatoresAtrativos && ocorrencia.fatoresAtrativos.length > 0 && (
              <div className="text-xs">
                <span className="font-bold text-slate-600 block text-[10px] uppercase mb-1">Fatores Atrativos Identificados no Ponto:</span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-700 text-[11px]">
                  {ocorrencia.fatoresAtrativos.map((fator, idx) => (
                    <li key={idx}>{fator}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Medidas Adotadas e Observações Técnicas */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>3. Medidas Sanitárias e Encaminhamentos</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <span className="font-bold text-slate-700 block text-[11px]">Medidas Executadas In Loco:</span>
                <p className="text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                  {ocorrencia.medidasAdotadas || 'Nenhuma medida adicional necessária no momento.'}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-700 block text-[11px]">Parecer Técnico e Observações:</span>
                <p className="text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                  {ocorrencia.observacoes || 'Sem observações adicionais.'}
                </p>
              </div>

              {ocorrencia.notificacaoEmitida && (
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 font-semibold text-xs">
                  ⚠️ Notificação Sanitária Emitida: {ocorrencia.numeroNotificacao || 'Nº em registro'}
                </div>
              )}
            </div>
          </div>

          {/* Assinatura e Autenticação Oficial */}
          <div className="pt-6 border-t-2 border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
            <div className="text-xs space-y-1">
              <span className="font-bold text-slate-500 uppercase text-[10px] block">Servidor Responsável pelo Laudo</span>
              <p className="font-black text-slate-900 text-sm">{ocorrencia.servidorResponsavel}</p>
              {ocorrencia.matriculaServidor && (
                <p className="text-slate-600 font-mono text-[11px]">Matrícula Funcional: {ocorrencia.matriculaServidor}</p>
              )}
              <p className="text-[10px] text-slate-400 font-mono">
                Hash de Autenticação Digital: {Math.random().toString(36).substring(2, 10).toUpperCase()}-CCPU-BC
              </p>
            </div>

            <div className="border-t border-slate-400 pt-2 text-center text-xs">
              <p className="font-black text-slate-900">{ocorrencia.servidorResponsavel}</p>
              <p className="text-slate-500 text-[11px]">Vigilância Sanitária e Ambiental • CCPU BC</p>
              <p className="text-[10px] text-slate-400">Documento gerado eletronicamente pelo Sistema Oficial VISA-BC</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
