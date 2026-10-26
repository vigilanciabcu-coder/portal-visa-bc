// Dados Oficiais da Normativa do Rito Processual Sanitário
// Lei Estadual nº 6.320/1983 e Lei Complementar Municipal nº 40/2019 (Balneário Camboriú)

export interface IncisoLegalDef {
  inciso: string;
  rotulo: string;
  descricaoCompleta: string;
  artigo: string;
  lei: string;
}

export const INCISOS_ART_61_LEI_ESTADUAL_6320: IncisoLegalDef[] = [
  {
    inciso: 'I',
    rotulo: 'Inciso I - Construir, instalar ou fazer funcionar sem licença/alvará',
    descricaoCompleta: 'Construir, instalar ou fazer funcionar estabelecimentos sujeitos a controle sanitário sem a devida licença ou alvará do órgão sanitário competente.',
    artigo: 'Art. 61',
    lei: 'Lei Estadual nº 6.320/1983'
  },
  {
    inciso: 'II',
    rotulo: 'Inciso II - Praticar atos de comércio/indústria sem autorização',
    descricaoCompleta: 'Praticar atos de comércio, extração, produção, fabricação, transformação, preparo, manipulação, purificação, fracionamento, embalagem ou reembalagem, importação, exportação, armazenamento, expedição, transporte, compra ou venda de produtos de interesse à saúde sem registro, licença ou autorização do órgão sanitário competente.',
    artigo: 'Art. 61',
    lei: 'Lei Estadual nº 6.320/1983'
  },
  {
    inciso: 'III',
    rotulo: 'Inciso III - Não cumprir normas de potabilidade da água / reservatórios',
    descricaoCompleta: 'Deixar de cumprir as normas de potabilidade de água ou negligenciar a higienização periódica de reservatórios, caixas d\'água ou sistemas de abastecimento.',
    artigo: 'Art. 61',
    lei: 'Lei Estadual nº 6.320/1983'
  },
  {
    inciso: 'IV',
    rotulo: 'Inciso IV - Alimentos deteriorados, sem procedência ou corrompidos',
    descricaoCompleta: 'Expor à venda, fabricar, manter em depósito ou fornecer para consumo humano produtos alimentícios deteriorados, fraudados, adulterados, sem procedência comprovada ou sem inspeção sanitária oficial.',
    artigo: 'Art. 61',
    lei: 'Lei Estadual nº 6.320/1983'
  },
  {
    inciso: 'V',
    rotulo: 'Inciso V - Descumprir normas de boas práticas e controle térmico',
    descricaoCompleta: 'Inobservar as exigências de boas práticas na manipulação de alimentos, condições higiênicas, controle de temperatura de alimentos quentes e frios e proteção contra contaminação cruzada.',
    artigo: 'Art. 61',
    lei: 'Lei Estadual nº 6.320/1983'
  },
  {
    inciso: 'VI',
    rotulo: 'Inciso VI - Validade expirada ou rotulagem em desacordo',
    descricaoCompleta: 'Entregar ao consumo produtos alimentícios, saneantes, cosméticos ou medicamentos com prazo de validade expirado, sem rotulagem ou com informações adulteradas/falsificadas.',
    artigo: 'Art. 61',
    lei: 'Lei Estadual nº 6.320/1983'
  },
  {
    inciso: 'VII',
    rotulo: 'Inciso VII - Dificultar, embaraçar ou iludir a ação fiscal',
    descricaoCompleta: 'Opor-se, embaraçar, dificultar ou tentar iludir por qualquer meio a ação fiscalizadora exercida pelas autoridades de vigilância sanitária.',
    artigo: 'Art. 61',
    lei: 'Lei Estadual nº 6.320/1983'
  },
  {
    inciso: 'VIII',
    rotulo: 'Inciso VIII - Descumprir determinações de Auto de Intimação anterior',
    descricaoCompleta: 'Desrespeitar, desacatar ou deixar de cumprir as obrigações e exigências fixadas em Auto de Intimação sanitária regularmente lavrado e com prazo expirado.',
    artigo: 'Art. 61',
    lei: 'Lei Estadual nº 6.320/1983'
  },
  {
    inciso: 'IX',
    rotulo: 'Inciso IX - Descumprir boas práticas farmacêuticas ou falta de RT',
    descricaoCompleta: 'Funcionar estabelecimento farmacêutico, ótico ou de saúde sem assistência técnica efetiva de profissional legalmente habilitado perante o conselho regional de classe ou descumprir as boas práticas regulamentadas.',
    artigo: 'Art. 61',
    lei: 'Lei Estadual nº 6.320/1983'
  },
  {
    inciso: 'X',
    rotulo: 'Inciso X - Manter criadouros ou descumprir controle de pragas',
    descricaoCompleta: 'Manter instalações em condições que favoreçam a proliferação de vetores, insetos, roedores e animais sinantrópicos ou deixar de apresentar controle integrado de pragas habilitado.',
    artigo: 'Art. 61',
    lei: 'Lei Estadual nº 6.320/1983'
  },
  {
    inciso: 'XI',
    rotulo: 'Inciso XI - Outras infrações às normas sanitárias estaduais',
    descricaoCompleta: 'Descumprir quaisquer outras normas, regulamentos técnicos, portarias ou instruções normativas baixadas pelas autoridades sanitárias do Estado de Santa Catarina.',
    artigo: 'Art. 61',
    lei: 'Lei Estadual nº 6.320/1983'
  }
];

