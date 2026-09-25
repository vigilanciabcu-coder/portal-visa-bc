import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Building2,
  FileCheck2,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileText,
  Printer,
  Copy,
  Check,
  Calendar,
  Home,
  MapPin,
  ShieldCheck,
  Phone,
  Mail,
  HelpCircle,
  Hash,
  Send,
  Layers,
  Info
} from 'lucide-react';
import { UserProfile } from '../types';
import { saveHabiteSeToSupabase, isSupabaseConfigured } from '../lib/supabaseService';

export interface HabiteSeFormData {
  numeroDocumento: string;
  tipoPeticao: 'TOTAL' | 'PARCIAL' | 'ACRESCIMO' | 'SEGUNDA_VIA';
  tipoTitular: 'PF' | 'PJ';
  titularDoc: string;
  titularNome: string;
  titularTelefone: string;
  titularEmail: string;
  rtTipo: 'PF' | 'PJ';
  rtDoc: string;
  rtNome: string;
  rtRegistroProfissional: string;
  rtTelefone: string;
  rtEmail: string;
  usoResidencial: boolean;
  areaResidencial: string;
  usoComercial: boolean;
  areaComercial: string;
  nomeEdificacao: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipioEstado: string;
  pontoReferencia: string;
  numeroDic: string;
  declaracaoCiencia: boolean;
  alvaraConstrucaoNome: string;
  documentosComplementaresNome: string;
  atendimentoPrioritario: string;
  comprovantePrioridadeNome: string;
}

interface HabiteSeSanitarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  empresaPadrao?: {
    cnpj_cpf?: string;
    razao_social?: string;
    endereco?: string;
    bairro?: string;
  } | null;
  onProtocolarSuccess?: (protocolo: string, dados: HabiteSeFormData) => void;
}

const BAIRROS_BC = [
  'Centro',
  'Pioneiros',
  'Nações',
  'Barra',
  'Praia dos Amores',
  'Ariribá',
  'Vila Real',
  'Municípios',
  'Estados',
  'Iate Clube',
  'Nova Esperança',
  'São Judas Tadeu',
  'Fazenda',
  'Taquaras',
  'Laranjeiras',
  'Estaleiro',
  'Estaleirinho',
  'Praia de Taquaras',
  'Canto do Morcego'
];

// 📋 8 OPÇÕES OFICIAIS DE ATENDIMENTO PRIORITÁRIO (LEI Nº 10.048/2000 E ESTATUTO DA PESSOA IDOSA)
export const OPCOES_ATENDIMENTO_PRIORITARIO = [
  {
    id: 'NAO_POSSUI',
    label: 'Não possuo direito a atendimento prioritário',
    exigeComprovante: false
  },
  {
    id: 'IDOSO_60',
    label: 'Pessoa Idosa (60 anos ou mais)',
    exigeComprovante: true,
    documentoSugerido: 'RG / CNH com foto'
  },
  {
    id: 'IDOSO_80',
    label: 'Pessoa Idosa com 80 anos ou mais (Prioridade Especial)',
    exigeComprovante: true,
    documentoSugerido: 'RG / CNH com foto'
  },
  {
    id: 'PCD',
    label: 'Pessoa com Deficiência (PCD)',
    exigeComprovante: true,
    documentoSugerido: 'Laudo médico ou carteira PCD'
  },
  {
    id: 'TEA',
    label: 'Pessoa com Transtorno do Espectro Autista (TEA)',
    exigeComprovante: true,
    documentoSugerido: 'Ciptea ou Laudo Médico com CID'
  },
  {
    id: 'GESTANTE',
    label: 'Gestante',
    exigeComprovante: true,
    documentoSugerido: 'Carteira de pré-natal ou laudo médico'
  },
  {
    id: 'LACTANTE_COLO',
    label: 'Lactante ou Pessoa com Criança de Colo',
    exigeComprovante: true,
    documentoSugerido: 'Certidão da criança ou declaração médica'
  },
  {
    id: 'MOBILIDADE_REDUZIDA',
    label: 'Pessoa com Mobilidade Reduzida ou Ostomizada',
    exigeComprovante: true,
    documentoSugerido: 'Laudo médico comprobatório'
  }
];

// 🔢 GERADOR SEQUENCIAL OFICIAL PERSISTENTE (NUNCA GERA DOIS NÚMEROS IGUAIS)
// NA VIRADA DO ANO, REINICIA COM O PRIMEIRO NÚMERO 1 E ATUALIZA O ANO PARA NOVOS DOCUMENTOS
const SEQ_COUNTER_KEY = 'visa_habite_se_sequencial_counter';
const SEQ_ANO_KEY = 'visa_habite_se_ano';
const INITIAL_SEQ_2026 = 49906;

export const getNextNumeroHabiteSeSequencial = (): string => {
  const anoAtual = new Date().getFullYear();
  let currentSeq = INITIAL_SEQ_2026;
  let storedAno = 2026;

  try {
    const anoStr = localStorage.getItem(SEQ_ANO_KEY);
    if (anoStr) {
      storedAno = parseInt(anoStr, 10);
    }
    // Virada do ano: reinicia com o primeiro número 1 apenas para novos documentos
    if (anoAtual > storedAno) {
      currentSeq = 1;
      localStorage.setItem(SEQ_ANO_KEY, anoAtual.toString());
      localStorage.setItem(SEQ_COUNTER_KEY, '1');
      return `1/${anoAtual}`;
    }

    const stored = localStorage.getItem(SEQ_COUNTER_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= 1) {
        currentSeq = parsed;
      }
    } else {
      localStorage.setItem(SEQ_COUNTER_KEY, currentSeq.toString());
      localStorage.setItem(SEQ_ANO_KEY, anoAtual.toString());
    }
  } catch {
    currentSeq = anoAtual > 2026 ? 1 : INITIAL_SEQ_2026;
  }
  return `${currentSeq.toLocaleString('pt-BR')}/${anoAtual}`;
};

