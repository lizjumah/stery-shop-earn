import React from "react";
import { Navigate } from "react-router-dom";
import { useCustomer } from "@/contexts/CustomerContext";

interface StaffOnlyProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "product_manager" | "any";
}

/**
 * Guard that ensures only staff users can access the content
 * Non-staff/customers are redirected to home
 */
export const StaffOnly: React.FC<StaffOnlyProps> = ({
  children,
  requiredRole = "any",
}) => {
  const { customer, isLoading } = useCustomer();

  if (isLoading) return null;

  // Customer without admin role cannot access staff pages
  if (!customer?.is_admin) {
    return <Navigate to="/shop" replace />;
  }

  // Could add more granular role checks here if needed
  // For now, is_admin covers both admin and product_manager roles

  return <>{children}</>;
};

export const AdminOnly: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { customer, isLoading } = useCustomer();

  if (isLoading) return null;

  if (!customer?.is_admin) {
    return <Navigate to="/shop" replace />;
  }

  return <>{children}</>;
};
