// src/pages/PaymentLink.tsx
import { useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePaymentFlow } from "@/hooks/usePaymentFlow";
import { useTransactionData } from "@/hooks/useTransactionData";

// Internal Sub-component for the Interswitch Redirect
import { InterswitchRedirectForm } from "@/components/InterswitchRedirectForm";

const PaymentLink = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  // Custom Hooks for Clean Logic
  const { transaction, seller, loading, notFound, refresh } =
    useTransactionData(id);
  const { status, iswParams, startPayment, confirm } = usePaymentFlow(id);

  // Handle Interswitch Callback
  useEffect(() => {
    const resp = searchParams.get("resp");
    const txnref = searchParams.get("txnref");
    if (resp === "00" && txnref && id) {
      confirm(txnref, resp).then(() => refresh());
    }
  }, [searchParams, id, confirm, refresh]);

  if (loading)
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">
          Securing transaction connection...
        </p>
      </div>
    );

  if (notFound)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h1 className="font-display text-2xl font-extrabold text-foreground mb-2">
            Link Invalid
          </h1>
          <p className="text-muted-foreground mb-6">
            This payment link may have expired or the transaction was cancelled.
          </p>
          <Link to="/">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" /> Return to PayGuard
            </Button>
          </Link>
        </div>
      </div>
    );

  const fee = Math.min(transaction.amount * 0.015, 5000);
  const total = transaction.amount + fee;
  const isPaid = transaction.status === "funded" || status === "success";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12 font-body">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1 mb-6 group">
          <span className="font-display text-xl font-extrabold text-foreground group-hover:text-primary transition-colors">
            Pay
            <span className="text-primary group-hover:text-foreground">
              Guard
            </span>
          </span>
        </Link>

        <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
          {/* Status Header */}
          <div
            className={`p-8 text-center relative overflow-hidden transition-colors duration-500 ${isPaid ? "bg-[hsl(160,60%,45%)]" : "bg-primary"}`}
          >
            <div className="relative z-10 text-white">
              {isPaid ? (
                <>
                  <CheckCircle2 className="h-14 w-14 mx-auto mb-4 animate-in zoom-in duration-300" />
                  <h3 className="font-display text-xl font-extrabold mb-1">
                    Payment Secured
                  </h3>
                  <p className="text-sm opacity-80">
                    Funds are safely held in escrow
                  </p>
                </>
              ) : (
                <>
                  <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-display text-xl font-extrabold mb-1">
                    Escrow Payment
                  </h3>
                  <p className="text-sm opacity-80">
                    Protection active for this transaction
                  </p>
                </>
              )}
              <p className="font-display text-4xl font-extrabold mt-6">
                ₦{Number(transaction.amount).toLocaleString()}
              </p>
              <p className="text-sm opacity-90 font-medium mt-1">
                {transaction.item_name}
              </p>
            </div>
          </div>

          {/* Seller Profile */}
          <div className="p-5 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary border border-primary/20">
                  {(seller?.display_name || "S").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm leading-none">
                    {seller?.display_name || "Verified Seller"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    ⭐ Score: {Number(seller?.trust_score || 5).toFixed(0)}/10 •{" "}
                    {seller?.total_transactions || 0} Deals
                  </p>
                </div>
              </div>
              {(seller?.bvn_verified || seller?.nin_verified) && (
                <Badge
                  variant="secondary"
                  className="bg-[hsl(160,60%,45%)]/10 text-[hsl(160,60%,45%)] border-none text-[10px]"
                >
                  <ShieldCheck className="h-3 w-3 mr-1" /> VERIFIED
                </Badge>
              )}
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="p-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Item Price</span>
              <span className="font-bold">
                ₦{Number(transaction.amount).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Escrow Fee (1.5%)</span>
              <span className="text-foreground">₦{fee.toLocaleString()}</span>
            </div>
            <div className="border-t border-dashed border-border pt-3 flex justify-between items-center">
              <span className="font-bold text-foreground text-base">
                Total to Pay
              </span>
              <span className="font-display text-2xl font-extrabold text-primary">
                ₦{total.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Payment Action Area */}
          <div className="p-6 pt-0 space-y-4">
            {status === "confirming" ? (
              <div className="bg-muted/50 rounded-xl p-4 flex flex-col items-center gap-2 border border-border">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm font-medium">Confirming with Bank...</p>
              </div>
            ) : transaction.status === "pending_payment" && !isPaid ? (
              <>
                <Button
                  className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20"
                  onClick={startPayment}
                  disabled={status === "paying"}
                >
                  {status === "paying" ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    "Pay Securely Now"
                  )}
                </Button>
                <p className="text-[11px] text-center text-muted-foreground px-4">
                  Powered by Interswitch. Your payment is protected. Sellers
                  only get paid when you confirm receipt.
                </p>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-[hsl(160,60%,45%)]/10 rounded-xl p-4 border border-[hsl(160,60%,45%)]/20">
                  <p className="text-sm text-[hsl(160,60%,45%)] font-bold text-center">
                    Transaction Protected & Funded
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-3">
                    Want to track this item?
                  </p>
                  <Link to="/auth">
                    <Button variant="outline" size="sm" className="w-full">
                      Create Account to Track
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hidden Payment Redirect Form */}
        <InterswitchRedirectForm params={iswParams} />

        <p className="text-[10px] text-center text-muted-foreground mt-8 uppercase tracking-widest opacity-60">
          Secure Escrow Service • PayGuard Nigeria
        </p>
      </div>
    </div>
  );
};

export default PaymentLink;
