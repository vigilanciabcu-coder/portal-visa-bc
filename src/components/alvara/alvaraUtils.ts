import { AlvaraSanitarioItem, CategoriaModeloAlvara, ModeloAlvaraDocsItem, UserProfile } from '../../types';

export interface ModeloAlvaraDef {
  id: CategoriaModeloAlvara;
  titulo: string;
  subtitulo: string;
  icone: string;
  badge: string;
  cor: string;
  setorPadrao: string;
  cnaeSugerido: string;
  condicionantesPadrao: string;
  docsUrl: string;
}

export type AlvaraModuleType = 'consultar' | 'cadastrar' | 'docs' | 'pastas';

/**
 * Padroniza e filtra string de CPF (11 dígitos) ou CNPJ (14 dígitos)
 */
export function formatCpfCnpj(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/**
 * Sugestões padronizadas de CNAEs mais comuns na Vigilância Sanitária
 */
export const CNAES_SUGESTOES_VISA: string[] = [
  '5612-1/00 - SERVIÇOS AMBULANTES DE ALIMENTAÇÃO (PONTO DE MILHO E CHURROS)',
  '4729-6/99 - COMÉRCIO VAREJISTA DE PRODUTOS ALIMENTÍCIOS EM GERAL (FEIRANTE)',
  '5611-2/01 - RESTAURANTES E SIMILARES',
  '5611-2/03 - LANCHONETES, CASAS DE CHÁ, DE SUCOS E SIMILARES',
  '5611-2/04 - BARES E OUTROS ESTABELECIMENTOS ESPECIALIZADOS EM SERVIR BEBIDAS',
  '5611-2/05 - BARES COM ENTRETENIMENTO E MÚSICA AO VIVO',
  '4721-1/02 - PADARIA E CONFEITARIA COM PREDOMINÂNCIA DE REVENDA',
  '1091-1/02 - FABRICAÇÃO DE PRODUTOS DE PADARIA E CONFEITARIA',
  '4711-3/02 - MINIMERCADOS, MERCEARIAS E ARMAZÉNS',
  '4711-3/01 - SUPERMERCADOS E HIPERMERCADOS',
  '4722-9/01 - COMÉRCIO VAREJISTA DE CARNES - AÇOUGUES',
  '4722-9/02 - PEIXARIA E FRUTOS DO MAR',
  '4771-7/01 - COMÉRCIO VAREJISTA DE PRODUTOS FARMACÊUTICOS (DROGARIA)',
  '4771-7/02 - FARMÁCIA DE MANIPULAÇÃO DE FÓRMULAS',
  '8630-5/01 - ATIVIDADE MÉDICA AMBULATORIAL COM PROCEDIMENTOS CIRÚRGICOS',
  '8630-5/02 - ATIVIDADE MÉDICA AMBULATORIAL COM EXAMES COMPLEMENTARES',
  '8630-5/03 - ATIVIDADE MÉDICA AMBULATORIAL RESTRITA A CONSULTAS (CLÍNICA)',
  '8630-5/04 - ATIVIDADE ODONTOLÓGICA (CONSULTÓRIO / CLÍNICA)',
  '8640-2/02 - LABORATÓRIOS CLÍNICOS E ANÁLISES',
  '8650-0/04 - ATIVIDADES DE FISIOTERAPIA',
  '9602-5/01 - CABELEIREIROS, MANICURES E PEDICURES',
  '9602-5/02 - ATIVIDADES DE ESTÉTICA E CUIDADOS COM A BELEZA',
  '9609-2/06 - SERVIÇOS DE TATUAGEM E COLOCAÇÃO DE PIERCING',
  '9313-1/00 - ATIVIDADES DE CONDICIONAMENTO FÍSICO (ACADEMIA)',
  '5510-8/01 - HOTÉIS E POUSADAS',
  '8511-2/00 - EDUCAÇÃO INFANTIL - CRECHE',
  '8512-1/00 - EDUCAÇÃO INFANTIL - PRÉ-ESCOLA',
  '7500-1/00 - ATIVIDADES VETERINÁRIAS (CLÍNICA / CONSULTÓRIO VETERINÁRIO)',
  '8711-5/02 - INSTITUIÇÕES DE LONGA PERMANÊNCIA PARA IDOSOS (ILPI)',
  '8122-2/00 - IMUNIZAÇÃO E CONTROLE DE PRAGAS URBANAS (DEDETIZADORA)'
];

/**
 * Verifica se o usuário atual possui permissão de MASTER (Administrador Geral / Diretoria)
 */
export const isUserMaster = (user: UserProfile | null): boolean => {
  if (!user) return false;
  const cargo = (user.cargo || '').toUpperCase();
  const nivel = (user.nivel_acesso || '').toUpperCase();
  const email = (user.email || '').toLowerCase();

  return (
    cargo === 'MASTER ADM' ||
    cargo === 'DIRETOR-GERAL' ||
    cargo === 'DIRETOR DFSIS' ||
    cargo.includes('MASTER') ||
    nivel.includes('MASTER') ||
    nivel === 'MASTER (TUDO)' ||
    email === 'manof1@gmail.com'
  );
};

/**
 * Retorna link direto para download / exportação em PDF do Google Docs
 */
export const getGoogleDocsPdfUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();

  // Google Docs padrão /document/d/{ID}
  const docMatch = trimmed.match(/\/document\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/);
  if (docMatch && docMatch[1]) {
    return `https://docs.google.com/document/d/${docMatch[1]}/export?format=pdf`;
  }

  // Google Drive padrão /file/d/{ID}
  const driveMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }

  // Se já for um link de exportação
  if (trimmed.includes('/export?format=pdf')) {
    return trimmed;
  }

  return trimmed;
};

