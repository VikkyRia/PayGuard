import { useState } from "react";
import { transactionService } from "@/services/transaction.service";
import { toast } from "sonner";

export function useTransactionActions(refresh: () => Promise<void>) {
  const [loading, setLoading] = useState(false);

  const handleError = (title: string, err: unknown) => {
    const message =
      err instanceof Error ? err.message : "Something went wrong";
    toast.error(title, { description: message });
  };

  const editTransaction = async (
    transactionId: string,
    updates: { item_name?: string; item_description?: string }
  ) => {
    try {
      setLoading(true);
      await transactionService.editTransaction(transactionId, updates);
      await refresh();
      toast.success("Transaction updated", {
        description: "Your changes have been saved.",
      });
    } catch (err) {
      handleError("Could not update transaction", err);
    } finally {
      setLoading(false);
    }
  };

  const cancelTransaction = async (transactionId: string, reason: string) => {
    try {
      setLoading(true);
      await transactionService.cancelTransaction(transactionId, reason);
      await refresh();
      toast.success("Transaction cancelled", {
        description: "The transaction has been successfully cancelled.",
      });
    } catch (err) {
      handleError("Could not cancel transaction", err);
    } finally {
      setLoading(false);
    }
  };

  const addTrackingNumber = async (
    transactionId: string,
    trackingNumber: string
  ) => {
    try {
      setLoading(true);
      await transactionService.addTrackingNumber(transactionId, trackingNumber);
      await refresh();
      toast.success("Tracking number added", {
        description: "The buyer can now see the tracking information.",
      });
    } catch (err) {
      handleError("Could not add tracking number", err);
    } finally {
      setLoading(false);
    }
  };

  // Buyer confirms physical receipt → triggers inspection window
  const confirmReceipt = async (transactionId: string) => {
    try {
      setLoading(true);
      await transactionService.confirmReceipt(transactionId);
      await refresh();
      toast.success("Receipt confirmed", {
        description:
          "A 48-hour inspection window has started. Confirm or dispute before it expires.",
      });
    } catch (err) {
      handleError("Could not confirm receipt", err);
    } finally {
      setLoading(false);
    }
  };

  // Buyer is satisfied with item → releases funds to seller
  const confirmDelivery = async (transactionId: string) => {
    try {
      setLoading(true);
      await transactionService.confirmDelivery(transactionId);
      await refresh();
      toast.success("Delivery confirmed", {
        description: "Funds have been released to the seller. Thank you!",
      });
    } catch (err) {
      handleError("Could not confirm delivery", err);
    } finally {
      setLoading(false);
    }
  };

  // raisedBy must be the current user's id — pass it from the calling component
  const raiseDispute = async (
    transactionId: string,
    raisedBy: string,
    reason: string,
    evidenceUrls: string[] = []
  ) => {
    try {
      setLoading(true);
      await transactionService.raiseDispute(
        transactionId,
        raisedBy,
        reason,
        evidenceUrls
      );
      await refresh();
      toast.success("Dispute raised", {
        description: "The support team has been notified and will review shortly.",
      });
    } catch (err) {
      handleError("Could not raise dispute", err);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    editTransaction,
    cancelTransaction,
    addTrackingNumber,
    confirmReceipt,
    confirmDelivery,
    raiseDispute,
  };
}