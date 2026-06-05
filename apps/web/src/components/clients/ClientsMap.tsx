'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';

import type { ClientMapPoint } from '@/types/client-map';
import type { MapAreaSelection } from '@/types/map-area';
import { isPointInMapArea } from '@/types/map-area';

const exactIcon = L.divIcon({
  className: 'client-map-marker client-map-marker--exact',
  html: '<span aria-hidden="true"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const approxIcon = L.divIcon({
  className: 'client-map-marker client-map-marker--approx',
  html: '<span aria-hidden="true"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const dimmedExactIcon = L.divIcon({
  className: 'client-map-marker client-map-marker--exact client-map-marker--dimmed',
  html: '<span aria-hidden="true"></span>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

const dimmedApproxIcon = L.divIcon({
  className: 'client-map-marker client-map-marker--approx client-map-marker--dimmed',
  html: '<span aria-hidden="true"></span>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

function parseLayerToArea(layer: L.Layer): MapAreaSelection | null {
  if (layer instanceof L.Rectangle) {
    const bounds = layer.getBounds();
    return {
      type: 'bounds',
      south: bounds.getSouth(),
      north: bounds.getNorth(),
      west: bounds.getWest(),
      east: bounds.getEast(),
    };
  }

  if (layer instanceof L.Circle) {
    const center = layer.getLatLng();
    return {
      type: 'circle',
      lat: center.lat,
      lng: center.lng,
      radiusKm: layer.getRadius() / 1000,
    };
  }

  return null;
}

function MapDrawControl({
  onAreaChange,
  selectedArea,
}: {
  onAreaChange: (area: MapAreaSelection | null) => void;
  selectedArea: MapAreaSelection | null;
}) {
  const map = useMap();
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const onAreaChangeRef = useRef(onAreaChange);

  useEffect(() => {
    onAreaChangeRef.current = onAreaChange;
  }, [onAreaChange]);

  useEffect(() => {
    if (!selectedArea && drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers();
    }
  }, [selectedArea]);

  useEffect(() => {
    const drawnItems = new L.FeatureGroup();
    drawnItemsRef.current = drawnItems;
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        marker: false,
        polyline: false,
        polygon: false,
        circlemarker: false,
        rectangle: {
          shapeOptions: {
            color: '#3b82f6',
            weight: 2,
            fillOpacity: 0.12,
          },
        },
        circle: {
          shapeOptions: {
            color: '#3b82f6',
            weight: 2,
            fillOpacity: 0.12,
          },
        },
      },
      edit: {
        featureGroup: drawnItems,
        edit: false,
        remove: true,
      },
    });

    map.addControl(drawControl);

    const handleCreated = (event: L.LeafletEvent) => {
      const created = event as L.DrawEvents.Created;
      drawnItems.clearLayers();
      drawnItems.addLayer(created.layer);
      onAreaChangeRef.current(parseLayerToArea(created.layer));
    };

    const handleDeleted = () => {
      onAreaChangeRef.current(null);
    };

    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.DELETED, handleDeleted);

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.DELETED, handleDeleted);
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
      drawnItemsRef.current = null;
    };
  }, [map]);

  return null;
}

interface Props {
  points: ClientMapPoint[];
  enableAreaSelect?: boolean;
  selectedArea?: MapAreaSelection | null;
  onAreaChange?: (area: MapAreaSelection | null) => void;
}

export function ClientsMap({
  points,
  enableAreaSelect = false,
  selectedArea = null,
  onAreaChange,
}: Props) {
  const center = useMemo(() => {
    if (points.length === 0) return { lat: -15.78, lng: -47.93 };
    const lat =
      points.reduce((sum, p) => sum + p.lat, 0) / Math.max(points.length, 1);
    const lng =
      points.reduce((sum, p) => sum + p.lng, 0) / Math.max(points.length, 1);
    return { lat, lng };
  }, [points]);

  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
      ._getIconUrl;
  }, []);

  return (
    <div className="clients-map-wrap">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={points.length > 0 ? 5 : 4}
        className="clients-map"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {enableAreaSelect && onAreaChange && (
          <MapDrawControl
            onAreaChange={onAreaChange}
            selectedArea={selectedArea}
          />
        )}
        {points.map((point) => {
          const inArea =
            !selectedArea || isPointInMapArea(point.lat, point.lng, selectedArea);
          const icon = inArea
            ? point.approx
              ? approxIcon
              : exactIcon
            : point.approx
              ? dimmedApproxIcon
              : dimmedExactIcon;

          return (
            <Marker
              key={point.id}
              position={[point.lat, point.lng]}
              icon={icon}
              opacity={inArea ? 1 : 0.35}
            >
              <Popup>
                <strong>{point.name}</strong>
                <p>{point.label}</p>
                {point.approx && (
                  <p className="clients-map-approx">
                    Localização aproximada (DDD)
                  </p>
                )}
                <Link href={`/clients/${point.id}`}>Ver cliente</Link>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
