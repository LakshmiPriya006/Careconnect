import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Map } from './Map';
import { createCustomMarker, calculateBounds } from '../utils/mapbox';
import { MapPin, Users, ZoomIn } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Star } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  service_category: string;
  rating?: number;
  hourly_rate?: number;
  latitude?: number;
  longitude?: number;
  profile_image?: string;
  distance?: number;
}

interface ProvidersMapProps {
  providers: Provider[];
  selectedProviderId?: string;
  onProviderSelect?: (providerId: string) => void;
  userLocation?: { latitude: number; longitude: number };
  className?: string;
  showUserLocation?: boolean;
}

export function ProvidersMap({
  providers,
  selectedProviderId,
  onProviderSelect,
  userLocation,
  className = 'h-96',
  showUserLocation = true,
}: ProvidersMapProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  // Filter providers with valid coordinates
  const providersWithLocation = providers.filter(
    p => p.latitude !== undefined && p.longitude !== undefined
  );

  const handleMapLoad = (map: mapboxgl.Map) => {
    mapRef.current = map;
    updateMarkers();
    updateBounds();
  };

  const updateMarkers = () => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

    // Add user location marker
    if (showUserLocation && userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
      }

      const userEl = createCustomMarker('client', {
        label: 'You',
      });

      userMarkerRef.current = new mapboxgl.Marker(userEl)
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(mapRef.current);
    }

    // Add provider markers
    providersWithLocation.forEach(provider => {
      if (!provider.latitude || !provider.longitude || !mapRef.current) return;

      const isSelected = provider.id === selectedProviderId;
      const el = createCustomMarker(isSelected ? 'selected' : 'provider', {
        onClick: () => {
          setSelectedProvider(provider);
          if (onProviderSelect) {
            onProviderSelect(provider.id);
          }
        },
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([provider.longitude, provider.latitude])
        .addTo(mapRef.current);

      // Create popup with provider info
      const popupContent = `
        <div style="padding: 8px; min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: #e5e7eb; overflow: hidden;">
              ${provider.profile_image 
                ? `<img src="${provider.profile_image}" style="width: 100%; height: 100%; object-fit: cover;" />`
                : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; color: #6b7280;">${provider.name.charAt(0)}</div>`
              }
            </div>
            <div style="flex: 1;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; color: #111827;">${provider.name}</p>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #6b7280;">${provider.service_category}</p>
            </div>
          </div>
          ${provider.rating ? `
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
              <span style="color: #fbbf24; font-size: 12px;">★</span>
              <span style="font-size: 12px; color: #374151;">${provider.rating.toFixed(1)}</span>
            </div>
          ` : ''}
          ${provider.hourly_rate ? `
            <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 600; color: #2563eb;">$${provider.hourly_rate}/hr</p>
          ` : ''}
          ${provider.distance ? `
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #6b7280;">${provider.distance.toFixed(1)} km away</p>
          ` : ''}
        </div>
      `;

      const popup = new mapboxgl.Popup({ 
        offset: 25,
        closeButton: true,
        closeOnClick: false,
      }).setHTML(popupContent);

      marker.setPopup(popup);

      // Show popup for selected provider
      if (isSelected) {
        popup.addTo(mapRef.current);
      }

      markersRef.current.set(provider.id, marker);
    });
  };

  const updateBounds = () => {
    if (!mapRef.current) return;

    const locations = [];

    if (showUserLocation && userLocation) {
      locations.push(userLocation);
    }

    providersWithLocation.forEach(provider => {
      if (provider.latitude && provider.longitude) {
        locations.push({ 
          latitude: provider.latitude, 
          longitude: provider.longitude 
        });
      }
    });

    if (locations.length > 0) {
      const bounds = calculateBounds(locations);
      if (bounds) {
        mapRef.current.fitBounds(bounds, {
          padding: 50,
          duration: 1000,
        });
      }
    }
  };

  const handleZoomToProvider = (provider: Provider) => {
    if (!mapRef.current || !provider.latitude || !provider.longitude) return;

    mapRef.current.flyTo({
      center: [provider.longitude, provider.latitude],
      zoom: 15,
      duration: 1000,
    });

    const marker = markersRef.current.get(provider.id);
    if (marker) {
      marker.togglePopup();
    }
  };

  useEffect(() => {
    updateMarkers();
  }, [providers, selectedProviderId, userLocation]);

  useEffect(() => {
    updateBounds();
  }, [providers, userLocation]);

  useEffect(() => {
    return () => {
      // Safely clean up markers on unmount
      if (markersRef.current && typeof markersRef.current.forEach === 'function') {
        markersRef.current.forEach(marker => marker.remove());
      }
      userMarkerRef.current?.remove();
    };
  }, []);

  const getMapCenter = (): [number, number] => {
    if (userLocation) {
      return [userLocation.longitude, userLocation.latitude];
    }
    if (providersWithLocation.length > 0 && providersWithLocation[0].latitude && providersWithLocation[0].longitude) {
      return [providersWithLocation[0].longitude, providersWithLocation[0].latitude];
    }
    return [-74.006, 40.7128]; // Default to NYC
  };

  return (
    <div className="space-y-3">
      {/* Map Info Header */}
      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm text-blue-900">Providers Near You</p>
            <p className="text-xs text-blue-700">
              {providersWithLocation.length} {providersWithLocation.length === 1 ? 'provider' : 'providers'} shown
            </p>
          </div>
        </div>
        <Badge className="bg-blue-100 text-blue-800 border-blue-300">
          <Users className="w-3 h-3 mr-1" />
          {providersWithLocation.length}
        </Badge>
      </div>

      {/* Map Container */}
      {providersWithLocation.length > 0 ? (
        <Map
          center={getMapCenter()}
          zoom={12}
          className={className}
          onLoad={handleMapLoad}
        />
      ) : (
        <div className={`flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 ${className}`}>
          <div className="text-center text-gray-500 p-6">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">No providers with location data</p>
            <p className="text-xs mt-1">Providers need to set their location to appear on the map</p>
          </div>
        </div>
      )}

      {/* Selected Provider Card */}
      {selectedProvider && selectedProvider.latitude && selectedProvider.longitude && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-white">
                <AvatarImage src={selectedProvider.profile_image} />
                <AvatarFallback className="bg-blue-200 text-blue-900">
                  {selectedProvider.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-blue-900 truncate">{selectedProvider.name}</p>
                <p className="text-xs text-blue-700">{selectedProvider.service_category}</p>
                {selectedProvider.rating && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-gray-700">{selectedProvider.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleZoomToProvider(selectedProvider)}
                className="flex-shrink-0"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map Legend */}
      <div className="flex items-center justify-center gap-4 p-2 bg-gray-50 rounded-lg text-xs">
        {showUserLocation && userLocation && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-600 border-2 border-white" />
            <span className="text-gray-700">Your Location</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white" />
          <span className="text-gray-700">Available Providers</span>
        </div>
        {selectedProviderId && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-600 border-2 border-white" />
            <span className="text-gray-700">Selected</span>
          </div>
        )}
      </div>
    </div>
  );
}