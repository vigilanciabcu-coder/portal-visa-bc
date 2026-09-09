export type UserRole =
  | 'AGENTE DE ENDEMIAS'
  | 'ASSISTENTE ADMINISTRATIVO'
  | 'DIRETOR CCPU'
  | 'DIRETOR DAL'
  | 'DIRETOR DFSIS'
  | 'DIRETOR PMCD'
  | 'DIRETOR-GERAL'
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
  | 'VISA (FEIRAS)'
  | 'VISA (FISCAL)'
  | 'VISA (LABORATÓRIO)'
  | 'VISA (SAÚDE)'
  | 'VISA (ALIMENTOS)'
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

export interface ModuloPermissao {
  id: string; // chave correspondente a id do botao ou view
  nome: string;
  categoria: 'MODULO' | 'LINK';
  descricao: string;
  icon?: string;
}

export const MODULOS_SISTEMA: ModuloPermissao[] = [
  // Módulos Internos do Sistema VISA
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
  FISCAL: ['processos_lab', 'fiscalizacao', 'agenda', 'cnae', 'telefone', '1doc', 'epub', 'ahgo', 'mail', 'geoo', 'cnpj', 'leis', 'mapa', 'pref'],
  LABORATORIO: ['processos_lab', 'laboratorio', 'agenda', 'telefone', '1doc', 'ahgo', 'mail', 'cnpj', 'pref'],
  FEIRAS: ['processos_lab', 'feiras', 'agenda', 'telefone', '1doc', 'ahgo', 'mail', 'cnpj', 'pref'],
  ADMINISTRATIVO: ['processos_lab', 'agenda', 'telefone', '1doc', 'epub', 'ahgo', 'rhwb', 'mail', 'domm', 'cnpj', 'alva', 'debi', 'leis', 'pref'],
  TODAS: MODULOS_SISTEMA.map((m) => m.id)
};

export function isUserMaster(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const cargo = (user.cargo || '').toUpperCase();
  const nivel = (user.nivel_acesso || '').toUpperCase();
  return (
    cargo === 'MASTER' ||
    cargo === 'MASTER ADM' ||
    nivel === 'MASTER (TUDO)' ||
    nivel.includes('MASTER')
  );
}

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
    return false;
  }

  // Se não foi configurado individualmente ainda, aplica as permissões base por perfil
  if (user.tipo_usuario === 'SERVIDOR' || !user.tipo_usuario) {
    if (pageOrButtonId === 'laboratorio' || pageOrButtonId === 'tlab') {
      return (user.nivel_acesso === 'VISA (LABORATÓRIO)' || (user.setor || '').toUpperCase().includes('LAB'));
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
  view?: 'home' | 'feiras' | 'agenda' | 'master' | 'fiscalizacao' | 'processos' | 'processos_lab' | 'laboratorio' | 'cidadao' | 'portal_contador' | 'cnae' | 'telefone';
  badgetext?: string;
  somenteMaster?: boolean;
  perfisPermitidos?: ('SERVIDOR' | 'CONTABILIDADE' | 'CIDADAO' | 'CONTRIBUINTE')[];
}
