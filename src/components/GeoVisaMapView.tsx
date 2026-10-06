import React, { useState, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  Compass,
  Layers,
  Search,
  Filter,
  Users,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Printer,
  Share2,
  Trash2,
  ChevronRight,
  ChevronLeft,
  X,
  ExternalLink,
  Car,
  FileSignature,
  FileText,
  Building2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Maximize2
} from 'lucide-react';
import { ProcessoItem, UserProfile } from '../types';
import {
  SEDE_VISA_BC,
  COORDENADAS_BAIRROS_BC,
  PONTOS_REFERENCIA_VIAS,
  getCoordenadasProcesso,
  otimizarRoteiroFiscalizacao,
  gerarUrlGoogleMapsRota,
  gerarLinkNavegacaoIndividual,
  PontoRoteiro
} from '../lib/geoService';
import { ProcessoDetalhesParecerModal } from './ProcessoDetalhesParecerModal';
import { ProcessoTimelineModal } from './ProcessoTimelineModal';
import { DocumentoOficialPdfModal } from './DocumentoOficialPdfModal';

interface GeoVisaMapViewProps {
  processos: ProcessoItem[];
  users: UserProfile[];
  currentUser: UserProfile | null;
  onSaveProcesso: (updated: ProcessoItem) => void;
  onNavigateHome?: () => void;
  onIniciarVistoria?: (processo: ProcessoItem) => void;
}

