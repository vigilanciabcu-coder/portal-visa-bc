export type UserRole =
  | 'AGENTE DE ENDEMIAS'
  | 'ASSISTENTE ADMINISTRATIVO'
  | 'DIRETOR CCPU'
  | 'DIRETOR DAL'
  | 'DIRETOR DFSIS'
  | 'DIRETOR PMCD'
  | 'DIRETOR-GERAL'
  | 'DIRETOR DE ALIMENTOS'
  | 'DIRETOR DE SAÚDE'
  | 'DIRETOR DE HABITE-SE E ENGENHARIA'
  | 'DIRETOR DE SANEAMENTO E AMBIENTAL'
  | 'FARMACÊUTICO/BIOQUÍMICO'
  | 'FISCAL DE SAÚDE PÚBLICA'
  | 'FISCAL DE VIGILÂNCIA SANITÁRIA'
  | 'MASTER ADM'
  | 'MÉDICO VETERINÁRIO'
  | 'NUTRICIONISTA'
  | 'SUPERVISOR DE CAMPO'
  | 'SUPERVISOR GERAL'
  | string;

export type UserSetor =
  | 'VIGILÂNCIA SANITÁRIA'
  | 'VIGILÂNCIA AMBIENTAL'
  | 'VIGILÂNCIA SANITÁRIA E AMBIENTAL';

export type UserNivelAcesso =
  | 'MASTER (TUDO)'
  | 'DIRETOR GERAL (TODOS OS SETORES)'
  | 'DIRETOR (ALIMENTOS)'
  | 'DIRETOR (SAÚDE)'
  | 'DIRETOR (HABITE-SE)'
  | 'DIRETOR (SANEAMENTO & AMBIENTAL)'
  | 'VISA (FISCAL)'
  | 'VISA (ALIMENTOS)'
  | 'VISA (SAÚDE)'
  | 'VISA (LABORATÓRIO)'
  | 'VISA (FEIRAS)'
  | string;

export type TipoUsuario = 'SERVIDOR' | 'CONTABILIDADE' | 'CIDADAO' | 'CONTRIBUINTE';

export interface UserProfile {
  id: string;
  email: string;
  nome_completo: string;
  data_nascimento: string;
  cargo: UserRole;
  setor?: UserSetor;
  conselho_regional?: string;
  nivel_acesso?: UserNivelAcesso;
  matricula?: string;
  telefone?: string;
  cpf?: string;
  bairro?: string;
  endereco?: string;
  senha?: string;
  tipo_usuario?: TipoUsuario;
  contabilidade_id?: string;
  contribuinte_id?: string;
  categoria_contribuinte?: 'EMPRESARIO' | 'FEIRANTE' | 'AUTONOMO';
  paginas_permitidas?: string[];
}

