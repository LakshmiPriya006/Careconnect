import React, { createContext, useContext, useState, useEffect } from 'react';
import { admin } from './api';
import { setMapboxToken } from './mapbox';

interface CurrencyContextType {
  currencySymbol: string;
  currencyCode: string;
  enableProviderSearch: boolean;
  enableClientWallet: boolean;
  enableProviderWallet: boolean;
  loading: boolean;
  reloadSettings: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currencySymbol: '$',
  currencyCode: 'USD',
  enableProviderSearch: true,
  enableClientWallet: true,
  enableProviderWallet: true,
  loading: true,
  reloadSettings: async () => {},
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [enableProviderSearch, setEnableProviderSearch] = useState(false);
  const [enableClientWallet, setEnableClientWallet] = useState(false);
  const [enableProviderWallet, setEnableProviderWallet] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrency();
  }, []);

  const loadCurrency = async () => {
    try {
      // Check if user has an access token before trying to load settings
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.log('⚠️ No access token found, using default settings');
        setLoading(false);
        return;
      }

      const response = await admin.getSettings();
      console.log('🔧 Loading settings from backend:', response);
      if (response.settings) {
        setCurrencySymbol(response.settings.currencySymbol || '$');
        setCurrencyCode(response.settings.currency || 'USD');
        
        // Explicitly check for boolean values
        const providerSearchEnabled = response.settings.enableProviderSearch === true;
        const clientWalletEnabled = response.settings.enableClientWallet === true;
        const providerWalletEnabled = response.settings.enableProviderWallet === true;
        
        console.log('🔧 Feature flags:', {
          enableProviderSearch: providerSearchEnabled,
          enableClientWallet: clientWalletEnabled,
          enableProviderWallet: providerWalletEnabled
        });
        
        setEnableProviderSearch(providerSearchEnabled);
        setEnableClientWallet(clientWalletEnabled);
        setEnableProviderWallet(providerWalletEnabled);
        
        // Set Mapbox token if available
        if (response.settings.mapboxAccessToken) {
          console.log('🗺️ Setting Mapbox token from platform settings');
          setMapboxToken(response.settings.mapboxAccessToken);
        }
      }
    } catch (error) {
      console.log('Currency settings not found, using defaults:', error);
      // Use defaults
    } finally {
      setLoading(false);
    }
  };

  const reloadSettings = async () => {
    setLoading(true);
    await loadCurrency();
  };

  return (
    <CurrencyContext.Provider value={{ currencySymbol, currencyCode, enableProviderSearch, enableClientWallet, enableProviderWallet, loading, reloadSettings }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}