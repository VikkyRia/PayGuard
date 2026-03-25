// src/components/ShippingTracker.tsx
import { useState, useEffect, useRef } from "react";
import { shippingService } from "@/services/shipping.service";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client"; // needed for Realtime
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, Package, MapPin, CheckCircle2, Upload } from "lucide-react";
import { toast } from "sonner";

interface ShippingTrackerProps {
  transaction: any;
  onUpdated?: () => void;
}

const ShippingTracker = ({ transaction, onUpdated }: ShippingTrackerProps) => {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ status: "", note: "" });

  // --- DERIVED LOGIC (Keep in component) ---
  const isSeller = user?.id === transaction.seller_id;
  const isBuyer = user?.id === transaction.buyer_id;

  const statusOptions = isSeller
    ? [
        { value: "packed", label: "Item Packed", icon: Package },
        { value: "shipped", label: "Shipped / Dispatched", icon: MapPin },
        { value: "in_transit", label: "In Transit", icon: MapPin },
      ]
    : [
        { value: "received", label: "Item Received", icon: CheckCircle2 },
        { value: "inspecting", label: "Inspecting Item", icon: Camera },
        { value: "issue_found", label: "Issue Found", icon: Camera },
      ];

  const fetchUpdates = async () => {
    try {
      const data = await shippingService.getUpdates(transaction.id);
      setUpdates(data);
    } catch (err: any) {
      toast.error("Could not load updates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
    const channel = supabase
      .channel(`shipping-${transaction.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "shipping_updates",
        filter: `transaction_id=eq.${transaction.id}`,
      }, () => fetchUpdates())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [transaction.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be under 5MB");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !form.status) return;

    setSubmitting(true);
    try {
      await shippingService.postUpdate({
        transactionId: transaction.id,
        userId: user.id,
        status: form.status,
        note: form.note,
        photoFile: photoFile,
      });

      toast.success("Shipping update added");
      setForm({ status: "", note: "" });
      setPhotoFile(null);
      setPhotoPreview(null);
      setShowForm(false);
      onUpdated?.();
    } catch (err: any) {
      toast.error("Failed to post update", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isSeller && !isBuyer) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Shipping & Tracking
        </h3>
        {(isSeller || isBuyer) && !["completed", "cancelled", "refunded"].includes(transaction.status) && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
            <Camera className="h-4 w-4 mr-1" /> Add Update
          </Button>
        )}
      </div>

      {/* Tracking info */}
      {(transaction.tracking_number || transaction.courier_name) && (
        <div className="bg-muted/50 rounded-xl p-3 mb-4 flex flex-wrap gap-4">
          {transaction.courier_name && (
            <div>
              <p className="text-xs text-muted-foreground">Courier</p>
              <p className="text-sm font-medium text-foreground">{transaction.courier_name}</p>
            </div>
          )}
          {transaction.tracking_number && (
            <div>
              <p className="text-xs text-muted-foreground">Tracking #</p>
              <p className="text-sm font-mono font-medium text-foreground">{transaction.tracking_number}</p>
            </div>
          )}
        </div>
      )}

      {/* Add update form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-muted/30 rounded-xl p-4 mb-4 space-y-3">
          <div>
            <Label>Status Update</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {statusOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, status: opt.value })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all ${
                      form.status === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Note (optional)</Label>
            <Textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Add details about this update..."
              rows={2}
            />
          </div>

          <div>
            <Label>Photo Proof (optional)</Label>
            <div className="mt-1">
              {photoPreview ? (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-border">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    className="absolute top-1 right-1 bg-background/80 rounded-full p-1 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Upload photo
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={submitting || !form.status}>
              {submitting ? "Posting..." : "Post Update"}
            </Button>
          </div>
        </form>
      )}

      {/* Timeline */}
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading updates...</p>
      ) : updates.length === 0 ? (
        <p className="text-xs text-muted-foreground">No shipping updates yet. The seller will post updates once the item is shipped.</p>
      ) : (
        <div className="space-y-0">
          {updates.map((u, i) => (
            <div key={u.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                </div>
                {i < updates.length - 1 && <div className="w-0.5 flex-1 bg-border" />}
              </div>
              <div className="pb-4 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground capitalize">{u.status.replace(/_/g, " ")}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleString("en-NG", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                {u.note && <p className="text-xs text-muted-foreground mt-0.5">{u.note}</p>}
                {u.photo_url && (
                  <a href={u.photo_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                    <img
                      src={u.photo_url}
                      alt="Delivery photo"
                      className="w-40 h-28 object-cover rounded-lg border border-border hover:opacity-90 transition-opacity"
                    />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShippingTracker;
