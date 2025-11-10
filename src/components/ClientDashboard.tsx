import { useState, useEffect } from 'react';
import { Heart, Home, Calendar, User, MessageSquare, LogOut, AlertCircle, Star, Wallet } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { ServiceRequestForm } from './ServiceRequestForm';
import { ProviderList } from './ProviderList';
import { BookingHistory } from './BookingHistory';
import { FavoritesView } from './FavoritesView';
import { ClientProfile } from './ClientProfile';
import { ClientWallet } from './ClientWallet';
import { Alert, AlertDescription } from './ui/alert';
import { useCurrency } from '../utils/currency';
import { client } from '../utils/api';
import { toast } from 'sonner';

interface ClientDashboardProps {
  onLogout: () => void;
  clientName: string;
}

export function ClientDashboard({ onLogout, clientName }: ClientDashboardProps) {
  const [activeTab, setActiveTab] = useState('home');
  const { currencySymbol, enableProviderSearch, enableClientWallet } = useCurrency();
  const [showAllFavorites, setShowAllFavorites] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [refreshBookings, setRefreshBookings] = useState(0);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [favoritesData, setFavoritesData] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [sendingEmergency, setSendingEmergency] = useState(false);

  // Load bookings and favorites data
  useEffect(() => {
    // Small delay to ensure authentication is fully initialized
    const timer = setTimeout(() => {
      loadDashboardData();
    }, 300);
    return () => clearTimeout(timer);
  }, [refreshBookings]);

  const loadDashboardData = async () => {
    try {
      setLoadingData(true);
      
      console.log('📊 [ClientDashboard] Loading dashboard data...');
      
      // Load bookings
      const bookingsResponse = await client.getBookings();
      const bookings = bookingsResponse.bookings || [];
      const now = new Date();
      
      console.log('📊 [ClientDashboard] Loaded', bookings.length, 'bookings');
      
      // Filter upcoming bookings (pending, accepted, upcoming, in-progress)
      const upcoming = bookings.filter((b: any) => {
        const bookingDate = new Date(b.date);
        return bookingDate >= now;
      });
      
      setUpcomingBookings(upcoming);
      
      // Load favorites
      const favoritesResponse = await client.getFavorites();
      setFavoritesData(favoritesResponse.favorites || []);
      
      console.log('✅ [ClientDashboard] Dashboard data loaded successfully');
    } catch (error) {
      console.error('❌ [ClientDashboard] Error loading dashboard data:', error);
      // Don't show error toast for authentication issues - they'll be logged out automatically
      if (error instanceof Error && !error.message.includes('Unauthorized') && !error.message.includes('Authentication required')) {
        toast.error('Failed to load some dashboard data');
      } else if (error instanceof Error && error.message.includes('Authentication required')) {
        console.error('🔒 [ClientDashboard] Authentication required - user should be redirected to login');
        toast.error('Session expired. Please log in again.');
        // Trigger logout
        setTimeout(() => onLogout(), 2000);
      }
    } finally {
      setLoadingData(false);
    }
  };

  // Calculate number of tabs dynamically
  const getTabCols = () => {
    let count = 4; // Base tabs: Home, Request, History, Account
    if (enableProviderSearch) count++;
    if (enableClientWallet) count++;
    return `grid-cols-${count}`;
  };

  const handleBookAgain = (provider: any) => {
    setSelectedProvider(provider);
    setActiveTab('request');
  };

  const handleRequestSuccess = (request: any) => {
    // Switch to history tab after successful request
    // Add a small delay to ensure backend has persisted data
    setTimeout(() => {
      setActiveTab('history');
      setRefreshBookings(prev => prev + 1);
    }, 1500);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeString: string) => {
    const time = new Date(`1970-01-01T${timeString}`);
    return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleEmergencyAlert = async () => {
    try {
      setSendingEmergency(true);
      const response = await client.sendEmergencyAlert();
      toast.success('🚨 Emergency alert sent! Help is on the way.', { duration: 5000 });
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      toast.error('Failed to send emergency alert. Please call emergency services directly.');
    } finally {
      setSendingEmergency(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-20">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b-2 border-blue-100 sticky top-0 z-20">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Branding */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <Heart className="w-8 h-8 text-blue-600" />
                <div>
                  <h2 className="text-blue-600">CareConnect</h2>
                  <p className="text-sm text-gray-600">Welcome, {clientName}</p>
                </div>
              </div>

              {/* Desktop Navigation - Hidden on Mobile */}
              <TabsList className={`hidden md:grid ${getTabCols()} h-auto p-2 bg-gray-50`}>
                <TabsTrigger 
                  value="home" 
                  className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                >
                  <Home className="w-5 h-5" />
                  <span>Home</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="request" 
                  className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                >
                  <Calendar className="w-5 h-5" />
                  <span>Request</span>
                </TabsTrigger>
                {enableProviderSearch && (
                  <TabsTrigger 
                    value="providers" 
                    className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                  >
                    <User className="w-5 h-5" />
                    <span>Providers</span>
                  </TabsTrigger>
                )}
                {enableClientWallet && (
                  <TabsTrigger 
                    value="wallet" 
                    className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                  >
                    <Wallet className="w-5 h-5" />
                    <span>Wallet</span>
                  </TabsTrigger>
                )}
                <TabsTrigger 
                  value="history" 
                  className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>History</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="profile" 
                  className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                >
                  <User className="w-5 h-5" />
                  <span>Account</span>
                </TabsTrigger>
              </TabsList>

              {/* Logout Button */}
              <Button 
                onClick={onLogout}
                variant="outline"
                className="flex items-center gap-2 flex-shrink-0"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden lg:inline">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6">
          <div className="space-y-6">
            {/* Mobile Bottom Navigation - Fixed at Bottom */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t-2 border-blue-100 shadow-lg">
              <TabsList className={`${getTabCols()} grid h-auto p-2 w-full bg-white`}>
                <TabsTrigger 
                  value="home" 
                  className="flex flex-col gap-1 py-3 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                >
                  <Home className="w-5 h-5" />
                  <span className="text-xs">Home</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="request" 
                  className="flex flex-col gap-1 py-3 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                >
                  <Calendar className="w-5 h-5" />
                  <span className="text-xs">Request</span>
                </TabsTrigger>
                {enableProviderSearch && (
                  <TabsTrigger 
                    value="providers" 
                    className="flex flex-col gap-1 py-3 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                  >
                    <User className="w-5 h-5" />
                    <span className="text-xs">Providers</span>
                  </TabsTrigger>
                )}
                {enableClientWallet && (
                  <TabsTrigger 
                    value="wallet" 
                    className="flex flex-col gap-1 py-3 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                  >
                    <Wallet className="w-5 h-5" />
                    <span className="text-xs">Wallet</span>
                  </TabsTrigger>
                )}
                <TabsTrigger 
                  value="history" 
                  className="flex flex-col gap-1 py-3 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-xs">History</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="profile" 
                  className="flex flex-col gap-1 py-3 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                >
                  <User className="w-5 h-5" />
                  <span className="text-xs">Account</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Home Tab */}
            <TabsContent value="home" className="space-y-6">
              {/* Emergency Button */}
              <Alert className="border-2 border-red-200 bg-red-50">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-red-900">Need immediate help?</span>
                  <Button 
                    className="bg-red-600 hover:bg-red-700 text-white h-12 px-6"
                    onClick={handleEmergencyAlert}
                    disabled={sendingEmergency}
                  >
                    {sendingEmergency ? 'Sending...' : 'Emergency Alert'}
                  </Button>
                </AlertDescription>
              </Alert>

              {/* Quick Actions */}
              <div>
                <h3 className="text-blue-900 mb-4">Quick Actions</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="border-2 border-blue-200 cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => setActiveTab('request')}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-100 p-4 rounded-full">
                          <Calendar className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-blue-900">Request Service</h4>
                          <p className="text-gray-600">Book help for today or later</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {enableClientWallet && (
                    <Card className="border-2 border-purple-200 cursor-pointer hover:shadow-lg transition-all"
                      onClick={() => setActiveTab('wallet')}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="bg-purple-100 p-4 rounded-full">
                            <Wallet className="w-8 h-8 text-purple-600" />
                          </div>
                          <div>
                            <h4 className="text-purple-900">My Wallet</h4>
                            <p className="text-gray-600">Add money & manage balance</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {enableProviderSearch && (
                    <Card className="border-2 border-green-200 cursor-pointer hover:shadow-lg transition-all"
                      onClick={() => setActiveTab('providers')}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="bg-green-100 p-4 rounded-full">
                            <User className="w-8 h-8 text-green-600" />
                          </div>
                          <div>
                            <h4 className="text-green-900">Browse Providers</h4>
                            <p className="text-gray-600">Find trusted helpers near you</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Upcoming Bookings */}
              <div>
                <h3 className="text-blue-900 mb-4">Upcoming Appointments</h3>
                {upcomingBookings.length > 0 ? (
                  upcomingBookings.slice(0, 3).map((booking) => (
                    <Card key={booking.id} className="border-2 border-blue-200 mb-4">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-4">
                            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-8 h-8 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="text-blue-900">{booking.provider?.name || booking.providerName || 'Provider TBD'}</h4>
                              <p className="text-gray-600">{booking.serviceTitle || booking.serviceType}</p>
                              <p className="text-gray-700 mt-2">
                                {booking.bookingType === 'immediate' 
                                  ? 'Immediate Service' 
                                  : `${formatDate(booking.scheduledDate)}${booking.scheduledTime ? ', ' + formatTime(booking.scheduledTime) : ''}`
                                }
                              </p>
                              {booking.provider?.rating && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                  <span className="text-gray-700">{booking.provider.rating} ({booking.provider.reviewCount || 0} reviews)</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                            {booking.status === 'pending' ? 'Pending' : 'Confirmed'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="border-2 border-gray-200">
                    <CardContent className="p-12 text-center">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No upcoming appointments</p>
                      <p className="text-sm text-gray-500 mt-1">Your scheduled services will appear here</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Favorite Providers */}
              {showAllFavorites ? (
                <FavoritesView onBack={() => setShowAllFavorites(false)} />
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-blue-900">Your Favorites</h3>
                    {favoritesData.length > 3 && (
                      <Button 
                        variant="outline" 
                        onClick={() => setShowAllFavorites(true)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        View All ({favoritesData.length})
                      </Button>
                    )}
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    {favoritesData.slice(0, 3).map((provider) => (
                      <Card key={provider.id} className="border-2 border-gray-200">
                        <CardContent className="p-4">
                          <div className="bg-gray-200 w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center">
                            <User className="w-8 h-8 text-gray-600" />
                          </div>
                          <h4 className="text-gray-900 text-center">{provider.name}</h4>
                          <Badge className="w-full justify-center mt-2 bg-blue-100 text-blue-700 border-blue-300">
                            {provider.primaryService}
                          </Badge>
                          <div className="flex items-center justify-center gap-1 mt-2">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-gray-700">
                              {provider.rating > 0 ? provider.rating.toFixed(1) : 'No rating'}
                            </span>
                            {provider.reviewCount > 0 && (
                              <span className="text-gray-500 text-sm">({provider.reviewCount})</span>
                            )}
                          </div>
                          <Button 
                            onClick={() => handleBookAgain(provider)}
                            className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white h-10"
                          >
                            Book Again
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Request Service Tab */}
            <TabsContent value="request">
              <ServiceRequestForm 
                selectedProvider={selectedProvider} 
                onSuccess={handleRequestSuccess}
              />
            </TabsContent>

            {/* Providers Tab */}
            <TabsContent value="providers">
              <ProviderList />
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history">
              <BookingHistory 
                onBookAgain={handleBookAgain} 
                key={refreshBookings}
              />
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <ClientProfile />
            </TabsContent>

            {/* Wallet Tab */}
            {enableClientWallet && (
              <TabsContent value="wallet">
                <ClientWallet />
              </TabsContent>
            )}
          </div>
        </div>
      </Tabs>
    </div>
  );
}