/**
 * Converte qualquer link de Google Docs ou Google Drive em link de visualização incorporada (preview / embed)
 */
export const getGoogleDocsEmbedUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();

  // Links publicados na web (Publish to web)
  if (trimmed.includes('/pub')) {
    return trimmed.includes('?') ? `${trimmed}&embedded=true` : `${trimmed}?embedded=true`;
  }

  // Google Docs padrão /document/d/{ID} ou /document/u/0/d/{ID}
  const docMatch = trimmed.match(/\/document\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/);
  if (docMatch && docMatch[1]) {
    return `https://docs.google.com/document/d/${docMatch[1]}/preview`;
  }

  // Google Drive padrão /file/d/{ID}
  const driveMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }

  // Google Drive via ID direto (?id=... ou &id=...)
  const openMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch && openMatch[1]) {
    return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  }

  // Fallback para qualquer link de docs.google.com terminando com /edit
  if (trimmed.includes('docs.google.com')) {
    return trimmed.replace(/\/edit.*$/, '/preview');
  }

  return trimmed;
};

/**
 * Retorna link direto para edição ou abertura externa do Google Docs
 */
export const getGoogleDocsEditUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  const docMatch = trimmed.match(/\/document\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/);
  if (docMatch && docMatch[1]) {
    return `https://docs.google.com/document/d/${docMatch[1]}/edit`;
  }
  const driveMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/view`;
  }
  return trimmed;
};

export const getTextoSetorDinamico = (modeloTipo?: string): string => {
  if (!modeloTipo) return '';
  if (modeloTipo === 'PONTO_MILHO_CHURROS') {
    return 'PONTO DE MILHO E CHURRO';
  }
  if (modeloTipo === 'FEIRANTE') {
    return 'ALVARÁ FEIRANTE';
  }
  if (modeloTipo === 'GERAL') {
    return '';
  }
  return '';
};

export const formatAlvaraDataForDocs = (alv: AlvaraSanitarioItem): string => {
  const numComple = [alv.numero, alv.complemento].filter(Boolean).join(' / ') || 'S/N';
  const setor = getTextoSetorDinamico(alv.modelo_tipo) || 'GERAL';
  return [
    `=== DADOS OFICIAIS DO ALVARÁ SANITÁRIO Nº ${alv.numero_alvara}/${alv.ano_exercicio} ===`,
    `1. NOME/RAZÃO SOCIAL: ${alv.razao_social}`,
    `2. CPF/CNPJ: ${alv.cnpj_cpf}`,
    `3. NOME FANTASIA: ${alv.nome_fantasia || alv.razao_social}`,
    `4. ENDEREÇO: ${alv.endereco}`,
    `5. Nº / COMPL / SALA: ${numComple}`,
    `6. BAIRRO: ${alv.bairro}`,
    `7. CEP: ${alv.cep || '88330-000'}`,
    `8. DATA EMISSÃO: ${alv.data_emissao ? alv.data_emissao.split('-').reverse().join('/') : ''}`,
    `9. PASTA SANITÁRIA: ${alv.pasta || 'N/A'}`,
    `VALIDADE: ${alv.validade ? alv.validade.split('-').reverse().join('/') : ''}`,
    `SETOR: ${setor}`,
    `CNAE / ATIVIDADE: ${alv.cnae_principal || '-'}`,
    `CONDICIONANTES: ${alv.condicionantes || 'Cumprir as normas de Boas Práticas Sanitárias vigentes.'}`,
    `ASSINATURA DIGITAL: ${alv.assinatura_digital || 'Assinado digitalmente pela autoridade sanitária'}`
  ].join('\n');
};

export const MODELOS_DISPONIVEIS: ModeloAlvaraDef[] = [
  {
    id: 'PONTO_MILHO_CHURROS',
    titulo: 'Ponto Milho e Churro',
    subtitulo: 'Licenciamento para pontos de venda ambulante de milho verde e churro na orla/vias públicas',
    icone: '🌽',
    badge: 'ORLA / AMBULANTE',
    cor: 'amber',
    setorPadrao: 'ALIMENTOS',
    cnaeSugerido: '5612-1/00 - SERVIÇOS AMBULANTES DE ALIMENTAÇÃO',
    condicionantesPadrao: 'Alvará concedido estritamente para o ponto e equipamento vistoriado. Obrigatório uso de vestimenta adequada, proteção dos alimentos contra intempéries, água potável, recipientes térmicos higienizados e manutenção da licença visível.',
    docsUrl: 'https://docs.google.com/document/d/1MkvPN6i0wEqY4vADxaFbbIs0S_Y2R5QQnsrDIPobvKQ/edit?tab=t.0'
  },
  {
    id: 'FEIRANTE',
    titulo: 'Alvará Feirante',
    subtitulo: 'Licença sanitária para feiras livres municipais (Rua 200, Cultura, Pescador, Orla)',
    icone: '🎪',
    badge: 'FEIRAS LIVRES',
    cor: 'emerald',
    setorPadrao: 'ALIMENTOS',
    cnaeSugerido: '4729-6/99 - COMÉRCIO VAREJISTA DE PRODUTOS ALIMENTÍCIOS EM GERAL (FEIRANTE)',
    condicionantesPadrao: 'Obrigatória a exposição deste alvará em local visível na banca/barraca de feira. Cumprimento rigoroso das Boas Práticas de Manipulação de Alimentos e controle higiênico-sanitário da feira regulamentada pelo Decreto Municipal.',
    docsUrl: 'https://docs.google.com/document/d/1MkvPN6i0wEqY4vADxaFbbIs0S_Y2R5QQnsrDIPobvKQ/edit?tab=t.0'
  },
  {
    id: 'GERAL',
    titulo: 'Alvará Sanitário Geral',
    subtitulo: 'Licenciamento sanitário para estabelecimentos comerciais, prestação de serviços e indústrias',
    icone: '🏢',
    badge: 'GERAL / COMÉRCIO',
    cor: 'blue',
    setorPadrao: 'GERAL',
    cnaeSugerido: 'COMÉRCIO / SERVIÇOS',
    condicionantesPadrao: 'Manter o Alvará Sanitário fixado em local visível ao público. Observar o cumprimento integral das normas técnicas, sanitárias e do Código Sanitário Municipal vigente.',
    docsUrl: 'https://docs.google.com/document/d/1MkvPN6i0wEqY4vADxaFbbIs0S_Y2R5QQnsrDIPobvKQ/edit?tab=t.0'
  }
];

export const MODELOS_DOCS_INICIAIS: ModeloAlvaraDocsItem[] = [
  {
    id: 'modelo_oficial_dvis',
    nome: 'Modelo Oficial de Alvará Sanitário (Google Docs Padrão)',
    autor: 'Diretoria de Vigilância em Saúde (DVIS)',
    descricao: 'Modelo oficial aprovado de Alvará Sanitário expedido em conformidade com o Código Sanitário e Lei de Liberdade Econômica.',
    docs_url: 'https://docs.google.com/document/d/1MkvPN6i0wEqY4vADxaFbbIs0S_Y2R5QQnsrDIPobvKQ/edit?tab=t.0',
    template_texto: '',
    is_ativo: true,
    legislacao_base: 'LC 40/2019, LC 125/2025, Lei 4.999/2025 e Dec. 12.965/2026'
  }
];
