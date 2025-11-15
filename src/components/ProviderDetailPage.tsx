import { useEffect, useState } from 'react';
import { X, User, Mail, Phone, MapPin, Calendar, Award, FileText, CheckCircle, XCircle, Clock, DollarSign, Star, MessageSquare, Ban, Edit, Wrench } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { AdminVerificationReview } from './AdminVerificationReview';
import { client, admin } from '../utils/api';
import { toast } from 'sonner';
import { useCurrency } from '../utils/currency';

interface ProviderDetailPageProps {
  providerId: string;
  onClose: () => void;
  onApprove?: (providerId: string) => void;
  onReject?: (providerId: string) => void;
  onContact?: (providerId: string) => void;
  onBlacklist?: (providerId: string) => void;
  onRemoveBlacklist?: (providerId: string) => void;
  onUnapprove?: (providerId: string) => void;
  onEdit?: (providerId: string) => void;
}

export function ProviderDetailPage({ 
  providerId, 
  onClose, 
  onApprove, 
  onReject,
  onContact,
  onBlacklist,
  onRemoveBlacklist,
  onUnapprove,
  onEdit
}: ProviderDetailPageProps) {
  const { currencySymbol } = useCurrency();
  const [providerData, setProviderData] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviderDetails();
  }, [providerId]);

  const loadProviderDetails = async () => {
    try {
      setLoading(true);
      const response = await client.getProviderById(providerId);
      setProviderData(response.provider);
      setJobs(response.jobs || []);
      setReviews(response.reviews || []);
    } catch (err) {
      console.error('Error loading provider details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFixVerification = async () => {
    try {
      await admin.fixProviderVerification(providerId);
      toast.success('Verification fixed successfully');
      loadProviderDetails();
    } catch (err) {
      console.error('Error fixing verification:', err);
      toast.error('Failed to fix verification');
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="p-12 text-center">
          <p className="text-gray-600">Loading provider details...</p>
        </CardContent>
      </Card>
    );
  }

  if (!providerData) {
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="p-12 text-center">
          <p className="text-gray-600">Provider not found</p>
          <Button onClick={onClose} className="mt-4">Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  // If verification is pending, show the AdminVerificationReview component
  if (providerData.verificationStatus === 'pending') {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader className="bg-yellow-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-yellow-600" />
                <div>
                  <CardTitle className="text-yellow-900">Provider Verification Review</CardTitle>
                  <p className="text-sm text-yellow-700 mt-1">Review all verification stages to approve this provider</p>
                </div>
              </div>
              <Button variant="outline" onClick={onClose}>
                <X className="w-5 h-5 mr-2" />
                Back to List
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <AdminVerificationReview 
              providerId={providerId} 
              onBack={onClose}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Otherwise, show the summary view
  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      approved: { variant: 'default', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
      pending: { variant: 'secondary', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
      rejected: { variant: 'destructive', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
      blacklisted: { variant: 'destructive', icon: Ban, color: 'text-red-600', bg: 'bg-red-100' },
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const completedJobs = jobs.filter(j => j.status === 'completed');
  const totalEarnings = completedJobs.reduce((sum, job) => sum + (job.amount || 0), 0);
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="w-full max-w-6xl mx-auto">
      <Card className="shadow-xl">
        <CardHeader className="bg-green-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-green-900">Provider Details</CardTitle>
              {getStatusBadge(providerData.verificationStatus)}
            </div>
            <Button variant="outline" onClick={onClose}>
              <X className="w-5 h-5 mr-2" />
              Back to List
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Provider Info Section */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <Card className="border-2 border-green-200">
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500">Provider ID</p>
                  <p className="text-sm font-mono text-gray-900">{providerData.id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{providerData.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{providerData.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{providerData.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Specialty</p>
                    <p className="font-medium">{providerData.specialty}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Joined</p>
                    <p className="font-medium">
                      {new Date(providerData.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Summary */}
            <div className="space-y-4">
              <Card className="border-2 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Jobs</p>
                      <p className="text-3xl font-bold text-blue-900">{completedJobs.length}</p>
                    </div>
                    <FileText className="w-10 h-10 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Earnings</p>
                      <p className="text-3xl font-bold text-green-900">{currencySymbol}{totalEarnings.toLocaleString()}</p>
                    </div>
                    <DollarSign className="w-10 h-10 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-yellow-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Average Rating</p>
                      <div className="flex items-center gap-2">
                        <p className="text-3xl font-bold text-yellow-900">
                          {averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}
                        </p>
                        {averageRating > 0 && <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{reviews.length} reviews</p>
                    </div>
                    <Star className="w-10 h-10 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            {onContact && (
              <Button onClick={() => onContact(providerId)} variant="outline">
                <Mail className="w-4 h-4 mr-2" />
                Contact Provider
              </Button>
            )}
            {onEdit && (
              <Button onClick={() => onEdit(providerId)} variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit Details
              </Button>
            )}
            {onApprove && providerData.verificationStatus !== 'approved' && providerData.verificationStatus !== 'blacklisted' && (
              <Button onClick={() => onApprove(providerId)} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
            )}
            {onUnapprove && providerData.verificationStatus === 'approved' && (
              <Button onClick={() => onUnapprove(providerId)} variant="outline">
                <XCircle className="w-4 h-4 mr-2" />
                Unapprove
              </Button>
            )}
            {onReject && providerData.verificationStatus === 'pending' && (
              <Button onClick={() => onReject(providerId)} variant="destructive">
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            )}
            {onBlacklist && providerData.verificationStatus !== 'blacklisted' && (
              <Button onClick={() => onBlacklist(providerId)} variant="destructive">
                <Ban className="w-4 h-4 mr-2" />
                Blacklist
              </Button>
            )}
            {onRemoveBlacklist && providerData.verificationStatus === 'blacklisted' && (
              <Button onClick={() => onRemoveBlacklist(providerId)} className="bg-orange-600 hover:bg-orange-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Remove Blacklist
              </Button>
            )}
            {providerData.verificationStatus === 'approved' && (
              <Button onClick={handleFixVerification} variant="outline" className="text-blue-600">
                <Wrench className="w-4 h-4 mr-2" />
                Fix Verification
              </Button>
            )}
          </div>

          {/* Detailed Tabs */}
          <Tabs defaultValue="jobs" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="jobs">Job History</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="verification">Verification</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            {/* Jobs Tab */}
            <TabsContent value="jobs" className="space-y-4 mt-4">
              {jobs.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-gray-500">
                    No jobs yet
                  </CardContent>
                </Card>
              ) : (
                jobs.map((job) => (
                  <Card key={job.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{job.serviceTitle || job.serviceType}</h4>
                            <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>
                              {job.status}
                            </Badge>
                          </div>
                          
                          {/* Booking ID */}
                          <p className="text-xs text-gray-500 font-mono">Booking ID: {job.id}</p>
                          
                          {/* Client Info */}
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Client:</span> {job.clientName || 'Unknown'}
                          </p>
                          
                          {job.description && (
                            <p className="text-sm text-gray-600">{job.description}</p>
                          )}
                          
                          <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {job.scheduledDate 
                                ? new Date(job.scheduledDate).toLocaleDateString()
                                : new Date(job.createdAt).toLocaleDateString()
                              }
                              {job.scheduledTime && ` at ${job.scheduledTime}`}
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-green-600" />
                              <span className="text-green-900">{currencySymbol}{job.estimatedCost || job.amount || 0}</span>
                            </div>
                            {job.location && (
                              <div className="flex items-center gap-1 col-span-2">
                                <MapPin className="w-4 h-4" />
                                {job.location}
                              </div>
                            )}
                          </div>
                          
                          {/* Timestamps */}
                          <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
                            {job.acceptedAt && (
                              <div>Accepted: {new Date(job.acceptedAt).toLocaleString()}</div>
                            )}
                            {job.startedAt && (
                              <div>Started: {new Date(job.startedAt).toLocaleString()}</div>
                            )}
                            {job.completedAt && (
                              <div>Completed: {new Date(job.completedAt).toLocaleString()}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews" className="space-y-4 mt-4">
              {reviews.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No reviews yet</p>
                  </CardContent>
                </Card>
              ) : (
                reviews.map((review, index) => (
                  <Card key={index} className="border-l-4 border-l-yellow-500">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Rating Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-5 h-5 ${
                                    i < review.rating
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="font-medium">{review.rating}/5</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {/* Client and Service */}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          <span className="font-medium">{review.clientName}</span>
                          {review.serviceType && (
                            <>
                              <span>•</span>
                              <Badge variant="secondary">{review.serviceType}</Badge>
                            </>
                          )}
                        </div>
                        
                        {/* Review Text */}
                        {(review.review || review.comment) && (
                          <div className="pt-2 border-t">
                            <p className="text-sm text-gray-700 italic">
                              "{review.review || review.comment}"
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Verification Tab */}
            <TabsContent value="verification" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="bg-blue-50">
                  <CardTitle className="text-lg text-blue-900">Verification Status & History</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <AdminVerificationReview 
                    providerId={providerId} 
                    embedded={true}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Verification Documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {providerData.idDocument && (
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">ID Document</span>
                      </div>
                      <a 
                        href={providerData.idDocument} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View Document →
                      </a>
                    </div>
                  )}
                  {providerData.certification && (
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-5 h-5 text-green-600" />
                        <span className="font-medium">Certification</span>
                      </div>
                      <a 
                        href={providerData.certification} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View Document →
                      </a>
                    </div>
                  )}
                  {!providerData.idDocument && !providerData.certification && (
                    <p className="text-sm text-gray-500 text-center py-4">No documents uploaded</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}