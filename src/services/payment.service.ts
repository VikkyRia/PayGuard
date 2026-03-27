import { supabase } from "@/integrations/supabase/client";
const baseUrl = import.meta.env.VITE_SITE_URL  ? import.meta.env.VITE_SITE_URL : "https://pay-guard-xi.vercel.app/"
export const paymentService = {
  async initiateCheckout(transactionId: string) {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        transaction_id: transactionId,
        redirect_url: `${baseUrl}/pay/${transactionId}`,
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