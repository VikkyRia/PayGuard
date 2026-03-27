import { supabase } from "@/integrations/supabase/client";

const baseUrl = import.meta.env.VITE_SITE_URL ? import.meta.env.VITE_SITE_URL : "https://pay-guard-xi.vercel.app/";

export type TransactionInsert = {
  seller_id: string;
  item_name: string;
  item_description?: string | null;
  amount: number;
  transaction_status?: string;
};

export const transactionService = {
  getUserVerification: async (userId: string): Promise<{ bvn_verified: boolean; nin_verified: boolean }> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("bvn_verified, nin_verified")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) throw new Error("Could not fetch verification status");
    return data;
  },

  createTransaction: async (userid: string, itemDetails: { name: string; description: string; amount: number }) => {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("user_id", userid)
      .maybeSingle();

    if (profileError || !profile) throw new Error("Profile not found");
    if (profile.user_type !== "seller") {
      throw new Error("Only sellers can create transactions");
    }

    const { data: transaction, error: insertError } = await supabase
      .from("transactions")
      .insert({
        seller_id: userid,
        item_name: itemDetails.name,
        item_description: itemDetails.description,
        amount: itemDetails.amount,
        status: "pending_payment",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const shareable_link = `${baseUrl}/pay/${transaction.id}`;

    const { data: shareableLink, error: updateError } = await supabase
      .from("transactions")
      .update({ shareable_link })
      .eq("id", transaction.id)
      .select("shareable_link")
      .single();

    if (updateError) throw updateError;

    return shareableLink;
  },

  editTransaction: async (
    transactionId: string,
    updates: { item_name?: string; item_description?: string }
  ) => {
    const { data: tx, error: fetchError } = await supabase
      .from("transactions")
      .select("status")
      .eq("id", transactionId)
      .maybeSingle();

    if (fetchError || !tx) throw new Error("Transaction not found");
    if (tx.status !== "pending_payment") {
      throw new Error("Transaction can only be edited before a buyer has paid");
    }

    const { data, error } = await supabase
      .from("transactions")
      .update({ ...updates })
      .eq("id", transactionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  cancelTransaction: async (transactionId: string, reason: string) => {
    const { data: tx, error: fetchError } = await supabase
      .from("transactions")
      .select("status")
      .eq("id", transactionId)
      .maybeSingle();

    if (fetchError || !tx) throw new Error("Transaction not found");
    if (tx.status !== "pending_payment") {
      throw new Error("Transaction can only be cancelled before a buyer has paid");
    }

    const { data, error } = await supabase
      .from("transactions")
      .update({ status: "cancelled" })
      .eq("id", transactionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  addTrackingNumber: async (transactionId: string, trackingNumber: string) => {
    const { data: tx, error: fetchError } = await supabase
      .from("transactions")
      .select("status")
      .eq("id", transactionId)
      .maybeSingle();

    if (fetchError || !tx) throw new Error("Transaction not found");
    if (tx.status !== "funded") {
      throw new Error("You can only add tracking after payment is confirmed");
    }

    const { data, error } = await supabase
      .from("transactions")
      .update({ status: "shipped", tracking_number: trackingNumber })
      .eq("id", transactionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  confirmDelivery: async (transactionId: string) => {
    const { data: tx, error: fetchError } = await supabase
      .from("transactions")
      .select("status")
      .eq("id", transactionId)
      .maybeSingle();

    if (fetchError || !tx) throw new Error("Transaction not found");
    if (tx.status !== "shipped" && tx.status !== "inspection") {
      throw new Error("Item must be shipped before delivery can be confirmed");
    }

    const { data, error } = await supabase
      .from("transactions")
      .update({ status: "completed" })
      .eq("id", transactionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  raiseDispute: async (
    transactionId: string,
    reason: string,
    evidenceUrls: string[] = []
  ) => {
    const { data: tx, error: fetchError } = await supabase
      .from("transactions")
      .select("status, buyer_id")
      .eq("id", transactionId)
      .maybeSingle();

    if (fetchError || !tx || !tx.buyer_id) throw new Error("Transaction or buyer not found");
    if (["completed", "cancelled", "disputed"].includes(tx.status)) {
      throw new Error("Cannot raise a dispute on a completed, cancelled, or disputed transaction");
    }

    // Update transaction status
    await supabase
      .from("transactions")
      .update({ status: "disputed" })
      .eq("id", transactionId);

    // Create dispute ticket
    const { data, error } = await supabase
      .from("disputes")
      .insert({
        transaction_id: transactionId,
        raised_by: tx.buyer_id,
        reason,
        evidence_urls: evidenceUrls,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};