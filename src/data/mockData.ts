import { UserProfile, EscalaItem, FeiranteItem, RecadoMural, ChatMessage, FiscalizacaoItem, ProcessoItem, AmostraLaboratorioItem, PontoColetaLaboratorio, ServidorColetaLaboratorio, LaboratorialistaResponsavel } from '../types';

const today = new Date();
const todayMM = String(today.getMonth() + 1).padStart(2, '0');
const todayDD = String(today.getDate()).padStart(2, '0');

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'u1',
    email: 'fiscal@bc.sc.gov.br',
    nome_completo: 'Carlos Eduardo Silva',
    data_nascimento: `1985-${todayMM}-${todayDD}`,
    cargo: 'FISCAL DE VIGILÂNCIA SANITÁRIA',
    setor: 'VIGILÂNCIA SANITÁRIA',
    nivel_acesso: 'VISA (FISCAL)',
    matricula: 'FIS-4092',
    senha: '123456'
  },
  {
    id: 'u2',
    email: 'agente@bc.sc.gov.br',
    nome_completo: 'Ana Paula Oliveira',
    data_nascimento: '1990-11-20',
    cargo: 'AGENTE DE ENDEMIAS',
    setor: 'VIGILÂNCIA AMBIENTAL',
    nivel_acesso: 'VISA (FEIRAS)',
    matricula: 'AGE-1104',
    senha: '123456'
  },
  {
    id: 'u3',
    email: 'diretor@bc.sc.gov.br',
    nome_completo: 'Dr. Roberto Mendes',
    data_nascimento: '1978-03-08',
    cargo: 'DIRETOR PMCD',
    setor: 'VIGILÂNCIA SANITÁRIA E AMBIENTAL',
    nivel_acesso: 'MASTER (TUDO)',
    matricula: 'DIR-0001',
    senha: '123456'
  },
  {
    id: 'u4',
    email: 'master@bc.sc.gov.br',
    nome_completo: 'Administrador Master VISA',
    data_nascimento: '1980-01-01',
    cargo: 'MASTER ADM',
    setor: 'VIGILÂNCIA SANITÁRIA E AMBIENTAL',
    nivel_acesso: 'MASTER (TUDO)',
    matricula: 'MST-0000',
    senha: '123456'
  }
];

export const INITIAL_ESCALA: EscalaItem[] = [
  {
    id: 'esc-1',
    data: new Date().toISOString().split('T')[0],
    tipo: 'PLANTAO',
    servidores: 'CARLOS SILVA / ANA OLIVEIRA',
    descricao: 'Plantão Noturno Orla & Feira da Cultura'
  },
  {
    id: 'esc-2',
    data: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    tipo: 'PLANTAO',
    servidores: 'MARCOS VINICIUS / LUCIA PEREIRA',
    descricao: 'Inspeção Estabelecimentos Gastronômicos Centro'
  },
  {
    id: 'esc-3',
    data: '2026-08-07',
    tipo: 'EVENTO',
    servidores: 'EQUIPE COMPLETA DVIS',
    descricao: 'Operação Verão Balneário Camboriú Blitz Noturna'
  },
  {
    id: 'esc-4',
    data: '2026-09-07',
    tipo: 'FERIADO',
    servidores: 'ESCALA DE EMERGÊNCIA 24H',
    descricao: 'Independência do Brasil - Plantão Especial'
  }
];

