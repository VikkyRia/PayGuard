import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Clock, Truck, PackageCheck, Banknote, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import TransactionActions from "@/components/TransactionActions";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import ShippingTracker from "@/components/ShippingTracker";
import ReviewForm from "@/components/ReviewForm";

const statusTimeline = [
  { status: "pending_payment", label: "Awaiting Payment", icon: Clock, color: "text-muted-foreground" },
  { status: "funded", label: "Payment Received", icon: Banknote, color: "text-primary" },
  { status: "shipped", label: "Item Shipped", icon: Truck, color: "text-secondary" },
  { status: "delivered", label: "Delivered", icon: PackageCheck, color: "text-secondary" },
  { status: "inspection", label: "Inspection Period", icon: ShieldCheck, color: "text-accent" },
  { status: "completed", label: "Completed", icon: CheckCircle2, color: "text-[hsl(160,60%,45%)]" },
];

const statusOrder = ["pending_payment", "funded", "shipped", "delivered", "inspection", "completed"];

const TransactionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tx, setTx] = useState<any>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [buyerProfile, setBuyerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [hasReviewed, setHasReviewed] = useState(false);
  const fetchData = async () => {
    if (!id) return;
    setLoading(true);

    const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", id)
      .single();

    if (txData) {
      setTx(txData);
      const [seller, buyer, reviewsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", txData.seller_id).single(),
        supabase.from("profiles").select("*").eq("user_id", txData.buyer_id).single(),
        supabase.from("reviews").select("*").eq("transaction_id", txData.id),
      ]);
      setSellerProfile(seller.data);
      setBuyerProfile(buyer.data);
      setReviews(reviewsRes.data || []);
      if (user) {
        setHasReviewed((reviewsRes.data || []).some((r: any) => r.reviewer_id === user.id));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    if (id) {
      const channel = supabase
        .channel(`tx-${id}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "transactions", filter: `id=eq.${id}` }, (payload) => {
          setTx(payload.new);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Loading...</p></div>;
  if (!tx) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Transaction not found</p></div>;

  const currentStatusIndex = statusOrder.indexOf(tx.status);
  const isDisputed = tx.status === "disputed";
  const isCancelled = ["cancelled", "refunded"].includes(tx.status);

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/85 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="font-display text-xl font-extrabold text-foreground">
            Pay<span className="text-primary">Guard</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span className="font-mono">{tx.reference_code}</span>
            <span>•</span>
            <span>{new Date(tx.created_at).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-foreground">{tx.item_name}</h1>
          {tx.item_description && <p className="text-muted-foreground mt-1">{tx.item_description}</p>}
        </div>

        {/* Amount & Actions */}
        <div className="bg-card rounded-2xl p-6 border border-border mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Amount</p>
              <p className="font-display text-4xl font-extrabold text-foreground">₦{Number(tx.amount).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Fee: ₦{Number(tx.fee).toLocaleString()}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {user && <TransactionActions transaction={tx} userId={user.id} onUpdated={fetchData} />}
              {tx.shareable_link && (
                <WhatsAppShareButton link={tx.shareable_link} itemName={tx.item_name} amount={tx.amount} />
              )}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-card rounded-2xl p-6 border border-border mb-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-6">Transaction Timeline</h2>
          
          {isDisputed && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-6 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
              <div>
                <p className="font-semibold text-destructive">Transaction Disputed</p>
                <p className="text-xs text-muted-foreground">This transaction is under review. Our team will resolve within 24 hours.</p>
              </div>
            </div>
          )}

          {isCancelled && (
            <div className="bg-muted border border-border rounded-xl p-4 mb-6 flex items-center gap-3">
              <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Transaction {tx.status === "refunded" ? "Refunded" : "Cancelled"}</p>
                <p className="text-xs text-muted-foreground">This transaction has been closed.</p>
              </div>
            </div>
          )}

          <div className="space-y-0">
            {statusTimeline.map((step, i) => {
              const isReached = currentStatusIndex >= i;
              const isCurrent = statusOrder[currentStatusIndex] === step.status;
              const Icon = step.icon;

              return (
                <div key={step.status} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCurrent ? "border-primary bg-primary/15 scale-110" :
                      isReached ? "border-primary/50 bg-primary/10" : "border-border bg-muted"
                    }`}>
                      <Icon className={`h-4 w-4 ${isReached ? step.color : "text-muted-foreground/50"}`} />
                    </div>
                    {i < statusTimeline.length - 1 && (
                      <div className={`w-0.5 h-8 ${isReached ? "bg-primary/30" : "bg-border"}`} />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className={`font-medium text-sm ${isReached ? "text-foreground" : "text-muted-foreground/50"}`}>
                      {step.label}
                    </p>
                    {isCurrent && step.status === "inspection" && tx.inspection_deadline && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Expires: {new Date(tx.inspection_deadline).toLocaleString("en-NG")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shipping & Tracking */}
        {!["pending_payment", "cancelled"].includes(tx.status) && (
          <div className="mb-6">
            <ShippingTracker transaction={tx} onUpdated={fetchData} />
          </div>
        )}

        {/* Review Section - show after completion */}
        {tx.status === "completed" && user && (
          <div className="mb-6">
            {!hasReviewed ? (
              <ReviewForm
                transactionId={tx.id}
                reviewedUserId={user.id === tx.seller_id ? tx.buyer_id : tx.seller_id}
                reviewedUserName={user.id === tx.seller_id ? (buyerProfile?.display_name || "Buyer") : (sellerProfile?.display_name || "Seller")}
                onReviewed={fetchData}
              />
            ) : (
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[hsl(160,60%,45%)]" /> You've reviewed this transaction
                </p>
              </div>
            )}

            {/* Show existing reviews */}
            {reviews.length > 0 && (
              <div className="mt-4 space-y-3">
                <h3 className="font-display text-sm font-bold text-foreground">Reviews</h3>
                {reviews.map((r) => (
                  <div key={r.id} className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "fill-secondary text-secondary" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                    {r.comment && <p className="text-sm text-foreground">{r.comment}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Parties */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl p-5 border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Seller</p>
            <p className="font-semibold text-foreground">{sellerProfile?.display_name || "Unknown"}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Trust: {Number(sellerProfile?.trust_score || 5).toFixed(1)}/10</span>
              <span className="text-xs text-muted-foreground">· {sellerProfile?.total_transactions || 0} transactions</span>
              {(sellerProfile?.bvn_verified || sellerProfile?.nin_verified) && (
                <span className="text-xs text-primary flex items-center gap-0.5">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </span>
              )}
            </div>
          </div>
          <div className="bg-card rounded-2xl p-5 border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Buyer</p>
            <p className="font-semibold text-foreground">{buyerProfile?.display_name || "Unknown"}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Trust: {Number(buyerProfile?.trust_score || 5).toFixed(1)}/10</span>
              <span className="text-xs text-muted-foreground">· {buyerProfile?.total_transactions || 0} transactions</span>
              {(buyerProfile?.bvn_verified || buyerProfile?.nin_verified) && (
                <span className="text-xs text-primary flex items-center gap-0.5">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </span>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TransactionDetail;
