# Mapbox Integration Setup Guide

CareConnect now includes interactive map features powered by Mapbox. Follow these steps to configure Mapbox and enable map functionality throughout the application.

## Features Enabled by Mapbox

### 1. Real-Time Location Tracking
- **Provider Tracking**: Providers can share their live location during active bookings
- **Client View**: Clients can see the provider's location in real-time on an interactive map
- **Distance Calculation**: Visual route display with real-time distance updates
- **ETA Indicators**: See how close the provider is to the client location

### 2. Provider Map View
- **Interactive Provider Map**: View all available providers on an interactive map
- **Location-Based Search**: See providers near your location
- **Quick Selection**: Click on map markers to view provider details
- **Distance Visualization**: See which providers are closest to you

### 3. Map Components Available

- **TrackingMap**: Real-time location tracking during active bookings
- **LocationMap**: Single location display with marker
- **ProvidersMap**: Multiple providers displayed on map with filtering
- **Map**: Base map component with navigation controls

## Setup Instructions

### Step 1: Create a Mapbox Account

1. Go to [https://www.mapbox.com/](https://www.mapbox.com/)
2. Click "Sign Up" or "Get Started for Free"
3. Create your account (free tier includes up to 50,000 map loads per month)

### Step 2: Get Your Access Token

1. After signing in, go to your [Account Dashboard](https://account.mapbox.com/)
2. Navigate to the "Access Tokens" section
3. You'll see a "Default public token" - this is your access token
4. Copy the token (it starts with `pk.`)

**Important**: Make sure you're using a **public token** (starts with `pk.`), not a secret token (starts with `sk.`)

### Step 3: Configure CareConnect

The Mapbox access token has already been configured in the platform. When you first access any map feature, you'll be prompted to enter your Mapbox access token in the environment variable `MAPBOX_ACCESS_TOKEN`.

### Step 4: Optional - Create a Custom Token

For better security and usage tracking, you can create a custom token:

1. In your Mapbox account, go to "Access Tokens"
2. Click "Create a token"
3. Give it a descriptive name (e.g., "CareConnect Production")
4. Under "Token scopes", ensure these are selected:
   - **styles:read** - Required for map styles
   - **fonts:read** - Required for map labels
   - **datasets:read** - Optional, for custom data
   - **vision:read** - Optional, for advanced features
5. Under "URL restrictions", you can add your domain for extra security:
   - Example: `https://yourdomain.com/*`
   - This prevents the token from being used on other websites
6. Click "Create token"
7. Copy the new token and update the `MAPBOX_ACCESS_TOKEN` environment variable

## Map Styles Available

CareConnect uses the following Mapbox map styles:

- **Streets** (default): Clean street map with labels - `mapbox://styles/mapbox/streets-v12`
- **Light**: Minimal light-colored map - `mapbox://styles/mapbox/light-v11`
- **Dark**: Dark theme map - `mapbox://styles/mapbox/dark-v11`
- **Outdoors**: Optimized for outdoor activities - `mapbox://styles/mapbox/outdoors-v12`
- **Satellite**: Satellite imagery with street overlay - `mapbox://styles/mapbox/satellite-streets-v12`

The default style is set to "Streets" which provides the best clarity for service provider locations.

## Features by User Type

### For Clients

1. **Provider List Map View**:
   - Click "Map View" toggle on the Find Providers screen
   - See all available providers on the map
   - Click markers to view provider details
   - Your location is shown with a green marker

2. **Active Booking Tracking**:
   - When you have an active booking, the location tracker shows a live map
   - See your provider's real-time location
   - View the route and distance to your location
   - Get notifications when provider is nearby

### For Providers

1. **Location Sharing**:
   - During active bookings, click "Start Location Tracking"
   - Your location is shared with the client in real-time
   - See distance to client location
   - Map shows optimal route

2. **Privacy Controls**:
   - Location sharing only happens during active bookings
   - Click "Stop Tracking" to stop sharing your location
   - Location data is not stored permanently

### For Admins

1. **Service Request Management**:
   - View provider and client locations on maps
   - Better understand service areas
   - Optimize provider assignments based on location

## Privacy and Security

- **No Permanent Storage**: Location data is only stored during active bookings
- **User Control**: Providers can start/stop location sharing at any time
- **Secure Transmission**: All location data is transmitted over HTTPS
- **Token Security**: Public tokens are safe to use in web applications
- **URL Restrictions**: Configure URL restrictions on your token for added security

## Troubleshooting

### Maps Not Loading

**Error**: "Mapbox access token not configured"
- **Solution**: Make sure you've entered your Mapbox token in the `MAPBOX_ACCESS_TOKEN` environment variable

**Error**: "Invalid Mapbox token"
- **Solution**: Verify that you're using a public token (starts with `pk.`)
- Check that the token is still active in your Mapbox account
- Ensure there are no extra spaces when pasting the token

**Error**: "401 Unauthorized"
- **Solution**: Your token may be restricted to specific URLs
- Go to your Mapbox account and check token URL restrictions
- Either remove restrictions or add your CareConnect domain

### Location Not Updating

**Issue**: Provider location not showing on map
- **Solution**: 
  - Ensure location permissions are granted in the browser
  - Provider must click "Start Location Tracking"
  - Check browser console for any error messages

**Issue**: "Location permission denied"
- **Solution**: 
  - Enable location services in browser settings
  - Grant location permission when prompted
  - For mobile: check device location settings

### Performance Issues

**Issue**: Maps loading slowly
- **Solution**:
  - Check your internet connection
  - Verify you haven't exceeded Mapbox free tier limits
  - Consider upgrading to a paid Mapbox plan for better performance

## Rate Limits and Pricing

### Free Tier (Included)
- **50,000 map loads per month** - More than enough for most use cases
- All map styles included
- Directions API: 100,000 requests per month
- Geocoding: 100,000 requests per month

### When to Upgrade
Consider upgrading to a paid plan if:
- You exceed 50,000 map loads per month
- You need higher rate limits
- You want priority support
- You need advanced features like traffic data

## Additional Resources

- [Mapbox Documentation](https://docs.mapbox.com/)
- [Mapbox Pricing](https://www.mapbox.com/pricing/)
- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/)
- [Mapbox Support](https://support.mapbox.com/)

## Support

If you encounter any issues with the Mapbox integration:

1. Check this guide first
2. Review the browser console for error messages
3. Verify your Mapbox token is valid and active
4. Check Mapbox service status at [status.mapbox.com](https://status.mapbox.com/)

---

**Note**: Mapbox is a third-party service. CareConnect uses Mapbox for map visualization, but location tracking and distance calculations are handled independently and will work even without Mapbox (with limited visual features).
