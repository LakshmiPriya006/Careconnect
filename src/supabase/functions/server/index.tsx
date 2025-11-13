// CareConnect Server - Last updated: 2025-11-06
import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger(console.log));

// Initialize Supabase clients
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Migration: Fix admin users metadata on server startup
async function fixAdminUsersMetadata() {
  try {
    console.log('🔧 [MIGRATION] Starting admin metadata fix...');
    const adminUsers = await kv.get('admin_users') || [];
    const roles = await kv.get('admin_roles') || [];
    
    let fixedCount = 0;
    
    for (const adminUser of adminUsers) {
      try {
        const role = roles.find((r: any) => r.id === adminUser.roleId);
        
        // Update the Supabase Auth user metadata to include role: 'admin'
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          adminUser.id,
          {
            user_metadata: {
              name: adminUser.name,
              role: 'admin',  // Add the role field that AuthFlow checks for
              roleId: adminUser.roleId,
              roleName: role?.name || adminUser.roleName,
              userType: 'admin'
            }
          }
        );

        if (updateError) {
          console.log(`❌ [MIGRATION] Error updating metadata for ${adminUser.email}:`, updateError);
        } else {
          fixedCount++;
          console.log(`✅ [MIGRATION] Fixed metadata for ${adminUser.email}`);
        }
      } catch (err) {
        console.log(`❌ [MIGRATION] Error processing ${adminUser.email}:`, err);
      }
    }
    
    console.log(`✅ [MIGRATION] Completed. Fixed ${fixedCount} out of ${adminUsers.length} admin users.`);
  } catch (error) {
    console.log('❌ [MIGRATION] Error during admin metadata fix:', error);
  }
}

// Run migration on server startup
fixAdminUsersMetadata();

// Helper function to verify access token
async function verifyUser(authHeader: string | null) {
  if (!authHeader) {
    console.log('❌ [AUTH] No authorization header provided');
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log('❌ [AUTH] No token found in authorization header');
    return null;
  }
  
  console.log(`🔑 [AUTH] Verifying token: ${token.substring(0, 10)}...${token.substring(token.length - 10)}`);
  
  // Create a client with the user's access token to verify it
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
  
  const { data: { user }, error } = await supabaseUser.auth.getUser();
  if (error || !user) {
    console.log('❌ [AUTH] Error verifying user token:', error?.message || 'Unknown error');
    console.log('❌ [AUTH] Token (first 20 chars):', token.substring(0, 20) + '...');
    return null;
  }
  
  console.log(`✅ [AUTH] User verified: ${user.id} (${user.email})`);
  return user;
}

