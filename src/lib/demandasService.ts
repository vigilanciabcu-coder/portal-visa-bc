import { ProcessoItem, UserProfile, SetorDemanda, SETORES_DEMANDA_LISTA, isUserFiscal } from '../types';

/**
 * Mapeia o setor textual de um processo para os Setores Oficiais de Demanda
 */
export function normalizarSetorDemanda(setorRaw?: string, assuntoRaw?: string): SetorDemanda {
  const combined = `${setorRaw || ''} ${assuntoRaw || ''}`.toUpperCase();

  if (combined.includes('HABITE') || combined.includes('OBRA') || combined.includes('ENGENHARIA') || combined.includes('LC 40')) {
    return 'HABITE-SE SANITÁRIO';
  }
  if (combined.includes('FARMÁCIA') || combined.includes('FARMACIA') || combined.includes('DROGARIA') || combined.includes('MEDICAMENTO')) {
    return 'FARMÁCIAS & MEDICAMENTOS';
  }
  if (combined.includes('SAÚDE') || combined.includes('SAUDE') || combined.includes('CLÍNICA') || combined.includes('ODONTO') || combined.includes('HOSPITAL') || combined.includes('LABORAT')) {
    return 'SAÚDE';
  }
  if (combined.includes('ALIMENTO') || combined.includes('RESTAURANTE') || combined.includes('PADARIA') || combined.includes('LANCHONETE') || combined.includes('AÇOUGUE') || combined.includes('MERCADO')) {
    return 'ALIMENTOS';
  }
  if (combined.includes('ÁGUA') || combined.includes('AGUA') || combined.includes('PISCINA') || combined.includes('SANEAMENTO') || combined.includes('AMBIENTAL') || combined.includes('POÇO')) {
    return 'SANEAMENTO & AMBIENTAL';
  }
  if (combined.includes('FEIRA') || combined.includes('AMBULANTE') || combined.includes('EVENTO') || combined.includes('QUIOSQUE')) {
    return 'EVENTOS & FEIRAS';
  }
  if (combined.includes('DENÚNCIA') || combined.includes('DENUNCIA') || combined.includes('OUVIDORIA') || combined.includes('INFRAÇÃO')) {
    return 'OUVIDORIA & DENÚNCIAS';
  }
  return 'GERAL';
}

/**
 * Retorna os fiscais aptos para atender um determinado setor
 */
export function getFiscaisDoSetor(fiscais: UserProfile[], setor: SetorDemanda): UserProfile[] {
  const fiscaisAtivos = fiscais.filter((u) => isUserFiscal(u));
  if (fiscaisAtivos.length === 0) return fiscais;

  // Tenta encontrar fiscais com especialidade ou atribuição no setor
  const setorUpper = setor.toUpperCase();
  const especialistas = fiscaisAtivos.filter((u) => {
    const cargo = (u.cargo || '').toUpperCase();
    const uSetor = (u.setor || '').toUpperCase();
    const nivel = (u.nivel_acesso || '').toUpperCase();

    if (setorUpper.includes('ALIMENTO') && (cargo.includes('ALIMENT') || nivel.includes('ALIMENT') || cargo.includes('NUTRI') || cargo.includes('VETERINÁR'))) return true;
    if (setorUpper.includes('SAÚDE') && (cargo.includes('SAÚDE') || cargo.includes('SAUDE') || nivel.includes('SAÚDE') || cargo.includes('MÉDIC') || cargo.includes('DENT'))) return true;
    if (setorUpper.includes('FARMÁCIA') && (cargo.includes('FARMAC') || cargo.includes('BIOQUÍM') || nivel.includes('SAÚDE'))) return true;
    if (setorUpper.includes('HABITE') && (cargo.includes('ENGENHEIR') || cargo.includes('EDIFICA') || cargo.includes('HABITE') || nivel.includes('FISCAL'))) return true;
    if (setorUpper.includes('AMBIENTAL') && (cargo.includes('ENDEM') || cargo.includes('AMBIENT') || uSetor.includes('AMBIENTAL'))) return true;
    if (setorUpper.includes('FEIRA') && (nivel.includes('FEIRAS') || cargo.includes('FEIRA') || cargo.includes('FISCAL'))) return true;
    if (setorUpper.includes('DENÚNCIA') && (cargo.includes('FISCAL') || nivel.includes('FISCAL'))) return true;

    return false;
  });

  // Se houver fiscais especialistas, retorna-os; caso contrário, qualquer fiscal ativo do quadro
  return especialistas.length > 0 ? especialistas : fiscaisAtivos;
}

