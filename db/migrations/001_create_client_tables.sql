-- 001_create_client_tables.sql
-- Creates client-related tables: clients, client_locations, family_members, favorites, wallet_accounts, wallet_transactions, bookings

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid,
  name text,
  email text UNIQUE,
  phone text,
  phone_verified boolean DEFAULT false,
  default_location_id uuid NULL,
  avatar_url text NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients (email);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients (phone);

CREATE TABLE IF NOT EXISTS public.client_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  label text,
  address jsonb,
  latitude numeric(10,7) NULL,
  longitude numeric(10,7) NULL,
  is_default boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_locations_client ON public.client_locations (client_id);
CREATE INDEX IF NOT EXISTS idx_client_locations_default ON public.client_locations (client_id, is_default);

CREATE TABLE IF NOT EXISTS public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  relation text NULL,
  phone text NULL,
  dob date NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_members_client ON public.family_members (client_id);

CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (client_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_client ON public.favorites (client_id);
CREATE INDEX IF NOT EXISTS idx_favorites_provider ON public.favorites (provider_id);

CREATE TABLE IF NOT EXISTS public.wallet_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  balance numeric(14,2) DEFAULT 0.00,
  currency text DEFAULT 'INR',
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_accounts_client ON public.wallet_accounts (client_id);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallet_accounts(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency text DEFAULT 'INR',
  reference text NULL,
  status text DEFAULT 'pending',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON public.wallet_transactions (wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_client ON public.wallet_transactions (client_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON public.wallet_transactions (status);

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  provider_id uuid NULL,
  service_id uuid NULL,
  booking_type text DEFAULT 'scheduled',
  scheduled_date timestamptz NULL,
  scheduled_time text NULL,
  status text DEFAULT 'pending',
  estimated_cost numeric(14,2) NULL,
  location jsonb NULL,
  recipient jsonb NULL,
  created_by_admin boolean DEFAULT false,
  admin_id uuid NULL,
  user_rating integer NULL,
  user_review text NULL,
  rated_at timestamptz NULL,
  last_edited_at timestamptz NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_client ON public.bookings (client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON public.bookings (provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_date ON public.bookings (scheduled_date);
