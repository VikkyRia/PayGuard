
-- Fix: Allow admins to read bank_accounts (fixes N/A bank details on withdrawal page)
CREATE POLICY "Admins can view all bank accounts"
ON public.bank_accounts
FOR SELECT
TO public
USING (public.has_role(auth.uid(), 'admin'));

-- Reviews table for post-transaction ratings
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  reviewed_user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(transaction_id, reviewer_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews (public trust)
CREATE POLICY "Reviews are viewable by everyone"
ON public.reviews FOR SELECT TO public USING (true);

-- Authenticated users can insert their own reviews
CREATE POLICY "Users can insert own reviews"
ON public.reviews FOR INSERT TO public
WITH CHECK (auth.uid() = reviewer_id);

-- Enable realtime for reviews
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