export const INITIAL_FEIRAS: FeiranteItem[] = [
  {
    id: '101',
    data_prot: '2026-01-15',
    num_prot: '2026/00142',
    feira: 'DA cultura, da orla',
    pasta: 'A-12',
    cpf: '123.456.789-00',
    nome_pf: 'JOÃO BATISTA DOS SANTOS',
    produtos: 'Pastéis artesanais e caldos de cana',
    validade: '2026-12-31',
    rua: 'Praça da Bíblia',
    num: 'S/N',
    bairro: 'Centro',
    vinculo: 'SIM',
    func: '2',
    abertura: '2021',
    cnpj: '34.567.890/0001-12',
    razao: 'J. B. SANTOS ALIMENTOS ME',
    rua_api: 'Av. Brasil',
    num_api: '1200',
    municipio: 'BALNEÁRIO CAMBORIÚ',
    estado: 'SC',
    cnae: '5611-2/03 Lanchonetes, casas de chá, de sucos e similares',
    alvara: 'SIM'
  },
  {
    id: '102',
    data_prot: '2026-02-10',
    num_prot: '2026/00891',
    feira: 'do pescador',
    pasta: 'B-04',
    cpf: '987.654.321-11',
    nome_pf: 'MARIA APARECIDA DA SILVA',
    produtos: 'Pescados frescos e frutos do mar embalados',
    validade: '2026-11-15',
    rua: 'Rua 2000',
    num: '450',
    bairro: 'Centro',
    vinculo: 'NÃO',
    func: '1',
    abertura: '2019',
    alvara: 'SIM'
  },
  {
    id: '103',
    data_prot: '2026-03-01',
    num_prot: '2026/01204',
    feira: 'da rua 200',
    pasta: 'C-08',
    cpf: '456.789.123-33',
    nome_pf: 'ROBERTO CARLOS KOHN',
    produtos: 'Queijos coloniais, embutidos e geleias',
    validade: '2026-10-30',
    rua: 'Rua 200',
    num: '110',
    bairro: 'Nações',
    vinculo: 'SIM',
    func: '3',
    abertura: '2018',
    cnpj: '12.345.678/0001-99',
    razao: 'KOHN PRODUTOS COLONIAIS LTDA',
    rua_api: 'Rua Israel',
    num_api: '55',
    municipio: 'BALNEÁRIO CAMBORIÚ',
    estado: 'SC',
    cnae: '4721-1/04 Comércio varejista de laticínios e frios',
    alvara: 'SIM'
  }
];

export const INITIAL_MURAL: RecadoMural[] = [
  {
    id: 'm-1',
    autor: 'Coordenação VISA',
    cargo: 'DIRETOR',
    data: 'Hoje - 08:30',
    titulo: 'ALERTA DE FISCALIZAÇÃO - OPERAÇÃO VERÃO',
    conteudo: 'Reforço na fiscalização de food trucks na Orla e feiras livres referente à refrigeração de pescados e ovos.',
    prioridade: 'URGENTE'
  },
  {
    id: 'm-2',
    autor: 'Laboratório Central',
    cargo: 'FISCAL',
    data: 'Ontem - 16:45',
    titulo: 'Laudos de Coleta de Água da Praia',
    conteudo: 'Os laudos de análise bacteriológica das amostras coletadas na Praia Central estão disponíveis na aba Laboratório.',
    prioridade: 'NORMAL'
  }
];

export const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'c-1',
    sender: 'Carlos Silva',
    role: 'FISCAL',
    time: '08:45',
    text: 'Iniciando vistoria de rotina nos quiosques da Feira da Cultura.'
  },
  {
    id: 'c-2',
    sender: 'Ana Oliveira',
    role: 'AGENTE',
    time: '08:52',
    text: 'Acompanhando equipe na Rua 2000. Sistema de emissão de Termos operando normal em tempo real.'
  }
];

