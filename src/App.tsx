import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import { CustomerProvider, useCustomer, getCustomerRole } from "./contexts/CustomerContext";
import HomeDashboard from "./pages/shop/HomeDashboard";
import ShopHome from "./pages/shop/ShopHome";
import Categories from "./pages/shop/Categories";
import AllCategoriesPage from "./pages/shop/AllCategoriesPage";
import ProductDetails from "./pages/shop/ProductDetails";
import Cart from "./pages/shop/Cart";
import Checkout from "./pages/shop/Checkout";
import OrderSuccess from "./pages/shop/OrderSuccess";
import OrderHistory from "./pages/shop/OrderHistory";
import OrderTracker from "./pages/shop/OrderTracker";
import AdminOverview from "./pages/admin/AdminOverview";
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
import DailyStockUpload from "./pages/admin/DailyStockUpload";
import InventoryOverview from "./pages/admin/InventoryOverview";
import MasterInventory from "./pages/admin/MasterInventory";
import AuditTrail from "./pages/admin/AuditTrail";
import { AdminLayout } from "./components/AdminLayout";
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
import { FloatingHelpButton } from "./components/FloatingHelpButton";
import { Layout } from "./components/Layout";
import { OwnerPinProvider } from "./contexts/OwnerPinContext";

const queryClient = new QueryClient();

/** Layout guard — waits for customer session to resolve before rendering. */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoading } = useCustomer();
  if (isLoading) return null;
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
 * Shop/Earn layout guard — renders <Outlet /> for all authenticated and
 * unauthenticated users. Staff/owner may browse the shop; /admin/* routes
 * are protected separately by AdminRoute.
 */
const ShopRoute = () => {
  const { isLoading } = useCustomer();
  if (isLoading) return null;
  return <Outlet />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/shop" replace />} />
      <Route path="/onboarding" element={<Navigate to="/shop" replace />} />

      {/* all protected content uses the responsive layout */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>

        {/* Shop + Earn Routes — staff are redirected to /admin/orders */}
        <Route element={<ShopRoute />}>
          <Route path="/shop" element={<HomeDashboard />} />
          <Route path="/shop/browse" element={<ShopHome />} />
          <Route path="/shop/categories" element={<Categories />} />
          <Route path="/shop/all-categories" element={<AllCategoriesPage />} />
          <Route path="/shop/product/:id" element={<ProductDetails />} />
          <Route path="/shop/cart" element={<Cart />} />
          <Route path="/shop/checkout" element={<Checkout />} />
          <Route path="/shop/order-success" element={<OrderSuccess />} />
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

        {/* Admin Routes — staff and owner only, all share AdminLayout (AdminNav) */}
        <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/order-operations" element={<OrderOperations />} />
          <Route path="/admin/commissions" element={<ApproveCommissions />} />
          <Route path="/admin/alerts" element={<StockAlerts />} />
          <Route path="/admin/reports" element={<ReportsDashboard />} />
          <Route path="/admin/import" element={<BulkProductImport />} />
          <Route path="/admin/performance" element={<StaffPerformanceMetrics />} />
          <Route path="/admin/staff" element={<ManageStaff />} />
          <Route path="/admin/products" element={<ManageProducts />} />
          <Route path="/admin/delivery-routes" element={<ManageDeliveryRoutes />} />
          <Route path="/admin/inventory" element={<InventoryOverview />} />
          <Route path="/admin/inventory/master" element={<MasterInventory />} />
          <Route path="/admin/inventory/upload" element={<DailyStockUpload />} />
          <Route path="/admin/audit" element={<AuditTrail />} />
        </Route>
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
          <OwnerPinProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div id="app-shell">
                <FloatingCart />
                <FloatingHelpButton />
                <AppRoutes />
              </div>
            </BrowserRouter>
          </OwnerPinProvider>
        </CustomerProvider>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
