import JSZip from 'jszip';
import {
  FiscalizacaoItem,
  ProcessoItem,
  AmostraLaboratorioItem,
  PontoColetaLaboratorio,
  PastaVisaItem,
  AlvaraSanitarioItem,
  FeiranteItem,
  EscalaItem,
  UserProfile,
  AuditoriaLogItem
} from '../types';

/**
 * Escapa valores para o formato padrão CSV compatível com Excel brasileiro
 * - Delimitador: ponto e vírgula (;)
 * - Codificação: UTF-8 com BOM (\uFEFF)
 * - Aspas duplas escapadas como ""
 */
export function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  if (typeof val === 'boolean') return val ? '"SIM"' : '"NÃO"';
  if (Array.isArray(val)) {
    const joined = val.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ');
    return `"${joined.replace(/"/g, '""')}"`;
  }
  if (typeof val === 'object') {
    return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
  }
  const str = String(val).replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ');
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Dispara o download de um arquivo CSV no navegador
 */
export function downloadCsvFile(filename: string, csvContent: string): void {
  const contentWithBom = csvContent.startsWith('\uFEFF') ? csvContent : '\uFEFF' + csvContent;
  const blob = new Blob([contentWithBom], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Dispara o download de um arquivo Blob (ex: ZIP) no navegador
 */
export function downloadBlobFile(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// 1. EXPORTAÇÃO: FISCALIZAÇÕES (VISTORIAS SANITÁRIAS)
// ============================================================================
export function exportFiscalizacoesToCSV(items: FiscalizacaoItem[]): string {
  const headers = [
    'ID_SISTEMA',
    'PROTOCOLO',
    'DATA_HORA_VISTORIA',
    'TIPO_VISTORIA',
    'STATUS_SANITARIO',
    'GRAU_RISCO',
    'RAZAO_SOCIAL',
    'NOME_FANTASIA',
    'CNPJ_CPF',
    'TIPO_ESTABELECIMENTO',
    'ENDERECO',
    'NUMERO',
    'BAIRRO',
    'TELEFONE',
    'RESPONSAVEL_ESTABELECIMENTO',
    'FISCAL_RESPONSAVEL',
    'PROCESSO_VINCULADO',
    'IRREGULARIDADES_CONSTATADAS',
    'MEDIDAS_ADOTADAS',
    'PRAZO_ADEQUACAO_DIAS',
    'OBSERVACOES_FISCAIS',
    'TOTAL_ITENS_CHECKLIST',
    'ITENS_CONFORMES',
    'ITENS_NAO_CONFORMES',
    'LATITUDE',
    'LONGITUDE'
  ];

  const rows = items.map(item => {
    const checklist = item.checklists || [];
    const conformes = checklist.filter(c => c.status === 'CONFORME').length;
    const naoConformes = checklist.filter(c => c.status === 'NAO_CONFORME').length;
    const irregularidades = (item.irregularidadesEncontradas || []).join(', ');

    return [
      escapeCsvField(item.id),
      escapeCsvField(item.protocolo),
      escapeCsvField(item.dataHora),
      escapeCsvField(item.tipoVistoria),
      escapeCsvField(item.status),
      escapeCsvField(item.risco),
      escapeCsvField(item.estabelecimento?.razaoSocial || ''),
      escapeCsvField(item.estabelecimento?.nomeFantasia || ''),
      escapeCsvField(item.estabelecimento?.cnpjCpf || ''),
      escapeCsvField(item.estabelecimento?.tipo || ''),
      escapeCsvField(item.estabelecimento?.endereco || ''),
      escapeCsvField(item.estabelecimento?.numero || ''),
      escapeCsvField(item.estabelecimento?.bairro || ''),
      escapeCsvField(item.estabelecimento?.telefone || ''),
      escapeCsvField(item.estabelecimento?.responsavel || ''),
      escapeCsvField(item.fiscalNome),
      escapeCsvField(item.numProcesso || item.processoId || ''),
      escapeCsvField(irregularidades),
      escapeCsvField(item.medidasAdotadas || ''),
      escapeCsvField(item.prazoAdequacaoDias ?? ''),
      escapeCsvField(item.observacoesFiscais || ''),
      escapeCsvField(checklist.length),
      escapeCsvField(conformes),
      escapeCsvField(naoConformes),
      escapeCsvField(item.coordenadas?.lat || ''),
      escapeCsvField(item.coordenadas?.lng || '')
    ].join(';');
  });

  return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
}

// ============================================================================
// 2. EXPORTAÇÃO: PROCESSOS SANITÁRIOS
// ============================================================================
export function exportProcessosToCSV(items: ProcessoItem[]): string {
  const headers = [
    'ID_SISTEMA',
    'NUMERO_PROCESSO',
    'PROTOCOLO_1DOC',
    'DATA_1DOC',
    'VENC_1DOC',
    'DATA_PROTOCOLO',
    'DATA_ENTRADA',
    'RAZAO_SOCIAL',
    'NOME_FANTASIA',
    'CNPJ_CPF',
    'ASSUNTO',
    'ENDERECO',
    'NUMERO_COMPLEMENTO',
    'BAIRRO',
    'CEP',
    'CNAE_PRINCIPAL',
    'GRAU_RISCO',
    'SETOR_COMPETENTE',
    'STATUS_PROCESSO',
    'FISCAL_RESPONSAVEL',
    'DATA_ENTREGUE_FISCAL',
    'AGENDADO_PARA',
    'VALIDADE',
    'PASTA_FISICA',
    'ULTIMO_PARECER_TIPO',
    'ULTIMO_PARECER_DATA',
    'ULTIMO_PARECER_AUTOR',
    'ULTIMO_PARECER_TEXTO',
    'TOTAL_PARECERES',
    'ULTIMA_TRAMITACAO_TIPO',
    'ULTIMA_TRAMITACAO_DATA',
    'ULTIMA_TRAMITACAO_TITULO',
    'TOTAL_TRAMITACOES',
    'OBSERVACOES'
  ];

  const rows = items.map(p => {
    const pareceres = p.pareceres || [];
    const ultimoParecer = pareceres.length > 0 ? pareceres[pareceres.length - 1] : null;
    const tramitacoes = p.tramitacoes || [];
    const ultimaTramitacao = tramitacoes.length > 0 ? tramitacoes[tramitacoes.length - 1] : null;

    return [
      escapeCsvField(p.id),
      escapeCsvField(p.num_processo || ''),
      escapeCsvField(p.prot_1doc || ''),
      escapeCsvField(p.data_1doc || ''),
      escapeCsvField(p.venc_1doc || ''),
      escapeCsvField(p.data_protocolo || ''),
      escapeCsvField(p.data_entrada || ''),
      escapeCsvField(p.razao_social || ''),
      escapeCsvField(p.nome_fantasia || ''),
      escapeCsvField(p.cnpj_cpf || ''),
      escapeCsvField(p.assunto || ''),
      escapeCsvField(p.endereco || ''),
      escapeCsvField(p.numero_complemento || ''),
      escapeCsvField(p.bairro || ''),
      escapeCsvField(p.cep || ''),
      escapeCsvField(p.cnae || (p.cnaes ? p.cnaes.join(', ') : '')),
      escapeCsvField(p.grau_risco || ''),
      escapeCsvField(p.setor || ''),
      escapeCsvField(p.status || ''),
      escapeCsvField(p.fiscal_responsavel || ''),
      escapeCsvField(p.data_entregue_fiscal || ''),
      escapeCsvField(p.agendado_para || ''),
      escapeCsvField(p.validade || p.venc_licenca || ''),
      escapeCsvField(p.pasta || ''),
      escapeCsvField(ultimoParecer?.tipo_parecer || ''),
      escapeCsvField(ultimoParecer?.data_hora || ''),
      escapeCsvField(ultimoParecer?.autor_nome || ''),
      escapeCsvField(ultimoParecer?.parecer_texto || ''),
      escapeCsvField(pareceres.length),
      escapeCsvField(ultimaTramitacao?.tipo || ''),
      escapeCsvField(ultimaTramitacao?.data_hora || ''),
      escapeCsvField(ultimaTramitacao?.titulo || ''),
      escapeCsvField(tramitacoes.length),
      escapeCsvField(p.observacoes || '')
    ].join(';');
  });

  return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
}

// ============================================================================
// 3. EXPORTAÇÃO: LABORATÓRIO (AMOSTRAS E ANÁLISES DE ÁGUA/ALIMENTOS)
// ============================================================================
export function exportLaboratorioToCSV(items: AmostraLaboratorioItem[]): string {
  const headers = [
    'ID_AMOSTRA',
    'CODIGO_AMOSTRA',
    'PROTOCOLO_OFICIAL',
    'MES_ANO_REFERENCIA',
    'TIPO_MATRIZ',
    'INTERESSADO_SOLICITANTE',
    'ESTABELECIMENTO',
    'CNPJ_CPF',
    'NUMERO_ALVARA',
    'LOCAL_COLETA',
    'PONTO_COLETA_NOME',
    'BAIRRO',
    'ENDERECO_COLETA',
    'DATA_COLETA',
    'HORA_COLETA',
    'FISCAL_COLETOR',
    'TEMPERATURA_COLETA',
    'PH_MEDIDO',
    'CLORO_RESIDUAL_LIVRE',
    'FLUOR_FLUORETO',
    'TURBIDEZ',
    'ASPECTO',
    'ODOR',
    'COR',
    'COLIFORMES_TOTAIS',
    'ESCHERICHIA_COLI',
    'STATUS_ANALISE',
    'LAUDO_NUMERO',
    'CONCLUSAO_LAUDO',
    'DATA_RESULTADO',
    'LABORATORIALISTA_RESPONSAVEL',
    'CARGO_LABORATORIALISTA',
    'OBSERVACOES'
  ];

  const rows = items.map(a => {
    return [
      escapeCsvField(a.id),
      escapeCsvField(a.codigo_amostra || ''),
      escapeCsvField(a.protocolo || ''),
      escapeCsvField(a.mes_ano_referencia || ''),
      escapeCsvField(a.tipo_matriz || ''),
      escapeCsvField(a.interessado || ''),
      escapeCsvField(a.estabelecimento || ''),
      escapeCsvField(a.cnpj_cpf || ''),
      escapeCsvField(a.numero_alvara || ''),
      escapeCsvField(a.local_coleta || ''),
      escapeCsvField(a.ponto_coleta_nome || ''),
      escapeCsvField(a.bairro || ''),
      escapeCsvField(a.endereco || ''),
      escapeCsvField(a.data_coleta || ''),
      escapeCsvField(a.hora_coleta || ''),
      escapeCsvField(a.fiscal_coletor || ''),
      escapeCsvField(a.temperatura_coleta || ''),
      escapeCsvField(a.ph || ''),
      escapeCsvField(a.cloro || ''),
      escapeCsvField(a.fluoreto || ''),
      escapeCsvField(a.turbidez || ''),
      escapeCsvField(a.aspecto || ''),
      escapeCsvField(a.odor || ''),
      escapeCsvField(a.cor || ''),
      escapeCsvField(a.coliformes_totais || ''),
      escapeCsvField(a.escherichia_coli || ''),
      escapeCsvField(a.status || ''),
      escapeCsvField(a.laudo_numero || ''),
      escapeCsvField(a.conclusao_laudo || ''),
      escapeCsvField(a.data_resultado || ''),
      escapeCsvField(a.laboratorialista || ''),
      escapeCsvField(a.cargo_laboratorialista || ''),
      escapeCsvField(a.observacoes || '')
    ].join(';');
  });

  return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
}

// ============================================================================
// 4. EXPORTAÇÃO: PONTOS DE COLETA CADASTRADOS (LABORATÓRIO)
// ============================================================================
export function exportPontosColetaToCSV(items: PontoColetaLaboratorio[]): string {
  const headers = [
    'ID',
    'IDENTIFICADOR_PONTO',
    'LOCAL_REFERENCIA',
    'BAIRRO',
    'ENDERECO',
    'TIPO_MATRIZ_PADRAO',
    'OBSERVACAO',
    'ATIVO'
  ];

  const rows = items.map(p => [
    escapeCsvField(p.id),
    escapeCsvField(p.ponto),
    escapeCsvField(p.local),
    escapeCsvField(p.bairro),
    escapeCsvField(p.endereco || ''),
    escapeCsvField(p.tipo_matriz_padrao || ''),
    escapeCsvField(p.observacao || ''),
    escapeCsvField(p.ativo !== false)
  ].join(';'));

  return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
}

// ============================================================================
// 5. EXPORTAÇÃO: PASTAS DO ARQUIVO FÍSICO VISA
// ============================================================================
export function exportPastasVisaToCSV(items: PastaVisaItem[]): string {
  const headers = [
    'ID',
    'NUMERO_PASTA',
    'CNPJ_CPF',
    'RAZAO_SOCIAL',
    'STATUS_RECEITA_FEDERAL',
    'ALVARA_ATUALIZADO',
    'SETOR_SANITARIO',
    'OBSERVACOES',
    'CRIADO_POR',
    'CRIADO_EM',
    'ATUALIZADO_EM'
  ];

  const rows = items.map(p => [
    escapeCsvField(p.id),
    escapeCsvField(p.pasta),
    escapeCsvField(p.cnpj_cpf),
    escapeCsvField(p.razao_social),
    escapeCsvField(p.status_rf || ''),
    escapeCsvField(p.alvara_atualizado || ''),
    escapeCsvField(p.setor || ''),
    escapeCsvField(p.observacoes || ''),
    escapeCsvField(p.criado_por || ''),
    escapeCsvField(p.criado_em || ''),
    escapeCsvField(p.atualizado_em || '')
  ].join(';'));

  return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
}

// ============================================================================
// 6. EXPORTAÇÃO: ALVARÁS SANITÁRIOS
// ============================================================================
export function exportAlvarasToCSV(items: AlvaraSanitarioItem[]): string {
  const headers = [
    'ID',
    'NUMERO_ALVARA',
    'ANO_EXERCICIO',
    'TIPO_ALVARA',
    'MODELO_CATEGORIA',
    'NUMERO_PASTA',
    'CNPJ_CPF',
    'RAZAO_SOCIAL',
    'NOME_FANTASIA',
    'ENDERECO',
    'NUMERO',
    'COMPLEMENTO',
    'BAIRRO',
    'MUNICIPIO',
    'CEP',
    'CNAE_PRINCIPAL',
    'RESPONSAVEL_TECNICO',
    'CONSELHO_RT',
    'STATUS_ALVARA',
    'DATA_EMISSAO',
    'VALIDADE'
  ];

  const rows = items.map(a => [
    escapeCsvField(a.id),
    escapeCsvField(a.numero_alvara),
    escapeCsvField(a.ano_exercicio),
    escapeCsvField(a.tipo_alvara),
    escapeCsvField(a.modelo_tipo || ''),
    escapeCsvField(a.pasta || ''),
    escapeCsvField(a.cnpj_cpf),
    escapeCsvField(a.razao_social),
    escapeCsvField(a.nome_fantasia || ''),
    escapeCsvField(a.endereco),
    escapeCsvField(a.numero || ''),
    escapeCsvField(a.complemento || ''),
    escapeCsvField(a.bairro),
    escapeCsvField(a.municipio || 'BALNEÁRIO CAMBORIÚ'),
    escapeCsvField(a.cep || ''),
    escapeCsvField(a.cnae_principal || ''),
    escapeCsvField(a.responsavel_tecnico || ''),
    escapeCsvField(a.conselho_rt || ''),
    escapeCsvField(a.status || ''),
    escapeCsvField(a.data_emissao || ''),
    escapeCsvField(a.validade || '')
  ].join(';'));

  return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
}

// ============================================================================
// 7. EXPORTAÇÃO: FEIRANTES E AMBULANTES
// ============================================================================
export function exportFeirasToCSV(items: FeiranteItem[]): string {
  const headers = [
    'ID',
    'PROTOCOLO',
    'DATA_PROTOCOLO',
    'NOME_FEIRANTE',
    'CPF',
    'CNPJ',
    'FEIRA_LOCAL',
    'PASTA_FISICA',
    'PRODUTOS_COMERCIALIZADOS',
    'RUA',
    'NUMERO',
    'BAIRRO',
    'STATUS_ALVARA',
    'VALIDADE'
  ];

  const rows = items.map(f => [
    escapeCsvField(f.id),
    escapeCsvField(f.num_prot || ''),
    escapeCsvField(f.data_prot || ''),
    escapeCsvField(f.nome_pf || f.razao || ''),
    escapeCsvField(f.cpf || ''),
    escapeCsvField(f.cnpj || ''),
    escapeCsvField(f.feira || ''),
    escapeCsvField(f.pasta || ''),
    escapeCsvField(f.produtos || ''),
    escapeCsvField(f.rua || ''),
    escapeCsvField(f.num || ''),
    escapeCsvField(f.bairro || ''),
    escapeCsvField(f.alvara || ''),
    escapeCsvField(f.validade || '')
  ].join(';'));

  return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
}

// ============================================================================
// 8. EXPORTAÇÃO: ESCALA DE SERVIDORES E PLANTONISTAS
// ============================================================================
export function exportEscalaToCSV(items: EscalaItem[]): string {
  const headers = [
    'ID',
    'DATA',
    'TIPO_ESCALA',
    'SERVIDORES_ESCALADOS',
    'DESCRICAO'
  ];

  const rows = items.map(e => [
    escapeCsvField(e.id),
    escapeCsvField(e.data),
    escapeCsvField(e.tipo),
    escapeCsvField(e.servidores || ''),
    escapeCsvField(e.descricao || '')
  ].join(';'));

  return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
}

// ============================================================================
// 9. EXPORTAÇÃO: SERVIDORES / USUÁRIOS
// ============================================================================
export function exportUsersToCSV(items: UserProfile[]): string {
  const headers = [
    'ID',
    'NOME_COMPLETO',
    'EMAIL',
    'CARGO',
    'SETOR',
    'NIVEL_ACESSO',
    'MATRICULA',
    'CONSELHO_REGIONAL',
    'TELEFONE',
    'TIPO_USUARIO'
  ];

  const rows = items.map(u => [
    escapeCsvField(u.id),
    escapeCsvField(u.nome_completo),
    escapeCsvField(u.email),
    escapeCsvField(u.cargo),
    escapeCsvField(u.setor || ''),
    escapeCsvField(u.nivel_acesso || ''),
    escapeCsvField(u.matricula || ''),
    escapeCsvField(u.conselho_regional || ''),
    escapeCsvField(u.telefone || ''),
    escapeCsvField(u.tipo_usuario || 'SERVIDOR')
  ].join(';'));

  return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
}

// ============================================================================
// INTERFACE DE PACOTE DE DADOS PARA BACKUP COMPLETO
// ============================================================================
export interface CompleteSystemData {
  fiscalizacoes: FiscalizacaoItem[];
  processos: ProcessoItem[];
  amostrasLaboratorio: AmostraLaboratorioItem[];
  pontosColeta?: PontoColetaLaboratorio[];
  pastasVisa?: PastaVisaItem[];
  alvaras?: AlvaraSanitarioItem[];
  feiras?: FeiranteItem[];
  escala?: EscalaItem[];
  users?: UserProfile[];
  auditoriaLogs?: AuditoriaLogItem[];
}

/**
 * Gera um arquivo ZIP contendo todas as tabelas em CSV individuais
 * mais um Manifesto de Auditoria e Backup.
 */
export async function generateBackupZip(data: CompleteSystemData): Promise<Blob> {
  const zip = new JSZip();
  const folderName = `backup_visa_bc_${new Date().toISOString().slice(0, 10)}`;
  const root = zip.folder(folderName) || zip;

  // 1. As 3 tabelas principais solicitadas
  const csvFiscalizacoes = exportFiscalizacoesToCSV(data.fiscalizacoes || []);
  const csvProcessos = exportProcessosToCSV(data.processos || []);
  const csvLaboratorio = exportLaboratorioToCSV(data.amostrasLaboratorio || []);

  root.file('1_fiscalizacoes_sanitarias_bc.csv', csvFiscalizacoes);
  root.file('2_processos_administrativos_bc.csv', csvProcessos);
  root.file('3_laboratorio_analises_amostras_bc.csv', csvLaboratorio);

  // 2. Tabelas complementares do sistema
  if (data.pontosColeta && data.pontosColeta.length > 0) {
    root.file('4_pontos_coleta_laboratorio_bc.csv', exportPontosColetaToCSV(data.pontosColeta));
  }
  if (data.pastasVisa && data.pastasVisa.length > 0) {
    root.file('5_pastas_arquivo_fisico_visa_bc.csv', exportPastasVisaToCSV(data.pastasVisa));
  }
  if (data.alvaras && data.alvaras.length > 0) {
    root.file('6_alvaras_sanitarios_emitidos_bc.csv', exportAlvarasToCSV(data.alvaras));
  }
  if (data.feiras && data.feiras.length > 0) {
    root.file('7_feirantes_ambulantes_bc.csv', exportFeirasToCSV(data.feiras));
  }
  if (data.escala && data.escala.length > 0) {
    root.file('8_escala_plantao_fiscais_bc.csv', exportEscalaToCSV(data.escala));
  }
  if (data.users && data.users.length > 0) {
    root.file('9_operadores_servidores_bc.csv', exportUsersToCSV(data.users));
  }

  // 3. Manifesto de integridade e conferência
  const manifesto = [
    '========================================================================',
    'PREFEITURA MUNICIPAL DE BALNEÁRIO CAMBORIÚ - SC',
    'SECRETARIA DE SAÚDE • DIVISÃO DE VIGILÂNCIA SANITÁRIA E AMBIENTAL (DVIS)',
    'MANIFESTO DE BACKUP MANUAL DE SEGURANÇA (CSV UTF-8 COM BOM)',
    '========================================================================',
    `Data e Hora da Geração: ${new Date().toLocaleString('pt-BR')}`,
    `Carimbo ISO: ${new Date().toISOString()}`,
    '',
    'RESUMO QUANTITATIVO DAS TABELAS EXPORTADAS:',
    `• Fiscalizações Sanitárias: ${data.fiscalizacoes?.length || 0} registros`,
    `• Processos Administrativos: ${data.processos?.length || 0} registros`,
    `• Amostras e Laudos de Laboratório: ${data.amostrasLaboratorio?.length || 0} registros`,
    `• Pontos de Coleta Cadastrados: ${data.pontosColeta?.length || 0} registros`,
    `• Pastas Físicas do Arquivo VISA: ${data.pastasVisa?.length || 0} registros`,
    `• Alvarás Sanitários Emitidos: ${data.alvaras?.length || 0} registros`,
    `• Feirantes e Ambulantes Licenciados: ${data.feiras?.length || 0} registros`,
    `• Escala de Trabalho e Plantão: ${data.escala?.length || 0} registros`,
    `• Operadores / Servidores Cadastrados: ${data.users?.length || 0} registros`,
    '',
    'PADRÃO TÉCNICO DE EXPORTAÇÃO:',
    '• Delimitador de Colunas: Ponto e vírgula (;)',
    '• Codificação de Caracteres: UTF-8 com BOM (compatível com MS Excel, LibreOffice Calc e Google Sheets)',
    '• Tratamento de Caracteres Especiais: Acentuação preservada (ç, ã, é, etc.)',
    '========================================================================'
  ].join('\r\n');

  root.file('MANIFESTO_BACKUP_DVIS_BC.txt', manifesto);

  return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}
