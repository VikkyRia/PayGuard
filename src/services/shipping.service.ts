// src/services/shipping.service.ts
import { supabase } from "@/integrations/supabase/client";

export interface ShippingUpdateData {
  transactionId: string;
  userId: string;
  status: string;
  note?: string;
  photoFile?: File | null;
}

export const shippingService = {
  // Fetch all updates for a transaction
  async getUpdates(transactionId: string) {
    const { data, error } = await supabase
      .from("shipping_updates")
      .select("*")
      .eq("transaction_id", transactionId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Upload photo and post update
  async postUpdate(data: ShippingUpdateData) {
    let photoUrl: string | null = null;

    // Handle Photo Upload if exists
    if (data.photoFile) {
      const ext = data.photoFile.name.split(".").pop();
      const path = `${data.transactionId}/${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from("delivery-photos")
        .upload(path, data.photoFile);

      if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage
        .from("delivery-photos")
        .getPublicUrl(path);

      photoUrl = urlData.publicUrl;
    }

    // Insert Shipping Update Row
    const { error: insertError } = await supabase.from("shipping_updates").insert({
      transaction_id: data.transactionId,
      user_id: data.userId,
      status: data.status,
      note: data.note || null,
      photo_url: photoUrl,
    });

    if (insertError) throw insertError;

    return { success: true };
  }
};