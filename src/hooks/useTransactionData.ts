import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTransactionData(id: string | undefined) {
  const [transaction, setTransaction] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    
    const { data: tx, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !tx) { setNotFound(true); setLoading(false); return; }
    
    setTransaction(tx);

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, trust_score, bvn_verified, nin_verified, total_transactions")
      .eq("user_id", tx.seller_id)
      .maybeSingle();

    setSeller(profile);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    const init = async () => {
      await fetchData();
    };
    init();
  }, [fetchData]);

  return { transaction, seller, loading, notFound, refresh: fetchData };
}