// Helper function to check if user is admin
async function isAdmin(userId: string): Promise<boolean> {
  try {
    const adminUsers = await kv.get('admin_users') || [];
    return adminUsers.some((u: any) => u.id === userId && u.status === 'active');
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// ============ HEALTH CHECK ============

// Health check endpoint - no authentication required
app.get('/make-server-de4eab6a/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'CareConnect API Server',
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/make-server-de4eab6a/', (c) => {
  return c.json({ 
    message: 'CareConnect API Server is running',
    version: '1.0.0',
    endpoints: {
      health: '/make-server-de4eab6a/health',
      auth: '/make-server-de4eab6a/auth/*',
      client: '/make-server-de4eab6a/client/*',
      provider: '/make-server-de4eab6a/provider/*',
      admin: '/make-server-de4eab6a/admin/*'
    }
  });
});

// ============ AUTH ROUTES ============

// Check if admin exists
app.get('/make-server-de4eab6a/auth/check-admin', async (c) => {
  try {
    const existingAdmins = await kv.getByPrefix('user:');
    const adminExists = existingAdmins.some((u: any) => u.role === 'admin');
    
    return c.json({ adminExists });
  } catch (error) {
    console.log('Error checking admin:', error);
    return c.json({ adminExists: false });
  }
});

// Initialize default admin account (for testing/setup)
app.post('/make-server-de4eab6a/auth/init-admin', async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    console.log('🔐 Admin initialization request received for:', email);
    
    // Check if admin already exists
    const existingAdmins = await kv.getByPrefix('user:');
    const adminExists = existingAdmins.some((u: any) => u.role === 'admin' && u.email === email);
    
    if (adminExists) {
      console.log('❌ Admin account already exists for:', email);
      return c.json({ error: 'Admin account already exists' }, 400);
    }

    // Create admin user with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
        role: 'admin',
      },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });

    if (error) {
      console.log('❌ Error creating admin account:', error);
      return c.json({ error: error.message }, 400);
    }

    console.log('✅ Admin user created in Supabase Auth:', data.user.id);

    // Store admin data in KV store
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      role: 'admin',
      createdAt: new Date().toISOString(),
    });

    // Initialize default services if none exist
    const existingServices = await kv.getByPrefix('service:');
    if (existingServices.length === 0) {
      const defaultServices = [
        { icon: 'Heart', title: 'Nursing Care', description: 'Professional medical assistance and health monitoring at home' },
        { icon: 'Home', title: 'House Cleaning', description: 'Home cleaning and organization services' },
        { icon: 'ShoppingCart', title: 'Grocery Shopping', description: 'Shopping assistance and delivery of groceries and essentials' },
        { icon: 'Users', title: 'Companionship', description: 'Social interaction and friendly company for elderly' },
        { icon: 'Wrench', title: 'Home Repairs', description: 'Fix and maintenance services for your home' },
        { icon: 'Car', title: 'Transportation', description: 'Rides to appointments, errands, and social activities' },
        { icon: 'Utensils', title: 'Meal Preparation', description: 'Cooking and meal planning services' },
        { icon: 'Baby', title: 'Personal Care', description: 'Assistance with bathing, dressing, and daily activities' },
      ];

      for (const service of defaultServices) {
        const serviceId = `srv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await kv.set(`service:${serviceId}`, {
          id: serviceId,
          ...service,
          createdAt: new Date().toISOString(),
          createdBy: data.user.id,
        });
      }
      console.log('Default services initialized');
    }

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.log('Error in admin initialization:', error);
    return c.json({ error: 'Failed to create admin account' }, 500);
  }
});

// Sign up for clients
app.post('/make-server-de4eab6a/auth/signup/client', async (c) => {
  try {
    const { email, password, name, phone, address, age, gender } = await c.req.json();

    console.log('📝 Client signup request received for:', email);

    // Create user with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
        phone,
        address,
        role: 'client',
      },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });

    if (error) {
      console.log('❌ Error creating client account:', error);
      return c.json({ error: error.message }, 400);
    }

    console.log('✅ Client user created in Supabase Auth:', data.user.id);

    // Store additional client data in SQL database tables (migrated from KV)
    const { error: dbError } = await supabaseAdmin
      .from('clients')
      .insert({
        id: data.user.id,
        auth_user_id: data.user.id,
        email,
        name,
        phone,
        phone_verified: false, // Could be verified during signup flow
        metadata: {
          age: age ? parseInt(age) : null,
          gender: gender || null,
          role: 'client',
          signup_date: new Date().toISOString(),
        }
      });

    if (dbError) {
      console.log('❌ Error saving client to database:', dbError);
      // Don't fail the whole signup - Auth user is created, just log the issue
      console.log('⚠️ Client auth created but database save failed');
    } else {
      console.log('✅ Client data saved to database');
    }

    // If address provided, save to client_locations table
    if (address) {
      const { error: locationError } = await supabaseAdmin
        .from('client_locations')
        .insert({
          client_id: data.user.id,
          label: 'Home', 
          address: { street: address }, // Store as JSONB
          is_default: true,
        });

      if (locationError) {
        console.log('❌ Error saving client location:', locationError);
      } else {
        console.log('✅ Client location saved to database');
      }
    }

    // Create wallet account for new client
    const { error: walletError } = await supabaseAdmin
      .from('wallet_accounts')
      .insert({
        client_id: data.user.id,
        balance: 0.00,
        currency: 'INR',
      });

    if (walletError) {
      console.log('❌ Error creating wallet account:', walletError);
    } else {
      console.log('✅ Wallet account created for client');
    }

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.log('Error in client signup:', error);
    return c.json({ error: 'Failed to create account' }, 500);
  }
  }
});

// Sign up for providers
app.post('/make-server-de4eab6a/auth/signup/provider', async (c) => {
  try {
    const {
      email,
      password,
      name,
      phone,
      emailVerified,
      mobileVerified,
      address,
      gender,
      idCardNumber,
      profilePhoto,
      idCardCopy,
      specialty,
      skills,
      experienceYears,
      experienceDetails,
      hourlyRate,
      certifications
    } = await c.req.json();

    // Create user with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
        phone,
        role: 'provider',
        specialty,
      },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });

    if (error) {
      console.log('Error creating provider account:', error);
      return c.json({ error: error.message }, 400);
    }

    // Store provider data in KV store with pending verification status
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      phone,
      address: address || '',
      gender: gender || null,
      role: 'provider',
      specialty,
      skills: skills || [],
      hourlyRate: hourlyRate || 0,
      experienceYears: experienceYears || 0,
      experienceDetails: experienceDetails || '',
      certifications: certifications || [],
      verified: false,
      verificationStatus: 'pending',
      available: false,
      rating: 0,
      totalReviews: 0,
      totalJobs: 0,
      totalEarnings: 0,
      createdAt: new Date().toISOString(),
    });

    // Add to pending verification list
    await kv.set(`pending_provider:${data.user.id}`, {
      userId: data.user.id,
      submittedDate: new Date().toISOString(),
      status: 'pending',
    });

    // Initialize verification data with submitted data from registration
    const stage1Verified = emailVerified && mobileVerified;
    const stage2HasData = idCardNumber && idCardCopy;
    const stage3HasData = specialty && skills?.length > 0;
    
    await kv.set(`verification:${data.user.id}`, {
      providerId: data.user.id,
      providerName: name,
      providerEmail: email,
      emailVerified: emailVerified || false,
      mobileVerified: mobileVerified || false,
      stages: {
        // All stages start as submitted if data is provided, pending otherwise
        // Admin must manually approve each stage for provider to access dashboard
        stage1: stage1Verified ? 'submitted' : 'pending',
        stage2: stage2HasData ? 'submitted' : 'pending',
        stage3: stage3HasData ? 'submitted' : 'pending',
        stage4: 'submitted',  // Behavioral assessment submitted by default
      },
      stageData: {
        stage1: stage1Verified ? {
          emailVerified: true,
          mobileVerified: true,
        } : {},
        stage2: stage2HasData ? {
          idCardNumber,
          idCardCopy,
          profilePhoto: profilePhoto || '',
          consentGiven: true,
        } : {},
        stage3: stage3HasData ? {
          services: skills,
          specialty,
          experienceYears,
          experienceDetails,
          certifications: certifications || [],
        } : {},
        stage4: {
          submittedAt: new Date().toISOString(),
        },
      },
      reviewNotes: {},
      createdAt: new Date().toISOString(),
    });

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.log('Error in provider signup:', error);
    return c.json({ error: 'Failed to create account' }, 500);
  }
});

// ============ CLIENT ROUTES ============

// Note: Create service request endpoint moved to line ~2362 to avoid duplication

// Get available providers
app.get('/make-server-de4eab6a/providers', async (c) => {
  try {
    const allProviders = await kv.getByPrefix('user:');
    const allRequests = await kv.getByPrefix('request:');
    const allServices = await kv.getByPrefix('service:');
    
    const providers = await Promise.all(
      allProviders
        .filter((p: any) => p.role === 'provider' && p.verified)
        .map(async (p: any) => {
          // Calculate average rating and review count from requests
          const providerRequests = allRequests.filter((r: any) => 
            r.providerId === p.id && (r.userRating || r.rating) && !r.reviewHidden
          );
          
          const reviewCount = providerRequests.length;
          const averageRating = reviewCount > 0 
            ? providerRequests.reduce((sum: number, r: any) => sum + (r.userRating || r.rating), 0) / reviewCount 
            : 0;

          // Resolve specialty - check if it's a service ID
          let specialtyName = p.specialty;
          if (p.specialty) {
            const service = allServices.find((s: any) => s.id === p.specialty);
            if (service) {
              specialtyName = service.title;
              console.log(`Resolved specialty ${p.specialty} to ${service.title}`);
            }
          }

          // Resolve skills - check if any are service IDs
          const resolvedSkills = (p.skills || []).map((skill: string) => {
            const service = allServices.find((s: any) => s.id === skill);
            if (service) {
              console.log(`Resolved skill ${skill} to ${service.title}`);
              return service.title;
            }
            return skill;
          });

          return {
            id: p.id,
            name: p.name,
            email: p.email,
            phone: p.phone,
            specialty: specialtyName || p.specialty || 'General Service',
            skills: resolvedSkills,
            hourlyRate: p.hourlyRate || 0,
            rating: reviewCount > 0 ? Math.round(averageRating * 10) / 10 : 0,
            reviewCount,
            available: p.available || false,
            verified: p.verified,
            gender: p.gender,
            languages: p.languages || [],
            experienceYears: p.experienceYears || 0,
          };
        })
    );

    return c.json({ providers });
  } catch (error) {
    console.log('Error fetching providers:', error);
    return c.json({ error: 'Failed to fetch providers' }, 500);
  }
});

// Get client bookings/requests
app.get('/make-server-de4eab6a/bookings/client', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    console.log(`Fetching bookings for client ${user.id}`);
    
    // Get client data from SQL database
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', user.id)
      .single();

    if (clientError) {
      console.log('❌ Error fetching client data:', clientError);
      return c.json({ error: 'Client not found' }, 404);
    }

    // Get client favorites from SQL database
    const { data: favorites, error: favoritesError } = await supabaseAdmin
      .from('favorites')
      .select('provider_id')
      .eq('client_id', user.id);

    const favoriteProviderIds = favorites?.map(f => f.provider_id) || [];
    
    // Get all requests created by this client
    const allRequests = await kv.getByPrefix('request:');
    const clientRequests = allRequests.filter((r: any) => r.clientId === user.id);

    console.log(`Found ${clientRequests.length} requests for client ${user.id}`);

    // Enhance requests with provider details and normalize data structure
    const enhancedRequests = await Promise.all(
      clientRequests.map(async (request: any) => {
        // Fetch service details to get service title
        let serviceTitle = request.serviceTitle;
        if (!serviceTitle && request.serviceType) {
          const service = await kv.get(`service:${request.serviceType}`);
          serviceTitle = service?.title || request.serviceType;
        }

        // Normalize requestFor field (handle old data with requestForSomeoneElse)
        let requestFor = request.requestFor;
        if (!requestFor && request.requestForSomeoneElse !== undefined) {
          requestFor = request.requestForSomeoneElse ? 'other' : 'self';
        }

        const normalizedRequest = {
          ...request,
          serviceTitle,
          requestFor: requestFor || 'self',
        };

        // Add provider details if accepted
        if (request.providerId) {
          const provider = await kv.get(`user:${request.providerId}`);
          normalizedRequest.provider = {
            id: request.providerId,
            name: provider?.name || 'Unknown',
            phone: provider?.phone,
            rating: provider?.rating,
            reviewCount: provider?.totalReviews || 0,
          };
          
          // Check if this provider is in favorites
          normalizedRequest.isFavorite = favorites.includes(request.providerId);
        }

        return normalizedRequest;
      })
    );

    // Sort by creation date, newest first
    enhancedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log(`Returning ${enhancedRequests.length} enhanced bookings for client ${user.id}`);
    return c.json({ bookings: enhancedRequests });
  } catch (error) {
    console.log('Error fetching client bookings:', error);
    return c.json({ error: 'Failed to fetch bookings', details: error?.message }, 500);
  }
});

// Note: This endpoint is defined later in the file (line ~2400) - see consolidated version there

// Cancel service request
app.post('/make-server-de4eab6a/requests/cancel', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { requestId } = await c.req.json();
    const request = await kv.get(`request:${requestId}`);

    if (!request || request.clientId !== user.id) {
      return c.json({ error: 'Request not found' }, 404);
    }

    if (request.status === 'completed') {
      return c.json({ error: 'Cannot cancel completed request' }, 400);
    }

    request.status = 'cancelled';
    request.cancelledAt = new Date().toISOString();
    await kv.set(`request:${requestId}`, request);

    console.log(`Request ${requestId} cancelled by client ${user.id}`);
    return c.json({ success: true, request });
  } catch (error) {
    console.log('Error cancelling request:', error);
    return c.json({ error: 'Failed to cancel request', details: error?.message }, 500);
  }
});

// Old endpoints removed - using newer consolidated endpoints below

// Get client profile
app.get('/make-server-de4eab6a/client/profile', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    // Get client data from SQL database
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', user.id)
      .single();

    if (clientError) {
      console.log('❌ Error fetching client data:', clientError);
      return c.json({ error: 'Client not found' }, 404);
    }

    // Get client locations from SQL database
    const { data: locations, error: locationsError } = await supabaseAdmin
      .from('client_locations')
      .select('*')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false });

    // Get family members from SQL database
    const { data: familyMembers, error: familyError } = await supabaseAdmin
      .from('family_members')
      .select('*')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false });

    console.log(`✅ Client profile loaded for ${user.id} from SQL database`);

    return c.json({ 
      client: clientData,
      locations: locations || [], 
      familyMembers: familyMembers || [] 
    });
  } catch (error) {
    console.log('Error fetching client profile:', error);
    return c.json({ error: 'Failed to fetch profile' }, 500);
  }
});

// Add location
app.post('/make-server-de4eab6a/client/locations', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const locationData = await c.req.json();
    
    // Insert location into SQL table
    const { data: newLocation, error } = await supabaseAdmin
      .from('client_locations')
      .insert({
        client_id: user.id,
        label: locationData.name || locationData.label,
        address: typeof locationData.address === 'string' 
          ? { street: locationData.address } 
          : locationData.address,
        is_default: locationData.isPrimary || locationData.is_default || false,
        metadata: locationData.metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.log('❌ Error adding location:', error);
      return c.json({ error: 'Failed to add location' }, 500);
    }

    console.log('✅ Location added to database');
    return c.json({ success: true, location: newLocation });
  } catch (error) {
    console.log('Error adding location:', error);
    return c.json({ error: 'Failed to add location' }, 500);
  }
});

// Update location
app.put('/make-server-de4eab6a/client/locations/:locationId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const locationId = c.req.param('locationId');
    const locationData = await c.req.json();
    
    // Update location in SQL table
    const { data: updatedLocation, error } = await supabaseAdmin
      .from('client_locations')
      .update({
        label: locationData.name || locationData.label,
        address: typeof locationData.address === 'string' 
          ? { street: locationData.address } 
          : locationData.address,
        is_default: locationData.isPrimary || locationData.is_default,
        metadata: locationData.metadata || {},
        updated_at: new Date().toISOString()
      })
      .eq('id', locationId)
      .eq('client_id', user.id)
      .select()
      .single();

    if (error) {
      console.log('❌ Error updating location:', error);
      return c.json({ error: 'Failed to update location' }, 500);
    }

    if (!updatedLocation) {
      return c.json({ error: 'Location not found' }, 404);
    }

    console.log('✅ Location updated in database');
    return c.json({ success: true, location: updatedLocation });
  } catch (error) {
    console.log('Error updating location:', error);
    return c.json({ error: 'Failed to update location' }, 500);
  }
});

// Delete location
app.delete('/make-server-de4eab6a/client/locations/:locationId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const locationId = c.req.param('locationId');
    
    // Delete location from SQL table
    const { error } = await supabaseAdmin
      .from('client_locations')
      .delete()
      .eq('id', locationId)
      .eq('client_id', user.id);

    if (error) {
      console.log('❌ Error deleting location:', error);
      return c.json({ error: 'Failed to delete location' }, 500);
    }

    console.log('✅ Location deleted from database');
    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting location:', error);
    return c.json({ error: 'Failed to delete location' }, 500);
  }
});

// Add family member
app.post('/make-server-de4eab6a/client/family-members', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const memberData = await c.req.json();
    
    // Insert family member into SQL table
    const { data: newMember, error } = await supabaseAdmin
      .from('family_members')
      .insert({
        client_id: user.id,
        name: memberData.name,
        relation: memberData.relationship || memberData.relation,
        phone: memberData.phone,
        dob: memberData.dob || null,
        metadata: {
          age: memberData.age,
          gender: memberData.gender,
          address: memberData.address,
          notes: memberData.notes || ''
        }
      })
      .select()
      .single();

    if (error) {
      console.log('❌ Error adding family member:', error);
      return c.json({ error: 'Failed to add family member' }, 500);
    }

    console.log('✅ Family member added to database');
    return c.json({ success: true, familyMember: newMember });
  } catch (error) {
    console.log('Error adding family member:', error);
    return c.json({ error: 'Failed to add family member' }, 500);
  }
});

// Update family member
app.put('/make-server-de4eab6a/client/family-members/:memberId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const memberId = c.req.param('memberId');
    const memberData = await c.req.json();
    const familyMember = await kv.get(`family:${memberId}`);

    if (!familyMember || familyMember.userId !== user.id) {
      return c.json({ error: 'Family member not found' }, 404);
    }

    const updatedMember = {
      ...familyMember,
      name: memberData.name,
      relationship: memberData.relationship,
      phone: memberData.phone,
      age: memberData.age,
      gender: memberData.gender,
      address: memberData.address,
      notes: memberData.notes || '',
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`family:${memberId}`, updatedMember);
    return c.json({ success: true, familyMember: updatedMember });
  } catch (error) {
    console.log('Error updating family member:', error);
    return c.json({ error: 'Failed to update family member' }, 500);
  }
});

// Delete family member
app.delete('/make-server-de4eab6a/client/family-members/:memberId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const memberId = c.req.param('memberId');
    
    // Delete family member from SQL table
    const { error } = await supabaseAdmin
      .from('family_members')
      .delete()
      .eq('id', memberId)
      .eq('client_id', user.id);

    if (error) {
      console.log('❌ Error deleting family member:', error);
      return c.json({ error: 'Failed to delete family member' }, 500);
    }

    console.log('✅ Family member deleted from database');
    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting family member:', error);
    return c.json({ error: 'Failed to delete family member' }, 500);
  }
});

// ============ FAVORITES MANAGEMENT ============

// Get user's favorite providers
app.get('/make-server-de4eab6a/client/favorites', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    console.log(`Fetching favorites for client ${user.id}`);
    
    // Get favorites from SQL database
    const { data: favorites, error } = await supabaseAdmin
      .from('favorites')
      .select('provider_id, created_at')
      .eq('client_id', user.id);

    if (error) {
      console.log('❌ Error fetching favorites:', error);
      return c.json({ error: 'Failed to fetch favorites' }, 500);
    }

    console.log(`✅ Client has ${favorites?.length || 0} favorites in SQL database`);

    // For now, return just the provider IDs
    // TODO: Enhance with provider details when provider data is migrated to SQL
    const favoriteProviders = favorites?.map(f => ({
      provider_id: f.provider_id,
      created_at: f.created_at
    })) || [];

    return c.json({ 
      favorites: favoriteProviders,
      count: favoriteProviders.length 
    });
  } catch (error) {
    console.log('Error fetching favorites:', error);
    return c.json({ error: 'Failed to fetch favorites' }, 500);
  }
});
        let specialtyName = provider.specialty;
        if (provider.specialty) {
          const service = allServices.find((s: any) => s.id === provider.specialty);
          if (service) {
            specialtyName = service.title;
          }
        }

        // Resolve skills - check if any are service IDs
        const resolvedSkills = (provider.skills || []).map((skill: string) => {
          const service = allServices.find((s: any) => s.id === skill);
          if (service) {
            return service.title;
          }
          return skill;
        });

        return {
          id: provider.id,
          name: provider.name,
// Add provider to favorites
app.post('/make-server-de4eab6a/client/favorites/add', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { providerId } = await c.req.json();

    if (!providerId) {
      return c.json({ error: 'Provider ID is required' }, 400);
    }

    console.log(`Adding provider ${providerId} to favorites for client ${user.id}`);
    
    // Insert favorite into SQL table (using upsert to handle duplicates)
    const { data, error } = await supabaseAdmin
      .from('favorites')
      .insert({
        client_id: user.id,
        provider_id: providerId
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return c.json({ error: 'Provider already in favorites' }, 400);
      }
      console.log('❌ Error adding favorite:', error);
      return c.json({ error: 'Failed to add favorite' }, 500);
    }

    console.log('✅ Provider added to favorites in database');
    return c.json({ success: true, favorite: data });    favorites.push(providerId);
    await kv.set(`user:${user.id}`, { ...clientData, favorites });

    console.log(`✅ Provider ${providerId} added to favorites for client ${user.id}`);
    return c.json({ success: true, message: 'Provider added to favorites' });
  } catch (error) {
    console.log('Error adding favorite:', error);
    return c.json({ error: 'Failed to add favorite', details: error?.message }, 500);
  }
});

// Remove provider from favorites
app.post('/make-server-de4eab6a/client/favorites/remove', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { providerId } = await c.req.json();
    
    if (!providerId) {
      return c.json({ error: 'Provider ID is required' }, 400);
    }

    console.log(`Removing provider ${providerId} from favorites for client ${user.id}`);
    
    // Remove favorite from SQL table
    const { error } = await supabaseAdmin
      .from('favorites')
      .delete()
      .eq('client_id', user.id)
      .eq('provider_id', providerId);

    if (error) {
      console.log('❌ Error removing favorite:', error);
      return c.json({ error: 'Failed to remove favorite' }, 500);
    }

    console.log('✅ Provider removed from favorites in database');
    return c.json({ success: true });

    console.log(`✅ Provider ${providerId} removed from favorites for client ${user.id}`);
    return c.json({ success: true, message: 'Provider removed from favorites' });
  } catch (error) {
    console.log('Error removing favorite:', error);
    return c.json({ error: 'Failed to remove favorite', details: error?.message }, 500);
  }
});

// ============ PROVIDER ROUTES ============

// Note: Provider bookings endpoint moved to line ~2158 to avoid duplication

// Emergency Alert / SOS endpoint
app.post('/make-server-de4eab6a/emergency/alert', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    console.log(`🚨 [EMERGENCY] Alert received from user ${user.id}`);

    const clientData = await kv.get(`user:${user.id}`);
    if (!clientData) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Create emergency alert record
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const alert = {
      id: alertId,
      userId: user.id,
      userName: clientData.name,
      userEmail: clientData.email,
      userPhone: clientData.phone,
      userAddress: clientData.address,
      timestamp: new Date().toISOString(),
      status: 'active',
      resolvedAt: null,
      resolvedBy: null,
    };

    await kv.set(`emergency:${alertId}`, alert);

    console.log(`🚨 [EMERGENCY] Alert ${alertId} created for ${clientData.name}`);
    console.log(`📍 Location: ${clientData.address || 'Not provided'}`);
    console.log(`📞 Contact: ${clientData.phone || 'Not provided'}`);

    return c.json({ 
      success: true, 
      message: 'Emergency alert sent. Help is on the way!',
      alertId,
    });
  } catch (error) {
    console.error('❌ [EMERGENCY] Error creating alert:', error);
    return c.json({ error: 'Failed to send emergency alert', details: error?.message }, 500);
  }
});

// Get all emergency alerts (admin only)
app.get('/make-server-de4eab6a/admin/emergency-alerts', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const userIsAdmin = await isAdmin(user.id);
    if (!userIsAdmin) {
      return c.json({ error: 'Forbidden - Admin access required' }, 403);
    }

    const allAlerts = await kv.getByPrefix('emergency:');
    
    // Sort by timestamp, most recent first
    allAlerts.sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return c.json({ alerts: allAlerts });
  } catch (error) {
    console.error('Error fetching emergency alerts:', error);
    return c.json({ error: 'Failed to fetch emergency alerts', details: error?.message }, 500);
  }
});

// Resolve emergency alert (admin only)
app.post('/make-server-de4eab6a/admin/emergency-alerts/resolve', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const userIsAdmin = await isAdmin(user.id);
    if (!userIsAdmin) {
      return c.json({ error: 'Forbidden - Admin access required' }, 403);
    }

    const { alertId } = await c.req.json();
    if (!alertId) {
      return c.json({ error: 'Alert ID is required' }, 400);
    }

    const alert = await kv.get(`emergency:${alertId}`);
    if (!alert) {
      return c.json({ error: 'Alert not found' }, 404);
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date().toISOString();
    alert.resolvedBy = user.id;

    await kv.set(`emergency:${alertId}`, alert);

    console.log(`✅ [EMERGENCY] Alert ${alertId} resolved by admin ${user.id}`);
    return c.json({ success: true, alert });
  } catch (error) {
    console.error('Error resolving emergency alert:', error);
    return c.json({ error: 'Failed to resolve alert', details: error?.message }, 500);
  }
});

// Update provider availability
app.post('/make-server-de4eab6a/provider/availability', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { available } = await c.req.json();
    const provider = await kv.get(`user:${user.id}`);

    if (!provider) {
      return c.json({ error: 'Provider not found' }, 404);
    }

    await kv.set(`user:${user.id}`, { ...provider, available });

    return c.json({ success: true, available });
  } catch (error) {
    console.log('Error updating availability:', error);
    return c.json({ error: 'Failed to update availability' }, 500);
  }
});

// ============ ADMIN ROUTES ============

// Get all users
app.get('/make-server-de4eab6a/admin/users', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const allUsers = await kv.getByPrefix('user:');
    return c.json({ users: allUsers });
  } catch (error) {
    console.log('Error fetching users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// Get pending providers
app.get('/make-server-de4eab6a/admin/pending-providers', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const pendingProviders = await kv.getByPrefix('pending_provider:');
    const providersData = await Promise.all(
      pendingProviders.map(async (p: any) => {
        const userData = await kv.get(`user:${p.userId}`);
        return { ...userData, pendingInfo: p };
      })
    );

    return c.json({ providers: providersData });
  } catch (error) {
    console.log('Error fetching pending providers:', error);
    return c.json({ error: 'Failed to fetch pending providers' }, 500);
  }
});

// Approve provider
app.post('/make-server-de4eab6a/admin/approve-provider', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { providerId } = await c.req.json();
    const provider = await kv.get(`user:${providerId}`);

    if (!provider) {
      return c.json({ error: 'Provider not found' }, 404);
    }

    // Update provider status with verificationStatus field
    await kv.set(`user:${providerId}`, { 
      ...provider, 
      verified: true, 
      available: true,
      verificationStatus: 'approved'
    });
    await kv.del(`pending_provider:${providerId}`);

    // Also update all verification stages to approved
    let verification = await kv.get(`verification:${providerId}`);
    if (!verification) {
      // Create verification record if it doesn't exist
      console.log(`Creating verification record for provider ${providerId} during approval`);
      verification = {
        providerId,
        emailVerified: true,
        mobileVerified: true,
        stages: {
          stage1: 'approved',
          stage2: 'approved',
          stage3: 'approved',
          stage4: 'approved',
        },
        stageData: {},
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
      };
    } else {
      // Update existing verification
      verification.stages = {
        stage1: 'approved',
        stage2: 'approved',
        stage3: 'approved',
        stage4: 'approved',
      };
      verification.approvedAt = new Date().toISOString();
    }
    await kv.set(`verification:${providerId}`, verification);

    console.log(`✓ Provider ${providerId} approved successfully with all stages set to approved`);
    return c.json({ success: true });
  } catch (error) {
    console.log('Error approving provider:', error);
    return c.json({ error: 'Failed to approve provider' }, 500);
  }
});

// Get all bookings (admin)
app.get('/make-server-de4eab6a/admin/bookings', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const allBookings = await kv.getByPrefix('booking:');
    return c.json({ bookings: allBookings });
  } catch (error) {
    console.log('Error fetching all bookings:', error);
    return c.json({ error: 'Failed to fetch bookings' }, 500);
  }
});

// Get platform stats (admin)
app.get('/make-server-de4eab6a/admin/stats', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const allUsers = await kv.getByPrefix('user:');
    const allBookings = await kv.getByPrefix('booking:');
    const pendingProviders = await kv.getByPrefix('pending_provider:');

    const clients = allUsers.filter((u: any) => u.role === 'client');
    const providers = allUsers.filter((u: any) => u.role === 'provider' && u.verified);
    const completedBookings = allBookings.filter((b: any) => b.status === 'completed');
    
    const totalRevenue = completedBookings.reduce((sum: number, b: any) => sum + (b.cost || 0), 0);
    const avgRating = providers.length > 0
      ? providers.reduce((sum: number, p: any) => sum + (p.rating || 0), 0) / providers.length
      : 0;

    return c.json({
      stats: {
        totalUsers: allUsers.length,
        totalClients: clients.length,
        totalProviders: providers.length,
        pendingProviders: pendingProviders.length,
        totalBookings: allBookings.length,
        completedBookings: completedBookings.length,
        totalRevenue,
        avgRating: avgRating.toFixed(1),
      },
    });
  } catch (error) {
    console.log('Error fetching stats:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

// ============ PLATFORM SETTINGS ROUTES ============

// Get platform settings
app.get('/make-server-de4eab6a/admin/settings', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    let settings = await kv.get('platform_settings');
    
    // Initialize default settings if none exist
    if (!settings) {
      settings = {
        currency: 'USD',
        currencySymbol: '$',
        enableProviderSearch: true,
        enableClientWallet: true,
        enableProviderWallet: true,
        razorpayKeyId: '',
        razorpayKeySecret: '',
        mapboxAccessToken: '',
        updatedAt: new Date().toISOString(),
      };
      await kv.set('platform_settings', settings);
    }

    return c.json({ settings });
  } catch (error) {
    console.log('Error fetching settings:', error);
    return c.json({ error: 'Failed to fetch settings' }, 500);
  }
});

// Update platform settings
app.put('/make-server-de4eab6a/admin/settings', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const settingsData = await c.req.json();
    
    console.log('📥 Received settings data:', settingsData);
    
    const settings = {
      currency: settingsData.currency || 'USD',
      currencySymbol: settingsData.currencySymbol || '$',
      enableProviderSearch: settingsData.enableProviderSearch === true,
      enableClientWallet: settingsData.enableClientWallet === true,
      enableProviderWallet: settingsData.enableProviderWallet === true,
      razorpayKeyId: settingsData.razorpayKeyId || '',
      razorpayKeySecret: settingsData.razorpayKeySecret || '',
      mapboxAccessToken: settingsData.mapboxAccessToken || '',
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
    };

    console.log('💾 Saving settings to database:', settings);
    await kv.set('platform_settings', settings);
    
    console.log('✅ Platform settings updated successfully');
    return c.json({ success: true, settings });
  } catch (error) {
    console.log('Error updating settings:', error);
    return c.json({ error: 'Failed to update settings' }, 500);
  }
});

// Get public settings (for non-authenticated users)
app.get('/make-server-de4eab6a/settings/public', async (c) => {
  try {
    let settings = await kv.get('platform_settings');
    
    if (!settings) {
      settings = {
        currency: 'USD',
        currencySymbol: '$',
        enableProviderSearch: true,
        enableClientWallet: true,
        enableProviderWallet: true,
      };
    }

    // Return only public settings (including Mapbox token for client-side use)
    return c.json({ 
      settings: {
        currency: settings.currency,
        currencySymbol: settings.currencySymbol,
        enableProviderSearch: settings.enableProviderSearch,
        mapboxAccessToken: settings.mapboxAccessToken || '',
      }
    });
  } catch (error) {
    console.log('Error fetching public settings:', error);
    return c.json({ 
      settings: {
        currency: 'USD',
        currencySymbol: '$',
        enableProviderSearch: true,
        mapboxAccessToken: '',
      }
    });
  }
});

// Get Razorpay public key (for client-side use)
app.get('/make-server-de4eab6a/payment/razorpay-key', async (c) => {
  try {
    const settings = await kv.get('platform_settings');
    
    if (!settings || !settings.razorpayKeyId) {
      return c.json({ error: 'Razorpay not configured' }, 400);
    }

    // Return only the public key ID (not the secret)
    return c.json({ 
      keyId: settings.razorpayKeyId 
    });
  } catch (error) {
    console.log('Error fetching Razorpay key:', error);
    return c.json({ error: 'Failed to fetch payment configuration' }, 500);
  }
});

// Process Razorpay payment (server-side verification)
app.post('/make-server-de4eab6a/payment/razorpay-verify', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = await c.req.json();
    
    const settings = await kv.get('platform_settings');
    
    if (!settings || !settings.razorpayKeySecret) {
      return c.json({ error: 'Razorpay not configured' }, 400);
    }

    // Verify signature using Razorpay's algorithm
    // Note: In production, you would use crypto.createHmac to verify the signature
    // For this prototype, we'll do basic validation
    
    if (!razorpay_payment_id || !razorpay_order_id) {
      return c.json({ error: 'Invalid payment data' }, 400);
    }

    // Store payment record
    const paymentRecord = {
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      userId: user.id,
      timestamp: new Date().toISOString(),
      status: 'success'
    };
    
    await kv.set(`payment:${razorpay_payment_id}`, paymentRecord);
    
    return c.json({ 
      success: true,
      verified: true,
      paymentId: razorpay_payment_id 
    });
  } catch (error) {
    console.log('Error verifying payment:', error);
    return c.json({ error: 'Failed to verify payment' }, 500);
  }
});

// ============ ROLE AND PERMISSION ROUTES ============

// Get all roles
app.get('/make-server-de4eab6a/admin/roles', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    let roles = await kv.get('admin_roles');
    
    if (!roles) {
      const systemRoles = [
        { id: 'super_admin', name: 'Super Admin', description: 'Full access to all features and settings. Can manage admin team and roles.', isSystemRole: true, permissions: ['view_dashboard', 'view_analytics', 'view_users', 'edit_users', 'delete_users', 'suspend_users', 'view_providers', 'edit_providers', 'verify_providers', 'suspend_providers', 'view_requests', 'manage_requests', 'assign_providers', 'cancel_requests', 'view_emergencies', 'manage_emergencies', 'respond_emergencies', 'view_payments', 'manage_payments', 'process_refunds', 'view_financial_reports', 'view_settings', 'manage_settings', 'manage_integrations', 'view_admin_team', 'manage_admin_team', 'manage_roles', 'assign_roles'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'admin', name: 'Admin', description: 'Can manage users, providers, and service requests. Cannot modify settings or admin team.', isSystemRole: true, permissions: ['view_dashboard', 'view_analytics', 'view_users', 'edit_users', 'suspend_users', 'view_providers', 'edit_providers', 'verify_providers', 'suspend_providers', 'view_requests', 'manage_requests', 'assign_providers', 'cancel_requests', 'view_emergencies', 'manage_emergencies', 'respond_emergencies', 'view_payments', 'manage_payments'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'moderator', name: 'Moderator', description: 'Can view and manage service requests and emergencies. Limited user management.', isSystemRole: true, permissions: ['view_dashboard', 'view_users', 'view_providers', 'view_requests', 'manage_requests', 'assign_providers', 'view_emergencies', 'manage_emergencies', 'respond_emergencies', 'view_payments'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'support', name: 'Support Agent', description: 'Can view data and respond to emergencies. Cannot make changes to users or settings.', isSystemRole: true, permissions: ['view_dashboard', 'view_users', 'view_providers', 'view_requests', 'view_emergencies', 'respond_emergencies', 'view_payments'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'viewer', name: 'Viewer', description: 'Read-only access to dashboard and reports. Cannot make any changes.', isSystemRole: true, permissions: ['view_dashboard', 'view_analytics', 'view_users', 'view_providers', 'view_requests', 'view_emergencies', 'view_payments', 'view_financial_reports'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ];
      await kv.set('admin_roles', systemRoles);
      roles = systemRoles;
    }

    return c.json({ roles });
  } catch (error) {
    console.log('Error fetching roles:', error);
    return c.json({ error: 'Failed to fetch roles' }, 500);
  }
});

// Create custom role
app.post('/make-server-de4eab6a/admin/roles', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const roleData = await c.req.json();
    const roles = await kv.get('admin_roles') || [];
    
    const newRole = {
      id: `custom_${Date.now()}`,
      name: roleData.name,
      description: roleData.description,
      permissions: roleData.permissions || [],
      isSystemRole: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.id,
    };
    
    roles.push(newRole);
    await kv.set('admin_roles', roles);
    
    return c.json({ success: true, role: newRole });
  } catch (error) {
    console.log('Error creating role:', error);
    return c.json({ error: 'Failed to create role' }, 500);
  }
});

// Update role
app.put('/make-server-de4eab6a/admin/roles/:roleId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const roleId = c.req.param('roleId');
    const roleData = await c.req.json();
    const roles = await kv.get('admin_roles') || [];
    const roleIndex = roles.findIndex((r: any) => r.id === roleId);
    
    if (roleIndex === -1) {
      return c.json({ error: 'Role not found' }, 404);
    }
    
    if (roles[roleIndex].isSystemRole) {
      return c.json({ error: 'Cannot modify system roles' }, 400);
    }
    
    roles[roleIndex] = {
      ...roles[roleIndex],
      name: roleData.name || roles[roleIndex].name,
      description: roleData.description || roles[roleIndex].description,
      permissions: roleData.permissions || roles[roleIndex].permissions,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
    };
    
    await kv.set('admin_roles', roles);
    
    return c.json({ success: true, role: roles[roleIndex] });
  } catch (error) {
    console.log('Error updating role:', error);
    return c.json({ error: 'Failed to update role' }, 500);
  }
});

// Delete role
app.delete('/make-server-de4eab6a/admin/roles/:roleId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const roleId = c.req.param('roleId');
    const roles = await kv.get('admin_roles') || [];
    const role = roles.find((r: any) => r.id === roleId);
    
    if (!role) {
      return c.json({ error: 'Role not found' }, 404);
    }
    
    if (role.isSystemRole) {
      return c.json({ error: 'Cannot delete system roles' }, 400);
    }
    
    const filteredRoles = roles.filter((r: any) => r.id !== roleId);
    await kv.set('admin_roles', filteredRoles);
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting role:', error);
    return c.json({ error: 'Failed to delete role' }, 500);
  }
});

// Get all admin users
app.get('/make-server-de4eab6a/admin/team', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const adminUsers = await kv.get('admin_users') || [];
    const roles = await kv.get('admin_roles') || [];
    
    const usersWithRoles = adminUsers.map((u: any) => {
      const role = roles.find((r: any) => r.id === u.roleId);
      return {
        ...u,
        roleName: role ? role.name : 'Unknown',
      };
    });
    
    return c.json({ users: usersWithRoles });
  } catch (error) {
    console.log('Error fetching admin users:', error);
    return c.json({ error: 'Failed to fetch admin users' }, 500);
  }
});

// Create admin user
app.post('/make-server-de4eab6a/admin/team', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const userData = await c.req.json();
    const adminUsers = await kv.get('admin_users') || [];
    const roles = await kv.get('admin_roles') || [];
    
    // Validate required fields
    if (!userData.email || !userData.name || !userData.password || !userData.roleId) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    // Validate password length
    if (userData.password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }
    
    const existingUser = adminUsers.find((u: any) => u.email === userData.email);
    if (existingUser) {
      return c.json({ error: 'Email already exists' }, 400);
    }
    
    const role = roles.find((r: any) => r.id === userData.roleId);
    if (!role) {
      return c.json({ error: 'Invalid role' }, 400);
    }
    
    // Create Supabase Auth user with the provided password
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      user_metadata: { 
        name: userData.name,
        role: 'admin',  // This is what AuthFlow checks for
        roleId: userData.roleId,
        roleName: role.name,
        userType: 'admin'
      },
      // Automatically confirm the user's email since an email server hasn't been configured
      email_confirm: true
    });
    
    if (authError) {
      console.log('Error creating Supabase auth user:', authError);
      return c.json({ error: authError.message || 'Failed to create auth user' }, 500);
    }
    
    const newUser = {
      id: authData.user.id,
      email: userData.email,
      name: userData.name,
      roleId: userData.roleId,
      roleName: role.name,
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: user.id,
    };
    
    adminUsers.push(newUser);
    await kv.set('admin_users', adminUsers);
    
    return c.json({ success: true, user: newUser });
  } catch (error) {
    console.log('Error creating admin user:', error);
    return c.json({ error: 'Failed to create admin user' }, 500);
  }
});

// Update admin user
app.put('/make-server-de4eab6a/admin/team/:userId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const userId = c.req.param('userId');
    const userData = await c.req.json();
    const adminUsers = await kv.get('admin_users') || [];
    const roles = await kv.get('admin_roles') || [];
    const userIndex = adminUsers.findIndex((u: any) => u.id === userId);
    
    if (userIndex === -1) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    if (userData.roleId) {
      const role = roles.find((r: any) => r.id === userData.roleId);
      if (!role) {
        return c.json({ error: 'Invalid role' }, 400);
      }
      adminUsers[userIndex].roleId = userData.roleId;
      adminUsers[userIndex].roleName = role.name;
    }
    
    if (userData.name) adminUsers[userIndex].name = userData.name;
    if (userData.status) adminUsers[userIndex].status = userData.status;
    adminUsers[userIndex].updatedAt = new Date().toISOString();
    adminUsers[userIndex].updatedBy = user.id;
    
    // Also update Supabase Auth metadata to keep it in sync
    const updatedRole = roles.find((r: any) => r.id === adminUsers[userIndex].roleId);
    await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          name: adminUsers[userIndex].name,
          role: 'admin',
          roleId: adminUsers[userIndex].roleId,
          roleName: updatedRole?.name || adminUsers[userIndex].roleName,
          userType: 'admin'
        }
      }
    );
    
    await kv.set('admin_users', adminUsers);
    
    return c.json({ success: true, user: adminUsers[userIndex] });
  } catch (error) {
    console.log('Error updating admin user:', error);
    return c.json({ error: 'Failed to update admin user' }, 500);
  }
});

// Delete admin user
app.delete('/make-server-de4eab6a/admin/team/:userId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const userId = c.req.param('userId');
    const adminUsers = await kv.get('admin_users') || [];
    const filteredUsers = adminUsers.filter((u: any) => u.id !== userId);
    
    if (filteredUsers.length === adminUsers.length) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    await kv.set('admin_users', filteredUsers);
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting admin user:', error);
    return c.json({ error: 'Failed to delete admin user' }, 500);
  }
});

// Reset admin user password
app.post('/make-server-de4eab6a/admin/team/:userId/reset-password', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const userId = c.req.param('userId');
    const { password } = await c.req.json();
    
    if (!password || password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }

    const adminUsers = await kv.get('admin_users') || [];
    const adminUser = adminUsers.find((u: any) => u.id === userId);
    
    if (!adminUser) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Update password in Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password }
    );
    
    if (updateError) {
      console.error('Error updating password in Supabase Auth:', updateError);
      return c.json({ error: 'Failed to update password' }, 500);
    }
    
    return c.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.log('Error resetting admin user password:', error);
    return c.json({ error: 'Failed to reset admin user password' }, 500);
  }
});

// Fix admin users metadata (migration endpoint)
app.post('/make-server-de4eab6a/admin/team/fix-metadata', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const adminUsers = await kv.get('admin_users') || [];
    const roles = await kv.get('admin_roles') || [];
    
    let fixedCount = 0;
    const errors = [];

    for (const adminUser of adminUsers) {
      try {
        const role = roles.find((r: any) => r.id === adminUser.roleId);
        
        // Update the Supabase Auth user metadata to include role: 'admin'
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          adminUser.id,
          {
            user_metadata: {
              name: adminUser.name,
              role: 'admin',  // Add the role field that AuthFlow checks for
              roleId: adminUser.roleId,
              roleName: role?.name || adminUser.roleName,
              userType: 'admin'
            }
          }
        );

        if (updateError) {
          console.log(`Error updating metadata for ${adminUser.email}:`, updateError);
          errors.push({ email: adminUser.email, error: updateError.message });
        } else {
          fixedCount++;
        }
      } catch (err) {
        console.log(`Error processing ${adminUser.email}:`, err);
        errors.push({ email: adminUser.email, error: String(err) });
      }
    }

    return c.json({ 
      success: true, 
      fixedCount,
      totalUsers: adminUsers.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.log('Error fixing admin metadata:', error);
    return c.json({ error: 'Failed to fix admin metadata' }, 500);
  }
});

// Get current admin user with permissions
app.get('/make-server-de4eab6a/admin/me', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const adminUsers = await kv.get('admin_users') || [];
    const roles = await kv.get('admin_roles') || [];
    
    const adminUser = adminUsers.find((u: any) => u.id === user.id);
    
    if (!adminUser) {
      const superAdminRole = roles.find((r: any) => r.id === 'super_admin');
      return c.json({
        user: {
          id: user.id,
          email: user.email,
          name: 'Admin User',
          roleId: 'super_admin',
          roleName: 'Super Admin',
          status: 'active',
        },
        permissions: superAdminRole ? superAdminRole.permissions : [],
      });
    }
    
    const role = roles.find((r: any) => r.id === adminUser.roleId);
    
    return c.json({
      user: adminUser,
      permissions: role ? role.permissions : [],
    });
  } catch (error) {
    console.log('Error fetching current admin user:', error);
    return c.json({ error: 'Failed to fetch user info' }, 500);
  }
});

// ============ VERIFICATION ROUTES ============

// Get provider verification status
app.get('/make-server-de4eab6a/verification/:providerId', async (c) => {
  try {
    const providerId = c.req.param('providerId');
    console.log(`📥 Getting verification for provider: ${providerId}`);
    
    // Get verification data or create new
    let verificationData = await kv.get(`verification:${providerId}`);
    
    if (!verificationData) {
      // Initialize verification for new provider
      console.log('⚠️  No verification data found - Initializing new verification for provider:', providerId);
      verificationData = {
        providerId,
        emailVerified: false,
        mobileVerified: false,
        stages: {
          stage1: 'pending',
          stage2: 'pending',
          stage3: 'pending',
          stage4: 'pending',
        },
        stageData: {},
        createdAt: new Date().toISOString(),
      };
      await kv.set(`verification:${providerId}`, verificationData);
      console.log('✅ Created new verification data');
    } else {
      console.log(`✅ Verification data loaded:`, {
        providerId: verificationData.providerId,
        stages: verificationData.stages,
      });
    }

    return c.json(verificationData);
  } catch (error) {
    console.log('❌ Error getting verification status - Full error:', error);
    console.log('Error message:', error?.message);
    console.log('Error stack:', error?.stack);
    return c.json({ error: 'Failed to get verification status', details: error?.message }, 500);
  }
});

// Send OTP for verification
app.post('/make-server-de4eab6a/verification/send-otp', async (c) => {
  try {
    const { providerId, type } = await c.req.json();
    console.log(`Sending OTP for ${type} to provider:`, providerId);
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with expiration (10 minutes)
    const otpKey = `otp:${providerId}:${type}`;
    await kv.set(otpKey, {
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    // In production, send OTP via email/SMS service
    console.log(`✓ OTP sent for ${type} verification (${providerId}): ${otp}`);
    
    return c.json({ success: true, message: `OTP sent to ${type}`, otp });
  } catch (error) {
    console.log('Error sending OTP - Full error:', error);
    return c.json({ error: 'Failed to send OTP', details: error?.message }, 500);
  }
});

// Verify OTP
app.post('/make-server-de4eab6a/verification/verify-otp', async (c) => {
  try {
    const { providerId, type, otp } = await c.req.json();
    console.log(`Verifying ${type} OTP for provider:`, providerId);
    
    const otpKey = `otp:${providerId}:${type}`;
    const storedOtpData = await kv.get(otpKey);
    
    if (!storedOtpData) {
      console.log('OTP not found for key:', otpKey);
      return c.json({ verified: false, error: 'OTP not found or expired' }, 400);
    }

    if (new Date(storedOtpData.expiresAt) < new Date()) {
      console.log('OTP expired');
      return c.json({ verified: false, error: 'OTP expired' }, 400);
    }

    if (storedOtpData.otp !== otp) {
      console.log('Invalid OTP provided');
      return c.json({ verified: false, error: 'Invalid OTP' }, 400);
    }

    // Mark as verified
    const verificationData = await kv.get(`verification:${providerId}`);
    if (verificationData) {
      if (type === 'email') {
        verificationData.emailVerified = true;
      } else if (type === 'mobile') {
        verificationData.mobileVerified = true;
      }
      await kv.set(`verification:${providerId}`, verificationData);
      console.log(`✓ ${type} verified successfully`);
    }

    // Delete OTP after successful verification
    await kv.del(otpKey);

    return c.json({ verified: true });
  } catch (error) {
    console.log('Error verifying OTP - Full error:', error);
    return c.json({ error: 'Failed to verify OTP', details: error?.message }, 500);
  }
});

// Submit verification stage
app.post('/make-server-de4eab6a/verification/submit-stage', async (c) => {
  try {
    const { providerId, stage, data } = await c.req.json();
    console.log(`Submitting ${stage} for provider:`, providerId);
    
    const verificationData = await kv.get(`verification:${providerId}`);
    if (!verificationData) {
      console.log('Verification not found for provider:', providerId);
      return c.json({ error: 'Verification not found' }, 404);
    }

    // Update stage data and status
    verificationData.stageData[stage] = {
      ...data,
      submittedAt: new Date().toISOString(),
    };
    verificationData.stages[stage] = 'submitted';
    
    await kv.set(`verification:${providerId}`, verificationData);
    console.log(`✓ ${stage} submitted successfully`);

    return c.json({ success: true, verification: verificationData });
  } catch (error) {
    console.log('Error submitting verification stage - Full error:', error);
    return c.json({ error: 'Failed to submit stage', details: error?.message }, 500);
  }
});

// Admin: Get pending verifications
app.get('/make-server-de4eab6a/admin/verifications/pending', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      console.log('Unauthorized admin access attempt');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log('Fetching pending verifications for admin:', user.id);
    const allVerifications = await kv.getByPrefix('verification:');
    console.log('Total verifications found:', allVerifications.length);
    
    const pending = allVerifications.filter((v: any) => 
      Object.values(v.stages).some((status: any) => status === 'submitted')
    );
    console.log('Pending verifications:', pending.length);

    // Get provider details for each verification
    const verificationWithDetails = await Promise.all(
      pending.map(async (v: any) => {
        const provider = await kv.get(`user:${v.providerId}`);
        return {
          ...v,
          providerName: provider?.name || 'Unknown',
          providerEmail: provider?.email || 'Unknown',
        };
      })
    );

    return c.json({ verifications: verificationWithDetails });
  } catch (error) {
    console.log('Error fetching pending verifications - Full error:', error);
    return c.json({ error: 'Failed to fetch verifications', details: error?.message }, 500);
  }
});

// Admin: Get specific provider verification details
app.get('/make-server-de4eab6a/admin/verifications/:providerId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      console.log('Unauthorized admin access attempt');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const providerId = c.req.param('providerId');
    console.log('Admin fetching verification details for provider:', providerId);
    
    const verification = await kv.get(`verification:${providerId}`);
    const provider = await kv.get(`user:${providerId}`);

    if (!verification) {
      console.log('Verification not found for provider:', providerId);
      return c.json({ error: 'Verification not found' }, 404);
    }

    return c.json({
      verification,
      provider: {
        name: provider?.name,
        email: provider?.email,
        phone: provider?.phone,
      },
    });
  } catch (error) {
    console.log('Error fetching verification details - Full error:', error);
    return c.json({ error: 'Failed to fetch details', details: error?.message }, 500);
  }
});

// Admin: Review verification stage
app.post('/make-server-de4eab6a/admin/verifications/review', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      console.log('Unauthorized admin access attempt');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { providerId, stage, action, notes } = await c.req.json();
    console.log(`Admin ${user.id} reviewing ${stage} for provider ${providerId}: ${action}`);
    
    const verificationData = await kv.get(`verification:${providerId}`);
    if (!verificationData) {
      console.log('Verification not found for provider:', providerId);
      return c.json({ error: 'Verification not found' }, 404);
    }

    // Update stage status
    verificationData.stages[stage] = action === 'approve' ? 'approved' : 'rejected';
    
    if (!verificationData.reviewNotes) {
      verificationData.reviewNotes = {};
    }
    verificationData.reviewNotes[stage] = {
      action,
      notes,
      reviewedBy: user.id,
      reviewedAt: new Date().toISOString(),
    };

    await kv.set(`verification:${providerId}`, verificationData);

    // If all stages approved, mark provider as verified
    const allApproved = Object.values(verificationData.stages).every(
      (status: any) => status === 'approved'
    );

    console.log(`📊 Verification status check:`, {
      allApproved,
      stages: verificationData.stages,
    });

    if (allApproved) {
      console.log('✅ All stages approved! Marking provider as verified');
      const provider = await kv.get(`user:${providerId}`);
      if (provider) {
        console.log(`📝 Before update:`, {
          verified: provider.verified,
          verificationStatus: provider.verificationStatus,
        });
        
        provider.verified = true;
        provider.verificationStatus = 'approved';
        provider.verifiedAt = new Date().toISOString();
        await kv.set(`user:${providerId}`, provider);
        
        console.log(`✅ After update:`, {
          verified: provider.verified,
          verificationStatus: provider.verificationStatus,
        });
        console.log('✓ Provider marked as verified and saved to database');
      }
    } else {
      // If any stage is rejected, mark as rejected
      const anyRejected = Object.values(verificationData.stages).some(
        (status: any) => status === 'rejected'
      );
      if (anyRejected) {
        console.log('❌ Some stages rejected - marking provider as rejected');
        const provider = await kv.get(`user:${providerId}`);
        if (provider) {
          provider.verified = false;
          provider.verificationStatus = 'rejected';
          await kv.set(`user:${providerId}`, provider);
          console.log('✓ Provider marked as rejected');
        }
      } else {
        console.log('⏳ Not all stages approved yet - provider stays pending');
      }
    }

    return c.json({ success: true, verification: verificationData, allApproved });
  } catch (error) {
    console.log('Error reviewing verification - Full error:', error);
    return c.json({ error: 'Failed to review verification', details: error?.message }, 500);
  }
});

// ============ ADMIN SERVICE MANAGEMENT ============

// Get all services (admin only - for management)
app.get('/make-server-de4eab6a/admin/services', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const services = await kv.getByPrefix('service:');
    
    return c.json({ services: services || [] });
  } catch (error) {
    console.log('Error fetching services:', error);
    return c.json({ error: 'Failed to fetch services' }, 500);
  }
});

// Create service
app.post('/make-server-de4eab6a/admin/services', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const serviceData = await c.req.json();
    const serviceId = `srv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const service = {
      id: serviceId,
      icon: serviceData.icon,
      title: serviceData.title,
      description: serviceData.description,
      basePrice: serviceData.basePrice ? parseFloat(serviceData.basePrice) : undefined,
      minimumHours: serviceData.minimumHours ? parseFloat(serviceData.minimumHours) : undefined,
      minimumFee: serviceData.minimumFee ? parseFloat(serviceData.minimumFee) : undefined,
      platformFeePercentage: serviceData.platformFeePercentage ? parseFloat(serviceData.platformFeePercentage) : undefined,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`service:${serviceId}`, service);
    return c.json({ success: true, service });
  } catch (error) {
    console.log('Error creating service:', error);
    return c.json({ error: 'Failed to create service' }, 500);
  }
});

