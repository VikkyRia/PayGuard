import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * INTERSWITCH STATUS API — CORRECT URLs (2024/2025 official docs)
 *
 * ✅ Sandbox : https://qa.interswitchng.com/collections/api/v1/gettransaction.json
 * ✅ Live    : https://webpay.interswitchng.com/collections/api/v1/gettransaction.json
 *
 * ❌ OLD: sandbox.interswitchng.com/collections/api/v1/gettransaction.json  ← DEPRECATED
 *    Returns HTML cookie-consent page, not JSON.
 *
 * Query parameter is "merchantcode" (no underscore), NOT "productid".
 *
 * Authentication: Basic Auth using btoa(clientId:secretKey).
 * No OAuth2 token step needed for the status API on the new QA environment.
 */

const STATUS_API_URL =
  "https://qa.interswitchng.com/collections/api/v1/gettransaction.json";

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
    const CLIENT_ID = Deno.env.get("INTERSWITCH_CLIENT_ID");
    const SECRET_KEY = Deno.env.get("INTERSWITCH_SECRET_KEY");

    if (!MERCHANT_CODE || !CLIENT_ID || !SECRET_KEY) {
      throw new Error(
        "Interswitch credentials not configured. " +
        "Required: INTERSWITCH_MERCHANT_CODE, INTERSWITCH_CLIENT_ID, INTERSWITCH_SECRET_KEY"
      );
    }

    const { transaction_id, txn_ref, resp } = await req.json();
    if (!transaction_id) throw new Error("transaction_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tx, error: fetchError } = await supabase
      .from("transactions")
      .select("id, status, payment_reference, amount, reference_code")
      .eq("id", transaction_id)
      .single();

    if (fetchError || !tx) throw new Error("Transaction not found");

    // Idempotent — already funded
    if (tx.status === "funded") {
      console.log(`Transaction ${transaction_id} already funded`);
      return new Response(
        JSON.stringify({ success: true, status: "funded", already_processed: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (tx.status !== "pending_payment") {
      throw new Error(`Unexpected transaction status: ${tx.status}`);
    }

    const refCode = txn_ref || tx.reference_code;
    const fee = Math.min(tx.amount * 0.015, 5000);
    const totalKobo = Math.round((tx.amount + fee) * 100);

    // Basic Auth: btoa is natively available in Deno — no import needed
    const basicAuth = btoa(`${CLIENT_ID}:${SECRET_KEY}`);

    // NOTE: param is "merchantcode" (no underscore) per current ISW docs
    const statusUrl =
      `${STATUS_API_URL}?merchantcode=${MERCHANT_CODE}&transactionreference=${refCode}&amount=${totalKobo}`;

    console.log(`Verifying payment: ref=${refCode}, amount=${totalKobo} kobo`);
    console.log(`Status URL: ${statusUrl}`);

    const verifyResponse = await fetch(statusUrl, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
    });

    const verifyText = await verifyResponse.text();
    console.log("ISW status API raw response:", verifyText);

    // Guard: if the response is HTML (old deprecated endpoint returns HTML),
    // surface a clear error instead of a confusing JSON parse failure.
    if (verifyText.trim().startsWith("<")) {
      console.error("ISW returned HTML — wrong URL or credentials rejected");
      throw new Error(
        "Payment provider returned an unexpected HTML response. " +
        "Check that INTERSWITCH_CLIENT_ID and INTERSWITCH_SECRET_KEY are correct, " +
        "and that the status API URL is the new QA URL."
      );
    }

    let verifyData: any;
    try {
      verifyData = JSON.parse(verifyText);
    } catch {
      console.error("Non-JSON response from ISW status API:", verifyText);
      throw new Error("Payment verification failed: unexpected response from payment provider.");
    }

    console.log("ISW verification response:", JSON.stringify(verifyData));

    const isSuccessful = verifyData.ResponseCode === "00";
    if (!isSuccessful) {
      const desc = verifyData.ResponseDescription || "Payment not completed";
      console.error(`ISW verification failed: ${verifyData.ResponseCode} — ${desc}`);
      throw new Error(`Payment not verified: ${desc}`);
    }

    // Guard against amount tampering
    if (verifyData.Amount && parseInt(verifyData.Amount) !== totalKobo) {
      console.error(`Amount mismatch: expected ${totalKobo}, got ${verifyData.Amount}`);
      throw new Error("Amount mismatch — potential tampering detected");
    }

    // Idempotent DB update — only applies if status is still pending_payment
    const { data: updated, error: updateError } = await supabase
      .from("transactions")
      .update({
        status: "funded",
        payment_reference: `isw_${refCode}_${verifyData.PaymentReference || ""}`,
      })
      .eq("id", transaction_id)
      .eq("status", "pending_payment")
      .select("id")
      .single();

    if (updateError && updateError.code !== "PGRST116") {
      console.error("DB update error:", updateError);
      throw new Error("Failed to update transaction");
    }

    if (updated) {
      console.log(`Transaction ${transaction_id} funded (ref: ${refCode})`);
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({ event: "payment_received", transaction_id }),
      }).catch(console.error);
    }

    return new Response(
      JSON.stringify({ success: true, status: "funded" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Confirm payment error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});