// Razorpay integration utilities for CareConnect

import { projectId, publicAnonKey } from './supabase/info';

// Load Razorpay script dynamically
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    // Check if already loaded
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// Get Razorpay Key ID from platform settings
export async function getRazorpayKeyId(): Promise<string | null> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/server/payment/razorpay-key`,
      {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch Razorpay key');
      return null;
    }

    const data = await response.json();
    return data.keyId || null;
  } catch (error) {
    console.error('Error fetching Razorpay key:', error);
    return null;
  }
}

// Initialize Razorpay payment
export async function initiateRazorpayPayment(options: {
  amount: number; // in currency units (e.g., dollars, not cents)
  currency: string;
  description: string;
  onSuccess: (response: any) => void;
  onFailure: (error: any) => void;
  userEmail?: string;
  userPhone?: string;
  userName?: string;
}): Promise<void> {
  try {
    // Load Razorpay script
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      throw new Error('Failed to load Razorpay');
    }

    // Get Razorpay key
    const keyId = await getRazorpayKeyId();
    if (!keyId) {
      throw new Error('Razorpay not configured');
    }

    // Convert amount to smallest currency unit (paise for INR, cents for USD, etc.)
    const amountInSmallestUnit = Math.round(options.amount * 100);

    // Create Razorpay options
    const razorpayOptions = {
      key: keyId,
      amount: amountInSmallestUnit,
      currency: options.currency,
      name: 'CareConnect',
      description: options.description,
      handler: async function (response: any) {
        try {
          // Verify payment on server
          const accessToken = localStorage.getItem('access_token');
          const verifyResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/server/payment/razorpay-verify`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            }
          );

          if (!verifyResponse.ok) {
            throw new Error('Payment verification failed');
          }

          const verifyData = await verifyResponse.json();
          options.onSuccess(verifyData);
        } catch (error) {
          console.error('Payment verification error:', error);
          options.onFailure(error);
        }
      },
      prefill: {
        name: options.userName || '',
        email: options.userEmail || '',
        contact: options.userPhone || '',
      },
      theme: {
        color: '#3B82F6', // blue-600
      },
      modal: {
        ondismiss: function () {
          options.onFailure({ message: 'Payment cancelled' });
        },
      },
    };

    // Create and open Razorpay checkout
    const razorpay = new (window as any).Razorpay(razorpayOptions);
    razorpay.open();
  } catch (error) {
    console.error('Error initiating Razorpay payment:', error);
    options.onFailure(error);
  }
}

// Format amount for display
export function formatRazorpayAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}
