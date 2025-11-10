import { Heart, UserCircle, Shield, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { ApiConnectionTest } from './ApiConnectionTest';
import { useState } from 'react';

interface LandingPageProps {
  onRoleSelect: (role: 'client' | 'provider' | 'admin') => void;
  onAdminSetup?: () => void;
}

export function LandingPage({ onRoleSelect, onAdminSetup }: LandingPageProps) {
  const [showConnectionTest, setShowConnectionTest] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-blue-100">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-3">
            <Heart className="w-10 h-10 text-blue-600" />
            <h1 className="text-blue-600">CareConnect</h1>
          </div>
          <p className="text-center text-gray-600 mt-2">Trusted Care at Your Doorstep</p>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-blue-900 mb-4">Welcome to CareConnect</h2>
          <p className="text-gray-700 max-w-2xl mx-auto text-lg">
            Connect with verified service providers for home care, cleaning, nursing, and more. 
            Simple, safe, and reliable assistance for independent living.
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all">
            <CardContent className="p-8 text-center">
              <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserCircle className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-blue-900 mb-3">I Need Help</h3>
              <p className="text-gray-600 mb-6">
                Request assistance from verified caregivers and service providers
              </p>
              <Button 
                onClick={() => onRoleSelect('client')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 text-lg"
              >
                Continue as Client
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 hover:border-green-400 hover:shadow-lg transition-all">
            <CardContent className="p-8 text-center">
              <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-green-900 mb-3">I'm a Provider</h3>
              <p className="text-gray-600 mb-6">
                Offer your services and help those in need in your community
              </p>
              <Button 
                onClick={() => onRoleSelect('provider')}
                className="w-full bg-green-600 hover:bg-green-700 text-white h-14 text-lg"
              >
                Provider Login
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all">
            <CardContent className="p-8 text-center">
              <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-12 h-12 text-purple-600" />
              </div>
              <h3 className="text-purple-900 mb-3">Admin Panel</h3>
              <p className="text-gray-600 mb-6">
                Manage users, verify providers, and monitor platform activity
              </p>
              <Button 
                onClick={() => onRoleSelect('admin')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white h-14 text-lg"
              >
                Admin Access
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Connection Test Section */}
        <div className="mt-12 max-w-3xl mx-auto">
          <div className="text-center mb-4">
            <Button
              onClick={() => setShowConnectionTest(!showConnectionTest)}
              variant="outline"
              size="sm"
            >
              {showConnectionTest ? 'Hide' : 'Show'} API Connection Test
            </Button>
          </div>
          {showConnectionTest && <ApiConnectionTest />}
        </div>

        {/* Features Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h3 className="text-center text-blue-900 mb-8">Why Choose CareConnect?</h3>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="p-6">
              <div className="text-4xl mb-3">✓</div>
              <p className="text-gray-700">All providers verified and background checked</p>
            </div>
            <div className="p-6">
              <div className="text-4xl mb-3">🔒</div>
              <p className="text-gray-700">Secure payments and privacy protection</p>
            </div>
            <div className="p-6">
              <div className="text-4xl mb-3">⭐</div>
              <p className="text-gray-700">Rated and reviewed by real users</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t-2 border-blue-100 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <p className="text-gray-600">© 2025 CareConnect. Helping you live independently with confidence.</p>
            {onAdminSetup && (
              <Button
                onClick={onAdminSetup}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-purple-600"
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin Setup
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}