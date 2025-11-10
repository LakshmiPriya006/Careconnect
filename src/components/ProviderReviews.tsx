import { useState, useEffect } from 'react';
import { Star, MessageSquare, User, Calendar, MapPin, DollarSign, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { provider } from '../utils/api';
import { toast } from 'sonner';

interface Review {
  id: string;
  bookingId: string;
  rating: number;
  review: string;
  clientName: string;
  serviceType: string;
  serviceTitle?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  location?: string;
  estimatedCost?: number;
  createdAt: string;
}

export function ProviderReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      console.log('🔍 [PROVIDER REVIEWS UI] Starting to fetch reviews...');
      
      const data = await provider.getReviews();
      
      console.log('📦 [PROVIDER REVIEWS UI] Received data from API:', data);
      console.log('📊 [PROVIDER REVIEWS UI] Number of reviews:', data.reviews?.length || 0);
      
      if (data.reviews && data.reviews.length > 0) {
        console.log('✅ [PROVIDER REVIEWS UI] Sample review:', data.reviews[0]);
      }
      
      // Show warning if provider profile not found
      if (data.warning) {
        console.warn('⚠️ [PROVIDER REVIEWS UI] Warning from API:', data.warning);
        toast.warning(data.warning);
      }
      
      setReviews(data.reviews || []);
      calculateStats(data.reviews || []);
      
      console.log('✅ [PROVIDER REVIEWS UI] Reviews loaded successfully');
    } catch (error) {
      console.error('❌ [PROVIDER REVIEWS UI] Error loading reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reviewsList: Review[]) => {
    if (reviewsList.length === 0) {
      setStats({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      });
      return;
    }

    const total = reviewsList.length;
    const sum = reviewsList.reduce((acc, r) => acc + r.rating, 0);
    const average = sum / total;

    const distribution: any = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviewsList.forEach((r) => {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    });

    setStats({
      averageRating: parseFloat(average.toFixed(1)),
      totalReviews: total,
      ratingDistribution: distribution,
    });
  };

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
      <div className="grid md:grid-cols-3 gap-4">
        {/* Average Rating */}
        <Card className="border-2 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Rating</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-4xl font-bold text-yellow-900">
                    {stats.averageRating > 0 ? stats.averageRating : 'N/A'}
                  </p>
                  {stats.averageRating > 0 && (
                    <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
              </div>
              <Star className="w-12 h-12 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        {/* Total Reviews */}
        <Card className="border-2 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Reviews</p>
                <p className="text-4xl font-bold text-blue-900 mt-1">{stats.totalReviews}</p>
              </div>
              <MessageSquare className="w-12 h-12 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card className="border-2 border-green-200">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-3">Rating Distribution</p>
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-sm w-3">{rating}</span>
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{
                        width: stats.totalReviews > 0
                          ? `${(stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution] / stats.totalReviews) * 100}%`
                          : '0%',
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-8 text-right">
                    {stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-900">Client Reviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No reviews yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Complete more bookings to receive client reviews
              </p>
            </div>
          ) : (
            reviews.map((review) => (
              <Card key={review.id} className="border-l-4 border-l-yellow-500">
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      {/* Rating */}
                      <div className="flex items-center gap-2 mb-2">
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

                      {/* Client & Service Info */}
                      <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap mb-2">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{review.clientName}</span>
                        </div>
                        <span>•</span>
                        <Badge variant="secondary">{review.serviceTitle || review.serviceType}</Badge>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      {/* Booking ID */}
                      <p className="text-xs text-gray-500 font-mono mb-2">Booking ID: {review.bookingId}</p>
                      
                      {/* Job Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {review.scheduledDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span>
                              {new Date(review.scheduledDate).toLocaleDateString()}
                              {review.scheduledTime && ` at ${review.scheduledTime}`}
                            </span>
                          </div>
                        )}
                        {review.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-600" />
                            <span className="truncate">{review.location}</span>
                          </div>
                        )}
                        {review.estimatedCost && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="text-green-900">${review.estimatedCost}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Review Text */}
                  {review.review && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-gray-700 italic">"{review.review}"</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}