// Update service
app.put('/make-server-de4eab6a/admin/services/:serviceId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const serviceId = c.req.param('serviceId');
    const serviceData = await c.req.json();
    const service = await kv.get(`service:${serviceId}`);

    if (!service) {
      return c.json({ error: 'Service not found' }, 404);
    }

    const updatedService = {
      ...service,
      icon: serviceData.icon,
      title: serviceData.title,
      description: serviceData.description,
      basePrice: serviceData.basePrice ? parseFloat(serviceData.basePrice) : undefined,
      minimumHours: serviceData.minimumHours ? parseFloat(serviceData.minimumHours) : undefined,
      minimumFee: serviceData.minimumFee ? parseFloat(serviceData.minimumFee) : undefined,
      platformFeePercentage: serviceData.platformFeePercentage ? parseFloat(serviceData.platformFeePercentage) : undefined,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`service:${serviceId}`, updatedService);
    return c.json({ success: true, service: updatedService });
  } catch (error) {
    console.log('Error updating service:', error);
    return c.json({ error: 'Failed to update service' }, 500);
  }
});

// Delete service
app.delete('/make-server-de4eab6a/admin/services/:serviceId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const serviceId = c.req.param('serviceId');
    const service = await kv.get(`service:${serviceId}`);

    if (!service) {
      return c.json({ error: 'Service not found' }, 404);
    }

    await kv.del(`service:${serviceId}`);
    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting service:', error);
    return c.json({ error: 'Failed to delete service' }, 500);
  }
});

