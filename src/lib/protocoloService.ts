import { ProcessoItem } from '../types';

/**
 * Regra Oficial de Protocolos da Vigilância Sanitária de Balneário Camboriú:
 * - Pelo menos 6 dígitos antes do ano: XXXXXX/AAAA (ex: 000001/2026, 000101/2026, 067020/2026)
 * - Ao iniciar o ano novo (1º de janeiro), a sequência recomeça automaticamente em 000001 do ano em vigor.
 */
export function formatarNumeroProtocolo(sequencia: number, ano?: number): string {
  const anoVigente = ano || new Date().getFullYear();
  const numStr = String(Math.max(1, Math.floor(sequencia))).padStart(6, '0');
  return `${numStr}/${anoVigente}`;
}

export function parseProtocolo(protocolo?: string): { sequencia: number; ano: number } | null {
  if (!protocolo) return null;
  const str = protocolo.trim();

  // Caso padrão: 000001/2026 ou 67020/2026
  const matchPadrao = str.match(/(\d+)\/(\d{4})/);
  if (matchPadrao) {
    return {
      sequencia: parseInt(matchPadrao[1], 10),
      ano: parseInt(matchPadrao[2], 10)
    };
  }

  // Caso invertido: 2026/00101
  const matchInvertido = str.match(/(\d{4})\/(\d+)/);
  if (matchInvertido) {
    return {
      sequencia: parseInt(matchInvertido[2], 10),
      ano: parseInt(matchInvertido[1], 10)
    };
  }

  // Caso com prefixo: SOL-2026/1234 ou 1DOC-98421/2026
  const matchPrefixo = str.match(/(\d+)\/(\d{4})/);
  if (matchPrefixo) {
    return {
      sequencia: parseInt(matchPrefixo[1], 10),
      ano: parseInt(matchPrefixo[2], 10)
    };
  }

  return null;
}

/**
 * Normaliza um número de protocolo para garantir a regra:
 * Pelo menos 6 dígitos antes do ano (XXXXXX/AAAA).
 */
export function normalizarProtocolo(protocolo?: string): string {
  if (!protocolo) {
    return formatarNumeroProtocolo(1);
  }

  const parsed = parseProtocolo(protocolo);
  if (parsed) {
    return formatarNumeroProtocolo(parsed.sequencia, parsed.ano);
  }

  // Se não bater no regex, extrai apenas os números e usa o ano atual
  const numOnly = protocolo.replace(/\D/g, '');
  if (numOnly) {
    const seq = parseInt(numOnly.slice(-6), 10) || 1;
    return formatarNumeroProtocolo(seq);
  }

  return formatarNumeroProtocolo(1);
}

/**
 * Obtém o próximo número de protocolo para o ano em vigor,
 * consultando processos existentes e persistindo a sequência no localStorage.
 * Ao iniciar o ano novo, a sequência recomeça automaticamente em 000001 do ano em vigor.
 */
export function gerarProximoProtocolo(processosExistentes: ProcessoItem[] = []): string {
  const anoAtual = new Date().getFullYear();
  const storageKey = `visa_protocolo_seq_${anoAtual}`;

  // 1. Encontra a maior sequência já registrada para o ano atual nos processos existentes
  let maiorSeq = 0;
  for (const proc of processosExistentes) {
    const parsed = parseProtocolo(proc.num_processo) || parseProtocolo(proc.prot_1doc);
    if (parsed && parsed.ano === anoAtual) {
      if (parsed.sequencia > maiorSeq) {
        maiorSeq = parsed.sequencia;
      }
    }
  }

  // 2. Consulta o último valor salvo no localStorage para o ano em vigor
  let seqStorage = 0;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      seqStorage = parseInt(saved, 10) || 0;
    }
  } catch {}

  // 3. Incrementa sequencialmente
  const proximaSeq = Math.max(maiorSeq, seqStorage) + 1;

  // 4. Salva a nova sequência incrementada
  try {
    localStorage.setItem(storageKey, String(proximaSeq));
  } catch {}

  return formatarNumeroProtocolo(proximaSeq, anoAtual);
}
