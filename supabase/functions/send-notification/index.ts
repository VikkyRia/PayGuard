import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendSMS(phone: string, message: string) {
  const apiKey = Deno.env.get("TERMII_API_KEY");
  const senderId = Deno.env.get("TERMII_SENDER_ID") || "PayGuard";

  if (!apiKey) {
    console.warn("TERMII_API_KEY not configured, skipping SMS");
    return { success: false, reason: "no_api_key" };
  }

  try {
    const response = await fetch("https://v3.api.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: phone,
        from: senderId,
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: apiKey,
      }),
    });

    const data = await response.json();
    console.log("Termii response:", JSON.stringify(data));
    return { success: response.ok, data };
  } catch (err) {
    console.error("SMS send error:", err);
    return { success: false, reason: "send_failed" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { event, transaction_id, user_id, extra } = await req.json();
    if (!event) throw new Error("event is required");

    const results: any[] = [];
    const notifications: { phone: string | null; message: string }[] = [];

    // === WALLET & WITHDRAWAL EVENTS (user_id based) ===
    if (["wallet_credited", "withdrawal_approved", "withdrawal_rejected"].includes(event)) {
      if (!user_id) throw new Error("user_id is required for wallet/withdrawal events");

      const { data: profile } = await serviceClient
        .from("profiles")
        .select("phone, display_name, email")
        .eq("user_id", user_id)
        .single();

      const amount = extra?.amount ? `₦${Number(extra.amount).toLocaleString()}` : "";

      switch (event) {
        case "wallet_credited":
          notifications.push({
            phone: profile?.phone,
            message: `PayGuard: ${amount} has been credited to your wallet${extra?.description ? ` - ${extra.description}` : ""}. Your funds are ready for withdrawal.`,
          });
          break;

        case "withdrawal_approved":
          notifications.push({
            phone: profile?.phone,
            message: `PayGuard: Your withdrawal of ${amount} has been approved and is being processed to your bank account. Allow 1-24 hours for transfer.`,
          });
          break;

        case "withdrawal_rejected":
          notifications.push({
            phone: profile?.phone,
            message: `PayGuard: Your withdrawal of ${amount} could not be processed and has been refunded to your wallet balance. Contact support for details.`,
          });
          break;
      }
    }

    // === TRANSACTION EVENTS (transaction_id based) ===
    else {
      if (!transaction_id) throw new Error("transaction_id is required for transaction events");

      const { data: tx, error: txError } = await serviceClient
        .from("transactions")
        .select("*")
        .eq("id", transaction_id)
        .single();

      if (txError || !tx) throw new Error("Transaction not found");

      const [{ data: sellerProfile }, { data: buyerProfile }] = await Promise.all([
        serviceClient.from("profiles").select("*").eq("user_id", tx.seller_id).single(),
        serviceClient.from("profiles").select("*").eq("user_id", tx.buyer_id).single(),
      ]);

      const amount = `₦${Number(tx.amount).toLocaleString()}`;
      const item = tx.item_name;

      switch (event) {
        case "payment_received":
          notifications.push({
            phone: sellerProfile?.phone,
            message: `PayGuard: Payment of ${amount} received for "${item}". Ref: ${tx.reference_code}. Please ship the item.`,
          });
          break;

        case "item_shipped":
          notifications.push({
            phone: buyerProfile?.phone,
            message: `PayGuard: Your item "${item}" (${amount}) has been shipped! Ref: ${tx.reference_code}. Confirm delivery when received.`,
          });
          break;

        case "delivery_confirmed":
          notifications.push({
            phone: sellerProfile?.phone,
            message: `PayGuard: Buyer confirmed delivery of "${item}". 48-hour inspection started. Funds release after inspection. Ref: ${tx.reference_code}`,
          });
          break;

        case "funds_released":
          notifications.push({
            phone: sellerProfile?.phone,
            message: `PayGuard: Funds of ${amount} for "${item}" have been released to your wallet! Ref: ${tx.reference_code}. Withdraw anytime.`,
          });
          break;

        case "dispute_raised":
          const raisedBy = extra?.raised_by === tx.seller_id ? "seller" : "buyer";
          notifications.push({
            phone: sellerProfile?.phone,
            message: `PayGuard: A dispute has been raised by the ${raisedBy} for "${item}" (${amount}). Ref: ${tx.reference_code}. Our team will review shortly.`,
          });
          notifications.push({
            phone: buyerProfile?.phone,
            message: `PayGuard: A dispute has been raised for "${item}" (${amount}). Ref: ${tx.reference_code}. Our team will review within 24 hours.`,
          });
          break;

        case "auto_released":
          notifications.push({
            phone: sellerProfile?.phone,
            message: `PayGuard: Inspection period expired. Funds of ${amount} for "${item}" auto-released to your wallet! Ref: ${tx.reference_code}`,
          });
          notifications.push({
            phone: buyerProfile?.phone,
            message: `PayGuard: Inspection period for "${item}" expired. Funds of ${amount} have been released to seller. Ref: ${tx.reference_code}`,
          });
          break;

        default:
          throw new Error(`Unknown event: ${event}`);
      }
    }

    // Send all notifications
    for (const notif of notifications) {
      if (notif.phone) {
        const result = await sendSMS(notif.phone, notif.message);
        results.push({ phone: notif.phone.slice(-4), ...result });
      } else {
        results.push({ skipped: true, reason: "no_phone_number" });
      }
    }

    return new Response(
      JSON.stringify({ success: true, notifications_sent: results.filter(r => r.success).length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Notification error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
