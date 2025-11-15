import { useState, useEffect } from 'react';
import { Heart, Briefcase, DollarSign, User, LogOut, Bell, CheckCircle, Clock, MapPin, Star, MessageSquare, RefreshCw, Wallet } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { ProviderPendingStatus } from './ProviderPendingStatus';
import { ProviderReviews } from './ProviderReviews';
import { ProviderJobManagement } from './ProviderJobManagement';
import { ProviderEarnings } from './ProviderEarnings';
import { ProviderWallet } from './ProviderWallet';
import { client, provider } from '../utils/api';
import { toast } from 'sonner';
import { useCurrency } from '../utils/currency';

interface ProviderDashboardProps {
  onLogout: () => void;
  userName: string;
  providerId: string;
}

const completedJobs = [
  {
    id: 4,
    client: 'Robert Miller',
    service: 'Home Nursing Care',
    date: 'Nov 1, 2025',
    payment: 110,
    rating: 5,
    tip: 20,
  },
  {
    id: 5,
    client: 'Mary Davis',
    service: 'Vital Signs Check',
    date: 'Oct 30, 2025',
    payment: 55,
    rating: 5,
    tip: 10,
  },
  {
    id: 6,
    client: 'James Wilson',
    service: 'Medication Assistance',
    date: 'Oct 28, 2025',
    payment: 55,
    rating: 4,
    tip: 0,
  },
];