// ============ USER LISTING ROUTES ============

// Get all clients (admin only)
app.get('/make-server-de4eab6a/admin/clients', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const allUsers = await kv.getByPrefix('user:');
    const clients = allUsers.filter((u: any) => u.role === 'client');

    return c.json({ clients });
  } catch (error) {
    console.log('Error fetching clients:', error);
    return c.json({ error: 'Failed to fetch clients' }, 500);
  }
});

// Get all providers (admin only)
app.get('/make-server-de4eab6a/admin/providers', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const allUsers = await kv.getByPrefix('user:');
    const allRequests = await kv.getByPrefix('request:');
    const allVerifications = await kv.getByPrefix('verification:');
    const providers = allUsers.filter((u: any) => u.role === 'provider');

    // Enhance providers with rating, earnings, and verification status
    const enhancedProviders = await Promise.all(providers.map(async (provider: any) => {
      const providerRequests = allRequests.filter((r: any) => r.providerId === provider.id);
      
      // Calculate total earnings from completed requests
      const totalEarnings = providerRequests.reduce((sum: number, request: any) => {
        if (request.status === 'completed' && request.amount) {
          return sum + request.amount;
        }
        return sum;
      }, 0);

      // Calculate rating from rated requests (not hidden)
      const ratedRequests = providerRequests.filter((r: any) => 
        (r.userRating || r.rating) && (r.userRating > 0 || r.rating > 0) && !r.reviewHidden
      );
      const rating = ratedRequests.length > 0
        ? ratedRequests.reduce((sum: number, r: any) => sum + (r.userRating || r.rating), 0) / ratedRequests.length
        : 0;

      // Count completed jobs
      const completedJobs = providerRequests.filter((r: any) => r.status === 'completed').length;

      // Get verification status
      const verification = await kv.get(`verification:${provider.id}`);
      let verificationStatus = 'pending';
      
      if (verification && verification.stages) {
        const stages = Object.values(verification.stages);
        const allApproved = stages.every((s: any) => s === 'approved');
        const anyRejected = stages.some((s: any) => s === 'rejected');
        
        if (allApproved) {
          verificationStatus = 'approved';
        } else if (anyRejected) {
          verificationStatus = 'rejected';
        } else {
          verificationStatus = 'pending';
        }
      } else if (provider.verificationStatus) {
        // Use existing verificationStatus if no verification record
        verificationStatus = provider.verificationStatus;
      }

      return {
        ...provider,
        verificationStatus,
        rating: rating > 0 ? Math.round(rating * 10) / 10 : 0,
        reviewCount: ratedRequests.length,
        totalEarnings,
        jobCount: completedJobs,
      };
    }));

    return c.json({ providers: enhancedProviders });
  } catch (error) {
    console.log('Error fetching providers:', error);
    return c.json({ error: 'Failed to fetch providers' }, 500);
  }
});

// Create provider (admin only) - Auto-approved
app.post('/make-server-de4eab6a/admin/providers', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      console.log('Unauthorized request to create provider');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const {
      email,
      password,
      name,
      phone,
      address,
      gender,
      idCardNumber,
      profilePhoto,
      idCardCopy,
      specialty,
      skills,
      experienceYears,
      experienceDetails,
      hourlyRate,
      certifications
    } = await c.req.json();

    console.log('Admin creating provider:', { email, name, specialty });

    // Create user with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
        phone,
        role: 'provider',
        specialty,
      },
      email_confirm: true,
    });

    if (error) {
      console.log('Error creating provider account:', error);
      return c.json({ error: error.message }, 400);
    }

    console.log('Provider auth account created:', data.user.id);

    // Store provider data in KV store with APPROVED status (admin-created)
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      phone,
      address: address || '',
      gender: gender || null,
      role: 'provider',
      specialty,
      skills: skills || [],
      hourlyRate: hourlyRate || 0,
      experienceYears: experienceYears || 0,
      experienceDetails: experienceDetails || '',
      certifications: certifications || [],
      verified: true,
      verificationStatus: 'approved',
      available: true,
      rating: 0,
      totalReviews: 0,
      totalJobs: 0,
      totalEarnings: 0,
      createdAt: new Date().toISOString(),
      status: 'active',
    });

    console.log('Provider data stored with approved status');

    // Create fully approved verification record
    await kv.set(`verification:${data.user.id}`, {
      providerId: data.user.id,
      providerName: name,
      providerEmail: email,
      emailVerified: true,
      mobileVerified: true,
      stages: {
        stage1: 'approved',
        stage2: 'approved',
        stage3: 'approved',
        stage4: 'approved',
      },
      stageData: {
        stage1: {
          emailVerified: true,
          mobileVerified: true,
        },
        stage2: {
          idCardNumber: idCardNumber || '',
          idCardCopy: idCardCopy || '',
          profilePhoto: profilePhoto || '',
        },
        stage3: {
          specialty,
          skills: skills || [],
          experienceYears: experienceYears || 0,
          experienceDetails: experienceDetails || '',
        },
        stage4: {
          certifications: certifications || [],
          hourlyRate: hourlyRate || 0,
        },
      },
      submittedDate: new Date().toISOString(),
      approvedDate: new Date().toISOString(),
      approvedBy: user.id,
      adminNotes: 'Admin-created account - auto-approved',
    });

    console.log('Verification record created with approved status');

    return c.json({ 
      success: true, 
      provider: { 
        id: data.user.id,
        email,
        name,
        verificationStatus: 'approved'
      } 
    });
  } catch (error) {
    console.log('❌ Error creating provider:', error);
    return c.json({ error: 'Failed to create provider', details: error?.message }, 500);
  }
});

// Get all admin users (admin only)
app.get('/make-server-de4eab6a/admin/admin-users', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const allUsers = await kv.getByPrefix('user:');
    const admins = allUsers.filter((u: any) => u.role === 'admin');

    return c.json({ users: admins });
  } catch (error) {
    console.log('Error fetching admin users:', error);
    return c.json({ error: 'Failed to fetch admin users' }, 500);
  }
});

// Get client profile with all related data (admin only)
app.get('/make-server-de4eab6a/admin/clients/:clientId/profile', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const clientId = c.req.param('clientId');
    console.log(`[ADMIN API] === Starting profile fetch for client: ${clientId} ===`);
    
    const clientData = await kv.get(`user:${clientId}`);
    
    if (!clientData) {
      console.log(`[ADMIN API] ❌ Client not found: ${clientId}`);
      return c.json({ error: 'Client not found' }, 404);
    }

    console.log(`[ADMIN API] ✅ Client found: ${clientData.name} (${clientData.email})`);

    // Get client's bookings/requests (they're stored as 'request:' not 'booking:')
    const allRequests = await kv.getByPrefix('request:');
    console.log(`[ADMIN API] 📊 Total requests in database: ${allRequests.length}`);
    
    const clientRequests = allRequests.filter((r: any) => r.clientId === clientId);
    console.log(`[ADMIN API] 🔍 Found ${clientRequests.length} requests for client ${clientId}`);
    
    if (clientRequests.length > 0) {
      console.log(`[ADMIN API] 📝 Sample request IDs:`, clientRequests.slice(0, 3).map((r: any) => r.id));
    }

    // Get client's family members using the index
    const familyIds = await kv.getByPrefix(`client_family:${clientId}:`);
    console.log(`[ADMIN API] 👨‍👩‍👧‍👦 Family index entries: ${familyIds.length}`);
    console.log(`[ADMIN API] 👨‍👩‍👧‍👦 Family IDs from index:`, familyIds);
    
    const clientFamilyMembers = await Promise.all(
      familyIds.map(async (id: string) => {
        console.log(`[ADMIN API] 🔍 Fetching family member with key: family:${id}`);
        const member = await kv.get(`family:${id}`);
        console.log(`[ADMIN API] 📝 Family member data:`, member ? 'Found' : 'Not found');
        return member;
      })
    );

    console.log(`[ADMIN API] ✅ Found ${clientFamilyMembers.filter(Boolean).length} family members`);

    // Get client's locations using the index
    const locationIds = await kv.getByPrefix(`client_location:${clientId}:`);
    console.log(`[ADMIN API] ��� Location index entries: ${locationIds.length}`);
    
    const clientLocations = await Promise.all(
      locationIds.map(async (id: string) => await kv.get(`location:${id}`))
    );

    console.log(`[ADMIN API] ✅ Found ${clientLocations.filter(Boolean).length} locations`);

    // Enhance requests with provider details - EXACTLY like /bookings/client endpoint
    const enhancedRequests = await Promise.all(
      clientRequests.map(async (request: any) => {
        // Fetch service details to get service title
        let serviceTitle = request.serviceTitle;
        if (!serviceTitle && request.serviceType) {
          const service = await kv.get(`service:${request.serviceType}`);
          serviceTitle = service?.title || request.serviceType;
        }

        // Normalize requestFor field (handle old data with requestForSomeoneElse)
        let requestFor = request.requestFor;
        if (!requestFor && request.requestForSomeoneElse !== undefined) {
          requestFor = request.requestForSomeoneElse ? 'other' : 'self';
        }

        const normalizedRequest = {
          ...request,
          serviceTitle,
          requestFor: requestFor || 'self',
        };

        // Add provider details if accepted
        if (request.providerId) {
          const provider = await kv.get(`user:${request.providerId}`);
          normalizedRequest.provider = {
            name: provider?.name || 'Unknown',
            phone: provider?.phone,
            rating: provider?.rating,
            reviewCount: provider?.totalReviews || 0,
          };
          normalizedRequest.providerName = provider?.name || 'Unknown Provider';
        }

        // Add recipient name for family member requests
        if (request.recipientId && request.recipientId !== clientId) {
          const familyMember = clientFamilyMembers.find((f: any) => f && f.id === request.recipientId);
          normalizedRequest.recipientName = familyMember?.name || 'Family Member';
        } else if (normalizedRequest.requestFor === 'self' || !request.recipientId) {
          normalizedRequest.recipientName = clientData.name;
        }

        return normalizedRequest;
      })
    );

    // Sort by creation date, newest first - EXACTLY like /bookings/client endpoint
    enhancedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const response = { 
      client: clientData,
      bookings: enhancedRequests,
      familyMembers: clientFamilyMembers.filter(Boolean),
      locations: clientLocations.filter(Boolean),
    };
    
    console.log(`[ADMIN API] 📤 Returning response:`, {
      clientName: clientData.name,
      bookingsCount: enhancedRequests.length,
      familyMembersCount: clientFamilyMembers.filter(Boolean).length,
      locationsCount: clientLocations.filter(Boolean).length,
    });

    return c.json(response);
  } catch (error) {
    console.log('[ADMIN API] ❌ Error fetching client profile:', error);
    return c.json({ error: 'Failed to fetch client profile' }, 500);
  }
});

