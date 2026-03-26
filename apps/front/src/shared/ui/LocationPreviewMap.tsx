import React, { useEffect, useState } from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LocationCandidate } from '@/entities/User/model/types';
import { DARK_MAP_STYLE } from '@/shared/config/mapStyle';

type ViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
};

interface LocationPreviewMapProps {
  candidate: LocationCandidate;
}

function getZoom(candidate: LocationCandidate): number {
  if (candidate.city) {
    return 9;
  }
  if (candidate.country) {
    return 5;
  }
  return 3.5;
}

export const LocationPreviewMap: React.FC<LocationPreviewMapProps> = ({
  candidate,
}) => {
  const [viewState, setViewState] = useState<ViewState>({
    longitude: candidate.longitude,
    latitude: candidate.latitude,
    zoom: getZoom(candidate),
    pitch: 0,
    bearing: 0,
  });

  useEffect(() => {
    setViewState({
      longitude: candidate.longitude,
      latitude: candidate.latitude,
      zoom: getZoom(candidate),
      pitch: 0,
      bearing: 0,
    });
  }, [candidate]);

  return (
    <div
      style={{
        width: '100%',
        height: '280px',
        overflow: 'hidden',
        borderRadius: '20px',
        border: '1px solid var(--border-color)',
      }}
    >
      <Map
        {...viewState}
        attributionControl={false}
        mapStyle={DARK_MAP_STYLE}
        reuseMaps
        style={{ width: '100%', height: '100%' }}
      >
        <Marker
          longitude={candidate.longitude}
          latitude={candidate.latitude}
          anchor="center"
        >
          <div
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '999px',
              background: 'rgba(79, 70, 229, 0.85)',
              border: '3px solid rgba(255, 255, 255, 0.92)',
              boxShadow: '0 10px 24px rgba(15, 23, 42, 0.24)',
            }}
          />
        </Marker>
      </Map>
    </div>
  );
};
