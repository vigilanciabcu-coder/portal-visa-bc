import { AuditoriaLogItem, ModuloAuditoria, UserProfile } from '../types';

const AUDITORIA_STORAGE_KEY = 'visa_auditoria_logs';
const MAX_LOGS_LOCAL = 300; // Ring buffer de segurança (nunca ultrapassa ~60KB de memória)

/**
 * Logs iniciais demonstrativos do sistema para histórico de implantação
 */
const INITIAL_AUDITORIA_LOGS: AuditoriaLogItem[] = [
  {
    id: 'log-init-1',
    data_hora: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    usuario_nome: 'Administrador Master',
    usuario_cargo: 'MASTER ADM',
    usuario_matricula: 'MST-0001',
    modulo: 'SISTEMA',
    acao: 'INICIALIZACAO',
    alvo_identificador: 'Portal VISA-BC v2.6',
    detalhes: 'Implantação e ativação da estrutura de segurança e controle de acessos da Vigilância Sanitária.',
    nivel_severidade: 'INFO',
    setor: 'GERAL'
  },
  {
    id: 'log-init-2',
    data_hora: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    usuario_nome: 'Administrador Master',
    usuario_cargo: 'MASTER ADM',
    usuario_matricula: 'MST-0001',
    modulo: 'OPERADORES',
    acao: 'CONFIGURACAO_ACESSO',
    alvo_identificador: 'Diretorias Setoriais',
    detalhes: 'Configuração dos perfis de Diretor Geral, Diretor de Alimentos e Diretor de Saúde.',
    nivel_severidade: 'INFO',
    setor: 'GERAL'
  }
];

/**
 * Recupera os logs de auditoria armazenados localmente
 */
export function getAuditoriaLogs(): AuditoriaLogItem[] {
  try {
    const raw = localStorage.getItem(AUDITORIA_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(AUDITORIA_STORAGE_KEY, JSON.stringify(INITIAL_AUDITORIA_LOGS));
      return INITIAL_AUDITORIA_LOGS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn('[Auditoria] Falha não-bloqueante ao ler logs:', err);
  }
  return INITIAL_AUDITORIA_LOGS;
}

/**
 * Registra um evento de auditoria de forma 100% ASSÍNCRONA e NÃO-BLOQUEANTE (Fire-and-Forget).
 * NUNCA interrompe, trava ou retarda a ação principal do usuário.
 */
export function registrarAuditoria(
  dados: {
    usuario?: UserProfile | null;
    usuario_nome?: string;
    usuario_cargo?: string;
    usuario_matricula?: string;
    modulo: ModuloAuditoria;
    acao: string;
    alvo_identificador?: string;
    detalhes: string;
    nivel_severidade?: 'INFO' | 'AVISO' | 'CRITICO';
    setor?: string;
  }
): void {
  // Executa em segundo plano imediato (fila de microtarefas) sem prender a UI do navegador
  setTimeout(() => {
    try {
      const uNome = dados.usuario?.nome_completo || dados.usuario_nome || 'Operador VISA';
      const uCargo = dados.usuario?.cargo || dados.usuario_cargo || 'SERVIDOR';
      const uMatricula = dados.usuario?.matricula || dados.usuario_matricula || 'DVIS';

      const novoItem: AuditoriaLogItem = {
        id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        data_hora: new Date().toISOString(),
        usuario_id: dados.usuario?.id,
        usuario_nome: uNome,
        usuario_cargo: uCargo,
        usuario_matricula: uMatricula,
        modulo: dados.modulo,
        acao: dados.acao,
        alvo_identificador: dados.alvo_identificador,
        detalhes: dados.detalhes,
        nivel_severidade: dados.nivel_severidade || 'INFO',
        setor: dados.setor || dados.usuario?.setor || 'GERAL'
      };

      const logsAtuais = getAuditoriaLogs();
      // Insere no início e preserva limite FIFO (máximo MAX_LOGS_LOCAL registros)
      const logsAtualizados = [novoItem, ...logsAtuais].slice(0, MAX_LOGS_LOCAL);

      localStorage.setItem(AUDITORIA_STORAGE_KEY, JSON.stringify(logsAtualizados));
    } catch (err) {
      // Falha silenciosa: a auditoria nunca pode impedir a experiência do usuário
      console.warn('[Auditoria Silenciosa] Log não gravado:', err);
    }
  }, 0);
}

/**
 * Limpa o histórico de auditoria local (exclusivo para testes do Master)
 */
export function limparAuditoriaLogs(): void {
  try {
    localStorage.removeItem(AUDITORIA_STORAGE_KEY);
  } catch (err) {
    console.warn('[Auditoria] Falha ao limpar logs:', err);
  }
}

/**
 * Gera arquivo CSV com a trilha de auditoria para exportação e conformidade oficial
 */
export function exportarAuditoriaCSV(logs: AuditoriaLogItem[]): string {
  const headers = ['Data e Hora', 'Operador', 'Cargo', 'Matrícula', 'Módulo', 'Ação', 'Alvo / Documento', 'Setor', 'Severidade', 'Detalhes'];
  
  const rows = logs.map((l) => {
    const dataFmt = new Date(l.data_hora).toLocaleString('pt-BR');
    const escapeCsv = (str?: string) => `"${(str || '').replace(/"/g, '""')}"`;

    return [
      escapeCsv(dataFmt),
      escapeCsv(l.usuario_nome),
      escapeCsv(l.usuario_cargo),
      escapeCsv(l.usuario_matricula),
      escapeCsv(l.modulo),
      escapeCsv(l.acao),
      escapeCsv(l.alvo_identificador),
      escapeCsv(l.setor),
      escapeCsv(l.nivel_severidade),
      escapeCsv(l.detalhes)
    ].join(';');
  });

  return [headers.join(';'), ...rows].join('\r\n');
}