export const INITIAL_FISCALIZACOES: FiscalizacaoItem[] = [
  {
    id: 'fisc-2026-001',
    protocolo: 'FIS-2026/0491',
    dataHora: '2026-07-30 09:15',
    fiscalId: 'u1',
    fiscalNome: 'Carlos Eduardo Silva',
    estabelecimento: {
      nomeFantasia: 'Restaurante Mariscos do Porto',
      razaoSocial: 'PORTO MARISCOS E RESTAURANTE LTDA',
      cnpjCpf: '28.910.221/0001-40',
      tipo: 'Restaurante / frutos do mar',
      bairro: 'Barra',
      endereco: 'Av. Beira Rio',
      numero: '850',
      responsavel: 'Fernando Dutra',
      telefone: '(47) 99881-2233'
    },
    tipoVistoria: 'ROTINA',
    risco: 'ALTO',
    status: 'NOTIFICADO',
    checklists: [
      { id: 'chk-1', categoria: 'Higiene e Limpeza', item: 'Higienização de bancadas e utensílios', status: 'NAO_CONFORME', observacao: 'Restos de matéria orgânica acumulados sob a bancada de corte de peixes' },
      { id: 'chk-2', categoria: 'Temperatura e Alimentos', item: 'Controle de temperatura de câmaras frias', status: 'NAO_CONFORME', observacao: 'Câmara de congelados operando a +2°C (exigido -18°C)' },
      { id: 'chk-3', categoria: 'Documentação', item: 'Alvará Sanitário vigente', status: 'CONFORME', observacao: 'Alvará válido até 12/2026' },
      { id: 'chk-4', categoria: 'Controle de Pragas', item: 'Comprovante de desinsetização', status: 'CONFORME', observacao: 'Certificado atualizado de empresa especializada' }
    ],
    irregularidadesEncontradas: [
      'Câmara fria com temperatura inadequada para congelados (+2°C em vez de <= -18°C).',
      'Acúmulo de sujidade e restos orgânicos sob a bancada de manipulação de frutos do mar.'
    ],
    medidasAdotadas: 'Termo de Intimação com suspensão preventiva de congelados sem identificação e prazo de 48h para correção térmica.',
    prazoAdequacaoDias: 2,
    observacoesFiscais: 'Orientado o responsável quanto às exigências da RDC 216/2004 ANVISA.',
    fotosUrl: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80'],
    coordenadas: { lat: -27.0035, lng: -48.5891 },
    parecerIA: 'Fundamentação legal: RDC Anvisa nº 216/2004 item 4.8 e Lei Municipal de Saúde. Risco moderado a alto de proliferação bacteriana por oscilação térmica.'
  },
  {
    id: 'fisc-2026-002',
    protocolo: 'FIS-2026/0492',
    dataHora: '2026-07-30 10:30',
    fiscalId: 'u2',
    fiscalNome: 'Ana Paula Oliveira',
    estabelecimento: {
      nomeFantasia: 'Quiosque Sabor da Ilha (Feira da Orla)',
      razaoSocial: 'MARIA APARECIDA DA SILVA',
      cnpjCpf: '987.654.321-11',
      tipo: 'Feira Livre / Lanchonete',
      bairro: 'Centro',
      endereco: 'Av. Atlântica',
      numero: 'Quiosque 14',
      responsavel: 'Maria Aparecida',
      telefone: '(47) 99112-4455'
    },
    tipoVistoria: 'ROTINA',
    risco: 'BAIXO',
    status: 'CONFORME',
    checklists: [
      { id: 'chk-10', categoria: 'Higiene e Limpeza', item: 'Uso de uniformes limpos e toucas', status: 'CONFORME' },
      { id: 'chk-11', categoria: 'Documentação', item: 'Credencial de feirante VISA', status: 'CONFORME' },
      { id: 'chk-12', categoria: 'Armazenamento', item: 'Lixeiras com acionamento por pedal', status: 'CONFORME' }
    ],
    irregularidadesEncontradas: [],
    medidasAdotadas: 'Termo de Vistoria Conforme concedido.',
    prazoAdequacaoDias: 0,
    observacoesFiscais: 'Estabelecimento atende rigorosamente as normas vigentes para feirantes.',
    fotosUrl: ['https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=600&q=80'],
    coordenadas: { lat: -26.9922, lng: -48.6345 },
    parecerIA: 'Vistoria regular com conformidade total às normas sanitárias municipais.'
  },
  {
    id: 'fisc-2026-003',
    protocolo: 'FIS-2026/0493',
    dataHora: '2026-07-30 11:00',
    fiscalId: 'u1',
    fiscalNome: 'Carlos Eduardo Silva',
    estabelecimento: {
      nomeFantasia: 'Supermercado e Açougue Beira Mar',
      razaoSocial: 'SUPERMERCADO BEIRA MAR EIRELI',
      cnpjCpf: '10.203.040/0001-50',
      tipo: 'Supermercado / Açougue',
      bairro: 'Nações',
      endereco: 'Av. Estado',
      numero: '2400',
      responsavel: 'Jorge Alcantara',
      telefone: '(47) 3367-1000'
    },
    tipoVistoria: 'DENÚNCIA',
    risco: 'CRÍTICO',
    status: 'INTERDITADO',
    checklists: [
      { id: 'chk-20', categoria: 'Qualidade dos Alimentos', item: 'Validade e rotulagem de carnes', status: 'NAO_CONFORME', observacao: 'Presença de 45kg de carne bovina moída previamente sem rotulagem de data de moagem' },
      { id: 'chk-21', categoria: 'Procedência', item: 'Selo de Inspeção SIM/SISP/SIF em cárneos', status: 'NAO_CONFORME', observacao: 'Cortes sem comprovação de origem e sem carimbo de abatedouro oficial' }
    ],
    irregularidadesEncontradas: [
      'Comércio de carne previamente moída (proibido por legislação sanitária sem embalagem industrial).',
      'Falta de comprovante de origem/inspeção veterinária de produto de origem animal (45 kg apreendidos).'
    ],
    medidasAdotadas: 'Auto de Infração e Termo de Interdição Cautelar do setor de açougue. Apreensão e descarte de 45kg de carnes irregulares.',
    prazoAdequacaoDias: 5,
    observacoesFiscais: 'Interdição cautelar imediata da seção de manipulação de carnes até adequação e apresentação de defesa.',
    fotosUrl: ['https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=600&q=80'],
    coordenadas: { lat: -26.9850, lng: -48.6380 },
    parecerIA: 'Infração grave à legislação sanitária de produtos de origem animal e Código de Defesa do Consumidor. Risco iminente à saúde pública.'
  }
];

