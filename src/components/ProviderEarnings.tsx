import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Star, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { provider, client } from '../utils/api';
import { toast } from 'sonner';
import { useCurrency } from '../utils/currency';

interface Job {
  id: string;
  serviceType: string;
  serviceTitle?: string;
  clientName: string;
  estimatedCost: number;
  basePrice?: number;
  minimumHours?: number;
  scheduledDate: string;
  status: string;
  createdAt: string;
  rating?: number;
  tip?: number;
  completedAt?: string;
}

interface Service {
  id: string;
  title: string;
  platformFeePercentage?: number;
}

export function ProviderEarnings() {
  const { currencySymbol } = useCurrency();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load provider bookings and services in parallel
      const [bookingsResponse, servicesResponse] = await Promise.all([
        provider.getBookings(),
        client.getServices()
      ]);

      console.log('Loaded bookings:', bookingsResponse.bookings);
      console.log('Loaded services:', servicesResponse.services);

      setJobs(bookingsResponse.bookings || []);
      setServices(servicesResponse.services || []);
    } catch (error: any) {
      console.error('Error loading earnings data:', error);
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate platform fee and net payout for a job
  const calculateEarnings = (job: Job) => {
    const totalAmount = job.estimatedCost || 0;
    
    // Find the service to get platform fee percentage
    const service = services.find(s => 
      s.id === job.serviceType || s.title === job.serviceTitle
    );
    
    const platformFeePercentage = service?.platformFeePercentage || 0;
    const platformFee = (totalAmount * platformFeePercentage) / 100;
    const providerPayout = totalAmount - platformFee;

    return {
      totalAmount,
      platformFeePercentage,
      platformFee,
      providerPayout,
      tip: job.tip || 0,
      netEarnings: providerPayout + (job.tip || 0)
    };
  };

  // Filter completed jobs
  const completedJobs = jobs.filter(j => j.status === 'completed');

  // Calculate totals
  const totals = completedJobs.reduce(
    (acc, job) => {
      const earnings = calculateEarnings(job);
      return {
        totalRevenue: acc.totalRevenue + earnings.totalAmount,
        totalPlatformFees: acc.totalPlatformFees + earnings.platformFee,
        totalProviderPayout: acc.totalProviderPayout + earnings.providerPayout,
        totalTips: acc.totalTips + earnings.tip,
        netEarnings: acc.netEarnings + earnings.netEarnings
      };
    },
    {
      totalRevenue: 0,
      totalPlatformFees: 0,
      totalProviderPayout: 0,
      totalTips: 0,
      netEarnings: 0
    }
  );

  // Calculate weekly earnings (last 7 days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const weeklyJobs = completedJobs.filter(j => {
    const jobDate = new Date(j.completedAt || j.scheduledDate || j.createdAt);
    return jobDate >= oneWeekAgo;
  });

  const weeklyEarnings = weeklyJobs.reduce((sum, job) => {
    const earnings = calculateEarnings(job);
    return sum + earnings.netEarnings;
  }, 0);

  // Calculate monthly earnings (last 30 days)
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  
  const monthlyJobs = completedJobs.filter(j => {
    const jobDate = new Date(j.completedAt || j.scheduledDate || j.createdAt);
    return jobDate >= oneMonthAgo;
  });

  const monthlyEarnings = monthlyJobs.reduce((sum, job) => {
    const earnings = calculateEarnings(job);
    return sum + earnings.netEarnings;
  }, 0);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time-Based Earnings Statistics */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-2 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">This Week</p>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-blue-900 text-3xl mb-1">{currencySymbol}{weeklyEarnings.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Last 7 days • {weeklyJobs.length} jobs</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">This Month</p>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-purple-900 text-3xl mb-1">{currencySymbol}{monthlyEarnings.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Last 30 days • {monthlyJobs.length} jobs</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Total Earned</p>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-green-900 text-3xl mb-1">{currencySymbol}{totals.netEarnings.toFixed(2)}</p>
            <p className="text-xs text-gray-500">All time • {completedJobs.length} jobs</p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Summary */}
      <Card className="border-2 border-green-200">
        <CardHeader className="bg-green-50">
          <CardTitle className="text-green-900">Earnings Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              <p className="text-gray-600 text-sm mb-1">Total Service Revenue</p>
              <p className="text-gray-900 text-3xl">{currencySymbol}{totals.totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">From {completedJobs.length} completed jobs</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
              <p className="text-orange-900 text-sm mb-1">Platform Fees Deducted</p>
              <p className="text-orange-900 text-3xl">-{currencySymbol}{totals.totalPlatformFees.toFixed(2)}</p>
              <p className="text-xs text-orange-700 mt-1">Varies by service type</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
              <p className="text-green-900 text-sm mb-1">Your Net Earnings</p>
              <p className="text-green-900 text-3xl">{currencySymbol}{totals.totalProviderPayout.toFixed(2)}</p>
              {totals.totalTips > 0 && (
                <p className="text-sm text-green-600 mt-1">+{currencySymbol}{totals.totalTips.toFixed(2)} in tips</p>
              )}
            </div>
          </div>

          {totals.totalTips > 0 && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-900">Total with Tips</p>
                  <p className="text-sm text-blue-700">Your take-home amount including tips</p>
                </div>
                <p className="text-blue-900 text-3xl">{currencySymbol}{totals.netEarnings.toFixed(2)}</p>
              </div>
            </div>
          )}

          <Alert className="mb-6">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Platform fees vary by service type and are set by the admin. The percentage is deducted from each service payment before calculating your payout.
            </AlertDescription>
          </Alert>

          <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-12">
            <DollarSign className="w-5 h-5 mr-2" />
            Withdraw Earnings
          </Button>
        </CardContent>
      </Card>

      {/* Recent Jobs with Fee Breakdown */}
      <div>
        <h3 className="text-green-900 mb-4">Recent Completed Jobs</h3>
        <div className="space-y-4">
          {completedJobs.length === 0 ? (
            <Card className="border-2 border-gray-200">
              <CardContent className="p-12 text-center">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No completed jobs yet</p>
                <p className="text-sm text-gray-500 mt-1">Earnings will appear here once you complete jobs</p>
              </CardContent>
            </Card>
          ) : (
            completedJobs.slice(0, 10).map((job) => {
              const earnings = calculateEarnings(job);
              
              return (
                <Card key={job.id} className="border-2 border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-gray-900 mb-1">{job.serviceTitle || job.serviceType}</h4>
                        <p className="text-gray-600 text-sm">Client: {job.clientName}</p>
                        <p className="text-sm text-gray-500 mt-1">{formatDate(job.scheduledDate || job.createdAt)}</p>
                        {job.rating && (
                          <div className="flex items-center gap-1 mt-2">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < job.rating!
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-sm text-gray-600">
                          <p>Service: {currencySymbol}{earnings.totalAmount.toFixed(2)}</p>
                          {earnings.platformFeePercentage > 0 && (
                            <p className="text-orange-600">
                              Fee ({earnings.platformFeePercentage}%): -{currencySymbol}{earnings.platformFee.toFixed(2)}
                            </p>
                          )}
                        </div>
                        <div className="pt-2 border-t">
                          <p className="text-green-900 text-xl">{currencySymbol}{earnings.providerPayout.toFixed(2)}</p>
                          {earnings.tip > 0 && (
                            <p className="text-sm text-green-600 mt-1">+{currencySymbol}{earnings.tip.toFixed(2)} tip</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}