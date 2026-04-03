import React, { useEffect, useRef } from 'react';
import Map, { Marker, MapRef, NavigationControl, ScaleControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

import { COMMUNITY_MAP_STYLE } from '@/shared/config/mapStyle';
import { EventMarker, ClusterMarker, UserMarker } from '../components/MapMarker';
import { DisplayEvent, DisplayUserPoint, UserCluster } from '../components/types';

type ViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
};

interface FocusTarget {
  longitude: number;
  latitude: number;
  zoom: number;
  key: string;
}

interface MapCanvasProps {
  viewState: ViewState;
  isMobile: boolean;
  userClusters: UserCluster[];
  visibleUserPoints: DisplayUserPoint[];
  displayEvents: DisplayEvent[];
  focusTarget: FocusTarget | null;
  onMove: (viewState: ViewState) => void;
  onMapClick: () => void;
  onClusterClick: (cluster: UserCluster) => void;
  onUserClick: (point: DisplayUserPoint) => void;
  onEventClick: (event: DisplayEvent) => void;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  viewState,
  isMobile,
  userClusters,
  visibleUserPoints,
  displayEvents,
  focusTarget,
  onMove,
  onMapClick,
  onClusterClick,
  onUserClick,
  onEventClick,
}) => {
  const mapRef = useRef<MapRef | null>(null);

  useEffect(() => {
    if (!focusTarget) {
      return;
    }
    mapRef.current?.flyTo({
      center: [focusTarget.longitude, focusTarget.latitude],
      zoom: focusTarget.zoom,
      duration: 900,
      essential: true,
    });
  }, [focusTarget]);

  return (
    <Map
      ref={mapRef}
      {...viewState}
      onMove={(event) => onMove(event.viewState)}
      onClick={onMapClick}
      mapStyle={COMMUNITY_MAP_STYLE}
      attributionControl={false}
      minZoom={2.5}
      maxZoom={18.5}
      reuseMaps
      style={{ width: '100%', height: isMobile ? 'calc(100vh - 280px)' : '620px' }}
    >
      <NavigationControl position="top-right" showCompass={false} visualizePitch={false} />
      <ScaleControl position="bottom-right" unit="metric" />
      {userClusters.map((cluster) => (
        <Marker key={cluster.id} longitude={cluster.longitude} latitude={cluster.latitude} anchor="bottom">
          <button type="button" onClick={(event) => { event.stopPropagation(); onClusterClick(cluster); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <ClusterMarker cluster={cluster} />
          </button>
        </Marker>
      ))}
      {visibleUserPoints.map((point) => (
        <Marker key={point.userId} longitude={point.displayLongitude} latitude={point.displayLatitude} anchor="bottom">
          <button type="button" onClick={(event) => { event.stopPropagation(); onUserClick(point); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <UserMarker point={point} />
          </button>
        </Marker>
      ))}
      {displayEvents.map((event) => (
        <Marker key={event.id} longitude={event.displayLongitude} latitude={event.displayLatitude} anchor="bottom">
          <button type="button" onClick={(clickEvent) => { clickEvent.stopPropagation(); onEventClick(event); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <EventMarker event={event} />
          </button>
        </Marker>
      ))}
    </Map>
  );
};