export const INITIAL_PROCESSOS: ProcessoItem[] = [
  {
    id: 'proc-1',
    num_processo: '2026/00101',
    data_protocolo: '2026-04-25',
    data_entrada: '2026-04-25',
    data_1doc: '2026-04-25',
    venc_1doc: '2026-05-25',
    prot_1doc: '1DOC-98421/2026',
    pasta: '46514',
    setor: 'ALIMENTAÇÃO',
    motivacao: 'ALVARÁ SANITÁRIO INICIAL',
    cnpj_cpf: '60.541.108/0001-13',
    razao_social: 'RESTAURANTE O QUINTAL BC LTDA',
    nome_fantasia: 'O QUINTAL BC',
    cep: '88330-378',
    endereco: 'RUA 2700',
    numero_complemento: '708',
    bairro: 'Centro',
    situacao_cadastral: 'ATIVA',
    motivo_situacao: 'SEM MOTIVO',
    data_situacao: '2025-04-25',
    venc_licenca: '2026-10-22',
    grau_risco: 'ALTO RISCO',
    cnaes: [
      '⭐ 5611201 - Restaurantes e similares (Baixo Risco)',
      '4729699 - Comércio varejista de produtos alimentícios em geral ou especializado em produtos alimentícios não especificados anteriormente (Alto Risco)',
      '5611203 - Lanchonetes, casas de chá, de sucos e similares (Baixo Risco)',
      '5620104 - Fornecimento de alimentos preparados preponderantemente para consumo domiciliar (Médio Risco)'
    ],
    fiscal_responsavel: 'Carlos Eduardo Silva',
    data_entregue_fiscal: '2026-04-26',
    status: 'EM ANÁLISE',
    observacoes: 'Aguardando agendamento de vistoria técnica presencial no local.',
    agendado_para: '2026-08-28T14:30',
    conclusao: 'EM ANÁLISE',
    pas: 'PAS-2026/044',
    assunto: 'Alvará Sanitário Inicial',
    validade: '22/10/2026',
    servidores: [
      { id: 'u1', nome: 'Carlos Eduardo Silva', matricula: 'FIS-4092' }
    ]
  },
  {
    id: 'proc-2',
    num_processo: '2026/00142',
    data_protocolo: '2026-03-10',
    data_entrada: '2026-03-10',
    data_1doc: '2026-03-10',
    venc_1doc: '2026-04-10',
    prot_1doc: '1DOC-77123/2026',
    pasta: '38902',
    setor: 'ALIMENTAÇÃO',
    motivacao: 'RENOVAÇÃO DE LICENÇA',
    cnpj_cpf: '63.691.709/0001-09',
    razao_social: 'NOSSA PADARIA LTDA',
    nome_fantasia: 'NOSSA PADARIA',
    cep: '88338-000',
    endereco: 'AVENIDA PALESTINA',
    numero_complemento: '870',
    bairro: 'Nações',
    situacao_cadastral: 'ATIVA',
    motivo_situacao: 'SEM MOTIVO',
    data_situacao: '2024-01-15',
    venc_licenca: '2026-12-31',
    grau_risco: 'MÉDIO RISCO',
    cnaes: [
      '1091-1/02 - Fabricação de produtos de padaria e confeitaria (Médio Risco)',
      '4721-1/02 - Padaria e confeitaria com predominância de revenda (Baixo Risco)'
    ],
    fiscal_responsavel: 'Carlos Eduardo Silva, Ana Paula Oliveira',
    data_entregue_fiscal: '2026-03-11',
    status: 'DEFERIDO',
    observacoes: 'Vistoria realizada com laudo de boas práticas sanitárias aprovado.',
    agendado_para: '',
    conclusao: 'APROVADO / EMITIDO',
    pas: '',
    assunto: 'Renovação de Alvará Sanitário 2026',
    validade: '31/12/2026',
    servidores: [
      { id: 'u1', nome: 'Carlos Eduardo Silva', matricula: 'FIS-4092' },
      { id: 'u2', nome: 'Ana Paula Oliveira', matricula: 'AGE-1104' }
    ]
  },
  {
    id: 'proc-3',
    num_processo: '2026/00205',
    data_protocolo: '2026-05-02',
    data_entrada: '2026-05-02',
    data_1doc: '2026-05-02',
    venc_1doc: '2026-06-02',
    prot_1doc: '1DOC-88994/2026',
    pasta: '51200',
    setor: 'SAÚDE',
    motivacao: 'LICENÇA INICIAL DE MEDICAMENTOS',
    cnpj_cpf: '98.765.432/0001-10',
    razao_social: 'DROGARIA E FARMÁCIA CENTRAL SC',
    nome_fantasia: 'FARMÁCIA CENTRAL',
    cep: '88330-050',
    endereco: 'RUA 1500',
    numero_complemento: '420, SALA 01',
    bairro: 'Pioneiros',
    situacao_cadastral: 'ATIVA',
    motivo_situacao: 'SEM MOTIVO',
    data_situacao: '2023-08-10',
    venc_licenca: '2026-12-31',
    grau_risco: 'ALTO RISCO',
    cnaes: [
      '4771-7/01 - Comércio varejista de produtos farmacêuticos, sem manipulação (Alto Risco)'
    ],
    fiscal_responsavel: 'Dr. Roberto Mendes',
    data_entregue_fiscal: '2026-05-03',
    status: 'PENDENTE DOCS',
    observacoes: 'Notificado para apresentar CRF do Responsável Técnico Farmacêutico.',
    agendado_para: '',
    conclusao: 'EM ANDAMENTO',
    pas: 'PAS-2026/019',
    assunto: 'Licença de Funcionamento - Farmácia',
    validade: '31/12/2026',
    servidores: [
      { id: 'u3', nome: 'Dr. Roberto Mendes', matricula: 'DIR-0001' }
    ]
  }
];

