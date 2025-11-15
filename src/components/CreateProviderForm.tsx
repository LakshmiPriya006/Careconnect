import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, IdCard, Upload, FileText, Award, Check, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { auth, client, admin } from '../utils/api';
import { toast } from 'sonner';
import * as Icons from 'lucide-react';

interface CreateProviderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateProviderForm({ onSuccess, onCancel }: CreateProviderFormProps) {
  const [loading, setLoading] = useState(false);
  
  // Step 1: Contact Information
  const [step1Data, setStep1Data] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  // Step 2: Profile & Identity
  const [step2Data, setStep2Data] = useState({
    address: '',
    city: '',
    state: '',
    zipCode: '',
    gender: '',
    idCardNumber: '',
    profilePhoto: null as File | null,
    idCardCopy: null as File | null,
  });

  // Step 3: Service Expertise
  const [step3Data, setStep3Data] = useState({
    specialty: '',
    services: [] as string[],
    experienceYears: '',
    experienceDetails: '',
    hourlyRate: '',
    certifications: [] as File[],
  });

  // Load services from admin
  const [serviceOptions, setServiceOptions] = useState<any[]>([]);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const response = await client.getServices();
      const services = response.services || [];
      setServiceOptions(services.map((s: any) => ({
        id: s.id,
        icon: s.icon,
        title: s.title,
        label: s.title,
      })));
    } catch (err) {
      console.error('Error loading services:', err);
      // Fallback to default services if loading fails
      setServiceOptions([
        { id: 'nursing', icon: '🏥', title: 'Nursing Care', label: 'Nursing Care' },
        { id: 'cleaning', icon: '🧹', title: 'House Cleaning', label: 'House Cleaning' },
        { id: 'grocery', icon: '🛒', title: 'Grocery Shopping', label: 'Grocery Shopping' },
        { id: 'companion', icon: '👥', title: 'Companionship', label: 'Companionship' },
        { id: 'handyman', icon: '🔧', title: 'Home Repairs', label: 'Home Repairs' },
        { id: 'transport', icon: '🚗', title: 'Transportation', label: 'Transportation' },
      ]);
    }
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    if (IconComponent) {
      return <IconComponent className="w-5 h-5" />;
    }
    return <Sparkles className="w-5 h-5" />;
  };

  const toggleService = (serviceId: string) => {
    setStep3Data(prev => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter(s => s !== serviceId)
        : [...prev.services, serviceId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!step1Data.name || !step1Data.email || !step1Data.phone || !step1Data.password) {
      toast.error('Please fill in all contact information fields');
      return;
    }
    
    if (!step2Data.address || !step2Data.city || !step2Data.state || !step2Data.zipCode || 
        !step2Data.gender || !step2Data.idCardNumber) {
      toast.error('Please fill in all profile and identity fields');
      return;
    }
    
    if (!step3Data.specialty || step3Data.services.length === 0 || 
        !step3Data.experienceYears || !step3Data.experienceDetails || !step3Data.hourlyRate) {
      toast.error('Please complete all service expertise fields');
      return;
    }

    setLoading(true);

    try {
      // Combine all data for provider signup
      const providerData = {
        // Step 1
        name: step1Data.name,
        email: step1Data.email,
        password: step1Data.password,
        phone: step1Data.phone,
        emailVerified: true, // Admin-created accounts are auto-verified
        mobileVerified: true,
        
        // Step 2
        address: `${step2Data.address}, ${step2Data.city}, ${step2Data.state} ${step2Data.zipCode}`,
        gender: step2Data.gender,
        idCardNumber: step2Data.idCardNumber,
        profilePhoto: step2Data.profilePhoto?.name || '',
        idCardCopy: step2Data.idCardCopy?.name || '',
        
        // Step 3
        specialty: step3Data.specialty,
        skills: step3Data.services,
        experienceYears: parseInt(step3Data.experienceYears),
        experienceDetails: step3Data.experienceDetails,
        hourlyRate: parseInt(step3Data.hourlyRate),
        certifications: step3Data.certifications.map(c => c.name),
      };

      await admin.createProvider(providerData);

      toast.success('Provider account created successfully! Status set to approved.');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating provider:', error);
      toast.error(error.message || 'Failed to create provider account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Contact Information */}
      <div className="space-y-4">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <h3 className="text-blue-900 flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5" />
            Contact Information
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name *
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={step1Data.name}
                onChange={(e) => setStep1Data({ ...step1Data, name: e.target.value })}
                className="h-12 text-base"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="provider@example.com"
                  value={step1Data.email}
                  onChange={(e) => setStep1Data({ ...step1Data, email: e.target.value })}
                  className="h-12 text-base"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Mobile Number *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={step1Data.phone}
                  onChange={(e) => setStep1Data({ ...step1Data, phone: e.target.value })}
                  className="h-12 text-base"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password *
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a secure password (min 6 characters)"
                value={step1Data.password}
                onChange={(e) => setStep1Data({ ...step1Data, password: e.target.value })}
                className="h-12 text-base"
                minLength={6}
                required
              />
              <p className="text-sm text-gray-600">Minimum 6 characters. The provider should change this on first login.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Profile & Identity */}
      <div className="space-y-4">
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <h3 className="text-green-900 flex items-center gap-2 mb-4">
            <IdCard className="w-5 h-5" />
            Profile & Identity
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-photo" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Profile Photo (Optional)
              </Label>
              <Input
                id="profile-photo"
                type="file"
                accept="image/*"
                onChange={(e) => setStep2Data({ ...step2Data, profilePhoto: e.target.files?.[0] || null })}
                className="h-12"
              />
              {step2Data.profilePhoto && (
                <p className="text-sm text-green-600">✓ {step2Data.profilePhoto.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Street Address *
              </Label>
              <Input
                id="address"
                type="text"
                placeholder="123 Main Street, Apt 4B"
                value={step2Data.address}
                onChange={(e) => setStep2Data({ ...step2Data, address: e.target.value })}
                className="h-12 text-base"
                required
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="New York"
                  value={step2Data.city}
                  onChange={(e) => setStep2Data({ ...step2Data, city: e.target.value })}
                  className="h-12 text-base"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  type="text"
                  placeholder="NY"
                  value={step2Data.state}
                  onChange={(e) => setStep2Data({ ...step2Data, state: e.target.value })}
                  className="h-12 text-base"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code *</Label>
                <Input
                  id="zipCode"
                  type="text"
                  placeholder="10001"
                  value={step2Data.zipCode}
                  onChange={(e) => setStep2Data({ ...step2Data, zipCode: e.target.value })}
                  className="h-12 text-base"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Gender *
              </Label>
              <Select value={step2Data.gender} onValueChange={(value) => setStep2Data({ ...step2Data, gender: value })}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="id-card-number" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                ID Card Number *
              </Label>
              <Input
                id="id-card-number"
                type="text"
                placeholder="Driver's License or State ID number"
                value={step2Data.idCardNumber}
                onChange={(e) => setStep2Data({ ...step2Data, idCardNumber: e.target.value })}
                className="h-12 text-base"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="id-card-copy" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload ID Card Copy (Optional)
              </Label>
              <p className="text-sm text-gray-600">Upload a clear photo of driver's license, passport, or state ID</p>
              <Input
                id="id-card-copy"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setStep2Data({ ...step2Data, idCardCopy: e.target.files?.[0] || null })}
                className="h-12"
              />
              {step2Data.idCardCopy && (
                <p className="text-sm text-green-600">✓ {step2Data.idCardCopy.name}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Service Expertise */}
      <div className="space-y-4">
        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
          <h3 className="text-purple-900 flex items-center gap-2 mb-4">
            <Award className="w-5 h-5" />
            Service Expertise
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="specialty">
                Primary Specialty *
              </Label>
              <Input
                id="specialty"
                type="text"
                placeholder="e.g., Registered Nurse, Home Care Aide, Certified Caregiver"
                value={step3Data.specialty}
                onChange={(e) => setStep3Data({ ...step3Data, specialty: e.target.value })}
                className="h-12 text-base"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Services You Provide *</Label>
              <p className="text-sm text-gray-600">Select all that apply</p>
              <div className="grid md:grid-cols-2 gap-3">
                {serviceOptions.map((service) => {
                  const isSelected = step3Data.services.includes(service.id);
                  return (
                    <div
                      key={service.id}
                      className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                      onClick={() => toggleService(service.id)}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300'
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                      {service.icon && <span className="text-purple-600">{renderIcon(service.icon)}</span>}
                      <span className="text-gray-900">{service.title || service.label}</span>
                    </div>
                  );
                })}
              </div>
              {step3Data.services.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {step3Data.services.map(s => {
                    const service = serviceOptions.find(opt => opt.id === s);
                    return (
                      <Badge key={s} className="bg-purple-100 text-purple-700">
                        {service?.label}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="experience">
                  Years of Experience *
                </Label>
                <Input
                  id="experience"
                  type="number"
                  placeholder="e.g., 5"
                  value={step3Data.experienceYears}
                  onChange={(e) => setStep3Data({ ...step3Data, experienceYears: e.target.value })}
                  className="h-12 text-base"
                  min="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate">
                  Hourly Rate ($) *
                </Label>
                <Input
                  id="rate"
                  type="number"
                  placeholder="e.g., 45"
                  value={step3Data.hourlyRate}
                  onChange={(e) => setStep3Data({ ...step3Data, hourlyRate: e.target.value })}
                  className="h-12 text-base"
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience-details">
                Experience Details *
              </Label>
              <Textarea
                id="experience-details"
                placeholder="Describe your relevant experience, previous roles, special training, and what makes you qualified to provide care..."
                value={step3Data.experienceDetails}
                onChange={(e) => setStep3Data({ ...step3Data, experienceDetails: e.target.value })}
                className="min-h-32 text-base"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="certifications" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Certifications & Licenses (Optional)
              </Label>
              <p className="text-sm text-gray-600">Upload any relevant certifications, licenses, or training certificates</p>
              <Input
                id="certifications"
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={(e) => setStep3Data({ ...step3Data, certifications: Array.from(e.target.files || []) })}
                className="h-12"
              />
              {step3Data.certifications.length > 0 && (
                <div className="space-y-1">
                  {step3Data.certifications.map((cert, i) => (
                    <p key={i} className="text-sm text-green-600">✓ {cert.name}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-900">
                <strong>Note:</strong> Admin-created provider accounts are automatically approved and can immediately start accepting jobs. 
                All verification and background checks should be completed by the admin before creating the account.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="flex-1 h-12"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white"
        >
          {loading ? 'Creating Account...' : 'Create Provider Account'}
        </Button>
      </div>
    </form>
  );
}