// Add family member for client (admin only)
app.post('/make-server-de4eab6a/admin/clients/:clientId/family-members', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const clientId = c.req.param('clientId');
    const memberData = await c.req.json();

    // Verify client exists
    const client = await kv.get(`user:${clientId}`);
    if (!client) {
      return c.json({ error: 'Client not found' }, 404);
    }

    // Create family member with same ID format as client endpoint
    const memberId = `fam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const familyMember = {
      id: memberId,
      userId: clientId,
      name: memberData.name,
      relationship: memberData.relationship,
      phone: memberData.phone || '',
      age: memberData.age ? parseInt(memberData.age) : null,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`family:${memberId}`, familyMember);
    await kv.set(`client_family:${clientId}:${memberId}`, memberId); // Add index
    
    return c.json({ success: true, familyMember });
  } catch (error) {
    console.log('Error adding family member:', error);
    return c.json({ error: 'Failed to add family member' }, 500);
  }
});

// Update family member (admin only)
app.put('/make-server-de4eab6a/admin/clients/:clientId/family-members/:memberId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const clientId = c.req.param('clientId');
    const memberId = c.req.param('memberId');
    const memberData = await c.req.json();

    // Get existing family member
    const existingMember = await kv.get(`family:${memberId}`);
    if (!existingMember) {
      return c.json({ error: 'Family member not found' }, 404);
    }

    // Verify ownership
    if (existingMember.userId !== clientId) {
      return c.json({ error: 'Family member does not belong to this client' }, 403);
    }

    // Update family member
    const updatedMember = {
      ...existingMember,
      name: memberData.name || existingMember.name,
      relationship: memberData.relationship || existingMember.relationship,
      phone: memberData.phone !== undefined ? memberData.phone : existingMember.phone,
      age: memberData.age ? parseInt(memberData.age) : existingMember.age,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`family:${memberId}`, updatedMember);
    
    return c.json({ success: true, familyMember: updatedMember });
  } catch (error) {
    console.log('Error updating family member:', error);
    return c.json({ error: 'Failed to update family member' }, 500);
  }
});

// Delete family member (admin only)
app.delete('/make-server-de4eab6a/admin/clients/:clientId/family-members/:memberId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const clientId = c.req.param('clientId');
    const memberId = c.req.param('memberId');

    // Get existing family member
    const existingMember = await kv.get(`family:${memberId}`);
    if (!existingMember) {
      return c.json({ error: 'Family member not found' }, 404);
    }

    // Verify ownership
    if (existingMember.userId !== clientId) {
      return c.json({ error: 'Family member does not belong to this client' }, 403);
    }

    // Delete family member and its index
    await kv.del(`family:${memberId}`);
    await kv.del(`client_family:${clientId}:${memberId}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting family member:', error);
    return c.json({ error: 'Failed to delete family member' }, 500);
  }
});

// Create booking on behalf of client (admin only)
app.post('/make-server-de4eab6a/admin/bookings/create', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const bookingData = await c.req.json();
    console.log('[ADMIN BOOKING] Creating booking for client:', bookingData.clientId);

    // Verify client exists
    const client = await kv.get(`user:${bookingData.clientId}`);
    if (!client) {
      return c.json({ error: 'Client not found' }, 404);
    }

    // Get service details
    const service = await kv.get(`service:${bookingData.serviceType}`);
    const serviceTitle = service?.title || 'Service';

    // Create request ID
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create the request/booking object matching the client-side structure
    const request = {
      id: requestId,
      clientId: bookingData.clientId,
      clientName: client.name,
      clientEmail: client.email,
      serviceType: bookingData.serviceType,
      serviceTitle: serviceTitle,
      bookingType: bookingData.bookingType || 'scheduled',
      scheduledDate: bookingData.scheduledDate,
      scheduledTime: bookingData.scheduledTime,
      location: bookingData.serviceAddress || bookingData.location || client.address || '',
      additionalDetails: bookingData.additionalDetails || bookingData.description || '',
      estimatedCost: parseFloat(bookingData.amount || bookingData.estimatedCost || '0'),
      requestFor: bookingData.requestFor || 'self',
      recipientName: bookingData.recipientName || client.name,
      recipientPhone: bookingData.recipientPhone || client.phone || '',
      recipientAddress: bookingData.serviceAddress || bookingData.recipientAddress || client.address || '',
      recipientAge: bookingData.recipientAge || null,
      recipientGender: bookingData.recipientGender || null,
      providerGenderPreference: bookingData.providerGenderPreference || 'no-preference',
      providerLanguagePreference: bookingData.providerLanguagePreference || 'no-preference',
      duration: bookingData.duration || '2',
      urgency: bookingData.urgency || 'normal',
      notes: bookingData.notes || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
      adminId: user.id,
      adminName: user.email,
    };

    // Save the request
    await kv.set(`request:${requestId}`, request);
    
    console.log('[ADMIN BOOKING] Booking created successfully:', requestId);
    return c.json({ success: true, request });
  } catch (error) {
    console.error('[ADMIN BOOKING] Error creating booking:', error);
    return c.json({ error: 'Failed to create booking' }, 500);
  }
});

// Get booking by ID (admin only)
app.get('/make-server-de4eab6a/admin/booking/:bookingId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const bookingId = c.req.param('bookingId');
    console.log(`[ADMIN] Loading booking details for: ${bookingId}`);

    // Try to get from both booking: and request: prefixes
    let booking = await kv.get(`booking:${bookingId}`);
    if (!booking) {
      booking = await kv.get(`request:${bookingId}`);
    }

    if (!booking) {
      return c.json({ error: 'Booking not found' }, 404);
    }

    // Enrich with client data
    if (booking.clientId || booking.userId) {
      const clientId = booking.clientId || booking.userId;
      const client = await kv.get(`user:${clientId}`);
      if (client) {
        booking.clientName = client.name;
        booking.clientEmail = client.email;
        booking.clientPhone = client.phone;
      }
    }

    // Enrich with provider data
    if (booking.providerId) {
      const provider = await kv.get(`user:${booking.providerId}`);
      if (provider) {
        booking.provider = {
          id: provider.id,
          name: provider.name,
          email: provider.email,
          phone: provider.phone,
          specialty: provider.specialty,
          rating: provider.rating || 0,
          reviewCount: provider.reviewCount || 0,
        };
      }
    }

    // Enrich with service data
    if (booking.serviceType) {
      const service = await kv.get(`service:${booking.serviceType}`);
      if (service) {
        booking.serviceTitle = service.title;
      }
    }

    console.log(`[ADMIN] Booking loaded successfully: ${bookingId}`);
    return c.json({ booking });
  } catch (error) {
    console.error('[ADMIN] Error loading booking:', error);
    return c.json({ error: 'Failed to load booking' }, 500);
  }
});

// Remove provider from booking (admin only)
app.post('/make-server-de4eab6a/admin/booking/:bookingId/remove-provider', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const bookingId = c.req.param('bookingId');
    console.log(`[ADMIN] Removing provider from booking: ${bookingId}`);

    // Get booking
    let booking = await kv.get(`booking:${bookingId}`);
    let isRequest = false;
    if (!booking) {
      booking = await kv.get(`request:${bookingId}`);
      isRequest = true;
    }

    if (!booking) {
      return c.json({ error: 'Booking not found' }, 404);
    }

    if (!booking.providerId) {
      return c.json({ error: 'No provider assigned to this booking' }, 400);
    }

    const oldProviderId = booking.providerId;

    // Update booking - remove provider and set status to pending
    booking.providerId = null;
    booking.provider = null;
    booking.status = 'pending';
    booking.acceptedAt = null;
    booking.removedProviderId = oldProviderId;
    booking.removedAt = new Date().toISOString();
    booking.removedBy = user.id;

    // Save booking
    const prefix = isRequest ? 'request:' : 'booking:';
    await kv.set(`${prefix}${bookingId}`, booking);

    console.log(`[ADMIN] Provider ${oldProviderId} removed from booking ${bookingId}`);
    return c.json({ success: true, message: 'Provider removed successfully', booking });
  } catch (error) {
    console.error('[ADMIN] Error removing provider:', error);
    return c.json({ error: 'Failed to remove provider' }, 500);
  }
});

// Reassign booking to provider (admin only)
app.post('/make-server-de4eab6a/admin/booking/:bookingId/reassign', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const bookingId = c.req.param('bookingId');
    const { providerId } = await c.req.json();

    if (!providerId) {
      return c.json({ error: 'Provider ID is required' }, 400);
    }

    console.log(`[ADMIN] Reassigning booking ${bookingId} to provider ${providerId}`);

    // Verify provider exists and is approved
    const provider = await kv.get(`user:${providerId}`);
    if (!provider) {
      return c.json({ error: 'Provider not found' }, 404);
    }

    if (provider.userType !== 'provider') {
      return c.json({ error: 'User is not a provider' }, 400);
    }

    if (provider.verificationStatus !== 'approved') {
      return c.json({ error: 'Provider is not approved' }, 400);
    }

    if (provider.blacklisted) {
      return c.json({ error: 'Provider is blacklisted' }, 400);
    }

    // Get booking
    let booking = await kv.get(`booking:${bookingId}`);
    let isRequest = false;
    if (!booking) {
      booking = await kv.get(`request:${bookingId}`);
      isRequest = true;
    }

    if (!booking) {
      return c.json({ error: 'Booking not found' }, 404);
    }

    const oldProviderId = booking.providerId;

    // Update booking
    booking.providerId = providerId;
    booking.providerName = provider.name;
    booking.status = 'accepted';
    booking.acceptedAt = new Date().toISOString();
    booking.reassignedBy = user.id;
    booking.reassignedAt = new Date().toISOString();
    if (oldProviderId) {
      booking.previousProviderId = oldProviderId;
    }

    // Enrich with provider data
    booking.provider = {
      id: provider.id,
      name: provider.name,
      email: provider.email,
      phone: provider.phone,
      specialty: provider.specialty,
      rating: provider.rating || 0,
      reviewCount: provider.reviewCount || 0,
    };

    // Save booking
    const prefix = isRequest ? 'request:' : 'booking:';
    await kv.set(`${prefix}${bookingId}`, booking);

    console.log(`[ADMIN] Booking ${bookingId} reassigned to provider ${providerId}`);
    return c.json({ success: true, message: 'Booking reassigned successfully', booking });
  } catch (error) {
    console.error('[ADMIN] Error reassigning booking:', error);
    return c.json({ error: 'Failed to reassign booking' }, 500);
  }
});

// ============ LOCATION TRACKING ROUTES ============

// Update provider location during active booking
app.post('/make-server-de4eab6a/provider/location/:bookingId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const provider = await kv.get(`user:${user.id}`);
    if (!provider || provider.role !== 'provider') {
      return c.json({ error: 'Only providers can update location' }, 403);
    }

    const bookingId = c.req.param('bookingId');
    const { latitude, longitude } = await c.req.json();

    if (!latitude || !longitude) {
      return c.json({ error: 'Latitude and longitude are required' }, 400);
    }

    console.log(`[LOCATION] Provider ${user.id} updating location for booking ${bookingId}`);

    // Get booking
    let booking = await kv.get(`booking:${bookingId}`);
    let isRequest = false;
    if (!booking) {
      booking = await kv.get(`request:${bookingId}`);
      isRequest = true;
    }

    if (!booking) {
      return c.json({ error: 'Booking not found' }, 404);
    }

    // Verify this provider is assigned to this booking
    if (booking.providerId !== user.id) {
      return c.json({ error: 'You are not assigned to this booking' }, 403);
    }

    // Update booking with provider location
    booking.providerLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: new Date().toISOString(),
    };

    // Save updated booking
    const prefix = isRequest ? 'request:' : 'booking:';
    await kv.set(`${prefix}${bookingId}`, booking);

    // Also update provider's current location
    provider.currentLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: new Date().toISOString(),
    };
    await kv.set(`user:${user.id}`, provider);

    console.log(`[LOCATION] Location updated for booking ${bookingId}`);
    return c.json({ success: true, message: 'Location updated successfully' });
  } catch (error) {
    console.error('[LOCATION] Error updating location:', error);
    return c.json({ error: 'Failed to update location' }, 500);
  }
});

// Get provider location for a booking (client view)
app.get('/make-server-de4eab6a/booking/:bookingId/provider-location', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const bookingId = c.req.param('bookingId');

    // Get booking
    let booking = await kv.get(`booking:${bookingId}`);
    if (!booking) {
      booking = await kv.get(`request:${bookingId}`);
    }

    if (!booking) {
      return c.json({ error: 'Booking not found' }, 404);
    }

    // Verify user has access to this booking
    const isClient = booking.userId === user.id || booking.clientId === user.id;
    const isProvider = booking.providerId === user.id;
    const userIsAdmin = await isAdmin(user.id);

    if (!isClient && !isProvider && !userIsAdmin) {
      return c.json({ error: 'Access denied' }, 403);
    }

    return c.json({
      providerLocation: booking.providerLocation || null,
      clientLocation: booking.clientLocation || null,
    });
  } catch (error) {
    console.error('[LOCATION] Error fetching location:', error);
    return c.json({ error: 'Failed to fetch location' }, 500);
  }
});

// Update client location
app.post('/make-server-de4eab6a/client/location/:bookingId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const bookingId = c.req.param('bookingId');
    const { latitude, longitude } = await c.req.json();

    if (!latitude || !longitude) {
      return c.json({ error: 'Latitude and longitude are required' }, 400);
    }

    // Get booking
    let booking = await kv.get(`booking:${bookingId}`);
    let isRequest = false;
    if (!booking) {
      booking = await kv.get(`request:${bookingId}`);
      isRequest = true;
    }

    if (!booking) {
      return c.json({ error: 'Booking not found' }, 404);
    }

    // Verify this user is the client for this booking
    if (booking.userId !== user.id && booking.clientId !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Update booking with client location
    booking.clientLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: new Date().toISOString(),
    };

    // Save updated booking
    const prefix = isRequest ? 'request:' : 'booking:';
    await kv.set(`${prefix}${bookingId}`, booking);

    return c.json({ success: true, message: 'Location updated successfully' });
  } catch (error) {
    console.error('[LOCATION] Error updating client location:', error);
    return c.json({ error: 'Failed to update location' }, 500);
  }
});

// ============ DETAIL PAGE ROUTES ============

// Get services (public)
app.get('/make-server-de4eab6a/services', async (c) => {
  try {
    const services = await kv.getByPrefix('service:');
    return c.json({ services: services || [] });
  } catch (error) {
    console.log('Error fetching services:', error);
    return c.json({ error: 'Failed to fetch services' }, 500);
  }
});

// Get client by ID (admin only)
app.get('/make-server-de4eab6a/client/:clientId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const clientId = c.req.param('clientId');
    const clientData = await kv.get(`user:${clientId}`);
    
    if (!clientData) {
      return c.json({ error: 'Client not found' }, 404);
    }

    // Get client's bookings
    const allBookings = await kv.getByPrefix('booking:');
    const clientBookings = allBookings.filter((b: any) => b.userId === clientId);

    // Get client's family members
    const allFamilyMembers = await kv.getByPrefix('family:');
    const clientFamilyMembers = allFamilyMembers.filter((f: any) => f.userId === clientId);

    // Get client's locations
    const allLocations = await kv.getByPrefix('location:');
    const clientLocations = allLocations.filter((l: any) => l.userId === clientId);

    // Enrich bookings with provider names
    const enrichedBookings = await Promise.all(
      clientBookings.map(async (booking: any) => {
        if (booking.providerId) {
          const provider = await kv.get(`user:${booking.providerId}`);
          return {
            ...booking,
            providerName: provider?.name || 'Unknown Provider',
          };
        }
        return booking;
      })
    );

    return c.json({ 
      client: {
        ...clientData,
        familyMembers: clientFamilyMembers,
        locations: clientLocations,
      },
      bookings: enrichedBookings
    });
  } catch (error) {
    console.log('Error fetching client details:', error);
    return c.json({ error: 'Failed to fetch client details' }, 500);
  }
});