export const INCISOS_ART_158_LCM_40_2019: IncisoLegalDef[] = [
  {
    inciso: 'I',
    rotulo: 'Inciso I - Exercer atividade sem Alvará Sanitário Municipal',
    descricaoCompleta: 'Iniciar ou manter em funcionamento qualquer atividade comercial, industrial, prestadora de serviços ou ambulante sujeita à fiscalização sanitária sem o devido Alvará Sanitário Municipal de Balneário Camboriú.',
    artigo: 'Art. 158',
    lei: 'Lei Complementar Municipal nº 40/2019'
  },
  {
    inciso: 'II',
    rotulo: 'Inciso II - Descumprir exigências de Auto de Intimação da DVIS',
    descricaoCompleta: 'Deixar de sanar irregularidades sanitárias no prazo concedido pela Divisão de Vigilância Sanitária em Auto de Intimação regular.',
    artigo: 'Art. 158',
    lei: 'Lei Complementar Municipal nº 40/2019'
  },
  {
    inciso: 'III',
    rotulo: 'Inciso III - Instalações, piso e equipamentos em condições higiênicas inadequadas',
    descricaoCompleta: 'Manter dependências, bancadas, instalações físicas, piso, tetos, sanitários ou equipamentos de produção em estado deficiente de asseio, conservação ou higiene.',
    artigo: 'Art. 158',
    lei: 'Lei Complementar Municipal nº 40/2019'
  },
  {
    inciso: 'IV',
    rotulo: 'Inciso IV - Inobservar regras de descarte de resíduos e óleo vegetal',
    descricaoCompleta: 'Inobservar os padrões municipais para acondicionamento, coleta e destinação final de resíduos sólidos, gorduras, óleos vegetais de fritura ou esgoto sanitário.',
    artigo: 'Art. 158',
    lei: 'Lei Complementar Municipal nº 40/2019'
  },
  {
    inciso: 'V',
    rotulo: 'Inciso V - Falta de limpeza semestral de reservatório de água ou desinsetização',
    descricaoCompleta: 'Deixar de comprovar a higienização e desinfecção semestral dos reservatórios de água ou o controle periódico de pragas por empresa licenciada.',
    artigo: 'Art. 158',
    lei: 'Lei Complementar Municipal nº 40/2019'
  },
  {
    inciso: 'VI',
    rotulo: 'Inciso VI - Impedir, embaraçar ou desacatar fiscalização sanitária municipal',
    descricaoCompleta: 'Impedir a entrada dos fiscais sanitários nas dependências do estabelecimento, recusar o fornecimento de informações cadastrais ou desrespeitar os agentes públicos.',
    artigo: 'Art. 158',
    lei: 'Lei Complementar Municipal nº 40/2019'
  },
  {
    inciso: 'VII',
    rotulo: 'Inciso VII - Violação de lacres, selos ou termos de interdição cautelar',
    descricaoCompleta: 'Romper, remover, violar ou danificar lacres, termos de interdição, selos ou faixas apostas pela Vigilância Sanitária em decorrência de medida cautelar.',
    artigo: 'Art. 158',
    lei: 'Lei Complementar Municipal nº 40/2019'
  },
  {
    inciso: 'VIII',
    rotulo: 'Inciso VIII - Poluição ambiental ou risco à saúde pública em área municipal',
    descricaoCompleta: 'Praticar qualquer ato ou manter atividade que exponha a coletividade a riscos de contaminação, proliferação de vetores ou poluição em Balneário Camboriú.',
    artigo: 'Art. 158',
    lei: 'Lei Complementar Municipal nº 40/2019'
  },
  {
    inciso: 'IX',
    rotulo: 'Inciso IX - Manipuladores sem ASO ou capacitação em higiene',
    descricaoCompleta: 'Manter funcionários na manipulação direta de alimentos sem Atestado de Saúde Ocupacional (ASO) em dia ou sem capacitação comprovada em Boas Práticas.',
    artigo: 'Art. 158',
    lei: 'Lei Complementar Municipal nº 40/2019'
  },
  {
    inciso: 'X',
    rotulo: 'Inciso X - Descumprimento geral do Código Sanitário de Balneário Camboriú',
    descricaoCompleta: 'Infringir qualquer outro preceito legal do Código Sanitário Municipal (Lei Municipal nº 3.011/2009 e Lei Complementar Municipal nº 40/2019).',
    artigo: 'Art. 158',
    lei: 'Lei Complementar Municipal nº 40/2019'
  }
];

