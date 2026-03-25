import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardData {
  transactions: any[];
  profile: any | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useDashboardData(): DashboardData {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [txRes, profRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
        .order("created_at", { ascending: false }),

      supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    setTransactions(txRes.data ?? []);
    setProfile(profRes.data);
    setLoading(false);
  }, [user]);

  // Initial fetch
  useEffect(() => {
    if (!user) return;

    const init = async () => {
      await fetchData();
    };
    init();
  }, [user, fetchData]);

  // Realtime subscription — refetch on any transaction change
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dashboard-transactions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => fetchData()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchData]);

  return { transactions, profile, loading, refresh: fetchData };
}