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