export const DESCRICOES_ETAPAS_RITO = {
  ORIENTACAO: {
    numero: '1',
    titulo: 'Orientação / Conscientização Sanitária (Ação Educativa)',
    descricao: 'Abordagem educativa inicial ao estabelecimento com recomendações de boas práticas sanitárias e formalização pedagógica.',
    cor: 'blue'
  },
  INTIMACAO: {
    numero: '2',
    titulo: 'Auto de Intimação (Fixação de Prazos de Adequação)',
    descricao: 'Formalização das irregularidades verificadas e fixação de prazo legal para cumprimento das exigências sanitárias.',
    cor: 'amber'
  },
  INFRACAO: {
    numero: '3',
    titulo: 'Auto de Infração (Instauração Obrigatória do PAS)',
    descricao: 'Ato formal que instaura o Processo Administrativo Sanitário com fundamentação no Art. 61 LE 6.320/83 e Art. 158 LCM 40/2019, irregularidade objetiva e Relatório Circunstanciado.',
    cor: 'red'
  },
  MEDIDA_CAUTELAR: {
    numero: '4',
    titulo: 'Auto de Intimação de Medida Cautelar (Peça Exclusiva)',
    descricao: 'Peça privativa com qualificação de produtos, equipamentos, aposição de lacres, definição de fiel depositário e abertura compulsória de PAS.',
    cor: 'purple'
  },
  IMPOSICAO_PENALIDADE: {
    numero: '5',
    titulo: 'Auto de Imposição de Penalidade (Decisão da Diretoria / Julgamento do PAS)',
    descricao: 'Documento decisório lavrado pela Autoridade Sanitária com o julgamento do PAS e as penas aplicadas.',
    cor: 'slate'
  }
};
