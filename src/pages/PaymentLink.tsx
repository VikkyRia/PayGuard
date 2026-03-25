// src/pages/PaymentLink.tsx
import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, ArrowLeft, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const PaymentLink = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [transaction, setTransaction] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"success" | "cancelled" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [iswParams, setIswParams] = useState<any>(null);

  useEffect(() => {
    // Interswitch redirects back with query params: resp, txnref, etc.
    const resp = searchParams.get("resp");
    const txnref = searchParams.get("txnref");
    const status = searchParams.get("status") as "success" | "cancelled" | null;

    if (status) setPaymentStatus(status);

    // If returning from Interswitch with a response code
    if (resp && txnref && id) {
      // resp "00" = successful on Interswitch
      if (resp === "00") {
        setPaymentStatus("success");
        confirmPayment(id, txnref, resp);
      } else {
        setPaymentStatus("cancelled");
        toast.error("Payment was not completed. Please try again.");
      }
    }
  }, [searchParams, id]);

  const confirmPayment = async (transactionId: string, txnRef: string, resp: string) => {
    setConfirming(true);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-payment", {
        body: { transaction_id: transactionId, txn_ref: txnRef, resp },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success("Payment confirmed! Funds are now held in escrow.");
        fetchTransaction();
      }
    } catch (err: any) {
      console.error("Confirm error:", err);
      toast.error("Payment verification failed. Please contact support.");
    } finally {
      setConfirming(false);
    }
  };

  const fetchTransaction = async () => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    const { data: tx, error } = await supabase.from("transactions").select("*").eq("id", id).maybeSingle();
    if (error || !tx) { setNotFound(true); setLoading(false); return; }
    setTransaction(tx);
    const { data: profile } = await supabase.from("profiles").select("display_name, trust_score, bvn_verified, nin_verified, total_transactions").eq("user_id", tx.seller_id).maybeSingle();
    setSeller(profile);
    setLoading(false);
  };

  useEffect(() => { fetchTransaction(); }, [id]);

  const handlePay = async () => {
    if (!transaction) return;
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          transaction_id: transaction.id,
          redirect_url: `${window.location.origin}/pay/${transaction.id}`,
        },
      });
      if (error) throw error;
      if (data?.payment_url) {
        // Set Interswitch form params and submit
        setIswParams(data);
      } else {
        throw new Error("No payment data returned");
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error(err.message || "Failed to initiate payment. Please try again.");
      setPaying(false);
    }
  };

  // Auto-submit the hidden Interswitch form when params are ready
  useEffect(() => {
    if (iswParams && formRef.current) {
      formRef.current.submit();
    }
  }, [iswParams]);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading transaction...</p></div>;
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-2xl font-extrabold text-foreground mb-2">Transaction Not Found</h1>
          <p className="text-muted-foreground mb-4">This payment link may be invalid or expired.</p>
          <Link to="/"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Home</Button></Link>
        </div>
      </div>
    );
  }

  const fee = Math.min(transaction.amount * 0.015, 5000);
  const total = transaction.amount + fee;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1 text-sm mb-6">
          <span className="font-display font-extrabold text-foreground">Pay<span className="text-primary">Guard</span></span>
        </Link>

        <div className="bg-card rounded-2xl shadow-elevated border border-border overflow-hidden">
          {/* Header */}
          <div className="bg-hero-gradient p-8 text-center relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-primary-foreground/5" />
            <div className="absolute -top-14 -left-14 w-56 h-56 rounded-full bg-primary-foreground/3" />
            <div className="relative z-10">
              {paymentStatus === "success" || transaction.status === "funded" ? (
                <>
                  <CheckCircle2 className="h-12 w-12 text-secondary mx-auto mb-4" />
                  <h3 className="font-display text-xl font-extrabold text-primary-foreground mb-2">Payment Successful!</h3>
                  <p className="text-sm text-primary-foreground/70">Funds are now held securely in escrow</p>
                </>
              ) : paymentStatus === "cancelled" ? (
                <>
                  <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <h3 className="font-display text-xl font-extrabold text-primary-foreground mb-2">Payment Cancelled</h3>
                  <p className="text-sm text-primary-foreground/70">You can try again when you're ready</p>
                </>
              ) : (
                <>
                  <p className="text-3xl mb-4">🛡️</p>
                  <h3 className="font-display text-xl font-extrabold text-primary-foreground mb-2">Secure Payment Request</h3>
                  <p className="text-sm text-primary-foreground/70 mb-6">This transaction is protected by PayGuard Escrow</p>
                </>
              )}
              <p className="font-display text-4xl font-extrabold text-primary-foreground mb-2 mt-4">₦{Number(transaction.amount).toLocaleString()}</p>
              <p className="text-primary-foreground/80">{transaction.item_name}</p>
            </div>
          </div>

          {/* Seller info */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
                  {(seller?.display_name || "S").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{seller?.display_name || "Seller"}</p>
                  <p className="text-xs text-muted-foreground">⭐ Trust Score: {Number(seller?.trust_score || 5).toFixed(0)} · {seller?.total_transactions || 0} transactions</p>
                </div>
              </div>
              {(seller?.bvn_verified || seller?.nin_verified) && (
                <Badge variant="outline" className="text-xs text-primary border-primary/30">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                </Badge>
              )}
            </div>
          </div>

          {/* Price breakdown */}
          <div className="p-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Item Price</span>
              <span className="font-display font-bold text-foreground">₦{Number(transaction.amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">PayGuard Fee (1.5%)</span>
              <span className="text-foreground">₦{fee.toLocaleString()}</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between">
              <span className="font-display font-bold text-foreground">Total</span>
              <span className="font-display text-xl font-extrabold text-foreground">₦{total.toLocaleString()}</span>
            </div>
          </div>

          {/* CTA */}
          <div className="p-6 pt-0 space-y-3">
            {confirming ? (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Verifying payment...</p>
              </div>
            ) : transaction.status === "pending_payment" && paymentStatus !== "success" ? (
              <>
                <Button
                  className="w-full font-display font-bold"
                  size="lg"
                  onClick={handlePay}
                  disabled={paying}
                >
                  {paying ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Redirecting to payment...</>
                  ) : (
                    <>Pay ₦{total.toLocaleString()} Securely →</>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  You'll be redirected to Interswitch's secure payment page. Your money is held securely until you receive and verify the item.
                </p>
              </>
            ) : (
              <div className="bg-muted rounded-xl p-4 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  {transaction.status === "funded" ? (
                    <>✅ Funds are held in escrow. Awaiting delivery & confirmation.</>
                  ) : (
                    <>This transaction is currently <span className="font-medium text-foreground">{transaction.status.replace(/_/g, " ")}</span>.</>
                  )}
                </p>
                {(transaction.status === "funded" || paymentStatus === "success") && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">
                      Sign up with the <span className="font-semibold text-foreground">same email you used during payment</span> to automatically see this transaction in your dashboard.
                    </p>
                    <Link to="/auth">
                      <Button size="sm" variant="outline" className="w-full">
                        Sign Up / Log In to Track
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/*
          Hidden Interswitch Webpay redirect form.
          Uses the NEW newwebpay.qa.interswitchng.com endpoint.
          No hash field required on the new endpoint.
          product_id is also removed — not used by the new API.
        */}
        {iswParams && (
          <form
            ref={formRef}
            method="POST"
            action={iswParams.payment_url}
            style={{ display: "none" }}
          >
            <input type="hidden" name="merchant_code" value={iswParams.merchant_code} />
            <input type="hidden" name="pay_item_id" value={iswParams.pay_item_id} />
            <input type="hidden" name="txn_ref" value={iswParams.txn_ref} />
            <input type="hidden" name="amount" value={iswParams.amount} />
            <input type="hidden" name="currency" value={iswParams.currency} />
            <input type="hidden" name="site_redirect_url" value={iswParams.site_redirect_url} />
            {iswParams.pay_item_name && (
              <input type="hidden" name="pay_item_name" value={iswParams.pay_item_name} />
            )}
            {iswParams.cust_name && (
              <input type="hidden" name="cust_name" value={iswParams.cust_name} />
            )}
            {iswParams.cust_email && (
              <input type="hidden" name="cust_email" value={iswParams.cust_email} />
            )}
          </form>
        )}

        <p className="text-xs text-center text-muted-foreground mt-6">
          Powered by PayGuard. Funds are held securely, never co-mingled.
        </p>
      </div>
    </div>
  );
};

export default PaymentLink;