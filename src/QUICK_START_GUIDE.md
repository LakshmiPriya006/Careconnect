# CareConnect Quick Start Guide

This guide helps you quickly set up and test CareConnect.

## First Time Setup

### Step 1: Create Admin Account
1. Open the application
2. Click **"Admin Setup"** button on the landing page
3. Fill in admin credentials:
   - **Name**: Admin User
   - **Email**: admin@careconnect.com
   - **Password**: admin123456
4. Click **"Create Admin Account"**
5. You'll be automatically logged into the Admin Dashboard

### Step 2: Create Service Categories (Optional)
The admin setup automatically creates 8 default services:
- Nursing Care
- House Cleaning
- Grocery Shopping
- Companionship
- Home Repairs
- Transportation
- Meal Preparation
- Personal Care

You can add more services in the Admin Dashboard under "Service Management".

## Testing the Application

### Test as a Client

**Create a Client Account:**
1. Return to landing page (logout if needed)
2. Click **"I'm a Client"**
3. Click **"Sign Up"** tab
4. Click **"Start Registration"**
5. Fill in the form:
   ```
   Name: Mary Johnson
   Email: mary@example.com
   Phone: (555) 123-4567
   Address: 123 Oak Street, Springfield
   Age: 72
   Gender: Female
   Password: client123
   ```
6. For OTP verification:
   - Click "Send OTP" for email → Enter any 6 digits (e.g., 123456) → Click "Verify Email"
   - Click "Send OTP" for phone → Enter any 6 digits (e.g., 123456) → Click "Verify Phone"
7. Click **"Create Account"**
8. You'll be automatically logged in!

**What You Can Do as a Client:**
- ✅ Browse service providers
- ✅ Request services
- ✅ View booking history
- ✅ Rate and review providers
- ✅ Add multiple service locations
- ✅ Add family members
- ✅ Request services for family members in other locations

### Test as a Provider

**Create a Provider Account:**
1. Return to landing page (logout if needed)
2. Click **"I'm a Service Provider"**
3. Click **"Sign Up"** tab
4. Click **"Start Registration Process"**
5. **Step 1 - Contact Information:**
   ```
   Name: John Smith
   Email: john@example.com
   Phone: (555) 987-6543
   ```
   - Verify both with OTP (any 6 digits)
   - Click "Next: Identity Documents"

6. **Step 2 - Identity Documents:**
   ```
   Address: 456 Maple Avenue, Springfield
   Gender: Male
   ID Card Number: ID123456789
   ```
   - Upload profile photo (any image)
   - Upload ID card copy (any image)
   - Click "Next: Service Details"

7. **Step 3 - Service Details:**
   ```
   Primary Specialty: Nursing Care
   Additional Skills: Select any relevant skills
   Years of Experience: 5
   Experience Details: "Certified nurse with 5 years of home care experience..."
   Hourly Rate: $45
   Certifications: "RN License, CPR Certified"
   ```
   - Click "Submit Registration"

8. **Status: Pending Verification**
   - You'll be logged in but can't accept jobs yet
   - Admin must approve your account first

**Approve the Provider (as Admin):**
1. Login as admin
2. Go to "Provider Verification" tab
3. Find John Smith in pending providers
4. Click "Review"
5. Review all stages (Contact, Identity, Services)
6. Click "Approve" for each stage
7. Provider is now approved and can accept jobs!

**What You Can Do as a Provider:**
- ✅ View available job requests
- ✅ Accept jobs
- ✅ Manage active bookings
- ✅ Update job status
- ✅ View your reviews and ratings
- ✅ Toggle availability on/off

### Test the Service Request Flow

**Complete End-to-End Flow:**

1. **As Client (Mary):**
   - Click "Request Service"
   - Select service type: "Nursing Care"
   - Choose provider: John Smith
   - Select date and time
   - Add service details
   - Submit request

2. **As Provider (John):**
   - See new job request in "Available Jobs"
   - Review job details
   - Click "Accept Job"
   - Job moves to "Active Jobs"

3. **As Provider (complete job):**
   - Go to "Active Jobs"
   - Find the booking
   - Update status to "In Progress" → "Completed"
   - Add completion notes

