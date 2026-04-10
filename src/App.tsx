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
import POSStockUpload from "./pages/admin/POSStockUpload";
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
import { usePWAInstall } from "./hooks/usePWAInstall";

/** DEBUG — remove before release */
const PWAInstallBar = () => {
  const { isInstallable, install } = usePWAInstall();
  if (!isInstallable) return null;
  return (
    <button
      onClick={install}
      style={{
        position: "fixed", bottom: 64, left: 0, right: 0, zIndex: 9998,
        background: "#C41212", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "14px 16px", fontSize: 15, fontWeight: 700,
        border: "none", cursor: "pointer", letterSpacing: 0.2,
        boxShadow: "0 -2px 12px rgba(0,0,0,0.18)",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Install Stery App
    </button>
  );
};

const PWADebugBadge = () => {
  const { isInstallable } = usePWAInstall();
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  // promptFired is true whenever isInstallable has ever been true, or if it currently is
  const [promptFired, setPromptFired] = React.useState(false);
  React.useEffect(() => {
    const mark = () => setPromptFired(true);
    window.addEventListener("beforeinstallprompt", mark);
    return () => window.removeEventListener("beforeinstallprompt", mark);
  }, []);

  return (
    <div style={{
      position: "fixed", bottom: 72, left: 8, zIndex: 9999,
      background: "#1e1e1e", color: "#fff", borderRadius: 8,
      padding: "6px 10px", fontSize: 11, fontFamily: "monospace",
      lineHeight: 1.7, opacity: 0.92, pointerEvents: "none",
    }}>
      <div style={{ color: "#facc15", fontWeight: "bold", marginBottom: 2 }}>PWA Debug</div>
      <div>beforeinstallprompt: <span style={{ color: promptFired ? "#4ade80" : "#f87171" }}>{promptFired ? "YES" : "NO"}</span></div>
      <div>isInstallable: <span style={{ color: isInstallable ? "#4ade80" : "#f87171" }}>{isInstallable ? "YES" : "NO"}</span></div>
      <div>standalone: <span style={{ color: standalone ? "#4ade80" : "#94a3b8" }}>{standalone ? "YES" : "NO"}</span></div>
    </div>
  );
};
import React from "react";

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
          <Route path="/admin/pos-upload" element={<POSStockUpload />} />
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
                <PWAInstallBar />
                <PWADebugBadge />
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