/**
 * Calcula a data de prazo de vistoria / SLA padrão (em dias a partir de hoje)
 */
export function calcularPrazoVistoria(grauRisco?: string, motivacao?: string): string {
  const hoje = new Date();
  let dias = 15; // padrão 15 dias

  const riscoUpper = (grauRisco || '').toUpperCase();
  const motUpper = (motivacao || '').toUpperCase();

  if (riscoUpper.includes('ALTO') || motUpper.includes('DENÚNCIA') || motUpper.includes('INTERDIÇÃO')) {
    dias = 5; // urgência: 5 dias
  } else if (motUpper.includes('HABITE-SE') || motUpper.includes('LC 40')) {
    dias = 10; // habite-se: 10 dias úteis
  } else if (riscoUpper.includes('BAIXO')) {
    dias = 30; // baixo risco: 30 dias
  }

  hoje.setDate(hoje.getDate() + dias);
  const yyyy = hoje.getFullYear();
  const mm = String(hoje.getMonth() + 1).padStart(2, '0');
  const dd = String(hoje.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Sorteia randomicamente um fiscal de um grupo e atribui a demanda
 */
export function sortearFiscalRandomicamente(
  processo: ProcessoItem,
  todosFiscais: UserProfile[]
): { processoAtualizado: ProcessoItem; fiscalEscolhido: UserProfile } | null {
  const setorNormalizado = normalizarSetorDemanda(processo.setor, processo.assunto || processo.motivacao);
  const fiscaisElegiveis = getFiscaisDoSetor(todosFiscais, setorNormalizado);

  if (fiscaisElegiveis.length === 0) return null;

  // Sorteio puramente randômico entre o grupo de fiscais daquele setor
  const indexSorteado = Math.floor(Math.random() * fiscaisElegiveis.length);
  const fiscalEscolhido = fiscaisElegiveis[indexSorteado];

  const hojeStr = new Date().toISOString().split('T')[0];
  const prazo = processo.prazo_vistoria || calcularPrazoVistoria(processo.grau_risco, processo.motivacao || processo.assunto);

  const processoAtualizado: ProcessoItem = {
    ...processo,
    setor: setorNormalizado,
    tipo_servico: processo.tipo_servico || processo.assunto || processo.motivacao || 'Vistoria Sanitária Regular',
    fiscal_responsavel: fiscalEscolhido.nome_completo,
    data_distribuicao: processo.data_distribuicao || hojeStr,
    prazo_vistoria: prazo,
    servidores: [
      {
        id: fiscalEscolhido.id,
        nome: fiscalEscolhido.nome_completo,
        matricula: fiscalEscolhido.matricula || 'FIS-BC'
      }
    ]
  };

  return { processoAtualizado, fiscalEscolhido };
}

/**
 * Troca manualmente a demanda para outro fiscal (Ação exclusiva da Diretoria)
 */
export function trocarFiscalDemanda(
  processo: ProcessoItem,
  novoFiscal: UserProfile,
  diretorResponsavel: UserProfile,
  motivo?: string
): ProcessoItem {
  const agora = new Date();
  const dataHoraStr = `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  
  const fiscalAnterior = processo.fiscal_responsavel || 'Não atribuído';
  const logTroca = `[DISTRIBUIÇÃO PELA DIRETORIA - ${dataHoraStr}]: Reatribuído de "${fiscalAnterior}" para "${novoFiscal.nome_completo}" por ${diretorResponsavel.nome_completo} (${diretorResponsavel.cargo || 'Diretoria'}). Motivo: ${motivo || 'Redistribuição de demandas de trabalho'}.`;

  const novasObservacoes = processo.observacoes 
    ? `${logTroca}\n\n${processo.observacoes}` 
    : logTroca;

  return {
    ...processo,
    fiscal_responsavel: novoFiscal.nome_completo,
    motivo_troca_fiscal: motivo || 'Redistribuição de demandas pela Diretoria',
    trocado_por_diretor: diretorResponsavel.nome_completo,
    trocado_em: dataHoraStr,
    observacoes: novasObservacoes,
    servidores: [
      {
        id: novoFiscal.id,
        nome: novoFiscal.nome_completo,
        matricula: novoFiscal.matricula || 'FIS-BC'
      }
    ]
  };
}

/**
 * Distribui em lote randomicamente todas as demandas que ainda não possuem fiscal atribuído
 */
export function distribuirDemandasNaoAtribuidas(
  processos: ProcessoItem[],
  fiscais: UserProfile[]
): { processosAtualizados: ProcessoItem[]; totalDistribuidas: number } {
  let total = 0;
  const atualizados = processos.map((p) => {
    const semFiscal = !p.fiscal_responsavel ||
      p.fiscal_responsavel.trim() === '' ||
      p.fiscal_responsavel.toUpperCase().includes('A DISTRIBUIR') ||
      p.fiscal_responsavel.toUpperCase().includes('NÃO ATRIBUÍDO') ||
      p.fiscal_responsavel.toUpperCase().includes('NAO ATRIBUIDO');

    if (semFiscal) {
      const resultado = sortearFiscalRandomicamente(p, fiscais);
      if (resultado) {
        total++;
        return resultado.processoAtualizado;
      }
    }
    return p;
  });

  return { processosAtualizados: atualizados, totalDistribuidas: total };
}

/**
 * Estatísticas consolidadas para o Painel da Diretoria
 */
export function getEstatisticasDiretoria(processos: ProcessoItem[], fiscais: UserProfile[]) {
  const fiscaisAtivos = fiscais.filter((u) => isUserFiscal(u));

  // Mapa de carga de trabalho por fiscal
  const cargaPorFiscal: Record<string, { fiscal: UserProfile; total: number; pendentes: number; concluidas: number; demandas: ProcessoItem[] }> = {};

  fiscaisAtivos.forEach((f) => {
    cargaPorFiscal[f.id] = {
      fiscal: f,
      total: 0,
      pendentes: 0,
      concluidas: 0,
      demandas: []
    };
  });

  let naoAtribuidas = 0;
  const demandasPorSetor: Record<string, number> = {};

  processos.forEach((p) => {
    const setor = normalizarSetorDemanda(p.setor, p.assunto || p.motivacao);
    demandasPorSetor[setor] = (demandasPorSetor[setor] || 0) + 1;

    const nomeFiscal = (p.fiscal_responsavel || '').toLowerCase().trim();
    const isSemFiscal = !nomeFiscal ||
      nomeFiscal.includes('a distribuir') ||
      nomeFiscal.includes('não atribuído') ||
      nomeFiscal.includes('nao atribuido');

    if (isSemFiscal) {
      naoAtribuidas++;
      return;
    }

    // Procura o fiscal na lista de fiscais
    const fiscalEncontrado = fiscaisAtivos.find(
      (f) => nomeFiscal.includes(f.nome_completo.toLowerCase()) || f.nome_completo.toLowerCase().includes(nomeFiscal)
    );

    const isConcluida = (p.status || '').toUpperCase().includes('DEFERIDO') || (p.status || '').toUpperCase().includes('CONCLU');

    if (fiscalEncontrado && cargaPorFiscal[fiscalEncontrado.id]) {
      cargaPorFiscal[fiscalEncontrado.id].total++;
      if (isConcluida) {
        cargaPorFiscal[fiscalEncontrado.id].concluidas++;
      } else {
        cargaPorFiscal[fiscalEncontrado.id].pendentes++;
      }
      cargaPorFiscal[fiscalEncontrado.id].demandas.push(p);
    }
  });

  return {
    totalDemandas: processos.length,
    naoAtribuidas,
    demandasPorSetor,
    fiscaisCarga: Object.values(cargaPorFiscal)
  };
}