export const BAIRROS_BC = [
  'Aririba',
  'Barra',
  'Centro',
  'Estados',
  'Estaleirinho',
  'Estaleiro',
  'Iate Clube',
  'Laranjeiras',
  'Municipios',
  'Nações',
  'Nova Esperança',
  'Pinho',
  'Pioneiros',
  'Praia dos Amores',
  'São Judas',
  'Taquaras',
  'Taquarinhas',
  'Várzea do Ranchinho',
  'Vila Real'
];

export const INITIAL_PONTOS_COLETA: PontoColetaLaboratorio[] = [
  {
    id: 'pto-1',
    ponto: 'Ponto 01 - Pontal Norte',
    local: 'Deck do Pontal Norte / Foz do Canal',
    endereco: 'Av. Atlântica, final norte (Deck do Pontal)',
    bairro: 'Pioneiros',
    tipo_matriz_padrao: 'ÁGUA POTÁVEL',
    observacao: 'Ponto de monitoramento e rede pública da orla norte.'
  },
  {
    id: 'pto-2',
    ponto: 'Ponto 02 - Praia Central (Rua 1400)',
    local: 'Posto Salva-Vidas 02 / Chuveirões Orla',
    endereco: 'Av. Atlântica esq. Rua 1400',
    bairro: 'Centro',
    tipo_matriz_padrao: 'ÁGUA POTÁVEL',
    observacao: 'Ponto central de grande circulação turística.'
  },
  {
    id: 'pto-3',
    ponto: 'Ponto 03 - Barra Sul / Molhe',
    local: 'Molhe da Barra Sul / Ponto de Hidrante e Quiosques',
    endereco: 'Av. Atlântica, final sul próx. Passarela da Barra',
    bairro: 'Barra',
    tipo_matriz_padrao: 'ÁGUA POTÁVEL',
    observacao: 'Ponto de verificação de pressão e cloro residual livre da rede sul.'
  },
  {
    id: 'pto-4',
    ponto: 'Ponto 04 - Praia de Laranjeiras',
    local: 'Trapiche de Laranjeiras / Restaurantes',
    endereco: 'Rodovia Interpraias, km 3 - Orla de Laranjeiras',
    bairro: 'Laranjeiras',
    tipo_matriz_padrao: 'ÁGUA POTÁVEL',
    observacao: 'Ponto turístico gastronômico de alta demanda.'
  },
  {
    id: 'pto-5',
    ponto: 'Ponto 05 - Praia de Taquaras',
    local: 'Escola Municipal / Posto de Saúde Taquaras',
    endereco: 'Estrada Geral de Taquaras, 550',
    bairro: 'Taquaras',
    tipo_matriz_padrao: 'ÁGUA POTÁVEL',
    observacao: 'Amostragem em unidade escolar e abastecimento da comunidade.'
  },
  {
    id: 'pto-6',
    ponto: 'Ponto 06 - Praia do Estaleiro',
    local: 'Acesso Principal Praia do Estaleiro',
    endereco: 'Av. Rodesindo Pavan, próx. Rua Vereador Domingos Fonseca',
    bairro: 'Estaleiro',
    tipo_matriz_padrao: 'ÁGUA POTÁVEL',
    observacao: 'Monitoramento da rede pública na região das praias agrestes.'
  },
  {
    id: 'pto-7',
    ponto: 'Ponto 07 - Bairro das Nações (UPA)',
    local: 'UPA das Nações - Torneira do Laboratório/Copa',
    endereco: 'Rua Israel, 450',
    bairro: 'Nações',
    tipo_matriz_padrao: 'ÁGUA POTÁVEL',
    observacao: 'Unidade de saúde pública prioritária.'
  },
  {
    id: 'pto-8',
    ponto: 'Ponto 08 - Bairro dos Municípios',
    local: 'Centro Educacional Municipal Vereador Santa',
    endereco: 'Rua 2450 esq. 4ª Avenida',
    bairro: 'Municipios',
    tipo_matriz_padrao: 'ÁGUA POTÁVEL',
    observacao: 'Rede escolar pública municipal.'
  }
];

