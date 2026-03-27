import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import type { UserType } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  // If provided, only this userType can access this route.
  // The other type is redirected to their correct dashboard.
  requiredUserType?: UserType;
}

const DASHBOARD_BY_TYPE: Record<NonNullable<UserType>, string> = {
  seller: "/dashboard",
  buyer: "/buyer/dashboard",
};

export const ProtectedRoute = ({
  children,
  requiredUserType,
}: ProtectedRouteProps) => {
  const { user, loading, userType } = useAuth();

  // Still resolving session / profile
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Not logged in at all
  if (!user) return <Navigate to="/auth" replace />;

  // Role guard — if the route requires a specific userType and the current user
  // is a different type, redirect them silently to their own dashboard.
  if (requiredUserType && userType && userType !== requiredUserType) {
    const redirect = DASHBOARD_BY_TYPE[userType];
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
};