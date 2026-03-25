// src/services/kyc.service.ts - file path
import { supabase } from "@/integrations/supabase/client";

export type VerificationMethod = "bvn" | "nin";

export interface KYCData {
  method: VerificationMethod;
  idNumber: string;
  firstName: string;
  lastName: string;
  dob: string;
}

export const kycService = {
  async verify(data: KYCData) {
    // Structure the body based on the method
    const body = data.method === "bvn"
      ? { 
          bvn: data.idNumber, 
          first_name: data.firstName, 
          last_name: data.lastName, 
          date_of_birth: data.dob, 
          method: "bvn" 
        }
      : { 
          nin: data.idNumber, 
          first_name: data.firstName, 
          last_name: data.lastName, 
          date_of_birth: data.dob, 
          method: "nin" 
        };

    // Call the Supabase Edge Function
    const { data: response, error } = await supabase.functions.invoke("verify-kyc", { body });

    if (error) throw error;
    if (response?.error) throw new Error(response.error);
    
    return response; // Should contain { success: boolean, message: string }
  }
};