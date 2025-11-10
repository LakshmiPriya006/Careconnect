# CareConnect - Setup & Testing Guide

## Initial Setup

### 1. Create Admin Account (First Time Only)

1. On the landing page, click the **"Admin Setup"** button in the footer
2. Fill in the admin credentials:
   - Name: `Admin User`
   - Email: `admin@careconnect.com`
   - Password: `admin123` (or your preferred password)
3. Click **"Create Admin Account"**
4. You'll be redirected to the admin login page

### 2. Login as Admin

1. From the landing page, click **"Admin Access"**
2. Login with your admin credentials
3. You can now:
   - View platform statistics
   - Approve/reject provider applications
   - Manage users and bookings
   - Monitor all platform activity

### 3. Configure Mapbox (Optional but Recommended)

CareConnect includes interactive map features for location tracking and provider visualization. To enable these features:

1. See **[MAPBOX_SETUP.md](./MAPBOX_SETUP.md)** for detailed instructions
2. Quick setup:
   - Create a free account at [mapbox.com](https://www.mapbox.com/)
   - Get your public access token (starts with `pk.`)
   - Enter it when prompted, or add to `MAPBOX_ACCESS_TOKEN` environment variable
3. Features enabled:
   - Real-time provider location tracking during bookings
   - Interactive map view of all providers
   - Visual route display and distance calculation

**Note**: Maps will show a setup prompt if not configured. All other features work without Mapbox.

---

## Testing Workflows

### Client Workflow

1. **Sign Up as Client:**
   - Click "Continue as Client" on landing page
   - Switch to "Sign Up" tab
   - Fill in: Name, Email, Phone, Address, Password
   - Click "Create Account"

2. **Request a Service:**
   - Go to "Request" tab
   - Choose who the service is for:
     - **For Myself:** Service at your own location
     - **For Someone Else:** Request service for a family member/loved one (e.g., son in London requesting for mother in New York)
   - If for someone else, provide recipient details (name, phone, address)
   - Select service type (e.g., Nursing Care, Cleaning)
   - Choose "As Soon as Possible" or "Schedule for Later"
   - Add location and details (if for yourself)
   - Submit request

3. **Browse Providers:**
   - Go to "Providers" tab
   - View verified service providers
   - Filter by service type or distance
   - Add providers to favorites
   - Contact or book directly

4. **View Booking History:**
   - Go to "History" tab
   - See upcoming, completed, and cancelled bookings
   - Rate completed services
   - Rebook favorite providers

---

### Provider Workflow

1. **Sign Up as Provider:**
   - Click "Provider Login" on landing page
   - Switch to "Sign Up" tab
   - Fill in: Name, Email, Phone, Specialty, Skills, Hourly Rate, Password
   - Click "Create Provider Account"
   - **Note:** Your account needs admin approval before accepting jobs

2. **Get Approved by Admin:**
   - Login as admin
   - Go to "Providers" tab
   - Review your provider application
   - Click "Approve Provider"

3. **Accept Job Requests:**
   - Login as provider
   - Toggle "Available" status to ON
   - Go to "Job Requests" tab
   - View pending job requests
   - Click "Accept Job" to confirm

4. **Manage Bookings:**
   - View upcoming jobs
   - Contact clients
   - Complete jobs and receive payment

5. **Track Earnings:**
   - Go to "Earnings" tab
   - View weekly, monthly, and total earnings
   - See completed job history with ratings

---

### Admin Workflow

1. **Dashboard Overview:**
   - View key metrics (users, providers, revenue, ratings)
   - See pending provider applications
   - Monitor recent bookings

2. **Verify Providers:**
   - Go to "Providers" tab
   - Review pending applications
   - Check documents and credentials
   - Approve or reject applications

3. **Manage Users:**
   - Go to "Users" tab
   - View all clients and providers
   - Filter by role
   - View user details and activity

4. **Monitor Bookings:**
   - Go to "Bookings" tab
   - View all platform bookings
   - Filter by status (upcoming, completed, cancelled)
   - Track service completion rates

---

## Sample Test Data

### Test Admin Account
```
Email: admin@careconnect.com
Password: admin123
```

### Test Client Account
```
Name: Margaret Thompson
Email: margaret@example.com
Password: client123
Phone: (555) 123-4567
Address: 123 Oak Street, Springfield
```

### Test Provider Account
```
Name: Sarah Johnson
Email: sarah@example.com
Password: provider123
Phone: (555) 234-5678
Specialty: Registered Nurse
Skills: Nursing Care, Medication Management, Vital Signs
Hourly Rate: 55
```

---

## Key Features

### Core Features
- **Request for Others:** Family members can request services for elderly relatives in different locations (e.g., son in London requesting for mother in New York)
- **Recipient Information:** Track who the service is for with full contact details
- **Multi-location Support:** Serve clients across different cities and states

### Accessibility Features
- **Large Text & Buttons:** Easy-to-read fonts and touch targets
- **High Contrast Colors:** Blue, green, and white color scheme
- **Simple Navigation:** Tab-based navigation with clear icons
- **Emergency Button:** Quick access to emergency services (client view)

### Security Features
- **Supabase Authentication:** Secure login with JWT tokens
- **Provider Verification:** Admin approval required before service
- **Background Checks:** Verified badge for approved providers
- **Secure Payments:** Payment tracking and history

### Real-time Features
- **Job Matching:** Automatic matching based on service type
- **Availability Status:** Providers can toggle availability
- **Booking Management:** Real-time booking status updates
- **Platform Analytics:** Live statistics for admins

---

## API Endpoints

The application uses the following main endpoints:

### Authentication
- `POST /auth/signup/client` - Create client account
- `POST /auth/signup/provider` - Create provider account
- `POST /auth/init-admin` - Initialize admin account (one-time)

### Client Routes
- `POST /requests/create` - Create service request
- `GET /providers` - Get all verified providers
- `GET /bookings/client` - Get client bookings

### Provider Routes
- `GET /jobs/requests` - Get available job requests
- `POST /jobs/accept` - Accept a job request
- `GET /bookings/provider` - Get provider bookings
- `POST /provider/availability` - Update availability status

### Admin Routes
- `GET /admin/users` - Get all users
- `GET /admin/pending-providers` - Get pending provider applications
- `POST /admin/approve-provider` - Approve provider account
- `GET /admin/bookings` - Get all bookings
- `GET /admin/stats` - Get platform statistics

---

## Troubleshooting

### "Admin account already exists" error
- An admin account has already been created
- Use the admin login instead of setup

### Provider can't accept jobs
- Ensure the provider account has been approved by an admin
- Check that availability status is ON

### Service request not appearing
- Requests are stored in the database
- Check admin panel to verify request creation

---

## Next Steps for Production

1. **Email Configuration:** Set up email server for verification
2. **Payment Integration:** Add Stripe/Razorpay for transactions
3. **Google Maps API:** Add real geolocation and distance calculation
4. **File Uploads:** Configure Supabase Storage for documents/photos
5. **Push Notifications:** Set up real-time job alerts
6. **SMS Notifications:** Add Twilio for appointment reminders
7. **Background Checks:** Integrate third-party verification service
8. **Multi-language Support:** Add i18n for regional languages