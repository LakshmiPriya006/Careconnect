import { useEffect, useState } from 'react';
import { CreditCard, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface RazorpayPaymentProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  bookingData: any;
  onPaymentSuccess: (paymentDetails: any) => void;
  onPaymentFailed: (error: any) => void;
}

// Extend Window interface to include Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

export function RazorpayPayment({
  isOpen,
  onClose,
  amount,
  bookingData,
  onPaymentSuccess,
  onPaymentFailed,
}: RazorpayPaymentProps) {
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
      console.log('✅ Razorpay script loaded');
    };
    script.onerror = () => {
      console.error('❌ Failed to load Razorpay script');
      toast.error('Payment system unavailable. Please try again later.');
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    if (!scriptLoaded) {
      toast.error('Payment system is loading. Please wait...');
      return;
    }

    setLoading(true);

    try {
      // Create Razorpay order via backend
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/server/create-razorpay-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to paise
          currency: 'INR',
          bookingData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Payment order creation failed:', errorData);
        
        // Provide specific error message if keys are missing
        if (errorData.missingKeys) {
          throw new Error('Payment system not configured. Please contact support to set up Razorpay API keys.');
        }
        
        throw new Error(errorData.error || 'Failed to create payment order');
      }

      const responseData = await response.json();
      const { orderId, amount: orderAmount, currency } = responseData;

      // Razorpay options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Razorpay key from environment
        amount: orderAmount,
        currency: currency,
        name: 'CareConnect',
        description: `${bookingData.serviceTitle || 'Service'} - ${bookingData.duration || 1} hour(s)`,
        order_id: orderId,
        handler: function (response: any) {
          console.log('✅ Payment successful:', response);
          onPaymentSuccess({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        prefill: {
          name: bookingData.clientName || '',
          email: bookingData.clientEmail || '',
          contact: bookingData.clientPhone || '',
        },
        theme: {
          color: '#3B82F6',
        },
        modal: {
          ondismiss: function () {
            console.log('❌ Payment cancelled by user');
            setLoading(false);
            toast.info('Payment cancelled');
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      
      razorpay.on('payment.failed', function (response: any) {
        console.error('❌ Payment failed:', response.error);
        onPaymentFailed(response.error);
      });

      razorpay.open();
      setLoading(false);
    } catch (error) {
      console.error('❌ Error initializing payment:', error);
      setLoading(false);
      toast.error('Failed to initialize payment. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Complete Payment
          </DialogTitle>
          <DialogDescription>
            Secure payment powered by Razorpay
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Booking Summary */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardContent className="p-4 space-y-2">
              <h4 className="text-blue-900">Booking Summary</h4>
              <div className="space-y-1 text-sm">
                {bookingData.serviceTitle && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-medium">{bookingData.serviceTitle}</span>
                  </div>
                )}
                {bookingData.duration && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{bookingData.duration} hour{bookingData.duration > 1 ? 's' : ''}</span>
                  </div>
                )}
                {bookingData.scheduledDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{new Date(bookingData.scheduledDate).toLocaleDateString()}</span>
                  </div>
                )}
                {bookingData.scheduledTime && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">{bookingData.scheduledTime}</span>
                  </div>
                )}
                {bookingData.location && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium text-right ml-4 text-xs">{bookingData.location}</span>
                  </div>
                )}
              </div>
              
              <div className="pt-3 mt-3 border-t border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-blue-900">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-900">₹{amount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Button */}
          <Button
            onClick={handlePayment}
            disabled={loading || !scriptLoaded}
            className="w-full bg-blue-600 hover:bg-blue-700 h-12"
          >
            {loading ? 'Processing...' : scriptLoaded ? 'Pay Now' : 'Loading Payment System...'}
          </Button>

          <p className="text-xs text-center text-gray-500">
            🔒 Your payment is secure and encrypted
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}