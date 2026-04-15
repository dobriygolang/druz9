import type maplibregl from 'maplibre-gl'

type MapLibreModule = typeof maplibregl

let mapLibrePromise: Promise<MapLibreModule> | null = null

export function loadMapLibre() {
  if (mapLibrePromise) return mapLibrePromise

  mapLibrePromise = import('maplibre-gl')
    .then(mod => mod.default ?? mod)
    .catch(err => {
      mapLibrePromise = null
      throw err
    }) as Promise<MapLibreModule>

  return mapLibrePromise
}
