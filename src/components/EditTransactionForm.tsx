import { useState } from "react";
import { transactionService } from "@/services/transaction.service";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Transaction {
  id: string;
  item_name: string;
  item_description?: string | null;
  amount: number;
  fee?: number;
}

interface Props {
  transaction: Transaction;
  onUpdated: () => void;
  onCancel: () => void;
}

const EditTransactionForm = ({ transaction, onUpdated, onCancel }: Props) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    itemName: transaction.item_name,
    itemDescription: transaction.item_description ?? "",
  });

  const hasChanges =
    form.itemName !== transaction.item_name ||
    form.itemDescription !== (transaction.item_description ?? "");

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!hasChanges) {
      toast.info("No changes to save.");
      return;
    }

    setLoading(true);
    try {
      await transactionService.editTransaction(transaction.id, {
        item_name: form.itemName,
        item_description: form.itemDescription,
      });

      toast.success("Transaction updated!");
      onUpdated();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error("Failed to update transaction", { description: error.message });
      } else {
        toast.error("Failed to update transaction", { description: "Unknown error occurred" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="itemName">Item / Service Name</Label>
        <Input
          id="itemName"
          value={form.itemName}
          onChange={(e) => setForm({ ...form, itemName: e.target.value })}
          placeholder="e.g. iPhone 15 Pro Max"
          required
        />
      </div>

      <div>
        <Label htmlFor="itemDescription">Description (optional)</Label>
        <Textarea
          id="itemDescription"
          value={form.itemDescription}
          onChange={(e) => setForm({ ...form, itemDescription: e.target.value })}
          placeholder="Item details, condition, what's included..."
          rows={3}
        />
      </div>

      {/* Amount is read-only — cannot be changed after creation */}
      <div>
        <Label htmlFor="amount">Amount (₦)</Label>
        <Input
          id="amount"
          value={Number(transaction.amount).toLocaleString()}
          readOnly
          disabled
          className="opacity-60 cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Amount cannot be changed after the transaction is created.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !hasChanges} className="flex-1">
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
};

export default EditTransactionForm;