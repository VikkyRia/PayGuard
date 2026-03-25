
-- Add buyer_email column to transactions
ALTER TABLE public.transactions ADD COLUMN buyer_email text;

-- Create function to auto-link guest transactions when user signs up
CREATE OR REPLACE FUNCTION public.link_guest_transactions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When a new profile is created, link any transactions where buyer_email matches
  UPDATE public.transactions
  SET buyer_id = NEW.user_id
  WHERE buyer_email = NEW.email
    AND buyer_id = seller_id;  -- guest transactions have buyer_id = seller_id initially
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
CREATE TRIGGER on_profile_created_link_transactions
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.link_guest_transactions();