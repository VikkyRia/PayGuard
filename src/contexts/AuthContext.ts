import { createContext } from "react";
import type { User, Session } from "@supabase/supabase-js";

export type UserType = "seller" | "buyer" | null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  userType: UserType;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isAdmin: false,
  userType: null,
  loading: true,
  signOut: async () => {},
});

export default AuthContext;