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

    const { transaction_id, reason, evidence_urls } = await req.json();
    if (!transaction_id || !reason) throw new Error("transaction_id and reason are required");

    // === INPUT SANITIZATION ===
    const sanitize = (s: string) => s.replace(/<[^>]*>/g, "").trim();
    const cleanReason = sanitize(reason).slice(0, 1000);
    if (!cleanReason) throw new Error("Reason cannot be empty after sanitization");

    // Validate transaction_id is UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(transaction_id)) throw new Error("Invalid transaction_id format");

    // Validate evidence URLs
    const cleanUrls = Array.isArray(evidence_urls)
      ? evidence_urls.filter((u: string) => typeof u === "string" && u.startsWith("http")).map((u: string) => sanitize(u).slice(0, 500)).slice(0, 10)
      : [];

    // Fetch the transaction
    const { data: tx, error: txError } = await serviceClient
      .from("transactions")
      .select("*")
      .eq("id", transaction_id)
      .single();

    if (txError || !tx) throw new Error("Transaction not found");

    // Verify user is a participant
    if (user.id !== tx.buyer_id && user.id !== tx.seller_id) {
      throw new Error("Only transaction participants can raise disputes");
    }

    // Check if transaction is in a disputable state
    const disputableStatuses = ["funded", "shipped", "delivered", "inspection"];
    if (!disputableStatuses.includes(tx.status)) {
      throw new Error(`Cannot dispute a transaction with status: ${tx.status}`);
    }

    // Check for existing active dispute
    const { data: existingDispute } = await serviceClient
      .from("disputes")
      .select("id")
      .eq("transaction_id", transaction_id)
      .not("status", "in", '("resolved_buyer","resolved_seller","auto_resolved")')
      .maybeSingle();

    if (existingDispute) {
      throw new Error("There is already an active dispute for this transaction");
    }

    // Create the dispute
    const { error: insertError } = await serviceClient.from("disputes").insert({
      transaction_id,
      raised_by: user.id,
      reason: cleanReason,
      evidence_urls: cleanUrls,
    });

    if (insertError) throw insertError;

    // Update transaction status to disputed
    await serviceClient
      .from("transactions")
      .update({ status: "disputed" })
      .eq("id", transaction_id);

    // Fire SMS notification (non-blocking)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
      body: JSON.stringify({ event: "dispute_raised", transaction_id, extra: { raised_by: user.id } }),
    }).catch(console.error);

    // Increment user's dispute count
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("total_disputes, trust_score")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      const newDisputes = (profile.total_disputes || 0) + 1;
      // Decrease trust score slightly for raising dispute (trust hit for both parties)
      const newTrust = Math.max(1, (profile.trust_score || 5) - 0.1);
      await serviceClient
        .from("profiles")
        .update({ total_disputes: newDisputes, trust_score: newTrust })
        .eq("user_id", user.id);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Dispute raised successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Raise dispute error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
