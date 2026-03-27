import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContextProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import BuyerDashboard from "./pages/BuyerDashboard";
import ProfilePage from "./pages/ProfilePage";
import Admin from "./pages/Admin";
import PaymentLink from "./pages/PaymentLink";
import ResetPassword from "./pages/ResetPassword";
import TransactionDetail from "./pages/TransactionDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-right" expand={false} richColors />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/pay/:id" element={<PaymentLink />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Seller, buyers hitting this route get redirected to /buyer/dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredUserType="seller">
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Buyer, sellers hitting this route get redirected to /dashboard */}
            <Route
              path="/buyer/dashboard"
              element={
                <ProtectedRoute requiredUserType="buyer">
                  <BuyerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Profile, any authenticated user */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Shared, requires auth, any user type */}
            <Route
              path="/transaction/:id"
              element={
                <ProtectedRoute>
                  <TransactionDetail />
                </ProtectedRoute>
              }
            />

            {/* Admin  requires auth (admin only) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;