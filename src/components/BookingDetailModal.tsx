import React, { useState } from 'react';
import { X, User, Calendar, Clock, MapPin, Star, Phone, Mail, Edit2, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { CurrencyIcon } from './CurrencyIcon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { client } from '../utils/api';

interface BookingDetailModalProps {
  booking: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookAgain?: (booking: any) => void;
  onRatingSubmit?: () => void;
  onCancel?: () => void;
}

export function BookingDetailModal({ booking, open, onOpenChange, onBookAgain, onRatingSubmit, onCancel }: BookingDetailModalProps) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);

  // Reset form when booking changes or modal opens
  React.useEffect(() => {
    if (booking && open) {
      setRating(booking.userRating || 0);
      setReview(booking.userReview || '');
      setIsEditingReview(false);
      setIsFavorite(booking.isFavorite || false);
    }
  }, [booking?.id, open]);

  if (!booking) return null;

  const handleToggleFavorite = async () => {
    if (!booking.provider?.id) {
      toast.error('Cannot add to favorites: Provider not found');
      return;
    }

    setTogglingFavorite(true);
    try {
      if (isFavorite) {
        await client.removeFavorite(booking.provider.id);
        toast.success('Provider removed from favorites');
        setIsFavorite(false);
      } else {
        await client.addFavorite(booking.provider.id);
        toast.success('Provider added to favorites!');
        setIsFavorite(true);
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error(error.message || 'Failed to update favorites');
    } finally {
      setTogglingFavorite(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!confirm('Are you sure you want to cancel this service request?')) {
      return;
    }
    
    setCancelling(true);
    try {
      await client.cancelRequest(booking.id);
      toast.success('Service request cancelled successfully');
      
      // Update the booking in the UI
      booking.status = 'cancelled';
      
      // Notify parent to reload data
      if (onCancel) {
        onCancel();
      }
      
      // Wait a moment before closing
      await new Promise(resolve => setTimeout(resolve, 500));
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      toast.error(error.message || 'Failed to cancel request. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitReview = async () => {
    setSubmittingReview(true);
    try {
      await client.submitRating(booking.id, rating, review);
      const message = isEditingReview ? 'Review updated successfully!' : 'Thank you for your review!';
      toast.success(message);
      
      // Update the booking in the UI
      booking.userRating = rating;
      booking.userReview = review;
      if (!booking.ratedAt) {
        booking.ratedAt = new Date().toISOString();
      }
      booking.lastEditedAt = new Date().toISOString();
      
      setIsEditingReview(false);
      
      // Notify parent to reload data
      if (onRatingSubmit) {
        onRatingSubmit();
      }
      
      // Wait a moment before closing if it's a new review
      if (!isEditingReview) {
        await new Promise(resolve => setTimeout(resolve, 500));
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error(error.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const canReview = booking.status === 'completed' && !booking.userRating;
  const hasReview = booking.status === 'completed' && booking.userRating;
  
  // Check if review can be edited (within 7 days)
  const canEditReview = hasReview && booking.ratedAt && (() => {
    const ratedDate = new Date(booking.ratedAt);
    const now = new Date();
    const daysSinceRating = (now.getTime() - ratedDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceRating <= 7;
  })();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Pending</Badge>;
      case 'accepted':
      case 'upcoming':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Upcoming</Badge>;
      case 'in-progress':
        return <Badge className="bg-purple-100 text-purple-700 border-purple-300">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 border-green-300">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700 border-red-300">Cancelled</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-blue-900 flex items-center justify-between">
            Booking Details
            {getStatusBadge(booking.status)}
          </DialogTitle>
          <DialogDescription>
            View detailed information about this booking and take actions like canceling or rating the service.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking ID */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">Booking ID</p>
            <p className="text-sm font-mono text-gray-900">{booking.id}</p>
          </div>

          {/* Show if booking was created by admin */}
          {(booking.createdBy === 'admin' || booking.adminId) && (
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3">
              <p className="text-sm text-purple-900 flex items-center gap-2">
                <User className="w-4 h-4" />
                <strong>Booked by Admin:</strong> {booking.adminName || 'Administrator'}
              </p>
              <p className="text-xs text-purple-700 mt-1">
                This booking was created by an administrator on behalf of the client
              </p>
            </div>
          )}

          {/* Provider Information */}
          {booking.provider ? (
            <div>
              <h4 className="text-gray-900 mb-3">Provider Information</h4>
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-gray-900">{booking.provider.name}</h4>
                  <p className="text-gray-600">{booking.serviceTitle || booking.serviceType}</p>
                  {booking.provider.rating > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-gray-700">{booking.provider.rating}</span>
                      <span className="text-gray-500 text-sm">({booking.provider.reviewCount} reviews)</span>
                    </div>
                  )}
                  {booking.provider.phone && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{booking.provider.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h4 className="text-gray-900 mb-3">Service Request</h4>
              <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <p className="text-yellow-900">Waiting for a provider to accept this request</p>
                <p className="text-sm text-yellow-700 mt-1">{booking.serviceTitle || booking.serviceType}</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Service Details */}
          <div>
            <h4 className="text-gray-900 mb-3">Service Details</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-700">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>
                  {booking.bookingType === 'immediate' 
                    ? 'Immediate Service' 
                    : booking.scheduledDate || new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              {booking.scheduledTime && (
                <div className="flex items-center gap-3 text-gray-700">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span>{booking.scheduledTime.charAt(0).toUpperCase() + booking.scheduledTime.slice(1)}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-gray-500 text-sm">
                <Clock className="w-5 h-5 text-gray-400" />
                <span>Booked on: {new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span>{booking.location}</span>
              </div>
              {booking.estimatedCost > 0 && (
                <div className="flex items-center gap-3 text-gray-700">
                  <CurrencyIcon className="w-5 h-5 text-green-600" />
                  <span className="text-green-900">{booking.estimatedCost}</span>
                </div>
              )}
            </div>
          </div>

          {/* Recipient Information (if applicable) */}
          {(booking.requestFor === 'other' || booking.requestForSomeoneElse) && booking.recipientName && (
            <>
              <Separator />
              <div>
                <h4 className="text-gray-900 mb-3">Service Recipient</h4>
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <p className="text-blue-900">{booking.recipientName}</p>
                  {booking.recipientPhone && (
                    <p className="text-sm text-blue-700 mt-1">{booking.recipientPhone}</p>
                  )}
                  {booking.recipientAddress && (
                    <p className="text-sm text-gray-600 mt-2">{booking.recipientAddress}</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Additional Details */}
          {booking.additionalDetails && (
            <>
              <Separator />
              <div>
                <h4 className="text-gray-900 mb-2">Additional Details</h4>
                <p className="text-gray-600 p-3 bg-gray-50 rounded-lg">{booking.additionalDetails}</p>
              </div>
            </>
          )}

          {/* Preferences */}
          {(booking.providerGenderPreference !== 'no-preference' || booking.providerLanguagePreference !== 'no-preference') && (
            <>
              <Separator />
              <div>
                <h4 className="text-gray-900 mb-2">Preferences</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  {booking.providerGenderPreference !== 'no-preference' && (
                    <p>• Gender preference: {booking.providerGenderPreference}</p>
                  )}
                  {booking.providerLanguagePreference !== 'no-preference' && (
                    <p>• Language preference: {booking.providerLanguagePreference}</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Existing Review (if completed and reviewed) */}
          {hasReview && !isEditingReview && (
            <>
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-gray-900">Your Review</h4>
                  {canEditReview && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingReview(true)}
                      className="flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Review
                    </Button>
                  )}
                </div>
                <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-1 mb-2">
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
                    <p className="text-gray-700 mb-2">{booking.userReview}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Posted on {new Date(booking.ratedAt).toLocaleDateString()}
                    {booking.lastEditedAt && booking.lastEditedAt !== booking.ratedAt && (
                      <span> • Edited on {new Date(booking.lastEditedAt).toLocaleDateString()}</span>
                    )}
                  </p>
                  {!canEditReview && booking.ratedAt && (() => {
                    const ratedDate = new Date(booking.ratedAt);
                    const now = new Date();
                    const daysSinceRating = (now.getTime() - ratedDate.getTime()) / (1000 * 60 * 60 * 24);
                    if (daysSinceRating > 7) {
                      return (
                        <p className="text-xs text-gray-400 mt-1">
                          Review can no longer be edited (posted {Math.floor(daysSinceRating)} days ago)
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </>
          )}

          {/* Review Form (if completed but not reviewed, OR editing) */}
          {(canReview || isEditingReview) && (
            <>
              <Separator />
              <div>
                <h4 className="text-gray-900 mb-3">
                  {isEditingReview ? 'Edit Your Review' : 'Rate Your Experience'}
                </h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Rating</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-8 h-8 ${
                              star <= rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="review">Your Review (Optional)</Label>
                    <Textarea
                      id="review"
                      placeholder="Share your experience with this provider..."
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      className="min-h-24"
                    />
                  </div>
                  <div className="flex gap-3">
                    {isEditingReview && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setRating(booking.userRating || 0);
                          setReview(booking.userReview || '');
                          setIsEditingReview(false);
                        }}
                        className="flex-1 h-12"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      onClick={handleSubmitReview}
                      disabled={rating === 0 || submittingReview}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12"
                    >
                      {submittingReview ? 'Saving...' : (isEditingReview ? 'Update Review' : 'Submit Review')}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {/* Cancel Button - Show for pending, accepted, or upcoming requests */}
            {(booking.status === 'pending' || booking.status === 'accepted' || booking.status === 'upcoming' || booking.status === 'in-progress') && (
              <Button
                variant="outline"
                className="flex-1 h-12 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={handleCancelRequest}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Request'}
              </Button>
            )}
            {/* Add/Remove Favorite & Book Again - Show for completed requests */}
            {booking.status === 'completed' && booking.provider && (
              <>
                <Button
                  variant="outline"
                  className="flex-1 h-12 flex items-center justify-center gap-2"
                  onClick={handleToggleFavorite}
                  disabled={togglingFavorite}
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  {togglingFavorite ? 'Updating...' : (isFavorite ? 'Remove from Favorites' : 'Add to Favorites')}
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12"
                  onClick={() => {
                    if (onBookAgain) {
                      onBookAgain(booking);
                    }
                    onOpenChange(false);
                  }}
                >
                  Book Again
                </Button>
              </>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full h-12"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}