export const INITIAL_LABORATORIO: AmostraLaboratorioItem[] = [
  {
    id: 'lab-1',
    codigo_amostra: '169',
    protocolo: '60.455/2026',
    mes_ano_referencia: 'JULHO /2026',
    responsavel_distribuicao: 'EMASA',
    interessado: 'MERCADO BAGÉ LTDA',
    cnpj_cpf: '63.457.239/0001-05',
    numero_alvara: 'Solicitado',
    endereco: 'Rua 1500, 381 - CENTRO - Balneário Camboriú/SC - 88.330-528',
    local_coleta: 'TORNEIRA CAFETERIA',
    bairro: 'Centro',
    estabelecimento: 'MERCADO BAGÉ LTDA',
    data_coleta: '2026-07-15',
    hora_coleta: '08:20',
    fiscal_coletor: 'Rita Sahd',
    tipo_matriz: 'ÁGUA POTÁVEL',
    observacoes: 'ANÁLISE SOLICITADA PARA VERIFICAR QUALIDADE DA ÁGUA PARA CONSUMO HUMANO',
    aspecto: 'Límpido',
    odor: 'Inobjetável',
    cor: 'Incolor',
    ph: '7,0',
    equipamento_ph: 'pH indicator strips MQuant 0 – 14 Marca MERCK',
    cloro: '1,59',
    equipamento_cloro: 'Chlorine Reagente for 10ml Sample(DLA-CL)',
    fluoreto: '0,72',
    equipamento_fluor: 'Colorímetro Digital para Flúor (Modelo DLA-FL)',
    turbidez: '0,52',
    equipamento_turbidez: 'Turbidímetro Digital modelo DLT-WV',
    coliformes_totais: 'AUSENTE',
    metodologia_coliformes_totais: 'Kit Analisis Colilert –DST-P/A em cartela QUANTY-TRAY/2000-MARCA IDEXX+QUANTY TRAY SEALER – Model 2 X +estufa FABBE PRIMAR 36ºC100 ml por 24 horas',
    escherichia_coli: 'AUSENTE',
    metodologia_escherichia_coli: 'KIT ANALISES COLILERT-DST-P/A em cartela QUANTY-TRAY/2000-marca IDEXX+QUANTY TRAY SEALER – Model 2 X + estufa FABBE PRIMAR 36ºC100ml por 24 horas + LONG WAVE Ultravioleta 365 NM – marca CE.',
    status: 'CONFORME',
    laudo_numero: '169/2026',
    data_resultado: '2026-08-04',
    conclusao_laudo: 'Para os parâmetros analisados, a amostra está em ACORDO com a Portaria GM/MS Nº 888, de 4 maio de 2021. Água PRÓPRIA para o consumo humano, considerando os parâmetros descritos.',
    laboratorialista: 'ADRIANO GUARDINI',
    cargo_laboratorialista: 'FARMACÊUTICO E BIOQUIMICO',
    registro_conselho: 'CRF/SC- 3321',
    responsavel_analise: 'Laboratório Central Municipal VISA'
  },
  {
    id: 'lab-2',
    codigo_amostra: '170',
    protocolo: '60.458/2026',
    mes_ano_referencia: 'JULHO /2026',
    responsavel_distribuicao: 'EMASA',
    interessado: 'REDE PÚBLICA MUNICIPAL',
    cnpj_cpf: '83.102.285/0001-07',
    numero_alvara: 'Isento',
    endereco: 'Av. Atlântica esq. Rua 1400 - Centro',
    local_coleta: 'POSTO SALVA-VIDAS 02',
    bairro: 'Centro',
    estabelecimento: 'Posto de Salva-Vidas 02',
    data_coleta: '2026-07-16',
    hora_coleta: '09:40',
    fiscal_coletor: 'Carlos Eduardo Silva',
    tipo_matriz: 'ÁGUA POTÁVEL',
    observacoes: 'Controle de qualidade de água da orla da Praia Central.',
    aspecto: 'Límpido',
    odor: 'Inobjetável',
    cor: 'Incolor',
    ph: '7,2',
    equipamento_ph: 'pH indicator strips MQuant 0 – 14 Marca MERCK',
    cloro: '1,45',
    equipamento_cloro: 'Chlorine Reagente for 10ml Sample(DLA-CL)',
    fluoreto: '0,75',
    equipamento_fluor: 'Colorímetro Digital para Flúor (Modelo DLA-FL)',
    turbidez: '0,48',
    equipamento_turbidez: 'Turbidímetro Digital modelo DLT-WV',
    coliformes_totais: 'AUSENTE',
    escherichia_coli: 'AUSENTE',
    status: 'CONFORME',
    laudo_numero: '170/2026',
    data_resultado: '2026-08-04',
    conclusao_laudo: 'Para os parâmetros analisados, a amostra está em ACORDO com a Portaria GM/MS Nº 888, de 4 maio de 2021. Água PRÓPRIA para o consumo humano, considerando os parâmetros descritos.',
    laboratorialista: 'ADRIANO GUARDINI',
    cargo_laboratorialista: 'FARMACÊUTICO E BIOQUIMICO',
    registro_conselho: 'CRF/SC- 3321',
    responsavel_analise: 'Laboratório Central Municipal VISA'
  }
];

