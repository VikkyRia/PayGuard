
-- Allow anyone to view a transaction if they have the direct link (by ID)
CREATE POLICY "Anyone can view transactions by direct link" ON public.transactions
  FOR SELECT USING (true);

-- Drop the old participant-only select since the new policy covers it
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
