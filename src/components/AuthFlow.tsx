import { useState, useEffect } from 'react';
import { Heart, ArrowLeft, Mail, Lock, User, Phone, MapPin, Briefcase, DollarSign, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { createClient } from '../utils/supabase/client';
import { auth } from '../utils/api';
import { ProviderRegistrationFlow } from './ProviderRegistrationFlow';
import { ClientSignupFlow } from './ClientSignupFlow';

interface AuthFlowProps {
  role: 'client' | 'provider' | 'admin';
  onSuccess: (role: 'client' | 'provider' | 'admin', name: string) => void;
  onBack: () => void;
  onAdminSetup?: () => void;
}

export function AuthFlow({ role, onSuccess, onBack, onAdminSetup }: AuthFlowProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminExists, setAdminExists] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [showProviderRegistration, setShowProviderRegistration] = useState(false);
  const [showClientSignup, setShowClientSignup] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Client signup form state
  const [clientData, setClientData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    address: '',
    age: '',
    gender: '',
  });

  // Check if admin exists when role is admin
  useEffect(() => {
    if (role === 'admin') {
      checkAdminExists();
    }
  }, [role]);

  const checkAdminExists = async () => {
    setCheckingAdmin(true);
    try {
      const result = await auth.checkAdminExists();
      setAdminExists(result.adminExists);
    } catch (err) {
      console.error('Error checking admin:', err);
      setAdminExists(false);
    } finally {
      setCheckingAdmin(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Attempting login for:', loginEmail, 'as role:', role);
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (authError) {
        console.error('❌ Auth error:', authError);
        throw authError;
      }

      console.log('✅ Login successful, user data:', data.user?.user_metadata);
      console.log('✅ Session access token (first 20 chars):', data.session?.access_token?.substring(0, 20));

      if (data.session) {
        // Immediately save token to localStorage
        localStorage.setItem('access_token', data.session.access_token);
        console.log('💾 Token saved to localStorage');
        
        const userRole = data.user.user_metadata?.role || 'client';
        const userName = data.user.user_metadata?.name || 'User';
        
        console.log('👤 User role:', userRole, 'Name:', userName);

        if (role === 'admin' && userRole !== 'admin') {
          setError('This account is not an admin account. Please use the correct login option.');
          await supabase.auth.signOut();
          localStorage.removeItem('access_token');
          return;
        }
        
        // Wait a moment to ensure session is fully persisted by Supabase
        console.log('⏳ Waiting for session to persist...');
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('✅ Calling onSuccess with role:', userRole);
        
        onSuccess(userRole, userName);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Provide more specific error messages
      if (err.message?.includes('Invalid login credentials')) {
        if (role === 'admin') {
          setError('Invalid admin credentials. If you haven\'t created an admin account yet, please use Admin Setup.');
        } else if (role === 'client') {
          setError(
            'Invalid email or password. If you don\'t have an account yet, please click the "Sign Up" tab above to create one.'
          );
        } else if (role === 'provider') {
          setError(
            'Invalid email or password. If you don\'t have an account yet, please click the "Sign Up" tab above to register as a provider.'
          );
        } else {
          setError('Invalid email or password. Please check your credentials and try again.');
        }
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Please verify your email address before logging in.');
      } else {
        setError(err.message || 'Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClientSignupSuccess = async (email: string, password: string, name: string) => {
    // After successful registration, log them in
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.session) {
        localStorage.setItem('access_token', data.session.access_token);
        onSuccess('client', name);
      }
    } catch (err: any) {
      console.error('Login error after registration:', err);
      setError('Registration successful! Please log in with your credentials.');
      setShowClientSignup(false);
      setIsLogin(true);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderRegistrationSuccess = async (email: string, password: string, name: string) => {
    // After successful registration, log them in
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.session) {
        localStorage.setItem('access_token', data.session.access_token);
        onSuccess('provider', name);
      }
    } catch (err: any) {
      console.error('Login error after registration:', err);
      setError('Registration successful! Please log in with your credentials.');
      setShowProviderRegistration(false);
      setIsLogin(true);
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = () => {
    switch (role) {
      case 'client': return 'blue';
      case 'provider': return 'green';
      case 'admin': return 'purple';
    }
  };

  const getRoleTitle = () => {
    switch (role) {
      case 'client': return 'Client Account';
      case 'provider': return 'Service Provider Account';
      case 'admin': return 'Admin Account';
    }
  };

  const color = getRoleColor();

  // Show client signup flow if signing up as client
  if (role === 'client' && !isLogin && showClientSignup) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className={`bg-white shadow-sm border-b-2 border-${color}-100`}>
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className={`w-8 h-8 text-${color}-600`} />
                <h2 className={`text-${color}-600`}>CareConnect</h2>
              </div>
              <Button onClick={() => setShowClientSignup(false)} variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" />
                Back to Login
              </Button>
            </div>
          </div>
        </header>
        <div className="py-8 px-4">
          <ClientSignupFlow 
            onSuccess={handleClientSignupSuccess}
            onBack={() => setShowClientSignup(false)}
          />
        </div>
      </div>
    );
  }

  // Show provider registration flow if signing up as provider
  if (role === 'provider' && !isLogin && showProviderRegistration) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className={`bg-white shadow-sm border-b-2 border-${color}-100`}>
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className={`w-8 h-8 text-${color}-600`} />
                <h2 className={`text-${color}-600`}>CareConnect</h2>
              </div>
              <Button onClick={() => setShowProviderRegistration(false)} variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" />
                Back to Login
              </Button>
            </div>
          </div>
        </header>
        <ProviderRegistrationFlow 
          onSuccess={handleProviderRegistrationSuccess}
          onBack={() => setShowProviderRegistration(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className={`bg-white shadow-sm border-b-2 border-${color}-100`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className={`w-8 h-8 text-${color}-600`} />
              <h2 className={`text-${color}-600`}>CareConnect</h2>
            </div>
            <Button onClick={onBack} variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              Back
            </Button>
          </div>
        </div>
      </header>

      {/* Auth Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className={`w-full max-w-2xl border-2 border-${color}-200`}>
          <CardHeader className={`bg-${color}-50`}>
            <CardTitle className={`text-${color}-900`}>{getRoleTitle()}</CardTitle>
            <p className="text-gray-600">
              {role === 'admin' 
                ? 'Admin accounts are managed by system administrators' 
                : isLogin ? 'Sign in to your account' : 'Create a new account'}
            </p>
          </CardHeader>
          <CardContent className="p-6">
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            {role === 'admin' && !adminExists && !checkingAdmin && (
              <Alert className="mb-6 border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <AlertDescription className="text-yellow-900">
                  <p className="mb-3">No admin account has been created yet.</p>
                  {onAdminSetup ? (
                    <Button
                      onClick={onAdminSetup}
                      variant="outline"
                      className="border-yellow-300 hover:bg-yellow-100"
                    >
                      Go to Admin Setup
                    </Button>
                  ) : (
                    <p className="text-sm">Please use the Admin Setup option from the landing page to create an admin account first.</p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {role === 'admin' ? (
              // Admin login only (no tabs)
              <form onSubmit={handleLogin} className="space-y-6" style={{ opacity: checkingAdmin ? 0.5 : 1 }}>
                <div className="space-y-2">
                  <Label htmlFor="admin-email" className="text-lg flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email
                  </Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@careconnect.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-password" className="text-lg flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Password
                  </Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="h-12 text-base"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || checkingAdmin || !adminExists}
                  className={`w-full bg-${color}-600 hover:bg-${color}-700 text-white h-14 text-lg`}
                >
                  {checkingAdmin ? 'Checking...' : loading ? 'Signing in...' : 'Admin Sign In'}
                </Button>
              </form>
            ) : (
              // Client and Provider login/signup tabs
              <Tabs value={isLogin ? 'login' : 'signup'} onValueChange={(v) => setIsLogin(v === 'login')}>
                <TabsList className="grid grid-cols-2 mb-6">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-6">
                    {/* Help text for new users */}
                    {!error && (
                      <Alert className={`border-${color}-200 bg-${color}-50`}>
                        <AlertCircle className={`h-5 w-5 text-${color}-600`} />
                        <AlertDescription className={`text-${color}-900`}>
                          <strong>Don't have an account?</strong> Click the "Sign Up" tab above to create a new {role === 'client' ? 'client' : 'provider'} account.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-lg flex items-center gap-2">
                        <Mail className="w-5 h-5" />
                        Email
                      </Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        className="h-12 text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-lg flex items-center gap-2">
                        <Lock className="w-5 h-5" />
                        Password
                      </Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        className="h-12 text-base"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className={`w-full bg-${color}-600 hover:bg-${color}-700 text-white h-14 text-lg`}
                    >
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>
                </TabsContent>

                {/* Signup Tab */}
                <TabsContent value="signup">
                  {role === 'client' ? (
                    <div className="space-y-6">
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
                        <h4 className="text-blue-900 mb-2">Create Your Client Account</h4>
                        <p className="text-gray-700 mb-4">
                          We'll need to verify your email and phone number to create your account and ensure your safety.
                        </p>
                        <Button
                          onClick={() => setShowClientSignup(true)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 text-lg"
                        >
                          Start Registration
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
                        <h4 className="text-green-900 mb-2">Complete Provider Registration</h4>
                        <p className="text-gray-700 mb-4">
                          Provider registration requires a comprehensive multi-step verification process including 
                          contact verification, identity documents, and service expertise validation.
                        </p>
                        <Button
                          onClick={() => setShowProviderRegistration(true)}
                          className="bg-green-600 hover:bg-green-700 text-white h-12 px-8"
                        >
                          Start Registration Process
                        </Button>
                      </div>
                      <p className="text-sm text-center text-gray-600">
                        Already have an account? Switch to the "Login" tab above.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}