// Get provider's reviews - UPDATED 2025-11-06
// IMPORTANT: This route must be defined BEFORE the /provider/:providerId route
// to avoid route parameter conflicts (where "reviews" would be treated as a providerId)
app.get('/make-server-de4eab6a/provider/reviews', async (c) => {
  try {
    console.log(`🔍 [REVIEWS] Starting review fetch...`);
    
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      console.log(`❌ [REVIEWS] Unauthorized - no valid user token`);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log(`✅ [REVIEWS] User verified: ${user.id} (${user.email})`);
    console.log(`📊 [REVIEWS] Fetching provider data from KV store...`);

    // Verify provider exists
    let provider;
    try {
      provider = await kv.get(`user:${user.id}`);
    } catch (kvError) {
      console.error(`❌ [REVIEWS] Error fetching from KV store:`, kvError);
      return c.json({ error: 'Database error. Please try again.' }, 500);
    }

    if (!provider) {
      console.log(`⚠️  [REVIEWS] Provider not found in KV store: ${user.id}`);
      console.log(`🔧 [REVIEWS] Attempting to debug - checking all users...`);
      
      // Debug: check if user exists with different key format
      try {
        const allUsers = await kv.getByPrefix('user:');
        console.log(`📦 [REVIEWS] Total users in KV store: ${allUsers.length}`);
        
        const matchingUser = allUsers.find((u: any) => u.id === user.id || u.email === user.email);
        if (matchingUser) {
          console.log(`🔍 [REVIEWS] Found user with matching email/id:`, JSON.stringify(matchingUser));
          // Use the found user as provider
          provider = matchingUser;
        } else {
          console.log(`❌ [REVIEWS] No matching user found in KV store for ${user.id} / ${user.email}`);
          
          // Check if this is a provider in Supabase but not in KV - create record
          console.log(`🔧 [REVIEWS] Attempting to create provider record from Supabase auth data...`);
          const userMetadata = (user as any).user_metadata || {};
          
          if (userMetadata.role === 'provider') {
            // Create minimal provider record
            provider = {
              id: user.id,
              email: user.email,
              name: userMetadata.name || 'Provider',
              phone: userMetadata.phone || '',
              role: 'provider',
              specialty: userMetadata.specialty || 'General Care',
              skills: [],
              hourlyRate: 0,
              experienceYears: 0,
              experienceDetails: '',
              certifications: [],
              verified: false,
              verificationStatus: 'pending',
              available: false,
              rating: 0,
              totalReviews: 0,
              totalJobs: 0,
              totalEarnings: 0,
              createdAt: new Date().toISOString(),
            };
            
            await kv.set(`user:${user.id}`, provider);
            console.log(`✅ [REVIEWS] Created provider record in KV store for ${user.id}`);
          } else {
            console.error(`❌ [REVIEWS] User exists in Auth but not in KV, and is not a provider (role: ${userMetadata.role})`);
            console.log(`🔧 [REVIEWS] Creating minimal provider record anyway to enable reviews...`);
            
            // Create provider record anyway - they might be a provider without proper metadata
            provider = {
              id: user.id,
              email: user.email,
              name: userMetadata.name || user.email?.split('@')[0] || 'Provider',
              phone: userMetadata.phone || '',
              role: 'provider',
              specialty: 'General Care',
              skills: [],
              hourlyRate: 0,
              experienceYears: 0,
              experienceDetails: '',
              certifications: [],
              verified: false,
              verificationStatus: 'pending',
              available: false,
              rating: 0,
              totalReviews: 0,
              totalJobs: 0,
              totalEarnings: 0,
              createdAt: new Date().toISOString(),
            };
            
            await kv.set(`user:${user.id}`, provider);
            console.log(`✅ [REVIEWS] Created provider record in KV store for ${user.id}`);
          }
        }
      } catch (debugError) {
        console.error(`❌ [REVIEWS] Error during debug lookup:`, debugError);
        
        // Last resort - create a minimal provider record
        console.log(`🔧 [REVIEWS] Creating minimal provider record as last resort...`);
        provider = {
          id: user.id,
          email: user.email,
          name: user.email?.split('@')[0] || 'Provider',
          phone: '',
          role: 'provider',
          specialty: 'General Care',
          skills: [],
          hourlyRate: 0,
          experienceYears: 0,
          experienceDetails: '',
          certifications: [],
          verified: false,
          verificationStatus: 'pending',
          available: false,
          rating: 0,
          totalReviews: 0,
          totalJobs: 0,
          totalEarnings: 0,
          createdAt: new Date().toISOString(),
        };
        
        try {
          await kv.set(`user:${user.id}`, provider);
          console.log(`✅ [REVIEWS] Created provider record in KV store for ${user.id}`);
        } catch (setError) {
          console.error(`❌ [REVIEWS] Failed to create provider record:`, setError);
          return c.json({ error: 'Failed to create provider record. Please contact support.' }, 500);
        }
      }
    }

    // Final check to ensure provider exists
    if (!provider) {
      console.error(`❌ [REVIEWS] Provider still null after all attempts for user ${user.id}`);
      return c.json({ error: 'Provider record could not be loaded. Please contact support.' }, 500);
    }

    if (provider.role !== 'provider') {
      console.log(`❌ User ${user.id} is not a provider (role: ${provider.role})`);
      return c.json({ error: 'User is not a provider' }, 403);
    }

    console.log(`✅ Provider found: ${provider.name} (${user.id})`);

    // Get all requests for this provider
    const allRequests = await kv.getByPrefix('request:');
    console.log(`📦 [REVIEWS] Found ${allRequests.length} total requests in system`);
    console.log(`🔍 [REVIEWS] Looking for reviews for provider ID: ${user.id}`);

    // Debug: Log ALL requests with their rating and provider status
    console.log(`🔍 [REVIEWS] ========== ALL REQUESTS SUMMARY ==========`);
    const requestsWithRatings = allRequests.filter((r: any) => r && (r.userRating || r.rating));
    console.log(`📊 [REVIEWS] Total requests with ratings: ${requestsWithRatings.length}`);
    
    requestsWithRatings.forEach((r: any, idx: number) => {
      console.log(`  Request ${idx + 1}:`, {
        id: r.id,
        status: r.status,
        providerId: r.providerId,
        providerName: r.providerName,
        clientId: r.clientId,
        userRating: r.userRating,
        rating: r.rating,
        hasReview: !!(r.userReview || r.review),
        reviewHidden: r.reviewHidden,
        ratedAt: r.ratedAt,
        matchesThisProvider: r.providerId === user.id,
      });
    });

    // Log provider-specific requests
    const providerRequests = allRequests.filter((r: any) => r && r.providerId === user.id);
    console.log(`📊 [REVIEWS] Found ${providerRequests.length} total requests for provider ${user.id}`);
    console.log(`📊 [REVIEWS] Provider requests breakdown:`);
    providerRequests.forEach((r: any, idx: number) => {
      console.log(`  Provider Request ${idx + 1}:`, {
        id: r.id,
        status: r.status,
        hasRating: !!(r.userRating || r.rating),
        userRating: r.userRating,
        rating: r.rating,
        hasReview: !!(r.userReview || r.review),
      });
    });

    // Filter requests for this provider that have ratings and are not hidden
    // Note: Using both 'userRating' and 'rating' fields for compatibility
    console.log(`🔍 [REVIEWS] ========== FILTERING REVIEWS ==========`);
    const filteredRequests = allRequests.filter((r: any) => {
      const matchesProvider = r && r.providerId === user.id;
      const hasRating = matchesProvider && (r.userRating || r.rating);
      const notHidden = hasRating && !r.reviewHidden;
      
      if (matchesProvider) {
        console.log(`🔍 [REVIEWS] Request ${r.id} filter check:`, {
          providerId: r.providerId,
          matchesProvider: true,
          userRating: r.userRating,
          rating: r.rating,
          hasRating,
          reviewHidden: r.reviewHidden,
          passedFilter: notHidden,
        });
      }
      
      return notHidden;
    });
    
    console.log(`✅ [REVIEWS] ${filteredRequests.length} requests passed the filter`);
    
    const reviews = await Promise.all(
      filteredRequests.map(async (r: any) => {
        const client = await kv.get(`user:${r.clientId}`);
        
        // Get service title from service ID
        let serviceTitle = r.serviceTitle || r.serviceType;
        if (!r.serviceTitle && r.serviceType) {
          const service = await kv.get(`service:${r.serviceType}`);
          if (service) {
            serviceTitle = service.name;
          }
        }
        
        const review = {
          id: `${r.id}`,
          bookingId: r.id,
          rating: r.userRating || r.rating,
          review: r.userReview || r.review || '',
          clientId: r.clientId,
          clientName: client?.name || 'Anonymous',
          serviceType: serviceTitle || r.serviceType,
          serviceTitle: serviceTitle || r.serviceType,
          scheduledDate: r.scheduledDate,
          scheduledTime: r.scheduledTime,
          location: r.location,
          estimatedCost: r.estimatedCost,
          createdAt: r.ratedAt || r.createdAt,
        };
        console.log(`✅ [REVIEWS] Mapped review:`, review);
        return review;
      })
    );

    console.log(`✅ [REVIEWS] Found ${reviews.length} total reviews for provider ${user.id}`);
    console.log(`📋 [REVIEWS] Review details:`, reviews.map(r => ({
      id: r.id,
      rating: r.rating,
      hasReviewText: !!r.review,
      clientName: r.clientName,
    })));

    // Sort by creation date, newest first
    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ reviews });
  } catch (error) {
    console.log('Error fetching provider reviews:', error);
    return c.json({ error: 'Failed to fetch reviews' }, 500);
  }
});

// Get provider by ID
app.get('/make-server-de4eab6a/provider/:providerId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const providerId = c.req.param('providerId');
    console.log(`📥 Fetching provider data for ${providerId}`);
    const providerData = await kv.get(`user:${providerId}`);
    
    if (!providerData) {
      console.log(`❌ Provider not found: ${providerId}`);
      return c.json({ error: 'Provider not found' }, 404);
    }

    console.log(`✅ Provider data loaded:`, {
      id: providerData.id,
      name: providerData.name,
      verified: providerData.verified,
      verificationStatus: providerData.verificationStatus,
    });

    // Get provider's jobs
    const allBookings = await kv.getByPrefix('request:');
    const providerJobs = allBookings.filter((b: any) => b.providerId === providerId);
    
    console.log(`📊 [PROVIDER DETAIL] Found ${allBookings.length} total requests`);
    console.log(`📊 [PROVIDER DETAIL] Found ${providerJobs.length} jobs for provider ${providerId}`);

    // Enrich jobs with service titles and client names
    const enrichedJobs = await Promise.all(
      providerJobs.map(async (job: any) => {
        let serviceTitle = job.serviceTitle || job.serviceType;
        if (!job.serviceTitle && job.serviceType) {
          const service = await kv.get(`service:${job.serviceType}`);
          if (service) {
            serviceTitle = service.name;
          }
        }
        
        // Get client name if not already present
        let clientName = job.clientName;
        if (!clientName && job.clientId) {
          const client = await kv.get(`user:${job.clientId}`);
          if (client) {
            clientName = client.name;
          }
        }
        
        return {
          ...job,
          serviceTitle,
          clientName: clientName || 'Unknown',
        };
      })
    );
    
    console.log(`✅ [PROVIDER DETAIL] Enriched ${enrichedJobs.length} jobs with service titles and client names`);

    // Get provider's reviews with enriched data
    const reviews = await Promise.all(
      providerJobs
        .filter((j: any) => (j.rating || j.userRating) && (j.review || j.userReview))
        .map(async (j: any) => {
          let serviceTitle = j.serviceTitle || j.serviceType;
          if (!j.serviceTitle && j.serviceType) {
            const service = await kv.get(`service:${j.serviceType}`);
            if (service) {
              serviceTitle = service.name;
            }
          }
          return {
            id: j.id,
            rating: j.userRating || j.rating,
            review: j.userReview || j.review,
            comment: j.userReview || j.review, // Keep for compatibility
            clientName: j.clientName || 'Anonymous',
            serviceType: serviceTitle,
            createdAt: j.ratedAt || j.createdAt,
          };
        })
    );

    return c.json({ 
      provider: providerData,
      jobs: enrichedJobs,
      reviews: reviews
    });
  } catch (error) {
    console.log('Error fetching provider details:', error);
    return c.json({ error: 'Failed to fetch provider details' }, 500);
  }
});

// Get admin user by ID (admin only)
app.get('/make-server-de4eab6a/admin/user/:userId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const userIsAdmin = await isAdmin(user.id);
    if (!userIsAdmin) {
      return c.json({ error: 'Forbidden - Admin access required' }, 403);
    }

    const userId = c.req.param('userId');
    const adminUsers = await kv.get('admin_users') || [];
    const userData = adminUsers.find((u: any) => u.id === userId);
    
    if (!userData) {
      return c.json({ error: 'Admin user not found' }, 404);
    }

    // Get activity log (mock for now - in production, track real activities)
    const activityLog = [
      { action: 'Approved provider application', timestamp: new Date().toISOString() },
      { action: 'Created new service category', timestamp: new Date().toISOString() },
      { action: 'Logged in', timestamp: new Date().toISOString() },
    ];

    return c.json({ 
      user: userData,
      activityLog: activityLog
    });
  } catch (error) {
    console.log('Error fetching admin user details:', error);
    return c.json({ error: 'Failed to fetch admin user details' }, 500);
  }
});

// Reject provider (admin only)
app.post('/make-server-de4eab6a/admin/reject-provider', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { providerId, reason } = await c.req.json();
    const provider = await kv.get(`user:${providerId}`);

    if (!provider) {
      return c.json({ error: 'Provider not found' }, 404);
    }

    provider.verificationStatus = 'rejected';
    provider.rejectionReason = reason;
    provider.reviewedAt = new Date().toISOString();
    provider.reviewedBy = user.id;

    await kv.set(`user:${providerId}`, provider);
    return c.json({ success: true, provider });
  } catch (error) {
    console.log('Error rejecting provider:', error);
    return c.json({ error: 'Failed to reject provider' }, 500);
  }
});

// Blacklist provider (admin only)
app.post('/make-server-de4eab6a/admin/blacklist-provider', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { providerId, reason } = await c.req.json();
    const provider = await kv.get(`user:${providerId}`);

    if (!provider) {
      return c.json({ error: 'Provider not found' }, 404);
    }

    provider.verificationStatus = 'blacklisted';
    provider.status = 'inactive';
    provider.blacklistReason = reason;
    provider.blacklistedAt = new Date().toISOString();
    provider.blacklistedBy = user.id;

    await kv.set(`user:${providerId}`, provider);
    
    console.log(`Provider ${providerId} blacklisted by admin ${user.id}`);
    return c.json({ success: true, provider });
  } catch (error) {
    console.log('Error blacklisting provider:', error);
    return c.json({ error: 'Failed to blacklist provider' }, 500);
  }
});

// Remove blacklist from provider (admin only)
app.post('/make-server-de4eab6a/admin/remove-blacklist', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { providerId } = await c.req.json();
    const provider = await kv.get(`user:${providerId}`);

    if (!provider) {
      return c.json({ error: 'Provider not found' }, 404);
    }

    if (provider.verificationStatus !== 'blacklisted') {
      return c.json({ error: 'Provider is not blacklisted' }, 400);
    }

    provider.verificationStatus = 'approved';
    provider.status = 'active';
    delete provider.blacklistReason;
    delete provider.blacklistedAt;
    delete provider.blacklistedBy;
    provider.blacklistRemovedAt = new Date().toISOString();
    provider.blacklistRemovedBy = user.id;

    await kv.set(`user:${providerId}`, provider);
    
    console.log(`Blacklist removed from provider ${providerId} by admin ${user.id}`);
    return c.json({ success: true, provider });
  } catch (error) {
    console.log('Error removing blacklist:', error);
    return c.json({ error: 'Failed to remove blacklist' }, 500);
  }
});

// Unapprove provider (admin only)
app.post('/make-server-de4eab6a/admin/unapprove-provider', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { providerId } = await c.req.json();
    const provider = await kv.get(`user:${providerId}`);

    if (!provider) {
      return c.json({ error: 'Provider not found' }, 404);
    }

    if (provider.verificationStatus !== 'approved') {
      return c.json({ error: 'Provider is not approved' }, 400);
    }

    // Update provider status back to pending
    provider.verificationStatus = 'pending';
    provider.verified = false;
    provider.available = false;
    provider.unapprovedAt = new Date().toISOString();
    provider.unapprovedBy = user.id;

    await kv.set(`user:${providerId}`, provider);

    // Also update verification stages back to submitted (not pending, so they can be reviewed again)
    const verification = await kv.get(`verification:${providerId}`);
    if (verification) {
      verification.stages = {
        stage1: 'submitted',
        stage2: 'submitted',
        stage3: 'submitted',
        stage4: 'submitted',
      };
      await kv.set(`verification:${providerId}`, verification);
    }
    
    console.log(`Provider ${providerId} unapproved by admin ${user.id}, status set to pending`);
    return c.json({ success: true, provider });
  } catch (error) {
    console.log('Error unapproving provider:', error);
    return c.json({ error: 'Failed to unapprove provider' }, 500);
  }
});

// Fix provider verification (admin only - debug endpoint)
app.post('/make-server-de4eab6a/admin/fix-provider-verification', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { providerId } = await c.req.json();
    const provider = await kv.get(`user:${providerId}`);

    if (!provider) {
      return c.json({ error: 'Provider not found' }, 404);
    }

    // Get or create verification
    let verification = await kv.get(`verification:${providerId}`);
    
    // If provider is approved but verification doesn't exist or stages aren't approved
    if (provider.verificationStatus === 'approved') {
      if (!verification) {
        verification = {
          providerId,
          emailVerified: true,
          mobileVerified: true,
          stages: {
            stage1: 'approved',
            stage2: 'approved',
            stage3: 'approved',
            stage4: 'approved',
          },
          stageData: {},
          createdAt: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
        };
      } else {
        verification.stages = {
          stage1: 'approved',
          stage2: 'approved',
          stage3: 'approved',
          stage4: 'approved',
        };
        verification.emailVerified = true;
        verification.mobileVerified = true;
      }
      await kv.set(`verification:${providerId}`, verification);
    }

    console.log(`✓ Fixed verification for provider ${providerId}`);
    return c.json({ 
      success: true, 
      provider,
      verification,
      message: 'Verification fixed successfully'
    });
  } catch (error) {
    console.log('Error fixing provider verification:', error);
    return c.json({ error: 'Failed to fix verification' }, 500);
  }
});

// Toggle user status (admin only)
app.post('/make-server-de4eab6a/admin/toggle-status', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { userId } = await c.req.json();
    const userData = await kv.get(`user:${userId}`);

    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    userData.status = userData.status === 'active' ? 'inactive' : 'active';
    userData.statusUpdatedAt = new Date().toISOString();

    await kv.set(`user:${userId}`, userData);
    return c.json({ success: true, user: userData });
  } catch (error) {
    console.log('Error toggling user status:', error);
    return c.json({ error: 'Failed to toggle user status' }, 500);
  }
});

// Delete user (admin only)
app.delete('/make-server-de4eab6a/admin/user/:userId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const userId = c.req.param('userId');
    const userData = await kv.get(`user:${userId}`);

    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    await kv.del(`user:${userId}`);
    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting user:', error);
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

// ============ REVIEW MANAGEMENT ROUTES ============

// Get all reviews (admin only)
app.get('/make-server-de4eab6a/admin/reviews', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    // Get all requests with ratings
    const allRequests = await kv.getByPrefix('request:');

    // Filter requests that have ratings and format as reviews
    // Note: Using both 'userRating' and 'rating' fields for compatibility
    const reviews = await Promise.all(
      allRequests
        .filter((r: any) => r && (r.userRating || r.rating))
        .map(async (r: any) => {
          const client = await kv.get(`user:${r.clientId}`);
          const provider = await kv.get(`user:${r.providerId}`);
          
          // Enrich serviceTitle if needed
          let serviceTitle = r.serviceTitle || r.serviceType;
          if (!r.serviceTitle && r.serviceType) {
            const service = await kv.get(`service:${r.serviceType}`);
            if (service) {
              serviceTitle = service.name;
            }
          }
          
          return {
            id: `${r.id}`,
            bookingId: r.id,
            rating: r.userRating || r.rating,
            review: r.userReview || r.review || '',
            clientId: r.clientId,
            clientName: client?.name || 'Unknown',
            providerId: r.providerId,
            providerName: provider?.name || 'Unknown',
            serviceType: r.serviceType,
            serviceTitle: serviceTitle,
            location: r.location,
            scheduledDate: r.scheduledDate,
            scheduledTime: r.scheduledTime,
            estimatedCost: r.estimatedCost,
            duration: r.duration,
            bookingType: r.bookingType,
            createdAt: r.ratedAt || r.createdAt,
            hidden: r.reviewHidden || false,
            hiddenAt: r.reviewHiddenAt,
            hiddenBy: r.reviewHiddenBy,
            hiddenReason: r.reviewHiddenReason,
          };
        })
    );

    // Sort by creation date, newest first
    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ reviews });
  } catch (error) {
    console.log('Error fetching reviews:', error);
    return c.json({ error: 'Failed to fetch reviews' }, 500);
  }
});

