import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * INTERSWITCH WEBPAY — CORRECT URLs (2024/2025 official docs)
 *
 * ✅ Sandbox payment page : https://newwebpay.qa.interswitchng.com/collections/w/pay
 * ✅ Production page      : https://newwebpay.interswitchng.com/collections/w/pay
 *
 * ❌ OLD sandbox.interswitchng.com/collections/w/pay  ← DEPRECATED
 *    Returns an HTML cookie-consent page instead of the payment UI.
 *    This was the root cause of the "We use cookies..." error.
 *
 * The new Webpay form does NOT require a hash field. Drop it entirely.
 */

const WEBPAY_SANDBOX_URL =
  "https://newwebpay.qa.interswitchng.com/collections/w/pay";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MERCHANT_CODE = Deno.env.get("INTERSWITCH_MERCHANT_CODE");
    const PAY_ITEM_ID = Deno.env.get("INTERSWITCH_PAY_ITEM_ID");

    if (!MERCHANT_CODE || !PAY_ITEM_ID) {
      throw new Error(
        "Interswitch credentials not configured. " +
        "Required: INTERSWITCH_MERCHANT_CODE, INTERSWITCH_PAY_ITEM_ID"
      );
    }

    const { transaction_id, redirect_url } = await req.json();
    if (!transaction_id) throw new Error("transaction_id is required");

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(transaction_id))
      throw new Error("Invalid transaction_id format");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transaction_id)
      .single();

    if (txError || !tx) throw new Error("Transaction not found");

    if (tx.status !== "pending_payment") {
      throw new Error(
        `Transaction is not awaiting payment (current status: ${tx.status})`
      );
    }

    // Fee: 1.5%, capped at ₦5,000. Interswitch amount must be in kobo.
    const fee = Math.min(tx.amount * 0.015, 5000);
    const totalKobo = Math.round((tx.amount + fee) * 100);
    const txnRef = tx.reference_code;

    const siteRedirectUrl =
      redirect_url ||
      `${Deno.env.get("SITE_URL") || "https://your-app.lovable.app"}/pay/${transaction_id}`;

    console.log(
      `Checkout created: tx=${transaction_id}, ref=${txnRef}, amount=${totalKobo} kobo`
    );

    await supabase
      .from("transactions")
      .update({ payment_reference: `isw_${txnRef}` })
      .eq("id", transaction_id)
      .eq("status", "pending_payment");

    return new Response(
      JSON.stringify({
        payment_url: WEBPAY_SANDBOX_URL,
        merchant_code: MERCHANT_CODE,
        pay_item_id: PAY_ITEM_ID,
        txn_ref: txnRef,
        amount: totalKobo,          // kobo
        currency: 566,              // NGN ISO 4217 numeric
        site_redirect_url: siteRedirectUrl,
        pay_item_name: tx.item_name || "Escrow Payment",
        cust_name: tx.buyer_name || "Buyer",
        cust_email: tx.buyer_email || "",
        // hash field is NOT required / used by the new Webpay form
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Checkout error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});