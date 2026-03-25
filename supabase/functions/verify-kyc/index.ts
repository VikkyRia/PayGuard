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

    const { bvn, nin, first_name, last_name, date_of_birth, method } = await req.json();

    const verificationMethod = method || (nin ? "nin" : "bvn");
    const idNumber = verificationMethod === "nin" ? nin : bvn;

    if (!idNumber || idNumber.length !== 11) {
      throw new Error(`Valid 11-digit ${verificationMethod.toUpperCase()} is required`);
    }

    const INTERSWITCH_CLIENT_ID = Deno.env.get("INTERSWITCH_CLIENT_ID");
    const INTERSWITCH_SECRET_KEY = Deno.env.get("INTERSWITCH_SECRET_KEY");
    console.log("Interswitch Client ID:", INTERSWITCH_CLIENT_ID ? "configured" : "not configured");
    console.log("Interswitch Secret Key:", INTERSWITCH_SECRET_KEY ? "configured" : "not configured");

    let verificationResult: { verified: boolean; message: string };

    if (INTERSWITCH_CLIENT_ID && INTERSWITCH_SECRET_KEY) {
      try {
        // Step 1: Get access token
        const tokenResponse = await fetch("https://passport.interswitchng.com/passport/oauth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(`${INTERSWITCH_CLIENT_ID}:${INTERSWITCH_SECRET_KEY}`)}`,
          },
          body: "grant_type=client_credentials",
        });
        const tokenData = await tokenResponse.json();

        // Step 2: Verify based on method
        const verifyUrl = verificationMethod === "nin"
          ? "https://qa.interswitchng.com/api/v2/quickteller/nin/verify"
          : "https://qa.interswitchng.com/api/v2/quickteller/bvn/verify";

        const verifyBody = verificationMethod === "nin"
          ? { nin: idNumber, firstName: first_name, lastName: last_name, dateOfBirth: date_of_birth }
          : { bvn: idNumber, firstName: first_name, lastName: last_name, dateOfBirth: date_of_birth };

        const verifyResponse = await fetch(verifyUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(verifyBody),
        });

        const verifyData = await verifyResponse.json();
        verificationResult = {
          verified: verifyData.responseCode === "00",
          message: verifyData.responseCode === "00"
            ? `${verificationMethod.toUpperCase()} verified successfully via Interswitch`
            : verifyData.responseMessage || "Verification failed",
        };
      } catch (apiError) {
        console.error("Interswitch API error:", apiError);
        throw new Error("Identity verification service unavailable. Please try again later.");
      }
    } else {
      // Sandbox/Demo mode
      console.log("Running in demo mode - Interswitch keys not configured");
      const isValidFormat = /^\d{11}$/.test(idNumber);
      verificationResult = {
        verified: isValidFormat,
        message: isValidFormat
          ? `${verificationMethod.toUpperCase()} verified (demo mode)`
          : `Invalid ${verificationMethod.toUpperCase()} format`,
      };
    }

    if (verificationResult.verified) {
      // Update profile — either bvn_verified or nin_verified marks user as KYC-passed
      const updateData = verificationMethod === "nin"
        ? { nin_verified: true }
        : { bvn_verified: true };

      await serviceClient
        .from("profiles")
        .update(updateData)
        .eq("user_id", user.id);
    }

    return new Response(JSON.stringify({
      success: verificationResult.verified,
      message: verificationResult.message,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("KYC verification error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
