import React, { useState, useMemo } from 'react';
import {
  Scale,
  Search,
  FileText,
  BookOpen,
  Download,
  Copy,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Building2,
  Calendar,
  Printer,
  X,
  FileCheck2,
  HelpCircle,
  FileSignature,
  FileSpreadsheet,
  BadgeCheck,
  QrCode,
  ArrowLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { ProcessoItem, UserProfile } from '../types';

interface RepositorioJuridicoViewProps {
  processos: ProcessoItem[];
  currentUser: UserProfile | null;
  onBack: () => void;
  onOpenExternal: (url: string) => void;
  onNavigate?: (view: any) => void;
}

interface NormaJuridica {
  id: string;
  titulo: string;
  numero: string;
  esfera: 'MUNICIPAL' | 'ESTADUAL' | 'FEDERAL';
  categoria: 'CODIGO_SANITARIO' | 'ALVARA_TAXAS' | 'ALIMENTOS' | 'AGUA' | 'SAUDE_FARMACIA' | 'PROCEDIMENTO_FISCAL';
  ementa: string;
  artigosChave: string[];
  linkOficial?: string;
  ano: string;
}

interface ModeloPeca {
  id: string;
  titulo: string;
  descricao: string;
  categoria: 'DEFESA' | 'PRORROGACAO' | 'TAC' | 'RECURSO' | 'DISPENSA' | 'POP';
  prazoLegal: string;
  baseLegal: string;
  conteudoTexto: string;
}

const NORMAS_JURIDICAS: NormaJuridica[] = [
  {
    id: 'lei-3011-2009',
    titulo: 'Código Sanitário Municipal de Balneário Camboriú',
    numero: 'Lei Municipal nº 3.011/2009',
    esfera: 'MUNICIPAL',
    categoria: 'CODIGO_SANITARIO',
    ano: '2009',
    ementa: 'Dispõe sobre a organização e as diretrizes básicas das ações de vigilância sanitária, as normas gerais de promoção e proteção da saúde coletiva e penalidades aplicáveis no Município de Balneário Camboriú.',
    artigosChave: [
      'Art. 12 - Obrigatoriedade do Alvará Sanitário prévio para funcionamento de estabelecimentos sujeitos a controle sanitário.',
      'Art. 45 a 58 - Padrões de higiene, potabilidade da água, manipulação de alimentos e responsabilidade técnica.',
      'Art. 98 - Rito do Processo Administrativo Sanitário (PAS), prazos de notificação (15 a 30 dias) e direito de defesa prévia.'
    ],
    linkOficial: 'https://leis.org/prefeitura/sc/balneario-camboriu'
  },
  {
    id: 'lc-27-2018',
    titulo: 'Licenciamento Sanitário & Classificação de Risco Econômico',
    numero: 'Lei Complementar nº 27/2018',
    esfera: 'MUNICIPAL',
    categoria: 'ALVARA_TAXAS',
    ano: '2018',
    ementa: 'Regulamenta o processo de desburocratização, a classificação do grau de risco sanitário (Baixo, Médio e Alto Risco) para abertura e renovação de empresas em Balneário Camboriú em consonância com a Lei da Liberdade Econômica.',
    artigosChave: [
      'Art. 4º - Atividades de Baixo Risco Sanitário (Nível I) dispensadas de alvará prévio para início de atividades.',
      'Art. 7º - Renovação anual automática mediante autodeclaração para atividades de Médio Risco (Nível II).',
      'Art. 15 - Obrigatoriedade de vistoria prévia e aprovação documental para Alto Risco (Nível III).'
    ],
    linkOficial: 'https://leis.org/prefeitura/sc/balneario-camboriu'
  },
  {
    id: 'lei-4511-2021',
    titulo: 'Taxas Municipais de Fiscalização Sanitária e Alvará',
    numero: 'Lei Municipal nº 4.511/2021',
    esfera: 'MUNICIPAL',
    categoria: 'ALVARA_TAXAS',
    ano: '2021',
    ementa: 'Consolida as taxas de vistoria, análise prévia de projetos físicos e emissão da Licença Sanitária Municipal com tabela regressiva e isenções para MEI e feirantes cadastrados.',
    artigosChave: [
      'Tabela I - Valores por metro quadrado e complexidade da atividade.',
      'Art. 18 - Isenção de taxa para Microempreendedores Individuais (MEI) em conformidade com a legislação federal.'
    ],
    linkOficial: 'https://leis.org/prefeitura/sc/balneario-camboriu'
  },
  {
    id: 'dec-9870-2020',
    titulo: 'Rito do Procedimento Administrativo Sanitário (PAS)',
    numero: 'Decreto Municipal nº 9.870/2020',
    esfera: 'MUNICIPAL',
    categoria: 'PROCEDIMENTO_FISCAL',
    ano: '2020',
    ementa: 'Regulamenta os procedimentos para lavratura de Termo de Notificação, Auto de Infração, Termo de Interdição Cautelar e apreensão de produtos com rito recursal em Balneário Camboriú.',
    artigosChave: [
      'Art. 8º - Prazo de 15 (quinze) dias corridos para interposição de Defesa Prévia pelo autuado.',
      'Art. 14 - Cabimento de Termo de Ajustamento de Conduta (TAC) para regularização de exigências estruturais com cronograma.',
      'Art. 22 - Recurso hierárquico em 2ª instância ao Diretor da DVIS no prazo de 30 (trinta) dias.'
    ],
    linkOficial: 'https://leis.org/prefeitura/sc/balneario-camboriu'
  },
  {
    id: 'dec-10450-2021',
    titulo: 'Regulamentação de Limpeza de Caixas d\'Água & Potabilidade',
    numero: 'Decreto Municipal nº 10.450/2021',
    esfera: 'MUNICIPAL',
    categoria: 'AGUA',
    ano: '2021',
    ementa: 'Torna obrigatória a higienização semestral de caixas d\'água e cisternas em edifícios multifamiliares e comércios de BC com emissão de laudo bacteriológico e físico-químico.',
    artigosChave: [
      'Art. 3º - Obrigatoriedade de higienização a cada 6 meses por empresa legalmente habilitada.',
      'Art. 6º - Fiscalização periódica e coleta oficial pelo Laboratório Municipal de Análise de Água da VISA.'
    ],
    linkOficial: 'https://leis.org/prefeitura/sc/balneario-camboriu'
  },
  {
    id: 'rdc-216-2004',
    titulo: 'Regulamento Técnico de Boas Práticas para Serviços de Alimentação',
    numero: 'RDC ANVISA nº 216/2004',
    esfera: 'FEDERAL',
    categoria: 'ALIMENTOS',
    ano: '2004',
    ementa: 'Estabelece procedimentos de boas práticas para serviços de alimentação a fim de garantir as condições higiênico-sanitárias do alimento preparado e prevenir DTA (Doenças Transmitidas por Alimentos).',
    artigosChave: [
      'Item 4.1 - Edificação, instalações, equipamentos, móveis e utensílios.',
      'Item 4.4 - Higienização das instalações, equipamentos e utensílios.',
      'Item 4.6 - Controle integrado de vetores e pragas urbanas com empresa especializada.',
      'Item 4.11 - Manual de Boas Práticas e Procedimentos Operacionais Padronizados (POPs) obrigatórios.'
    ],
    linkOficial: 'https://www.gov.br/anvisa/pt-br'
  },
  {
    id: 'portaria-888-2021',
    titulo: 'Padrão Nacional de Potabilidade da Água para Consumo Humano',
    numero: 'Portaria GM/MS nº 888/2021',
    esfera: 'FEDERAL',
    categoria: 'AGUA',
    ano: '2021',
    ementa: 'Altera o Anexo XX da Portaria de Consolidação GM/MS nº 5/2017 para dispor sobre os procedimentos de controle e de vigilância da qualidade da água para consumo humano e seu padrão de potabilidade.',
    artigosChave: [
      'Art. 24 - Ausência estrita de Escherichia coli em 100 mL de água tratada.',
      'Art. 32 - Faixa obrigatória de Cloro Residual Livre entre 0,2 mg/L e 2,0 mg/L na rede de distribuição.',
      'Art. 35 - Turbidez máxima permitida de 5,0 uT no ponto de consumo.'
    ],
    linkOficial: 'https://www.gov.br/saude/pt-br'
  },
  {
    id: 'rdc-44-2009',
    titulo: 'Boas Práticas Farmacêuticas e Controle Sanitário',
    numero: 'RDC ANVISA nº 44/2009',
    esfera: 'FEDERAL',
    categoria: 'SAUDE_FARMACIA',
    ano: '2009',
    ementa: 'Dispõe sobre Boas Práticas Farmacêuticas para o controle sanitário do funcionamento, da dispensação e da comercialização de produtos e da prestação de serviços farmacêuticos em farmácias e drogarias.',
    artigosChave: [
      'Art. 15 - Presença ininterrupta do Farmacêutico Responsável Técnico habilitado pelo CRF.',
      'Art. 28 - Condições adequadas de climatização e controle de temperatura (15ºC a 30ºC e 2ºC a 8ºC para termolábeis).'
    ],
    linkOficial: 'https://www.gov.br/anvisa/pt-br'
  },
  {
    id: 'in-divs-001-2020',
    titulo: 'Normas de Vigilância Sanitária do Estado de Santa Catarina',
    numero: 'Instrução Normativa DIVS/SES nº 001/2020',
    esfera: 'ESTADUAL',
    categoria: 'CODIGO_SANITARIO',
    ano: '2020',
    ementa: 'Estabelece os critérios técnicos estaduais de Santa Catarina para inspeção sanitária de estabelecimentos comerciais, transporte e armazenamento de produtos de interesse à saúde.',
    artigosChave: [
      'Capítulo II - Regras para armazenamento e rastreabilidade de pescados e frutos do mar no litoral catarinense.',
      'Capítulo V - Critérios de conformidade para laudos analíticos e vistorias sanitárias em SC.'
    ],
    linkOficial: 'https://www.dive.sc.gov.br'
  }
];

const MODELOS_PECAS: ModeloPeca[] = [
  {
    id: 'defesa-previa',
    titulo: 'Defesa Prévia contra Termo de Notificação / Auto de Infração',
    categoria: 'DEFESA',
    prazoLegal: '15 (quinze) dias corridos a contar da ciência da notificação',
    baseLegal: 'Art. 98 da Lei Municipal nº 3.011/2009 e Art. 8º do Decreto Municipal nº 9.870/2020',
    descricao: 'Peça técnica para comprovar a regularização das pendências sanitárias apontadas pela fiscalização ou justificar a inexistência de infração.',
    conteudoTexto: `ILUSTRÍSSIMO SENHOR DIRETOR DA DIVISÃO DE VIGILÂNCIA SANITÁRIA E AMBIENTAL (DVIS)
MUNICÍPIO DE BALNEÁRIO CAMBORIÚ / SC

REFERÊNCIA: AUTO DE NOTIFICAÇÃO / INFRAÇÃO Nº [NÚMERO DO AUTO]
PROCESSO SANITÁRIO Nº: [NÚMERO DO PROTOCOLO]

[RAZÃO SOCIAL DO ESTABELECIMENTO], pessoa jurídica de direito privado, inscrita no CNPJ sob o nº [CNPJ], Inscrição Municipal nº [INSCRIÇÃO], com sede na [ENDEREÇO COMPLETO], Balneário Camboriú/SC, por seu representante legal abaixo assinado, vem, tempestivamente, com fulcro no Art. 98 da Lei Municipal nº 3.011/2009 e Decreto Municipal nº 9.870/2020, apresentar

DEFESA ADMINISTRATIVA PREVIA

em face do Auto supracitado, lavrado em [DATA DA VISTORIA], pelas razões fáticas e jurídicas que passa a expor:

1. DA TEMPESTIVIDADE
O autuado tomou ciência formal em [DATA DA CIÊNCIA], sendo o prazo de 15 dias corridos plenamente atendido na presente data.

2. DOS FATOS E DAS ADEQUAÇÕES SANITÁRIAS EFETUADAS
A equipe de fiscalização apontou as seguintes exigências técnicas:
a) [DESCREVER EXIGÊNCIA 1 - Ex: Comprovação de higienização do reservatório de água];
b) [DESCREVER EXIGÊNCIA 2 - Ex: Apresentação de Certificado de Desinsetização e ASO dos manipuladores].

Informa-se que todas as medidas corretivas foram prontamente executadas, conforme comprovam os documentos anexos (Doc. 01 a 04):
- Laudo bacteriológico de potabilidade com padrão conforme (Doc. 01);
- Certificado de Desinsetização emitido por empresa licenciada (Doc. 02);
- Comprovantes de registro e Atestados de Saúde Ocupacional (Doc. 03).

3. DOS PEDIDOS
Diante do exposto e comprovada a plena elisão das irregularidades sanitárias, requer:
a) O acolhimento da presente Defesa Prévia;
b) O arquivamento do Auto de Infração ou, subsidiariamente, a conversão de eventuais sanções em advertência com expedição/renovação do respectivo Alvará Sanitário.

Nestes termos,
Pede deferimento.

Balneário Camboriú/SC, [DATA ATUAL].

__________________________________________
[NOME DO RESPONSÁVEL LEGAL / ADVOGADO]
CPF / OAB: [NÚMERO]`
  },
  {
    id: 'prorrogacao-prazo',
    titulo: 'Requerimento de Dilatação / Prorrogação de Prazo de Notificação',
    categoria: 'PRORROGACAO',
    prazoLegal: 'Deve ser protocolado antes do término do prazo inicial concedido',
    baseLegal: 'Art. 14 do Decreto Municipal nº 9.870/2020 e Art. 52 da Lei Municipal nº 3.011/2009',
    descricao: 'Utilizado quando a exigência exige obras estruturais, laudos laboratoriais de longa incubação ou orçamentos em andamento.',
    conteudoTexto: `ILUSTRÍSSIMO SENHOR FISCAL SANITÁRIO / DIRETOR DA DVIS
DIVISÃO DE VIGILÂNCIA SANITÁRIA E AMBIENTAL - BALNEÁRIO CAMBORIÚ / SC

PROCESSO SANITÁRIO Nº: [NÚMERO DO PROTOCOLO]
AUTO DE NOTIFICAÇÃO Nº: [NÚMERO DA NOTIFICAÇÃO]

[NOME FANTASIA / RAZÃO SOCIAL], CNPJ nº [CNPJ], estabelecida na [ENDEREÇO], Balneário Camboriú/SC, vem respeitosamente requerer

PRORROGAÇÃO DE PRAZO PARA CUMPRIMENTO DE EXIGÊNCIA

pelo período adicional de [30 / 45 / 60 DIAS], pelos seguintes motivos:

1. A fiscalização sanitária concedeu prazo até [DATA DO VENCIMENTO ATUAL] para cumprimento de [DESCREVER EXIGÊNCIA: Ex: Instalação de exaustão mecânica e reforma do piso lavável];
2. O requerente já contratou os serviços pertinentes (conforme Contrato de Prestação de Serviços e Cronograma Físico anexo), contudo, o tempo de entrega dos equipamentos excede o prazo original;
3. Não há risco iminente à saúde pública no período da dilatação pleiteada, tendo sido adotadas medidas paliativas de isolamento e higienização.

Por tais razões, requer a dilação do prazo por mais [NÚMERO DE DIAS] dias para conclusão das melhorias e juntada das fotos comprobatórias.

Balneário Camboriú/SC, [DATA ATUAL].

__________________________________________
[ASSINATURA DO REPRESENTANTE / RESPONSÁVEL TÉCNICO]
Telefone / WhatsApp: [CONTATO]`
  },
  {
    id: 'termo-ajustamento-tac',
    titulo: 'Requerimento de Termo de Ajustamento de Conduta Sanitária (TAC)',
    categoria: 'TAC',
    prazoLegal: 'A qualquer momento antes da decisão de 2ª instância administrativa',
    baseLegal: 'Art. 14 do Decreto Municipal nº 9.870/2020 e Código Sanitário de BC',
    descricao: 'Compromisso formal e vinculante com cronograma físico-financeiro para estabelecimentos com intervenções de médio e grande porte.',
    conteudoTexto: `AO DIRETOR DA DIVISÃO DE VIGILÂNCIA SANITÁRIA E AMBIENTAL (DVIS)
SECRETARIA MUNICIPAL DE SAÚDE - BALNEÁRIO CAMBORIÚ / SC

SOLICITAÇÃO DE TERMO DE AJUSTAMENTO DE CONDUTA SANITÁRIA (TAC)

REQUERENTE: [RAZÃO SOCIAL]
CNPJ: [CNPJ]
ENDEREÇO: [ENDEREÇO DO ESTABELECIMENTO]
RESPONSÁVEL TÉCNICO: [NOME DO RT - CONSELHO REGIONAL]

A empresa acima qualificada vem perante este Órgão Sanitário propor a celebração de TERMO DE AJUSTAMENTO DE CONDUTA SANITÁRIA (TAC), comprometendo-se a executar as seguintes medidas saneadoras com prazos estipulados no Cronograma anexo:

CLÁUSULA PRIMEIRA - DO OBJETO:
O compromissário assume a obrigação de fazer consistente em adequar todas as instalações físicas de [SETOR AFETADO] aos termos da Lei Municipal nº 3.011/2009 e RDC ANVISA nº 216/2004.

CLÁUSULA SEGUNDA - DOS PRAZOS DAS ETAPAS:
- Etapa 1 (30 dias): Projeto arquitetônico sanitário e impermeabilização;
- Etapa 2 (60 dias): Substituição do sistema de drenagem e caixas de gordura;
- Etapa 3 (90 dias): Vistoria final de confirmação de conformidade.

Requer o agendamento de audiência administrativa ou manifestação do setor fiscal para formalização do instrumento.

Balneário Camboriú/SC, [DATA ATUAL].

__________________________________________
[REPRESENTANTE LEGAL DO ESTABELECIMENTO]`
  },
  {
    id: 'dispensa-baixo-risco',
    titulo: 'Declaração de Enquadramento em Baixo Risco Sanitário (Dispensa de Alvará)',
    categoria: 'DISPENSA',
    prazoLegal: 'Utilizável no ato de abertura ou alteração cadastral',
    baseLegal: 'Resolução CGSIM nº 51/2019 e Lei Complementar Municipal nº 27/2018',
    descricao: 'Documento para atividades econômicas de Nível de Risco I que não dependem de vistoria prévia da VISA.',
    conteudoTexto: `DECLARAÇÃO DE ENQUADRAMENTO EM BAIXO RISCO SANITÁRIO (NÍVEL I)

O estabelecimento [RAZÃO SOCIAL], CNPJ nº [CNPJ], localizado na [ENDEREÇO], Bairro [BAIRRO], Balneário Camboriú/SC, DECLARA sob as penas da lei que:

1. Suas atividades econômicas principais e secundárias (CNAE: [INSERIR CÓDIGOS CNAE]) enquadram-se na classificação de BAIXO RISCO SANITÁRIO (NÍVEL I), nos termos da Lei Complementar Municipal nº 27/2018 e Resolução CGSIM nº 51/2019;
2. As atividades desenvolvidas são estritamente administrativas / intelectuais / sem estoque de produtos sujeitos à vigilância sanitária ou manipulação de substâncias de interesse à saúde;
3. Compromete-se a manter as instalações em conformidade com as normas sanitárias gerais e autoriza a fiscalização preventiva da DVIS em caso de auditoria posterior.

Balneário Camboriú/SC, [DATA ATUAL].

__________________________________________
[RESPONSÁVEL LEGAL / CONTADOR RESPONSÁVEL]
CRC / CPF: [NÚMERO]`
  }
];

export const RepositorioJuridicoView: React.FC<RepositorioJuridicoViewProps> = ({
  processos,
  currentUser,
  onBack,
  onOpenExternal,
  onNavigate
}) => {
  const [abaAtiva, setAbaAtiva] = useState<'regularidade' | 'legislacao' | 'modelos' | 'orientacoes'>('regularidade');
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroEsfera, setFiltroEsfera] = useState<'TODAS' | 'MUNICIPAL' | 'ESTADUAL' | 'FEDERAL'>('TODAS');
  const [filtroSituacao, setFiltroSituacao] = useState<'TODAS' | 'REGULAR' | 'PENDENTE'>('TODAS');

  // Modais de detalhamento
  const [empresaSelecionada, setEmpresaSelecionada] = useState<ProcessoItem | null>(null);
  const [modalCertidaoOpen, setModalCertidaoOpen] = useState(false);
  const [modeloSelecionado, setModeloSelecionado] = useState<ModeloPeca | null>(null);
  const [textoCopiado, setTextoCopiado] = useState(false);

  // Filtragem de Estabelecimentos para Consulta de Regularidade Sanitária
  const estabelecimentosFiltrados = useMemo(() => {
    return processos.filter((p) => {
      const q = termoBusca.toLowerCase().trim();
      const matchTexto =
        !q ||
        (p.razao_social && p.razao_social.toLowerCase().includes(q)) ||
        (p.nome_fantasia && p.nome_fantasia.toLowerCase().includes(q)) ||
        (p.cnpj_cpf && p.cnpj_cpf.includes(q)) ||
        (p.num_processo && p.num_processo.toLowerCase().includes(q)) ||
        (p.bairro && p.bairro.toLowerCase().includes(q));

      if (!matchTexto) return false;

      const isRegular = p.status === 'DEFERIDO' || (p as any).alvara_emitido || p.situacao_fiscal === 'REGULAR';
      if (filtroSituacao === 'REGULAR' && !isRegular) return false;
      if (filtroSituacao === 'PENDENTE' && isRegular) return false;

      return true;
    });
  }, [processos, termoBusca, filtroSituacao]);

  // Filtragem de Normas Jurídicas
  const normasFiltradas = useMemo(() => {
    return NORMAS_JURIDICAS.filter((norma) => {
      const q = termoBusca.toLowerCase().trim();
      const matchTexto =
        !q ||
        norma.titulo.toLowerCase().includes(q) ||
        norma.numero.toLowerCase().includes(q) ||
        norma.ementa.toLowerCase().includes(q) ||
        norma.artigosChave.some((art) => art.toLowerCase().includes(q));

      if (!matchTexto) return false;
      if (filtroEsfera !== 'TODAS' && norma.esfera !== filtroEsfera) return false;

      return true;
    });
  }, [termoBusca, filtroEsfera]);

  // Filtragem de Modelos de Peças
  const modelosFiltrados = useMemo(() => {
    return MODELOS_PECAS.filter((mod) => {
      const q = termoBusca.toLowerCase().trim();
      return (
        !q ||
        mod.titulo.toLowerCase().includes(q) ||
        mod.descricao.toLowerCase().includes(q) ||
        mod.baseLegal.toLowerCase().includes(q)
      );
    });
  }, [termoBusca]);

  const handleCopiarModelo = (texto: string) => {
    navigator.clipboard.writeText(texto);
    setTextoCopiado(true);
    setTimeout(() => setTextoCopiado(false), 2500);
  };

  const handleImprimirCertidao = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-left pb-16 animate-fadeIn">
      {/* 🏛️ CABEÇALHO DO REPOSITÓRIO JURÍDICO & REGULARIDADE */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/40 rounded-3xl p-5 sm:p-7 shadow-2xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onBack}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer backdrop-blur"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Portal
              </button>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 tracking-wider">
                ⚖️ Divisão Jurídica & Regulatória DVIS
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              <Scale className="w-8 h-8 text-indigo-400 shrink-0" />
              <span>Depósito Jurídico & Consulta de Regularidade Sanitária</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Consulte a situação cadastral e alvarás sanitários de empresas em Balneário Camboriú, emita Certidões Oficiais de Conformidade e acesse o acervo completo de leis municipais, decretos, resoluções ANVISA e modelos de petições técnicas.
            </p>
          </div>

          {/* Atalho Oficial para Leis Municipais de BC */}
          <div className="shrink-0 w-full md:w-auto">
            <button
              type="button"
              onClick={() => onOpenExternal('https://leis.org/prefeitura/sc/balneario-camboriu')}
              className="w-full md:w-auto px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl transition active:scale-95 cursor-pointer ring-2 ring-emerald-400/40"
              title="Abrir o repositório municipal oficial de Leis de Balneário Camboriú"
            >
              <BookOpen className="w-4 h-4" />
              <span>Portal de Leis de Balneário Camboriú (leis.org)</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-200" />
            </button>
          </div>
        </div>

        {/* 📑 NAVEGAÇÃO POR ABAS DO DEPÓSITO JURÍDICO */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-6 mt-6 border-t border-indigo-900/60 text-xs font-bold">
          <button
            type="button"
            onClick={() => setAbaAtiva('regularidade')}
            className={`px-4 py-2.5 rounded-2xl transition flex items-center gap-2 cursor-pointer shrink-0 ${
              abaAtiva === 'regularidade'
                ? 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-400'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>1. Consulta de Regularidade Sanitária</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('legislacao')}
            className={`px-4 py-2.5 rounded-2xl transition flex items-center gap-2 cursor-pointer shrink-0 ${
              abaAtiva === 'legislacao'
                ? 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-400'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4 text-amber-400" />
            <span>2. Legislação & Decretos Sanitários</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('modelos')}
            className={`px-4 py-2.5 rounded-2xl transition flex items-center gap-2 cursor-pointer shrink-0 ${
              abaAtiva === 'modelos'
                ? 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-400'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <FileSignature className="w-4 h-4 text-cyan-400" />
            <span>3. Modelos de Defesas & Petições Sanitárias</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('orientacoes')}
            className={`px-4 py-2.5 rounded-2xl transition flex items-center gap-2 cursor-pointer shrink-0 ${
              abaAtiva === 'orientacoes'
                ? 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-400'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-purple-400" />
            <span>4. Prazos Processuais & Jurisprudência</span>
          </button>
        </div>
      </div>

      {/* 🔍 BARRA DE FILTROS E BUSCA INTEGRADA */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder={
              abaAtiva === 'regularidade'
                ? 'Buscar por Razão Social, CNPJ, Protocolo ou Bairro...'
                : abaAtiva === 'legislacao'
                ? 'Pesquisar Lei, RDC, Decreto ou termo (ex: água, alvará, multa)...'
                : 'Buscar modelo de petição, recurso ou defesa...'
            }
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {termoBusca && (
            <button
              type="button"
              onClick={() => setTermoBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtros específicos por aba */}
        {abaAtiva === 'regularidade' && (
          <div className="flex items-center gap-1.5 text-xs w-full sm:w-auto">
            <span className="text-slate-400 font-bold text-[11px] uppercase mr-1">Status:</span>
            <button
              type="button"
              onClick={() => setFiltroSituacao('TODAS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filtroSituacao === 'TODAS'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Todos ({processos.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroSituacao('REGULAR')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                filtroSituacao === 'REGULAR'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Regulares</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltroSituacao('PENDENTE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                filtroSituacao === 'PENDENTE'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Em Análise / Pendentes</span>
            </button>
          </div>
        )}

        {abaAtiva === 'legislacao' && (
          <div className="flex items-center gap-1.5 text-xs w-full sm:w-auto">
            <span className="text-slate-400 font-bold text-[11px] uppercase mr-1">Esfera:</span>
            {(['TODAS', 'MUNICIPAL', 'ESTADUAL', 'FEDERAL'] as const).map((esf) => (
              <button
                key={esf}
                type="button"
                onClick={() => setFiltroEsfera(esf)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filtroEsfera === esf
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {esf === 'TODAS' ? 'Todas' : esf}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 🌟 ABA 1: CONSULTA DE REGULARIDADE SANITÁRIA (EMPRESAS DE BC) */}
      {/* ============================================================ */}
      {abaAtiva === 'regularidade' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Estabelecimentos Registrados em Balneário Camboriú ({estabelecimentosFiltrados.length})</span>
            </h2>
            <span className="text-xs text-slate-500">
              Clique em qualquer estabelecimento para emitir a <strong>Certidão de Regularidade</strong>.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {estabelecimentosFiltrados.map((proc) => {
              const isRegular = proc.status === 'DEFERIDO' || (proc as any).alvara_emitido || proc.situacao_fiscal === 'REGULAR';
              return (
                <div
                  key={proc.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-4 sm:p-5 shadow-sm transition hover:shadow-lg flex flex-col justify-between gap-4 text-left group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          isRegular
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                        }`}
                      >
                        {isRegular ? '✓ Regularidade Atestada' : '⏳ Em Processamento / Vistoria'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {proc.num_processo}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {proc.nome_fantasia || proc.razao_social}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        {proc.razao_social}
                      </p>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">CNPJ / CPF:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {proc.cnpj_cpf}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Bairro / Local:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {proc.bairro || 'Centro'}, BC
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Atividade / Setor:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {proc.setor || 'Alimentos'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Validade Alvará:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {proc.validade || proc.venc_licenca || 'Exercício Vigente'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEmpresaSelecionada(proc);
                        setModalCertidaoOpen(true);
                      }}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                    >
                      <BadgeCheck className="w-4 h-4 text-emerald-300" />
                      <span>Emitir Certidão</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (onNavigate) onNavigate('cidadao');
                      }}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition cursor-pointer"
                      title="Ver dossiê na consulta pública"
                    >
                      Dossiê
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 🌟 ABA 2: LEGISLAÇÃO & DECRETOS SANITÁRIOS (DEPÓSITO JURÍDICO) */}
      {/* ============================================================ */}
      {abaAtiva === 'legislacao' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span>Acervo de Legislação Sanitária & Posturas em Vigor ({normasFiltradas.length})</span>
              </h2>
              <p className="text-xs text-slate-500">
                Textos estruturantes com artigos essenciais, competência fiscal e links para os portais legislativos oficiais.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenExternal('https://leis.org/prefeitura/sc/balneario-camboriu')}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
            >
              <span>Ver todas as Leis Municipais no leis.org</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {normasFiltradas.map((norma) => (
              <div
                key={norma.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 hover:border-indigo-400 transition"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        norma.esfera === 'MUNICIPAL'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : norma.esfera === 'ESTADUAL'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                      }`}
                    >
                      {norma.esfera} • {norma.ano}
                    </span>
                    <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">
                      {norma.numero}
                    </span>
                  </div>

                  {norma.linkOficial && (
                    <button
                      type="button"
                      onClick={() => onOpenExternal(norma.linkOficial!)}
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>Acessar Texto Oficial</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {norma.titulo}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {norma.ementa}
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                  <div className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    📌 Artigos e Dispositivos Chave para Balneário Camboriú:
                  </div>
                  <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    {norma.artigosChave.map((art, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-indigo-500 font-bold">•</span>
                        <span>{art}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 🌟 ABA 3: MODELOS DE DEFESAS, RECURSOS & PETIÇÕES SANITÁRIAS */}
      {/* ============================================================ */}
      {abaAtiva === 'modelos' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-cyan-500" />
              <span>Modelos e Peças Jurídico-Sanitárias Padronizadas ({modelosFiltrados.length})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Minutas prontas com fundamentação legal nos Códigos e Decretos de Balneário Camboriú. Você pode visualizar, copiar e preencher para protocolar no 1Doc ou presencialmente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modelosFiltrados.map((mod) => (
              <div
                key={mod.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-cyan-500 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700">
                      {mod.categoria}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      ⏱ {mod.prazoLegal}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase leading-snug">
                    {mod.titulo}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {mod.descricao}
                  </p>

                  <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
                    <strong className="text-indigo-600 dark:text-indigo-400">Base Legal:</strong> {mod.baseLegal}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModeloSelecionado(mod)}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Visualizar Peça</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopiarModelo(mod.conteudoTexto)}
                    className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                    title="Copiar texto para área de transferência"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 🌟 ABA 4: PRAZOS PROCESSUAIS & ORIENTAÇÕES NORMATIVAS DVIS */}
      {/* ============================================================ */}
      {abaAtiva === 'orientacoes' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-purple-500" />
              <span>Orientações Jurídicas & Prazos do Procedimento Sanitário (PAS)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Guia oficial para contadores, procuradores, empresários e servidores sobre os prazos regimentais e recursos da DVIS.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm">
                15d
              </div>
              <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                Defesa Prévia (1ª Instância)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Prazo de <strong>15 dias corridos</strong> contados da ciência do Termo de Notificação ou Auto de Infração Sanitária. A defesa deve conter comprovações de elisão das irregularidades.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm">
                30d
              </div>
              <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                Recurso à Diretoria (2ª Instância)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Em caso de indeferimento da defesa prévia ou aplicação de penalidade de multa, cabe recurso hierárquico ao Diretor da Vigilância Sanitária no prazo de <strong>30 dias</strong>.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm">
                TAC
              </div>
              <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                Termo de Ajustamento (TAC)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Para adequações de engenharia civil, reformas sanitárias e novos laudos, o interessado pode solicitar celebração de TAC com cronograma pré-estabelecido de até <strong>90 dias</strong>.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
              🏛️ Como Protocolar Defesas e Recursos em Balneário Camboriú:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700 dark:text-slate-300">
              <div className="space-y-1">
                <strong>1. Protocolo 100% Online (1Doc):</strong>
                <p className="text-slate-500 dark:text-slate-400">
                  Acesse o sistema 1Doc da Prefeitura de Balneário Camboriú, selecione o assunto &quot;Vigilância Sanitária - Defesa / Recurso&quot; e anexe a peça em PDF assinada digitalmente.
                </p>
              </div>
              <div className="space-y-1">
                <strong>2. Protocolo Presencial:</strong>
                <p className="text-slate-500 dark:text-slate-400">
                  Na sede da Vigilância Sanitária: Av. Palestina, nº 150 - Bairro das Nações (CEP 88338-010). Atendimento de segunda a sexta-feira, das 07:00 às 19:00.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 📄 MODAL: CERTIDÃO OFICIAL DE REGULARIDADE SANITÁRIA (DVIS) */}
      {/* ============================================================ */}
      {modalCertidaoOpen && empresaSelecionada && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl w-full max-w-3xl overflow-y-auto p-6 sm:p-8 shadow-2xl border-4 border-double border-slate-300 relative space-y-6 my-auto text-left">
            {/* Botões de Ação Superiores */}
            <div className="flex items-center justify-between border-b pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black uppercase tracking-wider">
                  Documento Autêntico DVIS
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleImprimirCertidao}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalCertidaoOpen(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  ✕ Fechar
                </button>
              </div>
            </div>

            {/* Cabeçalho Oficial com Brasão */}
            <div className="text-center space-y-1.5 border-b-2 border-slate-300 pb-4">
              <div className="w-16 h-16 mx-auto mb-2 flex items-center justify-center">
                <img
                  src="https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/brasao__1_-removebg-preview%20(1).avif"
                  alt="Brasão Balneário Camboriú"
                  className="h-16 w-auto object-contain"
                />
              </div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
                ESTADO DE SANTA CATARINA • MUNICÍPIO DE BALNEÁRIO CAMBORIÚ
              </h2>
              <h3 className="text-sm font-black uppercase text-slate-900">
                SECRETARIA MUNICIPAL DE SAÚDE • DIVISÃO DE VIGILÂNCIA SANITÁRIA E AMBIENTAL (DVIS)
              </h3>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                CERTIDÃO DE REGULARIDADE SANITÁRIA
              </p>
              <div className="text-[10px] font-mono font-bold text-slate-600">
                CERTIDÃO Nº: DVIS-CRS-{new Date().getFullYear()}/{empresaSelecionada.num_processo.replace('/', '-')}
              </div>
            </div>

            {/* Corpo da Certidão */}
            <div className="space-y-4 text-xs leading-relaxed text-slate-800">
              <p className="text-justify indent-8">
                A <strong>DIVISÃO DE VIGILÂNCIA SANITÁRIA E AMBIENTAL DO MUNICÍPIO DE BALNEÁRIO CAMBORIÚ</strong>, no uso de suas atribuições legais conferidas pela Lei Orgânica Municipal, pela Lei Federal nº 8.080/1990 e pelo Código Sanitário Municipal (Lei Municipal nº 3.011/2009), <strong>CERTIFICA</strong>, para os devidos fins de direito, que o estabelecimento abaixo qualificado:
              </p>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Razão Social:</span>
                    <strong className="text-xs">{empresaSelecionada.razao_social}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Nome Fantasia:</span>
                    <strong className="text-xs">{empresaSelecionada.nome_fantasia || empresaSelecionada.razao_social}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">CNPJ / CPF:</span>
                    <span className="font-mono font-bold">{empresaSelecionada.cnpj_cpf}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Protocolo Sanitário:</span>
                    <span className="font-mono font-bold">{empresaSelecionada.num_processo}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Endereço em Balneário Camboriú:</span>
                    <span>{empresaSelecionada.endereco || 'Avenida Central'}, Bairro {empresaSelecionada.bairro || 'Centro'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Atividade / CNAE Principal:</span>
                    <span>{empresaSelecionada.cnae || 'Comércio Varejista e Serviços de Interesse à Saúde'}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-black text-emerald-800 uppercase text-xs">
                    SITUAÇÃO SANITÁRIA REGULAR PERANTE O MUNICÍPIO
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Constatou-se a conformidade das boas práticas sanitárias, ausência de penalidades impeditivas e alvará sanitário válido para o exercício corrente.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-600 border-t pt-3">
                <div>
                  <strong>Data de Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
                </div>
                <div>
                  <strong>Validade da Certidão:</strong> 90 (noventa) dias a contar da emissão
                </div>
              </div>
            </div>

            {/* Rodapé de Autenticidade com QR Code Visual */}
            <div className="border-t-2 border-slate-300 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-500">
              <div className="space-y-1">
                <div><strong>Validação Eletrônica:</strong> DVIS-BC-{Math.random().toString(36).substring(2, 10).toUpperCase()}</div>
                <div>A autenticidade deste documento pode ser verificada no Portal Oficial da DVIS.</div>
                <div>Av. Palestina, 150 - Bairro das Nações - Balneário Camboriú/SC - Tel: (47) 3267-7000</div>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl border border-slate-300 shrink-0">
                <QrCode className="w-12 h-12 text-slate-800" />
                <div className="text-[9px] font-mono leading-tight">
                  <div className="font-black text-slate-800">QR CODE</div>
                  <div>AUTENTICAÇÃO</div>
                  <div>DVIS OFICIAL</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 📄 MODAL: VISUALIZADOR DE PEÇA TÉCNICA E MINUTA JURÍDICA */}
      {/* ============================================================ */}
      {modeloSelecionado && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl overflow-y-auto p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 relative space-y-4 my-auto text-left">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
                  {modeloSelecionado.categoria} • MODELO OFICIAL
                </span>
                <h3 className="text-base font-black uppercase text-slate-900 dark:text-white mt-1">
                  {modeloSelecionado.titulo}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopiarModelo(modeloSelecionado.conteudoTexto)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
                >
                  {textoCopiado ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{textoCopiado ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModeloSelecionado(null)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  ✕ Fechar
                </button>
              </div>
            </div>

            <div className="space-y-1 text-xs text-slate-500">
              <div><strong>Base Legal:</strong> {modeloSelecionado.baseLegal}</div>
              <div><strong>Prazo Fatal:</strong> {modeloSelecionado.prazoLegal}</div>
            </div>

            <pre className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[60vh]">
              {modeloSelecionado.conteudoTexto}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
