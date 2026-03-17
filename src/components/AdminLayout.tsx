import { Outlet } from "react-router-dom";
import { AdminNav } from "./AdminNav";

/**
 * Shared layout for all /admin/* routes.
 * Renders the horizontal AdminNav then the matched child route via <Outlet />.
 * Auth is handled by the parent AdminRoute in App.tsx — this component does
 * not duplicate that check.
 */
export const AdminLayout: React.FC = () => (
  <>
    <AdminNav />
    <Outlet />
  </>
);