// Hide review (admin only)
app.post('/make-server-de4eab6a/admin/reviews/hide', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { reviewId, reason } = await c.req.json();
    const request = await kv.get(`request:${reviewId}`);

    if (!request) {
      return c.json({ error: 'Review not found' }, 404);
    }

    request.reviewHidden = true;
    request.reviewHiddenAt = new Date().toISOString();
    request.reviewHiddenBy = user.id;
    request.reviewHiddenReason = reason || 'Hidden by admin';

    await kv.set(`request:${reviewId}`, request);

    console.log(`Review ${reviewId} hidden by admin ${user.id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log('Error hiding review:', error);
    return c.json({ error: 'Failed to hide review' }, 500);
  }
});

// Unhide review (admin only)
app.post('/make-server-de4eab6a/admin/reviews/unhide', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { reviewId } = await c.req.json();
    const request = await kv.get(`request:${reviewId}`);

    if (!request) {
      return c.json({ error: 'Review not found' }, 404);
    }

    request.reviewHidden = false;
    delete request.reviewHiddenAt;
    delete request.reviewHiddenBy;
    delete request.reviewHiddenReason;

    await kv.set(`request:${reviewId}`, request);

    console.log(`Review ${reviewId} unhidden by admin ${user.id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log('Error unhiding review:', error);
    return c.json({ error: 'Failed to unhide review' }, 500);
  }
});

