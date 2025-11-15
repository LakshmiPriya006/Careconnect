import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Wifi, WifiOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function ConnectionDebugger() {
  const [testing, setTesting] = useState(false);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [servicesStatus, setServicesStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [authStatus, setAuthStatus] = useState<'unknown' | 'configured' | 'error'>('unknown');
  const [details, setDetails] = useState<string[]>([]);

  const testConnection = async () => {
    setTesting(true);
    setDetails([]);
    const logs: string[] = [];

    try {
      // Test 1: Server health check
      logs.push('🔍 Testing server health endpoint...');
      setDetails([...logs]);
      
      try {
        const healthResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/server/health`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          logs.push(`✅ Server is online: ${healthData.version || 'unknown version'}`);
          setServerStatus('online');
        } else {
          logs.push(`❌ Server responded with status: ${healthResponse.status}`);
          setServerStatus('offline');
        }
      } catch (err: any) {
        logs.push(`❌ Server health check failed: ${err.message}`);
        setServerStatus('offline');
      }
      setDetails([...logs]);

      // Test 2: Services endpoint
      logs.push('🔍 Testing services endpoint...');
      setDetails([...logs]);
      
      try {
        const servicesResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/server/services`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (servicesResponse.ok) {
          const servicesData = await servicesResponse.json();
          logs.push(`✅ Services endpoint working (${servicesData.services?.length || 0} services found)`);
          setServicesStatus('success');
        } else {
          const errorText = await servicesResponse.text();
          logs.push(`❌ Services endpoint error: ${servicesResponse.status}`);
          logs.push(`Error details: ${errorText.substring(0, 200)}`);
          setServicesStatus('error');
        }
      } catch (err: any) {
        logs.push(`❌ Services endpoint failed: ${err.message}`);
        setServicesStatus('error');
      }
      setDetails([...logs]);

      // Test 3: Auth configuration
      logs.push('🔍 Testing Supabase auth...');
      setDetails([...logs]);
      
      try {
        const checkAdminResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/server/auth/check-admin`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (checkAdminResponse.ok) {
          const adminData = await checkAdminResponse.json();
          logs.push(`✅ Auth system working (Admin exists: ${adminData.exists ? 'Yes' : 'No'})`);
          setAuthStatus('configured');
        } else {
          logs.push(`⚠️ Auth check returned status: ${checkAdminResponse.status}`);
          setAuthStatus('error');
        }
      } catch (err: any) {
        logs.push(`❌ Auth check failed: ${err.message}`);
        setAuthStatus('error');
      }
      setDetails([...logs]);

      // Summary
      logs.push('');
      logs.push('=== SUMMARY ===');
      logs.push(`Project ID: ${projectId}`);
      logs.push(`Server URL: https://${projectId}.supabase.co/functions/v1/server`);
      logs.push('');
      logs.push('If server is offline, it may need to be deployed.');
      logs.push('If you see CORS errors, check browser console for details.');
      
      setDetails([...logs]);
    } catch (err: any) {
      logs.push(`❌ Unexpected error: ${err.message}`);
      setDetails([...logs]);
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
      case 'success':
      case 'configured':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />OK</Badge>;
      case 'offline':
      case 'error':
        return <Badge className="bg-red-500"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>;
    }
  };

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader className="bg-purple-50">
        <CardTitle className="text-purple-900 flex items-center gap-2">
          {serverStatus === 'online' ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
          Connection Debugger
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-gray-600">Server</p>
            {getStatusBadge(serverStatus)}
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">Services API</p>
            {getStatusBadge(servicesStatus)}
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">Auth System</p>
            {getStatusBadge(authStatus)}
          </div>
        </div>

        <Button 
          onClick={testConnection} 
          disabled={testing}
          className="w-full"
        >
          {testing ? 'Testing Connection...' : 'Run Connection Test'}
        </Button>

        {details.length > 0 && (
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs space-y-1 max-h-96 overflow-y-auto">
            {details.map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>Troubleshooting Tips:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>If server is offline: The Supabase Edge Function may need to be deployed</li>
            <li>If you see CORS errors: Check the browser console for details</li>
            <li>If auth fails: Try creating an admin account first via Admin Setup</li>
            <li>If network errors persist: Check your internet connection</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
