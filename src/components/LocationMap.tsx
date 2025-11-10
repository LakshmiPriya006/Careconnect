import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { Map } from './Map';
import { createCustomMarker } from '../utils/mapbox';
import { MapPin } from 'lucide-react';

interface LocationMapProps {
  latitude: number;
  longitude: number;
  label?: string;
  markerType?: 'provider' | 'client' | 'selected' | 'emergency';
  zoom?: number;
  className?: string;
  showAddress?: boolean;
  address?: string;
  onClick?: () => void;
}

export function LocationMap({
  latitude,
  longitude,
  label,
  markerType = 'provider',
  zoom = 14,
  className = 'h-64',
  showAddress = false,
  address,
  onClick,
}: LocationMapProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  const handleMapLoad = (map: mapboxgl.Map) => {
    mapRef.current = map;
    updateMarker();
  };

  const updateMarker = () => {
    if (!mapRef.current) return;

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Create new marker
    const el = createCustomMarker(markerType, {
      label: label,
      onClick: onClick,
    });

    markerRef.current = new mapboxgl.Marker(el)
      .setLngLat([longitude, latitude])
      .addTo(mapRef.current);

    // Add popup if address is provided
    if (address) {
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div style="padding: 8px;">
          <p style="margin: 0; font-size: 12px; font-weight: 600;">${label || 'Location'}</p>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #666;">${address}</p>
        </div>`
      );
      markerRef.current.setPopup(popup);
    }
  };

  useEffect(() => {
    updateMarker();
  }, [latitude, longitude, label, markerType]);

  useEffect(() => {
    return () => {
      markerRef.current?.remove();
    };
  }, []);

  return (
    <div className="space-y-2">
      {showAddress && address && (
        <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border">
          <MapPin className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
          <div>
            {label && <p className="text-sm text-gray-700">{label}</p>}
            <p className="text-xs text-gray-600">{address}</p>
          </div>
        </div>
      )}
      
      <Map
        center={[longitude, latitude]}
        zoom={zoom}
        className={className}
        onLoad={handleMapLoad}
      />
    </div>
  );
}
