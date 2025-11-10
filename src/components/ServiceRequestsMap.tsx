import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Map } from './Map';
import { createCustomMarker, calculateBounds } from '../utils/mapbox';
import { MapPin, Calendar, User, AlertTriangle } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

interface ServiceRequest {
  id: string;
  service_type: string;
  client_name: string;
  recipient_name?: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  urgency?: 'urgent' | 'normal';
  scheduled_date?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

interface ServiceRequestsMapProps {
  requests: ServiceRequest[];
  selectedRequestId?: string;
  onRequestSelect?: (requestId: string) => void;
  className?: string;
  filterStatus?: string;
}

export function ServiceRequestsMap({
  requests,
  selectedRequestId,
  onRequestSelect,
  className = 'h-96',
  filterStatus = 'all',
}: ServiceRequestsMapProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);

  // Filter requests with valid locations
  const requestsWithLocation = requests.filter(
    r => r.location?.latitude !== undefined && r.location?.longitude !== undefined
  );

  // Filter by status if needed
  const filteredRequests = filterStatus === 'all' 
    ? requestsWithLocation 
    : requestsWithLocation.filter(r => r.status === filterStatus);

  const handleMapLoad = (map: mapboxgl.Map) => {
    mapRef.current = map;
    updateMarkers();
    updateBounds();
  };

  const getMarkerType = (request: ServiceRequest): 'provider' | 'client' | 'selected' | 'emergency' => {
    if (request.id === selectedRequestId) return 'selected';
    if (request.urgency === 'urgent' || request.status === 'pending') return 'emergency';
    if (request.status === 'completed') return 'provider';
    return 'client';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'accepted': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const updateMarkers = () => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

    // Add service request markers
    filteredRequests.forEach(request => {
      if (!request.location?.latitude || !request.location?.longitude || !mapRef.current) return;

      const markerType = getMarkerType(request);
      const el = createCustomMarker(markerType, {
        onClick: () => {
          setSelectedRequest(request);
          if (onRequestSelect) {
            onRequestSelect(request.id);
          }
        },
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([request.location.longitude, request.location.latitude])
        .addTo(mapRef.current);

      // Create popup with request info
      const urgencyBadge = request.urgency === 'urgent' 
        ? '<span style="display: inline-block; padding: 2px 6px; background: #fee2e2; color: #991b1b; border-radius: 4px; font-size: 10px; font-weight: 600; margin-bottom: 4px;">URGENT</span>'
        : '';

      const popupContent = `
        <div style="padding: 10px; min-width: 220px;">
          ${urgencyBadge}
          <div style="margin-bottom: 8px;">
            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #111827;">${request.service_type}</p>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #6b7280;">Request #${request.id.substring(0, 8)}</p>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #374151;">
              <span style="font-weight: 500;">Client:</span>
              <span>${request.client_name}</span>
            </div>
            ${request.recipient_name ? `
              <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #374151;">
                <span style="font-weight: 500;">For:</span>
                <span>${request.recipient_name}</span>
              </div>
            ` : ''}
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
            <span style="display: inline-block; padding: 2px 8px; background: ${
              request.status === 'pending' ? '#fef3c7' : 
              request.status === 'accepted' ? '#dbeafe' : 
              request.status === 'completed' ? '#dcfce7' : '#f3f4f6'
            }; color: ${
              request.status === 'pending' ? '#92400e' : 
              request.status === 'accepted' ? '#1e40af' : 
              request.status === 'completed' ? '#166534' : '#374151'
            }; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase;">${request.status}</span>
            ${request.scheduled_date ? `
              <span style="font-size: 10px; color: #6b7280;">${new Date(request.scheduled_date).toLocaleDateString()}</span>
            ` : ''}
          </div>

          ${request.location?.address ? `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 10px; color: #6b7280; line-height: 1.3;">${request.location.address}</p>
            </div>
          ` : ''}
        </div>
      `;

      const popup = new mapboxgl.Popup({ 
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        maxWidth: '280px',
      }).setHTML(popupContent);

      marker.setPopup(popup);

      // Show popup for selected request
      if (request.id === selectedRequestId) {
        popup.addTo(mapRef.current);
      }

      markersRef.current.set(request.id, marker);
    });
  };

  const updateBounds = () => {
    if (!mapRef.current || filteredRequests.length === 0) return;

    const locations = filteredRequests
      .filter(r => r.location?.latitude && r.location?.longitude)
      .map(r => ({
        latitude: r.location!.latitude,
        longitude: r.location!.longitude,
      }));

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

  const handleZoomToRequest = (request: ServiceRequest) => {
    if (!mapRef.current || !request.location?.latitude || !request.location?.longitude) return;

    mapRef.current.flyTo({
      center: [request.location.longitude, request.location.latitude],
      zoom: 15,
      duration: 1000,
    });

    const marker = markersRef.current.get(request.id);
    if (marker) {
      marker.togglePopup();
    }
  };

  useEffect(() => {
    updateMarkers();
  }, [requests, selectedRequestId, filterStatus]);

  useEffect(() => {
    updateBounds();
  }, [requests, filterStatus]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => marker.remove());
    };
  }, []);

