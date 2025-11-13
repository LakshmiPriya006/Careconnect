// CareConnect Server - SQL Migration Version - Schema Corrected
import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger(console.log));

// Initialize Supabase client
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Helper function to verify access token
async function verifyUser(authHeader: string | null) {
  if (!authHeader) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    return null;
  }
  
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
    return null;
  }
  
  console.log(`✅ [AUTH] User verified: ${user.email}`);
  return user;
}

// Helper function to get client ID from auth user ID
async function getClientId(authUserId: string): Promise<string | null> {
  const { data: clientData, error } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single();
    
  if (error || !clientData) {
    console.log('❌ [CLIENT] Client not found for auth user:', authUserId);
    return null;
  }
  
  return clientData.id;
}

// AUTH ROUTES

// Client signup - SQL version
app.post('/auth/signup/client', async (c: any) => {
  try {
    console.log('📝 [SIGNUP] Starting client signup process...');
    const { name, email, password, phone, address, city } = await c.req.json();
    
    if (!name || !email || !password) {
      return c.json({ error: 'Name, email and password are required' }, 400);
    }

    // Create user account
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'client',
        userType: 'client'
      }
    });

    if (authError || !authData.user) {
      console.log('❌ [SIGNUP] Auth error:', authError);
      return c.json({ error: authError?.message || 'Failed to create user account' }, 400);
    }

    const userId = authData.user.id;
    console.log(`✅ [SIGNUP] Created auth user: ${email} (${userId})`);

    // Create client record
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert([{
        auth_user_id: userId,
        name,
        email,
        phone: phone || null,
        phone_verified: false,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (clientError) {
      console.log('❌ [SIGNUP] Error creating client record:', clientError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return c.json({ error: 'Failed to create client profile' }, 500);
    }

    const clientId = clientData.id;
    console.log('✅ [SIGNUP] Created client record');

    // Create location if provided
    if (address && city) {
      const { error: locationError } = await supabaseAdmin
        .from('client_locations')
        .insert([{
          client_id: clientId,
          label: 'Primary',
          address: { street: address, city, country: 'India' },
          is_default: true,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (locationError) {
        console.log('⚠️ [SIGNUP] Warning: Failed to create location:', locationError);
      } else {
        console.log('✅ [SIGNUP] Created client location');
      }
    }

    // Create wallet account
    const { error: walletError } = await supabaseAdmin
      .from('wallet_accounts')
      .insert([{
        client_id: clientId,
        balance: 0,
        currency: 'INR',
        updated_at: new Date().toISOString()
      }]);

    if (walletError) {
      console.log('⚠️ [SIGNUP] Warning: Failed to create wallet:', walletError);
    } else {
      console.log('✅ [SIGNUP] Created wallet account');
    }

    return c.json({ 
      success: true, 
      user: {
        id: userId,
        email,
        name,
        role: 'client'
      }
    });

  } catch (error) {
    console.log('❌ [SIGNUP] Unexpected error:', error);
    return c.json({ error: 'Internal server error during signup' }, 500);
  }
});

// CLIENT ROUTES

// Get client profile - SQL version
app.get('/client/profile', async (c: any) => {
  const user = await verifyUser(c.req.header('Authorization'));
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Get client data
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (clientError) {
      console.log('❌ [PROFILE] Error fetching client:', clientError);
      return c.json({ error: 'Client not found' }, 404);
    }

    const clientId = clientData.id;

    // Get locations
    const { data: locations } = await supabaseAdmin
      .from('client_locations')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    // Get wallet
    const { data: wallet } = await supabaseAdmin
      .from('wallet_accounts')
      .select('*')
      .eq('client_id', clientId)
      .single();

    // Get family members
    const { data: familyMembers } = await supabaseAdmin
      .from('family_members')
      .select('*')
      .eq('client_id', clientId);

    console.log(`✅ [PROFILE] Retrieved profile for: ${clientData.email}`);

    return c.json({
      success: true,
      client: {
        ...clientData,
        locations: locations || [],
        wallet: wallet || null,
        familyMembers: familyMembers || []
      }
    });

  } catch (error) {
    console.log('❌ [PROFILE] Unexpected error:', error);
    return c.json({ error: 'Failed to fetch profile' }, 500);
  }
});

// Add client location - SQL version
app.post('/client/locations', async (c: any) => {
  const user = await verifyUser(c.req.header('Authorization'));
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const clientId = await getClientId(user.id);
    if (!clientId) {
      return c.json({ error: 'Client not found' }, 404);
    }

    const { label, address, latitude, longitude, isDefault } = await c.req.json();

    if (!label || !address) {
      return c.json({ error: 'Label and address are required' }, 400);
    }

    // If this is default, unset other defaults
    if (isDefault) {
      await supabaseAdmin
        .from('client_locations')
        .update({ is_default: false })
        .eq('client_id', clientId);
    }

    const { data, error } = await supabaseAdmin
      .from('client_locations')
      .insert([{
        client_id: clientId,
        label,
        address,
        latitude: latitude || null,
        longitude: longitude || null,
        is_default: isDefault || false,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.log('❌ [LOCATIONS] Error adding location:', error);
      return c.json({ error: 'Failed to add location' }, 500);
    }

    console.log(`✅ [LOCATIONS] Added location for: ${user.email}`);
    return c.json({ success: true, location: data });

  } catch (error) {
    console.log('❌ [LOCATIONS] Unexpected error:', error);
    return c.json({ error: 'Failed to add location' }, 500);
  }
});

// FAMILY MEMBER ROUTES

// Add family member - SQL version
app.post('/client/family-members', async (c: any) => {
  const user = await verifyUser(c.req.header('Authorization'));
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const clientId = await getClientId(user.id);
    if (!clientId) {
      return c.json({ error: 'Client not found' }, 404);
    }

    const { name, relation, phone, dob, metadata } = await c.req.json();

    if (!name) {
      return c.json({ error: 'Name is required' }, 400);
    }

    const { data, error } = await supabaseAdmin
      .from('family_members')
      .insert([{
        client_id: clientId,
        name,
        relation: relation || null,
        phone: phone || null,
        dob: dob || null,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.log('❌ [FAMILY] Error adding family member:', error);
      return c.json({ error: 'Failed to add family member' }, 500);
    }

    console.log(`✅ [FAMILY] Added family member for: ${user.email}`);
    return c.json({ success: true, familyMember: data });

  } catch (error) {
    console.log('❌ [FAMILY] Unexpected error:', error);
    return c.json({ error: 'Failed to add family member' }, 500);
  }
});

// Get family members - SQL version
app.get('/client/family-members', async (c: any) => {
  const user = await verifyUser(c.req.header('Authorization'));
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const clientId = await getClientId(user.id);
    if (!clientId) {
      return c.json({ error: 'Client not found' }, 404);
    }

    const { data, error } = await supabaseAdmin
      .from('family_members')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('❌ [FAMILY] Error fetching family members:', error);
      return c.json({ error: 'Failed to fetch family members' }, 500);
    }

    console.log(`✅ [FAMILY] Retrieved family members for: ${user.email}`);
    return c.json({ success: true, familyMembers: data || [] });

  } catch (error) {
    console.log('❌ [FAMILY] Unexpected error:', error);
    return c.json({ error: 'Failed to fetch family members' }, 500);
  }
});

// Update family member - SQL version
app.put('/client/family-members/:id', async (c: any) => {
  const user = await verifyUser(c.req.header('Authorization'));
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const clientId = await getClientId(user.id);
    if (!clientId) {
      return c.json({ error: 'Client not found' }, 404);
    }

    const memberId = c.req.param('id');
    const { name, relation, phone, dob, metadata } = await c.req.json();

    const { data, error } = await supabaseAdmin
      .from('family_members')
      .update({
        name,
        relation,
        phone,
        dob,
        metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .eq('client_id', clientId)
      .select()
      .single();

    if (error) {
      console.log('❌ [FAMILY] Error updating family member:', error);
      return c.json({ error: 'Failed to update family member' }, 500);
    }

    console.log(`✅ [FAMILY] Updated family member for: ${user.email}`);
    return c.json({ success: true, familyMember: data });

  } catch (error) {
    console.log('❌ [FAMILY] Unexpected error:', error);
    return c.json({ error: 'Failed to update family member' }, 500);
  }
});

// Delete family member - SQL version
app.delete('/client/family-members/:id', async (c: any) => {
  const user = await verifyUser(c.req.header('Authorization'));
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const clientId = await getClientId(user.id);
    if (!clientId) {
      return c.json({ error: 'Client not found' }, 404);
    }

    const memberId = c.req.param('id');

    const { error } = await supabaseAdmin
      .from('family_members')
      .delete()
      .eq('id', memberId)
      .eq('client_id', clientId);

    if (error) {
      console.log('❌ [FAMILY] Error deleting family member:', error);
      return c.json({ error: 'Failed to delete family member' }, 500);
    }

    console.log(`✅ [FAMILY] Deleted family member for: ${user.email}`);
    return c.json({ success: true });

  } catch (error) {
    console.log('❌ [FAMILY] Unexpected error:', error);
    return c.json({ error: 'Failed to delete family member' }, 500);
  }
});

// Health check
app.get('/health', (c: any) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.notFound((c: any) => {
  return c.json({ error: 'Route not found' }, 404);
});

// Error handler
app.onError((err: any, c: any) => {
  console.error('❌ [ERROR] Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;