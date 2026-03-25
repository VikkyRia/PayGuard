// src/services/transaction.service.ts - file path
import { supabase } from "@/integrations/supabase/client";

export const transactionService = {
  // Check KYC status
  async getUserVerification(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("bvn_verified, nin_verified")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Create transaction and return the shareable link
  async createTransaction(userId: string, formData: { itemName: string; itemDescription: string; amount: number }) {
    const fee = Math.min(formData.amount * 0.015, 5000);

    // Insert the transaction
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        seller_id: userId,
        buyer_id: userId, // placeholder
        item_name: formData.itemName,
        item_description: formData.itemDescription || null,
        amount: formData.amount,
        fee: fee,
      })
      .select()
      .single();

    if (error) throw error;

    //  Generate and update the shareable link
    const publishedOrigin = import.meta.env.VITE_SITE_URL || "https://pvc-eta.vercel.app";  //change later to the site host daomain
    const link = `${publishedOrigin}/pay/${data.id}`;
    
    const { error: updateError } = await supabase
      .from("transactions")
      .update({ shareable_link: link })
      .eq("id", data.id);

    if (updateError) throw updateError;

    return link;
  }
};