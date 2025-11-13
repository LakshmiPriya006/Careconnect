-- 001_seed_clients.sql
-- Insert a seed client, location, wallet and booking for local testing

WITH new_client AS (
  INSERT INTO public.clients (name, email, phone, metadata)
  VALUES ('Seed User','seed@careconnect.local','+919999999999','{}')
  RETURNING id
),
created_location AS (
  INSERT INTO public.client_locations (client_id, label, address, is_default)
  SELECT id, 'Home', jsonb_build_object('street','123 Test St','city','TestCity','postalCode','123456'), true FROM new_client
  RETURNING id
),
created_wallet AS (
  INSERT INTO public.wallet_accounts (client_id, balance)
  SELECT id, 500.00 FROM new_client
  RETURNING id
)
INSERT INTO public.bookings (client_id, status, booking_type, location, estimated_cost, metadata)
SELECT id, 'pending', 'scheduled', jsonb_build_object('street','123 Test St'), 250.00, '{}' FROM new_client;

-- Optionally return produced rows (run via psql or supabase SQL editor will show results)
SELECT * FROM public.clients WHERE email='seed@careconnect.local';
SELECT * FROM public.client_locations WHERE client_id = (SELECT id FROM public.clients WHERE email='seed@careconnect.local');
SELECT * FROM public.wallet_accounts WHERE client_id = (SELECT id FROM public.clients WHERE email='seed@careconnect.local');
SELECT * FROM public.bookings WHERE client_id = (SELECT id FROM public.clients WHERE email='seed@careconnect.local');
