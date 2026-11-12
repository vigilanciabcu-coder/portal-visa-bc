import { TipoPragaCcpu } from '../types';
import { COORDENADAS_BAIRROS_BC } from '../lib/geoService';

export interface AnimalCcpuConfig {
  id: TipoPragaCcpu;
  nome: string;
  icon: string;
  cor: string;
  borda: string;
  bgAtivo: string;
  badgeBg: string;
  metodoPadrao: string;
  descricaoGenerica: string;
}

export const ANIMAIS_CCPU_CONFIG: AnimalCcpuConfig[] = [
  {
    id: 'ARANHA',
    nome: 'Aranha',
    icon: '🕷️',
    cor: 'text-stone-700 dark:text-stone-300',
    borda: 'border-stone-500',
    bgAtivo: 'bg-stone-500/10 border-stone-500 text-stone-900 dark:text-stone-200',
    badgeBg: 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border-stone-300 dark:border-stone-700',
    metodoPadrao: 'Captura manual com frasco hermético, aplicação de barreira mecânica e orientação sanitária',
    descricaoGenerica: 'Aranha'
  },
  {
    id: 'AVE',
    nome: 'Ave',
    icon: '🦅',
    cor: 'text-emerald-600 dark:text-emerald-400',
    borda: 'border-emerald-500',
    bgAtivo: 'bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-200',
    badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    metodoPadrao: 'Manejo ambiental, remoção de ninhos inativos, barreiras físicas e orientação contra ceva',
    descricaoGenerica: 'Ave'
  },
  {
    id: 'BOVINO',
    nome: 'Bovino',
    icon: '🐂',
    cor: 'text-amber-800 dark:text-amber-300',
    borda: 'border-amber-700',
    bgAtivo: 'bg-amber-700/10 border-amber-700 text-amber-950 dark:text-amber-200',
    badgeBg: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    metodoPadrao: 'Vistoria sanitária de grande porte, verificação de cercamento, condições sanitárias e bem-estar',
    descricaoGenerica: 'Bovino'
  },
  {
    id: 'CAO',
    nome: 'Cão',
    icon: '🐕',
    cor: 'text-amber-600 dark:text-amber-400',
    borda: 'border-amber-500',
    bgAtivo: 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200',
    badgeBg: 'bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-200 dark:border-amber-800',
    metodoPadrao: 'Avaliação clínica veterinária, verificação de vacinação antirrábica e orientação de guarda responsável',
    descricaoGenerica: 'Cão'
  },
  {
    id: 'CARAMUJO_AFRICANO',
    nome: 'Caramujo Africano',
    icon: '🐌',
    cor: 'text-teal-600 dark:text-teal-400',
    borda: 'border-teal-500',
    bgAtivo: 'bg-teal-500/10 border-teal-500 text-teal-900 dark:text-teal-200',
    badgeBg: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300 dark:border-teal-800',
    metodoPadrao: 'Cata manual com luvas descartáveis e descarte sanitário com cal virgem/hipoclorito',
    descricaoGenerica: 'Caramujo Africano'
  },
  {
    id: 'CARRAPATO',
    nome: 'Carrapato',
    icon: '🪲',
    cor: 'text-red-700 dark:text-red-400',
    borda: 'border-red-600',
    bgAtivo: 'bg-red-600/10 border-red-600 text-red-950 dark:text-red-200',
    badgeBg: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300 dark:border-red-800',
    metodoPadrao: 'Vistoria ambiental, aplicação de carrapaticida registrado e orientação sobre hospedeiros',
    descricaoGenerica: 'Carrapato'
  },
  {
    id: 'EQUINO',
    nome: 'Equino',
    icon: '🐎',
    cor: 'text-yellow-800 dark:text-yellow-400',
    borda: 'border-yellow-700',
    bgAtivo: 'bg-yellow-700/10 border-yellow-700 text-yellow-950 dark:text-yellow-200',
    badgeBg: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950/60 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800',
    metodoPadrao: 'Fiscalização de equídeos em vias urbanas, verificação de mormo/anemia e notificação de contenção',
    descricaoGenerica: 'Equino'
  },
  {
    id: 'ESCORPIAO',
    nome: 'Escorpião',
    icon: '🦂',
    cor: 'text-amber-500 dark:text-amber-400',
    borda: 'border-amber-500',
    bgAtivo: 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-300',
    badgeBg: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    metodoPadrao: 'Busca ativa noturna com lanterna ultravioleta (UV), pinça entomológica e vedação mecânica de grelhas',
    descricaoGenerica: 'Escorpião'
  },
  {
    id: 'FELINO',
    nome: 'Felino',
    icon: '🐈',
    cor: 'text-purple-600 dark:text-purple-400',
    borda: 'border-purple-500',
    bgAtivo: 'bg-purple-500/10 border-purple-500 text-purple-900 dark:text-purple-200',
    badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    metodoPadrao: 'Avaliação veterinária de zoonoses (esporotricose/raiva), isolamento protetivo e termo de guarda responsável',
    descricaoGenerica: 'Felino'
  },
  {
    id: 'FORMIGA',
    nome: 'Formiga',
    icon: '🐜',
    cor: 'text-orange-500 dark:text-orange-400',
    borda: 'border-orange-500',
    bgAtivo: 'bg-orange-500/10 border-orange-500 text-orange-900 dark:text-orange-300',
    badgeBg: 'bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300 dark:border-orange-800',
    metodoPadrao: 'Mapeamento de formigueiros com aplicação de iscas formicidas em gel e granuladas atrativas',
    descricaoGenerica: 'Formiga'
  },
  {
    id: 'LAGARTA',
    nome: 'Lagarta',
    icon: '🐛',
    cor: 'text-lime-600 dark:text-lime-400',
    borda: 'border-lime-500',
    bgAtivo: 'bg-lime-500/10 border-lime-500 text-lime-900 dark:text-lime-200',
    badgeBg: 'bg-lime-100 text-lime-900 dark:bg-lime-950/60 dark:text-lime-300 border-lime-300 dark:border-lime-800',
    metodoPadrao: 'Inspeção de troncos e folhagens, alerta de risco urticante e poda orientada',
    descricaoGenerica: 'Lagarta'
  },
  {
    id: 'MORCEGO',
    nome: 'Morcego',
    icon: '🦇',
    cor: 'text-indigo-600 dark:text-indigo-400',
    borda: 'border-indigo-500',
    bgAtivo: 'bg-indigo-500/10 border-indigo-500 text-indigo-900 dark:text-indigo-200',
    badgeBg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    metodoPadrao: 'Inspeção de sótãos/forros, manejo por exclusão mecânica após a revoada e vedação de aberturas',
    descricaoGenerica: 'Morcego'
  },
  {
    id: 'MOSQUITO',
    nome: 'Mosquito',
    icon: '🦟',
    cor: 'text-cyan-600 dark:text-cyan-400',
    borda: 'border-cyan-500',
    bgAtivo: 'bg-cyan-500/10 border-cyan-500 text-cyan-900 dark:text-cyan-200',
    badgeBg: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800',
    metodoPadrao: 'Pesquisa larvária, eliminação mecânica de criadouros e aplicação de larvicida biológico (BTI)',
    descricaoGenerica: 'Mosquito'
  },
  {
    id: 'POMBO',
    nome: 'Pombo',
    icon: '🕊️',
    cor: 'text-sky-500 dark:text-sky-400',
    borda: 'border-sky-500',
    bgAtivo: 'bg-sky-500/10 border-sky-500 text-sky-900 dark:text-sky-300',
    badgeBg: 'bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300 dark:border-sky-800',
    metodoPadrao: 'Manejo ambiental, remoção de ninhos inativos, barreiras físicas (telas/molas) e orientação contra ceva',
    descricaoGenerica: 'Pombo'
  },
  {
    id: 'ROEDOR',
    nome: 'Roedor',
    icon: '🐀',
    cor: 'text-rose-500 dark:text-rose-400',
    borda: 'border-rose-500',
    bgAtivo: 'bg-rose-500/10 border-rose-500 text-rose-900 dark:text-rose-300',
    badgeBg: 'bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    metodoPadrao: 'Instalação de caixas porta-iscas com raticida parafinado anticoagulante lacrado e vedação de tocas',
    descricaoGenerica: 'Roedor'
  },
  {
    id: 'SUINO',
    nome: 'Suíno',
    icon: '🐖',
    cor: 'text-pink-600 dark:text-pink-400',
    borda: 'border-pink-500',
    bgAtivo: 'bg-pink-500/10 border-pink-500 text-pink-900 dark:text-pink-200',
    badgeBg: 'bg-pink-100 text-pink-900 dark:bg-pink-950/60 dark:text-pink-300 border-pink-300 dark:border-pink-800',
    metodoPadrao: 'Vistoria sanitária de criação de suínos em perímetro urbano proibido e notificação',
    descricaoGenerica: 'Suíno'
  },
  {
    id: 'OUTROS',
    nome: 'Outros',
    icon: '🐾',
    cor: 'text-slate-600 dark:text-slate-400',
    borda: 'border-slate-500',
    bgAtivo: 'bg-slate-500/10 border-slate-500 text-slate-900 dark:text-slate-200',
    badgeBg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
    metodoPadrao: 'Inspeção e controle sanitário conforme o vetor ou animal identificado',
    descricaoGenerica: 'Outros Animais / Sinantrópicos'
  }
];

