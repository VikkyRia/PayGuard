import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTransactionDetail } from "@/hooks/useTransactionDetail";
import { TransactionTimeline } from "@/components/TransactionTimeline";
import { TransactionParties } from "@/components/TransactionParties";
import TransactionActions from "@/components/TransactionActions";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import ShippingTracker from "@/components/ShippingTracker";
import ReviewForm from "@/components/ReviewForm";

const TransactionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    tx,
    sellerProfile,
    buyerProfile,
    reviews,
    hasReviewed,
    loading,
    fetchData,
    user,
  } = useTransactionDetail(id);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  if (!tx)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Transaction not found</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/85 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link
            to="/"
            className="font-display text-xl font-extrabold text-foreground"
          >
            Pay<span className="text-primary">Guard</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
          >
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
            <span>
              {new Date(tx.created_at).toLocaleDateString("en-NG", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-foreground">
            {tx.item_name}
          </h1>
          {tx.item_description && (
            <p className="text-muted-foreground mt-1">{tx.item_description}</p>
          )}
        </div>

        {/* Amount & Actions */}
        <div className="bg-card rounded-2xl p-6 border border-border mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Amount
              </p>
              <p className="font-display text-4xl font-extrabold text-foreground">
                ₦{Number(tx.amount).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Fee: ₦{Number(tx.fee).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {user && (
                <TransactionActions
                  transaction={tx}
                  userId={user.id}
                  onUpdated={fetchData}
                />
              )}
              {tx.shareable_link && (
                <WhatsAppShareButton
                  link={tx.shareable_link}
                  itemName={tx.item_name}
                  amount={tx.amount}
                />
              )}
            </div>
          </div>
        </div>

        <TransactionTimeline
          status={tx.status}
          inspectionDeadline={tx.inspection_deadline}
        />

        {!["pending_payment", "cancelled"].includes(tx.status) && (
          <div className="mb-6">
            <ShippingTracker transaction={tx} onUpdated={fetchData} />
          </div>
        )}

        {tx.status === "completed" && user && (
          <div className="mb-6">
            {!hasReviewed ? (
              <ReviewForm
                transactionId={tx.id}
                reviewedUserId={
                  user.id === tx.seller_id ? tx.buyer_id : tx.seller_id
                }
                reviewedUserName={
                  user.id === tx.seller_id
                    ? buyerProfile?.display_name || "Buyer"
                    : sellerProfile?.display_name || "Seller"
                }
                onReviewed={fetchData}
              />
            ) : (
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[hsl(160,60%,45%)]" />{" "}
                  You've reviewed this transaction
                </p>
              </div>
            )}

            {reviews.length > 0 && (
              <div className="mt-4 space-y-3">
                <h3 className="font-display text-sm font-bold text-foreground">
                  Reviews
                </h3>
                {reviews.map((r) => (
                  <div key={r.id} className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${s <= r.rating ? "fill-secondary text-secondary" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                    {r.comment && (
                      <p className="text-sm text-foreground">{r.comment}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <TransactionParties
          sellerProfile={sellerProfile}
          buyerProfile={buyerProfile}
        />
      </main>
    </div>
  );
};

export default TransactionDetail;