export interface PastaVisaItem {
  id: string;
  cnpj_cpf: string;
  pasta: string;
  razao_social: string;
  status_rf: string; // Ex: ATIVA, BAIXADA, SUSPENSA, INAPTA
  alvara_atualizado: string; // Ex: SIM, NÃO, EM RENOVAÇÃO, TMI PAGO, ISENTO
  setor: string; // Ex: ALIMENTOS, SAÚDE, SERVIÇOS, MEDICAMENTOS, OUTROS
  observacoes?: string;
  criado_por?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export type TipoAlvara = 'INICIAL' | 'RENOVAÇÃO' | 'PROVISÓRIO / EVENTUAL' | 'AMBULANTE / EVENTO';
export type StatusAlvara = 'ATIVO' | 'EM RENOVAÇÃO' | 'VENCIDO' | 'BAIXADO' | 'PENDENTE';
export type CategoriaModeloAlvara = 'PONTO_MILHO_CHURROS' | 'FEIRANTE' | 'GERAL' | 'ALIMENTOS' | 'SAUDE' | 'AMBULANTE';

export interface AlvaraSanitarioItem {
  id: string;
  numero_alvara: string; // Ex: ALV-2026/001 ou número sequencial
  ano_exercicio: string; // Ex: 2026
  tipo_alvara: TipoAlvara;
  modelo_tipo?: CategoriaModeloAlvara | string; // Ex: "Ponto milho e churro", "Feirante"
  pasta?: string; // Número/código da pasta física (ex: PASTA 142)
  cnpj_cpf: string; // CPF / CNPJ
  razao_social: string; // NOME DA PESSOA FÍSICA E/OU JURÍDICA
  nome_fantasia?: string; // DENOMINAÇÃO COMERCIAL/NOME FANTASIA
  endereco: string; // ENDEREÇO
  numero: string; // Nº
  complemento?: string; // COMPLEMENTO/ SALA
  bairro: string; // BAIRRO
  municipio: string;
  cep?: string; // CEP
  cnae_principal: string;
  cnaes_secundarios?: string[];
  responsavel_tecnico?: string;
  conselho_rt?: string;
  validade: string; // YYYY-MM-DD
  data_emissao: string; // EMISSÃO (YYYY-MM-DD)
  status: StatusAlvara;
  setor: string;
  condicionantes?: string; // Observações ou condicionantes sanitárias impressas
  fiscal_emissor?: string;
  matricula_fiscal?: string;
  codigo_autenticacao?: string; // Código hash/token de autenticidade
  assinatura_digital?: string; // Mensagem de validação digital: Validado administrativamente por...
  assinado_por?: string; // Nome de quem assinou digitalmente
  assinado_em?: string; // Data/hora da assinatura digital
  modelo_doc_url?: string; // Link para o Google Docs correspondente
  grau_risco?: string; // Grau de risco sanitário (ex: BAIXO RISCO / NÍVEL I, II ou III)
  criado_em?: string;
  atualizado_em?: string;
}

export interface ModeloAlvaraDocsItem {
  id: string; // Ex: 'modelo_diretoria_2026' ou 'modelo_dvis_padrao'
  nome: string;
  autor: string; // Ex: 'Modelo Proposto para Diretoria' | 'Modelo Oficial DVIS'
  descricao: string;
  docs_url: string;
  template_texto?: string; // Texto estruturado oficial
  is_ativo: boolean; // Se é o modelo atualmente selecionado para impressão/Docs
  legislacao_base?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface ModuloPermissao {
  id: string; // chave correspondente a id do botao ou view
  nome: string;
  categoria: 'MODULO' | 'LINK';
  descricao: string;
  icon?: string;
}

export const MODULOS_SISTEMA: ModuloPermissao[] = [
  // Módulos Internos do Sistema VISA
  { id: 'demandas_fiscal', nome: 'Minhas Demandas (Fiscal)', categoria: 'MODULO', descricao: 'Bandeja de trabalho pessoal do fiscal, prazos de vistoria e pareceres com assinatura digital', icon: 'FileSignature' },
  { id: 'demandas_diretor', nome: 'Painel do Diretor (Demandas)', categoria: 'MODULO', descricao: 'Gestão geral de demandas por fiscal e setor, sorteio randômico e troca de fiscais', icon: 'Users' },
  { id: 'alvara_visa', nome: 'ALVARÁ (Cadastro & Emissão)', categoria: 'MODULO', descricao: 'Cadastro, emissão oficial, autenticidade e modelos Google Docs de alvarás sanitários', icon: 'FileCheck' },
  { id: 'pasta_visa', nome: 'PASTA VISA (Administrativo)', categoria: 'MODULO', descricao: 'Cadastro e arquivamento de pastas físicas, CPF/CNPJ, alvarás e situação cadastral RF', icon: 'FolderArchive' },
  { id: 'processos_lab', nome: 'Carteira de Processos', categoria: 'MODULO', descricao: 'Gestão completa de processos, alvarás e vistorias sanitárias', icon: 'Building2' },
  { id: 'fiscalizacao', nome: 'Fiscalização Sanitária', categoria: 'MODULO', descricao: 'Roteiro de inspeção, checklists e emissão de autos', icon: 'ShieldCheck' },
  { id: 'feiras', nome: 'Feiras Livres', categoria: 'MODULO', descricao: 'Cadastro, alvarás e localização de feirantes', icon: 'Tent' },
  { id: 'agenda', nome: 'Agenda & Escala', categoria: 'MODULO', descricao: 'Escala de plantão, vistorias e eventos', icon: 'Calendar' },
  { id: 'laboratorio', nome: 'Laboratório & Amostras', categoria: 'MODULO', descricao: 'Controle de análises de água, balneabilidade e laudos', icon: 'Microscope' },
  { id: 'cnae', nome: 'Consulta CNAE (VISA)', categoria: 'MODULO', descricao: 'Tabela de códigos CNAE e classificação de risco sanitário', icon: 'FileSpreadsheet' },
  { id: 'telefone', nome: 'Telefones & Ramais', categoria: 'MODULO', descricao: 'Guia telefônico e ramais internos da vigilância', icon: 'PhoneCall' },
  { id: 'cidadao', nome: 'Consulta Cidadão (Munícipe)', categoria: 'MODULO', descricao: 'Autoatendimento e consulta de regularidade sanitária', icon: 'Search' },

  // Ferramentas & Sistemas Externos Integrados
  { id: '1doc', nome: '1Doc Protocolo', categoria: 'LINK', descricao: 'Comunicação interna e despachos da Prefeitura', icon: 'ExternalLink' },
  { id: 'epub', nome: 'e-Publica', categoria: 'LINK', descricao: 'Sistema de gestão tributária e cadastral do município', icon: 'ExternalLink' },
  { id: 'ahgo', nome: 'Ahgora (Ponto)', categoria: 'LINK', descricao: 'Ponto biométrico e registro de frequência dos servidores', icon: 'ExternalLink' },
  { id: 'rhwb', nome: 'RH Web', categoria: 'LINK', descricao: 'Folha de pagamento e contracheque do servidor', icon: 'ExternalLink' },
  { id: 'mail', nome: 'BC Mail', categoria: 'LINK', descricao: 'Webmail institucional @bc.sc.gov.br', icon: 'Mail' },
  { id: 'geoo', nome: 'GEO+', categoria: 'LINK', descricao: 'Sistema georreferenciado e mapas municipais', icon: 'ExternalLink' },
  { id: 'regi', nome: 'Regin (JUCESC)', categoria: 'LINK', descricao: 'Integração de registro mercantil e viabilidades', icon: 'ExternalLink' },
  { id: 'domm', nome: 'Diário Oficial (DOM)', categoria: 'LINK', descricao: 'Publicações oficiais e editais municipais', icon: 'ExternalLink' },
  { id: 'cnpj', nome: 'Consulta CNPJ', categoria: 'LINK', descricao: 'Comprovante de inscrição da Receita Federal', icon: 'ExternalLink' },
  { id: 'alva', nome: 'Emissão de Alvarás', categoria: 'LINK', descricao: 'Portal de emissão de taxas e licenças', icon: 'ExternalLink' },
  { id: 'debi', nome: 'Consulta de Débitos', categoria: 'LINK', descricao: 'Certidões e débitos tributários municipais', icon: 'ExternalLink' },
  { id: 'leis', nome: 'Legislação Municipal', categoria: 'LINK', descricao: 'Códigos de posturas, sanitário e decretos', icon: 'ExternalLink' },
  { id: 'mapa', nome: 'Google Maps', categoria: 'LINK', descricao: 'Navegação e rotas para fiscalização de campo', icon: 'ExternalLink' },
  { id: 'pref', nome: 'Portal da Prefeitura', categoria: 'LINK', descricao: 'Site oficial de Balneário Camboriú', icon: 'ExternalLink' }
];

export const PRESET_PAGINAS = {
  DIRETOR_GERAL: ['demandas_diretor', 'demandas_fiscal', 'processos_lab', 'alvara_visa', 'pasta_visa', 'fiscalizacao', 'feiras', 'agenda', 'laboratorio', 'cnae', 'telefone', '1doc', 'epub', 'ahgo', 'rhwb', 'mail', 'geoo', 'domm', 'cnpj', 'alva', 'debi', 'leis', 'mapa', 'pref'],
  DIRETOR_SETORIAL: ['demandas_diretor', 'demandas_fiscal', 'processos_lab', 'alvara_visa', 'fiscalizacao', 'agenda', 'cnae', 'telefone', '1doc', 'epub', 'ahgo', 'mail', 'cnpj', 'leis', 'mapa', 'pref'],
  FISCAL: ['demandas_fiscal', 'demandas_diretor', 'processos_lab', 'alvara_visa', 'fiscalizacao', 'agenda', 'cnae', 'telefone', '1doc', 'epub', 'ahgo', 'mail', 'geoo', 'cnpj', 'leis', 'mapa', 'pref'],
  LABORATORIO: ['processos_lab', 'laboratorio', 'agenda', 'telefone', '1doc', 'ahgo', 'mail', 'cnpj', 'pref'],
  FEIRAS: ['processos_lab', 'feiras', 'agenda', 'telefone', '1doc', 'ahgo', 'mail', 'cnpj', 'pref'],
  ADMINISTRATIVO: ['demandas_diretor', 'demandas_fiscal', 'pasta_visa', 'alvara_visa', 'processos_lab', 'agenda', 'telefone', '1doc', 'epub', 'ahgo', 'rhwb', 'mail', 'domm', 'cnpj', 'alva', 'debi', 'leis', 'pref'],
  TODAS: MODULOS_SISTEMA.map((m) => m.id)
};

export function isUserMaster(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const cargo = (user.cargo || '').toUpperCase();
  const nivel = (user.nivel_acesso || '').toUpperCase();
  const email = (user.email || '').toLowerCase();
  const matricula = (user.matricula || '').toUpperCase();
  const nome = (user.nome_completo || '').toUpperCase();
  const tipo = ((user as any).tipo_usuario || '').toUpperCase();
  return (
    cargo === 'MASTER' ||
    cargo === 'MASTER ADM' ||
    cargo.includes('MASTER') ||
    nivel === 'MASTER (TUDO)' ||
    nivel.includes('MASTER') ||
    tipo === 'MASTER' ||
    email.includes('master') ||
    email.includes('admin') ||
    matricula.includes('MASTER') ||
    nome.includes('MASTER')
  );
}

export function isUserDiretor(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  if (isUserMaster(user)) return true;
  const cargo = (user.cargo || '').toUpperCase();
  const nivel = (user.nivel_acesso || '').toUpperCase();
  const email = (user.email || '').toLowerCase();
  return (
    cargo.includes('DIRETOR') ||
    cargo.includes('COORDENADOR') ||
    cargo.includes('GERENTE') ||
    cargo.includes('DIRETORIA') ||
    nivel.includes('DIRETOR') ||
    email.includes('diretor')
  );
}

export function isUserFiscal(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const cargo = (user.cargo || '').toUpperCase();
  const nivel = (user.nivel_acesso || '').toUpperCase();
  return (
    cargo.includes('FISCAL') ||
    cargo.includes('AGENTE') ||
    cargo.includes('SUPERVISOR') ||
    cargo.includes('NUTRICIONISTA') ||
    cargo.includes('VETERINÁRIO') ||
    cargo.includes('FARMACÊUTICO') ||
    cargo.includes('BIOQUÍMICO') ||
    cargo.includes('ENGENHEIR') ||
    nivel.includes('FISCAL') ||
    user.tipo_usuario === 'SERVIDOR'
  );
}

export type SetorDemanda =
  | 'ALIMENTOS'
  | 'SAÚDE'
  | 'FARMÁCIAS & MEDICAMENTOS'
  | 'HABITE-SE SANITÁRIO'
  | 'SANEAMENTO & AMBIENTAL'
  | 'EVENTOS & FEIRAS'
  | 'OUVIDORIA & DENÚNCIAS'
  | 'GERAL';

/**
 * Retorna o setor restrito de atuação do diretor setorial (ou null se for Diretor Geral / Master com visão de todos os setores)
 */
export function getSetorRestritoDoDiretor(user: UserProfile | null | undefined): SetorDemanda | null {
  if (!user) return null;
  if (isUserMaster(user)) return null;

  const cargo = (user.cargo || '').toUpperCase();
  const nivel = (user.nivel_acesso || '').toUpperCase();

  // Diretor Geral tem acesso a todos os setores
  if (nivel.includes('GERAL') || cargo.includes('GERAL') || nivel === 'DIRETOR GERAL (TODOS OS SETORES)') {
    return null;
  }

  // Diretor Setorial: Alimentos
  if (nivel.includes('ALIMENT') || cargo.includes('ALIMENT')) {
    return 'ALIMENTOS';
  }

  // Diretor Setorial: Saúde
  if (nivel.includes('SAÚDE') || nivel.includes('SAUDE') || cargo.includes('SAÚDE') || cargo.includes('SAUDE')) {
    return 'SAÚDE';
  }

  // Diretor Setorial: Habite-se
  if (nivel.includes('HABITE') || cargo.includes('HABITE')) {
    return 'HABITE-SE SANITÁRIO';
  }

  // Diretor Setorial: Saneamento & Ambiental
  if (nivel.includes('SANEAMENTO') || nivel.includes('AMBIENT') || cargo.includes('AMBIENT')) {
    return 'SANEAMENTO & AMBIENTAL';
  }

  // Diretor Setorial: Feiras
  if (nivel.includes('FEIRA') || cargo.includes('FEIRA')) {
    return 'EVENTOS & FEIRAS';
  }

  return null;
}

export interface SetorConfig {
  id: SetorDemanda;
  nome: string;
  descricao: string;
  badgeCor: string;
  icone: string;
}

export const SETORES_DEMANDA_LISTA: SetorConfig[] = [
  { id: 'ALIMENTOS', nome: 'Alimentos & Bebidas', descricao: 'Restaurantes, lanchonetes, padarias, cozinhas, supermercados e ambulantes', badgeCor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700', icone: 'Utensils' },
  { id: 'SAÚDE', nome: 'Serviços de Saúde', descricao: 'Clínicas médicas, odontologia, estética, fisioterapia, hospitais e laboratórios', badgeCor: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-700', icone: 'HeartPulse' },
  { id: 'FARMÁCIAS & MEDICAMENTOS', nome: 'Farmácias & Medicamentos', descricao: 'Drogarias, farmácias de manipulação, distribuidoras e correlatos', badgeCor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700', icone: 'Pill' },
  { id: 'HABITE-SE SANITÁRIO', nome: 'Habite-se & Engenharia', descricao: 'Vistorias de conclusão de obra, LC nº 40/2019, projetos hidrossanitários', badgeCor: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-700', icone: 'Building' },
  { id: 'SANEAMENTO & AMBIENTAL', nome: 'Saneamento & Meio Ambiente', descricao: 'Piscinas de uso coletivo, potabilidade da água, poços artesianos e pragas', badgeCor: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/70 dark:text-cyan-300 dark:border-cyan-700', icone: 'Waves' },
  { id: 'EVENTOS & FEIRAS', nome: 'Feiras Livres & Ambulantes', descricao: 'Feira da Cultura, Rua 200, Feira da Barra, eventos sazonais e credenciais', badgeCor: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-700', icone: 'Tent' },
  { id: 'OUVIDORIA & DENÚNCIAS', nome: 'Ouvidoria & Denúncias', descricao: 'Denúncias municipais via 1Doc, vistorias de averiguação imediata e PAS', badgeCor: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/70 dark:text-red-300 dark:border-red-700', icone: 'AlertTriangle' },
  { id: 'GERAL', nome: 'Atividades Gerais', descricao: 'Hotéis, academias, salões de beleza, lavanderias e outros serviços regulados', badgeCor: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', icone: 'FileText' }
];

export function userHasAccessToPage(user: UserProfile | null | undefined, pageOrButtonId: string): boolean {
  if (!user) return false;
  // O usuário MASTER tem acesso 100% irrestrito e incondicional a TUDO SEMPRE
  if (isUserMaster(user)) return true;

  // Se o módulo for exclusivo do Master (como Painel Master ou Processos Sheets legado)
  if (
    pageOrButtonId === 'master' ||
    pageOrButtonId === 'processos' ||
    pageOrButtonId === 'proc' ||
    pageOrButtonId === 'tproc' ||
    pageOrButtonId === 'setores'
  ) {
    return false;
  }

  // Se o usuário possui lista explícita de páginas permitidas configurada pelo Master
  if (user.paginas_permitidas && Array.isArray(user.paginas_permitidas) && user.paginas_permitidas.length > 0) {
    // Permite por id direto ou mapeando views equivalentes
    if (user.paginas_permitidas.includes(pageOrButtonId)) return true;
    if (pageOrButtonId === 'fisc' && user.paginas_permitidas.includes('fiscalizacao')) return true;
    if (pageOrButtonId === 'fiscalizacao' && user.paginas_permitidas.includes('fiscalizacao')) return true;
    if (pageOrButtonId === 'feir' && user.paginas_permitidas.includes('feiras')) return true;
    if (pageOrButtonId === 'feiras' && user.paginas_permitidas.includes('feiras')) return true;
    if (pageOrButtonId === 'agen' && user.paginas_permitidas.includes('agenda')) return true;
    if (pageOrButtonId === 'agenda' && user.paginas_permitidas.includes('agenda')) return true;
    if (pageOrButtonId === 'tlab' && user.paginas_permitidas.includes('laboratorio')) return true;
    if (pageOrButtonId === 'laboratorio' && user.paginas_permitidas.includes('laboratorio')) return true;
    if (pageOrButtonId === 'tproc_lab' && user.paginas_permitidas.includes('processos_lab')) return true;
    if (pageOrButtonId === 'processos_lab' && user.paginas_permitidas.includes('processos_lab')) return true;
    if (pageOrButtonId === 'cnae_btn' && user.paginas_permitidas.includes('cnae')) return true;
    if (pageOrButtonId === 'cnae' && user.paginas_permitidas.includes('cnae')) return true;
    if (pageOrButtonId === 'telefone_btn' && user.paginas_permitidas.includes('telefone')) return true;
    if (pageOrButtonId === 'telefone' && user.paginas_permitidas.includes('telefone')) return true;
    if (pageOrButtonId === 'cidadao_view' && user.paginas_permitidas.includes('cidadao')) return true;
    if (pageOrButtonId === 'cidadao' && user.paginas_permitidas.includes('cidadao')) return true;
    if (pageOrButtonId === 'pasta_visa' && user.paginas_permitidas.includes('pasta_visa')) return true;
    if (pageOrButtonId === 'alvara_visa' && user.paginas_permitidas.includes('alvara_visa')) return true;
    if (pageOrButtonId === 'demandas_fiscal' || pageOrButtonId === 'demandas') return true;
    if (pageOrButtonId === 'demandas_diretor' && (isUserDiretor(user) || user.paginas_permitidas.includes('demandas_diretor'))) return true;
    return false;
  }

  // Se não foi configurado individualmente ainda, aplica as permissões base por perfil
  if (user.tipo_usuario === 'SERVIDOR' || !user.tipo_usuario) {
    if (pageOrButtonId === 'laboratorio' || pageOrButtonId === 'tlab') {
      return (user.nivel_acesso === 'VISA (LABORATÓRIO)' || (user.setor || '').toUpperCase().includes('LAB'));
    }
    if (pageOrButtonId === 'pasta_visa') {
      const cargo = (user.cargo || '').toUpperCase();
      const nivel = (user.nivel_acesso || '').toUpperCase();
      return cargo.includes('ADMINISTRATIV') || nivel.includes('ADMINISTRATIV') || cargo.includes('DIRETOR') || isUserMaster(user);
    }
    return true;
  }

  return true;
}

export interface EscalaItem {
  id: string;
  data: string; // YYYY-MM-DD
  tipo: 'PLANTAO' | 'EVENTO' | 'FERIADO' | 'FACULTATIVO';
  servidores: string;
  descricao?: string;
}

export interface FeiranteItem {
  id: string;
  data_prot: string;
  num_prot: string;
  feira: string; // "DA cultura", "do pescador", "da orla", "da rua 200"
  pasta: string;
  cpf: string;
  nome_pf: string;
  produtos: string;
  validade: string;
  rua: string;
  num: string;
  bairro: string;
  vinculo: 'SIM' | 'NÃO';
  func?: string;
  abertura?: string;
  cnpj?: string;
  razao?: string;
  rua_api?: string;
  num_api?: string;
  municipio?: string;
  estado?: string;
  cnae?: string;
  alvara?: 'SIM' | 'NÃO' | 'EM ANDAMENTO';
}

export interface RecadoMural {
  id: string;
  autor: string;
  cargo: string;
  data: string;
  titulo: string;
  conteudo: string;
  prioridade: 'NORMAL' | 'URGENTE' | 'ALERTA';
}

export interface ChatMessage {
  id: string;
  sender: string; // nome_usuario
  role?: string;
  time: string;
  text: string; // mensagem
  perfil_id?: string;
  created_at?: string;
}

export type InspectionStatus = 'EM_ANDAMENTO' | 'CONCLUIDA' | 'NOTIFICADO' | 'INTERDITADO' | 'CONFORME';
export type RiskLevel = 'BAIXO' | 'MÉDIO' | 'ALTO' | 'CRÍTICO';
export type InspectionType = 'ROTINA' | 'DENÚNCIA' | 'RENOVAÇÃO' | 'REINSPEÇÃO' | 'OPERAÇÃO_VERÃO';

export interface InspectionCheckitem {
  id: string;
  categoria: string;
  item: string;
  status: 'CONFORME' | 'NAO_CONFORME' | 'NAO_APLICA';
  observacao?: string;
  fotos?: string[];
}

export interface FiscalizacaoItem {
  id: string;
  protocolo: string;
  dataHora: string;
  fiscalId: string;
  fiscalNome: string;
  estabelecimento: {
    nomeFantasia: string;
    razaoSocial: string;
    cnpjCpf: string;
    tipo: string; // Restaurante, Lanchonete, Feira Livre, Drogaria, Mercado, Hotel, etc.
    bairro: string;
    endereco: string;
    numero: string;
    responsavel: string;
    telefone: string;
  };
  tipoVistoria: InspectionType;
  risco: RiskLevel;
  status: InspectionStatus;
  checklists: InspectionCheckitem[];
  irregularidadesEncontradas: string[];
  medidasAdotadas: string; // Intimação, Auto de Infração, Interdição Parcial, Conforme, etc.
  prazoAdequacaoDias?: number;
  observacoesFiscais: string;
  fotosUrl: string[];
  assinaturaInspector?: string; // base64 / data url
  assinaturaResponsavel?: string; // base64 / data url
  coordenadas?: {
    lat: number;
    lng: number;
  };
  parecerIA?: string;
}

export type ProcessoStatus = 'DEFERIDO' | 'EM ANÁLISE' | 'INDEFERIDO' | 'PENDENTE DOCS' | 'VISTORIA AGENDADA' | 'NOTIFICADO';

export type TipoParecerTecnico = 
  | 'FAVORÁVEL (DEFERIMENTO)'
  | 'FAVORÁVEL COM CONDICIONANTES'
  | 'EXIGÊNCIA / NOTIFICAÇÃO'
  | 'DESFAVORÁVEL (INDEFERIMENTO)'
  | 'VISTORIA AGENDADA'
  | 'DILIGÊNCIA / REQUISIÇÃO'
  | 'DESPACHO ADMINISTRATIVO';

export interface ParecerTecnicoItem {
  id: string;
  autor_nome: string;
  autor_cargo: string;
  autor_matricula: string;
  autor_email?: string;
  data_hora: string;
  tipo_parecer: TipoParecerTecnico;
  parecer_texto: string;
  condicionantes?: string;
  novo_status?: ProcessoStatus;
  assinatura_digital: string;
  codigo_autenticacao: string;
}

export interface ProcessoItem {
  id: string;
  num_processo: string;
  data_protocolo: string;
  cnpj_cpf: string;
  razao_social: string;
  nome_fantasia: string;
  assunto: string;
  bairro: string;
  endereco: string;
  fiscal_responsavel: string;
  status: ProcessoStatus;
  validade?: string;
  observacoes?: string;
  cnaes?: string[];
  servidores?: { id: string; nome: string; matricula: string }[];
  pareceres?: ParecerTecnicoItem[];

  // Campos Oficiais de Processos Sanitários
  setor?: string;
  motivacao?: string;
  data_entrada?: string;
  data_1doc?: string;
  venc_1doc?: string;
  prot_1doc?: string;
  pasta?: string;
  cep?: string;
  numero_complemento?: string;
  situacao_cadastral?: string;
  situacao_fiscal?: string;
  descricao_atividade?: string;
  cnae?: string;
  motivo_situacao?: string;
  data_situacao?: string;
  venc_licenca?: string;
  grau_risco?: 'ALTO RISCO' | 'MÉDIO RISCO' | 'BAIXO RISCO';
  data_entregue_fiscal?: string;
  agendado_para?: string;
  conclusao?: string;
  pas?: string;

  // Campos de Gestão e Distribuição de Demandas (Fiscais & Diretores)
  tipo_servico?: string;
  data_distribuicao?: string;
  prazo_vistoria?: string;
  motivo_troca_fiscal?: string;
  trocado_por_diretor?: string;
  trocado_em?: string;
  prioridade_demanda?: 'NORMAL' | 'URGENTE' | 'ALTA';
}

export type LaboratorioStatus = 'EM ANÁLISE' | 'CONFORME' | 'NÃO CONFORME' | 'INTERDITADO' | 'AGUARDANDO COLETA' | 'COLETA REALIZADA';
export type TipoMatrizAmostra = 'ÁGUA POTÁVEL' | 'ÁGUA BALNEABILIDADE' | 'ALIMENTO' | 'GELO' | 'SUPERFÍCIE / SWAB' | 'OUTROS';

export interface PontoColetaLaboratorio {
  id: string;
  ponto: string; // Ex: "Ponto 01", "Ponto 02 - Praia Central"
  local: string; // Ex: "Posto de Salva-Vidas 02" ou "Cozinha Central"
  endereco: string; // Ex: "Av. Atlântica, em frente à Rua 1400"
  bairro: string; // Ex: "Centro"
  tipo_matriz_padrao?: TipoMatrizAmostra;
  observacao?: string;
  ativo?: boolean;
}

export interface ServidorColetaLaboratorio {
  id: string;
  nome_completo: string;
  cargo: string;
  matricula?: string;
  email?: string;
  telefone?: string;
  ativo: boolean;
  observacao?: string;
  created_at?: string;
}

export interface LaboratorialistaResponsavel {
  id: string;
  nome_completo: string;
  funcao: string; // Ex: FARMACÊUTICO E BIOQUÍMICO
  registro_conselho: string; // Ex: CRF/SC- 3321
  conselho_regional?: string; // Ex: CRF, CRBio, CRQ
  email?: string;
  telefone?: string;
  senha?: string; // Senha de validação da assinatura digital
  ativo: boolean;
  padrao?: boolean; // Se é o responsável técnico padrão sugerido
  observacao?: string;
  created_at?: string;
}

export interface AmostraLaboratorioItem {
  id: string;
  codigo_amostra: string; // Ex: 169
  protocolo?: string; // Ex: 60.455/2026
  mes_ano_referencia?: string; // Ex: JULHO /2026
  responsavel_distribuicao?: string; // Ex: EMASA
  interessado?: string; // Razão Social / Interessado (ex: MERCADO BAGÉ LTDA)
  cnpj_cpf?: string; // CNPJ / CPF
  numero_alvara?: string; // Ex: Solicitado ou 1234/2026
  endereco?: string; // Ex: Rua 1500, 381 - CENTRO - Balneário Camboriú/SC - 88.330-528
  local_coleta: string; // Ex: TORNEIRA CAFETERIA
  ponto_coleta_id?: string;
  ponto_coleta_nome?: string;
  bairro: string; // Ex: CENTRO
  estabelecimento?: string;
  data_coleta: string; // Ex: 15/07/2026
  hora_coleta?: string; // Ex: 08:20
  fiscal_coletor: string; // Ex: Rita Sahd
  tipo_matriz?: TipoMatrizAmostra;
  observacoes?: string; // Ex: ANÁLISE SOLICITADA PARA VERIFICAR QUALIDADE DA ÁGUA PARA CONSUMO HUMANO

  // Características Organolépticas
  aspecto?: string; // Ex: Límpido
  odor?: string; // Ex: Inobjetável
  cor?: string; // Ex: Incolor

  // Medições e Análises Físico-Químicas
  ph?: string; // Ex: 7,0
  equipamento_ph?: string; // Ex: pH indicator strips MQuant 0 – 14 Marca MERCK
  cloro?: string; // Cloro Residual livre (ex: 1,59)
  equipamento_cloro?: string; // Ex: Chlorine Reagente for 10ml Sample(DLA-CL)
  fluoreto?: string; // Flúor (ex: 0,72)
  equipamento_fluor?: string; // Ex: Colorímetro Digital para Flúor (Modelo DLA-FL)
  turbidez?: string; // Turbidez (ex: 0,52)
  equipamento_turbidez?: string; // Ex: Turbidímetro Digital modelo DLT-WV
  temperatura_coleta?: string;
  fluoretacao?: string;

  // Análises Microbiológicas
  coliformes_totais?: 'AUSENTE' | 'PRESENTE' | 'AUSÊNCIA' | 'PRESENÇA' | string; // Ex: AUSENTE
  metodologia_coliformes_totais?: string; // Kit Analisis Colilert...
  escherichia_coli?: 'AUSENTE' | 'PRESENTE' | 'AUSÊNCIA' | 'PRESENÇA' | string; // Ex: AUSENTE (Coliformes Fecais / E.coli)
  metodologia_escherichia_coli?: string;

  // Conclusão e Responsável Técnico
  status: LaboratorioStatus;
  laudo_numero?: string;
  conclusao_laudo?: string; // Ex: Para os parâmetros analisados, a amostra está em ACORDO com a Portaria GM/MS Nº 888, de 4 maio de 2021. Água PRÓPRIA para o consumo humano, considerando os parâmetros descritos.
  data_resultado?: string; // Ex: 04/08/2026
  laboratorialista?: string; // Ex: ADRIANO GUARDINI
  cargo_laboratorialista?: string; // Ex: FARMACÊUTICO E BIOQUIMICO
  registro_conselho?: string; // Ex: CRF/SC- 3321
  responsavel_analise?: string;

  // Autenticação e Assinatura Digital por Senha
  assinatura_digital_validada?: boolean;
  assinatura_digital_data?: string;
  assinatura_digital_hash?: string;

  parametros?: {
    ph?: string;
    cloro_residual?: string;
    turbidez?: string;
    fluoreto?: string;
    fluoretacao?: string;
    coliformes_totais?: string;
    escherichia_coli?: string;
    microbiologico?: string;
  };
  created_at?: string;
}

// ================= CONTABILIDADE & CARTEIRA DE CLIENTES (LAB) =================
export interface ContabilidadeProfile {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  crc: string;
  responsavel: string;
  email: string;
  telefone: string;
  senha?: string;
  cnpjs_vinculados: string[]; // Lista de CNPJs ou CPFs que este escritório administra
  data_cadastro?: string;
  // CNAEs capturados via consulta oficial da Receita
  cnae_principal?: string;
  cnae_principal_codigo?: string;
  cnae_principal_descricao?: string;
  cnaes?: string[]; // Lista completa de CNAEs (Principal + Secundários)
  cnaes_secundarios?: string[];
}

// ================= RESPONSÁVEL TÉCNICO SANITÁRIO (RT) =================
export interface ResponsavelTecnicoItem {
  cnae: string;
  cnae_descricao?: string;
  nome_profissional: string;
  numero_rt: string;
  conselho_classe_uf: string;
  numero_inscricao: string;
  cpf_profissional: string;
}

// ================= CONTRIBUINTE (EMPRESÁRIO / FEIRANTE / AUTÔNOMO) =================
export interface ContribuinteProfile {
  id: string;
  tipo_pessoa: 'PJ' | 'PF';
  categoria: 'EMPRESARIO' | 'FEIRANTE' | 'AUTONOMO';
  cnpj_cpf: string;
  razao_social: string;
  nome_fantasia?: string;
  responsavel?: string;
  nome_proprietario?: string;
  email_proprietario?: string;
  telefone_proprietario?: string;
  email: string;
  telefone?: string;
  ramo_atividade?: string;
  bairro?: string;
  endereco?: string;
  senha?: string;
  data_cadastro?: string;
  // Campos de background do CNPJ (ocultos da visualização do formulário)
  data_abertura?: string;
  situacao_cadastral?: string;
  data_situacao_cadastral?: string;
  cnae_principal?: string;
  cnae_principal_codigo?: string;
  cnae_principal_descricao?: string;
  cnaes?: string[]; // Lista completa de CNAEs (Principal + Secundários)
  cnaes_secundarios?: string[];
  // Questionário Operacional & Responsabilidade Técnica Sanitária
  horario_funcionamento?: string;
  endereco_correspondencia?: boolean;
  is_coworking?: boolean;
  nome_coworking?: string;
  responsaveis_tecnicos?: ResponsavelTecnicoItem[];
}

// ================= CIDADÃO / USUÁRIO PÚBLICO =================
export interface CidadaoProfile {
  id: string;
  nome_completo: string;
  cpf: string;
  email: string;
  telefone?: string;
  senha?: string;
  bairro?: string;
  endereco?: string;
  data_cadastro?: string;
}

export interface DocumentoContabilidade {
  id: string;
  cnpj_empresa: string;
  tipo_documento: string; // Ex: PGRSS, Laudo Dedetização, Manual de Boas Práticas, Contrato Social
  nome_arquivo: string;
  data_envio: string;
  status: 'ANALISE' | 'APROVADO' | 'REJEITADO';
  observacao?: string;
}

export interface CnaeItem {
  id?: string;
  subclasse: string; // Ex: "1043-1/00"
  denominacao: string; // Denominação ou Pergunta se Risco for "A Definir"
  risco: string; // "Alto Risco" | "Médio Risco" | "Baixo Risco" | "A Definir" | "Dispensado" etc.
  observacao_variavel?: string; // Variavel / Opções
  created_at?: string;
}

export interface CnaeOption {
  resposta: string;
  risco: string;
  detalhes?: string;
}

export interface CnaeRiskDetail {
  codigo: string;
  denominacao: string;
  risco: 'ALTO RISCO' | 'MÉDIO RISCO' | 'BAIXO RISCO' | 'A DEFINIR' | string;
  observacao?: string;
  isPrincipal: boolean;
  origemSupabase: boolean;
  raw: string;
}

export interface CnaeGrouped {
  subclasse: string;
  denominacaoOficial: string;
  temVariavel: boolean;
  pergunta?: string;
  riscoFixo?: string;
  opcoes: CnaeOption[];
  linhasOriginais: CnaeItem[];
}

export interface PortalButton {
  id: string;
  nome: string;
  url: string;
  img: string;
  acao: 'link' | 'view';
  view?: 'home' | 'demandas' | 'demandas_fiscal' | 'demandas_diretor' | 'feiras' | 'agenda' | 'master' | 'fiscalizacao' | 'processos' | 'processos_lab' | 'laboratorio' | 'cidadao' | 'portal_contador' | 'cnae' | 'telefone' | 'pasta_visa' | 'alvara_visa';
  badgetext?: string;
  somenteMaster?: boolean;
  perfisPermitidos?: ('SERVIDOR' | 'CONTABILIDADE' | 'CIDADAO' | 'CONTRIBUINTE')[];
}
