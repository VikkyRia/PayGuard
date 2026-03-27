import { useState } from "react";
import {
  deliveryService,
  type DeliveryAction,
} from "@/services/delivery.service";
import { transactionService } from "@/services/transaction.service";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Truck,
  PackageCheck,
  Banknote,
  AlertTriangle,
  Pencil,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import RaiseDisputeDialog from "./RaiseDisputeDialog";

interface TransactionActionsProps {
  transaction: any;
  userId: string;
  onUpdated: () => void;
  onEditClick?: () => void; // optional — only needed where edit form is supported
}

const TransactionActions = ({
  transaction,
  userId,
  onUpdated,
  onEditClick,
}: TransactionActionsProps) => {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isSeller = userId === transaction.seller_id;
  const isBuyer = userId === transaction.buyer_id;
  const isPending = transaction.status === "pending_payment";
  const inspectionExpired =
    transaction.inspection_deadline &&
    new Date(transaction.inspection_deadline) < new Date();

  const handleAction = async (action: DeliveryAction) => {
    setLoading(true);
    try {
      await deliveryService.performAction(transaction.id, action);
      toast.success(deliveryService.getActionMessage(action));
      onUpdated();
    } catch (err: any) {
      toast.error("Action failed", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    const reason = window.prompt(
      "Reason for cancelling this transaction (optional):",
    );
    if (reason === null) return; // user dismissed the prompt

    setDeleting(true);
    try {
      await transactionService.cancelTransaction(
        transaction.id,
        reason || "No reason provided",
      );
      toast.success("Transaction cancelled");
      onUpdated();
    } catch (err: any) {
      toast.error("Could not cancel", { description: err.message });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
        <Loader2 className="h-3 w-3 animate-spin" /> Updating transaction...
      </div>
    );
  }

  const canDispute =
    (isBuyer || isSeller) &&
    ["funded", "shipped", "delivered", "inspection"].includes(
      transaction.status,
    );

  return (
    <div className="flex gap-2 flex-wrap items-center">
      {/* SELLER — pending only */}
      {isSeller && isPending && (
        <>
          {onEditClick && (
            <Button
              size="sm"
              variant="outline"
              onClick={onEditClick}
              className="h-8 font-display font-bold"
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={deleting}
            className="h-8 font-display font-bold text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            {deleting ? (
              <>
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />{" "}
                Cancelling...
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5 mr-1.5" /> Cancel
              </>
            )}
          </Button>
        </>
      )}

      {/* SELLER — ship item */}
      {isSeller && transaction.status === "funded" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction("mark_shipped")}
          className="h-8 font-display font-bold"
        >
          <Truck className="h-3.5 w-3.5 mr-1.5" /> Ship Item
        </Button>
      )}

      {/* BUYER — confirm receipt */}
      {isBuyer && transaction.status === "shipped" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction("confirm_delivery")}
          className="h-8 font-display font-bold"
        >
          <PackageCheck className="h-3.5 w-3.5 mr-1.5" /> Confirm Receipt
        </Button>
      )}

      {/* BUYER — release funds */}
      {isBuyer &&
        ["inspection", "shipped", "delivered"].includes(transaction.status) && (
          <Button
            size="sm"
            onClick={() => handleAction("release_funds")}
            className="h-8 bg-primary hover:bg-primary/90 font-display font-bold"
          >
            <Banknote className="h-3.5 w-3.5 mr-1.5" /> Release Funds
          </Button>
        )}

      {/* BOTH — raise dispute */}
      {canDispute && transaction.status !== "disputed" && (
        <RaiseDisputeDialog
          transaction={transaction}
          onDisputeRaised={onUpdated}
        />
      )}

      {/* STATUS INFO — inspection countdown */}
      {transaction.status === "inspection" &&
        transaction.inspection_deadline && (
          <div className="flex items-center gap-2 px-3 py-1 bg-secondary/10 rounded-full border border-secondary/20">
            {inspectionExpired ? (
              <span className="text-[10px] font-bold text-destructive uppercase flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Auto-Release Pending
              </span>
            ) : (
              <span className="text-[10px] font-bold text-secondary uppercase">
                ⏳{" "}
                {Math.ceil(
                  (new Date(transaction.inspection_deadline).getTime() -
                    Date.now()) /
                    3600000,
                )}
                h left to inspect
              </span>
            )}
          </div>
        )}
    </div>
  );
};

export default TransactionActions;
