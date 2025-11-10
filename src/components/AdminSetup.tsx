import { useState } from 'react';
import { Shield, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { apiRequest } from '../utils/api';

interface AdminSetupProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function AdminSetup({ onBack, onSuccess }: AdminSetupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [adminData, setAdminData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (adminData.password !== adminData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (adminData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const result = await apiRequest('/auth/init-admin', {
        method: 'POST',
        body: JSON.stringify({
          email: adminData.email,
          password: adminData.password,
          name: adminData.name,
        }),
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err: any) {
      console.error('Admin setup error:', err);
      setError(err.message || 'Failed to create admin account. It may already exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-purple-100">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-purple-600" />
              <h2 className="text-purple-600">Admin Setup</h2>
            </div>
            <Button onClick={onBack} variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              Back
            </Button>
          </div>
        </div>
      </header>

      {/* Setup Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-2 border-purple-200">
          <CardHeader className="bg-purple-50">
            <CardTitle className="text-purple-900">Initialize Admin Account</CardTitle>
            <p className="text-gray-600">
              Create the first administrator account for CareConnect
            </p>
          </CardHeader>
          <CardContent className="p-6">
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            {success ? (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-700">
                  ✓ Admin account created successfully! Redirecting to login...
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <Alert className="border-purple-200 bg-purple-50">
                  <AlertDescription className="text-purple-900">
                    This is a one-time setup for creating the first admin account. Use this to access 
                    the admin panel where you can manage users, verify providers, and oversee the platform.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="admin-name" className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Full Name
                  </Label>
                  <Input
                    id="admin-name"
                    type="text"
                    placeholder="Admin Name"
                    value={adminData.name}
                    onChange={(e) => setAdminData({ ...adminData, name: e.target.value })}
                    required
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-email" className="text-lg flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email Address
                  </Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@careconnect.com"
                    value={adminData.email}
                    onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
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
                    placeholder="Create a secure password (min 6 characters)"
                    value={adminData.password}
                    onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                    required
                    minLength={6}
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-confirm-password" className="text-lg flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Confirm Password
                  </Label>
                  <Input
                    id="admin-confirm-password"
                    type="password"
                    placeholder="Re-enter your password"
                    value={adminData.confirmPassword}
                    onChange={(e) => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                    className="h-12 text-base"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white h-14 text-lg"
                >
                  {loading ? 'Creating Admin Account...' : 'Create Admin Account'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
