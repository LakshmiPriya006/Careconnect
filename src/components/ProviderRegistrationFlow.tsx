import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Upload, FileText, Award, ArrowRight, ArrowLeft, CheckCircle, IdCard, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { auth, client } from '../utils/api';
import * as Icons from 'lucide-react';

interface ProviderRegistrationFlowProps {
  onSuccess: (email: string, password: string, name: string) => void;
  onBack: () => void;
}

export function ProviderRegistrationFlow({ onSuccess, onBack }: ProviderRegistrationFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Step 1: Contact Verification
  const [step1Data, setStep1Data] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [emailOtp, setEmailOtp] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [otpSent, setOtpSent] = useState({ email: false, mobile: false });
  const [verified, setVerified] = useState({ email: false, mobile: false });

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
        label: s.title, // For backward compatibility
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

  const handleSendOtp = async (type: 'email' | 'mobile') => {
    setError('');
    
    // Validate that the contact info is provided
    if (type === 'email' && !step1Data.email) {
      setError('Please enter your email address first');
      return;
    }
    if (type === 'mobile' && !step1Data.phone) {
      setError('Please enter your phone number first');
      return;
    }
    
    try {
      // For demo purposes, generate a test OTP
      const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setOtpSent({ ...otpSent, [type]: true });
      console.log(`🔐 Test ${type.toUpperCase()} OTP: ${testOtp}`);
      alert(`For testing: Your ${type.toUpperCase()} OTP is ${testOtp}\n\nIn production, this would be sent to your ${type}.`);
    } catch (err) {
      setError(`Failed to send OTP to ${type}`);
    }
  };

  const handleVerifyOtp = (type: 'email' | 'mobile', otp: string) => {
    // Simple verification for demo - in production this would hit an API
    if (otp.length === 6) {
      setVerified({ ...verified, [type]: true });
      if (type === 'email') setEmailOtp('');
      if (type === 'mobile') setMobileOtp('');
    } else {
      setError('Please enter a valid 6-digit OTP');
    }
  };

  const handleStep1Next = () => {
    if (!step1Data.name || !step1Data.email || !step1Data.phone || !step1Data.password) {
      setError('Please fill in all required fields');
      return;
    }
    if (!verified.email || !verified.mobile) {
      setError('Please verify both email and mobile number');
      return;
    }
    setError('');
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    if (!step2Data.address || !step2Data.city || !step2Data.state || !step2Data.zipCode || 
        !step2Data.gender || !step2Data.idCardNumber || !step2Data.idCardCopy) {
      setError('Please fill in all required fields including gender and upload ID card copy');
      return;
    }
    setError('');
    setCurrentStep(3);
  };

  const handleFinalSubmit = async () => {
    if (!step3Data.specialty || step3Data.services.length === 0 || 
        !step3Data.experienceYears || !step3Data.experienceDetails || !step3Data.hourlyRate) {
      setError('Please complete all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Combine all data for provider signup
      const providerData = {
        // Step 1
        name: step1Data.name,
        email: step1Data.email,
        password: step1Data.password,
        phone: step1Data.phone,
        emailVerified: verified.email,
        mobileVerified: verified.mobile,
        
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

      const result = await auth.signUpProvider(providerData);

      if (result.success) {
        // Call onSuccess to trigger login
        onSuccess(step1Data.email, step1Data.password, step1Data.name);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Handle specific error cases
      if (err.message?.includes('already been registered') || err.message?.includes('already exists')) {
        setError(
          `This email address (${step1Data.email}) is already registered. ` +
          'Please use the "Back" button and login instead, or use a different email address.'
        );
      } else if (err.message?.includes('Invalid email')) {
        setError('Please enter a valid email address.');
      } else if (err.message?.includes('password')) {
        setError('Password must be at least 6 characters long.');
      } else {
        setError(err.message || 'Failed to complete registration. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (serviceId: string) => {
    setStep3Data(prev => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter(s => s !== serviceId)
        : [...prev.services, serviceId]
    }));
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    if (IconComponent) {
      return <IconComponent className="w-5 h-5" />;
    }
    return <Sparkles className="w-5 h-5" />;
  };

  const progressPercentage = (currentStep / 3) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress Header */}
        <Card className="border-2 border-green-200 mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-green-900">Provider Registration</h3>
                <span className="text-green-600">Step {currentStep} of 3</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <div className="flex justify-between text-sm">
                <span className={currentStep >= 1 ? 'text-green-600' : 'text-gray-400'}>
                  Contact Verification
                </span>
                <span className={currentStep >= 2 ? 'text-green-600' : 'text-gray-400'}>
                  Profile & Identity
                </span>
                <span className={currentStep >= 3 ? 'text-green-600' : 'text-gray-400'}>
                  Service Expertise
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">
              {error}
              {error.includes('already registered') && (
                <div className="mt-3">
                  <Button 
                    onClick={onBack}
                    variant="outline"
                    size="sm"
                    className="border-red-300 hover:bg-red-100"
                  >
                    Go to Login
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Step 1: Contact Verification */}
        {currentStep === 1 && (
          <Card className="border-2 border-green-200">
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-900 flex items-center gap-2">
                <Mail className="w-6 h-6" />
                Step 1: Contact Information & Verification
              </CardTitle>
              <p className="text-gray-600">Enter your details and verify your contact information</p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={step1Data.name}
                    onChange={(e) => setStep1Data({ ...step1Data, name: e.target.value })}
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-lg flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={step1Data.email}
                    onChange={(e) => setStep1Data({ ...step1Data, email: e.target.value })}
                    className="h-12 text-base"
                    disabled={verified.email}
                  />
                  {!verified.email && (
                    <div className="space-y-2 mt-3">
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Enter 6-digit OTP"
                          value={emailOtp}
                          onChange={(e) => setEmailOtp(e.target.value)}
                          maxLength={6}
                          className="h-12"
                        />
                        <Button
                          onClick={() => handleSendOtp('email')}
                          variant="outline"
                          className="h-12 px-6 whitespace-nowrap"
                        >
                          {otpSent.email ? 'Resend' : 'Send OTP'}
                        </Button>
                      </div>
                      <Button
                        onClick={() => handleVerifyOtp('email', emailOtp)}
                        className="bg-green-600 hover:bg-green-700 text-white h-12 w-full"
                        disabled={emailOtp.length !== 6}
                      >
                        Verify Email
                      </Button>
                    </div>
                  )}
                  {verified.email && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-900">Email verified successfully</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-lg flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Mobile Number *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={step1Data.phone}
                    onChange={(e) => setStep1Data({ ...step1Data, phone: e.target.value })}
                    className="h-12 text-base"
                    disabled={verified.mobile}
                  />
                  {!verified.mobile && (
                    <div className="space-y-2 mt-3">
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Enter 6-digit OTP"
                          value={mobileOtp}
                          onChange={(e) => setMobileOtp(e.target.value)}
                          maxLength={6}
                          className="h-12"
                        />
                        <Button
                          onClick={() => handleSendOtp('mobile')}
                          variant="outline"
                          className="h-12 px-6 whitespace-nowrap"
                        >
                          {otpSent.mobile ? 'Resend' : 'Send OTP'}
                        </Button>
                      </div>
                      <Button
                        onClick={() => handleVerifyOtp('mobile', mobileOtp)}
                        className="bg-green-600 hover:bg-green-700 text-white h-12 w-full"
                        disabled={mobileOtp.length !== 6}
                      >
                        Verify Mobile
                      </Button>
                    </div>
                  )}
                  {verified.mobile && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-900">Mobile verified successfully</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-lg">
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
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={onBack} variant="outline" className="flex-1 h-12">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleStep1Next} className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white">
                  Next Step
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Profile & Identity */}
        {currentStep === 2 && (
          <Card className="border-2 border-green-200">
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-900 flex items-center gap-2">
                <IdCard className="w-6 h-6" />
                Step 2: Profile & Identity Verification
              </CardTitle>
              <p className="text-gray-600">Upload your documents for identity verification</p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-photo" className="text-lg flex items-center gap-2">
                    <Upload className="w-5 h-5" />
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
                  <Label htmlFor="address" className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Street Address *
                  </Label>
                  <Input
                    id="address"
                    type="text"
                    placeholder="123 Main Street, Apt 4B"
                    value={step2Data.address}
                    onChange={(e) => setStep2Data({ ...step2Data, address: e.target.value })}
                    className="h-12 text-base"
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
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5" />
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
                  <Label htmlFor="id-card-number" className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    ID Card Number *
                  </Label>
                  <Input
                    id="id-card-number"
                    type="text"
                    placeholder="Driver's License or State ID number"
                    value={step2Data.idCardNumber}
                    onChange={(e) => setStep2Data({ ...step2Data, idCardNumber: e.target.value })}
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="id-card-copy" className="text-lg flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload ID Card Copy *
                  </Label>
                  <p className="text-sm text-gray-600">Upload a clear photo of your driver's license, passport, or state ID</p>
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

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Privacy Notice:</strong> All documents will be reviewed by our admin team for identity verification 
                    and background checks. Your information is kept secure and confidential.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={() => setCurrentStep(1)} variant="outline" className="flex-1 h-12">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleStep2Next} className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white">
                  Next Step
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Service Expertise */}
        {currentStep === 3 && (
          <Card className="border-2 border-green-200">
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-900 flex items-center gap-2">
                <Award className="w-6 h-6" />
                Step 3: Service Expertise
              </CardTitle>
              <p className="text-gray-600">Tell us about your skills and experience</p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="specialty" className="text-lg">
                    Primary Specialty *
                  </Label>
                  <Input
                    id="specialty"
                    type="text"
                    placeholder="e.g., Registered Nurse, Home Care Aide, Certified Caregiver"
                    value={step3Data.specialty}
                    onChange={(e) => setStep3Data({ ...step3Data, specialty: e.target.value })}
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-lg">Services You Provide *</Label>
                  <p className="text-sm text-gray-600">Select all that apply</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    {serviceOptions.map((service) => (
                      <div
                        key={service.id}
                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          step3Data.services.includes(service.id)
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                        onClick={() => toggleService(service.id)}
                      >
                        <Checkbox
                          checked={step3Data.services.includes(service.id)}
                          onCheckedChange={() => toggleService(service.id)}
                        />
                        {service.icon && <span className="text-green-600">{renderIcon(service.icon)}</span>}
                        <span className="text-gray-900">{service.title || service.label}</span>
                      </div>
                    ))}
                  </div>
                  {step3Data.services.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {step3Data.services.map(s => {
                        const service = serviceOptions.find(opt => opt.id === s);
                        return (
                          <Badge key={s} className="bg-green-100 text-green-700">
                            {service?.label}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="experience" className="text-lg">
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
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rate" className="text-lg">
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
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience-details" className="text-lg">
                    Experience Details *
                  </Label>
                  <Textarea
                    id="experience-details"
                    placeholder="Describe your relevant experience, previous roles, special training, and what makes you qualified to provide care..."
                    value={step3Data.experienceDetails}
                    onChange={(e) => setStep3Data({ ...step3Data, experienceDetails: e.target.value })}
                    className="min-h-32 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certifications" className="text-lg flex items-center gap-2">
                    <Upload className="w-5 h-5" />
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
                    <strong>Note:</strong> Your application will be reviewed by our admin team. This includes identity verification, 
                    background checks, and expertise validation. You'll be notified once your profile is approved and you can start accepting jobs.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={() => setCurrentStep(2)} variant="outline" className="flex-1 h-12">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={handleFinalSubmit} 
                  disabled={loading}
                  className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading ? 'Submitting...' : 'Complete Registration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}