import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import AuthContext, { type UserType } from "./AuthContext";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userType, setUserType] = useState<UserType>(null);

  // Fetch both role and user_type for a given user id
  const fetchUserMeta = async (userId: string) => {
    const [roleRes, profileRes] = await Promise.all([
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("user_type")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    setIsAdmin(!!roleRes.data);
    setUserType((profileRes.data?.user_type as UserType) ?? null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserMeta(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        // fire-and-forget inside onAuthStateChange (Supabase requirement)
        fetchUserMeta(session.user.id).finally(() => setLoading(false));
      } else {
        setIsAdmin(false);
        setUserType(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
    setUserType(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, isAdmin, userType, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};