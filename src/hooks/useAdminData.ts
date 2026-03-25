import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";

export type DisputeStatus =
  | "pending_evidence"
  | "under_review"
  | "auto_resolved"
  | "resolved_buyer"
  | "resolved_seller"
  | "escalated";

export interface AdminData {
  transactions: any[];
  disputes: any[];
  profiles: any[];
  withdrawals: any[];
  loading: boolean;
  refresh: () => Promise<void>;
  updateDisputeStatus: (id: string, status: DisputeStatus) => Promise<void>;
}

export function useAdminData(): AdminData {
  const { user, isAdmin } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    const [txRes, dispRes, profRes, wdRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("disputes")
        .select("*, transactions(item_name, amount, reference_code)")
        .order("created_at", { ascending: false }),

      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("withdrawal_requests")
        .select("*, bank_accounts(bank_name, account_number, account_name)")
        .order("created_at", { ascending: false }),
    ]);

    const allProfiles = profRes.data ?? [];

    // Enrich withdrawals with profile data (avoids a separate join)
    const enrichedWithdrawals = (wdRes.data ?? []).map((w: any) => ({
      ...w,
      profiles: allProfiles.find((p: any) => p.user_id === w.user_id) ?? null,
    }));

    setTransactions(txRes.data ?? []);
    setDisputes(dispRes.data ?? []);
    setProfiles(allProfiles);
    setWithdrawals(enrichedWithdrawals);
    setLoading(false);
  }, []);

  const updateDisputeStatus = useCallback(
    async (id: string, status: DisputeStatus) => {
      await supabase
        .from("disputes")
        .update({ status, resolved_by: user?.id } as any)
        .eq("id", id);
      await fetchAll();
    },
    [user?.id, fetchAll]
  );

useEffect(() => {
  // Define a local caller to isolate the state update logic
  const init = async () => {
    if (isAdmin) {
      await fetchAll();
    }
  };

  init();
  // We only want this to run when the Admin status changes
  // or the fetchAll identity (rarely) changes.
}, [isAdmin, fetchAll]);

  return {
    transactions,
    disputes,
    profiles,
    withdrawals,
    loading,
    refresh: fetchAll,
    updateDisputeStatus,
  };
}