export const INITIAL_COLETORES_LABORATORIO: ServidorColetaLaboratorio[] = [
  {
    id: 'col-serv-1',
    nome_completo: 'Rita Sahd',
    cargo: 'FISCAL DE VIGILÂNCIA SANITÁRIA',
    matricula: 'FIS-1044',
    email: 'rita.sahd@bc.sc.gov.br',
    telefone: '(47) 99123-4567',
    ativo: true,
    observacao: 'Fiscal responsável por coletas de água potável da rede central e estabelecimentos.'
  },
  {
    id: 'col-serv-2',
    nome_completo: 'Carlos Eduardo Silva',
    cargo: 'FISCAL DE VIGILÂNCIA SANITÁRIA',
    matricula: 'FIS-4092',
    email: 'fiscal@bc.sc.gov.br',
    telefone: '(47) 99234-5678',
    ativo: true,
    observacao: 'Coletas em postos de salva-vidas e orla municipal.'
  },
  {
    id: 'col-serv-3',
    nome_completo: 'Ana Paula Oliveira',
    cargo: 'AGENTE DE ENDEMIAS / COLETORA',
    matricula: 'AGE-1104',
    email: 'agente@bc.sc.gov.br',
    telefone: '(47) 99345-6789',
    ativo: true,
    observacao: 'Apoio em coletas programadas e monitoramentos de campo.'
  },
  {
    id: 'col-serv-4',
    nome_completo: 'Marcio Alexandre Formento',
    cargo: 'MASTER / FISCAL SANITÁRIO',
    matricula: '40606',
    email: 'manof1@gmail.com',
    telefone: '(47) 99876-5432',
    ativo: true,
    observacao: 'Coletas especiais e fiscalização de alta complexidade.'
  },
  {
    id: 'col-serv-5',
    nome_completo: 'Dr. Roberto Mendes',
    cargo: 'DIRETOR DE VIGILÂNCIA SANITÁRIA',
    matricula: 'DIR-0001',
    email: 'diretoria.visa@bc.sc.gov.br',
    telefone: '(47) 3267-7000',
    ativo: true,
    observacao: 'Coordenação geral e auditorias sanitárias.'
  }
];

