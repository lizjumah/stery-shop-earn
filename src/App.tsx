import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./contexts/AppContext";
import Welcome from "./pages/Welcome";
import HomeDashboard from "./pages/shop/HomeDashboard";
import ShopHome from "./pages/shop/ShopHome";
import Categories from "./pages/shop/Categories";
import ProductDetails from "./pages/shop/ProductDetails";
import Cart from "./pages/shop/Cart";
import Checkout from "./pages/shop/Checkout";
import OrderHistory from "./pages/shop/OrderHistory";
import Offers from "./pages/shop/Offers";
import Rewards from "./pages/shop/Rewards";
import GroupOrder from "./pages/shop/GroupOrder";
import EarnHome from "./pages/earn/EarnHome";
import EarnProducts from "./pages/earn/EarnProducts";
import EarnProductDetails from "./pages/earn/EarnProductDetails";
import ShareProduct from "./pages/earn/ShareProduct";
import EarningsDashboard from "./pages/earn/EarningsDashboard";
import Referrals from "./pages/earn/Referrals";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { mode } = useApp();
  if (!mode) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />

      {/* Home Dashboard */}
      <Route path="/shop" element={<ProtectedRoute><HomeDashboard /></ProtectedRoute>} />

      {/* Shop Routes */}
      <Route path="/shop/browse" element={<ProtectedRoute><ShopHome /></ProtectedRoute>} />
      <Route path="/shop/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
      <Route path="/shop/product/:id" element={<ProtectedRoute><ProductDetails /></ProtectedRoute>} />
      <Route path="/shop/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
      <Route path="/shop/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
      <Route path="/shop/orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
      <Route path="/shop/offers" element={<ProtectedRoute><Offers /></ProtectedRoute>} />
      <Route path="/shop/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
      <Route path="/shop/group-order" element={<GroupOrder />} />

      {/* Earn Routes */}
      <Route path="/earn" element={<ProtectedRoute><EarnHome /></ProtectedRoute>} />
      <Route path="/earn/products" element={<ProtectedRoute><EarnProducts /></ProtectedRoute>} />
      <Route path="/earn/product/:id" element={<ProtectedRoute><EarnProductDetails /></ProtectedRoute>} />
      <Route path="/earn/share/:id" element={<ProtectedRoute><ShareProduct /></ProtectedRoute>} />
      <Route path="/earn/dashboard" element={<ProtectedRoute><EarningsDashboard /></ProtectedRoute>} />
      <Route path="/earn/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />

      {/* Account */}
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
