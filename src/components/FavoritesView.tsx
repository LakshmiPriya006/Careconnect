import { useState } from 'react';
import { Star, User, ArrowLeft, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface FavoriteProvider {
  id: number;
  name: string;
  rating: number;
  reviews: number;
  primaryService: string;
  services: string[];
  hourlyRate: number;
  gender: string;
}

interface FavoritesViewProps {
  onBack: () => void;
}

const mockFavorites: FavoriteProvider[] = [
  {
    id: 1,
    name: 'Sarah Johnson',
    rating: 4.9,
    reviews: 127,
    primaryService: 'Nursing Care',
    services: ['Nursing Care', 'Medication Management', 'Health Monitoring'],
    hourlyRate: 55,
    gender: 'female',
  },
  {
    id: 2,
    name: 'Emma Davis',
    rating: 4.8,
    reviews: 94,
    primaryService: 'House Cleaning',
    services: ['House Cleaning', 'Organization', 'Laundry'],
    hourlyRate: 35,
    gender: 'female',
  },
  {
    id: 3,
    name: 'Robert Chen',
    rating: 4.9,
    reviews: 156,
    primaryService: 'Companionship',
    services: ['Companionship', 'Transportation', 'Meal Prep'],
    hourlyRate: 40,
    gender: 'male',
  },
  {
    id: 4,
    name: 'Linda Martinez',
    rating: 4.7,
    reviews: 82,
    primaryService: 'Grocery Shopping',
    services: ['Grocery Shopping', 'Errands', 'Transportation'],
    hourlyRate: 30,
    gender: 'female',
  },
  {
    id: 5,
    name: 'Michael Brown',
    rating: 4.8,
    reviews: 103,
    primaryService: 'Home Repairs',
    services: ['Home Repairs', 'Handyman', 'Maintenance'],
    hourlyRate: 45,
    gender: 'male',
  },
];

export function FavoritesView({ onBack }: FavoritesViewProps) {
  const [filterService, setFilterService] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [sortBy, setSortBy] = useState('rating');

  const uniqueServices = Array.from(new Set(mockFavorites.map(p => p.primaryService)));

  const filteredProviders = mockFavorites
    .filter(provider => {
      if (filterService !== 'all' && provider.primaryService !== filterService) return false;
      if (filterGender !== 'all' && provider.gender !== filterGender) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'reviews':
          return b.reviews - a.reviews;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-blue-900">Your Favorite Providers</h3>
          <p className="text-gray-600">{mockFavorites.length} providers saved</p>
        </div>
        <Button onClick={onBack} variant="outline" className="flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" />
          Back
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Sorting
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-700">Filter by Service</label>
              <Select value={filterService} onValueChange={setFilterService}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="All Services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {uniqueServices.map(service => (
                    <SelectItem key={service} value={service}>{service}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-700">Filter by Gender</label>
              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="All Genders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-700">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Highest Rating</SelectItem>
                  <SelectItem value="reviews">Most Reviews</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-3">
        <p className="text-gray-600">
          Showing {filteredProviders.length} of {mockFavorites.length} providers
        </p>

        {filteredProviders.length === 0 ? (
          <Card className="border-2 border-gray-200">
            <CardContent className="p-12 text-center">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No providers match your filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredProviders.map((provider) => (
              <Card key={provider.id} className="border-2 border-gray-200 hover:border-blue-300 transition-all">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="bg-gray-200 w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-8 h-8 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="text-gray-900">{provider.name}</h4>
                          <Badge className="bg-blue-100 text-blue-700 border-blue-300 mt-1">
                            {provider.primaryService}
                          </Badge>
                          <div className="flex items-center gap-1 mt-2">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-gray-700">{provider.rating}</span>
                            <span className="text-gray-500 text-sm">({provider.reviews} reviews)</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-900 text-lg">${provider.hourlyRate}/hr</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-2">All Services:</p>
                      <div className="flex flex-wrap gap-2">
                        {provider.services.map((service, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t">
                      <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12">
                        Book Again
                      </Button>
                      <Button variant="outline" className="flex-1 h-12">
                        View Profile
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
