import React, { useState } from 'react';
import {
  Printer,
  X,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Scale,
  ExternalLink,
  CheckCircle2,
  Lock,
  Building2,
  Calendar,
  UserCheck,
  QrCode,
  ArrowRight
} from 'lucide-react';
import { FiscalizacaoItem, UserProfile } from '../types';
import {
  INCISOS_ART_61_LEI_ESTADUAL_6320,
  INCISOS_ART_158_LCM_40_2019,
  DESCRICOES_ETAPAS_RITO
} from '../data/normativaSanitariaData';

interface RitoProcessualDocumentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  fiscalizacao: FiscalizacaoItem;
  currentUser: UserProfile | null;
  onOpenExternal: (url: string) => void;
}

export const RitoProcessualDocumentoModal: React.FC<RitoProcessualDocumentoModalProps> = ({
  isOpen,
  onClose,
  fiscalizacao: fisc,
  currentUser,
  onOpenExternal
}) => {
  const [visualizarRelatorioAnexo, setVisualizarRelatorioAnexo] = useState(true);
  const tipoAto = fisc.tipoAtoFiscal || 'INTIMACAO';
  const infoEtapa = DESCRICOES_ETAPAS_RITO[tipoAto] || DESCRICOES_ETAPAS_RITO.INTIMACAO;

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleEncaminhar1Doc = () => {
    onOpenExternal('https://bc.1doc.com.br/b.php?pg=o/login&n=3');
  };

  const incisosEstaduaisSelecionados = INCISOS_ART_61_LEI_ESTADUAL_6320.filter((inc) =>
    fisc.art61EstadualIncisos?.includes(inc.inciso)
  );

  const incisosMunicipaisSelecionados = INCISOS_ART_158_LCM_40_2019.filter((inc) =>
    fisc.art158MunicipalIncisos?.includes(inc.inciso)
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-3xl w-full max-w-4xl max-h-[96vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-slate-300 dark:border-slate-800 relative space-y-4 my-auto text-left">
        {/* Barra de Ações Superior (Oculta na Impressão) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
              {infoEtapa.numero}
            </span>
            <div>
              <div className="text-xs font-black uppercase text-slate-900 dark:text-white">
                {infoEtapa.titulo}
              </div>
              <div className="text-[11px] text-slate-500">
                Protocolo DVIS: <strong className="font-mono text-slate-700 dark:text-slate-300">{fisc.protocolo}</strong>
                {fisc.numProcesso && ` • Processo Vinculado: ${fisc.numProcesso}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleEncaminhar1Doc}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow active:scale-95"
              title="Encaminhar o processo à Direção da DVIS pelo 1Doc"
            >
              <span>Encaminhar via 1Doc</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Peça</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CORPO DO DOCUMENTO OFICIAL PARA IMPRESSÃO / SALVAR EM PDF      */}
        {/* ============================================================== */}
        <div
          id="printable-official-act"
          className="bg-white text-slate-900 p-8 sm:p-12 rounded-3xl border border-slate-300 shadow-xl max-w-4xl mx-auto space-y-6 font-serif print:p-0 print:border-none print:shadow-none"
        >
          {/* Cabeçalho Oficial com Brasão de Balneário Camboriú */}
          <div className="text-center border-b-2 border-slate-900 pb-5 space-y-1.5">
            <div className="flex justify-center items-center gap-5 mb-2">
              <img
                src="https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/brasao__1_-removebg-preview%20(1).avif"
                alt="Brasão Balneário Camboriú"
                className="h-16 w-auto object-contain"
              />
              <img
                src="https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/DVIS.2.avif"
                alt="DVIS"
                className="h-14 w-auto object-contain"
              />
            </div>
            <h1 className="text-sm font-black uppercase tracking-wider text-slate-900">
              ESTADO DE SANTA CATARINA • MUNICÍPIO DE BALNEÁRIO CAMBORIÚ
            </h1>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
              SECRETARIA MUNICIPAL DE SAÚDE • DIVISÃO DE VIGILÂNCIA SANITÁRIA E AMBIENTAL (DVIS)
            </h2>
            <div className="pt-2">
              <span className="inline-block bg-slate-900 text-white font-sans font-black text-xs px-4 py-1.5 uppercase tracking-widest rounded-lg">
                {tipoAto === 'ORIENTACAO' && 'TERMO DE ORIENTAÇÃO SANITÁRIA (AÇÃO EDUCATIVA)'}
                {tipoAto === 'INTIMACAO' && 'AUTO DE INTIMAÇÃO SANITÁRIA'}
                {tipoAto === 'INFRACAO' && 'AUTO DE INFRAÇÃO SANITÁRIA (INSTAURAÇÃO DE PAS)'}
                {tipoAto === 'MEDIDA_CAUTELAR' && 'AUTO DE INTIMAÇÃO DE MEDIDA CAUTELAR (PEÇA EXCLUSIVA)'}
                {tipoAto === 'IMPOSICAO_PENALIDADE' && 'AUTO DE IMPOSIÇÃO DE PENALIDADE (PAS)'}
                {' '} Nº {fisc.protocolo}
              </span>
            </div>
          </div>

          {/* 1. Qualificação Cadastral do Estabelecimento */}
          <div className="font-sans text-xs space-y-2 border-b border-slate-200 pb-4">
            <h3 className="font-black uppercase text-xs text-slate-800 tracking-wider">
              1. QUALIFICAÇÃO DO AUTUADO / NOTIFICADO
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <p><strong>NOME FANTASIA:</strong> {fisc.estabelecimento.nomeFantasia || 'NÃO INFORMADO'}</p>
              <p><strong>RAZÃO SOCIAL:</strong> {fisc.estabelecimento.razaoSocial}</p>
              <p><strong>CNPJ / CPF:</strong> <span className="font-mono">{fisc.estabelecimento.cnpjCpf}</span></p>
              <p><strong>RAMO / ATIVIDADE:</strong> {fisc.estabelecimento.tipo}</p>
              <p className="sm:col-span-2">
                <strong>ENDEREÇO:</strong> {fisc.estabelecimento.endereco}, {fisc.estabelecimento.numero} - {fisc.estabelecimento.bairro}, Balneário Camboriú / SC
              </p>
              <p><strong>RESPONSÁVEL NO ATO:</strong> {fisc.estabelecimento.responsavel}</p>
              <p><strong>DATA / HORA DO ATO:</strong> {fisc.dataHora}</p>
              {fisc.numProcesso && (
                <p className="sm:col-span-2 font-mono font-bold text-blue-900 bg-blue-50 p-1.5 rounded border border-blue-200">
                  PROCESSO SANITÁRIO VINCULADO: Nº {fisc.numProcesso}
                </p>
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* PEÇA ESPECÍFICA CONFORME O TIPO DE ATO FISCAL DA NORMATIVA     */}
          {/* ============================================================== */}

          {/* 🔹 ATO 1: TERMO DE ORIENTAÇÃO (EDUCATIVO) */}
          {tipoAto === 'ORIENTACAO' && (
            <div className="font-sans text-xs space-y-3">
              <h3 className="font-black uppercase text-xs text-blue-800 border-b border-slate-200 pb-1">
                2. TERMO DE ORIENTAÇÃO E CONSCIENTIZAÇÃO SANITÁRIA (AÇÃO PEDAGÓGICA)
              </h3>
              <p className="text-justify leading-relaxed">
                Em abordagem educativa inicial, a fiscalização sanitária prestou orientações técnicas ao responsável presente, visando à conscientização sobre as boas práticas sanitárias, com fulcro na discricionariedade fiscal e nas normas de saúde coletiva vigentes no Município de Balneário Camboriú.
              </p>
              <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 space-y-2">
                <p className="font-bold text-blue-900 uppercase text-[11px]">Orientações Técnicas Prestadas no Local:</p>
                <p className="whitespace-pre-wrap">{fisc.observacoesFiscais || 'Orientações sobre acondicionamento de alimentos, higiene de instalações e controle documental.'}</p>
              </div>
            </div>
          )}

          {/* 🔹 ATO 2: AUTO DE INTIMAÇÃO (PRAZO DE ADEQUAÇÃO) */}
          {tipoAto === 'INTIMACAO' && (
            <div className="font-sans text-xs space-y-3">
              <h3 className="font-black uppercase text-xs text-amber-800 border-b border-slate-200 pb-1">
                2. EXIGÊNCIAS SANITÁRIAS E PRAZO CONCEDIDO PARA ADEQUAÇÃO
              </h3>
              <p className="text-justify leading-relaxed">
                Fica o estabelecimento acima qualificado <strong>INTIMADO</strong> a cumprir as exigências sanitárias abaixo elencadas, no prazo improrrogável concedido, sob pena de lavratura de Auto de Infração e instauração do respectivo Procedimento Administrativo Sanitário (PAS), com fulcro no Código Sanitário Municipal:
              </p>

              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-300 space-y-2">
                <p className="font-bold text-amber-900 uppercase text-[11px]">Irregularidades a Adequar / Exigências Técnicas:</p>
                {fisc.irregularidadesEncontradas.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-amber-950 font-medium">
                    {fisc.irregularidadesEncontradas.map((ir, i) => (
                      <li key={i}>{ir}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{fisc.observacoesFiscais || 'Sanar pendências técnicas apontadas na vistoria.'}</p>
                )}

                <div className="mt-3 p-2 bg-white rounded-lg border border-amber-300 text-center">
                  <span className="font-black text-amber-900 uppercase">
                    PRAZO PARA CUMPRIMENTO: {fisc.prazoAdequacaoDias || 15} (QUINZE) DIAS CORRIDOS
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 🔹 ATO 3: AUTO DE INFRAÇÃO (INSTAURA O PAS - REQUISITOS OBRIGATÓRIOS) */}
          {tipoAto === 'INFRACAO' && (
            <div className="font-sans text-xs space-y-4">
              <h3 className="font-black uppercase text-xs text-red-800 border-b border-slate-200 pb-1">
                2. AUTO DE INFRAÇÃO SANITÁRIA (INSTAURAÇÃO DO PROCEDIMENTO ADMINISTRATIVO - PAS)
              </h3>

              {/* 3.1 & 3.2: Dispositivos Legais Obrigatórios */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-red-50 p-3 rounded-xl border border-red-200 space-y-1">
                  <p className="font-black text-red-900 uppercase text-[11px]">
                    3.1 LEI ESTADUAL Nº 6.320/1983 - ART. 61:
                  </p>
                  {incisosEstaduaisSelecionados.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-red-950 text-[11px]">
                      {incisosEstaduaisSelecionados.map((inc) => (
                        <li key={inc.inciso}>
                          <strong>{inc.rotulo}:</strong> {inc.descricaoCompleta}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-red-700 italic">Incisos aplicáveis do Art. 61 vinculados.</p>
                  )}
                </div>

                <div className="bg-red-50 p-3 rounded-xl border border-red-200 space-y-1">
                  <p className="font-black text-red-900 uppercase text-[11px]">
                    3.2 LEI COMPLEMENTAR MUNICIPAL Nº 40/2019 - ART. 158:
                  </p>
                  {incisosMunicipaisSelecionados.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-red-950 text-[11px]">
                      {incisosMunicipaisSelecionados.map((inc) => (
                        <li key={inc.inciso}>
                          <strong>{inc.rotulo}:</strong> {inc.descricaoCompleta}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-red-700 italic">Incisos do Art. 158 da LCM 40/2019 vinculados.</p>
                  )}
                </div>
              </div>

              {/* 3.3: Irregularidade Imputada ao Infrator (Estrita e Objetiva) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-300 space-y-1.5">
                <p className="font-black text-slate-800 uppercase text-[11px]">
                  3.3 IRREGULARIDADE OBJETIVA IMPUTADA AO INFRATOR:
                </p>
                <p className="p-2.5 bg-white rounded border border-slate-300 font-semibold text-slate-900">
                  {fisc.irregularidadeImputada || fisc.irregularidadesEncontradas.join('; ') || 'Infração sanitária tipificada nos artigos supramencionados.'}
                </p>
                <p className="text-[10px] text-slate-500 italic">
                  * Descrição restrita à irregularidade em si, em estrita observância à determinação processual da DVIS.
                </p>
              </div>

              {/* 3.4: Auto de Intimação Anterior para Obrigação Subsistente */}
              {fisc.autoIntimacaoAnterior && (
                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px]">
                  <strong>3.4 OBRIGAÇÃO SUBSISTENTE:</strong> Vinculada ao Auto de Intimação nº <strong>{fisc.autoIntimacaoAnterior}</strong>, cujo prazo expirou sem comprovação da regularização sanitária devida.
                </div>
              )}

              {/* Advertência de Ampla Defesa (15 dias) */}
              <div className="p-3 bg-red-100/60 rounded-xl border border-red-300 text-center font-bold text-red-900">
                Fica o autuado ciente de que tem o prazo de 15 (quinze) dias corridos para apresentar Defesa Prévia perante a Divisão de Vigilância Sanitária (DVIS), via 1Doc ou presencialmente.
              </div>
            </div>
          )}

          {/* 🔹 ATO 4: MEDIDA CAUTELAR (PEÇA EXCLUSIVA) */}
          {tipoAto === 'MEDIDA_CAUTELAR' && (
            <div className="font-sans text-xs space-y-4">
              <h3 className="font-black uppercase text-xs text-purple-800 border-b border-slate-200 pb-1">
                2. AUTO DE INTIMAÇÃO DE MEDIDA CAUTELAR (PEÇA EXCLUSIVA)
              </h3>
              <p className="text-justify leading-relaxed">
                Diante do risco iminente à saúde pública e com fulcro no poder de polícia sanitária, determina-se a aplicação da seguinte <strong>MEDIDA CAUTELAR</strong> com imediata instauração do Procedimento Administrativo Sanitário (PAS) para garantia do contraditório e da ampla defesa:
              </p>

              <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-300 space-y-2">
                <p className="font-black text-purple-900 uppercase">
                  TIPO DE MEDIDA CAUTELAR: {fisc.cautelarTipo || 'INTERDIÇÃO PARCIAL / APREENSÃO'}
                </p>

                {/* Qualificação dos Itens, Produtos, Equipamentos e Lacres */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px] bg-white rounded border border-purple-200">
                    <thead>
                      <tr className="bg-purple-100 text-purple-900 font-bold border-b border-purple-200">
                        <th className="p-2">Item / Descrição</th>
                        <th className="p-2">Qtd / Peso</th>
                        <th className="p-2">Lote / Validade</th>
                        <th className="p-2">Nº do Lacre Aposto</th>
                        <th className="p-2">Local de Custódia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fisc.cautelarItensQualificacao && fisc.cautelarItensQualificacao.length > 0 ? (
                        fisc.cautelarItensQualificacao.map((it, idx) => (
                          <tr key={idx} className="border-b border-purple-100">
                            <td className="p-2 font-bold">{it.descricao}</td>
                            <td className="p-2">{it.quantidade}</td>
                            <td className="p-2">{it.lote || '-'} / {it.validade || '-'}</td>
                            <td className="p-2 font-mono font-bold text-red-600">{it.lacreNumero || 'LACRE APOSTO'}</td>
                            <td className="p-2">{it.localCustodia || 'Depósito do Estabelecimento'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-3 text-center text-slate-500">
                            Produtos e equipamentos qualificados e interditados cautelarmente conforme termo apenso.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-2 bg-white rounded border border-purple-200 text-[11px]">
                  <strong>FIEL DEPOSITÁRIO NOMEADO:</strong> {fisc.cautelarFielDepositario?.nome || fisc.estabelecimento.responsavel} (CPF: {fisc.cautelarFielDepositario?.cpf || fisc.estabelecimento.cnpjCpf}), advertido das sanções civis e penais decorrentes do descumprimento ou violação dos lacres.
                </div>
              </div>
            </div>
          )}

          {/* 🔹 ATO 5: AUTO DE IMPOSIÇÃO DE PENALIDADE (AUTORIDADE SANITÁRIA) */}
          {tipoAto === 'IMPOSICAO_PENALIDADE' && (
            <div className="font-sans text-xs space-y-4">
              <h3 className="font-black uppercase text-xs text-slate-800 border-b border-slate-200 pb-1">
                2. DECISÃO DE JULGAMENTO DO PAS E IMPOSIÇÃO DE PENALIDADE
              </h3>
              <p className="text-justify leading-relaxed">
                A <strong>AUTORIDADE DE VIGILÂNCIA SANITÁRIA DO MUNICÍPIO DE BALNEÁRIO CAMBORIÚ</strong>, após instrução processual do PAS nº <strong>{fisc.pasVinculado || fisc.protocolo}</strong> e transcurso dos prazos de defesa, profere decisão administrativa julgando <strong>PROCEDENTE</strong> o Auto de Infração, com aplicação das seguintes sanções:
              </p>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 uppercase">PENALIDADE APLICADA:</span>
                  <span className="px-3 py-1 bg-red-600 text-white font-black rounded-lg uppercase">
                    {fisc.penalidadeTipo || 'MULTA PECUNIÁRIA'}
                  </span>
                </div>
                {fisc.penalidadeValorMulta && (
                  <p><strong>VALOR DA MULTA:</strong> {fisc.penalidadeValorMulta}</p>
                )}
                <p><strong>FUNDAMENTAÇÃO DECISÓRIA:</strong> {fisc.penalidadeFundamentacao || 'Comprovada a infração sanitária sem apresentação de excludentes de ilicitude.'}</p>
                <p className="text-[11px] text-slate-500">
                  Cópia desta decisão é fornecida ao infrator para ciência, cabendo Recurso à Diretoria no prazo legal de 30 (trinta) dias.
                </p>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* COMPROVANTE DE ENTREGA PRESENCIAL (OBRIGATÓRIO PELA NORMATIVA) */}
          {/* ============================================================== */}
          <div className="font-sans text-xs space-y-3 border-t-2 border-slate-300 pt-5">
            <h3 className="font-black uppercase text-xs text-slate-800 tracking-wider">
              3. COMPROVAÇÃO DE ENTREGA PRESENCIAL / RECIBO DE CIÊNCIA
            </h3>

            {fisc.entregaTipo === 'RECUSA_TESTEMUNHAS' ? (
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-300 space-y-3">
                <p className="font-black text-amber-900 uppercase text-xs">
                  CERTIDÃO DE RECUSA DE ASSINATURA PRESENCIAL
                </p>
                <p className="text-justify text-[11px] text-amber-950">
                  Certifico que entreguei cópia do presente Auto presencialmente ao responsável pelo estabelecimento, o qual se <strong>RECUSOU A ASSINAR</strong> o recibo de ciência. Diante disso, colhi a assinatura de duas testemunhas presentes no ato, conforme determinação legal:
                </p>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-amber-200">
                  <div className="border-t border-slate-900 pt-1 text-center">
                    <p className="font-bold">{fisc.recusaTestemunha1?.nome || 'Testemunha 1'}</p>
                    <p className="text-[10px] text-slate-500">CPF: {fisc.recusaTestemunha1?.cpf || '___.___.___-__'}</p>
                  </div>
                  <div className="border-t border-slate-900 pt-1 text-center">
                    <p className="font-bold">{fisc.recusaTestemunha2?.nome || 'Testemunha 2'}</p>
                    <p className="text-[10px] text-slate-500">CPF: {fisc.recusaTestemunha2?.cpf || '___.___.___-__'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <p className="text-[11px] text-slate-700">
                  Declaro que recebi presencialmente uma via deste documento oficial, tomando ciência inequívoca de todo o seu teor e dos prazos legais nele estabelecidos:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                  <div>
                    <p><strong>NOME DO RECEBEDOR:</strong> {fisc.recebidoPorNome || fisc.estabelecimento.responsavel}</p>
                    <p><strong>CPF DO RECEBEDOR:</strong> {fisc.recebidoPorCpf || fisc.estabelecimento.cnpjCpf}</p>
                    <p><strong>DATA E HORA DO RECEBIMENTO:</strong> {fisc.dataHora}</p>
                  </div>
                  <div className="border-t sm:border-t-0 sm:border-l border-slate-300 pt-2 sm:pt-0 sm:pl-4 text-center flex flex-col justify-end">
                    <div className="border-t border-slate-900 pt-1">
                      <p className="font-black text-xs uppercase">{fisc.assinaturaResponsavel || fisc.estabelecimento.responsavel}</p>
                      <p className="text-[10px] text-slate-500">Assinatura do Notificado / Responsável</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Assinatura da Autoridade Fiscalizadora */}
          <div className="font-sans pt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 text-center text-xs">
            <div className="border-t border-slate-900 pt-2">
              <p className="font-black uppercase text-slate-900">{fisc.fiscalNome}</p>
              <p className="text-slate-600 text-[10px]">Fiscal de Vigilância Sanitária • DVIS/BC</p>
              <p className="text-slate-400 text-[9px]">Matrícula / Identificação Funcional Oficial</p>
            </div>

            <div className="flex items-center justify-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <QrCode className="w-10 h-10 text-slate-800 shrink-0" />
              <div className="text-left text-[9px] font-mono leading-tight text-slate-600">
                <div className="font-bold text-slate-900">VALIDAÇÃO ELETRÔNICA</div>
                <div>AUTORIDADE SANITÁRIA</div>
                <div>DVIS-BC • {fisc.protocolo}</div>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* PEÇA 3.5 ANEXA: RELATÓRIO DE INSPEÇÃO CIRCUNSTANCIADO          */}
          {/* ============================================================== */}
          {tipoAto === 'INFRACAO' && (
            <div className="mt-10 pt-8 border-t-4 border-double border-slate-400 space-y-4 page-break-before">
              <div className="text-center space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                  PEÇA COMPLEMENTAR OBRIGATÓRIA (ITEM 3.5 DA DETERMINAÇÃO)
                </span>
                <h3 className="text-sm font-black uppercase text-slate-900 mt-2">
                  RELATÓRIO DE INSPEÇÃO SANITÁRIA CIRCUNSTANCIADO
                </h3>
                <p className="text-[11px] text-slate-500">
                  Apenso ao Auto de Infração Sanitária nº {fisc.protocolo}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs leading-relaxed">
                <div>
                  <strong className="text-slate-800 uppercase block mb-1">1. Descrição Circunstanciada dos Fatos e Ação Fiscal:</strong>
                  <p className="bg-white p-3 rounded border border-slate-200 whitespace-pre-wrap">
                    {fisc.relatorioCircunstanciado?.fatosOcorridos || fisc.observacoesFiscais || 'Em vistoria fiscal no estabelecimento supracitado, constatou-se a materialidade da infração sanitária descrita no Auto de Infração.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded border border-slate-200">
                    <strong className="text-slate-700 block text-[11px]">Conduta do Autuado no Ato:</strong>
                    <span className="font-bold text-slate-900 uppercase">
                      {fisc.relatorioCircunstanciado?.comportamentoAutuado === 'DIFICULTOU'
                        ? '⚠️ Dificultou ou embaraçou a ação fiscal'
                        : fisc.relatorioCircunstanciado?.comportamentoAutuado === 'COOPERATIVO'
                        ? '✓ Cooperativo e prestativo'
                        : 'Neutro'}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded border border-slate-200">
                    <strong className="text-slate-700 block text-[11px]">Compromisso de Saneamento Imediato:</strong>
                    <span className="font-bold text-slate-900">
                      {fisc.relatorioCircunstanciado?.comprometeuSanar
                        ? 'SIM - Comprometeu-se a sanar a irregularidade'
                        : 'NÃO houve compromisso formal imediato'}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-3 flex justify-between items-center text-[10px] text-slate-500">
                  <span>Relatório subscrito pelo Fiscal de Vigilância Sanitária em {fisc.dataHora}</span>
                  <span>DVIS • Balneário Camboriú / SC</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
