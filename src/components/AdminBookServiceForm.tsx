import { useState, useEffect } from 'react';
import { Calendar, Clock, DollarSign, FileText, User, MapPin, Users, Search, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { admin, client as apiClient } from '../utils/api';
import { toast } from 'sonner@2.0.3';
import * as Icons from 'lucide-react';
import { useCurrency } from '../utils/currency';

interface AdminBookServiceFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  preSelectedClientId?: string;
  preSelectedClient?: any;
}

export function AdminBookServiceForm({ onSuccess, onCancel, preSelectedClientId, preSelectedClient }: AdminBookServiceFormProps) {
  const { currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form data
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [serviceType, setServiceType] = useState('');
  const [bookingType, setBookingType] = useState('scheduled');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [providerGenderPreference, setProviderGenderPreference] = useState('no-preference');
  const [providerLanguagePreference, setProviderLanguagePreference] = useState('no-preference');

  // Client's family and location info
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [requestFor, setRequestFor] = useState<'self' | 'other'>('self');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAge, setRecipientAge] = useState('');
  const [recipientGender, setRecipientGender] = useState('');
  const [serviceAddress, setServiceAddress] = useState('');

  useEffect(() => {
    loadClientsAndServices();
  }, []);

  useEffect(() => {
    // Handle pre-selected client
    if (preSelectedClientId && preSelectedClient) {
      setSelectedClientId(preSelectedClientId);
      setSelectedClient(preSelectedClient);
      handleClientSelect(preSelectedClientId);
    }
  }, [preSelectedClientId, preSelectedClient]);

  const loadClientsAndServices = async () => {
    try {
      setLoadingClients(true);
      const [clientsRes, servicesRes] = await Promise.all([
        admin.getAllClients(),
        apiClient.getServices(),
      ]);
      
      setClients(clientsRes.clients || []);
      setServices(servicesRes.services || []);
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('Failed to load clients and services');
    } finally {
      setLoadingClients(false);
    }
  };

  const handleClientSelect = async (clientId: string) => {
    setSelectedClientId(clientId);
    
    // If we have preSelectedClient, use it; otherwise find from clients list
    let client = preSelectedClient;
    if (!client) {
      client = clients.find(c => c.id === clientId);
    }
    setSelectedClient(client);
    
    if (client) {
      // Try to load client's profile data for family members and locations
      try {
        const profileRes = await admin.getClientProfile(clientId);
        setFamilyMembers(profileRes.familyMembers || []);
        setLocations(profileRes.locations || []);
        
        // Pre-fill recipient name if booking for self
        if (requestFor === 'self') {
          setRecipientName(client.name || '');
          setRecipientPhone(client.phone || '');
        }
      } catch (err) {
        console.error('Error loading client profile:', err);
        // Set basic info even if profile load fails
        setRecipientName(client.name || '');
        setRecipientPhone(client.phone || '');
      }
    }
  };

  const handleFamilyMemberSelect = (memberId: string) => {
    setSelectedFamilyMember(memberId);
    if (memberId === 'new') {
      setRecipientName('');
      setRecipientPhone('');
      setRecipientAge('');
      setRecipientGender('');
      setServiceAddress('');
    } else {
      const member = familyMembers.find(m => m.id === memberId);
      if (member) {
        setRecipientName(member.name);
        setRecipientPhone(member.phone || '');
        setRecipientAge(member.age?.toString() || '');
        setRecipientGender(member.gender || '');
        setServiceAddress(member.address || '');
      }
    }
  };

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocation(locationId);
    if (locationId === 'new') {
      setServiceAddress('');
    } else {
      const location = locations.find(l => l.id === locationId);
      if (location) {
        setServiceAddress(`${location.address}, ${location.city}, ${location.state} ${location.zipCode}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClientId) {
      toast.error('Please select a client');
      return;
    }
    
    if (!serviceType || !additionalDetails || !scheduledDate || !scheduledTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (requestFor === 'other' && !recipientName) {
      toast.error('Please provide recipient name');
      return;
    }

    setLoading(true);

    try {
      const bookingData = {
        clientId: selectedClientId,
        serviceType,
        additionalDetails,
        scheduledDate,
        scheduledTime,
        duration: duration || '2',
        urgency,
        amount: amount || '0',
        notes,
        requestFor,
        recipientName: requestFor === 'other' ? recipientName : selectedClient?.name,
        recipientPhone: requestFor === 'other' ? recipientPhone : selectedClient?.phone,
        recipientAge: requestFor === 'other' ? recipientAge : selectedClient?.age,
        recipientGender: requestFor === 'other' ? recipientGender : selectedClient?.gender,
        serviceAddress: serviceAddress || selectedClient?.address,
        bookedBy: 'admin',
        providerGenderPreference,
        providerLanguagePreference,
      };

      await admin.createBookingForClient(bookingData);
      toast.success('Service booking created successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast.error(error.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => 
    client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client Selection - Only show when client is NOT pre-selected */}
      {!preSelectedClientId && (
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <User className="w-5 h-5" />
              Select Client
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Search Client *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>

            {loadingClients ? (
              <p className="text-sm text-gray-600 text-center py-4">Loading clients...</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <p className="text-sm text-gray-600 text-center py-4">No clients found</p>
                ) : (
                  filteredClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => handleClientSelect(client.id)}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedClientId === client.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-gray-600">{client.email}</p>
                        </div>
                        {selectedClientId === client.id && (
                          <Badge className="bg-blue-600">Selected</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {selectedClient && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <strong>Selected:</strong> {selectedClient.name} ({selectedClient.email})
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedClientId && (
        <>
          {/* Service Request Details */}
          <Card className="border-2 border-green-200">
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Service Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Service Type */}
              <div className="space-y-3">
                <Label className="text-lg">What type of help is needed?</Label>
                {services.length === 0 ? (
                  <Card className="border-2 border-gray-200">
                    <CardContent className="p-8 text-center">
                      <p className="text-gray-600">No services available at this time.</p>
                      <p className="text-sm text-gray-500 mt-2">Please contact support for assistance.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 gap-3">
                    {services.map((service) => {
                      const IconComponent = (Icons as any)[service.icon] || (Icons as any)['FileText'];
                      return (
                        <Card
                          key={service.id}
                          className={`cursor-pointer border-2 transition-all ${
                            serviceType === service.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                          onClick={() => setServiceType(service.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <IconComponent className="w-6 h-6 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-gray-900 truncate">{service.title}</h4>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{service.description}</p>
                                {service.basePrice ? (
                                  <p className="text-sm text-blue-600 mt-2">${service.basePrice}/hour</p>
                                ) : null}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Additional Details */}
              <div className="space-y-2">
                <Label htmlFor="additional-details">Additional Details *</Label>
                <Textarea
                  id="additional-details"
                  value={additionalDetails}
                  onChange={(e) => setAdditionalDetails(e.target.value)}
                  placeholder="Describe the service needed..."
                  className="min-h-24"
                  required
                />
              </div>

              {/* Date and Time */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date *
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Time *
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
              </div>

              {/* Duration and Urgency */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (hours)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="2"
                    min="1"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select value={urgency} onValueChange={setUrgency}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Estimated Amount ({currencySymbol})
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100"
                  min="0"
                  className="h-11"
                />
              </div>

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Admin Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes for the provider..."
                  className="min-h-20"
                />
              </div>

              {/* Provider Preferences */}
              <div className="space-y-2">
                <Label>Provider Preferences (Optional)</Label>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider-gender-preference">Gender Preference</Label>
                    <Select value={providerGenderPreference} onValueChange={setProviderGenderPreference}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="No preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-preference">No preference</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="provider-language-preference">Language Preference</Label>
                    <Select value={providerLanguagePreference} onValueChange={setProviderLanguagePreference}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="No preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-preference">No preference</SelectItem>
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="spanish">Spanish</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recipient Information */}
          <Card className="border-2 border-purple-200">
            <CardHeader className="bg-purple-50">
              <CardTitle className="text-purple-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Recipient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Request For */}
              <div className="space-y-2">
                <Label>This service is for:</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => {
                      setRequestFor('self');
                      setRecipientName(selectedClient?.name || '');
                      setRecipientPhone(selectedClient?.phone || '');
                    }}
                    variant={requestFor === 'self' ? 'default' : 'outline'}
                    className="flex-1 h-11"
                  >
                    Client (Self)
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setRequestFor('other');
                      setRecipientName('');
                      setRecipientPhone('');
                    }}
                    variant={requestFor === 'other' ? 'default' : 'outline'}
                    className="flex-1 h-11"
                  >
                    Someone Else
                  </Button>
                </div>
              </div>

              {requestFor === 'other' && (
                <>
                  {/* Family Member Selection */}
                  {familyMembers.length > 0 && (
                    <div className="space-y-2">
                      <Label>Select Family Member (Optional)</Label>
                      <Select value={selectedFamilyMember} onValueChange={handleFamilyMemberSelect}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Choose from saved profiles or enter new" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">Enter New Person</SelectItem>
                          {familyMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name} ({member.relationship})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Recipient Name and Phone */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipient-name">Recipient Name *</Label>
                      <Input
                        id="recipient-name"
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Person receiving service"
                        className="h-11"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="recipient-phone">Recipient Phone</Label>
                      <Input
                        id="recipient-phone"
                        type="tel"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="h-11"
                      />
                    </div>
                  </div>

                  {/* Recipient Age and Gender */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipient-age">Recipient Age</Label>
                      <Input
                        id="recipient-age"
                        type="number"
                        value={recipientAge}
                        onChange={(e) => setRecipientAge(e.target.value)}
                        placeholder="Age"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="recipient-gender">Recipient Gender</Label>
                      <Select value={recipientGender} onValueChange={setRecipientGender}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {/* Location Selection */}
              {locations.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Service Location
                  </Label>
                  <Select value={selectedLocation} onValueChange={handleLocationSelect}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Choose saved location or enter new" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Enter New Address</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.label} - {location.address}, {location.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Service Address */}
              <div className="space-y-2">
                <Label htmlFor="service-address">Service Address</Label>
                <Input
                  id="service-address"
                  type="text"
                  value={serviceAddress}
                  onChange={(e) => setServiceAddress(e.target.value)}
                  placeholder="Where should the service be provided?"
                  className="h-11"
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          disabled={loading}
          className="flex-1 h-12"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || !selectedClientId}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12"
        >
          {loading ? 'Creating Booking...' : 'Create Service Booking'}
        </Button>
      </div>
    </form>
  );
}