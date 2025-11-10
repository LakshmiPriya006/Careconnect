import { useState, useEffect } from 'react';
import { Star, Eye, EyeOff, Trash2, User, Calendar, MessageSquare, AlertCircle, Mail, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { admin } from '../utils/api';
import { toast } from 'sonner';
import { useCurrency } from '../utils/currency';

interface Review {
  id: string;
  bookingId: string;
  rating: number;
  review: string;
  clientId: string;
  clientName: string;
  providerId: string;
  providerName: string;
  serviceType?: string;
  serviceTitle?: string;
  location?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  estimatedCost?: number;
  duration?: number;
  bookingType?: string;
  createdAt: string;
  hidden: boolean;
  hiddenAt?: string;
  hiddenBy?: string;
  hiddenReason?: string;
}

export function ReviewsManagement() {
  const { currencySymbol } = useCurrency();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden' | 'poor'>('all');

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await admin.getAllReviews();
      setReviews(data.reviews || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleHideReview = async (reviewId: string) => {
    const reason = prompt('Please enter reason for hiding this review (optional):');
    if (reason === null) return; // User cancelled
    
    try {
      await admin.hideReview(reviewId, reason || undefined);
      toast.success('Review hidden successfully');
      loadReviews();
    } catch (error) {
      console.error('Error hiding review:', error);
      toast.error('Failed to hide review');
    }
  };

  const handleUnhideReview = async (reviewId: string) => {
    try {
      await admin.unhideReview(reviewId);
      toast.success('Review is now visible');
      loadReviews();
    } catch (error) {
      console.error('Error unhiding review:', error);
      toast.error('Failed to unhide review');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to permanently delete this review? This action cannot be undone.')) {
      return;
    }

    try {
      await admin.deleteReview(reviewId);
      toast.success('Review deleted permanently');
      loadReviews();
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  const filteredReviews = reviews.filter(review => {
    if (filter === 'visible') return !review.hidden;
    if (filter === 'hidden') return review.hidden;
    if (filter === 'poor') return review.rating < 3;
    return true;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-gray-600">Loading reviews...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Reviews</p>
                <p className="text-4xl font-bold text-blue-900 mt-1">{reviews.length}</p>
              </div>
              <MessageSquare className="w-12 h-12 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Rating</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-4xl font-bold text-yellow-900">
                    {reviews.length > 0
                      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
                      : 'N/A'}
                  </p>
                  {reviews.length > 0 && (
                    <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
              </div>
              <Star className="w-12 h-12 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Poor Reviews</p>
                <p className="text-4xl font-bold text-red-900 mt-1">
                  {reviews.filter(r => r.rating < 3).length}
                </p>
              </div>
              <AlertTriangle className="w-12 h-12 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hidden Reviews</p>
                <p className="text-4xl font-bold text-purple-900 mt-1">
                  {reviews.filter(r => r.hidden).length}
                </p>
              </div>
              <EyeOff className="w-12 h-12 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-purple-900">Reviews Management</h3>
          <p className="text-gray-600">Manage client reviews and ratings</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All ({reviews.length})
          </Button>
          <Button
            variant={filter === 'visible' ? 'default' : 'outline'}
            onClick={() => setFilter('visible')}
          >
            Visible ({reviews.filter(r => !r.hidden).length})
          </Button>
          <Button
            variant={filter === 'hidden' ? 'default' : 'outline'}
            onClick={() => setFilter('hidden')}
          >
            Hidden ({reviews.filter(r => r.hidden).length})
          </Button>
          <Button
            variant={filter === 'poor' ? 'default' : 'outline'}
            onClick={() => setFilter('poor')}
          >
            Poor ({reviews.filter(r => r.rating < 3).length})
          </Button>
        </div>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No reviews found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <Card
              key={review.id}
              className={`border-l-4 ${
                review.hidden
                  ? 'border-l-red-500 bg-red-50/50'
                  : 'border-l-yellow-500'
              }`}
            >
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {/* Rating */}
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
                      {review.rating < 3 && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Poor Rating
                        </Badge>
                      )}
                      {review.hidden && (
                        <Badge variant="destructive" className="gap-1">
                          <EyeOff className="w-3 h-3" />
                          Hidden
                        </Badge>
                      )}
                    </div>

                    {/* Client & Provider Info */}
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>By: {review.clientName}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <span>For: {review.providerName}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Review Text */}
                    {review.review && (
                      <p className="text-gray-700 mb-3">{review.review}</p>
                    )}

                    {/* Job Details */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                      <p className="text-xs text-gray-500 mb-2">Booking Details</p>
                      <div className="grid md:grid-cols-2 gap-2 text-sm">
                        {review.serviceTitle && (
                          <div>
                            <span className="text-gray-500">Service:</span>
                            <span className="ml-2 font-medium">{review.serviceTitle}</span>
                          </div>
                        )}
                        {review.bookingId && (
                          <div>
                            <span className="text-gray-500">Booking ID:</span>
                            <span className="ml-2 font-mono text-xs">{review.bookingId}</span>
                          </div>
                        )}
                        {review.duration && (
                          <div>
                            <span className="text-gray-500">Duration:</span>
                            <span className="ml-2 font-medium">{review.duration} hour{review.duration > 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {review.estimatedCost && (
                          <div>
                            <span className="text-gray-500">Cost:</span>
                            <span className="ml-2 font-medium">{currencySymbol}{review.estimatedCost.toFixed(2)}</span>
                          </div>
                        )}
                        {review.scheduledDate && (
                          <div>
                            <span className="text-gray-500">Date:</span>
                            <span className="ml-2 font-medium">{new Date(review.scheduledDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        {review.scheduledTime && (
                          <div>
                            <span className="text-gray-500">Time:</span>
                            <span className="ml-2 font-medium">{review.scheduledTime}</span>
                          </div>
                        )}
                        {review.location && (
                          <div className="md:col-span-2">
                            <span className="text-gray-500">Location:</span>
                            <span className="ml-2 font-medium">{review.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hidden Info */}
                    {review.hidden && review.hiddenReason && (
                      <Alert className="mt-3">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>
                          <strong>Reason for hiding:</strong> {review.hiddenReason}
                          {review.hiddenAt && (
                            <span className="text-xs text-gray-500 ml-2">
                              (Hidden on {new Date(review.hiddenAt).toLocaleDateString()})
                            </span>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 ml-4">
                    {!review.hidden ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleHideReview(review.id)}
                        className="gap-2"
                      >
                        <EyeOff className="w-4 h-4" />
                        Hide
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnhideReview(review.id)}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Unhide
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteReview(review.id)}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}