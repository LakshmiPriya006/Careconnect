import React, { useState, useEffect } from 'react';
import { Settings, DollarSign, Search, Save, Loader2, Wallet, Key, Map, CreditCard, Eye, EyeOff, TestTube } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { admin } from '../utils/api';
import { toast } from 'sonner@2.0.3';
import { useCurrency } from '../utils/currency';

interface PlatformSettings {
  currency: string;
  currencySymbol: string;
  enableProviderSearch: boolean;
  enableClientWallet: boolean;
  enableProviderWallet: boolean;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  mapboxAccessToken?: string;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
];

export function AdminSettings() {
  const { reloadSettings: reloadCurrencyContext } = useCurrency();
  const [settings, setSettings] = useState<PlatformSettings>({
    currency: 'USD',
    currencySymbol: '$',
    enableProviderSearch: true,
    enableClientWallet: true,
    enableProviderWallet: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
  const [showMapboxToken, setShowMapboxToken] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await admin.getSettings();
      console.log('📥 Loaded settings from backend:', response.settings);
      
      if (response.settings) {
        // Ensure boolean values are properly set
        const loadedSettings = {
          currency: response.settings.currency || 'USD',
          currencySymbol: response.settings.currencySymbol || '$',
          enableProviderSearch: response.settings.enableProviderSearch === true,
          enableClientWallet: response.settings.enableClientWallet === true,
          enableProviderWallet: response.settings.enableProviderWallet === true,
          razorpayKeyId: response.settings.razorpayKeyId,
          razorpayKeySecret: response.settings.razorpayKeySecret,
          mapboxAccessToken: response.settings.mapboxAccessToken,
        };
        console.log('📥 Processed settings:', loadedSettings);
        setSettings(loadedSettings);
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      // Settings might not exist yet, use defaults
      if (!error.message?.includes('not found')) {
        toast.error('Failed to load settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      console.log('💾 Saving settings to backend:', settings);
      await admin.updateSettings(settings);
      toast.success('Settings saved successfully');
      
      // Reload settings to ensure they are persisted correctly
      await loadSettings();
      // Reload currency context to update currency symbol
      reloadCurrencyContext();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCurrencyChange = (currencyCode: string) => {
    const currency = CURRENCIES.find(c => c.code === currencyCode);
    if (currency) {
      setSettings({
        ...settings,
        currency: currency.code,
        currencySymbol: currency.symbol,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-purple-900">Platform Settings</h3>
          <p className="text-gray-600">Configure global settings for the CareConnect platform</p>
        </div>
        <Settings className="w-8 h-8 text-purple-600" />
      </div>

      {/* Currency Settings */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="bg-purple-50">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-purple-600" />
            <CardTitle className="text-purple-900">Currency Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Platform Currency</Label>
            <Select value={settings.currency} onValueChange={handleCurrencyChange}>
              <SelectTrigger id="currency" className="h-12">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.symbol} - {currency.name} ({currency.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-600">
              This currency will be used across the entire platform for displaying prices and payments.
            </p>
          </div>

          <Alert>
            <AlertDescription>
              <strong>Current Selection:</strong> {settings.currencySymbol} ({settings.currency})
              <br />
              All monetary values throughout the platform will be displayed with this currency symbol.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Feature Settings */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="bg-purple-50">
          <div className="flex items-center gap-3">
            <Search className="w-6 h-6 text-purple-600" />
            <CardTitle className="text-purple-900">Feature Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
            <div className="flex-1">
              <Label htmlFor="provider-search" className="text-base">
                Enable Provider Search
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Allow clients to search and browse provider profiles before requesting services
              </p>
            </div>
            <Switch
              id="provider-search"
              checked={settings.enableProviderSearch}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enableProviderSearch: checked })
              }
              className="data-[state=checked]:bg-purple-600"
            />
          </div>

          <Alert className={settings.enableProviderSearch ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
            <AlertDescription className={settings.enableProviderSearch ? 'text-green-900' : 'text-orange-900'}>
              {settings.enableProviderSearch ? (
                <>
                  <strong>Enabled:</strong> Clients can search for providers by service type, view profiles, and select preferred providers when making service requests.
                </>
              ) : (
                <>
                  <strong>Disabled:</strong> Provider search will be hidden from clients. The platform will automatically match requests with available providers.
                </>
              )}
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
            <div className="flex-1">
              <Label htmlFor="client-wallet" className="text-base">
                Enable Client Wallet
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Allow clients to manage their payment methods and balances
              </p>
            </div>
            <Switch
              id="client-wallet"
              checked={settings.enableClientWallet}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enableClientWallet: checked })
              }
              className="data-[state=checked]:bg-purple-600"
            />
          </div>

          <Alert className={settings.enableClientWallet ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
            <AlertDescription className={settings.enableClientWallet ? 'text-green-900' : 'text-orange-900'}>
              {settings.enableClientWallet ? (
                <>
                  <strong>Enabled:</strong> Clients can manage their payment methods and balances through their wallet.
                </>
              ) : (
                <>
                  <strong>Disabled:</strong> Client wallet will be hidden from clients. They will need to use other payment methods.
                </>
              )}
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
            <div className="flex-1">
              <Label htmlFor="provider-wallet" className="text-base">
                Enable Provider Wallet
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Allow providers to manage their payment methods and balances
              </p>
            </div>
            <Switch
              id="provider-wallet"
              checked={settings.enableProviderWallet}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enableProviderWallet: checked })
              }
              className="data-[state=checked]:bg-purple-600"
            />
          </div>

          <Alert className={settings.enableProviderWallet ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
            <AlertDescription className={settings.enableProviderWallet ? 'text-green-900' : 'text-orange-900'}>
              {settings.enableProviderWallet ? (
                <>
                  <strong>Enabled:</strong> Providers can manage their payment methods and balances through their wallet.
                </>
              ) : (
                <>
                  <strong>Disabled:</strong> Provider wallet will be hidden from providers. They will need to use other payment methods.
                </>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Payment Gateway Settings */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="bg-purple-50">
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-purple-600" />
            <CardTitle className="text-purple-900">Payment Gateway Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="razorpay-key-id">Razorpay Key ID</Label>
            <Input
              id="razorpay-key-id"
              value={settings.razorpayKeyId || ''}
              onChange={(e) => setSettings({ ...settings, razorpayKeyId: e.target.value })}
              className="h-12"
              placeholder="rzp_live_xxxxxxxxxxxxxxxx"
            />
            <p className="text-sm text-gray-600">
              Enter your Razorpay Key ID for processing payments.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="razorpay-key-secret">Razorpay Key Secret</Label>
            <Input
              id="razorpay-key-secret"
              value={settings.razorpayKeySecret || ''}
              onChange={(e) => setSettings({ ...settings, razorpayKeySecret: e.target.value })}
              className="h-12"
              type={showRazorpaySecret ? 'text' : 'password'}
              placeholder="Enter your Razorpay key secret"
            />
            <p className="text-sm text-gray-600">
              Enter your Razorpay Key Secret for processing payments.
            </p>
            <div className="flex items-center">
              <Switch
                checked={showRazorpaySecret}
                onCheckedChange={setShowRazorpaySecret}
                className="data-[state=checked]:bg-purple-600"
              />
              <Label className="ml-2">Show Secret</Label>
            </div>
          </div>

          {settings.razorpayKeyId && settings.razorpayKeySecret ? (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-900">
                <strong>✓ Configured:</strong> Razorpay payment gateway is active. Clients and providers can now process payments through Razorpay.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertDescription className="text-orange-900">
                <strong>⚠ Not Configured:</strong> Enter your Razorpay credentials to enable payment processing. Get your keys from <a href="https://dashboard.razorpay.com/" target="_blank" rel="noopener noreferrer" className="underline">Razorpay Dashboard</a>.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Map Settings */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="bg-purple-50">
          <div className="flex items-center gap-3">
            <Map className="w-6 h-6 text-purple-600" />
            <CardTitle className="text-purple-900">Map Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mapbox-access-token">Mapbox Access Token</Label>
            <Input
              id="mapbox-access-token"
              value={settings.mapboxAccessToken || ''}
              onChange={(e) => setSettings({ ...settings, mapboxAccessToken: e.target.value })}
              className="h-12"
              type={showMapboxToken ? 'text' : 'password'}
              placeholder="pk.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <p className="text-sm text-gray-600">
              Enter your Mapbox Access Token for displaying maps.
            </p>
            <div className="flex items-center">
              <Switch
                checked={showMapboxToken}
                onCheckedChange={setShowMapboxToken}
                className="data-[state=checked]:bg-purple-600"
              />
              <Label className="ml-2">Show Token</Label>
            </div>
          </div>

          {settings.mapboxAccessToken ? (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-900">
                <strong>✓ Configured:</strong> Mapbox integration is active. Maps will be displayed throughout the application including service tracking, provider discovery, and location selection.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertDescription className="text-orange-900">
                <strong>⚠ Not Configured:</strong> Enter your Mapbox Access Token to enable map features. Get your token from <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="underline">Mapbox Account</a>.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-700 text-white h-12 px-8"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}