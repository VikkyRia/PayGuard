// src/services/withdrawalService.ts -file path
import { supabase } from "@/integrations/supabase/client";

export type WithdrawalStatus = "processing" | "completed" | "failed";

export const withdrawalService = {
  async updateStatus(id: string, status: WithdrawalStatus, withdrawal?: any) {
    const updateData: any = { 
      status, 
      processed_at: (status === "completed" || status === "failed") ? new Date().toISOString() : null 
    };

    //  Update the main status
    const { error: updateError } = await supabase
      .from("withdrawal_requests")
      .update(updateData)
      .eq("id", id);
    
    if (updateError) throw updateError;

    //  Handle Refund Logic if failed
    if (status === "failed" && withdrawal?.wallet_id && withdrawal?.amount) {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance, total_withdrawn")
        .eq("id", withdrawal.wallet_id)
        .single();

      if (wallet) {
        await supabase.from("wallets").update({
          balance: Number(wallet.balance) + Number(withdrawal.amount),
          total_withdrawn: Math.max(0, Number(wallet.total_withdrawn) - Number(withdrawal.amount)),
        }).eq("id", withdrawal.wallet_id);
      }
    }

    // 3. Trigger Notifications (Fire and forget)
    if (withdrawal?.user_id && (status === "completed" || status === "failed")) {
      const notifEvent = status === "completed" ? "withdrawal_approved" : "withdrawal_rejected";
      supabase.functions.invoke("send-notification", {
        body: {
          event: notifEvent,
          user_id: withdrawal.user_id,
          extra: { amount: withdrawal.amount },
        },
      }).catch(console.error);
    }

    return { success: true };
  }
};