export function getAnimalInfo(tipo: string): AnimalCcpuConfig {
  const norm = (tipo || '').toUpperCase().trim();
  // Mapeamentos de compatibilidade
  if (norm === 'RATO') return ANIMAIS_CCPU_CONFIG.find((a) => a.id === 'ROEDOR')!;
  if (norm === 'BARATA') return ANIMAIS_CCPU_CONFIG.find((a) => a.id === 'OUTROS')!;
  if (norm === 'ESPOROTRICOSE') return ANIMAIS_CCPU_CONFIG.find((a) => a.id === 'FELINO')!;
  if (norm === 'OUTRO') return ANIMAIS_CCPU_CONFIG.find((a) => a.id === 'OUTROS')!;

  const found = ANIMAIS_CCPU_CONFIG.find((a) => a.id === norm);
  if (found) return found;

  return {
    id: 'OUTROS',
    nome: tipo || 'Outros',
    icon: '🐾',
    cor: 'text-slate-600 dark:text-slate-400',
    borda: 'border-slate-500',
    bgAtivo: 'bg-slate-500/10 border-slate-500 text-slate-900 dark:text-slate-200',
    badgeBg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
    metodoPadrao: 'Inspeção e controle sanitário conforme o vetor ou animal identificado',
    descricaoGenerica: tipo || 'Outros'
  };
}

/**
 * Lista oficial de Bairros de Balneário Camboriú em Ordem Alfabética (A-Z)
 */
export const BAIRROS_BC_ALFABETICO = Object.keys(COORDENADAS_BAIRROS_BC).sort((a, b) =>
  a.localeCompare(b, 'pt-BR')
);
