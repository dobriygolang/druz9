import type { StyleSpecification } from 'maplibre-gl';

const STADIA_ALIDADE_SMOOTH_DARK =
  'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json';

const FALLBACK_DARK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    cartoDark: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 512,
      maxzoom: 20,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [
    {
      id: 'carto-dark',
      type: 'raster',
      source: 'cartoDark',
      paint: {
        'raster-resampling': 'linear',
      },
    },
  ],
};

function isLocalhostHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function resolveConfiguredStyleURL(): string {
  return import.meta.env.VITE_MAP_STYLE_URL?.trim() || '';
}

export function resolveCommunityMapStyle(): string | StyleSpecification {
  const configured = resolveConfiguredStyleURL();
  if (configured) {
    return configured;
  }

  if (typeof window !== 'undefined' && isLocalhostHost(window.location.hostname)) {
    return STADIA_ALIDADE_SMOOTH_DARK;
  }

  return FALLBACK_DARK_STYLE;
}

export const COMMUNITY_MAP_STYLE = resolveCommunityMapStyle();
export const DARK_MAP_STYLE = COMMUNITY_MAP_STYLE;
