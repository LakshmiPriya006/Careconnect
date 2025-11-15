import { useEffect, useState } from 'react';
import { MapPin, Navigation, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useLocation } from '../hooks/useLocation';
import { calculateDistance, formatDistance } from '../utils/geolocation';
import { provider as providerApi } from '../utils/api';
import { toast } from 'sonner';
import { TrackingMap } from './TrackingMap';

interface LocationTrackerProps {
  bookingId: string;
  userType: 'client' | 'provider';
  providerLocation?: { latitude: number; longitude: number };
  clientLocation?: { latitude: number; longitude: number };
  onLocationUpdate?: (location: { latitude: number; longitude: number }) => void;
}

export function LocationTracker({
  bookingId,
  userType,
  providerLocation,
  clientLocation,
  onLocationUpdate,
}: LocationTrackerProps) {
  const { location, error, loading, requestLocation } = useLocation({ watch: true });
  const [tracking, setTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(true);

  // Calculate distance when locations change
  useEffect(() => {
    if (userType === 'client' && location && providerLocation) {
      const dist = calculateDistance(location, providerLocation);
      setDistance(dist);
    } else if (userType === 'provider' && location && clientLocation) {
      const dist = calculateDistance(location, clientLocation);
      setDistance(dist);
    }
  }, [location, providerLocation, clientLocation, userType]);

  // Send location updates to server
  useEffect(() => {
    if (!location || !tracking) return;

    const updateInterval = setInterval(async () => {
      try {
        if (userType === 'provider') {
          await providerApi.updateLocation(bookingId, location.latitude, location.longitude);
          setLastUpdate(new Date());
          
          if (onLocationUpdate) {
            onLocationUpdate({ latitude: location.latitude, longitude: location.longitude });
          }
        }
      } catch (err) {
        console.error('Failed to update location:', err);
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(updateInterval);
  }, [location, tracking, bookingId, userType, onLocationUpdate]);

  const handleStartTracking = async () => {
    if (!location) {
      await requestLocation();
    }
    
    if (userType === 'provider' && location) {
      try {
        await providerApi.updateLocation(bookingId, location.latitude, location.longitude);
        setTracking(true);
        setLastUpdate(new Date());
        toast.success('Location tracking started');
      } catch (err) {
        toast.error('Failed to start tracking');
      }
    } else {
      setTracking(true);
    }
  };

  const handleStopTracking = () => {
    setTracking(false);
    toast.success('Location tracking stopped');
  };

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Navigation className="w-5 h-5" />
          {userType === 'provider' ? 'Location Tracking' : 'Provider Location'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Location Status */}
        <div className="space-y-2">
          {loading && (
            <div className="flex items-center gap-2 text-blue-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Getting your location...</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Location Error</p>
                <p className="text-xs mt-1">{error.message}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={requestLocation}
                  className="mt-2 text-xs h-7"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              </div>
            </div>
          )}

          {location && !error && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-700">
                  {userType === 'provider' ? 'Your location is active' : 'Tracking your location'}
                </span>
                {tracking && (
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    Tracking
                  </Badge>
                )}
              </div>
              
              <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                <div>Lat: {location.latitude.toFixed(6)}</div>
                <div>Lon: {location.longitude.toFixed(6)}</div>
                {location.accuracy && (
                  <div className="text-gray-500">Accuracy: ±{Math.round(location.accuracy)}m</div>
                )}
              </div>

              {lastUpdate && (
                <p className="text-xs text-gray-600">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Distance Display */}
        {distance !== null && (
          <div className="bg-white p-3 rounded-lg border-2 border-blue-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-600">
                    {userType === 'provider' ? 'Distance to client' : 'Provider distance'}
                  </p>
                  <p className="text-2xl font-bold text-blue-900">{formatDistance(distance)}</p>
                </div>
              </div>
              {distance < 0.5 && (
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  Nearby
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Provider-specific tracking controls */}
        {userType === 'provider' && (
          <div className="space-y-2">
            {!tracking ? (
              <Button
                onClick={handleStartTracking}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                disabled={loading}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Start Location Tracking
              </Button>
            ) : (
              <Button
                onClick={handleStopTracking}
                variant="outline"
                className="w-full"
              >
                Stop Tracking
              </Button>
            )}

            <p className="text-xs text-gray-600 text-center">
              {tracking
                ? 'Your location is being shared with the client in real-time'
                : 'Share your location to help the client track your arrival'}
            </p>
          </div>
        )}

        {/* Client view - show provider's last known location time */}
        {userType === 'client' && providerLocation && (
          <div className="text-xs text-gray-600 bg-white p-2 rounded border">
            <p className="font-medium text-gray-700 mb-1">Provider Location</p>
            <div>Lat: {providerLocation.latitude.toFixed(6)}</div>
            <div>Lon: {providerLocation.longitude.toFixed(6)}</div>
          </div>
        )}

        {/* Interactive Map */}
        {showMap && (userType === 'client' ? providerLocation : location) && (
          <TrackingMap
            providerLocation={userType === 'provider' && location 
              ? { latitude: location.latitude, longitude: location.longitude }
              : providerLocation}
            clientLocation={userType === 'client' && location 
              ? { latitude: location.latitude, longitude: location.longitude }
              : clientLocation}
            userType={userType}
            showRoute={true}
            distance={distance}
            className="h-72"
          />
        )}
      </CardContent>
    </Card>
  );
}