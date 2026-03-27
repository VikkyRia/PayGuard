import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface BuyerDashboardData {
  transactions: any[];
  profile: any | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useBuyerDashboardData(): BuyerDashboardData {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [txRes, profRes] = await Promise.all([
      // Only transactions where this user is the buyer
      supabase
        .from("transactions")
        .select("*")
        .eq("buyer_id", user.id)
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

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, fetchData]);

  // Realtime — buyer sees live status updates without refreshing
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("buyer-dashboard-transactions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchData]);

  return { transactions, profile, loading, refresh: fetchData };
}