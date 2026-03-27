import { supabase } from "@/integrations/supabase/client";

export const transactionService = {

  async editTransaction(
    transactionId: string,
    updates: { item_name?: string; item_description?: string }
  ) {
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

  async cancelTransaction(transactionId: string, reason: string) {
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

  async addTrackingNumber(transactionId: string, trackingNumber: string) {
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
      .update({ status: "shipped" })
      .eq("id", transactionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async confirmDelivery(transactionId: string) {
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

  async raiseDispute(
    transactionId: string,
    reason: string,
    evidenceUrls: string[] = []
  ) {
    const { data: tx, error: fetchError } = await supabase
      .from("transactions")
      .select("status, buyer_id")
      .eq("id", transactionId)
      .maybeSingle();

    if (fetchError || !tx) throw new Error("Transaction not found");
    if (tx.status === "completed" || tx.status === "cancelled") {
      throw new Error("Cannot raise a dispute on a completed or cancelled transaction");
    }

    if (!tx.buyer_id) throw new Error("No buyer found on this transaction");

    await supabase
      .from("transactions")
      .update({ status: "disputed" })
      .eq("id", transactionId);

    const { data, error } = await supabase
      .from("disputes")
      .insert({
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
