export type UserRole =
  | 'AGENTE DE ENDEMIAS'
  | 'ASSISTENTE ADMINISTRATIVO'
  | 'DIRETOR DAL'
  | 'DIRETOR PMCD'
  | 'DIRETORA CCPU'
  | 'DIRETORA DFSIS'
  | 'DIRETORA-GERAL'
  | 'FARMACÊUTICO/BIOQUÍMICO'
  | 'FISCAL DE SAÚDE PÚBLICA'
  | 'FISCAL DE VIGILÂNCIA SANITÁRIA'
  | 'MASTER ADM'
  | 'MÉDICO VETERINÁRIO'
  | 'NUTRICIONISTA'
  | 'SUPERVISOR DE CAMPO'
  | 'SUPERVISOR GERAL'
  | 'AGENTE'
  | 'FISCAL'
  | 'DIRETOR'
  | 'MASTER';

export type UserSetor =
  | 'VIGILÂNCIA SANITÁRIA'
  | 'VIGILÂNCIA AMBIENTAL'
  | 'VIGILÂNCIA SANITÁRIA E AMBIENTAL';

export type UserNivelAcesso =
  | 'MASTER (TUDO)'
  | 'VISA (FEIRAS)'
  | 'VISA (FISCAL)'
  | 'VISA (LABORATÓRIO)';

export interface UserProfile {
  id: string;
  email: string;
  nome_completo: string;
  data_nascimento: string;
  cargo: UserRole;
  setor?: UserSetor;
  nivel_acesso?: UserNivelAcesso;
  matricula?: string;
  telefone?: string;
  senha?: string;
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

export interface PortalButton {
  id: string;
  nome: string;
  url: string;
  img: string;
  acao: 'link' | 'view';
  view?: 'home' | 'feiras' | 'agenda' | 'master' | 'fiscalizacao' | 'processos' | 'laboratorio';
  badgetext?: string;
  somenteMaster?: boolean;
}
