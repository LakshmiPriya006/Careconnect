// Mapbox configuration and utilities for CareConnect

export interface MapboxConfig {
  accessToken: string;
  style: string;
  defaultCenter: [number, number]; // [lng, lat]
  defaultZoom: number;
}

// Get Mapbox access token from platform settings or environment
export function getMapboxToken(): string {
  // First, try to get from window object (set by settings loader)
  if (typeof window !== 'undefined' && (window as any).__MAPBOX_TOKEN__) {
    return (window as any).__MAPBOX_TOKEN__;
  }
  
  // Fallback to environment variables
  const token = typeof window !== 'undefined' 
    ? (window as any).MAPBOX_ACCESS_TOKEN || import.meta.env?.VITE_MAPBOX_ACCESS_TOKEN
    : '';
  
  if (!token) {
    console.warn('Mapbox access token not configured');
  }
  
  return token || '';
}

// Set Mapbox token (called when settings are loaded)
export function setMapboxToken(token: string): void {
  if (typeof window !== 'undefined') {
    (window as any).__MAPBOX_TOKEN__ = token;
  }
}

// Default map configuration
export const defaultMapConfig: Omit<MapboxConfig, 'accessToken'> = {
  style: 'mapbox://styles/mapbox/streets-v12',
  defaultCenter: [-74.006, 40.7128], // New York City
  defaultZoom: 12,
};

// Map styles for different use cases
export const mapStyles = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
};

// Custom marker colors for CareConnect
export const markerColors = {
  provider: '#2563eb', // blue-600
  client: '#16a34a', // green-600
  selected: '#dc2626', // red-600
  emergency: '#dc2626', // red-600
  inactive: '#9ca3af', // gray-400
};

// Create a custom marker element
export function createCustomMarker(
  type: 'provider' | 'client' | 'selected' | 'emergency' | 'inactive',
  options?: {
    onClick?: () => void;
    label?: string;
  }
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'custom-map-marker';
  
  const color = markerColors[type];
  
  el.innerHTML = `
    <div style="
      position: relative;
      cursor: pointer;
      transition: transform 0.2s;
    " class="marker-wrapper">
      <svg width="32" height="40" viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg">
        <path 
          d="M12 0C7.03 0 3 4.03 3 9c0 5.25 9 16.5 9 16.5S21 14.25 21 9c0-4.97-4.03-9-9-9zm0 12c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" 
          fill="${color}"
          stroke="white"
          stroke-width="1.5"
        />
      </svg>
      ${options?.label ? `
        <div style="
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          margin-top: 2px;
        ">${options.label}</div>
      ` : ''}
    </div>
  `;
  
  if (options?.onClick) {
    el.addEventListener('click', options.onClick);
  }
  
  // Add hover effect
  const wrapper = el.querySelector('.marker-wrapper') as HTMLElement;
  if (wrapper) {
    el.addEventListener('mouseenter', () => {
      wrapper.style.transform = 'scale(1.1)';
    });
    el.addEventListener('mouseleave', () => {
      wrapper.style.transform = 'scale(1)';
    });
  }
  
  return el;
}

// Calculate bounds for multiple coordinates
export function calculateBounds(
  coordinates: Array<{ longitude: number; latitude: number }>
): [[number, number], [number, number]] | null {
  if (coordinates.length === 0) return null;
  
  let minLng = coordinates[0].longitude;
  let maxLng = coordinates[0].longitude;
  let minLat = coordinates[0].latitude;
  let maxLat = coordinates[0].latitude;
  
  coordinates.forEach(coord => {
    minLng = Math.min(minLng, coord.longitude);
    maxLng = Math.max(maxLng, coord.longitude);
    minLat = Math.min(minLat, coord.latitude);
    maxLat = Math.max(maxLat, coord.latitude);
  });
  
  // Add padding
  const lngPadding = (maxLng - minLng) * 0.1 || 0.01;
  const latPadding = (maxLat - minLat) * 0.1 || 0.01;
  
  return [
    [minLng - lngPadding, minLat - latPadding],
    [maxLng + lngPadding, maxLat + latPadding],
  ];
}

// Format coordinates for display
export function formatCoordinates(lat: number, lng: number): string {
  const latDirection = lat >= 0 ? 'N' : 'S';
  const lngDirection = lng >= 0 ? 'E' : 'W';
  
  return `${Math.abs(lat).toFixed(4)}°${latDirection}, ${Math.abs(lng).toFixed(4)}°${lngDirection}`;
}

// Get route between two points using Mapbox Directions API
export async function getRoute(
  start: { longitude: number; latitude: number },
  end: { longitude: number; latitude: number },
  profile: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<any> {
  const token = getMapboxToken();
  if (!token) {
    throw new Error('Mapbox token not configured');
  }
  
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?geometries=geojson&access_token=${token}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code !== 'Ok') {
      throw new Error('Failed to get route');
    }
    
    return data.routes[0];
  } catch (error) {
    console.error('Error fetching route:', error);
    throw error;
  }
}
