import { supabase } from "@/integrations/supabase/client";

const baseUrl = import.meta.env.VITE_SITE_URL
  ? import.meta.env.VITE_SITE_URL
  : "https://pay-guard-xi.vercel.app/";

// How long buyers have to inspect before funds auto-release (milliseconds)
const INSPECTION_HOURS = 48;

export type TransactionInsert = {
  seller_id: string;
  item_name: string;
  item_description?: string | null;
  amount: number;
  transaction_status?: string;
};

const triggerAutoRelease = async (transactionId: string) => {
  // We call the Edge Function by its name and pass the transaction ID in the body. The function will verify the transaction's current state and release funds if appropriate.
  const { data, error } = await supabase.functions.invoke('auto-release', {
    body: { transactionId }, // Pass the specific ID to release
  });

  if (error) throw new Error(`Edge Function failed: ${error.message}`);
  return data;
};

export const transactionService = {
  // Seller: check KYC
  getUserVerification: async (
    userId: string
  ): Promise<{ bvn_verified: boolean; nin_verified: boolean }> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("bvn_verified, nin_verified")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) throw new Error("Could not fetch verification status");
    return data;
  },

  // Seller: create transaction & shareable link 
  createTransaction: async (
    userid: string,
    itemDetails: { name: string; description: string; amount: number }
  ) => {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("user_id", userid)
      .maybeSingle();

    if (profileError || !profile) throw new Error("Profile not found");
    if (profile.user_type !== "seller")
      throw new Error("Only sellers can create transactions");

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

  //  Seller: edit (only while pending_payment) 
  editTransaction: async (
    transactionId: string,
    updates: { item_name?: string; item_description?: string }
  ) => {
    const { data: tx, error: fetchError } = await supabase
      .from("transactions")
      .select("status, seller_id")
      .eq("id", transactionId)
      .maybeSingle();

    if (fetchError || !tx) throw new Error("Transaction not found");
    if (tx.status !== "pending_payment")
      throw new Error("Transaction can only be edited before a buyer has paid");

    const { data, error } = await supabase
      .from("transactions")
      .update({ ...updates, last_edited_at: new Date().toISOString() })
      .eq("id", transactionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Seller: cancel (only while pending_payment)
  cancelTransaction: async (transactionId: string, reason: string) => {
    const { data: tx, error: fetchError } = await supabase
      .from("transactions")
      .select("status")
      .eq("id", transactionId)
      .maybeSingle();

    if (fetchError || !tx) throw new Error("Transaction not found");
    if (tx.status !== "pending_payment")
      throw new Error(
        "Transaction can only be cancelled before a buyer has paid"
      );

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

  // ─── Seller: add tracking number - status: shipped ───────────────────────────
  addTrackingNumber: async (transactionId: string, trackingNumber: string) => {
    const { data: tx, error: fetchError } = await supabase
      .from("transactions")
      .select("status")
      .eq("id", transactionId)
      .maybeSingle();

    if (fetchError || !tx) throw new Error("Transaction not found");
    if (tx.status !== "funded")
      throw new Error("You can only add tracking after payment is confirmed");

    const { data, error } = await supabase
      .from("transactions")
      .update({ tracking_number: trackingNumber, status: "shipped" })
      .eq("id", transactionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ─── Buyer: confirm physical receipt - status: delivered then inspection ──────
  //
  //   Flow: shipped - delivered - inspection
  //   We set status to "inspection" immediately and stamp the deadline.
  //   The "delivered" status is a transient step stored on the way in so the
  //   seller gets a clear "item received" signal before inspection starts.
  //
  confirmReceipt: async (transactionId: string) => {
    const { data: tx, error: fetchError } = await supabase
      .from("transactions")
      .select("status")
      .eq("id", transactionId)
      .maybeSingle();

    if (fetchError || !tx) throw new Error("Transaction not found");
    if (tx.status !== "shipped")
      throw new Error("Item must be shipped before you can confirm receipt");

    const inspectionDeadline = new Date(
      Date.now() + INSPECTION_HOURS * 60 * 60 * 1000
    ).toISOString();

    // Two-step: mark delivered first so the event is visible in history,
    // then immediately move to inspection.
    await supabase
      .from("transactions")
      .update({ status: "delivered" })
      .eq("id", transactionId);

    const { data, error } = await supabase
      .from("transactions")
      .update({
        status: "inspection",
        inspection_deadline: inspectionDeadline,
      })
      .eq("id", transactionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  //  Buyer: confirm delivery satisfaction → status: completed 
  //   Called when the buyer is happy with the item during the inspection window.
  //   Also called automatically if the inspection deadline has passed (server-side
  //   edge function should handle this, but we also check client-side on load).
  confirmDelivery: async (transactionId: string) => {
    const { data: tx, error: fetchError } = await supabase
      .from("transactions")
      .select("status, inspection_deadline")
      .eq("id", transactionId)
      .maybeSingle();

    if (fetchError || !tx) throw new Error("Transaction not found");
    if (tx.status !== "inspection")
      throw new Error(
        "You can only confirm delivery during the inspection window"
      );

    return await triggerAutoRelease(transactionId);
  },

// Auto-complete if inspection deadline has passed 

  autoCompleteIfExpired: async (transactionId: string) => {
    const { data: tx, error: fetchError } = await supabase
      .from("transactions")
      .select("status, inspection_deadline")
      .eq("id", transactionId)
      .maybeSingle();

    if (fetchError || !tx) return null;
    if (tx.status !== "inspection") return null;
    if (!tx.inspection_deadline) return null;

    const expired = new Date(tx.inspection_deadline) < new Date();
    if (!expired) return null;

    // If expired, trigger the secure server-side release
      return await triggerAutoRelease(transactionId);
  },

  // ─── Buyer or Seller: raise a dispute
  raiseDispute: async (
    transactionId: string,
    raisedBy: string,
    reason: string,
    evidenceUrls: string[] = []
  ) => {
    const { data: tx, error: fetchError } = await supabase
      .from("transactions")
      .select("status")
      .eq("id", transactionId)
      .maybeSingle();

    if (fetchError || !tx) throw new Error("Transaction not found");
    if (
      tx.status === "completed" ||
      tx.status === "cancelled" ||
      tx.status === "disputed"
    ) {
      throw new Error(
        "Cannot raise a dispute on a completed, cancelled, or already disputed transaction"
      );
    }

    await supabase
      .from("transactions")
      .update({ status: "disputed" })
      .eq("id", transactionId);

    const { data, error } = await supabase
      .from("disputes")
      .insert({
        transaction_id: transactionId,
        raised_by: raisedBy,
        reason,
        evidence_urls: evidenceUrls,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};