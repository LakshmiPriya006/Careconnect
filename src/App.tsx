import { useState, useEffect } from 'react';
import { ClientDashboard } from './components/ClientDashboard';
import { ProviderDashboard } from './components/ProviderDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { LandingPage } from './components/LandingPage';
import { AuthFlow } from './components/AuthFlow';
import { AdminSetup } from './components/AdminSetup';
import { createClient } from './utils/supabase/client';
import { Toaster } from './components/ui/sonner';
import { CurrencyProvider } from './utils/currency';

type UserRole = 'landing' | 'auth' | 'admin-setup' | 'client' | 'provider' | 'admin';

export default function App() {
  const [userRole, setUserRole] = useState<UserRole>('landing');
  const [authRole, setAuthRole] = useState<'client' | 'provider' | 'admin'>('client');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const supabase = createClient();
    
    try {
      console.log('🔍 Checking for existing session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Error checking session:', error);
        return;
      }
      
      if (session) {
        console.log('✅ Existing session found for user:', session.user.email);
        console.log('🔑 Token (first 20 chars):', session.access_token?.substring(0, 20));
        
        localStorage.setItem('access_token', session.access_token);
        const role = session.user.user_metadata?.role || 'client';
        const name = session.user.user_metadata?.name || 'User';
        
        console.log('👤 Setting user as:', name, 'with role:', role);
        
        setUserName(name);
        setUserId(session.user.id);
        setIsAuthenticated(true);
        setUserRole(role);
      } else {
        console.log('ℹ️ No existing session found - user needs to log in');
        // Clear any stale tokens
        localStorage.removeItem('access_token');
      }
    } catch (err) {
      console.error('❌ Exception checking session:', err);
      // Clear any stale tokens
      localStorage.removeItem('access_token');
    }
  };

  const handleRoleSelect = (role: 'client' | 'provider' | 'admin') => {
    setAuthRole(role);
    setUserRole('auth');
  };

  const handleAuthSuccess = async (role: 'client' | 'provider' | 'admin', name: string) => {
    setUserName(name);
    
    // Get the user ID and ensure token is saved from the session
    const supabase = createClient();
    try {
      // Wait a bit for Supabase session to be fully initialized
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session after auth:', error);
        return;
      }
      
      if (session) {
        console.log('✅ Session retrieved, saving token and user info');
        // Ensure token is saved to localStorage
        localStorage.setItem('access_token', session.access_token);
        setUserId(session.user.id);
        
        // Additional small delay to ensure everything is propagated
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Now set authenticated state
        setIsAuthenticated(true);
        setUserRole(role);
        console.log('✅ User role set to:', role);
      } else {
        console.error('No session found after successful auth');
      }
    } catch (err) {
      console.error('Exception in handleAuthSuccess:', err);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem('access_token');
    setIsAuthenticated(false);
    setUserRole('landing');
    setUserName('');
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      <CurrencyProvider>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
          {userRole === 'landing' && (
            <LandingPage 
              onRoleSelect={handleRoleSelect}
              onAdminSetup={() => setUserRole('admin-setup')}
            />
          )}
          {userRole === 'admin-setup' && (
            <AdminSetup
              onBack={() => setUserRole('landing')}
              onSuccess={() => {
                setAuthRole('admin');
                setUserRole('auth');
              }}
            />
          )}
          {userRole === 'auth' && (
            <AuthFlow 
              role={authRole} 
              onSuccess={handleAuthSuccess}
              onBack={() => setUserRole('landing')}
              onAdminSetup={() => setUserRole('admin-setup')}
            />
          )}
          {userRole === 'client' && <ClientDashboard onLogout={handleLogout} clientName={userName} />}
          {userRole === 'provider' && <ProviderDashboard onLogout={handleLogout} userName={userName} providerId={userId} />}
          {userRole === 'admin' && <AdminDashboard onLogout={handleLogout} />}
        </div>
      </CurrencyProvider>
    </>
  );
}