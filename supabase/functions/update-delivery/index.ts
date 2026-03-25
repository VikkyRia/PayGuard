import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    const { transaction_id, action } = await req.json();
    if (!transaction_id || !action) throw new Error("transaction_id and action are required");

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(transaction_id)) throw new Error("Invalid transaction_id format");
    const allowedActions = ["mark_shipped", "confirm_delivery", "release_funds"];
    if (!allowedActions.includes(action)) throw new Error("Invalid action");

    const { data: tx, error: txError } = await serviceClient
      .from("transactions")
      .select("*")
      .eq("id", transaction_id)
      .single();

    if (txError || !tx) throw new Error("Transaction not found");

    // Action: mark_shipped (seller only)
    if (action === "mark_shipped") {
      if (user.id !== tx.seller_id) throw new Error("Only the seller can mark as shipped");
      if (tx.status !== "funded") throw new Error("Transaction must be funded to mark as shipped");

      await serviceClient
        .from("transactions")
        .update({ status: "shipped" })
        .eq("id", transaction_id);

      fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseAnonKey}` },
        body: JSON.stringify({ event: "item_shipped", transaction_id }),
      }).catch(console.error);

      return new Response(JSON.stringify({ success: true, status: "shipped" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: confirm_delivery (buyer only)
    if (action === "confirm_delivery") {
      if (user.id !== tx.buyer_id) throw new Error("Only the buyer can confirm delivery");
      if (!["shipped", "delivered", "inspection"].includes(tx.status)) {
        throw new Error("Transaction must be shipped/delivered to confirm");
      }

      await serviceClient
        .from("transactions")
        .update({
          status: "inspection",
          inspection_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", transaction_id);

      fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseAnonKey}` },
        body: JSON.stringify({ event: "delivery_confirmed", transaction_id }),
      }).catch(console.error);

      return new Response(JSON.stringify({ success: true, status: "inspection" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: release_funds (buyer approves)
    if (action === "release_funds") {
      if (user.id !== tx.buyer_id) throw new Error("Only the buyer can release funds");
      if (!["inspection", "delivered", "shipped"].includes(tx.status)) {
        throw new Error("Transaction not in releasable state");
      }

      await serviceClient
        .from("transactions")
        .update({ status: "completed" })
        .eq("id", transaction_id);

      // Credit seller's wallet (amount MINUS fee)
      const sellerCreditAmount = Number(tx.amount) - Number(tx.fee || 0);
      const { data: sellerWallet } = await serviceClient
        .from("wallets")
        .select("id, balance, total_earned")
        .eq("user_id", tx.seller_id)
        .single();

      if (sellerWallet) {
        await serviceClient
          .from("wallets")
          .update({
            balance: Number(sellerWallet.balance) + sellerCreditAmount,
            total_earned: Number(sellerWallet.total_earned) + sellerCreditAmount,
          })
          .eq("id", sellerWallet.id);

        await serviceClient
          .from("wallet_transactions")
          .insert({
            wallet_id: sellerWallet.id,
            user_id: tx.seller_id,
            type: "credit",
            amount: sellerCreditAmount,
            description: `Payment for ${tx.item_name} (${tx.reference_code})`,
            reference_id: transaction_id,
          });
      }

      // Credit platform fee to admin wallet
      const feeAmount = Number(tx.fee || 0);
      if (feeAmount > 0) {
        // Find admin user(s) with the 'admin' role
        const { data: adminRoles } = await serviceClient
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin")
          .limit(1);

        if (adminRoles && adminRoles.length > 0) {
          const adminUserId = adminRoles[0].user_id;
          const { data: adminWallet } = await serviceClient
            .from("wallets")
            .select("id, balance, total_earned")
            .eq("user_id", adminUserId)
            .single();

          if (adminWallet) {
            await serviceClient
              .from("wallets")
              .update({
                balance: Number(adminWallet.balance) + feeAmount,
                total_earned: Number(adminWallet.total_earned) + feeAmount,
              })
              .eq("id", adminWallet.id);

            await serviceClient
              .from("wallet_transactions")
              .insert({
                wallet_id: adminWallet.id,
                user_id: adminUserId,
                type: "credit",
                amount: feeAmount,
                description: `Platform fee: ${tx.item_name} (${tx.reference_code})`,
                reference_id: transaction_id,
              });
          }
        }
      }

      // Update seller profile
      const { data: sellerProfile } = await serviceClient
        .from("profiles")
        .select("total_transactions, trust_score")
        .eq("user_id", tx.seller_id)
        .single();

      if (sellerProfile) {
        const newCount = (sellerProfile.total_transactions || 0) + 1;
        const newTrust = Math.min(10, (sellerProfile.trust_score || 5) + 0.2);
        await serviceClient
          .from("profiles")
          .update({ total_transactions: newCount, trust_score: newTrust })
          .eq("user_id", tx.seller_id);
      }

      // Notifications (non-blocking)
      fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseAnonKey}` },
        body: JSON.stringify({ event: "funds_released", transaction_id }),
      }).catch(console.error);

      if (sellerWallet) {
        fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseAnonKey}` },
          body: JSON.stringify({
            event: "wallet_credited",
            user_id: tx.seller_id,
            extra: { amount: sellerCreditAmount, description: `Payment for ${tx.item_name}` },
          }),
        }).catch(console.error);
      }

      return new Response(JSON.stringify({ success: true, status: "completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action. Use: mark_shipped, confirm_delivery, release_funds");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Delivery update error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
