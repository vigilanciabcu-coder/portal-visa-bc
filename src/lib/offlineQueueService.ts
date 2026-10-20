/**
 * Serviço de Gerenciamento de Fila Offline para Vistorias e Fiscalizações Sanitárias
 * Permite que fiscais em campo (garagens, câmaras frias, subsolos) salvem vistorias sem sinal,
 * sincronizando automaticamente com o banco de dados assim que a conexão 4G/5G/Wi-Fi for restabelecida.
 */

import { FiscalizacaoItem } from '../types';

const OFFLINE_QUEUE_KEY = 'visa_vistorias_offline_queue';

export interface VistoriaOfflineEntry {
  id: string;
  item: FiscalizacaoItem;
  timestamp: string;
  tentativas: number;
}

export function getOfflineQueue(): VistoriaOfflineEntry[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[OfflineQueue] Erro ao ler fila offline:', err);
    return [];
  }
}

export function saveToOfflineQueue(item: FiscalizacaoItem): VistoriaOfflineEntry {
  const queue = getOfflineQueue();
  const entry: VistoriaOfflineEntry = {
    id: item.id || `offline-${Date.now()}`,
    item,
    timestamp: new Date().toISOString(),
    tentativas: 0
  };

  const updatedQueue = [...queue.filter((q) => q.id !== entry.id), entry];
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
  } catch (err) {
    console.error('[OfflineQueue] Erro ao gravar item na fila offline:', err);
  }
  return entry;
}

export function removeFromOfflineQueue(id: string): void {
  const queue = getOfflineQueue();
  const updatedQueue = queue.filter((q) => q.id !== id);
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
  } catch (err) {
    console.error('[OfflineQueue] Erro ao remover item da fila offline:', err);
  }
}

export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch (err) {
    console.error('[OfflineQueue] Erro ao limpar fila offline:', err);
  }
}

/**
 * Hook ou helper para sincronizar todos os itens da fila offline
 */
export async function syncOfflineQueue(
  onSyncItem: (item: FiscalizacaoItem) => Promise<boolean> | boolean
): Promise<{ sincronizados: number; falhas: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { sincronizados: 0, falhas: 0 };
  }

  let sincronizados = 0;
  let falhas = 0;
  const remainingQueue: VistoriaOfflineEntry[] = [];

  for (const entry of queue) {
    try {
      const ok = await onSyncItem(entry.item);
      if (ok) {
        sincronizados++;
      } else {
        entry.tentativas += 1;
        remainingQueue.push(entry);
        falhas++;
      }
    } catch {
      entry.tentativas += 1;
      remainingQueue.push(entry);
      falhas++;
    }
  }

  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
  } catch {}

  return { sincronizados, falhas };
}
