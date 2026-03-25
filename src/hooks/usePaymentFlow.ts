import { paymentService } from "@/services/payment.service";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function usePaymentFlow(transactionId: string | undefined) {
  const [status, setStatus] = useState<"idle" | "paying" | "confirming" | "success" | "error">("idle");
  const [iswParams, setIswParams] = useState<any>(null);

  const startPayment = useCallback(async () => {
    if (!transactionId) {
      toast.error("Transaction ID is missing");
      return;
    }
    
    setStatus("paying");
    try {
      const params = await paymentService.initiateCheckout(transactionId);
      // We set the params which will trigger the hidden form to submit
      setIswParams(params);
    } catch (err: any) {
      setStatus("error");
      toast.error(err.message || "Failed to initiate payment");
    }
  }, [transactionId]);

  const confirm = useCallback(async (txnRef: string, resp: string) => {
    if (!transactionId) return;
    
    setStatus("confirming");
    try {
      const data = await paymentService.verifyPayment(transactionId, txnRef, resp);
      if (data?.success) {
        setStatus("success");
        toast.success("Payment confirmed!");
      } else {
        throw new Error("Verification failed");
      }
    } catch (err) {
      setStatus("error");
      toast.error("Payment verification failed. Please contact support.");
    }
  }, [transactionId]);

  // Useful for allowing the user to try again after a failure
  const reset = useCallback(() => {
    setStatus("idle");
    setIswParams(null);
  }, []);

  return { 
    status, 
    iswParams, 
    startPayment, 
    confirm, 
    reset 
  };
}

