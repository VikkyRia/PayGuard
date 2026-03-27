import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Ensures Nigerian numbers are in the 234803... format required by Termii
 */
function formatNigerianNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    return "234" + cleaned.substring(1);
  }
  if (/^[789]/.test(cleaned)) {
    return "234" + cleaned;
  }
  return cleaned;
}

async function sendSMS(phone: string, message: string) {
  const apiKey = Deno.env.get("TERMII_API_KEY");
  const senderId = Deno.env.get("TERMII_SENDER_ID") || "PayGuard";

  if (!apiKey) {
    console.warn("TERMII_API_KEY not configured, skipping SMS");
    return { success: false, reason: "no_api_key" };
  }

  try {
    const formattedPhone = formatNigerianNumber(phone);
    const response = await fetch("https://v3.api.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: formattedPhone,
        from: senderId,
        sms: message,
        type: "plain",
        channel: "dnd", // 'dnd' is more reliable for Nigerian telcos
        api_key: apiKey,
      }),
    });

    const data = await response.json();
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
    const notifications: { phone: string; message: string }[] = [];

    // === WALLET & WITHDRAWAL EVENTS ===
    if (["wallet_credited", "withdrawal_approved", "withdrawal_rejected"].includes(event)) {
      if (!user_id) throw new Error("user_id is required");

      const { data: profile } = await serviceClient
        .from("profiles")
        .select("phone, display_name")
        .eq("user_id", user_id)
        .maybeSingle();

      if (!profile?.phone) throw new Error("User phone not found");

      const amount = extra?.amount ? `₦${Number(extra.amount).toLocaleString()}` : "";

      switch (event) {
        case "wallet_credited":
          notifications.push({
            phone: profile.phone,
            message: `PayGuard: ${amount} credited to your wallet${extra?.description ? ` for ${extra.description}` : ""}. Ready for withdrawal.`,
          });
          break;
        case "withdrawal_approved":
          notifications.push({
            phone: profile.phone,
            message: `PayGuard: Withdrawal of ${amount} approved. Funds will hit your bank account within 1-24 hours.`,
          });
          break;
        case "withdrawal_rejected":
          notifications.push({
            phone: profile.phone,
            message: `PayGuard: Withdrawal of ${amount} failed and was refunded to your balance. Check app for details.`,
          });
          break;
      }
    } 
    
    // === TRANSACTION EVENTS ===
    else {
      if (!transaction_id) throw new Error("transaction_id is required");

      const { data: tx } = await serviceClient
        .from("transactions")
        .select("*")
        .eq("id", transaction_id)
        .maybeSingle();

      if (!tx) throw new Error("Transaction not found");

      const { data: seller } = await serviceClient.from("profiles").select("phone").eq("user_id", tx.seller_id).maybeSingle();
      const { data: buyer } = await serviceClient.from("profiles").select("phone").eq("user_id", tx.buyer_id).maybeSingle();

      const amount = `₦${Number(tx.amount).toLocaleString()}`;
      const item = tx.item_name;

      switch (event) {
        case "payment_received": {
          if (seller?.phone) notifications.push({
            phone: seller.phone,
            message: `PayGuard: Payment of ${amount} received for "${item}". Ref: ${tx.reference_code}. Please ship now.`,
          });
          break; }

        case "item_shipped": {
          if (buyer?.phone) notifications.push({
            phone: buyer.phone,
            message: `PayGuard: Your item "${item}" has been shipped! Ref: ${tx.reference_code}. Confirm delivery once received.`,
          });
          break; }

        case "delivery_confirmed": {
          if (seller?.phone) notifications.push({
            phone: seller.phone,
            message: `PayGuard: Delivery confirmed for "${item}". 48hr inspection started. Ref: ${tx.reference_code}`,
          });
          break; }

        case "funds_released":
        case "auto_released":
          if (seller?.phone) notifications.push({
            phone: seller.phone,
            message: `PayGuard: Funds (${amount}) for "${item}" released to your wallet! Ref: ${tx.reference_code}`,
          });
          if (buyer?.phone) notifications.push({
            phone: buyer.phone,
            message: `PayGuard: Payment for "${item}" (${amount}) has been settled to the seller. Ref: ${tx.reference_code}`,
          });
          break;

        case "dispute_raised": {
          const by = extra?.raised_by === tx.seller_id ? "seller" : "buyer";
          if (seller?.phone) notifications.push({
            phone: seller.phone,
            message: `PayGuard: Dispute raised by ${by} for "${item}". Ref: ${tx.reference_code}. Support is reviewing.`,
          });
          if (buyer?.phone) notifications.push({
            phone: buyer.phone,
            message: `PayGuard: Dispute raised for "${item}". Ref: ${tx.reference_code}. Support will contact you.`,
          });
          break;}

        default:
          throw new Error(`Unknown event: ${event}`);
      }
    }

    // Process all gathered notifications
    for (const notif of notifications) {
      const result = await sendSMS(notif.phone, notif.message);
      results.push({ phone: notif.phone.slice(-4), ...result });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});