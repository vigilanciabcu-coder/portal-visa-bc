import { PortalButton } from '../../types';

export type PortalCategoria = 
  | 'TODOS'
  | 'OPERACIONAL'
  | 'GESTAO_ADM'
  | 'CONTRIBUINTE'
  | 'CIDADAO'
  | 'SISTEMAS_EXTERNOS';

export interface PortalButtonDef extends PortalButton {
  categoria_portal: PortalCategoria;
  descricao?: string;
  destaque?: boolean;
}

export const PORTAL_BUTTONS_CONFIG: PortalButtonDef[] = [
  // 1. MÓDULO OPERACIONAL & FISCALIZAÇÃO SANITÁRIA
  {
    id: 'demandas_fiscal',
    nome: 'Minhas Demandas (Fiscal)',
    descricao: 'Ordens de serviço atribuídas, vistorias in loco e emissão de pareceres',
    url: '',
    img: 'demandas-fiscal',
    acao: 'view',
    view: 'demandas_fiscal',
    badgetext: 'FISCAL',
    perfisPermitidos: ['SERVIDOR'],
    categoria_portal: 'OPERACIONAL',
    destaque: true
  },
  {
    id: 'demandas_diretor',
    nome: 'Painel da Diretoria (Demandas)',
    descricao: 'Distribuição de demandas, sorteio randômico e BI executivo',
    url: '',
    img: 'demandas-diretor',
    acao: 'view',
    view: 'demandas_diretor',
    badgetext: 'DIRETORIA',
    perfisPermitidos: ['SERVIDOR'],
    categoria_portal: 'OPERACIONAL',
    destaque: true
  },
  {
    id: 'alvara_visa',
    nome: 'ALVARÁ SANITÁRIO',
    descricao: 'Emissão, renovação e consulta de alvarás oficiais com autenticação digital',
    url: '',
    img: 'alvara',
    acao: 'view',
    view: 'alvara_visa',
    badgetext: 'OFICIAL',
    perfisPermitidos: ['SERVIDOR', 'CONTABILIDADE', 'CIDADAO', 'CONTRIBUINTE'],
    categoria_portal: 'OPERACIONAL',
    destaque: true
  },
  {
    id: 'fisc',
    nome: 'FISCALIZAÇÃO',
    descricao: 'Módulo de inspeção sanitária in loco, autos de intimação e termos',
    url: '',
    img: 'shield',
    acao: 'view',
    view: 'fiscalizacao',
    perfisPermitidos: ['SERVIDOR'],
    categoria_portal: 'OPERACIONAL'
  },
  {
    id: 'tlab',
    nome: 'Laboratório VISA',
    descricao: 'Análises de água potável, balneabilidade, alimentos e laudos oficiais',
    url: '',
    img: 'lab-icon',
    acao: 'view',
    view: 'laboratorio',
    perfisPermitidos: ['SERVIDOR'],
    categoria_portal: 'OPERACIONAL'
  },
  {
    id: 'feir',
    nome: 'FEIRAS',
    descricao: 'Controle de feirantes cadastrados, alvarás temporários e eventos',
    url: '',
    img: 'tent',
    acao: 'view',
    view: 'feiras',
    perfisPermitidos: ['SERVIDOR', 'CONTRIBUINTE'],
    categoria_portal: 'OPERACIONAL'
  },
  {
    id: 'mapa',
    nome: 'GEO VISA & Mapa',
    descricao: 'Geoprocessamento sanitário, rotas de fiscalização e mapa de calor',
    url: '',
    img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/mapa.avif',
    acao: 'view',
    view: 'geo_visa',
    badgetext: 'ROTAS',
    perfisPermitidos: ['SERVIDOR', 'CONTABILIDADE', 'CIDADAO', 'CONTRIBUINTE'],
    categoria_portal: 'OPERACIONAL'
  },

  // 2. MÓDULO CONTRIBUINTE & ESCRITÓRIO CONTÁBIL
  {
    id: 'tproc_lab',
    nome: 'Carteira de Processos',
    descricao: 'Acompanhamento do alvará do seu CNPJ ou carteira de empresas contábeis',
    url: '',
    img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/processos.avif',
    acao: 'view',
    view: 'processos_lab',
    badgetext: 'CARTEIRA',
    somenteMaster: false,
    perfisPermitidos: ['CONTABILIDADE', 'CONTRIBUINTE'],
    categoria_portal: 'CONTRIBUINTE',
    destaque: true
  },
  {
    id: 'alva',
    nome: 'Portal do Cidadão - Alvará',
    descricao: 'Emissão oficial de taxas e guias de alvará sanitário da Prefeitura',
    url: 'https://cidadao.bc.sc.gov.br/cidadao/balneario_camboriu/portal/servicos/alvaras?params=MTQ%3D',
    img: 'alvara',
    acao: 'link',
    perfisPermitidos: ['SERVIDOR', 'CONTABILIDADE', 'CIDADAO', 'CONTRIBUINTE'],
    categoria_portal: 'CONTRIBUINTE'
  },
  {
    id: 'debi',
    nome: 'Consulta de Débitos',
    descricao: 'Portal tributário municipal de certidões negativas e débitos',
    url: 'https://cidadao.bc.sc.gov.br/cidadao/balneario_camboriu/portal/servicos/debitos?params=NA%3D%3D',
    img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/consultadedebitos.avif',
    acao: 'link',
    perfisPermitidos: ['SERVIDOR', 'CONTABILIDADE', 'CIDADAO', 'CONTRIBUINTE'],
    categoria_portal: 'CONTRIBUINTE'
  },
  {
    id: 'regi',
    nome: 'Regin / JUCESC',
    descricao: 'Sistema Integrado de Abertura e Licenciamento Empresarial',
    url: 'http://200.19.203.151:8080/SiarcoWeb/loginAction.do',
    img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/regin.avif',
    acao: 'link',
    perfisPermitidos: ['SERVIDOR', 'CONTABILIDADE'],
    categoria_portal: 'CONTRIBUINTE'
  },

  // 3. MÓDULO CIDADÃO & CONSULTAS PÚBLICAS
  {
    id: 'cidadao_view',
    nome: 'Consulta Pública (Munícipe)',
    descricao: 'Verifique se um restaurante, mercado ou clínica possui alvará sanitário válido',
    url: '',
    img: 'alvara',
    acao: 'view',
    view: 'cidadao',
    badgetext: 'PÚBLICO',
    perfisPermitidos: ['CIDADAO', 'SERVIDOR', 'CONTRIBUINTE', 'CONTABILIDADE'],
    categoria_portal: 'CIDADAO',
    destaque: true
  },
  {
    id: '1doc',
    nome: '1Doc • Protocolos Online',
    descricao: 'Abertura de chamados, protocolos, defesas sanitárias e denúncias',
    url: 'https://bc.1doc.com.br/b.php?pg=o/login&n=3',
    img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/1Doc.avif',
    acao: 'link',
    perfisPermitidos: ['SERVIDOR', 'CONTABILIDADE', 'CIDADAO', 'CONTRIBUINTE'],
    categoria_portal: 'CIDADAO',
    destaque: true
  },
  {
    id: 'pref',
    nome: 'Prefeitura de Balneário Camboriú',
    descricao: 'Portal institucional oficial da Prefeitura Municipal de Balneário Camboriú',
    url: 'https://www.bc.sc.gov.br/',
    img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/brasao__1_-removebg-preview%20(1).avif',
    acao: 'link',
    perfisPermitidos: ['SERVIDOR', 'CONTABILIDADE', 'CIDADAO', 'CONTRIBUINTE'],
    categoria_portal: 'CIDADAO'
  },
  {
    id: 'cnpj',
    nome: 'Receita Federal • Consulta CNPJ',
    descricao: 'Emissão de comprovante de inscrição e situação cadastral do CNPJ',
    url: 'https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/',
    img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/cnpj_edited.avif',
    acao: 'link',
    perfisPermitidos: ['SERVIDOR', 'CONTABILIDADE', 'CIDADAO', 'CONTRIBUINTE'],
    categoria_portal: 'CIDADAO'
  },
  {
    id: 'leis',
    nome: 'Legislação Municipal & Leis',
    descricao: 'Códigos sanitários, leis municipais e decretos em vigor de Balneário Camboriú',
    url: 'https://leismunicipais.com.br/legislacao-municipal/4511/leis-de-balneario-camboriu',
    img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/leismunicipais.avif',
    acao: 'link',
    perfisPermitidos: ['SERVIDOR', 'CONTABILIDADE', 'CIDADAO', 'CONTRIBUINTE'],
    categoria_portal: 'CIDADAO'
  },

  // 4. MÓDULO GESTÃO ADMINISTRATIVA & APOIO
  {
    id: 'pasta_visa',
    nome: 'PASTA VISA',
    descricao: 'Arquivo e conferência cadastral com vinculação de processos municipais',
    url: '',
    img: 'folder-archive',
    acao: 'view',
    view: 'pasta_visa',
    badgetext: 'ADM',
    perfisPermitidos: ['SERVIDOR'],
    categoria_portal: 'GESTAO_ADM'
  },
  {
    id: 'agen',
    nome: 'AGENDA & PLANTÃO',
    descricao: 'Escala de plantão dos fiscais sanitários e eventos operacionais',
    url: '',
    img: 'calendar',
    acao: 'view',
    view: 'agenda',
    perfisPermitidos: ['SERVIDOR'],
    categoria_portal: 'GESTAO_ADM'
  },
  {
    id: 'cnae_btn',
    nome: 'CNAE Sanitário',
    descricao: 'Tabela de códigos de atividade econômica e exigências de responsabilidade técnica',
    url: '',
    img: 'cnae-icon',
    acao: 'view',
    view: 'cnae',
    badgetext: 'VISA',
    perfisPermitidos: ['SERVIDOR'],
    categoria_portal: 'GESTAO_ADM'
  },
  {
    id: 'telefone_btn',
    nome: 'Telefones & Ramais',
    descricao: 'Agenda interna de ramais telefônicos dos setores e secretarias municipais',
    url: '',
    img: 'phone-icon',
    acao: 'view',
    view: 'telefone',
    badgetext: 'RAMAIS',
    perfisPermitidos: ['SERVIDOR', 'CONTABILIDADE', 'CIDADAO', 'CONTRIBUINTE'],
    categoria_portal: 'GESTAO_ADM'
  },
  {
    id: 'domm',
    nome: 'DOM • Diário Oficial dos Municípios',
    descricao: 'Publicações de editais, termos sanitários e resoluções no diário oficial',
    url: 'https://diariomunicipal.sc.gov.br/?r=site/portal&codigoEntidade=31',
    img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/diario-.avif',
    acao: 'link',
    perfisPermitidos: ['SERVIDOR', 'CONTABILIDADE'],
    categoria_portal: 'GESTAO_ADM'
  },

  // 5. SISTEMAS CORPORATIVOS & RECURSOS HUMANOS
  {
    id: 'ahgo',
    nome: 'Ahgora • Ponto Biométrico',
    descricao: 'Registro eletrônico de frequência dos servidores públicos',
    url: 'https://app.ahgora.com.br/externo/index/prefeiturabc',
    img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/sistemadepontobiometrico.avif',
    acao: 'link',
    perfisPermitidos: ['SERVIDOR'],
    categoria_portal: 'SISTEMAS_EXTERNOS'
  },
  {
    id: 'mail',
    nome: 'BC Mail • E-mail Institucional',
    descricao: 'Caixa de entrada oficial (@bc.sc.gov.br)',
    url: 'https://mail.bc.sc.gov.br/',
    img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/email.institucional.avif',
    acao: 'link',
    perfisPermitidos: ['SERVIDOR'],
    categoria_portal: 'SISTEMAS_EXTERNOS'
  },
  {
    id: 'epub',
    nome: 'e-Publica • Gestão Pública',
    descricao: 'Portal corporativo e processos administrativos da prefeitura',
    url: 'https://epublica.bc.sc.gov.br/epublica/web/#/balneario_camboriu/login',
    img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/e%20publica.avif',
    acao: 'link',
    perfisPermitidos: ['SERVIDOR'],
    categoria_portal: 'SISTEMAS_EXTERNOS'
  },
  {
    id: 'geoo',
    nome: 'GEO+ Balneário Camboriú',
    descricao: 'Base cartográfica e geoprocessamento da prefeitura',
    url: 'https://geo.bc.sc.gov.br/login',
    img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/geoprocessamento.avif',
    acao: 'link',
    perfisPermitidos: ['SERVIDOR'],
    categoria_portal: 'SISTEMAS_EXTERNOS'
  },
  {
    id: 'rhwb',
    nome: 'RH Web • Contracheque',
    descricao: 'Portal do servidor, contracheque e demonstrativos de rendimento',
    url: 'https://folhaweb.bc.sc.gov.br/e-servidor/web/#/login',
    img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/rhweb.avif',
    acao: 'link',
    perfisPermitidos: ['SERVIDOR'],
    categoria_portal: 'SISTEMAS_EXTERNOS'
  },

  // 6. PROCESSOS LEGADOS (SOMENTE MASTER)
  {
    id: 'tproc',
    nome: 'Processos Legados (Sheets)',
    descricao: 'Acesso legado aos dados de planilhas',
    url: '',
    img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/processos.avif',
    acao: 'view',
    view: 'processos',
    badgetext: 'SHEETS',
    somenteMaster: true,
    perfisPermitidos: ['SERVIDOR'],
    categoria_portal: 'GESTAO_ADM'
  },
  {
    id: 'setores',
    nome: 'Setores Legados (Sheets)',
    descricao: 'Visualização legada de setores',
    url: '',
    img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/processos.avif',
    acao: 'view',
    view: 'processos',
    badgetext: 'SHEETS',
    somenteMaster: true,
    perfisPermitidos: ['SERVIDOR'],
    categoria_portal: 'GESTAO_ADM'
  }
];

export const CATEGORIAS_PORTAL_LABELS: Record<PortalCategoria, { label: string; icon: string; desc: string }> = {
  TODOS: {
    label: 'Todos os Módulos',
    icon: '✨',
    desc: 'Visão unificada completa'
  },
  OPERACIONAL: {
    label: 'Fiscalização & Laboratório',
    icon: '🛡️',
    desc: 'Vistorias, alvarás e análises'
  },
  CONTRIBUINTE: {
    label: 'Contribuinte & Contabilidade',
    icon: '🏢',
    desc: 'Empresas, processos e alvarás'
  },
  CIDADAO: {
    label: 'Cidadão & Consultas',
    icon: '🏛️',
    desc: 'Autoatendimento e serviços públicos'
  },
  GESTAO_ADM: {
    label: 'Gestão Administrativa',
    icon: '📁',
    desc: 'Pastas, agenda, ramais e legislação'
  },
  SISTEMAS_EXTERNOS: {
    label: 'Sistemas Corporativos',
    icon: '🌐',
    desc: 'Ahgora, Mail, e-Publica e RH'
  }
};
