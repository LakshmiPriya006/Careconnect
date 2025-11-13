import { useState } from 'react';
import { User, Mail, Phone, MapPin, Lock, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { auth } from '../utils/api';

interface ClientSignupFlowProps {
  onSuccess: (email: string, password: string, name: string) => void;
  onBack: () => void;
}

export function ClientSignupFlow({ onSuccess, onBack }: ClientSignupFlowProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    age: '',
    gender: '',
    password: '',
  });

  // OTP state
  const [emailOtp, setEmailOtp] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [otpSent, setOtpSent] = useState({ email: false, mobile: false });
  const [verified, setVerified] = useState({ email: false, mobile: false });

  const handleSendOtp = async (type: 'email' | 'mobile') => {
    setError('');
    
    if (type === 'email' && !formData.email) {
      setError('Please enter your email address first');
      return;
    }
    if (type === 'mobile' && !formData.phone) {
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
      setError('');
    } else {
      setError('Please enter a valid 6-digit OTP');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate all fields
    if (!formData.name || !formData.email || !formData.phone || !formData.address || 
        !formData.age || !formData.gender || !formData.password) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (!verified.email || !verified.mobile) {
      setError('Please verify both email and mobile number');
      setLoading(false);
      return;
    }

    try {
      // Use direct Supabase Auth signup (bypasses custom server endpoint)
      const { createClient } = await import('../utils/supabase/client');
      const supabase = createClient();
      
      console.log('🔐 Creating user account with Supabase Auth...');
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone,
            role: 'client',
          },
          emailRedirectTo: undefined // Disable email verification for development
        }
      });

      if (error) {
        console.error('❌ Supabase Auth error:', error);
        throw error;
      }

      console.log('✅ User account created:', data.user?.id);
      
      // TODO: Save client data to SQL tables when tables are ready
      // For now, just proceed with login
      
      if (data.user) {
        // Call onSuccess to trigger login
        onSuccess(formData.email, formData.password, formData.name);
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      
      // Handle specific error cases
      if (err.message?.includes('already been registered') || err.message?.includes('already exists')) {
        setError(
          `This email address (${formData.email}) is already registered. ` +
          'Please go back and login instead, or use a different email address.'
        );
      } else if (err.message?.includes('Invalid email')) {
        setError('Please enter a valid email address.');
      } else if (err.message?.includes('password')) {
        setError('Password must be at least 6 characters long.');
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-blue-900">Create Your Account</CardTitle>
          <p className="text-gray-600">Please verify your contact information</p>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Display */}
            {error && (
              <Alert className="border-red-200 bg-red-50">
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

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Full Name *
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-12 text-base"
              />
            </div>

            {/* Email with OTP */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-lg flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={verified.email}
                className="h-12 text-base"
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
                      type="button"
                      onClick={() => handleSendOtp('email')}
                      variant="outline"
                      className="h-12 px-6 whitespace-nowrap"
                    >
                      {otpSent.email ? 'Resend' : 'Send OTP'}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleVerifyOtp('email', emailOtp)}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-12 w-full"
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

            {/* Phone with OTP */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-lg flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Phone Number *
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                disabled={verified.mobile}
                className="h-12 text-base"
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
                      type="button"
                      onClick={() => handleSendOtp('mobile')}
                      variant="outline"
                      className="h-12 px-6 whitespace-nowrap"
                    >
                      {otpSent.mobile ? 'Resend' : 'Send OTP'}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleVerifyOtp('mobile', mobileOtp)}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-12 w-full"
                    disabled={mobileOtp.length !== 6}
                  >
                    Verify Phone
                  </Button>
                </div>
              )}
              {verified.mobile && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-900">Phone verified successfully</span>
                </div>
              )}
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Address *
              </Label>
              <Input
                id="address"
                type="text"
                placeholder="123 Main St, City, State"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                className="h-12 text-base"
              />
            </div>

            {/* Age and Gender */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age" className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Age *
                </Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="e.g., 72"
                  min="18"
                  max="120"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  required
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender" className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Gender *
                </Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                  <SelectTrigger className="h-12">
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

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-lg flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Password *
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a secure password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                className="h-12 text-base"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={onBack}
                variant="outline"
                className="h-14 text-lg flex-1"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={loading || !verified.email || !verified.mobile}
                className="bg-blue-600 hover:bg-blue-700 text-white h-14 text-lg flex-1"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