export const GeoVisaMapView: React.FC<GeoVisaMapViewProps> = ({
  processos,
  users,
  currentUser,
  onSaveProcesso,
  onNavigateHome,
  onIniciarVistoria
}) => {
  // Referências DOM para o mapa Leaflet
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  // Estados de Filtros
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroBairro, setFiltroBairro] = useState('TODOS');
  const [filtroFiscal, setFiltroFiscal] = useState('TODOS');
  const [filtroRisco, setFiltroRisco] = useState('TODOS');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [estiloMapa, setEstiloMapa] = useState<'ruas' | 'escuro' | 'relevo'>('ruas');

  // Estados do Roteirizador Diário
  const [itensRoteiro, setItensRoteiro] = useState<ProcessoItem[]>([]);
  const [painelRoteiroAberto, setPainelRoteiroAberto] = useState(false);
  const [rotaOtimizada, setRotaOtimizada] = useState<{
    rotaOrdenada: PontoRoteiro[];
    distanciaTotalKm: number;
    tempoTotalMinutos: number;
  } | null>(null);
  const [pontoPartidaTipo, setPontoPartidaTipo] = useState<'SEDE' | 'GPS'>('SEDE');
  const [gpsUsuario, setGpsUsuario] = useState<{ lat: number; lng: number } | null>(null);

  // Modais integrados
  const [modalDetalhesProc, setModalDetalhesProc] = useState<ProcessoItem | null>(null);
  const [modalTimelineProc, setModalTimelineProc] = useState<ProcessoItem | null>(null);
  const [modalPdfProc, setModalPdfProc] = useState<ProcessoItem | null>(null);

  // Estabelecimento selecionado para painel rápido
  const [processoSelecionado, setProcessoSelecionado] = useState<ProcessoItem | null>(null);

  // Fiscais disponíveis para filtro
  const fiscaisLista = useMemo(() => {
    return users.filter((u) => {
      const cargo = (u.cargo || '').toUpperCase();
      const nivel = (u.nivel_acesso || '').toUpperCase();
      return cargo.includes('FISCAL') || cargo.includes('AUDITOR') || nivel.includes('FISCAL');
    });
  }, [users]);

  // Lista de Bairros distintos presentes nos processos
  const bairrosDisponiveis = useMemo(() => {
    const setBairros = new Set<string>();
    processos.forEach((p) => {
      if (p.bairro && p.bairro.trim()) {
        setBairros.add(p.bairro.trim());
      }
    });
    // Adiciona bairros conhecidos de BC
    Object.keys(COORDENADAS_BAIRROS_BC).forEach((b) => setBairros.add(b));
    return Array.from(setBairros).sort();
  }, [processos]);

  // Função de normalização para busca sem acentos e minúsculas
  const normalizeText = (val: string) =>
    (val || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  // Filtragem abrangente dos processos (razão, fantasia, processo, cnpj, rua, bairro, fiscal, atividade)
  const processosFiltrados = useMemo(() => {
    return processos.filter((p) => {
      // 1. Filtro de Texto
      if (filtroTexto.trim()) {
        const qNorm = normalizeText(filtroTexto);
        const match =
          normalizeText(p.razao_social).includes(qNorm) ||
          normalizeText(p.nome_fantasia).includes(qNorm) ||
          normalizeText(p.num_processo).includes(qNorm) ||
          normalizeText(p.cnpj_cpf).includes(qNorm) ||
          (p.cnpj_cpf || '').replace(/\D/g, '').includes(qNorm.replace(/\D/g, '')) ||
          normalizeText(p.endereco).includes(qNorm) ||
          normalizeText(p.numero_complemento).includes(qNorm) ||
          normalizeText(p.bairro).includes(qNorm) ||
          normalizeText(p.fiscal_responsavel).includes(qNorm) ||
          normalizeText(p.atividade_principal).includes(qNorm) ||
          normalizeText(p.assunto).includes(qNorm);

        if (!match) return false;
      }

      // 2. Filtro de Bairro
      if (filtroBairro !== 'TODOS') {
        const bProc = normalizeText(p.bairro);
        const bFiltro = normalizeText(filtroBairro);
        if (!bProc.includes(bFiltro) && !bFiltro.includes(bProc)) return false;
      }

      // 3. Filtro de Fiscal
      if (filtroFiscal !== 'TODOS') {
        if (filtroFiscal === 'MINHAS_DEMANDAS') {
          if (!currentUser?.nome_completo) return false;
          const meuNome = normalizeText(currentUser.nome_completo);
          if (!normalizeText(p.fiscal_responsavel).includes(meuNome)) return false;
        } else {
          if (!normalizeText(p.fiscal_responsavel).includes(normalizeText(filtroFiscal))) {
            return false;
          }
        }
      }

      // 4. Filtro de Risco
      if (filtroRisco !== 'TODOS') {
        const riscoProc = (p.grau_risco || '').toUpperCase();
        if (filtroRisco === 'ALTO' && !riscoProc.includes('ALTO')) return false;
        if (filtroRisco === 'MEDIO' && !riscoProc.includes('MÉDIO') && !riscoProc.includes('MEDIO')) return false;
        if (filtroRisco === 'BAIXO' && !riscoProc.includes('BAIXO')) return false;
      }

      // 5. Filtro de Status
      if (filtroStatus !== 'TODOS') {
        const st = (p.status || '').toUpperCase();
        if (filtroStatus === 'PENDENTE' && (st.includes('CONCLU') || st.includes('DEFER'))) return false;
        if (filtroStatus === 'NOTIFICADO' && !st.includes('NOTIF') && !st.includes('EXIG')) return false;
        if (filtroStatus === 'DEFERIDO' && !st.includes('DEFER') && !st.includes('CONCLU')) return false;
      }

      return true;
    });
  }, [processos, filtroTexto, filtroBairro, filtroFiscal, filtroRisco, filtroStatus, currentUser]);

  // Executa centralização e navegação no mapa baseada no termo pesquisado
  const executarBuscaNoMapa = (termo: string) => {
    if (!termo.trim() || !mapInstanceRef.current) return;
    const qNorm = normalizeText(termo);

    // 1. Processos correspondentes
    const correspondentes = processos.filter((p) => {
      return (
        normalizeText(p.razao_social).includes(qNorm) ||
        normalizeText(p.nome_fantasia).includes(qNorm) ||
        normalizeText(p.num_processo).includes(qNorm) ||
        normalizeText(p.cnpj_cpf).includes(qNorm) ||
        (p.cnpj_cpf || '').replace(/\D/g, '').includes(qNorm.replace(/\D/g, '')) ||
        normalizeText(p.endereco).includes(qNorm) ||
        normalizeText(p.numero_complemento).includes(qNorm) ||
        normalizeText(p.bairro).includes(qNorm) ||
        normalizeText(p.fiscal_responsavel).includes(qNorm) ||
        normalizeText(p.atividade_principal).includes(qNorm) ||
        normalizeText(p.assunto).includes(qNorm)
      );
    });

    if (correspondentes.length > 0) {
      if (correspondentes.length === 1) {
        const unico = correspondentes[0];
        const coord = getCoordenadasProcesso(unico);
        mapInstanceRef.current.flyTo([coord.lat, coord.lng], 17, { duration: 1.2 });
        setProcessoSelecionado(unico);
      } else {
        const bounds = L.latLngBounds(
          correspondentes.map((p) => {
            const c = getCoordenadasProcesso(p);
            return [c.lat, c.lng] as [number, number];
          })
        );
        mapInstanceRef.current.fitBounds(bounds.pad(0.15), { maxZoom: 17 });
      }
      return;
    }

    // 2. Se for uma via ou ponto de referência conhecido em Balneário Camboriú
    for (const via of PONTOS_REFERENCIA_VIAS) {
      if (via.padrao.test(termo) || via.padrao.test(qNorm)) {
        mapInstanceRef.current.flyTo([via.lat, via.lng], 16, { duration: 1.2 });
        return;
      }
    }

    // 3. Se for um bairro conhecido de BC
    for (const [bairroNome, coord] of Object.entries(COORDENADAS_BAIRROS_BC)) {
      if (normalizeText(bairroNome).includes(qNorm) || qNorm.includes(normalizeText(bairroNome))) {
        mapInstanceRef.current.flyTo([coord.lat, coord.lng], 15, { duration: 1.2 });
        setFiltroBairro(bairroNome);
        return;
      }
    }

    // 4. Se for a sede / vigilância sanitária
    if (qNorm.includes('sede') || qNorm.includes('vigilancia') || qNorm.includes('dvis') || qNorm.includes('palestina') || qNorm.includes('suica')) {
      mapInstanceRef.current.flyTo([SEDE_VISA_BC.lat, SEDE_VISA_BC.lng], 17, { duration: 1.2 });
    }
  };

  // Debounce para focar automaticamente no mapa durante a digitação
  useEffect(() => {
    if (!filtroTexto.trim() || filtroTexto.trim().length < 3) return;
    const timer = setTimeout(() => {
      executarBuscaNoMapa(filtroTexto);
    }, 500);
    return () => clearTimeout(timer);
  }, [filtroTexto]);

  // Captura localização atual do fiscal via GPS (se permitido)
  const obterGpsAtual = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setGpsUsuario(coord);
          setPontoPartidaTipo('GPS');
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([coord.lat, coord.lng], 16);
          }
        },
        () => {
          alert('Não foi possível obter sua localização GPS. Usando a Sede da VISA como partida.');
          setPontoPartidaTipo('SEDE');
        }
      );
    }
  };

  // Inicialização do Mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Evita recriação

    // Ponto Central: Balneário Camboriú
    const map = L.map(mapContainerRef.current, {
      center: [-26.9925, -48.6353],
      zoom: 14,
      zoomControl: false
    });

    // Controle de Zoom estilizado no topo direito
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Camada de Tiles padrão (OpenStreetMap 100% gratuita, sem necessidade de API Key)
    const tileLayer = L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; VISA Balneário Camboriú',
        maxZoom: 19
      }
    ).addTo(map);

    (map as any)._customTileLayer = tileLayer;

    // Grupo de Marcadores e Camada de Rotas
    markersLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Recalcula dimensões do mapa imediatamente e em redimensionamento
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Altera estilo do mapa (OpenStreetMap e OpenTopoMap são 100% livres de chaves de API)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current as any;
    if (map._customTileLayer) {
      map.removeLayer(map._customTileLayer);
    }

    const tilePane = map.getPanes?.()?.tilePane;

    let url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attr = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; VISA BC';
    let maxZoom = 19;
    let subdomains = 'abc';

    if (estiloMapa === 'relevo') {
      url = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      attr = 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>, SRTM | &copy; <a href="https://opentopomap.org" target="_blank">OpenTopoMap</a>';
      maxZoom = 17;
      subdomains = 'abc';
      if (tilePane) tilePane.style.filter = 'none';
    } else if (estiloMapa === 'escuro') {
      url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      attr = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; VISA BC';
      maxZoom = 19;
      subdomains = 'abc';
      if (tilePane) {
        tilePane.style.filter = 'brightness(0.7) invert(1) contrast(1.8) hue-rotate(200deg) saturate(0.35)';
      }
    } else {
      // Padrão Ruas (OpenStreetMap Oficial)
      url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      attr = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; VISA BC';
      maxZoom = 19;
      subdomains = 'abc';
      if (tilePane) tilePane.style.filter = 'none';
    }

    const newLayer = L.tileLayer(url, { attribution: attr, maxZoom, subdomains }).addTo(map);
    map._customTileLayer = newLayer;
  }, [estiloMapa]);

  // Atualização dos Marcadores no Mapa com base nos filtros
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    // 1. Marcador Oficial da Sede da Vigilância Sanitária
    const sedeIcon = L.divIcon({
      className: 'custom-sede-marker',
      html: `
        <div style="background: linear-gradient(135deg, #0284c7, #0369a1); border: 2px solid #bae6fd; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(2, 132, 199, 0.7); cursor: pointer;">
          <span style="font-size: 16px;">🏛️</span>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const sedeMarker = L.marker([SEDE_VISA_BC.lat, SEDE_VISA_BC.lng], { icon: sedeIcon })
      .bindPopup(`
        <div style="font-family: sans-serif; min-width: 220px; color: #1e293b;">
          <strong style="color: #0369a1; font-size: 13px;">🏛️ SEDE DVIS - BALNEÁRIO CAMBORIÚ</strong>
          <p style="margin: 4px 0; font-size: 11px; color: #64748b;">${SEDE_VISA_BC.endereco}</p>
          <div style="margin-top: 6px; padding: 4px 8px; background: #e0f2fe; border-radius: 6px; font-size: 10px; font-weight: bold; color: #0284c7;">
            Ponto de Partida Oficial de Rotas Sanitárias
          </div>
        </div>
      `);
    layer.addLayer(sedeMarker);

    // 2. Marcador de GPS do Usuário (se ativo)
    if (gpsUsuario) {
      const gpsIcon = L.divIcon({
        className: 'custom-gps-marker',
        html: `
          <div style="background: #10b981; border: 3px solid #ffffff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(16, 185, 129, 0.8); animation: pulse 2s infinite;">
            <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%;"></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const gpsMarker = L.marker([gpsUsuario.lat, gpsUsuario.lng], { icon: gpsIcon })
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 11px;">
            <strong style="color: #10b981;">📍 Sua Posição Atual (GPS)</strong>
          </div>
        `);
      layer.addLayer(gpsMarker);
    }

    // 3. Marcadores dos Processos e Estabelecimentos
    processosFiltrados.forEach((proc) => {
      const coord = getCoordenadasProcesso(proc);
      const risco = (proc.grau_risco || '').toUpperCase();
      const status = (proc.status || '').toUpperCase();
      const isHabiteSe = (proc.setor || '').toUpperCase().includes('HABITE') || (proc.assunto || '').toUpperCase().includes('HABITE');

      // Determinação de cor e ícone por risco e tipo
      let corBg = '#f59e0b'; // Médio risco (amarelo)
      let iconeChar = '🍲';

      if (isHabiteSe) {
        corBg = '#3b82f6'; // Habite-se (azul)
        iconeChar = '🏗️';
      } else if (risco.includes('ALTO') || status.includes('NOTIF') || status.includes('AUTO')) {
        corBg = '#ef4444'; // Alto risco ou notificado (vermelho)
        iconeChar = '⚠️';
      } else if (risco.includes('BAIXO') || status.includes('DEFER') || status.includes('CONCLU')) {
        corBg = '#10b981'; // Baixo risco ou concluído (verde)
        iconeChar = '✅';
      }

      // Se o item já está no roteiro do dia, ganha destaque especial
      const estaNoRoteiro = itensRoteiro.some((r) => r.id === proc.id);
      const bordaEstilo = estaNoRoteiro ? '3px solid #facc15' : '2px solid rgba(255,255,255,0.8)';
      const escala = estaNoRoteiro ? 'transform: scale(1.15);' : '';

      const markerHtml = `
        <div style="background: ${corBg}; border: ${bordaEstilo}; ${escala} width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5); cursor: pointer; transition: all 0.2s;">
          <span style="transform: rotate(45deg); font-size: 13px;">${iconeChar}</span>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-visa-marker',
        html: markerHtml,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -32]
      });

      const marker = L.marker([coord.lat, coord.lng], { icon: customIcon });

      // Ao clicar no marcador, abre o painel rápido
      marker.on('click', () => {
        setProcessoSelecionado(proc);
      });

      layer.addLayer(marker);
    });
  }, [processosFiltrados, itensRoteiro, gpsUsuario]);

  // Desenho da Rota Otimizada no Mapa
  useEffect(() => {
    if (!mapInstanceRef.current || !routeLayerRef.current) return;
    const layer = routeLayerRef.current;
    layer.clearLayers();

    if (!rotaOtimizada || rotaOtimizada.rotaOrdenada.length === 0) return;

    const pontoOrigem = pontoPartidaTipo === 'GPS' && gpsUsuario ? gpsUsuario : SEDE_VISA_BC;
    const latlngs: L.LatLngExpression[] = [[pontoOrigem.lat, pontoOrigem.lng]];

    rotaOtimizada.rotaOrdenada.forEach((ponto, index) => {
      latlngs.push([ponto.lat, ponto.lng]);

      // Marcador com número da parada (1, 2, 3...)
      const numIcon = L.divIcon({
        className: 'custom-route-step',
        html: `
          <div style="background: #3b82f6; color: white; border: 2px solid #ffffff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12px; box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);">
            ${index + 1}
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const stepMarker = L.marker([ponto.lat, ponto.lng], { icon: numIcon })
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; min-width: 180px;">
            <strong style="color: #2563eb;">Parada ${index + 1} da Rota</strong><br />
            <strong>${ponto.processo.nome_fantasia || ponto.processo.razao_social}</strong><br />
            <span style="color: #64748b;">${ponto.processo.endereco || ''}, ${ponto.processo.bairro || ''}</span>
          </div>
        `);
      layer.addLayer(stepMarker);
    });

    // Linha azul conectando todas as paradas
    const polyline = L.polyline(latlngs, {
      color: '#38bdf8',
      weight: 4,
      opacity: 0.85,
      dashArray: '8, 8',
      lineCap: 'round'
    });

    layer.addLayer(polyline);

    // Ajusta o zoom para enquadrar a rota inteira
    mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
  }, [rotaOtimizada, pontoPartidaTipo, gpsUsuario]);

  // Ação: Adicionar ou remover processo do roteiro do dia
  const alternarItemNoRoteiro = (proc: ProcessoItem) => {
    setItensRoteiro((prev) => {
      const existe = prev.some((p) => p.id === proc.id);
      let novo: ProcessoItem[];
      if (existe) {
        novo = prev.filter((p) => p.id !== proc.id);
      } else {
        novo = [...prev, proc];
      }
      return novo;
    });
    // Se o painel não estiver aberto, abre para visualização imediata
    setPainelRoteiroAberto(true);
  };

  // Ação: Calcular / Otimizar Roteiro
  const handleExecutarOtimizacao = () => {
    if (itensRoteiro.length === 0) {
      alert('Selecione ao menos 1 estabelecimento no mapa para traçar o roteiro de fiscalização.');
      return;
    }
    const pontoOrigem = pontoPartidaTipo === 'GPS' && gpsUsuario ? gpsUsuario : SEDE_VISA_BC;
    const resultado = otimizarRoteiroFiscalizacao(itensRoteiro, pontoOrigem);
    setRotaOtimizada(resultado);
  };

  // Recalcula rota automaticamente quando a lista muda
  useEffect(() => {
    if (itensRoteiro.length > 0) {
      const pontoOrigem = pontoPartidaTipo === 'GPS' && gpsUsuario ? gpsUsuario : SEDE_VISA_BC;
      const resultado = otimizarRoteiroFiscalizacao(itensRoteiro, pontoOrigem);
      setRotaOtimizada(resultado);
    } else {
      setRotaOtimizada(null);
    }
  }, [itensRoteiro, pontoPartidaTipo, gpsUsuario]);

  // Compartilhar roteiro via WhatsApp
  const handleCompartilharWhatsApp = () => {
    if (!rotaOtimizada || rotaOtimizada.rotaOrdenada.length === 0) return;

    let texto = `*📋 ROTEIRO DIÁRIO DE VISTORIAS - VISA BALNEÁRIO CAMBORIÚ*\n`;
    texto += `📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
    texto += `🚗 Distância total estimada: ${rotaOtimizada.distanciaTotalKm} km\n`;
    texto += `⏳ Tempo total previsto: ~${rotaOtimizada.tempoTotalMinutos} min\n\n`;
    texto += `*PARADAS PROGRAMADAS:*\n`;

    rotaOtimizada.rotaOrdenada.forEach((p, idx) => {
      texto += `\n*${idx + 1}ª Parada:* ${p.processo.nome_fantasia || p.processo.razao_social}\n`;
      texto += `📍 ${p.processo.endereco || 'Endereço'}, ${p.processo.bairro || 'Centro'}\n`;
      texto += `📄 Proc: ${p.processo.num_processo || 'S/N'}\n`;
    });

    const urlMaps = gerarUrlGoogleMapsRota(
      rotaOtimizada.rotaOrdenada,
      pontoPartidaTipo === 'GPS' && gpsUsuario ? gpsUsuario : SEDE_VISA_BC
    );
    texto += `\n🌐 *Navegação GPS Google Maps:*\n${urlMaps}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
  };

  // Foco no mapa para um processo específico
  const focarNoProcesso = (proc: ProcessoItem) => {
    const coord = getCoordenadasProcesso(proc);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([coord.lat, coord.lng], 17, { duration: 1.2 });
    }
    setProcessoSelecionado(proc);
  };

  return (
    <div className="relative w-full h-full min-h-0 flex-1 bg-slate-950 overflow-hidden flex flex-col font-sans select-none">
      
      {/* 🧭 BARRA SUPERIOR DE COMANDOS & FILTROS GEOGRÁFICOS (COMPACTA PARA MAXIMIZAR ESPAÇO DO MAPA) */}
      <div className="z-30 bg-[#0f1422]/95 backdrop-blur-md border-b border-slate-800 py-1.5 px-2 sm:px-3 flex items-center justify-between gap-1.5 sm:gap-2.5 shadow-xl shrink-0">
        
        {/* Lado Esquerdo: Identificação & Voltar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold transition flex items-center gap-1 border border-slate-700 cursor-pointer shadow-sm"
              title="Voltar ao início"
            >
              ← Início
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  GEO VISA BC
                </h1>
                <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-blue-900/60 text-blue-300 border border-blue-500/30">
                  MAPA & ROTAS
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Centro: Filtros Rápidos em Linha Lateral (+100px por select com rótulo permanente e estética preservada) */}
        <div className="flex items-center gap-1.5 flex-nowrap shrink-0 overflow-x-auto py-0.5 max-w-[88vw] no-scrollbar">
          
          {/* Busca por texto ativa no mapa (+50px maior, navega ao teclar Enter ou clicar na lupa) */}
          <div className="relative w-40 sm:w-56 shrink-0">
            <button
              type="button"
              onClick={() => executarBuscaNoMapa(filtroTexto)}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400 transition cursor-pointer"
              title="Pesquisar e focar no mapa (Enter)"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <input
              type="text"
              placeholder="Buscar no mapa (Enter)..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  executarBuscaNoMapa(filtroTexto);
                }
              }}
              className="w-full pl-7 pr-6 h-7 bg-slate-900 border border-slate-700/80 rounded-lg text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition shadow-inner"
            />
            {filtroTexto && (
              <button
                type="button"
                onClick={() => {
                  setFiltroTexto('');
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo([-26.9925, -48.6353], 14, { duration: 1 });
                  }
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Grupo Lateral dos 3 Campos (Bairros, Fiscais, Riscos) - Aumentados em 100px cada um */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap shrink-0">
            {/* 1. FILTRO DE BAIRRO (+100px: 250px / 270px) */}
            <div
              className={`h-7 w-[250px] sm:w-[270px] flex items-center gap-1.5 px-2.5 rounded-lg border text-[11px] transition shrink-0 ${
                filtroBairro !== 'TODOS'
                  ? 'bg-blue-950/60 border-blue-500/80 text-blue-200 ring-1 ring-blue-500/30'
                  : 'bg-slate-900 border-slate-700/80 text-slate-200 hover:border-slate-600'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
                Bairro:
              </span>
              <select
                value={filtroBairro}
                onChange={(e) => {
                  const b = e.target.value;
                  setFiltroBairro(b);
                  if (b !== 'TODOS' && COORDENADAS_BAIRROS_BC[b] && mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo(
                      [COORDENADAS_BAIRROS_BC[b].lat, COORDENADAS_BAIRROS_BC[b].lng],
                      15,
                      { duration: 1 }
                    );
                  }
                }}
                className="w-full bg-transparent text-[11px] font-bold text-white outline-none cursor-pointer truncate"
                title="Filtrar por Bairro"
              >
                <option value="TODOS" className="bg-slate-900 text-slate-200">
                  Todos os Bairros
                </option>
                {bairrosDisponiveis.map((b) => (
                  <option key={b} value={b} className="bg-slate-900 text-slate-200">
                    {b}
                  </option>
                ))}
              </select>
              {filtroBairro !== 'TODOS' && (
                <button
                  type="button"
                  onClick={() => setFiltroBairro('TODOS')}
                  className="text-slate-400 hover:text-white shrink-0 cursor-pointer ml-0.5"
                  title="Limpar filtro de bairro"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* 2. FILTRO DE FISCAL (+100px: 250px / 270px) */}
            <div
              className={`h-7 w-[250px] sm:w-[270px] flex items-center gap-1.5 px-2.5 rounded-lg border text-[11px] transition shrink-0 ${
                filtroFiscal !== 'TODOS'
                  ? 'bg-blue-950/60 border-blue-500/80 text-blue-200 ring-1 ring-blue-500/30'
                  : 'bg-slate-900 border-slate-700/80 text-slate-200 hover:border-slate-600'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
                Fiscal:
              </span>
              <select
                value={filtroFiscal}
                onChange={(e) => setFiltroFiscal(e.target.value)}
                className="w-full bg-transparent text-[11px] font-bold text-white outline-none cursor-pointer truncate"
                title="Filtrar por Fiscal Responsável"
              >
                <option value="TODOS" className="bg-slate-900 text-slate-200">
                  Todos os Fiscais
                </option>
                {currentUser && (
                  <option value="MINHAS_DEMANDAS" className="bg-slate-900 text-amber-300 font-bold">
                    ⭐ Minhas Demandas
                  </option>
                )}
                {fiscaisLista.map((f) => (
                  <option key={f.id} value={f.nome_completo} className="bg-slate-900 text-slate-200">
                    {f.nome_completo.split(' ')[0]} ({f.matricula || 'DVIS'})
                  </option>
                ))}
              </select>
              {filtroFiscal !== 'TODOS' && (
                <button
                  type="button"
                  onClick={() => setFiltroFiscal('TODOS')}
                  className="text-slate-400 hover:text-white shrink-0 cursor-pointer ml-0.5"
                  title="Limpar filtro de fiscal"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* 3. FILTRO DE RISCO (+100px: 240px / 255px) */}
            <div
              className={`h-7 w-[240px] sm:w-[255px] flex items-center gap-1.5 px-2.5 rounded-lg border text-[11px] transition shrink-0 ${
                filtroRisco !== 'TODOS'
                  ? 'bg-blue-950/60 border-blue-500/80 text-blue-200 ring-1 ring-blue-500/30'
                  : 'bg-slate-900 border-slate-700/80 text-slate-200 hover:border-slate-600'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
                Risco:
              </span>
              <select
                value={filtroRisco}
                onChange={(e) => setFiltroRisco(e.target.value)}
                className="w-full bg-transparent text-[11px] font-bold text-white outline-none cursor-pointer truncate"
                title="Filtrar por Grau de Risco"
              >
                <option value="TODOS" className="bg-slate-900 text-slate-200">
                  Todos os Riscos
                </option>
                <option value="ALTO" className="bg-slate-900 text-rose-300 font-bold">
                  🔴 Alto Risco
                </option>
                <option value="MEDIO" className="bg-slate-900 text-amber-300 font-bold">
                  🟡 Médio Risco
                </option>
                <option value="BAIXO" className="bg-slate-900 text-emerald-300 font-bold">
                  🟢 Baixo Risco
                </option>
              </select>
              {filtroRisco !== 'TODOS' && (
                <button
                  type="button"
                  onClick={() => setFiltroRisco('TODOS')}
                  className="text-slate-400 hover:text-white shrink-0 cursor-pointer ml-0.5"
                  title="Limpar filtro de risco"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Seletor de Estilo do Mapa (100% livre de API key) */}
          <div className="hidden xl:flex items-center gap-0.5 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px] shrink-0">
            <button
              onClick={() => setEstiloMapa('ruas')}
              className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                estiloMapa === 'ruas' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Mapa oficial e livre de ruas do OpenStreetMap"
            >
              🗺️ Ruas
            </button>
            <button
              onClick={() => setEstiloMapa('relevo')}
              className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                estiloMapa === 'relevo' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Topografia, morros, praias e curvas de nível de Balneário Camboriú"
            >
              ⛰️ Relevo
            </button>
            <button
              onClick={() => setEstiloMapa('escuro')}
              className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                estiloMapa === 'escuro' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Modo Noturno Dark Matter com alto contraste"
            >
              🌙 Escuro
            </button>
            <a
              href="https://www.google.com/maps/@-26.9925,-48.6353,15z/data=!3m1!1e3"
              target="_blank"
              rel="noopener noreferrer"
              className="px-1.5 py-0.5 rounded font-bold transition text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80 flex items-center gap-1 cursor-pointer"
              title="Abrir imagem de satélite oficial de Balneário Camboriú em 3D no Google Maps"
            >
              🛰️ Satélite ↗
            </a>
          </div>
        </div>

        {/* Lado Direito: Botão Roteiro do Dia */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={obterGpsAtual}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700 cursor-pointer shadow transition"
            title="Localizar minha posição GPS atual"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setPainelRoteiroAberto(!painelRoteiroAberto)}
            className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition-all cursor-pointer ${
              itensRoteiro.length > 0
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white ring-2 ring-blue-400/50 scale-102'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <Car className="w-3.5 h-3.5 text-blue-300" />
            <span className="hidden sm:inline">Roteiro</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/40 text-blue-200">
              {itensRoteiro.length}
            </span>
          </button>
        </div>
      </div>

      {/* 🗺️ CONTAINER PRINCIPAL: MAPA LEAFLET & PAINÉIS FLUTUANTES */}
      <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden">
        
        {/* Div onde o Leaflet injeta os tiles e marcadores */}
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* 📊 BADGE ESTATÍSTICA FLUTUANTE (CANTO INFERIOR ESQUERDO) - Posicionado para nunca cortar no app/site */}
        <div className="absolute bottom-3 left-2.5 sm:bottom-4 sm:left-4 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2 sm:p-2.5 shadow-2xl text-xs space-y-1 max-w-[260px] pointer-events-auto">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 border-b border-slate-800/80 pb-1">
            <span className="flex items-center gap-1">📍 Pontos no Mapa</span>
            <span className="font-mono text-blue-400 font-bold">{processosFiltrados.length}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-center text-[10px]">
            <button
              onClick={() => setFiltroRisco(filtroRisco === 'ALTO' ? 'TODOS' : 'ALTO')}
              className={`p-1 rounded-lg border transition cursor-pointer ${
                filtroRisco === 'ALTO'
                  ? 'bg-rose-600 text-white border-rose-400 ring-2 ring-rose-400/50'
                  : 'bg-rose-950/70 border-rose-800 text-rose-300 hover:bg-rose-900/80'
              }`}
              title="Filtrar por Alto Risco"
            >
              <span className="block font-black text-xs">
                {processosFiltrados.filter((p) => (p.grau_risco || '').toUpperCase().includes('ALTO')).length}
              </span>
              Alto
            </button>
            <button
              onClick={() => setFiltroRisco(filtroRisco === 'MEDIO' ? 'TODOS' : 'MEDIO')}
              className={`p-1 rounded-lg border transition cursor-pointer ${
                filtroRisco === 'MEDIO'
                  ? 'bg-amber-600 text-white border-amber-400 ring-2 ring-amber-400/50'
                  : 'bg-amber-950/70 border-amber-800 text-amber-300 hover:bg-amber-900/80'
              }`}
              title="Filtrar por Médio Risco"
            >
              <span className="block font-black text-xs">
                {processosFiltrados.filter((p) => (p.grau_risco || '').toUpperCase().includes('MÉD') || (p.grau_risco || '').toUpperCase().includes('MED')).length}
              </span>
              Médio
            </button>
            <button
              onClick={() => setFiltroRisco(filtroRisco === 'BAIXO' ? 'TODOS' : 'BAIXO')}
              className={`p-1 rounded-lg border transition cursor-pointer ${
                filtroRisco === 'BAIXO'
                  ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-400/50'
                  : 'bg-emerald-950/70 border-emerald-800 text-emerald-300 hover:bg-emerald-900/80'
              }`}
              title="Filtrar por Baixo Risco"
            >
              <span className="block font-black text-xs">
                {processosFiltrados.filter((p) => (p.grau_risco || '').toUpperCase().includes('BAIXO')).length}
              </span>
              Baixo
            </button>
          </div>
        </div>

        {/* 📋 PAINEL RÁPIDO DO ESTABELECIMENTO SELECIONADO (POPUP LATERAL INFERIOR) */}
        {processoSelecionado && (
          <div className="absolute bottom-3 right-2.5 sm:bottom-4 sm:right-4 z-25 bg-[#101422]/95 backdrop-blur-md border border-blue-500/40 rounded-3xl p-3.5 sm:p-4 shadow-2xl text-slate-100 max-w-md w-[calc(100%-20px)] sm:w-auto max-h-[calc(100%-24px)] overflow-y-auto animate-fadeIn pointer-events-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                  PROC: {processoSelecionado.num_processo || 'S/N'}
                </span>
                <h3 className="text-sm font-black text-white leading-tight mt-1">
                  {processoSelecionado.nome_fantasia || processoSelecionado.razao_social}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {processoSelecionado.razao_social}
                </p>
              </div>

              <button
                onClick={() => setProcessoSelecionado(null)}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 text-xs space-y-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="truncate">
                  {processoSelecionado.endereco || 'Endereço não informado'}, {processoSelecionado.bairro || 'Centro'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Fiscal: <strong>{processoSelecionado.fiscal_responsavel || 'Não atribuído'}</strong></span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  (processoSelecionado.grau_risco || '').toUpperCase().includes('ALTO')
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {processoSelecionado.grau_risco || 'MÉDIO RISCO'}
                </span>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="pt-3 flex flex-wrap items-center gap-2 justify-end">
              {/* Adicionar ao Roteiro */}
              <button
                onClick={() => alternarItemNoRoteiro(processoSelecionado)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  itensRoteiro.some((r) => r.id === processoSelecionado.id)
                    ? 'bg-rose-900/80 text-rose-200 border border-rose-700'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                }`}
              >
                {itensRoteiro.some((r) => r.id === processoSelecionado.id) ? (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Remover da Rota
                  </>
                ) : (
                  <>
                    <Car className="w-3.5 h-3.5" /> + Adicionar à Rota do Dia
                  </>
                )}
              </button>

              {/* Navegar Waze / Google Maps */}
              <button
                onClick={() => window.open(gerarLinkNavegacaoIndividual(processoSelecionado, 'google'), '_blank')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition"
                title="Navegar no Google Maps"
              >
                <Navigation className="w-4 h-4 text-emerald-400" />
              </button>

              {/* Satélite HD & Fachada no Google Maps */}
              <button
                onClick={() => {
                  const coord = getCoordenadasProcesso(processoSelecionado);
                  window.open(`https://www.google.com/maps/@${coord.lat},${coord.lng},19z/data=!3m1!1e3`, '_blank');
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 border border-slate-700 transition"
                title="Ver Satélite HD & Fachada no Google Maps (100% gratuito)"
              >
                <span className="text-sm">🛰️</span>
              </button>

              {/* Ficha & Parecer */}
              <button
                onClick={() => setModalDetalhesProc(processoSelecionado)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center gap-1.5"
              >
                <FileSignature className="w-3.5 h-3.5 text-blue-400" /> Ficha & Parecer
              </button>

              {/* Linha do Tempo */}
              <button
                onClick={() => setModalTimelineProc(processoSelecionado)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-purple-400" /> Timeline
              </button>
            </div>
          </div>
        )}

        {/* 🚗 DRAWER LATERAL: PAINEL DO ROTEIRIZADOR DE FISCALIZAÇÃO */}
        {painelRoteiroAberto && (
          <div className="absolute top-0 right-0 z-30 h-full w-full sm:w-[420px] bg-[#0c101a]/98 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col text-slate-100 animate-slideLeft">
            
            {/* Cabeçalho do Roteiro */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#090d16]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-white">
                    Roteiro de Vistorias
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {itensRoteiro.length} {itensRoteiro.length === 1 ? 'visita selecionada' : 'visitas selecionadas'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPainelRoteiroAberto(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ponto de Partida & Configurações */}
            <div className="p-4 bg-slate-900/60 border-b border-slate-800 space-y-3 shrink-0 text-xs">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">
                  Ponto de Partida da Equipe:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPontoPartidaTipo('SEDE')}
                    className={`p-2 rounded-xl border text-left font-bold transition flex items-center gap-2 cursor-pointer ${
                      pontoPartidaTipo === 'SEDE'
                        ? 'bg-blue-950/80 border-blue-500 text-blue-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🏛️ Sede VISA BC</span>
                  </button>

                  <button
                    onClick={obterGpsAtual}
                    className={`p-2 rounded-xl border text-left font-bold transition flex items-center gap-2 cursor-pointer ${
                      pontoPartidaTipo === 'GPS'
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>📍 GPS Atual</span>
                  </button>
                </div>
              </div>

              {/* Resumo da Rota Calculada */}
              {rotaOtimizada && (
                <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-300 block">Distância Total</span>
                    <span className="text-base font-black text-white font-mono">
                      ~{rotaOtimizada.distanciaTotalKm} km
                    </span>
                  </div>
                  <div className="h-6 w-[1px] bg-blue-800/60"></div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-300 block">Tempo Estimado</span>
                    <span className="text-base font-black text-white font-mono">
                      ~{rotaOtimizada.tempoTotalMinutos} min
                    </span>
                  </div>
                  <div className="h-6 w-[1px] bg-blue-800/60"></div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-300 block">Média p/ Parada</span>
                    <span className="text-base font-black text-white font-mono">
                      25 min
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Lista Ordenada das Paradas */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {itensRoteiro.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
                  <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 text-slate-600">
                    <MapPin className="w-10 h-10 stroke-[1.5]" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-300">Roteiro Vazio</h4>
                  <p className="text-xs text-slate-500 max-w-[240px]">
                    Clique em qualquer ponto no mapa e use o botão <strong>"+ Adicionar à Rota do Dia"</strong> para planejar seu trajeto.
                  </p>
                </div>
              ) : (
                rotaOtimizada?.rotaOrdenada.map((item, idx) => {
                  return (
                    <div
                      key={item.id}
                      onClick={() => focarNoProcesso(item.processo)}
                      className="p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 rounded-2xl transition cursor-pointer text-xs space-y-2 group shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center font-mono shrink-0 shadow">
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="font-bold text-slate-200 group-hover:text-blue-300 transition line-clamp-1">
                              {item.processo.nome_fantasia || item.processo.razao_social}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Proc: {item.processo.num_processo || 'S/N'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            alternarItemNoRoteiro(item.processo);
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded-lg transition"
                          title="Remover do roteiro"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pl-8">
                        <span className="truncate">{item.processo.endereco || 'Endereço'}, {item.processo.bairro || 'Centro'}</span>
                        {item.distanciaDoAnteriorKm !== undefined && (
                          <span className="font-mono text-emerald-400 shrink-0 font-bold ml-2">
                            +{item.distanciaDoAnteriorKm} km
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé com Botões de Ação da Rota */}
            {itensRoteiro.length > 0 && rotaOtimizada && (
              <div className="p-4 bg-[#090d16] border-t border-slate-800 space-y-2.5 shrink-0">
                
                {/* 1. Abrir Rota GPS no Google Maps */}
                <button
                  onClick={() => {
                    const url = gerarUrlGoogleMapsRota(
                      rotaOtimizada.rotaOrdenada,
                      pontoPartidaTipo === 'GPS' && gpsUsuario ? gpsUsuario : SEDE_VISA_BC
                    );
                    window.open(url, '_blank');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Iniciar Rota no Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </button>

                {/* 2. Compartilhar no WhatsApp & Limpar */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCompartilharWhatsApp}
                    className="py-2 px-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('Deseja limpar todos os estabelecimentos do roteiro do dia?')) {
                        setItensRoteiro([]);
                      }
                    }}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar Tudo</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 📜 MODAL COMPLETO DE DETALHES & PARECER COM ASSINATURA DIGITAL */}
      <ProcessoDetalhesParecerModal
        isOpen={!!modalDetalhesProc}
        onClose={() => setModalDetalhesProc(null)}
        processo={modalDetalhesProc}
        currentUser={currentUser}
        users={users || []}
        onSaveProcesso={(atualizado) => {
          onSaveProcesso(atualizado);
          setModalDetalhesProc(atualizado);
          setProcessoSelecionado(atualizado);
        }}
        onIniciarVistoria={(proc) => {
          setModalDetalhesProc(null);
          if (onIniciarVistoria) {
            onIniciarVistoria(proc);
          }
        }}
      />

      {/* ⏳ MODAL DE LINHA DO TEMPO (TIMELINE COMPLETA DE TRAMITAÇÕES) */}
      <ProcessoTimelineModal
        isOpen={!!modalTimelineProc}
        onClose={() => setModalTimelineProc(null)}
        processo={modalTimelineProc}
        currentUser={currentUser}
        onProcessoAtualizado={(atualizado) => {
          onSaveProcesso(atualizado);
          setModalTimelineProc(atualizado);
          setProcessoSelecionado(atualizado);
        }}
        onIniciarVistoria={(proc) => {
          setModalTimelineProc(null);
          if (onIniciarVistoria) {
            onIniciarVistoria(proc);
          }
        }}
      />

      {/* 📄 MODAL DE EMISSÃO DE DOCUMENTO OFICIAL TIMBRADO EM PDF COM QR CODE */}
      {modalPdfProc && (
        <DocumentoOficialPdfModal
          isOpen={true}
          onClose={() => setModalPdfProc(null)}
          processo={modalPdfProc}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};
