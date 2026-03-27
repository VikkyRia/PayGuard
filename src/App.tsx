import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContextProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import PaymentLink from "./pages/PaymentLink";
import ResetPassword from "./pages/ResetPassword";
import TransactionDetail from "./pages/TransactionDetail";
import NotFound from "./pages/NotFound";
import BuyerDashboard from "./pages/BuyerDashboard.tsx";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-right" expand={false} richColors />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/pay/:id" element={<PaymentLink />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/transaction/:id" element={<TransactionDetail />} />
            <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