export function ProviderDashboard({ onLogout, userName, providerId }: ProviderDashboardProps) {
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeTab, setActiveTab] = useState('jobs');
  const { enableProviderWallet, currencySymbol } = useCurrency();
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [providerData, setProviderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [jobRequests, setJobRequests] = useState<any[]>([]);
  const [acceptedJobs, setAcceptedJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  useEffect(() => {
    if (providerId) {
      loadVerificationStatus();
    }
  }, [providerId]);

  // Load jobs when provider verification status changes
  useEffect(() => {
    // Check if provider is fully verified
    const allStagesApproved = verificationStatus?.stages?.stage1 === 'approved' &&
      verificationStatus?.stages?.stage2 === 'approved' &&
      verificationStatus?.stages?.stage3 === 'approved' &&
      verificationStatus?.stages?.stage4 === 'approved';
    
    const accountApproved = providerData?.verificationStatus === 'approved';
    
    // Only load jobs if fully verified and not currently loading
    if (!loading && allStagesApproved && accountApproved) {
      console.log('✅ Provider is fully verified, loading jobs...');
      loadJobRequests();
      loadAcceptedJobs();
    }
  }, [verificationStatus, providerData, loading]); // Watch all relevant state

  // Auto-refresh verification status every 30 seconds if not fully verified
  useEffect(() => {
    // Check if provider is fully verified
    const allStagesApproved = verificationStatus?.stages?.stage1 === 'approved' &&
      verificationStatus?.stages?.stage2 === 'approved' &&
      verificationStatus?.stages?.stage3 === 'approved' &&
      verificationStatus?.stages?.stage4 === 'approved';
    
    const accountApproved = providerData?.verificationStatus === 'approved';
    const fullyVerified = !loading && Boolean(allStagesApproved && accountApproved);
    
    if (!fullyVerified && !loading) {
      console.log('⏰ Setting up auto-refresh for approval status...');
      const intervalId = setInterval(() => {
        console.log('🔄 Auto-refreshing verification status...');
        loadVerificationStatus();
      }, 30000); // 30 seconds

      return () => {
        console.log('🛑 Clearing auto-refresh interval');
        clearInterval(intervalId);
      };
    }
  }, [verificationStatus, providerData, loading]);

  const loadVerificationStatus = async () => {
    if (!providerId) {
      console.log('No providerId provided, skipping verification load');
      setLoading(false);
      return;
    }

    try {
      console.log(`🔍 Loading verification status for provider ${providerId}...`);
      
      // Load both verification stages and provider profile data
      const [verificationData, profileResponse] = await Promise.all([
        client.getProviderVerification(providerId),
        client.getProviderById(providerId).catch((err) => {
          console.error('❌ Error loading provider profile:', err);
          return null;
        }),
      ]);
      
      console.log('📦 Raw API responses:', {
        verificationData,
        profileResponse
      });
      
      // Extract provider data from response
      const profileData = profileResponse?.provider || profileResponse;
      
      setVerificationStatus(verificationData);
      setProviderData(profileData);
      
      console.log('✅ Provider data loaded:', {
        providerId,
        hasVerificationData: !!verificationData,
        hasProfileData: !!profileData,
        verificationStages: verificationData?.stages,
        providerVerified: profileData?.verified,
        providerVerificationStatus: profileData?.verificationStatus,
      });
      
      // Detailed stage breakdown
      if (verificationData?.stages) {
        console.log('📋 Verification stages detail:', {
          stage1: verificationData.stages.stage1,
          stage2: verificationData.stages.stage2,
          stage3: verificationData.stages.stage3,
          stage4: verificationData.stages.stage4,
        });
      }
      
      // Check what will happen
      const allStagesApproved = verificationData?.stages?.stage1 === 'approved' &&
        verificationData?.stages?.stage2 === 'approved' &&
        verificationData?.stages?.stage3 === 'approved' &&
        verificationData?.stages?.stage4 === 'approved';
      
      const accountApproved = profileData?.verificationStatus === 'approved';
      
      console.log('🎯 Verification check results:', {
        allStagesApproved,
        accountApproved,
        willShowDashboard: allStagesApproved && accountApproved,
        willShowPendingScreen: !(allStagesApproved && accountApproved)
      });
      
    } catch (error) {
      console.error('❌ Error loading verification status:', error);
    } finally {
      setLoading(false);
      console.log('✅ Loading complete, loading state set to false');
    }
  };

  const loadJobRequests = async () => {
    setLoadingJobs(true);
    try {
      const data = await provider.getJobRequests();
      console.log('Job requests loaded:', data.requests);
      console.log('Job requests count:', data.requests?.length);
      if (data.requests && data.requests.length > 0) {
        console.log('First request:', data.requests[0]);
      }
      setJobRequests(data.requests || []);
    } catch (error) {
      console.error('Error loading job requests:', error);
      toast.error('Failed to load job requests');
    } finally {
      setLoadingJobs(false);
    }
  };

  const loadAcceptedJobs = async () => {
    try {
      console.log('🔄 Loading accepted jobs for provider...');
      const data = await provider.getBookings();
      console.log('✅ Provider bookings loaded:', data.bookings);
      console.log('📊 Bookings count:', data.bookings?.length);
      
      if (data.bookings && data.bookings.length > 0) {
        console.log('📋 First booking details:', {
          id: data.bookings[0].id,
          status: data.bookings[0].status,
          serviceTitle: data.bookings[0].serviceTitle,
          clientName: data.bookings[0].clientName,
          providerId: data.bookings[0].providerId
        });
        
        // Log status breakdown
        const statusCounts = data.bookings.reduce((acc: any, b: any) => {
          acc[b.status] = (acc[b.status] || 0) + 1;
          return acc;
        }, {});
        console.log('📈 Status breakdown:', statusCounts);
      }
      
      setAcceptedJobs(data.bookings || []);
    } catch (error) {
      console.error('❌ Error loading accepted jobs:', error);
    }
  };

  const handleAvailabilityChange = async (available: boolean) => {
    setIsAvailable(available);
    try {
      await client.updateProviderAvailability(available);
      toast.success(available ? 'You are now available for jobs' : 'You are now offline');
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
      // Revert on error
      setIsAvailable(!available);
    }
  };

  const handleAcceptJob = async (requestId: string) => {
    try {
      await provider.acceptJob(requestId);
      toast.success('Job accepted successfully!');
      loadJobRequests(); // Reload the pending requests
      loadAcceptedJobs(); // Reload the accepted jobs
    } catch (error) {
      console.error('Error accepting job:', error);
      toast.error('Failed to accept job');
    }
  };

  const handleDeclineJob = async (requestId: string) => {
    // For now, just filter it out from the UI
    // In a real app, we'd have a decline endpoint
    setJobRequests(jobRequests.filter(j => j.id !== requestId));
    toast.success('Job declined');
  };

  // Check if provider is fully verified and approved by admin
  // Provider can ONLY access dashboard when:
  // 1. ALL verification stages are 'approved' by admin, AND
  // 2. Provider's account verificationStatus is 'approved' OR verified is true
  const allStagesApproved = verificationStatus?.stages?.stage1 === 'approved' &&
    verificationStatus?.stages?.stage2 === 'approved' &&
    verificationStatus?.stages?.stage3 === 'approved' &&
    verificationStatus?.stages?.stage4 === 'approved';
  
  // STRICT: Only consider approved if explicitly set to 'approved'
  // Do NOT default to true if missing
  const accountApproved = providerData?.verificationStatus === 'approved';
  
  // Both conditions must be true for dashboard access
  // IMPORTANT: Only calculate after data is loaded
  const isFullyVerified = !loading && Boolean(allStagesApproved && accountApproved);

  console.log('🔍 RENDER: Provider verification check:', {
    providerId,
    loading,
    allStagesApproved,
    accountApproved,
    isFullyVerified,
    stage1: verificationStatus?.stages?.stage1,
    stage2: verificationStatus?.stages?.stage2,
    stage3: verificationStatus?.stages?.stage3,
    stage4: verificationStatus?.stages?.stage4,
    providerVerificationStatus: providerData?.verificationStatus,
    providerVerified: providerData?.verified,
    willShowPendingScreen: !isFullyVerified,
    willShowDashboard: isFullyVerified,
  });

  // Helper to format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'ASAP';
    
    // Handle old format strings
    if (dateString === 'tomorrow') return 'Tomorrow';
    if (dateString.includes('nov')) {
      // Convert old format like "nov5" to display format
      const match = dateString.match(/nov(\d+)/i);
      if (match) return `Nov ${match[1]}, 2025`;
      return dateString;
    }
    
    // Handle ISO date format (YYYY-MM-DD)
    try {
      const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch (e) {
      return dateString; // Return as-is if parsing fails
    }
  };

  // Helper to format time
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    
    // Handle old format strings
    if (timeString === 'morning') return 'Morning (8 AM - 12 PM)';
    if (timeString === 'afternoon') return 'Afternoon (12 PM - 5 PM)';
    if (timeString === 'evening') return 'Evening (5 PM - 8 PM)';
    
    // Handle 24-hour time format (HH:MM)
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (e) {
      return timeString; // Return as-is if parsing fails
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // IMPORTANT: Show verification screen if provider is NOT fully activated by admin
  // Provider MUST have:
  // 1. All 4 verification stages approved by admin
  // 2. Account status set to 'approved' by admin
  // Only then can they access the full dashboard
  if (!isFullyVerified) {
    return (
      <div>
        <header className="bg-white shadow-sm border-b-2 border-orange-200 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="w-8 h-8 text-orange-600" />
                <div>
                  <h2 className="text-orange-600">CareConnect Provider - Admin Approval Pending</h2>
                  <p className="text-sm text-gray-600">{userName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => {
                    console.log('🔄 Refreshing verification status...');
                    setLoading(true);
                    loadVerificationStatus();
                  }}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Status
                </Button>
                <Button 
                  onClick={onLogout}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>
        <ProviderPendingStatus providerId={providerId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-green-100 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="w-8 h-8 text-green-600" />
              <div>
                <h2 className="text-green-600">Provider Portal</h2>
                <p className="text-sm text-gray-600">{userName}</p>
              </div>
            </div>
            <Button 
              onClick={onLogout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Availability Toggle */}
        <Card className="border-2 border-green-200 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
                <div>
                  <Label htmlFor="availability" className="text-lg">
                    {isAvailable ? 'You are Available' : 'You are Offline'}
                  </Label>
                  <p className="text-sm text-gray-600">
                    {isAvailable ? 'You will receive new job requests' : 'You will not receive new requests'}
                  </p>
                </div>
              </div>
              <Switch
                id="availability"
                checked={isAvailable}
                onCheckedChange={handleAvailabilityChange}
                className="data-[state=checked]:bg-green-600"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="border-2 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Pending Requests</p>
                  <p className="text-blue-900 text-2xl mt-1">
                    {jobRequests.filter(j => j.status === 'pending').length}
                  </p>
                </div>
                <Bell className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Upcoming Jobs</p>
                  <p className="text-green-900 text-2xl mt-1">
                    {acceptedJobs.filter(j => j.status === 'accepted' || j.status === 'in-progress').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Rating</p>
                  <p className="text-purple-900 text-2xl mt-1">4.9</p>
                </div>
                <Star className="w-8 h-8 text-purple-600 fill-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Completed Jobs</p>
                  <p className="text-orange-900 text-2xl mt-1">
                    {acceptedJobs.filter(j => j.status === 'completed').length}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tab Navigation */}
          <TabsList className="grid grid-cols-5 h-auto p-2 bg-white shadow-md">
            <TabsTrigger 
              value="jobs" 
              className="flex flex-col gap-2 py-4 data-[state=active]:bg-green-100 data-[state=active]:text-green-700"
            >
              <Briefcase className="w-6 h-6" />
              <span className="text-xs md:text-sm">New Requests</span>
            </TabsTrigger>
            <TabsTrigger 
              value="my-jobs" 
              className="flex flex-col gap-2 py-4 data-[state=active]:bg-green-100 data-[state=active]:text-green-700"
            >
              <CheckCircle className="w-6 h-6" />
              <span className="text-xs md:text-sm">My Jobs</span>
            </TabsTrigger>
            <TabsTrigger 
              value="earnings" 
              className="flex flex-col gap-2 py-4 data-[state=active]:bg-green-100 data-[state=active]:text-green-700"
            >
              <DollarSign className="w-6 h-6" />
              <span className="text-xs md:text-sm">Earnings</span>
            </TabsTrigger>
            <TabsTrigger 
              value="reviews" 
              className="flex flex-col gap-2 py-4 data-[state=active]:bg-green-100 data-[state=active]:text-green-700"
            >
              <MessageSquare className="w-6 h-6" />
              <span className="text-xs md:text-sm">Reviews</span>
            </TabsTrigger>
            <TabsTrigger 
              value="profile" 
              className="flex flex-col gap-2 py-4 data-[state=active]:bg-green-100 data-[state=active]:text-green-700"
            >
              <User className="w-6 h-6" />
              <span className="text-xs md:text-sm">Profile</span>
            </TabsTrigger>
          </TabsList>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            {loadingJobs ? (
              <div className="flex items-center justify-center py-12">
                <Clock className="w-8 h-8 text-green-600 animate-spin" />
              </div>
            ) : (
              <>
                {/* Pending Requests */}
                <div>
                  <h3 className="text-green-900 mb-4">New Job Requests</h3>
                  <div className="space-y-4">
                    {jobRequests.filter(j => j.status === 'pending').length === 0 ? (
                      <Card className="border-2 border-gray-200">
                        <CardContent className="p-12 text-center">
                          <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600">No new job requests at the moment</p>
                          <p className="text-sm text-gray-500 mt-1">Check back later for new opportunities</p>
                        </CardContent>
                      </Card>
                    ) : (
                      jobRequests.filter(j => j.status === 'pending').map((job) => (
                        <Card key={job.id} className="border-2 border-green-200">
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="text-green-900">{job.clientName}</h4>
                                  <p className="text-gray-600">{job.serviceTitle || job.serviceType}</p>
                                </div>
                                <Badge className="bg-blue-100 text-blue-700 border-blue-300">New</Badge>
                              </div>

                              {job.requestFor === 'other' && job.recipientName && (
                                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                                  <p className="text-sm text-blue-900 mb-1">Service Recipient:</p>
                                  <p className="text-blue-900">{job.recipientName}</p>
                                  {job.recipientPhone && (
                                    <p className="text-sm text-blue-700 mt-1">{job.recipientPhone}</p>
                                  )}
                                </div>
                              )}
                              
                              <div className="grid md:grid-cols-2 gap-3 text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span>
                                    {job.bookingType === 'immediate' ? 'ASAP' : `${formatDate(job.scheduledDate)} at ${formatTime(job.scheduledTime)}`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  <span>2.5 miles away</span>
                                </div>
                              </div>

                              <p className="text-gray-600 text-sm">{job.location}</p>

                              {job.specialRequests && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                  <p className="text-sm text-gray-700">
                                    <strong>Special Requests:</strong> {job.specialRequests}
                                  </p>
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-3 border-t">
                                <div>
                                  <p className="text-sm text-gray-600">Payment</p>
                                  {job.basePrice ? (
                                    <>
                                      <p className="text-green-900 text-lg">{currencySymbol}{job.basePrice}/hour</p>
                                      {job.minimumHours && (
                                        <p className="text-sm text-gray-600">Minimum: {job.minimumHours}h</p>
                                      )}
                                      {job.minimumFee && (
                                        <p className="text-sm text-gray-600">Min. fee: {currencySymbol}{job.minimumFee}</p>
                                      )}
                                    </>
                                  ) : (
                                    <p className="text-green-900 text-lg">{currencySymbol}{job.estimatedCost}</p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    className="h-12 px-6"
                                    onClick={() => handleDeclineJob(job.id)}
                                  >
                                    Decline
                                  </Button>
                                  <Button 
                                    className="bg-green-600 hover:bg-green-700 text-white h-12 px-6"
                                    onClick={() => handleAcceptJob(job.id)}
                                  >
                                    Accept Job
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>

                {/* Accepted Jobs */}
                <div>
                  <h3 className="text-green-900 mb-4">Upcoming Jobs</h3>
                  <div className="space-y-4">
                    {acceptedJobs.filter(j => j.status === 'accepted' || j.status === 'in-progress').length === 0 ? (
                      <Card className="border-2 border-gray-200">
                        <CardContent className="p-12 text-center">
                          <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600">No upcoming jobs scheduled</p>
                          <p className="text-sm text-gray-500 mt-1">Accepted jobs will appear here</p>
                        </CardContent>
                      </Card>
                    ) : (
                      acceptedJobs.filter(j => j.status === 'accepted' || j.status === 'in-progress').map((job) => (
                        <Card key={job.id} className="border-2 border-blue-200">
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="text-blue-900">{job.clientName}</h4>
                                  <p className="text-gray-600">{job.serviceTitle || job.serviceType}</p>
                                </div>
                                <Badge className="bg-green-100 text-green-700 border-green-300">Confirmed</Badge>
                              </div>

                              {job.requestFor === 'other' && job.recipientName && (
                                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                                  <p className="text-sm text-blue-900 mb-1">Service Recipient:</p>
                                  <p className="text-blue-900">{job.recipientName}</p>
                                  {job.recipientPhone && (
                                    <p className="text-sm text-blue-700 mt-1">{job.recipientPhone}</p>
                                  )}
                                </div>
                              )}
                              
                              <div className="grid md:grid-cols-2 gap-3 text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span>
                                    {job.bookingType === 'immediate' ? 'ASAP' : `${formatDate(job.scheduledDate)} at ${formatTime(job.scheduledTime)}`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  <span>2.5 miles away</span>
                                </div>
                              </div>

                              <p className="text-gray-600 text-sm">{job.location}</p>

                              <div className="flex gap-2 pt-3 border-t">
                                <Button variant="outline" className="flex-1 h-12">
                                  Get Directions
                                </Button>
                                <Button variant="outline" className="flex-1 h-12">
                                  Contact Client
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* My Jobs Tab - For managing accepted/ongoing/completed jobs */}
          <TabsContent value="my-jobs" className="space-y-6">
            <ProviderJobManagement 
              providerId={providerId} 
              isActive={activeTab === 'my-jobs'}
            />
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-6">
            <ProviderEarnings />
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            <ProviderReviews />
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="border-2 border-green-200">
              <CardHeader className="bg-green-50">
                <CardTitle className="text-green-900">Your Profile</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-6">
                  <div className="bg-gradient-to-br from-green-100 to-blue-100 w-24 h-24 rounded-full flex items-center justify-center">
                    <span className="text-green-900 text-3xl">SJ</span>
                  </div>
                  <div>
                    <h3 className="text-green-900">Sarah Johnson</h3>
                    <p className="text-gray-600">Registered Nurse (RN)</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-gray-700">4.9 (127 reviews)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-gray-900 mb-2">Skills & Services</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Nursing Care', 'Medication Management', 'Vital Signs', 'Wound Care', 'IV Therapy'].map((skill, idx) => (
                      <Badge key={idx} variant="outline" className="text-base py-1 px-3">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-gray-900 mb-2">Certifications</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700">Registered Nurse License</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700">CPR Certified</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700">Background Check Verified</span>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-gray-900 mb-1">Hourly Rate</h4>
                    <p className="text-green-900 text-2xl">{currencySymbol}55/hour</p>
                  </div>
                  <div>
                    <h4 className="text-gray-900 mb-1">Experience</h4>
                    <p className="text-gray-700">8 years</p>
                  </div>
                </div>

                <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-12">
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}