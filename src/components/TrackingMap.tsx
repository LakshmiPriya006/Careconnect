import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Map } from './Map';
import { createCustomMarker, calculateBounds, getRoute } from '../utils/mapbox';
import { Badge } from './ui/badge';
import { Navigation, MapPin, Route } from 'lucide-react';
import { formatDistance } from '../utils/geolocation';

interface TrackingMapProps {
  providerLocation?: { latitude: number; longitude: number };
  clientLocation?: { latitude: number; longitude: number };
  userType: 'client' | 'provider';
  showRoute?: boolean;
  distance?: number | null;
  className?: string;
}

export function TrackingMap({
  providerLocation,
  clientLocation,
  userType,
  showRoute = true,
  distance,
  className = 'h-64',
}: TrackingMapProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const providerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const clientMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [routeLayer, setRouteLayer] = useState<string | null>(null);

  // Calculate map center and bounds
  const getMapConfig = () => {
    const locations = [];
    if (providerLocation) {
      locations.push({ 
        longitude: providerLocation.longitude, 
        latitude: providerLocation.latitude 
      });
    }
    if (clientLocation) {
      locations.push({ 
        longitude: clientLocation.longitude, 
        latitude: clientLocation.latitude 
      });
    }

    if (locations.length === 0) {
      return { center: [-74.006, 40.7128] as [number, number], zoom: 12 };
    }

    if (locations.length === 1) {
      return { 
        center: [locations[0].longitude, locations[0].latitude] as [number, number], 
        zoom: 14 
      };
    }

    // Calculate center
    const avgLng = locations.reduce((sum, loc) => sum + loc.longitude, 0) / locations.length;
    const avgLat = locations.reduce((sum, loc) => sum + loc.latitude, 0) / locations.length;

    return { center: [avgLng, avgLat] as [number, number], zoom: 13 };
  };

  const { center, zoom } = getMapConfig();

  const handleMapLoad = (map: mapboxgl.Map) => {
    mapRef.current = map;
    updateMarkers();
    updateBounds();
    if (showRoute) {
      updateRoute();
    }
  };

  const updateMarkers = () => {
    if (!mapRef.current) return;

    // Update provider marker
    if (providerLocation) {
      if (providerMarkerRef.current) {
        providerMarkerRef.current.setLngLat([
          providerLocation.longitude,
          providerLocation.latitude,
        ]);
      } else {
        const el = createCustomMarker('provider', {
          label: 'Provider',
        });
        
        providerMarkerRef.current = new mapboxgl.Marker(el)
          .setLngLat([providerLocation.longitude, providerLocation.latitude])
          .addTo(mapRef.current);
      }
    }

    // Update client marker
    if (clientLocation) {
      if (clientMarkerRef.current) {
        clientMarkerRef.current.setLngLat([
          clientLocation.longitude,
          clientLocation.latitude,
        ]);
      } else {
        const el = createCustomMarker('client', {
          label: 'Client',
        });
        
        clientMarkerRef.current = new mapboxgl.Marker(el)
          .setLngLat([clientLocation.longitude, clientLocation.latitude])
          .addTo(mapRef.current);
      }
    }
  };

  const updateBounds = () => {
    if (!mapRef.current) return;

    const locations = [];
    if (providerLocation) {
      locations.push(providerLocation);
    }
    if (clientLocation) {
      locations.push(clientLocation);
    }

    if (locations.length > 1) {
      const bounds = calculateBounds(locations);
      if (bounds) {
        mapRef.current.fitBounds(bounds, {
          padding: 50,
          duration: 1000,
        });
      }
    }
  };

  const updateRoute = async () => {
    if (!mapRef.current || !providerLocation || !clientLocation) return;

    try {
      const route = await getRoute(
        { longitude: providerLocation.longitude, latitude: providerLocation.latitude },
        { longitude: clientLocation.longitude, latitude: clientLocation.latitude },
        'driving'
      );

      // Remove existing route layer if it exists
      if (routeLayer && mapRef.current.getLayer(routeLayer)) {
        mapRef.current.removeLayer(routeLayer);
        mapRef.current.removeSource(routeLayer);
      }

      const layerId = `route-${Date.now()}`;

      mapRef.current.addSource(layerId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: route.geometry,
        },
      });

      mapRef.current.addLayer({
        id: layerId,
        type: 'line',
        source: layerId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#2563eb',
          'line-width': 4,
          'line-opacity': 0.7,
        },
      });

      setRouteLayer(layerId);
    } catch (error) {
      console.error('Failed to fetch route:', error);
    }
  };

  useEffect(() => {
    updateMarkers();
  }, [providerLocation, clientLocation]);

  useEffect(() => {
    updateBounds();
  }, [providerLocation, clientLocation]);

  useEffect(() => {
    if (showRoute) {
      updateRoute();
    }
  }, [providerLocation, clientLocation, showRoute]);

  // Cleanup
  useEffect(() => {
    return () => {
      providerMarkerRef.current?.remove();
      clientMarkerRef.current?.remove();
      if (routeLayer && mapRef.current) {
        if (mapRef.current.getLayer(routeLayer)) {
          mapRef.current.removeLayer(routeLayer);
          mapRef.current.removeSource(routeLayer);
        }
      }
    };
  }, []);

  return (
    <div className="space-y-2">
      {/* Map Info Header */}
      <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-900">Live Location Tracking</span>
        </div>
        {distance !== null && distance !== undefined && (
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-600" />
            <Badge className="bg-blue-100 text-blue-800 border-blue-300">
              {formatDistance(distance)}
            </Badge>
          </div>
        )}
      </div>

      {/* Map Container */}
      <Map
        center={center}
        zoom={zoom}
        className={className}
        onLoad={handleMapLoad}
      />

      {/* Map Legend */}
      <div className="flex items-center justify-center gap-4 p-2 bg-gray-50 rounded-lg text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white" />
          <span className="text-gray-700">Provider</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-600 border-2 border-white" />
          <span className="text-gray-700">Client</span>
        </div>
        {showRoute && (
          <div className="flex items-center gap-1">
            <Route className="w-3 h-3 text-blue-600" />
            <span className="text-gray-700">Route</span>
          </div>
        )}
      </div>
    </div>
  );
}