export const commitAndAdvanceNumeroHabiteSe = (): string => {
  const anoAtual = new Date().getFullYear();
  let nextSeq = 2;
  let currentSeq = INITIAL_SEQ_2026;
  let storedAno = 2026;

  try {
    const anoStr = localStorage.getItem(SEQ_ANO_KEY);
    if (anoStr) {
      storedAno = parseInt(anoStr, 10);
    }

    if (anoAtual > storedAno) {
      // Virada do ano: o documento atual é o 1, o próximo para novo documento será o 2
      localStorage.setItem(SEQ_ANO_KEY, anoAtual.toString());
      localStorage.setItem(SEQ_COUNTER_KEY, '2');
      return `1/${anoAtual}`;
    }

    const stored = localStorage.getItem(SEQ_COUNTER_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= 1) {
        currentSeq = parsed;
      }
    }
    nextSeq = currentSeq + 1;
    localStorage.setItem(SEQ_COUNTER_KEY, nextSeq.toString());
    localStorage.setItem(SEQ_ANO_KEY, anoAtual.toString());
  } catch (err) {
    console.warn('Erro ao avançar sequencial de Habite-se:', err);
  }
  return `${currentSeq.toLocaleString('pt-BR')}/${anoAtual}`;
};

export const HabiteSeSanitarioModal: React.FC<HabiteSeSanitarioModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  empresaPadrao,
  onProtocolarSuccess
}) => {
  const [formData, setFormData] = useState<HabiteSeFormData>(() => ({
    numeroDocumento: getNextNumeroHabiteSeSequencial(),
    tipoPeticao: 'TOTAL',
    tipoTitular: 'PJ',
    titularDoc: '',
    titularNome: '',
    titularTelefone: '',
    titularEmail: '',
    rtTipo: 'PF',
    rtDoc: '',
    rtNome: '',
    rtRegistroProfissional: '',
    rtTelefone: '',
    rtEmail: '',
    usoResidencial: true,
    areaResidencial: '',
    usoComercial: false,
    areaComercial: '',
    nomeEdificacao: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: 'Centro',
    municipioEstado: 'Balneário Camboriú / SC',
    pontoReferencia: '',
    numeroDic: '',
    declaracaoCiencia: false,
    alvaraConstrucaoNome: '',
    documentosComplementaresNome: '',
    atendimentoPrioritario: 'NAO_POSSUI',
    comprovantePrioridadeNome: ''
  }));

  const [erros, setErros] = useState<string[]>([]);
  const [protocoloGerado, setProtocoloGerado] = useState<string | null>(null);
  const [dataHoraEnvio, setDataHoraEnvio] = useState<string>('');
  const [copiado, setCopiado] = useState(false);
  const [carregandoNumero, setCarregandoNumero] = useState(false);

  // Ref para garantir inicialização única apenas no momento em que o modal abre
  // Evita reloads automáticos e impede qualquer perda de seleção em "Estou Ciente" ou "Atendimento Prioritário"
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      if (!isInitializedRef.current) {
        isInitializedRef.current = true;
        const docInicial = empresaPadrao?.cnpj_cpf || currentUser?.cpf || '';
        const nomeInicial = empresaPadrao?.razao_social || currentUser?.nome_completo || '';
        const isCnpj = docInicial.replace(/\D/g, '').length === 14 || docInicial.includes('/');
        const numSequencialLocal = getNextNumeroHabiteSeSequencial();

        setFormData((prev) => ({
          ...prev,
          numeroDocumento: numSequencialLocal,
          tipoTitular: isCnpj ? 'PJ' : 'PF',
          titularDoc: docInicial,
          titularNome: nomeInicial,
          titularTelefone: currentUser?.telefone || '',
          titularEmail: currentUser?.email || '',
          rua: empresaPadrao?.endereco || currentUser?.endereco || '',
          bairro: empresaPadrao?.bairro || currentUser?.bairro || 'Centro',
          declaracaoCiencia: false,
          alvaraConstrucaoNome: '',
          atendimentoPrioritario: 'NAO_POSSUI',
          comprovantePrioridadeNome: ''
        }));
        setErros([]);
        setProtocoloGerado(null);

        // Busca o número sequencial oficial único na abertura sem dar reload no formulário
        fetch('/api/habite-se/proximo-numero')
          .then(async (res) => {
            const ct = res.headers.get('content-type') || '';
            if (res.ok && ct.includes('application/json')) {
              const data = await res.json();
              if (data?.numeroDocumento) {
                setFormData((prev) => ({
                  ...prev,
                  numeroDocumento: data.numeroDocumento
                }));
              }
            }
          })
          .catch((err) => {
            console.warn('Sequencial oficial mantido localmente:', err);
          });
      }
    } else {
      isInitializedRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Formatação de documento (CPF ou CNPJ)
  const formatarCpfCnpj = (valor: string) => {
    const apenasDigitos = valor.replace(/\D/g, '');
    if (apenasDigitos.length <= 11) {
      // CPF: 000.000.000-00
      return apenasDigitos
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    // CNPJ: 00.000.000/0000-00
    return apenasDigitos
      .slice(0, 14)
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  };

  const handleCopy = (texto: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const handlePrint = () => {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const protocoloFinal = protocoloGerado || formData.numeroDocumento || 'HAB-2026/PROCESSO';
    const dataHoraFinal = dataHoraEnvio || new Date().toLocaleString('pt-BR');
    const enderecoCompleto = [
      formData.rua && `${formData.rua}, nº ${formData.numero || 'S/N'}`,
      formData.complemento && `(${formData.complemento})`,
      formData.bairro,
      formData.municipioEstado || 'Balneário Camboriú / SC'
    ].filter(Boolean).join(' - ');

    const prioridadeLabel = OPCOES_ATENDIMENTO_PRIORITARIO.find(o => o.id === formData.atendimentoPrioritario)?.label || '';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Habite-se Sanitário - ${protocoloFinal}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 10pt;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .brasao-txt {
            font-size: 11pt;
            font-weight: 900;
            text-transform: uppercase;
            color: #1e3a8a;
            letter-spacing: 0.5px;
            margin: 0;
          }
          .secretaria-txt {
            font-size: 9pt;
            font-weight: 700;
            text-transform: uppercase;
            color: #334155;
            margin: 2px 0;
          }
          .divisao-txt {
            font-size: 8pt;
            font-weight: 600;
            color: #64748b;
            margin: 0;
          }
          .doc-badge {
            display: inline-block;
            margin-top: 6px;
            padding: 4px 14px;
            background: #1e3a8a;
            color: #ffffff;
            font-size: 10pt;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-radius: 4px;
          }
          .protocol-card {
            background: #f8fafc;
            border: 1.5px solid #cbd5e1;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .protocol-number {
            font-size: 14pt;
            font-weight: 900;
            font-family: monospace;
            color: #1e3a8a;
          }
          .protocol-date {
            font-size: 8.5pt;
            color: #475569;
            text-align: right;
          }
          .section-header {
            background: #f1f5f9;
            border-left: 4px solid #1e3a8a;
            padding: 4px 8px;
            font-size: 8.5pt;
            font-weight: 900;
            text-transform: uppercase;
            color: #1e293b;
            margin-top: 10px;
            margin-bottom: 6px;
            letter-spacing: 0.5px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px 14px;
            margin-bottom: 6px;
          }
          .col-span-2 {
            grid-column: span 2;
          }
          .field-label {
            display: block;
            font-size: 7.5pt;
            font-weight: 800;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 1px;
          }
          .field-val {
            font-weight: 700;
            color: #0f172a;
          }
          .notice-box {
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-left: 4px solid #d97706;
            border-radius: 4px;
            padding: 8px 12px;
            font-size: 8pt;
            color: #92400e;
            margin: 12px 0;
            line-height: 1.35;
          }
          .signatures {
            margin-top: 30px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            text-align: center;
            page-break-inside: avoid;
          }
          .sig-box {
            border-top: 1px solid #475569;
            padding-top: 4px;
            margin-top: 40px;
          }
          .sig-title {
            font-size: 8.5pt;
            font-weight: 800;
            text-transform: uppercase;
            color: #1e293b;
          }
          .sig-sub {
            font-size: 7.5pt;
            color: #64748b;
          }
          .footer {
            margin-top: 22px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 8px;
            text-align: center;
            font-size: 7pt;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <p class="brasao-txt">MUNICÍPIO DE BALNEÁRIO CAMBORIÚ</p>
          <p class="secretaria-txt">Secretaria Municipal de Saúde • Divisão de Vigilância Sanitária (DVIS)</p>
          <p class="divisao-txt">Fiscalização Sanitária de Obras e Engenharia • Lei Complementar nº 40/2019</p>
          <div class="doc-badge">REQUERIMENTO DE HABITE-SE SANITÁRIO</div>
        </div>

        <div class="protocol-card">
          <div>
            <span class="field-label">Número do Protocolo Oficial</span>
            <div class="protocol-number">${protocoloFinal}</div>
          </div>
          <div class="protocol-date">
            <div><strong>Data do Protocolo:</strong> ${dataHoraFinal}</div>
            <div><strong>Petição:</strong> ${formData.tipoPeticao || 'TOTAL'}</div>
            <div><strong>Status:</strong> PROTOCOLADO / EM VISTORIA</div>
          </div>
        </div>

        <div class="section-header">1. Identificação da Obra / Edificação</div>
        <div class="grid-2">
          <div>
            <span class="field-label">Nome da Edificação</span>
            <span class="field-val">${formData.nomeEdificacao || '—'}</span>
          </div>
          <div>
            <span class="field-label">Cadastro Imobiliário Municipal (DIC)</span>
            <span class="field-val">${formData.numeroDic || '—'}</span>
          </div>
          <div class="col-span-2">
            <span class="field-label">Endereço da Obra</span>
            <span class="field-val">${enderecoCompleto || '—'}</span>
          </div>
          <div>
            <span class="field-label">Uso da Edificação & Áreas</span>
            <span class="field-val">
              ${[
                formData.usoResidencial && `Residencial: ${formData.areaResidencial || '—'} m²`,
                formData.usoComercial && `Comercial: ${formData.areaComercial || '—'} m²`
              ].filter(Boolean).join(' • ') || 'Não especificado'}
            </span>
          </div>
          <div>
            <span class="field-label">Alvará de Construção (SEPLAN)</span>
            <span class="field-val">${formData.alvaraConstrucaoNome || 'Constante no Processo Digital'}</span>
          </div>
        </div>

        <div class="section-header">2. Dados do Titular / Requerente</div>
        <div class="grid-2">
          <div>
            <span class="field-label">Nome / Razão Social</span>
            <span class="field-val">${formData.titularNome || '—'}</span>
          </div>
          <div>
            <span class="field-label">${formData.tipoTitular === 'PJ' ? 'CNPJ' : 'CPF'}</span>
            <span class="field-val">${formData.titularDoc || '—'}</span>
          </div>
          <div>
            <span class="field-label">Telefone / WhatsApp</span>
            <span class="field-val">${formData.titularTelefone || 'Não informado'}</span>
          </div>
          <div>
            <span class="field-label">E-mail de Contato</span>
            <span class="field-val">${formData.titularEmail || 'Não informado'}</span>
          </div>
        </div>

        <div class="section-header">3. Responsável Técnico pela Obra</div>
        <div class="grid-2">
          <div>
            <span class="field-label">Nome do Responsável Técnico</span>
            <span class="field-val">${formData.rtNome || '—'}</span>
          </div>
          <div>
            <span class="field-label">Registro Profissional (CREA / CAU / CFT)</span>
            <span class="field-val">${formData.rtRegistroProfissional || '—'}</span>
          </div>
          <div>
            <span class="field-label">CPF do Responsável Técnico</span>
            <span class="field-val">${formData.rtDoc || '—'}</span>
          </div>
          <div>
            <span class="field-label">Contato do RT</span>
            <span class="field-val">${formData.rtTelefone || formData.rtEmail || '—'}</span>
          </div>
        </div>

        ${prioridadeLabel && formData.atendimentoPrioritario !== 'NAO_POSSUI' ? `
          <div class="section-header">4. Atendimento Prioritário (Lei Federal nº 10.048/2000)</div>
          <div style="font-size: 8.5pt; color: #1e3a8a; font-weight: 700; margin-bottom: 6px;">
            ✓ ${prioridadeLabel} ${formData.comprovantePrioridadeNome ? `(Anexo: ${formData.comprovantePrioridadeNome})` : ''}
          </div>
        ` : ''}

        <div class="notice-box">
          <strong>Atenção / Disposições da Lei Complementar nº 40/2019:</strong> O requerente e o responsável técnico declaram sob as penas da lei que a obra foi executada de acordo com as normas sanitárias vigentes. Ficam cientes de que deverão manter no local da obra as vias originais aprovadas dos projetos arquitetônico e hidrossanitário para apresentação à vistoria da fiscalização da Vigilância Sanitária Municipal.
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-title">${formData.titularNome || 'Titular / Requerente'}</div>
            <div class="sig-sub">Assinatura do Requerente • CPF/CNPJ: ${formData.titularDoc || '—'}</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">${formData.rtNome || 'Responsável Técnico'}</div>
            <div class="sig-sub">CREA/CAU: ${formData.rtRegistroProfissional || '—'}</div>
          </div>
        </div>

        <div class="footer">
          Documento emitido eletronicamente pelo Sistema de Vigilância Sanitária Municipal de Balneário Camboriú (DVIS).<br/>
          Rua 1500, nº 1100 - Centro - Balneário Camboriú/SC • CEP 88330-524 • Telefone: (47) 3261-6200
        </div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    printFrame.onload = () => {
      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch (err) {
          console.error('Erro ao acionar impressão:', err);
        } finally {
          setTimeout(() => {
            if (document.body.contains(printFrame)) {
              document.body.removeChild(printFrame);
            }
          }, 2000);
        }
      }, 250);
    };
  };

  const validarFormulario = () => {
    const novosErros: string[] = [];

    if (!formData.tipoPeticao) {
      novosErros.push('Selecione o Tipo de Petição do Habite-se.');
    }
    if (!formData.titularDoc.trim()) {
      novosErros.push('Informe o CPF ou CNPJ do Titular do Habite-se.');
    }
    if (!formData.titularNome.trim()) {
      novosErros.push('Informe o Nome ou Razão Social do Titular.');
    }
    if (!formData.rtDoc.trim()) {
      novosErros.push('Identifique o CPF ou CNPJ do Responsável Técnico (RT).');
    }
    if (!formData.rtNome.trim()) {
      novosErros.push('Informe o Nome do Responsável Técnico.');
    }
    if (!formData.usoResidencial && !formData.usoComercial) {
      novosErros.push('Selecione ao menos um Uso da Edificação (Residencial ou Comercial).');
    }
    if (formData.usoResidencial && !formData.areaResidencial.trim()) {
      novosErros.push('Informe a área residencial da edificação (m²).');
    }
    if (formData.usoComercial && !formData.areaComercial.trim()) {
      novosErros.push('Informe a área comercial da edificação (m²).');
    }
    if (!formData.nomeEdificacao.trim()) {
      novosErros.push('Informe o Nome da Edificação.');
    }
    if (!formData.rua.trim()) {
      novosErros.push('Informe a Rua / Logradouro da edificação.');
    }
    if (!formData.numero.trim()) {
      novosErros.push('Informe o Número da edificação.');
    }
    if (!formData.bairro.trim()) {
      novosErros.push('Informe o Bairro.');
    }
    if (!formData.numeroDic.trim()) {
      novosErros.push('Informe o Número de Cadastro de Imóvel (DIC) da edificação.');
    }
    if (!formData.alvaraConstrucaoNome) {
      novosErros.push('É OBRIGATÓRIO anexar o Alvará de Construção no protocolo eletrônico.');
    }
    if (!formData.declaracaoCiencia) {
      novosErros.push('Você deve marcar a Declaração de Ciência dos projetos e da LC nº 40/2019.');
    }
    if (formData.atendimentoPrioritario && formData.atendimentoPrioritario !== 'NAO_POSSUI') {
      const opcao = OPCOES_ATENDIMENTO_PRIORITARIO.find(o => o.id === formData.atendimentoPrioritario);
      if (opcao?.exigeComprovante && !formData.comprovantePrioridadeNome) {
        novosErros.push(`O documento comprobatório é obrigatório para atendimento prioritário (${opcao.label}) conforme a Lei 10.048/2000.`);
      }
    }

    setErros(novosErros);
    return novosErros.length === 0;
  };

  const handleSubmeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario()) {
      return;
    }

    let numeroFinal = formData.numeroDocumento;

    // Aloca e confirma o número sequencial atomicamente no servidor para garantir zero duplicatas
    try {
      const res = await fetch('/api/habite-se/alocar-numero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          numeroDocumento: formData.numeroDocumento,
          dataHora: new Date().toISOString()
        })
      });

      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const data = await res.json();
        if (data?.numeroDocumento) {
          numeroFinal = data.numeroDocumento;
        }
        commitAndAdvanceNumeroHabiteSe();
      } else {
        numeroFinal = commitAndAdvanceNumeroHabiteSe();
      }
    } catch (err) {
      console.warn('Servidor indisponível ao alocar número de Habite-se, utilizando sequencial seguro:', err);
      numeroFinal = commitAndAdvanceNumeroHabiteSe();
    }

    const agora = new Date();
    const dataHoraStr = `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    setDataHoraEnvio(dataHoraStr);
    setProtocoloGerado(numeroFinal);
    setFormData((prev) => ({ ...prev, numeroDocumento: numeroFinal }));

    // Salva no histórico de Habite-se Sanitário do localStorage
    try {
      const prev = JSON.parse(localStorage.getItem('visa_habite_se_historico') || '[]');
      localStorage.setItem('visa_habite_se_historico', JSON.stringify([
        {
          dataHora: dataHoraStr,
          status: 'ENCAMINHADO_SETOR_HABITE_SE',
          setorDestino: 'Setor de Habite-se Sanitário',
          ...formData,
          numeroDocumento: numeroFinal
        },
        ...prev
      ]));
    } catch (e) {
      console.warn('Erro ao salvar historico de Habite-se local:', e);
    }

    // Salva no banco de dados na nuvem Supabase
    if (isSupabaseConfigured) {
      try {
        await saveHabiteSeToSupabase({
          ...formData,
          numeroDocumento: numeroFinal,
          dataHoraEnvio: dataHoraStr
        });
      } catch (err: any) {
        console.warn('Erro ao salvar no Supabase:', err);
      }
    }

    if (onProtocolarSuccess) {
      onProtocolarSuccess(numeroFinal, { ...formData, numeroDocumento: numeroFinal });
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/85 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-[#1e232d] text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-5xl xl:max-w-6xl max-h-[94vh] flex flex-col overflow-hidden my-auto">
        {/* Cabeçalho Oficial do Requerimento */}
        <div className="px-6 sm:px-8 py-4.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-blue-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/40 border border-blue-400/40 rounded-xl text-blue-200 shadow-inner">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-blue-300 font-extrabold bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700/60 whitespace-nowrap">
                  Formulário Oficial • <span className="whitespace-nowrap">Habite&#8209;se</span>
                </span>
                <span className="text-[11px] text-amber-300 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/40 flex items-center gap-1 whitespace-nowrap">
                  <ShieldCheck className="w-3.5 h-3.5" /> LC nº 40/2019
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight mt-0.5">
                Requerimento de <span className="whitespace-nowrap">Habite&#8209;se Sanitário</span>
              </h2>
              <p className="text-xs text-blue-200/80">
                Divisão de Vigilância Sanitária e Ambiental • Secretaria de Saúde de Balneário Camboriú/SC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Número do Documento Gerado em destaque */}
            <div className="hidden sm:flex flex-col items-end bg-slate-950/60 border border-indigo-400/40 px-3 py-1.5 rounded-xl shadow-xs">
              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">
                Nº do Documento (Servidor)
              </span>
              <span className="text-sm font-black font-mono text-emerald-400 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" />
                {carregandoNumero ? 'Gerando...' : formData.numeroDocumento}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Fechar formulário"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo do Modal */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 md:px-10 py-6 sm:py-7 space-y-6">
          {protocoloGerado ? (
            /* ============================================================== */
            /* TELA DE SUCESSO / PROTOCOLO OFICIAL GERADO                     */
            /* ============================================================== */
            <div className="py-6 px-4 max-w-2xl mx-auto space-y-6 text-center animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
                  Requerimento Protocolado com Sucesso
                </span>
                <h3 className="text-2xl font-black mt-3 text-slate-900 dark:text-white">
                  Habite-se Sanitário Solicitado!
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Seu requerimento foi registrado no sistema da Vigilância Sanitária Municipal e seguirá para a etapa de vistoria técnica.
                </p>
              </div>

              {/* Card Timbrado do Protocolo Gerado */}
              <div id="printable-habite-se" className="bg-slate-50 dark:bg-slate-800/80 border-2 border-dashed border-indigo-300 dark:border-indigo-700/60 rounded-2xl p-5 text-left space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                      Número do Documento Gerado
                    </span>
                    <div className="text-xl sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                      <span>{protocoloGerado}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(protocoloGerado)}
                        className="text-xs px-2 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 hover:bg-indigo-200 text-indigo-700 dark:text-indigo-300 font-sans font-bold flex items-center gap-1 transition cursor-pointer"
                        title="Copiar número"
                      >
                        {copiado ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiado ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                      Data do Protocolo
                    </span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {dataHoraEnvio || '22/09/2026'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-semibold block">Edificação:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {formData.nomeEdificacao}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-semibold block">Cadastro DIC:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formData.numeroDic}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-semibold block">Titular:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formData.titularNome} ({formData.titularDoc})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-semibold block">Responsável Técnico:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formData.rtNome} ({formData.rtRegistroProfissional || formData.rtDoc})
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold block">Uso da Edificação & Áreas:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {[
                        formData.usoResidencial && `Residencial: ${formData.areaResidencial || '—'} m²`,
                        formData.usoComercial && `Comercial: ${formData.areaComercial || '—'} m²`
                      ].filter(Boolean).join(' • ') || 'Não informado'}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold block">Endereço da Obra:</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {formData.rua}, nº {formData.numero} {formData.complemento ? `- ${formData.complemento}` : ''}, {formData.bairro} - Balneário Camboriú/SC
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold block">Alvará de Construção Anexado:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <FileCheck2 className="w-4 h-4" /> {formData.alvaraConstrucaoNome || 'Alvara_de_Construcao.pdf'}
                    </span>
                  </div>
                  {formData.atendimentoPrioritario && formData.atendimentoPrioritario !== 'NAO_POSSUI' && (
                    <div className="sm:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold block">
                        Atendimento Prioritário (Lei 10.048/2000):
                      </span>
                      <span className="font-bold text-indigo-700 dark:text-indigo-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{OPCOES_ATENDIMENTO_PRIORITARIO.find(o => o.id === formData.atendimentoPrioritario)?.label}</span>
                        {formData.comprovantePrioridadeNome && (
                          <span className="text-[11px] text-slate-500 font-mono font-normal">
                            (Anexo: {formData.comprovantePrioridadeNome})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Importante:</strong> Mantenha em mãos na obra as vias aprovadas dos projetos arquitetônico e hidrossanitário no dia da vistoria da equipe de engenharia/fiscalização da Vigilância Sanitária (LC nº 40/2019).
                  </span>
                </div>
              </div>

              {/* Rastreabilidade e Vínculo ao CPF/CNPJ */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/70 rounded-xl p-3.5 text-left text-xs space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2 font-black text-emerald-800 dark:text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Histórico Registrado e Vinculado ao {formData.tipoTitular === 'PJ' ? 'CNPJ' : 'CPF'}: <strong>{formData.titularDoc}</strong></span>
                </div>
                <p className="text-[11px] text-emerald-700/90 dark:text-emerald-400/90 leading-relaxed">
                  Este requerimento está salvo e disponível para consulta no <strong>Painel do Contribuinte</strong> (pelo titular) e na <strong>Gestão de Processos da VISA</strong> (pelos fiscais e servidores do Setor de Habite-se).
                </p>
              </div>

              {/* Botões de Ação para o Munícipe */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md active:scale-95 border border-slate-700 dark:border-slate-300"
                  title="Imprimir Requerimento Oficial com todos os dados da tela"
                >
                  <Printer className="w-4 h-4 text-indigo-400 dark:text-indigo-600" /> Imprimir Requerimento Oficial
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md active:scale-95"
                >
                  <Check className="w-4 h-4" /> Concluir e Acessar Histórico
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* FORMULÁRIO COMPLETO DE PREENCHIMENTO                          */
            /* ============================================================== */
            <form onSubmit={handleSubmeter} className="space-y-6">
              {/* Exibição de Erros */}
              {erros.length > 0 && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200 space-y-1.5">
                  <div className="font-extrabold flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="w-4 h-4" /> Por favor, revise os campos pendentes:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
                    {erros.map((erro, idx) => (
                      <li key={idx}>{erro}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* BARRA: Número do Documento Gerado */}
              <div className="p-3 bg-gradient-to-r from-indigo-50 via-blue-50 to-slate-50 dark:from-indigo-950/40 dark:via-blue-950/30 dark:to-slate-900/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-xs">
                    <Hash className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Número do Documento Gerado (Identificador Oficial):
                  </span>
                </div>

                <div className="bg-white dark:bg-[#151921] border-2 border-indigo-400 dark:border-indigo-600 rounded-xl px-4 py-1.5 shadow-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-mono font-black text-indigo-700 dark:text-indigo-300 tracking-wider">
                    {formData.numeroDocumento}
                  </span>
                </div>
              </div>

              {/* SEÇÃO 1: REQUERIMENTO - TIPO DE PETIÇÃO* */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Requerimento • Tipo de Petição*
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                    Selecione uma modalidade
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-0.5">
                  {[
                    { id: 'TOTAL', label: 'Habite‑se Sanitário Total', desc: 'Edificação concluída integralmente' },
                    { id: 'PARCIAL', label: 'Habite‑se Sanitário Parcial', desc: 'Liberação de bloco ou pavimento finalizado' },
                    { id: 'ACRESCIMO', label: 'Habite‑se Sanitário Acréscimo', desc: 'Ampliação de área construída licenciada' },
                    { id: 'SEGUNDA_VIA', label: '2ª Via Habite‑se Sanitário', desc: 'Emissão de 2ª via de documento existente' }
                  ].map((opcao) => {
                    const selecionado = formData.tipoPeticao === opcao.id;
                    return (
                      <label
                        key={opcao.id}
                        title={opcao.desc}
                        className="inline-flex items-center gap-1.5 cursor-pointer select-none py-1 group whitespace-nowrap"
                      >
                        <input
                          type="radio"
                          name="tipoPeticao"
                          checked={selecionado}
                          onChange={() => setFormData({ ...formData, tipoPeticao: opcao.id as any })}
                          className="!w-4 !h-4 !min-w-[16px] !max-w-[16px] !m-0 !p-0 aspect-square accent-indigo-600 shrink-0 cursor-pointer"
                        />
                        <span className={`text-xs transition ${
                          selecionado
                            ? 'font-bold text-indigo-900 dark:text-indigo-200'
                            : 'text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                        }`}>
                          {opcao.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* SEÇÃO 2: IDENTIFICAÇÃO DO TITULAR DO HABITE-SE */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      Identificação do Titular do Habite&#8209;se*
                    </h3>
                  </div>
                  {/* Seletor PF / PJ */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipoTitular: 'PF' })}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                        formData.tipoTitular === 'PF'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Pessoa Física (CPF)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipoTitular: 'PJ' })}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                        formData.tipoTitular === 'PJ'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Pessoa Jurídica (CNPJ)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      {formData.tipoTitular === 'PJ' ? 'CNPJ do Titular*:' : 'CPF do Titular*:'}
                    </label>
                    <input
                      type="text"
                      value={formData.titularDoc}
                      onChange={(e) => setFormData({ ...formData, titularDoc: formatarCpfCnpj(e.target.value) })}
                      placeholder={formData.tipoTitular === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                      className="w-full bg-white dark:bg-[#151921] border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      {formData.tipoTitular === 'PJ' ? 'Razão Social / Nome da Empresa*:' : 'Nome Completo do Titular*:'}
                    </label>
                    <input
                      type="text"
                      value={formData.titularNome}
                      onChange={(e) => setFormData({ ...formData, titularNome: e.target.value })}
                      placeholder="Ex: Construtora Litoral Ltda ou Nome do Proprietário..."
                      className="w-full bg-white dark:bg-[#151921] border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Telefone / Celular:
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={formData.titularTelefone}
                        onChange={(e) => setFormData({ ...formData, titularTelefone: e.target.value })}
                        placeholder="(47) 99999-9999"
                        className="w-full bg-white dark:bg-[#151921] border border-slate-300 dark:border-slate-600 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      E-mail para Notificações Oficiais:
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="email"
                        value={formData.titularEmail}
                        onChange={(e) => setFormData({ ...formData, titularEmail: e.target.value })}
                        placeholder="contato@empresa.com.br"
                        className="w-full bg-white dark:bg-[#151921] border border-slate-300 dark:border-slate-600 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: IDENTIFIQUE RESPONSÁVEL TÉCNICO (CPF/CNPJ) */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Identifique Responsável Técnico (CPF/CNPJ)*
                    </h3>
                  </div>
                  {/* Seletor PF / PJ para o RT */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, rtTipo: 'PF' })}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                        formData.rtTipo === 'PF'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      RT Pessoa Física (CPF)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, rtTipo: 'PJ' })}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                        formData.rtTipo === 'PJ'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      RT Empresa (CNPJ)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      {formData.rtTipo === 'PJ' ? 'CNPJ do RT*:' : 'CPF do RT*: (CPF/CNPJ)'}
                    </label>
                    <input
                      type="text"
                      value={formData.rtDoc}
                      onChange={(e) => setFormData({ ...formData, rtDoc: formatarCpfCnpj(e.target.value) })}
                      placeholder={formData.rtTipo === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                      className="w-full bg-white dark:bg-[#151921] border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Nome do Responsável Técnico (Engenheiro / Arquiteto)*:
                    </label>
                    <input
                      type="text"
                      value={formData.rtNome}
                      onChange={(e) => setFormData({ ...formData, rtNome: e.target.value })}
                      placeholder="Nome completo do Engenheiro Civil ou Arquiteto..."
                      className="w-full bg-white dark:bg-[#151921] border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Registro de Classe (CREA / CAU):
                    </label>
                    <input
                      type="text"
                      value={formData.rtRegistroProfissional}
                      onChange={(e) => setFormData({ ...formData, rtRegistroProfissional: e.target.value })}
                      placeholder="Ex: CREA-SC 123456-7 / CAU-SC A12345"
                      className="w-full bg-white dark:bg-[#151921] border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Telefone / Celular do RT:
                    </label>
                    <input
                      type="text"
                      value={formData.rtTelefone}
                      onChange={(e) => setFormData({ ...formData, rtTelefone: e.target.value })}
                      placeholder="(47) 99999-8888"
                      className="w-full bg-white dark:bg-[#151921] border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      E-mail do RT:
                    </label>
                    <input
                      type="email"
                      value={formData.rtEmail}
                      onChange={(e) => setFormData({ ...formData, rtEmail: e.target.value })}
                      placeholder="engenharia@dominio.com.br"
                      className="w-full bg-white dark:bg-[#151921] border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 4: DADOS DA EDIFICAÇÃO & USO */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                  <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Dados da Edificação • Uso e Localização
                  </h3>
                </div>

                {/* Sub-bloco: Uso da Edificação com área de (m²) */}
                <div className="bg-white dark:bg-slate-900/90 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                    Uso da Edificação*:
                  </span>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
                    {/* Bloco Residencial: Checkbox + Área */}
                    <div className="inline-flex items-center gap-2 flex-wrap">
                      <label
                        htmlFor="chk-residencial"
                        className="inline-flex items-center gap-1.5 cursor-pointer select-none py-1 group"
                      >
                        <input
                          type="checkbox"
                          id="chk-residencial"
                          checked={formData.usoResidencial}
                          onChange={(e) => setFormData({ ...formData, usoResidencial: e.target.checked })}
                          className="!w-4 !h-4 !min-w-[16px] !max-w-[16px] !m-0 !p-0 aspect-square rounded accent-indigo-600 cursor-pointer shrink-0"
                        />
                        <span className={`font-semibold transition ${
                          formData.usoResidencial
                            ? 'text-indigo-900 dark:text-indigo-200 font-bold'
                            : 'text-slate-700 dark:text-slate-300 group-hover:text-indigo-600'
                        }`}>
                          Residencial
                        </span>
                      </label>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          com área de (m²)*:
                        </span>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.areaResidencial}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData({
                                ...formData,
                                areaResidencial: val,
                                usoResidencial: val.trim().length > 0 ? true : formData.usoResidencial
                              });
                            }}
                            placeholder="Ex: 150,00"
                            className="w-28 bg-white dark:bg-[#151921] border border-slate-300 dark:border-slate-600 focus:border-indigo-500 rounded-lg px-2.5 py-1 text-xs font-mono font-bold focus:outline-none"
                          />
                          <span className="absolute right-2 top-1 text-[11px] text-slate-400 font-bold">m²</span>
                        </div>
                      </div>
                    </div>

                    {/* Divisor vertical sutil para separação visual elegante */}
                    <div className="hidden lg:block h-5 w-px bg-slate-200 dark:bg-slate-700" />

                    {/* Bloco Comercial: Checkbox + Área */}
                    <div className="inline-flex items-center gap-2 flex-wrap">
                      <label
                        htmlFor="chk-comercial"
                        className="inline-flex items-center gap-1.5 cursor-pointer select-none py-1 group"
                      >
                        <input
                          type="checkbox"
                          id="chk-comercial"
                          checked={formData.usoComercial}
                          onChange={(e) => setFormData({ ...formData, usoComercial: e.target.checked })}
                          className="!w-4 !h-4 !min-w-[16px] !max-w-[16px] !m-0 !p-0 aspect-square rounded accent-indigo-600 cursor-pointer shrink-0"
                        />
                        <span className={`font-semibold transition ${
                          formData.usoComercial
                            ? 'text-indigo-900 dark:text-indigo-200 font-bold'
                            : 'text-slate-700 dark:text-slate-300 group-hover:text-indigo-600'
                        }`}>
                          Comercial
                        </span>
                      </label>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          com área de (m²)*:
                        </span>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.areaComercial}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData({
                                ...formData,
                                areaComercial: val,
                                usoComercial: val.trim().length > 0 ? true : formData.usoComercial
                              });
                            }}
                            placeholder="Ex: 85,50"
                            className="w-28 bg-white dark:bg-[#151921] border border-slate-300 dark:border-slate-600 focus:border-indigo-500 rounded-lg px-2.5 py-1 text-xs font-mono font-bold focus:outline-none"
                          />
                          <span className="absolute right-2 top-1 text-[11px] text-slate-400 font-bold">m²</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-bloco: Nome da Edificação e Endereço */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Nome da Edificação*:
                    </label>
                    <input
                      type="text"
                      value={formData.nomeEdificacao}
                      onChange={(e) => setFormData({ ...formData, nomeEdificacao: e.target.value })}
                      placeholder="Ex: Edifício Residencial Ilhas do Sul / Centro Empresarial Miramar"
                      className="w-full bg-white dark:bg-[#151921] border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1 text-indigo-600 dark:text-indigo-400">
                      Número de Cadastro de Imóvel (DIC)*:
                    </label>
                    <div className="relative">
                      <Hash className="w-3.5 h-3.5 absolute left-3 top-2.5 text-indigo-500" />
                      <input
                        type="text"
                        value={formData.numeroDic}
                        onChange={(e) => setFormData({ ...formData, numeroDic: e.target.value })}
                        placeholder="Ex: 123456 / IPTU"
                        className="w-full bg-white dark:bg-[#151921] border-2 border-indigo-400/70 dark:border-indigo-600/80 rounded-xl pl-8 pr-3 py-2 text-xs font-mono font-black text-indigo-800 dark:text-indigo-200 focus:outline-none focus:border-indigo-500"
                        required
                        title="DIC: Dado de Inscrição Cadastral / Cadastro Imobiliário Municipal"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Rua*:
                    </label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={formData.rua}
                        onChange={(e) => setFormData({ ...formData, rua: e.target.value })}
                        placeholder="Ex: Av. Brasil / Rua 1500 / Av. Atlântica"
                        className="w-full bg-white dark:bg-[#151921] border border-slate-300 dark:border-slate-600 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Número*:
                    </label>
                    <input
                      type="text"
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      placeholder="Ex: 1200 ou S/N"
                      className="w-full bg-white dark:bg-[#151921] border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Complemento:
                    </label>
                    <input
                      type="text"
                      value={formData.complemento}
                      onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                      placeholder="Bloco A, Torre 1..."
                      className="w-full bg-white dark:bg-[#151921] border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Bairro*:
                    </label>
                    <input
                      list="lista-bairros-bc"
                      type="text"
                      value={formData.bairro}
                      onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                      placeholder="Ex: Centro, Nações..."
                      className="w-full bg-white dark:bg-[#151921] border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-bold"
                      required
                    />
                    <datalist id="lista-bairros-bc">
                      {BAIRROS_BC.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Município/Estado*:
                    </label>
                    <input
                      type="text"
                      value={formData.municipioEstado}
                      readOnly
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-400 font-bold select-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Ponto de referência:
                    </label>
                    <input
                      type="text"
                      value={formData.pontoReferencia}
                      onChange={(e) => setFormData({ ...formData, pontoReferencia: e.target.value })}
                      placeholder="Ex: Entre a Terceira Avenida e a Av. Central, próximo à Praça Tamandaré..."
                      className="w-full bg-white dark:bg-[#151921] border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 5: ANEXO OBRIGATÓRIO - ALVARÁ DE CONSTRUÇÃO */}
              <div className="bg-amber-50/60 dark:bg-amber-950/20 p-4 sm:p-5 rounded-2xl border-2 border-amber-300 dark:border-amber-800/70 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500 text-white rounded-lg">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                      * OBRIGATÓRIO ANEXAR O ALVARÁ DE CONSTRUÇÃO NO PROTOCOLO ELETRÔNICO
                    </h3>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80">
                      O processo de <span className="whitespace-nowrap">Habite&#8209;se Sanitário</span> não tramitará sem a comprovação do Alvará de Construção emitido pelo Município.
                    </p>
                  </div>
                </div>

                {/* Upload Box do Alvará */}
                <div className="border border-dashed border-amber-400 dark:border-amber-700 hover:border-amber-500 rounded-xl p-3 text-center bg-white dark:bg-[#151921] transition">
                  <input
                    type="file"
                    id="file-alvara-construcao"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFormData({
                          ...formData,
                          alvaraConstrucaoNome: e.target.files[0].name
                        });
                      }
                    }}
                  />
                  <label
                    htmlFor="file-alvara-construcao"
                    className="cursor-pointer flex items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:white py-1 px-2"
                  >
                    <UploadCloud className="w-5 h-5 text-amber-500 shrink-0" />
                    {formData.alvaraConstrucaoNome ? (
                      <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 px-3 py-1 rounded-lg text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">Alvará Anexado: {formData.alvaraConstrucaoNome}</span>
                      </div>
                    ) : (
                      <div className="text-left">
                        <span className="font-bold text-amber-700 dark:text-amber-400 block text-xs">
                          Clique para anexar o arquivo do Alvará de Construção (PDF / Imagem)
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Formatos aceitos: PDF, JPEG, PNG (Máx.: 25 MB)
                        </span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* SEÇÃO 6: DECLARAÇÃO DE CIÊNCIA* (LEI COMPLEMENTAR Nº 40/2019) */}
              <div className={`p-3.5 sm:p-4 rounded-xl border transition-all duration-200 ${
                formData.declaracaoCiencia
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                  : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 ring-2 ring-amber-400/20'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-2.5 sm:gap-3">
                  <label
                    htmlFor="chk-declaracao-ciencia"
                    className={`shrink-0 inline-flex items-center gap-2 py-2 px-3.5 rounded-lg border text-xs cursor-pointer select-none transition ${
                      formData.declaracaoCiencia
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs font-bold'
                        : 'bg-white dark:bg-[#151921] text-amber-950 dark:text-amber-200 border-amber-400 dark:border-amber-600 hover:border-indigo-500 font-bold'
                    }`}
                  >
                    <input
                      type="checkbox"
                      id="chk-declaracao-ciencia"
                      checked={formData.declaracaoCiencia}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData((prev) => ({ ...prev, declaracaoCiencia: checked }));
                      }}
                      className="!w-4 !h-4 !min-w-[16px] !max-w-[16px] !m-0 !p-0 aspect-square rounded accent-emerald-600 cursor-pointer shrink-0"
                      required
                    />
                    <span className="flex items-center gap-1.5">
                      {formData.declaracaoCiencia && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      Estou Ciente*
                    </span>
                  </label>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        Declaração de Ciência* (Lei Complementar nº 40/2019)
                      </span>
                      {formData.declaracaoCiencia ? (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Termo Aceito • Botão Habilitado
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Obrigatório para Habilitar o Botão de Protocolo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                      Estou ciente de que, no momento da inspeção técnica para concessão do <span className="whitespace-nowrap">Habite&#8209;se Sanitário</span>, será solicitado o projeto hidrossanitário e o projeto arquitetônico da edificação, devidamente aprovados pela Secretaria de Planejamento Urbano e Divisão de Vigilância Sanitária, conforme Lei Complementar nº 40, de 10 de julho de 2019.
                    </p>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 7: ATENDIMENTO PRIORITÁRIO (LEI Nº 10.048/2000 E ESTATUTO DA PESSOA IDOSA) */}
              <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700/70 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pb-1.5 border-b border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Você possui direito a atendimento prioritário?
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Garantido pela Lei 10.048/2000 e Estatuto da Pessoa Idosa • Documento comprobatório obrigatório
                  </span>
                </div>

                {/* 8 Opções leves e justas apenas com o pontinho (radio) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-0.5">
                  {OPCOES_ATENDIMENTO_PRIORITARIO.map((opcao) => {
                    const isSelected = formData.atendimentoPrioritario === opcao.id;
                    return (
                      <label
                        key={opcao.id}
                        className={`py-1.5 px-2 rounded-lg text-xs cursor-pointer select-none flex items-center gap-2 transition ${
                          isSelected
                            ? 'bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="atendimento_prioritario"
                          value={opcao.id}
                          checked={isSelected}
                          onChange={() => setFormData((prev) => ({ ...prev, atendimentoPrioritario: opcao.id }))}
                          className="!w-3.5 !h-3.5 !min-w-[14px] !max-w-[14px] !m-0 !p-0 aspect-square accent-indigo-600 shrink-0 cursor-pointer"
                        />
                        <span className="truncate">{opcao.label}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Anexo compacto do documento comprobatório caso selecione opção prioritária */}
                {(() => {
                  const opcaoSelecionada = OPCOES_ATENDIMENTO_PRIORITARIO.find(o => o.id === formData.atendimentoPrioritario);
                  if (!opcaoSelecionada?.exigeComprovante) return null;

                  return (
                    <div className="mt-2 pt-2 border-t border-amber-200/80 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-50/70 dark:bg-amber-950/20 px-3 py-2 rounded-lg text-xs">
                      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 min-w-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">
                          <strong>Comprovante ({opcaoSelecionada.documentoSugerido}):</strong>{' '}
                          {formData.comprovantePrioridadeNome ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                              ✓ {formData.comprovantePrioridadeNome}
                            </span>
                          ) : (
                            <span className="text-amber-700 dark:text-amber-400 italic">Pendente de anexo</span>
                          )}
                        </span>
                      </div>

                      <label className="shrink-0 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition">
                        <UploadCloud className="w-3 h-3" />
                        <span>{formData.comprovantePrioridadeNome ? 'Substituir' : 'Anexar Comprovante'}</span>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setFormData({
                                ...formData,
                                comprovantePrioridadeNome: e.target.files[0].name
                              });
                            }
                          }}
                        />
                      </label>
                    </div>
                  );
                })()}
              </div>

              {/* Botões do Rodapé */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="text-xs">
                  {!formData.declaracaoCiencia ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/60">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      Marque "Estou Ciente" na Declaração de Ciência para liberar o botão de protocolo.
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Declaração aceita • Botão de protocolo habilitado
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.declaracaoCiencia}
                    title={
                      !formData.declaracaoCiencia
                        ? 'Você deve marcar o campo "Estou Ciente" na Declaração de Ciência para poder clicar e protocolar.'
                        : 'Protocolar Habite-se Sanitário'
                    }
                    className={`text-xs font-bold px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 transition select-none ${
                      formData.declaracaoCiencia
                        ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-lg shadow-indigo-600/25 cursor-pointer'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700 shadow-none'
                    }`}
                  >
                    <Send className="w-4 h-4" /> Protocolar <span className="whitespace-nowrap">Habite&#8209;se Sanitário</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
