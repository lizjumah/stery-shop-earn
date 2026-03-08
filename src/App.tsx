import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./contexts/AppContext";
import Welcome from "./pages/Welcome";
import ShopHome from "./pages/shop/ShopHome";
import ProductDetails from "./pages/shop/ProductDetails";
import Offers from "./pages/shop/Offers";
import Rewards from "./pages/shop/Rewards";
import EarnHome from "./pages/earn/EarnHome";
import EarnProductDetails from "./pages/earn/EarnProductDetails";
import ShareProduct from "./pages/earn/ShareProduct";
import EarningsDashboard from "./pages/earn/EarningsDashboard";
import Referrals from "./pages/earn/Referrals";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, requiredMode }: { children: React.ReactNode; requiredMode?: "shop" | "earn" }) => {
  const { mode } = useApp();
  
  if (!mode) {
    return <Navigate to="/" replace />;
  }
  
  if (requiredMode && mode !== requiredMode) {
    return <Navigate to={mode === "shop" ? "/shop" : "/earn"} replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      
      {/* Shop Routes */}
      <Route path="/shop" element={<ProtectedRoute requiredMode="shop"><ShopHome /></ProtectedRoute>} />
      <Route path="/shop/product/:id" element={<ProtectedRoute requiredMode="shop"><ProductDetails /></ProtectedRoute>} />
      <Route path="/shop/offers" element={<ProtectedRoute requiredMode="shop"><Offers /></ProtectedRoute>} />
      <Route path="/shop/rewards" element={<ProtectedRoute requiredMode="shop"><Rewards /></ProtectedRoute>} />
      
      {/* Earn Routes */}
      <Route path="/earn" element={<ProtectedRoute requiredMode="earn"><EarnHome /></ProtectedRoute>} />
      <Route path="/earn/product/:id" element={<ProtectedRoute requiredMode="earn"><EarnProductDetails /></ProtectedRoute>} />
      <Route path="/earn/share/:id" element={<ProtectedRoute requiredMode="earn"><ShareProduct /></ProtectedRoute>} />
      <Route path="/earn/dashboard" element={<ProtectedRoute requiredMode="earn"><EarningsDashboard /></ProtectedRoute>} />
      <Route path="/earn/referrals" element={<ProtectedRoute requiredMode="earn"><Referrals /></ProtectedRoute>} />
      
      {/* Shared Routes */}
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
