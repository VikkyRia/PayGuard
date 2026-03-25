// src/services/dispute.service.ts -file path
import { supabase } from "@/integrations/supabase/client";

export interface DisputeData {
  transactionId: string;
  reason: string;
  evidenceUrls: string[];
}

export const disputeService = {
  async raiseDispute(data: DisputeData) {
    const { data: response, error } = await supabase.functions.invoke("raise-dispute", {
      body: {
        transaction_id: data.transactionId,
        reason: data.reason.trim(),
        evidence_urls: data.evidenceUrls,
      },
    });

    if (error) throw error;
    if (response?.error) throw new Error(response.error);

    return response; // Usually { success: true, message: "..." }
  }
};