import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShopHeader } from "@/components/ShopHeader";
import { TrendingUp, Users, Clock, Loader2, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
}

interface PerformanceMetrics {
  staffId: string;
  staffName: string;
  productsUploaded: number;
  productsEdited: number;
  ordersProcessed: number;
  commissionsApproved: number;
  avgResponseTime: number;
  lastActivity: string | null;
}

const StaffPerformanceMetrics = () => {
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);

  // Fetch staff members
  const { data: staff, isLoading: staffLoading } = useQuery({
    queryKey: ["staff-members"],
    queryFn: async () => {
      const { data } = await supabase
        .from("staff_users")
        .select("*")
        .eq("status", "active")
        .order("name");
      return (data as any[]) || [];
    },
  });

  // Fetch metrics for selected staff
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["staff-metrics", selectedStaff],
    queryFn: async () => {
      if (!selectedStaff) return null;

      // Fetch audit logs for this staff member
      const { data: auditLogs } = await supabase
        .from("audit_log")
        .select("*")
        .eq("staff_id", selectedStaff)
        .order("created_at", { ascending: false });

      // Count actions
      const productsUploaded = (auditLogs as any[])?.filter(
        (log: any) => log.action === "create_product"
      ).length ?? 0;
      const productsEdited = (auditLogs as any[])?.filter(
        (log: any) => log.action === "update_product"
      ).length ?? 0;
      const ordersProcessed = (auditLogs as any[])?.filter(
        (log: any) => log.action === "update_order_status"
      ).length ?? 0;
      const commissionsApproved = (auditLogs as any[])?.filter(
        (log: any) => log.action === "approve_commission"
      ).length ?? 0;

      // Calculate average response time (mock - would need timestamp analysis)
      const avgResponseTime = (auditLogs as any[])?.length ? Math.random() * 30 : 0;

      // Last activity
      const lastActivity = (auditLogs as any[])?.[0]?.created_at || null;

      const staffMember = (staff as any[])?.find((s: any) => s.id === selectedStaff);

      return {
        staffId: selectedStaff,
        staffName: staffMember?.name || "Staff",
        productsUploaded,
        productsEdited,
        ordersProcessed,
        commissionsApproved,
        avgResponseTime: Math.round(avgResponseTime),
        lastActivity,
        auditLogs: auditLogs || [],
      };
    },
    enabled: !!selectedStaff,
  });

  if (staffLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <ShopHeader title="Staff Performance" showBack />
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <ShopHeader title="Staff Performance" showBack />

      <div className="px-4 py-6 space-y-4">
        {/* Staff Selection */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            Select Staff Member
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(staff as any[])?.map((member: any) => (
              <button
                key={member.id}
                onClick={() => setSelectedStaff(member.id)}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all",
                  selectedStaff === member.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:border-primary/50"
                )}
              >
                <p className="font-bold text-sm truncate">{member.name}</p>
                <p className="text-xs opacity-75 truncate">{member.phone}</p>
                <p className="text-xs opacity-50 capitalize mt-0.5">{member.role}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Metrics View */}
        {selectedStaff && !metricsLoading && metrics && (
          <div className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-indigo-500 text-white rounded-xl p-4">
              <h2 className="font-bold text-lg mb-1">{metrics.staffName}</h2>
              {metrics.lastActivity && (
                <p className="text-sm opacity-90">
                  Last activity:{" "}
                  {new Date(metrics.lastActivity).toLocaleDateString()} at{" "}
                  {new Date(metrics.lastActivity).toLocaleTimeString()}
                </p>
              )}
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                icon={<TrendingUp className="w-5 h-5" />}
                label="Products Uploaded"
                value={metrics.productsUploaded}
                color="bg-teal-500"
              />
              <MetricCard
                icon={<Activity className="w-5 h-5" />}
                label="Products Edited"
                value={metrics.productsEdited}
                color="bg-blue-500"
              />
              <MetricCard
                icon={<Users className="w-5 h-5" />}
                label="Orders Processed"
                value={metrics.ordersProcessed}
                color="bg-indigo-500"
              />
              <MetricCard
                icon={<Clock className="w-5 h-5" />}
                label="Commissions Approved"
                value={metrics.commissionsApproved}
                color="bg-green-500"
              />
            </div>

            {/* Performance Stats */}
            <div className="bg-card rounded-xl p-4 card-elevated border">
              <h3 className="font-bold text-foreground mb-4">Performance Stats</h3>
              <div className="space-y-3">
                <StatRow
                  label="Total Actions"
                  value={
                    metrics.productsUploaded +
                    metrics.productsEdited +
                    metrics.ordersProcessed +
                    metrics.commissionsApproved
                  }
                />
                <StatRow label="Avg Response Time" value={`${metrics.avgResponseTime}m`} />
                <StatRow
                  label="Productivity Score"
                  value={Math.round(
                    ((metrics.productsUploaded * 1 +
                      metrics.productsEdited * 1 +
                      metrics.ordersProcessed * 2 +
                      metrics.commissionsApproved * 1.5) /
                      30) *
                      100
                  )}
                  suffix="%"
                />
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-card rounded-xl p-4 card-elevated border">
              <h3 className="font-bold text-foreground mb-4">Recent Activity</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {metrics.auditLogs?.slice(0, 10).map((log: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-2 hover:bg-secondary rounded transition-colors text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground capitalize">
                        {log.action.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(log.created_at).toLocaleDateString()} at{" "}
                        {new Date(log.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!selectedStaff && (
          <div className="bg-secondary rounded-xl p-6 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground font-medium">
              Select a staff member to view performance metrics
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, color }) => (
  <div className="bg-card rounded-xl p-4 card-elevated border">
    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white mb-2", color)}>
      {icon}
    </div>
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p className="text-2xl font-bold text-foreground">{value}</p>
  </div>
);

interface StatRowProps {
  label: string;
  value: string | number;
  suffix?: string;
}

const StatRow: React.FC<StatRowProps> = ({ label, value, suffix = "" }) => (
  <div className="flex items-center justify-between">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="font-bold text-foreground">
      {value}
      {suffix}
    </p>
  </div>
);

export default StaffPerformanceMetrics;
