import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AppProvider, useApp } from "./contexts/AppContext";
import { CustomerProvider, useCustomer, getCustomerRole } from "./contexts/CustomerContext";
import Welcome from "./pages/Welcome";
import Onboarding from "./pages/Onboarding";
import HomeDashboard from "./pages/shop/HomeDashboard";
import ShopHome from "./pages/shop/ShopHome";
import Categories from "./pages/shop/Categories";
import ProductDetails from "./pages/shop/ProductDetails";
import Cart from "./pages/shop/Cart";
import Checkout from "./pages/shop/Checkout";
import OrderHistory from "./pages/shop/OrderHistory";
import OrderTracker from "./pages/shop/OrderTracker";
import AdminOrders from "./pages/admin/AdminOrders";
import ManageStaff from "./pages/admin/ManageStaff";
import ManageProducts from "./pages/admin/ManageProducts";
import ManageDeliveryRoutes from "./pages/admin/ManageDeliveryRoutes";
import OrderOperations from "./pages/admin/OrderOperations";
import ApproveCommissions from "./pages/admin/ApproveCommissions";
import StockAlerts from "./pages/admin/StockAlerts";
import ReportsDashboard from "./pages/admin/ReportsDashboard";
import BulkProductImport from "./pages/admin/BulkProductImport";
import StaffPerformanceMetrics from "./pages/admin/StaffPerformanceMetrics";
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
import { FloatingCart } from "./components/FloatingCart";
import { Layout } from "./components/Layout";

const queryClient = new QueryClient();

/** Requires any mode to be set — staff/owner bypass the mode requirement. */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { mode } = useApp();
  const { customer, isLoading } = useCustomer();
  if (isLoading) return null;
  const role = getCustomerRole(customer);
  // Staff and owners always have access regardless of mode
  if (role === "staff" || role === "owner") return <>{children}</>;
  if (!mode) return <Navigate to="/" replace />;
  return <>{children}</>;
};

/** Admin-only layout guard — allows staff and owner, blocks customer. */
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { customer, isLoading } = useCustomer();
  if (isLoading) return null;
  const role = getCustomerRole(customer);
  if (role === "customer") return <Navigate to="/shop" replace />;
  return <>{children}</>;
};

/**
 * Shop/Earn layout guard — renders <Outlet /> for customers and owners,
 * redirects staff to /admin/orders.
 */
const ShopRoute = () => {
  const { customer, isLoading } = useCustomer();
  if (isLoading) return null;
  if (getCustomerRole(customer) === "staff") return <Navigate to="/admin/orders" replace />;
  return <Outlet />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* all protected content uses the responsive layout */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>

        {/* Shop + Earn Routes — staff are redirected to /admin/orders */}
        <Route element={<ShopRoute />}>
          <Route path="/shop" element={<HomeDashboard />} />
          <Route path="/shop/browse" element={<ShopHome />} />
          <Route path="/shop/categories" element={<Categories />} />
          <Route path="/shop/product/:id" element={<ProductDetails />} />
          <Route path="/shop/cart" element={<Cart />} />
          <Route path="/shop/checkout" element={<Checkout />} />
          <Route path="/shop/orders" element={<OrderHistory />} />
          <Route path="/shop/order/:id" element={<OrderTracker />} />
          <Route path="/shop/offers" element={<Offers />} />
          <Route path="/shop/rewards" element={<Rewards />} />
          <Route path="/shop/group-order" element={<GroupOrder />} />
          <Route path="/earn" element={<EarnHome />} />
          <Route path="/earn/products" element={<EarnProducts />} />
          <Route path="/earn/product/:id" element={<EarnProductDetails />} />
          <Route path="/earn/share/:id" element={<ShareProduct />} />
          <Route path="/earn/dashboard" element={<EarningsDashboard />} />
          <Route path="/earn/referrals" element={<Referrals />} />
        </Route>

        {/* Account — accessible to all roles */}
        <Route path="/profile" element={<Profile />} />

        {/* Admin Routes — staff and owner only */}
        <Route path="/admin" element={<Navigate to="/admin/orders" replace />} />
        <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
        <Route path="/admin/order-operations" element={<AdminRoute><OrderOperations /></AdminRoute>} />
        <Route path="/admin/commissions" element={<AdminRoute><ApproveCommissions /></AdminRoute>} />
        <Route path="/admin/alerts" element={<AdminRoute><StockAlerts /></AdminRoute>} />
        <Route path="/admin/reports" element={<AdminRoute><ReportsDashboard /></AdminRoute>} />
        <Route path="/admin/import" element={<AdminRoute><BulkProductImport /></AdminRoute>} />
        <Route path="/admin/performance" element={<AdminRoute><StaffPerformanceMetrics /></AdminRoute>} />
        <Route path="/admin/staff" element={<AdminRoute><ManageStaff /></AdminRoute>} />
        <Route path="/admin/products" element={<AdminRoute><ManageProducts /></AdminRoute>} />
        <Route path="/admin/delivery-routes" element={<AdminRoute><ManageDeliveryRoutes /></AdminRoute>} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <CustomerProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div id="app-shell">
              <FloatingCart />
              <AppRoutes />
            </div>
          </BrowserRouter>
        </CustomerProvider>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
