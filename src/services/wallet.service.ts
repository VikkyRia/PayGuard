// src/services/wallet.service.ts
import { supabase } from "@/integrations/supabase/client";

export const walletService = {
  // Fetch all initial data at once
  async getWalletDashboard(userId: string) {
    const [wallet, txs, banks] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      supabase.from("bank_accounts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);

    return {
      wallet: wallet.data,
      transactions: txs.data || [],
      bankAccounts: banks.data || [],
    };
  },

  async addBankAccount(userId: string, data: { bank_name: string; account_number: string; account_name: string }, isDefault: boolean) {
    const { error } = await supabase.from("bank_accounts").insert({
      user_id: userId,
      ...data,
      is_default: isDefault,
    });
    if (error) throw error;
  },

  async deleteBankAccount(id: string) {
    const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
    if (error) throw error;
  },

  async requestWithdrawal(userId: string, walletId: string, bankAccountId: string, amount: number) {
    const { error } = await supabase.from("withdrawal_requests").insert({
      user_id: userId,
      wallet_id: walletId,
      bank_account_id: bankAccountId,
      amount,
    });
    if (error) throw error;
  }
};