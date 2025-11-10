import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function ApiConnectionTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testConnection = async () => {
    setTesting(true);
    const testResults: any = {
      projectId: projectId,
      hasAnonKey: !!publicAnonKey,
      tests: []
    };

    try {
      // Test 1: Health Check
      const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-de4eab6a/health`;
      testResults.healthUrl = healthUrl;
      
      try {
        const healthResponse = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });
        
        testResults.tests.push({
          name: 'Health Check',
          status: healthResponse.ok ? 'success' : 'failed',
          statusCode: healthResponse.status,
          data: healthResponse.ok ? await healthResponse.json() : await healthResponse.text()
        });
      } catch (error: any) {
        testResults.tests.push({
          name: 'Health Check',
          status: 'error',
          error: error.message
        });
      }

      // Test 2: Check Admin Endpoint
      const adminCheckUrl = `https://${projectId}.supabase.co/functions/v1/make-server-de4eab6a/auth/check-admin`;
      
      try {
        const adminResponse = await fetch(adminCheckUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });
        
        testResults.tests.push({
          name: 'Check Admin Endpoint',
          status: adminResponse.ok ? 'success' : 'failed',
          statusCode: adminResponse.status,
          data: adminResponse.ok ? await adminResponse.json() : await adminResponse.text()
        });
      } catch (error: any) {
        testResults.tests.push({
          name: 'Check Admin Endpoint',
          status: 'error',
          error: error.message
        });
      }

      // Test 3: Services Endpoint
      const servicesUrl = `https://${projectId}.supabase.co/functions/v1/make-server-de4eab6a/services`;
      
      try {
        const servicesResponse = await fetch(servicesUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });
        
        testResults.tests.push({
          name: 'Services Endpoint',
          status: servicesResponse.ok ? 'success' : 'failed',
          statusCode: servicesResponse.status,
          data: servicesResponse.ok ? await servicesResponse.json() : await servicesResponse.text()
        });
      } catch (error: any) {
        testResults.tests.push({
          name: 'Services Endpoint',
          status: 'error',
          error: error.message
        });
      }

    } catch (error: any) {
      testResults.generalError = error.message;
    }

    setResults(testResults);
    setTesting(false);
  };

  const getStatusIcon = (status: string) => {
    if (status === 'success') return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (status === 'failed') return <XCircle className="w-5 h-5 text-red-600" />;
    return <AlertCircle className="w-5 h-5 text-yellow-600" />;
  };

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader className="bg-blue-50">
        <CardTitle className="text-blue-900">API Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            This tool tests the connection to the CareConnect API server.
          </p>
          <Button 
            onClick={testConnection} 
            disabled={testing}
            className="w-full"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing Connection...
              </>
            ) : (
              'Run Connection Test'
            )}
          </Button>
        </div>

        {results && (
          <div className="space-y-4 mt-6">
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="text-sm">
                <strong>Project ID:</strong> {results.projectId}
              </div>
              <div className="text-sm">
                <strong>Has Anon Key:</strong> {results.hasAnonKey ? '✅ Yes' : '❌ No'}
              </div>
              <div className="text-sm">
                <strong>API Base URL:</strong> {results.healthUrl?.replace('/health', '')}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Test Results:</h4>
              {results.tests.map((test: any, index: number) => (
                <Card key={index} className={`border ${
                  test.status === 'success' ? 'border-green-200 bg-green-50' :
                  test.status === 'failed' ? 'border-red-200 bg-red-50' :
                  'border-yellow-200 bg-yellow-50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(test.status)}
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{test.name}</div>
                        {test.statusCode && (
                          <div className="text-sm text-gray-600">Status Code: {test.statusCode}</div>
                        )}
                        {test.error && (
                          <div className="text-sm text-red-600 mt-1">
                            <strong>Error:</strong> {test.error}
                          </div>
                        )}
                        {test.data && (
                          <details className="mt-2">
                            <summary className="text-sm text-blue-600 cursor-pointer">View Response</summary>
                            <pre className="text-xs bg-white p-2 rounded mt-2 overflow-auto">
                              {JSON.stringify(test.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {results.generalError && (
              <Card className="border-2 border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <div>
                      <div className="font-semibold text-red-900">General Error</div>
                      <div className="text-sm text-red-700">{results.generalError}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {results.tests.every((t: any) => t.status === 'error') && (
              <Card className="border-2 border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="font-semibold text-orange-900">Troubleshooting Steps:</div>
                    <ul className="text-sm text-orange-800 space-y-1 list-disc list-inside">
                      <li>Check if the Supabase Edge Function is deployed</li>
                      <li>Verify the function name is "make-server-de4eab6a"</li>
                      <li>Ensure CORS is enabled on the server</li>
                      <li>Check browser console for detailed error messages</li>
                      <li>Verify project ID and anon key are correct</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
