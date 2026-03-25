
-- =============================================
-- PayShield Database Schema
-- =============================================

-- 1. Enum types
CREATE TYPE public.transaction_status AS ENUM (
  'pending_payment', 'funded', 'shipped', 'delivered', 
  'inspection', 'completed', 'disputed', 'refunded', 'cancelled'
);

CREATE TYPE public.dispute_status AS ENUM (
  'pending_evidence', 'under_review', 'auto_resolved', 'resolved_buyer', 'resolved_seller', 'escalated'
);

CREATE TYPE public.dispute_tier AS ENUM ('auto', 'admin_review', 'full_evidence');

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  bvn_verified BOOLEAN NOT NULL DEFAULT false,
  trust_score NUMERIC(3,1) NOT NULL DEFAULT 5.0,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  total_disputes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 4. Transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE DEFAULT 'PS-' || substr(gen_random_uuid()::text, 1, 8),
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  item_description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  status transaction_status NOT NULL DEFAULT 'pending_payment',
  inspection_deadline TIMESTAMPTZ,
  payment_reference TEXT,
  shareable_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT 
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can create transactions" ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Participants can update own transactions" ON public.transactions FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Admins can update all transactions" ON public.transactions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Disputes table
CREATE TABLE public.disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL,
  reason TEXT NOT NULL,
  evidence_urls TEXT[],
  tier dispute_tier NOT NULL DEFAULT 'admin_review',
  status dispute_status NOT NULL DEFAULT 'pending_evidence',
  resolution_notes TEXT,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transaction participants can view disputes" ON public.disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t 
      WHERE t.id = transaction_id 
      AND (auth.uid() = t.buyer_id OR auth.uid() = t.seller_id)
    )
  );
CREATE POLICY "Admins can view all disputes" ON public.disputes FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Transaction participants can create disputes" ON public.disputes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions t 
      WHERE t.id = transaction_id 
      AND (auth.uid() = t.buyer_id OR auth.uid() = t.seller_id)
    )
  );
CREATE POLICY "Admins can update disputes" ON public.disputes FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Function to auto-determine dispute tier
CREATE OR REPLACE FUNCTION public.set_dispute_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  tx_amount NUMERIC;
BEGIN
  SELECT amount INTO tx_amount FROM public.transactions WHERE id = NEW.transaction_id;
  
  IF tx_amount < 50000 THEN
    NEW.tier := 'auto';
  ELSIF tx_amount <= 500000 THEN
    NEW.tier := 'admin_review';
  ELSE
    NEW.tier := 'full_evidence';
    NEW.status := 'pending_evidence';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_dispute_tier_trigger
  BEFORE INSERT ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.set_dispute_tier();
