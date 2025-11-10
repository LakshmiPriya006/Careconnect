import { useState, useEffect, useCallback } from 'react';
import { getCurrentPosition, watchPosition, clearWatch, Coordinates, LocationError } from '../utils/geolocation';

interface UseLocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean; // Enable real-time tracking
}

interface UseLocationReturn {
  location: Coordinates | null;
  error: LocationError | null;
  loading: boolean;
  requestLocation: () => void;
  clearError: () => void;
}

export function useLocation(options: UseLocationOptions = {}): UseLocationReturn {
  const { watch = false } = options;
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<LocationError | null>(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const coords = await getCurrentPosition();
      setLocation(coords);
      
      // Store in localStorage for persistence
      localStorage.setItem('lastKnownLocation', JSON.stringify(coords));
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    // Load last known location from localStorage
    const lastKnown = localStorage.getItem('lastKnownLocation');
    if (lastKnown) {
      try {
        const coords = JSON.parse(lastKnown);
        setLocation(coords);
      } catch (e) {
        console.error('Failed to parse last known location');
      }
    }

    // Auto-request location on mount if watch is enabled
    if (watch) {
      requestLocation();
    }
  }, [watch, requestLocation]);

  useEffect(() => {
    if (!watch) return;

    let watchId: number = -1;

    watchId = watchPosition(
      (coords) => {
        setLocation(coords);
        localStorage.setItem('lastKnownLocation', JSON.stringify(coords));
      },
      (err) => {
        setError(err);
      }
    );

    return () => {
      if (watchId !== -1) {
        clearWatch(watchId);
      }
    };
  }, [watch]);

  return {
    location,
    error,
    loading,
    requestLocation,
    clearError,
  };
}
