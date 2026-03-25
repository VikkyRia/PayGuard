import { useState } from "react";
import { withdrawalService } from "@/services/adminWithdrawal.service";
import type { WithdrawalStatus } from "@/services/adminWithdrawal.service";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, Banknote, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const withdrawalStatusColors: Record<string, string> = {
  pending: "bg-secondary/15 text-secondary border border-secondary/30",
  processing: "bg-primary/15 text-primary border border-primary/30",
  completed:
    "bg-[hsl(160,60%,45%)]/15 text-[hsl(160,60%,45%)] border border-[hsl(160,60%,45%)]/30",
  failed: "bg-destructive/15 text-destructive border border-destructive/30",
};

interface WithdrawalManagementProps {
  withdrawals: any[];
  loading: boolean;
  onRefresh: () => void;
}

const WithdrawalManagement = ({
  withdrawals,
  loading,
  onRefresh,
}: WithdrawalManagementProps) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleUpdate = async (
    id: string,
    status: WithdrawalStatus,
    withdrawalData?: any,
  ) => {
    setProcessingId(id);
    try {
      await withdrawalService.updateStatus(id, status, withdrawalData);

      const message =
        status === "completed"
          ? "approved"
          : status === "failed"
            ? "rejected"
            : "updated";
      toast.success(`Withdrawal ${message} successfully!`);
      onRefresh();
    } catch (err: any) {
      toast.error("Operation failed", { description: err.message });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  if (withdrawals.length === 0) {
    return (
      <div className="bg-card rounded-xl p-8 border border-border text-center text-muted-foreground">
        <Banknote className="h-8 w-8 mx-auto mb-3 opacity-50" />
        <p>No withdrawal requests yet.</p>
      </div>
    );
  }

  const pendingCount = withdrawals.filter(
    (w) => w.status === "pending" || w.status === "processing",
  ).length;

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-secondary" />
          <p className="text-sm text-foreground font-medium">
            {pendingCount} withdrawal{pendingCount > 1 ? "s" : ""} awaiting
            action
          </p>
        </div>
      )}

      {withdrawals.map((w) => (
        <div key={w.id} className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-display text-lg font-bold text-foreground">
                ₦{Number(w.amount).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Requested {new Date(w.created_at).toLocaleDateString()} at{" "}
                {new Date(w.created_at).toLocaleTimeString()}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${withdrawalStatusColors[w.status] || ""}`}
            >
              {w.status}
            </span>
          </div>

          {/* User Info */}
          <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-muted/30 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                User
              </p>
              <p className="text-sm font-medium text-foreground mt-1">
                {w.profiles?.display_name || "Unknown"}
              </p>
              <p className="text-xs text-muted-foreground">
                {w.profiles?.email || ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Bank Details
              </p>
              <p className="text-sm font-medium text-foreground mt-1">
                {w.bank_accounts?.bank_name || "N/A"}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {w.bank_accounts?.account_number || ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {w.bank_accounts?.account_name || ""}
              </p>
            </div>
          </div>

          {w.processed_at && (
            <p className="text-xs text-muted-foreground mb-4">
              Processed: {new Date(w.processed_at).toLocaleDateString()} at{" "}
              {new Date(w.processed_at).toLocaleTimeString()}
            </p>
          )}

          {/* Actions */}
          {(w.status === "pending" || w.status === "processing") && (
            <div className="flex gap-2 flex-wrap">
              {w.status === "pending" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={processingId === w.id}
                  onClick={() => handleUpdate(w.id, "processing")}
                >
                  {processingId === w.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Clock className="h-4 w-4 mr-1" />
                  )}
                  Mark Processing
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="default"
                    disabled={processingId === w.id}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve & Complete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Confirm Withdrawal Approval
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Confirm that ₦{Number(w.amount).toLocaleString()} has been
                      transferred to {w.bank_accounts?.account_name} at{" "}
                      {w.bank_accounts?.bank_name} (
                      {w.bank_accounts?.account_number}). This action cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleUpdate(w.id, "completed", w)}
                    >
                      Confirm Transfer Complete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                    disabled={processingId === w.id}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reject Withdrawal?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reject the withdrawal of ₦
                      {Number(w.amount).toLocaleString()} and return the funds
                      to the user's wallet balance.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => handleUpdate(w.id, "failed", w)}
                    >
                      Reject & Refund
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default WithdrawalManagement;
