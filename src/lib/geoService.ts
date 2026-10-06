import { ProcessoItem } from '../types';

export interface PontoGeografico {
  lat: number;
  lng: number;
  bairro?: string;
  aproximado?: boolean;
}

// Sede Oficial da Vigilância Sanitária de Balneário Camboriú (DVIS)
export const SEDE_VISA_BC = {
  nome: 'Sede Vigilância Sanitária (DVIS BC)',
  endereco: 'Avenida Palestina, nº 150 (esquina com Rua Suíça) - Bairro das Nações, Balneário Camboriú/SC',
  lat: -26.9754,
  lng: -48.6425
};

// Coordenadas centrais aproximadas dos bairros de Balneário Camboriú
export const COORDENADAS_BAIRROS_BC: Record<string, { lat: number; lng: number }> = {
  'CENTRO': { lat: -26.9925, lng: -48.6353 },
  'NAÇÕES': { lat: -26.9790, lng: -48.6420 },
  'PIONEIROS': { lat: -26.9740, lng: -48.6310 },
  'BARRA': { lat: -27.0180, lng: -48.6140 },
  'MUNICÍPIOS': { lat: -27.0010, lng: -48.6500 },
  'VILA REAL': { lat: -27.0090, lng: -48.6420 },
  'PRAIA DOS AMORES': { lat: -26.9580, lng: -48.6250 },
  'ARIRIBÁ': { lat: -26.9680, lng: -48.6360 },
  'ESTADOS': { lat: -26.9950, lng: -48.6440 },
  'NOVA ESPERANÇA': { lat: -27.0210, lng: -48.6350 },
  'SÃO JUDAS TADEU': { lat: -27.0240, lng: -48.6200 },
  'ESTALEIRO': { lat: -27.0390, lng: -48.5780 },
  'ESTALEIRINHO': { lat: -27.0580, lng: -48.5770 },
  'TAQUARAS': { lat: -27.0280, lng: -48.5830 },
  'LARANJEIRAS': { lat: -27.0100, lng: -48.5950 },
  'PRAIA BRAVA': { lat: -26.9450, lng: -48.6310 } // Limite Itajaí / BC
};

// Vias principais e pontos de referência de Balneário Camboriú
export const PONTOS_REFERENCIA_VIAS: Array<{ padrao: RegExp; lat: number; lng: number }> = [
  { padrao: /palestina/i, lat: -26.9754, lng: -48.6425 },
  { padrao: /su[ií][çc]a/i, lat: -26.9754, lng: -48.6425 },
  { padrao: /atl[aâ]ntica/i, lat: -26.9900, lng: -48.6295 },
  { padrao: /brasil/i, lat: -26.9910, lng: -48.6335 },
  { padrao: /3[aª]\s*avenida|terceira\s*avenida/i, lat: -26.9940, lng: -48.6390 },
  { padrao: /4[aª]\s*avenida|quarta\s*avenida/i, lat: -26.9935, lng: -48.6375 },
  { padrao: /estado|martin\s*luther/i, lat: -26.9780, lng: -48.6380 },
  { padrao: /santa\s*catarina/i, lat: -26.9960, lng: -48.6480 },
  { padrao: /rua\s*1500/i, lat: -26.9938, lng: -48.6360 },
  { padrao: /rua\s*1400/i, lat: -26.9928, lng: -48.6350 },
  { padrao: /rua\s*2500/i, lat: -27.0010, lng: -48.6340 },
  { padrao: /rua\s*3100/i, lat: -27.0060, lng: -48.6330 },
  { padrao: /rua\s*1001/i, lat: -26.9850, lng: -48.6340 },
  { padrao: /panor[aâ]mica|cristo\s*luz/i, lat: -26.9830, lng: -48.6470 },
  { padrao: /interpraias/i, lat: -27.0250, lng: -48.5900 },
  { padrao: /flores/i, lat: -26.9820, lng: -48.6410 },
  { padrao: /b[eé]lgica/i, lat: -26.9740, lng: -48.6430 },
  { padrao: /portugal/i, lat: -26.9760, lng: -48.6415 }
];

/**
 * Converte um texto ou número em hash determinístico para dispersão visual natural
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Obtém ou interpola coordenadas geográficas de um processo/estabelecimento
 */
export function getCoordenadasProcesso(processo: ProcessoItem): PontoGeografico {
  // 1. Se o processo já tem coordenadas explícitas salvas
  const procAny = processo as any;
  if (procAny.coordenadas?.lat && procAny.coordenadas?.lng) {
    return {
      lat: Number(procAny.coordenadas.lat),
      lng: Number(procAny.coordenadas.lng),
      aproximado: false
    };
  }
  if (procAny.latitude && procAny.longitude) {
    return {
      lat: Number(procAny.latitude),
      lng: Number(procAny.longitude),
      aproximado: false
    };
  }

  // 2. Tenta casar com vias e ruas conhecidas de Balneário Camboriú
  const enderecoCompleto = `${processo.endereco || ''} ${processo.numero_complemento || ''}`.toUpperCase();
  for (const via of PONTOS_REFERENCIA_VIAS) {
    if (via.padrao.test(enderecoCompleto)) {
      // Dispersão sutil determinística baseada no número ou ID do processo
      const numExtra = hashString(processo.num_processo || processo.id || enderecoCompleto) % 100;
      const offsetLat = ((numExtra % 10) - 5) * 0.0006;
      const offsetLng = (Math.floor(numExtra / 10) - 5) * 0.0006;
      return {
        lat: via.lat + offsetLat,
        lng: via.lng + offsetLng,
        bairro: processo.bairro,
        aproximado: true
      };
    }
  }

  // 3. Fallback por Bairro
  const bairroNorm = (processo.bairro || 'CENTRO')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  for (const [nomeBairro, coord] of Object.entries(COORDENADAS_BAIRROS_BC)) {
    const bairroChaveNorm = nomeBairro.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (bairroNorm.includes(bairroChaveNorm) || bairroChaveNorm.includes(bairroNorm)) {
      const seed = hashString(processo.num_processo || processo.razao_social || processo.id);
      const offsetLat = ((seed % 19) - 9) * 0.00045;
      const offsetLng = (((seed >> 3) % 19) - 9) * 0.00045;
      return {
        lat: coord.lat + offsetLat,
        lng: coord.lng + offsetLng,
        bairro: processo.bairro,
        aproximado: true
      };
    }
  }

  // 4. Fallback padrão: Centro de Balneário Camboriú
  const defaultCoord = COORDENADAS_BAIRROS_BC['CENTRO'];
  const seed = hashString(processo.id || processo.razao_social);
  const offsetLat = ((seed % 25) - 12) * 0.0005;
  const offsetLng = (((seed >> 4) % 25) - 12) * 0.0005;

  return {
    lat: defaultCoord.lat + offsetLat,
    lng: defaultCoord.lng + offsetLng,
    bairro: 'Centro',
    aproximado: true
  };
}

