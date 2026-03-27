// src/services/auth.ts -file path
import { supabase } from "@/integrations/supabase/client";
const redirectUrl = import.meta.env.VITE_SITE_URL  ? `${import.meta.env.VITE_SITE_URL}/auth/` : "https://pay-guard-xi.vercel.app/auth"
//  later to the site host url

export const authService = {
  async signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({ email, password });
  },

  async signUp(email: string, password: string, displayName: string, phone: string) {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, phone },
        emailRedirectTo: redirectUrl,
      },
    });

    // If signup is successful and we have a user, update the profile table
    if (!result.error && result.data.user) {
      await supabase
        .from("profiles")
        .update({ phone })
        .eq("user_id", result.data.user.id);
    }

    return result;
  },

  async resetPassword(email: string) {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
  },
};