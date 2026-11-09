import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CcpuOcorrenciaItem, TipoPragaCcpu } from '../../types';
import { SEDE_VISA_BC } from '../../lib/geoService';

interface CcpuMapViewProps {
  ocorrencias: CcpuOcorrenciaItem[];
  onSelectOcorrencia: (item: CcpuOcorrenciaItem) => void;
  pragaFiltro: string;
}

const PRAGA_CORES: Record<string, { bg: string; border: string; emoji: string }> = {
  ESCORPIAO: { bg: '#f59e0b', border: '#b45309', emoji: '🦂' },
  RATO: { bg: '#f43f5e', border: '#be123c', emoji: '🐀' },
  BARATA: { bg: '#ca8a04', border: '#854d0e', emoji: '🪳' },
  ESPOROTRICOSE: { bg: '#a855f7', border: '#7e22ce', emoji: '🐱' },
  POMBO: { bg: '#0284c7', border: '#0369a1', emoji: '🕊️' },
  FORMIGA: { bg: '#ea580c', border: '#c2410c', emoji: '🐜' },
  OUTRO: { bg: '#64748b', border: '#334155', emoji: '⚠️' }
};

export const CcpuMapView: React.FC<CcpuMapViewProps> = ({
  ocorrencias,
  onSelectOcorrencia,
  pragaFiltro
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Inicializa o mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-26.9925, -48.6353], // Balneário Camboriú Centro
        zoom: 14,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors • VISA-BC CCPU'
      }).addTo(map);

      // Marcador da Sede da Vigilância Sanitária
      const sedeIcon = L.divIcon({
        className: 'custom-sede-marker',
        html: `
          <div style="background-color: #0f172a; color: #38bdf8; border: 2px solid #38bdf8; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
            🏛️
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      L.marker([SEDE_VISA_BC.lat, SEDE_VISA_BC.lng], { icon: sedeIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
            <strong style="color: #0284c7; text-transform: uppercase;">Sede DVIS / CCPU</strong><br/>
            ${SEDE_VISA_BC.endereco}
          </div>
        `);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Limpeza opcional
    };
  }, []);

  // Atualiza marcadores sempre que a lista ou filtro mudar
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const filtradas = ocorrencias.filter((o) => {
      if (pragaFiltro !== 'TODAS' && o.tipoPraga !== pragaFiltro) return false;
      return true;
    });

    const bounds = L.latLngBounds([]);

    filtradas.forEach((o) => {
      const cfg = PRAGA_CORES[o.tipoPraga] || PRAGA_CORES.OUTRO;
      const isScorpion = o.tipoPraga === 'ESCORPIAO';

      const customIcon = L.divIcon({
        className: 'custom-ccpu-marker',
        html: `
          <div style="
            background: ${cfg.bg};
            border: 2px solid ${cfg.border};
            width: ${isScorpion ? '38px' : '32px'};
            height: ${isScorpion ? '38px' : '32px'};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            cursor: pointer;
            font-size: ${isScorpion ? '18px' : '15px'};
            transition: transform 0.2s;
            position: relative;
          ">
            <span>${cfg.emoji}</span>
            <span style="
              position: absolute;
              bottom: -4px;
              right: -4px;
              background: #0f172a;
              color: white;
              font-size: 9px;
              font-weight: 900;
              padding: 1px 4px;
              border-radius: 8px;
              border: 1px solid white;
            ">${o.quantidade}</span>
          </div>
        `,
        iconSize: isScorpion ? [38, 38] : [32, 32],
        iconAnchor: isScorpion ? [19, 19] : [16, 16]
      });

      const marker = L.marker([o.lat, o.lng], { icon: customIcon });

      const popupHtml = `
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 16px;">${cfg.emoji}</span>
            <strong style="font-size: 13px; color: #0f172a;">${o.tipoPraga} • ${o.quantidade} ${o.quantidade === 1 ? 'coletado' : 'coletados'}</strong>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; margin-bottom: 6px;">
            <div style="font-weight: bold; color: #b45309; font-size: 11px;">📍 ${o.identificacaoBueiroLocal || 'Bueiro / Local'}</div>
            <div style="color: #475569; font-size: 11px;">${o.endereco}, ${o.numero || 'S/N'} - ${o.bairro}</div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px; color: #334155;">
            <span>🌡️ Temp: <strong>${o.temperatura}°C</strong></span>
            <span>📅 ${new Date(o.dataHora).toLocaleDateString('pt-BR')}</span>
          </div>
          <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">
            Fiscal: ${o.servidorResponsavel}
          </div>
          <button id="btn-ver-relatorio-${o.id}" style="
            width: 100%;
            padding: 5px 10px;
            background: #f59e0b;
            color: #0f172a;
            border: none;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            cursor: pointer;
          ">
            📄 Abrir Laudo / Detalhes
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-ver-relatorio-${o.id}`);
        if (btn) {
          btn.onclick = () => onSelectOcorrencia(o);
        }
      });

      markersLayer.addLayer(marker);
      bounds.extend([o.lat, o.lng]);
    });

    if (filtradas.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, [ocorrencias, pragaFiltro, onSelectOcorrencia]);

  return (
    <div className="relative w-full h-[calc(100vh-270px)] min-h-[580px] rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Legenda Flutuante do Mapa */}
      <div className="absolute top-4 right-4 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-xs text-left max-w-[210px] hidden sm:block">
        <span className="font-black uppercase tracking-wider text-[10px] text-slate-500 block mb-2">
          Legenda de Coletas CCPU
        </span>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-amber-700 shrink-0"></span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">🦂 Escorpiões (Bueiros)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-500 border border-rose-700 shrink-0"></span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">🐀 Ratos / Roedores</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-yellow-600 border border-yellow-800 shrink-0"></span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">🪳 Baratas de Esgoto</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-purple-500 border border-purple-700 shrink-0"></span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">🐱 Esporotricose</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-sky-500 border border-sky-700 shrink-0"></span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">🕊️ Pombos Urbanos</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-orange-500 border border-orange-700 shrink-0"></span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">🐜 Formigas</span>
          </div>
        </div>
      </div>
    </div>
  );
};
