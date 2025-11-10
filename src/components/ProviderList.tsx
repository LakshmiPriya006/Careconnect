import { useState, useEffect } from 'react';
import { Heart, Star, Shield, MapPin, DollarSign, Phone, Mail, Search, Loader2, Map as MapIcon, List } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { client } from '../utils/api';
import { toast } from 'sonner';
import { useCurrency } from '../utils/currency';
import { Badge } from './ui/badge';
import { ProvidersMap } from './ProvidersMap';
import { useLocation } from '../hooks/useLocation';
import { calculateDistance, sortByDistance } from '../utils/geolocation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface Provider {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  skills: string[];
  hourlyRate: number;
  rating: number;
  reviewCount: number;
  available: boolean;
  verified: boolean;
  gender?: string;
  languages?: string[];
  experienceYears?: number;
  location?: { latitude: number, longitude: number };
}

interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export function ProviderList() {
  const { currencySymbol } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedProviderId, setSelectedProviderId] = useState<string | undefined>(undefined);
  const { location, requestLocation } = useLocation();

  useEffect(() => {
    loadProviders();
    loadServices();
    loadFavorites();
    requestLocation(); // Get user location for distance calculation
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const response = await client.getProviders();
      setProviders(response.providers || []);
      console.log(`Loaded ${response.providers?.length || 0} providers`);
    } catch (error) {
      console.error('Error loading providers:', error);
      toast.error('Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const response = await client.getServices();
      setServices(response.services || []);
      console.log(`Loaded ${response.services?.length || 0} services`);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const loadFavorites = async () => {
    try {
      const response = await client.getFavorites();
      const favoriteIds = response.favorites?.map((f: any) => f.id) || [];
      setFavorites(favoriteIds);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const toggleFavorite = async (providerId: string) => {
    try {
      const isFavorite = favorites.includes(providerId);
      
      if (isFavorite) {
        await client.removeFavorite(providerId);
        setFavorites(prev => prev.filter(id => id !== providerId));
        toast.success('Removed from favorites');
      } else {
        await client.addFavorite(providerId);
        setFavorites(prev => [...prev, providerId]);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  // Filter providers based on search and category
  const filteredProviders = providers.filter((provider) => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));

    // Category filter - exact match on service title
    if (filterCategory === 'all') {
      return matchesSearch;
    }
    
    // Find the selected service
    const selectedService = services.find(s => s.id === filterCategory);
    if (selectedService) {
      // Check if specialty matches the service title (case-insensitive, exact match)
      const specialtyMatch = provider.specialty.toLowerCase() === selectedService.title.toLowerCase();
      
      // Check if any skill matches the service title
      const skillMatch = provider.skills.some(
        skill => skill.toLowerCase() === selectedService.title.toLowerCase()
      );
      
      const matchesService = specialtyMatch || skillMatch;
      
      console.log(`Filter check for ${provider.name}:`, {
        selectedService: selectedService.title,
        specialty: provider.specialty,
        skills: provider.skills,
        specialtyMatch,
        skillMatch,
        matchesService
      });
      
      return matchesSearch && matchesService;
    }
    
    return matchesSearch;
  });

  // Sort providers
  const sortedProviders = [...filteredProviders].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'price-low':
        return a.hourlyRate - b.hourlyRate;
      case 'price-high':
        return b.hourlyRate - a.hourlyRate;
      case 'experience':
        return (b.experienceYears || 0) - (a.experienceYears || 0);
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading providers...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Search and Filter */}
      <Card className="border-2 border-blue-200">
        <CardContent className="p-6 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by name, specialty, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Filter by service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="experience">Most Experienced</SelectItem>
                <SelectItem value="price-low">Lowest Price</SelectItem>
                <SelectItem value="price-high">Highest Price</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* View Mode Toggle */}
      <div className="flex justify-end">
        <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <MapIcon className="w-4 h-4" />
              Map View
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'map' ? (
        <ProvidersMap
          providers={sortedProviders.map(p => ({
            id: p.id,
            name: p.name,
            service_category: p.specialty,
            rating: p.rating,
            hourly_rate: p.hourlyRate,
            latitude: p.location?.latitude,
            longitude: p.location?.longitude,
          }))}
          selectedProviderId={selectedProviderId}
          onProviderSelect={setSelectedProviderId}
          userLocation={location ? { latitude: location.latitude, longitude: location.longitude } : undefined}
          showUserLocation={true}
          className="h-[600px]"
        />
      ) : (
        <>
          {sortedProviders.length === 0 ? (
            <Card className="border-2 border-gray-200">
              <CardContent className="p-12 text-center">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No providers found</p>
                <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
              </CardContent>
            </Card>
          ) : (
            sortedProviders.map((provider) => (
              <Card key={provider.id} className="border-2 border-gray-200 hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Provider Avatar */}
                    <div className="flex-shrink-0">
                      <div className="bg-gradient-to-br from-blue-100 to-green-100 w-24 h-24 rounded-full flex items-center justify-center">
                        <span className="text-blue-900 text-2xl">{provider.name.charAt(0)}</span>
                      </div>
                    </div>

                    {/* Provider Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-blue-900">{provider.name}</h4>
                            {provider.verified && (
                              <Badge className="bg-green-100 text-green-700 border-green-300">
                                ✓ Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-600 mt-1">{provider.specialty}</p>
                          {provider.experienceYears && provider.experienceYears > 0 && (
                            <p className="text-sm text-gray-500 mt-1">
                              {provider.experienceYears} {provider.experienceYears === 1 ? 'year' : 'years'} of experience
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFavorite(provider.id)}
                          className="flex-shrink-0"
                        >
                          <Heart
                            className={`w-6 h-6 ${
                              favorites.includes(provider.id)
                                ? 'fill-red-500 text-red-500'
                                : 'text-gray-400'
                            }`}
                          />
                        </Button>
                      </div>

                      {/* Rating */}
                      <div className="flex flex-wrap gap-4 text-gray-600">
                        <div className="flex items-center gap-1">
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                          <span>
                            {provider.rating > 0 ? provider.rating.toFixed(1) : 'No rating'}
                          </span>
                          {provider.reviewCount > 0 && (
                            <span className="text-gray-500">({provider.reviewCount} review{provider.reviewCount !== 1 ? 's' : ''})</span>
                          )}
                        </div>
                      </div>

                      {/* Skills */}
                      {provider.skills && provider.skills.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {provider.skills.slice(0, 5).map((skill, idx) => (
                            <Badge key={idx} variant="outline" className="text-sm">
                              {skill}
                            </Badge>
                          ))}
                          {provider.skills.length > 5 && (
                            <Badge variant="outline" className="text-sm text-gray-500">
                              +{provider.skills.length - 5} more
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Languages */}
                      {provider.languages && provider.languages.length > 0 && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Languages:</span> {provider.languages.join(', ')}
                        </div>
                      )}

                      {/* Pricing and Actions */}
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-2">
                        <div>
                          <p className="text-blue-900 text-lg">
                            {currencySymbol}{provider.hourlyRate}/hour
                          </p>
                          <p className={`text-sm ${provider.available ? 'text-green-600' : 'text-red-600'}`}>
                            {provider.available ? '● Available Now' : '● Currently Unavailable'}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button 
                            variant="outline" 
                            className="flex items-center gap-2 h-12 px-6"
                            onClick={() => window.open(`tel:${provider.phone}`)}
                          >
                            <Phone className="w-4 h-4" />
                            Call
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex items-center gap-2 h-12 px-6"
                            onClick={() => window.open(`mailto:${provider.email}`)}
                          >
                            <Mail className="w-4 h-4" />
                            Email
                          </Button>
                          <Button 
                            className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-6"
                            disabled={!provider.available}
                            onClick={() => {
                              // Navigate to request service tab - will be handled by parent
                              toast.info('Please use the Request Service tab to book this provider');
                            }}
                          >
                            Book Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </>
      )}
    </div>
  );
}