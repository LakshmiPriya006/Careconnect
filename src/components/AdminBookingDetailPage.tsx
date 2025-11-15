import { useEffect, useState } from 'react';
import { X, User, Mail, Phone, MapPin, Calendar, Clock, Star, MessageSquare, Edit, Trash2, UserX, UserPlus, Search, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { CurrencyIcon } from './CurrencyIcon';
import { admin } from '../utils/api';
import { toast } from 'sonner';
import { useCurrency } from '../utils/currency';

interface AdminBookingDetailPageProps {
  bookingId: string;
  onClose: () => void;
}

export function AdminBookingDetailPage({ bookingId, onClose }: AdminBookingDetailPageProps) {
  const { currencySymbol } = useCurrency();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    loadBookingDetails();
  }, [bookingId]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = providers.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        p.specialty?.toLowerCase().includes(query)
      );
      setFilteredProviders(filtered);
    } else {
      setFilteredProviders(providers);
    }
  }, [searchQuery, providers]);

  const loadBookingDetails = async () => {
    try {
      setLoading(true);
      const response = await admin.getBookingById(bookingId);
      console.log('📋 Booking details loaded:', response);
      setBooking(response.booking);
    } catch (error: any) {
      console.error('Error loading booking details:', error);
      toast.error(error.message || 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const response = await admin.getAllProviders();
      // Filter to approved providers only
      const approvedProviders = response.providers.filter(
        (p: any) => p.verificationStatus === 'approved' && !p.blacklisted
      );
      setProviders(approvedProviders);
      setFilteredProviders(approvedProviders);
    } catch (error: any) {
      console.error('Error loading providers:', error);
      toast.error('Failed to load providers');
    }
  };

  const handleRemoveProvider = async () => {
    if (!confirm('Are you sure you want to remove the current provider from this booking? The booking will return to pending status.')) {
      return;
    }

    setRemoving(true);
    try {
      await admin.removeProviderFromBooking(bookingId);
      toast.success('Provider removed from booking successfully');
      await loadBookingDetails();
    } catch (error: any) {
      console.error('Error removing provider:', error);
      toast.error(error.message || 'Failed to remove provider');
    } finally {
      setRemoving(false);
    }
  };

  const handleReassignProvider = async () => {
    if (!selectedProviderId) {
      toast.error('Please select a provider');
      return;
    }

    if (!confirm('Are you sure you want to reassign this booking to the selected provider?')) {
      return;
    }

    setReassigning(true);
    try {
      await admin.reassignBookingToProvider(bookingId, selectedProviderId);
      toast.success('Booking reassigned successfully');
      setShowReassignDialog(false);
      await loadBookingDetails();
    } catch (error: any) {
      console.error('Error reassigning provider:', error);
      toast.error(error.message || 'Failed to reassign provider');
    } finally {
      setReassigning(false);
    }
  };

  const openReassignDialog = () => {
    setShowReassignDialog(true);
    setSelectedProviderId('');
    setSearchQuery('');
    loadProviders();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      accepted: { label: 'Accepted', className: 'bg-blue-100 text-blue-800 border-blue-300' },
      upcoming: { label: 'Upcoming', className: 'bg-blue-100 text-blue-800 border-blue-300' },
      'in-progress': { label: 'In Progress', className: 'bg-purple-100 text-purple-800 border-purple-300' },
      completed: { label: 'Completed', className: 'bg-green-100 text-green-800 border-green-300' },
      cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800 border-red-300' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800 border-gray-300' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Booking not found</p>
          <Button onClick={onClose}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl text-purple-900">Booking Details</h1>
                <p className="text-sm text-gray-600">ID: {booking.id}</p>
              </div>
            </div>
            {getStatusBadge(booking.status)}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Admin Creation Badge */}
            {(booking.createdBy === 'admin' || booking.adminId) && (
              <Card className="border-2 border-purple-200 bg-purple-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-purple-900">
                        <strong>Created by Admin:</strong> {booking.adminName || 'Administrator'}
                      </p>
                      <p className="text-sm text-purple-700">
                        This booking was created by an administrator on behalf of the client
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{booking.clientName}</p>
                      {booking.clientEmail && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <Mail className="w-4 h-4" />
                          <span>{booking.clientEmail}</span>
                        </div>
                      )}
                      {booking.clientPhone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <Phone className="w-4 h-4" />
                          <span>{booking.clientPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Provider Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-green-600" />
                    Provider Information
                  </div>
                  {booking.provider && (booking.status === 'accepted' || booking.status === 'upcoming' || booking.status === 'in-progress') && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openReassignDialog}
                        className="flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        Reassign
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveProvider}
                        disabled={removing}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      >
                        <UserX className="w-4 h-4" />
                        {removing ? 'Removing...' : 'Remove'}
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {booking.provider ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{booking.provider.name}</p>
                        <p className="text-sm text-gray-600">{booking.provider.specialty || 'Provider'}</p>
                        {booking.provider.rating > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm text-gray-700">{booking.provider.rating}</span>
                            <span className="text-xs text-gray-500">({booking.provider.reviewCount} reviews)</span>
                          </div>
                        )}
                        {booking.provider.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <Mail className="w-4 h-4" />
                            <span>{booking.provider.email}</span>
                          </div>
                        )}
                        {booking.provider.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <Phone className="w-4 h-4" />
                            <span>{booking.provider.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                    <p className="text-yellow-900">No provider assigned</p>
                    <p className="text-sm text-yellow-700 mt-1">Waiting for a provider to accept this request</p>
                    {booking.status === 'pending' && (
                      <Button
                        onClick={openReassignDialog}
                        className="mt-3 bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Assign Provider
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Service Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  Service Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-600">Service Type</Label>
                    <p className="text-gray-900 mt-1">{booking.serviceTitle || booking.serviceType}</p>
                  </div>

                  <Separator />

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-600">Booking Type</Label>
                      <p className="text-gray-900 mt-1">
                        {booking.bookingType === 'immediate' ? 'Immediate Service' : 'Scheduled'}
                      </p>
                    </div>
                    {booking.scheduledDate && (
                      <div>
                        <Label className="text-gray-600">Scheduled Date</Label>
                        <p className="text-gray-900 mt-1">{booking.scheduledDate}</p>
                      </div>
                    )}
                  </div>

                  {booking.scheduledTime && (
                    <div>
                      <Label className="text-gray-600">Scheduled Time</Label>
                      <p className="text-gray-900 mt-1">
                        {booking.scheduledTime.charAt(0).toUpperCase() + booking.scheduledTime.slice(1)}
                      </p>
                    </div>
                  )}

                  {booking.duration && (
                    <div>
                      <Label className="text-gray-600">Duration</Label>
                      <p className="text-gray-900 mt-1">{booking.duration} hour(s)</p>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <Label className="text-gray-600">Location</Label>
                    <div className="flex items-start gap-2 mt-1">
                      <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-gray-900">{booking.location || booking.recipientAddress}</p>
                    </div>
                  </div>

                  {booking.estimatedCost > 0 && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-gray-600">Estimated Cost</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <CurrencyIcon className="w-5 h-5 text-green-600" />
                          <p className="text-gray-900 text-lg">{currencySymbol}{booking.estimatedCost}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {booking.urgency && booking.urgency !== 'normal' && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-gray-600">Urgency</Label>
                        <Badge className="bg-orange-100 text-orange-800 border-orange-300 mt-1">
                          {booking.urgency}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recipient Information (if applicable) */}
            {(booking.requestFor === 'other' || booking.requestForSomeoneElse) && booking.recipientName && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-orange-600" />
                    Service Recipient
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-2">
                    <p className="text-blue-900 font-medium">{booking.recipientName}</p>
                    {booking.recipientPhone && (
                      <div className="flex items-center gap-2 text-sm text-blue-700">
                        <Phone className="w-4 h-4" />
                        <span>{booking.recipientPhone}</span>
                      </div>
                    )}
                    {booking.recipientAddress && booking.recipientAddress !== booking.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{booking.recipientAddress}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional Details */}
            {booking.additionalDetails && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-gray-600" />
                    Additional Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{booking.additionalDetails}</p>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {booking.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-gray-600" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{booking.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Timestamps */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <Label className="text-gray-600">Created</Label>
                  <p className="text-gray-900 mt-1">
                    {new Date(booking.createdAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                {booking.acceptedAt && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-gray-600">Accepted</Label>
                      <p className="text-gray-900 mt-1">
                        {new Date(booking.acceptedAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </>
                )}
                {booking.completedAt && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-gray-600">Completed</Label>
                      <p className="text-gray-900 mt-1">
                        {new Date(booking.completedAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Preferences */}
            {(booking.providerGenderPreference !== 'no-preference' || booking.providerLanguagePreference !== 'no-preference') && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {booking.providerGenderPreference !== 'no-preference' && (
                    <div>
                      <Label className="text-gray-600">Gender</Label>
                      <p className="text-gray-900 mt-1 capitalize">{booking.providerGenderPreference}</p>
                    </div>
                  )}
                  {booking.providerLanguagePreference !== 'no-preference' && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-gray-600">Language</Label>
                        <p className="text-gray-900 mt-1 capitalize">{booking.providerLanguagePreference}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Review (if completed) */}
            {booking.status === 'completed' && booking.userRating && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Client Review</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= booking.userRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  {booking.userReview && (
                    <p className="text-gray-700 text-sm">{booking.userReview}</p>
                  )}
                  {booking.ratedAt && (
                    <p className="text-xs text-gray-500">
                      Posted on {new Date(booking.ratedAt).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Reassign Provider Dialog */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {booking.provider ? 'Reassign Provider' : 'Assign Provider'}
            </DialogTitle>
            <DialogDescription>
              {booking.provider 
                ? 'Select a new provider to handle this booking. The current provider will be removed.'
                : 'Select a provider to handle this booking.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search providers by name, email, or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Provider List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredProviders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No approved providers found
                </div>
              ) : (
                filteredProviders.map((provider) => (
                  <Card
                    key={provider.id}
                    className={`cursor-pointer border-2 transition-all ${
                      selectedProviderId === provider.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => setSelectedProviderId(provider.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-green-100 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{provider.name}</p>
                          <p className="text-sm text-gray-600 truncate">{provider.specialty || 'Provider'}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {provider.rating > 0 && (
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm text-gray-700">{provider.rating}</span>
                              </div>
                            )}
                            <span className="text-xs text-gray-500">{provider.email}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowReassignDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReassignProvider}
                disabled={!selectedProviderId || reassigning}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {reassigning ? 'Assigning...' : (booking.provider ? 'Reassign Provider' : 'Assign Provider')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
