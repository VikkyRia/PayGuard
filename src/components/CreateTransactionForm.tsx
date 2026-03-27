import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/useAuth";
import { transactionService } from "@/services/transaction.service";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Link2 } from "lucide-react";

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}
const CreateTransactionForm = ({ onCreated, onCancel }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [shareableLink, setShareableLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [profile, setProfile] = useState<{
    bvn_verified: boolean;
    nin_verified: boolean;
  } | null>(null);

  const [form, setForm] = useState({
    itemName: "",
    itemDescription: "",
    amount: "",
  });

  // Derived state
  const amountNum = Number(form.amount) || 0;
  const fee = Math.min(amountNum * 0.015, 5000);
  const isVerified = profile?.bvn_verified || profile?.nin_verified;
  const exceedsThreshold = amountNum > 50000 && !isVerified;

  useEffect(() => {
    if (!user) return;
    transactionService
      .getUserVerification(user.id)
      .then(setProfile)
      .catch((err) =>
        toast.error("Verification check failed", { description: err.message }),
      );
  }, [user]);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    if (exceedsThreshold) {
      toast.error("Identity Verification Required", {
        description:
          "Transactions above ₦50,000 require BVN or NIN verification.",
      });
      return;
    }

    setLoading(true);
    try {
      const getLink = await transactionService.createTransaction(user.id, {
        name: form.itemName,
        description: form.itemDescription,
        amount: amountNum,
      });

      if (!getLink) throw new Error("Failed to retrieve shareable link");

      const link = getLink.shareable_link || null; // Handle possible typo in backend
      setShareableLink(link);
      toast.success("Shareable link created!", {
        description: "You can now share this link.",
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error("Error creating transaction", {
          description: error.message,
        });
      } else {
        toast.error("Error creating transaction", {
          description: "Unknown error occurred",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (shareableLink) {
      navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (shareableLink) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Link2 className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-display text-xl font-bold text-foreground mb-2">
            Payment Link Ready!
          </h3>
          <p className="text-sm text-muted-foreground">
            Share this link with your buyer on WhatsApp, Instagram, or Twitter.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-muted rounded-xl p-3">
          <input
            readOnly
            value={shareableLink}
            className="flex-1 bg-transparent text-sm text-foreground outline-none font-mono"
          />
          <Button size="sm" variant="outline" onClick={copyLink}>
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCreated}>
            Done
          </Button>
          <Button
            className="flex-1"
            onClick={() =>
              window.open(
                `https://wa.me/?text=${encodeURIComponent(`Pay securely via PayGuard: ${shareableLink}`)}`,
                "_blank",
              )
            }
          >
            Share on WhatsApp
          </Button>
        </div>
      </div>
    );
  }

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
          onChange={(e) =>
            setForm({ ...form, itemDescription: e.target.value })
          }
          placeholder="Item details, condition, what's included..."
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="amount">Amount (₦)</Label>
        <Input
          id="amount"
          type="number"
          min="100"
          step="0.01"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          placeholder="850000"
          required
        />
        {form.amount && Number(form.amount) > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            PayGuard fee: ₦{fee.toLocaleString()} (1.5%, capped at ₦5,000)
          </p>
        )}
      </div>

      {exceedsThreshold && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
          ⚠️ Transactions above ₦50,000 require identity verification (BVN or
          NIN). Please verify your identity from the dashboard first.
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || exceedsThreshold}
          className="flex-1"
        >
          {loading ? "Creating..." : "Generate Payment Link"}
        </Button>
      </div>
    </form>
  );
};

export default CreateTransactionForm;
