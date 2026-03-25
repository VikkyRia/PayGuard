import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find all transactions where inspection_deadline has passed and status is still "inspection"
    const now = new Date().toISOString();
    
    const { data: expiredTransactions, error: fetchError } = await serviceClient
      .from("transactions")
      .select("id, seller_id, amount, fee, item_name, reference_code")
      .eq("status", "inspection")
      .lt("inspection_deadline", now);

    if (fetchError) throw fetchError;

    if (!expiredTransactions || expiredTransactions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No expired inspections found", released: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${expiredTransactions.length} expired inspections to auto-release`);

    let released = 0;
    const errors: string[] = [];

    for (const tx of expiredTransactions) {
      try {
        // Update transaction to completed
        const { error: updateError } = await serviceClient
          .from("transactions")
          .update({ status: "completed" })
          .eq("id", tx.id);

        if (updateError) {
          errors.push(`TX ${tx.reference_code}: ${updateError.message}`);
          continue;
        }

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
              description: `Auto-released: ${tx.item_name} (${tx.reference_code})`,
              reference_id: tx.id,
            });
        }

        // Credit platform fee to admin wallet
        const feeAmount = Number(tx.fee || 0);
        if (feeAmount > 0) {
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
                  reference_id: tx.id,
                });
            }
          }
        }

        // Increment seller's transaction count and boost trust
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

        // Fire SMS notification (non-blocking)
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
          body: JSON.stringify({ event: "auto_released", transaction_id: tx.id }),
        }).catch(console.error);

        // Fire wallet credit notification (non-blocking)
        if (sellerWallet) {
          const creditAmt = Number(tx.amount) - Number(tx.fee || 0);
          fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
            body: JSON.stringify({
              event: "wallet_credited",
              user_id: tx.seller_id,
              extra: { amount: creditAmt, description: `Auto-released: ${tx.item_name}` },
            }),
          }).catch(console.error);
        }

        console.log(`Auto-released: ${tx.reference_code} - ₦${tx.amount}`);
        released++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        errors.push(`TX ${tx.reference_code}: ${message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Auto-released ${released} transactions`,
        released,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Auto-release error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
