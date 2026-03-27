import { supabase } from "@/integrations/supabase/client";
const baseUrl = import.meta.env.VITE_SITE_URL  ? import.meta.env.VITE_SITE_URL : "https://pay-guard-xi.vercel.app/"
// type Profile = {
//   id: string;
//   user_type: "seller" | "buyer" | string;
//   // other profile columns...
// };



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
    // 1. Check if user is a seller
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("user_id", userid)
      .maybeSingle();

    if (profileError || !profile) throw new Error("Profile not found");
    if (profile.user_type !== "seller") {
      throw new Error("Only sellers can create transactions");
    }

    // 2. Create the initial transaction record
    const { data: transaction, error: insertError } = await supabase
      .from("transactions")
      .insert({
        seller_id: userid,
        item_name: itemDetails.name,
        item_description: itemDetails.description,
        amount: itemDetails.price,
        status: "pending_payment", // will be set when a buyer pays
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 3. Form the payment link
    // Assuming your payment page route is /pay/:id
   
    const shareable_link = `${baseUrl}/pay/${transaction.id}`;

    // 4. Save the link back to the database
    const { data:shareableLink, error: updateError } = await supabase
      .from("transactions")
      .update({ shareable_link })
      .eq("id", transaction.id)
      .select("shareable_link")
      .single();

    if (updateError) throw updateError;

    return shareableLink;
  },

  // Edit transaction — only allowed when status is pending_payment
  editTransaction: async (
    transactionId: string,
    updates: { item_name?: string; item_description?: string }
  ) => {
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
