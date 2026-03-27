import { useState } from "react";
import { transactionService } from "@/services/transaction.service";
import { toast } from "sonner";

export function useTransactionActions(refresh: () => Promise<void>) {
  const [loading, setLoading] = useState(false);

  const editTransaction = async (
    transactionId: string,
    updates: { item_name?: string; item_description?: string }
  ) => {
    try {
      setLoading(true);
      await transactionService.editTransaction(transactionId, updates);
      await refresh();
      toast.success("Transaction updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Could not edit transaction");
    } finally {
      setLoading(false);
    }
  };

  const cancelTransaction = async (transactionId: string, reason: string) => {
    try {
      setLoading(true);
      await transactionService.cancelTransaction(transactionId, reason);
      await refresh();
      toast.success("Transaction cancelled successfully");
    } catch (err: any) {
      toast.error(err.message || "Could not cancel transaction");
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
      toast.success("Tracking number added. Buyer has been notified");
    } catch (err: any) {
      toast.error(err.message || "Could not add tracking number");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelivery = async (transactionId: string) => {
    try {
      setLoading(true);
      await transactionService.confirmDelivery(transactionId);
      await refresh();
      toast.success("Delivery confirmed. Funds released to seller");
    } catch (err: any) {
      toast.error(err.message || "Could not confirm delivery");
    } finally {
      setLoading(false);
    }
  };

  const raiseDispute = async (
    transactionId: string,
    reason: string,
    evidenceUrls: string[] = []
  ) => {
    try {
      setLoading(true);
      await transactionService.raiseDispute(transactionId, reason, evidenceUrls);
      await refresh();
      toast.success("Dispute raised. Funds are frozen pending review");
    } catch (err: any) {
      toast.error(err.message || "Could not raise dispute");
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    editTransaction,
    cancelTransaction,
    addTrackingNumber,
    confirmDelivery,
    raiseDispute,
  };
}
