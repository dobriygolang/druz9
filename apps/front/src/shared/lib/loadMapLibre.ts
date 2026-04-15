import type maplibregl from 'maplibre-gl'

type MapLibreModule = typeof maplibregl

const MAPLIBRE_SCRIPT_ID = 'maplibre-gl-runtime'
const MAPLIBRE_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.21.0/dist/maplibre-gl.js'

declare global {
  interface Window {
    maplibregl?: MapLibreModule
  }
}

let mapLibrePromise: Promise<MapLibreModule> | null = null

export function loadMapLibre() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('MapLibre can only be loaded in the browser'))
  }

  if (window.maplibregl) {
    return Promise.resolve(window.maplibregl)
  }

  if (mapLibrePromise) {
    return mapLibrePromise
  }

  mapLibrePromise = new Promise<MapLibreModule>((resolve, reject) => {
    const resolveFromWindow = () => {
      if (window.maplibregl) {
        resolve(window.maplibregl)
        return
      }

      mapLibrePromise = null
      reject(new Error('MapLibre runtime is unavailable on window'))
    }

    const existing = document.getElementById(MAPLIBRE_SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', resolveFromWindow, { once: true })
      existing.addEventListener('error', () => {
        mapLibrePromise = null
        reject(new Error('Failed to load MapLibre runtime'))
      }, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = MAPLIBRE_SCRIPT_ID
    script.src = MAPLIBRE_SCRIPT_SRC
    script.async = true
    script.onload = resolveFromWindow
    script.onerror = () => {
      mapLibrePromise = null
      reject(new Error('Failed to load MapLibre runtime'))
    }
    document.head.appendChild(script)
  })

  return mapLibrePromise
}
