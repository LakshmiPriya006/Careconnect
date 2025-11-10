import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Phone, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Textarea } from './ui/textarea';
import { CurrencyIcon } from './CurrencyIcon';
import { RazorpayPayment } from './RazorpayPayment';
import { client } from '../utils/api';
import { toast } from 'sonner@2.0.3';
import { useCurrency } from '../utils/currency';
import * as Icons from 'lucide-react';

// Feature flag for client wallet
const enableClientWallet = false; // Set to true when wallet feature is ready for clients

interface ServiceRequestFormProps {
  selectedProvider?: any;
  onSuccess?: (request: any) => void;
}

export function ServiceRequestForm({ selectedProvider, onSuccess }: ServiceRequestFormProps = {}) {
  const { currencySymbol } = useCurrency();
  const [selectedService, setSelectedService] = useState('');
  const [bookingType, setBookingType] = useState('immediate');
  const [requestFor, setRequestFor] = useState<'self' | 'other'>('self');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingBookingData, setPendingBookingData] = useState<any>(null);
  const [estimatedAmount, setEstimatedAmount] = useState(0);
  
  // Wallet state
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(false);
  
  // Services from backend
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  
  // Family members and locations
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState('');
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');
  
  // Form state - using actual date/time values
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [location, setLocation] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [providerGenderPreference, setProviderGenderPreference] = useState('no-preference');
  const [providerLanguagePreference, setProviderLanguagePreference] = useState('no-preference');
  const [duration, setDuration] = useState(''); // Duration in hours
  const [paymentOption, setPaymentOption] = useState<'now' | 'later' | 'wallet'>('later'); // Payment option
  
  // Recipient details (when requesting for someone else)
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientAge, setRecipientAge] = useState('');
  const [recipientGender, setRecipientGender] = useState('');

  // Load services and profile data on mount
  useEffect(() => {
    loadServices();
    loadProfileData();
    if (enableClientWallet) {
      loadWalletBalance();
    }
  }, []);

  // Handle requestFor changes
  useEffect(() => {
    if (requestFor === 'other') {
      // Reset location when switching to "other"
      setSelectedLocation('');
      setLocation('');
      setNewLocationAddress('');
    } else {
      // Reset recipient fields when switching to "self"
      setSelectedFamilyMember('');
      setRecipientName('');
      setRecipientPhone('');
      setRecipientAddress('');
      setRecipientAge('');
      setRecipientGender('');
      // Set to primary location when switching to self (if available)
      if (locations.length > 0 && !selectedLocation) {
        const primary = locations.find(l => l.isPrimary);
        if (primary) {
          setSelectedLocation(primary.id);
          setLocation(primary.address);
        } else if (locations[0]) {
          setSelectedLocation(locations[0].id);
          setLocation(locations[0].address);
        }
      }
    }
  }, [requestFor, locations]);

  // Auto-set default duration when service is selected
  useEffect(() => {
    if (selectedService && !duration) {
      const selectedServiceData = services.find(s => s.id === selectedService);
      const minimumHours = selectedServiceData?.minimumHours || 1;
      setDuration(minimumHours.toString());
    }
  }, [selectedService, services]);

  const loadServices = async () => {
    try {
      setLoadingServices(true);
      const response = await client.getServices();
      setServices(response.services || []);
    } catch (err) {
      console.error('Error loading services:', err);
      toast.error('Failed to load services');
    } finally {
      setLoadingServices(false);
    }
  };

  const loadProfileData = async () => {
    try {
      const response = await client.getProfile();
      
      // The API returns { locations: [...], familyMembers: [...] } directly, not nested in profile
      if (response) {
        // Load locations
        if (response.locations && response.locations.length > 0) {
          setLocations(response.locations);
          
          // Auto-select primary location for "self" bookings
          if (requestFor === 'self') {
            const primary = response.locations.find((l: any) => l.isPrimary);
            if (primary) {
              setSelectedLocation(primary.id);
              setLocation(primary.address);
            } else if (response.locations[0]) {
              setSelectedLocation(response.locations[0].id);
              setLocation(response.locations[0].address);
            }
          }
        }
        
        // Load family members
        if (response.familyMembers && response.familyMembers.length > 0) {
          setFamilyMembers(response.familyMembers);
        }
      }
    } catch (err) {
      console.error('Error loading profile data:', err);
    }
  };

  const loadWalletBalance = async () => {
    try {
      setLoadingWallet(true);
      const response = await client.getWalletBalance();
      setWalletBalance(response.balance || 0);
    } catch (err) {
      console.error('Error loading wallet balance:', err);
    } finally {
      setLoadingWallet(false);
    }
  };

  const handleFamilyMemberSelect = (memberId: string) => {
    setSelectedFamilyMember(memberId);
    if (memberId !== 'new') {
      const member = familyMembers.find(m => m.id === memberId);
      if (member) {
        setRecipientName(member.name);
        setRecipientPhone(member.phone || '');
        setRecipientAddress(member.address || '');
        setRecipientAge(member.age?.toString() || '');
        setRecipientGender(member.gender || '');
      }
    } else {
      // Clear fields for new entry
      setRecipientName('');
      setRecipientPhone('');
      setRecipientAddress('');
      setRecipientAge('');
      setRecipientGender('');
    }
  };

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocation(locationId);
    if (locationId === 'new') {
      setLocation('');
      setNewLocationAddress('');
    } else {
      // Set location from selected address
      const selectedLoc = locations.find(l => l.id === locationId);
      if (selectedLoc) {
        setLocation(selectedLoc.address);
      }
    }
  };

  // Get minimum allowed date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Generate time slots with 2-hour minimum advance notice
  const getAvailableTimeSlots = (): string[] => {
    const slots: string[] = [];
    const now = new Date();
    const selectedDateObj = scheduledDate ? new Date(scheduledDate) : null;
    const isToday = selectedDateObj && selectedDateObj.toDateString() === now.toDateString();
    
    // Service hours: 8 AM to 8 PM
    for (let hour = 8; hour <= 20; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      
      // If it's today, only show slots at least 2 hours from now
      if (isToday) {
        const slotTime = new Date(selectedDateObj);
        slotTime.setHours(hour, 0, 0, 0);
        const minTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        
        if (slotTime >= minTime) {
          slots.push(timeString);
        }
      } else {
        slots.push(timeString);
      }
    }
    
    return slots;
  };

  // Format time slot for display
  const formatTimeSlot = (time: string): string => {
    const [hours] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHour}:00 ${period}`;
  };

  // Handle payment success
  const handlePaymentSuccess = async (paymentDetails: any) => {
    setShowPaymentModal(false);
    setLoading(true);

    try {
      // Add payment details to booking data
      const bookingDataWithPayment = {
        ...pendingBookingData,
        paymentId: paymentDetails.razorpay_payment_id,
        orderId: paymentDetails.razorpay_order_id,
        paymentSignature: paymentDetails.razorpay_signature,
        paymentStatus: 'paid',
        paidAmount: estimatedAmount,
      };

      const response = await client.createRequest(bookingDataWithPayment);

      setSubmitted(true);
      toast.success('Payment successful! Service request submitted.');

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(response.request);
      }

      // Reset form after 3 seconds
      setTimeout(() => {
        resetForm();
      }, 3000);
    } catch (err: any) {
      console.error('Error creating request after payment:', err);
      toast.error('Payment succeeded but booking failed. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  // Handle payment failure
  const handlePaymentFailed = (error: any) => {
    console.error('Payment failed:', error);
    setShowPaymentModal(false);
    setLoading(false);
    toast.error(`Payment failed: ${error.description || 'Please try again'}`);
  };

  // Reset form helper
  const resetForm = () => {
    setSubmitted(false);
    setSelectedService('');
    setBookingType('immediate');
    setRequestFor('self');
    setScheduledDate('');
    setScheduledTime('');
    setLocation('');
    setSelectedLocation('');
    setNewLocationAddress('');
    setAdditionalDetails('');
    setSelectedFamilyMember('');
    setRecipientName('');
    setRecipientPhone('');
    setRecipientAddress('');
    setRecipientAge('');
    setRecipientGender('');
    setProviderGenderPreference('no-preference');
    setProviderLanguagePreference('no-preference');
    setDuration('');
    setPendingBookingData(null);
    setEstimatedAmount(0);

    // Reset to primary location
    if (locations.length > 0) {
      const primary = locations.find(l => l.isPrimary);
      if (primary) {
        setSelectedLocation(primary.id);
        setLocation(primary.address);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation
      if (!selectedService) {
        throw new Error('Please select a service');
      }
      
      if (!duration) {
        throw new Error('Please select how many hours you need');
      }

      const finalLocation = requestFor === 'other' ? recipientAddress : location;
      if (!finalLocation || finalLocation.trim() === '') {
        throw new Error('Please provide a service location');
      }

      if (requestFor === 'other') {
        if (!recipientName || recipientName.trim() === '') {
          throw new Error('Please provide recipient name');
        }
        if (!recipientAddress || recipientAddress.trim() === '') {
          throw new Error('Please provide recipient address');
        }
      }

      // Validate scheduled booking
      if (bookingType === 'scheduled') {
        if (!scheduledDate) {
          throw new Error('Please select a date');
        }
        if (!scheduledTime) {
          throw new Error('Please select a time slot');
        }
      }

      // Get selected service details
      const selectedServiceData = services.find(s => s.id === selectedService);
      
      // Calculate estimated cost based on selected duration
      let estimatedCost = 0;
      if (selectedServiceData && duration) {
        const basePrice = selectedServiceData.basePrice || 0;
        const selectedHours = parseFloat(duration);
        const minimumFee = selectedServiceData.minimumFee || 0;
        
        // Calculate: basePrice * selected duration, or minimumFee (whichever is higher)
        const calculatedPrice = basePrice * selectedHours;
        estimatedCost = Math.max(calculatedPrice, minimumFee);
        
        console.log('Price calculation:', {
          basePrice,
          selectedHours,
          minimumFee,
          calculatedPrice,
          finalEstimatedCost: estimatedCost
        });
      }
      
      const requestData = {
        serviceType: selectedService,
        serviceTitle: selectedServiceData?.title || 'Service',
        bookingType,
        scheduledDate: bookingType === 'scheduled' ? scheduledDate : null,
        scheduledTime: bookingType === 'scheduled' ? scheduledTime : null,
        location: finalLocation,
        additionalDetails,
        estimatedCost,
        requestFor,
        recipientName: requestFor === 'other' ? recipientName : null,
        recipientPhone: requestFor === 'other' ? recipientPhone : null,
        recipientAddress: requestFor === 'other' ? recipientAddress : null,
        recipientAge: requestFor === 'other' ? recipientAge : null,
        recipientGender: requestFor === 'other' ? recipientGender : null,
        providerGenderPreference,
        providerLanguagePreference,
        duration: duration ? parseFloat(duration) : undefined
      };

      // Handle payment options
      if (paymentOption === 'now') {
        // Store booking data and show payment modal
        console.log('Showing payment modal for booking:', requestData);
        setPendingBookingData(requestData);
        setEstimatedAmount(estimatedCost);
        setShowPaymentModal(true);
        setLoading(false);
      } else if (paymentOption === 'wallet') {
        // Pay with Wallet: Create booking directly without payment
        console.log('Creating booking with "Pay with Wallet" option:', requestData);
        const bookingDataWithPayLater = {
          ...requestData,
          paymentStatus: 'paid',
          paidAmount: estimatedCost,
        };

        const response = await client.createRequest(bookingDataWithPayLater);
        console.log('Booking created successfully:', response);

        setSubmitted(true);
        toast.success('Service request submitted successfully!');

        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess(response.request);
        }

        // Reset form after 3 seconds
        setTimeout(() => {
          resetForm();
        }, 3000);

        setLoading(false);
      } else {
        // Pay Later: Create booking directly without payment
        console.log('Creating booking with "Pay Later" option:', requestData);
        const bookingDataWithPayLater = {
          ...requestData,
          paymentStatus: 'pending',
          paidAmount: 0,
        };

        const response = await client.createRequest(bookingDataWithPayLater);
        console.log('Booking created successfully:', response);

        setSubmitted(true);
        toast.success('Service request submitted successfully!');

        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess(response.request);
        }

        // Reset form after 3 seconds
        setTimeout(() => {
          resetForm();
        }, 3000);

        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error creating request:', err);
      const errorMessage = err.message || 'Failed to submit request. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-2 border-green-200">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-green-900 mb-2">Request Submitted Successfully!</h3>
          <p className="text-gray-600">
            We are connecting you with qualified providers in your area.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            You will receive updates on your booking history page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-blue-900">Request a Service</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <p className="text-red-900">{error}</p>
              </div>
            )}

            {/* Request For Selection */}
            <div className="space-y-3">
              <Label className="text-lg">Who is this service for?</Label>
              <RadioGroup value={requestFor} onValueChange={(value: 'self' | 'other') => setRequestFor(value)} className="space-y-3">
                <Card className={`cursor-pointer border-2 ${requestFor === 'self' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <RadioGroupItem value="self" id="self" className="w-6 h-6" />
                    <Label htmlFor="self" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-gray-900">For Myself</p>
                          <p className="text-sm text-gray-600">I need this service at my location</p>
                        </div>
                      </div>
                    </Label>
                  </CardContent>
                </Card>

                <Card className={`cursor-pointer border-2 ${requestFor === 'other' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <RadioGroupItem value="other" id="other" className="w-6 h-6" />
                    <Label htmlFor="other" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-gray-900">For Someone Else</p>
                          <p className="text-sm text-gray-600">Request service for a family member or friend</p>
                        </div>
                      </div>
                    </Label>
                  </CardContent>
                </Card>
              </RadioGroup>
            </div>

            {/* Recipient Details (shown when requesting for someone else) */}
            {requestFor === 'other' && (
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardContent className="p-4 space-y-4">
                  <p className="text-blue-900">Recipient Information</p>
                  
                  {/* Family Member Selection */}
                  {familyMembers.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="family-member" className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Select from Family Profiles
                      </Label>
                      <Select value={selectedFamilyMember} onValueChange={handleFamilyMemberSelect}>
                        <SelectTrigger className="h-12 bg-white">
                          <SelectValue placeholder="Choose existing profile or enter new" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">➕ Enter New Person</SelectItem>
                          {familyMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name} ({member.relationship})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-600">
                        💡 Tip: Save profiles in Account tab for faster booking next time
                      </p>
                    </div>
                  )}
                  
                  {familyMembers.length === 0 && (
                    <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-900">
                        💡 <strong>Tip:</strong> You can save family member profiles in your Account tab for quick selection next time!
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="recipient-name" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Full Name
                    </Label>
                    <Input
                      id="recipient-name"
                      type="text"
                      placeholder="e.g., Margaret Thompson"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      required
                      className="h-12 text-base bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipient-phone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="recipient-phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="h-12 text-base bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipient-address" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Service Address
                    </Label>
                    <Input
                      id="recipient-address"
                      type="text"
                      placeholder="e.g., 123 Oak Street, New York, NY 10001"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      required
                      className="h-12 text-base bg-white"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipient-age" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Age
                      </Label>
                      <Input
                        id="recipient-age"
                        type="number"
                        placeholder="e.g., 75"
                        min="1"
                        max="120"
                        value={recipientAge}
                        onChange={(e) => setRecipientAge(e.target.value)}
                        className="h-12 text-base bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recipient-gender" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Gender
                      </Label>
                      <Select value={recipientGender} onValueChange={setRecipientGender}>
                        <SelectTrigger className="h-12 bg-white">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Service Type Selection */}
            <div className="space-y-3">
              <Label className="text-lg">What type of help do you need?</Label>
              {loadingServices ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading services...</p>
                </div>
              ) : services.length === 0 ? (
                <Card className="border-2 border-gray-200">
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-600">No services available at this time.</p>
                    <p className="text-sm text-gray-500 mt-2">Please contact support for assistance.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {services.map((service) => {
                    const IconComponent = (Icons as any)[service.icon] || (Icons as any)['Sparkles'];
                    return (
                      <Card
                        key={service.id}
                        className={`cursor-pointer border-2 transition-all ${ 
                          selectedService === service.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                        onClick={() => setSelectedService(service.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <IconComponent className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-gray-900 truncate">{service.title}</h4>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{service.description}</p>
                              {service.basePrice && (
                                <div className="mt-2 space-y-1">
                                  <p className="text-blue-600">
                                    {currencySymbol}{service.basePrice}/hour
                                  </p>
                                  {service.minimumHours && (
                                    <p className="text-xs text-gray-600">
                                      Minimum: {service.minimumHours} hour{service.minimumHours > 1 ? 's' : ''}
                                    </p>
                                  )}
                                  {service.minimumFee && (
                                    <p className="text-xs text-gray-600">
                                      Minimum fee: {currencySymbol}{service.minimumFee}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Duration Selection */}
            {selectedService && (
              <div className="space-y-3">
                <Label className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  How many hours do you need?
                </Label>
                <Select 
                  value={duration} 
                  onValueChange={setDuration}
                  required
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const selectedServiceData = services.find(s => s.id === selectedService);
                      const minimumHours = selectedServiceData?.minimumHours || 1;
                      const maxHours = 12; // Maximum booking duration
                      const options = [];
                      
                      for (let i = minimumHours; i <= maxHours; i++) {
                        options.push(
                          <SelectItem key={i} value={i.toString()}>
                            {i} hour{i > 1 ? 's' : ''}
                            {selectedServiceData?.basePrice && (
                              <span className="text-gray-600 ml-2">
                                ({currencySymbol}{(selectedServiceData.basePrice * i).toFixed(2)})
                              </span>
                            )}
                          </SelectItem>
                        );
                      }
                      
                      return options;
                    })()}
                  </SelectContent>
                </Select>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900">
                    {(() => {
                      const selectedServiceData = services.find(s => s.id === selectedService);
                      const minimumHours = selectedServiceData?.minimumHours || 1;
                      return (
                        <>
                          ℹ️ <strong>Note:</strong> This service requires a minimum of {minimumHours} hour{minimumHours > 1 ? 's' : ''}.
                          {duration && selectedServiceData?.basePrice && (
                            <> Estimated cost: <strong>{currencySymbol}{(selectedServiceData.basePrice * parseFloat(duration)).toFixed(2)}</strong></>
                          )}
                        </>
                      );
                    })()}
                  </p>
                </div>
              </div>
            )}

            {/* When do you need this service */}
            <div className="space-y-3">
              <Label className="text-lg">When do you need this service?</Label>
              <RadioGroup value={bookingType} onValueChange={setBookingType} className="space-y-3">
                <Card className={`cursor-pointer border-2 ${bookingType === 'immediate' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <RadioGroupItem value="immediate" id="immediate" className="w-6 h-6" />
                    <Label htmlFor="immediate" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-gray-900">As Soon as Possible</p>
                          <p className="text-sm text-gray-600">Get help within the next few hours</p>
                        </div>
                      </div>
                    </Label>
                  </CardContent>
                </Card>

                <Card className={`cursor-pointer border-2 ${bookingType === 'scheduled' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <RadioGroupItem value="scheduled" id="scheduled" className="w-6 h-6" />
                    <Label htmlFor="scheduled" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-gray-900">Schedule for Later</p>
                          <p className="text-sm text-gray-600">Pick a specific date and time</p>
                        </div>
                      </div>
                    </Label>
                  </CardContent>
                </Card>
              </RadioGroup>
            </div>

            {/* Date/Time Selection (shown when scheduled is selected) */}
            {bookingType === 'scheduled' && (
              <div className="space-y-4">
                <Card className="border-2 border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-orange-900">
                      ⏰ <strong>Note:</strong> Bookings must be made at least 2 hours in advance.
                    </p>
                  </CardContent>
                </Card>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduled-date">Date</Label>
                    <Input
                      id="scheduled-date"
                      type="date"
                      min={getMinDate()}
                      value={scheduledDate}
                      onChange={(e) => {
                        setScheduledDate(e.target.value);
                        setScheduledTime(''); // Reset time when date changes
                      }}
                      required
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduled-time">Time Slot</Label>
                    <Select 
                      value={scheduledTime} 
                      onValueChange={setScheduledTime}
                      disabled={!scheduledDate}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder={scheduledDate ? "Select time slot" : "Select date first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {scheduledDate && getAvailableTimeSlots().map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {formatTimeSlot(slot)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {scheduledDate && (
                      <p className="text-sm text-gray-600">
                        Service hours: 8:00 AM - 8:00 PM
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Location (only shown if requesting for self) */}
            {requestFor === 'self' && (
              <div className="space-y-3">
                <Label className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Service Location
                </Label>
                
                {locations.length > 0 ? (
                  <>
                    <Select value={selectedLocation} onValueChange={handleLocationSelect}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select address" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name} - {loc.address}
                            {loc.isPrimary && ' (Primary)'}
                          </SelectItem>
                        ))}
                        <SelectItem value="new">+ Add New Address</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {selectedLocation === 'new' && (
                      <div className="space-y-2">
                        <Input
                          type="text"
                          placeholder="Enter new address"
                          value={newLocationAddress}
                          onChange={(e) => {
                            setNewLocationAddress(e.target.value);
                            setLocation(e.target.value);
                          }}
                          required
                          className="h-12"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="Enter your address"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                      className="h-12"
                    />
                    <p className="text-sm text-gray-600">
                      💡 Tip: Add addresses in your profile for quick selection next time
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Provider Preferences */}
            <div className="space-y-4">
              <Label className="text-lg">Provider Preferences (Optional)</Label>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender-preference">Gender Preference</Label>
                  <Select value={providerGenderPreference} onValueChange={setProviderGenderPreference}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="No preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-preference">No Preference</SelectItem>
                      <SelectItem value="male">Male Provider</SelectItem>
                      <SelectItem value="female">Female Provider</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="language-preference">Language Preference</Label>
                  <Select value={providerLanguagePreference} onValueChange={setProviderLanguagePreference}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="No preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-preference">No Preference</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="spanish">Spanish</SelectItem>
                      <SelectItem value="mandarin">Mandarin</SelectItem>
                      <SelectItem value="cantonese">Cantonese</SelectItem>
                      <SelectItem value="tagalog">Tagalog</SelectItem>
                      <SelectItem value="vietnamese">Vietnamese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-2">
              <Label htmlFor="additional-details">Additional Details (Optional)</Label>
              <Textarea
                id="additional-details"
                placeholder="Any special requests or information the provider should know..."
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                className="min-h-24"
              />
            </div>

            {/* Payment Option */}
            <div className="space-y-3">
              <Label className="text-lg flex items-center gap-2">
                <CurrencyIcon className="w-5 h-5 text-blue-600" />
                Payment Option
              </Label>
              <RadioGroup value={paymentOption} onValueChange={(value: 'now' | 'later' | 'wallet') => setPaymentOption(value)} className="space-y-3">
                <Card className={`cursor-pointer border-2 ${paymentOption === 'later' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <RadioGroupItem value="later" id="pay-later" className="w-6 h-6" />
                    <Label htmlFor="pay-later" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-gray-900">Pay Later</p>
                          <p className="text-sm text-gray-600">Create booking now and pay when service is completed</p>
                        </div>
                      </div>
                    </Label>
                  </CardContent>
                </Card>

                <Card className={`cursor-pointer border-2 ${paymentOption === 'now' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <RadioGroupItem value="now" id="pay-now" className="w-6 h-6" />
                    <Label htmlFor="pay-now" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <CurrencyIcon className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-gray-900">Pay Now</p>
                          <p className="text-sm text-gray-600">Pay securely online before service begins</p>
                        </div>
                      </div>
                    </Label>
                  </CardContent>
                </Card>

                {enableClientWallet && (
                  <Card className={`cursor-pointer border-2 ${paymentOption === 'wallet' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <RadioGroupItem value="wallet" id="pay-wallet" className="w-6 h-6" />
                      <Label htmlFor="pay-wallet" className="cursor-pointer flex-1">
                        <div className="flex items-center gap-2">
                          <CurrencyIcon className="w-5 h-5 text-purple-600" />
                          <div>
                            <p className="text-gray-900">Pay with Wallet</p>
                            <p className="text-sm text-gray-600">Use your wallet balance to pay for the service</p>
                          </div>
                        </div>
                      </Label>
                    </CardContent>
                  </Card>
                )}
              </RadioGroup>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || !selectedService}
              className={`w-full text-white h-14 text-lg ${
                paymentOption === 'now' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Submitting...' : paymentOption === 'now' ? 'Pay Now' : 'Book Service'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Payment Modal */}
      {pendingBookingData && (
        <RazorpayPayment
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setLoading(false);
          }}
          amount={estimatedAmount}
          bookingData={pendingBookingData}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailed={handlePaymentFailed}
        />
      )}
    </div>
  );
}