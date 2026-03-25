import { useState } from "react";
import { disputeService } from "@/services/dispute.service"; // Import service
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

interface RaiseDisputeDialogProps {
  transaction: {
    id: string;
    item_name: string;
    amount: number;
    reference_code: string;
  };
  onDisputeRaised: () => void;
}

const RaiseDisputeDialog = ({ transaction, onDisputeRaised }: RaiseDisputeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [loading, setLoading] = useState(false);

  // UI-only logic: Adding a URL to the local list
  const addEvidenceUrl = () => {
    const trimmed = newUrl.trim();
    if (trimmed && !evidenceUrls.includes(trimmed)) {
      setEvidenceUrls(prev => [...prev, trimmed]);
      setNewUrl("");
    }
  };

  const removeUrl = (url: string) => {
    setEvidenceUrls(prev => prev.filter((u) => u !== url));
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      toast.error("Please provide a reason for the dispute");
      return;
    }

    setLoading(true);
    try {
      await disputeService.raiseDispute({
        transactionId: transaction.id,
        reason: reason,
        evidenceUrls: evidenceUrls,
      });

      toast.success("Dispute raised successfully", {
        description: "Our team will review your claim within 24 hours."
      });
      
      // Reset and close
      setOpen(false);
      setReason("");
      setEvidenceUrls([]);
      onDisputeRaised();
    } catch (err: any) {
      toast.error("Failed to raise dispute", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="text-xs h-7">
          <AlertTriangle className="h-3 w-3 mr-1" /> Dispute
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Raise a Dispute
          </DialogTitle>
          <DialogDescription>
            Report an issue with transaction <span className="font-mono">{transaction.reference_code}</span> for{" "}
            <span className="font-semibold">{transaction.item_name}</span> (₦{Number(transaction.amount).toLocaleString()})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="reason" className="text-sm font-medium">
              What went wrong? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the issue in detail. E.g., 'Item received is different from description' or 'Item never arrived'"
              className="mt-1 min-h-25"
              required
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Evidence URLs (optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Add links to screenshots, photos, or videos supporting your claim
            </p>
            <div className="flex gap-2">
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://imgur.com/..."
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addEvidenceUrl}>
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            {evidenceUrls.length > 0 && (
              <div className="mt-2 space-y-1">
                {evidenceUrls.map((url) => (
                  <div key={url} className="flex items-center gap-2 text-xs bg-muted px-2 py-1 rounded">
                    <span className="truncate flex-1">{url}</span>
                    <button
                      type="button"
                      onClick={() => removeUrl(url)}
                      className="text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">What happens next?</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>The transaction will be put on hold</li>
              <li>Our team will review within 24 hours</li>
              <li>Both parties may be asked for additional evidence</li>
              <li>Resolution will be fair based on the evidence provided</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="destructive" disabled={loading || !reason.trim()} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...
                </>
              ) : (
                "Raise Dispute"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RaiseDisputeDialog;
