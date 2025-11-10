import { useState, useEffect } from 'react';
import { Calendar, Clock, User, MapPin, DollarSign, Star, RefreshCw, Filter, Info, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { BookingDetailModal } from './BookingDetailModal';
import { client } from '../utils/api';
import { toast } from 'sonner';
import { useCurrency } from '../utils/currency';

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

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
    case 'accepted':
    case 'upcoming':
      return <Clock className="w-5 h-5 text-blue-600" />;
    case 'in-progress':
      return <Clock className="w-5 h-5 text-purple-600" />;
    case 'completed':
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case 'cancelled':
      return <XCircle className="w-5 h-5 text-red-600" />;
    default:
      return null;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (timeString: string) => {
  if (!timeString) return '';
  return timeString.charAt(0).toUpperCase() + timeString.slice(1);
};

interface BookingHistoryProps {
  onBookAgain?: (booking: any) => void;
}

export function BookingHistory({ onBookAgain }: BookingHistoryProps = {}) {
  const { currencySymbol } = useCurrency();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      console.log('Loading bookings from API...');
      const response = await client.getBookings();
      console.log('Bookings loaded:', response.bookings?.length || 0, 'bookings');
      console.log('Bookings data:', response.bookings);
      
      // Log the first booking in detail for debugging
      if (response.bookings && response.bookings.length > 0) {
        const firstBooking = response.bookings[0];
        console.log('First booking details:', {
          id: firstBooking.id,
          serviceType: firstBooking.serviceType,
          serviceTitle: firstBooking.serviceTitle,
          requestFor: firstBooking.requestFor,
          requestForSomeoneElse: firstBooking.requestForSomeoneElse,
          recipientName: firstBooking.recipientName,
          provider: firstBooking.provider,
          providerName: firstBooking.providerName,
        });
      }
      
      setBookings(response.bookings || []);
    } catch (err: any) {
      console.error('Error loading bookings:', err);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const upcomingBookings = bookings.filter(b => 
    b.status === 'pending' || b.status === 'accepted' || b.status === 'upcoming' || b.status === 'in-progress'
  );
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');

  const handleViewDetails = (booking: any) => {
    setSelectedBooking(booking);
    setModalOpen(true);
  };

  const handleBookAgain = (booking: any) => {
    if (onBookAgain) {
      onBookAgain(booking);
    }
  };

  const handleCancel = () => {
    // Reload bookings after cancellation
    loadBookings();
  };

  const renderBookingCard = (booking: any) => (
    <Card 
      key={booking.id} 
      className="border-2 border-gray-200 cursor-pointer hover:border-blue-300 transition-colors"
      onClick={() => handleViewDetails(booking)}
    >
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              {getStatusIcon(booking.status)}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-gray-900">
                  {booking.provider?.name || booking.providerName || 'Waiting for provider'}
                </h4>
                {getStatusBadge(booking.status)}
                {(booking.createdBy === 'admin' || booking.adminId) && (
                  <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                    Booked by Admin
                  </Badge>
                )}
              </div>
              <p className="text-gray-600">{booking.serviceTitle || booking.serviceType || 'Service'}</p>
              {/* Booking ID */}
              <p className="text-xs text-gray-500 font-mono">ID: {booking.id}</p>
              {(booking.requestFor === 'other' || booking.requestForSomeoneElse) && booking.recipientName && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded px-2 py-1 w-fit">
                  <User className="w-3 h-3 text-blue-600" />
                  <span className="text-sm text-blue-900">For: {booking.recipientName}</span>
                </div>
              )}
              <div className="flex items-center gap-4 text-gray-600 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {booking.bookingType === 'immediate' 
                      ? 'Immediate' 
                      : booking.scheduledDate || formatDate(booking.createdAt)}
                  </span>
                </div>
                {booking.scheduledTime && (
                  <>
                    <span>•</span>
                    <span>{formatTime(booking.scheduledTime)}</span>
                  </>
                )}
              </div>
              {/* Show when the booking was created */}
              <div className="flex items-center gap-1 text-gray-500 text-xs">
                <Clock className="w-3 h-3" />
                <span>Booked on: {formatDate(booking.createdAt)}</span>
              </div>
              {booking.estimatedCost > 0 && (
                <p className="text-blue-900">{currencySymbol}{booking.estimatedCost}</p>
              )}
              {booking.userRating && (
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < booking.userRating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="text-sm text-gray-600 ml-1">Your rating</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-start">
            <Button 
              variant="outline" 
              className="h-10 px-4"
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetails(booking);
              }}
            >
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-blue-900">Booking History</h3>
          <p className="text-gray-600">View and manage your service appointments</p>
        </div>
        <Button
          variant="outline"
          onClick={loadBookings}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        {/* Scrollable tabs on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex md:grid md:grid-cols-4 bg-white shadow-sm min-w-full md:min-w-0">
            <TabsTrigger value="all" className="data-[state=active]:bg-blue-100 whitespace-nowrap px-4">
              All ({bookings.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-blue-100 whitespace-nowrap px-4">
              Upcoming ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-blue-100 whitespace-nowrap px-4">
              Completed ({completedBookings.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="data-[state=active]:bg-blue-100 whitespace-nowrap px-4">
              Cancelled ({cancelledBookings.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="space-y-4">
          {bookings.length > 0 ? (
            bookings.map(renderBookingCard)
          ) : (
            <Card className="border-2 border-gray-200">
              <CardContent className="p-12 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No bookings yet</p>
                <p className="text-sm text-gray-500 mt-1">Your service requests will appear here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingBookings.length > 0 ? (
            upcomingBookings.map(renderBookingCard)
          ) : (
            <Card className="border-2 border-gray-200">
              <CardContent className="p-12 text-center">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No upcoming bookings</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedBookings.length > 0 ? (
            completedBookings.map(renderBookingCard)
          ) : (
            <Card className="border-2 border-gray-200">
              <CardContent className="p-12 text-center">
                <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No completed bookings</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          {cancelledBookings.length > 0 ? (
            cancelledBookings.map(renderBookingCard)
          ) : (
            <Card className="border-2 border-gray-200">
              <CardContent className="p-12 text-center">
                <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No cancelled bookings</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Booking Detail Modal */}
      <BookingDetailModal
        booking={selectedBooking}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onBookAgain={handleBookAgain}
        onRatingSubmit={loadBookings} // Reload bookings after rating
        onCancel={handleCancel} // Reload bookings after cancellation
      />
    </div>
  );
}