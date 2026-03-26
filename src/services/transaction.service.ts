import { supabase } from "@/integrations/supabase/client";

export const transactionService = {

  // Edit transaction — only allowed when status is pending_payment
  async editTransaction(
    transactionId: string,
    updates: { item_name?: string; item_description?: string }
  ) {
    // First check the status
    const { data: tx, error: fetchError } = await supabase
      .from("transactions")
      .select("status, seller_id")
      .eq("id", transactionId)
      .maybeSingle();

    if (fetchError || !tx) throw new Error("Transaction not found");
    if (tx.status !== "pending_payment") {
      throw new Error("Transaction can only be edited before a buyer has paid");
    }

    const { data, error } = await supabase
      .from("transactions")
      .update({
        ...updates,
        last_edited_at: new Date().toISOString(),
      })
      .eq("id", transactionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Cancel transaction — only allowed when status is pending_payment
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
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason,
      })
      .eq("id", transactionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Add tracking number after shipping
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
      .update({
        tracking_number: trackingNumber,
        status: "shipped",
      })
      .eq("id", transactionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Confirm delivery — buyer confirms they received the item
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
      .update({
        status: "completed",
        inspection_deadline: new Date().toISOString(),
      })
      .eq("id", transactionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Raise a dispute
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

    // Freeze the transaction
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
