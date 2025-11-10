import { useEffect, useState } from 'react';
import { X, User, Mail, Phone, MapPin, Calendar, CreditCard, Star, History, Users, Plus, Edit2, Trash2, CalendarPlus, Search, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AdminBookServiceForm } from './AdminBookServiceForm';
import { AdminBookingDetailPage } from './AdminBookingDetailPage';
import { admin } from '../utils/api';
import { toast } from 'sonner@2.0.3';
import { useCurrency } from '../utils/currency';

interface ClientDetailPageProps {
  clientId: string;
  onClose: () => void;
}

export function ClientDetailPage({ clientId, onClose }: ClientDetailPageProps) {
  const { currencySymbol } = useCurrency();
  const [clientData, setClientData] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  // Dialog states
  const [showBookServiceDialog, setShowBookServiceDialog] = useState(false);
  const [showFamilyDialog, setShowFamilyDialog] = useState(false);
  const [editingFamily, setEditingFamily] = useState<any>(null);
  
  // Search/filter state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Family form state
  const [familyForm, setFamilyForm] = useState({
    name: '',
    relationship: '',
    phone: '',
    age: '',
  });

  useEffect(() => {
    loadClientDetails();
  }, [clientId]);

  const loadClientDetails = async () => {
    try {
      setLoading(true);
      console.log('[Admin Client Detail] Loading data for client:', clientId);
      
      // Load client profile with bookings, family members, and locations
      const response = await admin.getClientProfile(clientId);
      console.log('[Admin Client Detail] API Response:', response);
      console.log('[Admin Client Detail] Bookings count:', response.bookings?.length || 0);
      console.log('[Admin Client Detail] Family members count:', response.familyMembers?.length || 0);
      console.log('[Admin Client Detail] Locations count:', response.locations?.length || 0);
      
      setClientData(response.client || response);
      setBookings(response.bookings || []);
      setFamilyMembers(response.familyMembers || []);
      setLocations(response.locations || []);
      
      console.log('[Admin Client Detail] State updated successfully');
    } catch (err) {
      console.error('Error loading client details:', err);
      toast.error('Failed to load client details');
    } finally {
      setLoading(false);
    }
  };

  // Family member management
  const handleOpenFamilyDialog = (member?: any) => {
    if (member) {
      setEditingFamily(member);
      setFamilyForm({
        name: member.name || '',
        relationship: member.relationship || '',
        phone: member.phone || '',
        age: member.age?.toString() || '',
      });
    } else {
      setEditingFamily(null);
      setFamilyForm({
        name: '',
        relationship: '',
        phone: '',
        age: '',
      });
    }
    setShowFamilyDialog(true);
  };

  const handleSaveFamilyMember = async () => {
    if (!familyForm.name || !familyForm.relationship) {
      toast.error('Please fill in name and relationship');
      return;
    }

    try {
      if (editingFamily) {
        await admin.updateClientFamilyMember(clientId, editingFamily.id, familyForm);
        toast.success('Family member updated successfully');
      } else {
        await admin.addClientFamilyMember(clientId, familyForm);
        toast.success('Family member added successfully');
      }
      setShowFamilyDialog(false);
      setFamilyForm({ name: '', relationship: '', phone: '', age: '' });
      setEditingFamily(null);
      loadClientDetails();
    } catch (err: any) {
      console.error('Error saving family member:', err);
      toast.error(err.message || 'Failed to save family member');
    }
  };

  const handleDeleteFamilyMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to delete this family member?')) {
      return;
    }

    try {
      await admin.deleteClientFamilyMember(clientId, memberId);
      toast.success('Family member deleted successfully');
      loadClientDetails();
    } catch (err: any) {
      console.error('Error deleting family member:', err);
      toast.error(err.message || 'Failed to delete family member');
    }
  };

  const handleBookingSuccess = () => {
    setShowBookServiceDialog(false);
    loadClientDetails();
    toast.success('Booking created successfully!');
  };

  // Filter bookings based on search query
  const filteredBookings = bookings.filter((booking) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    
    // Search by booking ID
    if (booking.id.toLowerCase().includes(query)) return true;
    
    // Search by service name
    if ((booking.serviceTitle || booking.serviceType || '').toLowerCase().includes(query)) return true;
    
    // Search by provider name
    if ((booking.providerName || booking.provider?.name || '').toLowerCase().includes(query)) return true;
    
    // Search by date
    if (booking.scheduledDate) {
      const dateStr = new Date(booking.scheduledDate).toLocaleDateString().toLowerCase();
      if (dateStr.includes(query)) return true;
    }
    
    // Search by status
    if (booking.status.toLowerCase().includes(query)) return true;
    
    return false;
  });

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl">
          <CardContent className="p-12 text-center">
            <p className="text-gray-600">Loading client details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientData) {
    return (
      <Card className="w-full max-w-5xl mx-auto">
        <CardContent className="p-12 text-center">
          <p className="text-gray-600">Client not found</p>
          <Button onClick={onClose} className="mt-4">Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="w-full max-w-5xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader className="bg-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-blue-900">Client Details</CardTitle>
                <p className="text-sm text-gray-600 mt-1">{clientData.name} - {clientData.email}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowBookServiceDialog(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Book Service
                </Button>
                <Button variant="outline" onClick={onClose}>
                  <X className="w-5 h-5 mr-2" />
                  Back to List
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="bookings">
                  Booking History
                  {bookings.length > 0 && (
                    <Badge className="ml-2 bg-blue-600">{bookings.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="family">
                  Family Members
                  {familyMembers.length > 0 && (
                    <Badge className="ml-2 bg-green-600">{familyMembers.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500">Client ID</p>
                      <p className="text-sm font-mono text-gray-900">{clientData.id}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <User className="w-5 h-5 text-blue-600 mt-1" />
                        <div>
                          <p className="text-sm text-gray-600">Full Name</p>
                          <p className="font-medium">{clientData.name}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-blue-600 mt-1" />
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium">{clientData.email}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-blue-600 mt-1" />
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="font-medium">{clientData.phone || 'Not provided'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-blue-600 mt-1" />
                        <div>
                          <p className="text-sm text-gray-600">Member Since</p>
                          <p className="font-medium">
                            {new Date(clientData.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {clientData.address && (
                        <div className="flex items-start gap-3 md:col-span-2">
                          <MapPin className="w-5 h-5 text-blue-600 mt-1" />
                          <div>
                            <p className="text-sm text-gray-600">Primary Address</p>
                            <p className="font-medium">{clientData.address}</p>
                          </div>
                        </div>
                      )}
                      {clientData.age && (
                        <div className="flex items-start gap-3">
                          <User className="w-5 h-5 text-blue-600 mt-1" />
                          <div>
                            <p className="text-sm text-gray-600">Age</p>
                            <p className="font-medium">{clientData.age} years</p>
                          </div>
                        </div>
                      )}
                      {clientData.gender && (
                        <div className="flex items-start gap-3">
                          <User className="w-5 h-5 text-blue-600 mt-1" />
                          <div>
                            <p className="text-sm text-gray-600">Gender</p>
                            <p className="font-medium capitalize">{clientData.gender}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Saved Locations */}
                {locations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Saved Locations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {locations.map((location: any) => (
                        <div key={location.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <MapPin className="w-5 h-5 text-purple-600 mt-1" />
                          <div className="flex-1">
                            <p className="font-medium">{location.name || 'Location'}</p>
                            <p className="text-sm text-gray-600">{location.address}</p>
                            {location.isPrimary && (
                              <Badge className="mt-1 bg-purple-100 text-purple-800">Primary</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-6 text-center">
                      <History className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-blue-900">{bookings.length}</p>
                      <p className="text-sm text-gray-600">Total Bookings</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6 text-center">
                      <CreditCard className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-green-900">
                        {currencySymbol}{bookings.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">Total Spent</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-purple-900">{familyMembers.length}</p>
                      <p className="text-sm text-gray-600">Family Members</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Bookings Tab */}
              <TabsContent value="bookings" className="space-y-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                  <div className="text-sm text-gray-600">
                    {searchQuery.trim() && filteredBookings.length !== bookings.length ? (
                      <>
                        Showing {filteredBookings.length} of {bookings.length} bookings
                      </>
                    ) : (
                      <>
                        Total Bookings: <span className="font-semibold text-gray-900">{bookings.length}</span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none md:w-80">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search by booking ID, date, or service..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10"
                      />
                    </div>
                    <Button
                      onClick={() => setShowBookServiceDialog(true)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Booking
                    </Button>
                  </div>
                </div>

                {filteredBookings.length === 0 && searchQuery.trim() ? (
                  <Card>
                    <CardContent className="p-12 text-center text-gray-500">
                      <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p>No bookings found matching "{searchQuery}"</p>
                      <Button
                        variant="outline"
                        onClick={() => setSearchQuery('')}
                        className="mt-4"
                      >
                        Clear Search
                      </Button>
                    </CardContent>
                  </Card>
                ) : filteredBookings.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center text-gray-500">
                      <History className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p>No bookings yet</p>
                      <Button
                        onClick={() => setShowBookServiceDialog(true)}
                        className="mt-4 bg-green-600 hover:bg-green-700"
                      >
                        Create First Booking
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {filteredBookings.map((booking) => (
                      <Card key={booking.id} className="border-2 border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h4 className="font-semibold text-lg">
                                  {booking.provider?.name || booking.providerName || 'Waiting for provider'}
                                </h4>
                                <Badge
                                  className={
                                    booking.status === 'completed'
                                      ? 'bg-green-100 text-green-800 border-green-300'
                                      : booking.status === 'cancelled'
                                      ? 'bg-red-100 text-red-800 border-red-300'
                                      : booking.status === 'accepted' || booking.status === 'in-progress' || booking.status === 'upcoming'
                                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                                      : booking.status === 'pending'
                                      ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                      : 'bg-gray-100 text-gray-800 border-gray-300'
                                  }
                                >
                                  {booking.status}
                                </Badge>
                                {(booking.createdBy === 'admin' || booking.adminId) && (
                                  <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                                    Booked by Admin
                                  </Badge>
                                )}
                                {booking.urgency && booking.urgency !== 'normal' && (
                                  <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                                    {booking.urgency}
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="text-gray-600">{booking.serviceTitle || booking.serviceType || 'Service'}</p>
                              
                              {/* Booking ID */}
                              <p className="text-xs text-gray-500 font-mono">Booking ID: {booking.id}</p>
                              
                              {(booking.requestFor === 'other' || booking.requestForSomeoneElse) && booking.recipientName && (
                                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded px-2 py-1 w-fit">
                                  <Users className="w-3 h-3 text-blue-600" />
                                  <span className="text-sm text-blue-900">For: {booking.recipientName}</span>
                                </div>
                              )}
                              
                              {booking.description && (
                                <p className="text-sm text-gray-600">{booking.description}</p>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>
                                    {booking.scheduledDate 
                                      ? new Date(booking.scheduledDate).toLocaleDateString() 
                                      : new Date(booking.createdAt).toLocaleDateString()
                                    }
                                    {booking.scheduledTime && ` at ${booking.scheduledTime}`}
                                  </span>
                                </div>
                                
                                {(booking.serviceAddress || booking.location || booking.address) && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    <span>{booking.serviceAddress || booking.location || booking.address}</span>
                                  </div>
                                )}
                                
                                {booking.providerName && (
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    <span>Provider: {booking.providerName}</span>
                                  </div>
                                )}
                                
                                {booking.duration && (
                                  <div className="flex items-center gap-2">
                                    <History className="w-4 h-4" />
                                    <span>{booking.duration} hours</span>
                                  </div>
                                )}

                                {booking.recipientName && booking.recipientName !== clientData.name && (
                                  <div className="flex items-center gap-2 md:col-span-2">
                                    <Users className="w-4 h-4 text-purple-600" />
                                    <span>For: {booking.recipientName}</span>
                                  </div>
                                )}
                              </div>
                              
                              {booking.notes && (
                                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                  <span className="font-medium">Notes:</span> {booking.notes}
                                </div>
                              )}
                              
                              {booking.additionalDetails && !booking.notes && (
                                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                  <span className="font-medium">Details:</span> {booking.additionalDetails}
                                </div>
                              )}
                              
                              {booking.rating && (
                                <div className="flex items-center gap-2">
                                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                  <span className="text-sm font-medium">{booking.rating} / 5</span>
                                  {booking.review && (
                                    <span className="text-sm text-gray-600">- {booking.review}</span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right flex flex-col items-end gap-2">
                              <div>
                                <p className="font-bold text-xl text-green-600">
                                  {currencySymbol}{parseFloat(booking.amount || booking.estimatedCost || 0).toFixed(2)}
                                </p>
                                {booking.hourlyRate && (
                                  <p className="text-xs text-gray-500">
                                    {currencySymbol}{booking.hourlyRate}/hr
                                  </p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedBookingId(booking.id)}
                                className="flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Family Members Tab */}
              <TabsContent value="family" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-gray-600">
                    Total Family Members: <span className="font-semibold text-gray-900">{familyMembers.length}</span>
                  </div>
                  <Button
                    onClick={() => handleOpenFamilyDialog()}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Family Member
                  </Button>
                </div>

                {familyMembers.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center text-gray-500">
                      <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p>No family members added</p>
                      <p className="text-sm mt-2">Add family members to help with service bookings</p>
                      <Button
                        onClick={() => handleOpenFamilyDialog()}
                        className="mt-4 bg-green-600 hover:bg-green-700"
                      >
                        Add First Family Member
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {familyMembers.map((member: any) => (
                      <Card key={member.id} className="border-2 border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <Users className="w-8 h-8 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <h4 className="font-semibold text-lg">{member.name}</h4>
                                <Badge variant="outline" className="capitalize">{member.relationship}</Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {member.phone && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone className="w-4 h-4 text-blue-600" />
                                    <span>{member.phone}</span>
                                  </div>
                                )}
                                {member.age && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <User className="w-4 h-4 text-blue-600" />
                                    <span>Age: {member.age} years</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenFamilyDialog(member)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteFamilyMember(member.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Book Service Dialog */}
      <Dialog open={showBookServiceDialog} onOpenChange={setShowBookServiceDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book Service for {clientData.name}</DialogTitle>
            <DialogDescription>
              Create a new service booking for this client. Choose the service type, provider, and schedule details.
            </DialogDescription>
          </DialogHeader>
          <AdminBookServiceForm
            onSuccess={handleBookingSuccess}
            onCancel={() => setShowBookServiceDialog(false)}
            preSelectedClientId={clientId}
            preSelectedClient={clientData}
          />
        </DialogContent>
      </Dialog>

      {/* Family Member Dialog */}
      <Dialog open={showFamilyDialog} onOpenChange={setShowFamilyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFamily ? 'Edit Family Member' : 'Add Family Member'}
            </DialogTitle>
            <DialogDescription>
              {editingFamily ? 'Update the details of this family member.' : 'Add a new family member to this client\'s profile.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="family-name">Name *</Label>
              <Input
                id="family-name"
                value={familyForm.name}
                onChange={(e) => setFamilyForm({ ...familyForm, name: e.target.value })}
                placeholder="Jane Doe"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="family-relationship">Relationship *</Label>
              <Select
                value={familyForm.relationship}
                onValueChange={(value) => setFamilyForm({ ...familyForm, relationship: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mother">Mother</SelectItem>
                  <SelectItem value="father">Father</SelectItem>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="sibling">Sibling</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="grandparent">Grandparent</SelectItem>
                  <SelectItem value="grandchild">Grandchild</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="family-phone">Phone</Label>
              <Input
                id="family-phone"
                type="tel"
                value={familyForm.phone}
                onChange={(e) => setFamilyForm({ ...familyForm, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="family-age">Age</Label>
              <Input
                id="family-age"
                type="number"
                value={familyForm.age}
                onChange={(e) => setFamilyForm({ ...familyForm, age: e.target.value })}
                placeholder="65"
                className="h-11"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowFamilyDialog(false);
                  setFamilyForm({ name: '', relationship: '', phone: '', age: '' });
                  setEditingFamily(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveFamilyMember}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {editingFamily ? 'Update' : 'Add'} Family Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Detail Page (Full Screen) */}
      {selectedBookingId && (
        <AdminBookingDetailPage
          bookingId={selectedBookingId}
          onClose={() => {
            setSelectedBookingId(null);
            loadClientDetails(); // Reload to get updated booking data
          }}
        />
      )}
    </>
  );
}