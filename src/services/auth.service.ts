// src/services/auth.ts -file path
import { supabase } from "@/integrations/supabase/client";
const redirectUrl = import.meta.env.VITE_SITE_URL  ? `${import.meta.env.VITE_SITE_URL}/auth/` : "https://pay-guard-xi.vercel.app/auth"


export const authService = {
  async signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({ email, password });
  },

  async signUp(email: string, password: string, displayName: string, phone: string, user_type: string) {
    // The Database Trigger will automatically catch these metadata values 
    // and put them in the 'profiles' table, so we don't need to do anything else here.
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          display_name: displayName, 
          phone: phone, 
          user_type: user_type 
        },
        emailRedirectTo: redirectUrl,
      },
    });

    return result; 
},

  async resetPassword(email: string) {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
  },
};