# Razorpay Payment Integration Setup

CareConnect now integrates with Razorpay for secure payment processing. Follow these steps to configure the payment gateway.

## Prerequisites

1. A Razorpay account (Sign up at https://razorpay.com/)
2. Access to your Razorpay Dashboard
3. Access to your Supabase project settings

## Step 1: Get Razorpay API Keys

1. Log in to your Razorpay Dashboard: https://dashboard.razorpay.com/
2. Navigate to **Settings** → **API Keys**
3. Generate API keys for your environment:
   - **Test Mode**: For development and testing (keys start with `rzp_test_`)
   - **Live Mode**: For production (keys start with `rzp_live_`)
4. Note down both:
   - **Key ID** (public key)
   - **Key Secret** (private key - keep this secure!)

## Step 2: Configure Backend (Supabase Environment Variables)

Add the following secrets to your Supabase project:

### Option A: Via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Add these secrets:
   - `RAZORPAY_KEY_ID`: Your Razorpay Key ID
   - `RAZORPAY_KEY_SECRET`: Your Razorpay Key Secret

### Option B: Via Supabase CLI
```bash
# Set Razorpay Key ID
supabase secrets set RAZORPAY_KEY_ID=your_key_id_here

# Set Razorpay Key Secret
supabase secrets set RAZORPAY_KEY_SECRET=your_key_secret_here
```

## Step 3: Configure Frontend

Add the Razorpay Key ID to your frontend environment variables:

### For Local Development
Create a `.env.local` file in the root directory:
```env
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id_here
```

### For Production
Add `VITE_RAZORPAY_KEY_ID` to your hosting platform's environment variables.

## Step 4: Test the Integration

### Test Mode (Recommended for development)
1. Use test mode API keys from Razorpay
2. Use Razorpay's test card details for transactions:
   - **Card Number**: 4111 1111 1111 1111
   - **CVV**: Any 3 digits
   - **Expiry**: Any future date
   - **OTP**: 123456 (for 3D Secure)

### Production Mode
1. Switch to live mode API keys
2. Complete Razorpay account activation:
   - Submit KYC documents
   - Add bank account details
   - Get account activated by Razorpay team

## Payment Flow

1. **Client submits booking request** → Form validation occurs
2. **Payment modal appears** → Razorpay checkout opens
3. **Client completes payment** → Razorpay processes the transaction
4. **Payment verification** → Backend verifies the payment signature
5. **Booking created** → Service request is saved with payment details
6. **Success confirmation** → Client sees success message

## Payment Data Stored

The following payment information is stored with each booking:
- `paymentId`: Razorpay payment ID
- `orderId`: Razorpay order ID
- `paymentSignature`: Signature for verification
- `paymentStatus`: Status of payment (paid/pending/failed)
- `paidAmount`: Amount paid by the client

## Security Notes

⚠️ **Important Security Practices**:
1. **Never expose `RAZORPAY_KEY_SECRET` to the frontend**
2. Keep your Key Secret in Supabase environment variables only
3. The Key ID (`VITE_RAZORPAY_KEY_ID`) can be public - it's used by Razorpay's JavaScript SDK
4. Always verify payment signatures on the backend
5. Use test mode for development, live mode only for production

## Troubleshooting

### "Payment system not configured" error
- Check that `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set in Supabase
- Verify the secrets are correctly spelled (case-sensitive)

### "Razorpay script loading failed"
- Check your internet connection
- Verify Razorpay service status: https://status.razorpay.com/

### "Payment succeeded but booking failed"
- Check backend logs in Supabase Edge Functions
- Verify the booking creation API is working
- Contact support with the payment ID for assistance

### Payment signature verification failed
- Ensure `RAZORPAY_KEY_SECRET` is correctly set
- Check that the payment ID and order ID match
- Verify no data tampering occurred during transmission

## Support

For Razorpay-specific issues:
- Razorpay Documentation: https://razorpay.com/docs/
- Razorpay Support: https://razorpay.com/support/

For CareConnect integration issues:
- Check application logs
- Review backend API responses
- Contact your development team

## Currency Support

Currently configured for **INR (Indian Rupees)**.

To support other currencies:
1. Update the currency in `/components/RazorpayPayment.tsx`
2. Ensure your Razorpay account supports the currency
3. Update pricing display throughout the application

## Webhooks (Optional)

For production, consider setting up Razorpay webhooks to handle:
- Payment success confirmations
- Payment failures
- Refund notifications

Webhook endpoint: `https://your-domain.supabase.co/functions/v1/make-server-de4eab6a/razorpay-webhook` (to be implemented)

---

## Quick Reference

| Environment Variable | Type | Location | Description |
|---------------------|------|----------|-------------|
| `RAZORPAY_KEY_ID` | Secret | Supabase Backend | Your Razorpay public key |
| `RAZORPAY_KEY_SECRET` | Secret | Supabase Backend | Your Razorpay private key |
| `VITE_RAZORPAY_KEY_ID` | Public | Frontend | Same as RAZORPAY_KEY_ID |

---

Last Updated: November 2025
