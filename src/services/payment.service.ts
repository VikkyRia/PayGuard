import { supabase } from "@/integrations/supabase/client";

export const paymentService = {
  async initiateCheckout(transactionId: string) {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        transaction_id: transactionId,
        redirect_url: `${window.location.origin}/pay/${transactionId}`,
      },
    });
    if (error) throw error;
    return data; // Returns Interswitch params
  },

  async verifyPayment(transactionId: string, txnRef: string, resp: string) {
    const { data, error } = await supabase.functions.invoke("confirm-payment", {
      body: { transaction_id: transactionId, txn_ref: txnRef, resp },
    });
    if (error) throw error;
    return data;
  }
};