import { useState } from "react";
import { transactionService } from "@/services/transaction.service";
import { useToast } from "@/hooks/use-toast";

export function useTransactionActions(refresh: () => Promise<void>) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const editTransaction = async (
    transactionId: string,
    updates: { item_name?: string; item_description?: string }
  ) => {
    try {
      setLoading(true);
      await transactionService.editTransaction(transactionId, updates);
      await refresh();
      toast({
        title: "Transaction updated",
        description: "Your changes have been saved successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Could not edit transaction",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelTransaction = async (transactionId: string, reason: string) => {
    try {
      setLoading(true);
      await transactionService.cancelTransaction(transactionId, reason);
      await refresh();
      toast({
        title: "Transaction cancelled",
        description: "The transaction has been cancelled successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Could not cancel transaction",
        description: err.message,
        variant: "destructive",
      });
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
      toast({
        title: "Tracking number added",
        description: "Buyer has been notified that the item is on the way.",
      });
    } catch (err: any) {
      toast({
        title: "Could not add tracking number",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelivery = async (transactionId: string) => {
    try {
      setLoading(true);
      await transactionService.confirmDelivery(transactionId);
      await refresh();
      toast({
        title: "Delivery confirmed",
        description: "Funds have been released to the seller.",
      });
    } catch (err: any) {
      toast({
        title: "Could not confirm delivery",
        description: err.message,
        variant: "destructive",
      });
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
      toast({
        title: "Dispute raised",
        description: "Funds are frozen. Our team will review your case within 24 hours.",
      });
    } catch (err: any) {
      toast({
        title: "Could not raise dispute",
        description: err.message,
        variant: "destructive",
      });
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