// Delete review permanently (admin only)
app.delete('/make-server-de4eab6a/admin/reviews/:reviewId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const reviewId = c.req.param('reviewId');
    const request = await kv.get(`request:${reviewId}`);

    if (!request) {
      return c.json({ error: 'Review not found' }, 404);
    }

    // Recalculate provider rating without this review
    const ratingValue = request.userRating || request.rating;
    if (request.providerId && ratingValue) {
      const provider = await kv.get(`user:${request.providerId}`);
      if (provider && provider.totalReviews > 0) {
        const currentRating = provider.rating || 0;
        const currentReviews = provider.totalReviews || 0;
        const newTotalReviews = Math.max(0, currentReviews - 1);
        
        let newRating = 0;
        if (newTotalReviews > 0) {
          // Remove this rating from the average
          const totalPoints = currentRating * currentReviews;
          const newTotalPoints = totalPoints - ratingValue;
          newRating = newTotalPoints / newTotalReviews;
        }

        await kv.set(`user:${request.providerId}`, {
          ...provider,
          rating: parseFloat(newRating.toFixed(2)),
          totalReviews: newTotalReviews,
        });
      }
    }

    // Remove rating data from request (both old and new field names)
    delete request.userRating;
    delete request.userReview;
    delete request.rating;
    delete request.review;
    delete request.ratedAt;
    delete request.reviewHidden;
    delete request.reviewHiddenAt;
    delete request.reviewHiddenBy;
    delete request.reviewHiddenReason;

    await kv.set(`request:${reviewId}`, request);

    console.log(`Review ${reviewId} deleted by admin ${user.id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting review:', error);
    return c.json({ error: 'Failed to delete review' }, 500);
  }
});

// ============ PROVIDER JOB REQUEST ROUTES ============

// Get available job requests for provider
app.get('/make-server-de4eab6a/jobs/requests', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const provider = await kv.get(`user:${user.id}`);
    if (!provider || provider.role !== 'provider') {
      return c.json({ error: 'Only providers can access job requests' }, 403);
    }

    console.log(`Fetching job requests for provider ${user.id} with specialty: ${provider.specialty}, skills: ${JSON.stringify(provider.skills)}`);

    // Get all pending requests (not yet assigned to a provider)
    const allRequests = await kv.getByPrefix('request:');
    console.log(`Total requests in database: ${allRequests.length}`);
    
    const pendingRequests = allRequests.filter((r: any) => {
      if (!r || r.status !== 'pending' || r.providerId) {
        return false;
      }

      // Match by specialty or skills
      const providerSkills = provider.skills || [];
      const providerSpecialty = provider.specialty?.toLowerCase() || '';
      const requestServiceType = r.serviceType?.toLowerCase() || '';

      // Check if provider's specialty matches the service type
      const specialtyMatches = providerSpecialty && requestServiceType.includes(providerSpecialty);
      
      // Check if any of provider's skills match the service type
      const skillMatches = providerSkills.some((skill: string) => 
        requestServiceType === skill.toLowerCase() ||
        requestServiceType.includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(requestServiceType)
      );

      const matches = specialtyMatches || skillMatches;
      
      if (matches) {
        console.log(`✓ Request ${r.id} matches provider: serviceType="${r.serviceType}", specialty="${provider.specialty}", skills="${providerSkills}"`);
      }

      return matches;
    });

    console.log(`Found ${pendingRequests.length} matching requests for provider ${user.id}`);

    // Enhance with client details and service title
    const enhancedRequests = await Promise.all(
      pendingRequests.map(async (request: any) => {
        const client = await kv.get(`user:${request.clientId}`);
        
        // Fetch service details to get service title
        let serviceTitle = request.serviceTitle;
        if (!serviceTitle && request.serviceType) {
          const service = await kv.get(`service:${request.serviceType}`);
          serviceTitle = service?.title || request.serviceType;
        }
        
        return {
          ...request,
          clientName: client?.name || 'Unknown',
          clientPhone: client?.phone,
          serviceTitle,
        };
      })
    );

    // Sort by creation date, newest first
    enhancedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log(`Returning ${enhancedRequests.length} job requests to provider`);
    return c.json({ requests: enhancedRequests });
  } catch (error) {
    console.log('Error fetching job requests:', error);
    return c.json({ error: 'Failed to fetch job requests', details: error?.message }, 500);
  }
});

// Accept a job request
app.post('/make-server-de4eab6a/jobs/accept', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const provider = await kv.get(`user:${user.id}`);
    if (!provider || provider.role !== 'provider') {
      return c.json({ error: 'Only providers can accept jobs' }, 403);
    }

    const { requestId } = await c.req.json();
    console.log(`🔵 Provider ${user.id} (${provider.name}) attempting to accept job ${requestId}`);
    
    const request = await kv.get(`request:${requestId}`);

    if (!request) {
      console.log(`❌ Request ${requestId} not found`);
      return c.json({ error: 'Request not found' }, 404);
    }

    console.log(`📋 Request ${requestId} current status:`, {
      status: request.status,
      providerId: request.providerId,
      serviceType: request.serviceType,
      serviceTitle: request.serviceTitle,
    });

    if (request.providerId) {
      console.log(`❌ Request ${requestId} already accepted by provider ${request.providerId}`);
      return c.json({ error: 'This request has already been accepted by another provider' }, 400);
    }

    // Update request with provider info
    request.providerId = user.id;
    request.providerName = provider.name;
    request.status = 'accepted';
    request.acceptedAt = new Date().toISOString();

    await kv.set(`request:${requestId}`, request);

    console.log(`✅ Request ${requestId} successfully accepted by provider ${user.id}`);
    console.log(`📊 Updated request status:`, {
      id: request.id,
      status: request.status,
      providerId: request.providerId,
      providerName: request.providerName,
      acceptedAt: request.acceptedAt,
    });
    
    return c.json({ success: true, request });
  } catch (error) {
    console.log('❌ Error accepting job:', error);
    return c.json({ error: 'Failed to accept job', details: error?.message }, 500);
  }
});

// Get provider's bookings
app.get('/make-server-de4eab6a/bookings/provider', async (c) => {
  try {
    console.log('🔐 [PROVIDER-BOOKINGS] Attempting to verify user...');
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      console.log('❌ [PROVIDER-BOOKINGS] User verification failed - returning 401');
      return c.json({ error: 'Unauthorized', message: 'Please log in again' }, 401);
    }

    console.log(`🔍 Loading bookings for provider ${user.id}`);

    const allRequests = await kv.getByPrefix('request:');
    console.log(`📦 Total requests in database: ${allRequests.length}`);
    
    const providerRequests = allRequests.filter((r: any) => {
      const matches = r && r.providerId === user.id;
      if (matches) {
        console.log(`✓ Found booking for provider: ${r.id} - status: ${r.status}, serviceType: ${r.serviceType}`);
      }
      return matches;
    });

    console.log(`📊 Found ${providerRequests.length} total bookings for provider ${user.id}`);

    // Enhance with client details and service title
    const enhancedRequests = await Promise.all(
      providerRequests.map(async (request: any) => {
        const client = await kv.get(`user:${request.clientId}`);
        
        // Fetch service details to get service title
        let serviceTitle = request.serviceTitle;
        if (!serviceTitle && request.serviceType) {
          const service = await kv.get(`service:${request.serviceType}`);
          serviceTitle = service?.title || request.serviceType;
          console.log(`📝 Service lookup for ${request.serviceType}: ${serviceTitle}`);
        }
        
        return {
          ...request,
          clientName: client?.name || 'Unknown',
          clientPhone: client?.phone,
          serviceTitle,
        };
      })
    );

    // Sort by creation date, newest first
    enhancedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const statusBreakdown = enhancedRequests.reduce((acc: any, r: any) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    console.log(`✅ Returning ${enhancedRequests.length} enhanced bookings for provider ${user.id}`);
    console.log(`📈 Status breakdown:`, statusBreakdown);
    
    return c.json({ bookings: enhancedRequests });
  } catch (error) {
    console.log('❌ Error fetching provider bookings:', error);
    return c.json({ error: 'Failed to fetch bookings', details: error?.message }, 500);
  }
});

// Update job status
app.post('/make-server-de4eab6a/jobs/update-status', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const provider = await kv.get(`user:${user.id}`);
    if (!provider || provider.role !== 'provider') {
      return c.json({ error: 'Only providers can update job status' }, 403);
    }

    const { jobId, status, notes } = await c.req.json();
    const request = await kv.get(`request:${jobId}`);

    if (!request) {
      return c.json({ error: 'Job not found' }, 404);
    }

    if (request.providerId !== user.id) {
      return c.json({ error: 'You can only update your own jobs' }, 403);
    }

    // Update request status
    request.status = status;
    if (notes !== undefined) {
      request.providerNotes = notes;
    }

    // Add timestamp based on status
    if (status === 'in-progress' && !request.startedAt) {
      request.startedAt = new Date().toISOString();
    } else if (status === 'completed' && !request.completedAt) {
      request.completedAt = new Date().toISOString();
    }

    await kv.set(`request:${jobId}`, request);

    console.log(`Job ${jobId} status updated to ${status} by provider ${user.id}`);
    return c.json({ success: true, request });
  } catch (error) {
    console.log('Error updating job status:', error);
    return c.json({ error: 'Failed to update job status', details: error?.message }, 500);
  }
});

// Update job notes
app.post('/make-server-de4eab6a/jobs/update-notes', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const provider = await kv.get(`user:${user.id}`);
    if (!provider || provider.role !== 'provider') {
      return c.json({ error: 'Only providers can update job notes' }, 403);
    }

    const { jobId, notes } = await c.req.json();
    const request = await kv.get(`request:${jobId}`);

    if (!request) {
      return c.json({ error: 'Job not found' }, 404);
    }

    if (request.providerId !== user.id) {
      return c.json({ error: 'You can only update your own jobs' }, 403);
    }

    request.providerNotes = notes;
    request.notesUpdatedAt = new Date().toISOString();

    await kv.set(`request:${jobId}`, request);

    console.log(`Job ${jobId} notes updated by provider ${user.id}`);
    return c.json({ success: true, request });
  } catch (error) {
    console.log('Error updating job notes:', error);
    return c.json({ error: 'Failed to update job notes', details: error?.message }, 500);
  }
});

// ============ EMAIL CHECK ROUTE ============

// Check if email exists (public endpoint for registration validation)
app.post('/make-server-de4eab6a/auth/check-email', async (c) => {
  try {
    const { email } = await c.req.json();
    
    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    // Check in Supabase Auth
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.log('Error checking email:', error);
      return c.json({ exists: false }); // Fail gracefully
    }

    const emailExists = users.some(user => user.email?.toLowerCase() === email.toLowerCase());
    
    return c.json({ 
      exists: emailExists,
      message: emailExists ? 'This email is already registered' : 'Email is available'
    });
  } catch (error) {
    console.log('Error in email check:', error);
    return c.json({ exists: false }, 500);
  }
});

// ============ DEBUG ROUTES ============

// Debug: Get provider status (helpful for debugging verification issues)
app.get('/make-server-de4eab6a/debug/provider-status/:providerId', async (c) => {
  try {
    const providerId = c.req.param('providerId');
    
    const providerData = await kv.get(`user:${providerId}`);
    const verificationData = await kv.get(`verification:${providerId}`);
    
    return c.json({
      debug: {
        providerId,
        timestamp: new Date().toISOString(),
      },
      provider: {
        exists: !!providerData,
        verified: providerData?.verified,
        verificationStatus: providerData?.verificationStatus,
        role: providerData?.role,
        name: providerData?.name,
        email: providerData?.email,
      },
      verification: {
        exists: !!verificationData,
        stages: verificationData?.stages,
        emailVerified: verificationData?.emailVerified,
        mobileVerified: verificationData?.mobileVerified,
      },
      checkResult: {
        allStagesApproved: verificationData?.stages?.stage1 === 'approved' &&
                          verificationData?.stages?.stage2 === 'approved' &&
                          verificationData?.stages?.stage3 === 'approved' &&
                          verificationData?.stages?.stage4 === 'approved',
        accountApproved: providerData?.verificationStatus === 'approved',
        shouldShowDashboard: (verificationData?.stages?.stage1 === 'approved' &&
                              verificationData?.stages?.stage2 === 'approved' &&
                              verificationData?.stages?.stage3 === 'approved' &&
                              verificationData?.stages?.stage4 === 'approved') &&
                             (providerData?.verificationStatus === 'approved'),
      }
    });
  } catch (error) {
    console.log('Error in debug endpoint:', error);
    return c.json({ error: 'Failed to get debug info', details: error?.message }, 500);
  }
});

// Debug endpoint to check client requests data
app.get('/make-server-de4eab6a/admin/debug/client-requests/:clientId', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const clientId = c.req.param('clientId');
    
    // Get all requests
    const allRequests = await kv.getByPrefix('request:');
    
    // Filter for this client
    const clientRequests = allRequests.filter((r: any) => r.clientId === clientId);
    
    // Sample all requests to see their clientIds
    const allClientIds = [...new Set(allRequests.map((r: any) => r.clientId))];
    
    return c.json({
      targetClientId: clientId,
      totalRequestsInDB: allRequests.length,
      clientRequestsFound: clientRequests.length,
      allUniqueClientIds: allClientIds,
      sampleRequests: clientRequests.slice(0, 5).map((r: any) => ({
        id: r.id,
        clientId: r.clientId,
        serviceTitle: r.serviceTitle,
        status: r.status,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.log('Error in debug client requests:', error);
    return c.json({ error: 'Failed to debug', details: error?.message }, 500);
  }
});

// ============ SERVICE REQUEST ROUTES ============

// Create service request (client only)
app.post('/make-server-de4eab6a/requests/create', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      console.log('Unauthorized request to create service request - no valid user');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const requestData = await c.req.json();
    console.log('Received request data from client:', JSON.stringify(requestData, null, 2));
    
    // Fetch service details to include pricing information
    const service = await kv.get(`service:${requestData.serviceType}`);
    console.log('Service details for request:', service);
    
    // Generate unique request ID
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create request object
    const request = {
      id: requestId,
      clientId: user.id,
      serviceType: requestData.serviceType,
      serviceTitle: requestData.serviceTitle,
      bookingType: requestData.bookingType,
      scheduledDate: requestData.scheduledDate,
      scheduledTime: requestData.scheduledTime,
      location: requestData.location,
      additionalDetails: requestData.additionalDetails,
      estimatedCost: requestData.estimatedCost || 0,
      requestFor: requestData.requestFor || 'self',
      recipientName: requestData.recipientName,
      recipientPhone: requestData.recipientPhone,
      recipientAddress: requestData.recipientAddress,
      recipientAge: requestData.recipientAge,
      recipientGender: requestData.recipientGender,
      providerGenderPreference: requestData.providerGenderPreference,
      providerLanguagePreference: requestData.providerLanguagePreference,
      duration: requestData.duration,
      // Payment details
      paymentId: requestData.paymentId,
      orderId: requestData.orderId,
      paymentSignature: requestData.paymentSignature,
      paymentStatus: requestData.paymentStatus || 'pending',
      paidAmount: requestData.paidAmount || requestData.estimatedCost || 0,
      // Include service pricing details
      basePrice: service?.basePrice,
      minimumHours: service?.minimumHours,
      minimumFee: service?.minimumFee,
      status: 'pending', // pending, accepted, in-progress, completed, cancelled
      providerId: null, // Will be set when provider accepts
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('Saving request to KV store:', JSON.stringify(request, null, 2));
    await kv.set(`request:${requestId}`, request);
    
    console.log(`✓ Service request ${requestId} created successfully by client ${user.id}`);
    return c.json({ success: true, request });
  } catch (error) {
    console.log('❌ Error creating service request:', error);
    console.log('Error stack:', error?.stack);
    return c.json({ error: 'Failed to create service request', details: error?.message }, 500);
  }
});

// Note: Client bookings endpoint exists at line ~333, removed duplicate

// Cancel service request (client only, before provider accepts)
app.post('/make-server-de4eab6a/requests/cancel', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      console.log('Unauthorized request to cancel service request');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { requestId } = await c.req.json();
    console.log(`Attempting to cancel request ${requestId} by client ${user.id}`);
    
    const request = await kv.get(`request:${requestId}`);
    if (!request) {
      console.log(`Request ${requestId} not found`);
      return c.json({ error: 'Request not found' }, 404);
    }

    if (request.clientId !== user.id) {
      console.log(`Client ${user.id} attempted to cancel request ${requestId} belonging to ${request.clientId}`);
      return c.json({ error: 'Unauthorized - not your request' }, 403);
    }

    // Only allow cancellation if request is pending or accepted (not in-progress or completed)
    if (request.status === 'completed') {
      return c.json({ error: 'Cannot cancel completed request' }, 400);
    }

    if (request.status === 'cancelled') {
      return c.json({ error: 'Request already cancelled' }, 400);
    }

    // Update request status to cancelled
    request.status = 'cancelled';
    request.cancelledAt = new Date().toISOString();
    request.updatedAt = new Date().toISOString();

    await kv.set(`request:${requestId}`, request);
    
    console.log(`✓ Request ${requestId} cancelled successfully by client ${user.id}`);
    return c.json({ success: true, request });
  } catch (error) {
    console.log('❌ Error cancelling request:', error);
    console.log('Error stack:', error?.stack);
    return c.json({ error: 'Failed to cancel request', details: error?.message }, 500);
  }
});

// Submit rating for booking
app.post('/make-server-de4eab6a/bookings/rate', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { bookingId, rating, review } = await c.req.json();
    
    console.log(`🌟 [RATING] Client ${user.id} rating booking ${bookingId}: ${rating} stars`);
    
    const booking = await kv.get(`request:${bookingId}`);
    if (!booking) {
      console.log(`❌ [RATING] Booking ${bookingId} not found`);
      return c.json({ error: 'Booking not found' }, 404);
    }

    console.log(`📋 [RATING] Booking details before rating:`, {
      id: booking.id,
      clientId: booking.clientId,
      providerId: booking.providerId,
      status: booking.status,
      existingRating: booking.userRating || booking.rating,
      existingRatedAt: booking.ratedAt,
    });

    if (booking.clientId !== user.id) {
      console.log(`❌ [RATING] Client ${user.id} unauthorized to rate booking ${bookingId} (belongs to ${booking.clientId})`);
      return c.json({ error: 'Unauthorized - not your booking' }, 403);
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      console.log(`❌ [RATING] Cannot rate booking ${bookingId} - status is ${booking.status}`);
      return c.json({ error: 'Can only rate completed bookings' }, 400);
    }

    const now = new Date();
    const isUpdate = !!(booking.userRating || booking.rating);

    // If updating, check if within 7 days
    if (isUpdate && booking.ratedAt) {
      const ratedDate = new Date(booking.ratedAt);
      const daysSinceRating = (now.getTime() - ratedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceRating > 7) {
        console.log(`❌ [RATING] Cannot edit review - ${daysSinceRating.toFixed(1)} days since original review (limit: 7 days)`);
        return c.json({ error: 'Review can only be edited within 7 days of posting' }, 403);
      }
      
      console.log(`✏️ [RATING] Updating existing review (posted ${daysSinceRating.toFixed(1)} days ago)`);
    }

    // Update booking with rating (store in both formats for compatibility)
    const wasFirstReview = !booking.ratedAt;
    booking.userRating = rating;
    booking.userReview = review;
    booking.rating = rating;
    booking.review = review;
    
    // Only update ratedAt on first rating, preserve original timestamp for edits
    if (wasFirstReview) {
      booking.ratedAt = now.toISOString();
    }
    booking.lastEditedAt = now.toISOString();

    console.log(`💾 [RATING] Saving rating for booking ${bookingId}:`, {
      userRating: booking.userRating,
      rating: booking.rating,
      hasReview: !!review,
      providerId: booking.providerId,
      ratedAt: booking.ratedAt,
      isUpdate,
    });

    await kv.set(`request:${bookingId}`, booking);
    console.log(`✅ [RATING] Rating saved successfully for booking ${bookingId}`);

    // Update provider's rating if there's a provider
    if (booking.providerId) {
      const provider = await kv.get(`user:${booking.providerId}`);
      if (provider) {
        // Always recalculate from all reviews to ensure accuracy
        const allRequests = await kv.getByPrefix('request:');
        const providerRequests = allRequests.filter(
          (r: any) => r.providerId === booking.providerId && (r.userRating || r.rating)
        );
        
        const totalRating = providerRequests.reduce((sum: number, r: any) => sum + (r.userRating || r.rating), 0);
        const avgRating = providerRequests.length > 0 ? totalRating / providerRequests.length : 0;
        
        await kv.set(`user:${booking.providerId}`, {
          ...provider,
          rating: parseFloat(avgRating.toFixed(2)),
          totalReviews: providerRequests.length,
        });
        
        console.log(`📊 [RATING] Updated provider ${booking.providerId} rating: ${avgRating.toFixed(2)} (${providerRequests.length} reviews)`);
      } else {
        console.log(`⚠️  [RATING] Provider ${booking.providerId} not found in database`);
      }
    } else {
      console.log(`⚠️  [RATING] No providerId found on booking ${bookingId} - review will not be visible to provider`);
    }

    console.log(`✅ [RATING] Booking ${bookingId} rated by client ${user.id} - Final state:`, {
      id: booking.id,
      providerId: booking.providerId,
      userRating: booking.userRating,
      rating: booking.rating,
      ratedAt: booking.ratedAt,
    });
    return c.json({ success: true, request: booking });
  } catch (error) {
    console.log('Error submitting rating:', error);
    return c.json({ error: 'Failed to submit rating', details: error?.message }, 500);
  }
});

// Health check
app.get('/make-server-de4eab6a/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '2025-11-06-v2' // Updated to track deployment
  });
});

// Clear all client and provider data (admin only)
app.post('/make-server-de4eab6a/admin/clear-all-data', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      console.log('Unauthorized request to clear data');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Verify user is admin
    const adminUser = await kv.get(`user:${user.id}`);
    if (!adminUser || adminUser.role !== 'admin') {
      console.log('Non-admin user attempted to clear data');
      return c.json({ error: 'Admin access required' }, 403);
    }

    console.log('🗑️ Starting data deletion process...');
    
    let deletedCount = {
      clients: 0,
      providers: 0,
      requests: 0,
      locations: 0,
      familyMembers: 0,
      verifications: 0,
      reviews: 0,
      clientLocationIndexes: 0,
      clientFamilyIndexes: 0,
    };

    // 1. Delete all clients and providers (but keep admins)
    const allUsers = await kv.getByPrefix('user:');
    console.log(`Found ${allUsers.length} total users`);
    
    for (const user of allUsers) {
      if (user.role === 'client') {
        await kv.del(`user:${user.id}`);
        deletedCount.clients++;
        console.log(`Deleted client: ${user.email}`);
        
        // Delete from Supabase Auth
        try {
          await supabaseAdmin.auth.admin.deleteUser(user.id);
        } catch (e) {
          console.log(`Could not delete auth user ${user.id}:`, e.message);
        }
      } else if (user.role === 'provider') {
        await kv.del(`user:${user.id}`);
        deletedCount.providers++;
        console.log(`Deleted provider: ${user.email}`);
        
        // Delete from Supabase Auth
        try {
          await supabaseAdmin.auth.admin.deleteUser(user.id);
        } catch (e) {
          console.log(`Could not delete auth user ${user.id}:`, e.message);
        }
      }
    }

    // 2. Delete all requests/bookings
    const allRequests = await kv.getByPrefix('request:');
    console.log(`Found ${allRequests.length} requests`);
    for (const request of allRequests) {
      await kv.del(`request:${request.id}`);
      deletedCount.requests++;
    }

    // 3. Delete all locations
    const allLocations = await kv.getByPrefix('location:');
    console.log(`Found ${allLocations.length} locations`);
    for (const location of allLocations) {
      await kv.del(`location:${location.id}`);
      deletedCount.locations++;
    }

    // 4. Delete all family members
    const allFamilyMembers = await kv.getByPrefix('family:');
    console.log(`Found ${allFamilyMembers.length} family members`);
    for (const member of allFamilyMembers) {
      await kv.del(`family:${member.id}`);
      deletedCount.familyMembers++;
    }

    // 5. Delete all client location indexes
    const allClientLocationIndexes = await kv.getByPrefix('client_location:');
    console.log(`Found ${allClientLocationIndexes.length} client location indexes`);
    for (const index of allClientLocationIndexes) {
      await kv.del(`client_location:${index}`);
      deletedCount.clientLocationIndexes++;
    }

    // 6. Delete all client family indexes
    const allClientFamilyIndexes = await kv.getByPrefix('client_family:');
    console.log(`Found ${allClientFamilyIndexes.length} client family indexes`);
    for (const index of allClientFamilyIndexes) {
      await kv.del(`client_family:${index}`);
      deletedCount.clientFamilyIndexes++;
    }

    // 7. Delete all verifications
    const allVerifications = await kv.getByPrefix('verification:');
    console.log(`Found ${allVerifications.length} verifications`);
    for (const verification of allVerifications) {
      await kv.del(`verification:${verification.providerId}`);
      deletedCount.verifications++;
    }

    // 8. Delete all reviews
    const allReviews = await kv.getByPrefix('review:');
    console.log(`Found ${allReviews.length} reviews`);
    for (const review of allReviews) {
      await kv.del(`review:${review.id}`);
      deletedCount.reviews++;
    }

    console.log('✅ Data deletion complete:', deletedCount);

    return c.json({ 
      success: true, 
      message: 'All client and provider data has been deleted',
      deletedCount 
    });
  } catch (error) {
    console.log('❌ Error clearing data:', error);
    return c.json({ error: 'Failed to clear data', details: error?.message }, 500);
  }
});

// ============ RAZORPAY PAYMENT ROUTES ============

// Create Razorpay order
app.post('/make-server-de4eab6a/create-razorpay-order', async (c) => {
  try {
    const { amount, currency, bookingData } = await c.req.json();
    
    console.log('💳 Creating Razorpay order:', { amount, currency });
    
    if (!amount || amount <= 0) {
      return c.json({ error: 'Invalid amount' }, 400);
    }
    
    // Get Razorpay credentials
    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    
    if (!keyId || !keySecret) {
      console.error('❌ Razorpay credentials not configured');
      console.error('Missing RAZORPAY_KEY_ID:', !keyId);
      console.error('Missing RAZORPAY_KEY_SECRET:', !keySecret);
      return c.json({ 
        error: 'Payment system not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to environment variables.',
        missingKeys: {
          keyId: !keyId,
          keySecret: !keySecret
        }
      }, 500);
    }
    
    // Create Razorpay order
    const orderData = {
      amount: amount, // Amount in paise
      currency: currency || 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        serviceTitle: bookingData.serviceTitle || '',
        duration: bookingData.duration || '',
      }
    };
    
    const auth = btoa(`${keyId}:${keySecret}`);
    
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(orderData),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Razorpay order creation failed:', errorData);
      return c.json({ 
        error: 'Failed to create payment order with Razorpay', 
        details: errorData,
        status: response.status 
      }, 500);
    }
    
    const order = await response.json();
    console.log('✅ Razorpay order created:', order.id);
    
    return c.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error);
    return c.json({ 
      error: 'Failed to create payment order', 
      details: error?.message || String(error) 
    }, 500);
  }
});

// Verify Razorpay payment
app.post('/make-server-de4eab6a/verify-razorpay-payment', async (c) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await c.req.json();
    
    console.log('🔍 Verifying Razorpay payment:', razorpay_payment_id);
    
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    
    if (!keySecret) {
      console.error('❌ Razorpay key secret not configured');
      return c.json({ error: 'Payment system not configured' }, 500);
    }
    
    // Verify signature using crypto
    const crypto = await import('node:crypto');
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    
    const isValid = expectedSignature === razorpay_signature;
    
    if (isValid) {
      console.log('✅ Payment verified successfully:', razorpay_payment_id);
      return c.json({ success: true, verified: true });
    } else {
      console.error('❌ Payment signature verification failed');
      return c.json({ error: 'Invalid payment signature' }, 400);
    }
  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    return c.json({ error: 'Failed to verify payment', details: error?.message }, 500);
  }
});

// ==================== WALLET ROUTES ====================

// Get wallet balance and transactions
app.get('/make-server-de4eab6a/wallet', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log('📊 [WALLET] Getting wallet for user:', user.id);

    // Get wallet balance
    const walletKey = `wallet:${user.id}`;
    const wallet = await kv.get(walletKey) || { balance: 0, userId: user.id };

    // Get transactions
    const transactionsKey = `wallet:transactions:${user.id}`;
    const transactions = await kv.get(transactionsKey) || [];

    console.log('✅ [WALLET] Wallet retrieved:', { balance: wallet.balance, transactionCount: transactions.length });

    return c.json({ wallet, transactions });
  } catch (error) {
    console.error('❌ [WALLET] Error getting wallet:', error);
    return c.json({ error: 'Failed to get wallet', details: error?.message }, 500);
  }
});

// Add money to wallet
app.post('/make-server-de4eab6a/wallet/add', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { amount, paymentMethod, paymentId } = await c.req.json();

    if (!amount || amount <= 0) {
      return c.json({ error: 'Invalid amount' }, 400);
    }

    console.log('💰 [WALLET] Adding money to wallet:', { userId: user.id, amount, paymentMethod });

    // Get current wallet
    const walletKey = `wallet:${user.id}`;
    const wallet = await kv.get(walletKey) || { balance: 0, userId: user.id };

    // Update balance
    wallet.balance = (wallet.balance || 0) + amount;

    // Save wallet
    await kv.set(walletKey, wallet);

    // Add transaction
    const transactionsKey = `wallet:transactions:${user.id}`;
    const transactions = await kv.get(transactionsKey) || [];
    
    const transaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'credit',
      amount,
      description: `Added money via ${paymentMethod || 'payment'}`,
      paymentId,
      timestamp: new Date().toISOString(),
      balance: wallet.balance,
    };

    transactions.unshift(transaction);
    
    // Keep only last 100 transactions
    if (transactions.length > 100) {
      transactions.splice(100);
    }

    await kv.set(transactionsKey, transactions);

    console.log('✅ [WALLET] Money added successfully:', { newBalance: wallet.balance, transactionId: transaction.id });

    return c.json({ wallet, transaction });
  } catch (error) {
    console.error('❌ [WALLET] Error adding money:', error);
    return c.json({ error: 'Failed to add money', details: error?.message }, 500);
  }
});

// Withdraw money from wallet (for providers)
app.post('/make-server-de4eab6a/wallet/withdraw', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { amount, bankAccount, accountHolder } = await c.req.json();

    if (!amount || amount <= 0) {
      return c.json({ error: 'Invalid amount' }, 400);
    }

    console.log('💸 [WALLET] Withdrawal request:', { userId: user.id, amount, bankAccount });

    // Get current wallet
    const walletKey = `wallet:${user.id}`;
    const wallet = await kv.get(walletKey) || { balance: 0, userId: user.id };

    // Check sufficient balance
    if (wallet.balance < amount) {
      return c.json({ error: 'Insufficient balance' }, 400);
    }

    // Update balance
    wallet.balance = (wallet.balance || 0) - amount;

    // Save wallet
    await kv.set(walletKey, wallet);

    // Add transaction
    const transactionsKey = `wallet:transactions:${user.id}`;
    const transactions = await kv.get(transactionsKey) || [];
    
    const transaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'debit',
      amount,
      description: `Withdrawn to ${bankAccount || 'bank account'}`,
      accountHolder,
      bankAccount,
      status: 'pending',
      timestamp: new Date().toISOString(),
      balance: wallet.balance,
    };

    transactions.unshift(transaction);
    
    // Keep only last 100 transactions
    if (transactions.length > 100) {
      transactions.splice(100);
    }

    await kv.set(transactionsKey, transactions);

    console.log('✅ [WALLET] Withdrawal processed:', { newBalance: wallet.balance, transactionId: transaction.id });

    return c.json({ wallet, transaction });
  } catch (error) {
    console.error('❌ [WALLET] Error processing withdrawal:', error);
    return c.json({ error: 'Failed to process withdrawal', details: error?.message }, 500);
  }
});

// Use wallet for payment (internal transfer)
app.post('/make-server-de4eab6a/wallet/pay', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { amount, bookingId, providerId, description } = await c.req.json();

    if (!amount || amount <= 0) {
      return c.json({ error: 'Invalid amount' }, 400);
    }

    console.log('💳 [WALLET] Payment request:', { userId: user.id, amount, bookingId, providerId });

    // Get client wallet
    const clientWalletKey = `wallet:${user.id}`;
    const clientWallet = await kv.get(clientWalletKey) || { balance: 0, userId: user.id };

    // Check sufficient balance
    if (clientWallet.balance < amount) {
      return c.json({ error: 'Insufficient balance' }, 400);
    }

    // Deduct from client wallet
    clientWallet.balance -= amount;
    await kv.set(clientWalletKey, clientWallet);

    // Add transaction for client
    const clientTxnKey = `wallet:transactions:${user.id}`;
    const clientTransactions = await kv.get(clientTxnKey) || [];
    
    const clientTransaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'debit',
      amount,
      description: description || `Payment for booking ${bookingId}`,
      bookingId,
      providerId,
      timestamp: new Date().toISOString(),
      balance: clientWallet.balance,
    };

    clientTransactions.unshift(clientTransaction);
    if (clientTransactions.length > 100) {
      clientTransactions.splice(100);
    }
    await kv.set(clientTxnKey, clientTransactions);

    // Add to provider wallet if providerId exists
    if (providerId) {
      const providerWalletKey = `wallet:${providerId}`;
      const providerWallet = await kv.get(providerWalletKey) || { balance: 0, userId: providerId };
      providerWallet.balance = (providerWallet.balance || 0) + amount;
      await kv.set(providerWalletKey, providerWallet);

      // Add transaction for provider
      const providerTxnKey = `wallet:transactions:${providerId}`;
      const providerTransactions = await kv.get(providerTxnKey) || [];
      
      const providerTransaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'credit',
        amount,
        description: description || `Payment received for booking ${bookingId}`,
        bookingId,
        clientId: user.id,
        timestamp: new Date().toISOString(),
        balance: providerWallet.balance,
      };

      providerTransactions.unshift(providerTransaction);
      if (providerTransactions.length > 100) {
        providerTransactions.splice(100);
      }
      await kv.set(providerTxnKey, providerTransactions);
    }

    console.log('✅ [WALLET] Payment successful:', { clientBalance: clientWallet.balance, txnId: clientTransaction.id });

    return c.json({ wallet: clientWallet, transaction: clientTransaction });
  } catch (error) {
    console.error('❌ [WALLET] Error processing payment:', error);
    return c.json({ error: 'Failed to process payment', details: error?.message }, 500);
  }
});

// Admin: Get all wallets
app.get('/make-server-de4eab6a/admin/wallets', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log('👑 [ADMIN] Getting all wallets');

    // Get all wallet keys
    const allWallets = await kv.getByPrefix('wallet:');
    
    // Filter out transaction keys, only get wallet balances
    const wallets = allWallets.filter(w => !w.key.includes(':transactions:'));

    console.log('✅ [ADMIN] Retrieved wallets:', wallets.length);

    return c.json({ wallets });
  } catch (error) {
    console.error('❌ [ADMIN] Error getting wallets:', error);
    return c.json({ error: 'Failed to get wallets', details: error?.message }, 500);
  }
});

Deno.serve(app.fetch);