export const INITIAL_LABORATORIALISTAS: LaboratorialistaResponsavel[] = [
  {
    id: 'lab-resp-1',
    nome_completo: 'ADRIANO GUARDINI',
    funcao: 'FARMACÊUTICO E BIOQUIMICO',
    conselho_regional: 'CRF',
    registro_conselho: 'CRF/SC- 3321',
    email: 'adriano.guardini@bc.sc.gov.br',
    telefone: '(47) 3267-7050',
    ativo: true,
    padrao: true,
    observacao: 'Responsável Técnico Oficial pelas análises físico-químicas e microbiológicas da água de consumo humano.'
  },
  {
    id: 'lab-resp-2',
    nome_completo: 'DRA. JULIANA M. SOUZA',
    funcao: 'FARMACÊUTICA E BIOQUÍMICA',
    conselho_regional: 'CRF',
    registro_conselho: 'CRF/SC- 4182',
    email: 'juliana.souza@bc.sc.gov.br',
    telefone: '(47) 3267-7051',
    ativo: true,
    padrao: false,
    observacao: 'Analista substituta para laudos de microbiologia e controle de qualidade.'
  },
  {
    id: 'lab-resp-3',
    nome_completo: 'MARCOS VINICIUS ALMEIDA',
    funcao: 'BIÓLOGO / ANALISTA MICROBIOLÓGICO',
    conselho_regional: 'CRBio',
    registro_conselho: 'CRBio/09- 11204',
    email: 'marcos.almeida@bc.sc.gov.br',
    telefone: '(47) 3267-7052',
    ativo: true,
    padrao: false,
    observacao: 'Especialista em análises microbiológicas (Colilert, E. coli e Coliformes Totais).'
  }
];