4. **As Client (review):**
   - Go to "Bookings" → "Completed"
   - Click on completed booking
   - Click "Rate Service"
   - Give 5 stars and write review
   - Submit rating

5. **As Provider (view review):**
   - Go to "My Reviews"
   - See the new 5-star review from Mary

6. **As Admin (monitor):**
   - View all bookings in "Bookings"
   - See statistics in dashboard
   - Manage reviews if needed
   - View provider ratings

## Common Test Scenarios

### Scenario 1: Family Member Request
**Test the "Request for Someone Else" feature:**

1. As client, go to Profile
2. Add a new location:
   ```
   Label: Mom's House
   Address: 789 Pine Street, Boston
   Type: Other Family Member
   ```
3. Add a family member:
   ```
   Name: Sarah Johnson (Mom)
   Relationship: Mother
   Phone: (555) 111-2222
   Location: Mom's House
   ```
4. Request a service:
   - Select "Someone Else"
   - Choose "Sarah Johnson (Mom)"
   - Service will be for mom at her Boston address

### Scenario 2: Provider Verification Review
**Test admin verification workflow:**

1. Create a new provider account (follow steps above)
2. Login as admin
3. Go to Provider Verification
4. Review each verification stage:
   - Contact Information (Email, Phone verified)
   - Identity Documents (ID card, photo)
   - Service Details (Experience, rates)
5. Approve or reject each stage
6. Provider status updates accordingly

### Scenario 3: Review Management
**Test review moderation:**

1. Complete a booking and leave a review
2. Login as admin
3. Go to "Reviews Management"
4. Find the review
5. Test actions:
   - Hide review (with reason)
   - Unhide review
   - Delete review (permanent)

## Test Credentials Summary

For easy reference, here are test accounts you can create:

| Role | Email | Password | Name |
|------|-------|----------|------|
| Admin | admin@careconnect.com | admin123456 | Admin User |
| Client | mary@example.com | client123 | Mary Johnson |
| Provider | john@example.com | provider123 | John Smith |

## Development Tips

### OTP Verification (For Testing)
- During signup, any 6-digit code works for OTP verification
- This is demo mode - in production, real OTPs would be sent
- Look for console logs showing generated OTP codes

### Image Uploads (For Providers)
- Any image file works for profile photos and ID cards
- Images are stored as base64 data URLs
- Keep file sizes reasonable for testing

### Quick Reset
To start fresh:
1. Logout
2. Clear browser localStorage
3. The KV store on the backend will still have data
4. Create new accounts with different emails

### Browser Console
Keep the browser console open to see:
- Login/signup errors
- API request/response logs
- Authentication flow logs
- Helpful debugging information

## Troubleshooting

### Can't Login?
→ See [LOGIN_TROUBLESHOOTING_GUIDE.md](./LOGIN_TROUBLESHOOTING_GUIDE.md)

### Provider Can't Accept Jobs?
→ Make sure admin has approved all verification stages

### Can't See Providers?
→ Make sure at least one provider is approved by admin

### Service Request Not Showing?
→ Make sure provider's specialty matches the service type

### OTP Not Working?
→ Just enter any 6-digit number (e.g., 123456)

## Next Steps

After testing the basic flows:

1. **Explore Advanced Features:**
   - Multiple service locations
   - Family member management
   - Booking filters and search
   - Provider ratings and reviews

2. **Test Admin Functions:**
   - User management
   - Service management
   - Review moderation
   - System statistics

3. **Test Edge Cases:**
   - Cancel bookings
   - Reject provider applications
   - Hide inappropriate reviews
   - Toggle provider availability

4. **Customize:**
   - Add new service types
   - Modify service descriptions
   - Update provider profiles
   - Adjust hourly rates

## Need Help?

Check these resources:
- `LOGIN_TROUBLESHOOTING_GUIDE.md` - Login issues
- `SETUP.md` - General setup guide
- `TESTING_GUIDE.md` - Detailed testing procedures
- Browser console - Real-time debugging

Enjoy testing CareConnect! 🏥💙
