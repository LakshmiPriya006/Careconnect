import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getMapboxToken, defaultMapConfig } from '../utils/mapbox';
import { AlertCircle, MapPin } from 'lucide-react';

export interface MapProps {
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  style?: string;
  className?: string;
  onLoad?: (map: mapboxgl.Map) => void;
  children?: React.ReactNode;
}

export function Map(props: MapProps = {} as MapProps) {
  const {
    center,
    zoom,
    style,
    className = '',
    onLoad,
    children,
  } = props;
  
  // Use default values with fallbacks
  const mapCenter = center || (defaultMapConfig?.defaultCenter || [-74.006, 40.7128]);
  const mapZoom = zoom || (defaultMapConfig?.defaultZoom || 12);
  const mapStyle = style || (defaultMapConfig?.style || 'mapbox://styles/mapbox/streets-v12');
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    const token = getMapboxToken();
    
    if (!token) {
      setError('Mapbox access token not configured. Please add your Mapbox token to continue.');
      return;
    }

    mapboxgl.accessToken = token;

    try {
      if (!mapContainer.current) return;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: mapCenter,
        zoom: mapZoom,
        attributionControl: true,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
          },
          trackUserLocation: true,
          showUserHeading: true,
        }),
        'top-right'
      );

      map.current.on('load', () => {
        setMapLoaded(true);
        if (onLoad && map.current) {
          onLoad(map.current);
        }
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        if (e.error?.message?.includes('401')) {
          setError('Invalid Mapbox token. Please check your configuration.');
        }
      });

    } catch (err) {
      console.error('Failed to initialize map:', err);
      setError('Failed to load map. Please try again.');
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []); // Only run once on mount

  // Update center and zoom when props change
  useEffect(() => {
    if (map.current && mapLoaded) {
      map.current.flyTo({
        center: center || mapCenter,
        zoom: zoom || mapZoom,
        duration: 1000,
      });
    }
  }, [center, zoom, mapLoaded]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-gray-700 mb-2">{error}</p>
          <p className="text-xs text-gray-500">
            Get a free token at{' '}
            <a
              href="https://www.mapbox.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              mapbox.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <MapPin className="w-8 h-8 text-blue-600 mx-auto mb-2 animate-pulse" />
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

// Hook to access the map instance
export function useMap(mapRef: React.RefObject<mapboxgl.Map | null>) {
  return mapRef.current;
}