/**
 * Fórmula de Haversine para calcular distância real em km entre dois pontos geográficos
 */
export function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round((R * c) * 100) / 100;
}

export interface PontoRoteiro {
  id: string;
  processo: ProcessoItem;
  lat: number;
  lng: number;
  ordem?: number;
  distanciaDoAnteriorKm?: number;
  tempoEstimadoMinutos?: number;
}

/**
 * Algoritmo do Vizinho Mais Próximo (Nearest Neighbor) para otimização de rotas de fiscalização
 */
export function otimizarRoteiroFiscalizacao(
  itens: ProcessoItem[],
  pontoPartida: { lat: number; lng: number } = SEDE_VISA_BC
): { rotaOrdenada: PontoRoteiro[]; distanciaTotalKm: number; tempoTotalMinutos: number } {
  if (itens.length === 0) {
    return { rotaOrdenada: [], distanciaTotalKm: 0, tempoTotalMinutos: 0 };
  }

  const naoVisitados: PontoRoteiro[] = itens.map((proc) => {
    const coord = getCoordenadasProcesso(proc);
    return {
      id: proc.id,
      processo: proc,
      lat: coord.lat,
      lng: coord.lng
    };
  });

  const rota: PontoRoteiro[] = [];
  let pontoAtual = { lat: pontoPartida.lat, lng: pontoPartida.lng };
  let distanciaTotal = 0;

  while (naoVisitados.length > 0) {
    let menorDist = Infinity;
    let indexMaisProximo = 0;

    for (let i = 0; i < naoVisitados.length; i++) {
      const dist = calcularDistanciaKm(
        pontoAtual.lat,
        pontoAtual.lng,
        naoVisitados[i].lat,
        naoVisitados[i].lng
      );
      if (dist < menorDist) {
        menorDist = dist;
        indexMaisProximo = i;
      }
    }

    const proximo = naoVisitados.splice(indexMaisProximo, 1)[0];
    const distTrecho = menorDist === Infinity ? 0 : menorDist;
    // Estimativa urbana em Balneário Camboriú: velocidade média de 25 km/h + 3 min de semáforo/estacionamento
    const tempoTrechoMin = Math.round((distTrecho / 25) * 60) + 3;

    proximo.ordem = rota.length + 1;
    proximo.distanciaDoAnteriorKm = distTrecho;
    proximo.tempoEstimadoMinutos = tempoTrechoMin;

    distanciaTotal += distTrecho;
    pontoAtual = { lat: proximo.lat, lng: proximo.lng };
    rota.push(proximo);
  }

  // Estimativa de tempo total considerando 25 minutos médios por vistoria sanitária
  const tempoVistoriasMin = itens.length * 25;
  const tempoDeslocamentoMin = rota.reduce((acc, p) => acc + (p.tempoEstimadoMinutos || 0), 0);
  const tempoTotalMinutos = tempoDeslocamentoMin + tempoVistoriasMin;

  return {
    rotaOrdenada: rota,
    distanciaTotalKm: Math.round(distanciaTotal * 10) / 10,
    tempoTotalMinutos
  };
}

/**
 * Gera URL do Google Maps com múltiplos pontos para navegação GPS no carro/celular
 */
export function gerarUrlGoogleMapsRota(rota: PontoRoteiro[], origem: { lat: number; lng: number } = SEDE_VISA_BC): string {
  if (rota.length === 0) return '';
  if (rota.length === 1) {
    const destino = `${rota[0].lat},${rota[0].lng}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${origem.lat},${origem.lng}&destination=${destino}&travelmode=driving`;
  }

  const destinoFinal = `${rota[rota.length - 1].lat},${rota[rota.length - 1].lng}`;
  const waypoints = rota.slice(0, -1).map((p) => `${p.lat},${p.lng}`).join('|');

  return `https://www.google.com/maps/dir/?api=1&origin=${origem.lat},${origem.lng}&destination=${destinoFinal}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
}

/**
 * Gera URL de navegação individual direta (Waze ou Google Maps) para um estabelecimento
 */
export function gerarLinkNavegacaoIndividual(proc: ProcessoItem, app: 'google' | 'waze' = 'google'): string {
  const coord = getCoordenadasProcesso(proc);
  if (app === 'waze') {
    return `https://waze.com/ul?ll=${coord.lat},${coord.lng}&navigate=yes`;
  }
  const enderecoBusca = `${proc.endereco || ''}, ${proc.numero_complemento || ''}, ${proc.bairro || 'Centro'}, Balneário Camboriú - SC`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoBusca)}`;
}
