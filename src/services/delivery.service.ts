// src/services/delivery.service.ts - file path
import { supabase } from "@/integrations/supabase/client";

export type DeliveryAction = "mark_shipped" | "confirm_delivery" | "release_funds";

export const deliveryService = {
  async performAction(transactionId: string, action: DeliveryAction) {
    const { data, error } = await supabase.functions.invoke("update-delivery", {
      body: { transaction_id: transactionId, action },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    return data; // Should contain success status and updated transaction state
  },

  getActionMessage(action: DeliveryAction): string {
    const messages: Record<DeliveryAction, string> = {
      mark_shipped: "Item marked as shipped! Buyer will be notified.",
      confirm_delivery: "Delivery confirmed. 48-hour inspection window started.",
      release_funds: "Funds released to seller. Transaction complete!",
    };
    return messages[action] || "Update successful";
  }
};