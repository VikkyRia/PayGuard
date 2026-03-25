import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * INTERSWITCH STATUS API — CORRECT URLs (2024/2025 official docs)
 *
 * ✅ Sandbox : https://qa.interswitchng.com/collections/api/v1/gettransaction.json
 * ✅ Live    : https://webpay.interswitchng.com/collections/api/v1/gettransaction.json
 *
 * ❌ OLD: sandbox.interswitchng.com/collections/api/v1/gettransaction.json  ← DEPRECATED
 *
 * Query parameter is "merchantcode" (no underscore), NOT "productid".
 * Authentication: Basic Auth using btoa(clientId:secretKey).
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

    const body = await req.json();
    console.log("ISW webhook received:", JSON.stringify(body));

    const { txnref, resp } = body;
    if (!txnref) throw new Error("Missing txnref in webhook payload");

    if (resp !== "00") {
      console.log(`Ignoring non-success webhook: resp=${resp}, txnref=${txnref}`);
      return new Response(
        JSON.stringify({ received: true, ignored: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tx, error: fetchError } = await supabase
      .from("transactions")
      .select("id, status, amount, reference_code")
      .eq("reference_code", txnref)
      .single();

    if (fetchError || !tx) {
      console.error(`Transaction not found for ref: ${txnref}`);
      return new Response(
        JSON.stringify({ received: true, error: "Transaction not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency guard
    if (tx.status !== "pending_payment") {
      console.log(`Transaction ${tx.id} already ${tx.status} — skipping`);
      return new Response(
        JSON.stringify({ received: true, already_processed: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fee = Math.min(tx.amount * 0.015, 5000);
    const totalKobo = Math.round((tx.amount + fee) * 100);

    // Basic Auth — btoa is native in Deno
    const basicAuth = btoa(`${CLIENT_ID}:${SECRET_KEY}`);

    // NOTE: param is "merchantcode" (no underscore) per current ISW docs
    const statusUrl =
      `${STATUS_API_URL}?merchantcode=${MERCHANT_CODE}&transactionreference=${txnref}&amount=${totalKobo}`;

    console.log(`Webhook verification: ref=${txnref}, amount=${totalKobo} kobo`);

    const verifyResponse = await fetch(statusUrl, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
    });

    const verifyText = await verifyResponse.text();
    console.log("ISW status API raw response:", verifyText);

    // Guard against deprecated endpoint returning HTML
    if (verifyText.trim().startsWith("<")) {
      console.error("ISW returned HTML — wrong URL or credentials rejected");
      return new Response(
        JSON.stringify({ received: true, verification_error: "HTML response from status API — check URL and credentials" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let verifyData: any;
    try {
      verifyData = JSON.parse(verifyText);
    } catch {
      console.error("Non-JSON response from ISW status API:", verifyText);
      return new Response(
        JSON.stringify({ received: true, verification_error: "Non-JSON response from status API" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("ISW verification parsed:", JSON.stringify(verifyData));

    if (verifyData.ResponseCode !== "00") {
      console.error(`Verification failed: ${verifyData.ResponseCode} — ${verifyData.ResponseDescription}`);
      return new Response(
        JSON.stringify({ received: true, verification_failed: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (verifyData.Amount && parseInt(verifyData.Amount) !== totalKobo) {
      console.error(`Amount mismatch: expected ${totalKobo}, got ${verifyData.Amount}`);
      return new Response(
        JSON.stringify({ received: true, error: "Amount mismatch" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("transactions")
      .update({
        status: "funded",
        payment_reference: `isw_webhook_${txnref}_${verifyData.PaymentReference || ""}`,
      })
      .eq("id", tx.id)
      .eq("status", "pending_payment")
      .select("id")
      .single();

    if (updateError && updateError.code !== "PGRST116") {
      console.error("DB update error:", updateError);
      throw new Error("Failed to update transaction");
    }

    if (updated) {
      console.log(`Transaction ${tx.id} funded via webhook (ref: ${txnref})`);
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({ event: "payment_received", transaction_id: tx.id }),
      }).catch(console.error);
    } else {
      console.log(`Transaction ${tx.id} already processed — duplicate webhook ignored`);
    }

    return new Response(
      JSON.stringify({ received: true, funded: !!updated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", message);
    // Always return 200 on webhooks — prevents Interswitch from retrying indefinitely
    return new Response(JSON.stringify({ error: message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});