  const getMapCenter = (): [number, number] => {
    if (filteredRequests.length > 0) {
      const first = filteredRequests[0];
      if (first.location?.latitude && first.location?.longitude) {
        return [first.location.longitude, first.location.latitude];
      }
    }
    return [-74.006, 40.7128]; // Default to NYC
  };

  // Count requests by status
  const statusCounts = {
    pending: requestsWithLocation.filter(r => r.status === 'pending').length,
    accepted: requestsWithLocation.filter(r => r.status === 'accepted').length,
    completed: requestsWithLocation.filter(r => r.status === 'completed').length,
    urgent: requestsWithLocation.filter(r => r.urgency === 'urgent').length,
  };

  return (
    <div className="space-y-3">
      {/* Map Info Header */}
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-blue-900">Service Requests Map</p>
              <p className="text-xs text-blue-700">
                {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'} shown
              </p>
            </div>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          {statusCounts.urgent > 0 && (
            <Badge className="bg-red-100 text-red-800 border-red-300">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {statusCounts.urgent} Urgent
            </Badge>
          )}
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            {statusCounts.pending} Pending
          </Badge>
          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
            {statusCounts.accepted} Accepted
          </Badge>
          <Badge className="bg-green-100 text-green-800 border-green-300">
            {statusCounts.completed} Completed
          </Badge>
        </div>
      </div>

      {/* Map Container */}
      {filteredRequests.length > 0 ? (
        <Map
          center={getMapCenter()}
          zoom={11}
          className={className}
          onLoad={handleMapLoad}
        />
      ) : (
        <div className={`flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 ${className}`}>
          <div className="text-center text-gray-500 p-6">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">No service requests with location data</p>
            <p className="text-xs mt-1">Requests will appear here when they include location information</p>
          </div>
        </div>
      )}

      {/* Selected Request Card */}
      {selectedRequest && selectedRequest.location && (
        <Card className={`border-2 ${getStatusColor(selectedRequest.status)}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{selectedRequest.service_type}</p>
                  {selectedRequest.urgency === 'urgent' && (
                    <Badge className="bg-red-100 text-red-800 border-red-300">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Urgent
                    </Badge>
                  )}
                </div>

                <div className="text-sm text-gray-700 space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3" />
                    <span>{selectedRequest.client_name}</span>
                  </div>
                  {selectedRequest.recipient_name && (
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3" />
                      <span>For: {selectedRequest.recipient_name}</span>
                    </div>
                  )}
                  {selectedRequest.scheduled_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(selectedRequest.scheduled_date).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {selectedRequest.location.address && (
                  <p className="text-xs text-gray-600">{selectedRequest.location.address}</p>
                )}
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleZoomToRequest(selectedRequest)}
              >
                <MapPin className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map Legend */}
      <div className="flex items-center justify-center gap-4 p-2 bg-gray-50 rounded-lg text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-600 border-2 border-white" />
          <span className="text-gray-700">Urgent/Pending</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white" />
          <span className="text-gray-700">Accepted</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-600 border-2 border-white" />
          <span className="text-gray-700">Completed</span>
        </div>
      </div>
    </div>
  );
}
